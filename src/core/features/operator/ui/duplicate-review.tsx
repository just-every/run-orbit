import {useState} from 'react';
import {recordsRequest,type CustomerRecord} from './records-api';
import {useOperatorDialog} from './operator-dialog';
import {fieldLabel,storedValue,valueText} from './data-value';
import './duplicate-review.css';

function candidateLabel(record:CustomerRecord,kind:'contact'|'company'){
 return (kind==='contact'?[record.name,record.email,record.companyName??'No company']:[record.name,record.primary_domain??'No domain']).filter(Boolean).join(' · ');
}

export function DuplicateReview({kind,fields,onChanged}:{kind:'contact'|'company';fields:string[];onChanged:()=>void}){
 const [groups,setGroups]=useState<CustomerRecord[][]>([]),[pair,setPair]=useState<CustomerRecord[]>([]),[choices,setChoices]=useState<Record<string,string>>({});
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState('');
 const {ask,dialog}=useOperatorDialog();
 async function find(){setBusy(true);setError('');try{const result=await recordsRequest<{groups:CustomerRecord[][]}>(`records/${kind}/duplicates`);setGroups(result.groups);setPair([]);setStatus(`${result.groups.length} candidate groups found.`);}catch(reason){setError((reason as Error).message);}finally{setBusy(false);}}
 async function merge(){
  if(await ask({title:'Merge records',description:`Keep ${candidateLabel(pair[0],kind)} and retire ${candidateLabel(pair[1],kind)} using the values you selected?`,confirmLabel:'Merge records'})===null)return;
  setBusy(true);setError('');
  try{await recordsRequest(`records/${kind}/merge`,'POST',{survivorId:pair[0].id,retiredId:pair[1].id,choices,reviewed:{survivor:pair[0].mergeReviewToken,retired:pair[1].mergeReviewToken},confirmed:true});setPair([]);setGroups([]);setStatus('Records merged. Find matching names to review remaining candidates.');onChanged();}
  catch(reason){setError((reason as Error).message);}finally{setBusy(false);}
 }
 return <section className="duplicate-review"><h2>Duplicate candidates</h2><button type="button" disabled={busy} onClick={()=>void find()}>Find matching names</button>
  {groups.map((group,index)=><div className="duplicate-group" key={index}>{group.map(record=><button type="button" disabled={busy} key={record.id} aria-pressed={pair.some(selected=>selected.id===record.id)} onClick={()=>{setPair(pair.length===1&&pair[0].id!==record.id?[pair[0],record]:[record]);setChoices({});}}>{candidateLabel(record,kind)}</button>)}</div>)}
  {pair.length===1&&<p>Survivor: {candidateLabel(pair[0],kind)}. Select a second record to retire.</p>}
  {pair.length===2&&<form onSubmit={event=>{event.preventDefault();void merge();}}><h3>Survivor: {candidateLabel(pair[0],kind)}</h3><p>Retiring: {candidateLabel(pair[1],kind)}</p>
   {fields.filter(field=>pair[0][field]!==pair[1][field]).map(field=><label key={field}>{fieldLabel(field)}<select aria-label={fieldLabel(field)} required value={choices[field]??''} onChange={event=>setChoices({...choices,[field]:event.target.value})}><option value="">Choose a value</option><option value="survivor">Keep: {field==='company_id'?pair[0].companyName??'No company':valueText(storedValue(field,pair[0][field]))}</option><option value="retired">Use: {field==='company_id'?pair[1].companyName??'No company':valueText(storedValue(field,pair[1][field]))}</option></select></label>)}
   <button disabled={busy}>Confirm merge</button>
  </form>}
  {dialog}{error&&<p role="alert">{error}</p>}{status&&<p role="status">{status}</p>}
 </section>;
}
