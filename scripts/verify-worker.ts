import {isolateBrowserTemp} from '../tests/support/browser-temp.mjs';
isolateBrowserTemp();
import assert from 'node:assert/strict';
import {verifyUnconfiguredHost} from './verify-unconfigured-host';
import { request as httpRequest } from 'node:http';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { getPlatformProxy } from 'wrangler';
import { createTestDependencies } from '../tests/support/test-dependencies';
import { sampleData } from '../tests/fixtures/sample-data';
import { sessionCookieName } from '../tests/support/test-auth';
import { testState } from '../tests/support/test-state';
import {identityVarArgs, TEST_SESSION_SECRET} from '../tests/support/worker-identity.mjs';

const port=Number(process.env.PROOF_PORT??4197),origin=`http://127.0.0.1:${port}`;
const platform=await getPlatformProxy<{DB:D1Database}>({configPath:'wrangler.jsonc',envFiles:['tests/support/no-local-settings.env'],persist:{path:`${testState()}/v3`},remoteBindings:false});
const deps=createTestDependencies(platform.env.DB);await deps.sampleData.seed();
const valid=await deps.auth.createSession(sampleData.operators[0].id), revoked=await deps.auth.createSession(sampleData.operators[0].id), expired=await deps.auth.createSession(sampleData.operators[0].id);
await deps.auth.revoke(revoked.id);
await platform.env.DB.prepare("UPDATE sessions SET expires_at='2000-01-01T00:00:00.000Z' WHERE id=?").bind(expired.id).run();
await platform.dispose();
// The standalone host proof completes before another Worker owns the same D1.
const unconfiguredHost=await verifyUnconfiguredHost(port+1);
const cookie=(token:string)=>`${sessionCookieName}=${token}`;
const providerCredentialCanary=crypto.randomUUID();
const privateValues=[providerCredentialCanary,TEST_SESSION_SECRET,valid.token,revoked.token,expired.token];
const privateValuesAbsent=(body:string)=>{for(const value of privateValues)assert.ok(!body.includes(value),'Bound credentials and session values must stay private.');};
const worker=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--config','dist/server/wrangler.json','--local','--persist-to',resolve(testState()),'--port',String(port),'--inspector-port',process.env.ORBIT_INSPECTOR_PORT??'0',...identityVarArgs(origin),'--var',`SENDGRID_API_KEY:${providerCredentialCanary}`],{stdio:['ignore','pipe','pipe'],env:{...process.env,CI:'1'}});
let output='';worker.stdout.on('data',chunk=>output+=chunk);worker.stderr.on('data',chunk=>output+=chunk);
const evidence:Record<string,unknown>={unconfiguredHost};
async function setTitle(title:string){
 const headers={Cookie:cookie(valid.token),Origin:origin,'Content-Type':'application/json'};
 const response=await fetch(origin+'/api/v1/records/opportunity/'+sampleData.opportunities[0].id,{headers});
 assert.equal(response.status,200);const detail=await response.json() as any;
 const input={...detail.record,title,contact_ids:detail.contacts.map((row:any)=>row.id),primary_contact_id:detail.contacts.find((row:any)=>row.is_primary)?.id??null,custom_fields:JSON.parse(detail.record.custom_fields_json??'{}')};
 const saved=await fetch(origin+'/api/v1/records/opportunity/'+sampleData.opportunities[0].id,{method:'PUT',headers,body:JSON.stringify(input)});
 assert.equal(saved.status,200,await saved.text());
}
const browser=await chromium.launch();
try {
  for(let i=0;i<100;i++){try{if((await fetch(origin+'/health')).ok)break;}catch{}await new Promise(resolve=>setTimeout(resolve,100));if(i===99)throw new Error(output);}
  const first=await fetch(origin+'/app',{headers:{Cookie:cookie(valid.token)}});const html=await first.text();
  assert.equal(first.status,200);assert.ok(html.includes(sampleData.opportunities[0].title));privateValuesAbsent(html);
  const changed=`Fresh D1 proof ${Date.now()}`;
  await setTitle(changed);
  const fresh=await (await fetch(origin+'/app',{headers:{Cookie:cookie(valid.token),'Sec-Fetch-Mode':'navigate'}})).text();assert.ok(fresh.includes(changed));privateValuesAbsent(fresh);
  await setTitle(sampleData.opportunities[0].title);
  evidence.ssr='Authenticated NOW HTML changes with live D1';
  const statuses:Record<string,unknown>={};
  for(const [name,token] of [['missing',''],['expired',expired.token],['revoked',revoked.token],['valid',valid.token]]){
    const headers=token?{Cookie:cookie(token)}:{};
    const document=await fetch(origin+'/app',{headers,redirect:'manual'}), api=await fetch(origin+'/api/v1/opportunities/now',{headers}), unknown=await fetch(origin+'/api/v1/missing',{headers});
    assert.equal(document.status,name==='valid'?200:302);assert.equal(api.status,name==='valid'?200:401);assert.equal(unknown.status,name==='valid'?404:401);
    if(name!=='valid'){assert.equal(document.headers.get('location'),'/signin?returnTo=%2Fapp');assert.ok(!(await document.text()).includes(sampleData.opportunities[0].title));}
    statuses[name]={document:document.status,api:api.status,unknownApi:unknown.status};
  }
  evidence.sessionHttp=statuses;
  for(const path of ['/missing-document','/assets/no-such-file.js','/@vite/client','/src/core/app/client.tsx']){
    const response=await fetch(origin+path,{headers:{'Sec-Fetch-Mode':'navigate'}});assert.equal(response.status,404,path);
  }
  const unsupported=await new Promise<number|undefined>((resolve,reject)=>{const request=httpRequest(origin+'/',{headers:{Host:'unsupported.invalid'}},response=>{response.resume();resolve(response.statusCode);});request.on('error',reject);request.end();});assert.equal(unsupported,404);
  const asset=(await readdir('dist/client/assets')).find(file=>file.endsWith('.css'))!;assert.equal((await fetch(origin+'/assets/'+asset)).status,200);
  const context=await browser.newContext({extraHTTPHeaders:{Cookie:cookie(valid.token)}}),page=await context.newPage(),errors:string[]=[],rpc:string[]=[],rpcHeaders=new Map<string,Record<string,string>>();
  page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/_serverFn/')){rpc.push(request.url());rpcHeaders.set(request.url(),request.headers());}});
  await page.goto(origin+'/app/records',{waitUntil:'networkidle'});const timeOrigin=await page.evaluate(()=>performance.timeOrigin);
  await page.getByRole('link',{name:'NOW',exact:true}).click();await page.getByTestId('now-queue').waitFor();await page.waitForLoadState('networkidle');assert.equal(await page.evaluate(()=>performance.timeOrigin),timeOrigin);assert.deepEqual(errors,[]);assert.ok(rpc.length>0);
  const transports:Record<string,unknown>[]=[];
  for(const url of [...new Set(rpc)]){
    const positive=await fetch(url,{headers:{...rpcHeaders.get(url),cookie:cookie(valid.token)}});const positiveBody=await positive.text();assert.ok(positive.ok,positiveBody);
    for(const [name,token]of [['missing',''],['expired',expired.token],['revoked',revoked.token]]){
      const response=await fetch(url,{headers:{...rpcHeaders.get(url),cookie:token?cookie(token):''},redirect:'manual'}),body=await response.text();
      assert.ok(!body.includes(sampleData.opportunities[0].title));assert.ok(body.includes('/signin')||body.includes('redirect')||response.status===302,body);
      transports.push({url:new URL(url).pathname,control:name,status:response.status,body});
    }
  }
  await page.setViewportSize({width:1024,height:1536});await page.goto(origin+'/app/new',{waitUntil:'networkidle'});await mkdir('verification/ui',{recursive:true});await page.screenshot({path:'verification/ui/12-create-opportunity.png',fullPage:true});
  evidence.serverFunctions=transports;evidence.browser={stableTimeOrigin:true,errors,rpcCount:rpc.length};
  for(const file of await readdir('dist/client/assets'))if(file.endsWith('.js')){
    const client=await readFile('dist/client/assets/'+file,'utf8');
    assert.doesNotMatch(client,/cloudflare:workers|token_hash|magic_links/);
    // Setup instructions can name a binding; its private value must stay on the Worker.
    privateValuesAbsent(client);
  }
  await mkdir('verification',{recursive:true});await writeFile('verification/worker-proof.json',JSON.stringify(evidence,null,2)+'\n');console.log('Emitted Worker SSR, session transports, browser navigation, assets, host and client-boundary proof passed.');
}finally{await browser.close();if(worker.exitCode===null){const exited=once(worker,'exit');worker.kill('SIGTERM');await exited;}}
