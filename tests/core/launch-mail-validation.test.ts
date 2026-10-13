import assert from 'node:assert/strict';
import {test} from 'node:test';
import {launchFixture} from '../support/launch-fixture';
import {signedReplies,replyForm} from '../support/signed-reply';
import {createId} from '../../src/core/shared/ids';
import {createMailEventRoutes} from '../../src/core/features/outreach/provider-routes';
import {signRelayBody} from '../../src/base/sendgrid-event-relay/crypto';

test('SIGNAL-009 reply authority fields reject ambiguous mailboxes and identities while retaining all thread references',async()=>{
 const f=await launchFixture();try{
  const a=await f.customer(),b=await f.customer(),sentA=await f.message(a.contactId,a.opportunityId,'accepted'),sentB=await f.message(b.contactId,b.opportunityId,'accepted'),scheduled=await f.message(a.contactId,a.opportunityId),post=signedReplies(f.db);
  const form=()=>replyForm(a.email,`<${createId()}@customer.test>`,sentA.messageId);
  for(const mutate of [
   (value:FormData)=>value.append('from','attacker@customer.test'),
   (value:FormData)=>value.append('headers','Message-ID: <another@customer.test>'),
   (value:FormData)=>value.set('headers',`${value.get('headers')}\r\nMessage-ID: <another@customer.test>`),
   (value:FormData)=>value.set('from',`"Invalid \u0001 name" <${a.email}>`),
   (value:FormData)=>value.set('from',`Invalid\u0080 <${a.email}>`)
  ]){const value=form();mutate(value);assert.equal((await post(value)).status,400);}
  for(const multipart of [false,true]){
   const value=form();if(multipart)value.append('headers',`References: ${sentB.messageId}`);else value.set('headers',`${value.get('headers')}\r\nReferences: ${sentB.messageId}`);
   assert.equal((await post(value)).status,200);
  }
  assert.equal((await f.db.prepare('SELECT count(*) n FROM signals').first())!.n,0);
  assert.equal((await f.db.prepare('SELECT count(*) n FROM unlinked_replies WHERE opportunity_id IS NOT NULL').first())!.n,0);
  assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(scheduled.id).first())!.state,'scheduled');
 }finally{await f.dispose();}
});

test('SIGNAL-009 correctly signed malformed UTF-8 JSON is rejected after exact verification without a provider receipt',async()=>{
 const f=await launchFixture();try{
  const secret=crypto.randomUUID()+crypto.randomUUID(),timestamp=String(Math.floor(Date.now()/1000)),app=createMailEventRoutes(f.db,{relaySecret:secret});
  const body=Uint8Array.from([...new TextEncoder().encode('[{"sg_event_id":"invalid-bytes","event":"open","timestamp":1,"email":"'),255,...new TextEncoder().encode('"}]')]);
  const response=await app.request('https://orbit.test/relay',{method:'POST',headers:{'x-rer-mail-timestamp':timestamp,'x-rer-mail-signature':await signRelayBody(secret,timestamp,body)},body});
  assert.equal(response.status,400);
  assert.equal((await f.db.prepare('SELECT count(*) n FROM mail_provider_events').first())!.n,0);
  assert.equal((await f.db.prepare("SELECT sum(count) n FROM public_rate_limits WHERE bucket LIKE 'signed-mail:%'").first())!.n,1);
 }finally{await f.dispose();}
});
