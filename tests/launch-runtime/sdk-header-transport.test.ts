import assert from 'node:assert/strict';
import {request} from 'node:http';
import {test} from 'node:test';
import {sdkWorker} from '../support/sdk-worker-fixture';

test('actual Wrangler keeps native-sized headers and fields beyond Node default count on every hop', {timeout: 60000}, async () => {
  const worker = await sdkWorker(`export default {fetch(request) {
    if (new URL(request.url).pathname === '/health') return new Response('ok');
    const headers = new Headers({'X-Large': 'r'.repeat(20480),
      'X-Input-Bytes': String(request.headers.get('X-Large')?.length),
      'X-Input-Count': String([...request.headers.keys()].filter(name => name.startsWith('x-field-')).length),
      'X-Input-Last': request.headers.get('X-Field-2099') ?? 'missing'});
    for (let i=0;i<2100;i++) headers.set('X-Reply-'+i, String(i));
    return new Response('headers intact', {headers});
  }}`);
  try {
    await new Promise<void>((resolve, reject) => {
      const headers: Record<string, string> = {'X-Large': 'u'.repeat(20480)};
      for (let i = 0; i < 2100; i++) headers['X-Field-' + i] = String(i);
      const outgoing = request(worker.url, {headers, maxHeaderSize: 128 * 1024}, response => {
        const chunks: Buffer[] = []; response.on('data', chunk => chunks.push(chunk)); response.on('error', reject);
        response.on('end', () => {
          try {
            assert.equal(response.statusCode, 200); assert.equal(response.complete, true);
            assert.equal(response.headers['x-input-bytes'], '20480'); assert.equal(response.headers['x-input-last'], '2099');
            assert.equal(response.headers['x-input-count'], '2100');
            assert.equal(response.headers['x-large'], 'r'.repeat(20480)); assert.equal(response.headers['x-reply-2099'], '2099');
            assert.equal(Object.keys(response.headers).filter(name => name.startsWith('x-reply-')).length, 2100);
            assert.equal(Buffer.concat(chunks).toString(), 'headers intact'); resolve();
          } catch (error) {reject(error);}
        });
      });
      outgoing.maxHeadersCount = 0; outgoing.on('error', reject); outgoing.end();
    });
    assert.equal((await fetch(new URL('/health', worker.url))).status, 200);
  } finally {await worker.dispose();}
});
