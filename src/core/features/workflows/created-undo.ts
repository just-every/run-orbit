import {guard,clearGuards} from '../identity/store';
import {createId} from '../../shared/ids';
import {audit} from '../records/shared';
import type {WorkflowContext,WorkflowRecordPlan} from './record-types';

type Touch={by:string;at:string;what:string};
const benignAudit=new Set(['record.created','workflow.record_undone']);

/** Orbit has no separate archived state, so a created deal is archived by closing it lost with a stated reason; a user can reopen it. */
export const archiveReason=(workflowName:string)=>`Archived by undo of workflow ${workflowName}`;

const person=(name:string|null|undefined)=>name??'another source';

/** The newest edit or association made by anyone other than the creating write. Workflow edits that were themselves undone do not count. */
export async function laterTouch(db:D1Database,plan:WorkflowRecordPlan):Promise<Touch|null>{
 const id=plan.recordId,found:Touch[]=[];
 const edits=(await db.prepare("SELECT a.action,a.details_json,a.occurred_at,o.display_name FROM audit_entries a LEFT JOIN operators o ON o.id=a.actor_id WHERE a.entity_type='opportunity' AND a.entity_id=? ORDER BY a.occurred_at DESC,a.id DESC").bind(id).all<{action:string;details_json:string;occurred_at:string;display_name:string|null}>()).results;
 for(const edit of edits){
  if(benignAudit.has(edit.action))continue;
  if(edit.action==='workflow.record_changed'){
   const writeId=(JSON.parse(edit.details_json) as {writeId?:string}).writeId;
   if(writeId===plan.id)continue;
   if(writeId&&await db.prepare('SELECT 1 FROM workflow_record_writes WHERE id=? AND undone_at IS NOT NULL').bind(writeId).first())continue;
  }
  found.push({by:person(edit.display_name),at:edit.occurred_at,what:'edited'});break;
 }
 const tasks=await db.prepare("SELECT o.display_name AS name,t.created_at AS at FROM sales_tasks t LEFT JOIN operators o ON o.id=t.created_by WHERE t.opportunity_id=? ORDER BY t.created_at DESC LIMIT 1").bind(id).first<{name:string|null;at:string}>();
 if(tasks)found.push({by:person(tasks.name),at:tasks.at,what:'given a task'});
 const drafts=await db.prepare("SELECT o.display_name AS name,d.created_at AS at FROM drafts d LEFT JOIN operators o ON o.id=d.author_id WHERE d.opportunity_id=? ORDER BY d.created_at DESC LIMIT 1").bind(id).first<{name:string|null;at:string}>();
 if(drafts)found.push({by:person(drafts.name),at:drafts.at,what:'given a draft'});
 const messages=await db.prepare("SELECT o.display_name AS name,m.created_at AS at FROM outbound_messages m LEFT JOIN operators o ON o.id=m.operator_id WHERE m.opportunity_id=? ORDER BY m.created_at DESC LIMIT 1").bind(id).first<{name:string|null;at:string}>();
 if(messages)found.push({by:person(messages.name),at:messages.at,what:'given a message'});
 const signals=await db.prepare("SELECT linked_at AS at FROM signal_links WHERE record_type='opportunity' AND record_id=? ORDER BY linked_at DESC LIMIT 1").bind(id).first<{at:string}>();
 if(signals)found.push({by:'a linked signal',at:signals.at,what:'given a signal'});
 const handoffs=await db.prepare("SELECT o.display_name AS name,h.created_at AS at FROM handoff_tasks h LEFT JOIN operators o ON o.id=h.actor_id WHERE h.opportunity_id=? ORDER BY h.created_at DESC LIMIT 1").bind(id).first<{name:string|null;at:string}>();
 if(handoffs)found.push({by:person(handoffs.name),at:handoffs.at,what:'given a handoff task'});
 const entries=await db.prepare("SELECT o.display_name AS name,e.occurred_at AS at FROM timeline_entry_records r JOIN timeline_entries e ON e.id=r.timeline_entry_id LEFT JOIN operators o ON o.id=e.actor_id WHERE r.record_type='opportunity' AND r.record_id=? AND e.kind NOT IN('record.created','workflow.record_changed') AND e.source<>'scoring' ORDER BY e.occurred_at DESC LIMIT 1").bind(id).first<{name:string|null;at:string}>();
 if(entries)found.push({by:person(entries.name),at:entries.at,what:'given an activity'});
 return found.sort((a,b)=>Date.parse(b.at)-Date.parse(a.at))[0]??null;
}

