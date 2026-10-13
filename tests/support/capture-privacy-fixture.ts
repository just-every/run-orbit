import assert from 'node:assert/strict';
import {captureFixture} from './capture-fixture';
import {createApp} from './app';
import {captureProviderNetwork} from './capture-provider-network';
import {createSourceSecurity} from '../../src/core/platform/source-security';

/** Real HTTP and D1; pause a real capture commit to exercise erasure ordering. */
export async function capturePrivacyFixture(){
 const f=await captureFixture(),network=captureProviderNetwork('google');network.state.total=1;
 let pause:undefined|(()=>Promise<void>),pending=false,crash=false;
 const db=new Proxy({} as D1Database,{get(_target,key){const target=f.platform.db;
  if(key==='prepare')return(sql:string)=>{if(sql.startsWith('INSERT INTO capture_items('))pending=true;if(crash&&sql.startsWith('UPDATE capture_sources SET cursor=')){crash=false;throw new Error('Stopped before cursor commit');}return target.prepare(sql);};
  if(key==='batch')return async(statements:D1PreparedStatement[])=>{if(pending){pending=false;await pause?.();}return target.batch(statements);};
  const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;
 }});
 const build=()=>createApp({database:db,assets:{fetch:async()=>new Response('')},sourceSecurity:createSourceSecurity({ORBIT_ENCRYPTION_KEY:'72'.repeat(32)})!,captureOrigin:'https://orbit.test',captureFetch:network.fetcher});let app=build();
 const request=(path:string,body?:unknown,method=body===undefined?'GET':'POST')=>app.request(`https://orbit.test/api/v1/${path}`,{method,headers:{cookie:f.cookie,origin:'https://orbit.test','content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 async function connect(sourceId?:string){
  const response=await request('capture/oauth/google/start',{name:'Privacy mailbox',clientId:'test-client',clientSecret:'test-secret',sourceId});assert.equal(response.status,200);
  const url=new URL((await response.json() as any).authorizationUrl);network.state.challenge=url.searchParams.get('code_challenge')!;
  const callback=await request(`capture/oauth/google/callback?state=${encodeURIComponent(url.searchParams.get('state')!)}&code=test-code`);assert.equal(callback.status,303);
  const id=new URL(callback.headers.get('location')!,'https://orbit.test').searchParams.get('connected');assert.ok(id);
  assert.equal((await request(`capture/sources/${id}/scope`,{mail:{folders:['INBOX']}})).status,200);return id;
 }
 async function drain(id:string){for(let round=0;round<50;round++){const response=await request(`capture/sources/${id}/sync`,{});assert.equal(response.status,200);const value=await response.json() as any;assert.ok(!value.summary.halted);if(!value.more)return;}assert.fail('capture did not finish');}
 const upload=(files:{name:string;text:string}[],includeUnknown=false)=>{const form=new FormData();for(const file of files)form.append('files',new File([file.text],file.name));if(includeUnknown)form.append('includeUnknown','on');return app.request('https://orbit.test/api/v1/capture/imports',{method:'POST',headers:{cookie:f.cookie,origin:'https://orbit.test'},body:form});};
 function pauseCommit(){let entered!:()=>void,release!:()=>void;const ready=new Promise<void>(resolve=>entered=resolve),wait=new Promise<void>(resolve=>release=resolve);pause=async()=>{pause=undefined;entered();await wait;};return {ready,release};}
 return {...f,...network,db,request,upload,connect,drain,pauseCommit,crash:()=>{crash=true;},reopen:async()=>{await f.platform.close();await f.platform.reopen();app=build();}};
}
