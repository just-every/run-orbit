import { suppressionHashes, suppressionPredicate, suppressionContextFence } from '../records/suppression';
import {contactStopStatements} from '../records/suppression-effects';
import { weights } from './policies';
import { evaluationStatements } from './evaluation-repository';
import { createId } from '../../shared/ids';
import { contactEmailKey } from '../records/identity';
import { opportunityAssignmentPolicy } from '../../../ext/records';
import { assertCommercialRelationship } from '../../../family/sales/relationships';


export class WorkbenchError extends Error { constructor(readonly status: 400 | 404 | 409, message: string, readonly recordId?:string) { super(message); } }
export class WorkbenchRepository {
  constructor(readonly db: D1Database) {}
  async inventory() {
    const [companies, contacts, stages, opportunities] = await Promise.all([
      this.db.prepare('SELECT id,name FROM companies ORDER BY name').all(),
      this.db.prepare('SELECT id,name,email,company_id AS companyId FROM contacts ORDER BY name').all(),
      this.db.prepare('SELECT id,name FROM pipeline_stages ORDER BY position').all(),
      this.db.prepare('SELECT id,title,score,band,queue_state AS queueState,queue_reason AS queueReason,next_due_at AS nextDueAt FROM opportunities ORDER BY updated_at DESC LIMIT 200').all()
    ]);
    return { companies: companies.results, contacts: contacts.results, stages: stages.results, opportunities: opportunities.results };
  }
  async createOpportunity(input: { title: string; companyName: string; contactName: string; email: string; stageId: string; valueCents: number }, actor: string) {
    const email=input.email.trim().toLowerCase(),emailKey=contactEmailKey(email),ownerId=opportunityAssignmentPolicy.ownerForNewOpportunity({actorId:actor});
    if(ownerId&&!await this.db.prepare("SELECT id FROM operators WHERE id=? AND status='active'").bind(ownerId).first())throw new WorkbenchError(400,'Assignment policy selected an inactive or unknown operator.');
    const duplicate = await this.db.prepare("SELECT id FROM contacts WHERE email_key = ? UNION SELECT survivor_id AS id FROM record_aliases WHERE record_type='contact' AND identity_key=?").bind(emailKey,emailKey).first<{ id: string }>();
    if (duplicate) throw new WorkbenchError(409, `A contact already uses that email: ${duplicate.id}. Use the existing record.`,duplicate.id);
    if (!await this.db.prepare('SELECT id FROM pipeline_stages WHERE id = ?').bind(input.stageId).first()) throw new WorkbenchError(400, 'Unknown pipeline stage.');
    const emailTokens=await suppressionHashes(this.db,email);
    const now = new Date().toISOString(), companyId = createId(), contactId = createId(), id = createId();
    assertCommercialRelationship({ contactId, opportunityId: id }, { contactIds: new Set([contactId]), opportunityIds: new Set([id]) });
    try{await this.db.batch([
      ...suppressionContextFence(this.db,emailTokens),
      this.db.prepare('INSERT INTO companies(id,name,created_at,updated_at) VALUES(?,?,?,?)').bind(companyId,input.companyName,now,now),
      this.db.prepare(`INSERT INTO contacts(id,company_id,name,email,email_key,contactability,created_at,updated_at) VALUES(?,?,?,?,?,CASE WHEN ${suppressionPredicate(emailTokens)} THEN 'do_not_contact' ELSE 'contactable' END,?,?)`).bind(contactId,companyId,input.contactName,email,emailKey,now,now),
      this.db.prepare("INSERT INTO opportunities(id,title,lifecycle,stage_id,owner_id,company_id,value_cents,score,band,queue_state,queue_reason,created_at,updated_at) VALUES(?,?,'open',?,?,?,?,0,'low','now','Operator created opportunity',?,?)").bind(id,input.title,input.stageId,ownerId,companyId,input.valueCents,now,now),
      this.db.prepare('INSERT INTO opportunity_contacts(opportunity_id,contact_id,is_primary,created_at) VALUES(?,?,1,?)').bind(id,contactId,now),
      ...this.timeline(id,actor,'opportunity.created',{title:input.title},now)
    ]);}catch(error){const duplicate=await this.db.prepare("SELECT id FROM contacts WHERE email_key=? UNION SELECT survivor_id AS id FROM record_aliases WHERE record_type='contact' AND identity_key=?").bind(emailKey,emailKey).first<{id:string}>();if(duplicate)throw new WorkbenchError(409,`A contact already uses that identity: ${duplicate.id}.`,duplicate.id);throw error;}
    return { id };
  }
  timeline(opportunityId: string, actor: string, kind: string, payload: unknown, now: string, occurredAt = now, settlement?: string) {
    const id = createId();
    const guard = settlement ? " WHERE EXISTS(SELECT 1 FROM outbound_messages WHERE settlement_id='" + settlement + "')" : '';
    return [
      this.db.prepare("INSERT INTO timeline_entries(id,kind,occurred_at,recorded_at,actor_type,actor_id,source,payload_json) SELECT ?,?,?,?,'operator',?,'workbench',?" + guard).bind(id,kind,occurredAt,now,actor,JSON.stringify(payload)),
      this.db.prepare("INSERT INTO timeline_entry_records(timeline_entry_id,record_type,record_id) SELECT ?,'opportunity',?" + guard).bind(id,opportunityId),
      this.db.prepare("INSERT INTO audit_entries(id,actor_id,action,entity_type,entity_id,details_json,occurred_at) SELECT ?,?,?,'opportunity',?,?,?" + guard).bind(createId(),actor,kind,opportunityId,JSON.stringify(payload),now)
    ];
  }
  async recordEvent(opportunityId: string, input: { type: string; subject: string; occurredAt: string; eventId: string; contactId?: string; permanentBounce?: boolean }, actor: string) {
    const opportunity = await this.db.prepare('SELECT id,lifecycle,band FROM opportunities WHERE id = ?').bind(opportunityId).first<{id:string;lifecycle:string;band:string}>();
    if (!opportunity) throw new WorkbenchError(404,'Opportunity not found.');
    const stopsContact = input.type === 'email.unsubscribed' || (input.type === 'email.bounced' && input.permanentBounce === true);
    if (stopsContact && !input.contactId) throw new WorkbenchError(400,'Select the contact who unsubscribed or permanently bounced.');
    if (input.contactId) {
      const linked = await this.db.prepare('SELECT contact_id FROM opportunity_contacts WHERE opportunity_id=? AND contact_id=?').bind(opportunityId,input.contactId).first();
      if(!linked) throw new WorkbenchError(400,'The event contact must be linked to this opportunity.');
    }
    const source = `operator:${actor}`;
    const payloadHash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({opportunityId,...input})))), b=>b.toString(16).padStart(2,'0')).join('');
    const previous = await this.db.prepare('SELECT id,payload_hash FROM signals WHERE source_id = ? AND source_event_id = ?').bind(source,input.eventId).first<{id:string;payload_hash:string}>();
    if (previous) { if(previous.payload_hash !== payloadHash) throw new WorkbenchError(409,'Event ID already carries different evidence.'); return {id:previous.id}; }
    const now = new Date(), timestamp = now.toISOString(), id = createId();
    const statements = [
      this.db.prepare("INSERT OR IGNORE INTO signal_sources(id,name,type,enabled,created_at,updated_at) VALUES(?,?,'operator_attested',1,?,?)").bind(source,`Operator-attested customer event (${actor})`,timestamp,timestamp),
      this.db.prepare("INSERT INTO signals(id,source_id,source_event_id,type,subject,occurred_at,received_at,payload_hash,confidence,linking_basis,created_at) VALUES(?,?,?,?,?,?,?,?,?,'operator-attested record ID',?)").bind(id,source,input.eventId,input.type,input.subject,input.occurredAt,timestamp,payloadHash,['page.viewed','email.opened'].includes(input.type) ? 'inferred' : 'observed',timestamp),
      this.db.prepare("INSERT INTO signal_links(signal_id,record_type,record_id,linking_basis,linked_at) VALUES(?,'opportunity',?,'operator-attested record ID',?)").bind(id,opportunityId,timestamp),
      ...this.timeline(opportunityId,actor,'signal.recorded',{signalId:id,subject:input.subject,contactId:input.contactId??null,permanentBounce:input.permanentBounce===true},timestamp,input.occurredAt)
    ];
    if (input.contactId) statements.push(this.db.prepare("INSERT INTO signal_links(signal_id,record_type,record_id,linking_basis,linked_at) VALUES(?,'contact',?,'operator-attested contact ID',?)").bind(id,input.contactId,timestamp));
    if (stopsContact) statements.push(...await contactStopStatements(this.db,input.contactId!));
    if (opportunity.lifecycle === 'open' && (weights[input.type]??0)!==0) {
      statements.push(...evaluationStatements(this.db,opportunityId,actor,'New customer evidence',now));
      if(['email.replied','email.bounced'].includes(input.type))statements.push(this.db.prepare("UPDATE opportunities SET queue_state='now',queue_reason=?,next_due_at=NULL WHERE id=? AND lifecycle='open'").bind(input.type==='email.replied'?'Customer reply':'Delivery problem',opportunityId));
    }
    if(input.contactId && (['email.replied','meeting.booked','email.unsubscribed'].includes(input.type)||stopsContact))statements.push(this.db.prepare("UPDATE outbound_messages SET state='cancelled',failure='Customer stop event',updated_at=? WHERE contact_id=? AND state='scheduled'").bind(timestamp,input.contactId),this.db.prepare("UPDATE drafts SET is_stale=1,stale_reason='Customer stop event',updated_at=? WHERE recipient_contact_id=?").bind(timestamp,input.contactId));
    try { await this.db.batch(statements); }
    catch(error) {
      const concurrent = await this.db.prepare('SELECT id,payload_hash FROM signals WHERE source_id=? AND source_event_id=?').bind(source,input.eventId).first<{id:string;payload_hash:string}>();
      if(!concurrent) throw error;
      if(concurrent.payload_hash !== payloadHash) throw new WorkbenchError(409,'Event ID already carries different evidence.');
      return {id:concurrent.id};
    }
    return {id};
  }
}
