/** Tables a later migration renamed, rows and all: 0093 moved the owner sign-in grants to the table `rer signin` writes. */
const renamed: Record<string, string> = {identity_owner_signins: 'oa_owner_signins'};

/** The table a pre-upgrade table's rows live in on this database now. */
export async function currentTable(db: D1Database, name: string): Promise<string> {
  const next = renamed[name];
  if (!next) return name;
  return await db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").bind(name).first() ? name : next;
}
