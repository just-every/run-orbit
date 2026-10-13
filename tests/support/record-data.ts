import { DataRepository } from '../../src/core/features/records/data';
import { archiveCatalog, archiveHash, type ArchivePart } from '../../src/core/features/records/archive-schema';
import { ArchiveImportRepository } from '../../src/core/features/records/archive-import';
/** Small-fixture inspection only. Production transfers always use paged archive jobs. */
export class TestDataRepository extends DataRepository {
    async export() { const tables: Record<string, Record<string, any>[]> = {}; for (const t of await archiveCatalog(this.db))
        tables[t.name] = (await this.db.prepare(`SELECT ${t.columns.map(c => c.name).join(',')} FROM ${t.name} LIMIT 10000`).all<Record<string, any>>()).results; return { format: 'orbit-export', version: 2, exportedAt: new Date().toISOString(), tables }; }
    async restore(input: {
        exportedAt: string;
        tables: Record<string, Record<string, any>[]>;
    }, actor: string) { const catalog = await archiveCatalog(this.db), parts: ArchivePart[] = []; for (const t of catalog) {
        const rows = input.tables[t.name];
        for (let index = 0; index < rows.length; index += 100) {
            const records = rows.slice(index, index + 100).map((row, i) => ({ table: t.name, index: index + i, row }));
            parts.push({ index: parts.length, records, sha256: await archiveHash(records) });
        }
    } const manifest = { format: 'orbit-export' as const, version: 2 as const, exportedAt: input.exportedAt, tables: catalog.map(t => ({ name: t.name, columns: t.columns.map(c => c.name), rows: input.tables[t.name].length })), parts: parts.length, rows: Object.values(input.tables).reduce((n, r) => n + r.length, 0) }; const repo = new ArchiveImportRepository(this.db); let status = await repo.create(manifest, actor); for (const p of parts)
        await repo.upload(status.id, p.index, p, actor); for (let i = 0; i < 2000 && status.state !== 'complete'; i++)
        status = await repo.advance(status.id, actor); if (status.state !== 'complete')
        throw new Error('Fixture restore did not finish.'); return { restored: true }; }
}
