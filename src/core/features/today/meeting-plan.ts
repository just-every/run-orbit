import {companyDomainKey,contactEmailKey} from '../records/identity';
import type {BriefLine,RecordRef} from './types';
import {buildBrief,withinGrant} from './brief';
import {TodayError} from './errors';
import {entryHref,planHref,recordHref} from './links';
import {signalLinks} from './signal-lines';

const interactionKinds="(t.kind IN ('signal.recorded','action.completed','draft.created') OR t.kind LIKE 'manual.%' OR t.kind LIKE 'handoff.%' OR t.kind LIKE 'message%' OR t.kind LIKE 'outbound%')";
const refKey=(ref:RecordRef)=>`${ref.type}:${ref.id}`;
const kindLabels:Record<string,string>={'signal.recorded':'Customer signal','manual.note':'Note','manual.call':'Logged call','manual.meeting':'Logged meeting','action.completed':'Action completed or skipped','draft.created':'Draft started','handoff.updated':'Internal next action','handoff.accepted':'Accepted handoff','handoff.dismissed':'Dismissed handoff'};
const kindLabel=(kind:string)=>kindLabels[kind]??kind.replaceAll(/[._-]+/g,' ').replace(/^./,letter=>letter.toUpperCase());

export interface PlanLine {id:string;title:string;detail:string;occurredAt:string;href:string;evidence:{type:string;id:string};record:RecordRef}
export interface Attendee {email:string|null;contact:{id:string;name:string|null;jobTitle:string|null;contactability:string;href:string};company:{id:string;name:string;href:string}|null;opportunities:{id:string;title:string;href:string}[]}
export interface UnresolvedAttendee {email:string;company:{id:string;name:string}|null}

/** The meeting signal and the records it is linked to; a meeting with no linked record cannot be planned. */
export async function meetingContext(db:D1Database,signalId:string){
 const signal=await db.prepare("SELECT s.id,s.type,s.subject,s.occurred_at AS occurredAt,s.payload_json AS payload,ss.name AS sourceName FROM signals s JOIN signal_sources ss ON ss.id=s.source_id WHERE s.id=? AND s.type IN ('meeting.booked','meeting.completed','meeting.cancelled')").bind(signalId).first<{id:string;type:string;subject:string|null;occurredAt:string;payload:string|null;sourceName:string}>();
 if(!signal)throw new TodayError(404,'That meeting does not exist.');
 const links=(await signalLinks(db,[signalId])).get(signalId)??[];
 if(!links.length)throw new TodayError(409,'This meeting is not linked to a record yet. Review it under Sources first.');
 let data:Record<string,unknown>={};try{const payload=JSON.parse(signal.payload??'{}') as {data?:unknown};if(payload.data&&typeof payload.data==='object')data=payload.data as Record<string,unknown>;}catch{/* a signal without a JSON payload carries no meeting details */}
 const text=(value:unknown)=>typeof value==='string'&&value?value:null;
 const participants=Array.isArray(data.participants)?data.participants.filter((value):value is string=>typeof value==='string'):[];
 const noteTarget=links.find(ref=>ref.type==='opportunity')??links.find(ref=>ref.type==='company')??links[0]!;
 return {signal,links,participants,start:text(data.start),end:text(data.end),noteTarget};
}

