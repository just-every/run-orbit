import { cp, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { getPlatformProxy } from 'wrangler';

function preparedDatabase(database:D1Database){
 const statements=new Map<string,D1PreparedStatement>(),bindings=new Map<string,D1PreparedStatement>(),methodCaches=new Set<Map<PropertyKey,unknown>>();
 let natives=new WeakMap<D1PreparedStatement,D1PreparedStatement>();
 // Retain native handles and methods to avoid repeated preparation/binding RPCs, never results.
 const wrap=(native:D1PreparedStatement,sql:string):D1PreparedStatement=>{
  const methods=new Map<PropertyKey,unknown>();methodCaches.add(methods);
  const statement=new Proxy({} as D1PreparedStatement,{get(_target,key){
   if(methods.has(key))return methods.get(key);
   if(key==='bind'){
    const bind=native.bind.bind(native),method=(...values:unknown[])=>{
     const cacheable=values.every(value=>value===null||typeof value==='string'||typeof value==='number'&&Number.isFinite(value));
     const identity=cacheable?JSON.stringify([sql,values.map(value=>Object.is(value,-0)?{negativeZero:true}:value)]):undefined;
     if(identity!==undefined){const cached=bindings.get(identity);if(cached)return cached;}
     const bound=wrap(bind(...values),sql);if(identity!==undefined)bindings.set(identity,bound);return bound;
    };
    methods.set(key,method);return method;
   }
   const value=Reflect.get(native,key,native);if(typeof value!=='function')return value;
   const method=value.bind(native);methods.set(key,method);return method;
  }});
  natives.set(statement,native);return statement;
 };
 const batch=database.batch.bind(database);
 const db=new Proxy({} as D1Database,{get(_target,key){
  if(key==='prepare')return(sql:string)=>{let statement=statements.get(sql);if(!statement){statement=wrap(database.prepare(sql),sql);statements.set(sql,statement);}return statement;};
  if(key==='batch')return(items:D1PreparedStatement[])=>batch(items.map(statement=>natives.get(statement)??statement));
  const value=Reflect.get(database,key,database);return typeof value==='function'?value.bind(database):value;
 }});
 return {db,clear:()=>{statements.clear();bindings.clear();for(const methods of methodCaches)methods.clear();methodCaches.clear();natives=new WeakMap();}};
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
