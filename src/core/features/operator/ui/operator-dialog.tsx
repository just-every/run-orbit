import {useEffect,useId,useRef,useState} from 'react';
import type React from 'react';

interface DialogRequest {
 title:string;
 description:string;
 confirmLabel:string;
 field?:{label:string;required?:boolean;maxLength?:number};
}

/** The browser supplies modal focus containment; callers retain their mutation authority. */
export function useOperatorDialog(){
 const [request,setRequest]=useState<DialogRequest|null>(null);
 const [value,setValue]=useState('');
 const element=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLElement|null>(null);
 const pending=useRef<((value:string|null)=>void)|null>(null),id=useId();
 function finish(answer:string|null){
  element.current?.close();
  const resolve=pending.current;pending.current=null;setRequest(null);resolve?.(answer);
  if(trigger.current?.isConnected)trigger.current.focus();
 }
 // React's autoFocus runs while the dialog is still closed, so place initial focus on the safe
 // Cancel action after opening; an empty required reason takes focus through validation.
 useEffect(()=>{if(!request||!element.current)return;element.current.showModal();element.current.querySelector<HTMLElement>('[data-initial-focus]')?.focus();},[request]);
 useEffect(()=>()=>{pending.current?.(null);pending.current=null;},[]);
 // A modal dialog makes the page inert, but Tab can still leave for the browser; wrap it inside.
 function containTab(event:React.KeyboardEvent<HTMLDialogElement>){
  if(event.key!=='Tab')return;
  const items=[...event.currentTarget.querySelectorAll<HTMLElement>('button,textarea,input,select,a[href]')].filter(item=>!item.hasAttribute('disabled'));
  const first=items[0],last=items.at(-1);if(!first||!last)return;
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
 }
 function ask(next:DialogRequest):Promise<string|null>{
  pending.current?.(null);
  trigger.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
  setValue('');setRequest(next);
  return new Promise(resolve=>{pending.current=resolve;});
 }
 const dialog=request?<dialog ref={element} className="operator-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} onCancel={event=>{event.preventDefault();finish(null);}} onKeyDown={containTab}>
  <form onSubmit={event=>{event.preventDefault();finish(value);}}>
   <h2 id={`${id}-title`}>{request.title}</h2><p id={`${id}-description`}>{request.description}</p>
   {request.field&&<label>{request.field.label}<textarea value={value} required={request.field.required} maxLength={request.field.maxLength} onChange={event=>{event.currentTarget.setCustomValidity('');setValue(event.target.value);}} onInvalid={event=>{if(request.field?.required&&!value.trim())event.currentTarget.setCustomValidity('Enter a reason before continuing.');}}/></label>}
   <div className="operator-dialog__actions"><button type="button" data-initial-focus onClick={()=>finish(null)}>Cancel</button><button className="operator-button" type="submit" onClick={event=>{const field=event.currentTarget.form?.querySelector('textarea');if(field&&request.field?.required)field.setCustomValidity(value.trim()?'':'Enter a reason before continuing.');}}>{request.confirmLabel}</button></div>
  </form>
 </dialog>:null;
 return {ask,dialog};
}
