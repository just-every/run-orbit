import {foldInstalledCatalog} from '../../src/core/features/records/archive-fold-catalog';
import {archiveSchemaFence} from '../../src/core/features/records/archive-schema-fence';
import assert from 'node:assert/strict';
import {fixture,collaborator} from './fixture';
import {archiveHttp,httpArchive} from './archive-http-proof';
import {createApp} from '../../tests/support/app';
import {createDependencies} from '../../tests/support/dependencies';

export async function ownerSchema(db:D1Database){
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

export async function rollbackRestore(source:Awaited<ReturnType<typeof fixture>>,target:Awaited<ReturnType<typeof fixture>>,archive:Awaited<ReturnType<typeof httpArchive>>){
 await verifyColumnFence(source);
 const restricted=await collaborator(target,'seller');
  const before=await targetPair(target.db),app=createApp({database:target.db,assets:{fetch:async()=>{throw Error('API-only fixture');}}}),request=archiveHttp(app,()=>target.cookie);
  const invalid=structuredClone(archive.manifest);invalid.tables.pop();const refused=await app.request('https://orbit.test/api/v1/records/archive/imports',{method:'POST',headers:{Cookie:target.cookie,Origin:'https://orbit.test','Content-Type':'application/json'},body:JSON.stringify({confirmed:true,manifest:invalid})});assert.equal(refused.status,400);assert.equal(await target.db.prepare('SELECT count(*) n FROM archive_jobs').first('n'),0);
  const job=await(await request('/imports','POST',{confirmed:true,manifest:archive.manifest})).json() as any;
  const changed={...archive.parts[0]!,sha256:'0'.repeat(64)};assert.equal((await app.request(`https://orbit.test/api/v1/records/archive/imports/${job.id}/parts/0`,{method:'PUT',headers:{Cookie:target.cookie,Origin:'https://orbit.test','Content-Type':'application/json'},body:JSON.stringify(changed)})).status,400);assert.equal(await target.db.prepare('SELECT count(*) n FROM archive_parts').first('n'),0);
  for(const part of archive.parts)await request(`/imports/${job.id}/parts/${part.index}`,'PUT',part);
  for(let step=0;await target.db.prepare('SELECT count(*) n FROM owner_recovery_data').first('n');step++){assert.ok(step<1000);await request(`/imports/${job.id}/finalize`,'POST',{});}
  assert.equal(((await(await request(`/imports/${job.id}`)).json()) as any).phase,'clear');
  await target.db.prepare('DROP VIEW owner_recovery_gate').run();await target.db.prepare('CREATE VIEW owner_recovery_gate AS SELECT 0 AS allowed').run();await target.db.prepare('CREATE TRIGGER owner_recovery_view_update INSTEAD OF UPDATE ON owner_recovery_gate BEGIN DELETE FROM owner_recovery_data; END').run();
  const drifted=await targetPair(target.db);await assert.rejects(request(`/imports/${job.id}/finalize`,'POST',{}));assert.deepEqual(await targetPair(target.db),drifted);
  // Forward clear has removed the workspace mapping. The collaborator cannot
  // cross that prerequisite boundary to invoke rollback or change target data.
  const denied=await app.request(`https://orbit.test/api/v1/records/archive/imports/${job.id}/abort`,{method:'POST',headers:{Cookie:restricted.cookie,Origin:'https://orbit.test','Content-Type':'application/json'},body:'{}'});assert.equal(denied.status,503);assert.deepEqual(await denied.json(),{error:'Initialize the native workspace first.'});assert.deepEqual(await targetPair(target.db),drifted);
  const original=await target.db.prepare('SELECT catalog_json FROM archive_job_profiles WHERE job_id=?').bind(job.id).first<string>('catalog_json'),tampered=JSON.parse(original!);tampered.find((table:any)=>table.schemaObjects).schemaObjects.find((object:any)=>object.name==='owner_recovery_gate').sql='CREATE VIEW owner_recovery_gate AS SELECT 99 AS allowed';await target.db.prepare('UPDATE archive_job_profiles SET catalog_json=? WHERE job_id=?').bind(JSON.stringify(tampered),job.id).run();await assert.rejects(request(`/imports/${job.id}/abort`,'POST',{}),/target archive catalog was changed/);assert.deepEqual(await targetPair(target.db),drifted);await target.db.prepare('UPDATE archive_job_profiles SET catalog_json=? WHERE job_id=?').bind(original,job.id).run();
  let status=await(await request(`/imports/${job.id}/abort`,'POST',{})).json() as any;for(let steps=0;status.state!=='aborted';steps++){assert.ok(steps<2000);status=await(await request(`/imports/${job.id}/abort`,'POST',{})).json() as any;}
  assert.deepEqual(await targetPair(target.db),before);assert.equal(await target.db.prepare('SELECT count(*) n FROM archive_storage_reservations').first('n'),0);assert.equal(await target.db.prepare("SELECT count(*) n FROM sqlite_master WHERE name GLOB 'archive_stage_*'").first('n'),0);assert.ok(await createDependencies(target.db).auth.authenticate(target.cookie));assert.equal(await target.db.prepare('SELECT count(*) n FROM operators WHERE id=?').bind(source.operator.operatorId).first('n'),0);

}

async function verifyColumnFence(f:{db:D1Database}){
 await f.db.prepare("CREATE TABLE owner_column_data(id INTEGER PRIMARY KEY,value TEXT NOT NULL DEFAULT 'kept',amount REAL DEFAULT 2.5)").run();
 const columns=await foldInstalledCatalog(f.db),owner=columns.find(table=>table.name==='owner_column_data')!;
 // Older catalogs may omit SQL objects; ordered column metadata still guards writes.
 delete (owner as {objects?:unknown}).objects;
 await f.db.batch([...archiveSchemaFence(f.db,columns),f.db.prepare('INSERT INTO owner_column_data(id) VALUES(1)')]);
 assert.deepEqual(await f.db.prepare('SELECT value,amount FROM owner_column_data').first(),{value:'kept',amount:2.5});
 await f.db.prepare('DELETE FROM owner_column_data').run();
 for(const drift of ['order','missing','extra','type','nullability','key','default'] as const){
  const changed=structuredClone(columns),table=changed.find(table=>table.name===owner.name)!;
  if(drift==='order')table.columns.reverse();
  else if(drift==='missing')table.columns.pop();
  else if(drift==='extra')table.columns.push({...table.columns[0]!,name:'absent_column'});
  else if(drift==='type')table.columns[2]!.type='INTEGER';
  else if(drift==='nullability')table.columns[1]!.notnull=0;
  else if(drift==='key')table.columns[0]!.pk=0;
  else table.columns[1]!.dflt_value=null;
  await assert.rejects(f.db.batch([...archiveSchemaFence(f.db,changed),f.db.prepare('INSERT INTO owner_column_data(id) VALUES(1)')]),drift);
  assert.equal(await f.db.prepare('SELECT count(*) n FROM owner_column_data').first('n'),0,drift);
 }
 await f.db.prepare('DROP TABLE owner_column_data').run();
}
