import {useEffect,useState} from 'react';
import type {DashboardFilters} from './schema';
import {filtersPeriod} from './display';
const lastDay=(month:string)=>{const [year,m]=month.split('-').map(Number);return new Date(Date.UTC(year!,m!,0)).toISOString().slice(0,10);};
const sameRange=(a:DashboardFilters,b:DashboardFilters)=>a.from===b.from&&a.through===b.through&&JSON.stringify(a.dateRange??null)===JSON.stringify(b.dateRange??null);
/** The saved period shows as itself; Start and End appear once "Custom date range" is chosen, and an end before the start is refused here. */
export function DashboardDateFilter({filters,saved,timezone,onChange}:{filters:DashboardFilters;saved:DashboardFilters;timezone:string;onChange:(filters:DashboardFilters)=>void}){
 const [start,setStart]=useState(filters.dateRange?.from??''),[end,setEnd]=useState(filters.dateRange?.through??''),[custom,setCustom]=useState(false),[refused,setRefused]=useState(false);
 useEffect(()=>{setStart(filters.dateRange?.from??'');setEnd(filters.dateRange?.through??'');if(sameRange(filters,saved))setCustom(false);},[filters.from,filters.through,filters.dateRange?.from,filters.dateRange?.through]);
 const apply=(from:string,through:string)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(through))return;setRefused(through<from);if(through>=from)onChange({...filters,from:from.slice(0,7),through:through.slice(0,7),dateRange:{from,through}});};
 const months=`${filters.from}:${filters.through}`,key=custom||filters.dateRange&&!sameRange(filters,saved)?'custom':sameRange(filters,saved)?'saved':months;
 return <><label className="dash-filters__date">Date range<select aria-label="Date range" value={key} onChange={e=>{setRefused(false);if(e.target.value==='custom'){setCustom(true);setStart(filters.dateRange?.from??`${filters.from}-01`);setEnd(filters.dateRange?.through??lastDay(filters.through));}else{setCustom(false);onChange({...filters,from:saved.from,through:saved.through,dateRange:saved.dateRange});}}}><option value="saved">{filtersPeriod(saved,timezone)}</option>{key===months&&<option value={months}>{filtersPeriod(filters,timezone)}</option>}<option value="custom">Custom date range</option></select></label>{key==='custom'&&<><label>Start date<input type="date" value={start} onChange={e=>{setStart(e.target.value);apply(e.target.value,end);}}/></label><label>End date<input type="date" value={end} onChange={e=>{setEnd(e.target.value);apply(start,e.target.value);}}/></label>{refused&&<p role="alert" className="dash-filters__refused">Choose an end date on or after the start date.</p>}</>}
 </>;
}
