import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const load=path=>import(pathToFileURL(resolve(path)).href);
const {exactMainDatabase}=await load('newtests/t096/main-fixture.ts');
const {nativeMigrationPreflight,migrationInventory}=await load('node_modules/@runeditrun/rer/cli/portability-migrations.mjs');
const target=await exactMainDatabase();
try {
 await target.migrateFold();
 const files=await migrationInventory(process.cwd(),'DB',{});
 const result=await nativeMigrationPreflight({root:process.cwd(),db:target.db,binding:'DB'});
 assert.deepEqual(result,{nativeApply:false});
 const rows=(await target.db.prepare('SELECT name FROM d1_migrations ORDER BY name').all()).results;
 assert.deepEqual(rows.map(row=>row.name),files.map(file=>file.name));
 const violations=(await target.db.prepare('PRAGMA foreign_key_check').all()).results;
 assert.deepEqual(violations,[]);
 console.log(JSON.stringify({check:'native migration ledger preflight',result:'pass',applied:rows.length,sourceFiles:files.length,pending:0,foreignKeyViolations:0}));
} finally {await target.dispose();}
