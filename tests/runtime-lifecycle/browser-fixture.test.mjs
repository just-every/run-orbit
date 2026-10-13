import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { test } from 'node:test';

const execute = promisify(execFile);

test('broker runs the unchanged original session fixture and restores HTTP after every fixture', { timeout: 120_000 }, async () => {
  const state = await mkdtemp(join(tmpdir(), 'orbit-broker-'));
  const port = Number(process.env.ORBIT_LIFECYCLE_PORT ?? 8727);
  const origin = `http://127.0.0.1:${port}`;
  const env = { ...process.env, ORBIT_TEST_STATE: state, PORT: String(port), ORBIT_FIXTURE_BROKER: '1', ORBIT_INSPECTOR_PORT: process.env.ORBIT_INSPECTOR_PORT ?? '0', CI: '1' };
  const command = (args, overrides = {}) => execute(process.execPath, args, { env: { ...env, ...overrides }, timeout: 60_000, maxBuffer: 2 ** 20 });
  let runtime;
  try {
    await command(['node_modules/tsx/dist/cli.mjs', 'tests/support/prepare-state.ts']);
    runtime = spawn(process.execPath, ['--input-type=module', '-e', "await (await import('./scripts/browser-runtime.mjs')).serveBrowserRuntime()"], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    runtime.stdout.on('data', chunk => { output += chunk; });
    runtime.stderr.on('data', chunk => { output += chunk; });
    let ready = false;
    for (let attempt = 0; attempt < 300; attempt++) {
      if (runtime.exitCode !== null) throw Error(output);
      try { if ((await fetch(origin + '/health')).ok) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(ready, output);
    const fixture = ['node_modules/tsx/dist/cli.mjs', 'tests/support/issue-operator-session.ts'];
    let previousToken;
    for (let attempt = 0; attempt < 2; attempt++) {
      const { stdout } = await command(fixture);
      const session = JSON.parse(stdout);
      assert.notEqual(session.token, previousToken);
      previousToken = session.token;
      const response = await fetch(origin + '/api/v1/opportunities/now', { headers: { Cookie: `${session.cookieName}=${session.token}` } });
      assert.equal(response.status, 200);
      assert.ok(Array.isArray((await response.json()).opportunities));
    }
  } finally {
    if (runtime && runtime.exitCode === null) {
      const exited = once(runtime, 'exit');
      runtime.kill('SIGTERM');
      await exited;
    }
    await rm(state, { recursive: true, force: true });
  }
});
