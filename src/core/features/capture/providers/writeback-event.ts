import {taskInstant} from '../../tasks/time';
import {windowsZones} from '../windows-zones';
import {RecordError} from '../../records/shared';
import {encodeId,type Provider} from './config';

export const calendarEventUrl=(provider:Provider,calendar:string,event?:string)=>provider==='google'
 ?`https://www.googleapis.com/calendar/v3/calendars/${encodeId(calendar)}/events${event?'/'+encodeId(event):''}`
 :`https://graph.microsoft.com/v1.0/me/calendars/${encodeId(calendar)}/events${event?'/'+encodeId(event):''}`;

/** Provider authority is proved by the connected account, never by a submitted address. */
export function requireCalendarOrganizer(provider:Provider,event:any){
 if(!(provider==='google'?event.organizer?.self===true:event.isOrganizer===true))throw new RecordError(409,'Only the connected calendar organizer can change this meeting. No invitation was sent.');
 if(event.attendeesOmitted===true||event.hideAttendees===true||event.sensitivity==='private'||event.visibility==='private')throw new RecordError(409,'This meeting has private or incomplete attendees. Orbit cannot review or invite them.');
}

/** Return only the invitation facts that can be reviewed, without provider metadata. */
export function calendarMeeting(provider:Provider,event:any,normalize=true){
 const google=provider==='google';
 const instant=(value:any)=>{if(!value?.dateTime)return value?.date?value.date+'T00:00:00.000Z':undefined;const raw=value.dateTime;if(!normalize)return raw;if(/(?:Z|[+-]\d\d:\d\d)$/.test(raw))return new Date(raw).toISOString();return taskInstant(raw.replace(/\.\d{4,}/,''),windowsZones[value.timeZone]??value.timeZone);};
 return {title:String((google?event.summary:event.subject)??'Meeting'),message:String((google?event.description:event.body?.content)??''),start:instant(event.start),end:instant(event.end),attendees:(event.attendees??[]).map((a:any)=>google?a.email:a.emailAddress?.address).filter((a:unknown)=>typeof a==='string') as string[]};
}
