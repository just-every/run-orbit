import assert from 'node:assert/strict';
import {readOperatorResource} from '/home/agent/rer-consolidation/work/sd-orbit-readcontext-race-1/run-orbit/src/core/features/operator/ui/use-operator-resource.ts';
import {readContext} from '/home/agent/rer-consolidation/work/sd-orbit-readcontext-race-1/run-orbit/src/core/features/operator/ui/record/record-api.ts';
const original=globalThis.fetch;
try{
 for(const status of [401,403,404,409,429,500,503]){
  globalThis.fetch=async()=>Response.json({error:`server ${status}`},{status});
  await assert.rejects(readContext('contact','absent'),error=>error instanceof Error&&error.message===`server ${status}`&&(error as Error&{status:number}).status===status);
 }
 globalThis.fetch=async()=>new Response('invalid JSON',{status:404});
 await assert.rejects(readContext('opportunity','absent'),error=>error instanceof Error&&error.message==='Orbit could not load these relationships.'&&(error as Error&{status:number}).status===404);
 const primary=Object.assign(new Error('primary'),{status:503}),missing=Object.assign(new Error('relationships'),{status:404});
 let release!:(value:never)=>void;
 const held=new Promise<never>((_,reject)=>{release=reject;});
 let settled=false;
 const combined=readOperatorResource([held,Promise.reject(missing)]).finally(()=>{settled=true;});
 const checked=assert.rejects(combined,error=>error===missing);
 await new Promise<void>(done=>setImmediate(done));assert.equal(settled,false);
 release(primary as never);await checked;
 const first=Object.assign(new Error('401 primary'),{status:401}),second=Object.assign(new Error('403 secondary'),{status:403});
 await assert.rejects(readOperatorResource([Promise.reject(first),Promise.reject(second)]),error=>error===first);
 const value={record:'same object'};assert.deepEqual(await readOperatorResource([Promise.resolve(value),Promise.resolve(null)]),[value,null]);
 console.log('PASS: 7 HTTP statuses, malformed JSON fallback, held primary with secondary 404, non-404 precedence, success values.');
}finally{globalThis.fetch=original;}
