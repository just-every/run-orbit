import {ownershipOperatorErasure} from '../ownership/privacy';
import {forecastErasureStatements} from '../forecast/privacy';
import { executeArchiveErasure } from '../records';
import {audit,RecordError} from '../records/shared';
import {identityMatch,identityPatterns} from '../records/erasure-identity';
import {containsWord,redactJsonText,redactionSql} from './erasure-redaction';
import {messageReviewOperatorErasure} from '../drafts/privacy';

/** Retain stable attribution IDs while removing a retired operator's personal details. */
export async function eraseOperator(db:D1Database,id:string,actor:string){
 const operator=await db.prepare('SELECT email,display_name,status FROM operators WHERE id=?').bind(id).first<{email:string;display_name:string;status:string}>();
 if(!operator)throw new RecordError(404,'Operator not found.');
 if(operator.status!=='removed')throw new RecordError(409,'Remove the operator before erasing their personal details.');
 // A display name is free text, not an identity. Redact it only as a whole word of three or more
 // characters, only in this operator's own attributed content (inside JSON, only string values),
 // and refuse when another person's name contains it: Orbit cannot tell whose name such text means.
 const name=operator.display_name.trim(),redactName=name.length>=3;
 if(redactName){
  const others=(await db.prepare("SELECT display_name AS name FROM operators WHERE id<>? AND instr(lower(display_name),lower(?))>0 UNION ALL SELECT name FROM contacts WHERE instr(lower(name),lower(?))>0").bind(id,name,name).all<{name:string|null}>()).results;
  if(others.some(other=>other.name&&containsWord(other.name,name)))throw new RecordError(409,'Another operator or contact has a name containing this display name, so Orbit cannot tell whose name attributed text means. Nothing was erased.');
 }
 const now=new Date().toISOString(),statements=[db.prepare(`DELETE FROM api_credentials WHERE principal_id=? OR ${identityMatch('name')}`).bind(id,...identityPatterns(operator.email)),db.prepare('DELETE FROM sessions WHERE operator_id=?').bind(id),db.prepare('DELETE FROM identity_proofs WHERE operator_id=?').bind(id),db.prepare('DELETE FROM identity_bindings WHERE operator_id=?').bind(id),db.prepare('DELETE FROM notifications WHERE operator_id=?').bind(id)];
 statements.push(...ownershipOperatorErasure(db,id));
 statements.push(...forecastErasureStatements(db,'operator',id,[operator.email]));
 statements.push(...await messageReviewOperatorErasure(db,id,name,operator.email));
 // JSON replacement uses escaped text so quotes in a display name cannot invalidate stored JSON.
 const contentColumns:Record<string,string[]>={audit_entries:['details_json'],timeline_entries:['payload_json'],ai_previews:['content_json'],ai_calls:['error'],notifications:['message'],drafts:['subject','body'],outbound_messages:['subject','body','failure'],record_mail_drafts:['subject','body'],record_mail_outbound_messages:['subject','body','failure'],message_library:['name','subject','body'],source_event_errors:['reason'],signal_sources:['last_error']};
 const attribution:Record<string,string>={audit_entries:"(actor_id=? OR (entity_type='operator' AND entity_id=?))",timeline_entries:'actor_id=?',ai_previews:'operator_id=?',ai_calls:'operator_id=?',notifications:'operator_id=?',drafts:'author_id=?',outbound_messages:'operator_id=?',record_mail_drafts:'author_id=?',record_mail_outbound_messages:'operator_id=?',message_library:'owner_id=?'};
 // Structured content is rewritten value by value, never as text, so a name can never alter a key or the JSON itself.
 // Each row is fenced on the value read here and runs before the mailbox redaction below.
 if(redactName)for(const [table,columns]of Object.entries(contentColumns))for(const column of columns.filter(column=>column.endsWith('_json'))){
  const scope=attribution[table];if(!scope)continue;
  const rows=(await db.prepare(`SELECT rowid AS row,${column} AS value FROM ${table} WHERE ${scope} AND instr(lower(${column}),lower(?))>0`).bind(...Array(scope.match(/\?/g)?.length??0).fill(id),JSON.stringify(name).slice(1,-1)).all<{row:number;value:string}>()).results;
  for(const row of rows){const next=redactJsonText(row.value,name,operator.email,'Erased operator');if(next===row.value)continue;
   statements.push(db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'operator_erasure_fence',NULL WHERE NOT EXISTS(SELECT 1 FROM ${table} WHERE rowid=? AND ${column}=?)`).bind(row.row,row.value),db.prepare(`UPDATE ${table} SET ${column}=? WHERE rowid=?`).bind(next,row.row));}
 }
 for(const [table,columns]of Object.entries(contentColumns))for(const column of columns){
  const email=column.endsWith('_json')?JSON.stringify(operator.email).slice(1,-1):operator.email;
  if(email)statements.push(db.prepare(`UPDATE ${table} SET ${column}=${redactionSql(column,'email')} WHERE ${identityMatch(column)}`).bind(email,'Erased operator',...identityPatterns(email)));
  const scope=attribution[table];
  // Display names cannot identify somebody in another operator's content.
  if(scope&&redactName&&!column.endsWith('_json'))statements.push(db.prepare(`UPDATE ${table} SET ${column}=${redactionSql(column,'word')} WHERE ${scope} AND instr(lower(${column}),lower(?))>0`).bind(name,'Erased operator',...Array(scope.match(/\?/g)?.length??0).fill(id),name));
 }
 statements.push(db.prepare("UPDATE owner_bootstrap SET email=?,display_name='Erased operator' WHERE owner_id=?").bind(`erased-${id.toLowerCase()}@example.invalid`,id),db.prepare("UPDATE operators SET email=?,display_name='Erased operator',updated_at=? WHERE id=? AND status='removed'").bind(`erased-${id.toLowerCase()}@example.invalid`,now,id),audit(db,actor,'operator.erased','operator',id));
 await executeArchiveErasure(db,statements);return {erased:true};
}
