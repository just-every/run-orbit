import assert from 'node:assert/strict';
import { test } from 'node:test';
import { captureFixture, eml, type CaptureFixture } from '../support/capture-fixture';
import { fakeMailProvider } from '../support/fake-mail-provider';
import { createSourceSecurity } from '../../src/core/platform/source-security';
import { connectSource, syncSource } from '../../src/core/features/capture/sources';

const security = createSourceSecurity({ ORBIT_ENCRYPTION_KEY: '33'.repeat(32) })!;
const rfc = (minutes: number) => new Date(Date.now() - minutes * 60000).toUTCString().replace('GMT', '+0000');
const message = (n: number) => ({ kind: 'message' as const, raw: eml({ From: 'Ana Ruiz <ana@acme.example>', To: 'seller@orbit.test', Subject: `Thread ${n}`, Date: rfc(60 - n), 'Message-ID': `<provider-${n}@acme.example>` }, `Message ${n} body`) });
// Gmail pages by history ID and Graph by delta link; both are stored exactly as given.
const pages = [{ cursor: '1001', items: [message(1), message(2)] }, { cursor: 'https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages/delta?$deltatoken=page-2', items: [message(3), message(4)] }];
async function connected(f: CaptureFixture) {
  const provider = fakeMailProvider(pages);
  await connectSource(f.db, { id: 'capture-fake', adapter: provider.adapter.adapter, name: 'Fake mailbox', scope: provider.adapter.scope, credential: provider.state.token }, security, f.operator);
  return provider;
}
const customerState = async (db: D1Database) => Object.fromEntries(await Promise.all(['contacts', 'companies', 'opportunities', 'opportunity_contacts', 'drafts', 'outbound_messages', 'timeline_entries', 'signal_links', 'unlinked_signals'].map(async table => [table, (await db.prepare(`SELECT * FROM ${table} ORDER BY 1`).all()).results])));
const sources = async (f: CaptureFixture) => ((await (await f.request('/api/v1/capture/sources')).json()) as { sources: Record<string, any>[] }).sources.find(source => source.id === 'capture-fake')!;

test('CAPTURE-006 a provider cursor resumes after a crash without duplicates and is stored exactly as the provider gave it', async () => {
  const f = await captureFixture();
  try {
    const provider = await connected(f);
    let batches = 0, crashAfter = Infinity;
    // The worker stops part-way through page 2: item 3 committed, item 4 not, cursor still at page 1.
    const crashing = new Proxy(f.db, { get(target, property) { if (property === 'batch') return async (statements: D1PreparedStatement[]) => { if (++batches > crashAfter) throw new Error('worker stopped'); return target.batch(statements); }; const value = Reflect.get(target, property); return typeof value === 'function' ? value.bind(target) : value; } });
    provider.state.beforeAnswer = async page => { if (page === 1) crashAfter = batches + 1; };
    await assert.rejects(syncSource(crashing, 'capture-fake', provider.adapter, security), /worker stopped/);
    const interrupted = await sources(f);
    assert.equal(interrupted.state, 'connected'); assert.match(interrupted.last_error, /resumes from the last stored cursor/);
    assert.equal(await f.db.prepare("SELECT cursor FROM capture_sources WHERE id='capture-fake'").first('cursor'), '1001');
    provider.state.beforeAnswer = async () => {};
    const resumed = await syncSource(f.db, 'capture-fake', provider.adapter, security);
    assert.equal(resumed.replayed, 1); assert.equal(resumed.captured, 1);
    assert.equal(await f.db.prepare("SELECT count(*) n FROM signals WHERE source_id='capture-fake'").first('n'), 4);
    assert.equal(await f.db.prepare("SELECT count(DISTINCT source_event_id) n FROM signals WHERE source_id='capture-fake'").first('n'), 4);
    assert.equal(await f.db.prepare("SELECT cursor FROM capture_sources WHERE id='capture-fake'").first('cursor'), pages[1]!.cursor);
    const state = await sources(f);
    assert.deepEqual([state.state, state.captured_count, state.last_error, state.scope.mail.folders], ['connected', 4, null, ['INBOX', 'Sent']]);
    assert.ok(state.last_success_at); assert.ok(state.proposals_waiting > 0);
  } finally { await f.dispose(); }
});

