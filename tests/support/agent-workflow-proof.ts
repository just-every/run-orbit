import assert from 'node:assert/strict';
import {createApp} from '../../src/core/app/app';
import {operatorFromRequest,requireStepUp} from '../../src/core/features/identity';
import {autonomousPolicy,heldPolicy} from '../../src/base/modules/agent-door/conformance/crypto.mjs';
import type {RejectedReportProofContext} from './agent-door-proof';

/** The authenticated transport saves an inert draft over a real active version. */
export async function agentWorkflowProof({bindings,door,cookie,ownerId,sourceId,adopt,businessCall,reviewerEmail}:RejectedReportProofContext){
 const db=bindings.DB,origin=bindings.AUTH_ORIGIN!,providerCalls:string[]=[];
 const app=createApp({database:db,assets:bindings.ASSETS,authenticate:request=>operatorFromRequest(request,bindings),
  stepUp:(request,action,returnTo)=>requireStepUp(request,bindings,action,returnTo),
  captureFetch:async input=>{providerCalls.push(String(input));throw new Error('Unexpected workflow provider effect');}});
 const native=async(path:string,body?:object,method=body?'POST':'GET')=>{
  const response=await app.request(origin+path,{method,headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  assert.equal(response.status,200,await response.clone().text());return response.json() as Promise<any>;
 };
 const original=(await native('/api/v1/records/opportunity/'+sourceId)).record;
 const definition={trigger:{kind:'record_changed',recordType:'opportunity'},conditions:[{field:'id',operator:'equals',value:sourceId}],
  actions:[{kind:'set',field:'title',value:'synthetic-orbit-old-definition'}],delayMinutes:0,order:0,writeLimitPerHour:10000};
 const created=await native('/api/workflows',{name:'synthetic-orbit-running-fixture',definition}),id=created.workflow.id;
 const preview=await native('/api/workflows/'+id+'/preview',{});
 await native('/api/workflows/'+id+'/activate',{previewId:preview.previewId});
 const active=()=>db.prepare("SELECT * FROM workflow_versions WHERE workflow_id=? AND status='active'").bind(id).first();
 const activeBefore=await active();assert.ok(activeBefore);
 const authority=async()=>Promise.all(['operators','access_memberships','access_grants'].map(async table=>(await db.prepare('SELECT * FROM '+table).all()).results));
 const authorityBefore=await authority();
 const effects=async()=>Object.fromEntries(await Promise.all([
  'workflow_runs','workflow_steps','workflow_events','workflow_approvals','workflow_record_writes',
  'opportunities','contacts','companies','sales_tasks','notifications','outbound_messages','record_mail_outbound_messages',
 ].map(async table=>[table,(await db.prepare('SELECT * FROM '+table).all()).results.map(row=>JSON.stringify(row)).sort()])));
 const beforeEffects=await effects();assert.ok(beforeEffects.opportunities!.length);
 const versions=()=>db.prepare('SELECT count(*) n FROM workflow_versions WHERE workflow_id=?').bind(id).first<number>('n');
 const agent={sub:'synthetic-orbit-workflow-agent',name:'Workflow helper'};
 let rpc=180;
 const call=(args:Record<string,unknown>,overrides:Record<string,unknown>={})=>businessCall('orbit.workflows.save_draft',args,{act:agent,...overrides},'tools/call',++rpc);
 const draftDefinition={...definition,actions:[{kind:'set',field:'title',value:'synthetic-orbit-draft-only'},
  {kind:'create_task',title:'synthetic-orbit-draft-task',operatorIds:[ownerId]},
  {kind:'webhook',url:'https://hooks.example.com/orbit',body:'synthetic-orbit-draft-webhook'}]};
 let accepted:any,acceptedArgs:Record<string,unknown>={};
 for(const mode of ['autonomous','held'] as const){
  await adopt(mode==='held'?heldPolicy():autonomousPolicy());
  const source=(await native('/api/workflows')).workflows.find((w:any)=>w.id===id);
  const args={id,source_version:source.version,expected_revision:source.version,name:'synthetic-orbit-saved-'+mode,definition:draftDefinition,idempotency_key:'synthetic-orbit-workflow-'+mode};
  const count=await versions(),response=await call(args),result=response.body.result;
  assert.equal(response.status,200);assert.equal(result?.isError,false,JSON.stringify(response.body));
  assert.equal(result.resultType,'complete');
  const decision=result._meta['com.runeditrun/decision'];
  assert.equal(decision.disposition,mode==='held'?'review':'autonomous');
  assert.deepEqual(decision.classes.map(({class:cls,facts}:any)=>({class:cls,facts})),[{class:'standard',facts:{measure:1}}]);
  assert.equal(result.structuredContent.workflow.version,source.version+1);
  assert.equal(result.structuredContent.workflow.status,'draft');
  assert.deepEqual(result.structuredContent.workflow.definition,draftDefinition);
  const saved=(await native('/api/workflows')).workflows.find((w:any)=>w.id===id);
  assert.deepEqual(saved.definition,draftDefinition);assert.equal(saved.version,source.version+1);assert.equal(saved.activeVersion,1);assert.equal(saved.status,'draft');
  assert.equal(await versions(),count!+1);
  assert.deepEqual(await active(),activeBefore);assert.deepEqual(await authority(),authorityBefore);
  assert.deepEqual(await effects(),beforeEffects,'saving has no run, record, task, notification or outbound effect');
  assert.deepEqual(providerCalls,[]);
  const replay=await call(args);
  assert.equal(replay.body.id,rpc);assert.notEqual(replay.body.id,response.body.id);
  assert.deepEqual(replay.body.result.structuredContent,result.structuredContent);
  assert.equal(await versions(),count!+1,'new RPC identity with the same key saves no extra version');
  const audit=await db.prepare('SELECT row FROM agent_door_audit WHERE id=?').bind(decision.id).first<{row:string}>();assert.ok(audit);
  const recorded=JSON.parse(audit.row);assert.deepEqual(recorded.resource,{kind:'workflow',id});assert.equal(recorded.outcome,'done');
  if(mode==='held'){
   const review=result._meta['com.runeditrun/review'];assert.ok(review?.id);assert.equal(recorded.review.id,review.id);
   const response=await door.handle(new Request(origin+'/agents/api/reviews',{headers:{Cookie:cookie}}));assert.equal(response!.status,200);
   const item=(await response!.json() as any).reviews.find((r:any)=>r.id===review.id);
   assert.equal(item.tool,'orbit.workflows.save_draft');assert.equal(item.state,'open');
   assert.equal(item.decision_id,decision.id);assert.equal(item.summary.target.id,id);
   assert.ok(item.summary.items.includes(JSON.stringify(draftDefinition)));
  }
  const stale=await call({...args,idempotency_key:args.idempotency_key+'-stale'});
  assert.equal(stale.body.result._meta['com.runeditrun/error'].code,'revision_conflict');
  const staleNativeFence=await call({...args,expected_revision:source.version+1,idempotency_key:args.idempotency_key+'-source-stale'});
  assert.equal(staleNativeFence.body.result._meta['com.runeditrun/error'].code,'revision_conflict','the native source-version fence also refuses stale saves');
  assert.equal(await versions(),count!+1);assert.deepEqual(await effects(),beforeEffects);
  accepted=result;acceptedArgs=args;
 }
 const refusalState=await effects(),count=await versions();
 const blocked=autonomousPolicy();blocked.rules=[{id:'explicit-company-block',class:'standard',do:'blocked'}];await adopt(blocked);
 for(const args of [acceptedArgs,{...acceptedArgs,source_version:3,expected_revision:3,idempotency_key:'synthetic-orbit-workflow-blocked'}]){
  const refused=await call(args);assert.equal(refused.body.result._meta['com.runeditrun/error'].code,'policy_blocked');assert.equal(refused.body.result.structuredContent,undefined);
 }
 await adopt(autonomousPolicy());
 const nonOwner=await call({...acceptedArgs,source_version:3,expected_revision:3,idempotency_key:'synthetic-orbit-workflow-non-owner'},
  {sub:'business-jamie',email:reviewerEmail,act:{sub:'synthetic-orbit-non-owner',name:'Other helper'}});
 assert.equal(nonOwner.body.result._meta['com.runeditrun/error'].code,'resource_unavailable');
 const insufficient=await call({...acceptedArgs,idempotency_key:'synthetic-orbit-workflow-no-scope'},{scope:'records:read'});assert.equal(insufficient.status,403);
 const revoked=await door.handle(new Request(origin+'/agents/api/agents/'+agent.sub+'/revoke',{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},body:'{}'}));assert.equal(revoked!.status,200);
 for(const args of [acceptedArgs,{...acceptedArgs,source_version:3,expected_revision:3,idempotency_key:'synthetic-orbit-workflow-revoked'}]){
  const refused=await call(args);assert.equal(refused.status,401);assert.equal(refused.body.result?.structuredContent,undefined);
 }
 assert.equal(await versions(),count);assert.deepEqual(await effects(),refusalState);assert.deepEqual(await active(),activeBefore);assert.deepEqual(await authority(),authorityBefore);assert.deepEqual(providerCalls,[]);
 // A separate native event, after all save-time witnesses, still runs version one.
 await native('/api/v1/records/opportunity/'+sourceId,{...original,title:'synthetic-orbit-trigger-old',custom_fields:JSON.parse(original.custom_fields_json)},'PUT');
 await native('/api/workflows/process',{});
 assert.equal((await native('/api/v1/records/opportunity/'+sourceId)).record.title,'synthetic-orbit-old-definition');
 const runs=(await native('/api/workflows')).runs.filter((r:any)=>r.workflowId===id);
 assert.ok(runs.some((r:any)=>r.version===1&&r.status==='completed'));assert.ok(runs.every((r:any)=>r.version===1));
 assert.deepEqual(await active(),activeBefore);assert.deepEqual(providerCalls,[]);
 await native('/api/workflows/'+id+'/pause',{});
 console.log(JSON.stringify({proof:'SURFACE-008.draft-save',modes:['autonomous','held'],savedVersions:2,activeVersion:1,classes:accepted._meta['com.runeditrun/decision'].classes.map(({class:cls,facts}:any)=>({class:cls,facts})),replayAddsVersion:false,saveEffects:false,providerCalls:0,oldDefinitionExecuted:true,refusals:['stale','company-block','non-owner','insufficient-scope','revoked']}));
}
