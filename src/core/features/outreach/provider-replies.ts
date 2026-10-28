import {recordMailReplyStatements} from './record-mail-replies';
import {createId} from '../../shared/ids';
import {payloadHash} from '../../platform/source-security';
import {IngestionRepository} from '../ingestion/repository';
import {matchingReplyMessages} from './reply-matching';
import {providerConflictStatements,recordProviderConflict} from './provider-conflicts';
import {mailHistoryLinks} from './history-links';
import {providerReplyEvent,unlinkedAutomaticReply} from './automatic-replies';
import {replyEventKey,replyNotificationStatements} from '../notifications/reply-events';
export interface ProviderReply {id:string;sender:string;subject:string;body:string;messageId:string;references:string;occurredAt:string;automatic?:boolean}
export async function recordProviderReply(db:D1Database,input:ProviderReply,hash:string){
 // Do not retain an erased sender's raw Message-ID in the durable receipt ledger.
 const receiptId=`reply:${await payloadHash(input.id)}`,prior=()=>db.prepare('SELECT payload_hash FROM mail_provider_events WHERE id=?').bind(receiptId).first<{payload_hash:string}>();
 const previous=await prior();if(previous){if(previous.payload_hash!==hash)await recordProviderConflict(db,receiptId,previous.payload_hash,hash,'sendgrid-replies');return;}
 const legacy=await db.prepare('SELECT * FROM unlinked_replies WHERE provider_event_id=?').bind(input.id).first<{sender:string;subject:string;body:string;message_id:string;reference_ids:string;occurred_at:string}>();
 if(legacy){
  const original={id:input.id,sender:legacy.sender,subject:legacy.subject,body:legacy.body,messageId:legacy.message_id,references:legacy.reference_ids,occurredAt:legacy.occurred_at};
  const changed=Object.keys(original).some(key=>original[key as keyof typeof original]!==input[key as keyof typeof original]);
  // Legacy rows only attest their stored fields. An equal replay may establish
  // the richer receipt; a changed replay must retain the original evidence hash.
  const acceptedHash=changed?await payloadHash(JSON.stringify(original)):hash;
  try{await db.batch([
   db.prepare('INSERT INTO mail_provider_events VALUES(?,?,?)').bind(receiptId,acceptedHash,new Date().toISOString()),
   ...(changed?providerConflictStatements(db,receiptId,acceptedHash,hash,'sendgrid-replies'):[])
  ]);}catch(error){
   const winner=await prior();if(!winner)throw error;
   if(winner.payload_hash!==hash)await recordProviderConflict(db,receiptId,winner.payload_hash,hash,'sendgrid-replies');
  }
  return;
 }
 const messages=await matchingReplyMessages(db,input.sender,input.references),opportunities=new Set(messages.map(message=>message.opportunity_id)),opportunityId=opportunities.size===1?messages[0]!.opportunity_id:null;
 const source='sendgrid-replies',at=new Date().toISOString(),statements=[db.prepare('INSERT INTO mail_provider_events VALUES(?,?,?)').bind(receiptId,hash,at),db.prepare("INSERT OR IGNORE INTO signal_sources(id,name,type,enabled,created_at,updated_at) VALUES(?,'SendGrid authenticated replies','mail_provider',1,?,?)").bind(source,at,at)];
 const event=providerReplyEvent(input,opportunityId);
 if(messages.length&&messages.every(message=>message.record_mail===1)){statements.push(...await recordMailReplyStatements(db,input,messages,hash,at));}
 else if(opportunityId){
  const plan=await new IngestionRepository(db).prepare(source,event,hash,JSON.stringify(event));statements.push(...plan.statements);
  const contacts=[...new Set(messages.map(message=>message.contact_id))];
  statements.push(...mailHistoryLinks(db,plan.id,opportunityId,contacts));
  for(const contact of contacts){
   statements.push(db.prepare("INSERT INTO signal_links VALUES(?,'contact',?,'Verified native reply sender',?)").bind(plan.id,contact,at));
   if(!input.automatic)statements.push(db.prepare("UPDATE drafts SET is_stale=1,stale_reason='Customer reply',updated_at=? WHERE recipient_contact_id=?").bind(at,contact),db.prepare("UPDATE outbound_messages SET state='cancelled',failure='Customer reply',updated_at=? WHERE contact_id=? AND state='scheduled'").bind(at,contact));
  }
  const notificationEventKey=await replyEventKey(plan.id,event);
  if(notificationEventKey)statements.push(...replyNotificationStatements(db,plan.id,notificationEventKey,[opportunityId],at,contacts));
 }else if(input.automatic)statements.push(...unlinkedAutomaticReply(db,source,event,hash,at));
 // The old reply-review door always records human evidence. Automatic mail
 // uses typed signals instead, so later manual linking cannot stop follow-up.
 if(!input.automatic&&(!messages.length||messages.every(message=>message.record_mail===0)&&opportunityId))statements.push(db.prepare('INSERT INTO unlinked_replies(id,provider_event_id,sender,subject,body,message_id,reference_ids,occurred_at,opportunity_id) VALUES(?,?,?,?,?,?,?,?,?)').bind(createId(),input.id,input.sender,input.subject,input.body,input.messageId,input.references,input.occurredAt,opportunityId));
 try{await db.batch(statements);}catch(error){const winner=await prior();if(!winner)throw error;if(winner.payload_hash!==hash)await recordProviderConflict(db,receiptId,winner.payload_hash,hash,'sendgrid-replies');}
}
