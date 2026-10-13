import {reviewedMerge} from '../support/reviewed-merge';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sourceStopFixture } from '../support/source-stop-fixture';
import { assertAttribution, databaseDigest } from '../support/stop-attribution';
import { DataRepository } from '../../src/core/features/records/data';
import { ImportMergeRepository } from '../../src/core/features/records/import-merge';
import { suppressionHashes } from '../../src/core/features/records/suppression';

for(const type of ['email.unsubscribed','email.bounced'])for(const shape of ['email-only','explicit-contact'])for(const race of ['erase/recreate','same-mailbox merge']){
 test(`SIGNAL-004 SIGNAL-008 ${type} ${shape} rolls back stale attribution after native ${race}, then safely retries`,async()=>{
  const f=await sourceStopFixture();try{
   const original=await f.customer(),event=f.event({type,permanentBounce:type==='email.bounced',email:original.email.toUpperCase(),...(shape==='explicit-contact'?{record:{type:'contact',id:original.contactId}}:{})});
   const survivor=race==='same-mailbox merge'?await f.records.save('contact',{name:'Customer'},f.actor):undefined;
   if(survivor)await f.records.save('opportunity',{title:'Shared merge opportunity',stage_id:f.stage,value_cents:0,contact_ids:[original.contactId,survivor.id],primary_contact_id:survivor.id},f.actor,original.opportunityId);
   const plan=await f.prepare(event);
   let current:{contactId:string;opportunityId:string};
   if(race==='erase/recreate'){
    await new DataRepository(f.db).remove('contact',original.contactId,f.actor);
    current=await f.customer(original.email);
   }else{
    await reviewedMerge(new ImportMergeRepository(f.db),'contact',survivor!.id,original.contactId,{email:'retired'},f.actor);
    current={contactId:survivor!.id,opportunityId:original.opportunityId};
   }
   const work=await f.schedule(current.contactId,current.opportunityId),before=await databaseDigest(f.db);
   await assert.rejects(f.db.batch(plan.statements),/runtime_controls.value/);
   assert.equal(await databaseDigest(f.db),before,'No signal, source timestamp, proof, context, work, evaluation or link survives the rejected batch');
   const result=await f.ingest(event);await f.stopped(current.contactId,work);
   const expected=shape==='email-only'?[{type:'contact',id:current.contactId},{type:'opportunity',id:current.opportunityId}]:[];
   assert.equal(result.linked,shape==='email-only');
   await assertAttribution(f.db,result.id,event,f.source,expected,shape==='email-only'?'Exact normalized identity or retired alias':'Unlinked');
   for(const table of ['signal_links','timeline_entry_records'])assert.equal((await f.db.prepare(`SELECT count(*) AS n FROM ${table} WHERE record_type='contact' AND record_id=?`).bind(original.contactId).first())!.n,0);
   const tokens=await suppressionHashes(f.db,original.email);
   for(const token of tokens)assert.equal((await f.db.prepare("SELECT count(*) AS n FROM audit_entries WHERE action='contact.suppressed' AND entity_id=? AND actor_id IS NULL AND details_json='{}'").bind(token).first())!.n,1);
   const accepted=await databaseDigest(f.db);assert.deepEqual(await f.ingest(event),{id:result.id,replayed:true});assert.equal(await databaseDigest(f.db),accepted);
   if(shape==='explicit-contact'){
    assert.equal((await f.db.prepare('SELECT resolved_at FROM unlinked_signals WHERE signal_id=?').bind(result.id).first())!.resolved_at,null);
    const record=(await f.records.detail('contact',current.contactId)).record;
    assert.equal((await f.request(`records/contact/${current.contactId}/clear-do-not-contact`,'POST',{confirmed:true,email:record.email,updatedAt:record.updated_at,revision:record.contactability_revision})).status,200);
    const fresh=await f.schedule(current.contactId,current.opportunityId);
    assert.equal((await f.request(`sources/unlinked/${result.id}/link`,'POST',{type:'contact',id:current.contactId})).status,200);
    await assertAttribution(f.db,result.id,event,f.source,[{type:'contact',id:current.contactId},{type:'opportunity',id:current.opportunityId}],'Unlinked',f.actor);
    assert.equal((await f.records.detail('contact',current.contactId)).record.contactability,'contactable');
    const reviewedDraft=(await f.db.prepare('SELECT is_stale,stale_reason FROM drafts WHERE id=?').bind(fresh.draftId).first())!;
    assert.equal(reviewedDraft.is_stale,1);assert.equal(reviewedDraft.stale_reason,'New customer evidence');
    assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(fresh.messageId).first())!.state,'scheduled');
    for(const token of tokens)assert.equal((await f.db.prepare("SELECT count(*) AS n FROM audit_entries WHERE action='contact.suppressed' AND entity_id=?").bind(token).first())!.n,1);
    assert.deepEqual(await f.ingest(event),{id:result.id,replayed:true});
    assert.equal((await f.request(`sources/unlinked/${result.id}/link`,'POST',{type:'contact',id:current.contactId})).status,409);
   }
  }finally{await f.dispose();}
 });
}

for(const type of ['email.unsubscribed','email.bounced'])test(`SIGNAL-004 ${type} follows mailbox A after its prepared contact becomes unrelated mailbox B`,async()=>{
 const f=await sourceStopFixture();try{
  const original=await f.customer(),event=f.event({type,permanentBounce:type==='email.bounced',email:original.email}),plan=await f.prepare(event);
  const otherEmail='other-occupant@customer.test';await f.records.save('contact',{name:'Other occupant',email:otherEmail},f.actor,original.contactId);
  const current=await f.customer(original.email);
  await f.records.save('opportunity',{title:'Shared opportunity',stage_id:f.stage,value_cents:0,contact_ids:[original.contactId,current.contactId],primary_contact_id:original.contactId},f.actor,original.opportunityId);
  const currentWork=await f.schedule(current.contactId,current.opportunityId),otherWork=await f.schedule(original.contactId,original.opportunityId),before=await databaseDigest(f.db);
  await assert.rejects(f.db.batch(plan.statements),/runtime_controls.value/);assert.equal(await databaseDigest(f.db),before);
  const result=await f.ingest(event);
  await assertAttribution(f.db,result.id,event,f.source,[{type:'contact',id:current.contactId},{type:'opportunity',id:current.opportunityId},{type:'opportunity',id:original.opportunityId}],'Exact normalized identity or retired alias');
  assert.equal((await f.records.detail('contact',current.contactId)).record.contactability,'do_not_contact');
  assert.equal((await f.db.prepare('SELECT is_stale FROM drafts WHERE id=?').bind(currentWork.draftId).first())!.is_stale,1);
  assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(currentWork.messageId).first())!.state,'cancelled');
  assert.equal((await f.records.detail('contact',original.contactId)).record.contactability,'contactable');
  assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(otherWork.messageId).first())!.state,'scheduled');
  for(const token of await suppressionHashes(f.db,otherEmail))assert.equal((await f.db.prepare("SELECT count(*) AS n FROM audit_entries WHERE action='contact.suppressed' AND entity_id=?").bind(token).first())!.n,0);
 }finally{await f.dispose();}
});
