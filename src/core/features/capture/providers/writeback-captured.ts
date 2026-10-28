import {calendarMeeting} from './writeback-event';
import type {Provider} from './config';

const marker='X-ORBIT-CALENDAR-WRITEBACK: ';
export function capturedCalendarHeader(provider:Provider,event:any,calendar:string){
 const privateEvent=event.attendeesOmitted===true||event.hideAttendees===true||event.sensitivity==='private'||event.visibility==='private';
 const meeting=calendarMeeting(provider,event,false);
 if(privateEvent)meeting.attendees=[];
 return marker+JSON.stringify({calendar,id:event.id,etag:event.etag??event['@odata.etag']??null,meeting,privateEvent,organizer:provider==='google'?event.organizer?.self===true:event.isOrganizer===true});
}

/** Only trusted provider intake adds this header. Imported calendar text cannot authorize writes. */
export async function capturedMeetings(db:D1Database,kind:string,record:string){
 const items=(await db.prepare(`SELECT i.id,i.source_id,i.headers,i.signal_id,s.created_at,c.connection_id FROM capture_items i JOIN signals s ON s.id=i.signal_id JOIN capture_sources c ON c.id=i.source_id
 WHERE i.kind='event' AND c.adapter IN('google','microsoft') AND EXISTS(SELECT 1 FROM signal_links l WHERE l.signal_id=s.id AND l.record_type=? AND l.record_id=?) ORDER BY i.captured_at DESC,i.rowid DESC`).bind(kind,record).all<any>()).results;
 const seen=new Set<string>(),rows=[];
 for(const item of items){
  const line=item.headers.split('\n').find((line:string)=>line.startsWith(marker));if(!line)continue;
  const event=JSON.parse(line.slice(marker.length)),key=JSON.stringify([item.source_id,event.calendar,event.id]);if(seen.has(key))continue;seen.add(key);
  if(await db.prepare('SELECT 1 FROM calendar_writebacks WHERE source_id=? AND calendar_id=? AND provider_event_id=?').bind(item.source_id,event.calendar,event.id).first())continue;
  const contact=await db.prepare(`SELECT c.id FROM contacts c WHERE c.email IN(SELECT value FROM json_each(?)) AND (?='contact' AND c.id=? OR ?='opportunity' AND EXISTS(SELECT 1 FROM opportunity_contacts o WHERE o.opportunity_id=? AND o.contact_id=c.id)) ORDER BY c.id LIMIT 1`).bind(JSON.stringify(event.meeting.attendees),kind,record,kind,record).first<{id:string}>();
  rows.push({id:item.id,source_id:item.source_id,connection_id:item.connection_id,calendar_id:event.calendar,provider_event_id:event.id,record_type:kind,record_id:record,contact_id:contact?.id??'',entry_id:item.signal_id,state:'written',payload_json:JSON.stringify(event.meeting),etag:null,updated_at:item.created_at,captured:true,error:!event.organizer?'Only the connected calendar organizer can change this meeting.':event.privateEvent?'Private or incomplete attendees cannot be reviewed.':null});
 }
 return rows;
}
