import {workingDaysAfter} from '../outreach/time';
import type {RecordRef} from './types';
import type {BriefPolicy} from './window';
import {signalEntries,signalLinks,type RawLine} from './signal-lines';
import {customerSignalSql} from '../signals/test-events';

const LOOKBACK_DAYS=120;
const followUp="(t.kind LIKE 'manual.%' OR t.kind IN ('action.completed','handoff.updated','handoff.accepted','draft.created'))";
// The seller's own answer captured from their mailbox: a linked sent message on the same contact or opportunity at or after the signal.
const capturedSent=`NOT EXISTS(SELECT 1 FROM signals sent JOIN signal_links sl ON sl.signal_id=sent.id JOIN signal_links l ON l.record_type=sl.record_type AND l.record_id=sl.record_id WHERE l.signal_id=s.id AND l.record_type IN ('contact','opportunity') AND sent.type='email.sent' AND ${customerSignalSql('sent')} AND sent.occurred_at>=s.occurred_at)`;

/**
 * Overdue promises, computed from records only:
 * an accepted internal next action or an opportunity's next action past its due time,
 * a customer reply left unanswered beyond the awaiting-response interval (an approved send, a logged call or meeting, a completed action or a captured sent message answers it),
 * a completed meeting with no next step logged after it, and an unsent draft left untouched beyond the workspace stale interval.
 */
