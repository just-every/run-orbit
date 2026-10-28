import {guard,clearGuards} from '../identity/store';
import {createId} from '../../shared/ids';
import {RecordsRepository} from '../records/repository';
import {audit,mutationJob,RecordError,requireRecord,tables,type RecordKind} from '../records/shared';
import {closedReason} from '../outreach/stop-reason';
import {recordInput,assertWorkflowActor,nativeFields} from './record-validation';
import {needsRecordApproval} from './record-plans';
import {approvalFields,customKey,fieldValue,type WorkflowContext,type WorkflowRecordPlan,type WorkflowRecordReceipt} from './record-types';

const same=(a:unknown,b:unknown)=>JSON.stringify(a??null)===JSON.stringify(b??null);
function receipt(plan:WorkflowRecordPlan,replayed=false):WorkflowRecordReceipt {
 return {id:plan.id,recordId:plan.recordId,recordType:plan.recordType,field:plan.field,before:plan.before,after:plan.after,applied:true,replayed,undoable:plan.field!=='create_record'&&plan.field!=='contactability'};
}
function workflowTimeline(context:WorkflowContext,plan:WorkflowRecordPlan,at:string,undoOf?:string){
 const contactIds=workflowContactIds(plan);
 const id=createId(),payload={source:'workflow',workflowId:context.workflowId,workflowName:context.workflowName,version:context.version,eventId:context.eventId,runId:context.runId,evidence:context.evidence,field:plan.field,previous:plan.before,current:plan.after,writeId:plan.id,undoOf,contactIds,relatedRecords:plan.relatedRecords,text:`${context.workflowName}, version ${context.version}: ${undoOf?'restored':'changed'} ${plan.field}`};
 return [context.db.prepare("INSERT INTO timeline_entries(id,kind,occurred_at,recorded_at,actor_type,actor_id,source,payload_json) VALUES(?,'workflow.record_changed',?,?,'operator',?,'workflow',?)").bind(id,at,at,context.actorId,JSON.stringify(payload)),context.db.prepare('INSERT INTO timeline_entry_records VALUES(?,?,?)').bind(id,plan.recordType,plan.recordId),audit(context.db,context.actorId,undoOf?'workflow.record_undone':'workflow.record_changed',plan.recordType,plan.recordId,payload,at)];
}
function workflowContactIds(plan:WorkflowRecordPlan){
 const associated=plan.createdValues?.contact_ids;
 return [...new Set([...(plan.relatedRecords??[]).filter(record=>record.recordType==='contact').map(record=>record.recordId),...(plan.recordType==='contact'?[plan.recordId]:[]),...(Array.isArray(associated)?associated.filter((id):id is string=>typeof id==='string'):[])])];
}
async function existing(context:WorkflowContext,id:string){
 return context.db.prepare('SELECT plan_json FROM workflow_record_writes WHERE id=?').bind(id).first<string>('plan_json');
}
function currentFence(context:WorkflowContext,kind:RecordKind,id:string,row:Record<string,unknown>){
 const fields=[...nativeFields[kind].filter(field=>field in row),'custom_fields_json','updated_at'];
 return guard(context.db,{sql:`EXISTS(SELECT 1 FROM ${tables[kind]} WHERE id=? AND ${fields.map(field=>`${field} IS ?`).join(' AND ')})`,args:[id,...fields.map(field=>row[field] as string|number|null)]});
}
async function write(context:WorkflowContext,plan:WorkflowRecordPlan,undoOf?:string):Promise<WorkflowRecordReceipt>{
 await assertWorkflowActor(context.db,context.actorId);
 const stored=await existing(context,plan.id);
 if(stored)return receipt(JSON.parse(stored),true);
 if(plan.error)throw new RecordError(400,plan.error);
 if(plan.reason)throw new RecordError(409,await changedReason(context,plan));
 if(plan.needsApproval&&context.approvedWriteId!==plan.id)throw new RecordError(409,'This exact workflow change needs per-record approval.');
 if(!undoOf&&await needsRecordApproval(context,plan.recordType,plan.field)&&context.approvedWriteId!==plan.id)throw new RecordError(409,'This field now requires per-record approval.');
 const actor=await context.db.prepare('SELECT updated_at FROM operators WHERE id=?').bind(context.actorId).first<string>('updated_at');
 const at=new Date().toISOString(),db=context.db;
 const statements:D1PreparedStatement[]=[...(context.writeFences??[]),guard(db,{sql:"EXISTS(SELECT 1 FROM operators WHERE id=? AND setup_owner=1 AND status='active' AND updated_at IS ? AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=operators.id)) AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import'))",args:[context.actorId,actor??null]})];
 if(!undoOf&&context.approvedWriteId!==plan.id)statements.push(guard(db,{sql:'NOT EXISTS(SELECT 1 FROM workflow_field_policies WHERE record_type=? AND field IN(SELECT value FROM json_each(?)) AND needs_approval=1)',args:[plan.recordType,JSON.stringify(approvalFields(plan))]}));
 const repo=new RecordsRepository(db);
 if(plan.field==='create_record'){
  if(!plan.createdValues)throw new RecordError(400,'The saved create plan is incomplete.');
  if(await db.prepare(`SELECT 1 FROM ${tables[plan.recordType]} WHERE id=?`).bind(plan.recordId).first())throw new RecordError(409,'The planned new identity is already occupied.');
  const options={ordinaryEdit:true,createId:plan.recordId,workflowContactIds:workflowContactIds(plan)};
  const prepared=await repo.prepareSave(plan.recordType,plan.createdValues,context.actorId,undefined,options);
  statements.push(...prepared.statements);
 }else{
  const row=await requireRecord(db,plan.recordType,plan.recordId);
  if(!same(fieldValue(row,plan.field),plan.before))throw new RecordError(409,await changedReason(context,plan));
  if(plan.field==='contactability'&&plan.after!=='do_not_contact')throw new RecordError(409,'Undo cannot make a contact contactable. Use the reviewed permission action.');
  statements.push(currentFence(context,plan.recordType,plan.recordId,row));
  if(!same(plan.before,plan.after)){
   if(plan.field==='lifecycle'){
    const state=String(plan.after);if(!['open','won','lost'].includes(state))throw new RecordError(400,'Invalid lifecycle.');
    statements.push(db.prepare("UPDATE opportunities SET lifecycle=?,closed_at=?,closed_by=?,close_reason=?,queue_state='none',queue_reason=?,next_due_at=NULL,updated_at=? WHERE id=?").bind(state,state==='open'?null:at,state==='open'?null:context.actorId,state==='open'?null:context.evidence,'Workflow lifecycle change',at,plan.recordId),db.prepare("UPDATE drafts SET is_stale=1,stale_reason='Opportunity lifecycle changed',updated_at=? WHERE opportunity_id=?").bind(at,plan.recordId));
    if(state!=='open')statements.push(db.prepare("UPDATE outbound_messages SET state='cancelled',failure=?,updated_at=? WHERE opportunity_id=? AND state='scheduled'").bind(closedReason(state as 'won'|'lost'),at,plan.recordId));
    else statements.push(mutationJob(db,plan.recordId,context.actorId,'Workflow reopened opportunity'));
   }else{
    const input=recordInput(plan.recordType,row),key=customKey(plan.field);
    if(key!==null)(input.custom_fields as Record<string,unknown>)[key]=plan.after;else input[plan.field]=plan.after;
    const options={ordinaryEdit:true,workflowContactIds:workflowContactIds(plan)};
    const prepared=await repo.prepareSave(plan.recordType,input,context.actorId,plan.recordId,options);
    statements.push(...prepared.statements);
   }
  }
 }
 statements.push(db.prepare('INSERT INTO workflow_record_writes(id,workflow_id,version,event_id,run_id,record_id,record_type,field,before_json,after_json,actor_id,occurred_at,evidence,workflow_name,plan_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(plan.id,context.workflowId,context.version,context.eventId,context.runId,plan.recordId,plan.recordType,plan.field,JSON.stringify(plan.before??null),JSON.stringify(plan.after??null),context.actorId,at,context.evidence,context.workflowName,JSON.stringify(plan)),...workflowTimeline(context,plan,at,undoOf));
 if(undoOf)statements.push(guard(db,{sql:'EXISTS(SELECT 1 FROM workflow_record_writes WHERE id=? AND undone_at IS NULL)',args:[undoOf]}),db.prepare('UPDATE workflow_record_writes SET undone_at=?,undo_actor_id=? WHERE id=? AND undone_at IS NULL').bind(at,context.actorId,undoOf));
 statements.push(clearGuards(db),...(context.afterWriteStatements??[]));
 try{await db.batch(statements);}catch(error){
  // A racing replay wins once; its receipt is the durable outcome after restart.
  const replay=await existing(context,plan.id);if(replay)return receipt(JSON.parse(replay),true);
  if(/identity_guards|runtime_controls.value|UNIQUE|FOREIGN KEY|CHECK constraint/.test(String(error)))throw new RecordError(409,'The record, authority, field policy or pipeline changed before this write committed.');
  throw error;
 }
 return receipt(plan);
}
export function applyRecordPlan(context:WorkflowContext,plan:WorkflowRecordPlan){return write(context,plan);}
async function changedReason(context:WorkflowContext,plan:WorkflowRecordPlan){
 const last=await context.db.prepare("SELECT o.display_name,a.occurred_at FROM audit_entries a LEFT JOIN operators o ON o.id=a.actor_id WHERE a.entity_type=? AND a.entity_id=? AND a.action IN('record.updated','stage.changed','lifecycle.changed','workflow.record_changed','workflow.record_undone') ORDER BY a.occurred_at DESC,a.id DESC LIMIT 1").bind(plan.recordType,plan.recordId).first<{display_name:string|null;occurred_at:string}>();
 return last?`Changed by ${last.display_name??'another source'} at ${last.occurred_at}.`:'The field changed after the workflow read it.';
}
export async function undoRecordWrite(context:WorkflowContext,writeId:string){
 await assertWorkflowActor(context.db,context.actorId);
 const stored=await context.db.prepare('SELECT plan_json,undone_at FROM workflow_record_writes WHERE id=?').bind(writeId).first<{plan_json:string;undone_at:string|null}>();
 if(!stored)throw new RecordError(404,'Workflow write not found.');
 if(stored.undone_at)return {undone:true,replayed:true,writeId};
 const plan=JSON.parse(stored.plan_json) as WorkflowRecordPlan;
 if(plan.field==='create_record')return {undone:false,skipped:true,writeId,reason:'Native records do not support archiving a created deal.'};
 if(plan.field==='contactability')return {undone:false,skipped:true,writeId,reason:'Do not contact requires the separate reviewed permission action.'};
 const inverse={...plan,id:`${writeId}:undo`,before:plan.after,after:plan.before,needsApproval:false};
 try{return {undone:true,writeId,receipt:await write({...context,approvedWriteId:inverse.id},inverse,writeId)};}
 catch(error){if(error instanceof RecordError&&error.status===409)return {undone:false,skipped:true,writeId,reason:error.message};throw error;}
}
