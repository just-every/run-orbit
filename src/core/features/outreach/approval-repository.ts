import {draftRecordLinks} from './record-mail-links';
import {isRecordMailDatabase,recordMailRecipientScope} from './record-mail-storage';
import {renderDraft,requireRendered} from '../drafts/render';
import { createId } from '../../shared/ids';
import { WorkbenchError } from '../workbench/repository';
import { permitted, localTime, nextPermitted, recentLocalTime } from './time';
import { deferral, oneToOneLimitSql, sharedLimitSql } from './sending-limits';
import { bindOptOut, draftOptOut, relayRefusalAudit } from './opt-out';
import { capabilityStatement } from './opt-out-capability';
export interface ApprovalInput {agentReviewHash?:string;idempotencyKey?:string;scheduledAt?:string;scheduledAtConfirmation?:string;quietHoursConfirmation?:string;now?:Date;messageIdDomain?:string;optOutTransport?:boolean;optOutOrigin?:string}
export class ApprovalRepository {
 constructor(readonly db:D1Database){}
 async preview(draftId:string,now=new Date(),scheduledAt?:string) {
  const row=await this.db.prepare("SELECT COALESCE(c.timezone,w.timezone) AS timezone FROM drafts d JOIN contacts c ON c.id=d.recipient_contact_id CROSS JOIN workspace_settings w WHERE d.id=? AND w.id='workspace'").bind(draftId).first<{timezone:string}>();
  if(!row)throw new WorkbenchError(404,'Draft or recipient not found.');
  const current={timezone:row.timezone,localTime:localTime(now,row.timezone).label,quietHours:!permitted(now,row.timezone),confirmationExpiresAt:new Date(Math.floor(now.getTime()/60000)*60000+10*60000).toISOString()};
  if(!scheduledAt)return current;
  const requested=new Date(scheduledAt);
  if(!Number.isFinite(requested.getTime())||requested.getTime()<=now.getTime())throw new WorkbenchError(400,'Schedule a future time.');
  const actual=nextPermitted(requested,row.timezone);
  const scheduleReason=!permitted(requested,row.timezone)?'The requested time is outside 08:00–18:00 Monday to Friday in the recipient’s timezone. Orbit moves scheduled sends to the next permitted minute.':actual.getTime()!==requested.getTime()?'Scheduled sends use whole minutes, so this time is rounded up to the next permitted minute.':null;
  return {...current,requestedAt:requested.toISOString(),scheduledAt:actual.toISOString(),scheduledLocalTime:localTime(actual,row.timezone).label,scheduleReason};
 }
 async approve(draftId:string,revision:number,actor:string,input:ApprovalInput={}) {
  const now=input.now??new Date(),at=now.toISOString(),preview=await this.preview(draftId,now);
  if(!input.scheduledAt&&preview.quietHours&&!recentLocalTime(input.quietHoursConfirmation,now,preview.timezone))throw new WorkbenchError(409,`Outside recipient sending hours (${preview.localTime}, ${preview.timezone}). Review the recipient time again; confirmation stays valid for ten minutes.`);
  if(input.scheduledAt&&(!Number.isFinite(Date.parse(input.scheduledAt))||Date.parse(input.scheduledAt)<=now.getTime()))throw new WorkbenchError(400,'Schedule a future time.');
  const scheduled=input.scheduledAt?nextPermitted(new Date(input.scheduledAt),preview.timezone).toISOString():null;
  if(input.scheduledAtConfirmation&&input.scheduledAtConfirmation!==scheduled)throw new WorkbenchError(409,'The permitted schedule changed. Review the schedule again before approving.');
  const rendered=await renderDraft(this.db,draftId,actor);requireRendered(rendered.review,input.agentReviewHash);
  const id=createId(),key=input.idempotencyKey??`${draftId}:${revision}`,messageId=`<${id}@${input.messageIdDomain??'orbit.local'}>`;
  const optOut=await draftOptOut(this.db,draftId,input.optOutTransport??true);
  if(optOut.refusal){await relayRefusalAudit(this.db,actor,'draft',draftId).run();throw new WorkbenchError(409,optOut.refusal);}
  const minute=new Date(now.getTime()-60000).toISOString(),day=new Date(now.getTime()-86400000).toISOString();
  const insertion=this.db.prepare(`INSERT INTO outbound_messages(id,draft_id,revision,opportunity_id,operator_id,contact_id,recipient_email,subject,body,state,created_at,updated_at,idempotency_key,message_id,reference_ids,scheduled_at,approved_at,claimed_at,first_attempt_at,attempt_count,render_snapshot_json)
   SELECT ?,d.id,d.revision,d.opportunity_id,?,c.id,d.recipient_email,?,?, ?,?,?, ?,?,COALESCE((SELECT p.message_id FROM outbound_messages p WHERE p.opportunity_id IS d.opportunity_id AND p.contact_id=d.recipient_contact_id AND p.state IN('accepted','delivered') ${isRecordMailDatabase(this.db)?'AND (SELECT history_opportunity_id FROM record_mail_context WHERE draft_id=p.draft_id) IS (SELECT history_opportunity_id FROM record_mail_context WHERE draft_id=d.id)':''} ORDER BY p.created_at DESC LIMIT 1),''),?,?,?,?,?,?
   FROM drafts d LEFT JOIN opportunities o ON o.id=d.opportunity_id JOIN contacts c ON c.id=d.recipient_contact_id LEFT JOIN opportunity_contacts oc ON oc.opportunity_id=o.id AND oc.contact_id=c.id
   WHERE d.id=? AND d.revision=? AND d.is_stale=0 AND (d.opportunity_id IS NULL OR (o.lifecycle='open' AND oc.contact_id IS NOT NULL)) AND c.contactability='contactable' AND lower(trim(c.email))=lower(trim(d.recipient_email))
   ${recordMailRecipientScope(this.db)}
   AND EXISTS(SELECT 1 FROM operators WHERE id=? AND status='active')
   AND(d.recommendation_id IS NULL OR EXISTS(SELECT 1 FROM recommendations WHERE id=d.recommendation_id AND is_current=1))
   ON CONFLICT DO NOTHING`).bind(id,actor,rendered.review.subject,rendered.review.body,scheduled?'scheduled':'queued',at,at,key,messageId,scheduled,at,scheduled?null:at,scheduled?null:at,scheduled?0:1,JSON.stringify(rendered.review),draftId,revision,actor);
  let result:D1Result[];try{result=await this.db.batch([insertion,
    this.db.prepare(`UPDATE outbound_messages SET state='draft',claimed_at=NULL,first_attempt_at=NULL,attempt_count=0,failure='Sending limit reached; review and retry after the displayed time',next_attempt_at=? WHERE id=? AND state='queued' AND ((SELECT COUNT(*) FROM outbound_delivery_budget WHERE claimed_at>?)>${sharedLimitSql} OR (SELECT COUNT(*) FROM outbound_delivery_budget WHERE operator_id=? AND claimed_at>?)>${oneToOneLimitSql('?')})`).bind(at,id,minute,actor,day,actor),
    this.db.prepare("UPDATE opportunities SET queue_state='next',queue_reason='Scheduled message',next_due_at=?,updated_at=? WHERE id=(SELECT opportunity_id FROM outbound_messages WHERE id=? AND state='scheduled') AND lifecycle='open'").bind(scheduled,at,id),
    ...rendered.guards,
    ...bindOptOut(this.db,id,draftId,optOut),
    ...(input.optOutOrigin&&optOut.carries?[capabilityStatement(this.db,id,input.optOutOrigin)]:[])
  ]);}catch(error){if(/runtime_controls.value/.test(String(error)))throw new WorkbenchError(409,'Merge values, permissions or the opt-out state changed. Review the exact rendered message again before approving.');throw error;}
  if(result[0]!.meta.changes!==1)throw new WorkbenchError(409,'Revision already approved, changed, or is no longer permitted.');
  if(result[1]!.meta.changes>=1){const held=await deferral(this.db,actor,now);if(held)await this.db.prepare("UPDATE outbound_messages SET failure=?,next_attempt_at=? WHERE id=? AND state='draft'").bind(held.failure,held.retryAt,id).run();}
  return this.message(id);
 }
 async message(id:string){const row=await this.db.prepare('SELECT * FROM outbound_messages WHERE id=?').bind(id).first<OutboundMessage>();if(!row)throw new WorkbenchError(404,'Outbound message not found.');return row;}
 async retryBlocked(id:string,actor:string,confirmation?:string){
  const message=await this.message(id),now=new Date(),at=now.toISOString(),preview=await this.preview(message.draft_id,now);
  if(preview.quietHours&&!recentLocalTime(confirmation,now,preview.timezone))throw new WorkbenchError(409,`Review recipient local time ${preview.localTime} again before retrying; confirmation stays valid for ten minutes.`);
  const result=await this.db.prepare(`UPDATE outbound_messages SET state='queued',operator_id=?,claimed_at=?,first_attempt_at=COALESCE(first_attempt_at,?),attempt_count=1,failure=NULL,updated_at=? WHERE id=? AND state='draft' AND next_attempt_at<=? AND EXISTS(SELECT 1 FROM drafts d JOIN contacts c ON c.id=d.recipient_contact_id LEFT JOIN opportunities o ON o.id=d.opportunity_id LEFT JOIN opportunity_contacts oc ON oc.opportunity_id=o.id AND oc.contact_id=c.id WHERE d.id=outbound_messages.draft_id AND d.revision=outbound_messages.revision AND d.is_stale=0 AND c.contactability='contactable' AND (d.opportunity_id IS NULL OR (o.lifecycle='open' AND oc.contact_id IS NOT NULL)) AND d.body=COALESCE(json_extract(outbound_messages.render_snapshot_json,'$.sourceBody'),outbound_messages.body) AND d.subject=COALESCE(json_extract(outbound_messages.render_snapshot_json,'$.sourceSubject'),outbound_messages.subject) AND lower(trim(c.email))=lower(trim(outbound_messages.recipient_email)) AND (d.recommendation_id IS NULL OR EXISTS(SELECT 1 FROM recommendations WHERE id=d.recommendation_id AND is_current=1))${recordMailRecipientScope(this.db)}) AND (SELECT COUNT(*) FROM outbound_delivery_budget WHERE claimed_at>?)<${sharedLimitSql} AND (SELECT COUNT(*) FROM outbound_delivery_budget WHERE operator_id=? AND claimed_at>?)<${oneToOneLimitSql('?')}`).bind(actor,at,at,at,id,at,new Date(now.getTime()-60000).toISOString(),actor,new Date(now.getTime()-86400000).toISOString(),actor).run();
  if(result.meta.changes!==1){const held=await deferral(this.db,actor,now);throw new WorkbenchError(409,held?held.failure:'Message changed or is no longer permitted.');}return this.message(id);
 }
 async cancel(id:string,actor:string){
  const at=new Date().toISOString(),entry=createId(),message=await this.message(id);
  const result=await this.db.batch([
   this.db.prepare("UPDATE outbound_messages SET state='cancelled',failure='Cancelled by operator',updated_at=?,settlement_id=? WHERE id=? AND state='scheduled'").bind(at,entry,id),
   this.db.prepare("INSERT INTO timeline_entries(id,kind,occurred_at,recorded_at,actor_type,actor_id,source,payload_json) SELECT ?,'message.cancelled',?,?,'operator',?,'outreach',? WHERE EXISTS(SELECT 1 FROM outbound_messages WHERE settlement_id=?)").bind(entry,at,at,actor,JSON.stringify({messageId:id}),entry),
   this.db.prepare("INSERT INTO timeline_entry_records(timeline_entry_id,record_type,record_id) SELECT ?,'opportunity',opportunity_id FROM outbound_messages WHERE settlement_id=? AND opportunity_id IS NOT NULL").bind(entry,entry),
   ...draftRecordLinks(this.db,message.draft_id,entry),
   this.db.prepare("INSERT INTO audit_entries(id,actor_id,action,entity_type,entity_id,details_json,occurred_at) SELECT ?,?,'message.cancelled','outbound_message',?,'{}',? WHERE EXISTS(SELECT 1 FROM outbound_messages WHERE settlement_id=?)").bind(createId(),actor,id,at,entry),
   this.db.prepare("UPDATE opportunities SET queue_state='now',queue_reason='Scheduled message cancelled by operator',next_due_at=NULL,updated_at=? WHERE id=(SELECT opportunity_id FROM outbound_messages WHERE settlement_id=?) AND lifecycle='open'").bind(at,entry)
  ]);
  // Hosted D1 includes the schedule-stop trigger writes in its change count.
  if(result[0]!.meta.changes<1)throw new WorkbenchError(409,'Message already dispatched or cancelled.');
 }

}
export interface OutboundMessage {id:string;draft_id:string;revision:number;opportunity_id:string|null;operator_id:string;contact_id:string;recipient_email:string;subject:string;body:string;state:string;provider_message_id:string|null;message_id:string;reference_ids:string;idempotency_key:string;scheduled_at:string|null;next_attempt_at:string|null;attempt_count:number;approved_at:string;claimed_at:string|null;first_attempt_at:string|null;created_at:string;failure:string|null;render_snapshot_json:string|null}
