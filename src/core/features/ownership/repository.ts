import {createId} from '../../shared/ids';
import {RecordError,tables} from '../records/shared';
import {requireOwnershipOperator,ownershipFence} from './authority';
import {reconcileLegacyOwnership} from './legacy';
import {applyOwnershipStatements,undoOwnershipStatements} from './writes';
import type {OwnershipBatch,OwnershipItem,OwnershipKind} from './types';
export class OwnershipRepository {
 constructor(readonly db:D1Database){}
 async batch(id:string,actor:string){
  await requireOwnershipOperator(this.db,actor);
  const batch=await this.db.prepare('SELECT * FROM ownership_batches WHERE id=? AND actor_id=?').bind(id,actor).first<OwnershipBatch>();
  if(!batch)throw new RecordError(404,'Ownership review not found.');
  return batch;
 }
 async describe(id:string,actor:string){
  const batch=await this.batch(id,actor),items=(await this.db.prepare('SELECT * FROM ownership_batch_items WHERE batch_id=? ORDER BY ordinal').bind(id).all<OwnershipItem>()).results;
  return {id,kind:batch.record_type,ownerId:batch.owner_id,state:batch.state,itemCount:batch.item_count,items:items.map(item=>({recordId:item.record_id,name:item.record_name,previousOwnerId:item.previous_owner_id,previousOwnerName:item.previous_owner_name,newOwnerId:batch.owner_id,newOwnerName:item.new_owner_name,failure:item.failure,applied:!!item.applied,undone:!!item.undone}))};
 }
 async review(kind:OwnershipKind,ids:string[],ownerId:string|null,actor:string){
  await requireOwnershipOperator(this.db,actor);await reconcileLegacyOwnership(this.db);
  const owner=ownerId?await this.db.prepare("SELECT display_name FROM operators WHERE id=?").bind(ownerId).first<{display_name:string}>():null;
  const id=createId(),now=new Date().toISOString(),statements=ownershipFence(this.db,actor);
  statements.push(this.db.prepare("INSERT INTO ownership_batches SELECT ?,?,CASE WHEN EXISTS(SELECT 1 FROM operators WHERE id=?) THEN ? ELSE NULL END,?,'reviewed',?,?,NULL,NULL").bind(id,kind,ownerId,ownerId,actor,ids.length,now));
  // Capture each before image inside the same transaction as its review header.
  for(const [ordinal,recordId]of ids.entries())statements.push(this.db.prepare(`INSERT INTO ownership_batch_items(batch_id,ordinal,record_id,record_name,previous_owner_id,previous_owner_name,new_owner_name,reviewed_revision,reviewed_record_revision,reviewed_updated_at,failure)
   SELECT ?,?,?,COALESCE(r.name,'Unnamed record'),x.owner_id,o.display_name,?,COALESCE(x.revision,0),COALESCE(g.revision,0),r.updated_at,CASE WHEN r.id IS NULL THEN 'No permission or record unavailable' WHEN ? IS NOT NULL AND NOT EXISTS(SELECT 1 FROM operators WHERE id=? AND status='active') THEN 'Owner is inactive or unavailable' ELSE NULL END
   FROM (SELECT 1) seed LEFT JOIN ${tables[kind]} r ON r.id=? LEFT JOIN record_ownership x ON x.record_type=? AND x.record_id=r.id LEFT JOIN operators o ON o.id=x.owner_id LEFT JOIN graph_records g ON g.workspace_id='workspace' AND g.kind=? AND g.id=r.id AND g.retired_into_id IS NULL`).bind(id,ordinal,recordId,owner?.display_name??null,ownerId,ownerId,recordId,kind,kind));
  await this.db.batch(statements);return this.describe(id,actor);
 }
 async apply(id:string,actor:string){
  const batch=await this.batch(id,actor);if(batch.state==='held')throw new RecordError(409,'Restored ownership history requires a fresh review.');
  if(batch.state!=='reviewed')return this.describe(id,actor);
  const items=(await this.db.prepare('SELECT * FROM ownership_batch_items WHERE batch_id=? ORDER BY ordinal').bind(id).all<OwnershipItem>()).results;
  await this.db.batch([...ownershipFence(this.db,actor),...applyOwnershipStatements(this.db,batch,items,actor)]);
  return this.describe(id,actor);
 }
 async undo(id:string,actor:string){
  const batch=await this.batch(id,actor);if(batch.state==='held'||batch.state==='reviewed')throw new RecordError(409,'Only an applied local ownership batch can be undone.');
  if(batch.state==='undone')return this.describe(id,actor);
  const items=(await this.db.prepare('SELECT * FROM ownership_batch_items WHERE batch_id=? ORDER BY ordinal').bind(id).all<OwnershipItem>()).results;
  await this.db.batch([...ownershipFence(this.db,actor),...undoOwnershipStatements(this.db,batch,items,actor)]);
  return this.describe(id,actor);
 }
}
