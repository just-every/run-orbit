import {workflowJourney} from '../support/workflow-journey';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { captureFixture, fixtureMailbox, eml } from '../support/capture-fixture';

interface Proposal { id: string; kind: string; record_id: string; field: string | null; current_value: string | null; proposed_value: string | null; details: { evidence: { sender: string; date: string; subject: string; quote: string[] } } }
const rfc = (minutes: number) => new Date(Date.now() - minutes * 60000).toUTCString().replace('GMT', '+0000');

test('CAPTURE-004 CAPTURE-005 captured evidence only proposes changes; a person accepts, edits or declines each, and a declined change never returns for the same evidence; activated workflows use separate guarded write authority', async () => {
  const f = await captureFixture();
  try {
    const mail = fixtureMailbox(f);
    const direct = eml({ From: '"Ana Ruiz-Lopez" <ana@acme.example>', To: 'seller@orbit.test', Cc: 'Dan Ito <dan@acme.example>', Subject: 'Budget', Date: rfc(12), 'Message-ID': '<direct-1@acme.example>' }, 'We have budget for Q1.\nMobile: +44 20 7946 0000\n\n--\nAna');
    const lookalike = eml({ From: '"Ana Ruiz" <ana.ruiz@freemail.example>', To: 'seller@orbit.test', Subject: 'Hello', Date: rfc(11), 'Message-ID': '<lookalike-1@freemail.example>' }, 'Same name, different person.');
    const files = [{ name: 'direct.eml', text: direct }, { name: 'forward.eml', text: mail.forward }, { name: 'invite.ics', text: mail.invite }, { name: 'lookalike.eml', text: lookalike }];
    // The stop a reply or booking makes at once (OUT-007) records its own cancellation entry; everything else waits for review.
    const snapshot = async () => Object.fromEntries(await Promise.all(['contacts', 'companies', 'signal_links', 'timeline_entry_records', 'opportunity_contacts'].map(async table => [table, (await f.db.prepare(`SELECT * FROM ${table}${table === 'timeline_entry_records' ? " WHERE timeline_entry_id NOT LIKE 'schedule-stop:%'" : ''} ORDER BY 1,2`).all()).results])));
    const opportunityBefore = await f.db.prepare('SELECT queue_state,queue_reason,next_due_at,stage_id,owner_id,score FROM opportunities WHERE id=?').bind(f.opportunity).first<Record<string, unknown>>();
    const before = await snapshot();
    const { summary } = await (await f.upload(files)).json() as { summary: Record<string, any> };
    assert.equal(summary.captured, 3); assert.deepEqual(summary.skipReasons, { 'No known contact or company domain': 1 }, 'a lookalike name on a free-mail address is not a known participant');
    assert.deepEqual(await snapshot(), before, 'no record, link or timeline entry changes before review');
    const opportunityAfter = await f.db.prepare('SELECT queue_state,queue_reason,next_due_at,stage_id,owner_id,score FROM opportunities WHERE id=?').bind(f.opportunity).first<Record<string, unknown>>();
    assert.deepEqual({ ...opportunityAfter, queue_state: undefined, queue_reason: undefined, next_due_at: undefined }, { ...opportunityBefore, queue_state: undefined, queue_reason: undefined, next_due_at: undefined }, 'stage, owner and score wait for review');
    assert.deepEqual([opportunityAfter!.queue_state, opportunityAfter!.queue_reason], ['now', 'Customer reply'], 'only the stopped scheduled send returned it to NOW (OUT-009)');

    const list = async (query = '') => ((await (await f.request(`/api/v1/capture/proposals${query}`)).json()) as { proposals: Proposal[] }).proposals;
    const proposals = await list();
    const of = (kind: string, field?: string) => proposals.filter(p => p.kind === kind && (field === undefined || p.field === field));
    assert.deepEqual(proposals.map(p => p.kind).sort(), ['create_contact', 'create_contact', 'link_signal', 'link_signal', 'link_signal', 'next_action', 'set_field', 'set_field'].sort());
    assert.ok(proposals.every(p => p.details.evidence.date && p.details.evidence.quote.length), 'every proposal carries its evidence');
    const name = of('set_field', 'name')[0]!, phone = of('set_field', 'phone')[0]!;
    assert.deepEqual([name.current_value, name.proposed_value], ['Ana Ruiz', 'Ana Ruiz-Lopez'], 'old and new side by side');
    assert.deepEqual([phone.current_value, phone.proposed_value], [null, '+44 20 7946 0000']);
    assert.match(phone.details.evidence.quote.join('\n') + '\n' + JSON.stringify(phone), /Mobile: \+44 20 7946 0000/);
    assert.ok(!proposals.some(p => JSON.stringify(p).includes('ana.ruiz@freemail.example')), 'a guessed identity is never proposed');
    assert.equal((await list(`?recordType=company&recordId=${f.company}`)).length, proposals.length, 'the account shows every proposal for its people');

    // Accept a link: the evidence appears once, attributed to the person and to the capture source.
    const meeting = proposals.find(p => p.kind === 'link_signal' && p.details.evidence.subject === 'Acme rollout review')!;
    assert.equal((await f.request(`/api/v1/capture/proposals/${meeting.id}/accept`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status, 200);
    assert.equal((await f.request(`/api/v1/capture/proposals/${meeting.id}/accept`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status, 409);
    const entries = (await f.db.prepare("SELECT t.id,t.actor_type,t.actor_id,t.source,t.payload_json FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id WHERE r.record_type='company' AND r.record_id=? AND t.kind='signal.recorded'").bind(f.company).all<{ id: string; actor_type: string; actor_id: string; source: string; payload_json: string }>()).results;
    assert.equal(entries.length, 1);
    assert.deepEqual([entries[0]!.actor_type, entries[0]!.actor_id, entries[0]!.source], ['operator', f.operator, 'capture-files']);
    assert.equal(JSON.parse(entries[0]!.payload_json).proposalId, meeting.id);
    const detail = await (await f.request(`/api/v1/records/company/${f.company}`)).json() as { timeline: { kind: string }[] };
    assert.equal(detail.timeline.filter(entry => entry.kind === 'signal.recorded').length, 1, 'the account timeline shows it once');

    // Edit before accepting; refuse a value that changed since review.
    assert.equal((await f.request(`/api/v1/capture/proposals/${name.id}/accept`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ value: 'Ana Ruiz López' }) })).status, 200);
    assert.equal(await f.db.prepare('SELECT name FROM contacts WHERE id=?').bind(f.ana).first('name'), 'Ana Ruiz López');
    const ana = await (await f.request(`/api/v1/records/contact/${f.ana}`)).json() as { record: Record<string, unknown> };
    assert.equal((await f.request(`/api/v1/records/contact/${f.ana}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: ana.record.name, email: ana.record.email, company_id: f.company, phone: '+1 000 000 0000' }) })).status, 200);
    assert.equal((await f.request(`/api/v1/capture/proposals/${phone.id}/accept`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status, 409);
    assert.equal(await f.db.prepare('SELECT phone FROM contacts WHERE id=?').bind(f.ana).first('phone'), '+1 000 000 0000');

    // Create only by exact key, never contactable; decline is remembered for the same evidence.
    const dan = of('create_contact').find(p => p.proposed_value === 'dan@acme.example')!, cara = of('create_contact').find(p => p.proposed_value === 'cara@acme.example')!;
    assert.equal((await f.request(`/api/v1/capture/proposals/${dan.id}/accept`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status, 200);
    assert.deepEqual(await f.db.prepare("SELECT name,company_id,contactability FROM contacts WHERE email='dan@acme.example'").first(), { name: 'Dan Ito', company_id: f.company, contactability: 'do_not_contact' });
    assert.equal((await f.request(`/api/v1/capture/proposals/${cara.id}/decline`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status, 200);
    await f.upload(files);
    const pending = await list();
    assert.ok(!pending.some(p => p.id === cara.id || p.proposed_value === 'cara@acme.example'), 'the declined proposal does not return');
    assert.equal(await f.db.prepare("SELECT count(*) n FROM capture_proposals WHERE proposed_value='cara@acme.example'").first('n'), 1);
    assert.equal(await f.db.prepare("SELECT count(*) n FROM contacts WHERE email='cara@acme.example'").first('n'), 0);
    assert.ok(await f.db.prepare("SELECT 1 FROM audit_entries WHERE action='capture.declined' AND entity_id=?").bind(cara.id).first());
    await workflowJourney(f);
  } finally { await f.dispose(); }
});
