import {createId} from '../../shared/ids';
import type {D1Sql} from '../../../modules/import-kit/d1/index';
/** Reversal restores the snapshot and appends an attributed owner change without notifying. */
export function ownerUndoHistory(kind:string,id:string,ownerId:string|null,actor:string):D1Sql[]{
 const event=createId(),at=new Date().toISOString(),recordKind=kind==='contact-owner'?'contact':'company';
 const gate='FROM record_ownership x WHERE x.record_type=? AND x.record_id=? AND x.owner_id IS NOT ?';
 return [
  {sql:`INSERT INTO record_ownership_history(id,record_type,record_id,previous_owner_id,owner_id,actor_id,batch_id,action,revision,occurred_at) SELECT ?,x.record_type,x.record_id,x.owner_id,?,?,NULL,'undone',x.revision+1,? ${gate}`,params:[event,ownerId,actor,at,recordKind,id,ownerId]},
  {sql:`INSERT INTO timeline_entries(id,kind,occurred_at,recorded_at,actor_type,actor_id,source,payload_json) SELECT ?,'owner.changed',?,?,'source',?,'import',json_object('action','undone','previous',x.owner_id,'previousOwnerName',(SELECT display_name FROM operators WHERE id=x.owner_id),'current',?,'currentOwnerName',(SELECT display_name FROM operators WHERE id=?),'reason','CSV import undo') ${gate}`,params:[event,at,at,actor,ownerId,ownerId,recordKind,id,ownerId]},
  {sql:'INSERT INTO timeline_entry_records SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM timeline_entries WHERE id=?)',params:[event,recordKind,id,event]}
 ];
}
