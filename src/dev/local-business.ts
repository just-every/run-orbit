/** A changed carry updates a finished workspace once. Unchanged carries preserve owner edits. */
export async function applyLocalBusinessName(db: D1Database, name: string | undefined) {
  if (!name) return;
  // Observe the initial carry before setup finishes, so the owner's confirmed
  // name wins. Keep the last carry through empty/missing files and restarts.
  await db.batch([
    db.prepare(`UPDATE workspace_settings SET name=?, updated_at=?
      WHERE id='workspace' AND name IS NOT ? AND EXISTS(SELECT 1 FROM first_run_setup)
      AND NOT EXISTS(SELECT 1 FROM local_business_carry WHERE id='workspace' AND name=?)`)
      .bind(name, new Date().toISOString(), name, name),
    db.prepare(`INSERT INTO local_business_carry (id,name) VALUES ('workspace',?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name WHERE name IS NOT excluded.name`).bind(name),
  ]);
}
