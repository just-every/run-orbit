import {useEffect,useState} from 'react';
import {WorkflowField,workflowRequest} from './workflows-types';

type Policy={recordType:'opportunity'|'contact'|'company';field:string;needsApproval:boolean};
export function WorkflowFieldPolicies() {
 const [policies,setPolicies]=useState<Policy[]>([]),[recordType,setRecordType]=useState<Policy['recordType']>('opportunity'),[field,setField]=useState(''),[error,setError]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false),[failed,setFailed]=useState<Policy>();
 useEffect(()=>{let active=true;void workflowRequest<{policies:Policy[]}>('/field-policies').then(result=>{if(active)setPolicies(result.policies);}).catch(caught=>{if(active)setError((caught as Error).message);});return()=>{active=false;};},[]);
 async function apply(policy:Policy) {
  setBusy(true);setError('');setStatus('');setFailed(undefined);setPolicies(previous=>[...previous.filter(item=>item.recordType!==policy.recordType||item.field!==policy.field),policy]);
  try{await workflowRequest('/field-policies',policy);setStatus('Saved');}
  catch(caught){setError((caught as Error).message);setFailed(policy);}
  finally{setBusy(false);}
 }
 const selected=policies.find(policy=>policy.recordType===recordType&&policy.field===field.trim());
 return <details><summary>Require approval for other fields</summary><div className="workflows-stack"><p className="workflows-note">Protected deal values always need approval. You can require approval for additional fields across all workflows.</p><div className="workflows-grid"><label>Record type<select value={recordType} onChange={event=>setRecordType(event.target.value as Policy['recordType'])}><option value="opportunity">Deal</option><option value="contact">Contact</option><option value="company">Company</option></select></label><WorkflowField value={field} onChange={setField}/></div><label className="workflows-check"><input type="checkbox" disabled={busy||!field.trim()} checked={selected?.needsApproval??false} onChange={event=>void apply({recordType,field:field.trim(),needsApproval:event.target.checked})}/>Approve each workflow change to this field</label>{policies.filter(policy=>policy.needsApproval).map(policy=><label className="workflows-check" key={`${policy.recordType}:${policy.field}`}><input type="checkbox" checked disabled={busy} onChange={event=>void apply({...policy,needsApproval:event.target.checked})}/>{policy.recordType==='opportunity'?'Deal':policy.recordType==='contact'?'Contact':'Company'} · {policy.field}</label>)}{status&&<p className="workflows-meta" role="status">{status}</p>}{error&&<p className="operator-state operator-state--error" role="alert">{error}</p>}{failed&&<button type="button" disabled={busy} onClick={()=>void apply(failed)}>Retry policy change</button>}</div></details>;
}
