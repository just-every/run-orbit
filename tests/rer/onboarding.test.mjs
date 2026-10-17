import {managedMail} from './managed-mail.mjs';
import {isolateBrowserTemp} from '../support/browser-temp.mjs';
isolateBrowserTemp();
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdir,readFile,writeFile,stat} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {chromium,expect} from '@playwright/test';
import {unstable_DevEnv} from 'wrangler';
import {freshCheckout,freePort} from './checkout.mjs';
import {firstHour,accessible,ordinaryText} from './onboarding-journey.mjs';
import {localOwnerSignIn} from './sign-in.mjs';
import {holdCloudflareTimer,hostedScheduling} from './hosted-scheduling.mjs';
const evidence=resolve(process.env.ORBIT_EVIDENCE_DIR??'verification/onboarding');
for(const width of [1440,390])test(`SIGNAL-001 SIGNAL-009 PUBLIC-002 OUT-001 first hour through native rer sign-in and exact rendered recipes at ${width}`,{timeout:25*60000},async()=>{
 await mkdir(evidence,{recursive:true});const checkout=await freshCheckout(),port=await freePort(),origin=`http://127.0.0.1:${port}`;let browser,dev,paidRuntime;
 try{
 await holdCloudflareTimer(checkout);
 const setup=await checkout.rer(['setup','--owner-email','owner@example.test','--port',String(port),'--non-interactive']);assert.equal(setup.code,0,'Native rer setup failed; private output withheld');const varsPath=join(checkout.root,'.dev.vars'),before=await readFile(varsPath,'utf8'),key=/^ORBIT_ENCRYPTION_KEY=["']?([a-f0-9]{64})["']?$/m.exec(before)?.[1];assert.ok(key);assert.equal(setup.output.includes(key),false);assert.equal((await stat(varsPath)).mode&0o777,0o600);const repeat=await checkout.rer(['setup','--non-interactive']);assert.equal(repeat.code,0,'Repeated rer setup failed; private output withheld');assert.ok(await readFile(varsPath,'utf8')===before,'Repeated setup preserves private settings');assert.equal(repeat.output.includes(key),false);
 dev=await checkout.serve(['dev']);await dev.ready;browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']});const context=await browser.newContext({viewport:{width,height:900},ignoreHTTPSErrors:true}),page=await context.newPage();page.on('pageerror',error=>console.error('Browser error:',error.message.replace(/[a-f0-9]{64}/gi,'[redacted]').replace(/https?:\/\/\S+\?\S+/g,'[private-url]')));await page.goto(origin+'/signin');await accessible(page);// A native local CLI session: it continues in the production runtime below.
 await localOwnerSignIn(page,origin,checkout.root).catch(()=>{throw Error('Native sign-in navigation failed; private URL withheld');});await page.fill('#setup-owner-name','Hollis Reed');await page.fill('#setup-name','Harbour Revenue');await page.fill('#setup-timezone','UTC');await page.fill('#setup-currency','USD');await page.fill('#setup-stages','Discovery\nEvaluation\nProposal');await page.getByRole('button',{name:'Finish setup'}).click();
 const result=await firstHour(page,origin,width,evidence);await writeFile(join(evidence,`journey-${width}.json`),JSON.stringify({width,buttonMs:result.buttonMs,formMs:result.formMs,fonts:result.fonts},null,2));for(const[name,text]of Object.entries(result.snippets))await writeFile(join(evidence,`rendered-${width}-${name}.mjs`),text);
 // Base rer reports SIGTERM as 143 after it has stopped every owned child.
 dev.child.kill('SIGTERM');assert.equal((await dev.exited).code,143);dev=undefined;
 // The only fake is the paid provider's HTTP boundary. The same emitted application,
 // native session, real D1 and saved exact draft continue after the runtime restart.
 await writeFile(varsPath,before+'SENDGRID_API_KEY=test-provider-edge\nMAIL_REPLY_TO=replies@example.test\nSENDGRID_UNSUBSCRIBE_GROUP_ID=1\n',{mode:0o600});let submissions=[];
 // Explicit bindings: runners may disable wrangler's env-file loading (CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false).
 const paidBindings=Object.fromEntries((await readFile(varsPath,'utf8')).split('\n').filter(line=>/^[A-Z_][A-Z0-9_]*=/.test(line)).map(line=>{const at=line.indexOf('=');return [line.slice(0,at),{type:'secret_text',value:line.slice(at+1).replace(/^(["'])(.*)\1$/,'$2')}];}));
 paidRuntime=new unstable_DevEnv();const paidWorker=await paidRuntime.startWorker({config:join(checkout.root,'dist/server/wrangler.json'),bindings:paidBindings,dev:{remote:false,persist:join(checkout.root,'.wrangler/state'),watch:false,inspector:false,server:{hostname:'127.0.0.1',port},outboundService:async request=>{assert.equal(new URL(request.url).origin,'https://api.sendgrid.com');assert.equal(new URL(request.url).pathname,'/v3/mail/send');submissions.push(await request.json());return new Response(null,{status:202,headers:{'x-message-id':'test-paid-provider-acceptance'}});}}});await paidWorker.ready;
 await page.goto(result.draftURL);
 // The returned preview determines whether the current recipient time needs confirmation.
 const approvalPreview=page.waitForResponse(response=>new URL(response.url()).pathname.endsWith('/approval-preview'));
 await page.getByRole('button',{name:'Approve and send exact revision',exact:true}).click();const preview=await approvalPreview;assert.equal(preview.status(),200);const {quietHours}=await preview.json();const quiet=page.getByRole('button',{name:'Confirm send now',exact:true});await expect(quiet.or(page.getByText(/Message state: accepted/))).toBeVisible();if(quietHours)await quiet.click();await expect(page.getByText(/Message state: accepted/)).toBeVisible();assert.equal(submissions.length,1);assert.equal(submissions[0].personalizations[0].to[0].email,'maya@harbour.example');assert.equal(submissions[0].subject,'Your team walkthrough');assert.equal(submissions[0].content[0].value,'Hi Maya, thank you for your inquiry. Would Thursday suit a team walkthrough?');await page.goto(result.opportunityURL);await expect(page.getByTestId('independent-opportunity-fields')).toContainText('Next');await ordinaryText(page);await accessible(page);
 // The mail step counts as checked only once the owner says the approved sender test arrived.
 await page.goto(origin+'/app');await expect(page.getByRole('link',{name:'Check your mail sender: send yourself a test',exact:true})).toBeVisible();await page.goto(origin+'/app/settings#mail-sender');await page.getByRole('button',{name:'Review test email',exact:true}).click();await page.getByRole('button',{name:'Approve and send test email to me',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'SendGrid accepted the test email to owner@example.test'})).toBeVisible();assert.equal(submissions.at(-1).subject,'Orbit sender check');await page.getByRole('button',{name:'I received “Orbit sender check”',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'shows your mail sender as checked'})).toBeVisible();
 await page.goto(origin+'/app');await expect(page.getByText('Setup complete',{exact:true})).toBeVisible();assert.equal(await page.locator('details').first().getAttribute('open'),null);
 await paidRuntime.teardown();paidRuntime=undefined;
 await managedMail({checkout,page,port,bindings:paidBindings,opportunityURL:result.opportunityURL,evidence,width});
 await hostedScheduling({checkout,page,port,bindings:paidBindings,opportunityURL:result.opportunityURL,evidence});
 if(width===1440){
  // A dry run goes ahead and names production sign-in mail as needed; the real deploy refuses before building or any provider request.
  const dry=await checkout.rer(['deploy','--dry-run']);assert.equal(dry.code,0,'A dry run lists what a real deploy needs');assert.match(dry.output,/Needed for a real deploy[\s\S]*production sign-in mail/);assert.equal(dry.output.includes(key),false);
  const real=await checkout.rer(['deploy'],{env:{CLOUDFLARE_ACCOUNT_ID:'',CLOUDFLARE_API_TOKEN:''}});assert.equal(real.code,4,'A production deploy must refuse local-only sign-in settings; configure hosted mail or Auth SSO.');assert.match(real.output,/Production sign-in is not configured[\s\S]*Nothing was built or uploaded/);assert.equal(real.output.includes(key),false);
 }
 }finally{await browser?.close();if(paidRuntime)await paidRuntime.teardown();if(dev){dev.child.kill('SIGTERM');await dev.exited;}await checkout.stop('dev');await checkout.close();}
});
