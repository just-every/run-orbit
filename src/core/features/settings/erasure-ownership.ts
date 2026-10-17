import {actorFence,clearGuards,guard,version} from '../identity/store';
import {RecordError} from '../records/shared';

const outstandingWork=`EXISTS(SELECT 1 FROM record_owners WHERE record_type='contact' AND owner_id=?)
 OR EXISTS(SELECT 1 FROM record_owners WHERE record_type='company' AND owner_id=?)
 OR EXISTS(SELECT 1 FROM opportunities WHERE owner_id=? AND lifecycle='open')
 OR EXISTS(SELECT 1 FROM sales_tasks WHERE owner_id=? AND status='open')
 OR EXISTS(SELECT 1 FROM handoff_tasks WHERE assignee_id=? AND status='open')
 OR EXISTS(SELECT 1 FROM outbound_messages WHERE operator_id=? AND state='scheduled')`;
const values=(id:string)=>Array<string>(6).fill(id);

/** Legacy/archive identities may already be removed. Erasure must never turn that
 * status into a way around explicit work handover or silently clear native owners. */
export async function operatorErasureFences(db:D1Database,id:string,actor:string,sessionId?:string){
 if(await db.prepare(`SELECT 1 WHERE ${outstandingWork}`).bind(...values(id)).first())throw new RecordError(409,'Hand over or explicitly unassign all owned work and cancel scheduled messages before erasing this operator.');
 const statements=[guard(db,{sql:`EXISTS(SELECT 1 FROM operators WHERE id=? AND status='removed') AND NOT (${outstandingWork})`,args:[id,...values(id)]}),
  guard(db,{sql:"EXISTS(SELECT 1 FROM operators WHERE id=? AND status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=operators.id)) AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import'))",args:[actor]})];
 if(sessionId){
  const person=await db.prepare(`SELECT ${version('o')} AS version FROM operators o WHERE id=?`).bind(actor).first<{version:number}>();
  if(!person)throw new RecordError(403,'An active full operator must review erasure.');
  statements.push(guard(db,actorFence({id:sessionId,operator:{id:actor,version:person.version}},Date.now())));
 }
 return [...statements,clearGuards(db)];
}

/** Ownership labels are structured identity snapshots, so redact by their stable IDs
 * even when another operator authored the history. Keep IDs and attribution intact. */
export function ownerIdentityErasureStatements(db:D1Database,id:string){return [
 db.prepare("UPDATE timeline_entries SET payload_json=json_set(payload_json,'$.previousOwnerName','Erased operator') WHERE kind='owner.changed' AND json_extract(payload_json,'$.previousOwnerId')=?").bind(id),
 db.prepare("UPDATE timeline_entries SET payload_json=json_set(payload_json,'$.ownerName','Erased operator') WHERE kind='owner.changed' AND json_extract(payload_json,'$.ownerId')=?").bind(id),
 db.prepare('DELETE FROM notifications WHERE id IN(SELECT notification_id FROM record_owner_notification_links WHERE previous_owner_id=? OR actor_id=?)').bind(id,id),
 db.prepare("DELETE FROM notifications WHERE kind='task.assigned' AND event_key IN(SELECT 'task.handover:'||json_extract(details_json,'$.operation') FROM audit_entries WHERE action='operator.removed' AND entity_type='operator' AND entity_id=?)").bind(id),
 db.prepare("DELETE FROM record_owner_reviews WHERE actor_id=? OR owner_id=? OR EXISTS(SELECT 1 FROM json_each(items_json) WHERE json_extract(value,'$.previousOwnerId')=?)").bind(id,id,id),
 db.prepare("UPDATE record_owner_batches SET owner_name='Erased operator' WHERE owner_id=?").bind(id),
 db.prepare("UPDATE record_owner_batch_items SET previous_owner_name='Erased operator' WHERE previous_owner_id=?").bind(id)
];}
