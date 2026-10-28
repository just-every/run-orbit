import {relative} from 'node:path';
import {writeFileSync,appendFileSync,mkdirSync} from 'node:fs';
// Attribute each executed browser case to its spec file.
const specFile=test=>{let suite=test.parent;while(suite&&suite.type!=='file')suite=suite.parent;return suite?.location?.file??test.location.file;};
const identity=test=>({id:test.id,name:test.titlePath().join(' — '),file:relative(process.cwd(),specFile(test))});
const write=row=>appendFileSync('verification/browser-results.jsonl',JSON.stringify({runner:'playwright',...row})+'\n');
export default class Results {
 onBegin(config,suite){
  this.suite=suite;
  mkdirSync('verification',{recursive:true});
  if(process.env.ORBIT_RESULTS_APPEND!=='1')writeFileSync('verification/browser-results.jsonl','');
  write({kind:'inventory',tests:suite.allTests().map(identity)});
 }
 onTestEnd(test,result){write({kind:'test',...identity(test),status:result.status,durationMs:result.duration});}
 onEnd(result){
  const tests=this.suite.allTests(),results=tests.flatMap(test=>test.results);
  write({kind:'summary',success:result.status==='passed',counts:{tests:tests.length,completed:results.length,passed:results.filter(row=>row.status==='passed').length}});
 }
}
