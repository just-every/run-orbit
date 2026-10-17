import assert from 'node:assert/strict';

/** Part of the Records public-door journey; keeps pipeline filtering and moves together. */
export async function salesPipelinesJourney(request:(path:string,method?:string,body?:unknown)=>Promise<Response>,actor:string) {
 const json=async(path:string,method='GET',body?:unknown,status=200)=>{const response=await request(path,method,body);assert.equal(response.status,status,await response.clone().text());return response.json() as Promise<any>;};
 const stage=(name:string,probability:number,requiredFields:string[]=[])=>({name,probability,requiredFields,staleIntervalDays:3});
 const inbound=await json('settings/pipelines','POST',{name:'New business',stages:[stage('Discovery',30),stage('Proposal',60,['expected_close_at'])]},201);
 const renewals=await json('settings/pipelines','POST',{name:'Renewals',stages:[stage('Review',80,['custom:Territory']),stage('Negotiation',90)]},201);
 let settings=await json('settings');
 const discovery=settings.stages.find((s:any)=>s.pipeline_id===inbound.id&&s.name==='Discovery'),proposal=settings.stages.find((s:any)=>s.pipeline_id===inbound.id&&s.name==='Proposal'),review=settings.stages.find((s:any)=>s.pipeline_id===renewals.id&&s.name==='Review');
 const input={title:'Brightwork annual contract',stage_id:discovery.id,owner_id:actor,value_cents:1000000,custom_fields:{Territory:'West'}};
 const deal=await json('records/opportunity','POST',input,201);
 const before=await json(`records/opportunity/${deal.id}`);
 assert.equal((await json(`records/opportunity?pipeline_id=${inbound.id}`)).records.some((r:any)=>r.id===deal.id),true);
 assert.equal((await json(`records/opportunity?pipeline_id=${renewals.id}`)).records.some((r:any)=>r.id===deal.id),false);
 await json(`records/opportunity/${deal.id}/move`,'POST',{stageId:proposal.id,reviewedStageId:discovery.id},409);
 assert.equal((await json(`records/opportunity/${deal.id}`)).record.stage_id,discovery.id);
 await json(`records/opportunity/${deal.id}`,'PUT',{...input,expected_close_at:'2027-03-31T17:00:00.000Z'});
 await json(`records/opportunity/${deal.id}/move`,'POST',{stageId:proposal.id,reviewedStageId:discovery.id});
 await json(`records/opportunity/${deal.id}/move`,'POST',{stageId:review.id,reviewedStageId:discovery.id},409);
 await json(`records/opportunity/${deal.id}/move`,'POST',{stageId:review.id,reviewedStageId:proposal.id});
 const moved=await json(`records/opportunity/${deal.id}`);
 assert.equal(moved.record.pipeline_id,renewals.id);assert.equal(moved.record.lifecycle,before.record.lifecycle);assert.equal(moved.record.owner_id,before.record.owner_id);assert.equal(moved.record.score,before.record.score);
 assert.equal(moved.movementHistory.length,2);assert.ok(moved.movementHistory.every((m:any)=>m.actor_id===actor));
 await json(`settings/pipelines/${renewals.id}`,'DELETE',{confirmed:true},409);
 const renewal=settings.pipelines.find((p:any)=>p.id===renewals.id);
 await json(`settings/pipelines/${renewals.id}`,'PUT',{name:renewal.name,revision:renewal.revision,stages:[{...stage('Negotiation',90),id:settings.stages.find((s:any)=>s.pipeline_id===renewals.id&&s.name==='Negotiation').id}]},409);
 const workspace={name:'Brightwork Sales',timezone:'America/Los_Angeles',currency:'USD',workingHours:{days:[1,2,3,4,5],start:'08:30',end:'17:30'},staleIntervalDays:12,awaitingResponseWorkingDays:4,freeMailDomains:['gmail.com']};
 await json('settings','PUT',workspace);settings=await json('settings');
 assert.equal(settings.workspace.timezone,workspace.timezone);assert.equal(settings.workspace.stale_interval_days,12);assert.deepEqual(JSON.parse(settings.workspace.working_hours_json),workspace.workingHours);
 const empty=await json('settings/pipelines','POST',{name:'Retired pipeline',stages:[stage('Empty',10)]},201);
 await json(`settings/pipelines/${empty.id}`,'DELETE',{confirmed:true});
 assert.equal((await json('settings')).pipelines.some((p:any)=>p.id===empty.id),false);
}
