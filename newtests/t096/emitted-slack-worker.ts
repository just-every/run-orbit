import assert from 'node:assert/strict';
import {join} from 'node:path';
import {unstable_DevEnv} from 'wrangler';
import {availablePort} from '../../tests/support/available-port';
import {customCertificate} from '../../tests/support/http-listener-fixture';
import {TEST_SESSION_SECRET} from '../../tests/support/worker-identity.mjs';
import {certificateTrust} from './emitted-fixture';
import type {slackNetwork} from '../../tests/support/slack-network';
/** The exact emitted artifact, with every outbound request confined to the existing Slack network stand-in. */
export async function emittedSlackWorker(target:{directory:string;close():Promise<void>},configure:(origin:string)=>Promise<{key:string;edge:ReturnType<typeof slackNetwork>}>){
 const port=await availablePort(),origin=`https://127.0.0.1:${port}`,certificate=await customCertificate(target.directory),{key,edge}=await configure(origin),runtime=new unstable_DevEnv();await target.close();
 const secret=(value:string)=>({type:'secret_text' as const,value});
 try{
  const worker=await runtime.startWorker({config:join(process.cwd(),'dist/server/wrangler.json'),bindings:Object.fromEntries(Object.entries({AUTH_LOCAL:'false',AUTH_ORIGIN:origin,MAIL_FROM:'signin@fixture.test',SENDGRID_API_KEY:'synthetic-orbit-mail',SESSION_SECRET:TEST_SESSION_SECRET,OWNER_EMAIL:'owner@orbit.test',ORBIT_ENCRYPTION_KEY:key}).map(([name,value])=>[name,secret(value)])),dev:{remote:false,persist:target.directory,watch:false,inspector:false,server:{hostname:'127.0.0.1',port,secure:true,httpsKeyPath:certificate.keyPath,httpsCertPath:certificate.certPath},origin:{secure:true},outboundService:async request=>{
   assert.equal(new URL(request.url).origin,'https://slack.com','Only the Slack network stand-in is available; no real provider request');
   return edge.fetcher(request.url,{method:request.method,headers:Object.fromEntries(request.headers),redirect:'manual',...(['GET','HEAD'].includes(request.method)?{}:{body:await request.text()})});
  }}});await worker.ready;assert.equal((await worker.fetch(origin+'/health')).status,200);
  let closed=false;return {origin,port,pid:undefined,certificate,browserArgs:certificateTrust(certificate.cert),async dispose(){if(!closed){closed=true;await runtime.teardown();}}};
 }catch(error){await runtime.teardown();throw error;}
}
