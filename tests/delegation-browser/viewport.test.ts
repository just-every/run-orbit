import {isolateBrowserTemp} from '../support/browser-temp.mjs';
isolateBrowserTemp();
import {test} from 'node:test';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {chromium} from '@playwright/test';
import {isolatedDatabase} from '../support/isolated-database';
import {createTestDependencies} from '../support/test-dependencies';
import {sampleData} from '../fixtures/sample-data';
import { sessionCookieName } from '../support/test-auth';
import {nativeOpportunityViewportJourney} from './viewport-journey.mjs';
import {identityVarArgs} from '../support/worker-identity.mjs';

test('native opportunity detail keeps long company and handoff content usable without horizontal scrolling',async()=>{
 const fixture=await isolatedDatabase(),port=Number(process.env.ORBIT_VIEWPORT_PORT??8724),origin=`http://127.0.0.1:${port}`;
 let worker:ReturnType<typeof spawn>|undefined,browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
 try{
  const deps=createTestDependencies(fixture.db);await deps.sampleData.seed();const session=await deps.auth.createSession(sampleData.operators[0].id);
  await fixture.close();
  worker=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--config','dist/server/wrangler.json','--local','--persist-to',fixture.directory,'--port',String(port),'--inspector-port',process.env.ORBIT_VIEWPORT_INSPECTOR_PORT??'8734',...identityVarArgs(origin)],{stdio:['ignore','pipe','pipe'],env:{...process.env,CI:'1'}});
  let output='';worker.stdout!.on('data',chunk=>output+=chunk);worker.stderr!.on('data',chunk=>output+=chunk);
  let ready=false;for(let i=0;i<300;i++){try{if((await fetch(origin+'/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}if(!ready)throw new Error(output);
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']});const context=await browser.newContext({baseURL:origin,extraHTTPHeaders:{Cookie:`${sessionCookieName}=${session.token}`}}),page=await context.newPage();
  await nativeOpportunityViewportJourney(page);
 }finally{
  await browser?.close();if(worker&&worker.exitCode===null){worker.kill('SIGTERM');await once(worker,'exit');}await fixture.dispose();
 }
});
