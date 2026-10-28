import {useCallback,useEffect,useState} from 'react';
import {formatCurrency} from './formatters';
import type {RecordKind} from './records-api';
import {workflowRequest,workflowTime,workflowValue} from './workflows-types';
import './capture-proposals.css';

interface RecordApproval {
 id:string;runId:string;recordId:string;recordType:RecordKind;workflowName:string;
 version:number;field:string;before:unknown;after:unknown;evidence:unknown;
 status:string;createdAt:string;
}
const valueStyle={margin:0,whiteSpace:'pre-wrap' as const,overflowWrap:'anywhere' as const,fontSize:14,lineHeight:1.55};

export function WorkflowRecordApprovals({kind,id,onChanged,workspace}:{kind:RecordKind;id:string;workspace?:any;onChanged:()=>void|Promise<void>}) {
 const label=(field:string)=>({value_cents:'Deal amount',expected_close_at:'Close date',lifecycle:'Deal outcome'} as Record<string,string>)[field]??field.replace(/^custom:/,'').replaceAll('_',' ');
 const value=(approval:RecordApproval,input:unknown)=>approval.field==='value_cents'&&typeof input==='number'&&workspace?formatCurrency(input,workspace):workflowValue(input);
 const [approvals,setApprovals]=useState<RecordApproval[]>([]),[busy,setBusy]=useState(''),[error,setError]=useState<{id?:string;message:string}>(),[status,setStatus]=useState('');
 const load=useCallback(async()=>{
  const result=await workflowRequest<{approvals:RecordApproval[]}>(`/approvals?${new URLSearchParams({recordType:kind,recordId:id})}`);
  return result.approvals;
 },[kind,id]);
 useEffect(()=>{let active=true;void load().then(items=>{if(active){setApprovals(items);setError(undefined);}}).catch(caught=>{if(active)setError({message:(caught as Error).message});});return()=>{active=false;};},[load]);

 async function decide(approval:RecordApproval,decision:'accept'|'decline') {
  setBusy(approval.id);setError(undefined);setStatus('');
  try {
   await workflowRequest(`/approvals/${encodeURIComponent(approval.id)}/${decision}`,{});
   setApprovals(previous=>previous.filter(item=>item.id!==approval.id));
   const outcome=decision==='accept'?'Accepted':'Declined';
   setStatus(`${outcome} change to ${approval.field}.`);
   const [pending,record]=await Promise.allSettled([load(),Promise.resolve().then(onChanged)]);
   if(pending.status==='fulfilled')setApprovals(pending.value);
   const failures=[pending.status==='rejected'?'pending approvals':null,record.status==='rejected'?'record details':null].filter(Boolean);
   if(failures.length)setError({message:`${outcome}, but ${failures.join(' and ')} could not refresh. Reopen the record to check the latest values.`});
  }catch(caught){setError({id:approval.id,message:(caught as Error).message});}
  finally{setBusy('');}
 }

 if(!approvals.length&&!error&&!status)return null;
 return <section className="operator-detail__section capture-proposals" aria-labelledby={`workflow-record-approvals-${kind}-${id}`}>
  <h2 id={`workflow-record-approvals-${kind}-${id}`}>Workflow changes needing your approval</h2>
  {approvals.length>0&&<p>Review the exact values and triggering evidence. Accepting checks that the current value still matches.</p>}
  {status&&<p role="status">{status}</p>}
  {error&&!error.id&&<p className="operator-state operator-state--error" role="alert">{error.message}</p>}
  {approvals.map(approval=><article className="capture-proposal" key={approval.id}>
   <h3>{label(approval.field)}</h3><p>{approval.workflowName} · Version {approval.version} · Requested {workflowTime(approval.createdAt)}</p>
   <table className="capture-change"><caption className="sr-only">Current and proposed {approval.field}</caption><thead><tr><th scope="col">Current value</th><th scope="col">Proposed value</th></tr></thead><tbody><tr><td><pre style={valueStyle}>{value(approval,approval.before)}</pre></td><td><pre style={valueStyle}>{value(approval,approval.after)}</pre></td></tr></tbody></table>
   <details><summary>Triggering evidence</summary><pre style={valueStyle}>{workflowValue(approval.evidence)}</pre></details>
   {error?.id===approval.id&&<p className="operator-state operator-state--error" role="alert">{error.message}</p>}
   <div className="workbench-actions"><button type="button" className="orbit-button orbit-button--primary" disabled={!!busy} onClick={()=>void decide(approval,'accept')}>{busy===approval.id?'Working…':'Accept change'}</button><button type="button" className="orbit-button orbit-button--secondary" disabled={!!busy} onClick={()=>void decide(approval,'decline')}>Decline change</button></div>
  </article>)}
 </section>;
}
