import {execFileSync} from 'node:child_process';
import {mkdtemp,mkdir,readdir,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {getPlatformProxy} from 'wrangler';

/** Released migration bytes create the source store; only unapplied current migrations advance it. */
export async function releasedDatabase(){
 const directory=await mkdtemp(join(tmpdir(),'orbit-released-upgrade-')),migrations=join(directory,'migrations'),config=join(directory,'wrangler.toml'),state=join(directory,'state');
 const git=(args:string[])=>execFileSync('git',args,{maxBuffer:16777216});
 const released=git(['ls-tree','-r','--name-only','v0.3.0','migrations/core']).toString().trim().split('\n');
 await mkdir(migrations);
 for(const path of released)await writeFile(join(migrations,path.split('/').at(-1)!),git(['show',`v0.3.0:${path}`]),{mode:0o600});
 await writeFile(config,`name = "orbit-released-upgrade"\ncompatibility_date = "2026-09-08"\ncompatibility_flags = ["nodejs_compat"]\n[[d1_databases]]\nbinding = "DB"\ndatabase_name = "orbit-released-upgrade"\ndatabase_id = "00000000-0000-0000-0000-000000000001"\nmigrations_dir = ${JSON.stringify(migrations)}\n`,{mode:0o600});
 const migrate=()=>execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','migrations','apply','DB','--local','--config',config,'--persist-to',state],{env:{...process.env,CI:'1'},timeout:120000,stdio:'pipe'});
 const open=()=>getPlatformProxy<{DB:D1Database}>({configPath:config,persist:{path:join(state,'v3')},remoteBindings:false});
 let platform:Awaited<ReturnType<typeof open>>|undefined;
 try{migrate();platform=await open();}catch(error){await rm(directory,{recursive:true,force:true});throw error;}
 return{get db(){if(!platform)throw new Error('Released database is closed.');return platform.env.DB;},async upgrade(){
  await platform?.dispose();platform=undefined;
  for(const name of (await readdir('migrations/core')).filter(name=>name.endsWith('.sql')&&!released.includes(`migrations/core/${name}`)).sort())await writeFile(join(migrations,name),await readFile(join('migrations/core',name)),{mode:0o600});
  try{migrate();}finally{platform=await open();}
 },async dispose(){await platform?.dispose();platform=undefined;await rm(directory,{recursive:true,force:true});}};
}
