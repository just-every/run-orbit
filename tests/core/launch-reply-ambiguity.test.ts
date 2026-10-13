import assert from 'node:assert/strict';
import {test} from 'node:test';
import {launchFixture} from '../support/launch-fixture';
import {signedReplies,replyForm} from '../support/signed-reply';
import {createId} from '../../src/core/shared/ids';

test('OUT-007 all known reference opportunities retain ambiguity before sender filtering',async()=>{
 const f=await launchFixture();try{
  const a=await f.customer(),b=await f.customer(),sentA=await f.message(a.contactId,a.opportunityId,'accepted'),sentB=await f.message(b.contactId,b.opportunityId,'accepted'),scheduledA=await f.message(a.contactId,a.opportunityId),scheduledB=await f.message(b.contactId,b.opportunityId),post=signedReplies(f.db);
  const queues=(await f.db.prepare('SELECT id,queue_state,queue_reason FROM opportunities ORDER BY id').all()).results;
  for(const refs of [`${sentA.messageId} ${sentB.messageId}`,'<unknown@customer.test>']){
   assert.equal((await post(replyForm(a.email,`<${createId()}@customer.test>`,refs))).status,200);
   assert.equal((await f.db.prepare('SELECT count(*) n FROM signals').first())!.n,0);
   assert.equal((await f.db.prepare('SELECT count(*) n FROM unlinked_replies WHERE opportunity_id IS NOT NULL').first())!.n,0);
  }
  assert.deepEqual((await f.db.prepare('SELECT id,queue_state,queue_reason FROM opportunities ORDER BY id').all()).results,queues);
  for(const message of [scheduledA,scheduledB])assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(message.id).first())!.state,'scheduled');
  const sameOpportunity=await f.message(b.contactId,a.opportunityId,'accepted');
  assert.equal((await post(replyForm(a.email,`<${createId()}@customer.test>`,`${sentA.messageId} ${sameOpportunity.messageId} <unknown@customer.test>`))).status,200);
  assert.equal((await f.db.prepare('SELECT count(*) n FROM signals').first())!.n,1);
  assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(scheduledA.id).first())!.state,'cancelled');
  assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(scheduledB.id).first())!.state,'scheduled');
 }finally{await f.dispose();}
});
