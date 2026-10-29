import {exerciseRecordOwnership} from '../support/record-ownership';
import {exerciseOpportunityCreation} from '../support/opportunity-creation';
import {salesPipelinesJourney} from '../support/sales-pipelines';
import {exerciseBuyingContext} from '../support/buying-context';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApp } from '../support/app';
import { createDependencies } from '../support/dependencies';
import {launchFixture} from '../support/launch-fixture';
import {nativeRecords} from '../support/sanity-records-http';
import {mergeReviewedRecords} from '../support/sanity-records-merge';
import {configureSalesFields} from '../support/sanity-records-fields';
import {todayApp} from '../support/today-workspace';

import { createId } from '../../src/core/shared/ids';

test('RECORD-002 RECORD-004 RECORD-006 RECORD-009 RECORD-011 RECORD-014 RECORD-015 RECORD-016 OPP-009 TEAM-003 configure, find, relate, assign and reconcile sales records through reviewed native changes', async()=>{
 const fixture=await launchFixture(),db=fixture.db,actor=fixture.actor,stage=fixture.stage,other=createId(),otherStage=createId(),now=new Date().toISOString();
 try {
  const deps=createDependencies(db);await deps.auth.ensureOperator({id:other,email:`${other}@search.test`,displayName:'Other operator'});
  await db.prepare('INSERT INTO pipeline_stages VALUES(?,?,1,?,?)').bind(otherStage,'Later',now,now).run();
  const records=nativeRecords(fixture);
  const contact=await records.save('contact',{name:'Specificcontact',email:'specific@search.test'},actor),company=await records.save('company',{name:'Specificcompany'},actor),opportunity=await records.save('opportunity',{title:'Specificopportunity',stage_id:stage,owner_id:actor,value_cents:0},actor);
  const app=createApp({database:db,assets:{fetch:async()=>new Response('asset')}}),session=await deps.auth.createSession(actor);
  async function search(kind:string,query:string){const response=await app.request(`https://orbit.test/api/v1/records/${kind}?${query}`,{headers:{cookie:`__Host-orbit_session=${session.token}`}});assert.equal(response.status,200);return (await response.json() as {records:{id:string}[]}).records.map(row=>row.id);}
  for(const [kind,row]of [['contact',contact],['company',company],['opportunity',opportunity]] as const){
   assert.deepEqual(await search(kind,`q=Specific${kind}`),[row.id]);
   await records.note(kind,row.id,{kind:'note',text:'Distinctive timeline phrase',occurredAt:now});
   assert.deepEqual(await search(kind,'q=Distinctive%20timeline'),[row.id]);
   assert.deepEqual(await search(kind,'q=nomatchneedle'),[]);
  }
  // Distinct alternatives make each filter observable, including intersections.
  const variants=[{lifecycle:'won',stage_id:stage,owner_id:actor,band:'high',queue_state:'now'},{lifecycle:'open',stage_id:otherStage,owner_id:actor,band:'high',queue_state:'now'},{lifecycle:'open',stage_id:stage,owner_id:other,band:'high',queue_state:'now'},{lifecycle:'open',stage_id:stage,owner_id:actor,band:'low',queue_state:'now'},{lifecycle:'open',stage_id:stage,owner_id:actor,band:'high',queue_state:'next'}];
  await db.prepare("INSERT INTO runtime_controls VALUES('restore','search fixture')").run();
  const expected={lifecycle:'open',stage_id:stage,owner_id:actor,band:'high',queue_state:'now'};
  const rows=[{id:opportunity.id,...expected}];
  for(const values of variants){const row=await records.save('opportunity',{title:'Alternative',stage_id:values.stage_id,owner_id:values.owner_id,value_cents:0},actor);rows.push({id:row.id,...values});}
  for(const row of rows)await db.prepare('UPDATE opportunities SET lifecycle=?,stage_id=?,owner_id=?,band=?,queue_state=? WHERE id=?').bind(row.lifecycle,row.stage_id,row.owner_id,row.band,row.queue_state,row.id).run();
  await db.prepare("DELETE FROM runtime_controls WHERE name='restore'").run();
  for(const [field,value]of Object.entries(expected))assert.deepEqual((await search('opportunity',new URLSearchParams({[field]:value}).toString())).sort(),rows.filter(row=>row[field as keyof typeof row]===value).map(row=>row.id).sort(),field);
  assert.deepEqual(await search('opportunity',new URLSearchParams(expected).toString()),[opportunity.id]);
  for(let i=0;i<55;i++)await records.save('contact',{name:`Pagebound ${i}`,email:`page-${i}@search.test`},actor);
  const page=await search('contact','q=Pagebound');assert.equal(page.length,50,'the first page contains exactly 50 of the 55 matching contacts');
  await salesPipelinesJourney((path,method='GET',body)=>app.request('https://orbit.test/api/v1/'+path,{method,headers:{Cookie:`__Host-orbit_session=${session.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})}),actor);
 await exerciseBuyingContext((path,method='GET',body)=>app.request('https://orbit.test/api/v1/'+path,{method,headers:{Cookie:`__Host-orbit_session=${session.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})}),actor);
 const receiverSession=await deps.auth.createSession(other);
 await exerciseRecordOwnership((path,method='GET',body)=>app.request('https://orbit.test/api/v1/'+path,{method,headers:{Cookie:`__Host-orbit_session=${session.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})}),actor,other,path=>app.request('https://orbit.test/api/v1/'+path,{headers:{Cookie:`__Host-orbit_session=${receiverSession.token}`}}));
 await exerciseOpportunityCreation((path,method='GET',body)=>app.request('https://orbit.test/api/v1/'+path,{method,headers:{Cookie:`__Host-orbit_session=${session.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})}),db,actor,other,stage);
  await mergeReviewedRecords(fixture);
  await configureSalesFields(db,await todayApp(db,{operatorId:actor}));
 } finally {await fixture.dispose();}
});
