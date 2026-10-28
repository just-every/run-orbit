import {createId} from '../../shared/ids';
import {IngestionRepository} from '../ingestion/repository';
import type {SignalTarget} from '../ingestion/linking-repository';
import {providerReplyEvent} from './automatic-replies';
import type {ProviderReply} from './provider-replies';
import type {ReplyMessage} from './reply-matching';
import {replyEventKey} from '../notifications/reply-events';
/** Verified references choose one recipient and historical context; never expand to their other deals. */
export async function recordMailReplyStatements(db:D1Database,input:ProviderReply,messages:ReplyMessage[],hash:string,at:string){
 const first=messages[0]!,id=createId(),event=providerReplyEvent(input,null),basis='Verified native message references';
 const contact=await db.prepare('SELECT company_id,email FROM contacts WHERE id=?').bind(first.contact_id).first<{company_id:string|null;email:string}>();
 if(!contact||contact.email.trim().toLowerCase()!==input.sender.trim().toLowerCase())throw new Error('Reply recipient changed before linking.');
 const targets:SignalTarget[]=[{type:'contact',id:first.contact_id,basis},...(contact.company_id?[{type:'company' as const,id:contact.company_id,basis}]:[]),...(first.opportunity_id?[{type:'opportunity' as const,id:first.opportunity_id,basis}]:[])];
 const statements=[
  db.prepare("INSERT INTO signals(id,source_id,source_event_id,type,subject,occurred_at,received_at,payload_hash,confidence,linking_basis,created_at,payload_json) VALUES(?,'sendgrid-replies',?,?,?,?,?,?,?,?,?,?)").bind(id,input.id,event.type,input.subject,input.occurredAt,at,hash,input.automatic?'inferred':'observed',basis,at,JSON.stringify(event)),
  ...await new IngestionRepository(db).linkStatements(id,event,targets,'sendgrid-replies',at,'source','sendgrid-replies',{body:input.body,messageId:input.messageId,references:input.references,replyClassification:input.automatic?'automatic':'human'})
 ];
 // A closed origin remains a history link, even if someone later reopens it.
 const history=[...new Set(messages.map(m=>m.history_opportunity_id).filter((value):value is string=>!!value))];
 for(const deal of history)statements.push(db.prepare("INSERT OR IGNORE INTO timeline_entry_records VALUES(?,'opportunity',?)").bind(id,deal));
 if(!input.automatic){
  const senders=[...new Set(messages.map(m=>m.operator_id))],notificationEventKey=await replyEventKey(id,event);
  statements.push(db.prepare(`INSERT OR IGNORE INTO notifications(id,operator_id,opportunity_id,event_key,kind,message,created_at)
   SELECT lower(hex(randomblob(16))),o.id,?,?,'customer.reply','Customer reply received · '||COALESCE(c.name,c.email,'Contact'),? FROM operators o CROSS JOIN contacts c
   WHERE c.id=? AND o.status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators a WHERE a.operator_id=o.id) AND (o.id IN(SELECT value FROM json_each(?)) OR o.id=(SELECT owner_id FROM record_ownership WHERE record_type='contact' AND record_id=c.id))`).bind(first.opportunity_id,notificationEventKey,at,first.contact_id,JSON.stringify(senders)));
 }
 return statements;
}
