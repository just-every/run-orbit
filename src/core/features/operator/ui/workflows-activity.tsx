import {useEffect,useState} from 'react';
import {WorkflowApproval,WorkflowRun,workflowLabel,workflowRequest,workflowTime,workflowValue} from './workflows-types';

type RunItem={text:string;href?:string;label?:string;detail?:string};
type RunPresentation={ownerName:string;createdAt:string;updatedAt:string;reason:string|null;trigger:{label:string;text:string;href?:string;at?:string};actions:{label:string;status:string;attempts:number;items:RunItem[];error?:string}[];undo?:RunItem[]};
function RunItems({items}:{items:RunItem[]}){return <ul className="workflows-results">{items.map((item,index)=><li key={index}><span>{item.text}{item.label&&<> · {item.href?<a href={item.href}>{item.label}</a>:item.label}</>}</span>{item.detail&&<p className="workflows-meta">{item.detail}</p>}</li>)}</ul>;}
function WorkflowRunEvidence({run}:{run:WorkflowRun}) {
 const [details,setDetails]=useState<{presentation:RunPresentation;[key:string]:unknown}>(),[error,setError]=useState('');
 const revision=`${run.status}:${workflowValue(run.attempts)}:${workflowValue(run.outcome)}`;
 useEffect(()=>{let active=true;setDetails(undefined);void workflowRequest<typeof details>(`/runs/${encodeURIComponent(run.id)}`).then(result=>{if(active){setDetails(result);setError('');}}).catch(caught=>{if(active)setError((caught as Error).message);});return()=>{active=false;};},[run.id,revision]);
 const view=details?.presentation;
 return <div className="workflows-stack">{error&&<p className="operator-state operator-state--error" role="alert">{error}</p>}{!details&&!error&&<p className="workflows-meta" role="status">Loading execution details…</p>}{view&&<>
  <section className="workflows-stack" aria-label="Run outcome"><h4>Outcome</h4>
   {run.status==='undone'?<><p>{view.undo?.length?'Undo reviewed the recorded changes.':'No record fields needed restoring.'} Tasks and messages are retained.</p>{view.undo&&<RunItems items={view.undo}/>}</>:<p>{workflowLabel(run.status)}{view.reason&&view.reason!==workflowLabel(run.status)?` · ${view.reason}`:''}</p>}
   {view.actions.map((action,index)=><div className="workflows-action-result" key={index}><p><strong>{action.label}</strong> · {workflowLabel(action.status)} · {action.attempts} {action.attempts===1?'attempt':'attempts'}</p>{action.items.length>0&&<RunItems items={action.items}/>}<p className="workflows-meta">{action.error??(!action.items.length?'No completed effects recorded.':'')}</p></div>)}
  </section>
  <section className="workflows-stack" aria-label="Trigger and source evidence"><h4>Trigger and source evidence</h4><p><strong>{view.trigger.label}</strong> · {workflowTime(view.trigger.at)}</p><p>{view.trigger.text}</p>{view.trigger.href&&<p><a href={view.trigger.href}>Open source evidence</a></p>}</section>
  <dl className="workflows-counts"><div><dt>Run owner</dt><dd>{view.ownerName}</dd></div><div><dt>Created</dt><dd>{workflowTime(view.createdAt)}</dd></div><div><dt>Last updated</dt><dd>{workflowTime(view.updatedAt)}</dd></div></dl>
  <details><summary>Technical details</summary><p className="workflows-meta">Saved identifiers, event, action plan and execution receipts.</p><pre>{workflowValue({...details,presentation:undefined})}</pre></details>
 </>}</div>;
}

