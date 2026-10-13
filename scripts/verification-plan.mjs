import {readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export const testFiles=directory=>readdirSync(directory).filter(name=>name.endsWith('.test.ts')).sort().map(name=>`${directory}/${name}`);
const reporter=file=>['--test-reporter=spec','--test-reporter-destination=stdout','--test-reporter=./scripts/core-results.mjs',`--test-reporter-destination=${file}`];
const gate=(...args)=>({args});
const nodeTests=(files,result,runner='tsx')=>({args:['exec',runner,'--test','--no-test-only','--test-concurrency=1',...reporter(result),...files],files,result});
const playwright=(config,files)=>({files,args:['exec','playwright','test',...(config?['--config',config]:[]),'--workers=1','--forbid-only','--reporter=list,./scripts/browser-results.mjs'],result:'verification/browser-results.jsonl',browser:true});
export function verificationPlan(){
 const core=testFiles('tests/core'),fold=testFiles('newtests/t096');
 const lineage=fold.filter(file=>file.includes('/archive-lineage-'));
 const archive=fold.filter(file=>file.includes('/archive-')&&!lineage.includes(file)&&!file.endsWith('/archive-terminal-recovery.test.ts'));
 const domain=fold.filter(file=>!lineage.includes(file)&&!archive.includes(file));
 const plan={source:[gate('run','source:check'),gate('exec','node','scripts/rer.mjs','check','--profile','first-party'),gate('run','check:boundaries'),gate('run','check:manifest'),nodeTests(testFilesMjs('tests/launch-artifact'),'verification/source-results.jsonl','node'),nodeTests(['tests/local-state/preservation.test.mjs'],'verification/local-state-results.jsonl','node')]};
 for(let index=0;index<3;index++)plan[`core-${index}`]=[gate('exec','tsx','tests/support/prepare-state.ts'),nodeTests(core.filter((_,offset)=>offset%3===index),`verification/core-${index}-results.jsonl`),...(index===0?[nodeTests(testFiles('tests/delegation'),'verification/delegation-results.jsonl')]:[])];
 plan.runtime=[gate('exec','tsx','tests/support/prepare-state.ts'),gate('run','build:app'),nodeTests(testFilesMjs('tests/runtime-lifecycle'),'verification/lifecycle-results.jsonl','node'),gate('run','typecheck'),nodeTests(testFiles('tests/launch-runtime'),'verification/launch-results.jsonl'),...testFiles('tests/delegation-browser').map((file,index)=>nodeTests([file],`verification/delegation-browser-${index}-results.jsonl`)),...composition.map(([source,directory],index)=>({...nodeTests(testFiles(directory),`verification/composition-${index}-results.jsonl`,'node'),env:{RER_COMPONENT_SOURCE:pathToFileURL(`${resolve(source)}/`).href}})),nodeTests(testFilesMjs('tests/deployment'),'verification/deployment-results.jsonl','node'),nodeTests(testFilesMjs('tests/rer'),'verification/journey-results.jsonl','node'),playwright(undefined,specFiles('tests/e2e')),playwright('tests/archive/playwright.config.mjs',['tests/archive/browser.spec.mjs']),gate('run','test:worker')];
 for(const [name,files] of Object.entries({'fold-archive':archive,'fold-domain':domain,...Object.fromEntries(lineage.map(file=>[file.includes('accepted-main')?'fold-accepted-main':'fold-launch-0013',[file]]))}))plan[name]=[gate('run','build:app'),nodeTests(files,`verification/${name}-results.jsonl`)];
 if(lineage.length!==2||Object.values(plan).some(gates=>gates.some(gate=>gate.files?.length===0)))throw Error('Verification has an empty or incomplete shard.');
 validateInventory(plan);
 return plan;
}
const composition=[['src/family/sales','tests/composition/sales'],['src/modules/sendgrid-email','tests/composition/sendgrid-email']];
const discover=(directory,match)=>readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(entry=>entry.isDirectory()?discover(`${directory}/${entry.name}`,match):entry.isFile()&&match(entry.name)?[`${directory}/${entry.name}`]:[]);
const testFilesMjs=directory=>discover(directory,name=>name.endsWith('.test.mjs'));
const specFiles=directory=>discover(directory,name=>/\.spec\.[cm]?[jt]sx?$/.test(name));
function validateInventory(plan){
 const expected=[...composition.flatMap(([,directory])=>testFiles(directory)),...testFiles('tests/core'),...testFiles('tests/delegation'),...testFiles('tests/launch-runtime'),...testFiles('tests/delegation-browser'),...testFiles('newtests/t096'),...testFilesMjs('tests/launch-artifact'),...testFilesMjs('tests/deployment'),...testFilesMjs('tests/rer'),'tests/local-state/preservation.test.mjs',...testFilesMjs('tests/runtime-lifecycle'),...specFiles('tests/e2e'),'tests/archive/browser.spec.mjs'];
 const planned=Object.values(plan).flatMap(gates=>gates.flatMap(gate=>gate.files??[]));
 if(expected.length!==new Set(expected).size||planned.length!==new Set(planned).size||JSON.stringify([...expected].sort())!==JSON.stringify([...planned].sort()))throw Error('Verification must schedule every source-discovered test file exactly once.');
}
export const capacityExecution=status=>({runner:'emitted-worker',name:'RECORD-006 DATA-001 DATA-002 BASE-DATA-001 complete declared-capacity search, archive roundtrip and erasure',file:'tests/performance/records-capacity.ts',status});
