import {IngestionError,type SignalEvent} from './contracts';
import {contactEmailKey} from '../records/identity';

export interface CalendlyReceipt {
 kind:'invitee.created'|'invitee.canceled';occurredAt:string;inviteeUri:string;eventUri:string;
 previousInvitee:string|null;nextInvitee:string|null;rescheduled:boolean;email:string;name:string;
 eventName:string;start:string|null;end:string|null;location:Record<string,unknown>|null;
 cancellation:{canceled_by?:string|null;reason?:string|null;canceler_type?:string|null}|null;
}
export interface BookingCurrent extends CalendlyReceipt {status:'booked'|'cancelled';history:CalendlyReceipt[]}
interface Row {signal_id:string;activity_id:string;event_json:string;current_json:string|null}
const receipt=(event:SignalEvent)=>event.data?.provider==='calendly'?event.data.calendly as CalendlyReceipt|undefined:undefined;
const order=(a:CalendlyReceipt,b:CalendlyReceipt)=>a.occurredAt.localeCompare(b.occurredAt)||a.inviteeUri.localeCompare(b.inviteeUri)||a.kind.localeCompare(b.kind);

/** Join the signed invitee chain, including either order of a reschedule's two callbacks.
 * Original signal bytes never change; one root holds the visible, current meeting. */
export async function prepareBooking(db:D1Database,source:string,event:SignalEvent,id:string){
 const incoming=receipt(event);if(!incoming)return null;
 const keys=JSON.stringify([incoming.inviteeUri,incoming.previousInvitee,incoming.nextInvitee].filter(Boolean));
 const matched=(await db.prepare(`SELECT DISTINCT activity_id FROM booking_lifecycle WHERE source_id=? AND
  (invitee_uri IN (SELECT value FROM json_each(?2)) OR previous_invitee_uri IN (SELECT value FROM json_each(?2)) OR next_invitee_uri IN (SELECT value FROM json_each(?2)))`).bind(source,keys).all<{activity_id:string}>()).results;
 // An unbridged receipt must never combine two already-visible bookings implicitly.
 if(matched.length>1)throw new IngestionError(409,'Booking identities conflict; review the provider event chain.');
 const activityId=matched[0]?.activity_id??id;
 const rows=(await db.prepare('SELECT signal_id,activity_id,event_json,current_json FROM booking_lifecycle WHERE activity_id=? ORDER BY signal_id').bind(activityId).all<Row>()).results;
 const history=[...rows.map(row=>JSON.parse(row.event_json) as CalendlyReceipt),incoming].sort(order);
 if(history.some(item=>contactEmailKey(item.email)!==contactEmailKey(incoming.email)))throw new IngestionError(409,'A reschedule cannot change the linked attendee identity.');
 const replaced=new Set(history.flatMap(item=>[...(item.previousInvitee?[item.previousInvitee]:[]),...(item.rescheduled&&item.nextInvitee?[item.inviteeUri]:[])]));
 const heads=history.filter(item=>!replaced.has(item.inviteeUri));
 const latest=(heads.length?heads:history).at(-1)!;
 const same=history.filter(item=>item.inviteeUri===latest.inviteeUri),created=same.findLast(item=>item.kind==='invitee.created');
 const cancelled=same.findLast(item=>item.kind==='invitee.canceled'&&!item.rescheduled);
 const current:BookingCurrent={...(created??latest),status:cancelled?'cancelled':'booked',cancellation:cancelled?.cancellation??null,history};
 const root=rows.find(row=>row.signal_id===activityId),prior=root?.current_json?JSON.parse(root.current_json) as BookingCurrent:null;
 // The root's first created receipt runs the existing stop once, even when a cancellation arrived first.
 const firstBooking=incoming.kind==='invitee.created'&&!rows.some(row=>(JSON.parse(row.event_json) as CalendlyReceipt).kind==='invitee.created');
 const statements=[
  db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'booking_lifecycle_fence',NULL WHERE
   (SELECT count(*) FROM booking_lifecycle WHERE activity_id=?1)<>?2 OR
   EXISTS(SELECT 1 FROM booking_lifecycle WHERE source_id=?3 AND activity_id<>?1 AND
    (invitee_uri IN(SELECT value FROM json_each(?4)) OR previous_invitee_uri IN(SELECT value FROM json_each(?4)) OR next_invitee_uri IN(SELECT value FROM json_each(?4))))`).bind(activityId,rows.length,source,keys),
  db.prepare('INSERT INTO booking_lifecycle(signal_id,activity_id,source_id,invitee_uri,previous_invitee_uri,next_invitee_uri,event_json,current_json) VALUES(?,?,?,?,?,?,?,?)').bind(id,activityId,source,incoming.inviteeUri,incoming.previousInvitee,incoming.nextInvitee,JSON.stringify(incoming),activityId===id?JSON.stringify(current):null),
 ];
 if(activityId!==id)statements.push(db.prepare('UPDATE booking_lifecycle SET current_json=? WHERE signal_id=?').bind(JSON.stringify(current),activityId));
 return {activityId,current,prior,firstBooking,statements};
}

export function bookingTimeline(activityId:string,current:BookingCurrent){return {signalId:activityId,subject:current.eventName,booking:current};}
export async function currentBooking(db:D1Database,activityId:string){const row=await db.prepare('SELECT current_json FROM booking_lifecycle WHERE signal_id=? AND activity_id=signal_id').bind(activityId).first<{current_json:string}>();return row?JSON.parse(row.current_json) as BookingCurrent:null;}
