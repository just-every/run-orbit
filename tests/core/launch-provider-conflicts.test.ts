import {reviewedMerge} from '../support/reviewed-merge';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {launchFixture} from '../support/launch-fixture';
import {createMailEventRoutes} from '../../src/core/features/outreach/provider-routes';
import {signRelayBody} from '../../src/base/sendgrid-event-relay/crypto';
import {createId} from '../../src/core/shared/ids';

test('SIGNAL-003 SIGNAL-008 OUT-005 provider conflicts are durable acknowledged no-ops, mixed batches progress and failed settlement fully rolls back',async()=>{
 const f=await launchFixture();try{
  const secret=crypto.randomUUID()+crypto.randomUUID(),app=createMailEventRoutes(f.db,{relaySecret:secret}),c=await f.customer(),message=await f.message(c.contactId,c.opportunityId,'queued');
  const event={sg_event_id:createId(),event:'delivered',timestamp:Math.floor(Date.now()/1000),email:c.email,rer_product:'orbit',rer_delivery_id:message.id,sg_message_id:'provider-message'};
  async function post(events:unknown[]){const body=JSON.stringify(events),timestamp=String(Math.floor(Date.now()/1000));return app.request('https://orbit.test/relay',{method:'POST',headers:{'x-rer-mail-timestamp':timestamp,'x-rer-mail-signature':await signRelayBody(secret,timestamp,body)},body});}
  await f.db.prepare("CREATE TRIGGER test_delivery_failure BEFORE INSERT ON timeline_entries WHEN NEW.kind='provider.delivered' BEGIN SELECT RAISE(ABORT,'Injected delivery persistence failure'); END").run();
  assert.equal((await post([event])).status,503);
  assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(message.id).first())!.state,'queued');assert.equal(await f.db.prepare('SELECT id FROM mail_provider_events WHERE id=?').bind(event.sg_event_id).first(),null);assert.equal((await f.db.prepare("SELECT count(*) n FROM timeline_entries WHERE kind='message.accepted'").first())!.n,0);
  await f.db.prepare('DROP TRIGGER test_delivery_failure').run();assert.equal((await post([event])).status,200);
  const before=await f.db.prepare('SELECT * FROM outbound_messages WHERE id=?').bind(message.id).first(),receiptBefore=await f.db.prepare('SELECT * FROM mail_provider_events WHERE id=?').bind(event.sg_event_id).first();
  const conflict={...event,event:'unsubscribe',email:'conflict@customer.test'},healthy={...event,sg_event_id:createId(),event:'open'};
  assert.equal((await post([conflict,healthy])).status,200);assert.equal((await post([conflict])).status,200);assert.equal((await post([event])).status,200);
  assert.deepEqual(await f.db.prepare('SELECT * FROM outbound_messages WHERE id=?').bind(message.id).first(),before);assert.equal((await f.db.prepare('SELECT contactability FROM contacts WHERE id=?').bind(c.contactId).first())!.contactability,'contactable');
  assert.deepEqual(await f.db.prepare('SELECT * FROM mail_provider_events WHERE id=?').bind(event.sg_event_id).first(),receiptBefore);
  assert.equal((await f.db.prepare('SELECT count(*) n FROM mail_provider_conflicts WHERE event_id=?').bind(event.sg_event_id).first())!.n,1);assert.ok(await f.db.prepare('SELECT id FROM mail_provider_events WHERE id=?').bind(healthy.sg_event_id).first());
  assert.equal((await f.db.prepare("SELECT rejected_count FROM signal_sources WHERE id='sendgrid-events'").first())!.rejected_count,1);
  const foreignConflict={...event,rer_product:'different-product'};assert.equal((await post([foreignConflict])).status,200);assert.equal((await f.db.prepare('SELECT count(*) n FROM mail_provider_conflicts WHERE event_id=?').bind(event.sg_event_id).first())!.n,2);
  assert.equal((await post([{...event,provider_detail:'changed extra field'}])).status,200);assert.equal((await f.db.prepare('SELECT count(*) n FROM mail_provider_conflicts WHERE event_id=?').bind(event.sg_event_id).first())!.n,3);
  // Failure to persist the diagnostic is still retryable rather than falsely acknowledged.
  await f.db.prepare("CREATE TRIGGER test_conflict_failure BEFORE INSERT ON mail_provider_conflicts BEGIN SELECT RAISE(ABORT,'Injected conflict persistence failure'); END").run();assert.equal((await post([{...event,event:'dropped'}])).status,503);await f.db.prepare('DROP TRIGGER test_conflict_failure').run();
 }finally{await f.dispose();}
});

