import {captureFences} from './fences';
import {rememberProviderKeys} from './provider-evidence';
import {createId} from '../../shared/ids';
import {companyDomainKey,contactEmailKey} from '../records/identity';
import {IngestionRepository} from '../ingestion/repository';
import {confidence,type SignalEvent} from '../ingestion/contracts';
import type {SignalTarget} from '../ingestion/linking-repository';
import {companyTargets} from './targets';
import {matchingReplyMessages} from '../outreach/reply-matching';
import type {Fact,Participant} from './facts';
import {proposalStatements,type ProposalDraft} from './proposals';
import {capturePrivacy} from './privacy';
import {CaptureError} from './contracts';

export interface CaptureSource {id:string;name:string;connection_id:string|null;lease?:string}
export interface Known {email:string;name:string;role:Participant['role'];contact:{id:string;name:string|null;phone:string|null;company_id:string|null}|null;company:{id:string;name:string}|null}
export type Outcome =
 | {result:'captured';signalId:string;type:string;attached:boolean;stopped:number;proposals:number;bounce:'permanent'|'transient'|null}
 | {result:'unlinked';signalId:string;type:string}
 | {result:'replayed'}
 | {result:'conflict'}
 | {result:'skipped';reason:string};

/** A held or attached signal's event, carrying every participant so contact erasure can find it. */
function signalEvent(fact:Fact,type:string,itemId:string,sender:string|undefined):SignalEvent{
 return {eventId:fact.eventId,type,subject:fact.subject,occurredAt:fact.occurredAt,...(sender?{email:sender}:{}),
  data:{captureItemId:itemId,participants:fact.participants.map(p=>p.email),quote:fact.quote,...(fact.kind==='event'?{start:fact.start,end:fact.end}:{})}};
}
export function evidenceSummary(fact:Fact,sourceName:string){
 const sender=fact.kind==='message'?fact.sender?.email??null:fact.participants.find(p=>p.role==='organizer')?.email??null;
 return {source:sourceName,sender,date:fact.occurredAt,subject:fact.subject,quote:fact.quote};
}

async function resolve(db:D1Database,participants:Participant[]):Promise<Known[]>{
 const operators=new Set((await db.prepare('SELECT lower(trim(email)) AS email FROM operators').all<{email:string}>()).results.map(row=>row.email));
 const settings=await db.prepare("SELECT free_mail_domains_json FROM workspace_settings WHERE id='workspace'").first<{free_mail_domains_json:string}>();
 const freeMail=JSON.parse(settings?.free_mail_domains_json??'[]') as string[],seen=new Set<string>(),known:Known[]=[];
 for(const person of participants){
  if(operators.has(person.email)||seen.has(person.email))continue;seen.add(person.email);
  const key=contactEmailKey(person.email),domain=companyDomainKey(person.email.split('@')[1],freeMail);
  // Exact keys only (RECORD-003): a mailbox or its retired alias, a primary domain or its retired alias. Never a name.
  const contacts=key?(await db.prepare(`SELECT id,name,phone,company_id FROM contacts WHERE email_key=? UNION
    SELECT c.id,c.name,c.phone,c.company_id FROM record_aliases a JOIN contacts c ON c.id=a.survivor_id WHERE a.record_type='contact' AND a.identity_key=?`).bind(key,key).all<NonNullable<Known['contact']>>()).results:[];
  const companies=domain?(await db.prepare(`SELECT id,name FROM companies WHERE primary_domain_key=? UNION
    SELECT c.id,c.name FROM record_aliases a JOIN companies c ON c.id=a.survivor_id WHERE a.record_type='company' AND a.identity_key=?`).bind(domain,domain).all<{id:string;name:string}>()).results:[];
  const contact=contacts.length===1?contacts[0]!:null;
  const company=contact?.company_id?await db.prepare('SELECT id,name FROM companies WHERE id=?').bind(contact.company_id).first<{id:string;name:string}>():companies.length===1?companies[0]!:null;
  known.push({email:person.email,name:person.name,role:person.role,contact,company:company??null});
 }
 return known;
}

