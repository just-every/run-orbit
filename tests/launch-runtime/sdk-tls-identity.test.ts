import assert from 'node:assert/strict';
import {get} from 'node:https';
import {createRequire} from 'node:module';
import {test} from 'node:test';
import {customCertificate, transportDirectory} from '../support/http-listener-fixture';
import {sdkWorker} from '../support/sdk-worker-fixture';

const require = createRequire(import.meta.url);
const {WebSocket} = require(require.resolve('ws', {paths: [require.resolve('wrangler')]}));

test('actual Wrangler HTTPS and WSS verify separate public DNS-only and IPv6-only certificates', {timeout: 90000}, async () => {
  for (const hostname of ['localhost', '::1']) {
    const directory = await transportDirectory();
    let worker: Awaited<ReturnType<typeof sdkWorker>> | undefined;
    try {
      const cert = await customCertificate(directory.directory, hostname);
      worker = await sdkWorker(`export default {fetch(request) {
        const peer = request.headers.get('CF-Connecting-IP');
        if (request.headers.get('Upgrade') === 'websocket') {
          const pair = new WebSocketPair(); pair[1].accept();
          pair[1].addEventListener('message', event => pair[1].send(peer+'|'+event.data));
          return new Response(null, {status: 101, webSocket: pair[0]});
        }
        return new Response(peer);
      }}`, {hostname, secure: true, httpsKeyPath: cert.keyPath, httpsCertPath: cert.certPath});
      for (const supplied of ['', '203.0.113.42']) {
        const expected = supplied || (hostname === 'localhost' ? '127.0.0.1' : '::1');
        await new Promise<void>((resolve, reject) => {
          get(worker!.url, {ca: cert.cert, headers: {'CF-Connecting-IP': supplied}}, response => {
            const chunks: Buffer[] = []; response.on('data', chunk => chunks.push(chunk)); response.on('error', reject);
            response.on('end', () => {
              try {assert.equal(response.statusCode, 200); assert.equal(response.complete, true); assert.equal(Buffer.concat(chunks).toString().replace(/^::ffff:/, ''), expected); resolve();}
              catch (error) {reject(error);}
            });
          }).on('error', reject);
        });
        const socketUrl = new URL('/socket', worker.url); socketUrl.protocol = 'wss:';
        const client = new WebSocket(socketUrl, {ca: cert.cert, headers: {'CF-Connecting-IP': supplied}});
        try {
          await new Promise<void>((resolve, reject) => {
            client.once('error', reject); client.once('open', () => client.send('café ☃'));
            client.once('message', (message: Buffer) => {
              try {assert.equal(message.toString().replace(/^::ffff:/, ''), expected + '|café ☃'); resolve();}
              catch (error) {reject(error);}
            });
          });
        } finally {client.terminate();}
      }
    } finally {await worker?.dispose(); await directory.dispose();}
  }
});
