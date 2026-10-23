import {IngestionError} from './contracts';
import type {SignalEvent} from './contracts';
import {decodeBooking,bookingEvidence,type BookingEvidence} from './booking-webhooks';
import type {SignalTarget} from './linking-repository';
interface Change extends BookingEvidence {occurredAt:string;signalId:string}
interface Activity {booking:BookingEvidence;changes:Change[];subject:string;signalId:string}
/** Alias writes and the aggregate share the ingress batch. Snapshot fences refuse concurrent stale plans. */
export async function bookingActivity(db:D1Database,id:string,event:SignalEvent,targets:SignalTarget[],source:string,at:string,actorType:'source'|'operator'='source',actor=source){
 const booking=bookingEvidence(event);if(!booking||!targets.length)return null;
 const ids=[booking.providerId,...(booking.relatedId?[booking.relatedId]:[])];
 const existing=(await db.prepare(`SELECT DISTINCT t.id,t.payload_json FROM booking_activity_ids b JOIN timeline_entries t ON t.id=b.timeline_id WHERE b.source_id=? AND b.provider=? AND b.provider_id IN(SELECT value FROM json_each(?))`).bind(source,booking.provider,JSON.stringify(ids)).all<{id:string;payload_json:string}>()).results;
 // Admit pre-lifecycle signed bookings lazily, preserving the original timeline id.
 for(const providerId of ids){
  const raw=booking.provider==='calcom'?JSON.stringify({triggerEvent:'BOOKING_CREATED',createdAt:event.occurredAt,payload:{uid:providerId,attendees:booking.attendees}}):JSON.stringify({event:'invitee.created',created_at:event.occurredAt,payload:{uri:providerId,event:booking.context,email:booking.attendees[0]!.email}});
  const legacy=await decodeBooking(booking.provider,raw);
  const row=await db.prepare('SELECT t.id,t.payload_json,s.payload_json AS raw FROM signals s JOIN timeline_entries t ON t.id=s.id WHERE s.source_id=? AND s.source_event_id=?').bind(source,legacy.eventId).first<{id:string;payload_json:string;raw:string}>();
  if(row&&!existing.some(e=>e.id===row.id))existing.push(row);
 }
 const timelineId=existing[0]?.id??id,changes:Change[]=[];
 for(const row of existing){const payload=JSON.parse(row.payload_json) as Partial<Activity>;if(payload.changes)changes.push(...payload.changes);else{const signal=await db.prepare('SELECT payload_json FROM signals WHERE id=?').bind(row.id).first<{payload_json:string}>();if(signal){const legacy=await decodeBooking(booking.provider,signal.payload_json);changes.push({...legacy.data!.booking as BookingEvidence,occurredAt:legacy.occurredAt,signalId:row.id});}}}
 if(actorType!=='operator'&&changes.some(change=>change.attendees.map(a=>a.email.toLowerCase()).sort().join()!==booking.attendees.map(a=>a.email.toLowerCase()).sort().join()))throw new IngestionError(409,'Booking attendee identity changed; replay for review.');
 changes.push({...booking,occurredAt:event.occurredAt,signalId:id});
 changes.sort((a,b)=>a.occurredAt.localeCompare(b.occurredAt)||({booked:0,rescheduled:1,completed:2,cancelled:3}[a.state]-{booked:0,rescheduled:1,completed:2,cancelled:3}[b.state])||a.signalId.localeCompare(b.signalId));
 let current=changes[0]!;
 for(const change of changes.slice(1)){
  // Old-identity cancels must never cancel the replacement appointment. Cancellation is terminal.
  if(current.state==='cancelled'&&change.state!=='rescheduled'||change.state==='booked'&&current.state!=='booked')continue;
  if(change.state!=='rescheduled'&&change.providerId!==current.providerId)continue;
  if(change.state==='rescheduled'&&change.relatedId!==current.providerId&&change.providerId!==current.providerId)continue;
  current={...current,...change,startTime:change.startTime??current.startTime,endTime:change.endTime??current.endTime,oldStartTime:change.oldStartTime??current.oldStartTime,oldEndTime:change.oldEndTime??current.oldEndTime};
 }
 const payload:Activity={booking:current,changes,subject:`Meeting ${current.state==='completed'?'ended · provider report':current.state}`,signalId:timelineId};
 const statements:D1PreparedStatement[]=[];
 for(const row of existing)statements.push(db.prepare("INSERT INTO runtime_controls(name,value) SELECT 'booking_activity_fence',NULL WHERE NOT EXISTS(SELECT 1 FROM timeline_entries WHERE id=? AND payload_json=?)").bind(row.id,row.payload_json));
 if(!existing.length)statements.push(db.prepare("INSERT INTO timeline_entries(id,kind,occurred_at,recorded_at,actor_type,actor_id,source,payload_json) VALUES(?,'signal.recorded',?,?,?,?,?,?)").bind(timelineId,event.occurredAt,at,actorType,actor,source,JSON.stringify(payload)));
 else statements.push(db.prepare('UPDATE timeline_entries SET occurred_at=?,recorded_at=?,payload_json=? WHERE id=?').bind(current.occurredAt,at,JSON.stringify(payload),timelineId));
 for(const row of existing.filter(row=>row.id!==timelineId))statements.push(db.prepare('INSERT OR IGNORE INTO timeline_entry_records SELECT ?,record_type,record_id FROM timeline_entry_records WHERE timeline_entry_id=?').bind(timelineId,row.id),db.prepare('UPDATE booking_activity_ids SET timeline_id=? WHERE timeline_id=?').bind(timelineId,row.id),db.prepare('DELETE FROM timeline_entries WHERE id=?').bind(row.id));
 for(const providerId of ids)statements.push(db.prepare('INSERT INTO booking_activity_ids(source_id,provider,provider_id,timeline_id) VALUES(?,?,?,?) ON CONFLICT(source_id,provider,provider_id) DO UPDATE SET timeline_id=excluded.timeline_id WHERE booking_activity_ids.timeline_id=excluded.timeline_id').bind(source,booking.provider,providerId,timelineId),db.prepare("INSERT INTO runtime_controls(name,value) SELECT 'booking_alias_fence',NULL WHERE NOT EXISTS(SELECT 1 FROM booking_activity_ids WHERE source_id=? AND provider=? AND provider_id=? AND timeline_id=?)").bind(source,booking.provider,providerId,timelineId));
 return {timelineId,statements};
}
