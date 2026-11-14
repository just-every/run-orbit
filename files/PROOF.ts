import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {chromium,expect} from '@playwright/test';
import {fixture,signIn} from '../newtests/t096/fixture';
import {createApp} from '../tests/support/app';
import {emittedWorker} from '../newtests/t096/emitted-fixture';

const directory=resolve('../packet/browser');await mkdir(directory,{recursive:true});
const f=await fixture();let worker:Awaited<ReturnType<typeof emittedWorker>>|undefined,browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
try{
 const app=createApp({database:f.db,assets:{fetch:async()=>new Response(null,{status:404})}});
 const response=await app.request('https://orbit.test/api/v1/settings/operators',{method:'POST',headers:{Cookie:f.cookie,Origin:'https://orbit.test','Content-Type':'application/json'},body:JSON.stringify({email:'synthetic-orbit-proof@form.test',displayName:'Morgan Chen'})});assert.equal(response.status,201);const rep=await response.json() as {id:string},session=await signIn(f.db,'synthetic-orbit-proof@form.test');
 worker=await emittedWorker(f.target);browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-mock-keychain','--password-store=basic',...worker.browserArgs]});
 const owner=await browser.newContext({baseURL:worker.origin,viewport:{width:1440,height:1000},ignoreHTTPSErrors:true,extraHTTPHeaders:{Cookie:f.cookie}}),recipient=await browser.newContext({baseURL:worker.origin,viewport:{width:1440,height:1000},ignoreHTTPSErrors:true,extraHTTPHeaders:{Cookie:session.cookie}}),visitor=await browser.newContext({baseURL:worker.origin,viewport:{width:1440,height:1000},ignoreHTTPSErrors:true});
 const call=async(path:string,data?:unknown)=>{const res=data===undefined?await owner.request.get(path):await owner.request.post(path,{headers:{Origin:worker!.origin},data});assert.ok(res.ok(),`${path}: ${res.status()} ${await res.text()}`);return res.json();};
 const inbox=async(context:typeof owner)=>{const res=await context.request.get('/api/v1/notifications');assert.equal(res.status(),200);return res.json();};
 const options=await call('/api/v2/workspaces/workspace/forms/builder-options'),stage=options.stages.find((row:any)=>row.stage_id===f.stage);assert.ok(stage);
 const proof:any[]=[];const publicPage=await visitor.newPage(),recipientPage=await recipient.newPage(),ownerPage=await owner.newPage();
 for(const mode of ['fixed','unassigned']){
  const slug=`notify-${mode}`,base='/api/v2/workspaces/workspace/forms',form={title:`${mode==='fixed'?'Assigned':'Team queue'} consultation`,fields:[{id:'name',label:'Name',required:true},{id:'email',label:'Email',required:true},{id:'message',label:'Message',required:false}],opportunity:{stageId:f.stage,pipelineId:stage.pipeline_id},assignment:{mode,operatorIds:mode==='fixed'?[rep.id]:[]},consentWording:'Send consultation updates'},saved=await call(base,{form,landing:{title:'Talk with the sales team',heading:'Request a consultation',paragraphs:['Tell us about the help your team needs.']}}),compiled=await call(`${base}/compile`,{formId:saved.id,revision:saved.revision,reviewedHash:saved.hash,slug,maxRecords:10,expiresAt:new Date(Date.now()+86400000).toISOString()});
  await call(`${base}/publications/${compiled.operationId}/approve`,{artifactHash:compiled.hash,formRevision:saved.revision});await call(`${base}/publications/${compiled.operationId}/publish`,{});
  const before=await Promise.all([inbox(owner),inbox(recipient)]);
  await publicPage.goto(`/p/${slug}`);await publicPage.getByLabel('Name',{exact:true}).fill(mode==='fixed'?'Avery Stone':'Taylor Park');await publicPage.getByLabel('Email',{exact:true}).fill(`synthetic-orbit-${mode}@enquiry.test`);await publicPage.getByLabel('Message',{exact:true}).fill('Please help our team plan its rollout.');await publicPage.getByLabel('Send consultation updates',{exact:true}).check();await expect(publicPage.getByRole('button',{name:'Submit enquiry',exact:true})).toBeEnabled();
  const submitted=publicPage.waitForResponse(res=>res.request().method()==='POST'&&new URL(res.url()).pathname===`/api/public/forms/${slug}`);await publicPage.getByRole('button',{name:'Submit enquiry',exact:true}).click();const accepted=await submitted;assert.equal(accepted.status(),200,await accepted.text());const receipt=await accepted.json();await expect(publicPage.getByRole('status')).toContainText('Your enquiry was received');
  const after=await Promise.all([inbox(owner),inbox(recipient)]),deltas=after.map((row,index)=>row.unread-before[index].unread);assert.deepEqual(deltas,mode==='fixed'?[0,1]:[1,1]);
  const submissions=await call(`${base}/${saved.id}/submissions`),submission=submissions.find((row:any)=>row.id===receipt.submissionId),detail=await call(`/api/v1/records/contact/${submission.contact_id}`);assert.equal(detail.ownership.ownerId,mode==='fixed'?rep.id:null);assert.equal(detail.opportunities.length,1);const deal=detail.opportunities[0];
  for(const [index,row]of after.entries()){const notices=row.notifications.filter((notice:any)=>!before[index].notifications.some((previous:any)=>previous.id===notice.id));assert.equal(notices.length,mode==='fixed'&&index===0?0:1);for(const notice of notices){assert.equal(notice.opportunityId,deal.id);assert.equal(notice.kind,mode==='fixed'?'form.submitted':'opportunity.now');if(mode==='fixed')assert.equal(notice.href,`/app/contacts/${submission.contact_id}`);}}
  await recipientPage.goto('/app/notifications');await expect(recipientPage.getByRole('heading',{name:'Notifications inbox',exact:true})).toBeVisible();await expect(recipientPage.locator('.notification-list--inbox > li')).toHaveCount(after[1].notifications.length);
  if(mode==='fixed'){await expect(recipientPage.locator(`a.notification-title[href="/app/contacts/${submission.contact_id}"]`)).toBeVisible();await expect(recipientPage.getByRole('link',{name:'Open deal',exact:true})).toBeVisible();}
  await ownerPage.goto('/app/notifications');await expect(ownerPage.getByRole('heading',{name:'Notifications inbox',exact:true})).toBeVisible();await expect(ownerPage.locator('.notification-list--inbox > li')).toHaveCount(after[0].notifications.length);
  for(const width of [1440,390]){for(const [page,label]of [[publicPage,'received'],[recipientPage,'recipient-inbox'],...(mode==='unassigned'?[[ownerPage,'owner-inbox']]:[])] as const){await page.setViewportSize({width,height:1000});await page.screenshot({path:join(directory,`${mode}-${label}-${width}.png`),fullPage:true});}}
  await publicPage.setViewportSize({width:1440,height:1000});await recipientPage.setViewportSize({width:1440,height:1000});await ownerPage.setViewportSize({width:1440,height:1000});
  proof.push({mode,submissionId:receipt.submissionId,contactId:submission.contact_id,dealId:deal.id,unreadBefore:before.map(row=>row.unread),unreadAfter:after.map(row=>row.unread),deltas,screenshots:[1440,390],assertionWidth:1440});
 }
 await writeFile(join(directory,'receipt.json'),JSON.stringify({status:'passed',scenarios:proof,ownedWorkersClosed:true,ownedBrowsersClosed:true},null,2)+'\n');await owner.close();await recipient.close();await visitor.close();console.log(JSON.stringify({status:'passed',scenarios:proof}));
}finally{await browser?.close();await worker?.dispose();await f.close();}
