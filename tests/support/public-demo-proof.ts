import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {unstable_DevEnv} from 'wrangler';
import {availablePort} from './available-port';
import {identityVars} from './worker-identity.mjs';
import {databaseDigest} from './stop-attribution';
import {disabledDemoBuild} from './disabled-demo-build';
import type {isolatedDatabase} from './isolated-database';

/** Exercise the actual emitted document with populated D1 and fenced provider edges. */
export async function emittedDemoProof(platform:Awaited<ReturnType<typeof isolatedDatabase>>,privateValues:string[]) {
 const port=await availablePort(),origin=`http://127.0.0.1:${port}`,edges:string[]=[];
 const bindings=Object.fromEntries(Object.entries({...identityVars(origin),OPENAI_API_KEY:'synthetic-orbit-1',AI_MODEL:'synthetic-orbit-2',AI_INPUT_COST_PER_MILLION:'1',AI_OUTPUT_COST_PER_MILLION:'1',SENDGRID_API_KEY:'synthetic-orbit-3',MAIL_FROM:['synthetic-orbit-4','example.test'].join('@')}).map(([key,value])=>[key,{type:'secret_text' as const,value}]));
 async function documents(config:string,enabled:boolean) {
  const before=await databaseDigest(platform.db);
  await platform.close();
  const runtime=new unstable_DevEnv();
  try {
   const worker=await runtime.startWorker({config:resolve(config),bindings,dev:{remote:false,persist:platform.directory,watch:false,inspector:false,server:{hostname:'127.0.0.1',port},outboundService:async request=>{edges.push(new URL(request.url).origin);return new Response(null,{status:503});}}});
   await worker.ready;
   for(const path of ['/demo','/demo/','/demo/synthetic-orbit-unknown','/api/v1/public-demo']) {
    const response=await fetch(origin+path),body=await response.text();
    assert.equal(response.status,path.includes('synthetic-orbit-unknown')||!enabled?404:200,`${path} respects the public demo configuration`);
    for(const value of privateValues)assert.ok(!body.includes(value),`${path} never exposes a populated owner record`);
    if(enabled&&path==='/demo')assert.match(body,/read-only demo/i,'The emitted document labels its fictional workspace');
   }
   const head=await fetch(origin+'/demo',{method:'HEAD'});assert.equal(head.status,enabled?200:404);assert.equal(await head.text(),'');
  } finally {await runtime.teardown();await platform.reopen();}
  assert.equal(await databaseDigest(platform.db),before,'Public demo documents and data change no D1 table, including rate counters, AI accounting, drafts and approvals');
  assert.deepEqual(edges,[],'The emitted demo makes no AI, mail or other provider request');
 }
 await documents('dist/server/wrangler.json',true);
 const disabled=await disabledDemoBuild();
 try {await documents(disabled.config,false);}finally{await disabled.dispose();}
}
