import type { ImportPlan,D1Sql } from '../../../modules/import-kit/d1/index';
import { reviewPlan } from './reviews';
import { sql } from './targets';

/** Match whole mailboxes, including mixed case and a sentence's final period. */
export function mailboxPattern(emails:string[]){
 const values=[...new Set(emails.map(email=>email.trim().toLowerCase()).filter(Boolean))].map(email=>email.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
 return values.length?new RegExp("(?<![a-z0-9.!#$%&'*+/=?^_`{|}~@-])(?:"+values.join('|')+")(?=$|[^a-z0-9_@.-]|[.](?:$|[^a-z0-9_@.-]))",'gi'):null;
}
export function containsMailbox(value:string,emails:string[]){return mailboxPattern(emails)?.test(value)??false;}

/** Review uploads are private, but still participate in native erasure. Decode
 * the exact originals: a malformed/rejected row may have no mapped effect. */
export async function withdrawImportReviews(db:D1Database,contactId:string,emails:string[]):Promise<D1Sql[]>{
 const reviews=(await db.prepare('SELECT id,plan_json FROM crm_import_reviews ORDER BY id').all<{id:string;plan_json:string}>()).results,affected:string[]=[];
 for(const review of reviews){
  if(review.plan_json==='null')continue;
  const body=await reviewPlan(db,review.id,review.plan_json),plan=JSON.parse(body) as ImportPlan;
  if(body.includes(contactId)||containsMailbox(body,emails)||plan.source.artifacts.some(artifact=>artifact.original?.status==='available'&&containsMailbox(Buffer.from(artifact.original.base64,'base64').toString('utf8'),emails)))affected.push(review.id);
 }
 // A concurrently saved review must not appear between discovery and erasure.
 // The existing NOT NULL constraint aborts the whole native deletion on drift.
 return [sql("INSERT INTO runtime_controls(name,value) SELECT 'crm_review_erasure_fence',NULL WHERE (SELECT json_group_array(json_array(id,plan_json)) FROM (SELECT id,plan_json FROM crm_import_reviews ORDER BY id))<>?",JSON.stringify(reviews.map(review=>[review.id,review.plan_json]))),
  sql("DELETE FROM notifications WHERE EXISTS(SELECT 1 FROM crm_import_reviews r WHERE r.id IN(SELECT value FROM json_each(?)) AND substr(notifications.event_key,1,length('import-ownership:'||r.job_id||':'))='import-ownership:'||r.job_id||':')",JSON.stringify(affected)),
  sql('DELETE FROM crm_import_review_chunks WHERE review_id IN(SELECT value FROM json_each(?))',JSON.stringify(affected)),
  sql("UPDATE crm_import_reviews SET plan_json='null',fingerprint='',safety_pending=0 WHERE id IN(SELECT value FROM json_each(?))",JSON.stringify(affected))];
}