function WorkflowRunRow({run,busy,onRun}:{run:WorkflowRun;busy:boolean;onRun:(path:string)=>Promise<void>}) {
 const [open,setOpen]=useState(false);
 return <details className="workflows-card" onToggle={event=>{if(event.target===event.currentTarget)setOpen(event.currentTarget.open);}}><summary><strong>{run.workflowName} · Version {run.version}</strong><span className="workflows-meta">{workflowLabel(run.status)} · {run.recordHref?<a href={run.recordHref}>{run.recordLabel}</a>:(run.recordLabel??'Record unavailable')}</span>{run.reason&&run.reason!==workflowLabel(run.status)&&<span className="workflows-reason">{run.reason.replace(/\b[0-9A-HJKMNP-TV-Z]{26}\b|\b[0-9a-f]{32,64}\b/gi,'record')}</span>}</summary><dl className="workflows-counts"><div><dt>Activity or event occurred</dt><dd>{workflowTime(run.occurredAt)}</dd></div><div><dt>Version activated</dt><dd>{workflowTime(run.activatedAt)}</dd></div>{run.status!=='skipped'&&<div><dt>Due</dt><dd>{workflowTime(run.dueAt)}</dd></div>}</dl>{open&&<WorkflowRunEvidence run={run}/>}<div className="workflows-buttons">{['failed','dead_letter','running','needs_approval'].includes(run.status)&&<button type="button" disabled={busy} onClick={()=>void onRun(`/runs/${encodeURIComponent(run.id)}/resume`)}>Resume run</button>}{!['pending','queued','running','undone','skipped'].includes(run.status)&&<button type="button" disabled={busy} onClick={()=>void onRun(`/runs/${encodeURIComponent(run.id)}/undo`)}>Undo applied changes</button>}</div></details>;
}

export function WorkflowsRuns({runs,busy,onRun}:{runs:WorkflowRun[];busy:boolean;onRun:(path:string)=>Promise<void>}) {
 return <section className="workflows-stack" aria-labelledby="workflows-runs"><div className="workflows-heading"><h3 id="workflows-runs">Execution history</h3><button type="button" disabled={busy} onClick={()=>void onRun('/process')}>Process due runs</button></div>{!runs.length?<p className="workflows-note">No workflow runs yet. Activated rules will appear here when triggered.</p>:runs.map(run=><WorkflowRunRow key={run.id} run={run} busy={busy} onRun={onRun}/>)}</section>;
}

export function WorkflowsApprovals({approvals,busy,onRun}:{approvals:WorkflowApproval[];busy:boolean;onRun:(path:string)=>Promise<void>}) {
 const pending=approvals.filter(approval=>['pending','awaiting_approval'].includes(approval.status));
 const closed=approvals.filter(approval=>!['pending','awaiting_approval'].includes(approval.status));
 const row=(approval:WorkflowApproval)=><article className="workflows-card" key={approval.id}><h4>{approval.field} · Record {approval.recordId}</h4><p className="workflows-meta">{workflowLabel(approval.status)}</p><div className="workflows-change"><div><span>Current value</span><pre>{workflowValue(approval.before)}</pre></div><div><span>Proposed value</span><pre>{workflowValue(approval.after)}</pre></div></div><details><summary>Triggering evidence</summary><pre>{workflowValue(approval.evidence)}</pre></details>{['pending','awaiting_approval'].includes(approval.status)&&<div className="workflows-buttons"><button type="button" className="operator-button" disabled={busy} onClick={()=>void onRun(`/approvals/${encodeURIComponent(approval.id)}/accept`)}>Accept this change</button><button type="button" disabled={busy} onClick={()=>void onRun(`/approvals/${encodeURIComponent(approval.id)}/decline`)}>Decline change</button></div>}</article>;
 return <section className="workflows-stack" aria-labelledby="workflows-approvals"><h3 id="workflows-approvals">Changes needing approval{pending.length?` (${pending.length})`:''}</h3>{pending.length?<p className="workflows-note">Review each value and its evidence. Approval checks that the current value still matches.</p>:<p className="workflows-note">No changes are waiting for approval.</p>}{pending.map(row)}{closed.length>0&&<details><summary>Past decisions ({closed.length})</summary><div className="workflows-stack">{closed.map(row)}</div></details>}</section>;
}
