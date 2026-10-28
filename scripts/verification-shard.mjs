import {spawnSync} from 'node:child_process';
import {existsSync,mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,relative,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {verificationPlan} from './verification-plan.mjs';
import {checkTestEvents} from './verification-events.mjs';

export const rowsFrom=file=>existsSync(file)?readFileSync(file,'utf8').trim().split('\n').filter(Boolean).map(line=>JSON.parse(line)):[];
export const normalizedFile=file=>typeof file==='string'?relative(process.cwd(),resolve(file.startsWith('file:')?fileURLToPath(file):file)):null;
export function resetVerification(){
 const tracked=spawnSync('git',['ls-files','-z','--','verification'],{encoding:'utf8'});
 if(tracked.status!==0||tracked.stdout)throw Error('verification/ must contain only untracked execution artifacts; retain source evidence outside that directory.');
 rmSync('verification',{recursive:true,force:true});
 mkdirSync('verification/ci-shards',{recursive:true});
}
export function runShard(name){
 const gates=verificationPlan({journeys:true})[name];if(!gates)throw Error(`Unknown verification shard: ${name}`);
 mkdirSync('verification/ci-shards',{recursive:true});
 const destination=`verification/ci-shards/${name}.json`;rmSync(destination,{force:true});
 const commit=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'});if(commit.status!==0)throw Error('Verification requires the edition Git commit.');
 const state=mkdtempSync(join(tmpdir(),`orbit-${name}-`)),stages=[],executions=[];
 const startedAt=new Date().toISOString();let failed=false;
 const browserEvidence=resolve(`verification/fold/${name}/browser`);mkdirSync(browserEvidence,{recursive:true});
 try{
  for(const gate of gates){
   if(gate.result)rmSync(gate.result,{force:true});
   console.log(`\nVerification (${name}): pnpm ${gate.args.join(' ')}`);
   const env={...process.env,...gate.env,TMPDIR:state,ORBIT_STARTUP_DIAGNOSTICS:resolve(`verification/startup-diagnostics/${name}`),ORBIT_FOLD_BROWSER_EVIDENCE:browserEvidence,RER_SERVER_JOURNEY:'1',...(gate.browser?{}:{ORBIT_TEST_STATE:state})};
   if(gate.browser)delete env.ORBIT_TEST_STATE;
   const start=Date.now(),run=spawnSync('pnpm',gate.args,{stdio:'inherit',env});
   const events=gate.result?rowsFrom(gate.result):[],report=events.filter(row=>row.kind!=='test');
   const rows=events.filter(row=>row.kind==='test').map(row=>({...row,file:normalizedFile(row.file)}));
   let eventError=null;try{checkTestEvents(gate,rows,report);}catch(error){eventError=error.message;}
   const covered=new Set(rows.map(row=>row.file)),missingFiles=gate.files?.filter(file=>!covered.has(file))??[];
   const passed=run.status===0&&!eventError;
   stages.push({args:gate.args,env:gate.env??{},files:gate.files??[],status:passed?'passed':'failed',exitCode:run.status,durationMs:Date.now()-start,missingFiles,eventError,report,executions:rows});executions.push(...rows);
   if(!passed){failed=true;break;}
  }
 }finally{
  rmSync(state,{recursive:true,force:true});
  writeFileSync(destination,JSON.stringify({shard:name,commit:commit.stdout.trim(),startedAt,finishedAt:new Date().toISOString(),status:failed||stages.length!==gates.length?'failed':'passed',stages,executions},null,2)+'\n');
 }
 return !failed&&stages.length===gates.length;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 // Reject a bad argument before clearing the previous run's evidence.
 if(process.argv.length!==3||!Object.hasOwn(verificationPlan({journeys:true}),process.argv[2]))throw Error(`Usage: node scripts/verification-shard.mjs <${Object.keys(verificationPlan({journeys:true})).join('|')}>`);
 resetVerification();
 if(!runShard(process.argv[2]))process.exitCode=1;
}
