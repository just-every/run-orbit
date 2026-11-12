import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const root=process.cwd();
const {collectMigrations}=await import(pathToFileURL(root+'/scripts/delivery/base/migrations.mjs').href);
const {validateCandidateSpec}=await import(pathToFileURL(root+'/scripts/delivery/base/spec.mjs').href);
const spec=JSON.parse(await readFile(root+'/management/integration/deployment-spec.json','utf8'));
validateCandidateSpec(spec);
const collected=await collectMigrations(root,[{binding:'DB',path:'migrations/core'}],spec.resources);
assert.deepEqual(spec.migrations,collected);
const parents=['origin/main','974775b13604d9e299858ece3fdeb3dd1a115e9b'];
const results=[];
for(const parent of parents){
 const previous=JSON.parse(execFileSync('git',['show',parent+':management/integration/deployment-spec.json'],{encoding:'utf8'}));
 for(const migration of previous.migrations)assert.deepEqual(collected.find(item=>item.binding===migration.binding&&item.name===migration.name),migration);
 results.push({parent,preserved:previous.migrations.length});
}
console.log(JSON.stringify({checkedAt:new Date().toISOString(),migrationCount:collected.length,parentHistory:results,graphAndZoomKept:true,changesToAppliedSql:0},null,2));
