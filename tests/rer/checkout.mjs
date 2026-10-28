import {isolateBrowserTemp} from '../support/browser-temp.mjs';
isolateBrowserTemp();
import { execFile, spawn } from 'node:child_process';
import { constants } from 'node:fs';
import { copyFile, cp, mkdir, mkdtemp, readFile, readdir, realpath, rm, statfs, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { release, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';

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
  let testPort;
  const rer = (args, options = {}) => new Promise((done) => {
    if (args[0] === 'setup' && args.includes('--port')) testPort = Number(args[args.indexOf('--port') + 1]);
    const child = spawn(process.execPath, ['node_modules/@runeditrun/rer/bin/rer.mjs', ...args], { cwd: root, env: { ...env, ...options.env }, stdio: [options.input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    if (options.input !== undefined) child.stdin.end(options.input);
    child.on('close', (code) => done({ code, output }));
  });
  const ownedServers=new Map();
  const stop=async(verb)=>{const server=ownedServers.get(verb);if(!server)return {code:0,output:''};if(server.child.exitCode===null&&server.child.signalCode===null)server.child.kill('SIGTERM');const result=await server.exited;ownedServers.delete(verb);return result;};
  const serve = async (args) => {
    let trace;
    const serveEnv = {...env};
    if (process.env.ORBIT_STARTUP_DIAGNOSTICS) {
      trace = join(servers, `${args[0]}-startup.jsonl`);
      await writeFile(trace, '', {mode: 0o600});
      serveEnv.ORBIT_STARTUP_TRACE = trace;
      const preload = pathToFileURL(join(root, 'tests/rer/startup-trace.mjs')).href;
      serveEnv.NODE_OPTIONS = `${env.NODE_OPTIONS ?? ''} --import=${preload}`.trim();
    }
    const child = spawn(process.execPath, ['node_modules/@runeditrun/rer/bin/rer.mjs', ...args], { cwd: root, env: serveEnv, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '', becameReady = false;
    const ready = new Promise((done, fail) => {
      const read = (chunk) => { output += chunk; if ((args[0] === 'preview' ? /^RER_READY /m : /^RER_(SIGN_IN|OPEN) /m).test(output)) { becameReady = true; done(output); } };
      child.stdout.on('data', read); child.stderr.on('data', read);
      child.on('close', async (code, signal) => { if (!becameReady) fail(await startupFailure(root, args[0], code, output, testPort, {trace, pid: child.pid, signal})); });
    });
    const server={ child, ready, exited: new Promise((done) => child.on('close', (code) => done({ code, output }))) };ownedServers.set(args[0],server);return server;
  };
  return { root, rer, serve, stop, async close() { for(const verb of [...ownedServers.keys()])await stop(verb); await rm(root, { recursive: true, force: true }); await rm(servers, { recursive: true, force: true }); } };
}

// Public failure evidence must never retain a sign-in link or credential.
function redactStartupDiagnostics(value) {
  return String(value)
    .replace(/^.*(?:\bCookie\b|\bAuthorization\b|\bBearer\b|RER_(?:OPEN|SIGN_IN)\s+https?:).*$/gmi, '[redacted]')
    .replace(/https?:\/\/[^\s<>"'`]+/gi, value => {
      try { const url = new URL(value); url.search = ''; url.hash = ''; url.username = ''; url.password = ''; return url.href; }
      catch { return '[redacted]'; }
    })
    .replace(/rer-dev=[^\s;"']*/gi, '[redacted]')
    .replace(/[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})/gi, (value, domain) => domain.endsWith('.test') ? value : '[redacted]')
    .replace(/[A-Za-z0-9_-]{24,}/g, '[redacted]')
    .replace(/[?#]/g, '');
}

// Keep the original owner-only copy outside the disposable checkout. Public
// diagnostics are a separate, redacted copy outside the shard's temporary tree.
async function startupFailure(root, verb, code, output, testPort, lifecycle) {
  const message = `rer ${verb} exited ${code} before readiness`;
  const lastLine = redactStartupDiagnostics(output.trim().split(/\r?\n/).filter(line => line.trim()).at(-1) ?? '').slice(0, 300);
  const refusal = output.split(/\r?\n/).find(line => /Server startup requires|Not started:|cannot be used/i.test(line));
  const suffix = ` · rer: ${lastLine}${refusal ? ` · refusal: ${redactStartupDiagnostics(refusal).slice(0, 300)}` : ''}`;
  if (process.env.ORBIT_STARTUP_DIAGNOSTICS) {
    let publicDirectory;
    try {
      const installerRoot = join(root, '.seed/installer');
      const logs = [join(installerRoot, 'install.log'), ...(await readdir(installerRoot).catch(() => []))
        .filter(name => /^commands-\d+$/.test(name)).sort().map(name => join(installerRoot, name, 'install.log'))];
      const installer = (await Promise.all(logs.map(path => readFile(path, 'utf8').catch(error => { if (error.code !== 'ENOENT') throw error; return ''; })))).join('\n');
      const filesystem = async path => {
        const state = await statfs(path, { bigint: true });
        return { path, realpath: await realpath(path), type: String(state.type), sizeBytes: String(state.blocks * state.bsize), freeBytes: String(state.bavail * state.bsize) };
      };
      const rer = JSON.parse(await readFile(join(root, 'node_modules/@runeditrun/rer/package.json'), 'utf8'));
      const ports = text => [...new Set([...text.matchAll(/(?:--port(?:=|\s+)|\bport\s+|https?:\/\/[^\s/:]+:)(\d{1,5})\b/gi)].map(match => Number(match[1])))];
      const meta = { verb, exitCode: code, testPort: testPort ?? ports(installer)[0] ?? null, outputPorts: ports(output),
        pid: lifecycle.pid, signal: lifecycle.signal,
        inheritedEnv: Object.fromEntries(['NODE_OPTIONS', 'NODE_PATH', 'NODE_ENV', 'HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY', 'MINIFLARE_REGISTRY_PATH', 'RER_STATE_DIR', 'RER_DEV_ORIGIN', 'RER_DEV_KEY', 'RER_SETUP_TOKEN', 'VSCODE_INSPECTOR_OPTIONS'].map(name => [name, Object.hasOwn(process.env, name)])),
        nodeVersion: process.version, rerVersion: rer.version, osRelease: release(),
        imageOS: process.env.ImageOS ?? null, imageVersion: process.env.ImageVersion ?? null, tmpdir: tmpdir(),
        filesystems: { checkout: await filesystem(root), temporary: await filesystem(tmpdir()), repository: await filesystem(source) } };
      await mkdir(process.env.ORBIT_STARTUP_DIAGNOSTICS, { recursive: true });
      publicDirectory = await mkdtemp(join(process.env.ORBIT_STARTUP_DIAGNOSTICS, 'failure-'));
      await writeFile(join(publicDirectory, 'command.log'), redactStartupDiagnostics(output));
      await writeFile(join(publicDirectory, 'installer.log'), redactStartupDiagnostics(installer));
      if (lifecycle.trace) await writeFile(join(publicDirectory, 'lifecycle.jsonl'), redactStartupDiagnostics(await readFile(lifecycle.trace, 'utf8')));
      await writeFile(join(publicDirectory, 'meta.json'), redactStartupDiagnostics(JSON.stringify(meta, null, 2)) + '\n');
    } catch {
      if (publicDirectory) await rm(publicDirectory, { recursive: true, force: true }).catch(() => {});
    }
  }
  let directory;
  try {
    directory = await mkdtemp(join(tmpdir(), 'orbit-rer-startup-failure-'));
    await writeFile(join(directory, 'command.log'), output, { mode: 0o600, flag: 'wx' });
    const installer = await readFile(join(root, '.seed/installer/install.log')).catch((error) => { if (error.code !== 'ENOENT') throw error; });
    if (installer) await writeFile(join(directory, 'installer.log'), installer, { mode: 0o600, flag: 'wx' });
    return new Error(`${message}; private diagnostics retained at ${directory}${suffix}`);
  } catch {
    if (directory) await rm(directory, { recursive: true, force: true }).catch(() => {});
    return new Error(`${message}; private output withheld (diagnostic capture unavailable)${suffix}`);
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
