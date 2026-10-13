import assert from 'node:assert/strict';
import { test } from 'node:test';
import { captureFixture, fixtureMailbox, type CaptureFixture } from '../support/capture-fixture';
import { launchFixture } from '../support/launch-fixture';
import { createSourceSecurity } from '../../src/core/platform/source-security';
import { connectSource } from '../../src/core/features/capture/sources';

const json = { 'content-type': 'application/json' };
async function exported(f: CaptureFixture) {
  const call = async (path: string, init?: RequestInit) => { const response = await f.request(path, init); assert.ok(response.ok, `${path}: ${response.status} ${await response.clone().text()}`); return response.json() as Promise<any>; };
  let job = await call('/api/v1/records/archive/exports', { method: 'POST', headers: json, body: '{}' });
  for (let n = 0; n < 300 && job.state !== 'ready'; n++) job = await call(`/api/v1/records/archive/exports/${job.id}/advance`, { method: 'POST', headers: json, body: '{}' });
  assert.equal(job.state, 'ready');
  return call(`/api/v1/records/archive/exports/${job.id}/download`);
}
async function captured(f: CaptureFixture) {
  await f.upload([{ name: 'export.mbox', text: fixtureMailbox(f).mbox }, { name: 'invite.ics', text: fixtureMailbox(f).invite }]);
  const proposals = (await f.db.prepare("SELECT id,kind FROM capture_proposals WHERE status='pending' ORDER BY id").all<{ id: string; kind: string }>()).results;
  assert.equal((await f.request(`/api/v1/capture/proposals/${proposals.find(p => p.kind === 'link_signal')!.id}/accept`, { method: 'POST', headers: json, body: '{}' })).status, 200);
  assert.equal((await f.request(`/api/v1/capture/proposals/${proposals.find(p => p.kind === 'create_contact')!.id}/decline`, { method: 'POST', headers: json, body: '{}' })).status, 200);
}

test('CAPTURE-007 DATA-001 captured evidence, proposals and source state travel in the Records archive and restore equivalently; credentials never travel', async () => {
  const f = await captureFixture(), target = await launchFixture();
  try {
    await captured(f);
    const security = createSourceSecurity({ ORBIT_ENCRYPTION_KEY: '44'.repeat(32) })!;
    await connectSource(f.db, { id: 'capture-provider', adapter: 'fake-mail', name: 'Provider mailbox', scope: { mail: { folders: ['INBOX'] } }, credential: 'provider-grant-never-exported' }, security, f.operator);
    const sealed = await f.db.prepare("SELECT ciphertext FROM capture_credentials WHERE source_id='capture-provider'").first<{ ciphertext: string }>();
    const archive = await exported(f), names = archive.manifest.tables.map((table: { name: string }) => table.name), text = JSON.stringify(archive);
    for (const table of ['capture_sources', 'capture_items', 'capture_proposals']) assert.ok(names.includes(table), `${table} is exported`);
    assert.ok(!names.includes('capture_credentials'));
    assert.ok(!text.includes(sealed!.ciphertext) && !text.includes('provider-grant-never-exported'), 'no credential travels');
    assert.ok(text.includes('Can we talk on Tuesday?'), 'the captured original travels');

    let imported = (await (await target.request('records/archive/imports', 'POST', { confirmed: true, manifest: archive.manifest })).json()) as any;
    for (const part of archive.parts) assert.ok((await target.request(`records/archive/imports/${imported.id}/parts/${part.index}`, 'PUT', part)).ok);
    for (let n = 0; n < 700 && imported.state !== 'complete'; n++) imported = await (await target.request(`records/archive/imports/${imported.id}/finalize`, 'POST', {})).json();
    assert.equal(imported.state, 'complete');
    for (const table of ['capture_sources', 'capture_items', 'capture_proposals', 'signals', 'signal_links', 'unlinked_signals'])
      assert.deepEqual((await target.db.prepare(`SELECT * FROM ${table} ORDER BY 1`).all()).results, (await f.db.prepare(`SELECT * FROM ${table} ORDER BY 1`).all()).results, `${table} restores equivalently`);
    assert.equal(await target.db.prepare('SELECT count(*) n FROM capture_credentials').first('n'), 0, 'a restored provider source has no credential and must be reconnected');
  } finally { await f.dispose(); await target.dispose(); }
});

test('CAPTURE-007 DATA-002 BASE-DATA-003 erasing a contact erases their captured originals and proposals; the audit trail keeps only a count', async () => {
  const f = await captureFixture();
  try {
    await captured(f);
    const mentions = (db: D1Database) => db.prepare("SELECT (SELECT count(*) FROM capture_items WHERE instr(lower(headers||body),'ana@acme.example')>0)+(SELECT count(*) FROM capture_proposals WHERE instr(details_json,'ana@acme.example')>0 OR proposed_value='ana@acme.example' OR record_id=?)+(SELECT count(*) FROM signals WHERE instr(payload_json,'ana@acme.example')>0) AS n").bind(f.ana).first('n');
    assert.ok(Number(await mentions(f.db)) > 0);
    const others = Number(await f.db.prepare("SELECT count(*) n FROM capture_items WHERE instr(lower(headers||body),'ana@acme.example')=0").first('n'));
    assert.ok(others > 0);
    assert.equal((await f.request(`/api/v1/records/contact/${f.ana}`, { method: 'DELETE', headers: json, body: JSON.stringify({ confirmed: true }) })).status, 200);
    assert.equal(await mentions(f.db), 0);
    assert.equal(Number(await f.db.prepare("SELECT count(*) n FROM capture_items WHERE instr(lower(headers||body),'ana@acme.example')=0").first('n')), others, 'other people\'s evidence stays');
    const audit = await f.db.prepare("SELECT entity_id,details_json FROM audit_entries WHERE action='capture.erased'").first<{ entity_id: string; details_json: string }>();
    assert.equal(audit!.entity_id, 'erased'); assert.ok(JSON.parse(audit!.details_json).capturedItems > 0);
    assert.ok(!audit!.details_json.includes('ana') && !audit!.details_json.includes(f.ana));
    const archive = JSON.stringify(await exported(f));
    assert.ok(!archive.toLowerCase().includes('ana@acme.example') && !archive.includes('Can we talk on Tuesday?'), 'later exports carry none of it');
  } finally { await f.dispose(); }
});
