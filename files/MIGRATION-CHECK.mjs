import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {collectMigrations} from '/workspace/run-orbit/scripts/delivery/base/migrations.mjs';
const root='/workspace/run-orbit',base=execFileSync('git',['merge-base','origin/main','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const migrations=await collectMigrations(root,[{binding:'DB',path:'migrations/core'}],[{binding:'DB',kind:'d1'}]);
const prior=execFileSync('git',['ls-tree','-r','--name-only',base,'migrations/core'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(x=>x.endsWith('.sql'));
for(const path of prior){const before=execFileSync('git',['show',base+':'+path],{cwd:root});if(createHash('sha256').update(before).digest('hex')!==createHash('sha256').update(readFileSync(root+'/'+path)).digest('hex'))throw Error('Applied migration was rewritten: '+path);}
console.log(JSON.stringify({status:'passed',existingMigrations:prior.length,discoveredMigrations:migrations.length,added:migrations.filter(row=>!prior.includes('migrations/core/'+row.name)).map(({name,sha256})=>({name,sha256}))}));
