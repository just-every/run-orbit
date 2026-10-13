import assert from 'node:assert/strict';
import {test} from 'node:test';
import {exactMainDatabase,acceptedMain} from './main-fixture';
import {immutableNativeApp} from './immutable-native-app';
import {archiveHttp,httpArchive} from './archive-http-proof';
import {legacySignIn} from './fixture';
import {createId} from '../../src/core/shared/ids';
import {createApp} from '../../tests/support/app';
import {ArchiveExportRepository} from '../../src/core/features/records/archive-export';
import {foldExportProfile} from '../../src/core/features/records/archive-fold-profile';
import {readArchiveFile} from '../../src/core/shared/archive-file';

test('immutable native snapshotting, preparing and ready exports survive ordinary upgrade; new v2 and v3 jobs retain their explicit aliased layout',async()=>{
 for(const phase of ['snapshotting','preparing','ready']){const target=await exactMainDatabase();try{
  const owner=createId(),stage=createId();await target.db.prepare('INSERT INTO owner_bootstrap VALUES(?,?,?,?,?,?,?,?,?)').bind('initial-owner',owner,'export-owner@fixture.test','Export owner','Export workspace','UTC','USD',JSON.stringify([{id:stage,name:'New'}]),new Date().toISOString()).run();
  for(let i=0;i<12;i++){await target.db.prepare(`CREATE TABLE owner_export_${i}(id TEXT PRIMARY KEY,value TEXT,c_0 TEXT)`).run();await target.db.prepare(`INSERT INTO owner_export_${i} VALUES('frozen',?,?)`).bind(`original ${i}`,`literal named column ${i}`).run();}
  const native=await legacySignIn(target.db,'export-owner@fixture.test'),old=await immutableNativeApp(target.directory,acceptedMain,target.db),request=archiveHttp(old.app,()=>native.cookie),oracle=await httpArchive(request);
  let job=await(await request('/exports','POST',{})).json() as any;
  if(phase!=='snapshotting')job=await(await request(`/exports/${job.id}/advance`,'POST',{})).json();
  if(phase==='ready')while(job.state!=='ready')job=await(await request(`/exports/${job.id}/advance`,'POST',{})).json();
  assert.equal(await target.db.prepare('SELECT state FROM archive_jobs WHERE id=?').bind(job.id).first('state'),phase);
  const progress=JSON.parse(await target.db.prepare('SELECT progress_json FROM archive_jobs WHERE id=?').bind(job.id).first<string>('progress_json')!);assert.equal(progress.snapshotLayout,undefined);
  await target.db.prepare("UPDATE owner_export_0 SET value='live edit after immutable snapshot'").run();await target.migrateFold();
  const current=archiveHttp(createApp({database:target.db,assets:{fetch:async()=>{throw Error('API-only upgrade proof');}}}),()=>native.cookie);
  while(job.state!=='ready')job=await(await current(`/exports/${job.id}/advance`,'POST',{})).json();
  const text=await(await current(`/exports/${job.id}/download`)).text(),document=JSON.parse(text),entries=[];
  for await(const entry of old.readArchiveFile(new Response(text).body!))entries.push(entry);
  assert.equal(entries.length,oracle.parts.length+1);assert.deepEqual(document.parts,oracle.parts);assert.deepEqual(document.manifest.tables,oracle.manifest.tables);assert.equal(document.manifest.rows,oracle.manifest.rows);assert.equal(document.manifest.parts,oracle.manifest.parts);
  assert.equal(await target.db.prepare('SELECT value FROM owner_export_0').first('value'),'live edit after immutable snapshot');
  await current(`/exports/${job.id}/abort`,'POST',{});await current(`/exports/${oracle.id}/abort`,'POST',{});
  if(phase==='snapshotting')for(const profile of [undefined,foldExportProfile]){const repository=new ArchiveExportRepository(target.db,profile),created=await repository.create(native.operator.operatorId);let status=created;const stored=JSON.parse(await target.db.prepare('SELECT progress_json FROM archive_jobs WHERE id=?').bind(created.id).first<string>('progress_json')!);assert.equal(stored.snapshotLayout,'aliased-v1');while(status.state!=='ready')status=await repository.advance(created.id,native.operator.operatorId);const text=await(await repository.download(created.id,native.operator.operatorId)).text(),document=JSON.parse(text),entries=[];for await(const entry of readArchiveFile(new Response(text).body!))entries.push(entry);assert.equal(document.manifest.version,profile?3:2);assert.equal(entries.length,document.parts.length+1);assert.equal(document.parts.flatMap((p:any)=>p.records).find((r:any)=>r.table==='owner_export_0').row.value,'live edit after immutable snapshot');await repository.abort(created.id,native.operator.operatorId);}
 }finally{await target.dispose();}}
});
