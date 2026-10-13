const formatters=new Map<string,Intl.DateTimeFormat>();
function formatter(zone:string){let format=formatters.get(zone);if(!format){format=new Intl.DateTimeFormat('en-GB',{timeZone:zone,weekday:'short',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});formatters.set(zone,format);}return format;}
export function localTime(date:Date,zone:string){const fields=Object.fromEntries(formatter(zone).formatToParts(date).map(part=>[part.type,part.value]));return {day:`${fields.year}-${fields.month}-${fields.day}`,weekday:fields.weekday!,hour:Number(fields.hour),minute:Number(fields.minute),label:formatter(zone).format(date)};}
export function permitted(date:Date,zone:string){const time=localTime(date,zone);return !['Sat','Sun'].includes(time.weekday)&&time.hour>=8&&time.hour<18;}
export function nextPermitted(date:Date,zone:string){let cursor=new Date(Math.ceil(date.getTime()/60000)*60000);for(let minute=0;minute<8*24*60;minute++){if(permitted(cursor,zone))return cursor;cursor=new Date(cursor.getTime()+60000);}throw new Error('Unable to resolve the next recipient working minute.');}
export function workingDaysAfter(date:Date,days:number,zone:string){
  if(!Number.isInteger(days)||days<1||days>365)throw new Error('Working-day interval must be 1–365.');
  const start=localTime(date,zone);let cursor=new Date(date.getTime()),lastDay=start.day,count=0;
  // Advance in absolute hours to enumerate local dates across DST, then locate
  // the first local minute at the original clock time on the target weekday.
  for(let hours=0;hours<24*(days*2+8);hours++){
    cursor=new Date(cursor.getTime()+3600000);const time=localTime(cursor,zone);
    if(time.day!==lastDay){lastDay=time.day;if(!['Sat','Sun'].includes(time.weekday))count++;}
    if(count===days){let minute=new Date(cursor.getTime()-3600000);for(let i=0;i<25*60;i++){minute=new Date(minute.getTime()+60000);const local=localTime(minute,zone);if(local.day===time.day&&local.hour*60+local.minute>=start.hour*60+start.minute)return minute;}throw new Error('Unable to resolve workspace deadline.');}
  }throw new Error('Unable to resolve workspace working-day deadline.');
}
