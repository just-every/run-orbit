import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {writeFile} from 'node:fs/promises';
import {isolatedDatabase} from './clone/tests/support/isolated-database.ts';
import {createDependencies} from './clone/tests/support/dependencies.ts';
import {createId} from './clone/src/core/shared/ids.ts';
import {customCertificate} from './clone/tests/support/http-listener-fixture.ts';
import {certificateTrust} from './clone/newtests/t096/emitted-fixture.ts';
import {identityVars} from './clone/tests/support/worker-identity.mjs';
const require=createRequire(resolve('package.json'));
const {unstable_DevEnv}=require('wrangler');
const {chromium,expect}=require('@playwright/test');
const packet=resolve('../packet');
const fixture=await isolatedDatabase(),runtime=new unstable_DevEnv();
let browser:any,worker:any;
const receipt:any={source:'7bc88865b46d9bc2d03b5611fa87171e393cff3c',started:new Date().toISOString(),kind:'functional browser journey, zero changed screens',viewports:[],providerSubmissions:0,providerLookups:0,unexpectedProviderRequests:0,assertions:[]};
try{
 const db=fixture.db,deps=createDependencies(db),actor=createId(),collaborator=createId(),stage=createId();
 await deps.auth.ensureOperator({id:actor,email:'owner@orbit.test',displayName:'Review owner'});
 await db.prepare('INSERT INTO access_collaborators(operator_id,invited_at) VALUES(?,?)').bind(collaborator,new Date().toISOString()).run();
 await deps.auth.ensureOperator({id:collaborator,email:'restricted@review.test',displayName:'Restricted reviewer'});
 await deps.workspace.ensureWorkspace({name:'OUT-011 independent review',timezone:'UTC',currency:'USD',workingHours:{},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});
 await deps.workspace.ensurePipelineStage({id:stage,name:'Qualified',position:1});
 await db.prepare("INSERT OR IGNORE INTO first_run_setup(id,completed_at) VALUES('workspace',?)").bind(new Date().toISOString()).run();
 const ownerSession=await deps.auth.createSession(actor),restrictedSession=await deps.auth.createSession(collaborator);
 const certificate=await customCertificate(fixture.directory),port=15624,origin=`https://127.0.0.1:${port}`;
 await fixture.close();
 let providerStatus=202;
 worker=await runtime.startWorker({config:resolve('dist/server/wrangler.json'),bindings:Object.fromEntries(Object.entries({...identityVars(origin),MAIL_PROVIDER:'sendgrid',MAIL_FROM:'review@sender.test',MAIL_REPLY_TO:'reply@sender.test',SENDGRID_API_KEY:'synthetic-review-key',SENDGRID_UNSUBSCRIBE_GROUP_ID:'1'}).map(([name,value])=>[name,{type:'secret_text',value}])),dev:{remote:false,persist:fixture.directory,watch:false,inspector:false,server:{hostname:'127.0.0.1',port,secure:true,httpsKeyPath:certificate.keyPath,httpsCertPath:certificate.certPath},origin:{secure:true},outboundService:async(request:Request)=>{
  const url=new URL(request.url);
  if(url.href==='https://api.sendgrid.com/v3/mail/send'){receipt.providerSubmissions++;return new Response(null,{status:providerStatus});}
  if(url.origin==='https://api.sendgrid.com'&&url.pathname==='/v3/messages'){receipt.providerLookups++;return new Response(null,{status:403});}
  receipt.unexpectedProviderRequests++;throw new Error('Refused unexpected external request');
 }}});await worker.ready;
 assert.equal((await worker.fetch(origin+'/health')).status,200);
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox',...certificateTrust(certificate.cert)]});
 const owner=await browser.newContext({baseURL:origin,ignoreHTTPSErrors:true,viewport:{width:1440,height:900},extraHTTPHeaders:{Cookie:`__Host-orbit_session=${ownerSession.token}`}});
 const page=await owner.newPage();
 const api=async(path:string,method='GET',body?:any,status=200,context=owner)=>{
  const response=await context.request.fetch(origin+'/api/v1/'+path,{method,headers:{Origin:origin},...(body===undefined?{}:{data:body})});
  assert.equal(response.status(),status,path+': '+await response.text());return await response.json();
 };
 await page.goto('/app',{waitUntil:'networkidle'});
 const opportunity=await api('workbench/opportunities','POST',{title:'OUT-011 browser review',companyName:'Synthetic customer',contactName:'Casey Review',email:'casey@customer.test',stageId:stage,valueCents:2500},201);
 const detail=await api(`opportunities/${opportunity.id}`),contact=detail.opportunity.contacts[0];
 const draft=await api(`workbench/opportunities/${opportunity.id}/drafts`,'POST',{contactId:contact.id,subject:'Accepted reviewed follow-up',body:'The exact saved acceptance message.'},201);
 const preview=await api(`workbench/drafts/${draft.id}/approval-preview`);
 const accepted=await api(`workbench/drafts/${draft.id}/approve`,'POST',{revision:1,quietHoursConfirmation:preview.localTime});assert.equal(accepted.state,'accepted');
 receipt.assertions.push('An authorized exact-revision native approval completes as accepted through the emitted Worker and real SendGrid serialization with synthetic HTTP edge.');
 const waiting=await api(`workbench/opportunities/${opportunity.id}/drafts`,'POST',{contactId:contact.id,subject:'Unresolved reviewed follow-up',body:'The exact saved unresolved message.'},201);
 const review=await api(`workbench/drafts/${waiting.id}/approval-preview`);
 providerStatus=408;
 const unresolved=await api(`workbench/drafts/${waiting.id}/approve`,'POST',{revision:1,quietHoursConfirmation:review.localTime},502);assert.equal(unresolved.state,'delivery-unknown');
 const messages=await api(`workbench/opportunities/${opportunity.id}/messages`);
 assert.equal(messages.messages.find((m:any)=>m.id===unresolved.id).state,'delivery-unknown');
 assert.equal(messages.messages.find((m:any)=>m.id===unresolved.id).providerMessageId,null);
 const restricted=await browser.newContext({baseURL:origin,ignoreHTTPSErrors:true,extraHTTPHeaders:{Cookie:`__Host-orbit_session=${restrictedSession.token}`}});
 const before=await api(`workbench/opportunities/${opportunity.id}/messages`),recordBefore=await api(`records/opportunity/${opportunity.id}`),notificationsBefore=await api('notifications'),draftsBefore=await api(`drafts?opportunityId=${opportunity.id}`),submissionsBefore=receipt.providerSubmissions;
 await api(`workbench/opportunities/${opportunity.id}/drafts`,'POST',{contactId:contact.id,subject:'Forbidden draft',body:'Must not save'},403,restricted);
 await api(`workbench/drafts/${waiting.id}/approve`,'POST',{revision:1,quietHoursConfirmation:review.localTime},403,restricted);
 assert.deepEqual(await api(`workbench/opportunities/${opportunity.id}/messages`),before);
 assert.deepEqual(await api(`records/opportunity/${opportunity.id}`),recordBefore);
 assert.deepEqual(await api('notifications'),notificationsBefore);
 assert.deepEqual(await api(`drafts?opportunityId=${opportunity.id}`),draftsBefore);
 assert.equal(receipt.providerSubmissions,submissionsBefore);
 receipt.assertions.push('Populated collaborator draft creation and approval both return 403 and preserve messages, record including timeline and queue, notifications, drafts, and submission count.');
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:width===1440?900:844});
  await page.goto(`/app/opportunities/${opportunity.id}`,{waitUntil:'networkidle'});
  await expect(page.getByText('Unresolved reviewed follow-up',{exact:true})).toBeVisible();
  await expect(page.getByText(/approved · the provider has not answered yet/)).toBeVisible();
  await expect(page.getByText('Accepted reviewed follow-up',{exact:true})).toBeVisible();
  await expect(page.getByText(/accepted by the mail provider/).first()).toBeVisible();
  const screenshot=`browser-outcomes-${width}.png`;await page.screenshot({path:resolve(packet,screenshot),fullPage:true});
  receipt.viewports.push({width,screenshot,accepted:true,unresolved:true});
 }
 receipt.assertions.push('Existing screens visibly distinguish provider acceptance and unresolved approval at 1440 and 390; reopening them makes no further submission.');
 assert.equal(receipt.providerSubmissions,2);assert.equal(receipt.unexpectedProviderRequests,0);
 receipt.status='passed';receipt.finished=new Date().toISOString();
 console.log(JSON.stringify(receipt,null,2));
 await restricted.close();await owner.close();
}catch(error){receipt.status='failed';receipt.error=String(error);console.error(error);process.exitCode=1;}
finally{await browser?.close();await runtime.teardown();await fixture.dispose();receipt.finished=new Date().toISOString();await writeFile(resolve(packet,'browser-receipt.json'),JSON.stringify(receipt,null,2)+'\n');}
