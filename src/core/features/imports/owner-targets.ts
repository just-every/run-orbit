import {ownerUndoHistory} from './owner-undo';
import {createId} from '../../shared/ids';
import {canonicalJson,sha256,type D1Database,type D1Sql,type TargetRow} from '../../../modules/import-kit/d1/index';
import {nativeId} from './source';
const sql=(sql:string,...params:any[]):D1Sql=>({sql,params});
export const ownerKinds=['contact-owner','company-owner'];
const recordKind=(kind:string)=>kind==='contact-owner'?'contact':'company';
export async function readOwnerTarget(db:D1Database,destination:string,kind:string,id:string):Promise<TargetRow|undefined>{
 const row=await db.prepare('SELECT * FROM record_ownership WHERE record_type=? AND record_id=?').bind(recordKind(kind),id).first();if(!row)return;
 const marker=await db.prepare('SELECT revision,original_json FROM crm_import_targets WHERE kind=? AND id=?').bind(kind,id).first();
 const record=await db.prepare(`SELECT updated_at FROM ${kind==='contact-owner'?'contacts':'companies'} WHERE id=?`).bind(id).first();
 const value={row,recordUpdatedAt:record?.updated_at??null,...marker?{history:JSON.parse(marker.original_json).history??null}:{history:null}};
 return {destination,targetKind:kind,targetId:id,value,revision:marker?.revision??sha256(canonicalJson(value))};
}
export function matchesOwnerTarget(target:TargetRow|null,kind:string,id:string){
 if(!target)return sql('NOT EXISTS(SELECT 1 FROM record_ownership WHERE record_type=? AND record_id=?)',recordKind(kind),id);
 const {row}=target.value as any;
 return sql(`EXISTS(SELECT 1 FROM record_ownership WHERE record_type=? AND record_id=? AND owner_id IS ? AND revision=? AND updated_at=?) AND (SELECT updated_at FROM ${kind==='contact-owner'?'contacts':'companies'} WHERE id=?) IS ? AND (SELECT revision FROM crm_import_targets WHERE kind=? AND id=?) IS ?`,recordKind(kind),id,row.owner_id,row.revision,row.updated_at,id,(target.value as any).recordUpdatedAt,kind,id,target.revision===sha256(canonicalJson(target.value))?null:target.revision);
}
function invalidateOwnershipReviews(kind:string,id:string){return sql("UPDATE ownership_batch_items SET failure='Record changed during import' WHERE record_id=? AND batch_id IN(SELECT id FROM ownership_batches WHERE record_type=? AND state IN('reviewed','applied'))",id,recordKind(kind));}
function removeOwnerHistory(kind:string,id:string){
 const history="SELECT json_extract(original_json,'$.history.id') FROM crm_import_targets WHERE kind=? AND id=?";
 return [sql(`DELETE FROM timeline_entries WHERE id IN(${history})`,kind,id),sql(`DELETE FROM record_ownership_history WHERE id IN(${history})`,kind,id)];
}
export function writeOwnerTarget(target:TargetRow,undoActor?:string){
 const {row,history}=target.value as any,kind=recordKind(target.targetKind),statements=[invalidateOwnershipReviews(target.targetKind,target.targetId),...undoActor?ownerUndoHistory(target.targetKind,target.targetId,row.owner_id,undoActor):[]];
 statements.push(sql("INSERT INTO runtime_controls(name,value) SELECT 'crm_owner_fence',NULL WHERE ? IS NOT NULL AND NOT EXISTS(SELECT 1 FROM operators WHERE id=? AND status='active' AND EXISTS(SELECT 1 FROM access_memberships m WHERE m.operator_id=operators.id AND m.workspace_id='workspace' AND m.status='active' AND m.role='legacy_operator') AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=operators.id))",row.owner_id,row.owner_id));
 statements.push(sql('INSERT INTO record_ownership(record_type,record_id,owner_id,revision,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(record_type,record_id) DO UPDATE SET owner_id=excluded.owner_id,revision=excluded.revision,updated_at=excluded.updated_at',kind,target.targetId,row.owner_id,row.revision,row.updated_at));
 if(history){
  statements.push(sql("INSERT OR IGNORE INTO record_ownership_history VALUES(?,?,?,?,?,?,NULL,'assigned',?,?)",history.id,kind,target.targetId,history.previous,row.owner_id,history.actor,row.revision,row.updated_at));
  statements.push(sql("INSERT OR IGNORE INTO timeline_entries VALUES(?,'owner.changed',?,?,'source',?,'import',?)",history.id,row.updated_at,row.updated_at,history.actor,JSON.stringify({action:row.owner_id===null?'unassigned':history.previous?'reassigned':'assigned',previous:history.previous,previousOwnerName:history.previousOwnerName,current:row.owner_id,currentOwnerName:history.ownerName,reason:'CSV import',importName:history.importName})));
  statements.push(sql('INSERT OR IGNORE INTO timeline_entry_records VALUES(?,?,?)',history.id,kind,target.targetId));
 }
 if(target.revision===sha256(canonicalJson(target.value)))statements.push(sql('DELETE FROM crm_import_targets WHERE kind=? AND id=?',target.targetKind,target.targetId));
 else statements.push(sql('INSERT INTO crm_import_targets VALUES(?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET revision=excluded.revision,original_json=excluded.original_json',target.targetKind,target.targetId,target.revision,canonicalJson(target.value)));
 return statements;
}
export function removeOwnerTarget(kind:string,id:string,undoActor?:string){return [invalidateOwnershipReviews(kind,id),...undoActor?ownerUndoHistory(kind,id,null,undoActor):removeOwnerHistory(kind,id),sql('DELETE FROM record_ownership WHERE record_type=? AND record_id=?',recordKind(kind),id),sql('DELETE FROM crm_import_targets WHERE kind=? AND id=?',kind,id)];}
export interface OwnerSnapshot {row:Record<string,any>|null;recordUpdatedAt:string|null;ownerName:string|null;marker:{revision:string;original_json:string}|null}
/** Read the reviewed owner set in two bounded queries, including matched native records. */
export async function importOwnerSnapshots(db:D1Database,records:{kind:string;id:string}[]){
 const snapshots=new Map<string,OwnerSnapshot>();
 for(const kind of ['contact','company']){
  const ids=JSON.stringify([...new Set(records.filter(record=>record.kind===kind).map(record=>record.id))]);
  const rows=(await db.prepare(`SELECT n.id,n.updated_at AS record_updated_at,x.owner_id,x.revision,x.updated_at,o.display_name,t.revision AS marker_revision,t.original_json
   FROM ${kind==='contact'?'contacts':'companies'} n LEFT JOIN record_ownership x ON x.record_type=? AND x.record_id=n.id LEFT JOIN operators o ON o.id=x.owner_id LEFT JOIN crm_import_targets t ON t.kind=? AND t.id=n.id WHERE n.id IN(SELECT value FROM json_each(?))`).bind(kind,`${kind}-owner`,ids).all<any>()).results;
  for(const row of rows)snapshots.set(`${kind}:${row.id}`,{row:row.revision===null?null:{record_type:kind,record_id:row.id,owner_id:row.owner_id,revision:row.revision,updated_at:row.updated_at},recordUpdatedAt:row.record_updated_at,ownerName:row.display_name,marker:row.marker_revision?{revision:row.marker_revision,original_json:row.original_json}:null});
 }
 return snapshots;
}
/** Each mapping is an independent, reviewed Kit effect with its own before-image. */
export function plannedOwner(snapshots:Map<string,OwnerSnapshot>,namespace:string,kind:string,id:string,sourceId:string,owner:{ownerId:string|null;ownerName:string|null},actor:string,at:string,importName:string){
 const targetKind=`${kind}-owner`,snapshot=snapshots.get(`${kind}:${id}`),previous=snapshot?.row,saved=snapshot?.marker;
 if(saved){const value=JSON.parse(saved.original_json),revision=value.history?.reviewedRevision;if(value.history?.namespace===namespace||value.history?.id===nativeId(namespace,'owner-history',`${kind}:${sourceId}`))return [{targetKind,targetId:id,...revision?{expectedRevision:revision}:{},value}];}
 if((previous?.owner_id??null)===owner.ownerId)return [];
 const value=previous?{row:previous,recordUpdatedAt:snapshot!.recordUpdatedAt,history:saved?JSON.parse(saved.original_json).history??null:null}:null,revision=value?(saved?.revision??sha256(canonicalJson(value))):null;
 return [{targetKind,targetId:id,...revision?{expectedRevision:revision}:{},value:{recordUpdatedAt:snapshot?.recordUpdatedAt??at,row:{record_type:kind,record_id:id,owner_id:owner.ownerId,revision:(previous?.revision??0)+1,updated_at:at},history:{namespace,reviewedRevision:revision,id:createId(),previous:previous?.owner_id??null,previousOwnerName:snapshot?.ownerName??null,ownerName:owner.ownerName,actor,importName}}}];
}
