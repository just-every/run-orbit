/** Verified, threaded human replies change response only; they never close the advancement goal. */
export function obligationReplyStatements(db:D1Database,draftIds:string[],evidence:string,at:string){return [
 db.prepare("UPDATE follow_up_obligations SET responded_at=?,response_evidence_id=(SELECT id FROM signals WHERE source_id='sendgrid-replies' AND source_event_id=?) WHERE draft_id IN(SELECT value FROM json_each(?)) AND responded_at IS NULL AND closed_at IS NULL AND paused=0").bind(at,evidence,JSON.stringify(draftIds)),
];}
/** Erase copied evidence while the contact and its attributed links still exist. */
export function obligationErasureStatements(db:D1Database,contactId:string,actor:string){const at=new Date().toISOString();return [
 db.prepare("UPDATE follow_up_obligations SET closed_at=COALESCE(closed_at,?),closed_reason=COALESCE(closed_reason,'Contact erased'),closed_by=COALESCE(closed_by,?) WHERE contact_id=?").bind(at,actor,contactId),
 db.prepare("DELETE FROM handoff_tasks WHERE id IN(SELECT w.item_id FROM follow_up_work w JOIN follow_up_obligations o ON o.id=w.obligation_id WHERE o.contact_id=? AND w.kind='handoff')").bind(contactId),
 db.prepare("UPDATE timeline_entries SET payload_json='{}' WHERE json_extract(payload_json,'$.obligationId') IN(SELECT id FROM follow_up_obligations WHERE contact_id=?)").bind(contactId),
 db.prepare("UPDATE audit_entries SET details_json='{}' WHERE json_extract(details_json,'$.obligationId') IN(SELECT id FROM follow_up_obligations WHERE contact_id=?)").bind(contactId),
 db.prepare("UPDATE follow_up_work SET exit_reason='Contact erased' WHERE obligation_id IN(SELECT id FROM follow_up_obligations WHERE contact_id=?)").bind(contactId),
 db.prepare("UPDATE follow_up_obligations SET contact_id=NULL,meeting_id=NULL,response_evidence_id=NULL,title='Erased follow-up',stop_condition='Erased',closed_reason='Contact erased',draft_id=NULL WHERE contact_id=?").bind(contactId),
];}
export async function dispatchObligationReminders(db:D1Database,at=new Date().toISOString()){
 // One native in-app notice. A closed or restored obligation can never dispatch.
 await db.batch([
  db.prepare(`INSERT OR IGNORE INTO notifications(id,operator_id,opportunity_id,event_key,kind,message,created_at)
   SELECT lower(hex(randomblob(16))),o.owner_id,o.opportunity_id,'obligation.due:'||o.id,'obligation.due','Follow-up due: '||o.title,?
   FROM follow_up_obligations o JOIN follow_up_work w ON w.obligation_id=o.id AND w.kind='reminder' JOIN operators p ON p.id=o.owner_id
   WHERE o.closed_at IS NULL AND o.paused=0 AND o.due_at<=? AND w.exited_at IS NULL AND w.dispatched_at IS NULL
   AND p.status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=p.id)
   AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import'))`).bind(at,at),
  db.prepare("UPDATE follow_up_work SET dispatched_at=? WHERE kind='reminder' AND dispatched_at IS NULL AND exited_at IS NULL AND EXISTS(SELECT 1 FROM notifications WHERE event_key='obligation.due:'||follow_up_work.obligation_id)").bind(at),
 ]);
}
export function restoreObligationStatements(db:D1Database){return [db.prepare('UPDATE follow_up_obligations SET paused=1 WHERE closed_at IS NULL')];}
