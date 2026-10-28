import {spawnSync} from 'node:child_process';
import {rmSync,writeFileSync} from 'node:fs';
import {verificationPlan} from './verification-plan.mjs';
import {runShard,resetVerification} from './verification-shard.mjs';
import {aggregate} from './verification-aggregate.mjs';

const release=process.argv.includes('--release');
if(process.argv.slice(2).some(arg=>arg!=='--release'))throw Error('Usage: node scripts/verify.mjs [--release]');
// Local verification is deliberately sequential; CI gives each shard its own runner.
resetVerification();
let passed=true;
const options={journeys:true};
for(const name of Object.keys(verificationPlan(options))){
 if(!runShard(name,options)){passed=false;if(name==='source')break;else continue;}
 if(name==='source'){
  const sealed=spawnSync(process.execPath,['scripts/verification-build.mjs','seal'],{stdio:'inherit'});
  if(sealed.status!==0){passed=false;break;}
  process.env.ORBIT_VERIFY_PREBUILT='1';
 }
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
if(!passed)process.exitCode=1;
