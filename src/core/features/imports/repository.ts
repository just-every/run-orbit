import {importOwnerNotice} from './owner-notices';
import { createD1ImportJob,applyD1ImportBatches,readD1ImportJob,undoD1Import,rollbackD1Import,readD1ImportUndoReport,type D1ImportContext,type ImportPlan } from '../../../modules/import-kit/d1/index';
import type { AuthenticatedOperator } from '../identity';
import { createId } from '../../shared/ids';
import { RecordError } from '../records/shared';
import { prepareImport } from './planner';
import { targets,sql } from './targets';
import { prepareUndo } from './undo';
import {reviewStatements,reviewPlan} from './reviews';
import {importOwnerSummary} from './owners';
import {contactReviewLabels} from './review-labels';
import type { ImportInput } from './contracts';
export const importAuthority=(actor:AuthenticatedOperator)=>sql("EXISTS(SELECT 1 FROM sessions s JOIN operators o ON o.id=s.operator_id JOIN access_memberships m ON m.operator_id=o.id WHERE s.id=? AND s.operator_id=? AND s.revoked_at IS NULL AND s.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now') AND o.status='active' AND m.workspace_id='workspace' AND m.status='active' AND m.role='legacy_operator' AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=o.id)) AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import'))",actor.sessionId,actor.operatorId);
export class ImportRepository {
 constructor(readonly db:D1Database,readonly actor:AuthenticatedOperator){}
 context(namespace:string,review?:{id:string;fingerprint:string}):D1ImportContext{return{destination:'workspace',namespace,mappingVersion:'orbit-csv-v1',batchSize:10,maxBatches:1,reversalPolicy:'preserve-conflicts',storage:{database:this.db,targets:{...targets,preparePreservedUndo:prepareUndo}},authorization:{principalId:this.actor.operatorId,predicate:(_action,destination)=>{if(destination!=='workspace')return sql('0');const p=importAuthority(this.actor);return review?sql(`(${p.sql}) AND EXISTS(SELECT 1 FROM crm_import_reviews WHERE id=? AND actor_id=? AND fingerprint=? AND plan_json<>'null')`,...p.params!,review.id,this.actor.operatorId,review.fingerprint):p;}}};}
 async authorized(){const p=importAuthority(this.actor);if(!(await this.db.prepare(`SELECT (${p.sql}) AS ok`).bind(...p.params!).first<{ok:number}>())?.ok)throw new RecordError(403,'A current full native operator session is required.');}
 async dryRun(input:ImportInput){await this.authorized();const plan=await prepareImport(input,this.context(`orbit:${input.vendor}:${input.account}`)),id=createId(),p=importAuthority(this.actor);
 await this.db.batch(reviewStatements(this.db,id,this.actor.operatorId,plan,p));return{id,...summary(plan)};
 }
 async review(id:string){await this.authorized();const row=await this.db.prepare('SELECT * FROM crm_import_reviews WHERE id=? AND actor_id=?').bind(id,this.actor.operatorId).first<{id:string;namespace:string;fingerprint:string;plan_json:string;job_id:string|null;safety_pending:number}>();if(!row)throw new RecordError(404,'Import review not found for this operator.');return {...row,plan_json:await reviewPlan(this.db,id,row.plan_json)};}
 async list(){await this.authorized();return(await this.db.prepare('SELECT r.id,r.namespace,r.created_at,r.safety_pending,j.state,j.error FROM crm_import_reviews r LEFT JOIN ik_jobs j ON j.id=r.job_id WHERE r.actor_id=? ORDER BY r.created_at DESC LIMIT 50').bind(this.actor.operatorId).all()).results;}
 async undoReport(id:string,context:D1ImportContext){const dispositions=[];let offset=0;for(;;){const page=await readD1ImportUndoReport(id,context,{offset,limit:1000});dispositions.push(...page.dispositions.map(d=>({targetKind:d.targetKind,targetId:d.targetId,disposition:d.disposition,reason:d.reason})));if(page.nextOffset===null)break;offset=page.nextOffset;}return{dispositions};}
 async status(id:string){const row=await this.review(id),context=this.context(row.namespace);return{id,...row.plan_json==='null'?{sourceWithdrawn:true}:summary(JSON.parse(row.plan_json)),job:row.job_id?await readD1ImportJob(row.job_id,context):null,undo:row.job_id?await this.undoReport(row.job_id,context):null};}
 async apply(id:string,fingerprint:string){let review=await this.review(id);if(review.plan_json==='null')throw new RecordError(409,'Source review withdrawn after privacy erasure. Start a new import from current source data.');if(review.fingerprint!==fingerprint)throw new RecordError(409,'The dry run changed. Review it again.');const context=this.context(review.namespace,{id,fingerprint}),plan=JSON.parse(review.plan_json) as ImportPlan;
 if(plan.entries.some(e=>e.source.kind==='suppression'&&e.rejection))throw new RecordError(409,'Resolve all rejected suppression rows before applying any records.');
 if(!review.job_id){const p=importAuthority(this.actor);await this.db.prepare(`UPDATE crm_import_reviews SET safety_pending=1 WHERE id=? AND actor_id=? AND ${p.sql}`).bind(id,this.actor.operatorId,...p.params!).run();const job=await createD1ImportJob(plan,{...context,reviewedFingerprint:fingerprint,operationKey:id});await this.db.prepare(`UPDATE crm_import_reviews SET job_id=? WHERE id=? AND actor_id=? AND ${p.sql}`).bind(job.id,id,this.actor.operatorId,...p.params!).run();review=await this.review(id);}
 let job=await readD1ImportJob(review.job_id!,context);
 if(job.checkpoint===0)job=await applyD1ImportBatches(job.id,{...context,batchSize:1});
 // The first entry is the whole suppression set, committed atomically. Contact and send fences stay shut on failure.
 if(job.checkpoint>0){const p=importAuthority(this.actor);await this.db.prepare(`UPDATE crm_import_reviews SET safety_pending=0 WHERE id=? AND job_id=? AND EXISTS(SELECT 1 FROM ik_jobs WHERE id=? AND checkpoint>0) AND ${p.sql}`).bind(id,job.id,job.id,...p.params!).run();}
 if(job.state==='applying'||job.state==='queued'||job.state==='failed')job=await applyD1ImportBatches(job.id,context);
 if(job.state==='completed')await this.db.batch([importOwnerNotice(this.db,job.id,this.actor.operatorId,importAuthority(this.actor))]);
 return {id,job};
 }
 async undo(id:string){const row=await this.review(id),context=this.context(row.namespace);if(!row.job_id){const p=importAuthority(this.actor);await this.db.prepare(`DELETE FROM crm_import_reviews WHERE id=? AND actor_id=? AND ${p.sql}`).bind(id,this.actor.operatorId,...p.params!).run();return {id,job:null};}
 const current=await readD1ImportJob(row.job_id,context),job=await (['completed','undoing','undone'].includes(current.state)?undoD1Import:rollbackD1Import)(row.job_id,context);
 if(['undone','rolled_back'].includes(job.state)){const p=importAuthority(this.actor);await this.db.prepare(`UPDATE crm_import_reviews SET safety_pending=0 WHERE id=? AND ${p.sql}`).bind(id,...p.params!).run();}
 return{id,job,undo:await this.undoReport(row.job_id,context)};
 }
}
export function summary(plan:ImportPlan){const contactLabel=contactReviewLabels(plan);return{fingerprint:plan.fingerprint,owners:importOwnerSummary(plan),counts:{...plan.counts,input:plan.counts.input-1-plan.entries.filter(e=>e.source.kind.endsWith('-owner')).length},rows:plan.entries.filter(e=>e.source.kind!=='safety'&&!e.source.kind.endsWith('-owner')).map(e=>{const reference=e.effects.find(effect=>effect.targetKind==='reference'),record=(reference?.value as any)?.row,company=e.effects.find(effect=>effect.targetKind==='company'),displayName=contactLabel(e.source)??(e.source.kind==='company'&&e.source.sourceId.startsWith('company-name:')?(company?.value as any)?.row?.name:undefined);const owner=plan.entries.find(item=>item.source.kind===`${e.source.kind}-owner`&&item.source.sourceId===e.source.sourceId)?.effects[0],ownerChange=(owner?.value as any)?.history;return{...ownerChange?{ownerChange}:{},kind:e.source.kind,sourceId:e.source.sourceId,...displayName?{displayName}:{},location:e.source.location,status:e.rejection?'rejected':reference&&record?.record_kind!=='suppression'?'linked':e.effects.length?'ready':'linked',reason:e.rejection??e.unmapped.map(m=>m.reason).join(' '),...record&&['contact','company','deal'].includes(record.record_kind)?{recordKind:record.record_kind==='deal'?'opportunity':record.record_kind,recordId:record.record_id}:{}};}),diagnostics:plan.diagnostics,suppressed:(plan.entries[0].source.payload as any).emails.length};}
