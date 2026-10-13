import assert from 'node:assert/strict';
import {test} from 'node:test';
import {isolatedDatabase} from '../support/isolated-database';
import {createMailEventRoutes} from '../../src/core/features/outreach/provider-routes';
import {signRelayBody} from '../../src/base/sendgrid-event-relay/crypto';

test('SIGNAL-009 relay authenticates exact bytes and tampering spends only rejected quota',async()=>{
 const f=await isolatedDatabase();try{
  const secret=crypto.randomUUID()+crypto.randomUUID(),app=createMailEventRoutes(f.db,{relaySecret:secret}),timestamp=String(Math.floor(Date.now()/1000));
  async function post(raw:Uint8Array, signed=raw){return app.request('https://orbit.test/relay',{method:'POST',headers:{'CF-Connecting-IP':'relay-byte-check','x-rer-mail-timestamp':timestamp,'x-rer-mail-signature':await signRelayBody(secret,timestamp,signed)},body:raw});}
  const plain=new TextEncoder().encode('[]'),bom=Uint8Array.from([239,187,191,...plain]);
  const replacement=new TextEncoder().encode('[{"sg_event_id":"bytes","event":"open","timestamp":1,"email":"\ufffd"}]');
  const bad=Uint8Array.from([...new TextEncoder().encode('[{"sg_event_id":"bytes","event":"open","timestamp":1,"email":"'),255,...new TextEncoder().encode('"}]')]);
  assert.equal((await post(plain)).status,200);
  assert.equal((await post(bom,plain)).status,401);
  assert.equal((await post(bad,replacement)).status,401);
  assert.equal((await post(replacement)).status,200);
  const buckets=(await f.db.prepare('SELECT bucket,count FROM public_rate_limits').all<{bucket:string;count:number}>()).results;
  assert.equal(buckets.filter(r=>r.bucket.startsWith('signed-mail:')).reduce((n,r)=>n+r.count,0),2);
  assert.equal(buckets.filter(r=>r.bucket.startsWith('public:')).reduce((n,r)=>n+r.count,0),2);
 }finally{await f.dispose();}
});
