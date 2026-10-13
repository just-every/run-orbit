import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {request} from 'node:http';
import {createRequire} from 'node:module';
import {test} from 'node:test';

const require = createRequire(import.meta.url);
const {Miniflare, convertV4MiniflareOptions} = require(require.resolve('miniflare', {paths: [require.resolve('wrangler')]}));

test('native Miniflare entry preserves incoming GET/HEAD methods and exact wire bodies', {timeout: 30000}, async () => {
  const worker = new Miniflare(convertV4MiniflareOptions({host: '127.0.0.1', port: 0, modules: true, compatibilityDate: '2026-09-08',
    script: `export default {async fetch(request) {
      const body = await request.arrayBuffer();
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', body)), b => b.toString(16).padStart(2,'0')).join('');
      return new Response(null, {headers: {'X-Method': request.method, 'X-Bytes': String(body.byteLength), 'X-Hash': hash}});
    }}`}));
  const body = Buffer.from(' whitespace\r\n café ☃\0end '), hash = createHash('sha256').update(body).digest('hex');
  try {
    // Exercise the actual native entry used before dispatch. Fetch constructors
    // cannot manufacture these requests, so send their framing over real HTTP.
    const url = await worker.ready;
    for (const method of ['GET', 'HEAD']) {
      await new Promise<void>((resolve, reject) => {
        const outgoing = request(url, {method, headers: {'Content-Length': String(body.length)}}, response => {
          response.resume(); response.on('error', reject);
          response.on('end', () => {
            try {
              assert.equal(response.statusCode, 200); assert.equal(response.complete, true);
              assert.equal(response.headers['x-method'], method); assert.equal(response.headers['x-bytes'], String(body.length));
              assert.equal(response.headers['x-hash'], hash); resolve();
            } catch (error) {reject(error);}
          });
        });
        outgoing.on('error', reject); outgoing.write(body.subarray(0, 13)); outgoing.end(body.subarray(13));
      });
    }
  } finally {await worker.dispose();}
});
