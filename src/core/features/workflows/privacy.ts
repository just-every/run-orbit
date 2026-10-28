import {mailboxPattern} from '../imports/review-erasure';
import {tables,type RecordKind} from '../records/shared';
import {identityMatch,identityPatterns} from '../records/erasure-identity';
/** Erasure withdraws private plans and cached previews before their source links disappear. */
export async function workflowContactErasure(db:D1Database,id:string,identities:string[]){
 const statements:D1PreparedStatement[]=[db.prepare('UPDATE workflow_versions SET preview_id=NULL,preview_json=NULL')];
 const identity=mailboxPattern(identities);
 const fromErasedContact=(p:any,field:string)=>p.sources?.[field]?.some((source:any)=>source.recordType==='contact'&&source.recordId===id)??false;
 const derived=(await db.prepare("SELECT plan_json FROM workflow_record_writes WHERE EXISTS(SELECT 1 FROM json_each(plan_json,'$.relatedRecords') WHERE json_extract(value,'$.recordType')='contact' AND json_extract(value,'$.recordId')=?) ORDER BY occurred_at DESC,rowid DESC").bind(id).all<{plan_json:string}>()).results;
 for(const row of derived){const p=JSON.parse(row.plan_json);if(p.recordType==='contact'&&p.recordId===id||!Object.hasOwn(tables,p.recordType)||p.field==='contactability')continue;
  const source=p.action.sourceTarget??'trigger',root=p.relatedRecords?.[0],contactSource=source==='form'||source==='trigger'&&root?.recordType==='contact'||['primary_contact','associated_contacts','all_contacts'].includes(source)||source.startsWith('contacts_by_role:');
  if(identity)identity.lastIndex=0;const personalCopy=p.action.kind==='copy'&&(p.sources?fromErasedContact(p,p.field):contactSource),mentionsIdentity=!!identity?.test(JSON.stringify(p.after));
  const table=tables[p.recordType as RecordKind];
  if(p.field==='create_record'){
   for(const [field,descriptor]of Object.entries(p.action.values??{})){if(!descriptor||typeof descriptor!=='object'||!('sourceField' in descriptor))continue;const d=descriptor as {sourceTarget?:string;sourceField:string},from=d.sourceTarget??'trigger',fromContact=p.sources?fromErasedContact(p,field):from==='form'||from==='trigger'&&root?.recordType==='contact'||from==='primary_contact';if(!fromContact)continue;
    const after=p.createdValues?.[field];if(typeof after!=='string')continue;
    if(field==='title')statements.push(db.prepare(`UPDATE ${table} SET title='Erased source',updated_at=? WHERE id=? AND title IS ?`).bind(new Date().toISOString(),p.recordId,after));
   }
   for(const [key,descriptor]of Object.entries(p.action.values?.custom_fields??{})){const d=descriptor as any,from=d?.sourceTarget??'trigger',copied=!!d&&typeof d==='object'&&'sourceField' in d&&(p.sources?fromErasedContact(p,`custom:${key}`):from==='form'||from==='trigger'&&root?.recordType==='contact'||from==='primary_contact'),after=p.createdValues?.custom_fields?.[key];if(identity)identity.lastIndex=0;if(!copied&&!identity?.test(JSON.stringify(after)))continue;const path='$.'+JSON.stringify(key);statements.push(db.prepare(`UPDATE ${table} SET custom_fields_json=json_remove(custom_fields_json,?),updated_at=? WHERE id=? AND json_extract(custom_fields_json,?) IS json_extract(?,'$')`).bind(path,new Date().toISOString(),p.recordId,path,JSON.stringify(after??null)));}
   if(identity)identity.lastIndex=0;if(identity?.test(JSON.stringify(p.createdValues?.title)))statements.push(db.prepare(`UPDATE ${table} SET title='Erased source',updated_at=? WHERE id=? AND title IS ?`).bind(new Date().toISOString(),p.recordId,p.createdValues.title));
   statements.push(db.prepare('DELETE FROM workflow_events WHERE id IN(SELECT event_id FROM workflow_event_snapshots WHERE record_type=? AND record_id=?)').bind(p.recordType,p.recordId));
   continue;
  }
  if(!personalCopy&&!mentionsIdentity)continue;
  const key=p.field.startsWith('custom:')?p.field.slice(7):null;
  if(key!==null){const path='$.'+JSON.stringify(key);statements.push(db.prepare(`UPDATE ${table} SET custom_fields_json=json_set(custom_fields_json,?,json(?)),updated_at=? WHERE id=? AND json_extract(custom_fields_json,?) IS json_extract(?,'$')`).bind(path,JSON.stringify(p.before??null),new Date().toISOString(),p.recordId,path,JSON.stringify(p.after??null)));}
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
export function workflowOperatorErasure(db:D1Database,id:string){return [db.prepare("DELETE FROM notifications WHERE event_key IN(SELECT 'workflow-owner:'||id FROM workflow_record_writes WHERE field='owner_id' AND (before_json=? OR after_json=?))").bind(JSON.stringify(id),JSON.stringify(id)),db.prepare("UPDATE workflow_versions SET status='paused',preview_id=NULL,preview_json=NULL WHERE activated_by=?").bind(id),db.prepare('DELETE FROM workflow_runs WHERE owner_id=?').bind(id),db.prepare('DELETE FROM workflow_record_writes WHERE actor_id=?').bind(id)];}
