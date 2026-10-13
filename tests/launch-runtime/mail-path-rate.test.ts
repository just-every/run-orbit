import assert from 'node:assert/strict';
import {test} from 'node:test';
import {generateKeyPairSync,sign} from 'node:crypto';
import {isolatedDatabase} from '../support/isolated-database';
import {emittedMailWorker} from '../support/emitted-mail-worker';
import {publicIdentity} from '../../src/core/platform/public-rate-limit';
import {signRelayBody} from '../../src/base/sendgrid-event-relay/crypto';
import {createId} from '../../src/core/shared/ids';

const relayPaths=['/api/v1/mail/events/relay','/api/v1/mail/events/%72elay','/api/v1/m%61il/%65vents/r%65l%61y','/api/%76%31/mail/events/%72%65%6c%61%79'];
const sendgridPaths=['/api/v1/mail/events/sendgrid','/api/v1/mail/events/send%67rid','/api/%76%31/%6dail/events/%73endgrid'];
const replyPaths=['/api/v1/mail/events/reply','/api/v1/mail/events/re%70ly','/api/v1/mail/%65vents/%72eply'];
const delay=(milliseconds:number)=>new Promise(resolve=>setTimeout(resolve,milliseconds));
// Reserve enough real clock time for Worker startup and a restart before rollover.
async function minuteWindow(){while(Date.now()%60000>30000)await delay(Math.min(1000,60005-Date.now()%60000));return Math.floor(Date.now()/60000);}

