import {suppressionStatements} from './suppression';

/** Resolve current recipients at commit time, including aliases and merged identities. */
export async function contactStopStatements(db:D1Database,id:string,emails:Array<string|null|undefined>=[]){
 const contact=await db.prepare('SELECT email FROM contacts WHERE id=?').bind(id).first<{email:string|null}>();
 const aliases=(await db.prepare("SELECT identity_key FROM record_aliases WHERE record_type='contact' AND survivor_id=?").bind(id).all<{identity_key:string}>()).results;
 const identities=[...new Set([...emails,contact?.email,...aliases.map(alias=>alias.identity_key)].map(email=>email?.trim().toLowerCase()).filter((email):email is string=>!!email))];
 const recipients=`SELECT id FROM contacts WHERE id=? OR id IN(SELECT survivor_id FROM record_merge_claims WHERE record_type='contact' AND retired_id=?) OR lower(trim(email)) IN(SELECT value FROM json_each(?)) OR id IN(SELECT survivor_id FROM record_aliases WHERE record_type='contact' AND lower(trim(identity_key)) IN(SELECT value FROM json_each(?)))`;
 const bindings=[id,id,JSON.stringify(identities),JSON.stringify(identities)],at=new Date().toISOString();
 return [
  ...await suppressionStatements(db,identities),
  db.prepare(`UPDATE contacts SET contactability='do_not_contact',updated_at=? WHERE id IN(${recipients})`).bind(at,...bindings),
  db.prepare(`UPDATE drafts SET is_stale=1,stale_reason='Contact stop event',updated_at=? WHERE recipient_contact_id IN(${recipients})`).bind(at,...bindings),
  db.prepare(`UPDATE outbound_messages SET state='cancelled',failure='Contact stop event',updated_at=? WHERE state='scheduled' AND contact_id IN(${recipients})`).bind(at,...bindings)
 ];
}

/** A later reviewed clear permits new work; it never revives approvals predating a stop. */
export function invalidateSuppressedWork(db:D1Database,contactId?:string){
 const recipients="SELECT id FROM contacts WHERE contactability='do_not_contact'"+(contactId?' AND id=?':''),bindings=contactId?[contactId]:[],at=new Date().toISOString();
 return [
  db.prepare(`UPDATE drafts SET is_stale=1,stale_reason='Contact inherited do-not-contact',updated_at=? WHERE is_stale=0 AND recipient_contact_id IN(${recipients}) AND NOT EXISTS(SELECT 1 FROM outbound_messages m WHERE m.draft_id=drafts.id AND m.revision=drafts.revision AND m.state IN('accepted','delivered','bounced','delivery-unknown','reconciling','queued'))`).bind(at,...bindings),
  db.prepare(`UPDATE outbound_messages SET state='cancelled',failure='Contact inherited do-not-contact',updated_at=? WHERE state='scheduled' AND contact_id IN(${recipients})`).bind(at,...bindings)
 ];
}
