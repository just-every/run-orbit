import {setImmediate as nextTurn} from 'node:timers/promises';
import {createServer, request, type IncomingMessage, type ServerResponse} from 'node:http';
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';
import type {Socket} from 'node:net';
import {closeServer, serverOrigin} from './http-listener-fixture';

const require = createRequire(import.meta.url);
const wrangler = dirname(require.resolve('wrangler/package.json'));
export const {preserveResponseAfterUploadClose, createHttpTransport} = {
  ...require(join(wrangler, 'wrangler-dist/http-upload-socket.cjs')),
  ...require(join(wrangler, 'wrangler-dist/http-transport.cjs')),
};

export function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {resolve = done;});
  return {promise, resolve};
}

/** Fault only the socket's upload callback; the HTTP parser reads real TCP bytes. */
export function uploadWriteFault(socket: Socket, vector = false) {
  const failure = Object.assign(new Error('Controlled upload write failure'), {code: 'EPIPE', syscall: 'write'});
  const hit = deferred<number>();
  let armed = false;
  for (const method of vector ? ['_writev'] as const : ['_write', '_writev'] as const) {
    const original = socket[method];
    socket[method] = function (...args: unknown[]) {
      if (!armed) return Reflect.apply(original, this, args);
      armed = false;
      const callback = args.at(-1) as (error: Error) => void;
      queueMicrotask(() => {callback(failure); hit.resolve(vector ? (args[0] as unknown[]).length : 1);});
    } as Socket[typeof method];
  }
  return {failure, hit: hit.promise, arm() {armed = true;}};
}

export async function uploadCloseFixture(vector = false) {
  const received = deferred<ServerResponse>();
  const headers = deferred<IncomingMessage>();
  const server = createServer((_request, response) => received.resolve(response));
  const target = await serverOrigin(server);
  const outgoing = request(target, {method: 'POST', agent: false});
  const closed = new Promise<void>(resolve => outgoing.once('close', resolve));
  let complete = false, stopped = 0;
  let fault!: ReturnType<typeof uploadWriteFault>;
  let socket!: Socket;
  outgoing.once('socket', connected => {socket = connected; fault = uploadWriteFault(socket, vector);});
  preserveResponseAfterUploadClose(outgoing, () => {stopped++;});
  const outcome = new Promise<{status: number; body: string}>((resolve, reject) => {
    outgoing.on('error', error => {if (!complete) reject(error);});
    outgoing.on('response', incoming => {
      headers.resolve(incoming);
      const bytes: Buffer[] = [];
      incoming.on('data', chunk => bytes.push(chunk));
      incoming.on('error', reject);
      incoming.on('end', () => {
        complete = incoming.complete;
        resolve({status: incoming.statusCode!, body: Buffer.concat(bytes).toString()});
      });
    });
  }).then(value => ({value}), error => ({error}));
  outgoing.flushHeaders();
  const response = await received.promise;
  const callbacks: (Error | null | undefined)[] = [];
  return {
    outgoing, response, headers: headers.promise, closed, outcome, callbacks,
    get complete() {return complete;}, get stopped() {return stopped;}, get failure() {return fault.failure;},
    async failUpload(chunks = ['rejected bytes']) {
      fault.arm();
      if (vector) socket.cork();
      for (const chunk of chunks) outgoing.write(chunk, error => callbacks.push(error));
      if (vector) socket.uncork();
      const entries = await fault.hit;
      await nextTurn();
      return entries;
    },
    async dispose() {outgoing.destroy(); await closeServer(server); await closed;},
  };
}
