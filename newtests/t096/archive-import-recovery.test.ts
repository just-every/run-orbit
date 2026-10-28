import assert from 'node:assert/strict';
import {test} from 'node:test';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fixture,nativeRecord,collaborator,signIn} from './fixture';
import {nativeArchiveHttp} from './native-archive-http-fixture';
import {emittedRequest} from './emitted-request';
import {rerTransfer} from './rer-transfer';
import {createApp} from '../../tests/support/app';
import {archiveContentIdentity} from '../../src/core/shared/archive-identity';

const base='/api/v1/records/archive';
async function ownerSchema(db:D1Database){
 await db.prepare('CREATE TABLE owner_recovery_data(id TEXT PRIMARY KEY,payload BLOB,amount INTEGER,ratio REAL,note TEXT)').run();
 await db.prepare('CREATE TABLE owner_recovery_detail(id TEXT PRIMARY KEY,parent TEXT NOT NULL REFERENCES owner_recovery_data(id))').run();
 await db.prepare('CREATE INDEX owner_recovery_note ON owner_recovery_data(note)').run();
 await db.prepare('CREATE VIEW owner_recovery_gate AS SELECT 1 AS allowed').run();
 await db.prepare("CREATE TRIGGER owner_recovery_insert BEFORE INSERT ON owner_recovery_data WHEN (SELECT allowed FROM owner_recovery_gate)=0 BEGIN SELECT RAISE(ABORT,'Changed owner view blocks table inserts'); END").run();
 await db.prepare('CREATE TRIGGER owner_recovery_view_update INSTEAD OF UPDATE ON owner_recovery_gate BEGIN UPDATE owner_recovery_data SET note=NEW.allowed WHERE 0; END').run();
}
async function preimage(db:D1Database){return{
 schema:(await db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE name GLOB 'owner_recovery_*' OR tbl_name GLOB 'owner_recovery_*' ORDER BY type,name").all()).results,
 data:(await db.prepare('SELECT id,hex(payload) bytes,amount,ratio,note FROM owner_recovery_data ORDER BY id').all()).results,
 detail:(await db.prepare('SELECT * FROM owner_recovery_detail ORDER BY id').all()).results,
 operators:(await db.prepare('SELECT * FROM operators ORDER BY id').all()).results,
 memberships:(await db.prepare('SELECT * FROM access_memberships ORDER BY operator_id').all()).results,
 privacy:(await db.prepare('SELECT * FROM privacy_matching_contexts ORDER BY context_id').all()).results,
};}

test('interrupted native archive discovery, rollback and CLI resume keep the frozen snapshot, destination preimage and fresh restored authority',async()=>{
 const source=await fixture(),target=await fixture();let sourceListener:Awaited<ReturnType<typeof nativeArchiveHttp>>|undefined,targetListener:Awaited<ReturnType<typeof nativeArchiveHttp>>|undefined;
 try{
  await ownerSchema(source.db);await ownerSchema(target.db);
  for(const [f,id] of [[source,'source'],[target,'target']] as const){await f.db.prepare('INSERT INTO owner_recovery_data VALUES(?,?,?,?,?)').bind(id,Uint8Array.of(0,1,127,128,255).buffer,Number.MAX_SAFE_INTEGER,2.75,'typed '+id).run();await f.db.prepare('INSERT INTO owner_recovery_detail VALUES(?,?)').bind('detail-'+id,id).run();}
  const record=await nativeRecord(source,'contact',{name:'Original frozen export',email:'frozen@fixture.test'}),restricted=await collaborator(source,'seller'),destinationRestricted=await collaborator(target,'seller');
  let observed=false,failObservation=true;
  const exportDb=new Proxy(source.db,{get(real,key){
   if(key==='batch')return async(statements:D1PreparedStatement[])=>{const result=await real.batch(statements);if(await real.prepare("SELECT 1 FROM archive_jobs WHERE kind='export' AND state='snapshotting'").first())observed=true;return result;};
   if(key==='prepare')return(sql:string)=>{const statement=real.prepare(sql);if(sql!=='SELECT 1 AS archive_storage_observation')return statement;return new Proxy(statement,{get(prepared,method){if(method==='all')return async()=>{const actual=await prepared.all();return observed&&failObservation?{...actual,meta:{...actual.meta,size_after:undefined}}:actual;};const value=Reflect.get(prepared,method);return typeof value==='function'?value.bind(prepared):value;}});};const value=Reflect.get(real,key);return typeof value==='function'?value.bind(real):value;
  }});
  const app=(db:D1Database)=>createApp({database:db,assets:{fetch:async()=>{throw Error('API-only archive journey');}}});
  sourceListener=await nativeArchiveHttp(app(exportDb),source.target.directory);
  const peerCreated=await emittedRequest(sourceListener,source.cookie,'/api/v1/settings/operators','POST',{email:'other-owner@recovery.test',displayName:'Other full operator'});assert.equal(peerCreated.status,201);const peer=await signIn(source.db,'other-owner@recovery.test');
  const sourceRequest=(path:string,method='GET',body?:unknown,cookie=source.cookie)=>emittedRequest(sourceListener!,cookie,base+path,method,body);
  const failed=await sourceRequest('/exports','POST',{});assert.equal(failed.status,409);const exportId=(await failed.json() as any).archiveJobId;assert.ok(exportId);
  let frozen=(await(await sourceRequest('/exports')).json() as any).jobs[0];assert.equal(frozen.id,exportId);
  await source.db.prepare("UPDATE contacts SET name='New live value' WHERE id=?").bind(record.ref.id).run();
  assert.deepEqual((await(await sourceRequest('/exports','GET',undefined,peer.cookie)).json() as any).jobs,[]);
  assert.equal((await sourceRequest(`/exports/${exportId}/abort`,'POST',{},peer.cookie)).status,404);
  failObservation=false;
  for(let steps=0;frozen.state!=='ready';steps++){assert.ok(steps<500);const response=await sourceRequest(`/exports/${exportId}/advance`,'POST',{});assert.equal(response.status,200);frozen=await response.json();}
  const archive=await(await sourceRequest(`/exports/${exportId}/download`)).json() as any;assert.equal(archive.parts.flatMap((part:any)=>part.records).find((row:any)=>row.table==='contacts').row.name,'Original frozen export');
  await sourceRequest(`/exports/${exportId}/abort`,'POST',{});
  let mode:'ack'|'observation'|'none'='ack',committed=false,mutations=0,id='',lostFinish=false,failedCleanup=false;
  const importDb=new Proxy(target.db,{get(real,key){
   if(key==='batch')return async(statements:D1PreparedStatement[])=>{
    const beforeCount=await real.prepare("SELECT count(*) n FROM archive_jobs WHERE kind='import'").first<number>('n'),before=id?await real.prepare('SELECT state FROM archive_jobs WHERE id=?').bind(id).first<string>('state'):undefined;
    if(before==='complete'&&lostFinish&&!failedCleanup){failedCleanup=true;throw new TypeError('Injected terminal cleanup transport loss');}
    const result=await real.batch(statements),afterCount=await real.prepare("SELECT count(*) n FROM archive_jobs WHERE kind='import'").first<number>('n'),after=id?await real.prepare('SELECT state FROM archive_jobs WHERE id=?').bind(id).first<string>('state'):undefined;
    if(afterCount!>beforeCount!){mutations++;committed=true;if(mode==='ack'){mode='none';throw new TypeError('Injected committed create acknowledgement loss');}}
    if(id&&before==='restoring'&&after==='complete'&&!lostFinish){lostFinish=true;throw new TypeError('Injected committed finish acknowledgement loss');}
    return result;
   };
   if(key==='prepare')return(sql:string)=>{const statement=real.prepare(sql);if(sql!=='SELECT 1 AS archive_storage_observation')return statement;return new Proxy(statement,{get(prepared,method){if(method==='all')return async()=>{const actual=await prepared.all();return committed&&mode==='observation'?{...actual,meta:{...actual.meta,size_after:undefined}}:actual;};const value=Reflect.get(prepared,method);return typeof value==='function'?value.bind(prepared):value;}});};const value=Reflect.get(real,key);return typeof value==='function'?value.bind(real):value;
  }});
  targetListener=await nativeArchiveHttp(app(importDb),target.target.directory);
  const request=(path:string,method='GET',body?:unknown,cookie=target.cookie)=>emittedRequest(targetListener!,cookie,base+path,method,body),contentDigest=await archiveContentIdentity(archive.manifest,archive.parts),create=()=>request('/imports','POST',{confirmed:true,manifest:archive.manifest,contentDigest});
  const invalid=structuredClone(archive.manifest);invalid.tables.pop();assert.equal((await request('/imports','POST',{confirmed:true,manifest:invalid})).status,400);
  const created=await create();assert.equal(created.status,201);let job=await created.json() as any;const rollbackId=job.id;assert.equal(mutations,1);assert.equal((await(await create()).json() as any).id,rollbackId);assert.equal(mutations,1);
  const otherDigest=await archiveContentIdentity(archive.manifest,archive.parts.map((part:any,index:number)=>({index,sha256:index?'a'.repeat(64):'b'.repeat(64)})));assert.equal((await request('/imports','POST',{confirmed:true,manifest:archive.manifest,contentDigest:otherDigest})).status,409);
  assert.equal((await request(`/imports/${rollbackId}/parts/0`,'PUT',{...archive.parts[0],sha256:'0'.repeat(64)})).status,400);
  const before=await preimage(target.db);for(const part of archive.parts)assert.equal((await request(`/imports/${rollbackId}/parts/${part.index}`,'PUT',part)).status,200);
  // Interrupt after destructive work, then change a real owner view to exercise exact rollback of DDL as well as typed data.
  for(let steps=0;await target.db.prepare('SELECT count(*) n FROM owner_recovery_data').first('n');steps++){assert.ok(steps<1000);const response=await request(`/imports/${rollbackId}/finalize`,'POST',{});assert.equal(response.status,200);job=await response.json();}
  await target.db.prepare('DROP VIEW owner_recovery_gate').run();await target.db.prepare('CREATE VIEW owner_recovery_gate AS SELECT 0 AS allowed').run();await target.db.prepare('CREATE TRIGGER owner_recovery_view_update INSTEAD OF UPDATE ON owner_recovery_gate BEGIN DELETE FROM owner_recovery_data; END').run();
  assert.ok((await request(`/imports/${rollbackId}/finalize`,'POST',{})).status>=400);
  assert.ok((await request(`/imports/${rollbackId}/abort`,'POST',{},destinationRestricted.cookie)).status>=400);
  for(let steps=0;job.state!=='aborted';steps++){assert.ok(steps<2000);const response=await request(`/imports/${rollbackId}/abort`,'POST',{});assert.equal(response.status,200,await response.clone().text());job=await response.json();}
  assert.deepEqual(await preimage(target.db),before);assert.equal(await target.db.prepare('SELECT count(*) n FROM archive_storage_reservations').first('n'),0);assert.deepEqual((await target.db.prepare('PRAGMA foreign_key_check').all()).results,[]);
  // The same file resumes the same committed import after a lost create acknowledgement and an unavailable storage observation.
  committed=false;mode='observation';const file=join(source.target.directory,'recovery.rer'),session=join(target.target.directory,'session');await writeFile(file,JSON.stringify({format:archive.format??'orbit-export',version:3,manifest:archive.manifest}).slice(0,-1)+',"parts":[\n'+archive.parts.map((part:any,index:number)=>(index?',':'')+JSON.stringify(part)).join('\n')+'\n]}\n',{mode:0o600});await writeFile(session,target.cookie,{mode:0o600});
  const cli=()=>rerTransfer('import',targetListener!.origin,session,file,targetListener!.certificate.certPath);
  assert.equal((await cli()).ok,false);assert.equal(mutations,2);const pending=(await(await request('/imports')).json() as any).jobs;assert.equal(pending.length,1);id=pending[0].id;assert.equal((await(await create()).json() as any).archiveJobId,id);assert.equal(mutations,2);
  mode='none';const resumed=await cli();assert.match(resumed.stdout,new RegExp(`Restore transfer ${id}`));assert.equal(resumed.ok,false,'lost terminal acknowledgement cannot report success');assert.equal(lostFinish,true);assert.equal(await target.db.prepare('SELECT state FROM archive_jobs WHERE id=?').bind(id).first('state'),'complete');assert.equal(mutations,2);
  assert.equal((await request('/exports')).status,401,'destination session cannot survive restore');
  const denied=await signIn(target.db,restricted.operator.email);assert.equal((await request('/exports','POST',{},denied.cookie)).status,403);
  const fresh=await signIn(target.db,source.operator.email);assert.equal(fresh.operator.operatorId,source.operator.operatorId);
  assert.ok((await request('/exports','POST',{},fresh.cookie)).status>=400);assert.equal(failedCleanup,true);
  const recovered=await request('/exports','POST',{},fresh.cookie);assert.equal(recovered.status,201);const next=await recovered.json() as any;assert.equal(await target.db.prepare('SELECT count(*) n FROM archive_storage_reservations WHERE job_id=?').bind(id).first('n'),0);assert.equal(await target.db.prepare('SELECT name FROM contacts WHERE id=?').bind(record.ref.id).first('name'),'Original frozen export');assert.equal(await target.db.prepare('SELECT count(*) n FROM operators WHERE id=?').bind(target.operator.operatorId).first('n'),0);
  await request(`/exports/${next.id}/abort`,'POST',{},fresh.cookie);assert.equal(await target.db.prepare("SELECT count(*) n FROM sqlite_master WHERE name GLOB 'archive_stage_*'").first('n'),0);
 }finally{await targetListener?.dispose();await sourceListener?.dispose();await source.close();await target.close();}
});
