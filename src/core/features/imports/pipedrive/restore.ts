/** Successful native restore withdraws the destination's prior connector authority atomically. */
export function withdrawPipedriveAfterRestore(db:D1Database){return[
 db.prepare('DELETE FROM crm_import_reviews WHERE id IN(SELECT review_id FROM crm_import_pipedrive_reviews)'),
 db.prepare('DELETE FROM crm_import_pipedrive_reviews'),
 db.prepare('DELETE FROM crm_import_pipedrive_pulls'),
 db.prepare('DELETE FROM crm_import_pipedrive_connections'),
];}
