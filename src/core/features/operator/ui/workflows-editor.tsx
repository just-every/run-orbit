import {useEffect,useRef,useState} from 'react';
import {WorkflowActions} from './workflows-actions';
import {WorkflowsPreview} from './workflows-preview';
import {newWorkflowDefinition,Workflow,WorkflowDefinition,WorkflowField,WorkflowFields,WorkflowMetadata,WorkflowPreview,workflowRequest,WorkflowValueInput,workflowTime} from './workflows-types';

function validation(name:string,definition:WorkflowDefinition) {
 if(!name.trim())return 'Give the workflow a name.';
 if(definition.conditions.some(condition=>!condition.field.trim()))return 'Choose a field for each condition.';
 for(const action of definition.actions) {
  if(['set','clear','copy','stamp','add','subtract'].includes(action.kind)&&!action.field?.trim())return 'Choose a field for each action.';
  if(action.kind==='copy'&&!action.sourceField?.trim())return 'Choose the field to copy from.';
  if(action.kind==='move_stage'&&!action.stage)return 'Choose a destination stage.';
  if(action.kind==='create_record'&&(!action.values?.title||!action.values?.owner_id||!action.pipelineId||!action.stage))return 'Choose the new deal’s title, owner, pipeline and stage.';
  if(action.kind==='assign_owner'&&(!action.mode||action.mode==='fixed')&&!action.operatorIds?.length)return 'Choose a new owner.';
  if(action.kind==='assign_owner'&&action.mode==='round_robin'&&!action.operatorIds?.length)return 'Choose operators for the rotation.';
  if(['create_task','remind_task','notify'].includes(action.kind)&&!action.title?.trim())return 'Enter a title or message for each action.';
  if(action.kind==='notify'&&!action.operatorIds?.length)return 'Choose who receives the notification.';
  if(action.kind==='webhook'){try{if(new URL(action.url??'').protocol!=='https:')return 'Use an HTTPS webhook URL.';}catch{return 'Enter the webhook URL.';}}
 }
 return '';
}

