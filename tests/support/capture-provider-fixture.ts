import assert from 'node:assert/strict';
import {captureFixture} from './capture-fixture';
import {createApp} from './app';
import {captureProviderNetwork} from './capture-provider-network';
import {createSourceSecurity} from '../../src/core/platform/source-security';
import type {Provider} from '../../src/core/features/capture/providers/config';
export const captureFixtureSecurity=createSourceSecurity({ORBIT_ENCRYPTION_KEY:'72'.repeat(32)})!;
const security=captureFixtureSecurity;
export async function providerFixture(provider:Provider){
 const f=await captureFixture(),network=captureProviderNetwork(provider);let crash=false;
 const db=new Proxy({} as D1Database,{get(_target,key){const target=f.platform.db;if(key==='prepare')return (sql:string)=>{if(crash&&sql.startsWith('UPDATE capture_sources SET cursor=')){crash=false;throw new Error('Worker stopped before cursor commit');}return target.prepare(sql);};const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;}});
 const build=()=>createApp({database:db,assets:{fetch:async()=>new Response('')},sourceSecurity:security,captureOrigin:'https://orbit.test',captureFetch:network.fetcher});let app=build();
 const request=(path:string,body?:unknown,cookie=f.cookie)=>app.request(`https://orbit.test/api/v1/capture${path}`,{method:body===undefined?'GET':'POST',headers:{cookie,origin:'https://orbit.test','content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 async function start(sourceId?:string,cookie=f.cookie,writebackConsent=false){const response=await request(`/oauth/${provider}/start`,{name:`${provider} account`,clientId:'test-client',clientSecret:'test-secret',sourceId,writebackConsent},cookie);assert.equal(response.status,200);const url=new URL((await response.json() as any).authorizationUrl);network.state.challenge=url.searchParams.get('code_challenge')!;return url;}
 async function callback(url:URL,cookie=f.cookie){return request(`/oauth/${provider}/callback?state=${encodeURIComponent(url.searchParams.get('state')!)}&code=test-code`,undefined,cookie);}
 async function connect(sourceId?:string,writebackConsent=false){const response=await callback(await start(sourceId,f.cookie,writebackConsent));assert.equal(response.status,303);const location=new URL(response.headers.get('location')!,'https://orbit.test');assert.ok(!location.searchParams.has('error'),location.searchParams.get('error')??'');return location.searchParams.get('connected')!;}
 const count=(id:string)=>db.prepare('SELECT count(*) n FROM signals WHERE source_id=?').bind(id).first<number>('n');
 async function drain(id:string){let rounds=0;while(true){const response=await request(`/sources/${id}/sync`,{});assert.equal(response.status,200);const value=await response.json() as any;assert.ok(!value.summary.halted);if(!value.more)return;assert.ok(++rounds<100,'bounded resumable source must eventually finish');}}
 return {...f,...network,db,get app(){return app;},request,start,callback,connect,count,drain,reopen:async()=>{await f.platform.close();await f.platform.reopen();app=build();},crash:()=>{crash=true;}};
}
