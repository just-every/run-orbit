// SQL backups can omit Wrangler bookkeeping. When it is available, it must
// agree with the independently recognized physical schema before old seeding.
const previousMigrations = [
  '0001_orbit_sample_spine.sql',
  '0002_magic_links.sql',
  '0003_outreach.sql',
  '0004_owner_bootstrap.sql'
];
const historySchema = `SELECT json_group_array(json_array(type,name,tbl_name,sql)) FROM (
  SELECT type,name,tbl_name,sql FROM sqlite_schema
  WHERE lower(tbl_name)='d1_migrations' OR lower(name)='d1_migrations' ORDER BY type,name
)`;
const historyRows = `SELECT json_group_array(json_array(id,name,applied_at)) FROM (
  SELECT id,name,applied_at FROM d1_migrations ORDER BY id,name,applied_at
)`;

async function snapshot(db: D1Database, query: string) {
  const value = await db.prepare(`SELECT (${query}) AS snapshot`).first<string>('snapshot');
  if (typeof value !== 'string') throw new Error('Contact seed migration history is unavailable.');
  return value;
}

export async function contactSeedHistory(db: D1Database) {
  const schema = await snapshot(db, historySchema);
  const objects = JSON.parse(schema) as Array<[string, string, string, string | null]>;
  const predicates = [`(${historySchema}) = ?`];
  const bindings = [schema];
  let previous = true;
  if (objects.length) {
    if (!objects.some(([type, name]) => type === 'table' && name.toLowerCase() === 'd1_migrations')) {
      throw new Error('Unsupported contact seed migration history.');
    }
    // Do not turn a missing column or failed ledger read into an absent ledger.
    const rows = await snapshot(db, historyRows);
    const applied = JSON.parse(rows) as Array<[number, string, string]>;
    previous = applied.length === 0 || (applied.length === previousMigrations.length
      && applied.every(([id, name, at], index) => id === index + 1
        && name === previousMigrations[index] && typeof at === 'string' && at.length > 0));
    predicates.push(`(${historyRows}) = ?`);
    bindings.push(rows);
  }
  // The absent case deliberately never references a missing table. Its schema
  // predicate still rejects a ledger created before this writer's batch runs.
  return { previous, predicate: predicates.join(' AND '), bindings };
}