/** Closes an untouched created deal. A touched, missing or concurrently changed deal is reported and left as it is. */
export async function archiveCreatedDeal(context:WorkflowContext,writeId:string,plan:WorkflowRecordPlan){
 const db=context.db,skip=(reason:string)=>({undone:false,skipped:true,writeId,reason});
 const row=await db.prepare('SELECT * FROM opportunities WHERE id=?').bind(plan.recordId).first<Record<string,unknown>>();
 if(!row)return skip('The created deal no longer exists.');
 const touch=await laterTouch(db,plan);
 if(touch)return skip(`Deal ${touch.what} by ${touch.by} at ${touch.at}; it was left as it is.`);
 const at=new Date().toISOString(),reason=archiveReason(context.workflowName),inverse={...plan,id:`${writeId}:undo`,before:plan.after,after:null};
 const payload={source:'workflow',workflowId:context.workflowId,workflowName:context.workflowName,version:context.version,eventId:context.eventId,runId:context.runId,evidence:context.evidence,field:'create_record',writeId:inverse.id,undoOf:writeId,text:`${context.workflowName}, version ${context.version}: archived created deal`},entry=createId();
 const statements:D1PreparedStatement[]=[...(context.writeFences??[]),
  guard(db,{sql:"EXISTS(SELECT 1 FROM opportunities WHERE id=? AND updated_at IS ? AND lifecycle IS ?) AND NOT EXISTS(SELECT 1 FROM sales_tasks WHERE opportunity_id=?) AND NOT EXISTS(SELECT 1 FROM drafts WHERE opportunity_id=?) AND NOT EXISTS(SELECT 1 FROM outbound_messages WHERE opportunity_id=?) AND NOT EXISTS(SELECT 1 FROM signal_links WHERE record_type='opportunity' AND record_id=?) AND NOT EXISTS(SELECT 1 FROM handoff_tasks WHERE opportunity_id=?) AND (SELECT count(*) FROM audit_entries WHERE entity_type='opportunity' AND entity_id=?)=?",args:[plan.recordId,row.updated_at as string,row.lifecycle as string,plan.recordId,plan.recordId,plan.recordId,plan.recordId,plan.recordId,plan.recordId,(await db.prepare("SELECT count(*) n FROM audit_entries WHERE entity_type='opportunity' AND entity_id=?").bind(plan.recordId).first<number>('n'))??0]}),
  guard(db,{sql:'EXISTS(SELECT 1 FROM workflow_record_writes WHERE id=? AND undone_at IS NULL)',args:[writeId]}),
  db.prepare("UPDATE opportunities SET lifecycle='lost',closed_at=?,closed_by=?,close_reason=?,queue_state='none',queue_reason=?,next_due_at=NULL,updated_at=? WHERE id=?").bind(at,context.actorId,reason,'Archived by workflow undo',at,plan.recordId),
  db.prepare("INSERT INTO timeline_entries(id,kind,occurred_at,recorded_at,actor_type,actor_id,source,payload_json) VALUES(?,'workflow.record_changed',?,?,'operator',?,'workflow',?)").bind(entry,at,at,context.actorId,JSON.stringify(payload)),
  db.prepare('INSERT INTO timeline_entry_records VALUES(?,?,?)').bind(entry,'opportunity',plan.recordId),
  audit(db,context.actorId,'workflow.record_undone','opportunity',plan.recordId,payload,at),
  db.prepare('UPDATE workflow_record_writes SET undone_at=?,undo_actor_id=? WHERE id=? AND undone_at IS NULL').bind(at,context.actorId,writeId),
  clearGuards(db),...(context.afterWriteStatements??[])];
 try{await db.batch(statements);}catch(error){
  if(/identity_guards|runtime_controls.value|FOREIGN KEY|CHECK constraint/.test(String(error))){
   const again=await laterTouch(db,plan);return skip(again?`Deal ${again.what} by ${again.by} at ${again.at}; it was left as it is.`:'The deal or its authority changed before it was archived.');
  }
  throw error;
 }
 return {undone:true,writeId,archived:plan.recordId};
}
