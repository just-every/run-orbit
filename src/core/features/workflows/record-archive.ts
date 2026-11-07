import {guard} from '../identity/store';
import type {WorkflowContext,WorkflowRecordPlan} from './record-types';

/**
 * Orbit archives a workflow-created deal by closing it as lost with a reason that names the undo.
 * The deal keeps its history, contacts and associations, leaves the queue, and a person may reopen it.
 * Tasks, drafts and messages are never touched, so undo only archives a deal nobody has touched since.
 */
type Touch={actor:string|null;at:string;what:string};

/** One query per source: D1 allows only a few terms in a compound select. */
function touchQueries(dealId:string,writeId:string,contactIds:string[]){
 const parts:{sql:string;args:unknown[]}[]=[
  {sql:"SELECT actor_id AS actor,occurred_at AS at,'edited it' AS what FROM audit_entries WHERE entity_type='opportunity' AND entity_id=? AND action<>'record.created' AND NOT(action='workflow.record_changed' AND json_extract(details_json,'$.writeId')=?)",args:[dealId,writeId]},
  {sql:"SELECT t.actor_id,t.occurred_at,'logged an activity on it' FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id WHERE r.record_type='opportunity' AND r.record_id=? AND t.kind NOT IN('record.created','opportunity.evaluated') AND NOT(t.kind='workflow.record_changed' AND json_extract(t.payload_json,'$.writeId')=?)",args:[dealId,writeId]},
  {sql:"SELECT NULL,created_at,'associated a contact with it' FROM opportunity_contacts WHERE opportunity_id=? AND contact_id NOT IN(SELECT value FROM json_each(?))",args:[dealId,JSON.stringify(contactIds)]},
  {sql:"SELECT created_by,created_at,'created a task on it' FROM sales_tasks WHERE opportunity_id=?",args:[dealId]},
  {sql:"SELECT actor_id,created_at,'created a handoff on it' FROM handoff_tasks WHERE opportunity_id=?",args:[dealId]},
  {sql:"SELECT author_id,created_at,'drafted a message on it' FROM drafts WHERE opportunity_id=?",args:[dealId]},
  {sql:"SELECT operator_id,created_at,'scheduled a message on it' FROM outbound_messages WHERE opportunity_id=?",args:[dealId]},
  {sql:"SELECT author_id,created_at,'drafted a message on it' FROM record_mail_drafts WHERE opportunity_id=? OR id IN(SELECT draft_id FROM record_mail_context WHERE history_opportunity_id=?)",args:[dealId,dealId]},
  {sql:"SELECT operator_id,created_at,'scheduled a message on it' FROM record_mail_outbound_messages WHERE opportunity_id=?",args:[dealId]},
  {sql:"SELECT NULL,linked_at,'linked a signal to it' FROM signal_links WHERE record_type='opportunity' AND record_id=?",args:[dealId]},
  {sql:"SELECT decided_by,decided_at,'accepted a captured change on it' FROM capture_proposals WHERE record_type='opportunity' AND record_id=? AND status='accepted'",args:[dealId]},
  {sql:"SELECT NULL,updated_at,'added buying context to it' FROM opportunity_buying_context WHERE opportunity_id=?",args:[dealId]},
  {sql:"SELECT verified_by,updated_at,'set stakeholder roles on it' FROM opportunity_stakeholder_roles WHERE opportunity_id=?",args:[dealId]},
 ];
 return parts;
}

/** Why a created deal cannot be archived, naming who touched it last and when; null when nobody has. */
export async function createdRecordTouch(db:D1Database,writeId:string,plan:WorkflowRecordPlan){
 let last:Touch|null=null;
 for(const query of touchQueries(plan.recordId,writeId,createdContactIds(plan))){
  const found=await db.prepare(`WITH t(actor,at,what) AS (${query.sql}) SELECT actor,at,what FROM t ORDER BY at DESC LIMIT 1`).bind(...query.args).first<Touch>();
  if(found&&(!last||found.at>last.at))last=found;
 }
 if(!last)return null;
 const name=last.actor?await db.prepare('SELECT display_name FROM operators WHERE id=?').bind(last.actor).first<string>('display_name'):null;
 return `Changed by ${name??'another source'} at ${last.at}: ${last.what}.`;
}

/** The same test inside the archive batch, so a task or edit that lands in between refuses the archive. */
export function createdRecordFence(context:WorkflowContext,writeId:string,plan:WorkflowRecordPlan){
 const queries=touchQueries(plan.recordId,writeId,createdContactIds(plan));
 return guard(context.db,{sql:queries.map(query=>`NOT EXISTS(${query.sql})`).join(' AND '),args:queries.flatMap(query=>query.args) as (string|number|null)[]});
}

function createdContactIds(plan:WorkflowRecordPlan){
 const ids=plan.createdValues?.contact_ids;return Array.isArray(ids)?ids.filter((id):id is string=>typeof id==='string'):[];
}
