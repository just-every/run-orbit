import {spawnSync} from 'node:child_process';
import {isAbsolute} from 'node:path';
const state=process.env.ORBIT_TEST_STATE;
if(!state||!isAbsolute(state))throw new Error('Browser verification requires an isolated absolute ORBIT_TEST_STATE.');
const setup=[['exec','tsx','tests/support/prepare-state.ts']];
if(process.env.ORBIT_VERIFY_PREBUILT!=='1')setup.push(['run','build:app']);
for(const args of setup){const result=spawnSync('pnpm',args,{stdio:'inherit',env:{...process.env,CI:'1'}});if(result.status!==0)process.exit(result.status??1);}
await (await import('./browser-runtime.mjs')).serveBrowserRuntime();
