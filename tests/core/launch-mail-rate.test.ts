import assert from 'node:assert/strict';
import {test} from 'node:test';
import {isolatedDatabase} from '../support/isolated-database';
import {createMailEventRoutes} from '../../src/core/features/outreach/provider-routes';
import {signRelayBody} from '../../src/base/sendgrid-event-relay/crypto';
import {publicRateLimit,publicIdentity} from '../../src/core/platform/public-rate-limit';
import {signedMailRateLimit} from '../../src/core/platform/mail-event-rate-limit';

test('BASE-ACCESS-003 SIGNAL-009 verified mail quota is durable, bounded, shared and independent of unsigned ingress with minute rollover',async context=>{
 const fixture=await isolatedDatabase();try{
  context.mock.timers.enable({apis:['Date'],now:Date.now()});
  const db=fixture.db,secret=crypto.randomUUID()+crypto.randomUUID(),app=createMailEventRoutes(db,{relaySecret:secret}),now=Date.now(),minute=Math.floor(now/60000),timestamp=String(Math.floor(now/1000)),body='[]',signature=await signRelayBody(secret,timestamp,body);
  const request=new Request('https://orbit.test/api/v1/mail/events/relay',{method:'POST',headers:{'CF-Connecting-IP':'test-caller'}}),identity=await publicIdentity(request,now);
  await db.batch([db.prepare('INSERT INTO public_rate_limits VALUES(?,?,?)').bind(`ingress:${minute}`,600,now+120000),db.prepare('INSERT INTO public_rate_limits VALUES(?,?,?)').bind(`public:${identity}`,300,now+120000)]);
  assert.equal(await publicRateLimit(db,request,now),undefined,'The Worker defers bucket selection to actual verification');
  const post=(sig=signature,payload=body)=>app.request('https://orbit.test/relay',{method:'POST',headers:{'CF-Connecting-IP':'test-caller','x-rer-mail-timestamp':timestamp,'x-rer-mail-signature':sig},body:payload});
  assert.equal((await post('forged')).status,429);assert.equal(await db.prepare('SELECT bucket FROM public_rate_limits WHERE bucket=?').bind(`signed-mail:${minute}`).first(),null);
  assert.equal((await post()).status,200);assert.equal((await db.prepare('SELECT count FROM public_rate_limits WHERE bucket=?').bind(`signed-mail:${minute}`).first())!.count,1);
  await db.prepare('UPDATE public_rate_limits SET count=600 WHERE bucket=?').bind(`signed-mail:${minute}`).run();const capped=await post();assert.equal(capped.status,429);assert.ok(capped.headers.get('Retry-After'));
  const another=createMailEventRoutes(db,{relaySecret:secret});assert.equal((await another.request('https://orbit.test/relay',{method:'POST',headers:{'x-rer-mail-timestamp':timestamp,'x-rer-mail-signature':signature},body})).status,429);
  assert.equal(await signedMailRateLimit(db,now+60000),undefined);assert.equal((await db.prepare('SELECT count FROM public_rate_limits WHERE bucket=?').bind(`signed-mail:${minute+1}`).first())!.count,1);
  const missing=createMailEventRoutes(db,{});assert.equal((await missing.request('https://orbit.test/sendgrid',{method:'POST',headers:{'CF-Connecting-IP':'fresh-caller'}})).status,403);
  const invalid=createMailEventRoutes(db,{relaySecret:secret});assert.equal((await invalid.request('https://orbit.test/relay',{method:'POST',headers:{'CF-Connecting-IP':'fresh-caller','x-rer-mail-timestamp':timestamp,'x-rer-mail-signature':'forged'},body})).status,401);
  assert.equal((await invalid.request('https://orbit.test/relay',{method:'POST',headers:{'CF-Connecting-IP':'fresh-caller','x-rer-mail-timestamp':timestamp,'x-rer-mail-signature':signature},body:'x'.repeat(1048577)})).status,413);
 }finally{context.mock.timers.reset();await fixture.dispose();}
});
