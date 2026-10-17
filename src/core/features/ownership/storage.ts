import type {RecordKind} from '../records/shared';
const nativeTables={contact:'contacts',company:'companies',opportunity:'opportunities'} as const;
const nativeFields={
 contact:['id','company_id','name','email','email_key','phone','job_title','timezone','contactability','created_at','updated_at','custom_fields_json','contactability_revision'],
 company:['id','name','primary_domain','primary_domain_key','created_at','updated_at','custom_fields_json'],
 opportunity:['id','title','lifecycle','stage_id','owner_id','company_id','value_cents','expected_close_at','score','band','queue_state','queue_reason','last_contributing_signal_at','created_at','updated_at','next_due_at','custom_fields_json','closed_at','closed_by','close_reason']
} as const;
/** Project the native domain explicitly, keeping owner-authored storage columns intact. */
export function recordSource(kind:RecordKind){
 const fields=nativeFields[kind].map(field=>`n.${field}`).join(',')+(kind==='opportunity'?',o.owner_revision':',o.owner_id,o.owner_revision');
 return `(SELECT ${fields} FROM ${nativeTables[kind]} n JOIN record_owners o ON o.record_type='${kind}' AND o.record_id=n.id)`;
}
export function ownerWriteStatements(db:D1Database,kind:RecordKind,id:string,ownerId:string|null,updatedAt?:string,condition?:{sql:string;bindings:unknown[]}){
 const suffix=condition?` AND ${condition.sql}`:'',bindings=condition?.bindings??[];
 return [db.prepare(`UPDATE record_owners SET owner_id=? WHERE record_type=? AND record_id=?${suffix}`).bind(ownerId,kind,id,...bindings),
  ...updatedAt?[db.prepare(`UPDATE ${nativeTables[kind]} SET updated_at=? WHERE id=?${suffix}`).bind(updatedAt,id,...bindings)]:[]];
}
