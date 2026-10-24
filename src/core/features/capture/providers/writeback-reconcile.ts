import type {ProviderSource,ProviderSession} from './session';
import {encodeId} from './config';
/** Provider edits become visible conflicts, scoped to the exact occurrence written by Orbit. */
export async function reconcileWritebacks(db:D1Database,source:ProviderSource,session:ProviderSession){
 const rows=(await db.prepare("SELECT id,calendar_id,provider_event_id,etag,entry_id FROM calendar_writebacks WHERE source_id=? AND connection_id=? AND state='written' ORDER BY updated_at LIMIT 100").bind(source.id,source.connection_id).all<{id:string;calendar_id:string;provider_event_id:string;etag:string;entry_id:string}>()).results;
 for(const row of rows){const path=source.adapter==='google'?`https://www.googleapis.com/calendar/v3/calendars/${encodeId(row.calendar_id)}/events/${encodeId(row.provider_event_id)}`:`https://graph.microsoft.com/v1.0/me/calendars/${encodeId(row.calendar_id)}/events/${encodeId(row.provider_event_id)}`;
  const response=await session.read(path);await session.check();
  if(response.status===404||response.status===410){await db.batch([db.prepare("UPDATE calendar_writebacks SET state='cancelled',error=NULL,updated_at=? WHERE id=? AND state='written'").bind(new Date().toISOString(),row.id),db.prepare("UPDATE timeline_entries SET payload_json=json_set(payload_json,'$.cancelled',json('true'),'$.text','Meeting cancelled by provider') WHERE id=?").bind(row.entry_id)]);continue;}
  const event=await response.json() as any,etag=response.headers.get('etag')??event.etag??event['@odata.etag'];
  if(event.status==='cancelled'||event.isCancelled===true){await db.batch([db.prepare("UPDATE calendar_writebacks SET state='cancelled',error=NULL,updated_at=? WHERE id=? AND state='written'").bind(new Date().toISOString(),row.id),db.prepare("UPDATE timeline_entries SET payload_json=json_set(payload_json,'$.cancelled',json('true'),'$.text','Meeting cancelled by provider') WHERE id=?").bind(row.entry_id)]);}
  else if(etag!==row.etag)await db.prepare("UPDATE calendar_writebacks SET state='conflict',error='Provider edited the meeting. Review its current attendees, message and time before writing again.',updated_at=? WHERE id=? AND state='written' AND etag=?").bind(new Date().toISOString(),row.id,row.etag).run();
 }
}
