import {reconcileLegacyOwnership} from '../ownership/legacy';
import {createId} from '../../shared/ids';
import {WorkbenchError} from '../workbench/repository';
import {recordMailDatabase} from './record-mail-storage';
export type MailRecordKind='contact'|'company'|'opportunity';
const tables={contact:'contacts',company:'companies',opportunity:'opportunities'};
export class RecordMailRepository {
 constructor(readonly db:D1Database){}
 async context(kind:MailRecordKind,id:string){
  const record=await this.db.prepare(`SELECT * FROM ${tables[kind]} WHERE id=?`).bind(id).first<Record<string,unknown>>();
  if(!record)throw new WorkbenchError(404,'Record not found.');
  const contacts=(await this.db.prepare(`SELECT c.id,c.name,c.email,c.contactability,c.company_id AS companyId FROM contacts c WHERE ${kind==='contact'?'c.id=?':kind==='company'?'c.company_id=? OR EXISTS(SELECT 1 FROM contact_company_relationships r WHERE r.contact_id=c.id AND r.company_id=?)':'EXISTS(SELECT 1 FROM opportunity_contacts oc WHERE oc.contact_id=c.id AND oc.opportunity_id=?)'} ORDER BY c.name,c.id`).bind(...(kind==='company'?[id,id]:[id])).all<{id:string;name:string|null;email:string|null;contactability:string;companyId:string|null}>()).results;
  const deals=(await this.db.prepare("SELECT o.id,o.title,oc.contact_id AS contactId FROM opportunities o JOIN opportunity_contacts oc ON oc.opportunity_id=o.id WHERE o.lifecycle='open' AND oc.contact_id IN(SELECT value FROM json_each(?)) ORDER BY o.updated_at DESC,o.id").bind(JSON.stringify(contacts.map(c=>c.id))).all<{id:string;title:string;contactId:string}>()).results;
  return {record,contacts,deals};
 }
 async create(kind:MailRecordKind,originId:string,input:{contactId:string;opportunityId?:string|null;subject:string;body:string},actor:string,generation?:{callId:string;evidenceIds:string[];explanation:string}){
  await reconcileLegacyOwnership(this.db);
  const context=await this.context(kind,originId),contact=context.contacts.find(c=>c.id===input.contactId);
  if(!contact?.email)throw new WorkbenchError(400,'Choose a contact on this record with an email address.');
  if(contact.contactability!=='contactable')throw new WorkbenchError(409,'This contact must not be contacted.');
  const deals=context.deals.filter(d=>d.contactId===contact.id);
  const forced=kind==='opportunity'&&context.record.lifecycle==='open'?originId:undefined;
  if(!forced&&input.opportunityId===undefined&&deals.length>1)throw new WorkbenchError(409,'This contact has several open deals. Choose one or explicitly leave this email unlinked.');
  const linked=forced??(input.opportunityId===undefined?(deals[0]?.id??null):input.opportunityId);
  if(linked&&!deals.some(d=>d.id===linked))throw new WorkbenchError(409,'Choose a current open deal belonging to this recipient.');
  const id=createId(),at=new Date().toISOString(),mailDb=recordMailDatabase(this.db),history=kind==='opportunity'&&context.record.lifecycle!=='open'?originId:null;
  await mailDb.batch([
   mailDb.prepare("INSERT INTO runtime_controls(name,value) SELECT 'record_mail_permission',NULL WHERE NOT EXISTS(SELECT 1 FROM contacts WHERE id=? AND contactability='contactable' AND lower(trim(email))=?) OR NOT EXISTS(SELECT 1 FROM operators WHERE id=? AND status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=?))").bind(contact.id,contact.email.trim().toLowerCase(),actor,actor),
   ...(linked?[mailDb.prepare("INSERT INTO runtime_controls(name,value) SELECT 'record_mail_deal',NULL WHERE NOT EXISTS(SELECT 1 FROM opportunities o JOIN opportunity_contacts oc ON oc.opportunity_id=o.id WHERE o.id=? AND o.lifecycle='open' AND oc.contact_id=?)").bind(linked,contact.id)]:[]),
   ...(kind==='company'?[mailDb.prepare("INSERT INTO runtime_controls(name,value) SELECT 'record_mail_relationship',NULL WHERE NOT EXISTS(SELECT 1 FROM contacts WHERE id=? AND (company_id=? OR EXISTS(SELECT 1 FROM contact_company_relationships WHERE contact_id=? AND company_id=?)))").bind(contact.id,originId,contact.id,originId)]:[]),
   mailDb.prepare('INSERT INTO drafts(id,opportunity_id,recommendation_id,author_id,recipient_contact_id,recipient_email,subject,body,revision,is_stale,created_at,updated_at) VALUES(?,?,(SELECT id FROM recommendations WHERE opportunity_id=? AND is_current=1),?,?,?,?,?,1,0,?,?)').bind(id,linked,linked,actor,contact.id,contact.email.trim().toLowerCase(),input.subject,input.body,at,at),
   mailDb.prepare('INSERT INTO record_mail_context VALUES(?,?,?,?)').bind(id,kind,originId,history),
   ...recordMailTimeline(mailDb,id,actor,'draft.created',{draftId:id,manual:!generation,...generation,dealLink:linked??'Unlinked'},at)
  ]);
  return {id};
 }
 async history(contactId:string){
  const messages=(await this.db.prepare(`SELECT id,draft_id AS draftId,revision,state,recipient_email AS recipientEmail,subject,body,failure,scheduled_at AS scheduledAt,next_attempt_at AS retryAfter,created_at AS createdAt FROM record_mail_outbound_messages WHERE contact_id=? ORDER BY created_at DESC`).bind(contactId).all()).results;
  const drafts=(await this.db.prepare('SELECT id,subject,is_stale AS isStale FROM record_mail_drafts WHERE recipient_contact_id=? ORDER BY updated_at DESC').bind(contactId).all()).results;
  const obligations=(await this.db.prepare('SELECT message_id AS messageId,operator_id AS operatorId,owner_id AS ownerId,due_at AS dueAt,closed_at AS closedAt,closed_reason AS closedReason FROM record_mail_obligations WHERE contact_id=? ORDER BY opened_at DESC').bind(contactId).all()).results;
  return {messages,drafts,obligations};
 }
 async complete(messageId:string,actor:string){
  const at=new Date().toISOString();
  const result=await this.db.batch([
   this.db.prepare("UPDATE record_mail_obligations SET closed_at=?,closed_reason='Completed by promise owner' WHERE message_id=? AND owner_id=? AND closed_at IS NULL").bind(at,messageId,actor),
   this.db.prepare("INSERT OR IGNORE INTO audit_entries(id,actor_id,action,entity_type,entity_id,details_json,occurred_at) SELECT ?,?,'mail.follow_up.completed','outbound_message',?,'{}',? WHERE EXISTS(SELECT 1 FROM record_mail_obligations WHERE message_id=? AND owner_id=? AND closed_at=? AND closed_reason='Completed by promise owner')").bind('mail-complete:'+messageId,actor,messageId,at,messageId,actor,at)
  ]);
  if(!result[0]!.meta.changes)throw new WorkbenchError(409,'Only the current promise owner can complete an open awaiting-response obligation.');
  return {completed:true};
 }
}
/** One activity, linked to the actual recipient, their primary company and optional closed origin. */
export function recordMailTimeline(db:D1Database,draftId:string,actor:string,kind:string,payload:unknown,at:string,settlement?:string){
 const entry=createId(),guard=settlement?' AND EXISTS(SELECT 1 FROM outbound_messages WHERE settlement_id=?)':'',bindings=settlement?[settlement]:[];
 return [
  db.prepare(`INSERT INTO timeline_entries(id,kind,occurred_at,recorded_at,actor_type,actor_id,source,payload_json) SELECT ?,?,?,?,'operator',?,'outreach',? FROM drafts WHERE id=?${guard}`).bind(entry,kind,at,at,actor,JSON.stringify(payload),draftId,...bindings),
  db.prepare("INSERT INTO timeline_entry_records SELECT ?,'contact',recipient_contact_id FROM drafts WHERE id=? AND recipient_contact_id IS NOT NULL AND EXISTS(SELECT 1 FROM timeline_entries WHERE id=?)").bind(entry,draftId,entry),
  db.prepare("INSERT INTO timeline_entry_records SELECT ?,'company',c.company_id FROM drafts d JOIN contacts c ON c.id=d.recipient_contact_id WHERE d.id=? AND c.company_id IS NOT NULL AND EXISTS(SELECT 1 FROM timeline_entries WHERE id=?)").bind(entry,draftId,entry),
  db.prepare("INSERT OR IGNORE INTO timeline_entry_records SELECT ?,'opportunity',opportunity_id FROM drafts WHERE id=? AND opportunity_id IS NOT NULL AND EXISTS(SELECT 1 FROM timeline_entries WHERE id=?)").bind(entry,draftId,entry),
  db.prepare("INSERT OR IGNORE INTO timeline_entry_records SELECT ?,'opportunity',history_opportunity_id FROM record_mail_context WHERE draft_id=? AND history_opportunity_id IS NOT NULL AND EXISTS(SELECT 1 FROM timeline_entries WHERE id=?)").bind(entry,draftId,entry),
  db.prepare("INSERT INTO audit_entries(id,actor_id,action,entity_type,entity_id,details_json,occurred_at) SELECT ?,?,?,'draft',?,?,? WHERE EXISTS(SELECT 1 FROM timeline_entries WHERE id=?)").bind(createId(),actor,kind,draftId,JSON.stringify(payload),at,entry)
 ];
}
