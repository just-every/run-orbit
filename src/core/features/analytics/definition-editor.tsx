import {useRef,useState} from 'react';
import {api} from '../fold-ui/workspace';
import {ReportField,ReportFilterValue} from './report-fields';

/** A custom record report's definition: a new report (its id generated, version 1) or the next version of an open one,
 * prefilled from it. Saving goes to the saved version's address. */
export interface CustomDefinition{name?:string;description?:string;aggregation?:string;sourceTypes?:string[];valueField?:string;denominatorField?:string;groupBy?:string;filters?:Record<string,unknown>}
export type EditorMode={kind:'create'}|{kind:'edit';id:string;newest:number;definition:CustomDefinition};
export function ReportDefinitionEditor({workspaceId,mode,onSaved}:{workspaceId:string;mode:EditorMode;onSaved:(id:string,version:number)=>void}){
 const opened=mode.kind==='edit'?mode.definition:{},openedType=opened.sourceTypes?.[0]??'opportunity',[filterField,filterValue]=Object.entries(opened.filters??{})[0]??[];
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[type,setType]=useState(openedType),[filter,setFilter]=useState(filterField??''),feedback=useRef<HTMLParagraphElement>(null);
 // A changed record type starts its fields empty, as before; the open version's fields belong to its own type.
 const initial=type===openedType?opened:{};
 const action=mode.kind==='edit'?`Save as version ${mode.newest+1}`:'Save report';
 return <form className="report-editor" onSubmit={async event=>{
  event.preventDefault();const data=new FormData(event.currentTarget);setBusy(true);setError('');
  const id=mode.kind==='edit'?mode.id:crypto.randomUUID(),version=mode.kind==='edit'?mode.newest+1:1;
  try{
   await api(`/api/v2/workspaces/${encodeURIComponent(workspaceId)}/operations/metrics`,{
    id,version,definition:{
     name:String(data.get('name')),description:String(data.get('description')),aggregation:String(data.get('aggregation')),
     unit:['sum','mean'].includes(String(data.get('aggregation')))?String(data.get('value'))||'value':'records',
     sourceTypes:[String(data.get('type'))],sourceOperation:'graph.read',
     sourceFields:[...new Set(['created_at',...['value','denominator','group','filter'].map(k=>String(data.get(k))).filter(Boolean)])],
     currency:null,missingPolicy:'incomplete',lateArrival:'recompute',attributionModel:'none',attributionWindowDays:1,dateField:'created_at',
     ...(data.get('value')?{valueField:String(data.get('value'))}:{}),
     ...(data.get('denominator')?{denominatorField:String(data.get('denominator'))}:{}),
     ...(data.get('group')?{groupBy:String(data.get('group'))}:{}),
     ...(data.get('filter')?{filters:{[String(data.get('filter'))]:String(data.get('filterValue'))}}:{}),
    },
   });onSaved(id,version);
  }catch(e){setError(e instanceof Error?e.message:'Report definition was not saved.');setTimeout(()=>feedback.current?.focus(),0);}finally{setBusy(false);}
 }}><div className="fold-grid">
  <label>Name<input name="name" maxLength={120} required defaultValue={opened.name}/></label>
  <label>Record type<select name="type" value={type} onChange={event=>{setType(event.target.value);setFilter('');}}><option value="opportunity">Opportunities</option><option value="contact">Contacts</option><option value="company">Companies</option></select></label>
  <label>Calculation<select name="aggregation" defaultValue={opened.aggregation}><option value="count">Count</option><option value="sum">Sum</option><option value="mean">Mean</option><option value="ratio">Ratio</option></select></label>
  <ReportField key={`${type}-value`} name="value" title="Value field" type={type} numeric initial={initial.valueField}/>
  <ReportField key={`${type}-denominator`} name="denominator" title="Denominator field for ratio" type={type} numeric initial={initial.denominatorField}/>
  <ReportField key={`${type}-group`} name="group" title="Group by field" type={type} initial={initial.groupBy}/>
  <ReportField key={`${type}-filter`} name="filter" title="Filter field" type={type} value={filter} onChange={setFilter} initial={type===openedType?filterField:undefined}/>
  <ReportFilterValue key={`${type}-${filter}`} field={filter} initial={type===openedType&&filter===filterField&&typeof filterValue==='string'?filterValue:undefined}/>
 </div><label>Description<textarea name="description" required maxLength={2000} defaultValue={opened.description}/></label><p ref={feedback} tabIndex={-1} role={error?'alert':'status'}>{error}</p><button className="reports-pill" disabled={busy}>{busy?'Saving…':action}</button></form>;
}
