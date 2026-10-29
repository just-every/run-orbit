import {spawnSync} from 'node:child_process';
import {isAbsolute} from 'node:path';
import {cpSync} from 'node:fs';
const state=process.env.ORBIT_TEST_STATE;
if(!state||!isAbsolute(state)||!process.env.ORBIT_ARCHIVE_TEST)throw new Error('Archive browser proof requires isolated state.');
const migration=process.env.ORBIT_TEST_DATABASE_TEMPLATE?null:['exec','wrangler','d1','migrations','apply','DB','--local','--config','wrangler.jsonc','--persist-to',state];
if(process.env.ORBIT_TEST_DATABASE_TEMPLATE)cpSync(process.env.ORBIT_TEST_DATABASE_TEMPLATE,state,{recursive:true});
for(const args of [migration,process.env.ORBIT_VERIFY_PREBUILT==='1'?['exec','node','scripts/verification-build.mjs','check']:['run','build:app']].filter(Boolean)){
 const result=spawnSync('pnpm',args,{stdio:'inherit',env:{...process.env,CI:'1'}});if(result.status!==0)process.exit(result.status??1);
}
await (await import('../../scripts/browser-runtime.mjs')).serveBrowserRuntime();
