import {createId} from '../../shared/ids';
import {audit,mutationJob,RecordError,timeline} from '../records/shared';
import {openTaskInventory,taskHandoverStatements,TaskError} from '../tasks';
export interface RemovalChoices {review:string;opportunities:string|null;tasks:string|null;handoffs:string|null;recordMailObligations?:string|null}
const digest=async(value:unknown)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)))),b=>b.toString(16).padStart(2,'0')).join('');
export async function removalReview(db:D1Database,id:string){
 const operator=await db.prepare('SELECT id,display_name,status,setup_owner FROM operators WHERE id=?').bind(id).first<any>();if(!operator)throw new RecordError(404,'Operator not found.');
 const [opportunities,tasks,handoffs,messages,recordMailObligations]=await Promise.all([
  db.prepare("SELECT id,title,updated_at FROM opportunities WHERE owner_id=? AND lifecycle='open' ORDER BY id").bind(id).all<any>(),openTaskInventory(db,id),
  db.prepare("SELECT id,title,revision FROM handoff_tasks WHERE assignee_id=? AND status='open' ORDER BY id").bind(id).all<any>(),
  db.prepare("SELECT id,subject FROM outbound_messages WHERE operator_id=? AND state='scheduled' UNION ALL SELECT id,subject FROM record_mail_outbound_messages WHERE operator_id=? AND state='scheduled' ORDER BY id").bind(id,id).all<any>(),
  db.prepare(`SELECT o.message_id AS id,o.contact_id,o.opened_at,o.due_at,o.closed_reason,m.subject,m.body,m.recipient_email,c.name AS contact_name,c.email AS contact_email,c.company_id
   FROM record_mail_obligations o JOIN record_mail_outbound_messages m ON m.id=o.message_id JOIN contacts c ON c.id=o.contact_id
   WHERE o.owner_id=? AND o.closed_at IS NULL ORDER BY o.message_id`).bind(id).all<any>()
 ]);
 const inventory={operator,opportunities:opportunities.results,tasks,handoffs:handoffs.results,scheduledMessages:messages.results,recordMailObligations:recordMailObligations.results};return {...inventory,review:await digest(inventory)};
}
export async function removeWithHandover(db:D1Database,id:string,actor:string,choices?:RemovalChoices,sessionId?:string){
 const inventory=await removalReview(db,id);if(inventory.operator.status!=='active')throw new RecordError(409,'This operator is already removed.');
 if(inventory.operator.setup_owner&&id!==actor)throw new RecordError(409,'Only the setup operator can remove themselves.');
 if(inventory.operator.setup_owner&&!await db.prepare("SELECT id FROM operators WHERE status='active' AND id<>? AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=operators.id) LIMIT 1").bind(id).first())throw new RecordError(409,'Establish another active administrator before removing the setup owner.');
 if((['opportunities','tasks','handoffs','recordMailObligations'] as const).some(key=>inventory[key].length&&(!choices||!Object.hasOwn(choices,key)||choices[key]===undefined)))throw new RecordError(409,'Review owned work and choose a receiving operator or explicit unassignment for each set before removal.');
 if(choices&&choices.review!==inventory.review)throw new RecordError(409,'Owned work changed. Reload the removal review.');
 const destinations={opportunities:choices?.opportunities??null,tasks:choices?.tasks??null,handoffs:choices?.handoffs??null,recordMailObligations:choices?.recordMailObligations??null};
 for(const target of Object.values(destinations))if(target!==null&&(typeof target!=='string'||!target||target===id||!await db.prepare("SELECT id FROM operators WHERE id=? AND status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=operators.id)").bind(target).first()))throw new RecordError(409,'Choose another active full operator or explicit unassignment.');
 const now=new Date().toISOString(),operation=createId(),guard=(condition:string,...values:unknown[])=>db.prepare(`INSERT INTO runtime_controls(name,value) SELECT ?,CASE WHEN ${condition} THEN 'valid' ELSE NULL END`).bind(`handover_${createId()}`,...values);
 const statements=[guard("EXISTS(SELECT 1 FROM operators WHERE id=? AND status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=operators.id)) AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import'))",actor),guard("EXISTS(SELECT 1 FROM operators WHERE id=? AND status='active')",id)];
 if(sessionId)statements.push(guard("EXISTS(SELECT 1 FROM sessions WHERE id=? AND operator_id=? AND revoked_at IS NULL AND expires_at>?)",sessionId,actor,now));
 if(inventory.operator.setup_owner)statements.push(guard("EXISTS(SELECT 1 FROM operators WHERE status='active' AND id<>? AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=operators.id))",id));
 for(const target of Object.values(destinations))if(target)statements.push(guard("EXISTS(SELECT 1 FROM operators WHERE id=? AND status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=operators.id))",target));
 statements.push(guard("(SELECT count(*) FROM opportunities WHERE owner_id=? AND lifecycle='open')=?",id,inventory.opportunities.length),guard("(SELECT count(*) FROM handoff_tasks WHERE assignee_id=? AND status='open')=?",id,inventory.handoffs.length),guard("(SELECT count(*) FROM record_mail_obligations WHERE owner_id=? AND closed_at IS NULL)=?",id,inventory.recordMailObligations.length));
 statements.push(guard("(SELECT count(*) FROM (SELECT id FROM outbound_messages WHERE operator_id=? AND state='scheduled' UNION ALL SELECT id FROM record_mail_outbound_messages WHERE operator_id=? AND state='scheduled'))=?",id,id,inventory.scheduledMessages.length));
 for(const message of inventory.scheduledMessages)statements.push(guard("EXISTS(SELECT 1 FROM outbound_messages WHERE id=? AND operator_id=? AND state='scheduled' AND subject=? UNION ALL SELECT 1 FROM record_mail_outbound_messages WHERE id=? AND operator_id=? AND state='scheduled' AND subject=?)",message.id,id,message.subject,message.id,id,message.subject));
 for(const deal of inventory.opportunities)statements.push(guard("EXISTS(SELECT 1 FROM opportunities WHERE id=? AND owner_id=? AND updated_at=? AND lifecycle='open')",deal.id,id,deal.updated_at),db.prepare('UPDATE opportunities SET owner_id=?,updated_at=? WHERE id=?').bind(destinations.opportunities,now,deal.id),...timeline(db,actor,'opportunity',deal.id,'owner.changed',{previous:id,current:destinations.opportunities,reason:'Operator removal handover'},now),mutationJob(db,deal.id,actor,'Owner handover'));
 try{statements.push(...await taskHandoverStatements(db,{fromOwnerId:id,toOwnerId:destinations.tasks,actorId:actor,operationId:operation,reviewedTasks:inventory.tasks.map(task=>({id:task.id,revision:task.revision}))}));}catch(error){if(error instanceof TaskError)throw new RecordError(error.status===403?403:409,error.message);throw error;}
 for(const task of inventory.handoffs){const detail=await db.prepare('SELECT opportunity_id FROM handoff_tasks WHERE id=?').bind(task.id).first<{opportunity_id:string}>();statements.push(guard("EXISTS(SELECT 1 FROM handoff_tasks WHERE id=? AND assignee_id=? AND revision=? AND status='open')",task.id,id,task.revision),db.prepare('UPDATE handoff_tasks SET assignee_id=?,revision=?,updated_at=? WHERE id=?').bind(destinations.handoffs,createId(),now,task.id),...timeline(db,actor,'opportunity',detail!.opportunity_id,'task.reassigned',{taskId:task.id,previous:id,current:destinations.handoffs,reason:'Operator removal handover'},now));}
 for(const promise of inventory.recordMailObligations){
  const entry=createId(),payload=JSON.stringify({operation,messageId:promise.id,previous:id,current:destinations.recordMailObligations,reason:'Operator removal handover'});
  statements.push(
   guard(`EXISTS(SELECT 1 FROM record_mail_obligations o JOIN record_mail_outbound_messages m ON m.id=o.message_id JOIN contacts c ON c.id=o.contact_id
    WHERE o.message_id=? AND o.owner_id=? AND o.closed_at IS NULL AND o.contact_id=? AND o.opened_at=? AND o.due_at=? AND o.closed_reason IS ?
    AND m.subject=? AND m.body=? AND m.recipient_email=? AND c.name IS ? AND c.email IS ? AND c.company_id IS ?)`,promise.id,id,promise.contact_id,promise.opened_at,promise.due_at,promise.closed_reason,promise.subject,promise.body,promise.recipient_email,promise.contact_name,promise.contact_email,promise.company_id),
   db.prepare('UPDATE record_mail_obligations SET owner_id=? WHERE message_id=?').bind(destinations.recordMailObligations,promise.id),
   db.prepare("INSERT INTO timeline_entries(id,kind,occurred_at,recorded_at,actor_type,actor_id,source,payload_json) VALUES(?,'mail.follow_up.reassigned',?,?,'operator',?,'records',?)").bind(entry,now,now,actor,payload),
   db.prepare("INSERT INTO timeline_entry_records VALUES(?,'contact',?)").bind(entry,promise.contact_id),
   ...(promise.company_id?[db.prepare("INSERT INTO timeline_entry_records VALUES(?,'company',?)").bind(entry,promise.company_id)]:[])
  );
 }
 statements.push(db.prepare("UPDATE record_mail_outbound_messages SET state='cancelled',failure='Operator removed',updated_at=? WHERE operator_id=? AND state IN('draft','scheduled','queued')").bind(now,id),db.prepare("UPDATE record_mail_drafts SET is_stale=1,stale_reason='Operator removed',updated_at=? WHERE author_id=?").bind(now,id));
 statements.push(db.prepare("UPDATE outbound_messages SET state='cancelled',failure='Operator removed',updated_at=? WHERE operator_id=? AND state='scheduled'").bind(now,id),db.prepare('UPDATE sessions SET revoked_at=? WHERE operator_id=? AND revoked_at IS NULL').bind(now,id),db.prepare("UPDATE operators SET status='removed',updated_at=? WHERE id=?").bind(now,id),audit(db,actor,'operator.removed','operator',id,{operation,choices:destinations,opportunities:inventory.opportunities.map(r=>r.id),tasks:inventory.tasks.map(r=>r.id),handoffs:inventory.handoffs.map(r=>r.id),recordMailObligations:inventory.recordMailObligations.map(r=>r.id),scheduledCancelled:inventory.scheduledMessages.length}),db.prepare("DELETE FROM runtime_controls WHERE name LIKE 'handover_%'"),db.prepare('DELETE FROM sales_task_guards'));
 try{await db.batch(statements);}catch(error){if(/runtime_controls.value|sales_task_revision|sales_task_authority/.test(String(error)))throw new RecordError(409,'Owned work or access changed. Reload the removal review.');throw error;}
 return {removed:true};
}
