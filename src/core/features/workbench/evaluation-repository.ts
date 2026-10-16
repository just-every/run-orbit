import { createId } from '../../shared/ids';
import { weights, scoringPolicy } from './policies';
import {customerSignalSql} from '../signals/test-events';

/** SQL reads all committed evidence within the caller's D1 transaction. */
export function evaluationStatements(db: D1Database, opportunityId: string, actor: string, reason: string, now = new Date()) {
  const at = now.toISOString(), evaluation = createId(), recommendation = createId();
  const open = `EXISTS(SELECT 1 FROM opportunities WHERE id=? AND lifecycle='open')`;
  const weight = 'CASE s.type ' + Object.entries(weights).map(([type,value])=>`WHEN '${type}' THEN ${value}`).join(' ')+' ELSE 0 END';
  const contribution = `CAST(ROUND((${weight})*MAX(0,1-MAX(0,julianday('${at}')-julianday(s.occurred_at))/30)) AS INTEGER)`;
  const completionGuard=reason.startsWith('Action ')?` AND NOT EXISTS(SELECT 1 FROM recommendations old WHERE old.opportunity_id='${opportunityId.replaceAll("'","''")}' AND old.completed_at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM recommendation_evidence prior WHERE prior.recommendation_id=old.id AND NOT EXISTS(SELECT 1 FROM evaluation_contributions c JOIN signals s ON s.id=c.signal_id WHERE c.evaluation_id='${evaluation}' AND s.confidence='observed' AND s.id=prior.signal_id)) AND NOT EXISTS(SELECT 1 FROM evaluation_contributions c JOIN signals s ON s.id=c.signal_id WHERE c.evaluation_id='${evaluation}' AND s.confidence='observed' AND NOT EXISTS(SELECT 1 FROM recommendation_evidence prior WHERE prior.recommendation_id=old.id AND prior.signal_id=s.id)))`:'';

  return [
    db.prepare(`UPDATE evaluations SET status='stale' WHERE opportunity_id=? AND status='current' AND ${open}`).bind(opportunityId,opportunityId),
    db.prepare(`INSERT INTO evaluations(id,opportunity_id,score,band,evaluated_at,policy_version,status,created_at) SELECT ?,?,0,'low',?,?,'current',? WHERE ${open}`).bind(evaluation,opportunityId,at,scoringPolicy,at,opportunityId),
    db.prepare(`INSERT INTO evaluation_contributions(id,evaluation_id,signal_id,contribution,created_at) SELECT ?||':'||s.id,?,s.id,${contribution},? FROM signals s JOIN signal_links l ON l.signal_id=s.id WHERE l.record_type='opportunity' AND l.record_id=? AND ${customerSignalSql()} AND (${contribution})<>0 AND ${open}`).bind(evaluation,evaluation,at,opportunityId,opportunityId),
    db.prepare(`UPDATE evaluations SET score=MAX(0,MIN(CASE WHEN EXISTS(SELECT 1 FROM evaluation_contributions c JOIN signals s ON s.id=c.signal_id WHERE c.evaluation_id=? AND s.confidence='observed') THEN 100 ELSE 69 END,COALESCE((SELECT SUM(contribution) FROM evaluation_contributions WHERE evaluation_id=?),0))) WHERE id=?`).bind(evaluation,evaluation,evaluation),
    db.prepare("UPDATE evaluations SET band=CASE WHEN score>=70 THEN 'high' WHEN score>=40 THEN 'medium' ELSE 'low' END WHERE id=?").bind(evaluation),
    db.prepare(`INSERT INTO timeline_entries(id,kind,occurred_at,recorded_at,actor_type,actor_id,source,payload_json) SELECT ?||':'||id,'recommendation.superseded',?,?,'feature',?,'recommendations',json_object('recommendationId',id,'actionType',action_type,'explanation',explanation,'reason',?) FROM recommendations WHERE opportunity_id=? AND is_current=1 AND ${open}`).bind(evaluation,at,at,actor,reason,opportunityId,opportunityId),
    db.prepare(`INSERT INTO timeline_entry_records(timeline_entry_id,record_type,record_id) SELECT ?||':'||id,'opportunity',? FROM recommendations WHERE opportunity_id=? AND is_current=1 AND ${open}`).bind(evaluation,opportunityId,opportunityId,opportunityId),
    db.prepare(`UPDATE recommendations SET is_current=0,superseded_at=?,updated_at=? WHERE opportunity_id=? AND is_current=1 AND ${open}`).bind(at,at,opportunityId,opportunityId),
    db.prepare(`UPDATE drafts SET is_stale=1,stale_reason=?,updated_at=? WHERE opportunity_id=? AND ${open}`).bind(reason,at,opportunityId,opportunityId),
    db.prepare(`UPDATE opportunities SET queue_state='now',queue_reason=CASE WHEN queue_state='now' AND queue_reason IN ('Customer reply','Delivery problem') THEN queue_reason ELSE 'Priority band rose' END,next_due_at=NULL,updated_at=? WHERE id=? AND lifecycle='open' AND (CASE band WHEN 'low' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END)<(SELECT CASE band WHEN 'low' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END FROM evaluations WHERE id=?)`).bind(at,opportunityId,evaluation),
    db.prepare(`UPDATE opportunities SET score=(SELECT score FROM evaluations WHERE id=?),band=(SELECT band FROM evaluations WHERE id=?),last_contributing_signal_at=(SELECT MAX(s.occurred_at) FROM signals s JOIN evaluation_contributions c ON c.signal_id=s.id WHERE c.evaluation_id=?),updated_at=? WHERE id=? AND lifecycle='open'`).bind(evaluation,evaluation,evaluation,at,opportunityId),
    db.prepare(`INSERT INTO recommendations(id,opportunity_id,action_type,explanation,policy_version,is_current,created_at,updated_at) SELECT ?,?,'manual_action',NULL,'opportunity.next-action.v1',1,?,? WHERE EXISTS(SELECT 1 FROM evaluation_contributions c JOIN signals s ON s.id=c.signal_id WHERE c.evaluation_id=? AND s.confidence='observed')${completionGuard}`).bind(recommendation,opportunityId,at,at,evaluation),
    db.prepare(`INSERT INTO recommendation_evidence(recommendation_id,signal_id) SELECT ?,s.id FROM signals s JOIN evaluation_contributions c ON c.signal_id=s.id WHERE c.evaluation_id=? AND s.confidence='observed' AND EXISTS(SELECT 1 FROM recommendations WHERE id=?)`).bind(recommendation,evaluation,recommendation),
    db.prepare(`INSERT INTO timeline_entries(id,kind,occurred_at,recorded_at,actor_type,actor_id,source,payload_json) SELECT ?,'opportunity.evaluated',?,?,'feature',?,'scoring',? WHERE ${open}`).bind(evaluation,at,at,actor,JSON.stringify({evaluationId:evaluation,policy:scoringPolicy,reason}),opportunityId),
    db.prepare(`INSERT INTO timeline_entry_records(timeline_entry_id,record_type,record_id) SELECT ?,'opportunity',? WHERE ${open}`).bind(evaluation,opportunityId,opportunityId),
  ];
}

