import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
import { getPlatformProxy } from 'wrangler';
import { createApp } from '../support/app';
import { testAuth } from '../support/test-auth';
import { eml } from '../support/capture-mail';

// tests/fixtures/prior-capture: a store made by main ce67062's own signed-ingestion
// route and outreach code (populate.ts): real signals, timeline entries, an accepted
// send and a scheduled send waiting in NEXT. Miniflare names the D1 file after wrangler.jsonc's database id.
const FIXTURE = 'tests/fixtures/prior-capture';
const D1_FILE = 'v3/d1/miniflare-D1DatabaseObject/9ba2b04bf514d9facfd57ed57d849e77241a7adc99d1c1545d06688b43d84248.sqlite';
const CAPTURE_TABLES = ['capture_credentials', 'capture_items', 'capture_proposals', 'capture_sources'];
const read = (file: string) => {
  const store = new DatabaseSync(file, { readOnly: true });
  try {
    const tables = (store.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name<>'d1_migrations' ORDER BY name").all() as { name: string }[]).map(row => row.name);
    return Object.fromEntries(tables.map(table => [table, store.prepare(`SELECT * FROM "${table}"`).all().map(row => JSON.stringify(row)).sort()]));
  } finally { store.close(); }
};

test('CAPTURE-007 the capture migration upgrades a store from the previous main with every prior row and queue unchanged', { timeout: 10 * 60_000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'orbit-prior-capture-')), prior = JSON.parse(await readFile(join(FIXTURE, 'capture.json'), 'utf8'));
  try {
    const file = join(directory, D1_FILE);
    await mkdir(join(file, '..'), { recursive: true });
    await writeFile(file, gunzipSync(await readFile(join(FIXTURE, 'store.sqlite.gz'))));
    const before = read(file);
    assert.equal(before.signals!.length, 3); assert.equal(before.unlinked_signals!.length, 1);
    assert.deepEqual(before.outbound_messages!.map(row => JSON.parse(row).state).sort(), ['accepted', 'scheduled']);
    assert.ok(before.timeline_entries!.length > 10);
    for (const table of CAPTURE_TABLES) assert.equal(before[table], undefined);

    // The real upgrade: wrangler applies only the migration this store lacks.
    const applied = execFileSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'migrations', 'apply', 'DB', '--local', '--config', 'wrangler.jsonc', '--persist-to', directory], { env: { ...process.env, CI: '1' }, encoding: 'utf8', timeout: 120_000 });
    assert.match(applied, /0035_capture\.sql/); assert.doesNotMatch(applied, /0034_dependency_links/);
    const after = read(file);
    for (const table of Object.keys(before)) assert.deepEqual(after[table], before[table], `${table} keeps every prior row unchanged`);
    for (const table of CAPTURE_TABLES) assert.deepEqual(after[table], [], `${table} starts empty`);
    assert.deepEqual(Object.keys(after).sort(), [...Object.keys(before), ...CAPTURE_TABLES].sort());

    // The upgraded store captures: a reply from the prior contact stops the prior scheduled send.
    const platform = await getPlatformProxy<{ DB: D1Database }>({ configPath: 'wrangler.jsonc', envFiles: ['tests/support/no-local-settings.env'], persist: { path: join(directory, 'v3') }, remoteBindings: false });
    try {
      const db = platform.env.DB, session = await testAuth(db).createSession(prior.operator), app = createApp({ database: db, assets: { fetch: async () => new Response('') } });
      const form = new FormData();
      form.append('files', new File([eml({ From: 'Ana Prior <ana@prior-acme.example>', To: 'owner@prior.example', Subject: 'After the upgrade', Date: new Date(Date.now() - 60000).toUTCString(), 'Message-ID': '<after-upgrade@prior-acme.example>' }, 'Still keen. Talk soon.')], 'reply.eml'));
      const response = await app.request('https://orbit.test/api/v1/capture/imports', { method: 'POST', headers: { cookie: `__Host-orbit_session=${session.token}`, origin: 'https://orbit.test' }, body: form });
      assert.equal(response.status, 201);
      assert.equal(((await response.json()) as { summary: { captured: number } }).summary.captured, 1);
      assert.equal(await db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(prior.scheduledMessage).first('state'), 'cancelled');
      assert.equal(await db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(prior.sentMessage).first('state'), 'accepted');
      assert.equal(await db.prepare("SELECT count(*) n FROM timeline_entries WHERE kind='signal.recorded'").first('n'), 2, 'prior signals stay on the timeline once; the new reply waits for review');
    } finally { await platform.dispose(); }
  } finally { await rm(directory, { recursive: true, force: true }); }
});
