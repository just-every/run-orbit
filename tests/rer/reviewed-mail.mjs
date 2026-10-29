import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {expect} from '@playwright/test';
import {unstable_DevEnv} from 'wrangler';
import {approvalResponse,sentMessageProof} from './sent-message-proof.mjs';
import {managedMail} from './managed-mail.mjs';
import {ordinaryText,accessible} from './onboarding-journey.mjs';
import {hostedScheduling} from './hosted-scheduling.mjs';
export async function continueReviewedMail({checkout,page,port,origin,result,evidence}) {
 const width=1440,varsPath=join(checkout.root,'.dev.vars'),before=await readFile(varsPath,'utf8'),key=/^ORBIT_ENCRYPTION_KEY=["']?([a-f0-9]{64})["']?$/m.exec(before)?.[1];
 let paidRuntime;
 try {
 // The only fake is the paid provider's HTTP boundary. The same emitted application,
 // native session, real D1 and saved exact draft continue after the runtime restart.
 await writeFile(varsPath,before+'SENDGRID_API_KEY=test-provider-edge\nMAIL_REPLY_TO=replies@example.test\nSENDGRID_UNSUBSCRIBE_GROUP_ID=1\n',{mode:0o600});let submissions=[];
 // Explicit bindings: runners may disable wrangler's env-file loading (CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false).
 const paidBindings=Object.fromEntries((await readFile(varsPath,'utf8')).split('\n').filter(line=>/^[A-Z_][A-Z0-9_]*=/.test(line)).map(line=>{const at=line.indexOf('=');return [line.slice(0,at),{type:'secret_text',value:line.slice(at+1).replace(/^(["'])(.*)\1$/,'$2')}];}));
paidRuntime=new unstable_DevEnv();const paidWorker=await paidRuntime.startWorker({config:join(checkout.root,'dist/server/wrangler.json'),bindings:paidBindings,dev:{remote:false,persist:join(checkout.root,'.wrangler/state'),watch:false,inspector:false,server:{hostname:'127.0.0.1',port},outboundService:async request=>{assert.equal(new URL(request.url).origin,'https://api.sendgrid.com');assert.equal(new URL(request.url).pathname,'/v3/mail/send');submissions.push(await request.json());return new Response(null,{status:202,headers:{'x-message-id':'test-paid-provider-acceptance'}});}}});await paidWorker.ready;
 await page.goto(result.draftURL);
 // The returned preview determines whether the current recipient time needs confirmation.
 const approved=approvalResponse(page),approvalPreview=page.waitForResponse(response=>new URL(response.url()).pathname.endsWith('/approval-preview'));
 await page.getByRole('button',{name:'Approve and send exact revision',exact:true}).click();const preview=await approvalPreview;assert.equal(preview.status(),200);const {quietHours}=await preview.json();const quiet=page.getByRole('button',{name:'Confirm send now',exact:true});if(quietHours){await expect(quiet).toBeVisible();await quiet.click();}await sentMessageProof(page,approved,{recipient:'maya@harbour.example',subject:'Your team walkthrough',body:'Hi Maya, thank you for your inquiry. Would Thursday suit a team walkthrough?'});assert.equal(submissions.length,1);assert.equal(submissions[0].personalizations[0].to[0].email,'maya@harbour.example');assert.equal(submissions[0].subject,'Your team walkthrough');assert.equal(submissions[0].content[0].value,'Hi Maya, thank you for your inquiry. Would Thursday suit a team walkthrough?');await page.goto(result.opportunityURL);await expect(page.getByTestId('independent-opportunity-fields')).toContainText('Next');await ordinaryText(page);await accessible(page);
 // The mail step counts as checked only once the owner says the approved sender test arrived.
 await page.goto(origin+'/app');await expect(page.getByRole('link',{name:'Check your mail sender: send yourself a test',exact:true})).toBeVisible();await page.goto(origin+'/app/settings#mail-sender');await page.getByRole('button',{name:'Review test email',exact:true}).click();await page.getByRole('button',{name:'Approve and send test email to me',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'SendGrid accepted the test email to owner@example.test'})).toBeVisible();assert.equal(submissions.at(-1).subject,'Orbit sender check');await page.getByRole('button',{name:'I received “Orbit sender check”',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'shows your mail sender as checked'})).toBeVisible();
 await page.goto(origin+'/app');await expect(page.getByText('Setup complete',{exact:true})).toBeVisible();assert.equal(await page.locator('details').first().getAttribute('open'),null);
 await paidRuntime.teardown();paidRuntime=undefined;
 await managedMail({checkout,page,port,bindings:paidBindings,opportunityURL:result.opportunityURL,evidence,width});
 await hostedScheduling({checkout,page,port,bindings:paidBindings,opportunityURL:result.opportunityURL,evidence});
 {
  // Without Cloudflare credentials a dry run builds and validates, then exits 3 because it cannot read the target secret bindings (rer 0.2.58); the real deploy refuses before building or any provider request.
  const dry=await checkout.rer(['deploy','--dry-run']);assert.equal(dry.code,3,'A dry run without Cloudflare credentials refuses to claim the secret bindings');assert.match(dry.output,/cannot read the target secret bindings/);assert.equal(dry.output.includes(key),false);
  const real=await checkout.rer(['deploy'],{env:{CLOUDFLARE_ACCOUNT_ID:'',CLOUDFLARE_API_TOKEN:''}});assert.equal(real.code,4,'A production deploy must refuse local-only sign-in settings; configure hosted mail or Auth SSO.');assert.match(real.output,/Production sign-in is not configured[\s\S]*Nothing was built or uploaded/);assert.equal(real.output.includes(key),false);
 }

 }finally{if(paidRuntime)await paidRuntime.teardown();await writeFile(varsPath,before,{mode:0o600});}
}