function signalType(fact:Fact,sourceId:string,senderIsOperator:boolean){
 if(fact.kind==='event')return `meeting.${fact.phase}`;
 if(fact.bounce)return 'email.bounced';
 if(fact.autoReply)return `${sourceId}:email.auto_replied`;
 if(fact.forwarded)return `${sourceId}:email.forwarded`;
 return senderIsOperator?'email.sent':'email.replied';
}
// A reply or a booked meeting stops outreach to that person at once (OUT-007, ACTION-005); proposals wait.
function stopStatements(db:D1Database,contactIds:string[],reason:string,at:string){
 return contactIds.flatMap(id=>[
  db.prepare('UPDATE drafts SET is_stale=1,stale_reason=?,updated_at=? WHERE recipient_contact_id=?').bind(reason,at,id),
  db.prepare("UPDATE outbound_messages SET state='cancelled',failure=?,updated_at=? WHERE contact_id=? AND state='scheduled'").bind(reason,at,id),
 ]);
}
/** Why nobody in a message could be linked; an operator's own address is never a customer, even when a contact shares it. */
async function unknownReason(db:D1Database,participants:Participant[],operators:Set<string>){
 if(participants.length&&participants.every(person=>operators.has(person.email)))return 'All participants use operator addresses; internal operators are excluded from customer capture';
 for(const person of participants.filter(person=>operators.has(person.email))){
  const key=contactEmailKey(person.email);
  if(key&&await db.prepare('SELECT 1 FROM contacts WHERE email_key=?').bind(key).first())return `${person.email} is both a contact and an operator’s sign-in email. Orbit never files an operator’s own mail as customer mail. Give the contact or the operator a different email address, then add this message again`;
 }
 return 'No known contact or company domain';
}
/**
 * One captured message or calendar event, committed atomically: its signal and
 * evidence, any effect Orbit's own threading or delivery report makes certain,
 * the immediate stop for a reply or booking, and proposals for everything else.
 */
export async function intake(db:D1Database,source:CaptureSource,fact:Fact,options:{includeUnknown:boolean}):Promise<Outcome>{
 const ingestion=new IngestionRepository(db),existing=await db.prepare('SELECT id,payload_hash FROM signals WHERE source_id=? AND source_event_id=?').bind(source.id,fact.eventId).first<{id:string;payload_hash:string}>();
 if(existing){
  if(existing.payload_hash===fact.hash){if(fact.kind==='event'&&fact.providerKeys)await rememberProviderKeys(db,source,existing.id,fact.providerKeys);return {result:'replayed'};}
  await ingestion.reject(source.id,fact.eventId,'Captured item identity already carries different content',captureFences(db,source));return {result:'conflict'};
 }
 // Orbit's own inbound reply route may already have attached this exact message.
 // Only that route's receipt counts: a signal alone under its source ID is not proof.
 if(fact.kind==='message'&&await db.prepare("SELECT 1 FROM signals s JOIN unlinked_replies u ON u.provider_event_id=s.source_event_id AND u.opportunity_id IS NOT NULL WHERE s.source_id='sendgrid-replies' AND s.type='email.replied' AND s.source_event_id=?").bind(fact.messageId).first())return {result:'replayed'};
 const privacy=await capturePrivacy(db,fact);if(await privacy.blocked())return privacy.skipped;
 const operators=new Set((await db.prepare('SELECT lower(trim(email)) AS email FROM operators').all<{email:string}>()).results.map(row=>row.email));
 const senderIsOperator=fact.kind==='message'&&!!fact.sender&&operators.has(fact.sender.email);
 const participants=fact.kind==='message'&&fact.bounce?.recipient?[{email:fact.bounce.recipient,name:'',role:'to' as const}]:fact.participants;
 const known=(await resolve(db,participants)).filter(person=>person.contact||person.company);
 const type=signalType(fact,source.id,senderIsOperator),at=new Date().toISOString(),signalId=createId(),itemId=createId();
 const senderEmail=fact.kind==='message'?(fact.bounce?.recipient??fact.sender?.email):undefined;
 const event=signalEvent(fact,type,itemId,senderEmail),evidence=evidenceSummary(fact,source.name);
 event.data={...event.data,capturePrivacyKeys:privacy.keys};
 const contactIds=[...new Set(known.flatMap(person=>person.contact?[person.contact.id]:[]))];
 const statements:D1PreparedStatement[]=[...captureFences(db,source),...privacy.fences(),db.prepare("INSERT INTO runtime_controls(name,value) SELECT 'capture_contact_fence',NULL WHERE EXISTS(SELECT 1 FROM json_each(?) WHERE value NOT IN(SELECT id FROM contacts))").bind(JSON.stringify(contactIds))];
 const signal=(basis:string)=>db.prepare('INSERT INTO signals(id,source_id,source_event_id,type,subject,occurred_at,received_at,payload_hash,confidence,linking_basis,created_at,payload_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)')
  .bind(signalId,source.id,fact.eventId,type,fact.subject,fact.occurredAt,at,fact.hash,confidence(type),basis,at,JSON.stringify(event));
 const item=db.prepare('INSERT INTO capture_items(id,source_id,signal_id,kind,headers,body,captured_at) VALUES(?,?,?,?,?,?,?)').bind(itemId,source.id,signalId,fact.kind,fact.headers,fact.body,at);
 const counted=db.prepare('UPDATE capture_sources SET captured_count=captured_count+1,last_success_at=?,updated_at=? WHERE id=?').bind(at,at,source.id);
 if(!known.length){
  if(!options.includeUnknown)return {result:'skipped',reason:await unknownReason(db,participants,operators)};
  statements.push(signal('Unlinked'),item,db.prepare('INSERT INTO unlinked_signals(signal_id,reason) VALUES(?,?)').bind(signalId,'Captured from a sender with no known contact or company'),counted);
  return commit(db,statements,source,fact,{result:'unlinked',signalId,type});
 }

 // Certain links: a reply threaded to an Orbit send (OUT-004), or a delivery report for one (RECORD-012).
 let attached:SignalTarget[]|null=null,bounce:'permanent'|'transient'|null=null;
 if(fact.kind==='message'&&fact.sender&&(type==='email.replied'||type.endsWith(':email.auto_replied'))&&fact.references){
  const messages=await matchingReplyMessages(db,fact.sender.email,fact.references);
  if(messages.length){const opportunity=messages[0]!.opportunity_id,contacts=[...new Set(messages.map(m=>m.contact_id))];
   attached=[{type:'opportunity',id:opportunity,basis:'Orbit message thread'},...contacts.map(id=>({type:'contact' as const,id,basis:'Verified reply sender'}))];}
 }
 if(fact.kind==='message'&&fact.bounce?.originalMessageId&&fact.bounce.recipient){
  const message=await db.prepare('SELECT id,opportunity_id,contact_id,state FROM outbound_messages WHERE message_id=? AND lower(trim(recipient_email))=?').bind(fact.bounce.originalMessageId,fact.bounce.recipient).first<{id:string;opportunity_id:string;contact_id:string|null;state:string}>();
  if(message){
   bounce=fact.bounce.permanent?'permanent':'transient';
   attached=[{type:'opportunity',id:message.opportunity_id,basis:'Delivery report for an Orbit send'},...(message.contact_id?[{type:'contact' as const,id:message.contact_id,basis:'Delivery report for an Orbit send'}]:[])];
   statements.push(db.prepare("UPDATE outbound_messages SET state='bounced',failure=?,updated_at=? WHERE id=? AND state IN('accepted','delivered')").bind(`${fact.bounce.status} ${fact.bounce.diagnostic}`.trim(),at,message.id));
   Object.assign(event,{permanentBounce:fact.bounce.permanent});delete event.email;
  }
 }
 let stopped:string[]=[];
 if(attached){
  attached=[...attached,...await companyTargets(db,attached)];
  statements.push(signal(attached[0]!.basis),item,...await ingestion.linkStatements(signalId,event,attached,source.id,at,'source',source.id,evidence),counted);
  stopped=type==='email.replied'?attached.filter(t=>t.type==='contact').map(t=>t.id):[];
 }else{
  statements.push(signal('Held for review'),item,counted);
  const senderContact=fact.kind==='message'&&fact.sender?known.find(p=>p.email===fact.sender!.email)?.contact:null;
  if(type==='email.replied'&&senderContact)stopped=[senderContact.id];
  if(type==='meeting.booked')stopped=known.filter(p=>p.contact).map(p=>p.contact!.id);
  statements.push(...stopStatements(db,stopped,type==='email.replied'?'Customer reply':'Meeting booked',at));
 }
 const drafts:ProposalDraft[]=await proposalsFor(db,fact,type,known,attached!==null,bounce,senderIsOperator,stopped);
 statements.push(...await proposalStatements(db,source.id,signalId,fact.eventId,evidence,drafts,at,fact.kind==='event'?fact:undefined));
 return commit(db,statements,source,fact,{result:'captured',signalId,type,attached:attached!==null,stopped:stopped.length,proposals:drafts.length,bounce});
}

