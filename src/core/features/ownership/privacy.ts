import type {OwnershipKind} from './types';
/** Explicit statements also erase materialized archive/import copies; live triggers
 * cover direct native deletions through other doors. Batch audit has no record IDs. */
export function ownershipErasureStatements(db:D1Database,kind:OwnershipKind,id:string){return [
 db.prepare("DELETE FROM notifications WHERE event_key IN(SELECT 'ownership:'||batch_id FROM ownership_batch_items WHERE record_id=? AND batch_id IN(SELECT id FROM ownership_batches WHERE record_type=?))").bind(id,kind),
 db.prepare('DELETE FROM record_ownership WHERE record_type=? AND record_id=?').bind(kind,id),
 db.prepare('DELETE FROM record_ownership_history WHERE record_type=? AND record_id=?').bind(kind,id),
 db.prepare("UPDATE ownership_batch_items SET record_id='erased:'||ordinal,record_name='Unavailable record',previous_owner_id=NULL,previous_owner_name=NULL,new_owner_name=NULL,reviewed_updated_at=NULL,failure='No permission or record unavailable',applied=0,undone=0 WHERE record_id=? AND batch_id IN(SELECT id FROM ownership_batches WHERE record_type=?)").bind(id,kind),
 db.prepare("DELETE FROM timeline_entries WHERE kind='owner.changed' AND id IN(SELECT timeline_entry_id FROM timeline_entry_records WHERE record_type=? AND record_id=?)").bind(kind,id)
 ];}
