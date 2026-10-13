import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { getPlatformProxy } from 'wrangler';

/** Apply the real edition migrations to a disposable D1, never the running app's DB. */
export async function isolatedDatabase() {
 const directory=await mkdtemp(join(tmpdir(),'orbit-restore-test-'));
 try {
  execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','migrations','apply','DB','--local','--config','wrangler.jsonc','--persist-to',directory],{env:{...process.env,CI:'1'},timeout:60000,stdio:'pipe'});
  let platform=await getPlatformProxy<{DB:D1Database}>({configPath:'wrangler.jsonc',envFiles:['tests/support/no-local-settings.env'],persist:{path:join(directory,'v3')},remoteBindings:false});
  let closed=false;
  return {get db(){if(closed)throw new Error('Database proxy is closed');return platform.env.DB;},directory,async close(){if(!closed){await platform.dispose();closed=true;}},async reopen(){if(!closed)throw new Error('Database proxy is already open');platform=await getPlatformProxy<{DB:D1Database}>({configPath:'wrangler.jsonc',envFiles:['tests/support/no-local-settings.env'],persist:{path:join(directory,'v3')},remoteBindings:false});closed=false;},async dispose(preserve=false){if(!closed)await platform.dispose();closed=true;if(!preserve)await rm(directory,{recursive:true,force:true});}};
 }catch(error){await rm(directory,{recursive:true,force:true});throw error;}
}
