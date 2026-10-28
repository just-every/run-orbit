import {eraseImportOwnerNotices} from './owner-notices';
import { eraseD1ImportTarget,type D1Sql,type D1ImportContext } from '../../../modules/import-kit/d1/index';
import {targets,sql} from './targets';
import {containsMailbox,withdrawImportReviews} from './review-erasure';
import {redactImportedNativeCopies} from './native-erasure';
/** Keep native erasure and the Kit's source withdrawal in the same final D1 transaction. */
export function captureImportErasure(database:D1Database){
 const queries=new WeakMap<object,D1Sql>();
 function statement(native:D1PreparedStatement,query:D1Sql):D1PreparedStatement{
  const proxy=new Proxy(native,{get(target,key){if(key==='bind')return(...params:any[])=>statement(target.bind(...params),{sql:query.sql,params});const value=(target as any)[key];return typeof value==='function'?value.bind(target):value;}});queries.set(proxy,query);return proxy;
 }
 const db=new Proxy(database,{get(target,key){if(key==='prepare')return(text:string)=>statement(target.prepare(text),{sql:text,params:[]});const value=(target as any)[key];return typeof value==='function'?value.bind(target):value;}});
 return{db,queries};
}
export function erasureContext(db:D1Database,actor:string,sessionId?:string):D1ImportContext{return{destination:'workspace',namespace:'orbit-privacy-erasure',mappingVersion:'orbit-csv-v1',originalErasurePolicy:'withdraw-all-job-artifacts',storage:{database:db,targets},authorization:{principalId:actor,predicate:()=>sql("EXISTS(SELECT 1 FROM operators o JOIN access_memberships m ON m.operator_id=o.id WHERE o.id=? AND o.status='active' AND m.workspace_id='workspace' AND m.status='active' AND m.role='legacy_operator' AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=o.id)) AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) AND (? IS NULL OR EXISTS(SELECT 1 FROM sessions WHERE id=? AND operator_id=? AND revoked_at IS NULL AND expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')))",actor,sessionId??null,sessionId??null,actor)}};}
export async function withdrawRelatedImportCopies(db:D1Database,actor:string,id:string,emails:string[],sessionId?:string){
 const context=erasureContext(db,actor,sessionId);
 await db.batch([eraseImportOwnerNotices(db,'contact',id)]);
 await eraseD1ImportTarget('contact-owner',id,targets.remove('workspace','contact-owner',id),context);
 const references=(await db.prepare("SELECT id FROM crm_import_references WHERE (record_kind='contact' AND record_id=?) OR lower(mailbox) IN(SELECT value FROM json_each(?))").bind(id,JSON.stringify(emails.map(e=>e.toLowerCase()))).all<{id:string}>()).results;
 for(const reference of references)await eraseD1ImportTarget('reference',reference.id,targets.remove('workspace','reference',reference.id),context);
 const copies=(await db.prepare("SELECT kind,id,original_json FROM crm_import_targets WHERE kind='note'").all<{kind:string;id:string;original_json:string}>()).results;
 const linked=(await db.prepare("SELECT timeline_entry_id FROM timeline_entry_records WHERE record_type='contact' AND record_id=?").bind(id).all<{timeline_entry_id:string}>()).results.map(r=>r.timeline_entry_id);
 for(const copy of copies)if(linked.includes(copy.id)||containsMailbox(copy.original_json,emails))await eraseD1ImportTarget('note',copy.id,[...targets.remove('workspace','note',copy.id)],context);
 const stops=(await db.prepare('SELECT id,value_json FROM crm_import_stops').all<{id:string;value_json:string}>()).results;
 for(const stop of stops)if(emails.some(email=>JSON.parse(stop.value_json).emails.includes(email.toLowerCase())))await eraseD1ImportTarget('suppression',stop.id,[sql('DELETE FROM crm_import_stops WHERE id=?',stop.id)],context);
}
/** Other imported rows, rejected rows and original files can also hold the person's mailbox. */
const relatedCopies=(emails:string[])=>({source:(record:{payload:unknown})=>containsMailbox(JSON.stringify(record.payload),emails),original:(bytes:Uint8Array)=>containsMailbox(Buffer.from(bytes).toString('utf8'),emails)});
export async function eraseImportedContact(db:D1Database,actor:string,id:string,statements:D1Sql[],sessionId?:string,emails:string[]=[]){
 return eraseD1ImportTarget('contact',id,[...await redactImportedNativeCopies(db,id,emails),...statements,sql('DELETE FROM crm_import_targets WHERE kind=? AND id=?','contact',id),
 ...await withdrawImportReviews(db,id,emails)],erasureContext(db,actor,sessionId),emails.length?relatedCopies(emails):undefined);
}
