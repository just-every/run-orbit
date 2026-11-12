import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {mapMigrationLedger}=await import(pathToFileURL(resolve('node_modules/@runeditrun/rer/cli/portability-migrations.mjs')).href);
const spec=JSON.parse(await readFile('management/integration/deployment-spec.json','utf8'));
const entries=spec.migrations.filter(row=>row.binding==='DB');
const files=(await readdir('migrations/core')).filter(name=>name.endsWith('.sql')).sort();
assert.equal(entries.length,files.length);
for(const row of entries){
 const bytes=await readFile('migrations/core/'+row.name);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256,row.name+' has exact source hash');
 assert.equal(row.sql,bytes.toString(),row.name+' has exact source SQL');
}
const mapped=await mapMigrationLedger({root:process.cwd(),binding:'DB',platformMigrations:{prefix:''},entries:entries.map(({name,sha256})=>({name,sha256}))});
assert.equal(mapped.length,files.length);
assert.equal(mapped.some(row=>row.name==='0081_graph_proposals.sql'),true);
assert.equal(mapped.some(row=>row.name==='0081_zendesk_support.sql'),true);
console.log(JSON.stringify({migrations:files.length,mapped:mapped.length,hashesMatch:true,sqlMatches:true,bothMigrationBranchesRetained:true}));
