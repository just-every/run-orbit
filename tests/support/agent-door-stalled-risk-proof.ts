import assert from 'node:assert/strict';
import type {TestContext} from 'node:test';
import {createApp} from '../../src/core/app/app';
import {operatorFromRequest,requireStepUp} from '../../src/core/features/identity';
import {autonomousPolicy,heldPolicy} from '../../src/base/modules/agent-door/conformance/crypto.mjs';
import {stalledRiskComparison} from '../agent-door/native-journey.mjs';
import type {CaptureSecurityProofContext} from './agent-door-capture-security-proof';

/** A real old stage movement, read through authenticated MCP and native Findings under both policies. */
export async function agentDoorStalledRiskProof(context:TestContext,input:CaptureSecurityProofContext) {
 const {bindings,door,cookie,reviewerCookie,ownerId,adopt,businessCall}=input,db=bindings.DB,origin=bindings.AUTH_ORIGIN!;
 const app=createApp({database:db,assets:bindings.ASSETS,authenticate:request=>operatorFromRequest(request,bindings),
  stepUp:(request,action,returnTo)=>requireStepUp(request,bindings,action,returnTo)});
 const native=async(path:string,method='GET',body?:object,session=cookie)=>{
  const response=await app.request(origin+path,{method,headers:{Cookie:session,Origin:origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  assert.ok(response.ok,`native stalled-risk fixture ${response.status}: ${await response.clone().text()}`);
  return response.json() as Promise<any>;
 };
 const current=Date.now();
 context.mock.timers.enable({apis:['Date'],now:current});
 try {
  const expected=await createStalledRiskFixture(context,native,current),created={id:expected.id};
  const nativeRisks=await native(`/api/v1/risks/${created.id}/findings`);
  const state=async()=>Object.fromEntries(await Promise.all([
   'opportunities','opportunity_contacts','opportunity_stakeholder_roles','opportunity_buying_context','record_ownership',
   'forecast_revisions','forecast_snapshots','forecast_snapshot_records','forecast_source_clock','sales_tasks','handoff_tasks',
   'signals','signal_links','evaluations','recommendations','recommendation_evidence','timeline_entries','timeline_entry_records',
   'drafts','outbound_messages','record_mail_drafts','record_mail_outbound_messages','ai_calls','ai_previews',
  ].map(async table=>[table,(await db.prepare('SELECT * FROM '+table).all()).results.map(row=>JSON.stringify(row)).sort()])));
  const before=await state(),agent={sub:'synthetic-orbit-stalled-reader',name:'Synthetic risk specialist',specialist:'sales rep'};
  let rpc=800;
  const read=(overrides={})=>businessCall('orbit.risks.read',{id:created.id},{act:agent,...overrides},'tools/call',++rpc);
  const person=async(path:string,session=cookie,body?:object)=>{
   const response=await door.handle(new Request(origin+path,{method:body?'POST':'GET',headers:{Cookie:session,Origin:origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}));
   assert.ok(response);return response;
  };
  const proofs=[];
  for(const mode of ['autonomous','held'] as const) {
   await adopt(mode==='held'?heldPolicy():autonomousPolicy());
   const answer=await read();assert.equal(answer.status,200);assert.equal(answer.body.error,undefined);
   const result=answer.body.result;
   assert.equal(result.isError,false);assert.equal(result.resultType,'complete');
   assert.equal(result._meta['com.runeditrun/untrusted'],true);
   stalledRiskComparison(result.structuredContent.risks,nativeRisks,expected);
   const decision=result._meta['com.runeditrun/decision'],classes=[{class:'standard',facts:{measure:1}}];
   assert.deepEqual(decision.classes.map(({class:name,facts}:any)=>({class:name,facts})),classes);
   assert.equal(decision.disposition,mode==='held'?'review':'autonomous');
   assert.equal(result._meta['com.runeditrun/approval'],undefined);
   assert.equal(result._meta['com.runeditrun/receipt'],undefined);
   const auditResponse=await person('/agents/api/audit?agent='+agent.sub);assert.equal(auditResponse.status,200);
   const audit=await auditResponse.json() as any;assert.equal(audit.differs_from_policy,0);
   const row=audit.rows.find((row:any)=>row.id===decision.id);assert.ok(row);
   assert.deepEqual(row.agent,{id:agent.sub,name:agent.name,specialist:agent.specialist});
   assert.deepEqual(row.sponsor,{id:ownerId,name:'Morgan Lee'});assert.equal(row.label,agent.name+' for Morgan Lee');
   assert.equal(row.tool,'orbit.risks.read');assert.equal(row.door,'mcp');assert.equal(row.outcome,'done');
   assert.equal(row.decision,decision.disposition);assert.equal(row.revision,decision.revision);assert.deepEqual(row.classes,classes);
   assert.equal(row.client_id,'business-client');assert.equal(row.consent,'door-test-consent');assert.equal(row.approval,null);
   const review=result._meta['com.runeditrun/review'];
   if(mode==='held') {
    assert.ok(review?.id);assert.equal(row.review.id,review.id);
    const anonymous=await door.handle(new Request(origin+'/agents/api/reviews'));assert.equal(anonymous!.status,401);
    const foreign=await person(`/agents/api/reviews/${review.id}/reviewed`,reviewerCookie,{});assert.equal(foreign.status,403);
    const list=await person('/agents/api/reviews');assert.equal(list.status,200);
    const item=(await list.json() as any).reviews.find((item:any)=>item.id===review.id);
    assert.equal(item.state,'open');assert.equal(item.decision_id,decision.id);assert.equal(item.tool,'orbit.risks.read');
    assert.deepEqual(item.classes,classes);assert.deepEqual(item.prepared_by,{agent:agent.name,for:'Morgan Lee'});
    const page=await person('/agents');assert.equal(page.status,200);assert.ok((await page.text()).includes(`data-review-id="${review.id}"`));
    const marked=await person(`/agents/api/reviews/${review.id}/reviewed`,cookie,{});assert.equal(marked.status,200);
    const reviewed=(await marked.json() as any).review;assert.equal(reviewed.state,'reviewed');assert.equal(reviewed.marked_by,ownerId);
    const retained=await person('/agents/api/audit?agent='+agent.sub);assert.equal(retained.status,200);
    const reviewedAudit=(await retained.json() as any).rows.find((item:any)=>item.id===decision.id);
    assert.deepEqual(reviewedAudit.review,{id:review.id,by:ownerId},'the persisted review decision names the signed-in sponsor without replacing the agent actor');
    assert.deepEqual(reviewedAudit.agent,row.agent);assert.deepEqual(reviewedAudit.sponsor,row.sponsor);
   } else {assert.equal(review,undefined);assert.equal(row.review,null);}
   assert.deepEqual(await state(),before,'risk reads and linked reviews change no sales, mail, model or evidence state');
   proofs.push({mode,decision:decision.id,disposition:decision.disposition,classes,review:review?.id??null});
  }
  const blocked=autonomousPolicy();blocked.rules=[{id:'standard',class:'standard',do:'blocked'}];await adopt(blocked);
  const refused=await read();assert.equal(refused.status,200);assert.equal(refused.body.result.isError,true);
  assert.equal(refused.body.result._meta['com.runeditrun/error'].code,'policy_blocked');assert.equal(refused.body.result.structuredContent,undefined);
  assert.equal(refused.body.result._meta['com.runeditrun/review'],undefined);
  assert.deepEqual(await state(),before);
  await adopt(autonomousPolicy());
  assert.equal((await read({scope:'records:read'})).status,403);
  const revoke=await person('/agents/api/agents/'+agent.sub+'/revoke',cookie,{});assert.equal(revoke.status,200);
  const revoked=await read();assert.equal(revoked.status,401);assert.equal(revoked.body.result,undefined);
  assert.deepEqual(await state(),before,'blocked policy, wrong scope and revoked authority preserve populated native state');
  const unauthenticated=await app.request(origin+`/api/v1/risks/${created.id}/findings`);assert.equal(unauthenticated.status,401);
  console.log(JSON.stringify({proof:'SURFACE-013.stalled-deal',clock:new Date(current).toISOString(),expected,policies:proofs,
   nativeMatch:true,salesMailModelUnchanged:true,blockedRefused:true,revokedRefused:true}));
 } finally {context.mock.timers.reset();}
}

/** Native fixture lifecycle shared with the emitted browser registration. The caller owns its clock. */
export async function createStalledRiskFixture(context:TestContext,native:(path:string,method?:string,body?:object)=>Promise<any>,current:number,pipelineName='Synthetic stalled sales') {
 const day=86400000,since=new Date(current-31*day).toISOString();
 context.mock.timers.setTime(current-32*day);
  const pipeline=await native('/api/v1/settings/pipelines','POST',{name:pipelineName,stages:[
   {name:'Synthetic discovery',probability:20,requiredFields:[],staleIntervalDays:14},
   {name:'Synthetic proposal',probability:50,requiredFields:[],staleIntervalDays:14}]});
  const settings=await native('/api/v1/settings'),stages=settings.stages.filter((stage:any)=>stage.pipeline_id===pipeline.id).sort((a:any,b:any)=>a.position-b.position);
  const contact=await native('/api/v1/records/contact','POST',{name:'Synthetic risk buyer'});
  const created=await native('/api/v1/records/opportunity','POST',{title:'Synthetic stalled specialist deal',stage_id:stages[0].id,value_cents:750000,contact_ids:[contact.id],primary_contact_id:contact.id});
  context.mock.timers.setTime(current-31*day);
  await native(`/api/v1/records/opportunity/${created.id}/move`,'POST',{stageId:stages[1].id,reviewedStageId:stages[0].id});
  const history=(await native(`/api/v1/records/opportunity/${created.id}`)).timeline;
  const movement=history.find((entry:any)=>entry.kind==='stage.changed');assert.ok(movement);
  assert.equal(movement.occurred_at,since);
  const expected={id:created.id,evidenceId:movement.id,quote:`In Synthetic proposal since ${since.slice(0,10)}`,since,
   days:31,intervalDays:14,nextTask:'Agree a dated next step with Synthetic risk buyer or close the deal'};
  // Both doors see a genuinely fresh stage first, then the same stage after its stale interval.
  context.mock.timers.setTime(current-30*day);
  assert.equal((await native(`/api/v1/risks/${created.id}/findings`)).findings.some((finding:any)=>finding.kind==='stalled'),false);
  context.mock.timers.setTime(current);
  return expected;
}

export {autonomousPolicy,heldPolicy};
