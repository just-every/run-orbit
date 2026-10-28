import type {ProviderSource,ProviderSession} from './session';
import {calendarEventUrl,calendarMeeting} from './writeback-event';

/** Read the stored provider identity after edits or reconnect. Never dispatch or retry invitations. */
export async function reconcileWritebacks(db:D1Database,source:ProviderSource,session:ProviderSession){
 const rows=(await db.prepare("SELECT * FROM calendar_writebacks WHERE source_id=? AND provider_event_id IS NOT NULL AND state IN('written','conflict','uncertain','attempted') ORDER BY updated_at LIMIT 100").bind(source.id).all<any>()).results;
 for(const row of rows){
  const response=await session.read(calendarEventUrl(source.adapter,row.calendar_id,row.provider_event_id),{Prefer:'IdType="ImmutableId", outlook.timezone="UTC"'});await session.check();
  const missing=response.status===404||response.status===410,event=missing?{}:await response.json() as any;
  const cancelled=missing||event.status==='cancelled'||event.isCancelled===true,etag=response.headers.get('etag')??event.etag??event['@odata.etag'];
  if(!cancelled&&etag===row.etag&&row.connection_id===source.connection_id&&row.state==='written')continue;
  const saved=JSON.parse(row.payload_json),meeting=cancelled?saved:{...saved,...calendarMeeting(source.adapter,event)};
  if(event.attendeesOmitted||event.hideAttendees||event.visibility==='private'||event.sensitivity==='private')meeting.attendees=[];
  const state=cancelled?'cancelled':'conflict',error=cancelled?null:'Provider edited the meeting. The connection may also have changed. Review its current attendees, message and time before writing again.';
  const activity=JSON.stringify({text:cancelled?'Meeting cancelled by provider':`Meeting: ${meeting.title}\n${meeting.message}`,subject:meeting.title,attendees:meeting.attendees,start:meeting.start,end:meeting.end,cancelled,contactIds:[row.contact_id],calendarWritebackId:row.id});
  await db.batch([db.prepare('UPDATE calendar_writebacks SET state=?,payload_json=?,error=?,updated_at=? WHERE id=? AND updated_at=?').bind(state,JSON.stringify(meeting),error,new Date().toISOString(),row.id,row.updated_at),db.prepare('UPDATE timeline_entries SET payload_json=? WHERE id=?').bind(activity,row.entry_id)]);
 }
}
