import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {getPlatformProxy} from 'wrangler';
import {isolatedDatabase} from '../support/isolated-database';
import {archiveCatalog, type ArchiveColumn, type ArchiveTable, type ArchiveManifest, type ArchivePart} from '../../src/core/features/records/archive-schema';
import {ArchiveExportRepository} from '../../src/core/features/records/archive-export';
import {ArchiveImportRepository} from '../../src/core/features/records/archive-import';

// Observe calls only: every statement, binding, result and failure is real D1.
function observed(db: D1Database) {
    const calls = {reads: 0, writes: 0, batches: 0};
    function statement(real: D1PreparedStatement): D1PreparedStatement {
        return new Proxy(real, {get(target, key) {
            if (key === 'bind') return (...values: unknown[]) => statement(target.bind(...values));
            if (key === 'all' || key === 'first' || key === 'raw' || key === 'run') return (...args: unknown[]) => {
                if (key === 'run') calls.writes++; else calls.reads++;
                return Reflect.apply(Reflect.get(target, key), target, args);
            };
            const value = Reflect.get(target, key);
            return typeof value === 'function' ? value.bind(target) : value;
        }});
    }
    const binding = {prepare: (sql: string) => statement(db.prepare(sql)), batch: (statements: D1PreparedStatement[]) => {
        calls.batches++;
        return db.batch(statements);
    }} as D1Database;
    return {db: binding, calls};
}

// Independent oracle retains the direct PRAGMA semantics, including cid and FK order.
async function directCatalog(db: D1Database): Promise<ArchiveTable[]> {
    // Provider credentials, pending OAuth grants and poll locks belong to this installation.
    const excluded = new Set(['sessions', 'magic_links', 'owner_bootstrap', 'sample_seed_runs', 'first_run_setup', 'd1_migrations', 'public_rate_limits', 'auth_rate_limits', 'runtime_controls', 'record_erasure_signals', 'capture_credentials', 'capture_oauth', 'capture_locks']);
    const names = (await db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all<{name: string}>()).results.map(r => r.name)
        .filter(name => !excluded.has(name) && !['ik_', 'crm_import_', 'delegation_', 'identity_', 'oa_', 'sqlite_', '_cf_', 'rer_', 'record_search', 'timeline_search', 'archive_'].some(prefix => name.startsWith(prefix)));
    const remaining: ArchiveTable[] = [];
    for (const name of names) {
        const columns = (await db.prepare(`PRAGMA table_info(${name})`).all<ArchiveColumn>()).results.filter(c => name !== 'signal_sources' || c.name !== 'secret_ciphertext');
        const dependencies = [...new Set((await db.prepare(`PRAGMA foreign_key_list(${name})`).all<{table: string}>()).results.map(r => r.table))].filter(n => names.includes(n));
        if (name === 'audit_entries') dependencies.push('privacy_matching_contexts');
        if (name === 'contacts') dependencies.push('audit_entries');
        remaining.push({name, columns, dependencies});
    }
    const ordered: ArchiveTable[] = [];
    while (remaining.length) {
        const ready = remaining.filter(t => t.dependencies.every(d => ordered.some(o => o.name === d)));
        assert.ok(ready.length, 'Oracle requires an acyclic supported schema');
        ordered.push(...ready);
        for (const table of ready) remaining.splice(remaining.indexOf(table), 1);
    }
    return ordered;
}

async function emptyDatabase() {
    const directory = await mkdtemp(join(tmpdir(), 'catalog-'));
    try {
        const platform = await getPlatformProxy<{DB: D1Database}>({configPath: 'wrangler.jsonc', envFiles:['tests/support/no-local-settings.env'], persist: {path: directory}, remoteBindings: false});
        return {db: platform.env.DB, async dispose() {try {await platform.dispose();} finally {await rm(directory, {recursive: true, force: true});}}};
    } catch (error) {await rm(directory, {recursive: true, force: true}); throw error;}
}

