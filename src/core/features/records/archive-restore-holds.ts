/** Read-only facts for restore copy. The restore's suppression decisions stay in suppression.ts. */
export async function restoreStopFacts(db:D1Database){
 const proofs=(await db.prepare("SELECT id,entity_id AS token FROM audit_entries WHERE action='contact.suppressed'").all<{id:string;token:string}>()).results;
 const clears=(await db.prepare("SELECT cleared.entity_id AS token,item.value AS id FROM audit_entries cleared,json_each(cleared.details_json,'$.proofs') item WHERE cleared.action='contact.suppression_cleared'").all<{id:string;token:string}>()).results;
 const cleared=new Set(clears.map(proof=>`${proof.token}/${proof.id}`));
 return {proofs:proofs.filter(proof=>!cleared.has(`${proof.token}/${proof.id}`)),clears};
}
