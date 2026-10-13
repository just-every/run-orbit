import {writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {availablePort} from './available-port';
import {transportDirectory} from './http-listener-fixture';

const require = createRequire(import.meta.url);
const {unstable_DevEnv} = require('wrangler');

export async function sdkWorker(script: string, server: Record<string, unknown> = {}) {
  const directory = await transportDirectory(), dev = new unstable_DevEnv();
  try {
    const main = join(directory.directory, 'worker.mjs'), config = join(directory.directory, 'wrangler.json');
    await writeFile(main, script, {mode: 0o600});
    await writeFile(config, JSON.stringify({name: 'sdk-wire-' + crypto.randomUUID(), main, compatibility_date: '2026-09-08', no_bundle: true}), {mode: 0o600});
    await writeFile(join(directory.directory, '.dev.vars'), '', {mode: 0o600});
    const worker = await dev.startWorker({config, dev: {remote: false, persist: false, watch: false, inspector: false,
      server: {hostname: '127.0.0.1', port: await availablePort(), ...server}}});
    return {url: await worker.url as URL, async dispose() {await dev.teardown(); await directory.dispose();}};
  } catch (error) {await dev.teardown(); await directory.dispose(); throw error;}
}