const ownerSchema = [
    'CREATE TABLE owner_parent_v2(second_id INTEGER,first_id TEXT,amount REAL NOT NULL DEFAULT 1.25,optional TEXT DEFAULT NULL,PRIMARY KEY(first_id,second_id)) WITHOUT ROWID',
    "CREATE TABLE owner_child_v2(id INTEGER PRIMARY KEY,first_id TEXT,second_id INTEGER,other_first TEXT,other_second INTEGER,secret_ciphertext TEXT,source TEXT NOT NULL DEFAULT 'quoted ''default''',derived_v2 TEXT GENERATED ALWAYS AS (source || first_id) STORED,virtual_v2 INTEGER GENERATED ALWAYS AS (second_id + 1) VIRTUAL,FOREIGN KEY(first_id,second_id) REFERENCES owner_parent_v2(first_id,second_id),FOREIGN KEY(other_first,other_second) REFERENCES owner_parent_v2(first_id,second_id))",
    'CREATE TABLE owner_external_v2(id INTEGER PRIMARY KEY,session_id TEXT REFERENCES sessions(id))',
];

test('DATA-001 catalog uses three cold metadata reads, matches direct core/owner PRAGMAs and caches only its binding', async t => {
    const fixture = await isolatedDatabase();
    try {
        for (const sql of ownerSchema) await fixture.db.prepare(sql).run();
        for (const name of ['delegation_catalog_probe', 'record_search_owner', 'timeline_search_owner', 'archive_catalog_probe'])
            await fixture.db.prepare(`CREATE TABLE ${name}(id INTEGER PRIMARY KEY)`).run();
        await assert.rejects(fixture.db.prepare('CREATE TABLE _cf_catalog_probe(id INTEGER PRIMARY KEY)').run(), /not authorized/);
        const expected = await directCatalog(fixture.db), spy = observed(fixture.db), started = performance.now();
        const first = archiveCatalog(spy.db), concurrent = archiveCatalog(spy.db);
        assert.equal(first, concurrent);
        const actual = await first;
        t.diagnostic(`cold tables=${actual.length} metadata_reads=${spy.calls.reads} milliseconds=${(performance.now() - started).toFixed(1)}`);
        assert.deepEqual(actual, expected);
        assert.deepEqual(spy.calls, {reads: 3, writes: 0, batches: 0});
        assert.equal(await archiveCatalog(spy.db), actual);
        assert.equal(spy.calls.reads, 3);
        const other = observed(fixture.db);
        assert.deepEqual(await archiveCatalog(other.db), expected);
        assert.deepEqual(other.calls, {reads: 3, writes: 0, batches: 0});
        assert.deepEqual(actual.find(t => t.name === 'owner_child_v2')!.dependencies, ['owner_parent_v2']);
        assert.deepEqual(actual.find(t => t.name === 'owner_external_v2')!.dependencies, []);
        assert.ok(actual.find(t => t.name === 'owner_child_v2')!.columns.some(c => c.name === 'secret_ciphertext'));
        assert.ok(!actual.find(t => t.name === 'signal_sources')!.columns.some(c => c.name === 'secret_ciphertext'));
        const order = actual.map(t => t.name);
        assert.ok(order.indexOf('privacy_matching_contexts') < order.indexOf('audit_entries'));
        assert.ok(order.indexOf('audit_entries') < order.indexOf('contacts'));
    } finally {await fixture.dispose();}
});

test('BASE-DATA-001 full 100 table by 100 column catalog returns all 10000 metadata rows and the final FK and values', async t => {
    const fixture = await emptyDatabase();
    try {
        const defaults = 'metadata_boundary_'.repeat(16);
        for (let table = 0; table < 100; table++) {
            const name = `owner_${String(table).padStart(3, '0')}`, columns = Array.from({length: 100}, (_,column) =>
                `field_${String(column).padStart(3, '0')} ${column === 0 ? 'INTEGER PRIMARY KEY' : `TEXT NOT NULL DEFAULT '${defaults}${column}'`}`);
            if (table === 99) columns.push('FOREIGN KEY(field_099) REFERENCES owner_000(field_000)');
            await fixture.db.prepare(`CREATE TABLE ${name}(${columns.join(',')})`).run();
        }
        await fixture.db.prepare('INSERT INTO owner_000(field_000) VALUES(7)').run();
        await fixture.db.prepare("INSERT INTO owner_099(field_000,field_099) VALUES(99,'7')").run();
        const spy = observed(fixture.db), started = performance.now(), actual = await archiveCatalog(spy.db);
        t.diagnostic(`saturated tables=${actual.length} columns=${actual.reduce((n,t) => n + t.columns.length, 0)} metadata_reads=${spy.calls.reads} milliseconds=${(performance.now() - started).toFixed(1)}`);
        assert.deepEqual(spy.calls, {reads: 3, writes: 0, batches: 0});
        assert.equal(actual.length, 100);
        assert.equal(actual.reduce((n, t) => n + t.columns.length, 0), 10000);
        assert.deepEqual(actual, await directCatalog(fixture.db));
        const last = actual.at(-1)!;
        assert.equal(last.name, 'owner_099');
        assert.deepEqual(last.dependencies, ['owner_000']);
        assert.equal(last.columns.at(-1)!.dflt_value, `'${defaults}99'`);
        const row = await fixture.db.prepare(`SELECT ${last.columns.map(c => c.name).join(',')} FROM ${last.name}`).first<Record<string, string | number>>();
        assert.equal(Object.keys(row!).length, 100);
        assert.equal(row!.field_000, 99);
        for (let column = 1; column < 99; column++) assert.equal(row![`field_${String(column).padStart(3, '0')}`], `${defaults}${column}`);
        assert.equal(row!.field_099, '7');
    } finally {await fixture.dispose();}
});

