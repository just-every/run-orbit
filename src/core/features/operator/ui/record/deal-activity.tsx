import type {ReactNode} from 'react';
import {Link,useRouterState} from '@tanstack/react-router';
import type {OperatorDraft,OpportunityDetail} from '../operator-api';
import {HandoffTasks} from '../handoff-tasks';
import {formatDateTime,label} from '../formatters';
import {Activity,Opens,type ActivityEntry} from './activity';
import {MessageTools,type DealMessage} from './message-tools';
import {timelineEntry} from './timeline-entries';
import {CallPanel,MeetingPanel,NotePanel} from './activity-panels';

export interface HandoffEntry{target:string;revision:string;audienceRevision:string;task:{id:string;title:string;description:string;assignee_id:string|null;due_at:string|null;status:string;source_client_id:string|null};evidence:unknown[]}
export interface DealMessages{messages:DealMessage[];mailProvider?:string;outcomesTracked:boolean;scheduler?:{ready:boolean;lastRunAt:string|null;failed:boolean}|null}

/** A message's kind in a word: one never sent does not read as Sent. */
const messageKind=(state:string)=>({scheduled:'Scheduled',cancelled:'Cancelled',draft:'Not sent'} as Record<string,string>)[state]??'Sent';
/** A sent message's state in words, in its own line; a scheduled one says when, to the exact instant. */
function messageState(message:DealMessage,tracked:boolean):ReactNode{
 if(message.state==='accepted')return message.deliveredAt?'delivered':tracked?'accepted by the mail provider · delivery not confirmed':'accepted by the mail provider';
 if(message.state==='scheduled'){const at=message.scheduledAt??message.retryAfter;return at?<>will send <time dateTime={at}>{formatDateTime(at)}</time></>:'scheduled';}
 if(message.state==='failed')return `failed · not delivered${message.failure?` · ${message.failure}`:''}`;
 if(message.state==='draft')return 'not sent · the provider refused it';
 if(['queued','reconciling','delivery-unknown'].includes(message.state))return 'approved · the provider has not answered yet';
 return `${label(message.state).toLowerCase()}${message.failure?` · ${message.failure}`:''}`;
}

/** While a send waits, whether the hosted minute timer will send it or Orbit sends it when next used. */
function schedulerWords(scheduler:NonNullable<DealMessages['scheduler']>){
 if(scheduler.ready)return `Hosted minute timer active. Last completed: ${formatDateTime(scheduler.lastRunAt!)}.`;
 if(scheduler.failed)return 'The hosted timer failed. Due sends go out when Orbit is next used; check the deployment’s Worker errors.';
 if(scheduler.lastRunAt)return 'The hosted minute timer is overdue. Due sends go out when Orbit is next used until the timer resumes.';
 return 'Cloudflare has not started its timer yet. Due sends go out when Orbit is next used until Cloudflare starts its timer.';
}

/** A deal's activity: its drafts not yet sent, its messages, its timeline, its hand-off tasks and stage moves in one
 * list, with Log a call, Plan a meeting and Add a note. */
export function DealActivity({opportunity,drafts,messages,handoffs,reload}:{opportunity:OpportunityDetail;drafts:OperatorDraft[];messages:DealMessages|null;handoffs:HandoffEntry[];reload:()=>void}){
 // A cited hand-off (#handoff-<id>) opens its task.
 const hash=useRouterState({select:state=>state.location.hash});
 const names=new Map(opportunity.contacts.flatMap(contact=>{const name=contact.name??contact.email??'A contact';return [[contact.id,name],...(contact.email?[[contact.email.toLowerCase(),name]]:[])] as [string,string][];})),byEmail=new Map(opportunity.contacts.filter(contact=>contact.email).map(contact=>[contact.email!.toLowerCase(),contact.name??contact.email!]));
 const sent=new Set(messages?.messages.map(message=>message.draftId)??[]),messageIds=new Set(messages?.messages.map(message=>message.id)??[]);
 const to=(email:string)=>byEmail.get(email.toLowerCase())??email;
 const entries:ActivityEntry[]=[
  ...drafts.filter(draft=>!sent.has(draft.id)).map(draft=>({key:`draft-${draft.id}`,kind:'Draft',draft:true,title:<Link to="/app/drafts/$id" params={{id:draft.id}}>{draft.subject}</Link>,line:`To ${to(draft.recipientEmail)} · revision ${draft.revision} · not sent${draft.isStale?' · review needed':''}`,at:draft.updatedAt})),
  ...(messages?.messages??[]).map(message=>({key:`message-${message.id}`,kind:messageKind(message.state),title:message.subject,line:<>To {to(message.recipientEmail)} · {messageState(message,messages!.outcomesTracked)}</>,at:message.acceptedAt??message.scheduledAt??message.createdAt,tools:['scheduled','draft'].includes(message.state)?<MessageTools message={message} mailProvider={messages!.mailProvider} reload={reload}/>:null})),
  ...opportunity.timeline.filter(entry=>!(entry.kind.startsWith('message.')&&messageIds.has(String((entry.payload as any)?.messageId)))).map(entry=>timelineEntry({line:{...entry,signalType:opportunity.signals.find(signal=>signal.id===entry.id)?.type??null,payload:(entry.payload&&typeof entry.payload==='object'?entry.payload:{}) as Record<string,unknown>},kind:'opportunity',recordId:opportunity.id,contactNames:names,reload,onChanged:reload})).filter((entry):entry is ActivityEntry=>Boolean(entry)),
  ...handoffs.map(entry=>({key:`handoff-${entry.task.id}`,anchor:`handoff-${entry.task.id}`,kind:'Task',title:entry.task.title,line:[`Hand-off · ${label(entry.task.status).toLowerCase()}`,entry.task.source_client_id?`proposed by ${entry.task.source_client_id}`:'',entry.task.due_at?`due ${formatDateTime(entry.task.due_at)}`:''].filter(Boolean).join(' · '),at:entry.task.due_at,tools:<Opens summary="Open task" initiallyOpen={hash===`handoff-${entry.task.id}`}>{()=><HandoffTasks opportunityId={opportunity.id} only={entry.task.id} onChange={reload}/>}</Opens>})),
 ];
 const contacts=opportunity.contacts.map(contact=>({...contact,name:contact.name??undefined}));
 const waiting=messages?.scheduler&&messages.messages.some(message=>['scheduled','queued'].includes(message.state));
 return <Activity entries={entries} note={waiting?<p className="r-note" role="status">{schedulerWords(messages!.scheduler!)}</p>:null} actions={[
  {label:'Log a call',panel:<CallPanel kind="opportunity" id={opportunity.id} contacts={contacts} onSaved={reload}/>},
  {label:'Plan a meeting',panel:<MeetingPanel kind="opportunity" id={opportunity.id} contacts={opportunity.contacts} onChanged={reload}/>},
  {label:'Add a note',panel:<NotePanel opportunity={opportunity} contacts={contacts} reload={reload}/>},
 ]}/>;
}
