import { ApprovalRepository } from '../../src/core/features/outreach/approval-repository';
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { getPlatformProxy } from 'wrangler';
import { createApp } from '../support/app';
import { createDependencies } from '../support/dependencies';
import { createId } from '../../src/core/shared/ids';
import { WorkbenchRepository, WorkbenchError } from '../../src/core/features/workbench/repository';
import { OutreachRepository } from '../../src/core/features/workbench/outreach-repository';
import { testState } from '../support/test-state';

const platform = await getPlatformProxy<{ DB: D1Database }>({ configPath: 'wrangler.jsonc', envFiles:['tests/support/no-local-settings.env'], persist: { path: `${testState()}/v3` }, remoteBindings: false });
after(() => platform.dispose());
const db = platform.env.DB;
const workbench = new WorkbenchRepository(db);
const outreach = new OutreachRepository(db);

async function fixture() {
  const dependencies = createDependencies(db), actor = createId(), stageId = createId();
  await dependencies.auth.ensureOperator({ id: actor, email: `${actor}@operators.test`, displayName: 'Workbench operator' });
  await dependencies.workspace.ensureWorkspace({ name: 'Workbench test', timezone: 'UTC', currency: 'USD', workingHours: {}, staleIntervalDays: 14, awaitingResponseWorkingDays: 5, freeMailDomains: [] });
  const position = await db.prepare('SELECT COALESCE(MAX(position),0)+1 AS position FROM pipeline_stages').first<{position:number}>();
  await dependencies.workspace.ensurePipelineStage({ id: stageId, name: 'Qualified', position: position!.position });
  const email = `${createId()}@customer.test`;
  const input = { title: 'Customer opportunity', companyName: 'Customer account', contactName: 'Customer person', email, stageId, valueCents: 45000 };
  const opportunity = await workbench.createOpportunity(input, actor);
  const contact = await db.prepare('SELECT c.id,c.company_id FROM contacts c JOIN opportunity_contacts oc ON oc.contact_id=c.id WHERE oc.opportunity_id=?').bind(opportunity.id).first<{ id: string; company_id: string }>();
  assert.ok(contact);
  return { dependencies, actor, input, opportunityId: opportunity.id, contactId: contact.id, companyId: contact.company_id };
}
const conflict = (error: unknown) => error instanceof WorkbenchError && error.status === 409;

test('RECORD-001 workbench persists fresh account/contact/opportunity, rejects normalized identity with HTTP 409, and attributes creation', async () => {
  const f = await fixture();
  const company = await db.prepare('SELECT name FROM companies WHERE id=?').bind(f.companyId).first<{name:string}>();
  assert.equal(company?.name, f.input.companyName);
  const session = await f.dependencies.auth.createSession(f.actor);
  const app = createApp({ database: db, assets: { fetch: async () => new Response('test asset') } });
  const response = await app.request('https://orbit.test/api/v1/workbench/opportunities', { method: 'POST', headers: {
    cookie: `__Host-orbit_session=${session.token}`, origin: 'https://orbit.test', 'content-type': 'application/json'
  }, body: JSON.stringify({ ...f.input, email: f.input.email.toUpperCase() }) });
  assert.equal(response.status, 409);
  const entry = await db.prepare("SELECT actor_id,payload_json FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id WHERE r.record_id=? AND t.kind='opportunity.created'").bind(f.opportunityId).first<{actor_id:string;payload_json:string}>();
  assert.equal(entry?.actor_id, f.actor);
  assert.equal(JSON.parse(entry!.payload_json).title, f.input.title);
});

test('SIGNAL-001 operator events preserve attribution, idempotency, evidence and time decay', async () => {
  const f = await fixture();
  const old = await workbench.recordEvent(f.opportunityId, { type: 'meeting.booked', subject: 'Old meeting', occurredAt: new Date(Date.now()-31*86400000).toISOString(), eventId: createId() }, f.actor);
  const input = { type: 'email.replied', subject: 'Customer replied', occurredAt: new Date().toISOString(), eventId: createId() };
  const event = await workbench.recordEvent(f.opportunityId, input, f.actor);
  assert.deepEqual(await workbench.recordEvent(f.opportunityId, input, f.actor), event);
  await assert.rejects(workbench.recordEvent(f.opportunityId, {...input, subject:'Changed evidence'}, f.actor), conflict);
  const state = await db.prepare('SELECT score,band,queue_state FROM opportunities WHERE id=?').bind(f.opportunityId).first<{score:number;band:string;queue_state:string}>();
  assert.deepEqual(state, { score:40, band:'medium', queue_state:'now' });
  const evidence = await db.prepare('SELECT e.signal_id FROM recommendation_evidence e JOIN recommendations r ON r.id=e.recommendation_id WHERE r.opportunity_id=? AND r.is_current=1').bind(f.opportunityId).all<{signal_id:string}>();
  assert.deepEqual(evidence.results.map(row=>row.signal_id), [event.id]);
  assert.ok(!evidence.results.some(row=>row.signal_id===old.id));
  const signal = await db.prepare('SELECT source_id,confidence,linking_basis FROM signals WHERE id=?').bind(event.id).first<{source_id:string;confidence:string;linking_basis:string}>();
  assert.equal(signal?.source_id, `operator:${f.actor}`);
  assert.equal(signal?.confidence, 'observed');
  assert.equal(signal?.linking_basis, 'operator-attested record ID');
  const count = await db.prepare('SELECT COUNT(*) AS count FROM signals WHERE source_id=? AND source_event_id=?').bind(`operator:${f.actor}`,input.eventId).first<{count:number}>();
  assert.equal(count?.count,1);
});

