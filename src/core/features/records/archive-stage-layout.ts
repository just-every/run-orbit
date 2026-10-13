import type { ArchiveTable } from './archive-schema';
import { RecordError } from './shared';

type PhysicalColumn = { table_name: string; cid: number; name: string; hidden: number; notnull: number; pk: number; type: string };
export type StageLayout = { name: string; columns: PhysicalColumn[] };
export function quoteIdentifier(name: string) { return `"${name.replaceAll('"', '""')}"`; }
export async function stageLayouts(db: D1Database, catalog: readonly ArchiveTable[]): Promise<Map<string, StageLayout>> {
    const rows = (await db.prepare(`SELECT j.value AS table_name,p.cid,p.name,p.hidden,p."notnull",p.pk,p.type FROM json_each(?) j JOIN pragma_table_xinfo(j.value) p WHERE p.hidden<>1 ORDER BY j.key,p.cid`).bind(JSON.stringify(catalog.map(t => t.name))).all<PhysicalColumn>()).results;
    const layouts = new Map<string, StageLayout>();
    for (const table of catalog) {
        const columns = rows.filter(c => c.table_name === table.name);
        if (!columns.length || columns.length > 100 || table.columns.some(c => !columns.some(p => p.name === c.name))) throw new RecordError(400, 'The installed archive schema changed.');
        layouts.set(table.name, { name: table.name, columns });
    }
    return layouts;
}
export function stageCell(layout: StageLayout, name: string, qualifier?: string) {
    const index = layout.columns.findIndex(c => c.name === name);
    if (index < 0) throw new RecordError(400, 'The installed archive column changed.');
    return `${qualifier ? `${qualifier}.` : ''}c_${index}`;
}
export function physicalProjection(layout: StageLayout) { return layout.columns.map((c, index) => `${quoteIdentifier(c.name)} AS c_${index}`).join(','); }
/** Prefer an actual hidden row address; nullable SQLite primary keys are not identities. */
export function liveRowSelector(layout: StageLayout): string | null {
    const alias = ['rowid', '_rowid_', 'oid'].find(name => !layout.columns.some(c => c.name.toLowerCase() === name));
    const keys = layout.columns.filter(c => c.pk).sort((a, b) => a.pk - b.pk);
    if (keys.length && keys.every(c => c.notnull)) return keys.map(c => quoteIdentifier(c.name)).join(',');
    return alias ?? null;
}
