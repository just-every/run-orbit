import assert from 'node:assert/strict';
import type {CaptureFixture} from './capture-fixture';
import {isolatedDatabase} from './isolated-database';
import {localArchiveRoundTrip} from './capture-privacy-archive';

/** The local CLI's real transfer engine must strip approval just like Records HTTP. */
export async function proveLocalSalesArchive(source:CaptureFixture){
 const target=await isolatedDatabase();
 try{
  const messages=async(db:D1Database)=>(await db.prepare('SELECT * FROM outbound_messages ORDER BY id').all<Record<string,unknown>>()).results;
  const before=await messages(source.db);assert.ok(before.some(row=>row.state==='scheduled'));
  const workflows=async(db:D1Database)=>({
   versions:(await db.prepare('SELECT * FROM workflow_versions ORDER BY workflow_id,version').all<Record<string,unknown>>()).results,
   runs:(await db.prepare('SELECT * FROM workflow_runs ORDER BY id').all<Record<string,unknown>>()).results,
   approvals:(await db.prepare('SELECT * FROM workflow_approvals ORDER BY id').all<Record<string,unknown>>()).results,
   writes:(await db.prepare('SELECT * FROM workflow_record_writes ORDER BY id').all<Record<string,unknown>>()).results
  });
  const workflowBefore=await workflows(source.db);
  await localArchiveRoundTrip(source.db,target.db);
  const after=await messages(target.db);assert.equal(after.length,before.length);
  for(const row of before){const restored=after.find(candidate=>candidate.id===row.id);assert.ok(restored);if(row.state==='scheduled'){assert.equal(restored.state,'cancelled');assert.ok(String(restored.failure).includes('review'));assert.deepEqual(restored,{...row,state:'cancelled',failure:restored.failure});}else assert.deepEqual(restored,row);}
  assert.deepEqual(await messages(source.db),before,'export leaves the source installation approval unchanged');
  const workflowAfter=await workflows(target.db);
  assert.equal(workflowAfter.versions.length,workflowBefore.versions.length);
  for(const row of workflowBefore.versions){const restored=workflowAfter.versions.find(candidate=>candidate.workflow_id===row.workflow_id&&candidate.version===row.version);assert.ok(restored);assert.deepEqual(restored,{...row,status:row.status==='active'||row.status==='needs_reactivation'?'paused':row.status,preview_id:null,preview_json:null});}
  assert.equal(workflowAfter.runs.length,workflowBefore.runs.length);
  for(const row of workflowBefore.runs){const restored=workflowAfter.runs.find(candidate=>candidate.id===row.id);assert.ok(restored);assert.deepEqual(restored,{...row,status:row.status==='completed'||row.status==='undone'?row.status:'stopped',reason:row.status==='completed'||row.status==='undone'?row.reason:restored.reason});if(!['completed','undone'].includes(String(row.status))){assert.equal(typeof restored.reason,'string');assert.notEqual(restored.reason,row.reason,'restored pending runs receive a fresh stop reason');}}
  assert.equal(workflowAfter.approvals.length,workflowBefore.approvals.length);
  for(const row of workflowBefore.approvals){const restored=workflowAfter.approvals.find(candidate=>candidate.id===row.id);assert.ok(restored);assert.deepEqual(restored,{...row,status:row.status==='pending'?'expired':row.status});}
  assert.deepEqual(workflowAfter.writes,workflowBefore.writes,'workflow write receipts retain source fields, values and versions');
  assert.deepEqual(await workflows(source.db),workflowBefore,'local export leaves source workflow authority and history unchanged');
  for(const table of ['sessions','access_grants','access_invitations','access_form_authorities','delegation_grants','delegation_codes','capture_credentials'])assert.equal(Number(await target.db.prepare(`SELECT count(*) n FROM ${table}`).first('n')),0,`${table} authority never travels through the local CLI`);
 }finally{await target.dispose();}
}
