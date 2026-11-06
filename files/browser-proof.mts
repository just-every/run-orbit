import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {writeFile,mkdir} from 'node:fs/promises';
import {fixture,signIn} from './run-orbit/newtests/t096/fixture.ts';
import {customCertificate} from './run-orbit/tests/support/http-listener-fixture.ts';
import {certificateTrust} from './run-orbit/newtests/t096/emitted-fixture.ts';
import {identityVars} from './run-orbit/tests/support/worker-identity.mjs';
import {signRelayBody} from './run-orbit/src/base/sendgrid-event-relay/crypto.ts';
import {createId} from './run-orbit/src/core/shared/ids.ts';
const require=createRequire(resolve('package.json'));
const {unstable_DevEnv}=require('wrangler');
const {chromium,expect}=require('@playwright/test');
const packet=resolve('../packet'),f=await fixture(),runtime=new unstable_DevEnv();
let browser:any;
const receipt:any={source:'be80a3b8c7c298837fd2692ba905f36648a4792d',screens:[],providerSubmissions:0,externalProviderCalls:0};
try{
 const other=await f.records.save('contact',{name:'Separate buyer',email:'separate@ct-proof.test'},f.operator.operatorId);
 const cert=await customCertificate(f.target.directory),origin='https://127.0.0.1:8788',relaySecret=crypto.randomUUID()+crypto.randomUUID();
 const otherId=createId();
 await f.db.prepare("INSERT INTO operators(id,email,display_name,status,setup_owner,created_at,updated_at) VALUES(?,?,?,'active',0,?,?)").bind(otherId,'other@ct-proof.test','Other operator',new Date().toISOString(),new Date().toISOString()).run();
 const otherCookie=(await signIn(f.db,'other@ct-proof.test')).cookie;
 await f.target.close();
 const values={...identityVars(origin,'owner@fold.test'),SENDGRID_API_KEY:'synthetic-ct-provider-key',MAIL_FROM:'sender@ct-proof.test',MAIL_REPLY_TO:'reply@ct-proof.test',SENDGRID_UNSUBSCRIBE_GROUP_ID:'1',RER_MAIL_RELAY_SECRET:relaySecret};
 const worker=await runtime.startWorker({config:resolve('dist/server/wrangler.json'),bindings:Object.fromEntries(Object.entries(values).map(([name,value])=>[name,{type:'secret_text',value}])),dev:{remote:false,persist:f.target.directory,watch:false,inspector:false,server:{hostname:'127.0.0.1',port:8788,secure:true,httpsKeyPath:cert.keyPath,httpsCertPath:cert.certPath},origin:{secure:true},outboundService:async(request:Request)=>{
  const u=new URL(request.url);assert.equal(u.origin+u.pathname,'https://api.sendgrid.com/v3/mail/send');assert.equal(request.method,'POST');const body=await request.json();receipt.providerSubmissions++;receipt.sentContent=body;return new Response(null,{status:202,headers:{'x-message-id':`ct-browser-provider-${receipt.providerSubmissions}`}});
 }}});await worker.ready;
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox',...certificateTrust(cert.cert)]});
 const ctx=await browser.newContext({baseURL:origin,ignoreHTTPSErrors:true,extraHTTPHeaders:{Cookie:f.cookie}}),page=await ctx.newPage();
 const api=async(path:string,method='GET',body?:unknown,status=200,cookie=f.cookie)=>{
  const r=await worker.fetch(origin+'/api/v1/'+path,{method,headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});assert.equal(r.status,status,`${path}: ${await r.clone().text()}`);return r.json() as Promise<any>;
 };
 const deal=await api('workbench/opportunities','POST',{title:'CT reviewed proposal',companyName:'CT proof company',contactName:'CT proof buyer',email:'buyer@ct-proof.test',stageId:f.stage,valueCents:250000},201);
 await api(`workbench/opportunities/${deal.id}/events`,'POST',{type:'email.replied',subject:'Customer requested the proposal',occurredAt:new Date().toISOString(),eventId:createId()},201);
 const before=await api(`records/opportunity/${deal.id}`);assert.equal(before.record.queue_state,'now');const contact=before.contacts[0].id;
 const draft=await api(`workbench/opportunities/${deal.id}/drafts`,'POST',{contactId:contact,subject:'Reviewed OUT-005 proposal',body:'Exact reviewed proposal for the requested sales consultation.'},201);
 const preview=await api(`workbench/drafts/${draft.id}/approval-preview`);
 const sent=await api(`workbench/drafts/${draft.id}/approve`,'POST',{revision:1,quietHoursConfirmation:preview.localTime});assert.equal(sent.state,'accepted');
 const accepted=await api(`records/opportunity/${deal.id}`);assert.equal(accepted.record.queue_state,'next');assert.equal(accepted.record.queue_reason,'Awaiting customer response');
 const acceptedRows=accepted.timeline.filter((row:any)=>row.kind==='message.accepted');assert.equal(acceptedRows.length,1);const payload=JSON.parse(acceptedRows[0].payload_json);assert.equal(payload.subject,'Reviewed OUT-005 proposal');assert.equal(payload.body,'Exact reviewed proposal for the requested sales consultation.');assert.equal(payload.providerId,'ct-browser-provider-1');assert.equal(accepted.timeline.filter((row:any)=>row.kind==='action.completed').length,1);
 const notices=await api('notifications'),own=notices.notifications.filter((n:any)=>n.kind==='message.accepted'&&n.opportunityId===deal.id);assert.equal(own.length,1);assert.equal((await api('notifications','GET',undefined,200,otherCookie)).notifications.filter((n:any)=>n.kind==='message.accepted'&&n.opportunityId===deal.id).length,0);

 const events=[{sg_event_id:createId(),event:'processed',timestamp:Math.floor(Date.now()/1000),email:'buyer@ct-proof.test',rer_product:'orbit',sg_message_id:'ct-browser-provider-1'}],raw=JSON.stringify(events),timestamp=String(Math.floor(Date.now()/1000));
 const callback=(signature:string)=>worker.fetch(origin+'/api/v1/mail/events/relay',{method:'POST',headers:{'x-rer-mail-timestamp':timestamp,'x-rer-mail-signature':signature},body:raw});
 assert.equal((await callback('invalid')).status,401);assert.deepEqual(await api(`records/opportunity/${deal.id}`),accepted);assert.deepEqual(await api('notifications'),notices);
 const signature=await signRelayBody(relaySecret,timestamp,raw);assert.equal((await callback(signature)).status,200);const afterEvent=await api(`records/opportunity/${deal.id}`);assert.equal((await callback(signature)).status,200);assert.deepEqual(await api(`records/opportunity/${deal.id}`),afterEvent);assert.deepEqual(await api('notifications'),notices);assert.equal(receipt.providerSubmissions,1);
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.goto(`/app/opportunities/${deal.id}`);await expect(page.getByRole('heading',{name:'CT reviewed proposal',exact:true})).toBeVisible();await expect(page.getByText('Marked the next action done',{exact:true})).toBeVisible();await expect(page.getByText('Reviewed OUT-005 proposal',{exact:true})).toBeVisible();
  await page.screenshot({path:resolve(packet,`accepted-deal-${width}.png`),fullPage:true});receipt.screens.push(`accepted-deal-${width}.png`);
  await page.goto('/app/notifications');await expect(page.getByRole('heading',{name:'Notifications inbox',exact:true})).toBeVisible();await expect(page.locator('.notification-list--inbox li').filter({hasText:'Message accepted'})).toHaveCount(1);
  await page.screenshot({path:resolve(packet,`responsible-inbox-${width}.png`),fullPage:true});receipt.screens.push(`responsible-inbox-${width}.png`);
 }
 receipt.linked={timeline:1,completedAction:1,queue:'next',responsibleNotification:1,otherNotification:0,forgedReceipt:401,replay:'unchanged',providerSubmissions:1};
 receipt.status='passed';
 console.log('BROWSER PASS exact reviewed timeline and completed action; NEXT; one responsible inbox and none for another; signed replay and forged refusal; 1440/390 emitted Worker screens.');
}finally{
 await browser?.close();await runtime.teardown();await f.close();
 delete receipt.sentContent;
 await writeFile(resolve(packet,'browser-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
}
