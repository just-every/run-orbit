import {createId} from '../../shared/ids';
import {tables} from '../records/shared';
import type {OwnershipBatch,OwnershipItem} from './types';
/** Opportunities retain their native owner column; collaborators cannot own native work. */
export async function eligibleOpportunityOwners(db:D1Database){
 const eligible=(await db.prepare("SELECT id FROM operators WHERE status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=operators.id) ORDER BY id").all<{id:string}>()).results;
 return eligible.map(operator=>operator.id);
}
function itemGate(batch:OwnershipBatch,item:OwnershipItem,state:string){
 return {sql:'EXISTS(SELECT 1 FROM ownership_batches b JOIN ownership_batch_items i ON i.batch_id=b.id WHERE b.id=? AND b.state=? AND i.record_id=? AND i.failure IS NULL AND i.previous_owner_id IS NOT b.owner_id)',values:[batch.id,state,item.record_id]};
}
function history(db:D1Database,batch:OwnershipBatch,item:OwnershipItem,actor:string,undo:boolean,now:string){
 const gate=itemGate(batch,item,undo?'applied':'reviewed'),owner=undo?item.previous_owner_id:batch.owner_id,previous=undo?batch.owner_id:item.previous_owner_id;
 const event=createId(),payload=JSON.stringify({action:undo?'undone':owner===null?'unassigned':previous===null?'assigned':'reassigned',previous,previousOwnerName:undo?item.new_owner_name:item.previous_owner_name,current:owner,currentOwnerName:undo?item.previous_owner_name:item.new_owner_name,batchId:batch.id});
 return [
  db.prepare(`INSERT INTO record_ownership_history SELECT ?,?,?,?, ?,?,?,?,x.revision,? FROM record_ownership x WHERE x.record_type=? AND x.record_id=? AND ${gate.sql}`).bind(createId(),batch.record_type,item.record_id,previous,owner,actor,batch.id,undo?'undone':'assigned',now,batch.record_type,item.record_id,...gate.values),
  db.prepare(`INSERT INTO timeline_entries(id,kind,occurred_at,recorded_at,actor_type,actor_id,source,payload_json) SELECT ?,?,?,?,'operator',?,'records',? WHERE ${gate.sql}`).bind(event,'owner.changed',now,now,actor,payload,...gate.values),
  db.prepare('INSERT INTO timeline_entry_records SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM timeline_entries WHERE id=?)').bind(event,batch.record_type,item.record_id,event)
 ];
}
function batchAudit(db:D1Database,batch:OwnershipBatch,actor:string,undo:boolean,now:string){
 const state=undo?'applied':'reviewed';return db.prepare(`INSERT INTO audit_entries(id,actor_id,action,entity_type,entity_id,details_json,occurred_at)
 SELECT ?,?,?,'ownership_batch',b.id,json_object('items',b.item_count,'applied',(SELECT count(*) FROM ownership_batch_items WHERE batch_id=b.id AND applied=1),'undone',(SELECT count(*) FROM ownership_batch_items WHERE batch_id=b.id AND undone=1),'failed',(SELECT count(*) FROM ownership_batch_items WHERE batch_id=b.id AND failure IS NOT NULL)),? FROM ownership_batches b WHERE b.id=? AND b.state=?`).bind(createId(),actor,undo?'ownership.batch.undone':'ownership.batch.applied',now,batch.id,state);
}
export function applyOwnershipStatements(db:D1Database,batch:OwnershipBatch,items:OwnershipItem[],actor:string){
 const now=new Date().toISOString(),statements:D1PreparedStatement[]=[];
 for(const item of items){
  const gate=itemGate(batch,item,'reviewed');
  statements.push(db.prepare(`UPDATE ownership_batch_items SET failure=CASE
   WHEN failure IS NOT NULL THEN failure
   WHEN NOT EXISTS(SELECT 1 FROM ${tables[batch.record_type]} WHERE id=record_id) THEN 'No permission or record unavailable'
   WHEN ? IS NOT NULL AND NOT EXISTS(SELECT 1 FROM operators WHERE id=? AND status='active') THEN 'Owner is inactive or unavailable'
   WHEN COALESCE((SELECT revision FROM record_ownership WHERE record_type=? AND record_id=ownership_batch_items.record_id),0)<>reviewed_revision OR COALESCE((SELECT revision FROM graph_records WHERE workspace_id='workspace' AND kind=? AND id=ownership_batch_items.record_id AND retired_into_id IS NULL),0)<>reviewed_record_revision OR (SELECT updated_at FROM ${tables[batch.record_type]} WHERE id=record_id) IS NOT reviewed_updated_at THEN 'Record changed since review'
   ELSE NULL END WHERE batch_id=? AND record_id=? AND EXISTS(SELECT 1 FROM ownership_batches WHERE id=? AND state='reviewed')`).bind(batch.owner_id,batch.owner_id,batch.record_type,batch.record_type,batch.id,item.record_id,batch.id));
  statements.push(db.prepare(`INSERT INTO record_ownership(record_type,record_id,owner_id,revision,updated_at) SELECT ?,?,?,1,? WHERE ${gate.sql} ON CONFLICT(record_type,record_id) DO UPDATE SET owner_id=excluded.owner_id,revision=record_ownership.revision+1,updated_at=excluded.updated_at`).bind(batch.record_type,item.record_id,batch.owner_id,now,...gate.values));
  statements.push(...history(db,batch,item,actor,false,now));
  statements.push(db.prepare(`UPDATE ownership_batch_items SET applied=1,applied_revision=(SELECT revision FROM record_ownership WHERE record_type=? AND record_id=ownership_batch_items.record_id) WHERE batch_id=? AND record_id=? AND failure IS NULL AND previous_owner_id IS NOT ? AND EXISTS(SELECT 1 FROM ownership_batches WHERE id=? AND state='reviewed')`).bind(batch.record_type,batch.id,item.record_id,batch.owner_id,batch.id));
 }
 statements.push(assignmentNotification(db,batch,actor,now),batchAudit(db,batch,actor,false,now),db.prepare("UPDATE ownership_batches SET state='applied',applied_at=? WHERE id=? AND state='reviewed'").bind(now,batch.id));
 return statements;
}
export function undoOwnershipStatements(db:D1Database,batch:OwnershipBatch,items:OwnershipItem[],actor:string){
 const now=new Date().toISOString(),statements:D1PreparedStatement[]=[];
 for(const item of items.filter(item=>item.applied)){
  const gate=itemGate(batch,item,'applied');
  statements.push(db.prepare(`UPDATE ownership_batch_items SET failure=CASE
   WHEN failure='Record changed during import' THEN failure
   WHEN NOT EXISTS(SELECT 1 FROM ${tables[batch.record_type]} WHERE id=record_id) THEN 'No permission or record unavailable'
   WHEN previous_owner_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM operators WHERE id=previous_owner_id AND status='active') THEN 'Previous owner is inactive or unavailable'
   WHEN NOT EXISTS(SELECT 1 FROM record_ownership x WHERE x.record_type=? AND x.record_id=ownership_batch_items.record_id AND x.revision=applied_revision AND x.owner_id IS ?) OR COALESCE((SELECT revision FROM graph_records WHERE workspace_id='workspace' AND kind=? AND id=ownership_batch_items.record_id AND retired_into_id IS NULL),0)<>reviewed_record_revision OR (SELECT updated_at FROM ${tables[batch.record_type]} WHERE id=record_id) IS NOT reviewed_updated_at THEN 'Record changed since assignment'
   ELSE NULL END WHERE batch_id=? AND record_id=? AND applied=1 AND undone=0 AND EXISTS(SELECT 1 FROM ownership_batches WHERE id=? AND state='applied')`).bind(batch.record_type,batch.owner_id,batch.record_type,batch.id,item.record_id,batch.id));
  statements.push(db.prepare(`UPDATE record_ownership SET owner_id=?,revision=revision+1,updated_at=? WHERE record_type=? AND record_id=? AND ${gate.sql}`).bind(item.previous_owner_id,now,batch.record_type,item.record_id,...gate.values));
  statements.push(...history(db,batch,item,actor,true,now));
  statements.push(db.prepare(`UPDATE ownership_batch_items SET undone=1 WHERE batch_id=? AND record_id=? AND failure IS NULL AND applied=1 AND EXISTS(SELECT 1 FROM ownership_batches WHERE id=? AND state='applied')`).bind(batch.id,item.record_id,batch.id));
 }
 statements.push(batchAudit(db,batch,actor,true,now),db.prepare("UPDATE ownership_batches SET state='undone',undone_at=? WHERE id=? AND state='applied'").bind(now,batch.id));
 return statements;
}

function assignmentNotification(db:D1Database,batch:OwnershipBatch,actor:string,now:string){
 return db.prepare(`INSERT OR IGNORE INTO notifications(id,operator_id,opportunity_id,event_key,kind,message,created_at)
  SELECT ?,b.owner_id,NULL,'ownership:'||b.id,'record.assigned','Assigned by '||a.display_name||': '||(SELECT group_concat(record_name||' (previous owner: '||COALESCE(previous_owner_name,'Unassigned')||')','; ') FROM (SELECT * FROM ownership_batch_items WHERE batch_id=b.id AND applied=1 ORDER BY ordinal)),?
  FROM ownership_batches b JOIN operators a ON a.id=? JOIN operators receiver ON receiver.id=b.owner_id
  WHERE b.id=? AND b.state='reviewed' AND receiver.status='active' AND receiver.id<>a.id
  AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=receiver.id)
  AND EXISTS(SELECT 1 FROM ownership_batch_items WHERE batch_id=b.id AND applied=1)`).bind(createId(),now,actor,batch.id);
}
