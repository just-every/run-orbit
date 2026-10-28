import {useEffect,useId,useRef,useState} from 'react';
import {DashboardIcon} from './icons';
/** A menu button whose label is the viewer's current default state; its menu holds the opposite action. A failed change keeps the
 *  current default and offers Retry under the control. */
export function DashboardDefaultMenu({isDefault,onChange}:{isDefault:boolean;onChange:(enabled:boolean)=>Promise<void>}){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[failed,setFailed]=useState<boolean|null>(null),root=useRef<HTMLDivElement>(null),button=useRef<HTMLButtonElement>(null),item=useRef<HTMLButtonElement>(null),id=useId();
 useEffect(()=>{if(!open)return;item.current?.focus();const away=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};document.addEventListener('pointerdown',away);return()=>document.removeEventListener('pointerdown',away);},[open]);
 const close=()=>{setOpen(false);button.current?.focus();};
 const change=async(enabled:boolean)=>{setOpen(false);setBusy(true);setFailed(null);try{await onChange(enabled);}catch{setFailed(enabled);}finally{setBusy(false);button.current?.focus();}};
 return <div className="dash-default" ref={root}>
  <button ref={button} type="button" className="dash-default__button" aria-haspopup="menu" aria-expanded={open} aria-controls={open?id:undefined} aria-busy={busy} onClick={()=>{if(!busy)setOpen(value=>!value);}} onKeyDown={event=>{if(event.key==='ArrowDown'){event.preventDefault();setOpen(true);}}}>{isDefault?'Your default dashboard':'Make this my default'}<DashboardIcon kind="chevron"/></button>
  {open&&<div className="dash-menu" role="menu" id={id} aria-label="Default dashboard" onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}else if(event.key==='Tab')setOpen(false);}}><button ref={item} type="button" role="menuitem" onClick={()=>void change(!isDefault)}>{isDefault?'Remove as my default':'Set as my default'}</button></div>}
  {failed!==null&&<p role="alert" className="dash-default__failure">Couldn’t change your default. <button type="button" className="dash-text-button" onClick={()=>void change(failed)}>Retry</button></p>}
 </div>;
}
