import {useId,useState} from 'react';
import {ActionTooltip} from './action-tooltip';
import {recordStateLabel} from './record-presentation';

type Filters=Record<string,string>;
const names:Record<string,string>={pipeline_id:'Pipeline',lifecycle:'Status',band:'Priority',queue_state:'Queue',stage_id:'Stage',owner_id:'Owner'};
export function RecordsFilters({query,onQuery,filters,onFilters,settings,opportunities}:{query:string;onQuery:(query:string)=>void;filters:Filters;onFilters:(filters:Filters)=>void;settings:any;opportunities:boolean}){
 const [open,setOpen]=useState(false),id=useId();
 const applied=Object.entries(filters).filter(([,value])=>value);
 const options:Record<string,{id:string;name:string}[]>={
  pipeline_id:settings?.pipelines??[],
  lifecycle:['open','won','lost'].map(value=>({id:value,name:recordStateLabel(value)})),
  band:['low','medium','high'].map(value=>({id:value,name:recordStateLabel(value)})),
  queue_state:['now','next','none'].map(value=>({id:value,name:recordStateLabel(value)})),
  stage_id:settings?.stages.filter((stage:any)=>!filters.pipeline_id||stage.pipeline_id===filters.pipeline_id)??[],
  owner_id:(settings?.operators??[]).filter((operator:any)=>operator.status==='active').map((operator:any)=>({id:operator.id,name:operator.display_name}))
 };
 function change(field:string,value:string){onFilters({...filters,[field]:value,...(field==='pipeline_id'?{stage_id:''}:{})});}
 return <section className="records-search" aria-label="Search and filters">
  <div className="records-search__bar"><label>Search records and timeline<input value={query} onChange={event=>onQuery(event.target.value)} type="search"/></label>
   {opportunities?<button type="button" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(!open)}>Filter{applied.length?` (${applied.length})`:''}</button>:null}
   {opportunities&&applied.length?<ul className="records-filter-chips" aria-label="Applied filters">{applied.map(([field,value])=><li key={field}><span>{names[field]}: {options[field]?.find(option=>option.id===value)?.name??recordStateLabel(value)}</span><ActionTooltip label={`Remove ${names[field]?.toLowerCase()} filter`}><button type="button" onClick={()=>change(field,'')}><span aria-hidden="true">×</span></button></ActionTooltip></li>)}</ul>:null}
  </div>
  {opportunities?<div className="records-filters" id={id} hidden={!open}>{Object.entries(names).map(([field,name])=><label key={field}>{name}<select aria-label={name} value={filters[field]??''} onChange={event=>change(field,event.target.value)}><option value="">{field==='pipeline_id'?'All pipelines':'All'}</option>{options[field]?.map(option=><option key={option.id} value={option.id}>{option.name}</option>)}</select></label>)}</div>:null}
 </section>;
}
