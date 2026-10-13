import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {copyFile, mkdir, mkdtemp, readdir, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {getPlatformProxy} from 'wrangler';
import {createDependencies} from '../../src/core/app/dependencies';
import {beforeSeedBatch, contactSeedInput} from '../support/contact-seed-schema';

type SchemaObject = {type: string; name: string; sql: string};
const domainSchema = `SELECT type,name,sql FROM sqlite_schema WHERE sql IS NOT NULL
  AND substr(name,1,7)<>'sqlite_' AND tbl_name NOT IN ('_cf_KV','_cf_METADATA','d1_migrations') ORDER BY type,name`;
const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;

test('BASE-OPS-002 RECORD-012 real Wrangler history agrees with legacy SQL recovery and blocks a modern database restored to exact old domain DDL', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'seed-ledger-'));
  const migrations = join(directory, 'migrations'), config = join(directory, 'wrangler.toml');
  const state = join(directory, '.wrangler/state'), recovery = join(directory, 'recovery'), backup = join(directory, 'backup.sql');
  let platform: Awaited<ReturnType<typeof getPlatformProxy<{DB: D1Database}>>> | undefined;
  const close = async () => { if (platform) { await platform.dispose(); platform = undefined; } };
  const open = async (persist = state) => {
    assert.equal(platform, undefined);
    platform = await getPlatformProxy<{DB: D1Database}>({configPath: config, persist: {path: join(persist, 'v3')}, remoteBindings: false});
    return platform.env.DB;
  };
  const wrangler = (args: string[], persist = state) => execFileSync(process.execPath,
    ['node_modules/wrangler/bin/wrangler.js', 'd1', ...args, '--local', '--config', config,
      ...(args[0] === 'export' ? [] : ['--persist-to', persist])],
    {env: {...process.env, CI: '1'}, stdio: 'pipe', timeout: 60000});
  try {
    await mkdir(migrations);
    await writeFile(config, `name = "orbit-seed-history"\ncompatibility_date = "2026-09-08"\ncompatibility_flags = ["nodejs_compat"]\n[[d1_databases]]\nbinding = "DB"\ndatabase_name = "orbit-seed-history"\ndatabase_id = "00000000-0000-0000-0000-000000000000"\nmigrations_dir = "${migrations}"\n`);
    const files = (await readdir('migrations/core')).filter(file => file.endsWith('.sql')).sort();
    for (const name of files.slice(0, 4)) await copyFile(join('migrations/core', name), join(migrations, name));
    wrangler(['migrations', 'apply', 'DB']);
    let db = await open();
    const original = (await db.prepare(domainSchema).all<SchemaObject>()).results;
    const ledgerDDL = (await db.prepare("SELECT sql FROM sqlite_schema WHERE name='d1_migrations'").first<{sql: string}>())!.sql;
    const history = (await db.prepare('SELECT * FROM d1_migrations ORDER BY id').all()).results;
    assert.deepEqual(history.map(row => row.name), files.slice(0, 4));
    const service = createDependencies(db).records;
    await service.ensureContact(contactSeedInput('original', ' Original@CUSTOMER.TEST ', 'do_not_contact'));
    await service.ensureContact(contactSeedInput('original'));
    assert.equal((await db.prepare("SELECT email FROM contacts WHERE id='original'").first())!.email, 'original@customer.test');
    assert.equal((await db.prepare('SELECT count(*) n FROM audit_entries').first())!.n, 0);
    assert.deepEqual((await db.prepare('SELECT * FROM d1_migrations ORDER BY id').all()).results, history);
    await close();

    wrangler(['export', 'DB', '--output', backup]);
    wrangler(['execute', 'DB', '--file', backup], recovery);
    db = await open(recovery);
    const restoredHistory = await db.prepare("SELECT name FROM sqlite_schema WHERE lower(name)='d1_migrations'").first();
    if (restoredHistory) assert.deepEqual((await db.prepare('SELECT * FROM d1_migrations ORDER BY id').all()).results, history);
    assert.deepEqual((await db.prepare(domainSchema).all()).results, original);
    await createDependencies(db).records.ensureContact(contactSeedInput('restored', ' Restored+Backup@CUSTOMER.TEST ', 'do_not_contact'));
    // SQL restorations may also omit platform bookkeeping or initialize it empty.
    if (restoredHistory) await db.prepare('DROP TABLE d1_migrations').run();
    await createDependencies(db).records.ensureContact(contactSeedInput('restored-null', null, 'do_not_contact'));
    await db.prepare(ledgerDDL).run();
    await createDependencies(db).records.ensureContact(contactSeedInput('restored-empty', 'empty-history@customer.test', 'do_not_contact'));
    assert.equal((await db.prepare('SELECT count(*) n FROM d1_migrations').first())!.n, 0);
    assert.equal((await db.prepare("SELECT contactability FROM contacts WHERE id='original'").first())!.contactability, 'do_not_contact');
    assert.equal((await db.prepare("SELECT email FROM contacts WHERE id='restored'").first())!.email, 'restored+backup@customer.test');
    assert.equal((await db.prepare('SELECT count(*) n FROM audit_entries').first())!.n, 0);
    assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results, []);
    await close();

    // A live D1 batch must reject a changed ledger and roll back earlier writes.
    db = await open();
    const liveService = createDependencies(db).records;
    await liveService.ensureContact(contactSeedInput('original'));
    const raced = beforeSeedBatch(db, async () => {
      await db.prepare('INSERT INTO d1_migrations(name) VALUES(?)').bind(files[4]).run();
    });
    const atomic = new Proxy(raced, {get(target, key) {
      if (key === 'batch') return (statements: D1PreparedStatement[]) => target.batch([
        db.prepare("INSERT INTO companies(id,name,created_at,updated_at) VALUES('preceding','Must roll back','now','now')"), ...statements
      ]);
      const value = (target as any)[key];
      return typeof value === 'function' ? value.bind(target) : value;
    }});
    await assert.rejects(() => createDependencies(atomic).records.ensureContact(contactSeedInput('stale', null, 'do_not_contact')), /malformed JSON/);
    assert.equal(await db.prepare("SELECT id FROM companies WHERE id='preceding'").first(), null);
    assert.equal(await db.prepare("SELECT id FROM contacts WHERE id='stale'").first(), null);
    assert.deepEqual((await db.prepare(domainSchema).all()).results, original);
    await assert.rejects(() => liveService.ensureContact(contactSeedInput('changed-history')), /migration history/);
    // Remove only the race's synthetic row before genuinely applying every migration.
    await db.prepare('DELETE FROM d1_migrations WHERE name=?').bind(files[4]).run();
    await db.prepare('DELETE FROM contacts').run();
    await close();
    for (const name of files.slice(4)) await copyFile(join('migrations/core', name), join(migrations, name));
    wrangler(['migrations', 'apply', 'DB']);
    db = await open();
    const modernHistory = (await db.prepare('SELECT * FROM d1_migrations ORDER BY id').all()).results;
    assert.deepEqual(modernHistory.map(row => row.name), files);
    const modern = (await db.prepare(domainSchema).all<SchemaObject>()).results;
    const tables = modern.filter(row => row.type === 'table');
    const foreignKeys = await db.batch(tables.map(row => db.prepare(`PRAGMA foreign_key_list(${quote(row.name)})`)));
    const pending = new Map(tables.map((row, index) => [row.name, foreignKeys[index].results.map(key => String(key.table))]));
    const dropOrder: string[] = [];
    while (pending.size) {
      const next = [...pending.keys()].find(name => ![...pending.values()].some(parents => parents.includes(name)));
      assert.ok(next, 'Canonical migration foreign keys must permit child-first teardown');
      dropOrder.push(next);
      pending.delete(next);
    }
    const restore = [
      'PRAGMA defer_foreign_keys=ON',
      ...modern.filter(row => row.type !== 'table').map(row => `DROP ${row.type} ${quote(row.name)}`),
      ...dropOrder.map(name => `DROP TABLE IF EXISTS ${quote(name)}`),
      ...original.filter(row => row.type === 'table').map(row => row.sql),
      ...original.filter(row => row.type !== 'table').map(row => row.sql)
    ].map(sql => db.prepare(sql));
    await db.batch(restore);
    assert.deepEqual((await db.prepare(domainSchema).all()).results, original);
    assert.deepEqual((await db.prepare('SELECT * FROM d1_migrations ORDER BY id').all()).results, modernHistory);
    for (const email of ['damaged-modern@customer.test', null]) {
      await assert.rejects(() => createDependencies(db).records.ensureContact(contactSeedInput('damaged', email, 'do_not_contact')), /migration history/);
    }
    assert.equal((await db.prepare('SELECT count(*) n FROM contacts').first())!.n, 0);
    assert.equal((await db.prepare('SELECT count(*) n FROM audit_entries').first())!.n, 0);
    assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results, []);
  } finally { await close(); await rm(directory, {recursive: true, force: true}); }
});
