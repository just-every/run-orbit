import {createId} from '../../shared/ids';
import {audit,RecordError,timeline} from '../records/shared';
import {nativeAuthority} from '../delegation/native-authority';
import type {AcceptObligationInput} from './input';

export type Obligation={id:string;opportunity_id:string;contact_id:string|null;meeting_id:string|null;owner_id:string;goal_stage_id:string|null;goal_stage_name:string;title:string;stop_condition:string;due_at:string;accepted_by:string;accepted_at:string;draft_id:string|null;responded_at:string|null;response_evidence_id:string|null;paused:number;closed_at:string|null;closed_reason:string|null;closed_by:string|null};
export const openDraftFence=(draft='d')=>` AND NOT EXISTS(SELECT 1 FROM follow_up_obligations obligation WHERE obligation.draft_id=${draft}.id AND (obligation.closed_at IS NOT NULL OR obligation.paused=1 OR obligation.contact_id IS NULL))`;
export async function obligation(db:D1Database,id:string){const row=await db.prepare('SELECT * FROM follow_up_obligations WHERE id=?').bind(id).first<Obligation>();if(!row)throw new RecordError(404,'Follow-up obligation not found.');return row;}
export async function acceptObligation(db:D1Database,input:AcceptObligationInput,actor:string){
 await nativeAuthority(db,actor);
 const id=createId(),taskId=createId(),at=new Date().toISOString();
 // Recheck source, goal, recipient and both people's authority in the committing batch.
 const eligible=`SELECT 1 FROM opportunities o JOIN opportunity_contacts oc ON oc.opportunity_id=o.id JOIN contacts c ON c.id=oc.contact_id
 JOIN pipeline_stages current ON current.id=o.stage_id JOIN pipeline_stages goal ON goal.id=?
 JOIN pipeline_stage_rules currentRule ON currentRule.stage_id=current.id JOIN pipeline_stage_rules goalRule ON goalRule.stage_id=goal.id
 JOIN operators owner ON owner.id=? JOIN operators author ON author.id=? JOIN signals s ON s.id=?
 WHERE o.id=? AND c.id=? AND c.contactability='contactable' AND o.lifecycle='open' AND o.owner_id IS NOT NULL
 AND goalRule.pipeline_id=currentRule.pipeline_id AND goal.position>current.position AND s.type='meeting.completed'
 AND EXISTS(SELECT 1 FROM signal_links WHERE signal_id=s.id AND record_type='opportunity' AND record_id=o.id)
 AND owner.status='active' AND author.status='active'
 AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id IN(owner.id,author.id))`;
 const params=[input.goalStageId,input.ownerId,actor,input.meetingId,input.opportunityId,input.contactId];
 if(!await db.prepare(eligible).bind(...params).first())throw new RecordError(409,'Choose a completed meeting on an open owned deal, a current recipient, a full operator owner and a later stage in this pipeline.');
 const payload={obligationId:id,title:input.title,contactId:input.contactId,meetingId:input.meetingId,evidence:[input.meetingId],ownerId:input.ownerId,dueAt:input.dueAt,goalStageId:input.goalStageId,stopCondition:input.stopCondition};
 await db.batch([
  db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'follow_up_accept',NULL WHERE NOT EXISTS(${eligible})`).bind(...params),
  db.prepare('INSERT INTO follow_up_obligations(id,opportunity_id,contact_id,meeting_id,owner_id,goal_stage_id,goal_stage_name,title,stop_condition,due_at,accepted_by,accepted_at) SELECT ?,?,?,?,?,?,name,?,?,?,?,? FROM pipeline_stages WHERE id=?').bind(id,input.opportunityId,input.contactId,input.meetingId,input.ownerId,input.goalStageId,input.title,input.stopCondition,input.dueAt,actor,at,input.goalStageId),
  db.prepare("INSERT INTO handoff_tasks VALUES(?,?,?,?,?,?,'open',NULL,?,?,?,?)").bind(taskId,input.opportunityId,input.title,'Meeting follow-up: '+input.stopCondition,input.ownerId,input.dueAt,actor,createId(),at,at),
  db.prepare('INSERT INTO handoff_contacts VALUES(?,?)').bind(taskId,input.contactId),
  db.prepare("INSERT INTO follow_up_work(obligation_id,kind,item_id) VALUES(?,'handoff',?),(?,'reminder',?)").bind(id,taskId,id,id),
  ...timeline(db,actor,'opportunity',input.opportunityId,'obligation.accepted',payload,at),
  ...timeline(db,actor,'opportunity',input.opportunityId,'handoff.updated',{...payload,handoffId:taskId,assigneeId:input.ownerId,status:'open',description:'Meeting follow-up'},at),
  audit(db,actor,'obligation.accepted','opportunity',input.opportunityId,payload),
 ]);
 return {id};
}
/** Called inside draft creation's existing transaction, before it creates content. */
export function bindDraftStatements(db:D1Database,id:string,draftId:string,opportunityId:string|null,contactId:string){
 return [db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'follow_up_draft',NULL WHERE NOT EXISTS(SELECT 1 FROM follow_up_obligations WHERE id=? AND opportunity_id=? AND contact_id=? AND draft_id IS NULL AND closed_at IS NULL AND paused=0)`).bind(id,opportunityId,contactId),
  db.prepare('UPDATE follow_up_obligations SET draft_id=? WHERE id=? AND draft_id IS NULL AND closed_at IS NULL AND paused=0').bind(draftId,id)];
}
export function bindWorkStatements(db:D1Database,id:string,kind:'handoff'|'task',itemId:string,opportunityId:string){return [
 db.prepare("INSERT INTO runtime_controls(name,value) SELECT 'follow_up_work',NULL WHERE NOT EXISTS(SELECT 1 FROM follow_up_obligations WHERE id=? AND opportunity_id=? AND closed_at IS NULL AND paused=0)").bind(id,opportunityId),
 db.prepare('INSERT OR IGNORE INTO follow_up_work(obligation_id,kind,item_id) VALUES(?,?,?)').bind(id,kind,itemId),
 db.prepare("INSERT INTO runtime_controls(name,value) SELECT 'follow_up_work_owner',NULL WHERE NOT EXISTS(SELECT 1 FROM follow_up_work WHERE obligation_id=? AND kind=? AND item_id=?)").bind(id,kind,itemId),
];}
export async function stopObligation(db:D1Database,id:string,reason:string,actor:string){
 await nativeAuthority(db,actor);const saved=await obligation(db,id);if(saved.closed_at)return {id,closedAt:saved.closed_at,reason:saved.closed_reason};
 const at=new Date().toISOString(),why='Stopped: '+reason;
 await db.batch([db.prepare('UPDATE follow_up_obligations SET closed_at=?,closed_reason=?,closed_by=? WHERE id=? AND closed_at IS NULL').bind(at,why,actor,id)]);
 return {id,closedAt:at,reason:why};
}
export function advanceObligationsStatements(db:D1Database,opportunityId:string,stageId:string,actor:string,at:string){return [
 db.prepare("UPDATE follow_up_obligations SET closed_at=?,closed_reason='Advancement goal reached: '||goal_stage_name,closed_by=? WHERE opportunity_id=? AND goal_stage_id=? AND closed_at IS NULL AND paused=0").bind(at,actor,opportunityId,stageId),
];}
export async function readObligations(db:D1Database,opportunityId:string){
 const rows=(await db.prepare(`SELECT o.*,p.display_name AS owner_name,
 (SELECT json_object('state',m.state,'failure',m.failure,'id',m.id) FROM (SELECT id,draft_id,state,failure,created_at FROM outbound_messages UNION ALL SELECT id,draft_id,state,failure,created_at FROM record_mail_outbound_messages) m WHERE m.draft_id=o.draft_id ORDER BY m.created_at DESC LIMIT 1) AS message_json
 FROM follow_up_obligations o JOIN operators p ON p.id=o.owner_id WHERE o.opportunity_id=? ORDER BY o.accepted_at,o.id`).bind(opportunityId).all<Obligation&{owner_name:string;message_json:string|null}>()).results;
 return Promise.all(rows.map(async row=>{const {message_json,...saved}=row,message=message_json?JSON.parse(message_json) as {state:string;failure:string|null;id:string}:null;
 const messageState=message&&['queued','delivery-unknown','reconciling'].includes(message.state)?'submitted-uncertain':row.responded_at?'responded':!message?(row.draft_id?'draft':'awaiting-draft'):['queued','delivery-unknown','reconciling'].includes(message.state)?'submitted-uncertain':['accepted','delivered'].includes(message.state)?'submitted':message.state;
 return {...saved,messageState,failure:message?.failure??null,messageId:message?.id??null,goalState:row.closed_at?'closed':row.paused?'paused':'open',work:(await db.prepare('SELECT * FROM follow_up_work WHERE obligation_id=? ORDER BY kind,item_id').bind(row.id).all()).results};}));
}
