import {payloadHash} from '../../platform/source-security';
import type {CaptureItem} from './contracts';
import {parseCalendar} from './ics';
import {mailboxes,parameters,parseMessage,type Mailbox} from './mime';

export interface Participant extends Mailbox {role:'from'|'to'|'cc'|'attendee'|'organizer'|'forwarded'}
export interface Bounce {permanent:boolean;status:string;recipient:string|null;originalMessageId:string|null;diagnostic:string}
interface FactBase {eventId:string;hash:string;occurredAt:string;subject:string;participants:Participant[];headers:string;body:string;quote:string[]}
export interface MessageFact extends FactBase {
 kind:'message';messageId:string;sender:Mailbox|null;references:string;autoReply:boolean;
 bounce:Bounce|null;forwarded:Mailbox|null;unsubscribe:string|null;phone:{value:string;line:string}|null;senderLine:string;
}
export interface EventFact extends FactBase {kind:'event';uid:string;sequence:number;phase:'booked'|'completed'|'cancelled';start:string|null;end:string|null}
export type Fact = MessageFact | EventFact;
export type Read = {fact:Fact} | {skip:string};

const hashed=async(prefix:string,value:string)=>`${prefix}:${await payloadHash(value)}`;
// A changed copy is one whose words changed; line endings and trailing spaces are transport.
const canonical=(raw:string)=>raw.replace(/\r\n?/g,'\n').split('\n').map(line=>line.replace(/[ \t]+$/,'')).join('\n').replace(/\n+$/,'');
const limit=(text:string,size:number)=>text.length>size?text.slice(0,size):text;

/** The lines a person wrote in this message: no quoted history, no signature, at most three. */
export function freshLines(text:string){
 const lines:string[]=[];
 for(const line of text.split('\n')){
  if(/^(--|__)\s*$/.test(line)||/^On .{4,200} wrote:\s*$/.test(line)||/^-+\s*(Original|Forwarded) Message\s*-+$/i.test(line.trim())||/^Begin forwarded message:/i.test(line))break;
  if(line.startsWith('>')||!line.trim())continue;
  lines.push(limit(line.trim(),300));if(lines.length===3)break;
 }
 return lines;
}
function forwardedSender(text:string){
 const block=/(?:^-+\s*Forwarded message\s*-+$|^Begin forwarded message:)([\s\S]{0,2000})/im.exec(text);
 const from=block&&/^\s*From:\s*(.+)$/im.exec(block[1]!);
 return from?mailboxes(from[1]!)[0]??null:null;
}
function deliveryReport(status:string|undefined,returned:[string,string][]|undefined):Bounce|null{
 if(!status)return null;
 const field=(name:string)=>new RegExp(`^${name}:\\s*(.+)$`,'im').exec(status)?.[1]?.trim()??'';
 const code=field('Status'),action=field('Action').toLowerCase(),recipient=field('Final-Recipient').replace(/^rfc822;\s*/i,'').trim().toLowerCase();
 return {permanent:action==='failed'&&code.startsWith('5'),status:code,recipient:recipient||null,
  originalMessageId:returned?.find(([name])=>name==='message-id')?.[1]?.trim()??null,diagnostic:limit(field('Diagnostic-Code'),500)};
}
const unsubscribeRequest=/\b(unsubscribe|remove me from (your|this|the) (mailing )?list|stop (emailing|contacting|e-mailing) me|do not (email|e-mail|contact) me( again)?|opt[ -]?out)\b/i;

