import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createApp} from '../support/app';
import {isolatedDatabase} from '../support/isolated-database';
import {createTestDependencies} from '../support/test-dependencies';
import {databaseDigest} from '../support/stop-attribution';
import {emittedDemoProof} from '../support/public-demo-proof';

test('PUBLIC-002 separate read-only demo has fresh stories and cannot read or mutate owner records',async context=>{
 context.mock.timers.enable({apis:['Date'],now:Date.parse('2030-01-07T12:00:00Z')});
 const platform=await isolatedDatabase();
 try {
  await createTestDependencies(platform.db).sampleData.seed();
  const privateValues=['synthetic-orbit-private-contact','synthetic-orbit-private-company','synthetic-orbit-private-opportunity','synthetic-orbit-private-signal','synthetic-orbit-private-draft'];
  for(const [index,table,column] of [[0,'contacts','name'],[1,'companies','name'],[2,'opportunities','title'],[3,'signals','subject'],[4,'drafts','body']] as const){
   await platform.db.prepare(`UPDATE ${table} SET ${column}=?`).bind(privateValues[index]).run();
   assert.ok((await platform.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first<{n:number}>())!.n>0,`${table} contains owner data before the public visit`);
  }
  const privateDeal=await platform.db.prepare('SELECT id FROM opportunities LIMIT 1').first<{id:string}>();
  const privateDraft=await platform.db.prepare('SELECT id FROM drafts LIMIT 1').first<{id:string}>();
  let aiRequests=0,sends=0;
  const app=createApp({database:platform.db,assets:{fetch:async()=>new Response('asset')},
   aiProvider:{provider:'synthetic-orbit-1',model:'synthetic-orbit-2',inputCostPerMillion:0,outputCostPerMillion:0,generate:async()=>{aiRequests++;throw Error('The fictional demo cannot call AI');}},
   outboundMail:{send:async()=>{sends++;throw Error('The fictional demo cannot send mail');}}});
  const before=await databaseDigest(platform.db);
  for(let visit=0;visit<2;visit++){
   const response=await app.request('https://orbit.test/api/v1/public-demo');assert.equal(response.status,200);
   const body=await response.text();for(const value of privateValues)assert.ok(!body.includes(value));
   const payload=JSON.parse(body);assert.equal(payload.example,true);assert.equal(payload.deals.length,12);
   for(const deal of payload.deals){
    assert.notEqual(deal.id,privateDeal!.id);
    assert.ok(deal.signals.length);assert.ok(deal.draft.subject);assert.ok(deal.draft.body);
    for(const item of [...deal.signals,...deal.messages,{occurredAt:deal.draft.updatedAt}]){assert.ok(Date.parse(item.occurredAt)<=Date.now());assert.ok(Date.parse(item.occurredAt)>Date.now()-30*86400000);}
   }
   assert.ok(payload.deals.some((deal:any)=>deal.messages.some((message:any)=>message.kind==='sent')&&deal.messages.some((message:any)=>message.kind==='reply')));
   assert.equal((await app.request(`https://orbit.test/api/v1/public-demo?opportunityId=${privateDeal!.id}`)).status,400);
   assert.equal((await app.request('https://orbit.test/api/v1/public-demo',{method:'POST',body:JSON.stringify({opportunityId:privateDeal!.id,draftId:privateDraft!.id,approve:true})})).status,404);
   for(const path of [`records/opportunity/${privateDeal!.id}`,`workbench/drafts/${privateDraft!.id}/approve`]){
    const response=await app.request(`https://orbit.test/api/v1/${path}`,{method:path.endsWith('approve')?'POST':'GET',headers:{Origin:'https://orbit.test','Content-Type':'application/json'},...(path.endsWith('approve')?{body:JSON.stringify({revision:1})}:{})});
    assert.equal(response.status,401,'A public demo visitor has no native record or approval authority');
   }
  }
  assert.equal(await databaseDigest(platform.db),before,'Repeated fictional reads and refused mutations preserve every owner table');
  assert.equal(aiRequests,0);assert.equal(sends,0);
  const disabled=createApp({database:platform.db,assets:{fetch:async()=>new Response('asset')},publicDemoEnabled:false});assert.equal((await disabled.request('https://orbit.test/api/v1/public-demo')).status,404);
  assert.equal(await databaseDigest(platform.db),before,'Disabling the data endpoint writes nothing');
  context.mock.timers.reset();
  await emittedDemoProof(platform,privateValues);
 } finally {context.mock.timers.reset();await platform.dispose();}
});
