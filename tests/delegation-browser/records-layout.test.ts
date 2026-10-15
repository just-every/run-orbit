import {isolateBrowserTemp} from '../support/browser-temp.mjs';
isolateBrowserTemp();
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

test('emitted Worker record and NOW lists wrap full valid long names at mobile and desktop widths', async () => {
  const fixture = await isolatedDatabase();
  const port = Number(process.env.ORBIT_RECORD_LAYOUT_PORT ?? 8728);
  const inspectorPort = Number(process.env.ORBIT_RECORD_LAYOUT_INSPECTOR_PORT ?? 8733);
  const origin = `http://127.0.0.1:${port}`;
  let worker: ReturnType<typeof spawn> | undefined;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    const deps = createTestDependencies(fixture.db);
    await deps.sampleData.seed();
    const session = await deps.auth.createSession(sampleData.operators[0].id);
    await fixture.close();
    worker = spawn(process.execPath, [
      'node_modules/wrangler/bin/wrangler.js', 'dev', '--config', 'dist/server/wrangler.json',
      '--local', '--persist-to', fixture.directory, '--port', String(port), '--inspector-port', String(inspectorPort), ...identityVarArgs(origin)
    ], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, CI: '1' } });
    let output = '';
    worker.stdout!.on('data', chunk => output += chunk);
    worker.stderr!.on('data', chunk => output += chunk);
    let ready = false;
    for (let attempt = 0; attempt < 300; attempt++) {
      try {
        if ((await fetch(origin + '/health')).ok) { ready = true; break; }
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!ready) throw new Error(output || `Emitted Worker did not start at ${origin}.`);
    browser = await chromium.launch();
    const context = await browser.newContext({ baseURL: origin, extraHTTPHeaders: { Cookie: `${sessionCookieName}=${session.token}` } });
    await nativeLongRecordLayoutJourney(await context.newPage());
  } finally {
    await browser?.close();
    if (worker && worker.exitCode === null) { worker.kill('SIGTERM'); await once(worker, 'exit'); }
    await fixture.dispose();
  }
});
