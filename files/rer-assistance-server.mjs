import {spawnSync} from 'node:child_process';
const result=spawnSync('pnpm',['exec','tsx','tests/support/prepare-state.ts'],{stdio:'inherit',env:{...process.env,CI:'1'}});
if(result.status!==0)process.exit(result.status??1);
await(await import('/home/agent/rer-consolidation/work/ct-proof-orbit-ai002-20261106-0255/run-orbit/scripts/browser-runtime.mjs')).serveBrowserRuntime();
