import assert from 'node:assert/strict';
import {test} from 'node:test';
import {launchFixture} from '../support/launch-fixture';
import {TestDataRepository} from '../support/record-data';
import {ArchiveImportRepository} from '../../src/core/features/records/archive-import';
import {archiveCatalog,archiveHash} from '../../src/core/features/records/archive-schema';

test('DATA-001 pre-launch native archives restore with explicit schema migration while unknown or incomplete inventories remain rejected',async()=>{
 const source=await launchFixture(),target=await launchFixture();try{
  const contact=await source.records.save('contact',{name:'Legacy stopped customer',email:'legacy-stopped@customer.test'},source.actor);
  await source.db.prepare("UPDATE contacts SET contactability='do_not_contact' WHERE id=?").bind(contact.id).run();
  const archive=await new TestDataRepository(source.db).export(),catalog=(await archiveCatalog(source.db)).filter(t=>!['privacy_matching_contexts','mail_provider_conflicts'].includes(t.name)).map(t=>({...t,columns:t.columns.filter(c=>t.name!=='contacts'||c.name!=='contactability_revision')}));
  const parts=[];for(const table of catalog){const records=archive.tables[table.name].map((row,index)=>({table:table.name,index,row:Object.fromEntries(table.columns.map(c=>[c.name,row[c.name]]))}));if(records.length)parts.push({index:parts.length,records,sha256:await archiveHash(records)});}
  const manifest={format:'orbit-export',version:2,exportedAt:archive.exportedAt,tables:catalog.map(t=>({name:t.name,columns:t.columns.map(c=>c.name),rows:archive.tables[t.name].length})),parts:parts.length,rows:parts.reduce((n,p)=>n+p.records.length,0)},repo=new ArchiveImportRepository(target.db);
  for(const tables of [manifest.tables.slice(1),manifest.tables.map(t=>t.name==='contacts'?{...t,columns:t.columns.slice(1)}:t),[...manifest.tables,{name:'unrecognized_table',columns:['id'],rows:0}]])await assert.rejects(repo.create({...manifest,tables},target.actor),/inventory|columns/);
  const job=await repo.create(manifest,target.actor);for(const part of parts)await repo.upload(job.id,part.index,part,target.actor);
  let status=await repo.status(job.id,target.actor);for(let i=0;i<600&&status.state!=='complete';i++)status=await repo.advance(job.id,target.actor);assert.equal(status.state,'complete');
  const restored=(await target.records.detail('contact',contact.id)).record;assert.equal(restored.contactability,'do_not_contact');assert.equal(restored.contactability_revision,0);
  await new TestDataRepository(target.db).remove('contact',contact.id,source.actor);const recreated=await target.records.save('contact',{name:'Legacy recreated',email:' LEGACY-STOPPED@CUSTOMER.TEST '},source.actor);assert.equal((await target.records.detail('contact',recreated.id)).record.contactability,'do_not_contact');
 }finally{await source.dispose();await target.dispose();}
});