export async function promiseLines(db:D1Database,now:Date,policy:BriefPolicy,limit:number):Promise<RawLine[]>{
 const at=now.toISOString(),from=new Date(now.getTime()-LOOKBACK_DAYS*86400000).toISOString();
 const [handoffs,nextActions,replies,meetings,drafts]=await Promise.all([
  db.prepare("SELECT h.id,h.title,h.due_at AS dueAt,h.opportunity_id AS opportunityId FROM handoff_tasks h JOIN opportunities o ON o.id=h.opportunity_id WHERE h.status='open' AND h.source_client_id IS NULL AND h.due_at IS NOT NULL AND h.due_at<? AND o.lifecycle='open' ORDER BY h.due_at LIMIT ?").bind(at,limit).all<{id:string;title:string;dueAt:string;opportunityId:string}>(),
  db.prepare("SELECT id,title,queue_reason AS reason,next_due_at AS dueAt FROM opportunities WHERE lifecycle='open' AND queue_state='next' AND next_due_at IS NOT NULL AND next_due_at<? ORDER BY next_due_at LIMIT ?").bind(at,limit).all<{id:string;title:string;reason:string|null;dueAt:string}>(),
  db.prepare(`SELECT s.id,s.subject,s.occurred_at AS occurredAt FROM signals s WHERE s.type='email.replied' AND ${customerSignalSql()} AND s.occurred_at>=? AND s.occurred_at<=?
   AND EXISTS(SELECT 1 FROM signal_links l WHERE l.signal_id=s.id)
   AND NOT EXISTS(SELECT 1 FROM signal_links l JOIN outbound_messages m ON (l.record_type='opportunity' AND m.opportunity_id=l.record_id) OR (l.record_type='contact' AND m.contact_id=l.record_id) WHERE l.signal_id=s.id AND m.approved_at>=s.occurred_at AND m.state NOT IN ('cancelled','failed'))
   AND NOT EXISTS(SELECT 1 FROM signal_links l JOIN timeline_entry_records r ON r.record_type=l.record_type AND r.record_id=l.record_id JOIN timeline_entries t ON t.id=r.timeline_entry_id WHERE l.signal_id=s.id AND t.actor_type='operator' AND t.kind IN ('manual.call','manual.meeting','action.completed') AND t.recorded_at>=s.occurred_at)
   AND ${capturedSent}
   AND NOT EXISTS(SELECT 1 FROM signals later JOIN signal_links ll ON ll.signal_id=later.id JOIN signal_links l ON l.record_type=ll.record_type AND l.record_id=ll.record_id WHERE l.signal_id=s.id AND later.type='email.replied' AND ${customerSignalSql('later')} AND (later.occurred_at>s.occurred_at OR (later.occurred_at=s.occurred_at AND later.id>s.id)))
   ORDER BY s.occurred_at LIMIT ?`).bind(from,at,limit).all<{id:string;subject:string|null;occurredAt:string}>(),
  db.prepare(`SELECT s.id,s.subject,s.occurred_at AS occurredAt FROM signals s WHERE s.type='meeting.completed' AND ${customerSignalSql()} AND s.occurred_at>=? AND s.occurred_at<=?
   AND EXISTS(SELECT 1 FROM signal_links l WHERE l.signal_id=s.id)
   AND NOT EXISTS(SELECT 1 FROM signal_links l JOIN timeline_entry_records r ON r.record_type=l.record_type AND r.record_id=l.record_id JOIN timeline_entries t ON t.id=r.timeline_entry_id WHERE l.signal_id=s.id AND t.actor_type='operator' AND ${followUp} AND t.recorded_at>=s.occurred_at)
   AND NOT EXISTS(SELECT 1 FROM signal_links l JOIN outbound_messages m ON l.record_type='opportunity' AND m.opportunity_id=l.record_id WHERE l.signal_id=s.id AND m.approved_at>=s.occurred_at)
   AND ${capturedSent}
   ORDER BY s.occurred_at LIMIT ?`).bind(from,at,limit).all<{id:string;subject:string|null;occurredAt:string}>(),
  db.prepare("SELECT d.id,d.subject,d.created_at AS createdAt,d.updated_at AS updatedAt,d.is_stale AS stale,d.stale_reason AS staleReason,d.opportunity_id AS opportunityId,d.recipient_contact_id AS contactId FROM drafts d JOIN opportunities o ON o.id=d.opportunity_id WHERE o.lifecycle='open' AND d.updated_at<? AND COALESCE(d.stale_reason,'')<>'Customer stop event' AND NOT EXISTS(SELECT 1 FROM outbound_messages m WHERE m.draft_id=d.id) ORDER BY d.created_at LIMIT ?").bind(new Date(now.getTime()-policy.staleIntervalDays*86400000).toISOString(),limit).all<{id:string;subject:string;createdAt:string;updatedAt:string;stale:number;staleReason:string|null;opportunityId:string;contactId:string|null}>()]);
 const signalIds=[...replies.results,...meetings.results].map(row=>row.id),[links,entries]=await Promise.all([signalLinks(db,signalIds),signalEntries(db,signalIds)]);
 const lines:RawLine[]=[];
 for(const row of handoffs.results)lines.push({id:`handoff-due:${row.id}`,kind:'handoff-due',group:'promise',signalType:null,confidence:null,title:row.title,detail:'Next action past its due time',occurredAt:row.dueAt,dueAt:row.dueAt,evidence:{type:'handoff',id:row.id},records:[{type:'opportunity',id:row.opportunityId}],planHref:null,link:{fixed:`/app/opportunities/${row.opportunityId}#handoff-${row.id}`}});
 for(const row of nextActions.results)lines.push({id:`next-action-due:${row.id}`,kind:'next-action-due',group:'promise',signalType:null,confidence:null,title:row.reason??'Next action',detail:'Opportunity next action past its due time',occurredAt:row.dueAt,dueAt:row.dueAt,evidence:{type:'opportunity',id:row.id},records:[{type:'opportunity',id:row.id}],planHref:null,link:{fixed:`/app/opportunities/${row.id}`}});
 for(const row of replies.results){
  const due=workingDaysAfter(new Date(row.occurredAt),policy.awaitingResponseWorkingDays,policy.timezone);
  if(due.getTime()>now.getTime())continue;
  lines.push({id:`reply-unanswered:${row.id}`,kind:'reply-unanswered',group:'promise',signalType:'email.replied',confidence:'observed',title:row.subject||'Customer reply',detail:`Unanswered beyond ${policy.awaitingResponseWorkingDays} working days`,occurredAt:row.occurredAt,dueAt:due.toISOString(),evidence:{type:'signal',id:row.id},records:links.get(row.id)??[],planHref:null,link:{entries:entries.get(row.id)??[]}});
 }
 for(const row of meetings.results)lines.push({id:`meeting-no-next-step:${row.id}`,kind:'meeting-no-next-step',group:'promise',signalType:'meeting.completed',confidence:'observed',title:row.subject||'Meeting',detail:'Meeting completed with no next step logged',occurredAt:row.occurredAt,dueAt:null,evidence:{type:'signal',id:row.id},records:links.get(row.id)??[],planHref:null,link:{entries:entries.get(row.id)??[]}});
 for(const row of drafts.results){const records:RecordRef[]=[{type:'opportunity',id:row.opportunityId},...(row.contactId?[{type:'contact' as const,id:row.contactId}]:[])];lines.push({id:`draft-unsent:${row.id}`,kind:'draft-unsent',group:'promise',signalType:null,confidence:null,title:row.subject,detail:row.stale?`Unsent draft past the workspace stale interval; review needed: ${row.staleReason??'review needed'}`:'Unsent draft past the workspace stale interval',occurredAt:row.createdAt,dueAt:new Date(Date.parse(row.updatedAt)+policy.staleIntervalDays*86400000).toISOString(),evidence:{type:'draft',id:row.id},records,planHref:null,link:{fixed:`/app/drafts/${row.id}`}});}
 return lines;
}
