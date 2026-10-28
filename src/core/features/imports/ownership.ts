import type {D1Database,D1Sql} from '../../../modules/import-kit/d1/index';
const sql=(sql:string,...params:any[]):D1Sql=>({sql,params});
export type ImportOwnership={record_type:'contact'|'company';record_id:string;owner_id:string;revision:number;updated_at:string;actor_id:string};
/** Ownership is part of one native record effect, so erasure and preserved undo stay indivisible. */
export async function readImportOwner(db:D1Database,original:ImportOwnership){const row=await db.prepare('SELECT * FROM record_ownership WHERE record_type=? AND record_id=?').bind(original.record_type,original.record_id).first<Omit<ImportOwnership,'actor_id'>>();return row?{...row,actor_id:original.actor_id}:null;}
export function matchImportOwner(owner:ImportOwnership|null,kind:string,id:string){return owner?sql('EXISTS(SELECT 1 FROM record_ownership WHERE record_type=? AND record_id=? AND owner_id IS ? AND revision=? AND updated_at=?)',owner.record_type,owner.record_id,owner.owner_id,owner.revision,owner.updated_at):sql('NOT EXISTS(SELECT 1 FROM record_ownership WHERE record_type=? AND record_id=?)',kind,id);}
export function writeImportOwner(v:ImportOwnership){return[
 sql("INSERT INTO runtime_controls(name,value) SELECT 'crm_owner_authority',NULL WHERE NOT EXISTS(SELECT 1 FROM operators o WHERE o.id=? AND o.status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators x WHERE x.operator_id=o.id))",v.owner_id),
 sql('INSERT INTO record_ownership(record_type,record_id,owner_id,revision,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(record_type,record_id) DO UPDATE SET owner_id=excluded.owner_id,revision=excluded.revision,updated_at=excluded.updated_at',v.record_type,v.record_id,v.owner_id,v.revision,v.updated_at),
 sql("INSERT INTO audit_entries(id,actor_id,action,entity_type,entity_id,details_json,occurred_at) VALUES(?,?,'import.owner.assigned',?,?,?,?)",crypto.randomUUID(),v.actor_id,v.record_type,v.record_id,JSON.stringify({ownerId:v.owner_id}),v.updated_at)
];}
