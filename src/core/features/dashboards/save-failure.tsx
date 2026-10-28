import {useLayoutEffect,useRef} from 'react';
/** A write that did not land, said plainly: the dialog keeps every edit, and Retry tries again. */
export const plainFailure=(error:unknown)=>error instanceof TypeError||error instanceof SyntaxError?'Couldn’t reach Orbit.':error instanceof Error?error.message:String(error);
/** Re-applies only the fields this person changed onto the server's current version. */
export const rebase=<T extends object>(loaded:T,mine:T,fresh:T,keys:(keyof T)[]):T=>({...fresh,...Object.fromEntries(keys.filter(key=>JSON.stringify(mine[key])!==JSON.stringify(loaded[key])).map(key=>[key,mine[key]]))});
export function SaveFailure({message,onRetry}:{message:string;onRetry?:()=>void}){
 const element=useRef<HTMLParagraphElement>(null);
 useLayoutEffect(()=>{
  const line=element.current,dialog=line?.closest('dialog');if(!line||!dialog)return;
  const actions=line.nextElementSibling?.matches('.operator-dialog__actions')?line.nextElementSibling:null;
  const box=dialog.getBoundingClientRect(),failure=line.getBoundingClientRect(),buttons=actions?.getBoundingClientRect();
  const top=Math.min(failure.top,buttons?.top??failure.top),bottom=Math.max(failure.bottom,buttons?.bottom??failure.bottom),visibleTop=Math.max(box.top,0),visibleBottom=Math.min(box.bottom,window.innerHeight);
  // Scroll only this dialog, by the clipped extent; keep the press's focus and already visible content in place.
  if(bottom>visibleBottom+0.5)dialog.scrollTop+=bottom-visibleBottom;else if(top<visibleTop-0.5)dialog.scrollTop+=top-visibleTop;
 },[message]);
 return <p ref={element} role="alert" className="operator-state operator-state--error dash-failure">{message}{onRetry&&<> <button type="button" className="dash-text-button" onClick={onRetry}>Retry</button></>}</p>;
}