test('BASE-DATA-001 owner composite WITHOUT ROWID keys, defaults and stored/virtual generated values survive real archive restore', async () => {
    const source = await isolatedDatabase(), target = await isolatedDatabase();
    try {
        for (const fixture of [source, target]) {
            for (const sql of ownerSchema) await fixture.db.prepare(sql).run();
            await fixture.db.prepare("INSERT INTO operators(id,email,display_name,status,setup_owner,created_at,updated_at) VALUES('catalog_actor','catalog@example.test','Catalog owner','active',1,'2026-10-09','2026-10-09')").run();
        }
        await source.db.prepare("INSERT INTO owner_parent_v2(second_id,first_id) VALUES(7,'a')").run();
        await source.db.prepare("INSERT INTO owner_child_v2(id,first_id,second_id,other_first,other_second,secret_ciphertext) VALUES(1,'a',7,'a',7,'owner ordinary field')").run();
        await target.db.prepare("INSERT INTO owner_parent_v2(second_id,first_id) VALUES(9,'old')").run();
        await target.db.prepare("INSERT INTO owner_child_v2(id,first_id,second_id) VALUES(2,'old',9)").run();
        const exporter = new ArchiveExportRepository(source.db);
        let exported = await exporter.create('catalog_actor');
        for (let step = 0; step < 200 && exported.state !== 'ready'; step++) exported = await exporter.advance(exported.id, 'catalog_actor');
        assert.equal(exported.state, 'ready');
        const document = await (await exporter.download(exported.id, 'catalog_actor')).json() as {manifest: ArchiveManifest; parts: ArchivePart[]};
        const child = document.manifest.tables.find(t => t.name === 'owner_child_v2')!;
        assert.ok(!child.columns.includes('derived_v2') && !child.columns.includes('virtual_v2'));
        assert.ok(child.columns.includes('secret_ciphertext'));
        const importer = new ArchiveImportRepository(target.db);
        let imported = await importer.create(document.manifest, 'catalog_actor');
        for (const part of document.parts) await importer.upload(imported.id, part.index, part, 'catalog_actor');
        for (let step = 0; step < 500 && imported.state !== 'complete'; step++) imported = await importer.advance(imported.id, 'catalog_actor');
        assert.equal(imported.state, 'complete');
        for (const name of ['owner_parent_v2', 'owner_child_v2'])
            assert.deepEqual((await target.db.prepare(`SELECT * FROM ${name}`).all()).results, (await source.db.prepare(`SELECT * FROM ${name}`).all()).results);
        assert.deepEqual(await target.db.prepare('SELECT derived_v2,virtual_v2 FROM owner_child_v2').first(), {derived_v2: "quoted 'default'a", virtual_v2: 8});
    } finally {await source.dispose(); await target.dispose();}
});

async function unchangedPreflight(db: D1Database, manifest: ArchiveManifest, pattern: RegExp) {
    const inventory = () => db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    const before = (await inventory()).results, spy = observed(db);
    await assert.rejects(new ArchiveExportRepository(spy.db).create('catalog_actor'), pattern);
    await assert.rejects(new ArchiveImportRepository(spy.db).create(manifest, 'catalog_actor'), pattern);
    assert.equal(spy.calls.batches, 0);
    assert.equal(spy.calls.writes, 0);
    assert.deepEqual((await inventory()).results, before);
    for (const table of ['archive_jobs', 'archive_parts', 'archive_part_segments', 'runtime_controls'])
        assert.equal((await db.prepare(`SELECT count(*) AS n FROM ${table}`).first<{n: number}>())!.n, 0);
}

