import {tables,type RecordKind} from '../records/shared';
import {identityMatch,identityPatterns} from '../records/erasure-identity';
/** Erasure withdraws private plans and cached previews before their source links disappear. */
export async function workflowContactErasure(db:D1Database,id:string,identities:string[]){
 const statements:D1PreparedStatement[]=[db.prepare('UPDATE workflow_versions SET preview_id=NULL,preview_json=NULL')];
 const derived=(await db.prepare("SELECT plan_json FROM workflow_record_writes WHERE EXISTS(SELECT 1 FROM json_each(plan_json,'$.relatedRecords') WHERE json_extract(value,'$.recordType')='contact' AND json_extract(value,'$.recordId')=?) ORDER BY occurred_at DESC,rowid DESC").bind(id).all<{plan_json:string}>()).results;
 for(const row of derived){const p=JSON.parse(row.plan_json);if(p.recordType==='contact'&&p.recordId===id||!Object.hasOwn(tables,p.recordType)||p.field==='create_record'||p.field==='contactability')continue;
  const table=tables[p.recordType as RecordKind],key=p.field.startsWith('custom:')?p.field.slice(7):null;
  if(key!==null){const path='$.'+JSON.stringify(key);statements.push(db.prepare(`UPDATE ${table} SET custom_fields_json=json_set(custom_fields_json,?,json(?)),updated_at=? WHERE id=? AND json_extract(custom_fields_json,?) IS ?`).bind(path,JSON.stringify(p.before??null),new Date().toISOString(),p.recordId,path,p.after??null));}
  else if(['name','email','phone','job_title','timezone','primary_domain','title'].includes(p.field))statements.push(db.prepare(`UPDATE ${table} SET ${p.field}=?,updated_at=? WHERE id=? AND ${p.field} IS ?`).bind(p.before??null,new Date().toISOString(),p.recordId,p.after??null));
  statements.push(db.prepare('DELETE FROM workflow_events WHERE id IN(SELECT event_id FROM workflow_event_snapshots WHERE record_type=? AND record_id=?)').bind(p.recordType,p.recordId));
 }

 for(const identity of [id,...identities]){
  const match=identity===id?'instr(definition_json,?)>0':identityMatch('definition_json'),args=identity===id?[id]:identityPatterns(identity);
  const affected=`SELECT workflow_id FROM workflow_versions WHERE ${match}`;
  statements.push(db.prepare(`DELETE FROM workflow_record_writes WHERE workflow_id IN(${affected})`).bind(...args),db.prepare(`DELETE FROM workflow_runs WHERE workflow_id IN(${affected})`).bind(...args),db.prepare(`DELETE FROM workflow_versions WHERE ${match}`).bind(...args));
  if(identity!==id){for(const [table,column]of [['workflow_runs','plan_json'],['workflow_record_writes','plan_json'],['workflow_event_snapshots','values_json']] as const)statements.push(db.prepare(`DELETE FROM ${table} WHERE ${identityMatch(column)}`).bind(...identityPatterns(identity)));}
 }
 return statements;
}
export function workflowOperatorErasure(db:D1Database,id:string){return [db.prepare("UPDATE workflow_versions SET status='paused',preview_id=NULL,preview_json=NULL WHERE activated_by=?").bind(id),db.prepare('DELETE FROM workflow_runs WHERE owner_id=?').bind(id),db.prepare('DELETE FROM workflow_record_writes WHERE actor_id=?').bind(id)];}
