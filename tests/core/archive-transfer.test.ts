import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isolatedDatabase } from '../support/isolated-database';
import { ArchiveExportRepository } from '../../src/core/features/records/archive-export';
import { ArchiveImportRepository } from '../../src/core/features/records/archive-import';
import { archiveHash } from '../../src/core/features/records/archive-schema';
import { foldExportProfile } from '../../src/core/features/records/archive-fold-profile';
import { readCurrentArchive } from '../support/current-archive';
import { TestDataRepository } from '../support/record-data';
import { createId } from '../../src/core/shared/ids';
import { createDependencies } from '../../src/core/app/dependencies';
const now = '2026-09-13T00:00:00.000Z';
async function owner(db: D1Database, email = 'original@example.test') { const id = createId(); await db.prepare("INSERT INTO operators(id,email,display_name,status,setup_owner,created_at,updated_at) VALUES(?,?,'Original administrator','active',1,?,?)").bind(id, email, now, now).run(); await db.prepare("INSERT INTO sessions(id,operator_id,token_hash,expires_at,created_at) VALUES(?,?,'original-session','2099-01-01',?)").bind(createId(), id, now).run(); await workspace(db); return id; }
// An installed Orbit always has its workspace; erasure authority is a current workspace membership.
async function workspace(db: D1Database) { if (!await db.prepare('SELECT 1 FROM workspace_settings').first()) await createDependencies(db).workspace.ensureWorkspace({name:'Archive checks',timezone:'UTC',currency:'USD',workingHours:{},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]}); }
async function archive(db: D1Database) { const repo = new ArchiveExportRepository(db, foldExportProfile), actor = (await db.prepare('SELECT id FROM operators LIMIT 1').first<{
    id: string;
}>())!.id; let status = await repo.create(actor); for (let i = 0; i < 200 && status.state !== 'ready'; i++)
    status = await repo.advance(status.id, actor); assert.equal(status.state, 'ready'); const document = await readCurrentArchive(await repo.download(status.id, actor)); return document; }
test('BASE-DATA-001 interrupted invalid restore remains hidden and abort restores original administrator, session and exact metadata', async () => { const source = await isolatedDatabase(), target = await isolatedDatabase(); try {
    await owner(source.db, 'source@example.test');
    const actor = await owner(target.db);
    await target.db.prepare("INSERT INTO pipeline_stages VALUES(?,'Original stage',1,?,?)").bind(createId(), now, now).run();
    const before = await new TestDataRepository(target.db).export(), { manifest, parts } = await archive(source.db);
    const invalid = parts.find(p => p.records[0].table === 'operators')!;
    invalid.records[0].row.setup_owner = 2;
    invalid.sha256 = await archiveHash(invalid.records);
    const repo = new ArchiveImportRepository(target.db, true);
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
        const document = await archive(fixture.db), exports = new ArchiveExportRepository(fixture.db, foldExportProfile);
        const exportId = (await fixture.db.prepare("SELECT id FROM archive_jobs WHERE kind='export'").first<{id:string}>())!.id;
        const response = await exports.download(exportId, actor), reader = response.body!.getReader();
        await reader.read(); // Header consumed; no customer data has been read.
        const imports = new ArchiveImportRepository(fixture.db, true), upload = await imports.create(document.manifest, actor);
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
test('BASE-DATA-001 abort racing an export part write cannot recreate private transfer data', async () => {
    const fixture = await isolatedDatabase();
    try {
        const actor = await owner(fixture.db), exports = new ArchiveExportRepository(fixture.db, foldExportProfile), status = await exports.create(actor);
        const concurrentDb = {prepare:fixture.db.prepare.bind(fixture.db),batch:async (statements:D1PreparedStatement[]) => {
            await exports.abort(status.id, actor);
            return fixture.db.batch(statements);
        }} as D1Database;
        await assert.rejects(new ArchiveExportRepository(concurrentDb, foldExportProfile).advance(status.id, actor));
        assert.equal((await exports.status(status.id, actor)).state, 'aborted');
        assert.equal((await fixture.db.prepare('SELECT count(*) AS n FROM archive_parts WHERE job_id=?').bind(status.id).first<{n:number}>())!.n, 0);
        assert.equal((await fixture.db.prepare('SELECT count(*) AS n FROM archive_part_segments WHERE job_id=?').bind(status.id).first<{n:number}>())!.n, 0);
    } finally { await fixture.dispose(); }
});
test('DATA-002 erasure retries snapshot creation racing archive table discovery without leaving private copies', async () => {
    const fixture = await isolatedDatabase();
    try {
        const actor = await owner(fixture.db), contact = createId();
        await fixture.db.prepare("INSERT INTO contacts(id,name,email,email_key,contactability,created_at,updated_at) VALUES(?,'Private','erase-race@example.test','erase-race@example.test','contactable',?,?)").bind(contact, now, now).run();
        let injected = false;
        const concurrentDb = {prepare:fixture.db.prepare.bind(fixture.db),batch:async (statements:D1PreparedStatement[]) => {
            if (!injected) { injected = true; await new ArchiveExportRepository(fixture.db, foldExportProfile).create(actor); }
            return fixture.db.batch(statements);
        }} as D1Database;
        await new TestDataRepository(concurrentDb).remove('contact', contact, actor);
        assert.ok(injected);
        assert.equal(await fixture.db.prepare('SELECT id FROM contacts WHERE id=?').bind(contact).first(), null);
        assert.equal((await fixture.db.prepare("SELECT name FROM sqlite_master WHERE name LIKE 'archive_snapshot_%' OR name LIKE 'archive_stage_%'").all()).results.length, 0);
        assert.equal((await fixture.db.prepare('SELECT count(*) AS n FROM runtime_controls').first<{n:number}>())!.n, 0);
    } finally { await fixture.dispose(); }
});
