import { createId } from '../../shared/ids';
import { RecordError } from './shared';
const trashName = /^archive_trash_[0-9a-z]{26}_[0-9]{4}$/;
const copyName = /^archive_(?:stage|snapshot)_([0-9a-z]{26})_[a-z0-9_]+$/;
/**
 * Erasure invalidates every private transfer copy, including paused downloads
 * and imports, in the same atomic batch as the person's data: the transfer
 * metadata (jobs, stored parts and segments) is renamed out of reach and
 * recreated empty, so every copied table belongs to a job that no longer
 * exists. Only those three schema renames join the batch; sweepArchiveTrash
 * then removes the orphaned copies and old metadata in bounded batches, so no
 * single batch scales with the size of the workspace.
 */
export async function archiveErasureStatements(db: D1Database) {
    const tables = (await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE 'archive_stage_%' OR name LIKE 'archive_snapshot_%') ORDER BY name").all<{
        name: string;
    }>()).results;
    for (const { name } of tables) if (!copyName.test(name)) throw new Error('Unexpected archive storage name.');
    const stepTrigger = await db.prepare("SELECT sql FROM sqlite_master WHERE type='trigger' AND name='archive_step_current'").first<{ sql: string }>();
    const epoch = createId().toLowerCase(), trash = (index: number) => `archive_trash_${epoch}_${String(index).padStart(4, '0')}`;
    // Recheck discovery inside the erasure transaction: a concurrent snapshot must not survive.
    const statements = [db.prepare("INSERT INTO runtime_controls(name,value) SELECT 'archive_erasure',CASE WHEN (SELECT json_group_array(name) FROM (SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE 'archive_stage_%' OR name LIKE 'archive_snapshot_%') ORDER BY name))=? THEN 'active' ELSE NULL END").bind(JSON.stringify(tables.map(table => table.name)))];
    // Children before parents, so the sweep never cascades through a populated table.
    statements.push(db.prepare(`ALTER TABLE archive_part_segments RENAME TO ${trash(0)}`), db.prepare(`ALTER TABLE archive_parts RENAME TO ${trash(1)}`), db.prepare(`ALTER TABLE archive_jobs RENAME TO ${trash(2)}`), db.prepare("CREATE TABLE archive_jobs (id TEXT PRIMARY KEY,kind TEXT NOT NULL CHECK(kind IN ('export','import','backup')),state TEXT NOT NULL,actor_id TEXT NOT NULL,manifest_json TEXT NOT NULL,progress_json TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL)"), db.prepare('CREATE TABLE archive_parts (job_id TEXT NOT NULL REFERENCES archive_jobs(id) ON DELETE CASCADE,part_index INTEGER NOT NULL CHECK(part_index>=0),sha256 TEXT NOT NULL,content_json TEXT NOT NULL,PRIMARY KEY(job_id,part_index))'), db.prepare('CREATE TABLE archive_part_segments (job_id TEXT NOT NULL,part_index INTEGER NOT NULL,segment_index INTEGER NOT NULL,content TEXT NOT NULL,PRIMARY KEY(job_id,part_index,segment_index),FOREIGN KEY(job_id,part_index) REFERENCES archive_parts(job_id,part_index) ON DELETE CASCADE)'));
    // Renaming archive_jobs retargets this trigger; restore its original definition.
    if (stepTrigger) statements.push(db.prepare('DROP TRIGGER archive_step_current'), db.prepare(stepTrigger.sql));
    if(await db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='archive_storage_reservations'").first())statements.push(db.prepare('DELETE FROM archive_storage_reservations'),db.prepare('DELETE FROM archive_job_profiles'),db.prepare('DELETE FROM archive_storage_observations'));
    statements.push(db.prepare("DELETE FROM runtime_controls WHERE name='archive_erasure'"));
    return statements;
}

/** Retry only a rolled-back schema-discovery conflict; never retain a maintenance lock. */
export async function executeArchiveErasure(db: D1Database, personalStatements: D1PreparedStatement[], execute:(statements:D1PreparedStatement[])=>Promise<unknown>=statements=>db.batch(statements)) {
    for (let attempt = 0; attempt < 3; attempt++) {
        const statements = await archiveErasureStatements(db);
        try { await execute([...statements, ...personalStatements]); break; }
        catch (error) {
            if (!String(error).includes('NOT NULL constraint failed: runtime_controls.value')) throw error;
            if (attempt === 2) throw new RecordError(409, 'Archive transfers changed during erasure. Retry the deletion. No data was changed.');
        }
    }
    await sweepArchiveTrash(db);
}

/** Rows removed per statement: copies are narrow; stored parts hold up to 16 MiB each. */
const chunkRows = (name: string, columns: string[]) => columns.includes('content_json') ? 8 : columns.includes('content') ? 32 : 20_000;

/**
 * Removes orphaned transfer copies and renamed transfer metadata in bounded
 * batches. Concurrent sweeps (an erasure and the minute timer) may race; a
 * table another sweep already removed is skipped. An interrupted sweep resumes
 * on the next erasure or minute timer.
 */
export async function sweepArchiveTrash(db: D1Database) {
    const names = (await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE 'archive_trash_%' OR name LIKE 'archive_stage_%' OR name LIKE 'archive_snapshot_%') ORDER BY name").all<{ name: string }>()).results.map(row => row.name);
    const live = new Set((await db.prepare('SELECT lower(id) AS id FROM archive_jobs').all<{ id: string }>()).results.map(row => row.id));
    const orphans = names.filter(name => { const job = copyName.exec(name)?.[1]; return job !== undefined && !live.has(job); });
    for (const name of [...orphans, ...names.filter(name => trashName.test(name))]) {
        if (!copyName.test(name) && !trashName.test(name)) throw new Error('Unexpected archive storage name.');
        try {
            const columns = (await db.prepare(`SELECT name FROM pragma_table_info('${name}')`).all<{ name: string }>()).results.map(row => row.name);
            const rows = chunkRows(name, columns);
            while ((await db.prepare(`DELETE FROM ${name} WHERE rowid IN (SELECT rowid FROM ${name} LIMIT ?)`).bind(rows).run()).meta.changes) { /* one bounded batch */ }
            await db.prepare(`DROP TABLE ${name}`).run();
        } catch (error) {
            if (!/no such table/.test(String(error))) throw error;
        }
    }
}
