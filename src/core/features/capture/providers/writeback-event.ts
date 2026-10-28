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
export function calendarMeeting(provider:Provider,event:any){
 const google=provider==='google';
 return {title:String((google?event.summary:event.subject)??'Meeting'),message:String((google?event.description:event.body?.content)??''),start:event.start?.dateTime,end:event.end?.dateTime,attendees:(event.attendees??[]).map((a:any)=>google?a.email:a.emailAddress?.address).filter((a:unknown)=>typeof a==='string') as string[]};
}
