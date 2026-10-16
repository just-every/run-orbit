import { contactEmailKey } from '../records/identity';
import { privacyMatcher, suppressionContextFence, suppressionProof } from '../records/suppression';
import { eventSchema, IngestionError, type SignalEvent } from './contracts';
import { doNotContactReason } from '../outreach/stop-reason';

export function stopsMailbox(event:SignalEvent){
  return event.type==='email.unsubscribed'||(event.type==='email.bounced'&&event.permanentBounce===true);
}

// Signal association and mailbox authority are independent. Never infer a mailbox
// from an opportunity's primary contact, company membership, or a reviewed link.
const recipients=`SELECT id FROM contacts WHERE email_key=? UNION
  SELECT c.id FROM record_aliases a JOIN contacts c ON c.id=a.survivor_id
  WHERE a.record_type='contact' AND a.identity_key=?`;
const identities=`SELECT lower(trim(email)) AS email FROM contacts WHERE id IN(${recipients}) AND email IS NOT NULL
  UNION SELECT lower(trim(identity_key)) AS email FROM record_aliases
  WHERE record_type='contact' AND survivor_id IN(${recipients})`;
const explicitContacts="SELECT id FROM contacts WHERE id=? UNION SELECT survivor_id AS id FROM record_merge_claims WHERE record_type='contact' AND retired_id=?";

/** All private proofs and current-recipient effects join the signal's D1 batch. */
export async function mailboxStopStatements(db:D1Database,event:SignalEvent,at:string){
  if(!stopsMailbox(event)||event.email===undefined)return [];
  if(!eventSchema.shape.email.safeParse(event.email).success)throw new IngestionError(400,'Invalid stop mailbox.');
  const key=contactEmailKey(event.email);
  if(!key)throw new IngestionError(400,'Invalid stop mailbox identity.');
  const bindings=[key,key],matches=(await db.prepare(recipients).bind(...bindings).all<{id:string}>()).results;
  if(matches.length>1)throw new IngestionError(409,'Stop mailbox identifies more than one contact.');
  const contactId=event.record?.type==='contact'?event.record.id:undefined;
  if(contactId){
    const explicit=(await db.prepare(explicitContacts).bind(contactId,contactId).all<{id:string}>()).results;
    if(explicit.length&&(!matches.length||explicit.some(row=>row.id!==matches[0]!.id)))throw new IngestionError(409,'Stop mailbox and contact record identify different contacts.');
  }
  const rows=(await db.prepare(identities).bind(...bindings,...bindings).all<{email:string}>()).results;
  const mailboxes=[...new Set([event.email.trim().toLowerCase(),...rows.map(row=>row.email)].filter(Boolean))];
  const statements:D1PreparedStatement[]=[],match=await privacyMatcher(db,statements);
  const tokens=[...new Set((await Promise.all(mailboxes.map(email=>match(email)))).flat())];
  const contexts=[...new Set(tokens.map(token=>token.slice(0,32)))];
  statements.push(...suppressionContextFence(db,tokens),
    db.prepare("INSERT INTO runtime_controls(name,value) SELECT 'source_stop_context',NULL WHERE (SELECT count(*) FROM privacy_matching_contexts)<>?").bind(contexts.length),
    db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'source_stop_identity',NULL WHERE (SELECT count(*) FROM (${recipients}))>1
      OR EXISTS(SELECT 1 FROM (${identities}) WHERE email<>'' AND email NOT IN(SELECT value FROM json_each(?)))`).bind(...bindings,...bindings,...bindings,JSON.stringify(mailboxes)));
  if(contactId)statements.push(db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'source_stop_contact',NULL
    WHERE EXISTS(SELECT 1 FROM (${explicitContacts}) WHERE id NOT IN(${recipients}))`).bind(contactId,contactId,...bindings));
  // A merge introducing an unhashed identity fails atomically and is retryable;
  // deletion/recreation at the same mailbox resolves the replacement at commit.
  statements.push(...tokens.map(token=>suppressionProof(db,token)),
    db.prepare(`UPDATE contacts SET contactability='do_not_contact',updated_at=? WHERE id IN(${recipients})`).bind(at,...bindings),
    db.prepare(`UPDATE drafts SET is_stale=1,stale_reason=?,updated_at=? WHERE recipient_contact_id IN(${recipients})`).bind(doNotContactReason,at,...bindings),
    db.prepare(`UPDATE outbound_messages SET state='cancelled',failure=?,updated_at=? WHERE state='scheduled' AND contact_id IN(${recipients})`).bind(doNotContactReason,at,...bindings));
  return statements;
}
