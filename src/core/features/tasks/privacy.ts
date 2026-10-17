import {identityMatch,identityPatterns} from '../records/erasure-identity';
/** Remove tasks attributable to an erased contact and exact mailbox copies in other task notes. */
export function taskContactErasure(db:D1Database,contactId:string,identities:string[]){
 return [db.prepare('DELETE FROM sales_tasks WHERE contact_id=? OR opportunity_id IN(SELECT opportunity_id FROM opportunity_contacts WHERE contact_id=?)').bind(contactId,contactId),...identities.map(identity=>{const patterns=identityPatterns(identity);return db.prepare(`DELETE FROM sales_tasks WHERE ${identityMatch('title')} OR ${identityMatch('notes')}`).bind(...patterns,...patterns);})];
}
