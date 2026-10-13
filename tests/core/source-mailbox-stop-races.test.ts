import {reviewedMerge} from '../support/reviewed-merge';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sourceStopFixture } from '../support/source-stop-fixture';
import { TestDataRepository } from '../support/record-data';
import { ImportMergeRepository } from '../../src/core/features/records/import-merge';
import { privacyMatcher } from '../../src/core/features/records/suppression';
import { createId } from '../../src/core/shared/ids';

for(const type of ['email.unsubscribed','email.bounced'])test(`RECORD-012 prepared ${type} resolves deletion and recreated mailbox at commit`,async()=>{
 const f=await sourceStopFixture();try{
  const c=await f.customer(),event=f.event({type,permanentBounce:type==='email.bounced',email:c.email,record:{type:'opportunity',id:c.opportunityId}}),plan=await f.prepare(event);
  await new TestDataRepository(f.db).remove('contact',c.contactId,f.actor);
  const replacement=await f.customer(c.email),work=await f.schedule(replacement.contactId,replacement.opportunityId);
  await f.db.batch(plan.statements);await f.stopped(replacement.contactId,work);
  assert.equal((await f.db.prepare('SELECT record_id FROM signal_links WHERE signal_id=?').bind(plan.id).first())!.record_id,c.opportunityId);
 }finally{await f.dispose();}
});

test('RECORD-012 prepared stop fences a newly merged mailbox, then replay suppresses every surviving native and alias identity',async()=>{
 const f=await sourceStopFixture();try{
  const a=await f.customer(),b=await f.customer(),event=f.event({email:a.email,record:{type:'opportunity',id:a.opportunityId}}),plan=await f.prepare(event);
  await reviewedMerge(new ImportMergeRepository(f.db),'contact',b.contactId,a.contactId,{email:'survivor'},f.actor);
  const work=await f.schedule(b.contactId,b.opportunityId);
  await assert.rejects(f.db.batch(plan.statements),/runtime_controls.value/);
  assert.equal(await f.db.prepare('SELECT id FROM signals WHERE id=?').bind(plan.id).first(),null);
  await f.ingest(event);await f.stopped(b.contactId,work);
  await new TestDataRepository(f.db).remove('contact',b.contactId,f.actor);
  for(const email of [a.email,b.email]){const restored=await f.customer(email);assert.equal((await f.records.detail('contact',restored.contactId)).record.contactability,'do_not_contact');}
 }finally{await f.dispose();}
});

test('SIGNAL-008 prepared mailbox stop refuses a new ambiguous alias and a replaced privacy context atomically',async()=>{
 const f=await sourceStopFixture();try{
  const a=await f.customer(),b=await f.customer(),event=f.event({email:a.email,record:{type:'opportunity',id:a.opportunityId}}),plan=await f.prepare(event);
  await f.db.prepare('INSERT INTO record_aliases VALUES(?,?,?,?,?)').bind('contact',a.email.toLowerCase(),b.contactId,createId(),new Date().toISOString()).run();
  await assert.rejects(f.db.batch(plan.statements),/runtime_controls.value/);
  assert.equal(await f.db.prepare('SELECT id FROM signals WHERE id=?').bind(plan.id).first(),null);
  for(const c of [a,b])assert.equal((await f.records.detail('contact',c.contactId)).record.contactability,'contactable');
  await f.db.prepare("DELETE FROM record_aliases WHERE record_type='contact' AND identity_key=?").bind(a.email.toLowerCase()).run();
  const privacyPlan=await f.prepare(event);await f.db.prepare('DELETE FROM privacy_matching_contexts').run();await privacyMatcher(f.db);
  await assert.rejects(f.db.batch(privacyPlan.statements),/runtime_controls.value/);
  assert.equal(await f.db.prepare('SELECT id FROM signals WHERE id=?').bind(privacyPlan.id).first(),null);
  await f.ingest(event);assert.equal((await f.records.detail('contact',a.contactId)).record.contactability,'do_not_contact');
 }finally{await f.dispose();}
});

test('SIGNAL-008 a staged first stop remains retryable when recreation establishes a different private context before commit',async()=>{
 const f=await sourceStopFixture();try{
  const c=await f.customer(),event=f.event({email:c.email,record:{type:'opportunity',id:c.opportunityId}});
  await f.db.prepare('DELETE FROM privacy_matching_contexts').run();const plan=await f.prepare(event);
  await new TestDataRepository(f.db).remove('contact',c.contactId,f.actor);
  const replacement=await f.customer(c.email),work=await f.schedule(replacement.contactId,replacement.opportunityId);
  await assert.rejects(f.db.batch(plan.statements),/runtime_controls.value/);
  assert.equal(await f.db.prepare('SELECT id FROM signals WHERE id=?').bind(plan.id).first(),null);
  assert.equal((await f.db.prepare("SELECT count(*) AS n FROM audit_entries WHERE action='contact.suppressed'").first())!.n,0);
  await f.ingest(event);await f.stopped(replacement.contactId,work);
 }finally{await f.dispose();}
});

test('RECORD-012 prepared source stop follows mailbox A after a stale contact ID changes to unrelated mailbox B',async()=>{
 const f=await sourceStopFixture();try{
  const original=await f.customer(),event=f.event({email:original.email,record:{type:'opportunity',id:original.opportunityId}}),plan=await f.prepare(event);
  const otherEmail='replacement-occupant@customer.test';await f.records.save('contact',{name:'Other mailbox',email:otherEmail},f.actor,original.contactId);
  const current=await f.customer(original.email);
  await f.records.save('opportunity',{title:'Shared opportunity',stage_id:f.stage,value_cents:0,contact_ids:[original.contactId,current.contactId],primary_contact_id:original.contactId},f.actor,original.opportunityId);
  const currentWork=await f.schedule(current.contactId,original.opportunityId),otherWork=await f.schedule(original.contactId,original.opportunityId);
  await f.db.batch(plan.statements);
  assert.equal((await f.records.detail('contact',original.contactId)).record.contactability,'contactable');
  assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(otherWork.messageId).first())!.state,'scheduled');
  const {suppressionHashes}=await import('../../src/core/features/records/suppression');
  for(const token of await suppressionHashes(f.db,otherEmail))assert.equal(await f.db.prepare("SELECT id FROM audit_entries WHERE action='contact.suppressed' AND entity_id=?").bind(token).first(),null);
  await f.stopped(current.contactId,currentWork);
  assert.deepEqual((await f.db.prepare('SELECT record_type,record_id FROM signal_links WHERE signal_id=?').bind(plan.id).all()).results,[{record_type:'opportunity',record_id:original.opportunityId}]);
 }finally{await f.dispose();}
});
