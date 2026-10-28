import {captureRuleBrowserSeed} from '../../newtests/t096/capture-rule-browser-seed';
import {captureRuleBrowserJourney} from '../../newtests/t096/browser-capture-rule';
import {mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {nativeHandoffJourney} from './journey.mjs';
import {nativeOpportunityViewportJourney} from './viewport-journey.mjs';
import {relatedRecordsJourney} from './related-records-journey';
import {workerSecurityJourney} from './worker-security';
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
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chromium,expect } from '@playwright/test';
import { isolatedDatabase } from '../support/isolated-database';
import { createTestDependencies } from '../support/test-dependencies';
import { sampleData } from '../fixtures/sample-data';
import { sessionCookieName } from '../support/test-auth';
import { nativeLongRecordLayoutJourney } from './records-layout-journey.mjs';
import { identityVarArgs } from '../support/worker-identity.mjs';

test('an operator delegates a handoff, reviews calls and calendars, and edits native records without losing privacy or related data', async () => {
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
    const session = await deps.auth.createSession(sampleData.operators[0].id),revoked=await deps.auth.createSession(sampleData.operators[0].id),expired=await deps.auth.createSession(sampleData.operators[0].id);await deps.auth.revoke(revoked.id);await fixture.db.prepare("UPDATE sessions SET expires_at='2000-01-01T00:00:00Z' WHERE id=?").bind(expired.id).run();
    const caller=await todayApp(fixture.db,{operatorId:sampleData.operators[0].id,calling:{sourceSecurity:createSourceSecurity({ORBIT_ENCRYPTION_KEY:'ab'.repeat(32)})!,captureOrigin:'https://orbit.test'}});
    await caller.json('/api/v1/calls/settings',{method:'PUT',body:{accountSid:'AC'+'1'.repeat(32),token:'synthetic-orbit-twilio-token',from:'+12025550101',operatorPhone:'+12025550102'}},200);
    const heldForm=new URLSearchParams({AccountSid:'AC'+'1'.repeat(32),CallSid:'CA'+'5'.repeat(32),SequenceNumber:'0',Direction:'inbound',From:'+12025550999',To:'+12025550101',CallStatus:'completed',CallDuration:'120'}),callback='https://orbit.test/api/v1/calls/twilio/events';
    const key=await crypto.subtle.importKey('raw',new TextEncoder().encode('synthetic-orbit-twilio-token'),{name:'HMAC',hash:'SHA-1'},false,['sign']);
    const raw=callback+[...heldForm.keys()].sort().map(name=>name+heldForm.get(name)).join(''),signature=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(raw))).toString('base64');
    const held=await caller.app.request(callback,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','X-Twilio-Signature':signature},body:heldForm});if(held.status!==200)throw new Error('Held-call browser fixture failed.');
    const calendarData=await browserCalendarData(fixture.db,sampleData.operators[0].id);
    const captureSeed=await captureRuleBrowserSeed({db:fixture.db,cookie:`${sessionCookieName}=${session.token}`,stage:sampleData.pipelineStages[0].id});
    const privateData=await browserPrivateData(fixture.db,sampleData.operators[0].id);
    const providerCanary=crypto.randomUUID(),privateBindings=join(fixture.directory,'browser-provider.env');await writeFile(privateBindings,`SENDGRID_API_KEY=${providerCanary}\n`,{mode:0o600});
    await fixture.close();
    worker = spawn(process.execPath, [
      'node_modules/wrangler/bin/wrangler.js', 'dev', '--config', 'dist/server/wrangler.json',
      '--local', '--persist-to', fixture.directory, '--env-file', privateBindings, '--port', String(port), '--inspector-port', String(inspectorPort), '--var','ORBIT_ENCRYPTION_KEY:'+ 'ab'.repeat(32), ...identityVarArgs(origin)
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
    if (!ready) throw new Error(output.replaceAll(providerCanary,'[redacted]') || `Emitted Worker did not start at ${origin}.`);
    browser = await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']});
    const context = await browser.newContext({ baseURL: origin, viewport:{width:1440,height:900}, extraHTTPHeaders: { Cookie: `${sessionCookieName}=${session.token}` } });
    for(const path of ['/delegation/settings',`/delegation/handoffs/${privateData.deal}`])expect((await context.request.get(path,{headers:{Cookie:privateData.cookie}})).status()).toBe(403);
    expect((await context.request.post('/delegation/clients',{headers:{Cookie:privateData.cookie,Origin:origin},form:{id:'synthetic-orbit-forbidden-client',redirect_uri:'https://synthetic-orbit.example/callback'},maxRedirects:0})).status()).toBe(403);
    await workerSecurityJourney({browser,context,origin,valid:session.token,revoked:revoked.token,expired:expired.token,providerCanary,opportunityId:sampleData.opportunities[0].id});
    await nativeHandoffJourney(await context.newPage());
    const captureEvidence=resolve(process.env.ORBIT_FOLD_BROWSER_EVIDENCE??'verification/ui/capture-rule');await mkdir(captureEvidence,{recursive:true});await captureRuleBrowserJourney(browser,origin,captureEvidence,`${sessionCookieName}=${session.token}`,captureSeed);
    await nativeOpportunityViewportJourney(await context.newPage());
    await relatedRecordsJourney(context);
    await callingJourney(await context.newPage());
    await calendarJourney(await context.newPage(),calendarData);
    const collaboratorContext=await browser.newContext({baseURL:origin,viewport:{width:1440,height:900},extraHTTPHeaders:{Cookie:privateData.cookie}});
    await privateEntriesJourney(await context.newPage(),await collaboratorContext.newPage(),privateData);
    await collaboratorContext.close();
    await nativeLongRecordLayoutJourney(await context.newPage());
    await typedFieldsJourney(await context.newPage(),calendarData.contact);
  } finally {
    await browser?.close();
    if (worker && worker.exitCode === null) { worker.kill('SIGTERM'); await once(worker, 'exit'); }
    await fixture.dispose();
  }
});
