import assert from 'node:assert/strict';
import {test} from 'node:test';
import {isolatedDatabase} from '../support/isolated-database';
import {ArchiveExportRepository} from '../../src/core/features/records/archive-export';
import {createId} from '../../src/core/shared/ids';

async function records(db:D1Database){
 const actor=createId(),company=createId(),now=new Date().toISOString();
 await db.prepare("INSERT INTO operators(id,email,display_name,status,setup_owner,created_at,updated_at) VALUES(?,'snapshot@example.test','Snapshot owner','active',1,?,?)").bind(actor,now,now).run();
 await db.prepare("INSERT INTO companies(id,name,created_at,updated_at) VALUES(?,'Before snapshot',?,?)").bind(company,now,now).run();
 return {actor,company,now};
}

test('DATA-001 BASE-DATA-001 export creation acknowledges the real atomic commit without post-copy RPC reads; advance initializes immutable contents',async()=>{
 const fixture=await isolatedDatabase();
 try{
  const {actor,company}=await records(fixture.db);let committed=false,batches=0;
  const transport={prepare:(sql:string)=>{assert.equal(committed,false,'No D1 read may follow the long committed copy inside its creation request');return fixture.db.prepare(sql);},batch:async(statements:D1PreparedStatement[])=>{batches++;const result=await fixture.db.batch(statements);committed=true;return result;}} as D1Database;
  const created=await new ArchiveExportRepository(transport).create(actor);assert.equal(batches,1);assert.equal(created.state,'preparing');assert.equal(created.completedTables,0);
  const job=await fixture.db.prepare('SELECT state FROM archive_jobs WHERE id=?').bind(created.id).first<{state:string}>();assert.equal(job?.state,'snapshotting');
  await fixture.db.prepare("UPDATE companies SET name='After snapshot' WHERE id=?").bind(company).run();
  const repo=new ArchiveExportRepository(fixture.db);assert.deepEqual(await repo.status(created.id,actor),created);
  let status=await repo.advance(created.id,actor);for(let i=0;i<100&&status.state!=='ready';i++)status=await repo.advance(created.id,actor);assert.equal(status.state,'ready');
  const document=await(await repo.download(created.id,actor)).json() as {parts:{records:{table:string;row:Record<string,unknown>}[]}[]};
  const row=document.parts.flatMap(p=>p.records).find(r=>r.table==='companies'&&r.row.id===company);assert.equal(row?.row.name,'Before snapshot');
  assert.equal((await fixture.db.prepare('SELECT name FROM companies WHERE id=?').bind(company).first<{name:string}>())?.name,'After snapshot');
 }finally{await fixture.dispose();}
});

test('DATA-001 BASE-DATA-001 failed atomic snapshot returns failure and leaves neither job, maintenance lock nor partial snapshot tables',async()=>{
 const fixture=await isolatedDatabase();
 try{
  const {actor,company,now}=await records(fixture.db);let batches=0;
  const failed={prepare:fixture.db.prepare.bind(fixture.db),batch:async(statements:D1PreparedStatement[])=>{batches++;return fixture.db.batch([...statements,fixture.db.prepare("INSERT INTO companies(id,name,created_at,updated_at) VALUES(?,'Duplicate must fail',?,?)").bind(company,now,now)]);}} as D1Database;
  await assert.rejects(new ArchiveExportRepository(failed).create(actor),/UNIQUE|constraint/i);assert.equal(batches,1);
  assert.equal((await fixture.db.prepare('SELECT COUNT(*) n FROM archive_jobs').first<{n:number}>())?.n,0);
  assert.equal(await fixture.db.prepare("SELECT 1 FROM runtime_controls WHERE name='archive_export'").first(),null);
  assert.equal((await fixture.db.prepare("SELECT name FROM sqlite_master WHERE name LIKE 'archive_snapshot_%'").all()).results.length,0);
  assert.equal((await fixture.db.prepare('SELECT name FROM companies WHERE id=?').bind(company).first<{name:string}>())?.name,'Before snapshot');
 }finally{await fixture.dispose();}
});

test('DATA-001 BASE-DATA-001 lost snapshot batch acknowledgement is reconciled from the exact durable job without a second mutation',async()=>{
 const fixture=await isolatedDatabase();
 try{
  const {actor,company}=await records(fixture.db);let batches=0;
  const interrupted={prepare:fixture.db.prepare.bind(fixture.db),batch:async(statements:D1PreparedStatement[])=>{batches++;await fixture.db.batch(statements);throw new TypeError('Snapshot acknowledgement connection closed');}} as D1Database;
  const created=await new ArchiveExportRepository(interrupted).create(actor);assert.equal(created.state,'preparing');assert.equal(batches,1);
  assert.equal((await fixture.db.prepare('SELECT COUNT(*) n FROM archive_jobs').first<{n:number}>())?.n,1);
  await fixture.db.prepare("UPDATE companies SET name='After acknowledgement loss' WHERE id=?").bind(company).run();
  const repo=new ArchiveExportRepository(fixture.db);let status=await repo.advance(created.id,actor);for(let i=0;i<100&&status.state!=='ready';i++)status=await repo.advance(created.id,actor);assert.equal(status.state,'ready');
  const document=await(await repo.download(created.id,actor)).json() as {parts:{records:{table:string;row:Record<string,unknown>}[]}[]};
  assert.equal(document.parts.flatMap(p=>p.records).find(r=>r.table==='companies'&&r.row.id===company)?.row.name,'Before snapshot');
 }finally{await fixture.dispose();}
});
