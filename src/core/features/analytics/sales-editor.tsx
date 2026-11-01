import {useEffect,useState} from 'react';
import {api} from '../fold-ui/workspace';
import {measureCatalog,salesMeasures,type SalesDefinition,type SalesMeasure} from './sales-definition';
import {SharingChoice,type Audience,type Member} from './report-sharing';

/** Saves a sales report with its filters and grouping as the next version of this report (the newest + 1) or as a new report
 * with a generated id, and sets who may open the new one. */
export interface SalesSuite{templates:{id:string;definition:SalesDefinition}[];timezone:string;currency:string;pipelines:{id:string;name:string}[];reps:{id:string;name:string}[];members:Member[];canDefine:boolean}
const toggle=(values:string[],value:string,on:boolean)=>on?[...new Set([...values,value])]:values.filter(item=>item!==value);

export function SalesReportEditor({base,suite,report,definition,onSaved}:{base:string;suite:SalesSuite;report:{id:string;newest:number};definition:SalesDefinition;onSaved:(id:string,version:number)=>void}){
 const [draft,setDraft]=useState<SalesDefinition>(definition),[audience,setAudience]=useState<Audience>('workspace'),[named,setNamed]=useState<string[]>([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{setDraft(definition);setMessage('');},[definition,report.id,report.newest]);
 if(!suite.canDefine)return null;
 const next=report.newest+1;
 async function save(asVersion:boolean){
  setBusy(true);setMessage('');
  try{const id=asVersion?report.id:crypto.randomUUID(),version=asVersion?next:1;
   await api(`${base}/metrics`,{id,version,definition:draft,...(asVersion?{}:{sharing:{audience,operatorIds:audience==='operators'?named:[]}})});
   setMessage(asVersion?`Saved as version ${version}.`:'Saved as a new report.');onSaved(id,version);
  }catch(error){setMessage(error instanceof Error?error.message:'The report was not saved.');}finally{setBusy(false);}
 }
 const set=<K extends keyof SalesDefinition>(field:K,value:SalesDefinition[K])=>setDraft(current=>({...current,[field]:value}));
 return <div className="sales-editor">
  <div className="fold-grid">
   <label>Report name<input value={draft.name} maxLength={120} onChange={event=>set('name',event.target.value)}/></label>
   <label>Report description<input value={draft.description} maxLength={2000} onChange={event=>set('description',event.target.value)}/></label>
   <label>Group pipeline by<select value={draft.groupBy} onChange={event=>set('groupBy',event.target.value as SalesDefinition['groupBy'])}><option value="pipeline">Pipeline</option><option value="stage">Stage</option><option value="owner">Owner</option></select></label>
  </div>
  <fieldset><legend>Measures</legend>{salesMeasures.map(measure=><label key={measure} className="sales-check"><input type="checkbox" checked={draft.measures.includes(measure)} onChange={event=>set('measures',salesMeasures.filter(item=>item===measure?event.target.checked:draft.measures.includes(item)) as SalesMeasure[])}/>{measureCatalog[measure].title}</label>)}</fieldset>
  <fieldset><legend>Pipelines (none chosen means all)</legend>{suite.pipelines.map(pipeline=><label key={pipeline.id} className="sales-check"><input type="checkbox" checked={draft.pipelineIds.includes(pipeline.id)} onChange={event=>set('pipelineIds',toggle(draft.pipelineIds,pipeline.id,event.target.checked))}/>{pipeline.name}</label>)}</fieldset>
  {suite.reps.length>0&&<fieldset><legend>Reps (none chosen means all)</legend>{suite.reps.map(rep=><label key={rep.id} className="sales-check"><input type="checkbox" checked={draft.repIds.includes(rep.id)} onChange={event=>set('repIds',toggle(draft.repIds,rep.id,event.target.checked))}/>{rep.name}</label>)}</fieldset>}
  <button type="button" className="reports-pill" disabled={busy||!draft.measures.length} onClick={()=>save(true)}>Save as version {next}</button>
  <fieldset><legend>Save as a new report</legend>
   <SharingChoice audience={audience} named={named} members={suite.members} onAudience={setAudience} onNamed={setNamed} legend="Who may open the new report"/>
   <button type="button" className="reports-outline" disabled={busy||!draft.measures.length} onClick={()=>save(false)}>Save as new report</button>
  </fieldset>
  <p role="status">{message}</p>
 </div>;
}
