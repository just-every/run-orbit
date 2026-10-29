import {workflowBrowserJourney} from '../rer/workflow-journey.mjs';
import {emailLinkSignIn} from '../support/email-link';
import {reviewImportedData,reviewCustomerChanges} from './customer-review.mjs';
import {importCustomerBook} from './customer-import.mjs';
import {captureCustomerEvidence,reconnectCapture} from './customer-capture.mjs';
import {maintainCustomerRecord,inspectUntrustedCustomer} from './customer-record.mjs';
import {captureStatusFixture} from './capture-status-fixture';
import {mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {typedFieldsJourney} from './typed-fields-journey.mjs';
import {browserCalendarData} from '../support/browser-calendar-data';
import {calendarJourney} from './calendar-journey.mjs';
import {isolateBrowserTemp} from '../support/browser-temp.mjs';
isolateBrowserTemp();
import {todayApp} from '../support/today-workspace';
import {createSourceSecurity} from '../../src/core/platform/source-security';
import {callingJourney} from './calling-journey.mjs';
import { test } from 'node:test';
import {unstable_DevEnv} from 'wrangler';
import {customCertificate} from '../support/http-listener-fixture';
import {certificateTrust} from '../../newtests/t096/emitted-fixture';
import { chromium } from '@playwright/test';
import { isolatedDatabase } from '../support/isolated-database';
import { availablePort } from '../support/available-port';
import { createTestDependencies } from '../support/test-dependencies';
import { sampleData } from '../fixtures/sample-data';
import { sessionCookieName } from '../support/test-auth';
import { nativeLongRecordLayoutJourney } from './records-layout-journey.mjs';
import { identityVars } from '../support/worker-identity.mjs';

test('an owner moves a customer book into Orbit, reviews captured activity and configures the customer workspace', async () => {
  const fixture = await isolatedDatabase();
  const port = Number(process.env.ORBIT_RECORD_LAYOUT_PORT ?? await availablePort());
   const origin = `https://127.0.0.1:${port}`;
  const cookieOrigin=origin;
  const runtime=new unstable_DevEnv();
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    const deps = createTestDependencies(fixture.db);
    await deps.sampleData.seed();
    await fixture.db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(sampleData.operators[0].id).run();
    const session = await deps.auth.createSession(sampleData.operators[0].id);
    const callingProvider={submissions:0,status:400,code:21217},callingToken='synthetic-orbit-301',callingAccount='AC'+'1'.repeat(32);
    const caller=await todayApp(fixture.db,{operatorId:sampleData.operators[0].id,calling:{sourceSecurity:createSourceSecurity({ORBIT_ENCRYPTION_KEY:'ab'.repeat(32)})!,captureOrigin:origin}});
    await caller.json('/api/v1/calls/settings',{method:'PUT',body:{accountSid:callingAccount,token:callingToken,from:'+12025550101',operatorPhone:'+12025550102'}},200);
    const heldForm=new URLSearchParams({AccountSid:callingAccount,CallSid:'CA'+'5'.repeat(32),SequenceNumber:'0',Direction:'inbound',From:'+12025550999',To:'+12025550101',CallStatus:'completed',CallDuration:'120'}),callback=origin+'/api/v1/calls/twilio/events';
    const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(callingToken),{name:'HMAC',hash:'SHA-1'},false,['sign']);
    const raw=callback+[...heldForm.keys()].sort().map(name=>name+heldForm.get(name)).join(''),signature=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(raw))).toString('base64');
    const held=await caller.app.request(callback,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','X-Twilio-Signature':signature},body:heldForm});if(held.status!==200)throw new Error('Held-call browser fixture failed.');
    const calendarData=await browserCalendarData(fixture.db,sampleData.operators[0].id);
    await captureStatusFixture(fixture.db);
    const invitation=await caller.json<any>('/api/v2/access/workspaces/workspace/invitations',{body:{email:'import-review@example.test',role:'guest',expiresAt:new Date(Date.now()+86400000).toISOString()}},200);
    const viewer=await emailLinkSignIn(fixture.db,'import-review@example.test');
    await caller.app.request('https://orbit.test/api/v2/access/invitations/accept',{method:'POST',headers:{Cookie:viewer.cookie,Origin:'https://orbit.test','Content-Type':'application/json'},body:JSON.stringify({token:invitation.token})});

    const certificate=await customCertificate(fixture.directory);await fixture.close();
    const secret=(value:string)=>({type:'secret_text' as const,value});
    const worker=await runtime.startWorker({config:join(process.cwd(),'dist/server/wrangler.json'),bindings:Object.fromEntries(Object.entries({...identityVars(origin),ORBIT_ENCRYPTION_KEY:'ab'.repeat(32)}).map(([name,value])=>[name,secret(value)])),dev:{remote:false,persist:fixture.directory,watch:false,inspector:false,server:{hostname:'127.0.0.1',port,secure:true,httpsKeyPath:certificate.keyPath,httpsCertPath:certificate.certPath},origin:{secure:true},outboundService:async request=>{
      const url=new URL(request.url);if(url.origin!=='https://api.twilio.com'||url.pathname!==`/2010-04-01/Accounts/${callingAccount}/Calls.json`||request.method!=='POST')throw new Error('Unexpected calling provider request.');
      callingProvider.submissions++;return Response.json({status:callingProvider.status,code:callingProvider.code},{status:callingProvider.status});
    }}});await worker.ready;
    if((await worker.fetch(origin+'/health')).status!==200)throw new Error('Emitted Worker did not become healthy.');
    browser = await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic',...certificateTrust(certificate.cert)]});
    const context = await browser.newContext({ viewport:{width:1440,height:900},timezoneId:"Australia/Brisbane", baseURL: origin, ignoreHTTPSErrors:true, extraHTTPHeaders: { Cookie: `${sessionCookieName}=${session.token}` } });
    // Native form redirects use Chromium's cookie jar, not the injected header.
    // These are this fixture's own sessions, with the product's cookie attributes.
    await context.addCookies([{name:sessionCookieName,value:session.token,url:cookieOrigin,secure:true,httpOnly:true,sameSite:'Lax',expires:Date.parse(session.expiresAt)/1000}]);
    const evidence=resolve('verification/ui/customer-onboarding');await mkdir(evidence,{recursive:true});
    const info={outputPath:(...parts:string[])=>join(evidence,...parts)};
    const page=await context.newPage();
    // One owner brings in the book, checks its evidence and makes the workspace ready to work it.
    const customer=await importCustomerBook({page,context},info);
    await captureCustomerEvidence({page,context},info,customer);
    await reconnectCapture({page,context},info);
    await maintainCustomerRecord(page,customer);
    await inspectUntrustedCustomer(page);
    await nativeLongRecordLayoutJourney(page,customer);
    const guest=await browser.newContext({baseURL:origin,viewport:{width:1440,height:900},extraHTTPHeaders:{Cookie:viewer.cookie}});
    const [guestCookieName,guestToken]=viewer.cookie.split('=');
    await guest.addCookies([{name:guestCookieName!,value:guestToken!,url:cookieOrigin,secure:true,httpOnly:true,sameSite:'Lax'}]);
    await reviewImportedData(page,await guest.newPage(),customer,viewer.operator.operatorId);await guest.close();
    await calendarJourney(page,calendarData);
    await callingJourney(page,{fetch:worker.fetch.bind(worker),origin,provider:callingProvider,accountSid:callingAccount,token:callingToken});
    await typedFieldsJourney(page,calendarData.contact);
    await reviewCustomerChanges(page,customer);
    const workflowRecord=await context.request.post('/api/v1/workbench/opportunities',{headers:{Origin:origin},data:{title:'Operator review opportunity',companyName:'Workflow account',contactName:'Workflow buyer',email:'workflow-buyer@example.test',stageId:sampleData.pipelineStages[0].id,valueCents:0}});
    if(!workflowRecord.ok())throw new Error('Workflow browser record could not be created: '+await workflowRecord.text());
    const workflowDeal=await workflowRecord.json();
    await workflowBrowserJourney({page,fixture:{opportunityId:workflowDeal.id,contactId:customer.bob},origin,directory:evidence},1440);
  } finally {
    await browser?.close();
    await runtime.teardown();
    await fixture.dispose();
  }
});
