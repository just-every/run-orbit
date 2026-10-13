import assert from 'node:assert/strict';
import {test} from 'node:test';
import {isolatedDatabase} from '../support/isolated-database';
import {emittedMailWorker} from '../support/emitted-mail-worker';
import {mailBody,mailTransportClient,mailTransportKeys,type MailKind} from '../support/mail-transport-client';
import {publicIdentity} from '../../src/core/platform/public-rate-limit';

const kinds:MailKind[]=['relay','sendgrid','reply'];
const paths={relay:'/api/v1/mail/events/%72elay',sendgrid:'/api/%76%31/mail/events/send%67rid',reply:'/api/v1/mail/%65vents/re%70ly'};

test('emitted Worker preserves bounded mail transport and durable quota isolation after declared and chunked oversize bodies',async t=>{
 const fixture=await isolatedDatabase(),keys=mailTransportKeys(),worker=await emittedMailWorker(fixture.directory,keys.bindings),client=mailTransportClient(worker.origin);
 const exhausted='transport-exhausted-'+crypto.randomUUID(),fresh='transport-fresh-'+crypto.randomUUID();
 let signed=0,rejected=0,replies=0;
 async function post(kind:MailKind,body:Uint8Array,type:string,chunked:boolean,identity=fresh){
  const headers={...await keys.headers(kind,body,identity),'Content-Type':type,...(!chunked?{'Content-Length':String(body.length)}:{})};
  // The byte across the boundary is a separate HTTP chunk.
  return client.send(paths[kind],headers,chunked?[body.subarray(0,body.length-1),body.subarray(body.length-1)]:[body]);
 }
 async function healthy(kind:MailKind){
  const health=await fetch(worker.origin+'/health');assert.equal(health.status,200);await health.arrayBuffer();
  const unsupported=await client.send('/api/v1/mail/events/unknown',{'CF-Connecting-IP':exhausted},[Buffer.from('[]')]);t.diagnostic('general response '+JSON.stringify(unsupported));assert.equal(unsupported.status,429,JSON.stringify(unsupported));
  const {body,type}=mailBody(kind),accepted=await post(kind,body,type,true,exhausted);assert.equal(accepted.status,200,JSON.stringify(accepted));signed++;if(kind==='reply')replies++;
 }
 try{
  const now=Date.now();
  for(const time of [now,now+60000,now+120000]){
   await fixture.db.prepare('INSERT INTO public_rate_limits VALUES(?,?,?)').bind(`ingress:${Math.floor(time/60000)}`,600,time+120000).run();
   await fixture.db.prepare('INSERT INTO public_rate_limits VALUES(?,?,?)').bind(`public:${await publicIdentity(new Request(worker.origin,{headers:{'CF-Connecting-IP':exhausted}}),time)}`,300,time+120000).run();
  }
  await fixture.close();await worker.start();
  await healthy('relay');
  for(const kind of kinds){
   const cap=kind==='reply'?262144:1048576;
   for(const chunked of [false,true]){
    for(const size of [cap-1,cap,cap+1]){
     const {body,type}=mailBody(kind,size),result=await post(kind,body,type,chunked);
     t.diagnostic(`${kind} ${chunked?'chunked':'declared'} ${size}: ${result.status} ${result.category}`);
     assert.equal(result.status,size>cap?413:200,JSON.stringify(result));
     if(size>cap){rejected++;await healthy(kind);}else{signed++;if(kind==='reply')replies++;}
    }
    const {body,type}=mailBody(kind,cap+1),result=await post(kind,body,type,chunked,exhausted);
    assert.equal(result.status,429,JSON.stringify(result));assert.ok(Number(result.retryAfter)>=1&&Number(result.retryAfter)<=60);
    await healthy(kind);
   }
  }
  // Stop only after the uninterrupted same-process requests; then inspect native persisted D1.
  await worker.stop();await fixture.reopen();
  assert.equal((await fixture.db.prepare("SELECT sum(count) n FROM public_rate_limits WHERE bucket LIKE 'signed-mail:%'").first())!.n,signed);
  let freshRejected=0;for(const time of [now,now+60000,now+120000]){
   const row=await fixture.db.prepare('SELECT count FROM public_rate_limits WHERE bucket=?').bind(`public:${await publicIdentity(new Request(worker.origin,{headers:{'CF-Connecting-IP':fresh}}),time)}`).first<{count:number}>();freshRejected+=row?.count??0;
  }
  assert.equal(freshRejected,rejected);
  assert.equal((await fixture.db.prepare('SELECT count(*) n FROM mail_provider_events').first())!.n,replies);
  assert.equal((await fixture.db.prepare('SELECT count(*) n FROM signals').first())!.n,0);
  assert.equal((await fixture.db.prepare('SELECT count(*) n FROM unlinked_replies').first())!.n,replies);
 }finally{client.close();await worker.stop();await fixture.dispose();}
});