test('CAPTURE-006 a revoked grant stops intake and shows its error until the source is reconnected', async () => {
  const f = await captureFixture();
  try {
    const provider = await connected(f), before = await customerState(f.db);
    provider.state.token = 'revoked-by-the-owner';
    assert.equal((await syncSource(f.db, 'capture-fake', provider.adapter, security)).halted, 'revoked');
    const state = await sources(f);
    assert.equal(state.state, 'error'); assert.match(state.last_error, /Access was revoked/);
    const pulls = provider.state.pulls;
    await assert.rejects(syncSource(f.db, 'capture-fake', provider.adapter, security), /Reconnect this source/);
    assert.equal(provider.state.pulls, pulls, 'no further request reaches the provider');
    assert.deepEqual(await customerState(f.db), before);
    await connectSource(f.db, { id: 'capture-fake', adapter: 'fake-mail', name: 'Fake mailbox', scope: provider.adapter.scope, credential: 'revoked-by-the-owner' }, security, f.operator);
    assert.equal((await syncSource(f.db, 'capture-fake', provider.adapter, security)).captured, 4);
  } finally { await f.dispose(); }
});

test('CAPTURE-006 AI-003 a provider outage leaves records, queues and manual work untouched', async () => {
  const f = await captureFixture();
  try {
    const provider = await connected(f), before = await customerState(f.db), now = await (await f.request('/api/v1/opportunities/now')).json();
    provider.state.outage = true;
    assert.equal((await syncSource(f.db, 'capture-fake', provider.adapter, security)).halted, 'unavailable');
    assert.deepEqual(await customerState(f.db), before);
    assert.deepEqual(await (await f.request('/api/v1/opportunities/now')).json(), now);
    const state = await sources(f);
    assert.equal(state.state, 'connected'); assert.match(state.last_error, /Provider unavailable/);
    const note = await f.request(`/api/v1/records/company/${f.company}/entries`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'note', text: 'Called Ana while the mailbox was down', occurredAt: new Date().toISOString() }) });
    assert.equal(note.status, 200, 'manual work continues during the outage');
    provider.state.outage = false;
    assert.equal((await syncSource(f.db, 'capture-fake', provider.adapter, security)).captured, 4);
  } finally { await f.dispose(); }
});

test('CAPTURE-006 disconnecting stops intake at once, deletes the credential and keeps captured evidence marked as from a disconnected source', async () => {
  const f = await captureFixture();
  try {
    const provider = await connected(f);
    assert.ok(await f.db.prepare("SELECT 1 FROM capture_credentials WHERE source_id='capture-fake'").first());
    // The owner disconnects while page 2 is in flight.
    provider.state.beforeAnswer = async page => { if (page === 1) assert.equal((await f.request('/api/v1/capture/sources/capture-fake/disconnect', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ confirmed: true }) })).status, 200); };
    await assert.rejects(syncSource(f.db, 'capture-fake', provider.adapter, security), /disconnected; intake stopped/);
    assert.equal(await f.db.prepare("SELECT count(*) n FROM signals WHERE source_id='capture-fake'").first('n'), 2, 'nothing from the page read after disconnecting is kept');
    assert.equal(await f.db.prepare("SELECT 1 FROM capture_credentials WHERE source_id='capture-fake'").first(), null);
    const state = await sources(f);
    assert.deepEqual([state.state, state.has_credential, state.captured_count], ['disconnected', 0, 2]);
    const proposals = ((await (await f.request('/api/v1/capture/proposals')).json()) as { proposals: { source_state: string; source_name: string }[] }).proposals.filter(p => p.source_name === 'Fake mailbox');
    assert.ok(proposals.length && proposals.every(p => p.source_state === 'disconnected'), 'kept evidence is marked as from a disconnected source');
    await assert.rejects(syncSource(f.db, 'capture-fake', provider.adapter, security), /disconnected/);
  } finally { await f.dispose(); }
});
