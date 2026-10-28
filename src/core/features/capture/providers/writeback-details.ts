import {calendarItem} from './calendar';
import {parseCalendar} from '../ics';
import {CaptureProviderError} from '../contracts';
import type {Provider} from './config';

export interface MeetingDetails {title:string;message:string;start:string;end:string;attendees:string[]}
export interface MeetingProvider {adapter:Provider;sourceId:string;calendarId:string;eventId:string;revision:string|null;observedAt:string;observedBy:'operator'|'provider'}

/** Resolve provider wall times with the same explicit zone rules as calendar intake. */
export function providerMeeting(provider:Provider,event:any,calendarId:string):MeetingDetails {
 const item=calendarItem(provider,event,calendarId),parsed=parseCalendar(item.raw)[0];
 if(!parsed||'error' in parsed||!parsed.start||!parsed.end||Date.parse(parsed.end)<=Date.parse(parsed.start))throw new CaptureProviderError('unavailable','The provider meeting has unreadable times. Its last known details are retained.');
 return {title:parsed.summary,message:provider==='google'?String(event.description??''):String(event.body?.content??''),start:parsed.start,end:parsed.end,attendees:parsed.attendees.map(person=>person.email)};
}

/** The original reviewed invitation and its receipt survive every later observation or edit. */
export function meetingActivity(meeting:MeetingDetails,contactId:string,writebackId:string,provider:MeetingProvider,previous?:Record<string,any>,cancelled=false) {
 return {...previous,text:cancelled?`Meeting cancelled: ${meeting.title}`:`Meeting: ${meeting.title}\n${meeting.message}`,durationMinutes:(Date.parse(meeting.end)-Date.parse(meeting.start))/60000,contactIds:[contactId],calendarWritebackId:writebackId,title:meeting.title,message:meeting.message,attendees:meeting.attendees,start:meeting.start,end:meeting.end,cancelled,originalMeeting:previous?.originalMeeting??meeting,originalProvider:previous?.originalProvider??previous?.provider??provider,provider};
}
