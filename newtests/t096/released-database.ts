import {TEST_SESSION_SECRET} from '../../tests/support/worker-identity.mjs';
import {execFileSync} from 'node:child_process';
import {mkdtemp,mkdir,readdir,readFile,writeFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
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
 return{directory,get db(){if(!platform)throw new Error('Released database is closed.');return platform.env.DB;},async upgrade(through?:string){
  await platform?.dispose();platform=undefined;
  for(const name of (await readdir('migrations/core')).filter(name=>name.endsWith('.sql')&&(!through||name<=through)&&!released.includes(`migrations/core/${name}`)).sort())await writeFile(join(migrations,name),await readFile(join('migrations/core',name)),{mode:0o600});
  try{migrate();}finally{platform=await open();}
 },async dispose(){await platform?.dispose();platform=undefined;await rm(directory,{recursive:true,force:true});}};
}

/** Run the release's own HTTP and identity code against its pre-migration store. */
export async function releasedRuntime(directory:string,db:D1Database){
 const source=join(directory,'released-source'),git=(args:string[])=>execFileSync('git',args,{maxBuffer:16777216});
 await mkdir(source);await writeFile(join(source,'package.json'),'{"type":"module"}');await symlink(resolve('node_modules'),join(source,'node_modules'),'dir');
 const files=git(['ls-tree','-r','--name-only','v0.3.0','src']).toString().trim().split('\n');
 for(const file of files){const path=join(source,file);await mkdir(dirname(path),{recursive:true});await writeFile(path,git(['show',`v0.3.0:${file}`]));}
 const {createApp}=await import(pathToFileURL(join(source,'src/core/app/app.ts')).href),{createOrbitIdentity}=await import(pathToFileURL(join(source,'src/core/features/identity/auth.ts')).href),{operatorFromRequest,requireStepUp}=await import(pathToFileURL(join(source,'src/core/features/identity/session.ts')).href);
 const bindings=(request:Request)=>({DB:db,AUTH_ORIGIN:new URL(request.url).origin,AUTH_LOCAL:'false',SESSION_SECRET:TEST_SESSION_SECRET,OWNER_EMAIL:'owner@orbit.test'});
 return {app:createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})},authenticate:(request:Request)=>operatorFromRequest(request,bindings(request)),stepUp:(request:Request,action:unknown,returnTo?:string)=>requireStepUp(request,bindings(request),action,returnTo)}),createOrbitIdentity};
}
