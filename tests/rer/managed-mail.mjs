import assert from 'node:assert/strict';
import {join} from 'node:path';
import {unstable_DevEnv} from 'wrangler';
import {expect} from '@playwright/test';

/** Continue the real workspace and session; fake only the managed provider's HTTP edge. */
export async function managedMail({checkout,page,port,bindings,opportunityURL,evidence,width}){
 const origin=`https://127.0.0.1:${port}`,runtime=new unstable_DevEnv(),submissions=[];
 const secret=value=>({type:'secret_text',value});
 const shot=async name=>page.screenshot({path:join(evidence,`managed-${name}-${width}.png`),fullPage:true});
 try{
  const worker=await runtime.startWorker({config:join(checkout.root,'dist/server/wrangler.json'),bindings:{...bindings,
   AUTH_LOCAL:secret('false'),AUTH_ORIGIN:secret(origin),MAIL_PROVIDER:secret('rer'),MAIL_FROM:secret('managed@example.test'),MAIL_RELAY_URL:secret('https://managed-mail.example.test/send'),MAIL_API_KEY:secret('fixture-managed-mail')},
   dev:{remote:false,persist:join(checkout.root,'.wrangler/state'),watch:false,inspector:false,server:{hostname:'127.0.0.1',port,secure:true},origin:{secure:true},outboundService:async request=>{
    assert.equal(request.url,'https://managed-mail.example.test/send');assert.equal(request.headers.get('authorization'),'Bearer fixture-managed-mail');submissions.push(await request.json());return Response.json({messageId:`<managed-${submissions.length}@example.test>`},{status:202});
   }}});await worker.ready;
  await page.goto(origin+'/app/settings#mail-sender');await expect(page.getByTestId('mail-sender-status')).toContainText('passed');await page.locator('#mail-sender').scrollIntoViewIfNeeded();await shot('settings');
  await page.getByRole('button',{name:'Review test email',exact:true}).click();await page.getByRole('button',{name:'Approve and send test email to me',exact:true}).waitFor();await shot('test-review');
  const opportunity=new URL(opportunityURL);opportunity.protocol='https:';await page.goto(opportunity.href);
  await page.getByRole('button',{name:'Write follow-up',exact:true}).first().click();await page.getByLabel('Subject',{exact:true}).fill('Managed walkthrough');await page.getByLabel('Email body',{exact:true}).fill('Hi Maya, here is the walkthrough we reviewed.');await page.getByRole('button',{name:'Save draft for review',exact:true}).click();
  await page.waitForURL(/\/app\/drafts\//);await expect(page.getByRole('complementary',{name:'Managed mail sender'})).toBeVisible();await shot('approval');
  const preview=page.waitForResponse(response=>new URL(response.url()).pathname.endsWith('/approval-preview'));await page.getByRole('button',{name:'Approve and send exact revision',exact:true}).click();const {quietHours}=await(await preview).json();if(quietHours)await page.getByRole('button',{name:'Confirm send now',exact:true}).click();await expect(page.getByText(/Message state: accepted/)).toBeVisible();assert.equal(submissions.length,1);assert.equal(submissions[0].to,'maya@harbour.example');assert.equal(submissions[0].subject,'Managed walkthrough');assert.equal(submissions[0].text,'Hi Maya, here is the walkthrough we reviewed.');await shot('accepted');
  await page.goto(opportunity.href);await page.getByRole('heading',{name:'Approved outreach',exact:true}).scrollIntoViewIfNeeded();await expect(page.getByText('Managed walkthrough',{exact:true}).first()).toBeVisible();await shot('history');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }finally{await runtime.teardown();}
}
