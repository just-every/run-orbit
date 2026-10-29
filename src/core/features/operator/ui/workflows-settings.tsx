import {useCallback,useEffect,useState} from 'react';
import {recordsRequest} from './records-api';
import {WorkflowsEditor} from './workflows-editor';
import {WorkflowsApprovals,WorkflowsRuns} from './workflows-activity';
import {WorkflowFieldPolicies} from './workflows-field-policies';
import {WorkflowsVersionUndo} from './workflows-version-undo';
import {Workflow,WorkflowData,WorkflowMetadata,workflowLabel,workflowRequest} from './workflows-types';
import './workflows.css';

export function WorkflowsSettings() {
 const [manage,setManage]=useState<boolean>(),[ownApprovals,setOwnApprovals]=useState<WorkflowData['approvals']>(),[data,setData]=useState<WorkflowData>(),[metadata,setMetadata]=useState<WorkflowMetadata>({operators:[],stages:[],pipelines:[]}),[selected,setSelected]=useState(''),[newKey,setNewKey]=useState(0),[tab,setTab]=useState('workflows'),[error,setError]=useState(''),[metadataError,setMetadataError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const load=useCallback(async()=>{
  const access=await workflowRequest<{manage:boolean}>('/access');
  setManage(access.manage);
  if(!access.manage){
   setData(undefined);setMetadataError('');
   const next=await workflowRequest<Pick<WorkflowData,'approvals'>>('/approvals');
   setOwnApprovals(next.approvals);return next;
  }
  const [workflows,settings]=await Promise.allSettled([workflowRequest<WorkflowData>(),recordsRequest<WorkflowMetadata>('settings')]);
  if(settings.status==='fulfilled'){setMetadata(settings.value);setMetadataError('');}else setMetadataError((settings.reason as Error).message);
  if(workflows.status==='rejected')throw workflows.reason;
  const next=workflows.value;setData(next);setSelected(current=>current||(!next.workflows.length?'new':''));return next;
 },[]);
 useEffect(()=>{let active=true;setBusy(true);void load().catch(caught=>{if(active)setError((caught as Error).message);}).finally(()=>{if(active)setBusy(false);});return()=>{active=false;};},[load]);
 const onSaved=useCallback((workflow:Workflow)=>{setData(previous=>previous?{...previous,workflows:previous.workflows.some(item=>item.id===workflow.id)?previous.workflows.map(item=>item.id===workflow.id?{...item,...workflow}:item):[workflow,...previous.workflows]}:previous);},[]);
 async function run(path:string){setBusy(true);setError('');setNotice('');try{const result=await workflowRequest<Record<string,unknown>>(path,{});await load();setNotice(result.message?String(result.message):manage?'Done. Execution history reflects the result.':'Done. Your approvals are up to date.');}catch(caught){setError((caught as Error).message);}finally{setBusy(false);}}
 async function refresh(){setBusy(true);setError('');try{await load();}catch(caught){setError((caught as Error).message);}finally{setBusy(false);}}
 const workflow=data?.workflows.find(item=>item.id===selected);
 const loaded=manage===true?!!data:manage===false?ownApprovals!==undefined:false;
 return <section className="operator-surface workflows-settings" aria-labelledby="workflows-title"><div className="workflows-heading"><div><h2 id="workflows-title">{manage===false?'Workflow approvals':'Workflows'}</h2><p>{manage===false?'Review workflow changes assigned to you.':'Sales events that start repeatable actions, previewed before each version goes live.'}</p></div><button type="button" disabled={busy} onClick={()=>void refresh()}>{manage===false?'Refresh approvals':'Refresh workflows'}</button></div>
  {manage===true&&<div className="workflows-tabs" role="group" aria-label="Workflow views">{[['workflows','Workflows'],['runs','Execution history'],['approvals',`Approvals${data?.approvals.filter(item=>item.status==='pending').length?` (${data.approvals.filter(item=>item.status==='pending').length})`:''}`]].map(([value,label])=><button type="button" aria-pressed={tab===value} key={value} onClick={()=>setTab(value)}>{label}</button>)}</div>}
  {error&&<p className="operator-state operator-state--error" role="alert">{error}</p>}{notice&&<p className="operator-state" role="status">{notice}</p>}
  {!loaded&&!error&&<p role="status">{manage===false?'Loading approvals…':'Loading workflows…'}</p>}
  {manage===false&&ownApprovals&&<WorkflowsApprovals approvals={ownApprovals} busy={busy} onRun={run}/>}
  {manage===true&&data&&<div className="workflows-stack" hidden={tab!=='workflows'}><div className="workflows-heading"><label>Choose workflow<select value={selected} onChange={event=>{setSelected(event.target.value);setNotice('');}}><option value="">Choose a workflow</option>{data.workflows.map(item=><option value={item.id} key={item.id}>{item.name} · v{item.version} · {workflowLabel(item.status)}{item.needsReactivation?' · Needs reactivation':''}</option>)}<option value="new">New workflow</option></select></label><button type="button" onClick={()=>{setSelected('new');setNewKey(key=>key+1);}}>New workflow</button></div>
   {metadataError&&<p className="operator-state operator-state--error" role="alert">Could not load operator and pipeline choices: {metadataError}</p>}
   {workflow?.needsReactivation&&<p className="operator-state">This workflow needs reactivation. Check its actions and current permissions, then preview it again.</p>}
   {workflow&&(workflow.activeVersion||workflow.status==='active')&&<div className="workflows-buttons"><span className="workflows-meta">Version {workflow.activeVersion??workflow.version} is active</span><button type="button" disabled={busy} onClick={()=>void run(`/${encodeURIComponent(workflow.id)}/pause`)}>Pause active version</button></div>}
   {(selected==='new'||workflow)&&<WorkflowsEditor key={selected==='new'?`new-${newKey}`:selected} initial={workflow} metadata={metadata} onSaved={onSaved} onAction={async()=>{await load();}}/>}
   {workflow&&<WorkflowsVersionUndo key={workflow.id} workflow={workflow} onChanged={load}/>}
   <WorkflowFieldPolicies/>
  </div>}
  {manage===true&&data&&tab==='runs'&&<WorkflowsRuns runs={data.runs} busy={busy} onRun={run}/>}{manage===true&&data&&tab==='approvals'&&<WorkflowsApprovals approvals={data.approvals} busy={busy} onRun={run}/>}
 </section>;
}
