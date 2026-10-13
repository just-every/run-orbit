import {TestDataRepository} from '../support/record-data';
import {OutreachRepository} from '../../src/core/features/workbench/outreach-repository';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {generateKeyPairSync,sign} from 'node:crypto';
import {launchFixture} from '../support/launch-fixture';
import {createMailEventRoutes} from '../../src/core/features/outreach/provider-routes';
import {createId} from '../../src/core/shared/ids';

test('OUT-004 OUT-007 DATA-002 signed reply headers cannot impersonate another contact; normalized legitimate threads apply once to their sender only',async()=>{
 const f=await launchFixture();try{
  const a=await f.customer(),b=await f.customer(),sentA=await f.message(a.contactId,a.opportunityId,'accepted'),sentB=await f.message(b.contactId,a.opportunityId,'accepted'),scheduledA=await f.message(a.contactId,a.opportunityId),scheduledB=await f.message(b.contactId,a.opportunityId);
  await f.db.prepare('INSERT INTO opportunity_contacts VALUES(?,?,0,?)').bind(a.opportunityId,b.contactId,new Date().toISOString()).run();
  const outreach=new OutreachRepository(f.db),draftA=await outreach.createDraft(a.opportunityId,{contactId:a.contactId,subject:'A followup',body:'Review A'},f.actor),draftB=await outreach.createDraft(b.opportunityId,{contactId:b.contactId,subject:'B followup',body:'Review B'},f.actor);
  const keys=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),app=createMailEventRoutes(f.db,{parseKey:keys.publicKey.export({type:'spki',format:'der'}).toString('base64')});
  const replyDate=new Date().toUTCString();
  async function post(sender:string,id:string,bodyText='Actual reply text'){const form=new FormData();form.set('from',sender);form.set('subject','Customer reply');form.set('text',bodyText);form.set('headers',`Message-ID: <${id}@customer.test>\r\nDate: ${replyDate}\r\nReferences: ${sentA.messageId}\r\n ${sentB.messageId}\r\nIn-Reply-To: ${sentA.messageId}\r\nAuthentication-Results: attacker.test; dkim=pass header.from=${a.email}`);
   const request=new Request('https://orbit.test/reply',{method:'POST',body:form}),raw=Buffer.from(await request.arrayBuffer()),timestamp=String(Math.floor(Date.now()/1000)),signature=sign('sha256',Buffer.concat([Buffer.from(timestamp),raw]),keys.privateKey).toString('base64');
   return app.request(request.url,{method:'POST',headers:{'Content-Type':request.headers.get('Content-Type')!,'X-Twilio-Email-Event-Webhook-Timestamp':timestamp,'X-Twilio-Email-Event-Webhook-Signature':signature},body:raw});
  }
  const before=await f.db.prepare('SELECT queue_state,queue_reason FROM opportunities WHERE id=?').bind(a.opportunityId).first();
  assert.equal((await post('Spurious <someone-else@customer.test>',createId(),'Spurious reply body')).status,200);
  assert.equal((await f.db.prepare('SELECT COUNT(*) n FROM signals').first())!.n,0);assert.deepEqual(await f.db.prepare('SELECT queue_state,queue_reason FROM opportunities WHERE id=?').bind(a.opportunityId).first(),before);
  for(const message of [scheduledA,scheduledB])assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(message.id).first())!.state,'scheduled');
  for(const draft of [draftA,draftB])assert.equal((await f.db.prepare('SELECT is_stale FROM drafts WHERE id=?').bind(draft.id).first())!.is_stale,0);
  assert.equal((await f.db.prepare('SELECT opportunity_id FROM unlinked_replies').first())!.opportunity_id,null);
  const replyId=createId();await f.db.prepare("CREATE TRIGGER test_reply_failure BEFORE INSERT ON unlinked_replies BEGIN SELECT RAISE(ABORT,'Injected reply persistence failure'); END").run();
  assert.equal((await post(`Customer <${a.email.toUpperCase()}>`,replyId)).status,503);assert.equal((await f.db.prepare('SELECT count(*) n FROM signals').first())!.n,0);assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(scheduledA.id).first())!.state,'scheduled');await f.db.prepare('DROP TRIGGER test_reply_failure').run();
  assert.deepEqual((await Promise.all([post(`Customer <${a.email.toUpperCase()}>`,replyId),post(`Customer <${a.email.toUpperCase()}>`,replyId)])).map(response=>response.status),[200,200]);
  assert.equal((await post(`Customer <${a.email.toUpperCase()}>`,replyId,'Conflicting replacement body')).status,200);assert.equal((await f.db.prepare('SELECT count(*) n FROM mail_provider_conflicts').first())!.n,1);
  assert.equal((await f.db.prepare('SELECT COUNT(*) n FROM signals').first())!.n,1);
  assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(scheduledA.id).first())!.state,'cancelled');assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(scheduledB.id).first())!.state,'scheduled');
  assert.equal((await f.db.prepare('SELECT is_stale FROM drafts WHERE id=?').bind(draftA.id).first())!.is_stale,1);assert.equal((await f.db.prepare('SELECT is_stale FROM drafts WHERE id=?').bind(draftB.id).first())!.is_stale,0);
  assert.equal((await f.db.prepare('SELECT queue_state FROM opportunities WHERE id=?').bind(a.opportunityId).first())!.queue_state,'now');
  const data=new TestDataRepository(f.db);await data.remove('contact',a.contactId,f.actor);assert.equal((await f.db.prepare('SELECT count(*) n FROM signals').first())!.n,0);assert.equal(JSON.stringify(await data.export()).includes('Actual reply text'),false);
 }finally{await f.dispose();}
});
