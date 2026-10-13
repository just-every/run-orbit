import assert from 'node:assert/strict';
import {test} from 'node:test';
import {launchFixture} from '../support/launch-fixture';
import {TestDataRepository} from '../support/record-data';
import {RecordsRepository} from '../../src/core/features/records/repository';
import {WorkbenchRepository} from '../../src/core/features/workbench/repository';
import {OutreachRepository} from '../../src/core/features/workbench/outreach-repository';
import {ApprovalRepository} from '../../src/core/features/outreach/approval-repository';
import {OutreachService} from '../../src/core/features/outreach/service';
import {ProviderRepository} from '../../src/core/features/outreach/provider-repository';
import {contactStopStatements} from '../../src/core/features/records/suppression-effects';
import {suppressionHashes,suppressionPredicate} from '../../src/core/features/records/suppression';
import {createId} from '../../src/core/shared/ids';

function intercept(db:D1Database,before:(statements:D1PreparedStatement[])=>Promise<void>){
 let entered=false;
 return new Proxy(db,{get(target,key){if(key==='batch')return async(statements:D1PreparedStatement[])=>{if(!entered){entered=true;await before(statements);}return target.batch(statements);};const value=(target as any)[key];return typeof value==='function'?value.bind(target):value;}});
}
const now=new Date('2026-10-12T09:00:00Z'),due=new Date('2026-10-12T11:00:00Z');
async function recreate(f:Awaited<ReturnType<typeof launchFixture>>,db:D1Database,email:string,method:string){
 if(method==='records'){
  const contact=await new RecordsRepository(db).save('contact',{name:'Recreated',email},f.actor);
  const opportunity=await f.records.save('opportunity',{title:'Recreated opportunity',stage_id:f.stage,value_cents:0,contact_ids:[contact.id],primary_contact_id:contact.id},f.actor);
  return {contactId:contact.id,opportunityId:opportunity.id};
 }
 const opportunity=await new WorkbenchRepository(db).createOpportunity({title:'Recreated',companyName:'Current company',contactName:'Current contact',email,stageId:f.stage,valueCents:0},f.actor);
 const row=await f.db.prepare('SELECT contact_id FROM opportunity_contacts WHERE opportunity_id=?').bind(opportunity.id).first<{contact_id:string}>();
 return {contactId:row!.contact_id,opportunityId:opportunity.id};
}

test('RECORD-012 prepared provider stop suppresses a same-mailbox recreation before commit, with persisted and newly staged contexts',async()=>{
 const f=await launchFixture();try{
  for(const context of ['persisted','first-stop'])for(const method of ['records','workbench']){
   const a=await f.customer(),sent=await f.message(a.contactId,a.opportunityId,'accepted');
   if(context==='first-stop')await f.db.prepare('DELETE FROM privacy_matching_contexts').run();
   let current!:Awaited<ReturnType<typeof recreate>>,draftId='',messageId='';
   const db=intercept(f.db,async()=>{
    await new TestDataRepository(f.db).remove('contact',a.contactId,f.actor);
    current=await recreate(f,f.db,` ${a.email.toUpperCase()} `,method);
    const draft=await new OutreachRepository(f.db).createDraft(current.opportunityId,{contactId:current.contactId,subject:'Old approval',body:'Must never send'},f.actor);draftId=draft.id;
    messageId=(await new ApprovalRepository(f.db).approve(draft.id,1,f.actor,{now,scheduledAt:'2026-10-12T10:00:00Z'})).id;
   });
   await new ProviderRepository(db).event({sg_event_id:createId(),event:'unsubscribe',timestamp:Math.floor(Date.now()/1000),email:a.email,rer_product:'orbit',rer_delivery_id:sent.id},`prepared-${context}-${method}`);
   assert.equal((await f.records.detail('contact',current.contactId)).record.contactability,'do_not_contact');
   assert.ok(await f.db.prepare(`SELECT 1 WHERE ${suppressionPredicate(await suppressionHashes(f.db,a.email))}`).first());
   assert.equal((await f.db.prepare('SELECT is_stale FROM drafts WHERE id=?').bind(draftId).first())!.is_stale,1);
   assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(messageId).first())!.state,'cancelled');
   await assert.rejects(()=>new OutreachRepository(f.db).createDraft(current.opportunityId,{contactId:current.contactId,subject:'New draft',body:'Blocked'},f.actor),/must not be contacted/);
   await assert.rejects(()=>new ApprovalRepository(f.db).approve(draftId,1,f.actor,{now,scheduledAt:'2026-10-12T10:00:00Z'}),/no longer permitted/);
   let sends=0;await new OutreachService(f.db,{async send(){sends++;return {providerMessageId:'test-only'};}}).dispatchDue(due);assert.equal(sends,0);
  }
 }finally{await f.dispose();}
});

test('RECORD-012 prepared mailbox creation fails closed across a newly committed privacy context',async()=>{
 const f=await launchFixture();try{
  for(const method of ['records','workbench']){
   const a=await f.customer();await f.db.prepare('DELETE FROM privacy_matching_contexts').run();
   const stop=await contactStopStatements(f.db,a.contactId,[a.email]);
   await new TestDataRepository(f.db).remove('contact',a.contactId,f.actor);
   const db=intercept(f.db,async()=>{await f.db.batch(stop);});
   await assert.rejects(()=>recreate(f,db,a.email,method));
   assert.equal(await f.db.prepare('SELECT id FROM contacts WHERE email=?').bind(a.email).first(),null);
   const current=await recreate(f,f.db,a.email,method);
   assert.equal((await f.records.detail('contact',current.contactId)).record.contactability,'do_not_contact');
  }
 }finally{await f.dispose();}
});

test('OUT-004 manual draft creation rechecks recipient permission in its atomic transaction',async()=>{
 const f=await launchFixture();try{
  const a=await f.customer(),db=intercept(f.db,async()=>{await f.db.batch(await contactStopStatements(f.db,a.contactId));});
  const before=(await f.db.prepare("SELECT count(*) n FROM timeline_entries WHERE kind='draft.created'").first())!.n;
  await assert.rejects(()=>new OutreachRepository(db).createDraft(a.opportunityId,{contactId:a.contactId,subject:'Raced draft',body:'Blocked'},f.actor),/permission changed/);
  assert.equal((await f.db.prepare('SELECT count(*) n FROM drafts').first())!.n,0);
  assert.equal((await f.db.prepare("SELECT count(*) n FROM timeline_entries WHERE kind='draft.created'").first())!.n,before);
 }finally{await f.dispose();}
});
