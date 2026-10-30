/** A changed carry updates a finished workspace once. Unchanged carries preserve owner edits. */
export async function applyLocalBusinessName(db: D1Database, name: string | undefined) {
  if (!name) return;
  // Observe the initial carry before setup finishes, so the owner's confirmed
  // name wins. Keep the last carry through empty/missing files and restarts.
  await db.prepare(`UPDATE workspace_settings SET
    name=CASE WHEN EXISTS(SELECT 1 FROM first_run_setup) THEN ? ELSE name END,
    updated_at=CASE WHEN EXISTS(SELECT 1 FROM first_run_setup) AND name IS NOT ? THEN ? ELSE updated_at END,
    local_business_name=?
    WHERE id='workspace' AND local_business_name IS NOT ?`)
    .bind(name, name, new Date().toISOString(), name, name).run();
}
