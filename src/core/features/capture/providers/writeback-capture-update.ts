import {captureFences} from '../fences';
import {capturePrivacy} from '../privacy';
import {readItem} from '../facts';
import type {CaptureItem} from '../contracts';
import type {CaptureSource} from '../intake';

/** Preserve the accepted activity identity when a captured meeting changes before its first Orbit edit. */
export async function updateCapturedMeeting(db:D1Database,source:CaptureSource,item:Extract<CaptureItem,{kind:'calendar'}>){
 const event=item.providerEvent;if(!event?.writebackHeader||event.deleted)return false;
 const marker='X-ORBIT-CALENDAR-WRITEBACK: ',incoming=JSON.parse(event.writebackHeader.slice(marker.length));
 const originals=(await db.prepare(`SELECT i.id,i.headers,i.signal_id FROM capture_items i JOIN timeline_entries e ON e.id=i.signal_id WHERE i.source_id=? AND i.kind='event' AND EXISTS(SELECT 1 FROM signal_links l WHERE l.signal_id=i.signal_id) ORDER BY i.captured_at DESC,i.rowid DESC`).bind(source.id).all<any>()).results;
 for(const original of originals){
  const line=original.headers.split('\n').find((l:string)=>l.startsWith(marker));if(!line)continue;const previous=JSON.parse(line.slice(marker.length));
  if(previous.calendar!==incoming.calendar||previous.id!==incoming.id)continue;
  const read=(await readItem(item))[0];if(!read||!('fact' in read)||read.fact.kind!=='event')return false;
  const privacy=await capturePrivacy(db,read.fact);if(await privacy.blocked())return true;
  const meeting={...incoming.meeting,start:read.fact.start,end:read.fact.end};
  if(JSON.stringify(previous.meeting)===JSON.stringify(meeting))return false;
  const link=await db.prepare(`SELECT l.record_type,l.record_id,c.id AS contact_id FROM signal_links l JOIN contacts c ON c.email IN(SELECT value FROM json_each(?)) WHERE l.signal_id=? AND l.record_type='contact' AND l.record_id=c.id LIMIT 1`).bind(JSON.stringify(previous.meeting.attendees),original.signal_id).first<any>();if(!link)return false;
  const at=new Date().toISOString();
  await db.batch([...captureFences(db,source),...privacy.fences(),db.prepare("INSERT OR IGNORE INTO calendar_writebacks VALUES(?,?,?,?,?,?,?,?,?,'conflict',?,?,?,?)").bind(original.id,source.id,source.connection_id,incoming.calendar,incoming.id,link.record_type,link.record_id,link.contact_id,original.signal_id,JSON.stringify(meeting),previous.etag??null,'Provider edited the meeting. Review its current attendees, message and time.',at),db.prepare("UPDATE timeline_entries SET payload_json=json_set(payload_json,'$.subject',?,'$.attendees',json(?),'$.start',?,'$.end',?) WHERE id=?").bind(meeting.title,JSON.stringify(meeting.attendees),meeting.start,meeting.end,original.signal_id)]);
  return true;
 }
 return false;
}
