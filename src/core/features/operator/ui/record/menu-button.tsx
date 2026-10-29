import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {ActionTooltip} from '../action-tooltip';
import './menu-button.css';

export interface MenuChoice{label:string;checked?:boolean;onChoose:()=>void}

/** A small menu under its button: the choices as menu items; Escape, a choice or a click elsewhere closes it and focus
 * returns to the button. An icon-only button carries its tooltip. */
export function MenuButton({label,tooltip,className,choices}:{label:ReactNode;tooltip?:string;className:string;choices:MenuChoice[]}){
 const [open,setOpen]=useState(false),box=useRef<HTMLSpanElement>(null),trigger=useRef<HTMLButtonElement|null>(null),id=useId();
 useEffect(()=>{if(!open)return;const away=(event:PointerEvent)=>{if(!box.current?.contains(event.target as Node))setOpen(false);};document.addEventListener('pointerdown',away);box.current?.querySelector<HTMLButtonElement>('[role="menu"] button')?.focus();return()=>document.removeEventListener('pointerdown',away);},[open]);
 const close=()=>{setOpen(false);trigger.current?.focus();};
 const button=<button ref={trigger} type="button" className={className} aria-haspopup="menu" aria-expanded={open} aria-controls={open?id:undefined} onClick={()=>setOpen(!open)}>{label}</button>;
 return <span className="r-menu-box" ref={box} onKeyDown={event=>{if(event.key==='Escape'&&open){event.stopPropagation();close();}}}>
  {tooltip?<ActionTooltip label={tooltip}>{button}</ActionTooltip>:button}
  {open?<ul id={id} role="menu" className="r-menu">{choices.map(choice=><li key={choice.label} role="none"><button type="button" role={choice.checked===undefined?'menuitem':'menuitemcheckbox'} aria-checked={choice.checked} onClick={()=>{choice.onChoose();close();}}>{choice.label}</button></li>)}</ul>:null}
 </span>;
}
