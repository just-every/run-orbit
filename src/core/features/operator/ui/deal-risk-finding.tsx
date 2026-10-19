import {useState} from 'react';
import {formatDate} from './formatters';

export interface RiskEvidence {id:string;label:string;text:string;occurredAt:string|null;confidence:'observed'|'inferred';href:string}
export interface RiskFinding {key:string;kind:string;title:string;citations:{evidenceId:string;quote:string}[];inference:{source:'rule'|'ai';text:string}|null;nextTask:string;dismissed:{reason:string;at:string}|null}
export async function riskRequest<T>(path:string,body?:unknown):Promise<T>{const response=await fetch(`/api/v1/risks/${path}`,body===undefined?undefined:{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const result=await response.json() as T&{error?:string};if(!response.ok)throw new Error(result.error??'The deal risk request failed.');return result;}

/** One finding: recorded evidence first, any inference labelled with its source, then the person's choices. */
export function RiskFindingItem({dealId,finding,evidence,onChanged}:{dealId:string;finding:RiskFinding;evidence:RiskEvidence[];onChanged:()=>void}){
 const [title,setTitle]=useState(finding.nextTask),[reason,setReason]=useState(''),[status,setStatus]=useState(''),[error,setError]=useState(''),[pending,setPending]=useState(false);
 async function act(path:string,body:unknown,done:string){setPending(true);setError('');setStatus('');try{await riskRequest(`${dealId}/${path}`,body);setStatus(done);onChanged();}catch(e){setError((e as Error).message);}finally{setPending(false);}}
 return <li className="deal-risk" data-kind={finding.kind} style={{borderTop:'1px solid var(--operator-border,#d8dce3)',paddingTop:12,overflowWrap:'anywhere'}}>
  <h3 style={{margin:'0 0 6px',fontSize:'1rem',fontWeight:600}}>{finding.title}</h3>
  {finding.dismissed?<p><strong>Dismissed</strong> · {finding.dismissed.reason} · {formatDate(finding.dismissed.at)}</p>:null}
  <p style={{margin:'0 0 4px'}}><strong>Recorded evidence</strong></p>
  <ul style={{margin:'0 0 8px',paddingLeft:18}}>{finding.citations.map(citation=>{const item=evidence.find(entry=>entry.id===citation.evidenceId);return <li key={citation.evidenceId+citation.quote}>
   {item?<a href={item.href}>{item.label}</a>:'Evidence no longer recorded'}{item?.occurredAt?` · ${formatDate(item.occurredAt)}`:''}{item?.confidence==='inferred'?' · inferred':''}
   <blockquote className="capture-quote" style={{margin:'4px 0'}}>{citation.quote}</blockquote></li>;})}</ul>
  {finding.inference?<p><strong>{finding.inference.source==='ai'?'AI inference from the cited lines':'Rule inference'}:</strong> {finding.inference.text}</p>:<p>Observation only: nothing here is inferred.</p>}
  {!finding.dismissed&&<>
   <form className="workbench-form" onSubmit={event=>{event.preventDefault();void act('tasks',{title,dueAt:null,evidenceIds:finding.citations.map(item=>item.evidenceId)},'Task added to this deal. Nothing was sent and the deal is unchanged.');}}>
    <label>Proposed next task<input value={title} maxLength={300} required onChange={event=>setTitle(event.target.value)}/></label>
    <button className="operator-button" disabled={pending}>Approve task</button>
   </form>
   <details><summary>Dismiss this finding</summary><form className="workbench-form" onSubmit={event=>{event.preventDefault();void act('dismissals',{key:finding.key,title:finding.title,reason},'Finding dismissed. The reason is on the deal timeline.');}}>
    <label>Reason<textarea required maxLength={2000} value={reason} onChange={event=>setReason(event.target.value)}/></label><button disabled={pending||!reason.trim()}>Dismiss with reason</button>
   </form></details>
  </>}
  {error&&<p role="alert">{error}</p>}{status&&<p role="status">{status}</p>}
 </li>;
}