test('SIGNAL-003 concurrent equal and unequal provider receipts commit exactly one set of effects',async()=>{
 const f=await launchFixture();try{
  const secret=crypto.randomUUID()+crypto.randomUUID(),app=createMailEventRoutes(f.db,{relaySecret:secret}),c=await f.customer(),message=await f.message(c.contactId,c.opportunityId,'queued');
  async function post(event:unknown){const body=JSON.stringify([event]),timestamp=String(Math.floor(Date.now()/1000));return app.request('https://orbit.test/relay',{method:'POST',headers:{'x-rer-mail-timestamp':timestamp,'x-rer-mail-signature':await signRelayBody(secret,timestamp,body)},body});}
  const event={sg_event_id:createId(),event:'delivered',timestamp:Math.floor(Date.now()/1000),email:c.email,rer_product:'orbit',rer_delivery_id:message.id};
  assert.deepEqual((await Promise.all([post(event),post(event)])).map(r=>r.status),[200,200]);
  const contested={...event,sg_event_id:createId(),event:'open'};assert.deepEqual((await Promise.all([post(contested),post({...contested,event:'click'})])).map(r=>r.status),[200,200]);
  assert.equal((await f.db.prepare('SELECT count(*) n FROM mail_provider_events').first())!.n,2);assert.equal((await f.db.prepare('SELECT count(*) n FROM mail_provider_conflicts').first())!.n,1);
  assert.equal((await f.db.prepare("SELECT count(*) n FROM timeline_entries WHERE kind='message.accepted'").first())!.n,1);assert.equal((await f.db.prepare("SELECT count(*) n FROM timeline_entries WHERE kind LIKE 'provider.%'").first())!.n,2);
 }finally{await f.dispose();}
});

test('RECORD-012 provider stop races retain the reviewed mailbox suppression and stop a merged survivor',async()=>{
 const {ProviderRepository}=await import('../../src/core/features/outreach/provider-repository'),{ImportMergeRepository}=await import('../../src/core/features/records/import-merge'),{TestDataRepository}=await import('../support/record-data');
 const f=await launchFixture();try{
  for(const race of ['erase','merge']){
   const c=await f.customer(),message=await f.message(c.contactId,c.opportunityId,'accepted'),other=race==='merge'?await f.customer():undefined;
   let entered=false;const db=new Proxy(f.db,{get(target,key){if(key==='batch')return async(statements:D1PreparedStatement[])=>{if(!entered){entered=true;if(other)await reviewedMerge(new ImportMergeRepository(target),'contact',other.contactId,c.contactId,{name:'survivor',email:'survivor'},f.actor);else await new TestDataRepository(target).remove('contact',c.contactId,f.actor);}return target.batch(statements);};const value=(target as any)[key];return typeof value==='function'?value.bind(target):value;}});
   await new ProviderRepository(db).event({sg_event_id:createId(),event:'unsubscribe',timestamp:Math.floor(Date.now()/1000),email:c.email,rer_delivery_id:message.id,rer_product:'orbit'},`stop-${race}`);
   if(other){assert.equal((await f.records.detail('contact',other.contactId)).record.contactability,'do_not_contact');await new TestDataRepository(f.db).remove('contact',other.contactId,f.actor);}
   const recreated=await f.records.save('contact',{name:'Recreated after raced stop',email:c.email},f.actor);assert.equal((await f.records.detail('contact',recreated.id)).record.contactability,'do_not_contact');
  }
 }finally{await f.dispose();}
});

test('SIGNAL-008 first provider stop initializes private matching state only with its atomic effects',async()=>{
 const f=await launchFixture();try{
  const c=await f.customer(),message=await f.message(c.contactId,c.opportunityId,'accepted'),secret=crypto.randomUUID()+crypto.randomUUID(),app=createMailEventRoutes(f.db,{relaySecret:secret});
  // An upgraded installation can have existing contacts and no privacy context yet.
  await f.db.prepare('DELETE FROM privacy_matching_contexts').run();
  const event={sg_event_id:createId(),event:'unsubscribe',timestamp:Math.floor(Date.now()/1000),email:c.email,rer_product:'orbit',rer_delivery_id:message.id},body=JSON.stringify([event]),timestamp=String(Math.floor(Date.now()/1000)),signature=await signRelayBody(secret,timestamp,body);
  const post=()=>app.request('https://orbit.test/relay',{method:'POST',headers:{'x-rer-mail-timestamp':timestamp,'x-rer-mail-signature':signature},body});
  await f.db.prepare("CREATE TRIGGER test_stop_failure BEFORE INSERT ON timeline_entries WHEN NEW.kind='provider.unsubscribe' BEGIN SELECT RAISE(ABORT,'Injected stop persistence failure'); END").run();
  assert.equal((await post()).status,503);assert.equal((await f.db.prepare('SELECT count(*) n FROM privacy_matching_contexts').first())!.n,0);assert.equal((await f.db.prepare('SELECT count(*) n FROM mail_provider_events').first())!.n,0);assert.equal((await f.records.detail('contact',c.contactId)).record.contactability,'contactable');
  await f.db.prepare('DROP TRIGGER test_stop_failure').run();assert.equal((await post()).status,200);assert.equal((await f.records.detail('contact',c.contactId)).record.contactability,'do_not_contact');assert.ok(Number((await f.db.prepare('SELECT count(*) n FROM privacy_matching_contexts').first())!.n)>0);
 }finally{await f.dispose();}
});
