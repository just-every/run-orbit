import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sourceStopFixture } from '../support/source-stop-fixture';
import { TestDataRepository } from '../support/record-data';
import { suppressionHashes } from '../../src/core/features/records/suppression';
import { createId } from '../../src/core/shared/ids';

for(const type of ['email.unsubscribed','email.bounced'])test(`RECORD-012 SIGNAL-004 ${type} stops the exact mailbox independently of opportunity/company association and preserves controls`,async()=>{
 const f=await sourceStopFixture();try{
  for(const shape of ['opportunity','company','contact','contact-only','email-only'] as const){
   const c=await f.customer(),work=await f.schedule(c.contactId,c.opportunityId),company=await f.records.save('company',{name:'Associated company'},f.actor);
   const record=shape==='opportunity'?{type:'opportunity' as const,id:c.opportunityId}:shape==='company'?{type:'company' as const,id:company.id}:shape.startsWith('contact')?{type:'contact' as const,id:c.contactId}:undefined;
   const event=f.event({type,permanentBounce:type==='email.bounced',record,...(shape==='contact-only'?{}:{email:c.email.toUpperCase()})});
   const result=await f.ingest(event);await f.stopped(c.contactId,work);
   const links=(await f.db.prepare('SELECT record_type,record_id FROM signal_links WHERE signal_id=? ORDER BY record_type').bind(result.id).all()).results;
   if(shape==='opportunity'||shape==='company')assert.deepEqual(links,[{record_type:shape,record_id:record!.id}],'Only the declared record receives signal provenance');
   const signal=(await f.db.prepare('SELECT payload_json,linking_basis FROM signals WHERE id=?').bind(result.id).first())!;
   assert.equal(signal.payload_json,JSON.stringify(event));assert.equal(signal.linking_basis,record?'Explicit Orbit record ID':'Exact normalized identity or retired alias');
   const before=(await f.records.detail('contact',c.contactId)).record.contactability_revision;
   assert.deepEqual(await f.ingest(event),{id:result.id,replayed:true});
   assert.equal((await f.records.detail('contact',c.contactId)).record.contactability_revision,before,'Replay creates no second stop');
   const tokens=await suppressionHashes(f.db,c.email),proofs=(await f.db.prepare("SELECT actor_id,entity_type,entity_id,details_json FROM audit_entries WHERE action='contact.suppressed' AND entity_id=?").bind(tokens[0]).all()).results;
   assert.equal(proofs.length,1);assert.equal(proofs[0]!.actor_id,null);assert.equal(proofs[0]!.entity_type,'mailbox');assert.equal(proofs[0]!.details_json,'{}');assert.ok(!JSON.stringify(proofs).includes(c.email));
  }
 }finally{await f.dispose();}
});

test('SIGNAL-004 RECORD-012 mailbox stop never infers another recipient or turns non-stop evidence into a contact reply',async()=>{
 const f=await sourceStopFixture();try{
  const a=await f.customer(),b=await f.customer(),work=await f.schedule(a.contactId,a.opportunityId);
  const result=await f.ingest(f.event({email:b.email,record:{type:'opportunity',id:a.opportunityId}}));
  assert.equal((await f.records.detail('contact',a.contactId)).record.contactability,'contactable');
  assert.equal((await f.records.detail('contact',b.contactId)).record.contactability,'do_not_contact');
  assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(work.messageId).first())!.state,'scheduled');
  assert.equal((await f.db.prepare("SELECT count(*) AS n FROM signal_links WHERE signal_id=? AND record_type='contact'").bind(result.id).first())!.n,0);
  for(const input of [{type:'email.replied'},{type:'email.bounced',permanentBounce:false},{type:'email.opened',permanentBounce:true}])await f.ingest(f.event({...input,email:a.email,record:{type:'opportunity',id:a.opportunityId}}));
  assert.equal((await f.records.detail('contact',a.contactId)).record.contactability,'contactable');
  assert.equal((await f.db.prepare('SELECT stale_reason FROM drafts WHERE id=?').bind(work.draftId).first())!.stale_reason,'New customer evidence');
  assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(work.messageId).first())!.state,'scheduled');
 }finally{await f.dispose();}
});

