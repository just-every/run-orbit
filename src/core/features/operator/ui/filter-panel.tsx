import {useId,useRef,useState,type KeyboardEvent} from 'react';
import {ActionTooltip} from './action-tooltip';

/** One field a list can be filtered by: its name, the choice that means every value, and its options. */
export interface FilterField {field:string;name:string;all:string;options:{id:string;name:string}[];selectLabel?:string}
type Values=Record<string,string>;

/** One Filter control for a list (Records, NOW): the button opens a panel of selects under it; Escape in the panel
 * closes it and returns focus to Filter. A set filter shows as a chip whose × removes it. */
export function useFilterPanel(){
 const [open,setOpen]=useState(false),id=useId(),button=useRef<HTMLButtonElement>(null);
 return {open,id,button,toggle:()=>setOpen(!open),close:()=>{setOpen(false);button.current?.focus();}};
}
export type FilterPanelState=ReturnType<typeof useFilterPanel>;

export function FilterButton({panel,applied}:{panel:FilterPanelState;applied:number}){
 return <button ref={panel.button} type="button" aria-expanded={panel.open} aria-controls={panel.id} onClick={panel.toggle}>Filter{applied?` (${applied})`:''}</button>;
}

export function FilterPanel({panel,fields,values,onChange,className=''}:{panel:FilterPanelState;fields:FilterField[];values:Values;onChange:(field:string,value:string)=>void;className?:string}){
 const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();panel.close();}};
 return <div className={`records-filters ${className}`.trim()} id={panel.id} hidden={!panel.open} onKeyDown={escape}>{fields.map(item=><label key={item.field}>{item.name}<select aria-label={item.selectLabel??item.name} value={values[item.field]??''} onChange={event=>onChange(item.field,event.target.value)}><option value="">{item.all}</option>{item.options.map(option=><option key={option.id} value={option.id}>{option.name}</option>)}</select></label>)}</div>;
}

export function FilterChips({fields,values,onChange,valueName=value=>value}:{fields:FilterField[];values:Values;onChange:(field:string,value:string)=>void;valueName?:(value:string)=>string}){
 const applied=fields.filter(item=>values[item.field]);
 if(!applied.length)return null;
 return <ul className="records-filter-chips" aria-label="Applied filters">{applied.map(item=><li key={item.field}><span>{item.name}: {item.options.find(option=>option.id===values[item.field])?.name??valueName(values[item.field]!)}</span><ActionTooltip label={`Remove ${item.name.toLowerCase()} filter`}><button type="button" onClick={()=>onChange(item.field,'')}><span aria-hidden="true">×</span></button></ActionTooltip></li>)}</ul>;
}
