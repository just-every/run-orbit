import assert from 'node:assert/strict';

/** Part of the Records public-door journey; keeps pipeline filtering and moves together. */
export async function salesPipelinesJourney(request:(path:string,method?:string,body?:unknown)=>Promise<Response>,actor:string,other:string) {
 const json=async(path:string,method='GET',body?:unknown,status=200)=>{const response=await request(path,method,body);assert.equal(response.status,status,await response.clone().text());return response.json() as Promise<any>;};
 const stage=(name:string,probability:number,requiredFields:string[]=[])=>({name,probability,requiredFields,staleIntervalDays:3});
 const inbound=await json('settings/pipelines','POST',{name:'New business',stages:[stage('Discovery',30),stage('Proposal',60,['expected_close_at'])]},201);
 const renewals=await json('settings/pipelines','POST',{name:'Renewals',stages:[stage('Review',80,['custom:Territory']),stage('Negotiation',90)]},201);
 let settings=await json('settings');
 const discovery=settings.stages.find((s:any)=>s.pipeline_id===inbound.id&&s.name==='Discovery'),proposal=settings.stages.find((s:any)=>s.pipeline_id===inbound.id&&s.name==='Proposal'),review=settings.stages.find((s:any)=>s.pipeline_id===renewals.id&&s.name==='Review');
 const input={title:'Brightwork annual contract',stage_id:discovery.id,owner_id:actor,value_cents:1000000,custom_fields:{Territory:'West'}};
 const deal=await json('records/opportunity','POST',input,201);
 // OPP-002: start with observed customer evidence, never a hand-written score.
 const evidence=async(type:string,eventId:string)=>json(`workbench/opportunities/${deal.id}/events`,'POST',{type,subject:'Customer evidence for independent state',eventId,occurredAt:new Date().toISOString()},201);
 await evidence('form.submitted','synthetic-orbit-1');
 const before=await json(`records/opportunity/${deal.id}`);
 const state=async(expected:{lifecycle:string;stage_id:string;owner_id:string|null;score:number;band:string;queue_state:string},id=deal.id)=>{
  const detail=await json(`records/opportunity/${id}`),record=detail.record;
  assert.deepEqual(Object.fromEntries(Object.keys(expected).map(key=>[key,record[key]])),expected,'Records retains each independent field');
  const {opportunity}=await json(`opportunities/${id}`);
  assert.deepEqual({lifecycle:opportunity.lifecycle,stage_id:opportunity.stageId,owner_id:opportunity.ownerId,score:opportunity.score,band:opportunity.band,queue_state:opportunity.queueState},expected,'The operator detail represents the same state');
  const now=await json('opportunities/now');
  assert.equal(now.opportunities.some((row:any)=>row.id===id),expected.lifecycle==='open'&&expected.queue_state==='now','Queue membership follows attention and lifecycle, independently of sales stage and owner');
  return detail;
 };
 const initial={lifecycle:'open',stage_id:discovery.id,owner_id:actor,score:25,band:'low',queue_state:'none'};
 await state(initial);
 assert.equal((await json(`records/opportunity?pipeline_id=${inbound.id}`)).records.some((r:any)=>r.id===deal.id),true);
 assert.equal((await json(`records/opportunity?pipeline_id=${renewals.id}`)).records.some((r:any)=>r.id===deal.id),false);
 await json(`records/opportunity/${deal.id}/move`,'POST',{stageId:proposal.id,reviewedStageId:discovery.id},409);
 assert.equal((await json(`records/opportunity/${deal.id}`)).record.stage_id,discovery.id);
 await state(initial);
 await json(`records/opportunity/${deal.id}`,'PUT',{...input,expected_close_at:'2027-03-31T17:00:00.000Z'});
 await json(`records/opportunity/${deal.id}/move`,'POST',{stageId:proposal.id,reviewedStageId:discovery.id});
 await state({...initial,stage_id:proposal.id});
 await json(`records/opportunity/${deal.id}/move`,'POST',{stageId:review.id,reviewedStageId:discovery.id},409);
 await json(`records/opportunity/${deal.id}/move`,'POST',{stageId:review.id,reviewedStageId:proposal.id});
 const moved=await json(`records/opportunity/${deal.id}`);
 assert.equal(moved.record.pipeline_id,renewals.id);assert.equal(moved.record.lifecycle,before.record.lifecycle);assert.equal(moved.record.owner_id,before.record.owner_id);assert.equal(moved.record.score,before.record.score);
 assert.equal(moved.movementHistory.length,2);assert.ok(moved.movementHistory.every((m:any)=>m.actor_id===actor));
 await state({...initial,stage_id:review.id});
 await json(`records/opportunity/${deal.id}`,'PATCH',{changes:{owner_id:other},base:{owner_id:actor}});
 await state({...initial,stage_id:review.id,owner_id:other});
 // Stale review and invalid owner are refused by the same native edit doors.
 await json(`records/opportunity/${deal.id}`,'PATCH',{changes:{owner_id:null},base:{owner_id:actor}},409);
 await json(`records/opportunity/${deal.id}`,'PATCH',{changes:{owner_id:'synthetic-orbit-2'},base:{owner_id:other}},400);
 await state({...initial,stage_id:review.id,owner_id:other});
 await evidence('meeting.booked','synthetic-orbit-3');
 const raised={...initial,stage_id:review.id,owner_id:other,score:70,band:'high',queue_state:'now'};
 const scored=await state(raised);
 assert.equal(scored.movementHistory.length,2,'Scoring creates no stage movement');
 // Scoring evidence and genuine sales edits also preserve a closed outcome.
 const negotiation=settings.stages.find((s:any)=>s.pipeline_id===renewals.id&&s.name==='Negotiation');
 for(const lifecycle of ['won','lost']){
  const closedDeal=await json('records/opportunity','POST',{...input,title:`Closed ${lifecycle} independent state`,stage_id:review.id},201);
  const event={type:'form.submitted',subject:'Observed customer evidence',eventId:`synthetic-orbit-${lifecycle}-1`,occurredAt:new Date().toISOString()};
  await json(`workbench/opportunities/${closedDeal.id}/events`,'POST',event,201);
  await json(`records/opportunity/${closedDeal.id}/lifecycle`,'POST',{state:lifecycle,reason:'Operator reviewed the customer outcome'});
  const closed={...initial,lifecycle,stage_id:review.id};
  const history=await state(closed,closedDeal.id);
  await json(`workbench/opportunities/${closedDeal.id}/events`,'POST',{...event,type:'meeting.booked',eventId:`synthetic-orbit-${lifecycle}-2`},201);
  await state(closed,closedDeal.id);
  await json(`records/opportunity/${closedDeal.id}/move`,'POST',{stageId:negotiation.id,reviewedStageId:review.id});
  await state({...closed,stage_id:negotiation.id},closedDeal.id);
  await json(`records/opportunity/${closedDeal.id}`,'PATCH',{changes:{owner_id:other},base:{owner_id:actor}});
  const after=await state({...closed,stage_id:negotiation.id,owner_id:other},closedDeal.id);
  for(const key of ['closed_at','closed_by','close_reason'])assert.equal(after.record[key],history.record[key],`Evidence and sales edits preserve ${key}`);
 }
 await json(`settings/pipelines/${renewals.id}`,'DELETE',{confirmed:true},409);
 const renewal=settings.pipelines.find((p:any)=>p.id===renewals.id);
 await json(`settings/pipelines/${renewals.id}`,'PUT',{name:renewal.name,revision:renewal.revision,stages:[{...stage('Negotiation',90),id:settings.stages.find((s:any)=>s.pipeline_id===renewals.id&&s.name==='Negotiation').id}]},409);
 // OPP-009: both occupied refusals changed nothing; Renewals keeps Review and Negotiation and the deal stays in Review.
 const occupied=await json('settings');
 assert.deepEqual(occupied.stages.filter((s:any)=>s.pipeline_id===renewals.id).map((s:any)=>s.name).sort(),['Negotiation','Review']);
 assert.equal(occupied.pipelines.find((p:any)=>p.id===renewals.id)?.revision,renewal.revision);
 assert.equal((await json(`records/opportunity/${deal.id}`)).record.stage_id,review.id);
 const workspace={name:'Brightwork Sales',timezone:'America/Los_Angeles',currency:'USD',workingHours:{days:[1,2,3,4,5],start:'08:30',end:'17:30'},staleIntervalDays:12,awaitingResponseWorkingDays:4,freeMailDomains:['gmail.com']};
 await json('settings','PUT',workspace);settings=await json('settings');
 assert.equal(settings.workspace.timezone,workspace.timezone);assert.equal(settings.workspace.stale_interval_days,12);assert.deepEqual(JSON.parse(settings.workspace.working_hours_json),workspace.workingHours);
 const empty=await json('settings/pipelines','POST',{name:'Retired pipeline',stages:[stage('Empty',10)]},201);
 await json(`settings/pipelines/${empty.id}`,'DELETE',{confirmed:true});
 assert.equal((await json('settings')).pipelines.some((p:any)=>p.id===empty.id),false);
}