test('OUT-001 OUT-003 manual draft approval checks revision and staleness, submits exact content once concurrently and moves accepted opportunity to NEXT', async () => {
  const f = await fixture();
  const content = { contactId:f.contactId, subject:'Reviewed subject', body:'The exact operator-reviewed message.' };
  const stale = await outreach.createDraft(f.opportunityId, content, f.actor);
  await assert.rejects(outreach.claim(stale.id, 2, f.actor), conflict);
  await workbench.recordEvent(f.opportunityId,{type:'email.replied',subject:'New reply',occurredAt:new Date().toISOString(),eventId:createId()},f.actor);
  await assert.rejects(outreach.claim(stale.id,1,f.actor), conflict);
  const draft = await outreach.createDraft(f.opportunityId,content,f.actor);
  const calls: Array<{id:string;recipient_email:string;subject:string;body:string}> = [];
  const app = createApp({ database:db,assets:{fetch:async()=>new Response('test asset')},outboundMail:{send:async input=>{calls.push(input);return {providerMessageId:'test-receipt'};}} });
  const session = await f.dependencies.auth.createSession(f.actor);
  const approve = async () => app.request(`https://orbit.test/api/v1/workbench/drafts/${draft.id}/approve`, {method:'POST',headers:{cookie:`__Host-orbit_session=${session.token}`,origin:'https://orbit.test','content-type':'application/json'},body:JSON.stringify({revision:1,quietHoursConfirmation:(await new ApprovalRepository(db).preview(draft.id)).localTime})});
  const results = await Promise.all([approve(),approve()]);
  assert.deepEqual(results.map(response=>response.status).sort(),[200,409]);
  assert.equal(calls.length,1);
  assert.equal(calls[0]?.recipient_email,f.input.email.toLowerCase());
  assert.equal(calls[0]?.subject,content.subject);
  assert.equal(calls[0]?.body,content.body);
  assert.equal((await approve()).status,409);
  assert.equal(calls.length,1);
  const messages = await outreach.messages(f.opportunityId);
  assert.equal(messages.length,1);
  assert.equal(messages[0]?.state,'accepted');
  const state = await db.prepare('SELECT queue_state,next_due_at FROM opportunities WHERE id=?').bind(f.opportunityId).first<{queue_state:string;next_due_at:string}>();
  assert.equal(state?.queue_state,'next');
  assert.ok(Date.parse(state!.next_due_at)>Date.now());
  const timelineBefore = await db.prepare("SELECT COUNT(*) AS count FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id WHERE r.record_id=?").bind(f.opportunityId).first<{count:number}>();
  await db.prepare("UPDATE opportunities SET queue_state='now',queue_reason='New customer evidence' WHERE id=?").bind(f.opportunityId).run();
  await outreach.settle(String(messages[0]!.id),f.actor,'accepted','test-receipt',null);
  const timelineAfter = await db.prepare("SELECT COUNT(*) AS count FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id WHERE r.record_id=?").bind(f.opportunityId).first<{count:number}>();
  assert.equal(timelineAfter?.count,timelineBefore?.count);
  const replayState = await db.prepare('SELECT queue_state FROM opportunities WHERE id=?').bind(f.opportunityId).first<{queue_state:string}>();
  assert.equal(replayState?.queue_state,'now');
});

