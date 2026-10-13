import assert from 'node:assert/strict';
import {test} from 'node:test';
import {launchFixture} from '../support/launch-fixture';
import {signedReplies,replyForm} from '../support/signed-reply';
import {createId} from '../../src/core/shared/ids';
import {archiveHash} from '../../src/core/features/records/archive-schema';

test('OUT-004 OUT-007 signed form and raw From authority must agree without duplicate mailboxes',async()=>{
 const f=await launchFixture();try{
  const a=await f.customer(),b=await f.customer(),sent=await f.message(a.contactId,a.opportunityId,'accepted'),scheduled=await f.message(a.contactId,a.opportunityId),post=signedReplies(f.db);
  const foreign='visitor@elsewhere.test';
  const snapshot=async()=>archiveHash(await Promise.all(['signals','signal_links','timeline_entries','drafts','outbound_messages','opportunities','unlinked_replies','mail_provider_events'].map(async table=>(await f.db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()).results)));
  const before=await snapshot();
  const cases:[string,string[]][]=[
   [a.email,[foreign]],[foreign,[a.email]],[a.email,[b.email]],
   [a.email,[a.email,foreign]],[a.email,[foreign,a.email]],
   [foreign,[a.email,foreign]],[a.email,[a.email,a.email]],
   [a.email,[`${a.email}, ${foreign}`]],[a.email,[`<${foreign}>, <${a.email}>`]],
   [a.email,['']],[a.email,[`"Unclosed <${a.email}>`]],
  ];
  for(const [sender,rawSenders] of cases)for(const inline of [false,true]){
   const form=replyForm(sender,`<${createId()}@reply.test>`,sent.messageId);
   const lines=rawSenders.map((raw,i)=>`${i%2?'fRoM':'From'}: ${raw}`);
   if(inline)form.set('headers',`${form.get('headers')}\r\n${lines.join('\r\n')}`);
   else for(const line of lines)form.append('headers',line);
   assert.equal((await post(form)).status,400,'Ambiguous signed sender authority is rejected');
   assert.equal(await snapshot(),before,'No receipt or business effect from rejected sender authority');
  }
  for(const line of [`From : ${foreign}`,`From\t: ${foreign}`,`From ${foreign}`,` From: ${foreign}`,`From\u0000: ${foreign}`]){
   const form=replyForm(a.email,`<${createId()}@reply.test>`,sent.messageId);form.append('headers',line);
   assert.equal((await post(form)).status,400,'Malformed raw sender authority cannot be treated as absent');
   assert.equal(await snapshot(),before);
  }
  for(const extra of ['from','Message-ID','Date']){
   const form=replyForm(a.email,`<${createId()}@reply.test>`,sent.messageId);
   if(extra==='from')form.append('from',a.email);else form.append('headers',`${extra}: ${extra==='Date'?'Thu, 08 Oct 2026 06:00:00 GMT':'<extra@reply.test>'}`);
   assert.equal((await post(form)).status,400);assert.equal(await snapshot(),before);
  }
  const agreement=replyForm(`"Native customer" <${a.email.toUpperCase()}>`,`<${createId()}@reply.test>`,sent.messageId);
  agreement.append('headers',`From: Native customer <${a.email}>\r\nReferences: <unseen@reply.test>\r\nIn-Reply-To: ${sent.messageId}`);
  assert.equal((await post(agreement)).status,200);assert.equal((await post(agreement)).status,200);
  assert.equal((await f.db.prepare('SELECT count(*) n FROM signals').first())!.n,1);
  assert.equal((await f.db.prepare('SELECT count(*) n FROM mail_provider_events').first())!.n,1);
  assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(scheduled.id).first())!.state,'cancelled');
  assert.equal((await post(replyForm(a.email,`<${createId()}@reply.test>`,sent.messageId))).status,200,'Provider forms without raw From remain supported');
  const foreignAgreement=replyForm(foreign,`<${createId()}@reply.test>`,sent.messageId);foreignAgreement.append('headers',`From: Visitor <${foreign}>`);
  assert.equal((await post(foreignAgreement)).status,200);
  assert.equal((await f.db.prepare('SELECT count(*) n FROM signals').first())!.n,2);
  assert.equal((await f.db.prepare('SELECT count(*) n FROM unlinked_replies WHERE opportunity_id IS NULL').first())!.n,1);
 }finally{await f.dispose();}
});
