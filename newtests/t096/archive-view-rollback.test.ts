import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fixture,collaborator} from './fixture';
import {archiveHttp,httpArchive} from './archive-http-proof';
import {createApp} from '../../tests/support/app';
import {createDependencies} from '../../tests/support/dependencies';
import {ArchiveImportRepository} from '../../src/core/features/records/archive-import';

async function ownerSchema(db:D1Database){
 await db.prepare('CREATE TABLE owner_recovery_data(id TEXT PRIMARY KEY,payload BLOB,amount INTEGER,ratio REAL,note TEXT)').run();
 await db.prepare('CREATE TABLE owner_recovery_detail(id TEXT PRIMARY KEY,parent TEXT NOT NULL REFERENCES owner_recovery_data(id))').run();
 await db.prepare('CREATE INDEX owner_recovery_note ON owner_recovery_data(note)').run();
 await db.prepare('CREATE VIEW owner_recovery_gate AS SELECT 1 AS allowed').run();
 await db.prepare("CREATE TRIGGER owner_recovery_insert BEFORE INSERT ON owner_recovery_data WHEN (SELECT allowed FROM owner_recovery_gate)=0 BEGIN SELECT RAISE(ABORT,'Changed owner view blocks table inserts'); END").run();
 await db.prepare('CREATE TRIGGER owner_recovery_view_update INSTEAD OF UPDATE ON owner_recovery_gate BEGIN UPDATE owner_recovery_data SET note=NEW.allowed WHERE 0; END').run();
}
async function targetPair(db:D1Database){return{
 schema:(await db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE name GLOB 'owner_recovery_*' OR tbl_name GLOB 'owner_recovery_*' ORDER BY type,name").all()).results,
 data:(await db.prepare('SELECT id,hex(payload) AS bytes,typeof(payload) AS payload_type,amount,typeof(amount) AS amount_type,ratio,typeof(ratio) AS ratio_type,note FROM owner_recovery_data ORDER BY id').all()).results,
 detail:(await db.prepare('SELECT * FROM owner_recovery_detail ORDER BY id').all()).results,
 foreignKeys:(await db.prepare('PRAGMA foreign_key_check').all()).results,
};}

test('explicit native rollback restores the exact captured target view and trigger preimage after forward clear, with typed rows and FKs intact',async()=>{
 const source=await fixture(),target=await fixture();try{
  await ownerSchema(source.db);await ownerSchema(target.db);const restricted=await collaborator(target,'seller');
  for(const [f,id] of [[source,'source'],[target,'target']] as const){await f.db.prepare('INSERT INTO owner_recovery_data VALUES(?,?,?,?,?)').bind(id,Uint8Array.of(0,1,127,128,255).buffer,Number.MAX_SAFE_INTEGER,2.75,'typed '+id).run();await f.db.prepare('INSERT INTO owner_recovery_detail VALUES(?,?)').bind('detail-'+id,id).run();}
  const before=await targetPair(target.db),sourceRequest=archiveHttp(createApp({database:source.db,assets:{fetch:async()=>{throw Error('API-only fixture');}}}),()=>source.cookie),archive=await httpArchive(sourceRequest),imports=new ArchiveImportRepository(target.db,true),job=await imports.create(archive.manifest,target.operator.operatorId);
  for(const part of archive.parts)await imports.upload(job.id,part.index,part,target.operator.operatorId);
  for(let step=0;await target.db.prepare('SELECT count(*) n FROM owner_recovery_data').first('n');step++){assert.ok(step<1000);await imports.advance(job.id,target.operator.operatorId);}
  assert.equal((await imports.status(job.id,target.operator.operatorId)).phase,'clear');
  await target.db.prepare('DROP VIEW owner_recovery_gate').run();await target.db.prepare('CREATE VIEW owner_recovery_gate AS SELECT 0 AS allowed').run();await target.db.prepare('CREATE TRIGGER owner_recovery_view_update INSTEAD OF UPDATE ON owner_recovery_gate BEGIN DELETE FROM owner_recovery_data; END').run();
  const drifted=await targetPair(target.db);await assert.rejects(imports.advance(job.id,target.operator.operatorId));assert.deepEqual(await targetPair(target.db),drifted);
  // Forward clear has removed the workspace mapping. The collaborator cannot
  // cross that prerequisite boundary to invoke rollback or change target data.
  const app=createApp({database:target.db,assets:{fetch:async()=>{throw Error('API-only fixture');}}}),denied=await app.request(`https://orbit.test/api/v1/records/archive/imports/${job.id}/abort`,{method:'POST',headers:{Cookie:restricted.cookie,Origin:'https://orbit.test','Content-Type':'application/json'},body:'{}'});assert.equal(denied.status,503);assert.deepEqual(await denied.json(),{error:'Initialize the native workspace first.'});assert.deepEqual(await targetPair(target.db),drifted);
  const original=await target.db.prepare('SELECT catalog_json FROM archive_job_profiles WHERE job_id=?').bind(job.id).first<string>('catalog_json'),tampered=JSON.parse(original!);tampered.find((table:any)=>table.schemaObjects).schemaObjects.find((object:any)=>object.name==='owner_recovery_gate').sql='CREATE VIEW owner_recovery_gate AS SELECT 99 AS allowed';await target.db.prepare('UPDATE archive_job_profiles SET catalog_json=? WHERE job_id=?').bind(JSON.stringify(tampered),job.id).run();await assert.rejects(imports.abort(job.id,target.operator.operatorId),/target archive catalog was changed/);assert.deepEqual(await targetPair(target.db),drifted);await target.db.prepare('UPDATE archive_job_profiles SET catalog_json=? WHERE job_id=?').bind(original,job.id).run();
  let status=await imports.abort(job.id,target.operator.operatorId);for(let steps=0;status.state!=='aborted';steps++){assert.ok(steps<2000);status=await imports.abort(job.id,target.operator.operatorId);}
  assert.deepEqual(await targetPair(target.db),before);assert.equal(await target.db.prepare('SELECT count(*) n FROM archive_storage_reservations').first('n'),0);assert.equal(await target.db.prepare("SELECT count(*) n FROM sqlite_master WHERE name GLOB 'archive_stage_*'").first('n'),0);assert.ok(await createDependencies(target.db).auth.authenticate(target.cookie));assert.equal(await target.db.prepare('SELECT count(*) n FROM operators WHERE id=?').bind(source.operator.operatorId).first('n'),0);await sourceRequest(`/exports/${archive.id}/abort`,'POST',{});
 }finally{await source.close();await target.close();}
});