async function commit(db:D1Database,statements:D1PreparedStatement[],source:CaptureSource,fact:Fact,outcome:Outcome):Promise<Outcome>{
 try{await db.batch(statements);return outcome;}
 catch(error){
  // The evidence and every effect rolled back together. Re-read anonymous proofs
  // so an erasure racing resolution is counted as an intentional privacy skip.
  if(/NOT NULL constraint failed: runtime_controls/.test(String(error))){
   const privacy=await capturePrivacy(db,fact);if(await privacy.blocked())return privacy.skipped;
   throw new CaptureError(409,'Capture authority or customer data changed; retry the item from the saved cursor.');
  }
  const raced=await db.prepare('SELECT payload_hash FROM signals WHERE source_id=? AND source_event_id=?').bind(source.id,fact.eventId).first<{payload_hash:string}>();
  if(raced)return raced.payload_hash===fact.hash?{result:'replayed'}:{result:'conflict'};
  throw error;
 }
}

/** What a person may accept. Exact keys only; never bought data, never a guessed identity. */
async function proposalsFor(db:D1Database,fact:Fact,type:string,known:Known[],attached:boolean,bounce:'permanent'|'transient'|null,senderIsOperator:boolean,stopped:string[]):Promise<ProposalDraft[]>{
 const drafts:ProposalDraft[]=[],contacts=known.filter(p=>p.contact),sender=fact.kind==='message'&&fact.sender?known.find(p=>p.email===fact.sender!.email&&p.contact):undefined;
 if(!attached){
  const primary=sender??contacts[0];
  const companyOnly=!contacts.length?known.find(p=>p.company)?.company:undefined;
  if(primary?.contact)drafts.push({kind:'link_signal',recordType:'contact',recordId:primary.contact.id,value:null,current:null,details:{contactIds:contacts.map(p=>p.contact!.id),names:contacts.map(p=>p.contact!.name??p.email),companyId:primary.company?.id??null}});
  else if(companyOnly)drafts.push({kind:'link_signal',recordType:'company',recordId:companyOnly.id,value:null,current:null,details:{contactIds:[],names:[companyOnly.name],companyId:companyOnly.id}});
 }
 for(const person of known.filter(p=>!p.contact&&p.company).slice(0,5))
  drafts.push({kind:'create_contact',recordType:'company',recordId:person.company!.id,field:'email',value:person.email,current:null,details:{name:person.name||null,companyId:person.company!.id,companyName:person.company!.name,quote:fact.kind==='message'?[fact.senderLine]:fact.quote}});
 if(sender?.contact&&!senderIsOperator&&fact.kind==='message'&&!fact.bounce&&!fact.autoReply){
  if(sender.name&&sender.name!==sender.contact.name)drafts.push({kind:'set_field',recordType:'contact',recordId:sender.contact.id,field:'name',value:sender.name,current:sender.contact.name,details:{companyId:sender.company?.id??null,quote:[fact.senderLine]}});
  if(fact.phone&&fact.phone.value!==sender.contact.phone)drafts.push({kind:'set_field',recordType:'contact',recordId:sender.contact.id,field:'phone',value:fact.phone.value,current:sender.contact.phone,details:{companyId:sender.company?.id??null,quote:[fact.phone.line]}});
  if(fact.unsubscribe)drafts.push({kind:'do_not_contact',recordType:'contact',recordId:sender.contact.id,field:'contactability',value:'do_not_contact',current:'contactable',details:{companyId:sender.company?.id??null,quote:[fact.unsubscribe]}});
 }
 if(fact.kind==='message'&&fact.bounce?.permanent&&bounce===null)for(const person of contacts)
  drafts.push({kind:'do_not_contact',recordType:'contact',recordId:person.contact!.id,field:'contactability',value:'do_not_contact',current:'contactable',details:{companyId:person.company?.id??null,quote:[`Status: ${fact.bounce.status}`,fact.bounce.diagnostic].filter(Boolean)}});
 // The next action a person may choose to take from this evidence (OPP-007): never applied by capture.
 const queue=type==='email.replied'&&!attached?{state:'now',reason:'Customer reply'}:type==='meeting.completed'?{state:'now',reason:'Meeting completed'}:type==='meeting.booked'?{state:'next',reason:'Meeting booked'}:null;
 const people=type==='email.replied'?(sender?[sender]:[]):type.startsWith('meeting.')?contacts:[];
 if(queue)for(const person of people){
  const rows=(await db.prepare("SELECT o.id,o.title,o.queue_state,o.queue_reason,o.company_id FROM opportunities o JOIN opportunity_contacts oc ON oc.opportunity_id=o.id WHERE oc.contact_id=? AND o.lifecycle='open' ORDER BY o.id").bind(person.contact!.id).all<{id:string;title:string;queue_state:string;queue_reason:string|null;company_id:string|null}>()).results;
  for(const row of rows.slice(0,5)){
   // A stopped scheduled send returns its opportunity to NOW in the same commit (OUT-009); propose against that state.
   if(stopped.length&&await db.prepare(`SELECT 1 FROM outbound_messages WHERE opportunity_id=? AND state='scheduled' AND contact_id IN(SELECT value FROM json_each(?))`).bind(row.id,JSON.stringify(stopped)).first())Object.assign(row,{queue_state:'now',queue_reason:type==='email.replied'?'Customer reply':'Meeting booked'});
   if(row.queue_state!==queue.state||row.queue_reason!==queue.reason)
   drafts.push({kind:'next_action',recordType:'opportunity',recordId:row.id,field:'queue',value:JSON.stringify({...queue,dueAt:queue.state==='next'&&fact.kind==='event'?fact.start:null}),current:JSON.stringify({state:row.queue_state,reason:row.queue_reason}),details:{title:row.title,companyId:row.company_id,quote:fact.quote}});
  }
 }
 return drafts.filter((draft,index)=>drafts.findIndex(other=>other.kind===draft.kind&&other.recordId===draft.recordId&&other.field===draft.field)===index);
}