export async function evaluateOpportunity(db:D1Database,id:string,actor:string,reason:string,now=new Date()) {
  try { await db.batch(evaluationStatements(db,id,actor,reason,now)); }
  catch(error) {
    await db.prepare("UPDATE evaluations SET failure_at=? WHERE opportunity_id=? AND status='current'").bind(now.toISOString(),id).run();
    throw error;
  }
}

export async function processEvaluationJobs(db:D1Database,limit=100) {
  const jobs=await db.prepare('SELECT opportunity_id,actor_id,reason,requested_at FROM record_mutation_jobs ORDER BY requested_at LIMIT ?').bind(limit).all<{opportunity_id:string;actor_id:string;reason:string;requested_at:string}>();
  for(const job of jobs.results){
    try{await db.batch([db.prepare('INSERT INTO evaluation_job_runs(opportunity_id,requested_at) VALUES(?,?)').bind(job.opportunity_id,job.requested_at),...evaluationStatements(db,job.opportunity_id,job.actor_id,job.reason),db.prepare('DELETE FROM record_mutation_jobs WHERE opportunity_id=? AND requested_at=?').bind(job.opportunity_id,job.requested_at)]);}
    catch(error){
      const processed=await db.prepare('SELECT 1 FROM evaluation_job_runs WHERE opportunity_id=? AND requested_at=?').bind(job.opportunity_id,job.requested_at).first();
      if(processed)continue;
      await db.prepare("UPDATE evaluations SET failure_at=? WHERE opportunity_id=? AND status='current'").bind(new Date().toISOString(),job.opportunity_id).run();throw error;
    }
  }
}
