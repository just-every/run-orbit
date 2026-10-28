// Opt-in preload for the installed CLI's own Node descendants. Record lifecycle
// and the one internal export-types request, never arguments, bindings or bodies.
import childProcess from 'node:child_process';
import {appendFileSync} from 'node:fs';
import {channel} from 'node:diagnostics_channel';
import {syncBuiltinESMExports} from 'node:module';
import {basename} from 'node:path';

const destination = process.env.ORBIT_STARTUP_TRACE;
if (destination) {
  const record = (event, fields = {}) => {
    try {
      appendFileSync(destination, JSON.stringify({time: new Date().toISOString(), pid: process.pid, ppid: process.ppid, event, ...fields}) + '\n', {mode: 0o600});
    } catch { /* Diagnostics cannot replace the original startup outcome. */ }
  };
  const errorCode = error => typeof error?.code === 'string' && /^[A-Z][A-Z0-9_]{1,39}$/.test(error.code) ? error.code : null;
  const signalName = signal => typeof signal === 'number' || /^SIG[A-Z0-9]+$/.test(signal ?? '') ? signal : null;
  record('node-start');
  process.once('exit', code => record('node-exit', {code}));

  const spawn = childProcess.spawn;
  childProcess.spawn = function(command, ...args) {
    const child = Reflect.apply(spawn, this, [command, ...args]);
    const name = typeof command === 'string' ? basename(command) : '';
    const kind = /^workerd(?:\.exe)?$/.test(name) ? 'workerd' : /^node(?:\.exe)?$/.test(name) ? 'node' : null;
    if (kind) {
      record('child-spawn', {child: child.pid ?? null, kind});
      child.once('exit', (code, signal) => record('child-exit', {child: child.pid ?? null, kind, code, signal: signalName(signal)}));
      const kill = child.kill;
      child.kill = function(signal = 'SIGTERM') {
        record('child-kill-request', {child: child.pid ?? null, kind, signal: signalName(signal)});
        return Reflect.apply(kill, this, [signal]);
      };
    }
    return child;
  };
  syncBuiltinESMExports();

  const exportTypes = request => request?.path === '/__vite_plugin_cloudflare_get_export_types__';
  channel('undici:request:create').subscribe(({request}) => {
    if (exportTypes(request)) record('export-types-request');
  });
  channel('undici:request:headers').subscribe(({request, response}) => {
    if (exportTypes(request)) record('export-types-response', {status: response.statusCode});
  });
  channel('undici:request:error').subscribe(({request, error}) => {
    if (!exportTypes(request)) return;
    const socket = error?.socket ?? error?.cause?.socket;
    record('export-types-error', {
      code: errorCode(error), causeCode: errorCode(error?.cause),
      remotePort: Number.isInteger(socket?.remotePort) ? socket.remotePort : null,
      bytesRead: Number.isInteger(socket?.bytesRead) ? socket.bytesRead : null,
      bytesWritten: Number.isInteger(socket?.bytesWritten) ? socket.bytesWritten : null,
    });
  });
}
