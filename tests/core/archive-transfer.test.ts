import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isolatedDatabase } from '../support/isolated-database';
import { ArchiveExportRepository } from '../../src/core/features/records/archive-export';
import { ArchiveImportRepository } from '../../src/core/features/records/archive-import';
import { archiveCatalog, archiveHash, type ArchiveManifest, type ArchivePart } from '../../src/core/features/records/archive-schema';
import { TestDataRepository } from '../support/record-data';
import { createId } from '../../src/core/shared/ids';
import { createDependencies } from '../../src/core/app/dependencies';
const now = '2026-09-13T00:00:00.000Z';
async function owner(db: D1Database, email = 'original@example.test') { const id = createId(); await db.prepare("INSERT INTO operators(id,email,display_name,status,setup_owner,created_at,updated_at) VALUES(?,?,'Original administrator','active',1,?,?)").bind(id, email, now, now).run(); await db.prepare("INSERT INTO sessions(id,operator_id,token_hash,expires_at,created_at) VALUES(?,?,'original-session','2099-01-01',?)").bind(createId(), id, now).run(); await workspace(db); return id; }
// An installed Orbit always has its workspace; erasure authority is a current workspace membership.
async function workspace(db: D1Database) { if (!await db.prepare('SELECT 1 FROM workspace_settings').first()) await createDependencies(db).workspace.ensureWorkspace({name:'Archive checks',timezone:'UTC',currency:'USD',workingHours:{},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]}); }
async function archive(db: D1Database) { const repo = new ArchiveExportRepository(db), actor = (await db.prepare('SELECT id FROM operators LIMIT 1').first<{
    id: string;
}>())!.id; let status = await repo.create(actor); for (let i = 0; i < 200 && status.state !== 'ready'; i++)
    status = await repo.advance(status.id, actor); assert.equal(status.state, 'ready'); const document = await (await repo.download(status.id, actor)).json() as {
    manifest: ArchiveManifest;
    parts: ArchivePart[];
}; return document; }
test('BASE-DATA-001 DATA-001 resumable archive checks completeness, exact duplicate parts, typed large cells and nonzero AI usage before session revocation', async () => { const source = await isolatedDatabase(), target = await isolatedDatabase(); try {
    const sourceActor = await owner(source.db, 'source@example.test'), targetActor = await owner(target.db);
    const text = '"'.repeat(600000);
    await source.db.prepare("INSERT INTO companies(id,name,primary_domain,custom_fields_json,created_at,updated_at) VALUES(?,'Large text',NULL,?,?,?)").bind(createId(), JSON.stringify({ text }), now, now).run();
    await source.db.prepare("INSERT INTO ai_calls(id,operator_id,provider,model,feature,input_tokens,output_tokens,cached_input_tokens,estimated_cost,duration_ms,status,created_at) VALUES(?,?,'openai','test-model','draft',1234,567,890,0.321,450,'success',?)").bind(createId(), sourceActor, now).run();
    const { manifest, parts } = await archive(source.db), repo = new ArchiveImportRepository(target.db);
    let status = await repo.create(manifest, targetActor);
    await assert.rejects(repo.advance(status.id, targetActor), /incomplete/);
    assert.ok(await target.db.prepare('SELECT id FROM sessions').first());
    for (const part of parts) {
        await repo.upload(status.id, part.index, part, targetActor);
        await repo.upload(status.id, part.index, part, targetActor);
    }
    const changed = structuredClone(parts[0]);
    changed.records[0].row[manifest.tables.find(t => t.name === changed.records[0].table)!.columns[0]] = 'changed';
    changed.sha256 = await archiveHash(changed.records);
    await assert.rejects(repo.upload(status.id, changed.index, changed, targetActor), /different contents/);
    status = await repo.advance(status.id, targetActor);
    await assert.rejects(target.db.prepare("INSERT INTO companies(id,name,created_at,updated_at) VALUES('forbidden','Forbidden',?,?)").bind(now, now).run(), /restoration is in progress/);
    assert.ok(await target.db.prepare('SELECT id FROM sessions').first());
    for (let i = 0; i < 500 && status.state !== 'complete'; i++)
        status = await repo.advance(status.id, targetActor);
    assert.equal(status.state, 'complete');
    assert.equal(await target.db.prepare('SELECT id FROM sessions').first(), null);
    assert.deepEqual(await target.db.prepare('SELECT input_tokens,output_tokens,cached_input_tokens,estimated_cost FROM ai_calls').first(), { input_tokens: 1234, output_tokens: 567, cached_input_tokens: 890, estimated_cost: 0.321 });
    assert.equal((await target.db.prepare('SELECT custom_fields_json FROM companies').first<{
        custom_fields_json: string;
    }>())!.custom_fields_json, JSON.stringify({ text }));
}
finally {
    await source.dispose();
    await target.dispose();
} });
test('BASE-DATA-001 interrupted invalid restore remains hidden and abort restores original administrator, session and exact metadata', async () => { const source = await isolatedDatabase(), target = await isolatedDatabase(); try {
    await owner(source.db, 'source@example.test');
    const actor = await owner(target.db);
    await target.db.prepare("INSERT INTO pipeline_stages VALUES(?,'Original stage',1,?,?)").bind(createId(), now, now).run();
    const before = await new TestDataRepository(target.db).export(), { manifest, parts } = await archive(source.db);
    const invalid = parts.find(p => p.records[0].table === 'operators')!;
    invalid.records[0].row.setup_owner = 2;
    invalid.sha256 = await archiveHash(invalid.records);
    const repo = new ArchiveImportRepository(target.db);
    let status = await repo.create(manifest, actor);
    for (const part of parts)
        await repo.upload(status.id, part.index, part, actor);
    let failed = false;
    for (let i = 0; i < 500; i++) {
        try {
            status = await repo.advance(status.id, actor);
        }
        catch {
            failed = true;
            break;
        }
    }
    assert.ok(failed);
    assert.ok(await target.db.prepare("SELECT 1 FROM runtime_controls WHERE name='archive_import'").first());
    assert.ok(await target.db.prepare('SELECT id FROM sessions').first());
    for (let i = 0; i < 500 && status.state !== 'aborted'; i++)
        status = await repo.abort(status.id, actor);
    assert.equal(status.state, 'aborted');
    assert.ok(await target.db.prepare('SELECT id FROM sessions').first());
    assert.equal(await target.db.prepare("SELECT 1 FROM runtime_controls WHERE name='archive_import'").first(), null);
    assert.deepEqual((await new TestDataRepository(target.db).export()).tables, before.tables);
}
finally {
    await source.dispose();
    await target.dispose();
} });
test('DATA-002 contact erasure invalidates prepared exports, paused downloads and uploaded restore copies', async () => {
    const fixture = await isolatedDatabase();
    try {
        const actor = await owner(fixture.db), contact = createId();
        await fixture.db.prepare("INSERT INTO contacts(id,name,email,email_key,contactability,created_at,updated_at) VALUES(?,'Private archive contact','erase@example.test','erase@example.test','contactable',?,?)").bind(contact, now, now).run();
        const document = await archive(fixture.db), exports = new ArchiveExportRepository(fixture.db);
        const exportId = (await fixture.db.prepare("SELECT id FROM archive_jobs WHERE kind='export'").first<{id:string}>())!.id;
        const response = await exports.download(exportId, actor), reader = response.body!.getReader();
        await reader.read(); // Header consumed; no customer data has been read.
        const imports = new ArchiveImportRepository(fixture.db), upload = await imports.create(document.manifest, actor);
        for (const part of document.parts) await imports.upload(upload.id, part.index, part, actor);
        await new TestDataRepository(fixture.db).remove('contact', contact, actor);
        assert.equal((await fixture.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE 'archive_snapshot_%' OR name LIKE 'archive_stage_%')").all()).results.length, 0);
        for (const table of ['archive_jobs', 'archive_parts', 'archive_part_segments']) assert.equal((await fixture.db.prepare(`SELECT count(*) AS n FROM ${table}`).first<{n:number}>())!.n, 0);
        await assert.rejects(exports.download(exportId, actor), /not found/);
        await assert.rejects(imports.advance(upload.id, actor), /not found/);
        await assert.rejects(async () => { while (!(await reader.read()).done) {} }, /removed|incomplete/);
        const fresh = await archive(fixture.db);
        assert.ok(!JSON.stringify(fresh).includes('erase@example.test'));
    } finally { await fixture.dispose(); }
});
test('BASE-DATA-001 restore start rechecks empty customer data inside its atomic maintenance transaction', async () => {
    const fixture = await isolatedDatabase();
    try {
        const actor = await owner(fixture.db), document = await archive(fixture.db), repo = new ArchiveImportRepository(fixture.db);
        const status = await repo.create(document.manifest, actor);
        for (const part of document.parts) await repo.upload(status.id, part.index, part, actor);
        const company = createId(), originalBatch = fixture.db.batch.bind(fixture.db);
        // A real write lands after preflight reads and before the restore lock transaction.
        const concurrentDb = { prepare: fixture.db.prepare.bind(fixture.db), batch: async (statements: D1PreparedStatement[]) => {
            await fixture.db.prepare("INSERT INTO companies(id,name,created_at,updated_at) VALUES(?,'Concurrent customer',?,?)").bind(company, now, now).run();
            return originalBatch(statements);
        } } as D1Database;
        await assert.rejects(new ArchiveImportRepository(concurrentDb).advance(status.id, actor));
        assert.ok(await fixture.db.prepare('SELECT id FROM companies WHERE id=?').bind(company).first());
        assert.equal(await fixture.db.prepare("SELECT 1 FROM runtime_controls WHERE name='archive_import'").first(), null);
        assert.equal((await repo.status(status.id, actor)).state, 'uploading');
    } finally { await fixture.dispose(); }
});
test('BASE-DATA-001 owner migration tables and columns with numeric suffixes survive archives', async () => {
    const source = await isolatedDatabase(), target = await isolatedDatabase();
    try {
        const actor = await owner(source.db), targetActor = await owner(target.db, 'target@example.test');
        for (const fixture of [source, target]) await fixture.db.prepare('CREATE TABLE owner_policy_v2(id TEXT PRIMARY KEY,setting_v2 TEXT NOT NULL,derived_v2 TEXT GENERATED ALWAYS AS (setting_v2) STORED) WITHOUT ROWID').run();
        await source.db.prepare("INSERT INTO owner_policy_v2(id,setting_v2) VALUES('policy','preserved owner intent')").run();
        const document = await archive(source.db);
        assert.ok(document.manifest.tables.some(table => table.name === 'owner_policy_v2'));
        const repo = new ArchiveImportRepository(target.db); let status = await repo.create(document.manifest, targetActor);
        for (const part of document.parts) await repo.upload(status.id, part.index, part, targetActor);
        for (let step = 0; step < 500 && status.state !== 'complete'; step++) status = await repo.advance(status.id, targetActor);
        assert.equal(status.state, 'complete');
        assert.deepEqual(await target.db.prepare('SELECT * FROM owner_policy_v2').first(), {id:'policy',setting_v2:'preserved owner intent',derived_v2:'preserved owner intent'});
    } finally { await source.dispose(); await target.dispose(); }
});
test('BASE-DATA-001 abort racing an export part write cannot recreate private transfer data', async () => {
    const fixture = await isolatedDatabase();
    try {
        const actor = await owner(fixture.db), exports = new ArchiveExportRepository(fixture.db), status = await exports.create(actor);
        const concurrentDb = {prepare:fixture.db.prepare.bind(fixture.db),batch:async (statements:D1PreparedStatement[]) => {
            await exports.abort(status.id, actor);
            return fixture.db.batch(statements);
        }} as D1Database;
        await assert.rejects(new ArchiveExportRepository(concurrentDb).advance(status.id, actor));
        assert.equal((await exports.status(status.id, actor)).state, 'aborted');
        assert.equal((await fixture.db.prepare('SELECT count(*) AS n FROM archive_parts WHERE job_id=?').bind(status.id).first<{n:number}>())!.n, 0);
        assert.equal((await fixture.db.prepare('SELECT count(*) AS n FROM archive_part_segments WHERE job_id=?').bind(status.id).first<{n:number}>())!.n, 0);
    } finally { await fixture.dispose(); }
});
test('BASE-DATA-001 unsupported cyclic owner schemas fail export and restore preflight without writes', async () => {
    const source = await isolatedDatabase(), target = await isolatedDatabase();
    try {
        await owner(source.db); const actor = await owner(target.db), document = await archive(source.db);
        await target.db.prepare('CREATE TABLE owner_cycle_a(id TEXT PRIMARY KEY,b_id TEXT REFERENCES owner_cycle_b(id))').run();
        await target.db.prepare('CREATE TABLE owner_cycle_b(id TEXT PRIMARY KEY,a_id TEXT REFERENCES owner_cycle_a(id))').run();
        await assert.rejects(new ArchiveExportRepository(target.db).create(actor), /foreign-key dependency cycle/);
        await assert.rejects(new ArchiveImportRepository(target.db).create(document.manifest, actor), /foreign-key dependency cycle/);
        assert.equal((await target.db.prepare('SELECT count(*) AS n FROM archive_jobs').first<{n:number}>())!.n, 0);
        assert.equal((await target.db.prepare('SELECT count(*) AS n FROM runtime_controls').first<{n:number}>())!.n, 0);
        assert.ok(await target.db.prepare('SELECT id FROM sessions').first());
        assert.equal((await target.db.prepare("SELECT name FROM sqlite_master WHERE name LIKE 'archive_stage_%' OR name LIKE 'archive_snapshot_%'").all()).results.length, 0);
    } finally { await source.dispose(); await target.dispose(); }
});
test('BASE-DATA-001 unsupported owner identifiers are rejected rather than silently omitted', async () => {
    const fixture = await isolatedDatabase();
    try {
        const actor = await owner(fixture.db);
        await fixture.db.prepare('CREATE TABLE OwnerIntent(id TEXT PRIMARY KEY)').run();
        await assert.rejects(new ArchiveExportRepository(fixture.db).create(actor), /unsupported identifier/);
        assert.equal((await fixture.db.prepare('SELECT count(*) AS n FROM archive_jobs').first<{n:number}>())!.n, 0);
    } finally { await fixture.dispose(); }
});
test('DATA-002 erasure retries snapshot creation racing archive table discovery without leaving private copies', async () => {
    const fixture = await isolatedDatabase();
    try {
        const actor = await owner(fixture.db), contact = createId();
        await fixture.db.prepare("INSERT INTO contacts(id,name,email,email_key,contactability,created_at,updated_at) VALUES(?,'Private','erase-race@example.test','erase-race@example.test','contactable',?,?)").bind(contact, now, now).run();
        let injected = false;
        const concurrentDb = {prepare:fixture.db.prepare.bind(fixture.db),batch:async (statements:D1PreparedStatement[]) => {
            if (!injected) { injected = true; await new ArchiveExportRepository(fixture.db).create(actor); }
            return fixture.db.batch(statements);
        }} as D1Database;
        await new TestDataRepository(concurrentDb).remove('contact', contact, actor);
        assert.ok(injected);
        assert.equal(await fixture.db.prepare('SELECT id FROM contacts WHERE id=?').bind(contact).first(), null);
        assert.equal((await fixture.db.prepare("SELECT name FROM sqlite_master WHERE name LIKE 'archive_snapshot_%' OR name LIKE 'archive_stage_%'").all()).results.length, 0);
        assert.equal((await fixture.db.prepare('SELECT count(*) AS n FROM runtime_controls').first<{n:number}>())!.n, 0);
    } finally { await fixture.dispose(); }
});
test('BASE-DATA-001 stale backup abort cannot unlock an import that advanced to clearing', async () => {
    const fixture = await isolatedDatabase();
    try {
        const actor = await owner(fixture.db), document = await archive(fixture.db), repo = new ArchiveImportRepository(fixture.db);
        let status = await repo.create(document.manifest, actor);
        for (const part of document.parts) await repo.upload(status.id, part.index, part, actor);
        status = await repo.advance(status.id, actor);
        const stale = await repo.job(status.id, actor);
        while (status.phase === 'backup') status = await repo.advance(status.id, actor);
        assert.equal(status.phase, 'clear');
        const {abortImport} = await import('../../src/core/features/records/archive-import-progress');
        await assert.rejects(abortImport(fixture.db, stale), /Archive progress changed/);
        assert.ok(await fixture.db.prepare("SELECT 1 FROM runtime_controls WHERE name='archive_import'").first());
        assert.equal((await repo.status(status.id, actor)).state, 'restoring');
        for (let step=0; step<500 && status.state!=='aborted'; step++) status = await repo.abort(status.id, actor);
        assert.equal(status.state, 'aborted');
        assert.ok(await fixture.db.prepare('SELECT id FROM sessions').first());
    } finally { await fixture.dispose(); }
});
test('BASE-DATA-001 stale upload abort cannot discard staging after restore begins', async () => {
    const fixture = await isolatedDatabase();
    try {
        const actor = await owner(fixture.db), document = await archive(fixture.db), repo = new ArchiveImportRepository(fixture.db);
        let status = await repo.create(document.manifest, actor);
        for (const part of document.parts) await repo.upload(status.id, part.index, part, actor);
        const stale = await repo.job(status.id, actor);
        status = await repo.advance(status.id, actor);
        const {abortImport} = await import('../../src/core/features/records/archive-import-progress');
        await assert.rejects(abortImport(fixture.db, stale), /NOT NULL constraint/);
        assert.equal((await repo.status(status.id, actor)).state, 'restoring');
        assert.ok(await fixture.db.prepare("SELECT 1 FROM runtime_controls WHERE name='archive_import'").first());
        for (let step=0; step<500 && status.state!=='complete'; step++) status = await repo.advance(status.id, actor);
        assert.equal(status.state, 'complete');
        assert.equal(await fixture.db.prepare('SELECT id FROM sessions').first(), null);
    } finally { await fixture.dispose(); }
});
test('BASE-DATA-001 restore start racing upload abort leaves the import aborted and unlocked', async () => {
    const fixture = await isolatedDatabase();
    try {
        const actor = await owner(fixture.db), document = await archive(fixture.db), repo = new ArchiveImportRepository(fixture.db);
        const status = await repo.create(document.manifest, actor);
        for (const part of document.parts) await repo.upload(status.id, part.index, part, actor);
        const concurrentDb = {prepare:fixture.db.prepare.bind(fixture.db),batch:async (statements:D1PreparedStatement[]) => {
            await repo.abort(status.id,actor);
            return fixture.db.batch(statements);
        }} as D1Database;
        await assert.rejects(new ArchiveImportRepository(concurrentDb).advance(status.id,actor));
        assert.equal((await repo.status(status.id,actor)).state,'aborted');
        assert.equal((await fixture.db.prepare('SELECT count(*) AS n FROM runtime_controls').first<{n:number}>())!.n,0);
        assert.ok(await fixture.db.prepare('SELECT id FROM sessions').first());
    } finally { await fixture.dispose(); }
});
