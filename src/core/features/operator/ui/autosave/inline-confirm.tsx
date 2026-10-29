import {useEffect,useRef} from 'react';

/** Asks once, under its field, for a change with outside effects: one sentence, the action's verb as an ink pill (which
 * takes focus) and an underlined way to keep things as they are. Escape keeps them too. Never a dialog. */
export function InlineConfirm({sentence,action,keep,onConfirm,onKeep,busy=false,error,focusAction=true,children}:{sentence:React.ReactNode;action:string;keep:string;onConfirm:()=>void;onKeep:()=>void;busy?:boolean;error?:string;focusAction?:boolean;children?:React.ReactNode}){
 const box=useRef<HTMLDivElement>(null),button=useRef<HTMLButtonElement>(null),asker=useRef<HTMLElement|null>(null);
 // Focus goes to the ink pill, unless a field inside (a reason) takes the caret. Keeping things as they are returns it,
 // once this question has gone, to the control that asked: read once, before focus moves here, never from inside.
 useEffect(()=>{const focused=document.activeElement;if(!asker.current&&focused instanceof HTMLElement&&focused!==document.body&&!box.current?.contains(focused))asker.current=focused;if(focusAction)button.current?.focus();},[]);
 function keepThem(){const back=asker.current;onKeep();requestAnimationFrame(()=>{if(back?.isConnected)back.focus();});}
 return <div ref={box} className="r-confirm" role="group" aria-label="Confirm change" onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();keepThem();}}}>
  <p>{sentence}</p>{children}
  <div><button ref={button} type="button" className="operator-button" disabled={busy} onClick={onConfirm}>{action}</button><button type="button" className="operator-text-button" disabled={busy} onClick={keepThem}>{keep}</button></div>
  {error?<p className="r-fail" role="alert">{error}</p>:null}
 </div>;
}
