import {zoomNetwork} from '../support/zoom-network.mjs';
import {zoomMeetingJourney} from './today-journey.mjs';
import {draftParityBrowserJourney} from '../support/agent-door-draft-parity-proof';
import {isolateBrowserTemp} from '../support/browser-temp.mjs';
isolateBrowserTemp();
import {test} from 'node:test';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {resolve} from 'node:path';
import {chromium} from '@playwright/test';
import {isolatedDatabase} from '../support/isolated-database';
import {createDependencies} from '../support/dependencies';
import {sessionCookieName} from '../support/test-auth';
import {identityVarArgs} from '../support/worker-identity.mjs';
import {stalledRiskBrowser} from '../support/stalled-risk-browser';
import {stalledRiskPolicyJourney} from './today-journey.mjs';
import {todayJourney} from './today-journey.mjs';
import {riskJourney} from './risk-journey.mjs';
import {browserRiskData,riskBusinessState} from '../support/browser-risk-data';
import {unstable_DevEnv} from 'wrangler';
import {identityVars} from '../support/worker-identity.mjs';
import assert from 'node:assert/strict';

test('INTEGRATE-002 BRIEF-001 BRIEF-002 BRIEF-003 BRIEF-004 BRIEF-005 RECORD-017 a seller plans meetings, reviews cited handoffs and opens permitted mentions at 1440 and 390',async testContext=>{
 const fixture=await isolatedDatabase(),port=Number(process.env.ORBIT_TODAY_PORT??8736),origin=`http://127.0.0.1:${port}`;
 let worker:ReturnType<typeof spawn>|undefined,browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
 const runtime=new unstable_DevEnv(),zoomRuntime=new unstable_DevEnv();
 try{
  // Only the operator and the confirmed empty workspace exist; every customer record arrives through the app's doors.
  const deps=createDependencies(fixture.db),owner='01M4R2BR1EF0000000000000AA';
  await deps.auth.ensureOperator({id:owner,email:'owner@brief.test',displayName:'Rose Owner'});
  await deps.workspace.ensureWorkspace({name:'Brief journey',timezone:'UTC',currency:'USD',workingHours:{},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});
  await deps.workspace.ensurePipelineStage({id:'01M4R2BR1EF00000000000STGA',name:'Qualified',position:1});
  await fixture.db.prepare("INSERT OR IGNORE INTO first_run_setup(id,completed_at) VALUES('workspace',?)").bind(new Date().toISOString()).run();
  const colleagueId='01M4R2BR1EF0000000000000AB';await deps.auth.ensureOperator({id:colleagueId,email:'morgan@brief.test',displayName:'Morgan Manager'});
  const first=await deps.auth.createSession(owner),second=await deps.auth.createSession(owner),third=await deps.auth.createSession(colleagueId);
  await fixture.close();
  worker=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--config','dist/server/wrangler.json','--local','--persist-to',fixture.directory,'--port',String(port),'--inspector-port',process.env.ORBIT_TODAY_INSPECTOR_PORT??'0',...identityVarArgs(origin)],{stdio:['ignore','pipe','pipe'],env:{...process.env,CI:'1'}});
  let output='';worker.stdout!.on('data',chunk=>output+=chunk);worker.stderr!.on('data',chunk=>output+=chunk);
  let ready=false;for(let i=0;i<300;i++){try{if((await fetch(origin+'/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}if(!ready)throw new Error(output);
  browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--use-mock-keychain','--password-store=basic','--no-sandbox']});
  const context=(token:string)=>browser!.newContext({baseURL:origin,extraHTTPHeaders:{Cookie:`${sessionCookieName}=${token}`}});
  await todayJourney({first:await context(first.token),second:await context(second.token),colleague:await context(third.token),evidence:resolve(process.env.ORBIT_TODAY_EVIDENCE??'verification/ui/today')});
  const stopped=once(worker,'exit');worker.kill('SIGTERM');await stopped;worker=undefined;
  await fixture.reopen();
   await fixture.db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(owner).run();
  const zoom=zoomNetwork([['synthetic-orbit-450','example.test'].join(String.fromCharCode(64))]);
  await fixture.close();
  const zoomWorker=await zoomRuntime.startWorker({config:resolve('dist/server/wrangler.json'),bindings:Object.fromEntries(Object.entries({...identityVars(origin),ORBIT_ENCRYPTION_KEY:'ab'.repeat(32)}).map(([name,value])=>[name,{type:'secret_text' as const,value}])),dev:{remote:false,persist:fixture.directory,watch:false,inspector:false,server:{hostname:'127.0.0.1',port},outboundService:async request=>{try{return await zoom.fetch(request);}catch(error){throw new Error('Zoom fixture rejected its HTTP edge: '+(error as Error).message);}}}});await zoomWorker.ready;
  await zoomMeetingJourney(await(await context(second.token)).newPage(),{provider:zoom,fetch:zoomWorker.fetch.bind(zoomWorker),origin,evidence:resolve(process.env.ORBIT_TODAY_EVIDENCE??'verification/ui/today')});
  await zoomRuntime.teardown();await fixture.reopen();
  const data=await browserRiskData(fixture.db,owner),before=await riskBusinessState(fixture.db);
  await fixture.close();
  const model={requests:[] as unknown[],output:{} as unknown,unexpected:[] as string[]};
  const secret=(value:string)=>({type:'secret_text' as const,value});
  const emitted=await runtime.startWorker({config:resolve('dist/server/wrangler.json'),bindings:Object.fromEntries(Object.entries({...identityVars(origin),OPENAI_API_KEY:'synthetic-orbit-38',AI_MODEL:'synthetic-orbit-model',AI_INPUT_COST_PER_MILLION:'1',AI_OUTPUT_COST_PER_MILLION:'2'}).map(([name,value])=>[name,secret(value)])),dev:{remote:false,persist:fixture.directory,watch:false,inspector:false,server:{hostname:'127.0.0.1',port},outboundService:async request=>{
   if(request.url!=='https://api.openai.com/v1/responses'||request.method!=='POST'){model.unexpected.push(request.url);return new Response(null,{status:502});}
   model.requests.push(JSON.parse((await request.json() as {input:string}).input));
   return Response.json({status:'completed',usage:{input_tokens:80,output_tokens:30},output:[{content:[{type:'output_text',text:JSON.stringify(model.output)}]}]});
  }}});await emitted.ready;
  await riskJourney(await(await context(second.token)).newPage(),data,model,resolve(process.env.ORBIT_TODAY_EVIDENCE??'verification/ui/today'));
  assert.deepEqual(model.unexpected,[],'Risk review makes no customer mail or other outbound request');
  await runtime.teardown();await fixture.reopen();
  assert.deepEqual(await riskBusinessState(fixture.db),before,'Risk review changes no sales state, stakeholders, commitments, drafts or mail');
  const riskFixture=await isolatedDatabase(),riskRuntime=new unstable_DevEnv();
  try {
  const stalled=await stalledRiskBrowser(testContext,riskFixture.db,origin);
  await riskFixture.close();
  const riskOnly=await riskRuntime.startWorker({config:resolve('dist/server/wrangler.json'),bindings:Object.fromEntries(Object.entries(stalled.vars).map(([name,value])=>[name,secret(value)])),dev:{remote:false,persist:riskFixture.directory,watch:false,inspector:false,server:{hostname:'127.0.0.1',port}}});await riskOnly.ready;
  const signedIn=await browser.newContext({baseURL:origin,extraHTTPHeaders:{Cookie:stalled.cookie}});
  await stalledRiskPolicyJourney({page:await signedIn.newPage(),...stalled,evidence:resolve(process.env.ORBIT_TODAY_EVIDENCE??'verification/ui/today')});
  await draftParityBrowserJourney({page:await signedIn.newPage(),...stalled,evidence:resolve(process.env.ORBIT_TODAY_EVIDENCE??'verification/ui/today')});
  await signedIn.close();
  } finally {await riskRuntime.teardown();await riskFixture.dispose();}

 }finally{
  await browser?.close();if(worker&&worker.exitCode===null){const stopped=once(worker,'exit');worker.kill('SIGTERM');await stopped;}await zoomRuntime.teardown();await runtime.teardown();await fixture.dispose();
 }
});