test('RECORD-012 SIGNAL-008 contradictory or ambiguous mailbox identity writes no signal or stop',async()=>{
 const f=await sourceStopFixture();try{
  const a=await f.customer(),b=await f.customer();
  await assert.rejects(f.ingest(f.event({email:b.email,record:{type:'contact',id:a.contactId}})),/different contacts/);
  await f.db.prepare('INSERT INTO record_aliases VALUES(?,?,?,?,?)').bind('contact',a.email.toLowerCase(),b.contactId,createId(),new Date().toISOString()).run();
  await assert.rejects(f.ingest(f.event({email:a.email,record:{type:'opportunity',id:a.opportunityId}})),/more than one contact/);
  await assert.rejects(f.ingest(f.event({email:'invalid mailbox',record:{type:'opportunity',id:a.opportunityId}})),/Invalid stop mailbox/);
  assert.equal((await f.db.prepare('SELECT count(*) AS n FROM signals WHERE source_id=?').bind(f.source).first())!.n,0);
  for(const c of [a,b])assert.equal((await f.records.detail('contact',c.contactId)).record.contactability,'contactable');
 }finally{await f.dispose();}
});

test('RECORD-012 DATA-002 source stop survives erasure and unknown-mailbox recreation without raw anonymous history',async()=>{
 const f=await sourceStopFixture();try{
  const c=await f.customer();await f.ingest(f.event({email:c.email,record:{type:'opportunity',id:c.opportunityId}}));
  await new TestDataRepository(f.db).remove('contact',c.contactId,f.actor);
  assert.ok(!JSON.stringify(await new TestDataRepository(f.db).export()).includes(c.email));
  const replacement=await f.customer(c.email.toUpperCase());assert.equal((await f.records.detail('contact',replacement.contactId)).record.contactability,'do_not_contact');
  const unknown='not-yet-created@customer.test';await f.ingest(f.event({email:unknown,record:{type:'opportunity',id:c.opportunityId}}));
  const created=await f.customer(unknown);assert.equal((await f.records.detail('contact',created.contactId)).record.contactability,'do_not_contact');
 }finally{await f.dispose();}
});

test('SIGNAL-008 RECORD-012 a real batch constraint failure rolls back signal, links, stop and first private matching context',async()=>{
 const f=await sourceStopFixture();try{
  const c=await f.customer(),work=await f.schedule(c.contactId,c.opportunityId),event=f.event({email:c.email,record:{type:'opportunity',id:c.opportunityId}});
  await f.db.prepare('DELETE FROM privacy_matching_contexts').run();
  await f.db.prepare("CREATE TRIGGER refuse_source_stop BEFORE UPDATE OF contactability ON contacts WHEN NEW.contactability='do_not_contact' BEGIN SELECT RAISE(ABORT,'Test stop failure'); END").run();
  await assert.rejects(f.ingest(event),/Test stop failure/);
  for(const table of ['signals','signal_links','privacy_matching_contexts'])assert.equal((await f.db.prepare(`SELECT count(*) AS n FROM ${table}`).first())!.n,0);
  assert.equal((await f.db.prepare("SELECT count(*) AS n FROM audit_entries WHERE action='contact.suppressed'").first())!.n,0);
  assert.equal((await f.db.prepare("SELECT count(*) AS n FROM timeline_entries WHERE kind='signal.recorded'").first())!.n,0);
  assert.equal((await f.db.prepare('SELECT last_accepted_at FROM signal_sources WHERE id=?').bind(f.source).first())!.last_accepted_at,null);
  assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(work.messageId).first())!.state,'scheduled');
  assert.equal((await f.db.prepare('SELECT is_stale FROM drafts WHERE id=?').bind(work.draftId).first())!.is_stale,0);
  await f.db.prepare('DROP TRIGGER refuse_source_stop').run();await f.ingest(event);await f.stopped(c.contactId,work);
 }finally{await f.dispose();}
});

test('RECORD-012 SIGNAL-004 reviewing an old unlinked stop never repeats suppression after a current operator clear',async()=>{
 const f=await sourceStopFixture();try{
  const email='later-contact@customer.test',event=f.event({email}),signal=await f.ingest(event);assert.equal(signal.linked,false);
  const c=await f.customer(email),record=(await f.records.detail('contact',c.contactId)).record;
  assert.equal(record.contactability,'do_not_contact');
  assert.equal((await f.request(`records/contact/${c.contactId}/clear-do-not-contact`,'POST',{confirmed:true,email:record.email,updatedAt:record.updated_at,revision:record.contactability_revision})).status,200);
  const work=await f.schedule(c.contactId,c.opportunityId);
  const {IngestionRepository}=await import('../../src/core/features/ingestion/repository');
  await new IngestionRepository(f.db).link(signal.id,{type:'contact',id:c.contactId,basis:'Operator review'},f.actor);
  assert.equal((await f.records.detail('contact',c.contactId)).record.contactability,'contactable');
  assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(work.messageId).first())!.state,'scheduled');
  assert.equal((await f.db.prepare("SELECT count(*) AS n FROM audit_entries WHERE action='contact.suppressed'").first())!.n,1);
  assert.deepEqual(await f.ingest(event),{id:signal.id,replayed:true});
 }finally{await f.dispose();}
});
