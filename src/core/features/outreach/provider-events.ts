import {createId} from '../../shared/ids';
import {contactStopStatements} from '../records/suppression-effects';
import {settlementStatements} from './settlement';
import {recordProviderConflict} from './provider-conflicts';
import {mailHistoryLinks} from './history-links';
export interface ProviderEvent {sg_event_id:string;event:string;timestamp:number;email:string;sg_message_id?:string;rer_delivery_id?:string;rer_product?:string;reason?:string;type?:string}
export async function recordProviderEvent(db:D1Database,event:ProviderEvent,hash:string){
 const prior=()=>db.prepare('SELECT payload_hash FROM mail_provider_events WHERE id=?').bind(event.sg_event_id).first<{payload_hash:string}>();
 const previous=await prior();
 if(previous){if(previous.payload_hash!==hash)await recordProviderConflict(db,event.sg_event_id,previous.payload_hash,hash);return;}
 if(event.rer_product&&event.rer_product!=='orbit')return;
 if(!event.rer_product&&!/^[0-9A-HJKMNP-TV-Z]{26}$/.test(event.rer_delivery_id??''))return;
 type Message={id:string;operator_id:string;opportunity_id:string;contact_id:string;state:string;provider_message_id:string|null;recipient_email:string};
 const message=event.rer_delivery_id?await db.prepare('SELECT * FROM outbound_messages WHERE idempotency_key=?').bind(event.rer_delivery_id).first<Message>():event.sg_message_id?await db.prepare('SELECT * FROM outbound_messages WHERE provider_message_id=?').bind(event.sg_message_id).first<Message>():null;
 if(!message)return;
 const at=new Date().toISOString(),statements=[
  db.prepare("INSERT OR IGNORE INTO signal_sources(id,name,type,enabled,created_at,updated_at) VALUES('sendgrid-events','SendGrid delivery events','mail_provider',1,?,?)").bind(at,at),
  db.prepare('INSERT INTO mail_provider_events(id,payload_hash,created_at) VALUES(?,?,?)').bind(event.sg_event_id,hash,at)
 ];
 if(['processed','delivered','bounce','dropped'].includes(event.event)&&['queued','reconciling','delivery-unknown'].includes(message.state))statements.push(...await settlementStatements(db,message.id,message.operator_id,'accepted',event.sg_message_id??message.provider_message_id,null));
 const next=event.event==='delivered'?'delivered':event.event==='bounce'?'bounced':event.event==='dropped'?'failed':null;
 if(next)statements.push(db.prepare("UPDATE outbound_messages SET state=?,failure=?,updated_at=? WHERE id=? AND state IN('accepted','delivered')").bind(next,event.reason??null,at,message.id));
 if(['bounce','dropped'].includes(event.event))statements.push(db.prepare("UPDATE opportunities SET queue_state='now',queue_reason='Delivery problem',next_due_at=NULL WHERE id=? AND lifecycle='open'").bind(message.opportunity_id));
 if(['unsubscribe','group_unsubscribe','spamreport'].includes(event.event)||(event.event==='bounce'&&event.type==='bounce'))statements.push(...await contactStopStatements(db,message.contact_id,[event.email,message.recipient_email]));
 const reportedEngagement=['open','click'].includes(event.event),timelineId=createId();
 statements.push(db.prepare("INSERT INTO timeline_entries(id,kind,occurred_at,recorded_at,actor_type,actor_id,source,payload_json) VALUES(?,?,?,?,'source','sendgrid-events','sendgrid',?)").bind(timelineId,`provider.${event.event}`,new Date(event.timestamp*1000).toISOString(),at,JSON.stringify({messageId:message.id,providerEventId:event.sg_event_id,reason:event.reason??null,...(reportedEngagement?{confidence:'inferred',classification:'unverified provider report',tracking:'not tracked',humanResponse:false}:{} )})),db.prepare("INSERT INTO timeline_entry_records(timeline_entry_id,record_type,record_id) VALUES(?,'opportunity',?)").bind(timelineId,message.opportunity_id),...mailHistoryLinks(db,timelineId,message.opportunity_id,[message.contact_id]));
 try{await db.batch(statements);}catch(error){
  const winner=await prior();if(!winner)throw error;
  if(winner.payload_hash!==hash)await recordProviderConflict(db,event.sg_event_id,winner.payload_hash,hash);
 }
}
