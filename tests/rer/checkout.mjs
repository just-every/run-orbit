import {isolateBrowserTemp} from '../support/browser-temp.mjs';
isolateBrowserTemp();
import { execFile, spawn } from 'node:child_process';
import { constants } from 'node:fs';
import { copyFile, cp, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';

const source = resolve(import.meta.dirname, '../..');
const execute = promisify(execFile);

/** A fresh checkout of this source (tracked and new files, no local state) with its own installed dependencies. */
export async function freshCheckout() {
  const root = await mkdtemp(join(tmpdir(), 'orbit-rer-journey-'));
  const servers = await mkdtemp(join(tmpdir(), 'orbit-rer-servers-'));
  const { stdout } = await execute('git', ['ls-files', '-co', '--exclude-standard', '-z'], { cwd: source, maxBuffer: 64 * 1024 * 1024 });
  for (const path of stdout.split('\0').filter(Boolean)) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await copyFile(join(source, path), join(root, path)).catch((error) => { if (error.code !== 'ENOENT') throw error; });
  }
  // Anonymous dev pages cannot load Vite's /@fs imports through Base's private
  // file gate. Keep dependencies inside this checkout, preserving pnpm's relative
  // links. COPYFILE_FICLONE uses a filesystem clone when supported, otherwise a copy.
  await cp(await realpath(join(source, 'node_modules')), join(root, 'node_modules'), {
    recursive: true, verbatimSymlinks: true, mode: constants.COPYFILE_FICLONE,
  });
  // The verification caller's local operation belongs to the source checkout, not this copy.
  const env = { ...process.env, RER_SERVER_JOURNEY: '1', RER_SERVERS_DIR: servers, WRANGLER_SEND_METRICS: 'false' };
  delete env.RER_LOCAL_OPERATION; delete env.RER_ONBOARDING_PROCESS_OWNER; delete env.ORBIT_TEST_STATE;
  const rer = (args, options = {}) => new Promise((done) => {
    const child = spawn(process.execPath, ['node_modules/@runeditrun/rer/bin/rer.mjs', ...args], { cwd: root, env, stdio: [options.input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    if (options.input !== undefined) child.stdin.end(options.input);
    child.on('close', (code) => done({ code, output }));
  });
  const serve = (args) => {
    const child = spawn(process.execPath, ['node_modules/@runeditrun/rer/bin/rer.mjs', ...args], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '', becameReady = false;
    const ready = new Promise((done, fail) => {
      const read = (chunk) => { output += chunk; if ((args[0] === 'preview' ? /^RER_READY /m : /^RER_(SIGN_IN|OPEN) /m).test(output)) { becameReady = true; done(output); } };
      child.stdout.on('data', read); child.stderr.on('data', read);
      child.on('close', async (code) => { if (!becameReady) fail(await startupFailure(root, args[0], code, output)); });
    });
    return { child, ready, exited: new Promise((done) => child.on('close', (code) => done({ code, output }))) };
  };
  return { root, rer, serve, async close() { await rm(root, { recursive: true, force: true }); await rm(servers, { recursive: true, force: true }); } };
}

// Keep failure evidence outside the disposable checkout and any public proof
// tree. CLI output can contain private URLs; only this owner-only path is printed.
async function startupFailure(root, verb, code, output) {
  const message = `rer ${verb} exited ${code} before readiness`;
  let directory;
  try {
    directory = await mkdtemp(join(tmpdir(), 'orbit-rer-startup-failure-'));
    await writeFile(join(directory, 'command.log'), output, { mode: 0o600, flag: 'wx' });
    const installer = await readFile(join(root, '.seed/installer/install.log')).catch((error) => { if (error.code !== 'ENOENT') throw error; });
    if (installer) await writeFile(join(directory, 'installer.log'), installer, { mode: 0o600, flag: 'wx' });
    return new Error(`${message}; private diagnostics retained at ${directory}`);
  } catch {
    if (directory) await rm(directory, { recursive: true, force: true }).catch(() => {});
    return new Error(`${message}; private output withheld (diagnostic capture unavailable)`);
  }
}

export async function freePort() {
  const server = createServer();
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  const { port } = server.address();
  await new Promise((done) => server.close(done));
  return port;
}

export async function listening(port) {
  return new Promise((done) => {
    const socket = createServer();
    socket.once('error', () => done(true));
    socket.listen(port, '127.0.0.1', () => socket.close(() => done(false)));
  });
}
