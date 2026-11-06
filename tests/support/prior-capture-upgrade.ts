import {execFileSync} from 'node:child_process';
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {gunzipSync} from 'node:zlib';
import {getPlatformProxy} from 'wrangler';

const fixture = 'tests/fixtures/prior-capture';
const databaseFile = 'v3/d1/miniflare-D1DatabaseObject/9ba2b04bf514d9facfd57ed57d849e77241a7adc99d1c1545d06688b43d84248.sqlite';
const quote = (name: string) => '"' + name.replaceAll('"', '""') + '"';

export function priorCaptureSnapshot(file: string) {
  const store = new DatabaseSync(file, {readOnly: true});
  try {
    const tables = (store.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name<>'d1_migrations' ORDER BY name").all() as {name: string}[]).map(row => row.name);
    const columns = Object.fromEntries(tables.map(table => [table, (store.prepare(`PRAGMA table_xinfo(${quote(table)})`).all() as {name: string; hidden: number}[]).filter(column => column.hidden !== 1).map(column => column.name)]));
    const rows = Object.fromEntries(tables.map(table => [table, store.prepare(`SELECT ${columns[table]!.map(quote).join(',')} FROM ${quote(table)}`).all().map(row => JSON.stringify(row)).sort()]));
    return {columns, rows};
  } finally { store.close(); }
}

/** The same historical installation and actual pending migrations serve HTTP and emitted-page proof. */
export async function priorCaptureUpgrade() {
  const directory = await mkdtemp(join(tmpdir(), 'orbit-prior-capture-'));
  try {
    const prior = JSON.parse(await readFile(join(fixture, 'capture.json'), 'utf8')) as {operator: string; scheduledMessage: string; sentMessage: string};
    const file = join(directory, databaseFile);
    await mkdir(join(file, '..'), {recursive: true});
    await writeFile(file, gunzipSync(await readFile(join(fixture, 'store.sqlite.gz'))));
    const before = priorCaptureSnapshot(file), migrationStarted = Date.now();
    execFileSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'migrations', 'apply', 'DB', '--local', '--config', 'wrangler.jsonc', '--persist-to', directory], {env: {...process.env, CI: '1'}, encoding: 'utf8', timeout: 120_000});
    const after = priorCaptureSnapshot(file);
    const platform = await getPlatformProxy<{DB: D1Database}>({configPath: 'wrangler.jsonc', envFiles: ['tests/support/no-local-settings.env'], persist: {path: join(directory, 'v3')}, remoteBindings: false});
    let closed = false;
    return {
      directory, prior, before, after, migrationStarted,
      get db() { if (closed) throw new Error('Prior-capture database proxy is closed'); return platform.env.DB; },
      snapshot: () => priorCaptureSnapshot(file),
      async close() { if (!closed) { await platform.dispose(); closed = true; } },
      async dispose() { if (!closed) await platform.dispose(); closed = true; await rm(directory, {recursive: true, force: true}); },
    };
  } catch (error) { await rm(directory, {recursive: true, force: true}); throw error; }
}
