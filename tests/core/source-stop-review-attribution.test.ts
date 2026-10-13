import {reviewedMerge} from '../support/reviewed-merge';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sourceStopFixture } from '../support/source-stop-fixture';
import { assertAttribution, databaseDigest } from '../support/stop-attribution';
import { IngestionRepository } from '../../src/core/features/ingestion/repository';
import { ImportMergeRepository } from '../../src/core/features/records/import-merge';
import { DataRepository } from '../../src/core/features/records/data';

test('SIGNAL-004 RECORD-012 a contact retired during operator review rolls back linking without repeating a cleared mailbox stop',async()=>{
 const f=await sourceStopFixture();try{
  const email='reviewed-mailbox@customer.test',event=f.event({email}),result=await f.ingest(event);
  assert.equal(result.linked,false);
  const original=await f.customer(email),record=(await f.records.detail('contact',original.contactId)).record;
  assert.equal((await f.request(`records/contact/${original.contactId}/clear-do-not-contact`,'POST',{confirmed:true,email:record.email,updatedAt:record.updated_at,revision:record.contactability_revision})).status,200);
  const survivor=await f.records.save('contact',{name:'Customer'},f.actor);
  await f.records.save('opportunity',{title:'Review opportunity',stage_id:f.stage,value_cents:0,contact_ids:[original.contactId,survivor.id],primary_contact_id:survivor.id},f.actor,original.opportunityId);
  let raced=false,afterMerge='';
  const racing=new Proxy(f.db,{get(target,key){
   if(key==='batch')return async(statements:D1PreparedStatement[])=>{
    assert.equal(raced,false);raced=true;
    await reviewedMerge(new ImportMergeRepository(target),'contact',survivor.id,original.contactId,{email:'retired'},f.actor);
    afterMerge=await databaseDigest(target);return target.batch(statements);
   };
   const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;
  }});
  await assert.rejects(new IngestionRepository(racing).link(result.id,{type:'contact',id:original.contactId,basis:'Operator review'},f.actor),/runtime_controls.value/);
  assert.equal(raced,true);assert.equal(await databaseDigest(f.db),afterMerge);
  assert.equal((await f.db.prepare('SELECT resolved_at FROM unlinked_signals WHERE signal_id=?').bind(result.id).first())!.resolved_at,null);
  const work=await f.schedule(survivor.id,original.opportunityId);
  assert.equal((await f.request(`sources/unlinked/${result.id}/link`,'POST',{type:'contact',id:survivor.id})).status,200);
  await assertAttribution(f.db,result.id,event,f.source,[{type:'contact',id:survivor.id},{type:'opportunity',id:original.opportunityId}],'Unlinked',f.actor);
  assert.equal((await f.records.detail('contact',survivor.id)).record.contactability,'contactable');
  assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(work.messageId).first())!.state,'scheduled');
  assert.equal((await f.db.prepare("SELECT count(*) AS n FROM audit_entries WHERE action='contact.suppressed'").first())!.n,1);
 }finally{await f.dispose();}
});

test('SIGNAL-008 stale contact attribution rolls back its first private context and leaves unchanged-event ingestion retryable',async()=>{
 const f=await sourceStopFixture();try{
  const current=await f.customer(),event=f.event({email:current.email});
  const work=await f.schedule(current.contactId,current.opportunityId);
  // Remove the mailbox before native erasure so that neither intervening action
  // needs a private context. The prepared batch alone stages its first context.
  await f.db.prepare('DELETE FROM privacy_matching_contexts').run();
  const plan=await f.prepare(event);
  await f.records.save('contact',{name:'Customer',email:null},f.actor,current.contactId);
  await new DataRepository(f.db).remove('contact',current.contactId,f.actor);
  assert.equal((await f.db.prepare('SELECT count(*) AS n FROM privacy_matching_contexts').first())!.n,0);
  const before=await databaseDigest(f.db);
  await assert.rejects(f.db.batch(plan.statements),/runtime_controls.value/);
  assert.equal(await databaseDigest(f.db),before);
  assert.equal((await f.db.prepare('SELECT count(*) AS n FROM privacy_matching_contexts').first())!.n,0);
  assert.equal(await f.db.prepare('SELECT id FROM outbound_messages WHERE id=?').bind(work.messageId).first(),null);
  const result=await f.ingest(event);assert.equal(result.linked,false);
  await assertAttribution(f.db,result.id,event,f.source,[],'Unlinked');
  const recreated=await f.customer(current.email);assert.equal((await f.records.detail('contact',recreated.contactId)).record.contactability,'do_not_contact');
  assert.deepEqual(await f.ingest(event),{id:result.id,replayed:true});
 }finally{await f.dispose();}
});
