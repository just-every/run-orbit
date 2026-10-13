import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createServer, request, type ClientRequest, type IncomingMessage, type ServerResponse} from 'node:http';
import {createServer as createSecureServer, request as secureRequest} from 'node:https';
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';
import type {Socket} from 'node:net';
import {test} from 'node:test';
import {closeServer, customCertificate, serverOrigin, transportDirectory} from '../support/http-listener-fixture';

const require = createRequire(import.meta.url);
const {preserveResponseAfterUploadClose} = require(join(dirname(require.resolve('wrangler/package.json')), 'wrangler-dist/http-upload-socket.cjs'));
type Outcome = 'complete' | 'truncated' | 'reset' | 'silent' | 'other-write-error';

/** Inject only a socket write failure; response status, bytes and framing use real TCP/TLS. */
async function exercise(outcome: Outcome, secure = false) {
  const directory = await transportDirectory();
  const certificate = secure ? await customCertificate(directory.directory) : undefined;
  let receive!: (response: ServerResponse) => void;
  const received = new Promise<ServerResponse>(resolve => {receive = resolve;});
  const handler = (_incoming: IncomingMessage, response: ServerResponse) => receive(response);
  const server = certificate ? createSecureServer(certificate, handler) : createServer(handler);
  const target = await serverOrigin(server, '127.0.0.1', secure);
  let outgoing: ClientRequest | undefined, stopped = 0, armed = false, acknowledged = false;
  let writeError: Error | null | undefined, responseComplete = false;
  const injected = Object.assign(new Error('Injected write failure'), {code: outcome === 'other-write-error' ? 'EIO' : 'EPIPE', syscall: 'write'});
  try {
    const result = new Promise<{status: number; body: string}>((resolve, reject) => {
      outgoing = (secure ? secureRequest : request)(target, {method: 'POST', agent: false, ...(certificate ? {ca: certificate.cert} : {})}, incoming => {
        const bytes: Buffer[] = [];
        incoming.on('data', chunk => bytes.push(chunk));
        incoming.on('error', reject);
        incoming.on('end', () => {
          responseComplete = incoming.complete;
          resolve({status: incoming.statusCode!, body: Buffer.concat(bytes).toString()});
        });
      });
      outgoing.on('error', error => {if (!responseComplete) reject(error);});
      outgoing.once('socket', socket => {
        for (const method of ['_write', '_writev'] as const) {
          const original = socket[method];
          socket[method] = function (...args: unknown[]) {
            if (armed) {
              armed = false;
              const callback = args.at(-1) as (error: Error) => void;
              queueMicrotask(() => callback(injected));
              return;
            }
            return Reflect.apply(original, this, args);
          } as Socket[typeof method];
        }
      });
      preserveResponseAfterUploadClose(outgoing, () => {stopped++;});
      outgoing.flushHeaders();
    });
    // Attach rejection handling before deliberately provoking the transport error.
    const settled = result.then(value => ({value}), error => ({error}));
    const response = await received;
    const closed = new Promise<void>(resolve => outgoing!.once('close', resolve));
    armed = true;
    outgoing!.write('rejected upload bytes', error => {acknowledged = true; writeError = error;});
    await new Promise(resolve => setTimeout(resolve, 20));
    if (outcome !== 'other-write-error') {
      assert.equal(stopped, 1);
      assert.equal(acknowledged, false, 'A rejected socket write must remain pending until its response resolves or fails');
    }
    if (outcome === 'complete') response.writeHead(409, {'Content-Length': '13'}).end('real response');
    else if (outcome === 'truncated') {
      response.writeHead(409, {'Content-Length': '100'}); response.write('partial');
      setTimeout(() => response.destroy(), 20);
    } else if (outcome === 'reset' || outcome === 'other-write-error') response.destroy();
    const observed = await settled;
    await closed;
    assert.equal(acknowledged, true);
    assert.equal(writeError, injected, 'The failed write retains its original error');
    if (outcome === 'complete') {
      assert.deepEqual(observed, {value: {status: 409, body: 'real response'}});
      assert.equal(responseComplete, true);
    } else {
      assert.ok('error' in observed, 'A missing or truncated response remains a failure');
      assert.equal(responseComplete, false);
    }
  } finally {outgoing?.destroy(); await closeServer(server); await directory.dispose();}
}

for (const secure of [false, true]) {
  test(`SDK retains a real complete ${secure ? 'HTTPS' : 'HTTP'} response after upload write EPIPE`, {timeout: 10000}, () => exercise('complete', secure));
}
for (const outcome of ['truncated', 'reset', 'silent', 'other-write-error'] as const) {
  test(`SDK reports ${outcome} after an upload write failure`, {timeout: 7000}, () => exercise(outcome));
}
