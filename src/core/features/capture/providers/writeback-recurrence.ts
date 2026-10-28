import {z} from 'zod';
import {RecordError} from '../../records/shared';
import {taskInstant,taskLocalInput,shiftTaskDay} from '../../tasks/time';
import {calendarEventUrl} from './writeback-event';
import type {Provider,ProviderFetch} from './config';

export const recurrenceSchema=z.object({frequency:z.enum(['daily','weekly','monthly']),count:z.number().int().min(2).max(52),timeZone:z.string().min(1).max(100)}).strict();
export type Recurrence=z.infer<typeof recurrenceSchema>;
export function calendarOccurrences(meeting:{start:string;end:string;recurrence?:Recurrence}){
 const rule=meeting.recurrence;if(!rule)return [{start:meeting.start,end:meeting.end}];
 try{new Intl.DateTimeFormat('en-US',{timeZone:rule.timeZone});}catch{throw new RecordError(400,'Choose a recognized IANA time zone.');}
 const first=taskLocalInput(meeting.start,rule.timeZone),last=taskLocalInput(meeting.end,rule.timeZone),day=first.slice(0,10),clock=first.slice(11),endClock=last.slice(11);
 const span=Math.round((Date.parse(last.slice(0,10))-Date.parse(day))/86400000),result=[];
 for(let n=0;result.length<rule.count&&n<120;n++){
  let date=shiftTaskDay(day,n*(rule.frequency==='weekly'?7:1));
  if(rule.frequency==='monthly'){
   const start=new Date(day+'T12:00:00Z'),wanted=start.getUTCDate();start.setUTCDate(1);start.setUTCMonth(start.getUTCMonth()+n);start.setUTCDate(wanted);
   if(start.getUTCDate()!==wanted)continue;date=start.toISOString().slice(0,10);
  }
  const start=taskInstant(`${date}T${clock}`,rule.timeZone),end=taskInstant(`${shiftTaskDay(date,span)}T${endClock}`,rule.timeZone);
  if(taskLocalInput(start,rule.timeZone).slice(11)!==clock||taskLocalInput(end,rule.timeZone).slice(11)!==endClock||Date.parse(end)<=Date.parse(start))throw new RecordError(400,'A recurring time falls in a daylight-saving gap. Choose another local time and review again.');
  result.push({start,end});
 }
 return result;
}
export function providerRecurrence(provider:Provider,meeting:{start:string;end:string;recurrence?:Recurrence}){
 const rule=meeting.recurrence;if(!rule)return {};
 const date=taskLocalInput(meeting.start,rule.timeZone).slice(0,10),day=new Date(date+'T12:00:00Z'),days=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
 return provider==='google'?{recurrence:[`RRULE:FREQ=${rule.frequency.toUpperCase()};COUNT=${rule.count}`]}:{recurrence:{pattern:{type:rule.frequency==='monthly'?'absoluteMonthly':rule.frequency,interval:1,...(rule.frequency==='weekly'?{daysOfWeek:[days[day.getUTCDay()]],firstDayOfWeek:'sunday'}:rule.frequency==='monthly'?{dayOfMonth:day.getUTCDate()}:{} )},range:{type:'numbered',startDate:date,numberOfOccurrences:rule.count,recurrenceTimeZone:rule.timeZone}}};
}

/** Resolve an occurrence from the provider; never manufacture its event identity. */
export async function calendarOccurrence(provider:Provider,fetcher:ProviderFetch,token:string,calendar:string,series:string,start:string){
 const from=new Date(Date.parse(start)-86400000).toISOString(),to=new Date(Date.parse(start)+86400000).toISOString();
 const params=new URLSearchParams(provider==='google'?{timeMin:from,timeMax:to,maxResults:'100'}:{startDateTime:from,endDateTime:to,'$top':'100'});
 const response=await fetcher(calendarEventUrl(provider,calendar,series)+'/instances?'+params,{method:'GET',redirect:'error',headers:{Authorization:`Bearer ${token}`,Prefer:'IdType="ImmutableId", outlook.timezone="UTC"'},signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new RecordError(409,'The provider occurrence is unavailable. No calendar change was sent.');
 const body=await response.json() as any;
 if(body.nextPageToken||body['@odata.nextLink'])throw new RecordError(409,'The occurrence response is incomplete. No calendar change was sent.');
 const matches=(provider==='google'?body.items:body.value)?.filter((e:any)=>{
  const original=provider==='google'?e.originalStartTime?.dateTime:e.originalStart;
  return Date.parse(original??e.start?.dateTime)===Date.parse(start);
 });
 if(matches?.length!==1||typeof matches[0].id!=='string')throw new RecordError(409,'The exact occurrence could not be identified. Review provider changes.');
 return matches[0];
}