async function attendees(db:D1Database,participants:string[],linked:RecordRef[]){
 const operators=new Set((await db.prepare('SELECT lower(trim(email)) AS email FROM operators').all<{email:string}>()).results.map(row=>row.email));
 const keys=[...new Set(participants.map(email=>contactEmailKey(email)).filter((key):key is string=>Boolean(key)&&!operators.has(key!)))];
 const matched=(await db.prepare(`SELECT c.id,c.email_key AS key FROM contacts c WHERE c.email_key IN (SELECT value FROM json_each(?1))
  UNION SELECT c.id,a.identity_key AS key FROM record_aliases a JOIN contacts c ON c.id=a.survivor_id WHERE a.record_type='contact' AND a.identity_key IN (SELECT value FROM json_each(?1))`).bind(JSON.stringify(keys)).all<{id:string;key:string}>()).results;
 const byKey=new Map(matched.map(row=>[row.key,row.id]));
 const contactIds=[...new Set([...matched.map(row=>row.id),...linked.filter(ref=>ref.type==='contact').map(ref=>ref.id)])];
 const contacts=(await db.prepare('SELECT c.id,c.name,c.email,c.job_title AS jobTitle,c.contactability,c.company_id AS companyId,co.name AS companyName FROM contacts c LEFT JOIN companies co ON co.id=c.company_id WHERE c.id IN (SELECT value FROM json_each(?)) ORDER BY c.name,c.id').bind(JSON.stringify(contactIds)).all<{id:string;name:string|null;email:string|null;jobTitle:string|null;contactability:string;companyId:string|null;companyName:string|null}>()).results;
 const opportunities=(await db.prepare("SELECT oc.contact_id AS contactId,o.id,o.title FROM opportunity_contacts oc JOIN opportunities o ON o.id=oc.opportunity_id WHERE o.lifecycle='open' AND oc.contact_id IN (SELECT value FROM json_each(?)) ORDER BY o.title,o.id").bind(JSON.stringify(contactIds)).all<{contactId:string;id:string;title:string}>()).results;
 const resolved:Attendee[]=contacts.map(contact=>({email:contact.email,contact:{id:contact.id,name:contact.name,jobTitle:contact.jobTitle,contactability:contact.contactability,href:recordHref({type:'contact',id:contact.id})},
  company:contact.companyId?{id:contact.companyId,name:contact.companyName??'Company',href:recordHref({type:'company',id:contact.companyId})}:null,
  opportunities:opportunities.filter(row=>row.contactId===contact.id).map(row=>({id:row.id,title:row.title,href:recordHref({type:'opportunity',id:row.id})}))}));
 const settings=await db.prepare("SELECT free_mail_domains_json AS free FROM workspace_settings WHERE id='workspace'").first<{free:string}>(),free=JSON.parse(settings?.free??'[]') as string[];
 const unresolved:UnresolvedAttendee[]=[];
 for(const key of keys.filter(key=>!byKey.has(key))){
  const domain=companyDomainKey(key.split('@')[1],free),company=domain?await db.prepare('SELECT id,name FROM companies WHERE primary_domain_key=?').bind(domain).first<{id:string;name:string}>():null;
  unresolved.push({email:key,company:company??null});
 }
 return {resolved,unresolved};
}

async function opportunitiesFor(db:D1Database,ids:string[]){
 return (await db.prepare('SELECT o.id,o.title,o.lifecycle,o.value_cents AS valueCents,p.name AS stage,op.display_name AS owner FROM opportunities o JOIN pipeline_stages p ON p.id=o.stage_id LEFT JOIN operators op ON op.id=o.owner_id WHERE o.id IN (SELECT value FROM json_each(?)) ORDER BY o.title,o.id').bind(JSON.stringify(ids)).all<{id:string;title:string;lifecycle:string;valueCents:number;stage:string;owner:string|null}>()).results.map(row=>({...row,href:recordHref({type:'opportunity',id:row.id})}));
}

async function interactions(db:D1Database,refs:RecordRef[],allowed:(ref:RecordRef)=>boolean):Promise<PlanLine[]>{
 const keys=new Set(refs.map(refKey));
 const rows=(await db.prepare(`SELECT t.id,t.kind,t.occurred_at AS occurredAt,t.payload_json AS payload,(SELECT json_group_array(json_object('type',a.record_type,'id',a.record_id)) FROM timeline_entry_records a WHERE a.timeline_entry_id=t.id) AS records FROM timeline_entries t
  WHERE EXISTS(SELECT 1 FROM timeline_entry_records r WHERE r.timeline_entry_id=t.id AND r.record_type||':'||r.record_id IN (SELECT value FROM json_each(?))) AND ${interactionKinds} ORDER BY t.occurred_at DESC,t.id LIMIT 200`).bind(JSON.stringify([...keys])).all<{id:string;kind:string;occurredAt:string;payload:string;records:string}>()).results;
 const lines:PlanLine[]=[];
 for(const row of rows){
  const records=JSON.parse(row.records) as RecordRef[],record=records.find(ref=>keys.has(refKey(ref))&&allowed(ref));
  if(!record||!withinGrant(records,allowed))continue;
  const payload=JSON.parse(row.payload) as Record<string,unknown>,text=typeof payload.text==='string'?payload.text.split('\n')[0]:null;
  lines.push({id:`entry:${row.id}`,title:(typeof payload.subject==='string'&&payload.subject)||text||kindLabel(row.kind),detail:kindLabel(row.kind),occurredAt:row.occurredAt,href:entryHref(record,row.id),evidence:{type:'timeline',id:row.id},record});
  if(lines.length===8)break;
 }
 return lines;
}

