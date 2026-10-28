import { createId } from '../../shared/ids';
export type RecordKind = 'contact'|'company'|'opportunity';
export const tables = { contact:'contacts',company:'companies',opportunity:'opportunities' } as const;
export class RecordError extends Error { constructor(readonly status:400|403|404|409|413|429, message:string,readonly recordId?:string){super(message);} }
export function audit(db:D1Database,actor:string|null,action:string,kind:string,id:string,details:unknown={},occurredAt=new Date().toISOString()) {
 return db.prepare('INSERT INTO audit_entries(id,actor_id,action,entity_type,entity_id,details_json,occurred_at) VALUES(?,?,?,?,?,?,?)').bind(createId(),actor,action,kind,id,JSON.stringify(details),occurredAt);
}
export function timeline(db:D1Database,actor:string,kind:RecordKind,recordId:string,event:string,payload:unknown,occurredAt=new Date().toISOString()) {
 const id=createId(),now=new Date().toISOString();
 return [db.prepare("INSERT INTO timeline_entries(id,kind,occurred_at,recorded_at,actor_type,actor_id,source,payload_json) VALUES(?,?,?,?,'operator',?,'records',?)").bind(id,event,occurredAt,now,actor,JSON.stringify(payload)),db.prepare('INSERT INTO timeline_entry_records VALUES(?,?,?)').bind(id,kind,recordId)];
}
export async function requireRecord(db:D1Database,kind:RecordKind,id:string){const row=await db.prepare(`SELECT * FROM ${tables[kind]} WHERE id=?`).bind(id).first<Record<string,any>>();if(!row)throw new RecordError(404,'Record not found.');return row;}
export function mutationJob(db:D1Database,id:string,actor:string,reason:string){return db.prepare('INSERT INTO record_mutation_jobs VALUES(?,?,?,?) ON CONFLICT(opportunity_id) DO UPDATE SET actor_id=excluded.actor_id,reason=excluded.reason,requested_at=excluded.requested_at').bind(id,actor,reason,new Date().toISOString());}
