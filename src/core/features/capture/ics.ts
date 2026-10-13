import type {Mailbox} from './mime';

/** One VEVENT as written, with its times resolved to UTC. Unknown time zones are refused, never assumed. */
export interface CalendarEvent {
 uid:string;revision:string|null;sequence:number;recurrenceId:string|null;method:string;status:string;summary:string;
 start:string|null;end:string|null;stamp:string|null;created:string|null;lastModified:string|null;
 organizer:Mailbox|null;attendees:Mailbox[];raw:string;
}
interface Property {name:string;params:Record<string,string>;value:string}

/** Detect components on unfolded content lines while retaining their physical evidence. */
function* contentLines(raw:string){
 const lines=raw.replace(/\r\n?/g,'\n').split('\n');
 for(let index=0;index<lines.length;){
  const start=index,parts=[lines[index++]!];
  while(index<lines.length&&/^[ \t]/.test(lines[index]!))parts.push(lines[index++]!.slice(1));
  yield {value:parts.join(''),raw:lines.slice(start,index).join('\n')};
 }
}

function properties(block:string):Property[]{
 return block.replace(/\r\n?/g,'\n').replace(/\n[ \t]/g,'').split('\n').filter(Boolean).flatMap(line=>{
  let quoted=false,colon=-1;
  for(let index=0;index<line.length;index++){if(line[index]==='"')quoted=!quoted;else if(line[index]===':'&&!quoted){colon=index;break;}}
  if(colon<0)return [];
  const [name='',...rest]=line.slice(0,colon).split(';'),params:Record<string,string>={};
  for(const part of rest){const at=part.indexOf('=');if(at>0)params[part.slice(0,at).toUpperCase()]=part.slice(at+1).replace(/^"(.*)"$/,'$1');}
  return [{name:name.toUpperCase(),params,value:line.slice(colon+1)}];
 });
}
const text=(value:string)=>value.replace(/\\n/gi,'\n').replace(/\\([,;\\])/g,'$1');
function offset(at:number,zone:string){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:zone,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).formatToParts(new Date(at)).map(part=>[part.type,part.value]));
 return Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day),Number(parts.hour),Number(parts.minute),Number(parts.second))-at;
}
export class CalendarTimeError extends Error {}
export class CalendarLimitError extends Error {}
/** DATE, UTC DATE-TIME, or DATE-TIME in a named IANA zone. Floating times have no zone and are refused. */
function time(property:Property|undefined):string|null{
 if(!property)return null;
 const match=/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(property.value.trim());
 if(!match)throw new CalendarTimeError(`Unreadable ${property.name} time.`);
 const [,y,mo,d,h='00',mi='00',s='00',z]=match,local=Date.UTC(Number(y),Number(mo)-1,Number(d),Number(h),Number(mi),Number(s));
 if(z||!match[4])return new Date(local).toISOString();
 const zone=property.params.TZID;
 if(!zone)throw new CalendarTimeError(`${property.name} has no time zone.`);
 try{new Intl.DateTimeFormat('en-US',{timeZone:zone});}catch{throw new CalendarTimeError(`Unknown time zone ${zone}.`);}
 let utc=local;for(let pass=0;pass<2;pass++)utc=local-offset(utc,zone);
 return new Date(utc).toISOString();
}
function person(property:Property):Mailbox|null{
 const email=property.value.replace(/^mailto:/i,'').trim().toLowerCase();
 return /^[^\s@]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email)?{email,name:text(property.params.CN??'')}:null;
}

/** Each VEVENT, or the reason it cannot be read; one unreadable event never hides the others. */
export function parseCalendar(raw:string,maxEvents=Infinity):(CalendarEvent|{error:string})[]{
 const blocks:(string|{error:string})[]=[],header:string[]=[];let current:string[]|null=null,started=false,count=0;
 for(const {value:line,raw:physical} of contentLines(raw)){
  if(/^BEGIN:VEVENT$/i.test(line)){
   if(++count>maxEvents)throw new CalendarLimitError('Calendar item limit exceeded.');
   if(current)blocks.push({error:'Calendar event has no END:VEVENT'});
   current=[];started=true;
  }else if(/^END:VEVENT$/i.test(line)){
   if(current)blocks.push(current.join('\n'));current=null;
  }else if(current)current.push(physical);
  else if(!started)header.push(physical);
 }
 if(current)blocks.push({error:'Calendar event has no END:VEVENT'});
 const method=(properties(header.join('\n')).find(p=>p.name==='METHOD')?.value??'').toUpperCase();
 return blocks.map(block=>{
  if(typeof block!=='string')return block;
  const list=properties(block),one=(name:string)=>list.find(p=>p.name===name);
  try{return {
   uid:one('UID')?.value.trim()??'',revision:one('X-ORBIT-PROVIDER-REVISION')?.value.trim()??null,sequence:Number(one('SEQUENCE')?.value??0)||0,recurrenceId:one('RECURRENCE-ID')?.value.trim()??null,method,
   status:(one('STATUS')?.value??'').trim().toUpperCase(),summary:text(one('SUMMARY')?.value??''),
   start:time(one('DTSTART')),end:time(one('DTEND')),stamp:time(one('DTSTAMP')),created:time(one('CREATED')),lastModified:time(one('LAST-MODIFIED')),
   organizer:one('ORGANIZER')?person(one('ORGANIZER')!):null,attendees:list.filter(p=>p.name==='ATTENDEE').map(person).filter((p):p is Mailbox=>p!==null),
   raw:`BEGIN:VEVENT\n${block}\nEND:VEVENT`,
  };}catch(error){if(error instanceof CalendarTimeError)return {error:error.message};throw error;}
 });
}
