import {ActionTooltip} from '../operator/ui/action-tooltip';
import {useEffect,useId,useRef,type ReactNode} from 'react';
/** Native dialog containment, Escape and restoration follow useOperatorDialog's focus pattern. */
export function DashboardModal({title,onClose,children,drawer=false,returnFocus}:{title:string;onClose:()=>void;children:ReactNode;drawer?:boolean;returnFocus?:HTMLElement|null}){
 const element=useRef<HTMLDialogElement>(null),heading=useRef<HTMLHeadingElement>(null),id=useId();
 useEffect(()=>{const trigger=returnFocus??(document.activeElement instanceof HTMLElement?document.activeElement:null);element.current?.showModal();heading.current?.focus();return()=>{element.current?.close();if(trigger?.isConnected)trigger.focus();};},[]);
 return <dialog ref={element} className={`operator-dialog dash-dialog${drawer?' dash-drawer':''}`} aria-labelledby={id} onCancel={event=>{event.preventDefault();onClose();}} onKeyDown={event=>{if(event.key!=='Tab')return;const items=[...event.currentTarget.querySelectorAll<HTMLElement>('button,input,select,textarea,a[href],summary')].filter(item=>!item.hasAttribute('disabled')),first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}}>
  <header className="dash-dialog__header"><h2 ref={heading} tabIndex={-1} id={id}>{title}</h2><ActionTooltip label="Close dialog"><button type="button" onClick={onClose}>×</button></ActionTooltip></header>{children}
 </dialog>;
}
