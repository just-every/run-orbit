import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createApp} from '../support/app';
import {isolatedDatabase} from '../support/isolated-database';
test('PUBLIC-002 separate read-only demo has fresh stories and cannot read or mutate owner records',async()=>{
 const platform=await isolatedDatabase();try{
 const app=createApp({database:platform.db,assets:{fetch:async()=>new Response('asset')}});
 const before=await platform.db.prepare('SELECT COUNT(*) AS n FROM opportunities').first();
 const response=await app.request('https://orbit.test/api/v1/public-demo');assert.equal(response.status,200);
 const payload=await response.json() as any;assert.equal(payload.example,true);assert.ok(payload.deals.length>=10&&payload.deals.length<=15);
 for(const deal of payload.deals)for(const item of [...deal.signals,...deal.messages,{occurredAt:deal.draft.updatedAt}]){assert.ok(Date.parse(item.occurredAt)<=Date.now());assert.ok(Date.parse(item.occurredAt)>Date.now()-30*86400000);}
 assert.ok(payload.deals.some((deal:any)=>deal.messages.some((message:any)=>message.kind==='sent')&&deal.messages.some((message:any)=>message.kind==='reply')));
 assert.equal((await app.request('https://orbit.test/api/v1/public-demo?opportunityId=private')).status,400);
 assert.equal((await app.request('https://orbit.test/api/v1/public-demo',{method:'POST',body:'{}'})).status,404);
 assert.deepEqual(await platform.db.prepare('SELECT COUNT(*) AS n FROM opportunities').first(),before);
 const disabled=createApp({database:platform.db,assets:{fetch:async()=>new Response('asset')},publicDemoEnabled:false});assert.equal((await disabled.request('https://orbit.test/api/v1/public-demo')).status,404);
 }finally{await platform.dispose();}
});
