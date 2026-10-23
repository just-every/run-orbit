import {reviewedMerge} from '../support/reviewed-merge';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {launchFixture} from '../support/launch-fixture';
import {TestDataRepository} from '../support/record-data';
import {ImportMergeRepository} from '../../src/core/features/records/import-merge';
import {OutreachRepository} from '../../src/core/features/workbench/outreach-repository';
import {ApprovalRepository} from '../../src/core/features/outreach/approval-repository';
import {OutreachService} from '../../src/core/features/outreach/service';
import {ArchiveImportRepository} from '../../src/core/features/records/archive-import';
import {archiveHash} from '../../src/core/features/records/archive-schema';
import {currentFixtureArchive} from '../support/current-archive';
import {clearContactSuppression} from '../../src/core/features/records/suppression';
import {contactStopStatements} from '../../src/core/features/records/suppression-effects';

const now=new Date('2026-10-12T09:00:00Z'),due=new Date('2026-10-12T11:00:00Z');
async function work(f:Awaited<ReturnType<typeof launchFixture>>,c:{contactId:string;opportunityId:string}){
 const draft=await new OutreachRepository(f.db).createDraft(c.opportunityId,{contactId:c.contactId,subject:'Reviewed before inherited stop',body:'Must remain unsent'},f.actor);
 const message=await new ApprovalRepository(f.db).approve(draft.id,1,f.actor,{now,scheduledAt:'2026-10-12T10:00:00Z'});
 return {draftId:draft.id,messageId:message.id};
}
async function assertStopped(db:D1Database,contactId:string,actor:string,w:Awaited<ReturnType<typeof work>>){
 const row=await db.prepare('SELECT email,updated_at,contactability_revision,contactability FROM contacts WHERE id=?').bind(contactId).first<any>();
 assert.equal(row.contactability,'do_not_contact');
 assert.equal((await db.prepare('SELECT is_stale FROM drafts WHERE id=?').bind(w.draftId).first())!.is_stale,1);
 assert.equal((await db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(w.messageId).first())!.state,'cancelled');
 await clearContactSuppression(db,contactId,actor,{email:row.email,updatedAt:row.updated_at,revision:row.contactability_revision});
 await assert.rejects(()=>new ApprovalRepository(db).approve(w.draftId,1,actor,{now,scheduledAt:'2026-10-12T10:00:00Z'}),/no longer permitted/);
 let sends=0;await new OutreachService(db,{async send(){sends++;return {providerMessageId:'test-only'};}}).dispatchDue(due);assert.equal(sends,0);
 assert.equal((await db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(w.messageId).first())!.state,'cancelled');
}
async function upload(db:D1Database,archive:Awaited<ReturnType<TestDataRepository['export']>>,actor:string){
 const {manifest,parts}=await currentFixtureArchive(db,archive),repo=new ArchiveImportRepository(db,true);
 const job=await repo.create(manifest,actor);for(const part of parts)await repo.upload(job.id,part.index,part,actor);return {repo,id:job.id};
}

test('RECORD-012 merge invalidates survivor work when it inherits DNC, including a concurrent stop',async()=>{
 const f=await launchFixture();try{
  for(const raced of [false,true]){
   const survivor=await f.customer(),retired=await f.customer(),w=await work(f,survivor),history=await f.message(survivor.contactId,survivor.opportunityId,'accepted');
   const before=await archiveHash(await f.db.prepare('SELECT * FROM outbound_messages WHERE id=?').bind(history.id).first());
   if(!raced)await f.db.batch(await contactStopStatements(f.db,retired.contactId));
   let entered=false;const db=raced?new Proxy(f.db,{get(target,key){if(key==='batch')return async(statements:D1PreparedStatement[])=>{if(!entered){entered=true;await target.batch(await contactStopStatements(target,retired.contactId));}return target.batch(statements);};const value=(target as any)[key];return typeof value==='function'?value.bind(target):value;}}):f.db;
   await reviewedMerge(new ImportMergeRepository(db),'contact',survivor.contactId,retired.contactId,{email:'survivor',contactability:'survivor'},f.actor);
   await assertStopped(f.db,survivor.contactId,f.actor,w);
   assert.equal(await archiveHash(await f.db.prepare('SELECT * FROM outbound_messages WHERE id=?').bind(history.id).first()),before,'Committed sent history is unchanged');
  }
 }finally{await f.dispose();}
});

