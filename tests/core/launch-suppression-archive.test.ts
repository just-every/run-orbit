import assert from 'node:assert/strict';
import {test} from 'node:test';
import {launchFixture} from '../support/launch-fixture';
import {TestDataRepository} from '../support/record-data';
import {ArchiveImportRepository} from '../../src/core/features/records/archive-import';
import {archiveCatalog,archiveHash} from '../../src/core/features/records/archive-schema';
import {suppressionHashes,suppressionPredicate} from '../../src/core/features/records/suppression';

async function upload(db:D1Database,archive:Awaited<ReturnType<TestDataRepository['export']>>,actor:string){
 const catalog=await archiveCatalog(db),parts=[];for(const table of catalog){const records=archive.tables[table.name].map((row,index)=>({table:table.name,index,row}));if(records.length)parts.push({index:parts.length,records,sha256:await archiveHash(records)});}
 const manifest={format:'orbit-export',version:2,exportedAt:archive.exportedAt,tables:catalog.map(table=>({name:table.name,columns:table.columns.map(column=>column.name),rows:archive.tables[table.name].length})),parts:parts.length,rows:parts.reduce((n,part)=>n+part.records.length,0)},repo=new ArchiveImportRepository(db);
 const job=await repo.create(manifest,actor);for(const part of parts)await repo.upload(job.id,part.index,part,actor);return {repo,id:job.id};
}
async function stopAndErase(f:Awaited<ReturnType<typeof launchFixture>>,email:string){const contact=await f.records.save('contact',{name:'Erase safety proof',email,contactability:'do_not_contact'},f.actor);await new TestDataRepository(f.db).remove('contact',contact.id,f.actor);}
async function proofExists(db:D1Database,email:string){return !!await db.prepare(`SELECT 1 WHERE ${suppressionPredicate(await suppressionHashes(db,email))}`).first();}

test('DATA-001 DATA-002 private archive carries keyed anonymous proofs; multiple contexts remain matchable, explicit clear works and failed restore rolls back exactly',async()=>{
 const source=await launchFixture(),target=await launchFixture();try{
  await stopAndErase(source,'source-erased@customer.test');await source.records.save('contact',{name:'Incoming customer',email:'incoming@customer.test'},source.actor);
  await stopAndErase(target,'destination-erased@customer.test');
  const archive=await new TestDataRepository(source.db).export(),before=await new TestDataRepository(target.db).export();
  const beforeHash=await archiveHash(before.tables),job=await upload(target.db,archive,target.actor);
  await target.db.prepare("CREATE TRIGGER test_restore_failure BEFORE INSERT ON contacts BEGIN SELECT RAISE(ABORT,'Injected restore persistence failure'); END").run();
  let failed=false;for(let i=0;i<600&&!failed;i++){try{await job.repo.advance(job.id,target.actor);}catch(error){assert.match(String(error),/Injected restore persistence failure/);failed=true;}}assert.equal(failed,true);
  await target.db.prepare('DROP TRIGGER test_restore_failure').run();let status=await job.repo.abort(job.id,target.actor);for(let i=0;i<600&&status.state!=='aborted';i++)status=await job.repo.advance(job.id,target.actor);assert.equal(status.state,'aborted');
  assert.equal(await archiveHash((await new TestDataRepository(target.db).export()).tables),beforeHash,'Rollback restores every original domain row without disclosing private context values');
  assert.equal(await proofExists(target.db,'source-erased@customer.test'),false);assert.equal(await proofExists(target.db,'destination-erased@customer.test'),true);
  await new TestDataRepository(target.db).restore(archive,target.actor);
  assert.equal(await proofExists(target.db,'source-erased@customer.test'),true);assert.equal(await proofExists(target.db,'destination-erased@customer.test'),true);
  const restored=await target.records.save('contact',{name:'Recreated',email:' SOURCE-ERASED@CUSTOMER.TEST '},source.actor);const row=(await target.records.detail('contact',restored.id)).record;assert.equal(row.contactability,'do_not_contact');
  // Trusted direct operator action remains compatible; clearing all matching contexts does not clear another address.
  const auditBefore=(await target.db.prepare("SELECT * FROM audit_entries WHERE action='contact.suppressed'").all()).results;await target.records.save('contact',{...row,contactability:'contactable'},source.actor,restored.id);assert.deepEqual((await target.db.prepare("SELECT * FROM audit_entries WHERE action='contact.suppressed'").all()).results,auditBefore);assert.ok(await target.db.prepare("SELECT id FROM audit_entries WHERE action='contact.suppression_cleared'").first());assert.equal(await proofExists(target.db,row.email),false);assert.equal(await proofExists(target.db,'destination-erased@customer.test'),true);
  const contexts=(await target.db.prepare('SELECT count(*) n FROM privacy_matching_contexts').first())!.n;assert.equal(contexts,2);
 }finally{await source.dispose();await target.dispose();}
});
