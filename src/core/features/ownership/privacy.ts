import type {OwnershipKind} from './types';
/** Explicit statements also erase materialized archive/import copies; live triggers
 * cover direct native deletions through other doors. Batch audit has no record IDs. */
export function ownershipErasureStatements(db:D1Database,kind:OwnershipKind,id:string){return [
 db.prepare("DELETE FROM notifications WHERE event_key IN(SELECT 'owner-change:'||json_extract(t.payload_json,'$.operation')||':'||json_extract(t.payload_json,'$.current') FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id WHERE r.record_type=? AND r.record_id=? AND t.kind='owner.changed')").bind(kind,id),
 db.prepare("DELETE FROM notifications WHERE event_key IN(SELECT 'ownership:'||batch_id FROM ownership_batch_items WHERE record_id=? AND batch_id IN(SELECT id FROM ownership_batches WHERE record_type=?))").bind(id,kind),
 db.prepare('DELETE FROM record_ownership WHERE record_type=? AND record_id=?').bind(kind,id),
 db.prepare('DELETE FROM record_ownership_history WHERE record_type=? AND record_id=?').bind(kind,id),
 db.prepare("UPDATE ownership_batch_items SET record_id='erased:'||ordinal,record_name='Unavailable record',previous_owner_id=NULL,previous_owner_name=NULL,new_owner_name=NULL,reviewed_updated_at=NULL,failure='No permission or record unavailable',applied=0,undone=0 WHERE record_id=? AND batch_id IN(SELECT id FROM ownership_batches WHERE record_type=?)").bind(id,kind),
 db.prepare("DELETE FROM timeline_entries WHERE kind='owner.changed' AND id IN(SELECT timeline_entry_id FROM timeline_entry_records WHERE record_type=? AND record_id=?)").bind(kind,id)
 ];}

/** Names in reviewed before-images and receipts are attributed by identity. */
export function ownershipOperatorErasure(db:D1Database,id:string){return [
 db.prepare("DELETE FROM notifications WHERE kind='record.assigned' AND (event_key LIKE ? OR event_key LIKE ?)").bind('deal-owner:%:'+id+':%','deal-owner:%:'+id),
 db.prepare("DELETE FROM notifications WHERE event_key IN(SELECT 'owner-change:'||json_extract(payload_json,'$.operation')||':'||json_extract(payload_json,'$.current') FROM timeline_entries WHERE kind='owner.changed' AND (actor_id=? OR json_extract(payload_json,'$.previous')=? OR json_extract(payload_json,'$.current')=?))").bind(id,id,id),
 db.prepare("DELETE FROM notifications WHERE event_key IN(SELECT 'ownership:'||b.id FROM ownership_batches b WHERE b.actor_id=? OR b.owner_id=? OR EXISTS(SELECT 1 FROM ownership_batch_items i WHERE i.batch_id=b.id AND i.previous_owner_id=?))").bind(id,id,id),
 db.prepare("UPDATE ownership_batch_items SET previous_owner_name='Erased operator' WHERE previous_owner_id=?").bind(id),
 db.prepare("UPDATE ownership_batch_items SET new_owner_name='Erased operator' WHERE batch_id IN(SELECT id FROM ownership_batches WHERE owner_id=?)").bind(id),
 db.prepare("UPDATE timeline_entries SET payload_json=json_set(payload_json,'$.previousOwnerName','Erased operator') WHERE kind='owner.changed' AND json_extract(payload_json,'$.previous')=?").bind(id),
 db.prepare("UPDATE timeline_entries SET payload_json=json_set(payload_json,'$.currentOwnerName','Erased operator') WHERE kind='owner.changed' AND json_extract(payload_json,'$.current')=?").bind(id)
 ];}
