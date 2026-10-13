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
export interface EventFact extends FactBase {kind:'event';providerKeys?:string[];uid:string;recurrenceId:string|null;originalAt:string|null;sequence:number;phase:'booked'|'completed'|'cancelled';start:string|null;end:string|null}
export type Fact = MessageFact | EventFact;
export type Read = {fact:Fact} | {skip:string};

const hashed=async(prefix:string,value:string)=>`${prefix}:${await payloadHash(value)}`;
// A changed copy is one whose words changed; line endings and trailing spaces are transport.
function canonical(raw:string){
 const text=raw.replace(/\r\n?/g,'\n').split('\n').map(line=>{
  let end=line.length;while(end&&(line[end-1]===' '||line[end-1]==='\t'))end--;
  return line.slice(0,end);
 }).join('\n');
 let end=text.length;while(end&&text[end-1]==='\n')end--;
 return text.slice(0,end);
}
const limit=(text:string,size:number)=>text.length>size?text.slice(0,size):text;

/** All sender-written lines, before quoted/forwarded history or a signature. */
export function freshLines(text:string){
 const lines:string[]=[],source=text.split('\n');
 for(let index=0;index<source.length;index++){
  const line=source[index]!,trimmed=line.trim();
  if(/^(--|__)\s*$/.test(trimmed)||/^On .+ wrote:\s*$/i.test(trimmed)||/^-+\s*(Original|Forwarded) Message\s*-+$/i.test(trimmed)||/^Begin forwarded message:/i.test(trimmed))break;
  if(/^From:/i.test(trimmed)){
   let next=index+1;while(next<source.length&&!source[next]!.trim())next++;
   if(/^(Sent|Date):/i.test(source[next]?.trim()??''))break;
  }
  if(trimmed.startsWith('>')||!trimmed)continue;
  lines.push(line);
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
function unsubscribeQuote(lines:string[]){
 for(const line of lines){
  const match=unsubscribeRequest.exec(line);if(!match)continue;
  // Search the entire fresh line, but save only the request and nearby context.
  const start=Math.max(0,match.index-100),end=Math.min(line.length,match.index+match[0].length+100);
  return `${start?'…':''}${line.slice(start,end).trim()}${end<line.length?'…':''}`;
 }
 return null;
}

export async function readMessage(raw:string,now=Date.now()):Promise<Read>{
 const message=parseMessage(raw),messageId=message.header('message-id')?.trim()??'';
 if(!/^<[^<>\s]+>$/.test(messageId))return {skip:'No Message-ID, so it has no replay identity'};
 const date=Date.parse(message.header('date')??'');
 if(!Number.isFinite(date))return {skip:'No valid Date header'};
 if(date>now+300000)return {skip:'Dated in the future'};
 const sender=mailboxes(message.rawHeader('from'))[0]??null,text=message.text,fresh=freshLines(text),subject=limit(message.header('subject')??'',2000);
 const contentType=parameters(message.header('content-type')),autoSubmitted=(message.header('auto-submitted')??'no').toLowerCase();
 const autoReply=autoSubmitted!=='no'&&!contentType.params['report-type']||Boolean(message.header('x-autoreply')||message.header('x-autorespond'))||/auto[_-]reply/i.test(message.header('precedence')??'');
 const bounce=contentType.params['report-type']==='delivery-status'||message.deliveryStatus?deliveryReport(message.deliveryStatus,message.returnedHeaders):null;
 const forwarded=/^\s*(fwd?|fw)\s*:/i.test(subject)?forwardedSender(text):null;
 const participants:Participant[]=[...(sender?[{...sender,role:'from' as const}]:[]),...mailboxes(message.rawHeaderAll('to').join(',')).map(m=>({...m,role:'to' as const})),...mailboxes(message.rawHeaderAll('cc').join(',')).map(m=>({...m,role:'cc' as const})),...(forwarded?[{...forwarded,role:'forwarded' as const}]:[])];
 const unsubscribe=unsubscribeQuote([message.header('subject')??'',...fresh]);
 const phoneLine=fresh.find(line=>/^(tel|phone|mobile|cell|direct)\s*[:.]\s*\+?\d[\d ().-]{6,}\d$/i.test(line.trim()));
 const headers=limit(message.headers.map(([name,value])=>`${name}: ${value}`).join('\n'),32768);
 return {fact:{kind:'message',eventId:await hashed('message',messageId),hash:await payloadHash(canonical(raw)),occurredAt:new Date(date).toISOString(),subject,participants,headers,body:limit(text,100000),
  quote:fresh.slice(0,3).map(line=>limit(line.trim(),300)),messageId,sender,references:[...message.headerAll('in-reply-to'),...message.headerAll('references')].join(' '),autoReply,bounce,forwarded,
  unsubscribe,phone:phoneLine?{value:phoneLine.replace(/^[^:.]+[:.]\s*/,'').replace(/\s+/g,' ').trim(),line:phoneLine}:null,senderLine:limit(`From: ${message.header('from')??''}`,500)}};
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
  const phaseId=(value:string)=>hashed('event',[event.uid,event.recurrenceId??'',event.sequence,value,...(event.revision?[event.revision]:[])].join('\n'));
  return {fact:{kind:'event',eventId:await phaseId(phase),hash:await payloadHash(canonical(event.method+'\n'+event.raw)),
   occurredAt,subject:limit(event.summary||'Meeting',2000),participants,headers:limit(`METHOD: ${event.method}\nUID: ${event.uid}\nSEQUENCE: ${event.sequence}\nSTATUS: ${event.status}${event.revision?`\nX-ORBIT-PROVIDER-REVISION: ${event.revision}`:''}`,32768),body:limit(event.raw,100000),
   quote:[limit(event.summary,300),...when].filter(Boolean),uid:event.uid,recurrenceId:event.recurrenceId,originalAt:event.created??event.stamp,sequence:event.sequence,phase,start:event.start,end:event.end}};
 }));
}

export async function readItem(item:CaptureItem,now=Date.now()):Promise<Read[]>{
 return item.kind==='skip'?[{skip:item.reason}]:item.kind==='message'?[await readMessage(item.raw,now)]:readCalendar(item.raw,now);
}
