import {useEffect,useRef,useState} from 'react';
import {dropEdit,keepEdit,keptEdits} from './kept-edits';
import {registerForm,type GuardedForm} from './leave-guard';

export type Values=Record<string,any>;
/** What one save answered: the server's copy after it, and whether it changed anything. */
export interface SaveAnswer<D extends Values>{copy:D;changed:boolean}
/** A save the server refused, in its own words; a 409 may carry the copy that holds now and who saved it. */
export class SaveRefused extends Error{
 /** revert: the field goes back to its saved value with these words under it (a move the stage refuses), no Retry. */
 constructor(message:string,readonly status:number,readonly current?:Values,readonly changedBy?:string|null,readonly revert=false){super(message);}
}

export interface AutosaveOptions<D extends Values>{
 /** Names the form for the changes kept on this device: 'contact.<id>', 'settings.workspace'. */
 key:string;
 /** The copy the server last answered, or null while it loads. */
 copy:D|null;
 /** Orders copies (an updated_at): a read older than the copy a save answered never replaces it, and a kept change
  * older than the copy is not offered back. */
 version?:(copy:D)=>string|null|undefined;
 /** One request: the changed values and the values they replace, on this copy. */
 send:(changes:Partial<D>,base:Partial<D>,copy:D,init:{keepalive?:boolean})=>Promise<SaveAnswer<D>>;
 /** A fresh copy, read after someone else's change (409) when the refusal did not carry one. */
 reread:()=>Promise<D>;
 /** After each save that changed something, for the panels that show the same record. */
 onSaved?:(copy:D)=>void;
}

export type FieldStatus=
 |{state:'idle'}
 |{state:'saving'}
 |{state:'failed';message:string;kept?:boolean;local?:boolean}
 |{state:'conflict';theirs:unknown;mine:unknown;by:string|null};
/** Turns typed text into the value a field saves, or refuses it in words that name the accepted form. */
export type Parse=(text:string)=>{value:unknown}|{error:string};

const same=(a:unknown,b:unknown)=>JSON.stringify(a??null)===JSON.stringify(b??null);
const unreachable='Not saved: Orbit could not be reached.';
const words=(error:unknown)=>error instanceof SaveRefused?`Not saved: ${error.message}`:unreachable;

/** Binds a form's fields to one save function. It keeps the last answered copy, sends only a changed value, keeps one
 * request in flight with the newest changes queued behind it, marks each field saving, saved (2 s) or failed, keeps
 * every change on this device until the server answers, registers what is unsaved with the leave guard and handles
 * a 409: a field that still holds the value it was changed from is sent again on the new copy; a field someone else
 * changed shows their value with Use mine. Text commits when left (or on Enter in one line); choices on change. */
