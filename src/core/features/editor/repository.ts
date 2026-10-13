export async function isSetupOwner(database: D1Database, operatorId: string) {
  return Boolean(await database.prepare("SELECT 1 FROM operators WHERE id=? AND setup_owner=1 AND status='active'").bind(operatorId).first());
}
