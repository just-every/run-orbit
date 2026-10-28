import assert from 'node:assert/strict';
import {createApp,TEST_SESSION_SECRET} from './app';
import {identityResponse} from '../../src/core/features/identity';
import {editorConfigurationResponse} from '../../src/core/features/editor/server';
import {testAuth} from './test-auth';
import type {PlatformBindings} from '../../src/core/platform/assets';

/** A fresh installation must expose neither a usable sign-in form nor private data before configuration. */
export async function installationAdmission(db:D1Database){
 const origin='https://unconfigured.orbit.test',base={DB:db,AUTH_ORIGIN:origin} as PlatformBindings;
 const ask=(bindings:PlatformBindings,request:Request)=>identityResponse(request,bindings,{ownerClaimed:async()=>true});
 for(const bindings of [base,{...base,AUTH_LOCAL:'false',SESSION_SECRET:TEST_SESSION_SECRET,OWNER_EMAIL:'owner@orbit.test'}]){
  const page=await ask(bindings,new Request(origin+'/signin'));assert.equal(page!.status,200);assert.doesNotMatch(await page!.text(),/<input/,'no credential field without working sign-in');
 }
 const installed={...base,AUTH_LOCAL:'false',SESSION_SECRET:TEST_SESSION_SECRET,OWNER_EMAIL:'owner@orbit.test'};
 const response=await ask(installed,new Request(origin+'/auth/magic-link',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.10','Content-Type':'application/json'},body:JSON.stringify({email:'owner@orbit.test'})}));
 assert.equal(response!.status,503);assert.deepEqual(await response!.json(),{error:'mail_unavailable'});
 assert.equal((await ask({...installed,AUTH_ORIGIN:'http://invalid.test'},new Request('http://invalid.test/signin')))!.status,503);
}

export async function ownerEditorAdmission(db:D1Database,install:PlatformBindings,owner:string,cookie:string){
 const bindings={...install,RER_MANAGEMENT_ORIGIN:'https://management.example.test',RER_INSTALLATION_ID:'synthetic-orbit-installation'};
 const request=(value='')=>new Request(install.AUTH_ORIGIN+'/api/editor/config',{headers:{Cookie:value}});
 assert.equal((await editorConfigurationResponse(request(),bindings)).status,403);
 const admitted=await editorConfigurationResponse(request(cookie),bindings);assert.equal(admitted.status,200);assert.match(admitted.headers.get('Cache-Control')!,/no-store/);
 const grant=await admitted.json() as {config:{managementOrigin:string};expiresAt:number};assert.equal(grant.config.managementOrigin,bindings.RER_MANAGEMENT_ORIGIN);assert.ok(grant.expiresAt>Date.now());
 const auth=testAuth(db);await auth.ensureOperator({id:'synthetic-orbit-peer',email:'peer@example.test',displayName:'Peer'});const peer=await auth.createSession('synthetic-orbit-peer');
 assert.equal((await editorConfigurationResponse(request('__Host-orbit_session='+peer.token),bindings)).status,403);
 const current=await auth.authenticate(cookie);assert.equal(current!.operatorId,owner);await auth.revoke(current!.sessionId);
 assert.equal((await editorConfigurationResponse(request(cookie),bindings)).status,403);
}

export async function publicDemoIsolation(db:D1Database){
 const deployment={sourceSha:'synthetic-source',fingerprint:'synthetic-fingerprint',versionId:'synthetic-version'},app=createApp({deployment,database:db,assets:{fetch:async()=>new Response('asset')}});
 const health=await app.request('https://orbit.test/health');assert.equal(health.status,200);assert.deepEqual((await health.json()).deployment,deployment);
 const before=await db.prepare('SELECT * FROM opportunities').all();
 const response=await app.request('https://orbit.test/api/v1/public-demo');assert.equal(response.status,200);
 const payload=await response.json() as any;assert.equal(payload.example,true);assert.ok(payload.deals.length>0);
 for(const deal of payload.deals)for(const item of [...deal.signals,...deal.messages,{occurredAt:deal.draft.updatedAt}]){assert.ok(Date.parse(item.occurredAt)<=Date.now());assert.ok(Date.parse(item.occurredAt)>Date.now()-30*86400000);}
 assert.ok(payload.deals.some((deal:any)=>deal.messages.some((message:any)=>message.kind==='sent')&&deal.messages.some((message:any)=>message.kind==='reply')));
 for(const row of before.results)assert.ok(!JSON.stringify(payload).includes(String(row.id)),'demo cannot disclose installed customer records');
 assert.equal((await app.request('https://orbit.test/api/v1/public-demo?opportunityId=private')).status,400);
 assert.equal((await app.request('https://orbit.test/api/v1/public-demo',{method:'POST',body:'{}'})).status,404);
 assert.deepEqual((await db.prepare('SELECT * FROM opportunities').all()).results,before.results);
 assert.equal((await createApp({database:db,assets:{fetch:async()=>new Response('asset')},publicDemoEnabled:false}).request('https://orbit.test/api/v1/public-demo')).status,404);
}
