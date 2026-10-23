import {recordMailTimeline} from './record-mail-repository';
import {isRecordMailDatabase} from './record-mail-storage';
import {createId} from '../../shared/ids';
import {workingDaysAfter} from './time';
import {WorkbenchRepository} from '../workbench/repository';
import {acceptedHistoryLinks} from './history-links';
/** Shared statement builder lets a provider receipt and settlement commit as one transaction. */
export async function settlementStatements(db:D1Database,id:string,actor:string,state:'accepted'|'failed'|'delivery-unknown'|'reconciling',providerId:string|null,failure:string|null,messageId?:string){
    const message = await db.prepare('SELECT draft_id,contact_id,operator_id,opportunity_id,recipient_email,subject,body FROM outbound_messages WHERE id=?').bind(id).first<{draft_id:string;contact_id:string;operator_id:string;opportunity_id:string|null;recipient_email:string;subject:string;body:string}>();
    if(!message) throw new Error('Outbound approval is missing.');
    const now = new Date(), at = now.toISOString(), settlementId = createId();
    const statements = [db.prepare('UPDATE outbound_messages SET state=?,provider_message_id=?,message_id=COALESCE(?,message_id),failure=?,updated_at=?,settlement_id=? WHERE id=? AND (state IN (\'queued\',\'reconciling\',\'delivery-unknown\') OR (?=\'accepted\' AND ? IS NOT NULL AND state=\'cancelled\' AND first_attempt_at IS NOT NULL))').bind(state,providerId,messageId??null,failure,at,settlementId,id,state,providerId),
      ...(isRecordMailDatabase(db)?recordMailTimeline(db,message.draft_id,actor,`message.${state}`,{messageId:id,providerId,failure,...(state==='accepted'?{recipient:message.recipient_email,subject:message.subject,body:message.body}:{})},at,settlementId):new WorkbenchRepository(db).timeline(message.opportunity_id!,actor,`message.${state}`,{messageId:id,providerId,failure,...(state==='accepted'?{recipient:message.recipient_email,subject:message.subject,body:message.body}:{})},at,at,settlementId))];
    if(state==='accepted') {
      statements.push(...acceptedHistoryLinks(db,id,settlementId));
      const settings=await db.prepare("SELECT timezone,awaiting_response_working_days FROM workspace_settings WHERE id='workspace'").first<{timezone:string;awaiting_response_working_days:number}>();
      if(!settings)throw new Error('Workspace settings missing.');
      const due=workingDaysAfter(now,settings.awaiting_response_working_days,settings.timezone);
      if(isRecordMailDatabase(db))statements.push(
       db.prepare("UPDATE record_mail_obligations SET closed_at=?,closed_reason='Later accepted message' WHERE contact_id=? AND closed_at IS NULL AND EXISTS(SELECT 1 FROM outbound_messages WHERE settlement_id=?)").bind(at,message.contact_id,settlementId),
       ...(!message.opportunity_id?[db.prepare('INSERT INTO record_mail_obligations(message_id,contact_id,operator_id,opened_at,due_at) SELECT m.id,m.contact_id,m.operator_id,?,? FROM outbound_messages m JOIN drafts d ON d.id=m.draft_id WHERE m.settlement_id=? AND d.is_stale=0 AND d.revision=m.revision ON CONFLICT DO NOTHING').bind(at,due.toISOString(),settlementId)]:[])
      );
      statements.push(db.prepare("UPDATE opportunities SET queue_state='next',queue_reason='Awaiting customer response',next_due_at=?,updated_at=? WHERE id=? AND lifecycle='open' AND EXISTS(SELECT 1 FROM outbound_messages m JOIN drafts d ON d.id=m.draft_id WHERE m.settlement_id=? AND d.is_stale=0 AND d.revision=m.revision)").bind(due.toISOString(),at,message.opportunity_id,settlementId));
    }
    if(state==='accepted') statements.push(
      db.prepare("UPDATE recommendations SET is_current=0,superseded_at=?,updated_at=? WHERE id=(SELECT d.recommendation_id FROM outbound_messages m JOIN drafts d ON d.id=m.draft_id WHERE m.settlement_id=?)").bind(at,at,settlementId)
    );
    if(state==='failed'||state==='delivery-unknown'||state==='reconciling') statements.push(db.prepare("UPDATE opportunities SET queue_state='now',queue_reason=?,next_due_at=NULL,updated_at=? WHERE id=? AND lifecycle='open' AND EXISTS(SELECT 1 FROM outbound_messages WHERE settlement_id=?)").bind(state==='failed'?'Delivery failure':'Delivery unresolved',at,message.opportunity_id,settlementId));
    return statements;
}
