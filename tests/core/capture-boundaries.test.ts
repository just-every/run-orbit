import assert from 'node:assert/strict';
import { test } from 'node:test';
import { captureFixture, eml, unsubscribeMessage } from '../support/capture-fixture';
import { createSourceSecurity } from '../../src/core/platform/source-security';
import { IngestionRepository } from '../../src/core/features/ingestion/repository';
import { signSource } from '../../src/core/features/ingestion/booking-webhooks';
import { createId } from '../../src/core/shared/ids';

const rfc = (minutes: number) => new Date(Date.now() - minutes * 60000).toUTCString().replace('GMT', '+0000');
const count = async (db: D1Database, sql: string, ...bindings: unknown[]) => Number(await db.prepare(sql).bind(...bindings).first('n'));

test('CAPTURE-003 CAPTURE-005 OUT-001 OUT-007 ACTION-005 RECORD-012 SIGNAL-009 a captured reply stops outreach at once while its proposals wait; capture never drafts, sends or makes anyone contactable, and only an operator session may capture', async () => {
  const f = await captureFixture();
  try {
    const sends = f.sent.length, drafts = await count(f.db, 'SELECT count(*) n FROM drafts'), outbound = await count(f.db, 'SELECT count(*) n FROM outbound_messages');
    const reply = eml({ From: 'Ana Ruiz <ana@acme.example>', To: 'seller@orbit.test', Subject: 'Quick question', Date: rfc(15), 'Message-ID': '<question-1@acme.example>' }, 'Before Tuesday, can you share the security review?\nPhone: +1 212 555 0199');
    assert.equal((await f.upload([{ name: 'reply.eml', text: reply }])).status, 201);
    assert.deepEqual(await f.db.prepare('SELECT state,failure FROM outbound_messages WHERE id=?').bind(f.scheduled).first(), { state: 'cancelled', failure: 'Customer reply' }, 'the scheduled send is cancelled at once');
    for (const draft of [f.scheduledDraft, f.unsentDraft]) assert.equal(await f.db.prepare('SELECT is_stale FROM drafts WHERE id=?').bind(draft).first('is_stale'), 1, 'unsent drafts are stale (ACTION-005)');
    const pending = await count(f.db, "SELECT count(*) n FROM capture_proposals WHERE status='pending'");
    assert.ok(pending >= 2, 'the link and the phone number wait for review');
    assert.equal(await count(f.db, "SELECT count(*) n FROM signal_links l JOIN capture_items i ON i.signal_id=l.signal_id"), 0, 'the reply itself is not on any timeline until reviewed');
    assert.equal(await f.db.prepare('SELECT phone FROM contacts WHERE id=?').bind(f.ana).first('phone'), null);

    // An unsubscribe request is a proposal; Ana stays contactable until a person accepts it.
    await f.upload([{ name: 'unsubscribe.eml', text: unsubscribeMessage() }]);
    const stop = await f.db.prepare("SELECT id FROM capture_proposals WHERE kind='do_not_contact' AND record_id=?").bind(f.ana).first<{ id: string }>();
    assert.ok(stop);
    assert.equal(await f.db.prepare('SELECT contactability FROM contacts WHERE id=?').bind(f.ana).first('contactability'), 'contactable');

    // Accept everything capture offered: still no draft, no approval and no provider call.
    for (const proposal of (await f.db.prepare("SELECT id FROM capture_proposals WHERE status='pending' ORDER BY created_at").all<{ id: string }>()).results)
      assert.ok([200, 409].includes((await f.request(`/api/v1/capture/proposals/${proposal.id}/accept`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status));
    assert.equal(await f.db.prepare('SELECT contactability FROM contacts WHERE id=?').bind(f.ana).first('contactability'), 'do_not_contact');
    assert.ok(await f.db.prepare("SELECT 1 FROM audit_entries WHERE action='contact.suppressed'").first(), 'the accepted stop leaves its suppression proof (RECORD-012)');
    assert.equal(await count(f.db, 'SELECT count(*) n FROM drafts'), drafts);
    assert.equal(await count(f.db, 'SELECT count(*) n FROM outbound_messages'), outbound);
    assert.equal(await count(f.db, "SELECT count(*) n FROM outbound_messages WHERE state IN('queued','scheduled','accepted') AND updated_at>(SELECT max(captured_at) FROM capture_items)"), 0);
    assert.equal(f.sent.length, sends, 'the mail provider was never called');
    assert.equal(await count(f.db, "SELECT count(*) n FROM contacts WHERE contactability='contactable' AND id NOT IN(?,?)", f.ana, f.bob), 0, 'capture made nobody contactable');

    // Only an operator session reaches capture. A signed source's signature is not authority here.
    const security = createSourceSecurity({ ORBIT_ENCRYPTION_KEY: '22'.repeat(32) })!, secret = 'capture-boundary-secret-'.repeat(2), source = createId();
    await new IngestionRepository(f.db).configure({ id: source, name: 'Signed tool', enabled: true, secret }, security);
    const timestamp = String(Math.floor(Date.now() / 1000)), form = new FormData();
    form.append('files', new File([reply.replace('question-1', 'question-2')], 'signed.eml'));
    const signed = await f.app.request('https://orbit.test/api/v1/capture/imports', { method: 'POST', headers: { origin: 'https://orbit.test', 'X-Orbit-Timestamp': timestamp, 'X-Orbit-Signature': await signSource(secret, `${timestamp}.signed`), authorization: `Bearer ${'ab'.repeat(32)}` }, body: form });
    assert.equal(signed.status, 401);
    assert.equal((await f.upload([{ name: 'cross-site.eml', text: reply }], false, { cookie: f.cookie, origin: 'https://attacker.example' })).status, 403);
    for (const path of ['/api/v1/capture/sources', '/api/v1/capture/proposals']) assert.equal((await f.app.request(`https://orbit.test${path}`)).status, 401);
    const collaborator = createId();
    await f.db.prepare('INSERT INTO access_collaborators(operator_id,invited_at) VALUES(?,?)').bind(collaborator, new Date().toISOString()).run();
    await f.deps.auth.ensureOperator({ id: collaborator, email: 'analyst@collaborator.test', displayName: 'Invited analyst' });
    const restricted = `__Host-orbit_session=${(await f.deps.auth.createSession(collaborator)).token}`;
    assert.equal((await f.upload([{ name: 'collaborator.eml', text: reply }], false, { cookie: restricted, origin: 'https://orbit.test' })).status, 403, 'an invited collaborator cannot capture');
    // SIGNAL-009 stays narrow: the signed signal path cannot write into the capture source.
    const raw = JSON.stringify({ eventId: 'forged', type: 'email.replied', subject: 'Forged', occurredAt: new Date().toISOString(), email: 'ana@acme.example' });
    assert.equal((await f.app.request('https://orbit.test/api/v1/signals/capture-files', { method: 'POST', headers: { 'X-Orbit-Timestamp': timestamp, 'X-Orbit-Signature': await signSource(secret, `${timestamp}.${raw}`) }, body: raw })).status, 403);
    assert.equal(await count(f.db, "SELECT (SELECT count(*) FROM signals WHERE subject='Forged')+(SELECT count(*) FROM capture_items WHERE headers LIKE '%question-2%') AS n"), 0);
  } finally { await f.dispose(); }
});
