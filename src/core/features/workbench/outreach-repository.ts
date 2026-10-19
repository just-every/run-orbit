import { ApprovalRepository, type ApprovalInput } from '../outreach/approval-repository';
import { settlementStatements } from '../outreach/settlement';
import { createId } from '../../shared/ids';
import { commercialEmailKey } from '../../../family/sales/identity';
import { WorkbenchError, WorkbenchRepository } from './repository';

export class OutreachRepository {
  constructor(private readonly db: D1Database) {}
  async createDraft(opportunityId: string, input: { contactId: string; subject: string; body: string }, actor: string) {
    const contact = await this.db.prepare("SELECT c.id,c.email,c.contactability FROM contacts c JOIN opportunity_contacts oc ON oc.contact_id=c.id JOIN opportunities o ON o.id=oc.opportunity_id WHERE oc.opportunity_id=? AND c.id=? AND o.lifecycle='open'").bind(opportunityId,input.contactId).first<{id:string;email:string;contactability:string}>();
    if (!contact || !contact.email) throw new WorkbenchError(400,'Choose a linked contact with an email on an open opportunity.');
    if(contact.contactability !== 'contactable') throw new WorkbenchError(409,'This contact must not be contacted.');
    const recommendation = await this.db.prepare('SELECT id FROM recommendations WHERE opportunity_id=? AND is_current=1').bind(opportunityId).first<{id:string}>();
    const id=createId(), now=new Date().toISOString();
    try{await this.db.batch([
      this.db.prepare("INSERT INTO runtime_controls(name,value) SELECT 'draft_permission_check',NULL WHERE NOT EXISTS(SELECT 1 FROM contacts c JOIN opportunity_contacts oc ON oc.contact_id=c.id JOIN opportunities o ON o.id=oc.opportunity_id WHERE c.id=? AND oc.opportunity_id=? AND o.lifecycle='open' AND c.contactability='contactable' AND lower(trim(c.email))=lower(trim(?)))").bind(contact.id,opportunityId,contact.email),
      this.db.prepare('INSERT INTO drafts(id,opportunity_id,recommendation_id,author_id,recipient_contact_id,recipient_email,subject,body,revision,is_stale,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,1,0,?,?)').bind(id,opportunityId,recommendation?.id??null,actor,contact.id,commercialEmailKey(contact.email),input.subject,input.body,now,now),
      ...new WorkbenchRepository(this.db).timeline(opportunityId,actor,'draft.created',{draftId:id,manual:true},now)
    ]);}catch(error){if(String(error).includes('runtime_controls.value'))throw new WorkbenchError(409,'Recipient permission changed; review the contact.');throw error;}
    return {id};
  }
  async claim(draftId:string,revision:number,actor:string,input:ApprovalInput={}) {
    return new ApprovalRepository(this.db).approve(draftId,revision,actor,input);
  }
  async settle(id: string, actor: string, state: 'accepted'|'failed'|'delivery-unknown'|'reconciling', providerId: string|null, failure: string|null, messageId?:string) {
    await this.db.batch(await settlementStatements(this.db,id,actor,state,providerId,failure,messageId));
  }
  async messages(opportunityId: string) {
    return (await this.db.prepare(`SELECT id,draft_id AS draftId,revision,state,recipient_email AS recipientEmail,subject,body,
      provider_message_id AS providerMessageId,failure,(SELECT carries FROM outbound_message_opt_out WHERE message_id=outbound_messages.id) AS optOut,next_attempt_at AS retryAfter,scheduled_at AS scheduledAt,created_at AS createdAt,
      (SELECT MIN(t.occurred_at) FROM timeline_entry_records r JOIN timeline_entries t ON t.id=r.timeline_entry_id
        WHERE r.record_type='opportunity' AND r.record_id=outbound_messages.opportunity_id AND t.kind='message.accepted'
          AND json_extract(t.payload_json,'$.messageId')=outbound_messages.id) AS acceptedAt,
      (SELECT MIN(t.occurred_at) FROM timeline_entry_records r JOIN timeline_entries t ON t.id=r.timeline_entry_id
        WHERE r.record_type='opportunity' AND r.record_id=outbound_messages.opportunity_id AND t.kind='provider.delivered'
          AND json_extract(t.payload_json,'$.messageId')=outbound_messages.id) AS deliveredAt
      FROM outbound_messages WHERE opportunity_id=? ORDER BY created_at DESC`).bind(opportunityId).all()).results;
  }
}
