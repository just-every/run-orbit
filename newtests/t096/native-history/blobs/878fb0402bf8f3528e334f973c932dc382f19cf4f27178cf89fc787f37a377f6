import { suppressionPredicate } from './suppression';
import { contactSeedHistory } from './seed-history';

// Contact seeding alone supports the canonical 0001–0004 generation. This is
// the SHA-256 of its complete ordered SQLite schema, not a migration-ledger
// assertion or a missing-table heuristic. Bookkeeping is checked separately.
const previousFour = 'b461324fdb6dcdece734a488136d0dfd1d3abf577510e85fd4635ce0cc2bcb53';
// Canonical DDL for the modern seed's control/key constraints and every insert
// guard it relies on. A present but weakened table or trigger is not sufficient.
const modernPrerequisites = {
  runtime_controls: '1079a831f9b50c86cd4b0ba243664056316e0eade3210cb46bd77330f4806094',
  privacy_matching_contexts: 'd782d84e5b8b6960125ccb5cdecc8ba32260c3e5f3debfab1be3d629d53af673',
  archive_guard_contacts_insert: '9b66a5fca5fd4ffe4c3c55d3f63893f1577484f86f89abf47674114e91cffabe',
  archive_guard_audit_entries_insert: 'ebeedee22c917f286d0892454894ad74a79083aa2381a4533b629cfc6aae8cdd',
  archive_guard_privacy_matching_contexts_insert: 'b166c53273cce3d0ea129602a1e2e796575daadccff231460dde13bdad20c79d'
};
const schemaSnapshot = `SELECT json_group_array(json_array(type,name,tbl_name,sql)) AS snapshot FROM (
  SELECT type,name,tbl_name,sql FROM sqlite_schema
  WHERE sql IS NOT NULL AND substr(name,1,7)<>'sqlite_'
    AND tbl_name NOT IN ('_cf_KV','_cf_METADATA','d1_migrations') ORDER BY type,name
)`;

async function digest(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

/** Re-read on every call: an existing service can outlive a migration. */
export async function contactSeedGeneration(db: D1Database) {
  const serialized = await db.prepare(schemaSnapshot).first<string>('snapshot');
  if (typeof serialized !== 'string') throw new Error('Contact seed schema is unavailable.');
  const legacy = await digest(serialized) === previousFour;
  const history = await contactSeedHistory(db);
  if (legacy && !history.previous) {
    throw new Error('Unsupported contact seed schema generation: migration history contradicts the previous schema.');
  }
  if (!legacy) {
    const objects = JSON.parse(serialized) as Array<[string, string, string, string]>;
    for (const [name, expected] of Object.entries(modernPrerequisites)) {
      const definition = objects.find(([, objectName]) => objectName === name)?.[3];
      if (!definition || await digest(definition) !== expected) {
        throw new Error('Unsupported contact seed schema generation or invalid suppression prerequisites.');
      }
    }
    await db.prepare('SELECT contactability_revision FROM contacts LIMIT 0').all();
  }
  // Schema and available history must both still match inside the write batch.
  // json() deliberately rejects the error text; SELECT does not mutate schema
  // or require modern control tables on the previous generation.
  const fence = db.prepare(`SELECT CASE WHEN (${schemaSnapshot}) = ? AND ${history.predicate} THEN 1
    ELSE json('Contact seed schema or migration history changed before write') END`).bind(serialized, ...history.bindings);
  return { legacy, fence };
}

/** A read assertion cannot be suppressed by an owner trigger on control writes. */
export function contactSeedContextFence(db: D1Database, tokens: readonly string[]) {
  if (!tokens.length) return [];
  suppressionPredicate(tokens); // Validate derived tokens before embedding their context IDs.
  const contexts = [...new Set(tokens.map(token => token.slice(0, 32)))];
  return [db.prepare(`SELECT CASE WHEN EXISTS (
    SELECT 1 FROM privacy_matching_contexts WHERE context_id NOT IN (${contexts.map(id => `'${id}'`).join(',')})
  ) THEN json('Contact seed matching contexts changed before write') ELSE 1 END`)];
}
