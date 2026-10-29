import {reportEditionCommit} from './report-source-identity.mjs';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {parseContract} from '../src/base/seed-contract.mjs';
// Keep the published execution catalogue when clause definitions change format.
// Target obligations retain their separate, explicit contract status.
const published=parseContract(readFileSync('CONTRACT.md','utf8')).clauses
 .filter(clause=>clause.kind==='published')
 .map(({id,title})=>({id,title,document:'CONTRACT.md'}));
const baseline=[...readFileSync('BASELINE.md','utf8').matchAll(/\*\*([A-Z]+(?:-[A-Z]+)?-\d{3})\s+—\s+([^*]+)\*\*/g)]
 .map(match=>({id:match[1],title:match[2].trim(),document:'BASELINE.md'}));
const catalog=[...published,...baseline];
const executions=['verification/core-results.jsonl','verification/delegation-results.jsonl','verification/browser-results.jsonl'].flatMap(file=>existsSync(file)?readFileSync(file,'utf8').trim().split('\n').filter(Boolean).map(line=>JSON.parse(line)):[]);
// External outcomes belong to an exact authoritative edition commit, never its historical import pins.
const editionCommit=existsSync('verification/external-results.jsonl')?reportEditionCommit():null;
if(existsSync('verification/external-results.jsonl'))for(const line of readFileSync('verification/external-results.jsonl','utf8').trim().split('\n').filter(Boolean)){const result=JSON.parse(line);if(editionCommit&&result.editionCommit===editionCommit)executions.push(result);}
const clauses=catalog.map(clause=>{
 const tests=executions.filter(test=>new RegExp(`(?:^|[^A-Z0-9-])${clause.id}(?:$|[^A-Z0-9-])`).test(test.name));
 if(clause.document==='BASELINE.md'&&!tests.length)return {...clause,status:'planned',reason:'The shared Base conformance journey has not run on Orbit data.',tests};
 const pending=process.env.ORBIT_VERIFY_MODE==='routine'&&tests.some(test=>test.file==='tests/performance/records-capacity.ts'&&test.status==='pending')&&tests.every(test=>test.status==='passed'||(test.file==='tests/performance/records-capacity.ts'&&test.status==='pending'));
 return {...clause,status:pending?'pending':tests.length&&tests.every(test=>test.status==='passed')?'satisfied':'broken',reason:pending?'Full declared-capacity release qualification is pending; run pnpm run verify:release.':!tests.length?'No executed semantic test is mapped to this clause.':tests.some(test=>test.status!=='passed')?'A mapped execution failed or skipped.':'All mapped executions passed; semantic breadth and external acceptance still require the recorded release review.',tests};
});
const report={schemaVersion:1,generatedAt:new Date().toISOString(),meaning:'Execution coverage, not proof that a test covers every sentence or that a test adapter is a real provider. Unmapped published clauses and failed or skipped executions block verify. Base duties without tagged executions are planned, never satisfied. Routine verification explicitly leaves full-capacity clauses pending; release verification requires that unchanged proof.',mode:process.env.ORBIT_VERIFY_MODE??'release',counts:{planned:clauses.filter(c=>c.status==='planned').length,pending:clauses.filter(c=>c.status==='pending').length,satisfied:clauses.filter(c=>c.status==='satisfied').length,broken:clauses.filter(c=>c.status==='broken').length},clauses};
mkdirSync('verification',{recursive:true});writeFileSync('verification/contract-results.json',JSON.stringify(report,null,2)+'\n');
for(const clause of clauses)console.log(`${clause.status}: ${clause.id} ${clause.title}${clause.tests.length?'': ' — no executed test'}`);
console.log(JSON.stringify(report.counts));if(report.counts.broken)process.exitCode=1;
