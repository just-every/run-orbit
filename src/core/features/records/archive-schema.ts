import {ownershipLocalTables} from '../ownership/archive-compatibility';
import {nativeCatalogGenerations,legacyNativeCatalog} from './archive-generations';
import { z } from 'zod';
import { RecordError } from './shared';
export const ARCHIVE_PART_BYTES = 16777216;
export const ARCHIVE_PART_ROWS = 1000;
export const manifestSchema = z.object({ format: z.literal('orbit-export'), version: z.literal(2), exportedAt: z.iso.datetime(), tables: z.array(z.object({ name: z.string().regex(/^[a-z_][a-z0-9_]*$/), columns: z.array(z.string().regex(/^[a-z_][a-z0-9_]*$/)).min(1).max(100), rows: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER) }).strict()).max(100), parts: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER), rows: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER) }).strict();
export type ArchiveManifest = z.infer<typeof manifestSchema>;
export type ArchiveColumn = {
    name: string;
    type: string;
    notnull: number;
    pk: number;
    dflt_value: string | null;
};
export type ArchiveTable = {
    name: string;
    columns: ArchiveColumn[];
    dependencies: string[];
};
const excluded = new Set([...ownershipLocalTables,'sessions', 'magic_links', 'owner_bootstrap', 'sample_seed_runs', 'first_run_setup', 'd1_migrations', 'public_rate_limits', 'auth_rate_limits', 'runtime_controls', 'record_erasure_signals', 'capture_credentials','capture_oauth','capture_locks']);
export const secretColumns: Record<string, readonly string[]> = { signal_sources: ['secret_ciphertext'] };
const catalogCache = new WeakMap<D1Database, Promise<ArchiveTable[]>>();
export function archiveCatalog(db: D1Database): Promise<ArchiveTable[]> { let cached = catalogCache.get(db); if (!cached) {
    cached = readCatalog(db);
    catalogCache.set(db, cached);
    cached.catch(() => catalogCache.delete(db));
} return cached; }
async function readCatalog(db: D1Database): Promise<ArchiveTable[]> {
    const names = (await db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all<{
        name: string;
    }>()).results.map(r => r.name).filter(n => !excluded.has(n) && !['ik_', 'crm_import_', 'delegation_', 'identity_', 'oa_', 'sqlite_', '_cf_', 'rer_', 'record_search', 'timeline_search', 'archive_'].some(p => n.startsWith(p)));
    for (const name of names) if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new RecordError(400, `Archive table ${name} uses an unsupported identifier. Use lowercase letters, digits and underscores, beginning with a letter or underscore.`);
    if (names.length > 100) throw new RecordError(400, 'Archive schema exceeds the version 2 limit of 100 tables.');
    // Bind the validated inventory once per metadata query. Return individual rows:
    // a JSON aggregate could exceed SQLite's cell limit for a supported catalog.
    // table_info intentionally omits generated columns; restore recomputes them.
    const inventory = JSON.stringify(names);
    const columnRows = (await db.prepare(`SELECT n.value AS table_name, c.cid, c.name, c.type, c."notnull", c.dflt_value, c.pk
        FROM json_each(?) AS n CROSS JOIN pragma_table_info(n.value) AS c
        ORDER BY n.value, c.cid`).bind(inventory).all<ArchiveColumn & { table_name: string; cid: number }>()).results;
    const columnsByTable = new Map(names.map(name => [name, [] as ArchiveColumn[]]));
    for (const { table_name, ...column } of columnRows) if (!secretColumns[table_name]?.includes(column.name)) columnsByTable.get(table_name)!.push(column);
    for (const [name, columns] of columnsByTable) {
        if (columns.some(column => !/^[a-z_][a-z0-9_]*$/.test(column.name))) throw new RecordError(400, `Archive columns in ${name} use unsupported identifiers.`);
        if (columns.length < 1 || columns.length > 100) throw new RecordError(400, `Archive columns in ${name} exceed the version 2 envelope of 1 to 100 columns.`);
    }
    const foreignKeys = (await db.prepare(`SELECT n.value AS table_name, f."table" AS dependency
        FROM json_each(?) AS n CROSS JOIN pragma_foreign_key_list(n.value) AS f
        ORDER BY n.value, f.id, f.seq`).bind(inventory).all<{ table_name: string; dependency: string }>()).results;
    const dependenciesByTable = new Map(names.map(name => [name, new Set<string>()]));
    for (const { table_name, dependency } of foreignKeys) if (columnsByTable.has(dependency)) dependenciesByTable.get(table_name)!.add(dependency);
    const tables: ArchiveTable[] = [];
    for (const name of names) {
        const columns = columnsByTable.get(name)!;
        const dependencies = [...dependenciesByTable.get(name)!];
        if(name==='audit_entries')dependencies.push('privacy_matching_contexts');
        if(name==='contacts')dependencies.push('audit_entries');
        tables.push({ name, columns, dependencies });
    }
    const ordered: ArchiveTable[] = [];
    while (ordered.length < tables.length) {
        const ready = tables.filter(t => !ordered.includes(t) && t.dependencies.every(d => ordered.some(o => o.name === d)));
        if (!ready.length)
            throw new RecordError(400, 'Archive schema contains a foreign-key dependency cycle. Remove cyclic dependencies before creating an export or restore; no transfer has started.');
        ordered.push(...ready);
    }
    return ordered;
}
export function jsonRowExpression(columns: readonly {
    name: string;
}[], prefix = '') {
    // SQLite limits each SQL function to 32 arguments. json_set preserves SQL NULL keys.
    let expression = "json('{}')";
    for (let i = 0; i < columns.length; i += 15)
        expression = `json_set(${expression},${columns.slice(i, i + 15).flatMap(c => [`'$.${c.name}'`, `${prefix}${c.name}`]).join(',')})`;
    return expression;
}
// Accept only complete, explicitly supported native schema generations. Never infer
// arbitrary missing tables/columns as an old archive: that would hide corruption.
export async function validateManifest(db: D1Database, input: unknown) {
    const parsed = manifestSchema.safeParse(input);
    if (!parsed.success) throw new RecordError(400, 'Invalid archive manifest.');
    const manifest = parsed.data, catalog = await archiveCatalog(db);
    const previous=legacyNativeCatalog(catalog);
    const generations = [...nativeCatalogGenerations(catalog),previous.filter(t => t.name !== 'mail_provider_conflicts'),
        previous.filter(t => !['privacy_matching_contexts', 'mail_provider_conflicts'].includes(t.name)).map(t => t.name === 'contacts' ? { ...t, columns: t.columns.filter(c => c.name !== 'contactability_revision') } : t)];
    const inputCatalog = generations.find(candidate => manifest.tables.length === candidate.length && new Set(manifest.tables.map(t => t.name)).size === candidate.length && candidate.every(table => {
        const supplied = manifest.tables.find(t => t.name === table.name);
        return supplied && JSON.stringify(supplied.columns) === JSON.stringify(table.columns.map(c => c.name));
    }));
    if (!inputCatalog || manifest.rows !== manifest.tables.reduce((n, t) => n + t.rows, 0))
        throw new RecordError(400, 'Archive table inventory, columns or row count does not match a supported native schema.');
    return { manifest, catalog, inputCatalog };
}
export async function archiveHash(value: unknown) { const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value))); return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join(''); }
export type ArchivePart = {
    index: number;
    sha256: string;
    records: {
        table: string;
        index: number;
        row: Record<string, string | number | null>;
    }[];
};
export function validatePart(input: unknown, catalog: ArchiveTable[], manifest: ArchiveManifest): ArchivePart {
    const schema = z.object({ index: z.number().int().nonnegative(), sha256: z.string().regex(/^[a-f0-9]{64}$/), records: z.array(z.object({ table: z.string(), index: z.number().int().nonnegative(), row: z.record(z.string(), z.union([z.string(), z.number().finite(), z.null()])) }).strict()).min(1).max(ARCHIVE_PART_ROWS) }).strict();
    const parsed = schema.safeParse(input);
    if (!parsed.success || new TextEncoder().encode(JSON.stringify(input)).length > ARCHIVE_PART_BYTES)
        throw new RecordError(400, 'Invalid or oversized archive part.');
    for (const record of parsed.data.records) {
        const table = catalog.find(t => t.name === record.table), expected = manifest.tables.find(t => t.name === record.table);
        if (!table || !expected || record.index >= expected.rows || Object.keys(record.row).length !== table.columns.length)
            throw new RecordError(400, 'Invalid archive row inventory.');
        for (const col of table.columns) {
            const value = record.row[col.name];
            if (value === undefined || (value === null && col.notnull) || (value !== null && (col.type.toUpperCase().includes('INT') ? typeof value !== 'number' || !Number.isSafeInteger(value) : col.type.toUpperCase() === 'REAL' ? typeof value !== 'number' : typeof value !== 'string')))
                throw new RecordError(400, `Invalid value in ${record.table}.${col.name}.`);
        }
    }
    return parsed.data;
}
