import {captureSourceBoundary} from '../support/capture-source-boundary';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { captureFixture, eml, unsubscribeMessage } from '../support/capture-fixture';
import { createApp } from '../support/app';
import { payloadHash } from '../../src/core/platform/source-security';
import { createSourceSecurity } from '../../src/core/platform/source-security';
import { IngestionRepository } from '../../src/core/features/ingestion/repository';
import { signSource } from '../../src/core/features/ingestion/booking-webhooks';
import { createId } from '../../src/core/shared/ids';
import { random } from '../../src/core/features/delegation/protocol';
import { challenge } from '../../src/core/features/delegation/token';

const rfc = (minutes: number) => new Date(Date.now() - minutes * 60000).toUTCString().replace('GMT', '+0000');
const count = async (db: D1Database, sql: string, ...bindings: unknown[]) => Number(await db.prepare(sql).bind(...bindings).first('n'));

test('CAPTURE-003 CAPTURE-005 OUT-001 OUT-007 ACTION-005 RECORD-012 SIGNAL-009 a captured reply stops outreach at once while its proposals wait; capture never drafts, sends or makes anyone contactable, and only an operator session may capture', async () => {
  const f = await captureFixture();
  try {
    const sends = f.sent.length, drafts = await count(f.db, 'SELECT count(*) n FROM drafts'), outbound = await count(f.db, 'SELECT count(*) n FROM outbound_messages');
    const reply = eml({ From: 'Ana Ruiz <ana@acme.example>', To: 'seller@orbit.test', Subject: 'Quick question', Date: rfc(15), 'Message-ID': '<question-1@acme.example>' }, 'Before Tuesday, can you share the security review?\nPhone: +1 212 555 0199');
    // Neither a source name nor an old signing credential grants access to capture's replay namespace.
    const ingressSecurity = createSourceSecurity({ ORBIT_ENCRYPTION_KEY: '22'.repeat(32) })!;
    const ingress = createApp({ database: f.db, assets: { fetch: async () => new Response('') }, sourceSecurity: ingressSecurity });
    const signingSecret = 'capture-namespace-test-secret'.repeat(2), now = new Date().toISOString();
    for (const [id, type] of [['legacy-calendar', 'capture'], ['capture-files', 'capture'], ['capture-old-webhook', 'signed_webhook']]) {
      await f.db.prepare('INSERT INTO signal_sources(id,name,type,enabled,created_at,updated_at,secret_ciphertext) VALUES(?,?,?,1,?,?,?)')
        .bind(id, id, type, now, now, await ingressSecurity.seal(signingSecret)).run();
      const configured = await ingress.request(`https://orbit.test/api/v1/sources/${id}`, { method: 'PUT', headers: { cookie: f.cookie, origin: 'https://orbit.test', 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Signed tool', enabled: true }) });
      assert.equal(configured.status, 403, 'a capture row or reserved ID cannot become a signed source');
      const forged = JSON.stringify({ eventId: await payloadHash('<question-1@acme.example>').then(hash => `message:${hash}`), type: `${id}:note`, subject: 'Forged reply identity', occurredAt: now });
      const timestamp = String(Math.floor(Date.now() / 1000));
      const posted = await ingress.request(`https://orbit.test/api/v1/signals/${id}`, { method: 'POST', headers: { 'X-Orbit-Timestamp': timestamp, 'X-Orbit-Signature': await signSource(signingSecret, `${timestamp}.${forged}`) }, body: forged });
      assert.equal(posted.status, 403, 'a legacy valid secret cannot plant a captured reply identity');
    }
    assert.equal((await ingress.request('https://orbit.test/api/v1/sources/capture-future', { method: 'PUT', headers: { cookie: f.cookie, origin: 'https://orbit.test', 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Reserved', enabled: true }) })).status, 403);
    assert.equal(await count(f.db, "SELECT count(*) n FROM signals WHERE subject='Forged reply identity'"), 0);
    assert.equal(await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(f.scheduled).first('state'), 'scheduled');
    for(const id of ['legacy-calendar','capture-files','capture-old-webhook'])await f.db.prepare('DELETE FROM signal_sources WHERE id=?').bind(id).run();
    await captureSourceBoundary(f,reply);
    // Encoded words are display text: a forged display name or Cc never stands in for Ana's address.
    const forged = (headers: Record<string, string>) => eml({ To: 'seller@orbit.test', Subject: 'Re: Proposal for Acme', Date: rfc(14), 'In-Reply-To': f.anaThread, References: f.anaThread, ...headers }, 'We are no longer interested.\nPlease remove me from your list.');
    for (const headers of [{ From: '=?utf-8?q?ana=40acme=2Eexample=2C?= <mallory@evil.example>', 'Message-ID': '<forged-q@evil.example>' }, { From: `=?utf-8?b?${btoa('Ana Ruiz <ana@acme.example>,')}?= <mallory@evil.example>`, 'Message-ID': '<forged-b@evil.example>' }, { From: 'mallory@evil.example', Cc: '=?utf-8?q?ana=40acme=2Eexample=2C?= <other@evil.example>', 'Message-ID': '<forged-cc@evil.example>' }])
      assert.equal(((await (await f.upload([{ name: 'forged.eml', text: forged(headers) }])).json()) as { summary: { skipped: number } }).summary.skipped, 1, `${headers.From} is not Ana`);
    assert.equal(await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(f.scheduled).first('state'), 'scheduled');
    assert.equal(await count(f.db, 'SELECT count(*) n FROM capture_proposals WHERE record_id=?', f.ana), 0);

    // A currently consented application can read its selected deal, but cannot import the same valid mail as a person.
    const client = 'synthetic-orbit-capture-reader', redirect = 'https://agent.test/callback';
    const consent = (path: string, body: Record<string, string>) => f.request(`/delegation${path}`, { method: 'POST', body: new URLSearchParams(body) });
    assert.equal((await consent('/clients', { id: client, redirect_uri: redirect })).status, 303);
    const verifier = random(), target = `opportunities/${f.opportunity}`;
    const allowed = await consent('/authorize', { client_id: client, redirect_uri: redirect, response_type: 'code', state: random(), code_challenge: await challenge(verifier), code_challenge_method: 'S256', account_id: 'workspace', scope: 'crm.evidence.read', targets: JSON.stringify([target]) });
    assert.equal(allowed.status, 303, await allowed.clone().text());
    const code = new URL(allowed.headers.get('location')!).searchParams.get('code');
    assert.ok(code);
    const exchanged = await f.app.request('https://orbit.test/api/delegation/v1/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'authorization_code', client_id: client, redirect_uri: redirect, code, code_verifier: verifier }) });
    assert.equal(exchanged.status, 200, await exchanged.clone().text());
    const token = (await exchanged.json() as { access_token: string }).access_token;
    assert.ok(token);
    const delegatedRead = () => f.app.request(`https://orbit.test/api/delegation/v1/evidence?target=${encodeURIComponent(target)}`, { headers: { authorization: `Bearer ${token}` } });
    const evidence = await delegatedRead();
    assert.equal(evidence.status, 200, await evidence.clone().text());
    const observed = await evidence.json() as { target: string; title: string; text: string };
    assert.equal(observed.target, target);
    assert.equal(observed.title, 'Acme rollout');
    assert.equal(JSON.parse(observed.text).opportunity.id, f.opportunity);
    const inventory = async () => Object.fromEntries(await Promise.all(['signal_sources', 'capture_sources', 'capture_items', 'signals', 'signal_links', 'capture_proposals', 'contacts', 'drafts', 'outbound_messages', 'timeline_entries'].map(async table => [table, (await f.db.prepare(`SELECT * FROM ${table}`).all()).results.map(row => JSON.stringify(row)).sort()])));
    const beforeDelegation = await inventory();
    const refused = await f.upload([{ name: 'reply.eml', text: reply }], false, { origin: 'https://orbit.test', authorization: `Bearer ${token}` });
    assert.equal(refused.status, 401, 'a valid delegation is not a native Capture session');
    assert.deepEqual(await inventory(), beforeDelegation, 'refusing delegated intake changes no source, evidence, proposal, contact, draft or message');
    assert.equal((await delegatedRead()).status, 200, 'the application remains authorized for its scoped read');
    assert.equal((await f.upload([{ name: 'reply.eml', text: reply }])).status, 201);
    assert.deepEqual(await f.db.prepare('SELECT state,failure FROM outbound_messages WHERE id=?').bind(f.scheduled).first(), { state: 'cancelled', failure: 'Customer reply' }, 'the scheduled send is cancelled at once');
    for (const draft of [f.scheduledDraft, f.unsentDraft]) assert.equal(await f.db.prepare('SELECT is_stale FROM drafts WHERE id=?').bind(draft).first('is_stale'), 1, 'unsent drafts are stale (ACTION-005)');
    const pending = await count(f.db, "SELECT count(*) n FROM capture_proposals WHERE status='pending'");
    assert.ok(pending >= 2, 'the link and the phone number wait for review');
    assert.equal(await count(f.db, "SELECT count(*) n FROM signal_links l JOIN capture_items i ON i.signal_id=l.signal_id"), 0, 'the reply itself is not on any timeline until reviewed');
    assert.equal(await f.db.prepare('SELECT phone FROM contacts WHERE id=?').bind(f.ana).first('phone'), null);
    // Ana's own encoded display name, even one with a comma, still stops a new send and attaches in her thread.
    await f.db.prepare("UPDATE outbound_messages SET state='scheduled',failure=NULL WHERE id=?").bind(f.scheduled).run();
    const threaded = eml({ From: '=?utf-8?q?Ruiz=2C_Ana?= <ana@acme.example>', To: 'seller@orbit.test', Subject: 'Re: Proposal for Acme', Date: rfc(12), 'Message-ID': '<thread-1@acme.example>', 'In-Reply-To': f.anaThread, References: f.anaThread }, 'Thanks, we will hold for now.');
    assert.equal(((await (await f.upload([{ name: 'threaded.eml', text: threaded }])).json()) as { summary: { attached: number } }).summary.attached, 1);
    assert.equal(await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(f.scheduled).first('state'), 'cancelled');
    assert.equal(await count(f.db, "SELECT count(*) n FROM signal_links l JOIN signals s ON s.id=l.signal_id WHERE s.source_event_id=? AND l.record_id IN(?,?)", 'message:' + await payloadHash('<thread-1@acme.example>'), f.ana, f.opportunity), 2);

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
    const security = createSourceSecurity({ ORBIT_ENCRYPTION_KEY: '22'.repeat(32) })!, secret = 'synthetic-capture-boundary-secret-'.repeat(2), source = createId();
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
