import {spawnSync} from 'node:child_process';
import {isAbsolute} from 'node:path';
const state=process.env.ORBIT_TEST_STATE;
if(!state||!isAbsolute(state)||!process.env.ORBIT_ARCHIVE_TEST)throw new Error('Archive browser proof requires isolated state.');
for(const args of [['exec','wrangler','d1','migrations','apply','DB','--local','--config','wrangler.jsonc','--persist-to',state]]){
 const result=spawnSync('pnpm',args,{stdio:'inherit',env:{...process.env,CI:'1'}});if(result.status!==0)process.exit(result.status??1);
}
await (await import('../../scripts/browser-runtime.mjs')).serveBrowserRuntime();
