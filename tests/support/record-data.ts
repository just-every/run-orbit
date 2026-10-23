import { DataRepository } from '../../src/core/features/records/data';
import { foldArchiveCatalog } from '../../src/core/features/records/archive-fold-catalog';
import { ArchiveImportRepository } from '../../src/core/features/records/archive-import';
import { currentFixtureArchive, type FixtureTableMap } from './current-archive';
/** Small-fixture inspection only. Production transfers always use paged archive jobs. */
export class TestDataRepository extends DataRepository {
    async export() { const tables: Record<string, Record<string, any>[]> = {}; for (const t of await foldArchiveCatalog(this.db))
        tables[t.name] = (await this.db.prepare(`SELECT ${t.columns.map(c => c.name).join(',')} FROM ${t.name} LIMIT 10000`).all<Record<string, any>>()).results; return { format: 'orbit-export', version: 3, exportedAt: new Date().toISOString(), tables }; }
    async restore(input: FixtureTableMap, actor: string) {
        const {manifest, parts} = await currentFixtureArchive(this.db, input), repo = new ArchiveImportRepository(this.db, true);
        let status = await repo.create(manifest, actor);
        for (const part of parts) await repo.upload(status.id, part.index, part, actor);
        for (let i = 0; i < 2000 && status.state !== 'complete'; i++) status = await repo.advance(status.id, actor);
        if (status.state !== 'complete') throw new Error('Fixture restore did not finish.');
        return { restored: true };
    }
}
