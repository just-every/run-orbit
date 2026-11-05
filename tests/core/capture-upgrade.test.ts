import assert from 'node:assert/strict';
import { test } from 'node:test';
import { priorCaptureUpgrade } from '../support/prior-capture-upgrade';
import { createApp } from '../support/app';
import { testAuth } from '../support/test-auth';
import { eml } from '../support/capture-mail';
import { createSourceSecurity, payloadHash } from '../../src/core/platform/source-security';

test('CAPTURE-007 OUT-032 the capture migration upgrades a store from the previous main with every prior row and queue unchanged', { timeout: 10 * 60_000 }, async () => {
  const target = await priorCaptureUpgrade(), {prior, migrationStarted} = target;
  const {columns: originalColumns, rows: before} = target.before, {columns: currentColumns, rows: after} = target.after;
  try {
    assert.equal(before.signals!.length, 3); assert.equal(before.unlinked_signals!.length, 1);
    assert.deepEqual(before.outbound_messages!.map(row => JSON.parse(row).state).sort(), ['accepted', 'scheduled']);
    assert.ok(before.timeline_entries!.length > 10);

    for (const table of Object.keys(before)) {
      const columns = originalColumns[table]!;
      assert.ok(columns.every(column => currentColumns[table]?.includes(column)), `${table} keeps every prior column`);
      const retained = after[table]!.map(encoded => { const row = JSON.parse(encoded); return JSON.stringify(Object.fromEntries(columns.map(column => [column, row[column]]))); }).sort();
      assert.deepEqual(retained, before[table], `${table} keeps every prior row unchanged`);
    }
    for (const encoded of after.drafts!) {
      const row = JSON.parse(encoded);
      assert.deepEqual({ library_selection_json: row.library_selection_json, merge_review_json: row.merge_review_json }, { library_selection_json: '{}', merge_review_json: null }, 'prior drafts receive only the additive library metadata defaults');
    }
    assert.ok(after.outbound_messages!.every(encoded => JSON.parse(encoded).render_snapshot_json === null), 'prior approved messages gain no invented render snapshot');
    const addedTables = Object.keys(after).filter(table => !Object.hasOwn(before, table));
    assert.ok(addedTables.length > 0, 'the prior installation gains capture storage');
    // Pipeline migration deliberately backfills metadata for every existing stage, and
    // OUT-020 records that an upgraded installation keeps one-to-one opt-out on.
    // The forecast source clock is installation metadata; all other new feature storage starts empty.
    for (const table of addedTables.filter(name=>!['pipelines','pipeline_stage_rules','opt_out_settings','forecast_source_clock','workflow_journal_metadata'].includes(name))) assert.deepEqual(after[table], [], `${table} starts empty`);
    const journal=after.workflow_journal_metadata!.map(encoded=>JSON.parse(encoded));
    assert.equal(journal.length,1,'the upgrade records when workflow history began');
    assert.ok(Date.parse(journal[0].recorded_from)>=migrationStarted&&Date.parse(journal[0].recorded_from)<=Date.now(),'journal coverage starts during the upgrade, never at an invented historical date');
    assert.deepEqual(after.opt_out_settings!.map(row=>{const {message_type,carries,basis}=JSON.parse(row);return {message_type,carries,basis};}),[{message_type:'one_to_one',carries:1,basis:'kept on for an upgraded installation'}],'an upgraded installation keeps one-to-one opt-out on');
    const pipelines=after.pipelines!.map(row=>JSON.parse(row)),rules=after.pipeline_stage_rules!.map(row=>JSON.parse(row));
    assert.equal(pipelines.length,1);assert.equal(pipelines[0].is_default,1);
    assert.deepEqual(rules.map(row=>row.stage_id).sort(),before.pipeline_stages!.map(row=>JSON.parse(row).id).sort());
    assert.ok(rules.every(row=>row.pipeline_id===pipelines[0].id));

    // The upgraded store captures: a reply from the prior contact stops the prior scheduled send.
    try {
      const db = target.db, session = await testAuth(db).createSession(prior.operator);
      let providerCalls = 0;
      const app = createApp({
        database: db, assets: { fetch: async () => new Response('') },
        sourceSecurity: createSourceSecurity({ ORBIT_ENCRYPTION_KEY: '72'.repeat(32) }),
        captureOrigin: 'https://orbit.test',
        outboundMail: {send: async () => { providerCalls++; throw new Error('Reading upgraded Settings must not submit customer mail'); }},
        captureFetch: async () => { providerCalls++; throw new Error('Upgrade proof must not contact a provider'); },
      });
      const path = 'https://orbit.test/api/v1/settings/opt-out';
      assert.equal((await app.request(path)).status, 401, 'Settings requires native sign-in');
      for (let read = 0; read < 2; read++) {
        const settings = await app.request(path, {headers: {Cookie: `__Host-orbit_session=${session.token}`}});
        assert.equal(settings.status, 200);
        const body = await settings.json() as {types: {type: string; carries: boolean; basis: string}[]; approvedUnsent: {approvedBeforeSetting: number}};
        const setting = body.types.find(row => row.type === 'one_to_one');
        assert.equal(setting?.carries, true, 'Authenticated Settings retains upgraded one-to-one opt-out');
        assert.equal(setting?.basis, 'kept on for an upgraded installation');
        assert.equal(body.approvedUnsent.approvedBeforeSetting, 1, 'Settings identifies the actual pre-setting scheduled approval');
      }
      const readback = target.snapshot().rows;
      assert.deepEqual(readback.outbound_messages, after.outbound_messages, 'Reading Settings preserves every historical approval byte and state');
      assert.deepEqual(readback.drafts, after.drafts, 'Reading Settings preserves every historical draft');
      assert.deepEqual(readback.outbound_message_opt_out, [], 'Reading Settings never rewrites old approvals with a new opt-out binding');
      assert.equal(providerCalls, 0);
      const form = new FormData();
      form.append('files', new File([eml({ From: 'Ana Prior <ana@prior-acme.example>', To: 'owner@prior.example', Subject: 'After the upgrade', Date: new Date(Date.now() - 60000).toUTCString(), 'Message-ID': '<after-upgrade@prior-acme.example>' }, 'Still keen. Talk soon.')], 'reply.eml'));
      const response = await app.request('https://orbit.test/api/v1/capture/imports', { method: 'POST', headers: { cookie: `__Host-orbit_session=${session.token}`, origin: 'https://orbit.test' }, body: form });
      assert.equal(response.status, 201);
      assert.equal(((await response.json()) as { summary: { captured: number } }).summary.captured, 1);
      assert.equal(await db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(prior.scheduledMessage).first('state'), 'cancelled');
      assert.equal(await db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(prior.sentMessage).first('state'), 'accepted');
      assert.equal(await db.prepare("SELECT count(*) n FROM timeline_entries WHERE kind='signal.recorded'").first('n'), 2, 'prior signals stay on the timeline once; the new reply waits for review');

      // Starting native OAuth persists session-bound authority in the upgraded
      // store without exchanging a code or contacting the provider.
      const oauth = await app.request('https://orbit.test/api/v1/capture/oauth/google/start', {
        method: 'POST',
        headers: { cookie: `__Host-orbit_session=${session.token}`, origin: 'https://orbit.test', 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Upgrade mailbox', clientId: 'test-client', clientSecret: 'test-secret' }),
      });
      assert.equal(oauth.status, 200);
      const authorization = new URL(((await oauth.json()) as { authorizationUrl: string }).authorizationUrl);
      const state = authorization.searchParams.get('state');
      assert.ok(state, 'native OAuth returns authorization state');
      assert.equal(await db.prepare('SELECT operator_id FROM capture_oauth WHERE state_hash=? AND session_id=? AND claimed=0').bind(await payloadHash(state), session.id).first('operator_id'), prior.operator);
      assert.equal(providerCalls, 0);
    } finally { await target.close(); }
  } finally { await target.dispose(); }
});
