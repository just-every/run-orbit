import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {exactMainDatabase} from './main-fixture';
import {createId} from '../../src/core/shared/ids';
import {reconcileReleasedOwnership} from '../../src/core/features/ownership/reconcile';
import {RecordsRepository} from '../../src/core/features/records/repository';

/** Upgrade from either installed 0042 — the released native-column bytes or main's no-op — with an owner's maximum-width tables. */
export async function provePriorOwnershipUpgrade(installed:'released'|'no-op'){
 const target=await exactMainDatabase(),released=installed==='released';
 try{
  await target.close();
  const migrations=join(target.directory,'main-migrations');
  for(const name of (await readdir('migrations/core')).filter(name=>Number(name.slice(0,4))>=16&&Number(name.slice(0,4))<=41).sort())
   await writeFile(join(migrations,name),await readFile(join('migrations/core',name)));
  await writeFile(join(migrations,'0042_record_ownership.sql'),await readFile(released?'tests/fixtures/prior-ownership/0042_record_ownership.sql':'migrations/core/0042_record_ownership.sql'));
  execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','migrations','apply','DB','--local','--config',target.config,'--persist-to',target.state],{env:{...process.env,CI:'1'},timeout:120000,stdio:'pipe'});
  await target.reopen();
  let db=target.db;const owner=createId(),stage=createId(),company=createId(),contact=createId(),opportunity=createId(),now=new Date().toISOString();
  await db.prepare('INSERT INTO owner_bootstrap VALUES(?,?,?,?,?,?,?,?,?)').bind('initial-owner',owner,'old-ownership@fold.test','Historical owner','Existing ownership','UTC','USD',JSON.stringify([{id:stage,name:'Existing stage'}]),now).run();
  await db.prepare("INSERT INTO companies(id,name,primary_domain,primary_domain_key,created_at,updated_at) VALUES(?,'Owned company','owned.test','owned.test',?,?)").bind(company,now,now).run();
  await db.prepare("INSERT INTO contacts(id,name,email,email_key,company_id,contactability,created_at,updated_at) VALUES(?,'Owned contact','owned@owned.test','owned@owned.test',?,'do_not_contact',?,?)").bind(contact,company,now,now).run();
  await db.prepare("INSERT INTO opportunities(id,title,lifecycle,stage_id,owner_id,company_id,value_cents,score,band,queue_state,created_at,updated_at) VALUES(?,'Owned deal','open',?,?,?,43210,63,'medium','now',?,?)").bind(opportunity,stage,released?null:owner,company,now,now).run();
  const rows=[{kind:'contact',table:'contacts',id:contact,revision:3},{kind:'company',table:'companies',id:company,revision:7},{kind:'opportunity',table:'opportunities',id:opportunity,revision:11}] as const;
  if(released)for(const row of rows){
   await db.prepare(`UPDATE ${row.table} SET owner_id=? WHERE id=?`).bind(owner,row.id).run();
   await db.prepare(`UPDATE ${row.table} SET owner_revision=? WHERE id=?`).bind(row.revision,row.id).run();
  }
  for(const table of ['contacts','companies']){
   const count=(await db.prepare(`SELECT count(*) n FROM pragma_table_xinfo('${table}') WHERE hidden<>1`).first<number>('n'))!;
   for(let i=count;i<100;i++)await db.prepare(`ALTER TABLE ${table} ADD COLUMN historical_custom_${i} TEXT`).run();
   const columns=(await db.prepare(`SELECT name FROM pragma_table_info('${table}') WHERE name LIKE 'historical_custom_%' ORDER BY cid`).all<{name:string}>()).results.map(row=>row.name);
   await db.prepare(`UPDATE ${table} SET ${columns.map(name=>`${name}=?`).join(',')}`).bind(...columns.map((_,index)=>index%2?'雪🙂é':`${table} retained ${index}`)).run();
   assert.equal(await db.prepare(`SELECT count(*) n FROM pragma_table_xinfo('${table}') WHERE hidden<>1`).first('n'),100);
  }
  await db.batch([db.prepare('CREATE TABLE historical_custom(id TEXT PRIMARY KEY,contact_id TEXT REFERENCES contacts(id),payload BLOB,amount INTEGER,twice INTEGER GENERATED ALWAYS AS(amount*2) STORED) WITHOUT ROWID'),db.prepare('CREATE INDEX historical_custom_amount ON historical_custom(amount)'),db.prepare('CREATE INDEX historical_contact_custom ON contacts(historical_custom_99)')]);
  await db.prepare('INSERT INTO historical_custom(id,contact_id,payload,amount) VALUES(?,?,?,?)').bind('retained',contact,new Uint8Array([0,255,128,1,13,10]).buffer,7).run();
  // Every prior value except the released 0042's own owner columns, which move to record_owners.
  const moved=(table:string)=>table==='opportunities'?['owner_revision']:['owner_id','owner_revision'];
  const before=new Map<string,Record<string,unknown>[]>();
  for(const {table} of rows)before.set(table,(await db.prepare(`SELECT * FROM ${table} ORDER BY id`).all<Record<string,unknown>>()).results.map(row=>Object.fromEntries(Object.entries(row).filter(([key])=>!released||!moved(table).includes(key)))));
  const ddl=(await db.prepare("SELECT type,name,sql FROM sqlite_master WHERE name LIKE 'historical_%' ORDER BY name").all()).results;
  // Migration 0043 applies to both predecessors; the Worker's reconciliation then finishes the released one.
  await target.migrateFold();db=target.db;
  assert.equal(await reconcileReleasedOwnership(db),released);
  const snapshot=async()=>({ownership:(await db.prepare('SELECT * FROM record_owners ORDER BY record_type,record_id').all()).results,graph:(await db.prepare('SELECT * FROM graph_records ORDER BY kind,id').all()).results,ddl:(await db.prepare("SELECT type,name,sql FROM sqlite_master WHERE name LIKE 'historical_%' ORDER BY name").all()).results});
  const upgraded=await snapshot();
  assert.equal(await reconcileReleasedOwnership(db),false);
  assert.deepEqual(await snapshot(),upgraded,'repeating reconciliation leaves owners, graph authority and custom DDL unchanged');
  assert.deepEqual(upgraded.ddl,ddl,'custom indexes, foreign keys and generated BLOB table survive');
  for(const row of rows){
   assert.deepEqual((await db.prepare(`SELECT * FROM ${row.table} ORDER BY id`).all()).results,before.get(row.table),`${row.kind} keeps every prior native and custom value`);
   const detail=await new RecordsRepository(db).detail(row.kind,row.id),expected=released||row.kind==='opportunity'?owner:null,revision=released?row.revision:0;
   assert.equal(detail.record.owner_id,expected);assert.equal(detail.record.owner_revision,revision);
   const graph=await db.prepare('SELECT owner_id,fields_json FROM graph_records WHERE kind=? AND id=?').bind(row.kind,row.id).first<{owner_id:string;fields_json:string}>();
   assert.equal(graph?.owner_id,null,'the graph privacy principal remains independent of the sales owner');
   const fields=JSON.parse(graph!.fields_json);assert.equal(fields.owner_id??null,expected);assert.ok(!('owner_revision' in fields),'the revision fence stays out of the graph and its search index');
   const names=(await db.prepare(`PRAGMA table_info(${row.table})`).all<{name:string}>()).results.map(column=>column.name);
   assert.ok(!names.includes('owner_revision'));if(row.kind!=='opportunity')assert.ok(!names.includes('owner_id'));
   if(row.kind!=='opportunity')assert.equal(names.length,released?98:100,'only the released ownership columns leave a maximum-width native table');
  }
  assert.equal(await db.prepare('SELECT hex(payload) FROM historical_custom').first('hex(payload)'),'00FF80010D0A');
  assert.equal(await db.prepare('SELECT twice FROM historical_custom').first('twice'),14);
  assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results,[]);
 }finally{await target.dispose();}
}
