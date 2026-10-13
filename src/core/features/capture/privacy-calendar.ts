import {payloadHash} from '../../platform/source-security';
import {parseCalendar} from './ics';

interface StoredEvent {headers:string;body:string;source_event_id:string;type:string}
export const calendarPrivacyIdentity=(event:{uid:string;recurrenceId:string|null})=>['calendar',event.uid,event.recurrenceId??''];

/** Recover only identities verified by the immutable event hash, never assume a missing recurrence is the series master. */
export async function storedCalendarPrivacyIdentity(original:StoredEvent){
 // These are already accepted originals, not a permissive intake parser. Drop
 // the possibly cut final property and inspect only the retained complete lines.
 const event=parseCalendar(original.body.slice(0,original.body.lastIndexOf('\n'))+'\nEND:VEVENT')[0];
 const retained=event&&!('error' in event)?event:undefined;
 const uid=/^UID: (.+)$/m.exec(original.headers)?.[1]??retained?.uid;
 const sequence=/^SEQUENCE: ([^\n]+)$/m.exec(original.headers)?.[1]??retained?.sequence;
 const phase=/^meeting\.(booked|completed|cancelled)$/.exec(original.type)?.[1];
 if(!uid||sequence===undefined||!phase)return null;
 const recurrenceId=retained?.recurrenceId??null;
 const revision=/^X-ORBIT-PROVIDER-REVISION: ?([^\n]+)$/m.exec(original.headers)?.[1]??retained?.revision;
 const values=[uid,recurrenceId??'',sequence,phase];
 const candidates=[values,...(revision?[[...values,revision]]:[])];
 for(const parts of candidates)if(original.source_event_id===`event:${await payloadHash(parts.join('\n'))}`)
  return calendarPrivacyIdentity({uid,recurrenceId});
 // An identifier beyond the old truncation boundary cannot be reconstructed.
 // Keep its exact replay proof; intake also checks the full incoming original time.
 return null;
}
