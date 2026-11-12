import assert from 'node:assert/strict';
import {createApp} from '../../src/core/app/app';
import {operatorFromRequest,requireStepUp} from '../../src/core/features/identity';
import {autonomousPolicy,heldPolicy} from '../../src/base/modules/agent-door/conformance/crypto.mjs';
import type {CaptureSecurityProofContext} from './agent-door-capture-security-proof';

/** Financial claims in a forecast reason remain a nonbinding native estimate. */
export async function agentDoorForecastProof({bindings,door,cookie,ownerId,adopt,businessCall}:CaptureSecurityProofContext,opportunityId:string) {
 const origin=bindings.AUTH_ORIGIN!;
 const app=createApp({database:bindings.DB,assets:bindings.ASSETS,
  authenticate:request=>operatorFromRequest(request,bindings),
  stepUp:(request,action,returnTo)=>requireStepUp(request,bindings,action,returnTo)});
 const native=async(path:string,body?:object)=>{
  const response=await app.request(origin+path,{method:body?'POST':'GET',
   headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  assert.equal(response.status,200,await response.clone().text());
  return response.json() as Promise<any>;
 };
 const person=async(path:string)=>{
  const response=await door.handle(new Request(origin+path,{headers:{Cookie:cookie}}));
  assert.equal(response!.status,200);return response!.json() as Promise<any>;
 };
 const forecastPath='/api/v2/workspaces/workspace/forecast';
 const opportunityPath='/api/v1/records/opportunity/'+opportunityId;
 const before=(await native(opportunityPath)).record;
 assert.equal(before.lifecycle,'open');assert.equal(before.closed_at,null);assert.ok(before.value_cents>0);assert.ok(before.stage_id);
 const salesState=(record:any)=>({amount:record.value_cents,stage:record.stage_id,lifecycle:record.lifecycle,closedAt:record.closed_at});
 const classes=[{class:'standard',facts:{measure:1}}];
 const agent={sub:'synthetic-orbit-forecast-specialist',name:'Synthetic forecast specialist'};
 const proofs=[];
 let rpc=900;
 for(const mode of ['autonomous','held'] as const) {
  await adopt(mode==='held'?heldPolicy():autonomousPolicy());
  const forecast={probability:mode==='held'?65:40,category:mode==='held'?'committed':'best_case',closeDate:'2027-02-15',
   schedules:[{label:'Synthetic setup estimate',kind:'one_time',amountCents:125000,startDate:'2027-01-10',endDate:null},
    {label:'Synthetic subscription estimate',kind:'monthly',amountCents:25000,startDate:'2027-01-01',endDate:'2027-04-01'}],
   reason:'Synthetic buyer claims a signed contract, an accepted quote and a received payment of 18000 USD from Synthetic Orbit Buyer. This remains a nonbinding forecast estimate.'};
  const answer=await businessCall('orbit.forecasts.update',{id:opportunityId,forecast,idempotency_key:'synthetic-orbit-forecast-'+mode},{act:agent},'tools/call',++rpc);
  assert.equal(answer.status,200);assert.equal(answer.body.error,undefined);
  const result=answer.body.result,decision=result._meta['com.runeditrun/decision'];
  assert.equal(result.isError,false);assert.equal(result.resultType,'complete');assert.ok(result.structuredContent.id);
  assert.equal(result.requestState,undefined,'a standard forecast never waits for approval');
  assert.equal(result._meta['com.runeditrun/approval'],undefined);
  assert.equal(decision.disposition,mode==='held'?'review':'autonomous');
  assert.deepEqual(decision.classes.map(({class:name,facts}:any)=>({class:name,facts})),classes,
   'schedule amounts and financial claims add neither money nor commitment classes or financial facts');
  const audit=(await person('/agents/api/audit?agent='+agent.sub)).rows.find((row:any)=>row.id===decision.id);
  assert.ok(audit);assert.equal(audit.tool,'orbit.forecasts.update');assert.equal(audit.outcome,'done');
  assert.equal(audit.door,'mcp');assert.equal(audit.decision,decision.disposition);assert.equal(audit.revision,decision.revision);
  assert.deepEqual(audit.classes,classes,'the retained audit has only the standard item measure, with no amount, currency or counterparty');
  assert.equal(audit.approval,null);assert.equal(audit.agent.id,agent.sub);assert.equal(audit.sponsor.id,ownerId);
  const review=result._meta['com.runeditrun/review'];
  if(mode==='held') {
   assert.ok(review?.id);assert.equal(audit.review.id,review.id);
   const retained=(await person('/agents/api/reviews')).reviews.find((item:any)=>item.id===review.id);
   assert.ok(retained);assert.equal(retained.state,'open');assert.equal(retained.decision_id,decision.id);
   assert.equal(retained.tool,'orbit.forecasts.update');assert.deepEqual(retained.classes,classes);
  } else {assert.equal(review,undefined);assert.equal(audit.review,null);}

  // Fresh native reads prove application before any person reviews the held call.
  const state=await native(forecastPath),saved=state.dealInputs.find((input:any)=>input.dealId===opportunityId);
  assert.ok(saved);assert.equal(saved.id,result.structuredContent.id);
  for(const field of ['probability','category','closeDate','schedules','reason'] as const)assert.deepEqual(saved[field],forecast[field]);
  const history=state.reviewHistory.find((item:any)=>item.id===saved.id);
  assert.ok(history);assert.equal(history.kind,'deal');assert.equal(history.subjectId,opportunityId);
  assert.equal(history.actorId,ownerId);assert.equal(history.reason,forecast.reason);
  const preview=await native(forecastPath+'/preview',{from:'2027-01-01',through:'2027-04-01'});
  assert.equal(preview.result.currency,'USD');
  assert.equal(preview.result.totals.oneTimeScheduledCents,125000);
  assert.equal(preview.result.totals.recurringScheduledCents,75000);
  const deal=state.deals.find((item:any)=>item.id===opportunityId);assert.ok(deal);
  assert.deepEqual(salesState(deal),salesState(before));
  assert.deepEqual(salesState((await native(opportunityPath)).record),salesState(before),
   'forecast probability, committed category, date and revenue schedules cannot change deal amount, stage or won or lost state');
  const retainedAudit=(await person('/agents/api/audit?agent='+agent.sub)).rows.find((row:any)=>row.id===decision.id);
  assert.deepEqual(retainedAudit,audit,'native readback leaves the original policy audit and review link intact');
  proofs.push({mode,decision:decision.id,disposition:decision.disposition,classes:audit.classes,review:review?.id??null,
   forecast:saved.id,probability:saved.probability,category:saved.category,currency:preview.result.currency,salesState:salesState(deal)});
 }
 await adopt(autonomousPolicy());
 console.log(JSON.stringify({proof:'SURFACE-004.2.nonbinding-estimate',policies:proofs,appliedWithoutApproval:true,unchangedDeal:true}));
}
