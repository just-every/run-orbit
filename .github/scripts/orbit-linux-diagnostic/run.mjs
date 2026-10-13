import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';

const here=dirname(fileURLToPath(import.meta.url));
const named='newtests/t096/report-time-boundaries.test.ts';
const sha=value=>createHash('sha256').update(value).digest('hex');
const demand=(ok,message)=>{if(!ok)throw Error(message);};
function replaceOnce(source,from,to){demand(source.split(from).length===2,'Diagnostic source anchor changed.');return source.replace(from,to);}
export function render(root){
  const original=readFileSync(join(root,named),'utf8');
  let test=replaceOnce(original,"import {createApp} from '../../tests/support/app';","import {createApp,diagnoseResponse} from './instrumentation.ts';");
  test=replaceOnce(test,'assert.equal(response.status,200);','await diagnoseResponse(response);assert.equal(response.status,200);');
  test=test.replaceAll("'../../", "'"+root+"/").replace("'./fixture'", "'"+root+"/newtests/t096/fixture'");
  demand((test.match(/assert\./g)??[]).length===(original.match(/assert\./g)??[]).length,'Assertion count changed.');
  // Reverse every permitted transform and require byte-identical test logic.
  const reversed=test.replace("import {createApp,diagnoseResponse} from './instrumentation.ts';","import {createApp} from '../../tests/support/app';")
    .replace('await diagnoseResponse(response);assert.equal(response.status,200);','assert.equal(response.status,200);')
    .replace("'"+root+"/newtests/t096/fixture'","'./fixture'").replaceAll("'"+root+"/","'../../");
  demand(reversed===original,'Test body preservation failed.');
  return {original,test,instrumentation:readFileSync(join(here,'instrumentation.ts'),'utf8').replaceAll('__ROOT__',root)};
}

