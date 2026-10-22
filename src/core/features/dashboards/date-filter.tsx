import {useEffect,useState} from 'react';
import type {DashboardFilters} from './schema';
const lastDay=(month:string)=>{const [year,m]=month.split('-').map(Number);return new Date(Date.UTC(year!,m!,0)).toISOString().slice(0,10);};
export function rangeLabel(filters:DashboardFilters,timezone='UTC'){
 const first=filters.dateRange?.from??`${filters.from}-01`,last=filters.dateRange?.through??lastDay(filters.through),date=new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'short',day:'numeric'}),zone=new Intl.DateTimeFormat('en-US',{timeZone:timezone,timeZoneName:'shortGeneric'}).formatToParts(new Date()).find(part=>part.type==='timeZoneName')?.value??timezone;
 const quarter=!filters.dateRange&&filters.from.slice(0,4)===filters.through.slice(0,4)&&Number(filters.from.slice(5))%3===1&&Number(filters.through.slice(5))-Number(filters.from.slice(5))===2?`Q${Math.ceil(Number(filters.from.slice(5))/3)} ${filters.from.slice(0,4)} · `:'';
 return `${quarter}${date.format(new Date(first+'T12:00:00Z'))} – ${date.format(new Date(last+'T12:00:00Z'))}${quarter?'':', '+first.slice(0,4)}, ${zone}`;
}
export function DashboardDateFilter({filters,saved,timezone,onChange}:{filters:DashboardFilters;saved:DashboardFilters;timezone:string;onChange:(filters:DashboardFilters)=>void}){
 const [start,setStart]=useState(filters.dateRange?.from??''),[end,setEnd]=useState(filters.dateRange?.through??'');useEffect(()=>{setStart(filters.dateRange?.from??'');setEnd(filters.dateRange?.through??'');},[filters.dateRange?.from,filters.dateRange?.through]);
 const apply=(from:string,through:string)=>{if(/^\d{4}-\d{2}-\d{2}$/.test(from)&&/^\d{4}-\d{2}-\d{2}$/.test(through))onChange({...filters,from:from.slice(0,7),through:through.slice(0,7),dateRange:{from,through}});};
 const savedKey=`${saved.from}:${saved.through}`,currentKey=filters.dateRange?'custom':`${filters.from}:${filters.through}`;
 return <><label>Date range<select aria-label="Date range" value={currentKey} onChange={e=>{if(e.target.value==='custom')onChange({...filters,dateRange:{from:`${filters.from}-01`,through:lastDay(filters.through)}});else onChange({...filters,from:saved.from,through:saved.through,dateRange:undefined});}}><option value={savedKey}>{rangeLabel(saved,timezone)}</option>{currentKey!=='custom'&&currentKey!==savedKey&&<option value={currentKey}>{rangeLabel(filters,timezone)}</option>}<option value="custom">Custom date range</option></select></label>{filters.dateRange&&<><label>Start date<input type="date" value={start} onChange={e=>{setStart(e.target.value);apply(e.target.value,end);}}/></label><label>End date<input type="date" value={end} onChange={e=>{setEnd(e.target.value);apply(start,e.target.value);}}/></label></>}
 </>;
}
