import {canonicalJson,sha256,type D1Database,type TargetRow,type D1Sql} from '../../../modules/import-kit/d1/index';
import {nativeId} from './source';
const sql=(sql:string,...params:any[]):D1Sql=>({sql,params});
export interface OwnerValue {row:{record_type:'contact'|'company';record_id:string;owner_id:string|null;revision:number;updated_at:string};attribution?:{sourceKey:string;expectedRevision?:string;actorId:string;recordName:string;previousOwnerId:string|null;source:string;account:string}}
export function ownerParts(id:string){const [kind,...rest]=id.split(':');if(kind!=='contact'&&kind!=='company')throw new Error('Unsupported owner record.');return{kind,id:rest.join(':')};}
export async function ownerRead(db:D1Database,destination:string,id:string):Promise<TargetRow|undefined>{
 const key=ownerParts(id),row=await db.prepare('SELECT * FROM record_ownership WHERE record_type=? AND record_id=?').bind(key.kind,key.id).first();if(!row)return;
 const marker=await db.prepare("SELECT revision,original_json FROM crm_import_targets WHERE kind='owner' AND id=?").bind(id).first();
 const original=marker?JSON.parse(marker.original_json):null,value={row,...original?.attribution?{attribution:original.attribution}:{}};
 return{destination,targetKind:'owner',targetId:id,value,revision:marker?.revision??sha256(canonicalJson(value))};
}
export function ownerMatches(target:TargetRow|null,id:string){
 const key=ownerParts(id);
 if(!target)return sql('NOT EXISTS(SELECT 1 FROM record_ownership WHERE record_type=? AND record_id=?)',key.kind,key.id);
 const value=target.value as unknown as OwnerValue;
 return sql("EXISTS(SELECT 1 FROM record_ownership WHERE record_type=? AND record_id=? AND owner_id IS ? AND revision=? AND updated_at=?) AND COALESCE((SELECT revision FROM crm_import_targets WHERE kind='owner' AND id=?),?)=?",key.kind,key.id,value.row.owner_id,value.row.revision,value.row.updated_at,id,sha256(canonicalJson(value)),target.revision);
}
export function ownerWrite(target:TargetRow){
 const value=target.value as unknown as OwnerValue,{row,attribution:a}=value,event=nativeId('import-owner','event',target.revision);
 const statements=[sql(`INSERT INTO runtime_controls(name,value) SELECT 'crm_owner_record_fence',NULL WHERE NOT EXISTS(SELECT 1 FROM ${row.record_type==='contact'?'contacts':'companies'} WHERE id=?)`,row.record_id),sql("INSERT INTO runtime_controls(name,value) SELECT 'crm_owner_fence',NULL WHERE ? IS NOT NULL AND NOT EXISTS(SELECT 1 FROM operators o JOIN access_memberships m ON m.operator_id=o.id WHERE o.id=? AND o.status='active' AND m.workspace_id='workspace' AND m.status='active' AND m.role='legacy_operator' AND NOT EXISTS(SELECT 1 FROM access_collaborators c WHERE c.operator_id=o.id))",row.owner_id,row.owner_id),sql('INSERT INTO record_ownership(record_type,record_id,owner_id,revision,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(record_type,record_id) DO UPDATE SET owner_id=excluded.owner_id,revision=excluded.revision,updated_at=excluded.updated_at',row.record_type,row.record_id,row.owner_id,row.revision,row.updated_at)];
 if(a){
  statements.push(sql("INSERT OR IGNORE INTO record_ownership_history(id,record_type,record_id,previous_owner_id,owner_id,actor_id,batch_id,action,revision,occurred_at) VALUES(?,?,?,?,?,?,NULL,'assigned',?,?)",event,row.record_type,row.record_id,a.previousOwnerId,row.owner_id,a.actorId,row.revision,row.updated_at));
  statements.push(sql("INSERT OR IGNORE INTO timeline_entries(id,kind,occurred_at,recorded_at,actor_type,actor_id,source,payload_json) VALUES(?,'owner.changed',?,?,'import',?,'import',json_set(?,'$.previousOwnerName',(SELECT display_name FROM operators WHERE id=?),'$.currentOwnerName',(SELECT display_name FROM operators WHERE id=?)))",event,row.updated_at,row.updated_at,a.actorId,JSON.stringify({action:row.owner_id===null?'unassigned':a.previousOwnerId===null?'assigned':'reassigned',previous:a.previousOwnerId,current:row.owner_id,importSource:a.source,importAccount:a.account}),a.previousOwnerId,row.owner_id));
  statements.push(sql('INSERT OR IGNORE INTO timeline_entry_records(timeline_entry_id,record_type,record_id) VALUES(?,?,?)',event,row.record_type,row.record_id));
 }
 statements.push(sql("INSERT INTO crm_import_targets(kind,id,revision,original_json) VALUES('owner',?,?,?) ON CONFLICT(kind,id) DO UPDATE SET revision=excluded.revision,original_json=excluded.original_json",target.targetId,target.revision,canonicalJson(value)));
 return statements;
}
export function ownerRemove(id:string){const key=ownerParts(id);return[sql('DELETE FROM record_ownership WHERE record_type=? AND record_id=?',key.kind,key.id),sql("DELETE FROM crm_import_targets WHERE kind='owner' AND id=?",id)];}
