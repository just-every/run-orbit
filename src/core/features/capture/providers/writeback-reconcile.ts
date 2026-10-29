import type {ProviderSource,ProviderSession} from './session';
import {encodeId} from './config';
import {guard,clearGuards} from '../../identity/store';
import {CaptureProviderError} from '../contracts';
import {meetingActivity,providerMeeting,type MeetingDetails} from './writeback-details';

interface WrittenMeeting {id:string;calendar_id:string;provider_event_id:string;etag:string;entry_id:string;contact_id:string;payload_json:string;activity_json:string;state:string}
/** Read the exact written occurrence, preserving its activity identity and original invitation. */
export async function reconcileWritebacks(db:D1Database,source:ProviderSource,session:ProviderSession){
 const rows=(await db.prepare("SELECT w.*,t.payload_json AS activity_json FROM calendar_writebacks w JOIN timeline_entries t ON t.id=w.entry_id JOIN contacts c ON c.id=w.contact_id WHERE w.source_id=? AND w.connection_id=? AND w.state IN('written','conflict') ORDER BY w.updated_at,w.id LIMIT 100").bind(source.id,source.connection_id).all<WrittenMeeting>()).results;
 for(const row of rows){
  const path=source.adapter==='google'?`https://www.googleapis.com/calendar/v3/calendars/${encodeId(row.calendar_id)}/events/${encodeId(row.provider_event_id)}`:`https://graph.microsoft.com/v1.0/me/calendars/${encodeId(row.calendar_id)}/events/${encodeId(row.provider_event_id)}`;
  const response=await session.read(path);await session.check();
  const missing=response.status===404||response.status===410,event=missing?null:await response.json() as any;
  const cancelled=missing||event.status==='cancelled'||event.isCancelled===true;
  const etag=missing?row.etag:response.headers.get('etag')??event.etag??event['@odata.etag'];
  if(!cancelled&&(typeof etag!=='string'||!etag))throw new CaptureProviderError('unavailable','The provider supplied no meeting revision. Its last known details are retained.');
  if(!cancelled&&etag===row.etag)continue;
  const now=new Date().toISOString(),previous=JSON.parse(row.activity_json),oldMeeting=JSON.parse(row.payload_json) as MeetingDetails;
  const current=cancelled?oldMeeting:providerMeeting(source.adapter,event,row.calendar_id);
  // Older installations acquire the snapshot from their last locally recorded invitation.
  const activity=meetingActivity(current,row.contact_id,row.id,{adapter:source.adapter,sourceId:source.id,calendarId:row.calendar_id,eventId:row.provider_event_id,revision:etag,observedAt:now,observedBy:'provider'},{...previous,originalMeeting:previous.originalMeeting??oldMeeting},cancelled);
  await db.batch([
   session.fence(),
   guard(db,{sql:'EXISTS(SELECT 1 FROM calendar_writebacks WHERE id=? AND state=? AND etag IS ? AND payload_json=?) AND EXISTS(SELECT 1 FROM contacts WHERE id=?) AND EXISTS(SELECT 1 FROM timeline_entries WHERE id=? AND payload_json=?)',args:[row.id,row.state,row.etag,row.payload_json,row.contact_id,row.entry_id,row.activity_json]}),
   db.prepare('UPDATE timeline_entries SET occurred_at=?,payload_json=? WHERE id=?').bind(current.start,JSON.stringify(activity),row.entry_id),
   db.prepare('UPDATE calendar_writebacks SET state=?,payload_json=?,etag=?,error=?,updated_at=? WHERE id=?').bind(cancelled?'cancelled':'conflict',JSON.stringify(current),etag,cancelled?null:'Provider edited the meeting. Review its current attendees, message and time before writing again.',now,row.id),
   clearGuards(db),
  ]);
 }
}
