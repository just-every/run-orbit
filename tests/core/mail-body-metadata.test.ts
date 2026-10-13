import assert from 'node:assert/strict';
import {test} from 'node:test';
import {isolatedDatabase} from '../support/isolated-database';
import {createMailEventRoutes} from '../../src/core/features/outreach/provider-routes';
import {mailTransportKeys,type MailKind} from '../support/mail-transport-client';

// These Fetch requests deliberately express metadata/body combinations an HTTP parser
// cannot forward intact. The emitted-Worker tests separately exercise real chunk framing.
test('SIGNAL-008 SIGNAL-009 missing malformed and understated size metadata never bypasses actual provider byte limits',async()=>{
 const fixture=await isolatedDatabase(),keys=mailTransportKeys(),app=createMailEventRoutes(fixture.db,{relaySecret:keys.bindings.RER_MAIL_RELAY_SECRET,eventKey:keys.bindings.SENDGRID_WEBHOOK_PUBLIC_KEY,parseKey:keys.bindings.SENDGRID_PARSE_PUBLIC_KEY});
 try{
  for(const kind of ['reply','relay','sendgrid'] as MailKind[]){
   const cap=kind==='reply'?262144:1048576;
   for(const declared of [undefined,'','1','1x','-1','1e9','Infinity','0009']){
    let offset=0,cancelled=false;
    const stream=new ReadableStream<Uint8Array>({pull(controller){const length=Math.min(4093,cap+1-offset);if(!length){controller.close();return;}offset+=length;controller.enqueue(new Uint8Array(length));},cancel(){cancelled=true;}});
    const headers=declared===undefined?{}:{'Content-Length':declared};
    const response=await app.request(new Request('https://orbit.test/'+kind,{method:'POST',headers,body:stream,duplex:'half'} as RequestInit));
    assert.equal(response.status,413,`${kind} with ${String(declared)} metadata`);assert.equal(cancelled,true);assert.equal(offset,cap+1);
   }
  }
  assert.equal(await fixture.db.prepare("SELECT count FROM public_rate_limits WHERE bucket LIKE 'signed-mail:%'").first(),null);
  assert.equal((await fixture.db.prepare('SELECT count(*) n FROM mail_provider_events').first())!.n,0);
  assert.equal((await fixture.db.prepare('SELECT count(*) n FROM unlinked_replies').first())!.n,0);
 }finally{await fixture.dispose();}
});

test('SIGNAL-008 a valid oversized decimal declaration is rejected before any body read while absent provider keys keep their original rejection',async()=>{
 const fixture=await isolatedDatabase();
 try{
  const app=createMailEventRoutes(fixture.db,{relaySecret:crypto.randomUUID()+crypto.randomUUID()});
  for(const declared of ['1048577','0001048577','999999999999999999999999999999999999999999999999']){
   let pulls=0;
   const stream=new ReadableStream<Uint8Array>({pull(){pulls++;}},{highWaterMark:0});
   const response=await app.request(new Request('https://orbit.test/relay',{method:'POST',headers:{'Content-Length':declared},body:stream,duplex:'half'} as RequestInit));
   assert.equal(response.status,413);assert.equal(pulls,0);
  }
  const response=await createMailEventRoutes(fixture.db,{}).request('https://orbit.test/relay',{method:'POST',headers:{'Content-Length':'999999999999'},body:'[]'});
  assert.equal(response.status,403);
  assert.equal(await fixture.db.prepare("SELECT count FROM public_rate_limits WHERE bucket LIKE 'signed-mail:%'").first(),null);
 }finally{await fixture.dispose();}
});
