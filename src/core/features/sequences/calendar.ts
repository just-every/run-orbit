import {WorkbenchError} from '../workbench/repository';
import type {SequenceCalendar,Step} from './schema';

/** Date arithmetic uses local calendar dates, never fixed 24-hour durations. */
export function previewSchedule(steps:Step[],calendar:SequenceCalendar,startAt:string){
 const start=new Date(startAt);
 if(!Number.isFinite(start.getTime()))throw new WorkbenchError(400,'Choose a valid preview start time.');
 const formatter=new Intl.DateTimeFormat('en-US',{timeZone:calendar.timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 const local=(date:Date)=>{
  const parts=Object.fromEntries(formatter.formatToParts(date).map(p=>[p.type,p.value]));
  return Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day),Number(parts.hour),Number(parts.minute),Number(parts.second),date.getUTCMilliseconds());
 };
 let localDate=local(start),dueAt=start.toISOString();
 const result=steps.map((step,index)=>{
  for(let left=step.delayBusinessDays;left>0;){
   localDate+=86400000;
   if(calendar.days.includes(new Date(localDate).getUTCDay()))left--;
  }
  if(step.delayBusinessDays){
   // Try both sides of a timezone transition. Matching wall-clock components
   // preserves the chosen time across DST and explicitly refuses a missing hour.
   const offsets=new Set([-36,0,36].map(hours=>{
    const probe=new Date(localDate+hours*3600000);return local(probe)-probe.getTime();
   }));
   const candidates=[...offsets].map(offset=>new Date(localDate-offset)).filter(date=>local(date)===localDate).sort((a,b)=>a.getTime()-b.getTime());
   if(!candidates.length)throw new WorkbenchError(400,'A due time falls in a daylight-saving gap. Choose a start time that exists on every step date.');
   dueAt=candidates[0]!.toISOString();
  }
  return{position:index+1,kind:step.kind,dueAt};
 });
 return{timezone:calendar.timezone,days:calendar.days,steps:result};
}
