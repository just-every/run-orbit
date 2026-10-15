import {spawnSync} from 'node:child_process';
import {mkdirSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {verificationPlan,capacityExecution} from './verification-plan.mjs';
import {checkTestEvents} from './verification-events.mjs';
import {checkCapacityResult} from './verification-capacity.mjs';
import {checkTestBudget} from './verification-inventory.mjs';

export function aggregate(directory='verification/ci-shards',{release=false,capacity}={}){
 const inventory=checkTestBudget(),plan=verificationPlan(),expected=Object.keys(plan),commit=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'});
 if(commit.status!==0)throw Error('Aggregation requires the edition Git commit.');
 const files=readdirSync(directory).filter(file=>file.endsWith('.json'));
 const receipts=files.map(file=>JSON.parse(readFileSync(`${directory}/${file}`,'utf8')));
 if(receipts.length!==expected.length||new Set(receipts.map(row=>row.shard)).size!==expected.length)throw Error('Missing or duplicate verification shards.');
 const executions=[];
 for(const name of expected){
  const receipt=receipts.find(row=>row.shard===name),gates=plan[name];
  if(!receipt||receipt.commit!==commit.stdout.trim()||receipt.status!=='passed'||receipt.stages.length!==gates.length)throw Error(`Incomplete or wrong-commit verification shard: ${name}`);
  for(const [index,gate] of gates.entries()){
   const stage=receipt.stages[index];
   if(stage.status!=='passed'||stage.exitCode!==0||JSON.stringify(stage.env)!==JSON.stringify(gate.env??{})||JSON.stringify(stage.args)!==JSON.stringify(gate.args)||JSON.stringify(stage.files)!==JSON.stringify(gate.files??[])||stage.missingFiles.length)throw Error(`Incomplete verification stage: ${name}/${index}`);
   checkTestEvents(gate,stage.executions,stage.report);
   if(!Array.isArray(stage.executions)||stage.executions.some(row=>row.status!=='passed')||gate.result&&!stage.executions.length||gate.files?.some(file=>!stage.executions.some(row=>row.file===file)))throw Error(`Missing actual stage test events: ${name}/${index}`);
   if(gate.files&&stage.executions.some(row=>row.file&&!gate.files.includes(row.file)))throw Error(`Unexpected test file events: ${name}/${index}`);
  }
  if(JSON.stringify(receipt.stages.flatMap(stage=>stage.executions))!==JSON.stringify(receipt.executions))throw Error(`Inconsistent test event inventory: ${name}`);
  if(receipt.executions.some(row=>row.status!=='passed'))throw Error(`Failed or skipped test in ${name}`);
  for(const gate of gates)if(gate.files?.some(file=>!receipt.executions.some(row=>row.file===file)))throw Error(`Missing actual test file events in ${name}`);
  executions.push(...receipt.executions);
 }
 // Node's runner reports every completion; duplicated shard executions are not coverage.
 const keys=executions.map(row=>JSON.stringify([row.runner,row.file,row.name]));
 if(new Set(keys).size!==keys.length)throw Error('A test was executed more than once in the routine plan.');
 const actualCases=executions.filter(row=>row.type!=='suite').length;
 if(actualCases!==inventory.cases)throw Error(`Registered test inventory (${inventory.cases}) does not match actual completions (${actualCases}).`);
 const capacityStatus=release?checkCapacityResult(capacity,Math.max(...receipts.map(row=>Date.parse(row.finishedAt)))):'pending';
 executions.push(capacityExecution(capacityStatus));
 mkdirSync('verification',{recursive:true});
 writeFileSync('verification/core-results.jsonl',executions.map(row=>JSON.stringify(row)).join('\n')+'\n');
 // Contract mapping remains an explicit report; a test name is not release acceptance.
 for(const file of ['delegation-results.jsonl','browser-results.jsonl'])writeFileSync(`verification/${file}`,'');
 writeFileSync('verification/ci-summary.json',JSON.stringify({commit:commit.stdout.trim(),status:'passed',mode:release?'release':'routine',capacity:capacityStatus,shards:receipts.map(({shard,startedAt,finishedAt})=>({shard,startedAt,finishedAt})),tests:actualCases,qualifications:inventory.qualifications,budget:inventory.total,limit:200},null,2)+'\n');
 return true;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))if(!aggregate(process.argv[2]))process.exitCode=1;
