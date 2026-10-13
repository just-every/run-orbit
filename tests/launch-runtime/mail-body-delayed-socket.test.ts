import assert from 'node:assert/strict';
import {test} from 'node:test';
import {isolatedDatabase} from '../support/isolated-database';
import {emittedMailWorker} from '../support/emitted-mail-worker';
import {delayedMailSocket} from '../support/delayed-mail-socket';
import {mailBody,mailTransportClient,mailTransportKeys,type MailKind} from '../support/mail-transport-client';

test('emitted Worker returns a complete rejection when a continuing raw TCP client delays all response reads beyond one second',async t=>{
 const fixture=await isolatedDatabase(),keys=mailTransportKeys(),worker=await emittedMailWorker(fixture.directory,keys.bindings),client=mailTransportClient(worker.origin);
 try{
  await fixture.close();await worker.start();
  for(const kind of ['sendgrid','relay','reply'] as MailKind[]){
   const cap=kind==='reply'?262144:1048576,path='/api/v1/mail/events/'+kind;
   const rejected=await delayedMailSocket(worker.origin+path,'delayed-tcp-'+kind,mailBody(kind,cap+1).body);
   t.diagnostic(JSON.stringify({kind,status:rejected.status,sent:rejected.sent,elapsed:rejected.elapsed,readDelay:rejected.readDelay}));
   assert.equal(rejected.status,413);
   assert.equal(JSON.parse(rejected.body.toString()).error,'Mail event exceeds payload limit.');
   assert.ok(rejected.sent>cap+65536);
   assert.ok(rejected.elapsed>=rejected.readDelay);
   const health=await fetch(worker.origin+'/health');assert.equal(health.status,200);await health.arrayBuffer();
   const valid=mailBody(kind),accepted=await client.send(path,{...await keys.headers(kind,valid.body,'after-delayed-'+kind),'Content-Type':valid.type},[valid.body]);
   assert.equal(accepted.status,200);
  }
  await worker.stop();await fixture.reopen();
  assert.equal((await fixture.db.prepare("SELECT sum(count) n FROM public_rate_limits WHERE bucket LIKE 'signed-mail:%'").first())!.n,3);
  assert.equal((await fixture.db.prepare('SELECT count(*) n FROM mail_provider_events').first())!.n,1);
  assert.equal((await fixture.db.prepare('SELECT count(*) n FROM unlinked_replies').first())!.n,1);
  assert.equal((await fixture.db.prepare('SELECT count(*) n FROM signals').first())!.n,0);
 }finally{client.close();await worker.stop();await fixture.dispose();}
});
