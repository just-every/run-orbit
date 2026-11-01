import {useEffect,useId,useRef,useState} from 'react';
import {DashboardIcon} from '../dashboards/icons';

/** One period control for a sales report (months), a custom report (instants) and the forecast (dates): an outline pill
 * naming the period that opens a small popover with the two labelled fields, Apply and Cancel. */
export interface PeriodKind{type:'month'|'datetime-local'|'date';start:string;end:string;exclusive:boolean}
export const salesPeriod:PeriodKind={type:'month',start:'First month',end:'Last month',exclusive:false};
export const customPeriod:PeriodKind={type:'datetime-local',start:'Window start',end:'Window end',exclusive:true};
export const forecastPeriod:PeriodKind={type:'date',start:'Forecast from',end:'Forecast through',exclusive:true};

/** The workspace month `shift` months from now, as YYYY-MM. */
export function localMonth(timezone:string,shift:number){const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:timezone,year:'numeric',month:'2-digit'}).formatToParts(new Date()).filter(part=>part.type!=='literal').map(part=>[part.type,Number(part.value)]));const index=parts.year!*12+parts.month!-1+shift;return `${Math.floor(index/12)}-${String(index%12+1).padStart(2,'0')}`;}
export const monthName=(key:string)=>{const [year,month]=key.split('-').map(Number);return new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'long',year:'numeric'}).format(new Date(Date.UTC(year!,month!-1,1)));};

const utc=(key:string)=>{const [year,month,day=1]=key.split('-').map(Number);return new Date(Date.UTC(year!,month!-1,day));};
const format=(date:Date,options:Intl.DateTimeFormatOptions,locale='en-US',timeZone='UTC')=>new Intl.DateTimeFormat(locale,{timeZone,...options}).format(date);
/** "Oct – Nov 2026"; one month "Nov 2026"; across years "Dec 2026 – Jan 2027". */
export function monthsLabel(from:string,through:string){
 const first=utc(from),last=utc(through),short=(date:Date)=>format(date,{month:'short'});
 if(from===through)return `${short(first)} ${first.getUTCFullYear()}`;
 return first.getUTCFullYear()===last.getUTCFullYear()?`${short(first)} – ${short(last)} ${last.getUTCFullYear()}`:`${short(first)} ${first.getUTCFullYear()} – ${short(last)} ${last.getUTCFullYear()}`;
}
/** A custom window in the workspace zone: "4 Oct – 1 Nov 2026", or with both years when it crosses one. */
export function windowLabel(from:string,through:string,timezone:string){
 const start=new Date(from),end=new Date(through),year=(date:Date)=>format(date,{year:'numeric'},'en-AU',timezone),day=(date:Date)=>format(date,{day:'numeric',month:'short'},'en-AU',timezone);
 return year(start)===year(end)?`${day(start)} – ${day(end)} ${year(end)}`:`${day(start)} ${year(start)} – ${day(end)} ${year(end)}`;
}
/** Forecast dates (through excluded): "November 2026" for a calendar month, "Q4 2026 · Oct 1 – Dec 31" for a calendar quarter,
 * otherwise "Oct 15 – Nov 14, 2026" from the first day to the last included day. */
export function datesLabel(from:string,through:string){
 const start=utc(from),end=utc(through),last=new Date(end.getTime()-86400000),months=(end.getUTCFullYear()-start.getUTCFullYear())*12+end.getUTCMonth()-start.getUTCMonth();
 const whole=start.getUTCDate()===1&&end.getUTCDate()===1,day=(date:Date)=>format(date,{month:'short',day:'numeric'});
 if(whole&&months===1)return format(start,{month:'long',year:'numeric'});
 if(whole&&months===3&&start.getUTCMonth()%3===0)return `Q${start.getUTCMonth()/3+1} ${start.getUTCFullYear()} · ${day(start)} – ${day(last)}`;
 return start.getUTCFullYear()===last.getUTCFullYear()?`${day(start)} – ${day(last)}, ${last.getUTCFullYear()}`:`${day(start)}, ${start.getUTCFullYear()} – ${day(last)}, ${last.getUTCFullYear()}`;
}

export function PeriodControl({kind,text,from,through,onApply}:{kind:PeriodKind;text:string;from:string;through:string;onApply:(from:string,through:string)=>void}){
 const [open,setOpen]=useState(false),[start,setStart]=useState(from),[end,setEnd]=useState(through),[reversed,setReversed]=useState(false);
 const box=useRef<HTMLDivElement>(null),pill=useRef<HTMLButtonElement>(null),first=useRef<HTMLInputElement>(null),id=useId();
 useEffect(()=>{if(!open)return;first.current?.focus();const away=(event:PointerEvent)=>{if(!box.current?.contains(event.target as Node))setOpen(false);};document.addEventListener('pointerdown',away);return()=>document.removeEventListener('pointerdown',away);},[open]);
 const show=()=>{setStart(from);setEnd(through);setReversed(false);setOpen(true);};
 const close=()=>{setOpen(false);pill.current?.focus();};
 return <div className="reports-period" ref={box} onKeyDown={event=>{if(event.key==='Escape'&&open){event.preventDefault();event.stopPropagation();close();}}}>
  <button ref={pill} type="button" className="reports-outline reports-period__pill" aria-label={`Period: ${text}`} aria-expanded={open} aria-controls={open?id:undefined} onClick={()=>open?setOpen(false):show()}><DashboardIcon kind="calendar"/><span>{text}</span><DashboardIcon kind="chevron"/></button>
  {open&&<form id={id} className="reports-period__popover" aria-label="Period" onSubmit={event=>{event.preventDefault();if(kind.exclusive?end<=start:end<start){setReversed(true);return;}close();onApply(start,end);}}>
   <div className="reports-period__fields">
    <label>{kind.start}<input ref={first} type={kind.type} required value={start} onChange={event=>{setStart(event.target.value);setReversed(false);}}/></label>
    <label>{kind.end}<input type={kind.type} required value={end} onChange={event=>{setEnd(event.target.value);setReversed(false);}}/></label>
   </div>
   {reversed&&<p className="reports-refusal" role="alert">Ends before it starts</p>}
   <div className="reports-period__actions"><button type="submit" className="reports-pill">Apply</button><button type="button" className="reports-text-button" onClick={close}>Cancel</button></div>
  </form>}
 </div>;
}
