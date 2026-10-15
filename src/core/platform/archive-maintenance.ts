export async function archiveImportActive(db:D1Database){return Boolean(await db.prepare("SELECT 1 FROM runtime_controls WHERE name='archive_import'").first());}
export const archiveMaintenanceMessage='Workspace restoration is in progress. Continue or abort it in Opportunities → Import, duplicate review and data export → Workspace data.';
