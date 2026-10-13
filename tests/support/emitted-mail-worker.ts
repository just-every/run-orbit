import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {writeFile,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {availablePort} from './available-port';
import {identityVars} from './worker-identity.mjs';

/** One emitted Worker, sharing the fixture's real D1 only while its proxy is closed. */
export async function emittedMailWorker(directory:string,credentials:Record<string,string>){
 const port=await availablePort(),origin=`http://127.0.0.1:${port}`,file=join(directory,'mail-credentials.env');
 await writeFile(file,Object.entries({...identityVars(origin),...credentials}).map(([key,value])=>`${key}=${value}\n`).join(''),{mode:0o600});
 assert.equal((await stat(file)).mode&0o777,0o600);
 let worker:ReturnType<typeof spawn>|undefined;
 async function stop(){
  if(worker&&worker.exitCode===null){const closed=once(worker,'close');worker.kill('SIGTERM');await closed;}
  worker=undefined;
 }
 async function start(){
  assert.equal(worker,undefined,'Previous Worker has stopped');
  worker=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--config','dist/server/wrangler.json','--local','--persist-to',directory,'--port',String(port),'--inspector-port','0','--env-file',file],{
   stdio:['ignore','pipe','pipe'],env:{...Object.fromEntries(['PATH','HOME','TMPDIR','USER','LANG','LC_ALL'].flatMap(name=>process.env[name]?[[name,process.env[name]!]]:[])),CI:'1',WRANGLER_SEND_METRICS:'false',WRANGLER_WRITE_LOGS:'false'},
  });
  // Provider credentials must never enter logs, including Wrangler's binding output.
  worker.stdout!.resume();worker.stderr!.resume();
  for(let i=0;i<300;i++){
   try{if((await fetch(origin+'/health')).ok)return;}catch{}
   if(worker.exitCode!==null)break;
   await new Promise(resolve=>setTimeout(resolve,100));
  }
  await stop();throw Error('Emitted Worker did not become healthy');
 }
 return {origin,start,stop};
}
