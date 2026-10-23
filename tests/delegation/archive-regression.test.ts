import assert from 'node:assert/strict';
import {test} from 'node:test';
import {isolatedDatabase} from '../support/isolated-database';
import {authorityFixture} from './authority-fixture';
import {snapshot} from '../../src/core/features/delegation/evidence';
import {ArchiveExportRepository} from '../../src/core/features/records/archive-export';
import {ArchiveImportRepository} from '../../src/core/features/records/archive-import';
import {foldExportProfile} from '../../src/core/features/records/archive-fold-profile';
import {readCurrentArchive} from '../support/current-archive';

test('actual D1 exporter/importer retains handoff and detached-contact provenance, strips authority and revokes destination grants',async()=>{
 const source=await isolatedDatabase(),target=await isolatedDatabase();
 try{
  const f=await authorityFixture(source.db),g=await f.grant(),path='opportunities/opp/handoffs/task',s=await snapshot(source.db,path,true);
  assert.equal((await g.request('/effects',{operationKey:'archived',operation:'orbit.handoff.upsert',target:path,expectedRevision:s.revision,expectedAudienceRevision:s.audience.audienceRevision,content:{title:'Customer onboarding',description:'Retained internal task',assigneeId:'peer',dueAt:null,status:'open'}})).status,200);
  await source.db.prepare("DELETE FROM opportunity_contacts WHERE contact_id='contact'").run();
  const exporter=new ArchiveExportRepository(source.db,foldExportProfile);let exported=await exporter.create('owner');
  for(let i=0;i<200&&exported.state!=='ready';i++)exported=await exporter.advance(exported.id,'owner');
  assert.equal(exported.state,'ready');const archive=await readCurrentArchive(await exporter.download(exported.id,'owner'));
  assert.ok(archive.manifest.tables.some(t=>t.name==='handoff_tasks'&&t.rows===1));assert.ok(archive.manifest.tables.some(t=>t.name==='handoff_contacts'&&t.rows===1));
  assert.ok(archive.manifest.tables.every(t=>!t.name.startsWith('delegation_')));assert.ok(!JSON.stringify(archive).includes(g.token));
  const dest=await authorityFixture(target.db),old=await dest.grant();
  await target.db.prepare("DELETE FROM opportunities").run();await target.db.prepare("DELETE FROM contacts").run();
  const importer=new ArchiveImportRepository(target.db,true);let status=await importer.create(archive.manifest,'owner');
  for(const part of archive.parts)await importer.upload(status.id,part.index,part,'owner');
  for(let i=0;i<500&&status.state!=='complete';i++)status=await importer.advance(status.id,'owner');
  assert.equal(status.state,'complete');assert.equal((await old.request('/identity')).status,401);
  for(const table of ['delegation_grants','delegation_codes','delegation_receipts'])assert.equal((await target.db.prepare(`SELECT count(*) n FROM ${table}`).first<{n:number}>())!.n,0,table);
  for(const table of ['handoff_tasks','handoff_contacts'])assert.deepEqual((await target.db.prepare(`SELECT * FROM ${table}`).all()).results,(await source.db.prepare(`SELECT * FROM ${table}`).all()).results);
  await target.db.prepare("DELETE FROM contacts WHERE id='contact'").run();assert.equal(await target.db.prepare('SELECT * FROM handoff_tasks').first(),null);
 }finally{await source.dispose();await target.dispose();}
});
