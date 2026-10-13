import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {once} from 'node:events';
import {createServer, request, type Server} from 'node:http';
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';
import {test} from 'node:test';

const require = createRequire(import.meta.url);
const wrangler = dirname(require.resolve('wrangler/package.json'));
const listen = require(join(wrangler, 'wrangler-dist/http-proxy-listener.cjs'));
const {WebSocketServer} = require(require.resolve('ws', {paths: [wrangler]}));

async function origin(server: Server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return new URL(`http://127.0.0.1:${address.port}`);
}

async function close(server: Server) {
  const closed = new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  server.closeAllConnections();
  await closed;
}

test('SDK HTTP proxy preserves full duplex, exact bytes, raw targets and response headers', {timeout: 10000}, async () => {
  const payload = Buffer.alloc(524288, 193);
  const digest = createHash('sha256').update(payload).digest('hex');
  const target = '/%61pi/%2572elay//tail?literal=%2F';
  const upstream = createServer((incoming, response) => {
    assert.equal(incoming.url, target);
    assert.equal(incoming.headers['mf-cf-blob'], '{"clientAcceptEncoding":"identity"}');
    response.writeHead(207, {'Content-Type': 'text/plain', 'Set-Cookie': ['first=1', 'second=2']});
    response.write('ready\n');
    const hash = createHash('sha256');
    incoming.on('data', chunk => hash.update(chunk));
    incoming.on('end', () => response.end(hash.digest('hex')));
  });
  const proxy = await listen(await origin(upstream), {host: '127.0.0.1', port: 0});
  try {
    await new Promise<void>((resolve, reject) => {
      const outgoing = request(new URL(target, proxy.url), {method: 'POST', headers: {'MF-CF-Blob': '{"clientAcceptEncoding":"identity"}'}}, response => {
        assert.equal(response.statusCode, 207);
        assert.deepEqual(response.headers['set-cookie'], ['first=1', 'second=2']);
        const parts: Buffer[] = [];
        response.once('data', () => outgoing.end(payload.subarray(1)));
        response.on('data', chunk => parts.push(chunk));
        response.on('error', reject);
        response.on('end', () => {
          assert.equal(response.complete, true);
          assert.equal(Buffer.concat(parts).toString(), `ready\n${digest}`);
          resolve();
        });
      });
      outgoing.on('error', reject);
      outgoing.write(payload.subarray(0, 1));
    });
  } finally { await proxy.dispose(); await close(upstream); }
});

test('SDK HTTP proxy retains WebSocket upgrade handling', {timeout: 10000}, async () => {
  const upstream = createServer();
  const sockets = new WebSocketServer({server: upstream});
  sockets.on('connection', (socket: {on(event: string, callback: (data: Buffer) => void): void; send(data: Buffer): void}) => socket.on('message', data => socket.send(data)));
  const proxy = await listen(await origin(upstream), {host: '127.0.0.1', port: 0});
  const url = new URL('/socket?escaped=%2F', proxy.url); url.protocol = 'ws:';
  const client = new WebSocket(url);
  try {
    const opened = new Promise<void>((resolve, reject) => {
      client.addEventListener('open', () => resolve(), {once: true});
      client.addEventListener('error', reject, {once: true});
    });
    await opened;
    const message = new Promise<MessageEvent>(resolve => client.addEventListener('message', resolve, {once: true}));
    client.send('exact UTF-8 café ☃');
    assert.equal(await (await message).data.text(), 'exact UTF-8 café ☃');
  } finally {
    client.close();
    await proxy.dispose();
    for (const socket of sockets.clients) socket.terminate();
    await new Promise<void>(resolve => sockets.close(resolve));
    await close(upstream);
  }
});

test('SDK HTTP proxy reports a truncated upstream response as a transport failure', {timeout: 10000}, async () => {
  const upstream = createServer((_request, response) => {
    response.writeHead(503, {'Content-Length': '100'});
    response.write('incomplete');
    setTimeout(() => response.destroy(), 10);
  });
  const proxy = await listen(await origin(upstream), {host: '127.0.0.1', port: 0});
  try {
    await assert.rejects(async () => {
      const response = await fetch(proxy.url);
      assert.equal(response.status, 503);
      await response.arrayBuffer();
    });
  } finally { await proxy.dispose(); await close(upstream); }
});
