import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {get} from 'node:https';
import {writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {test} from 'node:test';
import {availablePort} from '../support/available-port';
import {closeServer, customCertificate, defaultCertificate, transportDirectory} from '../support/http-listener-fixture';

const require = createRequire(import.meta.url);
const {unstable_DevEnv} = require('wrangler');

async function configuration(directory: string) {
  const script = join(directory, 'worker.mjs'), config = join(directory, 'wrangler.json');
  await writeFile(script, `export default {fetch(request) {return Response.json({peer:request.headers.get('CF-Connecting-IP'),transport:request.headers.get('MF-Transport-URL')})}}`, {mode: 0o600});
  await writeFile(config, JSON.stringify({name: 'sdk-transport-' + crypto.randomUUID(), main: script, compatibility_date: '2026-09-08', no_bundle: true}), {mode: 0o600});
  await writeFile(join(directory, '.dev.vars'), '', {mode: 0o600});
  return config;
}

async function secureProbe(url: URL, ca: string, headers: Record<string, string> = {}) {
  return new Promise<{peer: string; transport: string | null}>((resolve, reject) => {
    get(url, {ca, headers}, response => {
      assert.equal(response.statusCode, 200);
      const chunks: Buffer[] = []; response.on('data', chunk => chunks.push(chunk)); response.on('error', reject);
      response.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); } catch (error) { reject(error); }
      });
    }).on('error', reject);
  });
}

async function assertPortReleased(port: number, host = '127.0.0.1') {
  const server = createServer();
  try {
    await new Promise<void>((resolve, reject) => {server.once('error', reject); server.listen(port, host, resolve);});
  } finally { await closeServer(server); }
}

test('actual Wrangler preserves default/custom HTTPS, port-only changes and outer client identity', {timeout: 90000}, async () => {
  const fixture = await transportDirectory(), dev = new unstable_DevEnv();
  try {
    const config = await configuration(fixture.directory), certificate = await defaultCertificate();
    const input = {config, dev: {remote: false, persist: false, watch: false, inspector: false, server: {hostname: '127.0.0.1', port: await availablePort(), secure: true}}};
    const worker = await dev.startWorker(input), first = await worker.url;
    assert.equal(first.protocol, 'https:');
    assert.ok((await secureProbe(first, certificate.cert)).peer.length > 0);
    // The actual IPv6 peer case uses a throwaway certificate with an IPv6 SAN.
    const custom = await customCertificate(fixture.directory, '::1');
    const customInput = {...input, dev: {...input.dev, server: {...input.dev.server, hostname: '::1', httpsKeyPath: custom.keyPath, httpsCertPath: custom.certPath}}};
    await worker.setConfig(customInput);
    const customUrl = await worker.url;
    const native = await secureProbe(customUrl, custom.cert);
    assert.equal(native.peer, '::1'); assert.equal(native.transport, null);
    assert.equal((await secureProbe(customUrl, custom.cert, {'CF-Connecting-IP': ''})).peer, '::1');
    const supplied = await secureProbe(customUrl, custom.cert, {'CF-Connecting-IP': '203.0.113.42', 'MF-Transport-URL': 'http://invalid.invalid/'});
    assert.equal(supplied.peer, '203.0.113.42'); assert.equal(supplied.transport, null);
    const oldPort = Number(customUrl.port), newPort = await availablePort();
    await worker.setConfig({...customInput, dev: {...customInput.dev, server: {...customInput.dev.server, port: newPort}}});
    const changed = await worker.url;
    assert.equal(Number(changed.port), newPort);
    assert.equal((await secureProbe(changed, custom.cert)).peer, '::1');
    await assertPortReleased(oldPort, '::1');
  } finally { await dev.teardown(); await fixture.dispose(); }
});

test('actual Wrangler teardown owns an in-flight listener startup', {timeout: 60000}, async () => {
  const fixture = await transportDirectory();
  try {
    const config = await configuration(fixture.directory);
    for (const pause of [0, 1, 5]) {
      const dev = new unstable_DevEnv(), port = await availablePort();
      try {
        await dev.startWorker({config, dev: {remote: false, persist: false, watch: false, inspector: false, server: {hostname: '127.0.0.1', port}}});
        if (pause) await new Promise(resolve => setTimeout(resolve, pause));
      } finally { await dev.teardown(); }
      await assertPortReleased(port);
    }
  } finally { await fixture.dispose(); }
});
