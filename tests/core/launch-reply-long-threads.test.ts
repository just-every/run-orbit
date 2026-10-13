import assert from 'node:assert/strict';
import {test} from 'node:test';
import {launchFixture} from '../support/launch-fixture';
import {signedReplies,replyForm} from '../support/signed-reply';
import {createId} from '../../src/core/shared/ids';
import {archiveHash} from '../../src/core/features/records/archive-schema';

test('OUT-004 OUT-007 every reference in a bounded long signed reply participates in global opportunity ambiguity',async()=>{
 const f=await launchFixture();try{
  const a=await f.customer(),b=await f.customer(),sentA=await f.message(a.contactId,a.opportunityId,'accepted'),sentB=await f.message(b.contactId,b.opportunityId,'accepted'),scheduledA=await f.message(a.contactId,a.opportunityId),scheduledB=await f.message(b.contactId,a.opportunityId),post=signedReplies(f.db);
  const snapshot=async()=>archiveHash(await Promise.all(['signals','signal_links','timeline_entries','drafts','outbound_messages','opportunities'].map(async table=>(await f.db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()).results)));
  const before=await snapshot();
  let held=0;
  for(const count of [137,563,7901]){
   const unknown=Array.from({length:count},(_,i)=>`<thread-${i}@unknown.test>`);
   const form=replyForm(a.email,`<${createId()}@reply.test>`,`${sentA.messageId} ${unknown.join(' ')} ${sentA.messageId}`);
   form.append('headers',`References: ${unknown[0]} ${sentB.messageId}`);
   assert.ok((await new Request('https://orbit.test',{method:'POST',body:form}).arrayBuffer()).byteLength<262144);
   assert.equal((await post(form)).status,200,'A contradictory known opportunity at the end is held');
   assert.equal((await post(form)).status,200,'Long held replies replay durably');held++;
   assert.equal((await f.db.prepare('SELECT count(*) n FROM unlinked_replies WHERE opportunity_id IS NULL').first())!.n,held);
   assert.equal((await f.db.prepare('SELECT count(*) n FROM mail_provider_events').first())!.n,held);
   assert.equal(await snapshot(),before,'Held replies produce no customer business effects');
  }
  const known=[sentA.messageId];
  for(let i=0;i<139;i++)known.push((await f.message(i%2?a.contactId:b.contactId,a.opportunityId,'accepted')).messageId);
  const unknown=Array.from({length:877},(_,i)=>`<other-${i}@unknown.test>`);
  const form=replyForm(a.email,`<${createId()}@reply.test>`,[...unknown,...known,...known].join(' '));
  const beforeFailure=await snapshot();
  await f.db.prepare("CREATE TRIGGER long_reply_failure BEFORE INSERT ON unlinked_replies BEGIN SELECT RAISE(ABORT,'Reply storage unavailable'); END").run();
  assert.equal((await post(form)).status,503,'Storage failure never acknowledges the signed reply');
  assert.equal((await f.db.prepare('SELECT count(*) n FROM mail_provider_events').first())!.n,held);
  assert.equal(await snapshot(),beforeFailure,'Receipt, signal, queue, timeline and cancellation roll back together');
  await f.db.prepare('DROP TRIGGER long_reply_failure').run();
  assert.equal((await post(form)).status,200);assert.equal((await post(form)).status,200);
  assert.equal((await f.db.prepare('SELECT count(*) n FROM signals').first())!.n,1);
  assert.equal((await f.db.prepare('SELECT count(*) n FROM mail_provider_events').first())!.n,held+1);
  assert.equal((await f.db.prepare('SELECT count(*) n FROM unlinked_replies WHERE opportunity_id=?').bind(a.opportunityId).first())!.n,1);
  assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(scheduledA.id).first())!.state,'cancelled');
  assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(scheduledB.id).first())!.state,'scheduled');
 }finally{await f.dispose();}
});
