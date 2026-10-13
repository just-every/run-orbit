import { spawn } from 'node:child_process';
import { createServer, createConnection } from 'node:net';
import { once } from 'node:events';
import { chmod, rm } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import {identityVarArgs} from '../tests/support/worker-identity.mjs';

// Isolated browser verification only. This key never enters production bindings.
export const BROWSER_TEST_ORBIT_ENCRYPTION_KEY = '7a'.repeat(32);

function socketPath() {
  const state = process.env.ORBIT_TEST_STATE;
  if (!state || !isAbsolute(state)) throw new Error('Browser fixtures require isolated absolute ORBIT_TEST_STATE.');
  return join(state, 'fixture.sock');
}

/** Test-only IPC: retain each original fresh fixture, with one D1 owner at a time. */
export async function requestOfflineFixture(name, args = []) {
  if (process.env.ORBIT_FIXTURE_OFFLINE === '1' || process.env.ORBIT_FIXTURE_BROKER !== '1') return false;
  const socket = createConnection(socketPath());
  socket.setTimeout(60_000, () => socket.destroy(new Error('Offline fixture request timed out.')));
  try {
    await once(socket, 'connect');
    socket.end(JSON.stringify({ name, args }));
    let data = '';
    for await (const chunk of socket) data += chunk;
    const result = JSON.parse(data);
    if (result.status !== 0) throw new Error(result.error || `Fixture exited with status ${result.status}.`);
    process.stdout.write(result.output);
    return true;
  } finally {
    socket.destroy();
  }
}

export async function serveBrowserRuntime() {
  const state = process.env.ORBIT_TEST_STATE;
  const port = Number(process.env.PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Browser runtime requires an explicit valid PORT.');
  const path = socketPath(), origin = `http://127.0.0.1:${port}`;
  let worker, closing = false, stopping = false, serial = Promise.resolve();
  async function stop() {
    if (!worker || worker.exitCode !== null) return;
    const current = worker;
    const exited = once(current, 'exit');
    stopping = true;
    current.kill('SIGTERM');
    try { await exited; } finally { stopping = false; }
  }
  async function start() {
    const current = spawn(process.execPath, [
      'node_modules/wrangler/bin/wrangler.js', 'dev', '--config', 'dist/server/wrangler.json',
      '--local', '--ip', '127.0.0.1', '--port', String(port),
      '--inspector-port', process.env.ORBIT_INSPECTOR_PORT ?? '0', '--persist-to', state,
      ...identityVarArgs(origin), '--var', `ORBIT_ENCRYPTION_KEY:${BROWSER_TEST_ORBIT_ENCRYPTION_KEY}`
    ], { stdio: 'inherit', env: process.env });
    worker = current;
    current.on('exit', code => {
      if (worker === current) worker = undefined;
      if (!stopping && !closing) {
        console.error('Browser Worker exited unexpectedly:', code);
        process.exitCode = 1;
        void shutdown().then(() => process.exit(1));
      }
    });
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      if (current.exitCode !== null || current.signalCode !== null) throw new Error('Browser Worker exited during startup.');
      try { if ((await fetch(origin + '/health')).ok) return; } catch {}
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error('Browser Worker startup timed out.');
  }
  async function fixture(request) {
    const noArguments = Array.isArray(request.args) && request.args.length === 0;
    const allowed = (request.name === 'tests/support/issue-operator-session.ts' && noArguments)
      || (request.name === 'tests/support/capture-browser-source.ts' && noArguments)
      || (request.name === 'tests/archive/session.ts' && Array.isArray(request.args)
        && (noArguments || (request.args.length === 1 && request.args[0] === '--target-owner')));
    if (!allowed) throw new Error('Unknown fixture request.');
    if (closing) throw new Error('Browser runtime is closing.');
    await stop();
    try {
      const child = spawn(process.execPath, ['node_modules/tsx/dist/cli.mjs', resolve(request.name), ...request.args], {
        env: { ...process.env, ORBIT_FIXTURE_OFFLINE: '1' }, stdio: ['ignore', 'pipe', 'pipe']
      });
      let output = '', error = '';
      child.stdout.on('data', chunk => { output += chunk; });
      child.stderr.on('data', chunk => { error += chunk; });
      const [status] = await once(child, 'exit');
      return { status: status ?? 1, output, error };
    } finally {
      // The fixture awaits platform.dispose() before exit; only then may HTTP own D1 again.
      if (!closing) await start();
    }
  }
  const server = createServer({ allowHalfOpen: true }, socket => {
    let input = '';
    socket.on('error', () => {});
    socket.on('data', chunk => {
      input += chunk;
      if (input.length > 4096) socket.destroy(new Error('Fixture request is too large.'));
    });
    socket.on('end', () => {
      serial = serial.then(async () => {
        try { socket.end(JSON.stringify(await fixture(JSON.parse(input)))); }
        catch (error) { socket.end(JSON.stringify({ status: 1, error: String(error) })); }
      });
    });
  });
  async function shutdown() {
    if (closing) return;
    closing = true;
    server.close();
    await serial;
    await stop();
    await rm(path, { force: true });
  }
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => void shutdown().then(() => process.exit(0)));
  try {
    await rm(path, { force: true });
    server.listen(path);
    await once(server, 'listening');
    await chmod(path, 0o600);
    await start();
  } catch (error) {
    await shutdown();
    throw error;
  }
}
