import {createId} from '../../shared/ids';

/** Follow proposal provenance while it still exists, in the contact erasure transaction. */
export function captureErasureStatements(db:D1Database,contactId:string,actor:string){
 const signals='SELECT signal_id FROM record_erasure_signals WHERE contact_id=?';
 const proposals=`SELECT id FROM capture_proposals WHERE signal_id IN(${signals}) OR (record_type='contact' AND record_id=?) OR EXISTS(SELECT 1 FROM json_each(capture_proposals.details_json,'$.contactIds') WHERE value=?)`;
 const person=[contactId,contactId,contactId];
 return [
  // Accepted field, contact, stop and queue changes copy evidence without a signalId.
  // Remove that whole evidence entry. Destination text is separately redacted
  // only where it contains an erased mailbox, preserving the accepted decision.
  db.prepare(`DELETE FROM timeline_entries WHERE json_extract(payload_json,'$.proposalId') IN(${proposals})`).bind(...person),
  db.prepare(`UPDATE audit_entries SET entity_id='erased',details_json='{}' WHERE entity_type='capture_proposal' AND entity_id IN(${proposals})`).bind(...person),
  db.prepare(`UPDATE audit_entries SET details_json='{}' WHERE json_extract(details_json,'$.proposalId') IN(${proposals})`).bind(...person),
  db.prepare(`INSERT INTO audit_entries(id,actor_id,action,entity_type,entity_id,details_json,occurred_at) SELECT ?,?,'capture.erased','contact','erased',json_object('capturedItems',(SELECT count(*) FROM capture_items WHERE signal_id IN(${signals})),'proposals',(SELECT count(*) FROM capture_proposals WHERE id IN(${proposals}))),? WHERE EXISTS(SELECT 1 FROM capture_items WHERE signal_id IN(${signals})) OR EXISTS(${proposals})`).bind(createId(),actor,contactId,...person,new Date().toISOString(),contactId,...person),
  db.prepare(`DELETE FROM capture_proposals WHERE id IN(${proposals})`).bind(...person),
  db.prepare(`DELETE FROM capture_items WHERE signal_id IN(${signals})`).bind(contactId),
 ];
}
