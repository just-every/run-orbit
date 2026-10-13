import assert from 'node:assert/strict';
import {test} from 'node:test';
import {launchFixture} from '../support/launch-fixture';
import {signedReplies,replyForm} from '../support/signed-reply';
import {createId} from '../../src/core/shared/ids';

test('OUT-004 OUT-007 balanced mailbox comments preserve native replies while quoted and commented addresses confer no authority',async()=>{
 const f=await launchFixture();try{
  const a=await f.customer(),sent=await f.message(a.contactId,a.opportunityId,'accepted'),scheduled=await f.message(a.contactId,a.opportunityId),post=signedReplies(f.db),id=()=>`<${createId()}@reply.test>`;
  const foreign='outsider@elsewhere.test';
  const spoofs=[
   `External (Contact <${a.email}>) <${foreign}>`,
   `(nested ("<${a.email}>")) ${foreign}`,
   `"Contact (<${a.email}>)" <${foreign}>`,
   `External (escaped \\) <${a.email}>) <${foreign}>`,
  ];
  for(const from of spoofs){
   const form=replyForm(from,id(),sent.messageId);form.append('headers',`From: ${foreign}`);
   assert.equal((await post(form)).status,200);
  }
  assert.equal((await f.db.prepare('SELECT count(*) n FROM unlinked_replies WHERE sender=? AND opportunity_id IS NULL').bind(foreign).first())!.n,spoofs.length);
  assert.equal((await f.db.prepare('SELECT count(*) n FROM signals').first())!.n,0);
  assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(scheduled.id).first())!.state,'scheduled');
  const malformed=[
   `Client (open <${a.email}>`,`Client (nested (open) <${a.email}>`,
   `Client ) <${a.email}>`,`"Unfinished <${a.email}>`,`Client (unfinished escape\\`,
   `${foreign} (comment) <${a.email}>`,`(comment) <${a.email}>, ${foreign}`,
   `Team: ${a.email};`,`Client <${a.email}> trailing (comment)`,
   `(only <${a.email}>)`,`Client (comment) <${a.email}> <${foreign}>`,
   `Client (bad\u0001) <${a.email}>`,`Client (bad\u0085) <${a.email}>`,
   a.email.replace('@',' (comment) break@'),
  ];
  for(const from of malformed)assert.equal((await post(replyForm(from,id(),sent.messageId))).status,400,'Malformed or multiple mailbox syntax is rejected');
  assert.equal((await f.db.prepare('SELECT count(*) n FROM mail_provider_events').first())!.n,spoofs.length);
  const [local,domain]=a.email.split('@');
  const legitimate=[
   `Customer (billing team) <${a.email}>`,
   `(outer (inner \\(literal\\))) Zoë 李 <${a.email}> (after)`,
   `"Miyuki \\"Accounts\\" 李" (finance) <${a.email}>`,
   `(quoted "<${foreign}>") Customer <${a.email}>`,
   `Customer <(before) ${a.email} (after)>`,
   `(before) ${a.email} (after)`,
   `${local}(local note)@(domain note)${domain}`,
   `"Name (<${foreign}>)" <${a.email}> (after)`,
  ];
  for(const from of legitimate){
   const form=replyForm(from,id(),sent.messageId);form.append('headers',`From: ${from}`);
   assert.equal((await post(form)).status,200,'One actual native mailbox with valid display comments is accepted');
  }
  assert.equal((await f.db.prepare('SELECT count(*) n FROM signals').first())!.n,legitimate.length);
  assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(scheduled.id).first())!.state,'cancelled');
 }finally{await f.dispose();}
});
