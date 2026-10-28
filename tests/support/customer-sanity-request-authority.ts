import assert from 'node:assert/strict';
import {identityConfig,identityResponse} from '../../src/core/features/identity';
import {TEST_SESSION_SECRET,createApp} from './app';
import type {PlatformBindings} from '../../src/core/platform/assets';
import {createDependencies} from './dependencies';
import {createId} from '../../src/core/shared/ids';

export async function requestAuthority(db:D1Database) {

 {

 const deps=createDependencies(db),actor=createId();await deps.auth.ensureOperator({id:actor,email:`${actor}@test.invalid`,displayName:'Boundary test'});const session=await deps.auth.createSession(actor);const app=createApp({database:db,assets:{fetch:async()=>new Response('test')}});const headers={cookie:`__Host-orbit_session=${session.token}`,origin:'https://orbit.test','content-type':'application/json'};assert.equal((await app.request('https://orbit.test/api/v1/assistance/preview',{method:'POST',headers,body:'{bad'})).status,400);assert.equal((await app.request('https://orbit.test/api/v1/settings/operators',{method:'POST',headers:{...headers,origin:'https://evil.test'},body:JSON.stringify({email:'no@test.invalid',displayName:'No'})})).status,403);assert.equal(await db.prepare('SELECT id FROM operators WHERE email=?').bind('no@test.invalid').first(),null);

 }

 {

 const installed={DB:db,AUTH_ORIGIN:'https://unconfigured.orbit.test',AUTH_LOCAL:'false',SESSION_SECRET:TEST_SESSION_SECRET,OWNER_EMAIL:'owner@orbit.test'} as PlatformBindings;
 assert.equal(identityConfig({DB:db,AUTH_ORIGIN:'https://unconfigured.orbit.test'} as PlatformBindings),null);
 assert.throws(()=>identityConfig({...installed,MAIL_FROM:'test@example.invalid'}),/SENDGRID_API_KEY/);assert.throws(()=>identityConfig({...installed,SENDGRID_API_KEY:'test-only'}),/MAIL_FROM/);
 const ask=(bindings:PlatformBindings,request:Request)=>identityResponse(request,bindings,{ownerClaimed:async()=>true});
 const fresh=await ask({DB:db,AUTH_ORIGIN:'https://unconfigured.orbit.test'} as PlatformBindings,new Request('https://unconfigured.orbit.test/signin'));assert.equal(fresh!.status,200);assert.match(await fresh!.text(),/not configured/);assert.doesNotMatch(await (await ask({DB:db} as PlatformBindings,new Request('https://unconfigured.orbit.test/signin')))!.text(),/<input/,'no credential field');
 const page=await ask(installed,new Request('https://unconfigured.orbit.test/signin'));assert.equal(page!.status,200);const html=await page!.text();assert.match(html,/Sign-in email is not available right now/);assert.doesNotMatch(html,/<input/,'no credential field without sign-in mail');
 const request=await ask(installed,new Request('https://unconfigured.orbit.test/auth/magic-link',{method:'POST',headers:{Origin:'https://unconfigured.orbit.test','content-type':'application/json','CF-Connecting-IP':'192.0.2.30'},body:JSON.stringify({email:'test@example.invalid'})}));
 assert.equal(request!.status,503);assert.deepEqual(await request!.json(),{error:'mail_unavailable'});
 assert.equal((await ask({...installed,AUTH_ORIGIN:'http://invalid.test'},new Request('http://invalid.test/signin')))!.status,503,'a deployment origin must be HTTPS');

 }

 {

 const deps=createDependencies(db),actor=createId();await deps.auth.ensureOperator({id:actor,email:`${actor}@test.invalid`,displayName:'Review boundary'});const session=await deps.auth.createSession(actor),app=createApp({database:db,assets:{fetch:async()=>new Response('test')}}),headers={cookie:`__Host-orbit_session=${session.token}`,origin:'https://orbit.test','content-type':'application/json'};
 for(const [path,input] of [[`replies/${createId()}/link`,{}],['replies/not-an-id/link',{opportunityId:createId()}],[`unlinked/${createId()}/link`,{type:'contact',id:'invalid'}]])assert.equal((await app.request(`https://orbit.test/api/v1/sources/${path}`,{method:'POST',headers,body:JSON.stringify(input)})).status,400);assert.equal((await app.request('https://orbit.test/api/v1/signals/invalid%20source',{method:'POST',body:'{}'})).status,400);

 }

}
