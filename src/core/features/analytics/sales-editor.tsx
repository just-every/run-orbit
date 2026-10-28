import {useEffect,useState} from 'react';
import {api} from '../fold-ui/workspace';
import {measureCatalog,salesMeasures,type SalesDefinition,type SalesMeasure} from './sales-definition';
import {SharingChoice,type Audience,type Member} from './report-sharing';

/** Saves a sales report with its filters and grouping as a new report or its next version, and sets who may open it. */
export interface SalesSuite{templates:{id:string;definition:SalesDefinition}[];timezone:string;currency:string;pipelines:{id:string;name:string}[];reps:{id:string;name:string}[];members:Member[];canDefine:boolean}
const toggle=(values:string[],value:string,on:boolean)=>on?[...new Set([...values,value])]:values.filter(item=>item!==value);

export function SalesReportEditor({base,suite,selected,definition,onSaved}:{base:string;suite:SalesSuite;selected:{id:string;version:number}|null;definition:SalesDefinition|null;onSaved:(id:string,version:number)=>void}){
 const [draft,setDraft]=useState<SalesDefinition|null>(definition),[key,setKey]=useState(''),[audience,setAudience]=useState<Audience>('workspace'),[named,setNamed]=useState<string[]>([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{setDraft(definition);setKey(selected?`${selected.id}-copy`:'');setMessage('');},[definition,selected?.id,selected?.version]);
 if(!draft||!suite.canDefine)return null;
 async function save(asVersion:boolean){
  setBusy(true);setMessage('');
  try{const id=asVersion?selected!.id:key,version=asVersion?selected!.version+1:1;
   await api(`${base}/metrics`,{id,version,definition:draft,...(asVersion?{}:{sharing:{audience,operatorIds:audience==='operators'?named:[]}})});
   setMessage(asVersion?`Saved version ${version}.`:'Saved as a new report.');onSaved(id,version);
  }catch(error){setMessage(error instanceof Error?error.message:'The report was not saved.');}finally{setBusy(false);}
 }
 const set=<K extends keyof SalesDefinition>(field:K,value:SalesDefinition[K])=>setDraft(current=>current?{...current,[field]:value}:current);
 return <details className="fold-panel sales-editor"><summary>Edit filters, grouping and sharing</summary>
  <div className="fold-grid">
   <label>Report name<input value={draft.name} maxLength={120} onChange={event=>set('name',event.target.value)}/></label>
   <label>Report description<input value={draft.description} maxLength={2000} onChange={event=>set('description',event.target.value)}/></label>
   <label>Group pipeline by<select value={draft.groupBy} onChange={event=>set('groupBy',event.target.value as SalesDefinition['groupBy'])}><option value="pipeline">Pipeline</option><option value="stage">Stage</option><option value="owner">Owner</option></select></label>
  <label>Group linked records by owner<select aria-label="Group linked records by owner" value={draft.recordOwnerType??''} onChange={event=>setDraft({...draft,recordOwnerType:event.target.value?event.target.value as 'contact'|'company':undefined,recordOwnerIds:[]})}><option value="">Deal owner / author / assignee</option><option value="contact">Contact owner</option><option value="company">Company owner</option></select></label></div>
  {draft.recordOwnerType&&<fieldset><legend>{draft.recordOwnerType==='contact'?'Contact':'Company'} owners (none chosen means all)</legend>{suite.reps.map(rep=><label key={rep.id} className="sales-check"><input type="checkbox" checked={draft.recordOwnerIds?.includes(rep.id)??false} onChange={event=>set('recordOwnerIds',toggle(draft.recordOwnerIds??[],rep.id,event.target.checked))}/>{rep.name}</label>)}</fieldset>}
  <fieldset><legend>Measures</legend>{salesMeasures.map(measure=><label key={measure} className="sales-check"><input type="checkbox" checked={draft.measures.includes(measure)} onChange={event=>set('measures',salesMeasures.filter(item=>item===measure?event.target.checked:draft.measures.includes(item)) as SalesMeasure[])}/>{measureCatalog[measure].title}</label>)}</fieldset>
  <fieldset><legend>Pipelines (none chosen means all)</legend>{suite.pipelines.map(pipeline=><label key={pipeline.id} className="sales-check"><input type="checkbox" checked={draft.pipelineIds.includes(pipeline.id)} onChange={event=>set('pipelineIds',toggle(draft.pipelineIds,pipeline.id,event.target.checked))}/>{pipeline.name}</label>)}</fieldset>
  {suite.reps.length>0&&<fieldset><legend>Reps (none chosen means all)</legend>{suite.reps.filter(rep=>rep.id!=='unassigned').map(rep=><label key={rep.id} className="sales-check"><input type="checkbox" checked={draft.repIds.includes(rep.id)} onChange={event=>set('repIds',toggle(draft.repIds,rep.id,event.target.checked))}/>{rep.name}</label>)}</fieldset>}
  <fieldset><legend>Save as a new report</legend>
   <label>Report key<input value={key} pattern="[a-z0-9_\-]+" maxLength={100} aria-describedby="sales-report-key-hint" onChange={event=>setKey(event.target.value)}/></label><p id="sales-report-key-hint" className="sales-note">Lowercase letters, numbers or hyphens.</p>
   <SharingChoice audience={audience} named={named} members={suite.members} onAudience={setAudience} onNamed={setNamed} legend="Who may open the new report"/>
   <button type="button" disabled={busy||!key||!draft.measures.length} onClick={()=>save(false)}>Save as new report</button>
  </fieldset>
  {selected&&<button type="button" disabled={busy||!draft.measures.length} onClick={()=>save(true)}>Save as version {selected.version+1} of this report</button>}
  <p role="status">{message}</p>
 </details>;
}
