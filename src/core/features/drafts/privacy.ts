import {recordMailDatabase} from '../outreach/record-mail-storage';
import {identityMatch,identityPatterns} from '../records/erasure-identity';
import {redactJsonText} from '../settings/erasure-redaction';

/** Literal customer mailboxes follow the same whole-identity erasure as other saved text. */
export function messageContactErasure(db:D1Database,identities:string[]){
 const statements:D1PreparedStatement[]=[];
 for(const identity of identities){
  const patterns=identityPatterns(identity);
  const draftColumns=['subject','body','merge_review_json'];
  const draftMatch=draftColumns.map(identityMatch).join(' OR ');
  statements.push(
   db.prepare(`DELETE FROM message_library WHERE ${['name','subject','body'].map(identityMatch).join(' OR ')}`).bind(...patterns,...patterns,...patterns),
   db.prepare(`DELETE FROM outbound_messages WHERE ${['subject','body','render_snapshot_json'].map(identityMatch).join(' OR ')} OR draft_id IN(SELECT id FROM drafts WHERE ${draftMatch})`).bind(...Array(6).fill(patterns).flat()),
   db.prepare(`DELETE FROM drafts WHERE ${draftMatch}`).bind(...patterns,...patterns,...patterns),
   recordMailDatabase(db).prepare(`DELETE FROM outbound_messages WHERE ${['subject','body','render_snapshot_json'].map(identityMatch).join(' OR ')} OR draft_id IN(SELECT id FROM drafts WHERE ${draftMatch})`).bind(...Array(6).fill(patterns).flat()),
   recordMailDatabase(db).prepare(`DELETE FROM drafts WHERE ${draftMatch}`).bind(...patterns,...patterns,...patterns)
  );
 }
 return statements;
}

/** Render context is itself JSON stored in a string: redact its values before the outer document. */
function redactReview(text:string,name:string,mailbox:string){
 const review=JSON.parse(text) as {context?:unknown};
 if(review&&typeof review==='object'&&typeof review.context==='string')review.context=redactJsonText(review.context,name,mailbox,'Erased operator');
 return redactJsonText(JSON.stringify(review),name,mailbox,'Erased operator');
}

/** Mailboxes identify the operator globally; a display name only identifies their attributed text. */
export async function messageReviewOperatorErasure(db:D1Database,id:string,name:string,mailbox:string){
 const statements:D1PreparedStatement[]=[],redactName=name.length>=3;
 for(const [table,column,author]of [['drafts','merge_review_json','author_id'],['outbound_messages','render_snapshot_json','operator_id'],['record_mail_drafts','merge_review_json','author_id'],['record_mail_outbound_messages','render_snapshot_json','operator_id']] as const){
  const escapedName=JSON.stringify(name).slice(1,-1);
  const rows=(await db.prepare(`SELECT rowid AS row,${column} AS value,${author}=? AS attributed FROM ${table} WHERE ${column} IS NOT NULL AND (${identityMatch(column)} OR (${author}=? AND ? AND (instr(lower(${column}),lower(?))>0 OR instr(lower(json_extract(${column},'$.context')),lower(?))>0)))`).bind(id,...identityPatterns(mailbox),id,redactName?1:0,escapedName,escapedName).all<{row:number;value:string;attributed:number}>()).results;
  for(const row of rows){
   // A zero byte cannot occur in these user-facing text fields, and disables display-name redaction.
   const next=redactReview(row.value,redactName&&row.attributed?name:'\u0000',mailbox);
   if(next===row.value)continue;
   statements.push(
    db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'operator_erasure_fence',NULL WHERE NOT EXISTS(SELECT 1 FROM ${table} WHERE rowid=? AND ${column}=?)`).bind(row.row,row.value),
    db.prepare(`UPDATE ${table} SET ${column}=? WHERE rowid=?`).bind(next,row.row)
   );
  }
 }
 return statements;
}
