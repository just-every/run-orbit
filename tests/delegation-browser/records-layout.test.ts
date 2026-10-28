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
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chromium } from '@playwright/test';
import { isolatedDatabase } from '../support/isolated-database';
import { createTestDependencies } from '../support/test-dependencies';
import { sampleData } from '../fixtures/sample-data';
import { sessionCookieName } from '../support/test-auth';
import { nativeLongRecordLayoutJourney } from './records-layout-journey.mjs';
import { identityVarArgs } from '../support/worker-identity.mjs';

test('an owner moves a customer book into Orbit, reviews captured activity and configures the customer workspace', async () => {
  const fixture = await isolatedDatabase();
  const port = Number(process.env.ORBIT_RECORD_LAYOUT_PORT ?? 8728);
  const inspectorPort = Number(process.env.ORBIT_RECORD_LAYOUT_INSPECTOR_PORT ?? 8733);
  const origin = `http://127.0.0.1:${port}`;
  let worker: ReturnType<typeof spawn> | undefined;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    const deps = createTestDependencies(fixture.db);
    await deps.sampleData.seed();
    await fixture.db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(sampleData.operators[0].id).run();
    const session = await deps.auth.createSession(sampleData.operators[0].id);
    const caller=await todayApp(fixture.db,{operatorId:sampleData.operators[0].id,calling:{sourceSecurity:createSourceSecurity({ORBIT_ENCRYPTION_KEY:'ab'.repeat(32)})!,captureOrigin:'https://orbit.test'}});
    await caller.json('/api/v1/calls/settings',{method:'PUT',body:{accountSid:'AC'+'1'.repeat(32),token:'synthetic-orbit-twilio-token',from:'+12025550101',operatorPhone:'+12025550102'}},200);
    const heldForm=new URLSearchParams({AccountSid:'AC'+'1'.repeat(32),CallSid:'CA'+'5'.repeat(32),SequenceNumber:'0',Direction:'inbound',From:'+12025550999',To:'+12025550101',CallStatus:'completed',CallDuration:'120'}),callback='https://orbit.test/api/v1/calls/twilio/events';
    const key=await crypto.subtle.importKey('raw',new TextEncoder().encode('synthetic-orbit-twilio-token'),{name:'HMAC',hash:'SHA-1'},false,['sign']);
    const raw=callback+[...heldForm.keys()].sort().map(name=>name+heldForm.get(name)).join(''),signature=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(raw))).toString('base64');
    const held=await caller.app.request(callback,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','X-Twilio-Signature':signature},body:heldForm});if(held.status!==200)throw new Error('Held-call browser fixture failed.');
    const calendarData=await browserCalendarData(fixture.db,sampleData.operators[0].id);
    await captureStatusFixture(fixture.db);
    const invitation=await caller.json<any>('/api/v2/access/workspaces/workspace/invitations',{body:{email:'import-review@example.test',role:'guest',expiresAt:new Date(Date.now()+86400000).toISOString()}},200);
    const viewer=await emailLinkSignIn(fixture.db,'import-review@example.test');
    await caller.app.request('https://orbit.test/api/v2/access/invitations/accept',{method:'POST',headers:{Cookie:viewer.cookie,Origin:'https://orbit.test','Content-Type':'application/json'},body:JSON.stringify({token:invitation.token})});

    await fixture.close();
    worker = spawn(process.execPath, [
      'node_modules/wrangler/bin/wrangler.js', 'dev', '--config', 'dist/server/wrangler.json',
      '--local', '--persist-to', fixture.directory, '--port', String(port), '--inspector-port', String(inspectorPort), '--var','ORBIT_ENCRYPTION_KEY:'+ 'ab'.repeat(32), ...identityVarArgs(origin)
    ], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, CI: '1' } });
    let output = '';
    worker.stdout!.on('data', chunk => output += chunk);
    worker.stderr!.on('data', chunk => output += chunk);
    let ready = false;
    for (let attempt = 0; attempt < 300; attempt++) {
      try {
        if ((await fetch(origin+'/health')).ok) { ready = true; break; }
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!ready) throw new Error(output || `Emitted Worker did not start at ${origin}.`);
    browser = await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']});
    const context = await browser.newContext({ viewport:{width:1440,height:900},timezoneId:"Australia/Brisbane", baseURL: origin, extraHTTPHeaders: { Cookie: `${sessionCookieName}=${session.token}` } });
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
    await reviewImportedData(page,await guest.newPage(),customer,viewer.operator.operatorId);await guest.close();
    await calendarJourney(page,calendarData);
    await callingJourney(page);
    await typedFieldsJourney(page,calendarData.contact);
    await reviewCustomerChanges(page,customer);
  } finally {
    await browser?.close();
    if (worker && worker.exitCode === null) { worker.kill('SIGTERM'); await once(worker, 'exit'); }
    await fixture.dispose();
  }
});