export function useAutosave<D extends Values>(options:AutosaveOptions<D>){
 const settings=useRef(options);settings.current=options;
 const key=options.key;
 const copy=useRef<D|null>(options.copy);
 const queue=useRef(new Map<string,unknown>()),sending=useRef<Map<string,unknown>|null>(null),failed=useRef(new Map<string,{value:unknown;message:string;kept?:boolean}>());
 const resent=useRef(new Set<string>()),inflight=useRef<Promise<void>|null>(null),labels=useRef(new Map<string,{label:string;element:()=>HTMLElement|null}>());
 const parsers=useRef(new Map<string,Parse>()),invalid=useRef(new Map<string,string>());
 const [drafts,setDrafts]=useState<Record<string,unknown>>({}),draftsRef=useRef(drafts);
 const [statuses,setStatuses]=useState<Record<string,FieldStatus>>({});
 const [saved,setSaved]=useState<string|null>(null),savedTimer=useRef<ReturnType<typeof setTimeout>>(undefined);
 const [,render]=useState(0);
 const status=(field:string,next:FieldStatus)=>setStatuses(current=>({...current,[field]:next}));
 const draft=(field:string,value:unknown)=>{const next={...draftsRef.current};if(value===undefined)delete next[field];else next[field]=value;draftsRef.current=next;setDrafts(next);};
 const newer=(next:D)=>{const version=settings.current.version,current=copy.current;if(!current||!version)return true;return (version(next)??'')>=(version(current)??'');};

 /** A copy read by the page (a reload, a teammate's change) replaces the hook's own unless a save answered a newer one. */
 function adopt(next:D|null){if(!next||next===copy.current||!newer(next))return;if(!settings.current.version&&copy.current&&(inflight.current||queue.current.size))return;copy.current=next;render(value=>value+1);}
 const restored=useRef(false);
 useEffect(()=>{adopt(options.copy);if(!restored.current&&copy.current){restored.current=true;restore(copy.current);}},[options.copy]);

 /** Changes kept on this device by an earlier visit that never reached the server come back in their fields. */
 function restore(current:D){
  const version=settings.current.version?.(current)??null;
  for(const [field,edit] of Object.entries(keptEdits(key,version))){
   if(same(edit.value,current[field])){dropEdit(key,field);continue;}
   failed.current.set(field,{value:edit.value,message:'Not saved yet.',kept:true});status(field,{state:'failed',message:'Not saved yet.',kept:true});
  }
 }

 function showSaved(field:string){clearTimeout(savedTimer.current);setSaved(field);savedTimer.current=setTimeout(()=>setSaved(null),2000);}
 useEffect(()=>()=>clearTimeout(savedTimer.current),[]);

 function flush(init:{keepalive?:boolean}={}){
  const current=copy.current;
  if(inflight.current||!current||!queue.current.size)return;
  const changes=Object.fromEntries(queue.current) as Partial<D>,base=Object.fromEntries(Object.keys(changes).map(field=>[field,current[field]])) as Partial<D>;
  queue.current.clear();sending.current=new Map(Object.entries(changes));
  inflight.current=settings.current.send(changes,base,current,init).then(answer=>answered(changes,answer),error=>refused(changes,base,error)).finally(()=>{sending.current=null;inflight.current=null;flush();render(value=>value+1);});
 }
 /** Puts every field being typed into the queue, as leaving it would. */
 function commitTyping(){for(const field of Object.keys(draftsRef.current))commit(field,undefined,false);}
 function answered(changes:Partial<D>,answer:SaveAnswer<D>){
  copy.current=answer.copy;let last:string|null=null;
  for(const field of Object.keys(changes)){resent.current.delete(field);if(queue.current.has(field))continue;dropEdit(key,field);status(field,{state:'idle'});last=field;}
  if(answer.changed&&last)showSaved(last);
  if(answer.changed)settings.current.onSaved?.(answer.copy);
 }
 async function refused(changes:Partial<D>,base:Partial<D>,error:unknown){
  if(error instanceof SaveRefused&&error.revert){for(const field of Object.keys(changes)){if(queue.current.has(field))continue;dropEdit(key,field);status(field,{state:'failed',message:error.message,local:true});}return;}
  if(error instanceof SaveRefused&&error.status===409){
   let fresh=error.current as D|undefined;
   if(!fresh){try{fresh=await settings.current.reread();}catch{fresh=undefined;}}
   if(fresh){
    copy.current=fresh;
    for(const [field,mine] of Object.entries(changes)){
     if(queue.current.has(field))continue;
     if(same(fresh[field],mine)){dropEdit(key,field);status(field,{state:'idle'});}
     else if(same(fresh[field],base[field])&&!resent.current.has(field)){resent.current.add(field);queue.current.set(field,mine);}
     else{resent.current.delete(field);dropEdit(key,field);status(field,{state:'conflict',theirs:fresh[field],mine,by:error.changedBy??null});}
    }
    return;
   }
  }
  for(const [field,value] of Object.entries(changes)){if(queue.current.has(field))continue;resent.current.delete(field);const message=words(error);failed.current.set(field,{value,message});status(field,{state:'failed',message});}
 }

 /** The value a field shows: what is being typed, else what waits to save, else the saved copy. */
 function value(field:string):any{
  if(Object.hasOwn(draftsRef.current,field))return draftsRef.current[field];
  if(queue.current.has(field))return queue.current.get(field);
  if(sending.current?.has(field))return sending.current.get(field);
  if(failed.current.has(field))return failed.current.get(field)!.value;
  return copy.current?.[field];
 }
 /** Typing: shown at once, sent when the field commits; parse turns the text into the saved value. */
 function edit(field:string,next:unknown,parse?:Parse){if(parse)parsers.current.set(field,parse);draft(field,next);}
 /** Sends a field's typed value (or the given one) unless it is the value already saved or waiting. */
 function commit(field:string,given?:unknown,send=true){
  const current=copy.current;if(!current)return;
  let next=given;
  if(next===undefined){
   if(!Object.hasOwn(draftsRef.current,field))return;
   const text=draftsRef.current[field],parse=parsers.current.get(field),parsed=parse&&typeof text==='string'?parse(text):{value:text};
   // A value the field cannot take stays as typed with its reason under it; nothing is sent.
   if('error' in parsed){invalid.current.set(field,parsed.error);status(field,{state:'failed',message:parsed.error,local:true});return;}
   next=parsed.value;
  }
  draft(field,undefined);
  if(invalid.current.delete(field))status(field,{state:'idle'});
  const wasFailed=failed.current.delete(field);
  const holding=queue.current.has(field)?queue.current.get(field):sending.current?.has(field)?sending.current.get(field):current[field];
  if(same(next,holding)){if(wasFailed){dropEdit(key,field);status(field,{state:'idle'});}return;}
  queue.current.set(field,next);keepEdit(key,field,next,current[field]);status(field,{state:'saving'});if(send)flush();
 }
 /** Sends a failed or kept change again: the same change on the same copy, so it never writes twice. */
 function retry(field?:string){
  for(const [name,entry] of [...failed.current]){if(field&&name!==field)continue;failed.current.delete(name);queue.current.set(name,entry.value);keepEdit(key,name,entry.value,copy.current?.[name]);status(name,{state:'saving'});}
  flush();
 }
 /** Leaves a kept or failed change and shows the saved value again. */
 function discard(field:string){failed.current.delete(field);invalid.current.delete(field);dropEdit(key,field);draft(field,undefined);status(field,{state:'idle'});}
 /** After someone else's change: send yours over theirs. */
 function useMine(field:string){const state=statuses[field];if(state?.state!=='conflict')return;status(field,{state:'idle'});commit(field,state.mine);}
 /** Lets the leave guard name a field and bring it into view. */
 function describe(field:string,label:string,element:()=>HTMLElement|null){labels.current.set(field,{label,element});}

 const unsaved=()=>[...[...invalid.current].map(([field,message])=>[field,{message}] as const),...[...failed.current].filter(([,entry])=>!entry.kept)];
 useEffect(()=>registerForm({
  async settle(){commitTyping();for(;;){if(inflight.current){await inflight.current;continue;}if(queue.current.size){flush();continue;}return !unsaved().length;}},
  async retry(){retry();return this.settle();},
  unsaved(){const [field,entry]=unsaved()[0]??[];if(!field||!entry)return null;const described=labels.current.get(field);return {label:described?.label??'A change',message:entry.message,element:described?.element()??null};},
  leaving(final){
   commitTyping();
   const current=copy.current;if(!current)return;
   if(!final||!inflight.current){flush({keepalive:true});return;}
   // The page is going away with a save in flight: everything waiting goes in one more request that outlives it.
   const changes={...Object.fromEntries(sending.current??[]),...Object.fromEntries(queue.current)} as Partial<D>;
   const base=Object.fromEntries(Object.keys(changes).map(field=>[field,current[field]])) as Partial<D>;
   void settings.current.send(changes,base,current,{keepalive:true}).catch(()=>{});
  },
 } satisfies GuardedForm),[key]);

 return {
  copy:copy.current,value,edit,commit,retry,discard,useMine,describe,
  status:(field:string):FieldStatus=>statuses[field]??{state:'idle'},
  saved:(field:string)=>saved===field,
  busy:Boolean(inflight.current)||queue.current.size>0,
  typing:(field:string)=>Object.hasOwn(drafts,field),
 };
}
export type AutosaveForm=ReturnType<typeof useAutosave>;
