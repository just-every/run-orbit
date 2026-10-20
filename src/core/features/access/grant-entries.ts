/** RECORD-017 (ct, 19 October): a collaborator grant on one record may include that record's internal entries (notes,
 * logged calls and meetings, task notes and handoffs). It is off unless whoever shares turns it on, and each change is audited. */
export const entriesAction='entries.read';
export const recordKinds=['contact','company','opportunity'];
export const includesEntries=(actions:readonly string[])=>actions.includes(entriesAction);
/** SQL: operator `subject` holds a live grant that reads record (`kind`,`id`) with its entries. Arguments are SQL expressions. */
export function entriesGrantSql(subject:string,kind:string,id:string){
 return `EXISTS(SELECT 1 FROM access_grants eg JOIN access_memberships em ON em.workspace_id=eg.workspace_id AND em.operator_id=eg.subject_id AND em.status='active' JOIN graph_records er ON er.id=eg.resource_id AND er.kind=eg.resource_type AND er.retired_into_id IS NULL WHERE eg.subject_kind='operator' AND eg.subject_id=${subject} AND eg.resource_type=${kind} AND eg.resource_id=${id} AND eg.revoked_at IS NULL AND (eg.expires_at IS NULL OR eg.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')) AND EXISTS(SELECT 1 FROM json_each(eg.actions_json) WHERE value='graph.read') AND EXISTS(SELECT 1 FROM json_each(eg.actions_json) WHERE value='${entriesAction}'))`;
}
export async function readsEntries(db:D1Database,operatorId:string,kind:string,recordId:string){return Boolean(await db.prepare(`SELECT ${entriesGrantSql('?','?','?')} AS ok`).bind(operatorId,kind,recordId).first<{ok:number}>('ok'));}
/** The collaborator's live grant that reads exactly this record, which the author may turn entries on for. */
export async function recordGrant(db:D1Database,operatorId:string,kind:string,recordId:string){return (await db.prepare("SELECT g.id FROM access_grants g WHERE g.subject_kind='operator' AND g.subject_id=? AND g.resource_type=? AND g.resource_id=? AND g.revoked_at IS NULL AND (g.expires_at IS NULL OR g.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')) AND EXISTS(SELECT 1 FROM json_each(g.actions_json) WHERE value='graph.read') ORDER BY g.created_at DESC LIMIT 1").bind(operatorId,kind,recordId).first<{id:string}>())?.id??null;}
