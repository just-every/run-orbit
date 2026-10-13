import assert from 'node:assert/strict';
import {request} from 'node:http';
import {createRequire} from 'node:module';
import {test} from 'node:test';
import {sdkWorker} from '../support/sdk-worker-fixture';

const require = createRequire(import.meta.url);
const {Miniflare, convertV4MiniflareOptions} = require(require.resolve('miniflare', {paths: [require.resolve('wrangler')]}));
const fields = ['Authorization', 'Content-Type', 'User-Agent', 'Referer', 'Origin', 'Cookie', 'Set-Cookie', 'X-Duplicate'];
const script = `export default {fetch(request) {
  if (new URL(request.url).pathname === '/health') return new Response('ok');
  const fields = ${JSON.stringify(fields)};
  const values = Object.fromEntries(fields.map(name => [name, request.headers.get(name)]));
  const headers = new Headers({'Content-Type': 'application/json'});
  headers.append('Set-Cookie', 'left=1; Path=/'); headers.append('Set-Cookie', 'right=2; Path=/');
  headers.append('X-Duplicate', 'first'); headers.append('X-Duplicate', 'second');
  return new Response(JSON.stringify(values), {headers});
}}`;

async function observe(url: URL) {
  return new Promise<{values: Record<string, string>; cookies: string[]; duplicate: string}>((resolve, reject) => {
    // The flat array emits separate wire fields, including Cookie. Passing an
    // object or arrays as its values would let the Node client join cookies.
    const headers = ['Host', url.host, 'Content-Length', '0'];
    for (const name of fields) headers.push(name, 'first=1', name.toLowerCase(), 'second=2');
    const outgoing = request(url, {method: 'POST', headers}, response => {
      const chunks: Buffer[] = [];
      response.on('data', chunk => chunks.push(chunk)); response.on('error', reject);
      response.on('end', () => {
        try {
          assert.equal(response.statusCode, 200); assert.equal(response.complete, true);
          resolve({values: JSON.parse(Buffer.concat(chunks).toString()), cookies: response.headers['set-cookie'] ?? [],
            duplicate: String(response.headers['x-duplicate'])});
        } catch (error) {reject(error);}
      });
    });
    outgoing.on('error', reject); outgoing.end();
  });
}

test('actual Wrangler retains native duplicate-header and cookie semantics across both Node hops', {timeout: 60000}, async () => {
  const native = new Miniflare(convertV4MiniflareOptions({host: '127.0.0.1', port: 0, modules: true, compatibilityDate: '2026-09-08', script}));
  let expected: Awaited<ReturnType<typeof observe>>;
  try {
    expected = await observe(await native.ready);
    assert.deepEqual(expected.values, Object.fromEntries(fields.map(name => [name, 'first=1, second=2'])));
    assert.deepEqual(expected.cookies, ['left=1; Path=/', 'right=2; Path=/']);
    assert.equal(expected.duplicate, 'first, second');
  } finally {await native.dispose();}
  const worker = await sdkWorker(script);
  try {
    assert.deepEqual(await observe(worker.url), expected);
    const health = await fetch(new URL('/health', worker.url));
    assert.equal(health.status, 200); assert.equal(await health.text(), 'ok');
  } finally {await worker.dispose();}
});
