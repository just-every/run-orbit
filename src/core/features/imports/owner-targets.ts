import {canonicalJson,type D1Database,type TargetRow,type D1Sql} from '../../../modules/import-kit/d1/index';
import {activeOwnerSql} from './owners';
const sql=(sql:string,...params:any[]):D1Sql=>({sql,params});
export const isOwnerTarget=(kind:string)=>kind==='contact-owner'||kind==='company-owner';
const recordType=(kind:string)=>kind==='contact-owner'?'contact':'company';
/** Ownership is a separate import effect, so undo can restore it while keeping a later name or phone edit. */
export async function readOwnerTarget(db:D1Database,destination:string,kind:string,id:string):Promise<TargetRow|undefined>{
 const marker=await db.prepare('SELECT revision FROM crm_import_targets WHERE kind=? AND id=?').bind(kind,id).first();
 if(!marker)return undefined;
 const row=await db.prepare(`SELECT record_id,owner_id,owner_revision FROM record_owners WHERE record_type='${recordType(kind)}' AND record_id=?`).bind(id).first();
 if(!row)return undefined;
 return {destination,targetKind:kind,targetId:id,value:row,revision:marker.revision};
}
export function ownerTargetMatches(row:TargetRow|null,kind:string,id:string){
 if(!row)return sql(`NOT EXISTS(SELECT 1 FROM record_owners WHERE record_type='${recordType(kind)}' AND record_id=?) OR NOT EXISTS(SELECT 1 FROM crm_import_targets WHERE kind=? AND id=?)`,id,kind,id);
 const value=row.value as any;
 return sql(`EXISTS(SELECT 1 FROM record_owners WHERE record_type='${recordType(kind)}' AND record_id=? AND owner_id IS ? AND owner_revision=?) AND EXISTS(SELECT 1 FROM crm_import_targets WHERE kind=? AND id=? AND revision=?)`,id,value.owner_id,value.owner_revision,kind,id,row.revision);
}
export function writeOwnerTarget(target:TargetRow){
 const value=target.value as any;
 return [sql(`INSERT INTO runtime_controls(name,value) SELECT 'crm_import_owner_fence',NULL WHERE NOT EXISTS(SELECT 1 FROM (${activeOwnerSql}) WHERE id=?)`,value.owner_id),
  sql(`UPDATE record_owners SET owner_id=? WHERE record_type='${recordType(target.targetKind)}' AND record_id=? AND owner_id IS NULL AND owner_revision=0`,value.owner_id,target.targetId),
  sql('INSERT INTO crm_import_targets(kind,id,revision,original_json) VALUES(?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET revision=excluded.revision,original_json=excluded.original_json',target.targetKind,target.targetId,target.revision,canonicalJson(target.value))];
}
export function removeOwnerTarget(kind:string,id:string){return [sql(`UPDATE record_owners SET owner_id=NULL WHERE record_type='${recordType(kind)}' AND record_id=?`,id),sql('DELETE FROM crm_import_targets WHERE kind=? AND id=?',kind,id)];}
