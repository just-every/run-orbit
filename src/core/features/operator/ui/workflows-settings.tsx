import {useCallback,useEffect,useState} from 'react';
import {recordsRequest} from './records-api';
import {WorkflowsEditor} from './workflows-editor';
import {WorkflowsApprovals,WorkflowsRuns} from './workflows-activity';
import {WorkflowFieldPolicies} from './workflows-field-policies';
import {WorkflowsVersionUndo} from './workflows-version-undo';
import {Workflow,WorkflowData,WorkflowMetadata,workflowLabel,workflowRequest} from './workflows-types';
import './workflows.css';

export function WorkflowsSettings() {
 const [data,setData]=useState<WorkflowData>(),[metadata,setMetadata]=useState<WorkflowMetadata>({operators:[],stages:[],pipelines:[]}),[selected,setSelected]=useState(''),[newKey,setNewKey]=useState(0),[tab,setTab]=useState('workflows'),[error,setError]=useState(''),[metadataError,setMetadataError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const load=useCallback(async()=>{const next=await workflowRequest<WorkflowData>();setData(next);return next;},[]);
 useEffect(()=>{let active=true;void Promise.allSettled([workflowRequest<WorkflowData>(),recordsRequest<WorkflowMetadata>('settings')]).then(([workflows,settings])=>{if(!active)return;if(workflows.status==='fulfilled'){setData(workflows.value);if(!workflows.value.workflows.length)setSelected('new');}else setError((workflows.reason as Error).message);if(settings.status==='fulfilled')setMetadata(settings.value);else setMetadataError((settings.reason as Error).message);});return()=>{active=false;};},[]);
 const onSaved=useCallback((workflow:Workflow)=>{setData(previous=>previous?{...previous,workflows:previous.workflows.some(item=>item.id===workflow.id)?previous.workflows.map(item=>item.id===workflow.id?{...item,...workflow}:item):[workflow,...previous.workflows]}:previous);},[]);
 async function run(path:string){setBusy(true);setError('');setNotice('');try{const result=await workflowRequest<Record<string,unknown>>(path,{});await load();setNotice(result.message?String(result.message):'Done. Execution history reflects the result.');}catch(caught){setError((caught as Error).message);}finally{setBusy(false);}}
 async function refresh(){setBusy(true);setError('');try{await load();}catch(caught){setError((caught as Error).message);}finally{setBusy(false);}}
 const workflow=data?.workflows.find(item=>item.id===selected);
 return <section className="operator-surface workflows-settings" aria-labelledby="workflows-title"><div className="workflows-heading"><div><h2 id="workflows-title">Sales workflows</h2><p>Turn sales events into repeatable actions, with a preview before each version goes live.</p></div><button type="button" disabled={busy} onClick={()=>void refresh()}>Refresh workflows</button></div>
  <div className="workflows-tabs" role="group" aria-label="Workflow views">{[['workflows','Workflows'],['runs','Execution history'],['approvals',`Approvals${data?.approvals.filter(item=>item.status==='pending').length?` (${data.approvals.filter(item=>item.status==='pending').length})`:''}`]].map(([value,label])=><button type="button" aria-pressed={tab===value} key={value} onClick={()=>setTab(value)}>{label}</button>)}</div>
  {error&&<p className="operator-state operator-state--error" role="alert">{error}</p>}{notice&&<p className="operator-state" role="status">{notice}</p>}
  {!data&&!error&&<p role="status">Loading workflows…</p>}
  {data&&<p className="workflows-note">Workflow administration is currently limited to the installation owner. Assignment and notifications use explicitly chosen operators; sales roles and team selection are not available yet.</p>}
  {data&&<div className="workflows-stack" hidden={tab!=='workflows'}><div className="workflows-heading"><label>Choose workflow<select value={selected} onChange={event=>{setSelected(event.target.value);setNotice('');}}><option value="">Choose a workflow</option>{data.workflows.map(item=><option value={item.id} key={item.id}>{item.name} · v{item.version} · {workflowLabel(item.status)}{item.needsReactivation?' · Needs reactivation':''}</option>)}<option value="new">New workflow</option></select></label><button type="button" onClick={()=>{setSelected('new');setNewKey(key=>key+1);}}>New workflow</button></div>
   {metadataError&&<p className="operator-state operator-state--error" role="alert">Could not load operator and pipeline choices: {metadataError}</p>}
   {workflow?.needsReactivation&&<p className="operator-state">This workflow needs reactivation. Check its actions and current permissions, then preview it again.</p>}
   {workflow&&(workflow.activeVersion||workflow.status==='active')&&<div className="workflows-buttons"><span className="workflows-meta">Version {workflow.activeVersion??workflow.version} is active</span><button type="button" disabled={busy} onClick={()=>void run(`/${encodeURIComponent(workflow.id)}/pause`)}>Pause active version</button></div>}
   {(selected==='new'||workflow)&&<WorkflowsEditor key={selected==='new'?`new-${newKey}`:selected} initial={workflow} metadata={metadata} onSaved={onSaved} onAction={async()=>{await load();}}/>}
   {workflow&&<WorkflowsVersionUndo key={workflow.id} workflow={workflow} onChanged={load}/>}
   <WorkflowFieldPolicies/>
  </div>}
  {data&&tab==='runs'&&<WorkflowsRuns runs={data.runs} busy={busy} onRun={run}/>}{data&&tab==='approvals'&&<WorkflowsApprovals approvals={data.approvals} busy={busy} onRun={run}/>}
 </section>;
}