test('DATA-001 restore disables inherited approvals after all tables load, preserves history, and rolls back a genuine finalization failure exactly',async()=>{
 const source=await launchFixture(),target=await launchFixture(),normal=await launchFixture();try{
  const c=await source.customer(),w=await work(source,c),alias=await source.customer();
  await reviewedMerge(new ImportMergeRepository(source.db),'contact',c.contactId,alias.contactId,{email:'survivor'},source.actor);
  // Survivor work stays fresh when a normal merge inherits no stop.
  assert.equal((await source.db.prepare('SELECT is_stale FROM drafts WHERE id=?').bind(w.draftId).first())!.is_stale,0);
  const history=await source.message(c.contactId,c.opportunityId,'accepted'),archive=await new TestDataRepository(source.db).export();
  const retained=(await new TestDataRepository(normal.db).export()).tables,retainedOperators=retained.operators;
  await new TestDataRepository(normal.db).restore(archive,normal.actor);
  const roundtrip=(await new TestDataRepository(normal.db).export()).tables;
  const byId=(a:Record<string,any>,b:Record<string,any>)=>String(a.id).localeCompare(String(b.id));
  assert.deepEqual([...roundtrip.operators].sort(byId),[...archive.tables.operators,...retainedOperators].sort(byId),'Restore keeps exact archive identities and destination operators');
  const expectedMessages=archive.tables.outbound_messages.map(row=>{
   if(row.state!=='scheduled')return row;
   const restored=roundtrip.outbound_messages.find(candidate=>candidate.id===row.id)!;
   assert.equal(restored.state,'cancelled','Restore removes source approval even for a contactable recipient and active operator');
   assert.match(String(restored.failure),/restore.*review/i);
   assert.ok(Date.parse(String(restored.updated_at))>=Date.parse(archive.exportedAt),'Cancellation records the restore time');
   return {...row,state:'cancelled',failure:restored.failure,updated_at:restored.updated_at};
  });
  // Folded archives additionally expose native identity projections. The current
  // installation's operator survives restore together with their exact projection.
  for(const name of ['access_memberships','original_operator_provisions']){
   const byOperator=(a:Record<string,any>,b:Record<string,any>)=>String(a.operator_id).localeCompare(String(b.operator_id));
   assert.deepEqual([...roundtrip[name]].sort(byOperator),[...archive.tables[name],...retained[name]].sort(byOperator),`Restore retains source and destination native identity fields in ${name}`);
  }
  for(const [name,rows] of Object.entries(archive.tables))if(!['audit_entries','operators','access_memberships','original_operator_provisions'].includes(name))assert.equal(await archiveHash(roundtrip[name]),await archiveHash(name==='outbound_messages'?expectedMessages:rows),`Normal archive table ${name} preserves every field except renewed dispatch authority`);
  let normalSends=0;await new OutreachService(normal.db,{async send(){normalSends++;return {providerMessageId:'test-only'};}}).dispatchDue(due);assert.equal(normalSends,0,'A normal restore cannot dispatch the source installation approval');
  // The destination retains suppression for an imported alias, not only its primary mailbox.
  const stopped=await target.records.save('contact',{name:'Destination stop',email:alias.email,contactability:'do_not_contact'},target.actor);
  await new TestDataRepository(target.db).remove('contact',stopped.id,target.actor);
  await target.db.prepare("CREATE TRIGGER test_inherited_stop_failure BEFORE UPDATE OF state ON outbound_messages WHEN NEW.state='cancelled' AND EXISTS(SELECT 1 FROM runtime_controls WHERE name='test_inherited_stop_failure') BEGIN SELECT RAISE(ABORT,'Injected final stop failure'); END").run();
  const before=await archiveHash((await new TestDataRepository(target.db).export()).tables),job=await upload(target.db,archive,target.actor);
  await target.db.prepare("INSERT INTO runtime_controls VALUES('test_inherited_stop_failure','enabled')").run();
  let failed=false;for(let i=0;i<1000&&!failed;i++)try{await job.repo.advance(job.id,target.actor);}catch(error){assert.match(String(error),/Injected final stop failure/);failed=true;}
  assert.equal(failed,true);
  assert.equal((await target.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(w.messageId).first())!.state,'scheduled','Failed finalization rolled back cancellation');
  assert.equal((await target.db.prepare('SELECT is_stale FROM drafts WHERE id=?').bind(w.draftId).first())!.is_stale,0,'Failed finalization rolled back stale marking');
  await target.db.prepare("DELETE FROM runtime_controls WHERE name='test_inherited_stop_failure'").run();
  let status=await job.repo.abort(job.id,target.actor);for(let i=0;i<1000&&status.state!=='aborted';i++)status=await job.repo.advance(job.id,target.actor);assert.equal(status.state,'aborted');
  assert.equal(await archiveHash((await new TestDataRepository(target.db).export()).tables),before,'Every destination domain row is restored exactly');
  await new TestDataRepository(target.db).restore(archive,target.actor);
  await assertStopped(target.db,c.contactId,source.actor,w);
  assert.equal(await archiveHash(await target.db.prepare('SELECT * FROM outbound_messages WHERE id=?').bind(history.id).first()),await archiveHash(archive.tables.outbound_messages.find(row=>row.id===history.id)));
 }finally{await source.dispose();await target.dispose();await normal.dispose();}
});


test('RECORD-012 merge inherits an active alias stop after a current-mailbox reviewed clear',async()=>{
 const f=await launchFixture();try{
  const carrier=await f.customer(),alias=await f.customer();
  await f.db.batch(await contactStopStatements(f.db,alias.contactId));
  await reviewedMerge(new ImportMergeRepository(f.db),'contact',carrier.contactId,alias.contactId,{email:'survivor',contactability:'survivor'},f.actor);
  const reviewed=(await f.records.detail('contact',carrier.contactId)).record;
  await clearContactSuppression(f.db,carrier.contactId,f.actor,{email:reviewed.email,updatedAt:reviewed.updated_at,revision:reviewed.contactability_revision});
  const survivor=await f.customer(),w=await work(f,survivor);
  await reviewedMerge(new ImportMergeRepository(f.db),'contact',survivor.contactId,carrier.contactId,{email:'survivor'},f.actor);
  await assertStopped(f.db,survivor.contactId,f.actor,w);
 }finally{await f.dispose();}
});
