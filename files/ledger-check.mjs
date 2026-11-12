import assert from 'node:assert/strict';
import {readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
const root=process.cwd(),state=process.argv[2];
const {collectMigrations}=await import(pathToFileURL(resolve(root,'scripts/delivery/base/migrations.mjs')));
const {matchMigrationLedger}=await import(pathToFileURL(resolve(root,'node_modules/@runeditrun/rer/modules/portability/ledgers.mjs')));
const files=await collectMigrations(root,[{binding:'DB',path:'migrations/core'}],[{kind:'d1',binding:'DB'}]);
let checked=false;
for(const name of readdirSync(state,{recursive:true}).filter(name=>name.endsWith('.sqlite'))){
 const db=new DatabaseSync(resolve(state,name),{readOnly:true});try{
  if(!db.prepare("SELECT name FROM sqlite_master WHERE name='d1_migrations'").get())continue;
  const entries=db.prepare('SELECT name FROM d1_migrations ORDER BY id').all();
  const applied=matchMigrationLedger(entries,files);
  assert.deepEqual([...applied].sort(),files.map(file=>file.name).sort());
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
  console.log(JSON.stringify({ledger:'d1_migrations',applied:applied.length,files:files.length,foreignKeyViolations:0,complete:true}));checked=true;
 }finally{db.close();}
}
assert.ok(checked,'A prepared native migration ledger was checked.');