export async function planNote(db:D1Database,signalId:string,target:RecordRef){
 const row=await db.prepare("SELECT t.id,t.payload_json AS payload,t.recorded_at AS recordedAt FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id WHERE r.record_type=? AND r.record_id=? AND t.kind='manual.note' AND json_extract(t.payload_json,'$.plan.meetingSignalId')=? ORDER BY t.recorded_at DESC,t.id LIMIT 1").bind(target.type,target.id,signalId).first<{id:string;payload:string;recordedAt:string}>();
 if(!row)return null;
 const plan=(JSON.parse(row.payload) as {plan:{agenda:string;prep:string}}).plan;
 return {entryId:row.id,agenda:plan.agenda,prep:plan.prep,href:entryHref(target,row.id)};
}

/** Everything a person needs before a meeting, each line citing the record or timeline entry it rests on. */
export async function buildMeetingPlan(db:D1Database,signalId:string,input:{operatorId:string;now?:Date;allowed?:(ref:RecordRef)=>boolean}){
 const context=await meetingContext(db,signalId),{signal}=context,allowed=input.allowed??(()=>true),links=context.links.filter(allowed);
 // An application sees only its granted records: no company guessed from an unknown address, none it was not granted.
 const found=await attendees(db,context.participants,context.links),people={
  resolved:found.resolved.filter(person=>allowed({type:'contact',id:person.contact.id})).map(person=>({...person,company:person.company&&allowed({type:'company',id:person.company.id})?person.company:null,opportunities:person.opportunities.filter(o=>allowed({type:'opportunity',id:o.id}))})),
  unresolved:input.allowed?found.unresolved.map(person=>({email:person.email,company:null})):found.unresolved};
 const opportunityIds=[...new Set([...links.filter(ref=>ref.type==='opportunity').map(ref=>ref.id),...people.resolved.flatMap(person=>person.opportunities.map(o=>o.id))])];
 const opportunities=(await opportunitiesFor(db,opportunityIds)).map(row=>({...row,linked:links.some(ref=>ref.type==='opportunity'&&ref.id===row.id)}));
 const refs:RecordRef[]=[...links,...people.resolved.map(p=>({type:'contact' as const,id:p.contact.id})),...people.resolved.flatMap(p=>p.company?[{type:'company' as const,id:p.company.id}]:[]),...opportunityIds.map(id=>({type:'opportunity' as const,id}))];
 const keys=new Set(refs.map(refKey)),brief=await buildBrief(db,{operatorId:input.operatorId,now:input.now,visible:input.allowed?{record:allowed,signal:()=>false}:undefined});
 const promises=brief.accounts.flatMap(account=>account.lines).filter((line:BriefLine)=>(line.group==='promise'||line.group==='proposal')&&line.records.some(ref=>keys.has(refKey(ref))));
 const noteTarget=allowed(context.noteTarget)?context.noteTarget:links.find(ref=>ref.type==='opportunity')??links[0]??null;
 return {
  meeting:{signalId:signal.id,status:signal.type.split('.')[1],subject:signal.subject??'Meeting',occurredAt:signal.occurredAt,start:context.start,end:context.end,source:signal.sourceName,
   href:noteTarget?recordHref(noteTarget):planHref(signal.id)},
  attendees:people.resolved,unresolved:people.unresolved,opportunities,primaryOpportunityId:links.find(ref=>ref.type==='opportunity')?.id??null,
  openValueCents:opportunities.filter(row=>row.lifecycle==='open').reduce((sum,row)=>sum+row.valueCents,0),
  interactions:await interactions(db,refs,allowed),promises,noteTarget,note:noteTarget?await planNote(db,signalId,noteTarget):null,
 };
}
export type MeetingPlan=Awaited<ReturnType<typeof buildMeetingPlan>>;
