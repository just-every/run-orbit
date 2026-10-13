import {reviewedMerge} from '../support/reviewed-merge';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {launchFixture} from '../support/launch-fixture';
import {RecordsRepository} from '../../src/core/features/records/repository';
import {ImportMergeRepository} from '../../src/core/features/records/import-merge';
import {TestDataRepository} from '../support/record-data';
import {ProviderRepository} from '../../src/core/features/outreach/provider-repository';
import {IngestionRepository} from '../../src/core/features/ingestion/repository';
import {suppressionHashes} from '../../src/core/features/records/suppression';
import {payloadHash} from '../../src/core/platform/source-security';
import {createId} from '../../src/core/shared/ids';

test('RECORD-012 DATA-002 launch suppression survives ordinary edits, erasure, normalized recreation, and workbench creation; only reviewed native clear permits future review',async()=>{
 const f=await launchFixture();try{
  const c=await f.customer('Suppressed@Customer.test'),scheduled=await f.message(c.contactId,c.opportunityId);
  const stop=await f.request(`records/contact/${c.contactId}`,'PUT',{name:'Stopped',email:c.email,contactability:'do_not_contact'});assert.equal(stop.status,200);
  assert.equal((await f.request(`records/contact/${c.contactId}`,'PUT',{name:'Renamed'})).status,200);
  let row=(await f.records.detail('contact',c.contactId)).record;assert.equal(row.contactability,'do_not_contact');assert.equal(row.email,'suppressed@customer.test');
  assert.equal((await f.request(`records/contact/${c.contactId}`,'PUT',{name:'Ordinary clear',contactability:'contactable'})).status,409);
  const oldEmail=row.email;assert.equal((await f.request(`records/contact/${c.contactId}`,'PUT',{name:'Changed address',email:'replacement@customer.test'})).status,200);
  assert.equal((await f.records.detail('contact',c.contactId)).record.contactability,'do_not_contact');
  await new TestDataRepository(f.db).remove('contact',c.contactId,f.actor);
  const exported=await new TestDataRepository(f.db).export(),serialized=JSON.stringify(exported);
  assert.ok(!serialized.includes(oldEmail));assert.ok(!serialized.includes('replacement@customer.test'));assert.ok(!serialized.includes('Reviewed body'));
  const proofs=exported.tables.audit_entries.filter(row=>row.action==='contact.suppressed');assert.ok(proofs.length>=2);for(const token of proofs){assert.equal(token.actor_id,null);assert.equal(token.details_json,'{}');assert.match(token.entity_id,/^[a-f0-9]{32}:[a-f0-9]{64}$/);}
  const recreated=await f.records.save('contact',{name:'Recreated',email:'  SUPPRESSED@CUSTOMER.TEST '},f.actor);assert.equal((await f.records.detail('contact',recreated.id)).record.contactability,'do_not_contact');
  await new TestDataRepository(f.db).remove('contact',recreated.id,f.actor);
  const imported=await f.records.save('contact',{name:'Imported identity recreated',email:'SUPPRESSED@CUSTOMER.TEST'},f.actor);assert.equal((await f.records.detail('contact',imported.id)).record.contactability,'do_not_contact');
  const quick=await f.workbench.createOpportunity({title:'Recreated via workbench',companyName:'Company',contactName:'Replacement',email:'REPLACEMENT@CUSTOMER.TEST',stageId:f.stage,valueCents:0},f.actor);
  const quickContact=(await f.db.prepare('SELECT contact_id FROM opportunity_contacts WHERE opportunity_id=?').bind(quick.id).first<{contact_id:string}>())!;
  row=(await f.records.detail('contact',quickContact.contact_id)).record;
  const clearPath=`records/contact/${row.id}/clear-do-not-contact`,review={confirmed:true,email:row.email,updatedAt:row.updated_at,revision:row.contactability_revision};
  assert.equal((await f.request(clearPath,'POST',review,{Cookie:''})).status,401);assert.equal((await f.request(clearPath,'POST',review,{Origin:'https://other.test'})).status,403);
  assert.equal((await f.request(clearPath,'POST',{...review,confirmed:false})).status,400);assert.equal((await f.request(clearPath,'POST',{...review,updatedAt:'stale'})).status,409);
  await f.db.prepare("UPDATE contacts SET contactability='do_not_contact' WHERE id=?").bind(row.id).run();assert.equal((await f.request(clearPath,'POST',review)).status,409,'A stop sharing the reviewed timestamp changes the monotonic revision');
  const latest=(await f.records.detail('contact',row.id)).record;
  assert.equal((await f.request(clearPath,'POST',{...review,revision:latest.contactability_revision})).status,200);assert.equal((await f.records.detail('contact',row.id)).record.contactability,'contactable');
  assert.ok(await f.db.prepare("SELECT id FROM audit_entries WHERE action='contactability.cleared' AND entity_id=?").bind(row.id).first());
  assert.equal(await f.db.prepare('SELECT id FROM outbound_messages WHERE id=?').bind(scheduled.id).first(),null);
 }finally{await f.dispose();}
});