test('emitted Worker assigns every served encoded provider route to its cryptographically verified quota',async()=>{
 const fixture=await isolatedDatabase(),secret=crypto.randomUUID()+crypto.randomUUID(),keys=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),publicKey=keys.publicKey.export({type:'spki',format:'der'}).toString('base64');
 const worker=await emittedMailWorker(fixture.directory,{RER_MAIL_RELAY_SECRET:secret,SENDGRID_WEBHOOK_PUBLIC_KEY:publicKey,SENDGRID_PARSE_PUBLIC_KEY:publicKey});
 const ip='encoded-mail-test',caller=new Request(worker.origin,{headers:{'CF-Connecting-IP':ip}});
 async function relay(path:string,valid=true,body='[]',identity=ip){
  const timestamp=String(Math.floor(Date.now()/1000));
  return fetch(worker.origin+path,{method:'POST',headers:{'CF-Connecting-IP':identity,'x-rer-mail-timestamp':timestamp,'x-rer-mail-signature':valid?await signRelayBody(secret,timestamp,body):'forged'},body});
 }
 async function provider(path:string,body:Uint8Array|string,contentType?:string,valid=true,identity=ip){
  const timestamp=String(Math.floor(Date.now()/1000)),raw=Buffer.from(body);
  return fetch(worker.origin+path,{method:'POST',headers:{'CF-Connecting-IP':identity,...(contentType?{'Content-Type':contentType}:{}),'X-Twilio-Email-Event-Webhook-Timestamp':timestamp,'X-Twilio-Email-Event-Webhook-Signature':valid?sign('sha256',Buffer.concat([Buffer.from(timestamp),raw]),keys.privateKey).toString('base64'):'forged'},body:raw});
 }
 async function saturateGeneral(){
  const now=Date.now();for(const time of [now,now+60000,now+120000]){
   for(const [bucket,count]of [[`ingress:${Math.floor(time/60000)}`,600],[`public:${await publicIdentity(caller,time)}`,300]] as const)await fixture.db.prepare('INSERT OR REPLACE INTO public_rate_limits VALUES(?,?,?)').bind(bucket,count,time+120000).run();
  }
 }
 try{
  await saturateGeneral();await fixture.db.prepare('INSERT INTO public_rate_limits VALUES(?,?,?)').bind('expired-mail-path-check',600,Date.now()-1).run();await fixture.close();await worker.start();
  for(const path of relayPaths){assert.equal((await relay(path,false)).status,429);assert.equal((await relay(path)).status,200,'Verified relay bypasses exhausted unsigned/shared ingress');}
  for(const path of sendgridPaths){assert.equal((await provider(path,'[]',undefined,false)).status,429);assert.equal((await provider(path,'[]')).status,200);}
  for(const path of replyPaths){
   const form=new FormData();form.set('from','unmatched@customer.test');form.set('headers',`Message-ID: <${createId()}@reply.test>\r\nDate: ${new Date().toUTCString()}`);
   const request=new Request(worker.origin+path,{method:'POST',body:form}),raw=new Uint8Array(await request.arrayBuffer()),type=request.headers.get('Content-Type')!;
   assert.equal((await provider(path,raw,type,false)).status,429);assert.equal((await provider(path,raw,type)).status,200);
  }
  const mismatch=new FormData();mismatch.set('from','native@customer.test');mismatch.set('headers',`Message-ID: <${createId()}@reply.test>\r\nDate: ${new Date().toUTCString()}\r\nFrom: other@customer.test`);
  const mismatchedRequest=new Request(worker.origin+replyPaths[1],{method:'POST',body:mismatch});
  assert.equal((await provider(replyPaths[1]!,new Uint8Array(await mismatchedRequest.arrayBuffer()),mismatchedRequest.headers.get('Content-Type')!)).status,400,'A real signature spends signed quota even when sender semantics are rejected');
  // A fresh caller still sees real signature/size failures, charged only to rejected quota.
  assert.equal((await relay(relayPaths[1]!,false,'[]','fresh-encoded')).status,401);
  assert.equal((await relay(relayPaths[1]!,true,'x'.repeat(1048577),'fresh-oversize')).status,413);
  assert.equal((await provider(replyPaths[1]!,'x'.repeat(262145),'multipart/form-data',true,'fresh-reply-oversize')).status,413);
  for(const suffix of ['%2572elay','%zzrelay','%FFrelay','relay%2F','relay/','relay/extra','unknown']){
   assert.equal((await relay('/api/v1/mail/events/'+suffix)).status,429,'Unsupported paths retain the general ingress limit');
  }
  assert.equal((await fetch(worker.origin+'/api/v1/mail/events/%72elay',{headers:{'CF-Connecting-IP':ip}})).status,429,'Wrong methods retain general protection');
  assert.equal((await relay('/%61pi/v1/mail/events/relay')).status,429,'A path outside Worker API dispatch retains public protection');
  await worker.stop();await fixture.reopen();
  assert.equal((await fixture.db.prepare("SELECT sum(count) n FROM public_rate_limits WHERE bucket LIKE 'signed-mail:%'").first())!.n,relayPaths.length+sendgridPaths.length+replyPaths.length+1);
  assert.equal(await fixture.db.prepare("SELECT bucket FROM public_rate_limits WHERE bucket='expired-mail-path-check'").first(),null,'Expired rate state is removed');
  assert.equal((await fixture.db.prepare('SELECT count(*) n FROM unlinked_replies').first())!.n,replyPaths.length);

  const minute=await minuteWindow();await saturateGeneral();
  await fixture.db.prepare('INSERT OR REPLACE INTO public_rate_limits VALUES(?,?,?)').bind(`signed-mail:${minute}`,599,Date.now()+120000).run();
  await fixture.close();await worker.start();
  assert.equal((await relay(relayPaths[0]!)).status,200);
  const capped=await relay(relayPaths[1]!);assert.equal(capped.status,429);assert.ok(Number(capped.headers.get('Retry-After'))>=1&&Number(capped.headers.get('Retry-After'))<=60);
  await worker.stop();await fixture.reopen();
  assert.equal((await fixture.db.prepare('SELECT count FROM public_rate_limits WHERE bucket=?').bind(`signed-mail:${minute}`).first())!.count,601);
  await fixture.close();await worker.start();
  assert.equal((await relay(relayPaths[2]!)).status,429,'Signed quota survives actual Worker restart');
  while(Math.floor(Date.now()/60000)===minute)await delay(Math.min(1000,60005-Date.now()%60000));
  assert.equal((await relay(relayPaths[0]!)).status,200,'Actual minute rollover admits canonical verified mail');
  assert.equal((await relay(relayPaths[3]!)).status,200,'Encoded verified mail shares the fresh quota');
  assert.equal((await relay(relayPaths[1]!,false)).status,429,'Rejected traffic remains independently capped after rollover');
  await worker.stop();await fixture.reopen();
  assert.equal((await fixture.db.prepare('SELECT count FROM public_rate_limits WHERE bucket=?').bind(`signed-mail:${minute+1}`).first())!.count,2);
 }finally{await worker.stop();await fixture.dispose();}
});
