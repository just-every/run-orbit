import {identityMatch,identityPatterns} from '../records/erasure-identity';

/** Context can contain personal promises; remove the attributed whole rather than leaving partial text. */
export function relationshipContactErasure(db:D1Database,contactId:string,identities:string[]){
 const statements=[db.prepare('DELETE FROM opportunity_buying_context WHERE opportunity_id IN(SELECT opportunity_id FROM buying_context_contacts WHERE contact_id=?)').bind(contactId)];
 for(const identity of identities){
  const patterns=identityPatterns(identity);
  statements.push(db.prepare(`DELETE FROM opportunity_buying_context WHERE ${identityMatch('products_json')} OR ${identityMatch('next_step')} OR ${identityMatch('mutual_commitments')}`).bind(...patterns,...patterns,...patterns));
 }
 return statements;
}
