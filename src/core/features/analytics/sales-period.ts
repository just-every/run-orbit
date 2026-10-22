import {taskInstant,shiftTaskDay} from '../tasks/time';
import {AccessError} from '../access/errors';

/** Local calendar months in the workspace's IANA timezone, as exact UTC instants (start included, end excluded). */
const formatters=new Map<string,Intl.DateTimeFormat>();
function parts(instant:number,timeZone:string){
 let format=formatters.get(timeZone);
 if(!format){format=new Intl.DateTimeFormat('en-US',{timeZone,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});formatters.set(timeZone,format);}
 const value=Object.fromEntries(format.formatToParts(new Date(instant)).filter(part=>part.type!=='literal').map(part=>[part.type,Number(part.value)]));
 return value as {year:number;month:number;day:number;hour:number;minute:number;second:number};
}
const offset=(instant:number,timeZone:string)=>{const p=parts(instant,timeZone);return Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second)-Math.floor(instant/1000)*1000;};
function localMonthStart(year:number,month:number,timeZone:string){const guess=Date.UTC(year,month-1,1);const first=guess-offset(guess,timeZone);return guess-offset(first,timeZone);}
const pad=(value:number)=>String(value).padStart(2,'0');
export function monthKey(instant:number,timeZone:string){const p=parts(instant,timeZone);return `${p.year}-${pad(p.month)}`;}
export function monthLabel(key:string){const [year,month]=key.split('-').map(Number);return new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'long',year:'numeric'}).format(new Date(Date.UTC(year!,month!-1,1)));}
export interface SalesPeriod{fromMonth:string;throughMonth:string;from:string;through:string;timezone:string;months:{key:string;label:string;from:string;through:string}[]}
/** Inclusive month range, at most 24 local months. */
export function salesPeriod(fromMonth:string,throughMonth:string,timezone:string):SalesPeriod{
 const pattern=/^(\d{4})-(0[1-9]|1[0-2])$/;const a=pattern.exec(fromMonth),b=pattern.exec(throughMonth);
 if(!a||!b||fromMonth>throughMonth)throw new AccessError('validation','Choose a first and last month, in order.');
 try{new Intl.DateTimeFormat('en-US',{timeZone:timezone});}catch{throw new AccessError('prerequisite','The workspace timezone is not a valid IANA timezone.');}
 const months:SalesPeriod['months']=[];let year=Number(a[1]),month=Number(a[2]);
 while(`${year}-${pad(month)}`<=throughMonth){
  if(months.length>=24)throw new AccessError('validation','A sales report covers at most 24 months.');
  const next=month===12?{year:year+1,month:1}:{year,month:month+1},key=`${year}-${pad(month)}`;
  months.push({key,label:monthLabel(key),from:new Date(localMonthStart(year,month,timezone)).toISOString(),through:new Date(localMonthStart(next.year,next.month,timezone)).toISOString()});
  ({year,month}=next);
 }
 return {fromMonth,throughMonth,from:months[0]!.from,through:months.at(-1)!.through,timezone,months};
}
export const inPeriod=(period:SalesPeriod,at:string|null|undefined)=>{if(!at)return false;const instant=Date.parse(at);return Number.isFinite(instant)&&instant>=Date.parse(period.from)&&instant<Date.parse(period.through);};

/** A dashboard's day range keeps REPORT-001's monthly buckets and source-population engine. */
export function salesDateRange(fromDate:string,throughDate:string,timezone:string):SalesPeriod{
 const base=salesPeriod(fromDate.slice(0,7),throughDate.slice(0,7),timezone);
 if(fromDate>throughDate)throw new AccessError('validation','Choose a first and last date, in order.');
 const from=taskInstant(`${fromDate}T00:00`,timezone),through=taskInstant(`${shiftTaskDay(throughDate,1)}T00:00`,timezone);
 return {...base,from,through};
}
