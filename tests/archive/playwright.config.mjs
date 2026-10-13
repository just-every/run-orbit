import {defineConfig} from '@playwright/test';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';
const root=fileURLToPath(new URL('../..',import.meta.url)),port=Number(process.env.ORBIT_ARCHIVE_PORT??8723);
process.env.ORBIT_TEST_STATE??=mkdtempSync(join(tmpdir(),'orbit-native-archive-'));process.env.ORBIT_ARCHIVE_TEST='1';process.env.ORBIT_FIXTURE_BROKER='1';
// Allow the full journey's three exports, two restores and explicit snapshot discards.
export default defineConfig({testDir:'.',testMatch:'browser.spec.mjs',workers:1,retries:0,timeout:180_000,use:{acceptDownloads:true,baseURL:`http://127.0.0.1:${port}`,viewport:{width:1440,height:1000},trace:'retain-on-failure'},webServer:{command:`PORT=${port} node tests/archive/server.mjs`,cwd:resolve(root),url:`http://127.0.0.1:${port}`,reuseExistingServer:false,timeout:120_000}});
