import assert from 'node:assert/strict';
import {createServer, request} from 'node:http';
import {createServer as createSecureServer, get as secureGet} from 'node:https';
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';
import {test} from 'node:test';
import {availablePort} from '../support/available-port';
import {closeServer, customCertificate, defaultCertificate, serverOrigin, transportDirectory} from '../support/http-listener-fixture';

const require = createRequire(import.meta.url);
const listen = require(join(dirname(require.resolve('wrangler/package.json')), 'wrangler-dist/http-proxy-listener.cjs'));

test('SDK listener uses existing default TLS and honors a custom certificate', {timeout: 30000}, async () => {
  const fixture = await transportDirectory();
  try {
    const custom = await customCertificate(fixture.directory);
    for (const certificate of [await defaultCertificate(), custom]) {
      const upstream = createSecureServer(certificate, (_request, response) => response.end('TLS roundtrip'));
      const proxy = await listen(await serverOrigin(upstream, '127.0.0.1', true), {host: '127.0.0.1', secure: true, ...(certificate === custom ? {cert: certificate} : {})});
      try {
        assert.equal(proxy.url.protocol, 'https:');
        await new Promise<void>((resolve, reject) => {
          secureGet(proxy.url, {ca: certificate.cert}, response => {
            assert.equal(response.statusCode, 200);
            const chunks: Buffer[] = []; response.on('data', chunk => chunks.push(chunk)); response.on('error', reject);
            response.on('end', () => {assert.equal(Buffer.concat(chunks).toString(), 'TLS roundtrip'); resolve();});
          }).on('error', reject);
        });
      } finally { await proxy.dispose(); await closeServer(upstream); }
    }
  } finally { await fixture.dispose(); }
});

test('SDK listener preserves wildcard/IPv6 hosts and actual outer peer identity', {timeout: 15000}, async () => {
  const upstream = createServer((incoming, response) => response.end(incoming.headers['cf-connecting-ip']));
  const origin = await serverOrigin(upstream);
  try {
    for (const host of ['*', '0.0.0.0', '::', '::1']) {
      const proxy = await listen(origin, {host});
      try {
        const target = new URL(proxy.url), expected = host === '0.0.0.0' ? '127.0.0.1' : '::1';
        if (expected === '::1') target.hostname = '[::1]';
        const result = await new Promise<string>((resolve, reject) => {
          const outgoing = request(target, response => {
            const chunks: Buffer[] = []; response.on('data', chunk => chunks.push(chunk)); response.on('error', reject);
            response.on('end', () => resolve(Buffer.concat(chunks).toString()));
          }); outgoing.on('error', reject); outgoing.end();
        });
        assert.equal(result.replace(/^::ffff:/, ''), expected);
      } finally { await proxy.dispose(); }
    }
  } finally { await closeServer(upstream); }
});

test('SDK listener releases failed and aborted startup ports', {timeout: 10000}, async () => {
  const upstream = createServer((_request, response) => response.end());
  const origin = await serverOrigin(upstream), port = await availablePort();
  try {
    await assert.rejects(listen(origin, {host: 'invalid:host', port}));
    const controller = new AbortController();
    const opening = listen(origin, {host: '::1', port, signal: controller.signal});
    controller.abort(); await assert.rejects(opening);
    const replacement = await listen(origin, {host: '::1', port});
    await replacement.dispose();
  } finally { await closeServer(upstream); }
});

test('SDK listener forwards HTTP request and response trailers', {timeout: 10000}, async () => {
  const upstream = createServer((incoming, response) => {
    incoming.resume(); incoming.on('end', () => {
      assert.equal(incoming.trailers['x-upload-finished'], 'yes');
      response.writeHead(200, {Trailer: 'X-Response-Finished'});
      response.write('complete'); response.addTrailers({'X-Response-Finished': 'yes'}); response.end();
    });
  });
  const proxy = await listen(await serverOrigin(upstream), {host: '127.0.0.1'});
  try {
    await new Promise<void>((resolve, reject) => {
      const outgoing = request(proxy.url, {method: 'POST', headers: {Trailer: 'X-Upload-Finished'}}, response => {
        response.resume(); response.on('error', reject);
        response.on('end', () => {assert.equal(response.trailers['x-response-finished'], 'yes'); assert.equal(response.complete, true); resolve();});
      });
      outgoing.on('error', reject); outgoing.write('upload'); outgoing.addTrailers({'X-Upload-Finished': 'yes'}); outgoing.end();
    });
  } finally { await proxy.dispose(); await closeServer(upstream); }
});

test('SDK listener preserves HEAD, 204 and 304 response framing', {timeout: 10000}, async () => {
  const upstream = createServer((incoming, response) => {
    response.writeHead(Number(incoming.url!.slice(1)), {'Content-Length': '123'}); response.end();
  });
  const proxy = await listen(await serverOrigin(upstream), {host: '127.0.0.1'});
  try {
    for (const [method, status] of [['HEAD', 200], ['GET', 204], ['GET', 304]] as const) {
      await new Promise<void>((resolve, reject) => {
        const outgoing = request(new URL('/' + status, proxy.url), {method}, response => {
          let bytes = 0; response.on('data', chunk => {bytes += chunk.length;}); response.on('error', reject);
          response.on('end', () => {assert.equal(response.statusCode, status); assert.equal(bytes, 0); assert.equal(response.complete, true); resolve();});
        }); outgoing.on('error', reject); outgoing.end();
      });
    }
  } finally { await proxy.dispose(); await closeServer(upstream); }
});
