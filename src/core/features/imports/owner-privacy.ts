import {retireD1ImportCustody,type D1Sql,type ImportPlan} from '../../../modules/import-kit/d1/index';
import {archiveErasureStatements} from '../records/archive-erasure';
import {captureImportErasure,erasureContext} from './erasure';
import {reviewPlan} from './reviews';
const query=(sql:string,...params:any[]):D1Sql=>({sql,params});
function noticeWithdrawal(id:string){return query(`DELETE FROM notifications WHERE kind='record.assigned' AND event_key IN(
 SELECT 'import-ownership:'||r.job_id||':'||notifications.operator_id FROM crm_import_reviews r WHERE r.actor_id=?
 UNION SELECT 'import-ownership:'||p.job_id||':'||notifications.operator_id FROM ik_provenance p WHERE p.target_kind='owner' AND json_extract(p.record_json,'$.before.value.row.owner_id')=?
 UNION SELECT 'import-ownership:'||p.job_id||':'||notifications.operator_id FROM ik_d1_history p WHERE p.target_kind='owner' AND json_extract(p.record_json,'$.before.value.row.owner_id')=?
 )`,id,id,id);}
/** Match identity links, never another customer's text that happens to contain
 * the retired operator's display name or mailbox. */
function linkedReview(plan:ImportPlan,id:string){
 return plan.principalId===id||plan.entries.some(entry=>{
  const payload=entry.source.payload as any;
  return payload.ownerReview?.ownerId===id||payload.owner?.ownerId===id||entry.effects.some(effect=>{
   if(effect.targetKind!=='owner')return false;const value=effect.value as any;
   return value.row?.owner_id===id||value.attribution?.actorId===id||value.attribution?.previousOwnerId===id;
  });
 });
}
function withdrawnReviews(ids:string[],jobs:string[]=[]){
 const where='id IN(SELECT value FROM json_each(?)) OR job_id IN(SELECT value FROM json_each(?))',params=[JSON.stringify(ids),JSON.stringify(jobs)];
 return[query(`DELETE FROM crm_import_review_chunks WHERE review_id IN(SELECT id FROM crm_import_reviews WHERE ${where})`,...params),
  query(`UPDATE crm_import_reviews SET namespace='orbit:csv:Source withdrawn after operator erasure',plan_json='null',fingerprint='',safety_pending=0,job_id=NULL WHERE ${where}`,...params)];
}
/** Raw CSV, normalized owner values and mapping choices share private custody.
 * Withdraw that whole custody through Kit's retirement API. Native records,
 * owners and timeline and history remain; these imports can no longer resume or undo. */
export async function importOwnerOperatorErasure(db:D1Database,id:string,actor:string,_email?:string,_name?:string){
 const reviews=(await db.prepare('SELECT id,actor_id,job_id,plan_json FROM crm_import_reviews ORDER BY id').all<{id:string;actor_id:string;job_id:string|null;plan_json:string}>()).results;
 const affected:string[]=[],linkedJobs=new Set<string>();
 for(const review of reviews){
  const linked=review.actor_id===id||(review.plan_json!=='null'&&linkedReview(JSON.parse(await reviewPlan(db,review.id,review.plan_json)),id));
  if(linked){affected.push(review.id);if(review.job_id)linkedJobs.add(review.job_id);}
 }
 const ownerMarkers=(await db.prepare("SELECT id FROM crm_import_targets WHERE kind='owner' AND (json_extract(original_json,'$.row.owner_id')=? OR json_extract(original_json,'$.attribution.previousOwnerId')=? OR json_extract(original_json,'$.attribution.actorId')=?)").bind(id,id,id).all<{id:string}>()).results.map(row=>row.id);
 const jobs=(await db.prepare(`SELECT id,operation_key FROM ik_jobs WHERE destination='workspace' AND (principal_id=? OR id IN(SELECT value FROM json_each(?)) OR id IN(
 SELECT job_id FROM ik_provenance WHERE target_kind='owner' AND (target_id IN(SELECT value FROM json_each(?)) OR json_extract(record_json,'$.before.value.row.owner_id')=? OR json_extract(record_json,'$.before.value.attribution.previousOwnerId')=?)
 UNION SELECT job_id FROM ik_d1_history WHERE target_kind='owner' AND (target_id IN(SELECT value FROM json_each(?)) OR json_extract(record_json,'$.before.value.row.owner_id')=? OR json_extract(record_json,'$.before.value.attribution.previousOwnerId')=?)))`).bind(id,JSON.stringify([...linkedJobs]),JSON.stringify(ownerMarkers),id,id,JSON.stringify(ownerMarkers),id,id).all<{id:string;operation_key:string}>()).results;
 const fence=query("INSERT INTO runtime_controls(name,value) SELECT 'crm_operator_import_erasure_fence',NULL WHERE (SELECT json_group_array(json_array(id,actor_id,job_id,plan_json)) FROM (SELECT id,actor_id,job_id,plan_json FROM crm_import_reviews ORDER BY id))<>?",JSON.stringify(reviews.map(review=>[review.id,review.actor_id,review.job_id,review.plan_json])));
 const notices=noticeWithdrawal(id),native=[fence,notices,...withdrawnReviews(affected,jobs.map(job=>job.id))];
 let retired:string[]=[];
 if(jobs.length){
  // The same archive invalidation used by native erasure is Kit's restore
  // checkpoint: private transfers created before withdrawal cannot be resumed.
  const capture=captureImportErasure(db),checkpoint=(await archiveErasureStatements(capture.db)).map(statement=>{const saved=capture.queries.get(statement);if(!saved)throw new Error('Untracked import privacy checkpoint.');return saved;});
  const result=await retireD1ImportCustody({values:jobs.map(job=>job.operation_key)},native,erasureContext(db,actor),checkpoint);
  retired=result.retiredJobs;
 }else return native.map(statement=>db.prepare(statement.sql).bind(...statement.params??[]));
 // Retirement closes over replayed sources and history. Withdraw their receiving
 // reviews too, using the exact closure returned by Kit rather than guessing it.
 return[notices,...withdrawnReviews(affected,retired)].map(statement=>db.prepare(statement.sql).bind(...statement.params??[]));
}