test('BASE-DATA-001 invalid identifiers, cycles and v2 plus-one limits reject before export or restore effects; rejected cache entries are evicted', async () => {
    const fixture = await isolatedDatabase();
    try {
        const original = await directCatalog(fixture.db);
        const manifest: ArchiveManifest = {format: 'orbit-export', version: 2, exportedAt: '2026-10-09T00:00:00.000Z', tables: original.map(t => ({name: t.name, columns: t.columns.map(c => c.name), rows: 0})), rows: 0, parts: 0};
        for (const sql of ['CREATE TABLE "OwnerBad"(id INTEGER)', 'CREATE TABLE owner_bad("BadColumn" TEXT)']) {
            await fixture.db.prepare(sql).run();
            await unchangedPreflight(fixture.db, manifest, /unsupported identifier/);
            await fixture.db.prepare(sql.includes('OwnerBad') ? 'DROP TABLE "OwnerBad"' : 'DROP TABLE owner_bad').run();
        }
        await fixture.db.prepare('CREATE TABLE owner_cycle_a(id INTEGER PRIMARY KEY,parent INTEGER REFERENCES owner_cycle_b(id))').run();
        await fixture.db.prepare('CREATE TABLE owner_cycle_b(id INTEGER PRIMARY KEY,parent INTEGER REFERENCES owner_cycle_a(id))').run();
        const spy = observed(fixture.db);
        await assert.rejects(archiveCatalog(spy.db), /dependency cycle/);
        assert.equal(spy.calls.reads, 3);
        await unchangedPreflight(fixture.db, manifest, /dependency cycle/);
        await fixture.db.prepare('DROP TABLE owner_cycle_a').run();
        await fixture.db.prepare('DROP TABLE owner_cycle_b').run();
        assert.deepEqual(await archiveCatalog(spy.db), original);
        assert.equal(spy.calls.reads, 6);
        // D1 itself caps physical tables at 100 columns, before our exported-column
        // envelope can observe a 101-column table. Exercise that real boundary too.
        await assert.rejects(fixture.db.prepare(`CREATE TABLE owner_wide(${Array.from({length: 101}, (_,i) => `field_${i} TEXT`).join(',')})`).run(), /too many columns/);
        assert.equal(await fixture.db.prepare("SELECT name FROM sqlite_master WHERE name='owner_wide'").first(), null);
        for (const table of ['archive_jobs', 'archive_parts', 'archive_part_segments', 'runtime_controls'])
            assert.equal((await fixture.db.prepare(`SELECT count(*) AS n FROM ${table}`).first<{n: number}>())!.n, 0);
        for (let i = original.length; i < 101; i++) await fixture.db.prepare(`CREATE TABLE owner_limit_${i}(id INTEGER)`).run();
        await unchangedPreflight(fixture.db, manifest, /version 2.*100 tables/);
    } finally {await fixture.dispose();}
});

test('DATA-001 v2 column envelope counts exported columns after source-secret filtering and rejects an empty exported table', async () => {
    const fixture = await emptyDatabase();
    try {
        await fixture.db.prepare(`CREATE TABLE signal_sources(secret_ciphertext TEXT,${Array.from({length: 99}, (_,i) => `field_${i} TEXT`).join(',')})`).run();
        assert.equal((await archiveCatalog(observed(fixture.db).db))[0]!.columns.length, 99);
        await assert.rejects(fixture.db.prepare('ALTER TABLE signal_sources ADD COLUMN field_99 TEXT').run(), /too many columns/);
        await fixture.db.prepare('DROP TABLE signal_sources').run();
        await fixture.db.prepare('CREATE TABLE signal_sources(secret_ciphertext TEXT)').run();
        const spy = observed(fixture.db);
        await assert.rejects(archiveCatalog(spy.db), /version 2.*1 to 100 columns/);
        assert.deepEqual(spy.calls, {reads: 2, writes: 0, batches: 0});
    } finally {await fixture.dispose();}
});
