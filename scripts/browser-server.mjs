import {spawnSync} from 'node:child_process';
import {isAbsolute} from 'node:path';
const state=process.env.ORBIT_TEST_STATE;
if(!state||!isAbsolute(state))throw new Error('Browser verification requires an isolated absolute ORBIT_TEST_STATE.');
for(const args of [['exec','tsx','tests/support/prepare-state.ts'],['run','build:app']]){const result=spawnSync('pnpm',args,{stdio:'inherit',env:{...process.env,CI:'1'}});if(result.status!==0)process.exit(result.status??1);}
await (await import('./browser-runtime.mjs')).serveBrowserRuntime();
