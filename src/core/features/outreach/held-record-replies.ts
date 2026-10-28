import {createId} from '../../shared/ids';
import {IngestionRepository} from '../ingestion/repository';
import type {SignalEvent} from '../ingestion/contracts';
import {WorkbenchError} from '../workbench/repository';
/** Extends the existing held-reply store; terminal decisions remove its review item atomically. */
export async function heldRecordReplies(db:D1Database,contactId?:string){
 const contact=contactId?await db.prepare('SELECT email FROM contacts WHERE id=?').bind(contactId).first<{email:string}>():null;
 if(contactId&&!contact)throw new WorkbenchError(404,'Contact not found.');
 return (await db.prepare(`SELECT id,sender,subject,body,occurred_at,0 AS automatic FROM unlinked_replies WHERE opportunity_id IS NULL AND (? IS NULL OR lower(trim(sender))=lower(trim(?)))
 UNION ALL SELECT s.id,json_extract(s.payload_json,'$.email'),s.subject,json_extract(s.payload_json,'$.data.body'),s.occurred_at,1 FROM signals s JOIN unlinked_signals u ON u.signal_id=s.id WHERE u.resolved_at IS NULL AND s.type='sendgrid-replies:email.auto_replied' AND (? IS NULL OR lower(trim(json_extract(s.payload_json,'$.email')))=lower(trim(?))) ORDER BY occurred_at DESC LIMIT 100`).bind(contactId??null,contact?.email??null,contactId??null,contact?.email??null).all()).results;
}
export async function resolveHeldRecordReply(db:D1Database,id:string,contactId:string,decision:'attach'|'dismiss',actor:string){
 const contact=await db.prepare('SELECT id,email,company_id FROM contacts WHERE id=?').bind(contactId).first<{id:string;email:string;company_id:string|null}>();
 if(!contact)throw new WorkbenchError(404,'Contact not found.');
 const held=await db.prepare('SELECT * FROM unlinked_replies WHERE id=? AND opportunity_id IS NULL').bind(id).first<any>();
 const automatic=held?null:await db.prepare("SELECT s.* FROM signals s JOIN unlinked_signals u ON u.signal_id=s.id WHERE s.id=? AND u.resolved_at IS NULL AND s.type='sendgrid-replies:email.auto_replied'").bind(id).first<any>();
 if(!held&&!automatic)throw new WorkbenchError(409,'This reply has already been resolved or is unavailable. No changes were made.');
 const original=automatic?JSON.parse(automatic.payload_json):null,sender=held?.sender??original.email;
 if(sender.trim().toLowerCase()!==contact.email?.trim().toLowerCase())throw new WorkbenchError(409,'Choose the contact whose email matches this reply sender.');
 const at=new Date().toISOString(),claim=`held_reply:${id}`,signalId=automatic?id:createId();
 const event:SignalEvent=automatic?{...original,eventId:automatic.source_event_id,type:automatic.type}:{eventId:held.provider_event_id,type:'email.replied',subject:held.subject,occurredAt:held.occurred_at,email:held.sender,data:{body:held.body,messageId:held.message_id,references:held.reference_ids,replyClassification:'human'}};
 const guard=automatic?'EXISTS(SELECT 1 FROM unlinked_signals WHERE signal_id=? AND resolved_at IS NULL)':'EXISTS(SELECT 1 FROM unlinked_replies WHERE id=? AND opportunity_id IS NULL)';
 const statements=[db.prepare(`INSERT INTO runtime_controls(name,value) SELECT ?,CASE WHEN ${guard} AND EXISTS(SELECT 1 FROM operators WHERE id=? AND status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=?)) THEN 'claimed' ELSE NULL END`).bind(claim,id,actor,actor)];
 if(decision==='attach'){
  if(held)statements.push(db.prepare("INSERT INTO signals(id,source_id,source_event_id,type,subject,occurred_at,received_at,payload_hash,confidence,linking_basis,created_at,payload_json) VALUES(?,'sendgrid-replies',?,?,?,?,?,'reviewed','observed','Operator reviewed contact reply',?,?)").bind(signalId,event.eventId,event.type,event.subject,event.occurredAt,at,at,JSON.stringify(event)));
  const basis='Operator reviewed contact reply';
  statements.push(...await new IngestionRepository(db).linkStatements(signalId,event,[{type:'contact',id:contact.id,basis},...(contact.company_id?[{type:'company' as const,id:contact.company_id,basis}]:[])],actor,at,'operator','operator.review',{body:event.data?.body,messageId:event.data?.messageId,replyClassification:automatic?'automatic':'human',heldReplyId:id}));
 }else{
  const entry=createId();statements.push(db.prepare("INSERT INTO timeline_entries VALUES(?,'mail.reply.dismissed',?,?,'operator',?,'operator.review',?)").bind(entry,event.occurredAt,at,actor,JSON.stringify({replyId:id,subject:event.subject})),db.prepare("INSERT INTO timeline_entry_records VALUES(?,'contact',?)").bind(entry,contact.id));
 }
 statements.push(db.prepare("INSERT INTO audit_entries VALUES(?,?,'mail.reply.resolved','contact',?,?,?)").bind(createId(),actor,contact.id,JSON.stringify({replyId:id,decision,automatic:!!automatic}),at),automatic?db.prepare('UPDATE unlinked_signals SET resolved_at=? WHERE signal_id=? AND resolved_at IS NULL').bind(at,id):db.prepare('DELETE FROM unlinked_replies WHERE id=? AND opportunity_id IS NULL').bind(id),db.prepare('DELETE FROM runtime_controls WHERE name=?').bind(claim));
 try{await db.batch(statements);}catch(error){if(/runtime_controls|UNIQUE/.test(String(error)))throw new WorkbenchError(409,'This reply has already been resolved or access changed. No changes were made.');throw error;}
 return {resolved:true,decision};
}
