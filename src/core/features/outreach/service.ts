import {senderMaySend} from './sender-authority';
import {recordMailRecipientScope} from './record-mail-storage';
import type { OutboundMail } from '../../platform/outbound-mail';
import { submissionOutcome, transientSubmission } from '../../platform/outbound-mail';
import { OutreachRepository } from '../workbench/outreach-repository';
import { ApprovalRepository, type OutboundMessage } from './approval-repository';
import { nextPermitted, permitted } from './time';
import { boundOptOut, relayRefusal, relayRefusalAudit, relayRefusedAtDispatch } from './opt-out';
import { deferral, oneToOneLimitSql, sharedLimitSql } from './sending-limits';
import { messageOptOutUrl } from './opt-out-capability';

export class OutreachService {
 constructor(readonly db:D1Database,readonly mail:OutboundMail){}
 async submit(message:OutboundMessage){
  if(message.state!=='queued')throw new Error('Only a claimed operator approval may be submitted.');
  const eligible=await this.db.prepare(`SELECT m.id FROM outbound_messages m JOIN drafts d ON d.id=m.draft_id JOIN contacts c ON c.id=m.contact_id LEFT JOIN opportunities o ON o.id=d.opportunity_id LEFT JOIN opportunity_contacts oc ON oc.opportunity_id=o.id AND oc.contact_id=c.id JOIN operators a ON a.id=m.operator_id
   WHERE m.id=? AND m.state='queued' AND d.revision=m.revision AND d.is_stale=0 AND d.recipient_contact_id=m.contact_id
   AND d.recipient_email=m.recipient_email AND d.subject=COALESCE(json_extract(m.render_snapshot_json,'$.sourceSubject'),m.subject) AND d.body=COALESCE(json_extract(m.render_snapshot_json,'$.sourceBody'),m.body)
   AND c.contactability='contactable' AND lower(trim(c.email))=lower(trim(m.recipient_email)) AND a.status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=a.id)
   AND (d.opportunity_id IS NULL OR (o.lifecycle='open' AND oc.contact_id IS NOT NULL)) AND (d.recommendation_id IS NULL OR EXISTS(SELECT 1 FROM recommendations WHERE id=d.recommendation_id AND is_current=1))
   ${recordMailRecipientScope(this.db)} AND NOT EXISTS(SELECT 1 FROM crm_import_reviews WHERE safety_pending=1)`).bind(message.id).first();
  if(!eligible||!await senderMaySend(this.db,message.operator_id,message.draft_id)){await this.db.prepare("UPDATE outbound_messages SET state='cancelled',failure='Recipient permission changed before submission' WHERE id=? AND state='queued'").bind(message.id).run();return{id:message.id,state:'cancelled'};}
  if(this.mail.provider==='rer'&&await relayRefusedAtDispatch(this.db,message.id,Boolean(this.mail.optOutOrigin))){
   const at=new Date().toISOString();
   await this.db.batch([this.db.prepare("UPDATE outbound_messages SET state='failed',failure=?,updated_at=? WHERE id=? AND state='queued'").bind(relayRefusal,at,message.id),this.db.prepare("UPDATE opportunities SET queue_state='now',queue_reason=?,next_due_at=NULL,updated_at=? WHERE id=? AND lifecycle='open'").bind(relayRefusal,at,message.opportunity_id),relayRefusalAudit(this.db,message.operator_id,'outbound_message',message.id)]);
   return {id:message.id,state:'failed'};
  }
  const repository=new OutreachRepository(this.db);let receipt;
  const optOut=await boundOptOut(this.db,message.id);
  try{
   const url=this.mail.provider==='rer'&&this.mail.optOutOrigin&&optOut!==false?await messageOptOutUrl(this.db,message.id,this.mail.optOutOrigin):undefined;
   receipt=await this.mail.send({...message,...(optOut===undefined?{}:{opt_out:optOut}),...(url?{opt_out_url:url}:{})});
  }catch(error){
   const now=new Date(),at=now.toISOString();
   if(transientSubmission(error)&&message.attempt_count<5&&now.getTime()-Date.parse(message.first_attempt_at??message.approved_at)<3600000){await this.db.prepare("UPDATE outbound_messages SET state='scheduled',next_attempt_at=?,failure=?,updated_at=? WHERE id=? AND state='queued'").bind(new Date(now.getTime()+message.attempt_count*60000).toISOString(),error instanceof Error?error.message:'Provider rate limit',at,message.id).run();return {id:message.id,state:'scheduled'};}
   const state=submissionOutcome(error);await repository.settle(message.id,message.operator_id,state,null,error instanceof Error?error.message:'Provider receipt unavailable');
   if(state==='delivery-unknown')await this.db.prepare('UPDATE outbound_messages SET next_attempt_at=? WHERE id=?').bind(new Date(now.getTime()+300000).toISOString(),message.id).run();
   return {id:message.id,state};
  }
  try{await repository.settle(message.id,message.operator_id,'accepted',receipt.providerMessageId,null,receipt.messageId);}catch(error){
   await this.db.prepare("UPDATE outbound_messages SET state='reconciling',provider_message_id=?,message_id=COALESCE(?,message_id),failure='Provider accepted; local settlement needs reconciliation',next_attempt_at=?,updated_at=? WHERE id=? AND state='queued'").bind(receipt.providerMessageId,receipt.messageId??null,new Date(Date.now()+300000).toISOString(),new Date().toISOString(),message.id).run();
   return {id:message.id,state:'reconciling'};
  }
  return {id:message.id,state:'accepted'};
 }
 async dispatchDue(now=new Date(),limit=50){
  const rows=await this.db.prepare("SELECT id FROM outbound_messages WHERE state='scheduled' AND COALESCE(next_attempt_at,scheduled_at)<=? ORDER BY COALESCE(next_attempt_at,scheduled_at) LIMIT ?").bind(now.toISOString(),limit).all<{id:string}>();
  const approval=new ApprovalRepository(this.db);
  for(const row of rows.results){const message=await approval.message(row.id);
   if(message.first_attempt_at&&(message.attempt_count>=5||now.getTime()-Date.parse(message.first_attempt_at)>=3600000)){
    await this.db.batch([this.db.prepare("UPDATE outbound_messages SET state='failed',failure='Provider retry window expired; operator review is required',updated_at=? WHERE id=? AND state='scheduled'").bind(now.toISOString(),message.id),this.db.prepare("UPDATE opportunities SET queue_state='now',queue_reason='Provider retry window expired',next_due_at=NULL,updated_at=? WHERE id=? AND lifecycle='open'").bind(now.toISOString(),message.opportunity_id)]);continue;
   }
   const preview=await approval.preview(message.draft_id,now);
   if(!permitted(now,preview.timezone)){await this.db.prepare("UPDATE outbound_messages SET next_attempt_at=? WHERE id=? AND state='scheduled'").bind(nextPermitted(now,preview.timezone).toISOString(),row.id).run();continue;}
   const valid=await this.db.prepare(`SELECT d.id FROM drafts d JOIN contacts c ON c.id=d.recipient_contact_id LEFT JOIN opportunities o ON o.id=d.opportunity_id LEFT JOIN opportunity_contacts oc ON oc.opportunity_id=o.id AND oc.contact_id=c.id JOIN operators a ON a.id=? WHERE d.id=? AND d.revision=? AND d.is_stale=0 AND d.recipient_email=? AND d.subject=? AND d.body=? AND c.contactability='contactable' AND lower(trim(c.email))=lower(trim(d.recipient_email)) AND (d.opportunity_id IS NULL OR (o.lifecycle='open' AND oc.contact_id IS NOT NULL)) AND a.status='active' AND (d.recommendation_id IS NULL OR EXISTS(SELECT 1 FROM recommendations WHERE id=d.recommendation_id AND is_current=1))${recordMailRecipientScope(this.db)}`).bind(message.operator_id,message.draft_id,message.revision,message.recipient_email,message.render_snapshot_json?JSON.parse(message.render_snapshot_json).sourceSubject:message.subject,message.render_snapshot_json?JSON.parse(message.render_snapshot_json).sourceBody:message.body).first();
   if(!valid||!await senderMaySend(this.db,message.operator_id,message.draft_id)){await this.db.batch([this.db.prepare("UPDATE outbound_messages SET state='failed',failure='Approved message changed, became stale, or is no longer permitted',updated_at=? WHERE id=? AND state='scheduled'").bind(now.toISOString(),message.id),this.db.prepare("UPDATE opportunities SET queue_state='now',queue_reason='Scheduled message cannot be sent',next_due_at=NULL WHERE id=? AND lifecycle='open'").bind(message.opportunity_id)]);continue;}
   const minute=new Date(now.getTime()-60000).toISOString(),day=new Date(now.getTime()-86400000).toISOString();
   const claim=await this.db.prepare(`UPDATE outbound_messages SET state='queued',claimed_at=?,first_attempt_at=COALESCE(first_attempt_at,?),attempt_count=attempt_count+1,updated_at=? WHERE id=? AND state='scheduled' AND COALESCE(next_attempt_at,scheduled_at)<=? AND (SELECT COUNT(*) FROM outbound_delivery_budget WHERE claimed_at>?)<${sharedLimitSql} AND (SELECT COUNT(*) FROM outbound_delivery_budget WHERE operator_id=? AND claimed_at>?)<${oneToOneLimitSql('outbound_messages.operator_id')} AND EXISTS(SELECT 1 FROM drafts d JOIN contacts c ON c.id=d.recipient_contact_id LEFT JOIN opportunities o ON o.id=d.opportunity_id LEFT JOIN opportunity_contacts oc ON oc.opportunity_id=o.id AND oc.contact_id=c.id JOIN operators a ON a.id=outbound_messages.operator_id WHERE d.id=outbound_messages.draft_id AND d.revision=outbound_messages.revision AND d.is_stale=0 AND d.recipient_email=outbound_messages.recipient_email AND d.subject=COALESCE(json_extract(outbound_messages.render_snapshot_json,'$.sourceSubject'),outbound_messages.subject) AND d.body=COALESCE(json_extract(outbound_messages.render_snapshot_json,'$.sourceBody'),outbound_messages.body) AND c.contactability='contactable' AND lower(trim(c.email))=lower(trim(d.recipient_email)) AND (d.opportunity_id IS NULL OR (o.lifecycle='open' AND oc.contact_id IS NOT NULL)) AND a.status='active' AND (d.recommendation_id IS NULL OR EXISTS(SELECT 1 FROM recommendations WHERE id=d.recommendation_id AND is_current=1))${recordMailRecipientScope(this.db)})`).bind(now.toISOString(),now.toISOString(),now.toISOString(),message.id,now.toISOString(),minute,message.operator_id,day).run();
   if(claim.meta.changes!==1){const held=await deferral(this.db,message.operator_id,now);if(held)await this.db.prepare("UPDATE outbound_messages SET state='draft',failure=?,next_attempt_at=?,updated_at=? WHERE id=? AND state='scheduled' AND COALESCE(next_attempt_at,scheduled_at)<=?").bind(held.failure,held.retryAt,now.toISOString(),message.id,now.toISOString()).run();continue;}
   await this.submit(await approval.message(message.id));
  }
 }
 async reconcile(now=new Date(),limit=50){
  await this.db.prepare("UPDATE outbound_messages SET state='delivery-unknown',failure='Submission was interrupted without a receipt',next_attempt_at=?,updated_at=? WHERE state='queued' AND claimed_at<?").bind(now.toISOString(),now.toISOString(),new Date(now.getTime()-120000).toISOString()).run();
  const messages=await this.db.prepare("SELECT * FROM outbound_messages WHERE state IN('reconciling','delivery-unknown') AND (next_attempt_at IS NULL OR next_attempt_at<=?) ORDER BY created_at LIMIT ?").bind(now.toISOString(),limit).all<OutboundMessage>();
  for(const message of messages.results){
   // A saved receipt proves acceptance even when the original settlement transaction failed.
   if(message.provider_message_id){await new OutreachRepository(this.db).settle(message.id,message.operator_id,'accepted',message.provider_message_id,null);continue;}
   if(this.mail.provider==='rer'&&!this.mail.lookup){
    await this.db.prepare("UPDATE outbound_messages SET failure='Managed mail acceptance is unresolved. Reconcile with the recipient or hosting provider before resending; automatic resend is disabled.',next_attempt_at=?,updated_at=? WHERE id=?").bind(new Date(now.getTime()+300000).toISOString(),now.toISOString(),message.id).run();
    continue;
   }
   if(now.getTime()-Date.parse(message.first_attempt_at??message.approved_at)>=86400000){await new OutreachRepository(this.db).settle(message.id,message.operator_id,'failed',message.provider_message_id,'Provider acceptance remained unresolved for 24 hours.');continue;}
   await this.db.prepare('UPDATE outbound_messages SET next_attempt_at=? WHERE id=?').bind(new Date(now.getTime()+300000).toISOString(),message.id).run();
   try{if(!this.mail.lookup)throw new Error('Mail adapter must support lookup by durable delivery ID.');const receipt=await this.mail.lookup(message.idempotency_key);if(receipt)await new OutreachRepository(this.db).settle(message.id,message.operator_id,'accepted',receipt.providerMessageId,null);}
   catch(error){await this.db.prepare('UPDATE outbound_messages SET failure=?,updated_at=? WHERE id=?').bind(error instanceof Error?error.message:'Provider lookup failed',now.toISOString(),message.id).run();}
  }
 }
}
