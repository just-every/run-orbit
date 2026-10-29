import {useCallback,useState,type FormEvent} from 'react';
import {useOperatorResource} from './use-operator-resource';
import {RiskFindingItem,riskRequest,type RiskEvidence,type RiskFinding} from './deal-risk-finding';

interface Rule {role:string;required:boolean;reason:string|null}
interface Risks {evidence:RiskEvidence[];findings:RiskFinding[];rules:Rule[];aiConfigured:boolean}
interface Preview {request:{lines:{evidenceId:string;label:string;text:string}[]};requestHash:string;provider:string|null;model:string|null}
const roleNames:Record<string,string>={champion:'Champion',decision_maker:'Decision maker',evaluator:'Evaluator',procurement:'Procurement',other:'Other'};

const lower=(text:string)=>text?text[0]!.toLowerCase()+text.slice(1).replace(/\.$/,''):text;

/** AGENT-002: cited risks on this deal, folded under People. Its line names what to check in the findings' own words,
 * in deep tangerine; with nothing to check it is a quiet fold that still holds the conflict check and the role rules.
 * Findings and checks never change the deal; a person approves each task. */
export function DealRisks({dealId}:{dealId:string}){
 const load=useCallback(()=>riskRequest<Risks>(`${dealId}/findings`),[dealId]);
 const resource=useOperatorResource(`risks:${dealId}`,load),data=resource.data;
 const [preview,setPreview]=useState<Preview|null>(null),[checked,setChecked]=useState<RiskFinding[]|null>(null),[error,setError]=useState(''),[pending,setPending]=useState(false);
 async function run<T>(work:()=>Promise<T>){setPending(true);setError('');try{return await work();}catch(e){setError((e as Error).message);return null;}finally{setPending(false);}}
 async function saveRule(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=event.currentTarget,values=new FormData(form);
  if(await run(()=>riskRequest(`${dealId}/rules`,{role:values.get('role'),required:values.get('required')==='on',reason:values.get('reason')}))){form.reset();resource.reload();}}
 const open=data?.findings.filter(finding=>!finding.dismissed)??[],dismissed=data?.findings.filter(finding=>finding.dismissed)??[],found=[...open,...(checked??[])];
 const summary=found.length?`${found.length} ${found.length===1?'thing':'things'} to check: ${found.map(finding=>lower(finding.title)).join(' · ')}`:'Check this deal';
 return <details className={`r-fold ${found.length?'r-risks':''}`} data-testid="deal-risks"><summary>{summary}</summary><section aria-labelledby="deal-risks" className="r-fold-body">
  <h2 id="deal-risks" className="sr-only">Deal risks</h2>
  <p className="r-muted">Each finding cites what is recorded on this deal. Nothing here changes the deal or sends anything.</p>
  {resource.loading&&<p>Loading deal risks…</p>}{(resource.error||error)&&<p role="alert">{error||resource.error?.message}</p>}
  {data&&<>
   {open.length?<ul style={{listStyle:'none',padding:0,margin:0,display:'grid',gap:12}}>{open.map(finding=><RiskFindingItem key={finding.key} dealId={dealId} finding={finding} evidence={data.evidence} onChanged={resource.reload}/>)}</ul>:<p>No open risk findings from recorded roles, promises and replies.</p>}
   <h3 style={{margin:'20px 0 6px',fontSize:'1rem',fontWeight:600}}>Conflicting recorded dates and prices</h3>
   {!data.aiConfigured?<p>AI is not configured, so recorded commitments, calls and notes are not checked for conflicting dates or prices. The findings above are complete without it.</p>
   :checked?(checked.length?<ul style={{listStyle:'none',padding:0,margin:0,display:'grid',gap:12}}>{checked.map(finding=><RiskFindingItem key={finding.key} dealId={dealId} finding={finding} evidence={data.evidence} onChanged={resource.reload}/>)}</ul>:<p>No conflicting dates or prices were found in the recorded lines.</p>)
   :preview?<div className="workbench-form"><p>{preview.request.lines.length} recorded lines will go to {preview.provider} / {preview.model}. Open reports are not sent.</p><details><summary>Review the exact lines</summary><ul>{preview.request.lines.map(line=><li key={line.evidenceId}><strong>{line.label}:</strong> {line.text}</li>)}</ul></details>
     <button className="operator-button" disabled={pending} onClick={()=>void run(async()=>{const result=await riskRequest<{findings:RiskFinding[]}>(`${dealId}/conflicts`,{requestHash:preview.requestHash});setChecked(result.findings);})}>Send this check</button></div>
   :<button type="button" disabled={pending} onClick={()=>void run(async()=>setPreview(await riskRequest<Preview>(`${dealId}/conflicts/preview`,{})))}>Preview conflict check</button>}
   <details><summary>Required stakeholder roles on this deal</summary>
    <p>Required now: {data.rules.filter(rule=>rule.required).map(rule=>roleNames[rule.role]).join(', ')||'none'}. A missing role means no contact is recorded in it; Orbit never records a role for you.</p>
    <form className="workbench-form" onSubmit={event=>void saveRule(event)}><label>Role<select name="role">{data.rules.map(rule=><option key={rule.role} value={rule.role}>{roleNames[rule.role]}</option>)}</select></label><label><input type="checkbox" name="required"/> Required on this deal</label><label>Reason<textarea name="reason" required maxLength={2000}/></label><button disabled={pending}>Add rule</button></form>
   </details>
   {dismissed.length>0&&<details><summary>Dismissed findings ({dismissed.length})</summary><ul style={{listStyle:'none',padding:0}}>{dismissed.map(finding=><RiskFindingItem key={finding.key} dealId={dealId} finding={finding} evidence={data.evidence} onChanged={resource.reload}/>)}</ul></details>}
  </>}
 </section></details>;
}
