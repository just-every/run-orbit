import assert from 'node:assert/strict';
import {test} from 'node:test';
import {isolatedDatabase} from '../support/isolated-database';
import {publicRateLimit} from '../../src/core/platform/public-rate-limit';
test('delegation token and bearer public namespace obeys durable public request limits',async()=>{
 const fixture=await isolatedDatabase();try{
  const now=Date.now(),request=new Request('https://orbit.test/api/delegation/v1/token',{method:'POST',headers:{'CF-Connecting-IP':'192.0.2.1'}});
  for(let i=0;i<300;i++)assert.equal(await publicRateLimit(fixture.db,request,now),undefined);
  const denied=await publicRateLimit(fixture.db,new Request('https://orbit.test/api/delegation/v1/identity',{headers:{'CF-Connecting-IP':'192.0.2.1'}}),now);assert.equal(denied?.status,429);
  assert.equal(await publicRateLimit(fixture.db,request,now+60000),undefined);
 }finally{await fixture.dispose();}
});
