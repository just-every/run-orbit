import {TypedFieldHistory} from './typed-field-history';
import {TypedFieldReview,type Definition,type Review} from './typed-field-review';
import {FieldOutcome,refusal,type Outcome} from './typed-field-outcome';
import {useEffect,useRef,useState} from 'react';
import {recordsRequest} from './records-api';
import {plainFailure} from '../../dashboards/save-failure';
import {OperatorState} from './operator-shell';
import {typeLabels} from './typed-field-words';
import {fieldKeyFor} from './typed-field-key';
import './typed-field-settings.css';
const blank:Definition={fieldKey:'',label:'',valueType:'text',required:false,unique:false,options:[],archived:false};
const saved=(f:any):Definition=>({fieldKey:f.field_key,label:f.label,valueType:f.value_type,required:!!f.required,unique:!!f.is_unique,options:JSON.parse(f.options_json),archived:false});
export function TypedFieldSettings(){
 const name=useRef<HTMLInputElement>(null),chosen=useRef(false);
 const [kind,setKind]=useState('contact'),[fields,setFields]=useState<any[]>([]),[editable,setEditable]=useState(false),[listFailure,setListFailure]=useState(''),[value,setValue]=useState(blank),[review,setReview]=useState<Review>(),[busy,setBusy]=useState(false),[outcome,setOutcome]=useState<Outcome>(),[open,setOpen]=useState(false),[named,setNamed]=useState(0),[changing,setChanging]=useState<any>();
 const key=changing?.field_key??fieldKeyFor(value.label,new Set(fields.map(f=>f.field_key)));
 // An empty list opens the create form; its first field takes focus only when the owner chose this record type, never on page load.
 async function load(){setListFailure('');try{const result=await recordsRequest<any>('settings/custom-fields?kind='+kind);setFields(result.fields);setEditable(result.editable);if(result.editable&&!result.fields.length){setOpen(true);if(chosen.current)setNamed(n=>n+1);}}catch(e){setListFailure(plainFailure(e));}}
 useEffect(()=>{setReview(undefined);setOutcome(undefined);setValue(blank);setChanging(undefined);void load();},[kind]);
 useEffect(()=>{if(named)name.current?.focus();},[named]);
 // A review shows where it was asked for: "editor", or the key of the archived row being restored. Its refusals show under that
 // control; a preview fetched again after a refused Apply keeps the old review on screen until the fresh one arrives.
 async function preview(input:Definition,place:string,refreshing=false){
  if(busy)return;setBusy(true);setOutcome(undefined);
  try{setReview({...await recordsRequest<Omit<Review,'place'>>('settings/custom-fields/preview','POST',{kind,...input}),place,refreshed:refreshing});}
  catch(e){const at=refreshing?'review':place==='editor'?'editor':'row:'+place;if(!refreshing)setReview(undefined);setOutcome(refusal(at,e,()=>void preview(input,place,refreshing),()=>void preview(input,place,refreshing)));}
  finally{setBusy(false);}
 }
 async function apply(current:Review){
  if(busy)return;setBusy(true);setOutcome(undefined);
  try{await recordsRequest('settings/custom-fields/confirm','POST',{input:current.input,reviewHash:current.reviewHash,confirmed:true});setReview(undefined);if(current.place==='editor'){setValue(blank);setChanging(undefined);setOpen(false);}setOutcome({at:current.place==='editor'?'saved':'row:'+current.place,text:'Saved',failed:false});await load();}
  catch(e){if((e as {status?:number}).status===409)setReview({...current,stale:true,refreshed:false});setOutcome(refusal('review',e,()=>void apply(current),()=>void preview(current.input,current.place,true)));}
  finally{setBusy(false);}
 }
 const reviewAt=(place:string)=>review?.place===place&&<TypedFieldReview review={review} busy={busy} outcome={outcome?.at==='review'?outcome:undefined} onApply={()=>void apply(review)} onCancel={()=>{setReview(undefined);setOutcome(undefined);}}/>;
 // Archiving keeps the field's saved name, type and choices, so its inputs hold still while Archive field is ticked.
 const locked=value.archived;
 return <section className="operator-surface workbench-form" aria-labelledby="typed-fields"><h2 id="typed-fields">Custom field definitions</h2>
  <label>Record type<select aria-label="Field record type" value={kind} onChange={e=>{chosen.current=true;setKind(e.target.value);}}><option value="contact">Contacts</option><option value="company">Companies</option><option value="opportunity">Deals</option></select></label>
  {listFailure?<OperatorState kind="error">{listFailure} <button type="button" onClick={()=>void load()}>Retry</button></OperatorState>:<ul>{fields.map(f=><li key={f.field_key}><div className="typed-field-row"><span>{f.label} · {typeLabels[f.value_type]}{f.required?' · Required':''}{f.is_unique?' · Unique':''}{f.archived?' · Archived':''}</span>
   {editable&&!f.archived&&<button type="button" onClick={()=>{setChanging(f);setValue(saved(f));setReview(undefined);setOutcome(undefined);setOpen(true);setNamed(n=>n+1);}}>Change<span className="typed-field-visually-hidden"> {f.label}</span></button>}
   {editable&&!!f.archived&&<button type="button" aria-disabled={busy||undefined} onClick={()=>void preview(saved(f),f.field_key)}>Restore<span className="typed-field-visually-hidden"> {f.label}</span></button>}</div>
   {reviewAt(f.field_key)}{outcome?.at==='row:'+f.field_key&&<FieldOutcome outcome={outcome}/>}
   <TypedFieldHistory key={kind+f.field_key+f.revision} kind={kind} fieldKey={f.field_key} label={f.label}/></li>)}</ul>}
  {editable&&<details open={open} onToggle={e=>{const opened=e.currentTarget.open;setOpen(opened);if(!opened&&changing){setChanging(undefined);setValue(blank);setReview(undefined);}}}><summary>Define or change a field</summary><form className="workbench-form" onSubmit={e=>{e.preventDefault();void preview({...value,fieldKey:key},'editor');}} onChange={()=>{setReview(undefined);setOutcome(undefined);}}>
   <label>Field name<input ref={name} aria-label="Field name" required disabled={locked} value={value.label} onChange={e=>setValue({...value,label:e.target.value})}/></label>{(changing||value.label.trim())&&<p className="typed-field-key">Key <code>{key}</code></p>}
   <label>Field type<select aria-label="Field type" disabled={locked} value={value.valueType} onChange={e=>setValue({...value,valueType:e.target.value})}><option value="text">Text</option><option value="number">Number</option><option value="date">Date</option><option value="picklist">Picklist</option></select></label>
   {value.valueType==='picklist'&&<label>Picklist options<textarea aria-label="Picklist options" required disabled={locked} value={value.options.join('\n')} onChange={e=>setValue({...value,options:e.target.value.split('\n')})}/></label>}
   <label><input type="checkbox" disabled={locked} checked={value.required} onChange={e=>setValue({...value,required:e.target.checked})}/>Required</label><label><input type="checkbox" disabled={locked} checked={value.unique} onChange={e=>setValue({...value,unique:e.target.checked})}/>Unique</label>
   {changing&&<label><input type="checkbox" checked={value.archived} onChange={e=>setValue(e.target.checked?{...saved(changing),archived:true}:{...value,archived:false})}/>Archive field</label>}
   <button className="operator-button" aria-disabled={busy||undefined}>Preview affected records</button>{outcome?.at==='editor'&&<FieldOutcome outcome={outcome}/>}</form></details>}
  {reviewAt('editor')}
  {outcome?.at==='saved'&&<FieldOutcome outcome={outcome}/>}
 </section>;
}
