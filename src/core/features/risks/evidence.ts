import {readOpportunityContext} from '../relationships/opportunity';
import {customerSignalSql} from '../signals/test-events';
import {RecordError} from '../records/shared';
import type {OpportunityContext} from '../relationships/contracts';

/** One recorded fact a finding may cite. `ref` is the record, entry, signal, draft or handoff it lives on. */
export interface Evidence {id:string;ref:string;label:string;text:string;occurredAt:string|null;confidence:'observed'|'inferred';href:string}
export interface DealEvidence {deal:{id:string;title:string;lifecycle:string;stage:string|null;valueCents:number|null;expectedCloseAt:string|null};context:OpportunityContext;evidence:Evidence[];lastSend:{entryId:string;messageId:string;subject:string;approvedAt:string;contact:string|null;opens:string[]}|null;stage:{evidenceId:string;since:string;intervalDays:number};overdueTasks:string[]}

const roleText={champion:'Champion',decision_maker:'Decision maker',evaluator:'Evaluator',procurement:'Procurement',other:'Other'} as const;
const usd=(cents:number)=>`USD ${(cents/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;

/** Gathers the deal's current recorded evidence: fields, buying context, manual calls/meetings/notes, customer replies, approved sends and provider open reports. */
export async function dealEvidence(db:D1Database,id:string):Promise<DealEvidence>{
 const deal=await db.prepare("SELECT o.id,o.title,o.lifecycle,o.value_cents AS valueCents,o.expected_close_at AS expectedCloseAt,s.name AS stage,o.created_at AS createdAt,COALESCE(r.stale_interval_days,w.stale_interval_days) AS intervalDays FROM opportunities o LEFT JOIN pipeline_stages s ON s.id=o.stage_id LEFT JOIN pipeline_stage_rules r ON r.stage_id=o.stage_id JOIN workspace_settings w ON w.id='workspace' WHERE o.id=?").bind(id).first<DealEvidence['deal']&{createdAt:string;intervalDays:number}>();
 if(!deal)throw new RecordError(404,'Opportunity not found.');
 const context=await readOpportunityContext(db,id),href=`/app/opportunities/${id}`,evidence:Evidence[]=[];
 const field=(part:string,label:string,text:string)=>evidence.push({id:`${id}#${part}`,ref:id,label,text,occurredAt:null,confidence:'observed',href});
 if(deal.valueCents!==null)field('amount','Deal amount',usd(deal.valueCents));
 if(deal.expectedCloseAt)field('close','Expected close date',deal.expectedCloseAt.slice(0,10));
 field('roles','Recorded stakeholder roles',context.stakeholders.length?context.stakeholders.map(person=>`${person.name??person.email}: ${person.roles.length?person.roles.map(role=>roleText[role]).join(', '):'no role recorded'}${person.verified?' (confirmed)':''}`).join('; '):'No contacts associated');
 if(context.mutualCommitments)field('commitments','Mutual commitments',context.mutualCommitments);
 if(context.nextStep)field('next-step','Next step',context.nextStep);
 if(context.products.length)field('products','Products',context.products.join(', '));
 const contacts=JSON.stringify(context.stakeholders.map(person=>person.contactId));
 const [entries,replies,opens,send,moved,tasks]=await Promise.all([
  db.prepare("SELECT t.id,t.kind,t.occurred_at AS occurredAt,json_extract(t.payload_json,'$.text') AS text FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id WHERE r.record_type='opportunity' AND r.record_id=? AND t.kind IN ('manual.call','manual.meeting','manual.note') ORDER BY t.occurred_at DESC,t.id LIMIT 50").bind(id).all<{id:string;kind:string;occurredAt:string;text:string|null}>(),
  db.prepare(`SELECT DISTINCT s.id,s.subject,s.occurred_at AS occurredAt FROM signals s JOIN signal_links l ON l.signal_id=s.id WHERE s.type='email.replied' AND ${customerSignalSql()} AND ((l.record_type='opportunity' AND l.record_id=?1) OR (l.record_type='contact' AND l.record_id IN (SELECT value FROM json_each(?2)))) ORDER BY s.occurred_at DESC LIMIT 50`).bind(id,contacts).all<{id:string;subject:string|null;occurredAt:string}>(),
  db.prepare("SELECT t.id,t.occurred_at AS occurredAt,json_extract(t.payload_json,'$.messageId') AS messageId FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id WHERE r.record_type='opportunity' AND r.record_id=? AND t.kind='provider.open' ORDER BY t.occurred_at DESC LIMIT 50").bind(id).all<{id:string;occurredAt:string;messageId:string|null}>(),
  // A provider-accepted send carries its own deal timeline receipt, which is what a finding cites.
  db.prepare("SELECT t.id AS entryId,m.id AS messageId,m.subject,m.approved_at AS approvedAt,c.name AS contact FROM outbound_messages m JOIN timeline_entry_records r ON r.record_type='opportunity' AND r.record_id=m.opportunity_id JOIN timeline_entries t ON t.id=r.timeline_entry_id AND t.kind='message.accepted' AND json_extract(t.payload_json,'$.messageId')=m.id LEFT JOIN contacts c ON c.id=m.contact_id WHERE m.opportunity_id=? AND m.approved_at IS NOT NULL ORDER BY m.approved_at DESC,m.id LIMIT 1").bind(id).first<{entryId:string;messageId:string;subject:string;approvedAt:string;contact:string|null}>(),
  db.prepare("SELECT t.id,t.occurred_at AS occurredAt FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id WHERE r.record_type='opportunity' AND r.record_id=? AND t.kind='stage.changed' ORDER BY t.occurred_at DESC,t.id LIMIT 1").bind(id).first<{id:string;occurredAt:string}>(),
  db.prepare("SELECT id,title,due_at AS dueAt FROM sales_tasks WHERE opportunity_id=? AND status='open' AND due_at<? ORDER BY due_at LIMIT 50").bind(id,new Date().toISOString()).all<{id:string;title:string;dueAt:string}>()]);
 const kinds={'manual.call':'Logged call','manual.meeting':'Logged meeting','manual.note':'Note'} as Record<string,string>;
 for(const row of entries.results)if(row.text)evidence.push({id:row.id,ref:row.id,label:kinds[row.kind]!,text:row.text,occurredAt:row.occurredAt,confidence:'observed',href:`${href}#entry-${row.id}`});
 for(const row of replies.results)evidence.push({id:row.id,ref:row.id,label:'Customer reply',text:row.subject??'Customer reply',occurredAt:row.occurredAt,confidence:'observed',href});
 if(send)evidence.push({id:send.entryId,ref:send.entryId,label:'Accepted send',text:send.subject,occurredAt:send.approvedAt,confidence:'observed',href:`${href}#entry-${send.entryId}`});
 for(const row of opens.results)evidence.push({id:row.id,ref:row.id,label:'Provider open report (inferred; not proof a person read it)',text:'Open reported by the mail provider',occurredAt:row.occurredAt,confidence:'inferred',href:`${href}#entry-${row.id}`});
 for(const row of tasks.results)evidence.push({id:row.id,ref:id,label:'Overdue task, due',text:row.title,occurredAt:row.dueAt,confidence:'observed',href:`${href}#task-${row.id}`});
 const since=moved?.occurredAt??deal.createdAt;
 evidence.push({id:moved?.id??`${id}#stage`,ref:moved?.id??id,label:moved?'Stage change':'Deal created',text:`In ${deal.stage??'its stage'} since ${since.slice(0,10)}`,occurredAt:since,confidence:'observed',href:moved?`${href}#entry-${moved.id}`:href});
 const {createdAt:_,intervalDays,...dealFields}=deal;
 return {deal:dealFields,stage:{evidenceId:moved?.id??`${id}#stage`,since,intervalDays},overdueTasks:tasks.results.map(row=>row.id),context,evidence,lastSend:send?{...send,opens:opens.results.filter(row=>row.messageId===send.messageId).map(row=>row.id)}:null};
}
