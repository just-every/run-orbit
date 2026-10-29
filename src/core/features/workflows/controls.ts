import {guard,clearGuards} from '../identity/store';
import {WorkflowError,type Version} from './contracts';
import {owner,runById,eventById,workflowAudit,authorityFence} from './repository';
import {workflowContext} from './planning';
import {undoRecordWrite} from './record-writes';
export async function undoWorkflowRun(db:D1Database,actor:string,id:string,at:string){
 const authority=await owner(db,actor),r=await runById(db,id);if(r.status==='undone')return {runId:r.id,results:JSON.parse(r.outcome_json)};
 if(['running','queued'].includes(r.status))throw new WorkflowError(409,'Stop or finish this run before undoing it.');
 const v=await db.prepare('SELECT * FROM workflow_versions WHERE workflow_id=? AND version=?').bind(r.workflow_id,r.version).first<Version>(),e=await eventById(db,r.event_id);if(!v||!e)throw new WorkflowError(409,'Run evidence is unavailable.');
 // Close the approval door before taking the set of writes to reverse.
 await db.batch([authorityFence(db,actor,authority.version),guard(db,{sql:"EXISTS(SELECT 1 FROM workflow_runs WHERE id=? AND status NOT IN('running','queued','undone'))",args:[r.id]}),db.prepare("UPDATE workflow_runs SET status='stopped',reason='Undo in progress',updated_at=? WHERE id=?").bind(at,r.id),db.prepare("UPDATE workflow_approvals SET status='expired',decided_at=?,decided_by=? WHERE run_id=? AND status='pending'").bind(at,actor,r.id),clearGuards(db)]);
 const writes=(await db.prepare("SELECT id FROM workflow_record_writes WHERE run_id=? AND id NOT LIKE '%:undo' ORDER BY occurred_at DESC,rowid DESC").bind(r.id).all<{id:string}>()).results,results=[];
 for(const w of writes){const ctx=workflowContext(db,v,e,r.id,at,0);ctx.actorId=actor;ctx.writeFences=[authorityFence(db,actor,authority.version),db.prepare("INSERT INTO runtime_controls(name,value) VALUES('workflow_suppressed','undo') ON CONFLICT(name) DO UPDATE SET value=excluded.value")];ctx.afterWriteStatements=[db.prepare("DELETE FROM runtime_controls WHERE name='workflow_suppressed'")];results.push(await undoRecordWrite(ctx,w.id));}
 await db.batch([authorityFence(db,actor,authority.version),workflowAudit(db,actor,'undone',r.workflow_id,{runId:r.id,results},at),db.prepare("UPDATE workflow_runs SET status='undone',reason='Undo inspected every recorded write',outcome_json=? WHERE id=?").bind(JSON.stringify(results),r.id)]);
 return {runId:r.id,results};
}
export async function undoWorkflowVersion(db:D1Database,actor:string,id:string,input:{version:number;from:string;to:string},at:string){
 await owner(db,actor);if(Date.parse(input.from)>Date.parse(input.to))throw new WorkflowError(400,'The end of the range must follow its start.');
 const runs=(await db.prepare("SELECT id FROM workflow_runs WHERE workflow_id=? AND version=? AND created_at>=? AND created_at<=? AND status NOT IN('running','queued') ORDER BY created_at DESC,id DESC LIMIT 1001").bind(id,input.version,input.from,input.to).all<{id:string}>()).results;
 if(runs.length>1000)throw new WorkflowError(400,'Choose a smaller undo range containing at most 1,000 runs.');
 const results=[];for(const r of runs)results.push(await undoWorkflowRun(db,actor,r.id,at));return {runs:results};
}
