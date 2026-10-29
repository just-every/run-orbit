import {useState,type ReactNode} from 'react';
import {Link} from '@tanstack/react-router';
import type {OperatorDraft,OpportunityDetail} from '../operator-api';
import {HandoffTasks} from '../handoff-tasks';
import {formatDateTime,label} from '../formatters';
import {Activity,type ActivityEntry} from './activity';
import {MessageTools,type DealMessage} from './message-tools';
import {timelineEntry} from './timeline-entries';
import {CallPanel,MeetingPanel,NotePanel} from './activity-panels';

export interface HandoffEntry{target:string;revision:string;audienceRevision:string;task:{id:string;title:string;description:string;assignee_id:string|null;due_at:string|null;status:string;source_client_id:string|null};evidence:unknown[]}
export interface DealMessages{messages:DealMessage[];mailProvider?:string;outcomesTracked:boolean}

/** A sent message's state in words, in its own line. */
function messageState(message:DealMessage,tracked:boolean){
 if(message.state==='accepted')return message.deliveredAt?'delivered':tracked?'accepted by the mail provider · delivery not confirmed':'accepted by the mail provider';
 if(message.state==='scheduled')return `will send ${formatDateTime(message.retryAfter??message.scheduledAt)}`;
 if(message.state==='failed')return `failed · not delivered${message.failure?` · ${message.failure}`:''}`;
 if(message.state==='draft')return 'not sent · the provider refused it';
 if(['queued','reconciling','delivery-unknown'].includes(message.state))return 'approved · the provider has not answered yet';
 return label(message.state).toLowerCase();
}

/** Only renders what it holds while open, so a closed row loads nothing. */
function Opens({summary,children}:{summary:string;children:()=>ReactNode}){
 const [open,setOpen]=useState(false);
 return <details onToggle={event=>setOpen(event.currentTarget.open)}><summary>{summary}</summary>{open?children():null}</details>;
}

/** A deal's activity: its drafts not yet sent, its messages, its timeline, its hand-off tasks and stage moves in one
 * list, with Log a call, Plan a meeting and Add a note. */
export function DealActivity({opportunity,drafts,messages,handoffs,reload}:{opportunity:OpportunityDetail;drafts:OperatorDraft[];messages:DealMessages|null;handoffs:HandoffEntry[];reload:()=>void}){
 const names=new Map(opportunity.contacts.map(contact=>[contact.id,contact.name??contact.email??'A contact'])),byEmail=new Map(opportunity.contacts.filter(contact=>contact.email).map(contact=>[contact.email!.toLowerCase(),contact.name??contact.email!]));
 const sent=new Set(messages?.messages.map(message=>message.draftId)??[]),messageIds=new Set(messages?.messages.map(message=>message.id)??[]);
 const to=(email:string)=>byEmail.get(email.toLowerCase())??email;
 const entries:ActivityEntry[]=[
  ...drafts.filter(draft=>!sent.has(draft.id)).map(draft=>({key:`draft-${draft.id}`,kind:'Draft',draft:true,title:<Link to="/app/drafts/$id" params={{id:draft.id}}>{draft.subject}</Link>,line:`To ${to(draft.recipientEmail)} · revision ${draft.revision} · not sent${draft.isStale?' · review needed':''}`,at:draft.updatedAt})),
  ...(messages?.messages??[]).map(message=>({key:`message-${message.id}`,kind:'Sent',title:message.subject,line:`To ${to(message.recipientEmail)} · ${messageState(message,messages!.outcomesTracked)}`,at:message.acceptedAt??message.scheduledAt??message.createdAt,tools:['scheduled','draft'].includes(message.state)?<MessageTools message={message} mailProvider={messages!.mailProvider} reload={reload}/>:null})),
  ...opportunity.timeline.filter(entry=>!(entry.kind.startsWith('message.')&&messageIds.has(String((entry.payload as any)?.messageId)))).map(entry=>timelineEntry({line:{...entry,signalType:opportunity.signals.find(signal=>signal.id===entry.id)?.type??null,payload:(entry.payload&&typeof entry.payload==='object'?entry.payload:{}) as Record<string,unknown>},kind:'opportunity',recordId:opportunity.id,contactNames:names,reload,onChanged:reload})).filter((entry):entry is ActivityEntry=>Boolean(entry)),
  ...handoffs.map(entry=>({key:`handoff-${entry.task.id}`,anchor:`handoff-${entry.task.id}`,kind:'Task',title:entry.task.title,line:[`Hand-off · ${label(entry.task.status).toLowerCase()}`,entry.task.source_client_id?`proposed by ${entry.task.source_client_id}`:'',entry.task.due_at?`due ${formatDateTime(entry.task.due_at)}`:''].filter(Boolean).join(' · '),at:entry.task.due_at,tools:<Opens summary="Open task">{()=><HandoffTasks opportunityId={opportunity.id} only={entry.task.id} onChange={reload}/>}</Opens>})),
 ];
 const contacts=opportunity.contacts.map(contact=>({...contact,name:contact.name??undefined}));
 return <Activity entries={entries} actions={[
  {label:'Log a call',panel:<CallPanel kind="opportunity" id={opportunity.id} contacts={contacts} onSaved={reload}/>},
  {label:'Plan a meeting',panel:<MeetingPanel kind="opportunity" id={opportunity.id} contacts={opportunity.contacts} onChanged={reload}/>},
  {label:'Add a note',panel:<NotePanel opportunity={opportunity} contacts={contacts} reload={reload}/>},
 ]}/>;
}
