import assert from 'node:assert/strict';
import {captureFixture} from './capture-fixture';
import {captureProviderNetwork} from './capture-provider-network';
import {createApp} from './app';
import {createSourceSecurity} from '../../src/core/platform/source-security';
import type {Provider,ProviderFetch} from '../../src/core/features/capture/providers/config';
import type {CaptureScope} from '../../src/core/features/capture/contracts';

/** Recovery failures are injected only at the provider HTTP edge. */
export async function captureRecoveryFixture(provider:Provider){
 const f=await captureFixture(),network=captureProviderNetwork(provider),reads:string[]=[];
 let respond:((url:URL)=>Response|undefined)|undefined;
 const fetcher:ProviderFetch=async(raw,init)=>{
  assert.equal(init?.redirect,'error');
  if(init?.method==='GET'){
   assert.ok(new Headers(init.headers).get('authorization'));reads.push(raw);
   const response=respond?.(new URL(raw));if(response)return response;
  }
  return network.fetcher(raw,init);
 };
 const app=createApp({database:f.db,assets:{fetch:async()=>new Response('')},sourceSecurity:createSourceSecurity({ORBIT_ENCRYPTION_KEY:'83'.repeat(32)})!,captureOrigin:'https://orbit.test',captureFetch:fetcher});
 const request=(path:string,body?:unknown)=>app.request(`https://orbit.test/api/v1/capture${path}`,{method:body===undefined?'GET':'POST',headers:{cookie:f.cookie,origin:'https://orbit.test','content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 async function connect(scope:CaptureScope){
  const started=await request(`/oauth/${provider}/start`,{name:'Recovery proof',clientId:'fixture-client',clientSecret:'fixture-secret'});assert.equal(started.status,200);
  const auth=new URL((await started.json() as any).authorizationUrl);network.state.challenge=auth.searchParams.get('code_challenge')!;
  const callback=await request(`/oauth/${provider}/callback?${new URLSearchParams({state:auth.searchParams.get('state')!,code:'fixture-code'})}`);assert.equal(callback.status,303);
  const id=new URL(callback.headers.get('location')!,'https://orbit.test').searchParams.get('connected');assert.ok(id);
  await select(id,scope);return id;
 }
 async function select(id:string,scope:CaptureScope){assert.equal((await request(`/sources/${id}/scope`,scope)).status,200);}
 async function sync(id:string){const response=await request(`/sources/${id}/sync`,{});assert.equal(response.status,200);return await response.json() as any;}
 async function drain(id:string){for(let i=0;i<30;i++){const result=await sync(id);assert.ok(!result.summary.halted,JSON.stringify(result));if(!result.more)return;}assert.fail('The provider did not finish this finite fixture.');}
 const source=(id:string)=>f.db.prepare('SELECT cursor,last_error,state FROM capture_sources WHERE id=?').bind(id).first<{cursor:string;last_error:string|null;state:string}>();
 const count=(id:string)=>f.db.prepare('SELECT count(*) n FROM signals WHERE source_id=?').bind(id).first<number>('n');
 return {...f,network,reads,request,connect,select,sync,drain,source,count,respond:(handler:typeof respond)=>{respond=handler;}};
}
