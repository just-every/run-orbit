import { cp, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { getPlatformProxy } from 'wrangler';

function preparedDatabase(database:D1Database){
 const statements=new Map<string,D1PreparedStatement>();
 // Reusing native handles avoids repeated synchronous Node-to-workerd preparation RPCs.
 const db=new Proxy({} as D1Database,{get(_target,key){
  if(key==='prepare')return(sql:string)=>{let statement=statements.get(sql);if(!statement){statement=database.prepare(sql);statements.set(sql,statement);}return statement;};
  const value=Reflect.get(database,key,database);return typeof value==='function'?value.bind(database):value;
 }});
 return {db,clear:()=>statements.clear()};
}

/** Apply the real edition migrations to a disposable D1, never the running app's DB. */
export async function isolatedDatabase() {
 const directory=await mkdtemp(join(tmpdir(),'orbit-restore-test-'));
 try {
  if (process.env.ORBIT_TEST_DATABASE_TEMPLATE) {
   await cp(process.env.ORBIT_TEST_DATABASE_TEMPLATE, directory, { recursive: true });
  } else {
   execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','migrations','apply','DB','--local','--config','wrangler.jsonc','--persist-to',directory],{env:{...process.env,CI:'1'},timeout:60000,stdio:'pipe'});
  }
  let platform=await getPlatformProxy<{DB:D1Database}>({configPath:'wrangler.jsonc',envFiles:['tests/support/no-local-settings.env'],persist:{path:join(directory,'v3')},remoteBindings:false});
  // The migrated template contains a generated installation identity. A fresh
  // fixture is a separate installation, while reopen must retain that identity.
  if (process.env.ORBIT_TEST_DATABASE_TEMPLATE)
   await platform.env.DB.prepare('UPDATE delegation_installation SET id=lower(hex(randomblob(16))), epoch=0').run();
  let prepared=preparedDatabase(platform.env.DB),closed=false;
  const close=async()=>{if(!closed){await platform.dispose();prepared.clear();closed=true;}};
  return {
   get db(){if(closed)throw new Error('Database proxy is closed');return prepared.db;},directory,close,
   async reopen(){
    if(!closed)throw new Error('Database proxy is already open');
    platform=await getPlatformProxy<{DB:D1Database}>({configPath:'wrangler.jsonc',envFiles:['tests/support/no-local-settings.env'],persist:{path:join(directory,'v3')},remoteBindings:false});
    prepared=preparedDatabase(platform.env.DB);closed=false;
   },
   async dispose(preserve=false){await close();if(!preserve)await rm(directory,{recursive:true,force:true});},
  };
 }catch(error){await rm(directory,{recursive:true,force:true});throw error;}
}
