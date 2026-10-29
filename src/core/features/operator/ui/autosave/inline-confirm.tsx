import {useEffect,useRef} from 'react';

/** Asks once, under its field, for a change with outside effects: one sentence, the action's verb as an ink pill (which
 * takes focus) and an underlined way to keep things as they are. Escape keeps them too. Never a dialog. */
export function InlineConfirm({sentence,action,keep,onConfirm,onKeep,busy=false,error,focusAction=true,children}:{sentence:React.ReactNode;action:string;keep:string;onConfirm:()=>void;onKeep:()=>void;busy?:boolean;error?:string;focusAction?:boolean;children?:React.ReactNode}){
 const button=useRef<HTMLButtonElement>(null);
 // Focus goes to the ink pill, unless a field inside (a reason) takes the caret.
 useEffect(()=>{if(focusAction)button.current?.focus();},[]);
 return <div className="r-confirm" role="group" aria-label="Confirm change" onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();onKeep();}}}>
  <p>{sentence}</p>{children}
  <div><button ref={button} type="button" className="operator-button" disabled={busy} onClick={onConfirm}>{action}</button><button type="button" className="operator-text-button" disabled={busy} onClick={onKeep}>{keep}</button></div>
  {error?<p className="r-fail" role="alert">{error}</p>:null}
 </div>;
}
