import assert from 'node:assert/strict';
import {createServer, request} from 'node:http';
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';
import {test} from 'node:test';
import {closeServer, serverOrigin} from '../support/http-listener-fixture';

const require = createRequire(import.meta.url);
const listen = require(join(dirname(require.resolve('wrangler/package.json')), 'wrangler-dist/http-proxy-listener.cjs'));
const pairs = ['Authorization', 'first', 'authorization', 'second', 'Content-Type', 'first/type',
  'content-type', 'second/type', 'Cookie', 'left=1', 'cookie', 'right=2'];
const names = new Set(pairs.filter((_field, i) => i % 2 === 0).map(name => name.toLowerCase()));

function selected(raw: string[]) {
  const result: string[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    if (names.has(raw[i].toLowerCase())) result.push(raw[i], raw[i + 1]);
  }
  return result;
}

test('SDK bridge preserves repeated wire fields without Node discard or cookie coalescing', {timeout: 10000}, async () => {
  let received: string[] | undefined;
  const upstream = createServer((incoming, response) => {
    received = selected(incoming.rawHeaders);
    response.writeHead(202, [...pairs, 'Set-Cookie', 'first=1', 'Set-Cookie', 'second=2']);
    response.end('complete');
  });
  const proxy = await listen(await serverOrigin(upstream), {host: '127.0.0.1'});
  try {
    await new Promise<void>((resolve, reject) => {
      const outgoing = request(proxy.url, {headers: ['Host', proxy.url.host, ...pairs]}, response => {
        const chunks: Buffer[] = [];
        response.on('data', chunk => chunks.push(chunk)); response.on('error', reject);
        response.on('end', () => {
          try {
            assert.equal(response.statusCode, 202); assert.equal(response.complete, true);
            assert.deepEqual(received, pairs);
            // Header name casing may be normalized by ServerResponse; repeated
            // fields, values and their order must survive in both directions.
            assert.deepEqual(selected(response.rawHeaders).map((v, i) => i % 2 ? v : v.toLowerCase()),
              pairs.map((v, i) => i % 2 ? v : v.toLowerCase()));
            assert.deepEqual(response.headers['set-cookie'], ['first=1', 'second=2']);
            assert.equal(Buffer.concat(chunks).toString(), 'complete'); resolve();
          } catch (error) {reject(error);}
        });
      });
      outgoing.on('error', reject); outgoing.end();
    });
  } finally {await proxy.dispose(); await closeServer(upstream);}
});

test('SDK bridge retains separate repeated trailer fields in both directions', {timeout: 10000}, async () => {
  const trailers: [string, string][] = [['X-Proof', 'first,quoted'], ['x-proof', 'second']];
  let received: string[] | undefined;
  const upstream = createServer((incoming, response) => {
    incoming.resume();
    incoming.on('end', () => {
      received = incoming.rawTrailers;
      response.writeHead(200, {Trailer: 'X-Proof'});
      response.write('complete'); response.addTrailers(trailers); response.end();
    });
  });
  const proxy = await listen(await serverOrigin(upstream), {host: '127.0.0.1'});
  try {
    await new Promise<void>((resolve, reject) => {
      const outgoing = request(proxy.url, {method: 'POST', headers: {Trailer: 'X-Proof'}}, response => {
        response.resume(); response.on('error', reject);
        response.on('end', () => {
          try {
            assert.equal(response.statusCode, 200); assert.equal(response.complete, true);
            assert.deepEqual(received, trailers.flat());
            assert.deepEqual(response.rawTrailers, trailers.flat()); resolve();
          } catch (error) {reject(error);}
        });
      });
      outgoing.on('error', reject); outgoing.write('upload'); outgoing.addTrailers(trailers); outgoing.end();
    });
  } finally {await proxy.dispose(); await closeServer(upstream);}
});
