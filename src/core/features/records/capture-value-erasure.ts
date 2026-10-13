import {mailboxPattern} from '../imports/review-erasure';
import {identityMatch,identityPatterns} from './erasure-identity';

/** Capture can copy reviewed text into contact names and phones. Redact only the
 * erased mailbox, including later edits, without reverting the accepted value.
 * Scan the destination fields: their source proposal may already have been erased. */
export async function capturedValueErasureStatements(db:D1Database,contactId:string,emails:string[]){
 const pattern=mailboxPattern(emails),statements:D1PreparedStatement[]=[];
 if(!pattern)return statements;
 type ContactText={id:string;name:string|null;phone:string|null};
 const rows=new Map<string,ContactText>();
 const predicate=`id<>? AND (${identityMatch('name')} OR ${identityMatch('phone')})`;
 for(const email of emails){
  const bindings=[contactId,...identityPatterns(email),...identityPatterns(email)];
  for(const row of (await db.prepare(`SELECT id,name,phone FROM contacts WHERE ${predicate}`).bind(...bindings).all<ContactText>()).results)rows.set(row.id,row);
 }
 for(const row of rows.values())statements.push(db.prepare('UPDATE contacts SET name=?,phone=?,updated_at=? WHERE id=? AND name IS ? AND phone IS ?')
  .bind(row.name?.replace(pattern,'[erased]')??null,row.phone?.replace(pattern,'[erased]')??null,new Date().toISOString(),row.id,row.name,row.phone));
 // Imported copies may already be redacted by their owner in this same batch.
 // A concurrent changed/new copy must instead roll back erasure for fresh review.
 for(const email of emails)statements.push(db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'capture_value_erasure_fence',NULL WHERE EXISTS(SELECT 1 FROM contacts WHERE ${predicate})`)
  .bind(contactId,...identityPatterns(email),...identityPatterns(email)));
 return statements;
}
