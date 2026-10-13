import {execFile} from 'node:child_process';
import {once} from 'node:events';
import {chmod, mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import type {Server} from 'node:http';
import {createRequire} from 'node:module';
import {join, resolve} from 'node:path';
import {promisify} from 'node:util';

const require = createRequire(import.meta.url);
const miniflare = require(require.resolve('miniflare', {paths: [require.resolve('wrangler')]}));

export async function serverOrigin(server: Server, host = '127.0.0.1', secure = false) {
  server.listen(0, host); await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw Error('Server has no TCP address');
  return new URL(`${secure ? 'https' : 'http'}://${host.includes(':') ? `[${host}]` : host}:${address.port}`);
}

export async function closeServer(server: Server) {
  const closed = new Promise<void>(resolve => server.close(() => resolve()));
  server.closeAllConnections(); await closed;
}

export async function defaultCertificate(): Promise<{key: string; cert: string}> {
  const entry = await miniflare.getEntrySocketHttpOptions({https: true});
  return {key: entry.https.tlsOptions.keypair.privateKey, cert: entry.https.tlsOptions.keypair.certificateChain};
}

export async function transportDirectory() {
  const parent = resolve('.rer-tools'); await mkdir(parent, {recursive: true, mode: 0o700});
  const directory = await mkdtemp(join(parent, 'sdk-transport-'));
  return {directory, dispose: () => rm(directory, {recursive: true, force: true})};
}

export async function customCertificate(directory: string, identity = '127.0.0.1') {
  const san = identity.includes(':') || /^[0-9.]+$/.test(identity) ? `IP:${identity}` : `DNS:${identity}`;
  const configuration = join(directory, 'tls.cnf'), keyPath = join(directory, 'tls.key'), certPath = join(directory, 'tls.crt');
  await writeFile(configuration, `[req]\nprompt=no\ndistinguished_name=subject\nx509_extensions=extensions\n[subject]\nCN=${identity}\n[extensions]\nsubjectAltName=${san}\n`, {mode: 0o600});
  // Throwaway test material stays in this private directory and never enters logs.
  await promisify(execFile)('/usr/bin/openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-config', configuration, '-keyout', keyPath, '-out', certPath], {maxBuffer: 1024 * 1024});
  await Promise.all([chmod(keyPath, 0o600), chmod(certPath, 0o600)]);
  return {key: await readFile(keyPath, 'utf8'), cert: await readFile(certPath, 'utf8'), keyPath, certPath};
}
