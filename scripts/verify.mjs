import {spawnSync} from 'node:child_process';
import {readFileSync,rmSync,writeFileSync} from 'node:fs';
import {verificationPlan} from './verification-plan.mjs';
import {runShard,resetVerification} from './verification-shard.mjs';
import {aggregate} from './verification-aggregate.mjs';

const release=process.argv.includes('--release');
if(process.argv.slice(2).some(arg=>arg!=='--release'))throw Error('Usage: node scripts/verify.mjs [--release]');
// Local verification is deliberately sequential; CI gives each shard its own runner.
resetVerification();
let passed=true;
const started=Date.now();
for(const name of Object.keys(verificationPlan({journeys:true})))if(!runShard(name,{journeys:true})){
 passed=false;
 // All journey groups are independent, but none can run without the build.
 if(name==='source')break;
}
let capacity;
if(passed&&release){
 console.log('\nVerification: pnpm run test:capacity (full release qualification)');
 for(const file of ['records-capacity.json','records-capacity-d1.json','records-capacity-d1.jsonl'])rmSync(`verification/${file}`,{force:true});
 const startedAt=Date.now(),result=spawnSync('pnpm',['run','test:capacity'],{stdio:'inherit'});
 capacity={exitCode:result.status,startedAt,finishedAt:Date.now()};passed=result.status===0;
 writeFileSync('verification/capacity-run.json',JSON.stringify(capacity,null,2)+'\n',{mode:0o600});
}
if(passed)passed=aggregate('verification/ci-shards',{release,capacity,journeys:true});
if(passed){
 const minutes={};
 for(const row of readFileSync('verification/core-results.jsonl','utf8').trim().split('\n').filter(Boolean).map(line=>JSON.parse(line)))
  if(row.file&&row.type!=='suite'&&Number.isFinite(row.durationMs))minutes[row.file]=(minutes[row.file]??0)+row.durationMs/60000;
 console.log('Journey minutes: '+JSON.stringify(minutes));
}
console.log(`Full suite wall minutes: ${((Date.now()-started)/60000).toFixed(2)}`);
if(!passed)process.exitCode=1;
