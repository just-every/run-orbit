import type {ProviderFetch} from '../capture/providers/config';
import {createId} from '../../shared/ids';
import {guard} from '../identity/store';
import {newTask} from '../tasks/mutations';
import {insertTask} from '../tasks/repository';
import {taskEffects,taskAssignment} from '../tasks/effects';
import {OwnershipRepository} from '../ownership/repository';
import {tables,type RecordKind} from '../records/shared';
import {WorkflowError,type Action,type Run,type Version} from './contracts';
import {activeFence,authorityFence,record,workflowAudit} from './repository';
export interface EffectPlan {action:Action;id:string;ownerId?:string;beforeOwner?:string|null;taskId?:string;batchId?:string;message?:string;rotationCursor?:number}
export function declaredWebhook(value:string){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port&&u.port!=='443'||u.hostname.includes(':')||/^\d+(?:\.\d+){3}$/.test(u.hostname)||!u.hostname.includes('.')||/\.(local|localhost|internal|test|invalid)$/.test(u.hostname)||u.hostname==='localhost')throw new WorkflowError(400,'Declare a public HTTPS webhook with no embedded credentials.');return u.toString();}
export async function planEffect(db:D1Database,action:Action,run:Pick<Run,'record_id'|'record_type'|'workflow_id'>,index:number):Promise<EffectPlan>{
 const plan:EffectPlan={action,id:createId()};
 if(action.kind==='webhook'){if(!action.url)throw new WorkflowError(400,'Declare the webhook URL.');declaredWebhook(action.url);}
 if(action.kind==='create_task'||action.kind==='remind_task'){if(!action.title?.trim())throw new WorkflowError(400,'Give the task a title.');plan.taskId=createId();}
 if(action.kind==='notify'&&!action.title?.trim())throw new WorkflowError(400,'Write the notification content.');
 if(action.kind==='assign_owner'){
  const row=await record(db,run.record_type,run.record_id);if(!row)throw new WorkflowError(404,'Record was erased.');
  const candidates=(await db.prepare("SELECT id FROM operators WHERE status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=operators.id) ORDER BY id").all<{id:string}>()).results.map(x=>x.id).filter(id=>(action.operatorIds??[]).includes(id));
  if(action.mode==='account_owner'){
   const companyId=run.record_type==='company'?run.record_id:row.company_id;
   plan.ownerId=companyId?await db.prepare("SELECT owner_id FROM record_ownership WHERE record_type='company' AND record_id=?").bind(companyId).first<string>('owner_id')??undefined:undefined;
  }else if(action.mode==='round_robin'){
   const cursor=await db.prepare('SELECT cursor FROM workflow_rotation WHERE workflow_id=? AND action_index=?').bind(run.workflow_id,index).first<number>('cursor')??0;
   plan.ownerId=candidates[cursor%candidates.length];plan.rotationCursor=cursor;
  }else plan.ownerId=candidates[0];
  if(!plan.ownerId)throw new WorkflowError(400,'Owner rule has no active eligible user.');
  plan.beforeOwner=run.record_type==='opportunity'?row.owner_id:await db.prepare('SELECT owner_id FROM record_ownership WHERE record_type=? AND record_id=?').bind(run.record_type,run.record_id).first<string>('owner_id')??null;
 }
 return plan;
}
export async function applyEffect(db:D1Database,v:Version,run:Run,plan:EffectPlan,index:number,at:string,fetcher:ProviderFetch){
 const action=plan.action,actor=run.owner_id,fences=()=>[authorityFence(db,actor,v.authority_version!),activeFence(db,v)],r=await record(db,run.record_type,run.record_id);if(!r)throw new WorkflowError(409,'Record was erased; this run cannot resume.');
 if(action.kind==='webhook'){
  const prior=await db.prepare('SELECT status FROM workflow_steps WHERE run_id=? AND ordinal=?').bind(run.id,index).first<string>('status');
  if(prior==='submitting')throw new WorkflowError(409,'Webhook outcome is uncertain. Check the receiving system before resuming.');
  await db.batch([...fences(),db.prepare("UPDATE workflow_steps SET status='submitting' WHERE run_id=? AND ordinal=?").bind(run.id,index)]);
  try{const response=await fetcher(declaredWebhook(action.url!),{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':plan.id},body:action.body??'{}',redirect:'error',signal:AbortSignal.timeout(10000)});if(!response.ok)throw new WorkflowError(409,`Webhook returned ${response.status}. Inspect and resume this run.`);await response.body?.cancel();return {kind:'webhook',submitted:true,status:response.status};}catch(e){if(e instanceof WorkflowError){await db.prepare("UPDATE workflow_steps SET status='failed' WHERE run_id=? AND ordinal=?").bind(run.id,index).run();throw e;}throw new WorkflowError(409,'Webhook outcome is uncertain. Inspect the receiving system; automatic replay is held.');}
 }
 if(action.kind==='create_task'||action.kind==='remind_task'){
  if(await db.prepare('SELECT id FROM sales_tasks WHERE id=?').bind(plan.taskId).first())return {kind:action.kind,taskId:plan.taskId};
  const timezone=await db.prepare("SELECT timezone FROM workspace_settings WHERE id='workspace'").first<string>('timezone')??'UTC';
  const task=newTask({recordType:run.record_type as RecordKind,recordId:run.record_id,title:action.title!,ownerId:action.operatorIds?.[0]??actor,dueAt:new Date(Date.parse(at)+(action.offsetDays??0)*86400000).toISOString(),priority:'normal',type:'follow_up',notes:`Workflow ${v.name}, version ${v.version}`,recurrence:'none',timezone,reminderMinutes:action.kind==='remind_task'?0:null},actor,at);task.id=plan.taskId!;task.series_id=plan.id;
  await db.batch([...fences(),guard(db,{sql:`EXISTS(SELECT 1 FROM ${tables[run.record_type as RecordKind]} WHERE id=?) AND EXISTS(SELECT 1 FROM operators WHERE id=? AND status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=operators.id))`,args:[run.record_id,task.owner_id]}),db.prepare('INSERT INTO sales_task_series(id,created_at) VALUES(?,?)').bind(task.series_id,at),insertTask(db,task),...taskEffects(db,task,actor,'task.created'),...taskAssignment(db,task,actor)]);return {kind:action.kind,taskId:task.id};
 }
 if(action.kind==='notify'){
  const ids=action.operatorIds?.length?action.operatorIds:[actor];
  await db.batch([...fences(),...ids.map(id=>db.prepare(`INSERT OR IGNORE INTO notifications(id,operator_id,opportunity_id,event_key,kind,message,created_at) SELECT ?,id,?,?,'workflow.notice',?,? FROM operators WHERE id=? AND status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=operators.id)`).bind(createId(),run.record_type==='opportunity'?run.record_id:null,`workflow:${plan.id}`,action.title,at,id))]);return {kind:'notify',recipients:ids};
 }
 if(action.kind==='assign_owner'){
  const current=run.record_type==='opportunity'?r.owner_id:await db.prepare('SELECT owner_id FROM record_ownership WHERE record_type=? AND record_id=?').bind(run.record_type,run.record_id).first<string>('owner_id')??null;
  if(current!==plan.beforeOwner&&current!==plan.ownerId)throw new WorkflowError(409,'Owner changed after the trigger; assignment was skipped.');
  if(current===plan.ownerId)return {kind:'assign_owner',ownerId:plan.ownerId};
  if(run.record_type==='opportunity')throw new WorkflowError(400,'Deal assignment must use the guarded record action.');
  const repo=new OwnershipRepository(db);let batchId=plan.batchId;if(!batchId){const batch=await repo.review(run.record_type as 'contact'|'company',[run.record_id],plan.ownerId!,actor);batchId=batch.id;await db.prepare('UPDATE workflow_steps SET result_json=? WHERE run_id=? AND ordinal=?').bind(JSON.stringify({batchId}),run.id,index).run();}
  await db.batch(fences());const batch=await repo.apply(batchId,actor);if(batch.items.some(x=>x.failure))throw new WorkflowError(409,batch.items.find(x=>x.failure)!.failure!);
  await db.batch([workflowAudit(db,actor,'owner_assigned',v.workflow_id,{runId:run.id,ownerId:plan.ownerId,mode:action.mode},at)]);return {kind:'assign_owner',ownerId:plan.ownerId,batchId};
 }
 throw new WorkflowError(400,'This action is unavailable.');
}
