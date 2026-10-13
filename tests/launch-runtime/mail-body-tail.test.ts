import assert from 'node:assert/strict';
import {test} from 'node:test';
import {isolatedDatabase} from '../support/isolated-database';
import {emittedMailWorker} from '../support/emitted-mail-worker';
import {mailBody,mailTransportClient,mailTransportKeys,type MailKind} from '../support/mail-transport-client';

test('emitted Worker rejects an over-limit unknown-length upload with a stalled tail and remains healthy',async t=>{
 const fixture=await isolatedDatabase(),keys=mailTransportKeys(),worker=await emittedMailWorker(fixture.directory,keys.bindings),client=mailTransportClient(worker.origin);
 try{
  await fixture.close();await worker.start();
  for(const kind of ['relay','reply','sendgrid'] as MailKind[]){
   const cap=kind==='reply'?262144:1048576,{body,type}=mailBody(kind,cap+1),path='/api/v1/mail/events/'+kind;
   const rejected=await client.send(path,{...await keys.headers(kind,body,'stalled-'+kind),'Content-Type':type},[body.subarray(0,cap),body.subarray(cap)],'stall');
   t.diagnostic(`${kind}: ${JSON.stringify(rejected)}`);assert.equal(rejected.status,413);
   const valid=mailBody(kind),accepted=await client.send(path,{...await keys.headers(kind,valid.body,'valid-'+kind),'Content-Type':valid.type,'Content-Length':String(valid.body.length)},[valid.body]);
   assert.equal(accepted.status,200,JSON.stringify(accepted));
  }
  await worker.stop();await fixture.reopen();
  assert.equal((await fixture.db.prepare("SELECT sum(count) n FROM public_rate_limits WHERE bucket LIKE 'signed-mail:%'").first())!.n,3);
  assert.equal((await fixture.db.prepare('SELECT count(*) n FROM unlinked_replies').first())!.n,1);
 }finally{client.close();await worker.stop();await fixture.dispose();}
});

test('emitted Worker rejects large declared mail bodies before waiting for their first byte',async t=>{
 const fixture=await isolatedDatabase(),keys=mailTransportKeys(),worker=await emittedMailWorker(fixture.directory,keys.bindings),client=mailTransportClient(worker.origin);
 try{
  await fixture.close();await worker.start();
  for(const kind of ['reply','sendgrid','relay'] as MailKind[]){
   const path='/api/v1/mail/events/'+kind;
   for(const length of [String((kind==='reply'?262144:1048576)+1),'2147483648']){
    const rejected=await client.send(path,{'Content-Length':length,'CF-Connecting-IP':'header-only-'+kind},[],'stall');
    t.diagnostic(`${kind} declared ${length}: ${JSON.stringify(rejected)}`);assert.equal(rejected.status,413);
    const valid=mailBody(kind),accepted=await client.send(path,{...await keys.headers(kind,valid.body,'valid-header-'+kind),'Content-Type':valid.type,'Content-Length':String(valid.body.length)},[valid.body]);
    assert.equal(accepted.status,200,JSON.stringify(accepted));
   }
  }
  await worker.stop();await fixture.reopen();
  assert.equal((await fixture.db.prepare("SELECT sum(count) n FROM public_rate_limits WHERE bucket LIKE 'signed-mail:%'").first())!.n,6);
  assert.equal((await fixture.db.prepare('SELECT count(*) n FROM unlinked_replies').first())!.n,2);
 }finally{client.close();await worker.stop();await fixture.dispose();}
});

test('emitted Worker preserves a delayed response during continuing over-limit uploads beyond the native drain grace',async t=>{
 const {continuingHttpUpload}=await import('../support/continuing-http-upload');
 const fixture=await isolatedDatabase(),keys=mailTransportKeys(),worker=await emittedMailWorker(fixture.directory,keys.bindings),client=mailTransportClient(worker.origin);
 try{
  await fixture.close();await worker.start();
  for(const kind of ['sendgrid','relay','reply'] as MailKind[]){
   const cap=kind==='reply'?262144:1048576,path='/api/v1/mail/events/'+kind;
   const {body}=mailBody(kind,cap+1);
   const rejected=await continuingHttpUpload(worker.origin+path,{'CF-Connecting-IP':'continuing-'+kind},body);
   t.diagnostic(`${kind}: ${JSON.stringify(rejected)}`);assert.equal(rejected.status,413);assert.equal(rejected.complete,true);assert.equal(rejected.category,'body-limit');assert.ok(rejected.sent>cap+65536,'The client continued beyond the native 64 KiB drain allowance');
   const valid=mailBody(kind),accepted=await client.send(path,{...await keys.headers(kind,valid.body,'after-continuing-'+kind),'Content-Type':valid.type,'Content-Length':String(valid.body.length)},[valid.body]);
   assert.equal(accepted.status,200,JSON.stringify(accepted));
  }
  await worker.stop();await fixture.reopen();
  assert.equal((await fixture.db.prepare("SELECT sum(count) n FROM public_rate_limits WHERE bucket LIKE 'signed-mail:%'").first())!.n,3);
  assert.equal((await fixture.db.prepare('SELECT count(*) n FROM unlinked_replies').first())!.n,1);
 }finally{client.close();await worker.stop();await fixture.dispose();}
});
