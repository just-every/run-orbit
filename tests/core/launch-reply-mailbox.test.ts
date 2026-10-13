import assert from 'node:assert/strict';
import {test} from 'node:test';
import {launchFixture} from '../support/launch-fixture';
import {signedReplies,replyForm} from '../support/signed-reply';
import {createId} from '../../src/core/shared/ids';

test('OUT-007 quoted display names cannot substitute for the actual signed reply mailbox',async()=>{
 const f=await launchFixture();try{
  const a=await f.customer(),sent=await f.message(a.contactId,a.opportunityId,'accepted'),scheduled=await f.message(a.contactId,a.opportunityId),post=signedReplies(f.db);
  const id=()=>`<${createId()}@customer.test>`;
  const spoof=replyForm(`"Victim <${a.email}>" <attacker@customer.test>`,id(),sent.messageId);
  spoof.set('headers',`${spoof.get('headers')}\r\nAuthentication-Results: spoof.test; dkim=pass header.from=${a.email}`);
  assert.equal((await post(spoof)).status,200);
  assert.equal((await f.db.prepare('SELECT sender FROM unlinked_replies').first())!.sender,'attacker@customer.test');
  assert.equal((await f.db.prepare('SELECT opportunity_id FROM unlinked_replies').first())!.opportunity_id,null);
  assert.equal((await f.db.prepare('SELECT count(*) n FROM signals').first())!.n,0);
  assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(scheduled.id).first())!.state,'scheduled');
  for(const malformed of [`attacker@customer.test <${a.email}>`,`<${a.email}>, <attacker@customer.test>`,`"Broken <${a.email}>`,`<${a.email}> <attacker@customer.test>`,`<${a.email}> trailing`])assert.equal((await post(replyForm(malformed,id(),sent.messageId))).status,400);
  for(const legitimate of [`Customer <${a.email.toUpperCase()}>`,`"Customer, with \\"quoted\\" name" <${a.email}>`,a.email]){
   assert.equal((await post(replyForm(legitimate,id(),sent.messageId))).status,200);
  }
  assert.equal((await f.db.prepare('SELECT count(*) n FROM signals').first())!.n,3);
  assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(scheduled.id).first())!.state,'cancelled');
 }finally{await f.dispose();}
});
