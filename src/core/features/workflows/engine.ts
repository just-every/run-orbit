import type {ProviderFetch} from '../capture/providers/config';
import {createId} from '../../shared/ids';
import {tables} from '../records/shared';
import {guard} from '../identity/store';
import {archiveImportActive} from '../../platform/archive-maintenance';
import {owner,record,matches,currentVersion,eventById,authorityFence,activeFence} from './repository';
import {planActions,workflowContext,type PlannedAction} from './planning';
import {applyEffect} from './effects';
import {applyRecordPlan} from './record-writes';
import {type Event,type Run,type Version,type Definition} from './contracts';
export async function collectWorkflowRuns(db:D1Database,at=new Date().toISOString()){
 if(await archiveImportActive(db))return;
 const versions=(await db.prepare("SELECT * FROM workflow_versions WHERE status='active' ORDER BY CAST(json_extract(definition_json,'$.order') AS INTEGER),workflow_id").all<Version>()).results;
 for(const v of versions){const d=JSON.parse(v.definition_json) as Definition;
  if(d.trigger.kind==='schedule'){
   const day=at.slice(0,10),rows=(await db.prepare(`SELECT id FROM ${tables[d.trigger.recordType]} WHERE updated_at<=? ORDER BY id LIMIT 1000`).bind(new Date(Date.parse(at)-(d.trigger.staleDays??14)*86400000).toISOString()).all<{id:string}>()).results;
   if(rows.length)await db.batch(rows.map(row=>db.prepare("INSERT OR IGNORE INTO workflow_events VALUES(?,'schedule',?,?,?,?, '[]')").bind(`schedule:${v.workflow_id}:${v.version}:${day}:${row.id}`,d.trigger.recordType,row.id,at,'Scheduled stale check')));
  }
  const events=(await db.prepare('SELECT * FROM workflow_events e WHERE kind=? AND record_type=? AND occurred_at>=? AND NOT EXISTS(SELECT 1 FROM workflow_runs r WHERE r.workflow_id=? AND r.version=? AND r.event_id=e.id) ORDER BY occurred_at,id LIMIT 100').bind(d.trigger.kind,d.trigger.recordType,v.activated_at,v.workflow_id,v.version).all<Event>()).results;
  for(const e of events){const row=await record(db,e.record_type,e.record_id);if(!row||!matches(row,d,at))continue;const id=createId(),chain=JSON.parse(e.chain_json) as string[],loop=chain.includes(v.workflow_id)||chain.length>=5,plans=loop?[]:await planActions(db,v,e,id,at);
   const rotations=plans.flatMap((p,index)=>p.effect?.rotationCursor===undefined?[]:[{index,cursor:p.effect.rotationCursor}]);
   await db.batch([...rotations.map(r=>guard(db,{sql:'COALESCE((SELECT cursor FROM workflow_rotation WHERE workflow_id=? AND action_index=?),0)=?',args:[v.workflow_id,r.index,r.cursor]})),db.prepare("INSERT OR IGNORE INTO workflow_runs(id,workflow_id,version,event_id,record_type,record_id,owner_id,status,reason,due_at,created_at,updated_at,plan_json,chain_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(id,v.workflow_id,v.version,e.id,e.record_type,e.record_id,v.activated_by,loop?'stopped':'queued',loop?'Workflow loop stopped':null,new Date(Date.parse(e.occurred_at)+d.delayMinutes*60000).toISOString(),at,at,JSON.stringify(plans),JSON.stringify([...chain,v.workflow_id])),...rotations.map(r=>db.prepare('INSERT INTO workflow_rotation SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM workflow_runs WHERE id=?) ON CONFLICT(workflow_id,action_index) DO UPDATE SET cursor=excluded.cursor').bind(v.workflow_id,r.index,r.cursor+1,id))]);
  }
 }
}
async function stop(db:D1Database,run:Run,status:string,reason:string,at:string){await db.prepare('UPDATE workflow_runs SET status=?,reason=?,updated_at=? WHERE id=?').bind(status,reason,at,run.id).run();}
export async function dispatchWorkflowRuns(db:D1Database,options:{at?:string;fetcher?:ProviderFetch}={}){
 const at=options.at??new Date().toISOString();if(await archiveImportActive(db))return;
 await db.prepare("UPDATE workflow_approvals SET status='expired',decided_at=? WHERE status='pending' AND created_at<=?").bind(at,new Date(Date.parse(at)-7*86400000).toISOString()).run();
 const runs=(await db.prepare("SELECT * FROM workflow_runs WHERE status='queued' AND due_at<=? ORDER BY due_at,created_at,id LIMIT 100").bind(at).all<Run>()).results;
 for(const run of runs){
  const claimed=await db.prepare("UPDATE workflow_runs SET status='running',attempts=attempts+1,updated_at=? WHERE id=? AND status='queued'").bind(at,run.id).run();if(!claimed.meta.changes)continue;
  const v=await db.prepare('SELECT * FROM workflow_versions WHERE workflow_id=? AND version=?').bind(run.workflow_id,run.version).first<Version>(),e=await eventById(db,run.event_id);
  if(!v||v.status!=='active'){await stop(db,run,'stopped','version replaced',at);continue;}
  try{
   const authority=await owner(db,run.owner_id);if(authority.version!==v.authority_version)throw new Error('Authority changed; workflow needs re-activation.');
  }catch{await db.prepare("UPDATE workflow_versions SET status='needs_reactivation' WHERE workflow_id=? AND version=?").bind(v.workflow_id,v.version).run();await stop(db,run,'stopped','Revoked authority; workflow needs re-activation',at);continue;}
  const row=await record(db,run.record_type,run.record_id),d=JSON.parse(v.definition_json) as Definition;if(!row||!e){await stop(db,run,'stopped','Record or trigger was erased',at);continue;}if(!matches(row,d,at)){await stop(db,run,'stopped','condition no longer true',at);continue;}
  const plans=JSON.parse(run.plan_json) as PlannedAction[],outcomes:any[]=JSON.parse(run.outcome_json),failedRecords=new Set<string>(outcomes.filter(o=>o.skipped).map(o=>o.recordId));let held=false;
  for(const [index,p]of plans.entries()){
   const prior=await db.prepare('SELECT status,result_json FROM workflow_steps WHERE run_id=? AND ordinal=?').bind(run.id,index).first<{status:string;result_json:string|null}>();if(prior?.status==='completed')continue;
   try{
    if(p.error)throw new Error(p.error);
    if(p.writes.length){
     const writes=await db.prepare("SELECT count(*) AS n FROM workflow_record_writes WHERE workflow_id=? AND occurred_at>=?").bind(v.workflow_id,new Date(Date.parse(at)-3600000).toISOString()).first<number>('n');if((writes??0)+p.writes.length>10000){await stop(db,run,'queued','Hourly record write limit; waiting for the next window',at);held=true;break;}
    }
    await db.prepare("INSERT INTO workflow_steps(run_id,ordinal,status,attempts) VALUES(?,?,'running',1) ON CONFLICT(run_id,ordinal) DO UPDATE SET attempts=attempts+1 WHERE status<>'submitting'").bind(run.id,index).run();
    const results:unknown[]=[];
    for(const w of p.writes){
     if(failedRecords.has(w.recordId)){results.push({skipped:true,recordId:w.recordId,reason:'Earlier action failed on this record'});continue;}
     try {
     if(w.error||w.reason)throw new Error(w.error??w.reason);
     if(w.needsApproval){
      const approval=await db.prepare('SELECT status FROM workflow_approvals WHERE id=?').bind(w.id).first<string>('status');
      if(approval==='accepted')continue;if(approval==='declined'||approval==='expired')throw new Error(`Approval ${approval}`);
      const target=await record(db,w.recordType,w.recordId);const targetOwner=w.recordType==='opportunity'?target?.owner_id:await db.prepare('SELECT owner_id FROM record_ownership WHERE record_type=? AND record_id=?').bind(w.recordType,w.recordId).first<string>('owner_id');const approver=targetOwner??run.owner_id;
      await db.prepare("INSERT OR IGNORE INTO workflow_approvals(id,run_id,record_id,approver_id,plan_json,created_at) VALUES(?,?,?,?,?,?)").bind(w.id,run.id,w.recordId,approver,JSON.stringify(w),at).run();held=true;continue;
     }
     const ctx=workflowContext(db,v,e,run.id,at,index);ctx.writeFences=[authorityFence(db,run.owner_id,v.authority_version!),activeFence(db,v),db.prepare("INSERT INTO runtime_controls(name,value) VALUES('workflow_chain',?) ON CONFLICT(name) DO UPDATE SET value=excluded.value").bind(run.chain_json)];ctx.afterWriteStatements=[db.prepare("DELETE FROM runtime_controls WHERE name='workflow_chain'")];results.push(await applyRecordPlan(ctx,w));
     }catch(error){const failure={skipped:true,recordId:w.recordId,reason:(error as Error).message};failedRecords.add(w.recordId);results.push(failure);outcomes.push(failure);}
    }
    if(held){await stop(db,run,'needs_approval','Per-record approval required',at);break;}
    if(p.effect&&!p.writes.length&&!failedRecords.has(run.record_id)){if(prior?.result_json){const result=JSON.parse(prior.result_json);if(result.batchId)p.effect.batchId=result.batchId;}results.push(await applyEffect(db,v,run,p.effect,index,at,options.fetcher??fetch));}
    await db.prepare("UPDATE workflow_steps SET status='completed',result_json=? WHERE run_id=? AND ordinal=?").bind(JSON.stringify(results),run.id,index).run();outcomes.push({action:index,results});await db.prepare('UPDATE workflow_runs SET outcome_json=? WHERE id=?').bind(JSON.stringify(outcomes),run.id).run();
   }catch(error){await stop(db,run,run.attempts>=2?'dead_letter':'failed',(error as Error).message,at);held=true;break;}
  }
  if(!held)await stop(db,run,'completed',failedRecords.size?'Completed with skipped records; inspect action outcomes':'Completed',at);
 }
}
export async function processWorkflows(db:D1Database,options:{at?:string;fetcher?:ProviderFetch}={}){await collectWorkflowRuns(db,options.at);await dispatchWorkflowRuns(db,options);}
