import {RecordError} from '../records/shared';
export async function requireOwnershipOperator(db:D1Database,actor:string){
 if(!await db.prepare("SELECT 1 FROM operators WHERE id=? AND status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=operators.id)").bind(actor).first())throw new RecordError(403,'Record assignment requires an active full operator.');
}
/** Recheck admission and archive exclusion atomically with every write. */
export function ownershipFence(db:D1Database,actor:string){
 const id=crypto.randomUUID();return [db.prepare("INSERT INTO access_write_guards VALUES(?,CASE WHEN EXISTS(SELECT 1 FROM operators WHERE id=? AND status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=operators.id)) AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) THEN 1 ELSE 0 END)").bind(id,actor),db.prepare('DELETE FROM access_write_guards WHERE id=?').bind(id)];
}
