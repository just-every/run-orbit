import {typedFieldsJourney} from './typed-fields-journey.mjs';
import {browserPrivateData} from '../support/browser-private-data';
import {privateEntriesJourney} from './private-entries-journey.mjs';
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
import {join} from 'node:path';
import {certificateTrust} from '../../newtests/t096/emitted-fixture';
import { chromium } from '@playwright/test';
import { isolatedDatabase } from '../support/isolated-database';
import { createTestDependencies } from '../support/test-dependencies';
import { sampleData } from '../fixtures/sample-data';
import { sessionCookieName } from '../support/test-auth';
import { nativeLongRecordLayoutJourney } from './records-layout-journey.mjs';
import { identityVars } from '../support/worker-identity.mjs';

test('emitted Worker record and NOW lists wrap full valid long names at mobile and desktop widths', async () => {
  const fixture = await isolatedDatabase();
  const port = Number(process.env.ORBIT_RECORD_LAYOUT_PORT ?? 8728);
   const origin = `https://127.0.0.1:${port}`;
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
    const privateData=await browserPrivateData(fixture.db,sampleData.operators[0].id);
    const certificate=await customCertificate(fixture.directory);await fixture.close();
    const secret=(value:string)=>({type:'secret_text' as const,value});
    const worker=await runtime.startWorker({config:join(process.cwd(),'dist/server/wrangler.json'),bindings:Object.fromEntries(Object.entries({...identityVars(origin),ORBIT_ENCRYPTION_KEY:'ab'.repeat(32)}).map(([name,value])=>[name,secret(value)])),dev:{remote:false,persist:fixture.directory,watch:false,inspector:false,server:{hostname:'127.0.0.1',port,secure:true,httpsKeyPath:certificate.keyPath,httpsCertPath:certificate.certPath},origin:{secure:true},outboundService:async request=>{
      const url=new URL(request.url);if(url.origin!=='https://api.twilio.com'||url.pathname!==`/2010-04-01/Accounts/${callingAccount}/Calls.json`||request.method!=='POST')throw new Error('Unexpected calling provider request.');
      callingProvider.submissions++;return Response.json({status:callingProvider.status,code:callingProvider.code},{status:callingProvider.status});
    }}});await worker.ready;
    if((await worker.fetch(origin+'/health')).status!==200)throw new Error('Emitted Worker did not become healthy.');
    browser = await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic',...certificateTrust(certificate.cert)]});
    const context = await browser.newContext({ baseURL: origin, ignoreHTTPSErrors:true, extraHTTPHeaders: { Cookie: `${sessionCookieName}=${session.token}` } });
    // Emitted documents and HTTP routes share one Worker; only Twilio's outbound network edge is faked.
    await callingJourney(await context.newPage(),{fetch:worker.fetch.bind(worker),origin,provider:callingProvider,accountSid:callingAccount,token:callingToken});
    await calendarJourney(await context.newPage(),calendarData);
    const collaboratorContext=await browser.newContext({baseURL:origin,ignoreHTTPSErrors:true,extraHTTPHeaders:{Cookie:privateData.cookie}});
    await privateEntriesJourney(await context.newPage(),await collaboratorContext.newPage(),privateData);
    await collaboratorContext.close();
    await nativeLongRecordLayoutJourney(await context.newPage());
    await typedFieldsJourney(await context.newPage(),calendarData.contact);
  } finally {
    await browser?.close();
    await runtime.teardown();
    await fixture.dispose();
  }
});