test('RECORD-012 concurrent stop dominates stale edit; merge preserves both recipients and clear never resurrects a schedule',async()=>{
 const f=await launchFixture();try{
  const a=await f.customer(),b=await f.customer(),scheduled=await f.message(a.contactId,a.opportunityId);
  let intervened=false;const raced=new Proxy(f.db,{get(target,key){if(key==='batch')return async(statements:D1PreparedStatement[])=>{if(!intervened){intervened=true;await target.prepare("UPDATE contacts SET contactability='do_not_contact' WHERE id=?").bind(a.contactId).run();}return target.batch(statements);};const value=(target as any)[key];return typeof value==='function'?value.bind(target):value;}});
  await new RecordsRepository(raced).save('contact',{name:'Stale name',contactability:'contactable'},f.actor,a.contactId,{ordinaryEdit:true});
  assert.equal((await f.records.detail('contact',a.contactId)).record.contactability,'do_not_contact');assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(scheduled.id).first())!.state,'cancelled');
  await reviewedMerge(new ImportMergeRepository(f.db),'contact',b.contactId,a.contactId,{name:'survivor',email:'survivor',contactability:'survivor'},f.actor);
  const merged=(await f.records.detail('contact',b.contactId)).record;assert.equal(merged.contactability,'do_not_contact');
  assert.equal((await f.request(`records/contact/${b.contactId}/clear-do-not-contact`,'POST',{confirmed:true,email:merged.email,updatedAt:merged.updated_at,revision:merged.contactability_revision})).status,200);
  assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(scheduled.id).first())!.state,'cancelled');
 }finally{await f.dispose();}
});

test('RECORD-012 DATA-001 manual, source and provider stops preserve anonymous suppression through export and restore',async()=>{
 const f=await launchFixture();try{
  for(const mode of ['manual','source','provider'] as const){const c=await f.customer(),at=new Date().toISOString();
   if(mode==='manual')await f.workbench.recordEvent(c.opportunityId,{eventId:createId(),type:'email.unsubscribed',subject:'Stop',occurredAt:at,contactId:c.contactId},f.actor);
   if(mode==='source'){const source=createId();await f.db.prepare("INSERT INTO signal_sources(id,name,type,enabled,created_at,updated_at) VALUES(?,'Stop source','signed_webhook',1,?,?)").bind(source,at,at).run();const event={eventId:createId(),type:'email.bounced',permanentBounce:true,subject:'Stop',occurredAt:at,email:c.email};await new IngestionRepository(f.db).ingest(source,event,await payloadHash(JSON.stringify(event)),JSON.stringify(event));}
   if(mode==='provider'){const message=await f.message(c.contactId,c.opportunityId,'accepted');await new ProviderRepository(f.db).event({sg_event_id:createId(),event:'unsubscribe',timestamp:Math.floor(Date.now()/1000),email:c.email,rer_product:'orbit',rer_delivery_id:message.id},'provider-stop');}
   const tokens=await suppressionHashes(f.db,c.email);assert.ok(await f.db.prepare("SELECT id FROM audit_entries WHERE action='contact.suppressed' AND entity_id=?").bind(tokens[0]).first(),mode);
  }
  const archive=await new TestDataRepository(f.db).export(),target=await launchFixture();try{
   await new TestDataRepository(target.db).restore(archive,target.actor);
   const restored=await new TestDataRepository(target.db).export();assert.equal(await payloadHash(JSON.stringify(restored.tables.privacy_matching_contexts)),await payloadHash(JSON.stringify(archive.tables.privacy_matching_contexts)));assert.deepEqual(restored.tables.audit_entries.filter(row=>row.action==='contact.suppressed'),archive.tables.audit_entries.filter(row=>row.action==='contact.suppressed'));
  }finally{await target.dispose();}
 }finally{await f.dispose();}
});
