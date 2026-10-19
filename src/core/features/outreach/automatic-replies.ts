import {createId} from '../../shared/ids';
import type {ProviderReply} from './provider-replies';
import type {SignalEvent} from '../ingestion/contracts';

/** Unthreaded automatic mail must stay nonhuman even after an operator links it. */
export function unlinkedAutomaticReply(db:D1Database,source:string,event:SignalEvent,hash:string,at:string){
 const id=createId();
 return [
  db.prepare("INSERT INTO signals(id,source_id,source_event_id,type,subject,occurred_at,received_at,payload_hash,confidence,linking_basis,created_at,payload_json) VALUES(?,?,?,?,?,?,?,?,'inferred','Unlinked',?,?)")
   .bind(id,source,event.eventId,event.type,event.subject,event.occurredAt,at,hash,at,JSON.stringify(event)),
  db.prepare('UPDATE signal_sources SET last_accepted_at=?,updated_at=? WHERE id=?').bind(at,at,source),
  db.prepare("INSERT INTO unlinked_signals(signal_id,reason) VALUES(?,'Automatic reply without one verified Orbit recipient thread; never a human response')").bind(id),
 ];
}

export function providerReplyEvent(input:ProviderReply,opportunityId:string|null):SignalEvent{
 return {eventId:input.id,type:input.automatic?'sendgrid-replies:email.auto_replied':'email.replied',subject:input.subject,occurredAt:input.occurredAt,email:input.sender,
  ...(opportunityId?{record:{type:'opportunity' as const,id:opportunityId}}:{}),
  data:{body:input.body,messageId:input.messageId,references:input.references,replyClassification:input.automatic?'automatic':'human'}};
}
