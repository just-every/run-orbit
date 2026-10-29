import {parseCalendar} from '../ics';
import {CaptureProviderError,type CaptureItem} from '../contracts';
/** Provider facts rendered as iCalendar for the same normalization/review path as files. */
const text=(value:unknown)=>String(value??'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
const clean=(value:unknown)=>String(value??'').replace(/[\r\n";]/g,'');
function instant(value:unknown){if(typeof value!=='string'||!/(Z|[+-]\d\d:\d\d)$/.test(value)||!Number.isFinite(Date.parse(value)))return undefined;return new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');}
function time(name:string,value:any,allDay=false){
 if(!value)return [];
 if(value.date||allDay){const date=String(value.date??value.dateTime).slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(date)?[`${name};VALUE=DATE:${date.replace(/-/g,'')}`]:[];}
 const utc=instant(value.dateTime);if(utc)return [`${name}:${utc}`];
 if(typeof value.dateTime!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value.dateTime))return [];
 const date=value.dateTime.slice(0,19).replace(/[-:]/g,''),zone=value.timeZone;
 return zone==='UTC'?[`${name}:${date}Z`]:[`${name};TZID=${clean(zone)}:${date}`];
}
export function calendarItem(provider:'google'|'microsoft',event:any,calendarId:string,seriesId?:string):Extract<CaptureItem,{kind:'calendar'}>{
 const google=provider==='google',lines=['BEGIN:VCALENDAR','VERSION:2.0','BEGIN:VEVENT'];
 const uid=google?event.iCalUID:event.iCalUId;
 if(typeof event.id!=='string'||!event.id)throw new CaptureProviderError('unavailable','The calendar returned an invalid event identity.');
 const providerEvent={calendarId,id:event.id,seriesId:google?(event.recurringEventId??seriesId):event.seriesMasterId,deleted:Boolean(google?event.status==='cancelled':event['@removed']),modifiedAt:google?instant(event.updated):undefined};
 const start=time('DTSTART',event.start,event.isAllDay),end=time('DTEND',event.end,event.isAllDay);
 // Every cancellation resolves captured provider identities first. Only a complete
 // Google event can stand alone when no captured association exists.
 if(providerEvent.deleted&&(!google||!uid||!event.updated||!start.length||!end.length||!event.organizer))return {kind:'calendar',raw:'',providerEvent};
 if(uid)lines.push(`UID:${clean(uid)}`);
 // A provider revision disambiguates changes that leave iCalendar SEQUENCE unchanged.
 const revision=google?event.updated:event.lastModifiedDateTime;
 if(revision)lines.push(`X-ORBIT-PROVIDER-REVISION:${clean(revision)}`);
 lines.push(`SEQUENCE:${Number.isSafeInteger(event.sequence)?event.sequence:0}`,`SUMMARY:${text(google?event.summary:event.subject)}`);
 const cancelled=google?event.status==='cancelled':event.isCancelled;
 if(cancelled)lines.push('STATUS:CANCELLED');
 for(const [name,value] of [['CREATED',google?event.created:event.createdDateTime],['LAST-MODIFIED',revision],['DTSTAMP',revision]]){const date=instant(value);if(date)lines.push(`${name}:${date}`);}
 lines.push(...start,...end);
 if(google&&event.originalStartTime)lines.push(...time('RECURRENCE-ID',event.originalStartTime));
 if(!google&&event.originalStart){const value=instant(event.originalStart);if(value)lines.push(`RECURRENCE-ID:${value}`);}
 const organizer=google?event.organizer:event.organizer?.emailAddress;
 if(organizer?.email||organizer?.address)lines.push(`ORGANIZER;CN="${clean(organizer.displayName??organizer.name)}":mailto:${clean(organizer.email??organizer.address)}`);
 for(const attendee of event.attendees??[]){const person=google?attendee:attendee.emailAddress;if(person?.email||person?.address)lines.push(`ATTENDEE;CN="${clean(person.displayName??person.name)}":mailto:${clean(person.email??person.address)}`);}
 lines.push('END:VEVENT','END:VCALENDAR');return {kind:'calendar',raw:lines.join('\r\n'),providerEvent};
}

/** Filter using intake's time interpretation. Deletions still reach association
 * lookup, but require a proven overlap to become new standalone evidence. */
export function withinCalendarWindow(item:CaptureItem,window:{start:string;end:string}){
 if(item.kind!=='calendar')return true;
 const event=parseCalendar(item.raw)[0];
 if(!event||'error' in event||!event.start||!event.end){if(item.providerEvent?.deleted)item.providerEvent.outsideWindow=true;return true;}
 const inside=Date.parse(event.start)<Date.parse(window.end)&&Date.parse(event.end)>Date.parse(window.start);
 if(item.providerEvent?.deleted){item.providerEvent.outsideWindow=!inside;return true;}
 return inside;
}