// Reject all free-form subprocess output, including normal Node assertion errors.
// Only records with entirely closed string vocabularies may reach Actions stdout.
const strings=new Set(['exception','response','preview','checkSources','resolveOperatorContext','fold-error-handler','app-error-handler','Error','TypeError','RangeError','SyntaxError','AggregateError','DOMException','AbortError','TimeoutError','RuntimeError','MiniflareCoreError','MiniflareError','D1Error','FetchError','AccessError','ZodError','AssertionError','other','unreadable','permission','validation','prerequisite','conflict','SQLITE_BUSY','SQLITE_LOCKED','SQLITE_ERROR','SQLITE_CONSTRAINT','SQLITE_IOERR','SQLITE_FULL','SQLITE_CORRUPT','SQLITE_CANTOPEN','D1_ERROR','D1_EXEC_ERROR','D1_TYPE_ERROR','ECONNRESET','ECONNREFUSED','EPIPE','ETIMEDOUT','ENOSPC','EMFILE','ENOENT','UND_ERR_SOCKET','UND_ERR_CONNECT_TIMEOUT','UND_ERR_HEADERS_TIMEOUT','ERR_RUNTIME_FAILURE','sqlite-busy','sqlite-locked','sqlite-constraint','sqlite-schema','sqlite-io','disk-full','sqlite-corrupt','sqlite-open','d1','workerd','miniflare','undici','fetch-failed','socket','timeout','resource-limit','json','native-workspace','currency','incomplete-population','success','generic-operation-failure','archive-maintenance','other-json-error','non-json-error','src/core/app/mounts/fold.ts','src/core/app/app.ts','src/core/features/access/service.ts','src/core/features/analytics/metrics.ts','src/core/features/analytics/report-population.ts','src/core/features/analytics/native-sources.ts','src/core/features/operations/store.ts','src/core/platform/archive-maintenance.ts','tests/support/isolated-database.ts','node_modules/miniflare/','node_modules/wrangler/','node_modules/undici/','node:internal/deps/undici/']);
const keys=new Set(['event','source','error','name','class','code','categories','frames','location','line','column','cause','status','responseClass']);
export function safeRecord(value,depth=0){
  if(depth>12)return false;
  if(typeof value==='string')return strings.has(value);
  if(typeof value==='number')return Number.isSafeInteger(value)&&value>=0&&value<=1000000;
  if(Array.isArray(value))return value.length<=32&&value.every(item=>safeRecord(item,depth+1));
  return value!==null&&typeof value==='object'&&Object.entries(value).every(([key,item])=>keys.has(key)&&safeRecord(item,depth+1));
}
async function command(args,env,label){
  console.log(`DIAGNOSTIC_STAGE ${label} started`);
  return await new Promise(resolveResult=>{
    const child=spawn('pnpm',args,{env,stdio:['ignore','pipe','pipe']});
    for(const stream of [child.stdout,child.stderr]){
      let pending='';stream.setEncoding('utf8');
      stream.on('data',chunk=>{
        pending+=chunk;
        const lines=pending.split('\n');pending=lines.pop().slice(-16384);
        for(const line of lines){
          const matched=line.replace(/\x1b\[[0-9;]*m/g,'').match(/^\s*(?:# )?ORBIT_DIAGNOSTIC (\{.*\})$/);
          if(!matched)continue;
          try{const record=JSON.parse(matched[1]);if(safeRecord(record))console.log('ORBIT_DIAGNOSTIC '+JSON.stringify(record));}catch{/* Drop malformed diagnostic data. */}
        }
      });
    }
    child.on('error',()=>console.log(`DIAGNOSTIC_STAGE ${label} spawn-failed`));
    child.on('close',(code,signal)=>{console.log(`DIAGNOSTIC_STAGE ${label} exit=${code??'none'} signalled=${Boolean(signal)}`);resolveResult(code===0&&!signal);});
  });
}
async function main(){
  const mode=process.argv[2],root=resolve(process.argv[3]??process.cwd());
  demand(['targeted','fold-domain','check'].includes(mode),'Diagnostic mode is invalid.');
  const rendered=render(root);
  if(mode==='check'){
    const require=createRequire(join(root,'package.json')),ts=require('typescript');
    for(const [name,source] of [['test.ts',rendered.test],['instrumentation.ts',rendered.instrumentation]]){
      const result=ts.transpileModule(source,{fileName:name,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
      demand(!(result.diagnostics??[]).some(item=>item.category===ts.DiagnosticCategory.Error),'Generated TypeScript syntax failed.');
    }
    demand(safeRecord({event:'exception',source:'fold-error-handler',error:{name:'Error',class:'Error',code:'SQLITE_BUSY',categories:['sqlite-busy'],frames:[]}}),'Safe diagnostic rejected.');
    demand(!safeRecord({event:'exception',error:{message:'Bearer private-test-sentinel'}}),'Free text escaped diagnostic filter.');
    demand(!safeRecord({event:'response',responseClass:'private-test-sentinel'}),'Unlisted string escaped diagnostic filter.');
    console.log('Offline check passed: generated TS syntax, byte-identical original assertions/body, closed-output filter.');return;
  }
  demand(process.env.GITHUB_ACTIONS==='true'&&process.platform==='linux','Execution is restricted to Linux Actions runners.');
  demand(root===process.cwd(),'Run from the checkout root.');
  const directory=mkdtempSync(join(root,'.orbit-linux-diagnostic-'));
  const cleanup=()=>rmSync(directory,{recursive:true,force:true});
  process.once('exit',cleanup);
  try{
    const target=join(directory,'report-time-boundaries.test.ts'),state=join(directory,'state'),browser=join(directory,'browser');
    mkdirSync(state);mkdirSync(browser);
    writeFileSync(target,rendered.test);writeFileSync(join(directory,'instrumentation.ts'),rendered.instrumentation);
    const env={...process.env,TMPDIR:state,ORBIT_TEST_STATE:state,RER_SERVER_JOURNEY:'1',ORBIT_FOLD_BROWSER_EVIDENCE:browser};
    console.log(`DIAGNOSTIC_SOURCE_SHA256 ${sha(rendered.original)}`);
    console.log(`DIAGNOSTIC_MODE ${mode}`);
    const {verificationPlan}=await import(pathToFileURL(join(root,'scripts/verification-plan.mjs')).href);
    const plan=verificationPlan()['fold-domain'];
    demand(plan.length===2&&plan[0].args.join(' ')==='run build:app'&&plan[1].files.includes(named),'Fold-domain plan changed; inspect before diagnostic execution.');
    const gate=plan[1];
    // All normal prerequisites remain. Targeted narrows only the test file inventory.
    if(!await command(plan[0].args,env,'build-app')){process.exitCode=1;return;}
    mkdirSync(join(root,'verification'),{recursive:true});
    const result=join(directory,'events.jsonl');
    const files=mode==='targeted'?[named]:gate.files;
    const args=gate.args.filter(arg=>!gate.files.includes(arg)).map(arg=>arg===`--test-reporter-destination=${gate.result}`?`--test-reporter-destination=${result}`:arg);
    args.push(...files.map(file=>file===named?target:file));
    const passed=await command(args,env,'tests');
    const rows=existsSync(result)?readFileSync(result,'utf8').trim().split('\n').filter(Boolean).map(row=>JSON.parse(row)):[];
    const normalized=rows.map(row=>row.kind==='test'&&resolve(row.file??'')===target?{...row,file:named}:row);
    const {checkTestEvents}=await import(pathToFileURL(join(root,'scripts/verification-events.mjs')).href);
    let eventsPassed=true;
    try{checkTestEvents({...gate,files},normalized.filter(row=>row.kind==='test'),normalized.filter(row=>row.kind!=='test'));}catch{eventsPassed=false;}
    console.log(`DIAGNOSTIC_TESTS completed=${normalized.filter(row=>row.kind==='test').length} inventory-valid=${eventsPassed}`);
    demand(readFileSync(join(root,named),'utf8')===rendered.original,'Tracked test changed during diagnostic.');
    if(!passed||!eventsPassed)process.exitCode=1;
  } finally {cleanup();}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(()=>{console.error('DIAGNOSTIC_FAILED: setup, preservation, or runner failure; raw details suppressed.');process.exitCode=1;});
