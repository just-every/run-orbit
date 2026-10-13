import {CalendarLimitError,parseCalendar} from './ics';
import {CaptureError,MAX_ITEMS_PER_IMPORT,type CaptureItem,type CaptureSourceAdapter} from './contracts';

/** Split an mbox: each message starts at a "From " line; ">From " escapes are undone. */
export function splitMbox(text:string){
 const messages:string[]=[];let current:string[]|null=null;
 for(const line of text.replace(/\r\n?/g,'\n').split('\n')){
  if(/^From \S/.test(line)){if(current)messages.push(current.join('\n'));current=[];continue;}
  if(current)current.push(line.replace(/^>(>*From )/,'$1'));
 }
 if(current)messages.push(current.join('\n'));
 return messages.filter(message=>message.trim());
}

/** Each uploaded file becomes items by its kind: .eml one message, mbox many, .ics one calendar. */
export function fileItems(files:{name:string;text:string}[]):CaptureItem[]{
 const items:CaptureItem[]=[];let count=0;
 for(const file of files){
  const name=file.name.toLowerCase(),text=file.text;
  if(name.endsWith('.ics')||/^\s*BEGIN:VCALENDAR/i.test(text)){
   try{count+=parseCalendar(text,MAX_ITEMS_PER_IMPORT-count).length;}catch(error){if(!(error instanceof CalendarLimitError))throw error;count=MAX_ITEMS_PER_IMPORT+1;}
   items.push({kind:'calendar',raw:text});
  }
  else if(name.endsWith('.mbox')||/^From \S/.test(text)){const messages=splitMbox(text);count+=messages.length;items.push(...messages.map(raw=>({kind:'message' as const,raw})));}
  else if(name.endsWith('.eml')){count++;items.push({kind:'message',raw:text});}
  else throw new CaptureError(400,`${file.name} is not an .eml, mbox or .ics file.`);
  if(count>MAX_ITEMS_PER_IMPORT)throw new CaptureError(413,`Add at most ${MAX_ITEMS_PER_IMPORT} messages or calendar events at a time; split larger mailboxes.`);
 }
 return items;
}

/** The file import as a capture.source.v1 adapter: one page, no cursor, no credential, no provider. */
export function fileAdapter(items:CaptureItem[]):CaptureSourceAdapter{
 return {adapter:'file',scope:{mail:{folders:['Files the operator adds']},calendars:['Files the operator adds']},async pull(){return {items,cursor:null,more:false};}};
}
