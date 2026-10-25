import {payloadHash} from '../../platform/source-security';
import type {SignalEvent} from '../ingestion/contracts';

/** The same mail may arrive through a mailbox connection and the signed reply door. */
export async function replyEventKey(signalId:string,event:SignalEvent){
 if(event.type!=='email.replied')return null;
 const messageId=event.data?.messageId;
 return typeof messageId==='string'&&messageId.trim()?`reply:${await payloadHash(messageId.trim())}`:`reply:${signalId}`;
}

/** Applied triggers still emit signal and queue keys. Fold their outputs inside
 * the originating transaction, before another request can observe either row.
 * The existing unique(operator_id,event_key) constraint preserves a prior read. */
export function replyNotificationStatements(db:D1Database,signalId:string,eventKey:string,opportunityIds:string[],at:string,contactIds:string[]=[]){
 const replyKey=`reply:${signalId}`,queueKeys=opportunityIds.map(id=>`now:${id}:${at}`);
 // A reply may also cancel a scheduled send on another deal for this contact.
 const queueEvents="SELECT value FROM json_each(?) UNION SELECT 'now:'||opportunity_id||':'||? FROM outbound_messages WHERE contact_id IN(SELECT value FROM json_each(?)) AND state='cancelled' AND updated_at=?";
 const queueBindings=[JSON.stringify(queueKeys),at,JSON.stringify(contactIds),at];
 return [
  db.prepare("UPDATE OR IGNORE notifications SET event_key=? WHERE kind='customer.reply' AND event_key=?").bind(eventKey,replyKey),
  db.prepare(`UPDATE OR IGNORE notifications SET event_key=?,kind='customer.reply',message='Customer reply received',opportunity_id=? WHERE kind='opportunity.now' AND event_key IN(${queueEvents})`).bind(eventKey,opportunityIds[0]??null,...queueBindings),
  db.prepare(`DELETE FROM notifications WHERE event_key<>? AND (event_key=? OR (kind='opportunity.now' AND event_key IN(${queueEvents})))`).bind(eventKey,replyKey,...queueBindings)
 ];
}

/** Legacy archives keep their signal key; current mail writers keep the shared
 * key in the derived timeline evidence, without changing original signal bytes. */
export const replyNotificationMatchSql="(n.event_key='reply:'||l.signal_id OR n.event_key=json_extract(t.payload_json,'$.notificationEventKey'))";