export function WorkflowsEditor({initial,metadata,onSaved,onAction}:{initial?:Workflow;metadata:WorkflowMetadata;onSaved:(workflow:Workflow)=>void;onAction:()=>Promise<void>}) {
 const [name,setName]=useState(initial?.name??''),[definition,setDefinition]=useState<WorkflowDefinition>(initial?.definition??newWorkflowDefinition()),[saved,setSaved]=useState(initial),[status,setStatus]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[preview,setPreview]=useState<WorkflowPreview>();
 const payload=JSON.stringify({name,definition}),lastSaved=useRef(initial?payload:''),current=useRef({name,definition,payload}),identity=useRef(initial),queue=useRef(Promise.resolve()),mounted=useRef(true);
 current.current={name,definition,payload};
 const valid=validation(name,definition),dirty=payload!==lastSaved.current;
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;void persist().catch(()=>{});};},[]);
 function persist():Promise<void> {
  const job=queue.current.then(async()=>{
   const snapshot=current.current;
   if(snapshot.payload===lastSaved.current||validation(snapshot.name,snapshot.definition))return;
   if(mounted.current){setStatus('Saving draft…');setError('');}
   try {
    const response=await workflowRequest<{workflow:Workflow}>(identity.current?`/${encodeURIComponent(identity.current.id)}`:'',{name:snapshot.name.trim(),definition:snapshot.definition});
    identity.current=response.workflow;lastSaved.current=snapshot.payload;
    onSaved(response.workflow);
    if(mounted.current){setSaved(response.workflow);setStatus('Saved');setPreview(undefined);}
   }catch(caught){if(mounted.current){setStatus('Draft not saved');setError((caught as Error).message);}throw caught;}
  });
  queue.current=job.catch(()=>{});
  return job;
 }
 useEffect(()=>{
  if(payload===lastSaved.current)return;
  setPreview(undefined);setStatus(valid?'Complete the fields to save':'Unsaved changes');
  if(valid)return;
  const timer=setTimeout(()=>{void persist().catch(()=>{});},1200);
  return ()=>clearTimeout(timer);
 },[payload,valid]);
 async function review(){setBusy(true);setError('');try{await persist();if(!identity.current)return;const reviewedPayload=current.current.payload;const result=await workflowRequest<WorkflowPreview>(`/${encodeURIComponent(identity.current.id)}/preview`,{});if(current.current.payload!==reviewedPayload){setError('The workflow changed while the preview was loading. Preview it again.');return;}setPreview(result);}catch(caught){setError((caught as Error).message);}finally{setBusy(false);}}
 async function activate(){if(!preview||!identity.current)return;setBusy(true);setError('');try{await workflowRequest(`/${encodeURIComponent(identity.current.id)}/activate`,{previewId:preview.previewId});setSaved({...identity.current,status:'active'});setPreview(undefined);setStatus('Workflow activated');await onAction();}catch(caught){setError((caught as Error).message);}finally{setBusy(false);}}
 const change=(patch:Partial<WorkflowDefinition>)=>setDefinition({...definition,...patch});
 return <div className="workflows-editor workbench-form"><div className="workflows-heading"><h3>{saved?'Edit workflow':'New workflow'}</h3><span className="workflows-meta" role="status">{status||`Version ${saved?.version??1} · Draft`}</span></div>
  <label>Workflow name<input required maxLength={100} value={name} onChange={event=>setName(event.target.value)}/></label>
  {saved&&<p className="workflows-note">Version {saved.version} · {saved.status}{saved.activatedAt?` · Activated ${workflowTime(saved.activatedAt)}`:''}. Changes create a draft that needs a new preview and activation.</p>}
  <WorkflowFields/>
  <fieldset className="workflows-card"><legend>When this happens</legend><div className="workflows-grid"><label>Trigger<select value={definition.trigger.kind} onChange={event=>change({trigger:{...definition.trigger,kind:event.target.value as WorkflowDefinition['trigger']['kind'],...(event.target.value==='schedule'?{staleDays:definition.trigger.staleDays??14}:{})}})}><option value="record_created">A record is created</option><option value="record_changed">A record changes</option><option value="activity_logged">An activity is logged</option><option value="form_submitted">A form is submitted</option><option value="schedule">Scheduled stale record check</option><option value="enrichment" disabled>Enrichment — connection unavailable</option></select></label><label>Record type<select value={definition.trigger.recordType} onChange={event=>change({trigger:{...definition.trigger,recordType:event.target.value as WorkflowDefinition['trigger']['recordType']}})}><option value="opportunity">Deals</option><option value="contact">Contacts</option><option value="company">Companies</option></select></label></div>{definition.trigger.kind==='schedule'&&<label>Stale after (days)<input type="number" min="0" required value={definition.trigger.staleDays??14} onChange={event=>change({trigger:{...definition.trigger,staleDays:Number(event.target.value)}})}/></label>}</fieldset>
  <div className="workflows-stack"><h3>Only when all conditions match</h3>{!definition.conditions.length&&<p className="workflows-note">All records of this type can match the trigger.</p>}{definition.conditions.map((condition,index)=><fieldset key={index} className="workflows-card"><legend>Condition {index+1}</legend><WorkflowField value={condition.field} onChange={field=>change({conditions:definition.conditions.map((item,i)=>i===index?{...item,field}:item)})}/><label>Comparison<select value={condition.operator} onChange={event=>change({conditions:definition.conditions.map((item,i)=>i===index?{...item,operator:event.target.value as typeof condition.operator}:item)})}>{[['equals','Equals'],['not_equals','Does not equal'],['empty','Is empty'],['not_empty','Is not empty'],['lt','Is less than'],['gt','Is greater than']].map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>{!['empty','not_empty'].includes(condition.operator)&&<WorkflowValueInput value={condition.value} onChange={value=>change({conditions:definition.conditions.map((item,i)=>i===index?{...item,value}:item)})}/>}<button type="button" onClick={()=>change({conditions:definition.conditions.filter((_,i)=>i!==index)})}>Remove condition</button></fieldset>)}<button type="button" onClick={()=>change({conditions:[...definition.conditions,{field:'',operator:'equals',value:''}]})}>Add condition</button></div>
  <WorkflowActions actions={definition.actions} onChange={actions=>change({actions})} metadata={metadata}/>
  <details><summary>Timing and execution order</summary><div className="workflows-grid"><label>Delay before actions (minutes)<input type="number" min="0" value={definition.delayMinutes??0} onChange={event=>change({delayMinutes:Number(event.target.value)})}/></label><label>Record writes per hour<input type="number" min="1" value={definition.writeLimitPerHour??10000} onChange={event=>change({writeLimitPerHour:Number(event.target.value)})}/></label><label>Run order (lowest first)<input type="number" min="0" value={definition.order??0} onChange={event=>change({order:Number(event.target.value)})}/></label></div></details>
  {valid&&<p className="workflows-note">{valid}</p>}{error&&<p className="operator-state operator-state--error" role="alert">{error}</p>}
  <div className="workflows-buttons"><button type="button" className="operator-button" disabled={busy||!!valid} onClick={()=>void review()}>{busy?'Working…':'Preview changes'}</button>{error&&dirty&&!valid&&<button type="button" disabled={busy} onClick={()=>void persist().catch(()=>{})}>Retry draft save</button>}</div>
  {preview&&<WorkflowsPreview preview={preview} version={saved?.version} metadata={metadata} disabled={busy||dirty} onActivate={()=>void activate()}/>}
 </div>;
}
