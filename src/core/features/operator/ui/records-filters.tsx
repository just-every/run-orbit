import {FilterButton,FilterChips,FilterPanel,useFilterPanel,type FilterField} from './filter-panel';
import {recordStateLabel} from './record-presentation';

type Filters=Record<string,string>;
const names:Record<string,string>={pipeline_id:'Pipeline',lifecycle:'Status',band:'Priority',queue_state:'Queue',stage_id:'Stage',owner_id:'Owner'};
export function RecordsFilters({query,onQuery,filters,onFilters,settings,opportunities}:{query:string;onQuery:(query:string)=>void;filters:Filters;onFilters:(filters:Filters)=>void;settings:any;opportunities:boolean}){
 const panel=useFilterPanel();
 const options:Record<string,{id:string;name:string}[]>={
  pipeline_id:settings?.pipelines??[],
  lifecycle:['open','won','lost'].map(value=>({id:value,name:recordStateLabel(value)})),
  band:['low','medium','high'].map(value=>({id:value,name:recordStateLabel(value)})),
  queue_state:['now','next','none'].map(value=>({id:value,name:recordStateLabel(value)})),
  stage_id:settings?.stages.filter((stage:any)=>!filters.pipeline_id||stage.pipeline_id===filters.pipeline_id)??[],
  owner_id:(settings?.operators??[]).filter((operator:any)=>operator.status==='active').map((operator:any)=>({id:operator.id,name:operator.display_name}))
 };
 const fields:FilterField[]=Object.entries(names).map(([field,name])=>({field,name,all:field==='pipeline_id'?'All pipelines':'All',options:options[field]!}));
 function change(field:string,value:string){onFilters({...filters,[field]:value,...(field==='pipeline_id'?{stage_id:''}:{})});}
 const applied=Object.values(filters).filter(Boolean).length;
 return <section className="records-search" aria-label="Search and filters">
  <div className="records-search__bar"><label>Search records and timeline<input value={query} onChange={event=>onQuery(event.target.value)} type="search"/></label>
   {opportunities?<FilterButton panel={panel} applied={applied}/>:null}
   {opportunities?<FilterChips fields={fields} values={filters} onChange={change} valueName={recordStateLabel}/>:null}
  </div>
  {opportunities?<FilterPanel panel={panel} fields={fields} values={filters} onChange={change}/>:null}
 </section>;
}
