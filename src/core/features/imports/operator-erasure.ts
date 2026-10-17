import {eraseD1ImportTarget,canonicalJson,sha256,type D1Sql,type ImportPlan,type SourceRecord} from '../../../modules/import-kit/d1/index';
import {erasureContext} from './erasure';
import {reviewPlan} from './reviews';
import {sql} from './targets';
import {containsMailbox} from './review-erasure';
import {redactImportedNativeCopies} from './native-erasure';

/** Withdraw only custody that explicitly maps to this operator. The stable
 * operator identity remains; its precise anonymized projection is the absence
 * condition, committed with the caller's native erasure and archive fences. */
export async function eraseImportedOperator(db:D1Database,actor:string,id:string,nativeStatements:D1Sql[],sessionId?:string){
 const subject='operator-privacy',context=erasureContext(db,actor,sessionId),email=(await db.prepare('SELECT email FROM operators WHERE id=?').bind(id).first<{email:string}>())?.email;
 const erasedEmail=`erased-${id.toLowerCase()}@example.invalid`,matches=(record:SourceRecord)=>(record.payload as any)?.ownerMapping?.ownerId===id||(email?containsMailbox(JSON.stringify(record.payload),[email]):false);
 const reviews=(await db.prepare('SELECT id,plan_json FROM crm_import_reviews ORDER BY id').all<{id:string;plan_json:string}>()).results,affected:string[]=[];
 for(const review of reviews){if(review.plan_json==='null')continue;const plan=JSON.parse(await reviewPlan(db,review.id,review.plan_json)) as ImportPlan;
  if(plan.entries.some(entry=>matches(entry.source)))affected.push(review.id);
 }
 const markers=(await db.prepare("SELECT id,original_json FROM crm_import_targets WHERE kind='note' ORDER BY id").all<{id:string;original_json:string}>()).results;
 const historical=markers.filter(marker=>{const row=JSON.parse(marker.original_json).row;if(row.kind!=='owner.changed')return false;const payload=JSON.parse(row.payload_json);return payload.ownerId===id||payload.previousOwnerId===id;}).map(marker=>marker.id);
 const statements=[...email?await redactImportedNativeCopies(db,`operator:${id}`,[email],id):[],...nativeStatements,
  sql("INSERT INTO runtime_controls(name,value) SELECT 'crm_operator_review_fence',NULL WHERE (SELECT json_group_array(json_array(id,plan_json)) FROM (SELECT id,plan_json FROM crm_import_reviews ORDER BY id))<>?",JSON.stringify(reviews.map(review=>[review.id,review.plan_json]))),
  sql('DELETE FROM crm_import_review_chunks WHERE review_id IN(SELECT value FROM json_each(?))',JSON.stringify(affected)),sql("UPDATE crm_import_reviews SET plan_json='null',fingerprint='',safety_pending=0 WHERE id IN(SELECT value FROM json_each(?))",JSON.stringify(affected)),
  sql("INSERT INTO runtime_controls(name,value) SELECT 'crm_operator_history_fence',NULL WHERE (SELECT json_group_array(json_array(id,original_json)) FROM (SELECT id,original_json FROM crm_import_targets WHERE kind='note' ORDER BY id))<>?",JSON.stringify(markers.map(marker=>[marker.id,marker.original_json]))),
  sql("DELETE FROM crm_import_targets WHERE kind='note' AND id IN(SELECT value FROM json_each(?))",JSON.stringify(historical))];
 const targets=context.storage.targets;
 context.storage.targets={...targets,async read(database,destination,kind,targetId){if(kind!==subject)return targets.read(database,destination,kind,targetId);
  const row=await database.prepare('SELECT id,email,display_name,status FROM operators WHERE id=?').bind(targetId).first();
  if(!row||(row.status==='removed'&&row.email===erasedEmail&&row.display_name==='Erased operator'))return undefined;
  return {destination,targetKind:kind,targetId,value:row,revision:sha256(canonicalJson(row))};
 },matches(row,destination,kind,targetId){if(kind!==subject)return targets.matches(row,destination,kind,targetId);
  if(!row)return sql("EXISTS(SELECT 1 FROM operators WHERE id=? AND status='removed' AND email=? AND display_name='Erased operator')",targetId,erasedEmail);
  const value=row.value as any;return sql('EXISTS(SELECT 1 FROM operators WHERE id=? AND email=? AND display_name=? AND status=?)',targetId,value.email,value.display_name,value.status);
 }};
 return eraseD1ImportTarget(subject,id,statements,context,{source:matches,original:bytes=>email?containsMailbox(Buffer.from(bytes).toString('utf8'),[email]):false});
}