export async function readMessage(raw:string,now=Date.now()):Promise<Read>{
 const message=parseMessage(raw),messageId=message.header('message-id')?.trim()??'';
 if(!/^<[^<>\s]+>$/.test(messageId))return {skip:'No Message-ID, so it has no replay identity'};
 const date=Date.parse(message.header('date')??'');
 if(!Number.isFinite(date))return {skip:'No valid Date header'};
 if(date>now+300000)return {skip:'Dated in the future'};
 const sender=mailboxes(message.header('from'))[0]??null,text=message.text,fresh=freshLines(text),subject=limit(message.header('subject')??'',2000);
 const contentType=parameters(message.header('content-type')),autoSubmitted=(message.header('auto-submitted')??'no').toLowerCase();
 const autoReply=autoSubmitted!=='no'&&!contentType.params['report-type']||Boolean(message.header('x-autoreply')||message.header('x-autorespond'))||/auto[_-]reply/i.test(message.header('precedence')??'');
 const bounce=contentType.params['report-type']==='delivery-status'||message.deliveryStatus?deliveryReport(message.deliveryStatus,message.returnedHeaders):null;
 const forwarded=/^\s*(fwd?|fw)\s*:/i.test(subject)?forwardedSender(text):null;
 const participants:Participant[]=[...(sender?[{...sender,role:'from' as const}]:[]),...mailboxes(message.headerAll('to').join(',')).map(m=>({...m,role:'to' as const})),...mailboxes(message.headerAll('cc').join(',')).map(m=>({...m,role:'cc' as const})),...(forwarded?[{...forwarded,role:'forwarded' as const}]:[])];
 const unsubscribe=[subject,...fresh].find(line=>unsubscribeRequest.test(line))??null;
 const phoneLine=text.split('\n').map(line=>line.trim()).find(line=>/^(tel|phone|mobile|cell|direct)\s*[:.]\s*\+?\d[\d ().-]{6,}\d$/i.test(line));
 const headers=limit(message.headers.map(([name,value])=>`${name}: ${value}`).join('\n'),32768);
 return {fact:{kind:'message',eventId:await hashed('message',messageId),hash:await payloadHash(canonical(raw)),occurredAt:new Date(date).toISOString(),subject,participants,headers,body:limit(text,100000),
  quote:fresh,messageId,sender,references:[...message.headerAll('in-reply-to'),...message.headerAll('references')].join(' '),autoReply,bounce,forwarded,
  unsubscribe,phone:phoneLine?{value:phoneLine.replace(/^[^:.]+[:.]\s*/,'').replace(/\s+/g,' '),line:phoneLine}:null,senderLine:limit(`From: ${message.header('from')??''}`,500)}};
}

export async function readCalendar(raw:string,now=Date.now()):Promise<Read[]>{
 return Promise.all(parseCalendar(raw).map(async (event):Promise<Read>=>{
  if('error' in event)return {skip:event.error};
  if(!event.uid)return {skip:'Calendar event has no UID, so it has no replay identity'};
  const cancelled=event.status==='CANCELLED'||event.method==='CANCEL',ended=event.end??event.start;
  const phase=cancelled?'cancelled':ended&&Date.parse(ended)<=now?'completed':'booked';
  const occurredAt=phase==='cancelled'?event.lastModified??event.stamp:phase==='completed'?ended:event.created??event.stamp;
  if(!occurredAt)return {skip:'Calendar event has no time for what happened'};
  if(Date.parse(occurredAt)>now+300000)return {skip:'Dated in the future'};
  const participants:Participant[]=[...(event.organizer?[{...event.organizer,role:'organizer' as const}]:[]),...event.attendees.map(a=>({...a,role:'attendee' as const}))];
  const when=[event.start&&`Starts ${event.start}`,event.end&&`Ends ${event.end}`].filter((line):line is string=>Boolean(line));
  return {fact:{kind:'event',eventId:await hashed('event',[event.uid,event.recurrenceId??'',event.sequence,phase].join('\n')),hash:await payloadHash(canonical(event.method+'\n'+event.raw)),
   occurredAt,subject:limit(event.summary||'Meeting',2000),participants,headers:limit(`METHOD: ${event.method}\nUID: ${event.uid}\nSEQUENCE: ${event.sequence}\nSTATUS: ${event.status}`,32768),body:limit(event.raw,100000),
   quote:[limit(event.summary,300),...when].filter(Boolean),uid:event.uid,sequence:event.sequence,phase,start:event.start,end:event.end}};
 }));
}

export async function readItem(item:CaptureItem,now=Date.now()):Promise<Read[]>{
 return item.kind==='message'?[await readMessage(item.raw,now)]:readCalendar(item.raw,now);
}
