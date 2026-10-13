import assert from 'node:assert/strict';
import {createServer, request, type IncomingMessage, type ServerResponse} from 'node:http';
import {connect, type NetConnectOpts, type Socket} from 'node:net';
import {setTimeout as delay, setImmediate as nextTurn} from 'node:timers/promises';
import {test} from 'node:test';
import {closeServer, serverOrigin} from '../support/http-listener-fixture';
import {createHttpTransport, deferred, uploadCloseFixture, uploadWriteFault} from '../support/upload-close-fixture';

test('SDK settles every queued writev callback with its original error after the real response completes', {timeout: 7000}, async () => {
  const fixture = await uploadCloseFixture(true);
  try {
    assert.ok(await fixture.failUpload(['first', 'second', 'third']) >= 3, 'Exercise an actual batched socket write');
    assert.equal(fixture.stopped, 1);
    assert.deepEqual(fixture.callbacks, []);
    fixture.response.writeHead(409, {'Content-Length': '13'}).end('real response');
    assert.deepEqual(await fixture.outcome, {value: {status: 409, body: 'real response'}});
    await fixture.closed;
    assert.equal(fixture.complete, true);
    assert.deepEqual(fixture.callbacks, [fixture.failure, fixture.failure, fixture.failure]);
  } finally {await fixture.dispose();}
});

test('SDK retains post-header streaming beyond the pre-header deadline after an upload EPIPE', {timeout: 7000}, async () => {
  const fixture = await uploadCloseFixture();
  try {
    fixture.response.writeHead(207, {'Content-Type': 'text/plain'}).write('ready');
    await fixture.headers;
    await fixture.failUpload();
    assert.equal(fixture.stopped, 1);
    await delay(2100);
    assert.deepEqual(fixture.callbacks, []);
    assert.equal(fixture.outgoing.destroyed, false);
    fixture.response.end('done');
    assert.deepEqual(await fixture.outcome, {value: {status: 207, body: 'readydone'}});
    await fixture.closed;
    assert.equal(fixture.complete, true);
    assert.deepEqual(fixture.callbacks, [fixture.failure]);
  } finally {await fixture.dispose();}
});

test('SDK preserves a genuine post-header truncation while an upload write is held', {timeout: 7000}, async () => {
  const fixture = await uploadCloseFixture();
  try {
    fixture.response.writeHead(409, {'Content-Length': '100'}).write('partial');
    await fixture.headers;
    await fixture.failUpload();
    assert.deepEqual(fixture.callbacks, []);
    fixture.response.destroy();
    assert.ok('error' in await fixture.outcome);
    await fixture.closed;
    assert.equal(fixture.complete, false);
    assert.deepEqual(fixture.callbacks, [fixture.failure]);
  } finally {await fixture.dispose();}
});

test('SDK caller cancellation closes a held post-header upload and settles its failed write', {timeout: 7000}, async () => {
  const fixture = await uploadCloseFixture();
  try {
    fixture.response.writeHead(207).write('unfinished');
    await fixture.headers;
    await fixture.failUpload();
    assert.deepEqual(fixture.callbacks, []);
    const cancellation = new Error('Caller cancelled request');
    fixture.outgoing.destroy(cancellation);
    const outcome = await fixture.outcome;
    assert.ok('error' in outcome);
    assert.equal(outcome.error, cancellation);
    await fixture.closed;
    assert.equal(fixture.complete, false);
    assert.deepEqual(fixture.callbacks, [fixture.failure]);
  } finally {await fixture.dispose();}
});

test('SDK transport disposal closes both actual socket owners during a held post-header upload', {timeout: 7000}, async () => {
  const received = deferred<{request: IncomingMessage; response: ServerResponse}>();
  const publicHeaders = deferred<void>();
  const upstream = createServer((request, response) => received.resolve({request, response}));
  const target = await serverOrigin(upstream);
  const transport = createHttpTransport();
  let fault!: ReturnType<typeof uploadWriteFault>;
  let uploadSocket!: Socket, publicSocket!: Socket;
  const proxy = createServer((incoming, response) => {
    publicSocket = incoming.socket;
    transport.forward(incoming, response, target, {agent: undefined, createConnection(options: NetConnectOpts) {
      uploadSocket = connect(options);
      fault = uploadWriteFault(uploadSocket);
      return uploadSocket;
    }});
  });
  const outgoing = request(await serverOrigin(proxy), {method: 'POST', agent: false});
  const clientClosed = new Promise<void>(resolve => outgoing.once('close', resolve));
  let responseComplete = false;
  const outcome = new Promise<void>((resolve, reject) => {
    outgoing.on('error', reject);
    outgoing.on('response', incoming => {
      incoming.resume(); publicHeaders.resolve();
      incoming.on('error', reject);
      incoming.on('end', () => {responseComplete = incoming.complete; resolve();});
    });
  }).then(() => ({complete: true}), error => ({error}));
  outgoing.flushHeaders();
  try {
    const native = await received.promise;
    native.response.writeHead(207).write('unfinished');
    await publicHeaders.promise;
    const uploadClosed = new Promise<void>(resolve => uploadSocket.once('close', resolve));
    const publicClosed = new Promise<void>(resolve => publicSocket.once('close', resolve));
    const upstreamClosed = new Promise<void>(resolve => native.request.socket.once('close', resolve));
    fault.arm(); outgoing.write('upload bytes');
    assert.equal(await fault.hit, 1);
    await nextTurn();
    assert.equal(uploadSocket.destroyed, false);
    assert.equal(publicSocket.destroyed, false);
    await transport.dispose();
    await Promise.all([uploadClosed, publicClosed, upstreamClosed, clientClosed]);
    assert.ok('error' in await outcome);
    assert.equal(responseComplete, false);
    assert.equal(uploadSocket.destroyed, true);
    assert.equal(publicSocket.destroyed, true);
  } finally {
    outgoing.destroy(); await transport.dispose();
    await closeServer(proxy); await closeServer(upstream);
  }
});
