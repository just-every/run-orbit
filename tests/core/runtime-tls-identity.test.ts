import assert from 'node:assert/strict';
import {createServer} from 'node:https';
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';
import {test} from 'node:test';
import {closeServer, customCertificate, serverOrigin, transportDirectory} from '../support/http-listener-fixture';

const require = createRequire(import.meta.url);
const {connectTls} = require(join(dirname(require.resolve('wrangler/package.json')), 'wrangler-dist/http-transport.cjs'));

test('private TLS connection verifies the public identity and rejects a mismatched identity or CA', {timeout: 30000}, async () => {
  const directory = await transportDirectory(), other = await transportDirectory();
  try {
    const certificate = await customCertificate(directory.directory, 'localhost');
    const wrongCA = await customCertificate(other.directory, 'localhost');
    const server = createServer(certificate, (_request, response) => response.end());
    const target = await serverOrigin(server, '127.0.0.1', true);
    const connect = (identity: string, ca: string) => new Promise<void>((resolve, reject) => {
      const socket = connectTls(target, {ca, tlsIdentity: identity});
      let error: unknown;
      socket.once('error', (caught: Error) => {error = caught;});
      socket.once('secureConnect', () => {
        try {assert.equal(socket.authorized, true);} catch (caught) {error = caught;}
        socket.destroy();
      });
      socket.once('close', () => error ? reject(error) : resolve());
    });
    try {
      await connect('localhost', certificate.cert);
      await assert.rejects(connect('127.0.0.1', certificate.cert), {code: 'ERR_TLS_CERT_ALTNAME_INVALID'});
      await assert.rejects(connect('localhost', wrongCA.cert));
    } finally {await closeServer(server);}
  } finally {await directory.dispose(); await other.dispose();}
});