test('SIGNAL-001 concurrent distinct events preserve both contributions and concurrent duplicate events share one identity', async () => {
  const f = await fixture();
  const now = new Date().toISOString();
  const events = await Promise.all([
    workbench.recordEvent(f.opportunityId,{type:'email.replied',subject:'Reply',occurredAt:now,eventId:createId()},f.actor),
    workbench.recordEvent(f.opportunityId,{type:'meeting.booked',subject:'Meeting',occurredAt:now,eventId:createId()},f.actor)
  ]);
  const contributions = await db.prepare("SELECT c.signal_id FROM evaluation_contributions c JOIN evaluations e ON e.id=c.evaluation_id WHERE e.opportunity_id=? AND e.status='current'").bind(f.opportunityId).all<{signal_id:string}>();
  assert.deepEqual(contributions.results.map(row=>row.signal_id).sort(),events.map(event=>event.id).sort());
  const state = await db.prepare('SELECT score FROM opportunities WHERE id=?').bind(f.opportunityId).first<{score:number}>();
  assert.equal(state?.score,85);
  const duplicate = {type:'content.downloaded',subject:'Download',occurredAt:now,eventId:createId()};
  const replays = await Promise.all([workbench.recordEvent(f.opportunityId,duplicate,f.actor),workbench.recordEvent(f.opportunityId,duplicate,f.actor)]);
  assert.equal(replays[0]?.id,replays[1]?.id);
  const count = await db.prepare('SELECT COUNT(*) AS count FROM signals WHERE source_id=? AND source_event_id=?').bind(`operator:${f.actor}`,duplicate.eventId).first<{count:number}>();
  assert.equal(count?.count,1);
});

test('OUT-005 a receipt arriving after new customer evidence records acceptance without overwriting NOW', async () => {
  const f = await fixture();
  const draft = await outreach.createDraft(f.opportunityId,{contactId:f.contactId,subject:'Reviewed follow-up',body:'Approved before the customer reply.'},f.actor);
  const message = await outreach.claim(draft.id,1,f.actor,{quietHoursConfirmation:(await new ApprovalRepository(db).preview(draft.id)).localTime});
  await workbench.recordEvent(f.opportunityId,{type:'email.replied',subject:'Customer replied during provider submission',occurredAt:new Date().toISOString(),eventId:createId()},f.actor);
  await outreach.settle(message.id,f.actor,'accepted','receipt-after-reply',null);
  const stored = await db.prepare('SELECT state,provider_message_id FROM outbound_messages WHERE id=?').bind(message.id).first<{state:string;provider_message_id:string}>();
  assert.deepEqual(stored,{state:'accepted',provider_message_id:'receipt-after-reply'});
  const opportunity = await db.prepare('SELECT queue_state,queue_reason FROM opportunities WHERE id=?').bind(f.opportunityId).first<{queue_state:string;queue_reason:string}>();
  assert.deepEqual(opportunity,{queue_state:'now',queue_reason:'Customer reply'});
});

test('RECORD-012 unsubscribe and permanent bounce require linked contact and atomically block all their drafts', async () => {
  for (const type of ['email.unsubscribed','email.bounced']) {
    const f = await fixture(), other = await fixture();
    const input = {type,subject:'Customer opted out',occurredAt:new Date().toISOString(),eventId:createId(),...(type==='email.bounced'?{permanentBounce:true}:{})};
    const badContact = (error: unknown) => error instanceof WorkbenchError && error.status===400;
    await assert.rejects(workbench.recordEvent(f.opportunityId,input,f.actor),badContact);
    await assert.rejects(workbench.recordEvent(f.opportunityId,{...input,contactId:other.contactId},f.actor),badContact);
    const main = await outreach.createDraft(f.opportunityId,{contactId:f.contactId,subject:'First',body:'Draft on first opportunity'},f.actor);
    await db.prepare('INSERT INTO opportunity_contacts(opportunity_id,contact_id,is_primary,created_at) VALUES(?,?,0,?)').bind(other.opportunityId,f.contactId,new Date().toISOString()).run();
    const related = await outreach.createDraft(other.opportunityId,{contactId:f.contactId,subject:'Second',body:'Draft on related opportunity'},f.actor);
    const event = await workbench.recordEvent(f.opportunityId,{...input,contactId:f.contactId},f.actor);
    const link = await db.prepare("SELECT record_id FROM signal_links WHERE signal_id=? AND record_type='contact'").bind(event.id).first<{record_id:string}>();
    assert.equal(link?.record_id,f.contactId);
    const activity = await db.prepare("SELECT payload_json FROM timeline_entries WHERE kind='signal.recorded' AND json_extract(payload_json,'$.signalId')=?").bind(event.id).first<{payload_json:string}>();
    assert.deepEqual(JSON.parse(activity!.payload_json),{signalId:event.id,subject:input.subject,contactId:f.contactId,permanentBounce:type==='email.bounced'});
    const contact = await db.prepare('SELECT contactability FROM contacts WHERE id=?').bind(f.contactId).first<{contactability:string}>();
    assert.equal(contact?.contactability,'do_not_contact');
    for (const draft of [main,related]) {
      const stored = await db.prepare('SELECT is_stale FROM drafts WHERE id=?').bind(draft.id).first<{is_stale:number}>();
      assert.equal(stored?.is_stale,1);
      await assert.rejects(outreach.claim(draft.id,1,f.actor),conflict);
    }
    await assert.rejects(outreach.createDraft(f.opportunityId,{contactId:f.contactId,subject:'Blocked',body:'Blocked'},f.actor),conflict);
  }
});
