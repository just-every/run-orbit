import {test} from 'node:test';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {resolve} from 'node:path';
import {chromium} from '@playwright/test';
import {isolatedDatabase} from '../support/isolated-database';
import {createDependencies} from '../support/dependencies';
import {sessionCookieName} from '../support/test-auth';
import {identityVarArgs} from '../support/worker-identity.mjs';
import {todayJourney} from './today-journey.mjs';

test('BRIEF-001 BRIEF-002 BRIEF-003 BRIEF-004 BRIEF-005 a seller starts the day from the brief, plans a meeting and reviews an agent handoff in the browser at 1440 and 390',async()=>{
 const fixture=await isolatedDatabase(),port=Number(process.env.ORBIT_TODAY_PORT??8736),origin=`http://127.0.0.1:${port}`;
 let worker:ReturnType<typeof spawn>|undefined,browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
 try{
  // Only the operator and the confirmed empty workspace exist; every customer record arrives through the app's doors.
  const deps=createDependencies(fixture.db),owner='01M4R2BR1EF0000000000000AA';
  await deps.auth.ensureOperator({id:owner,email:'owner@brief.test',displayName:'Rose Owner'});
  await deps.workspace.ensureWorkspace({name:'Brief journey',timezone:'UTC',currency:'USD',workingHours:{},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});
  await deps.workspace.ensurePipelineStage({id:'01M4R2BR1EF00000000000STGA',name:'Qualified',position:1});
  await fixture.db.prepare("INSERT OR IGNORE INTO first_run_setup(id,completed_at) VALUES('workspace',?)").bind(new Date().toISOString()).run();
  const first=await deps.auth.createSession(owner),second=await deps.auth.createSession(owner);
  await fixture.close();
  worker=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--config','dist/server/wrangler.json','--local','--persist-to',fixture.directory,'--port',String(port),'--inspector-port',process.env.ORBIT_TODAY_INSPECTOR_PORT??'0',...identityVarArgs(origin)],{stdio:['ignore','pipe','pipe'],env:{...process.env,CI:'1'}});
  let output='';worker.stdout!.on('data',chunk=>output+=chunk);worker.stderr!.on('data',chunk=>output+=chunk);
  let ready=false;for(let i=0;i<300;i++){try{if((await fetch(origin+'/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}if(!ready)throw new Error(output);
  browser=await chromium.launch();
  const context=(token:string)=>browser!.newContext({baseURL:origin,extraHTTPHeaders:{Cookie:`${sessionCookieName}=${token}`}});
  await todayJourney({first:await context(first.token),second:await context(second.token),evidence:resolve(process.env.ORBIT_TODAY_EVIDENCE??'verification/ui/today')});
 }finally{
  await browser?.close();if(worker&&worker.exitCode===null){worker.kill('SIGTERM');await once(worker,'exit');}await fixture.dispose();
 }
});
