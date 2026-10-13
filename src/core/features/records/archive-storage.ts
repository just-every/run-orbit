import { stageLayouts, physicalProjection } from './archive-stage-layout';
import type { ArchivePart, ArchiveTable } from './archive-schema';
export function stageName(id: string, table: string) { if (!/^[0-9A-HJKMNP-TV-Z]{26}$/.test(id) || !/^\w+$/.test(table))
    throw new Error('Invalid internal archive table name.'); return `archive_stage_${id.toLowerCase()}_${table}`; }
export async function stageTables(db: D1Database, id: string, catalog: ArchiveTable[]) {
    const layouts = await stageLayouts(db, catalog);
    return catalog.map(t => db.prepare(`CREATE TABLE ${stageName(id, t.name)} AS SELECT ${physicalProjection(layouts.get(t.name)!)} FROM ${t.name} WHERE 0`));
}
export function partStatements(db: D1Database, id: string, part: ArchivePart, expectedProgress?: string) {
    const content = JSON.stringify(part), statements = [expectedProgress === undefined ? db.prepare('INSERT INTO archive_parts VALUES(?,?,?,?)').bind(id, part.index, part.sha256, '') : db.prepare("INSERT INTO archive_parts SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM archive_jobs WHERE id=? AND state='preparing' AND progress_json=?)").bind(id, part.index, part.sha256, '', id, expectedProgress)];
    // At most 256K UTF-16 units yields at most 1 MiB UTF-8, without splitting a surrogate pair.
    let offset = 0, index = 0;
    while (offset < content.length) {
        let end = Math.min(offset + 262144, content.length);
        const last = content.charCodeAt(end - 1);
        if (end < content.length && last >= 0xd800 && last <= 0xdbff)
            end--;
        statements.push(db.prepare('INSERT INTO archive_part_segments VALUES(?,?,?,?)').bind(id, part.index, index++, content.slice(offset, end)));
        offset = end;
    }
    return statements;
}
export async function readPart(db: D1Database, id: string, index: number) { const segments = (await db.prepare('SELECT content FROM archive_part_segments WHERE job_id=? AND part_index=? ORDER BY segment_index').bind(id, index).all<{
    content: string;
}>()).results; return segments.map(s => s.content).join(''); }
