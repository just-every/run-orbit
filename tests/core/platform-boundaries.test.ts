import assert from 'node:assert/strict';
import {after,test} from 'node:test';
import {getPlatformProxy} from 'wrangler';
import {publicRateLimit} from '../../src/core/platform/public-rate-limit';
import {identityConfig,identityResponse} from '../../src/core/features/identity';
import {TEST_SESSION_SECRET} from '../support/app';
import type {PlatformBindings} from '../../src/core/platform/assets';
import {createAIProvider} from '../../src/core/features/assistance/provider';
import {createSourceSecurity} from '../../src/core/platform/source-security';
import {createApp} from '../support/app';
import {createDependencies} from '../support/dependencies';
import {createId} from '../../src/core/shared/ids';
import { testState } from '../support/test-state';
const platform=await getPlatformProxy<{DB:D1Database}>({configPath:'wrangler.jsonc',envFiles:['tests/support/no-local-settings.env'],persist:{path:`${testState()}/v3`},remoteBindings:false});after(()=>platform.dispose());const db=platform.env.DB;
test('BASE-ACCESS-003 public limits share durable counters and expire without retaining clear visitor IPs',async()=>{
 const now=Date.now()+600000,request=new Request('https://orbit.test/',{headers:{'CF-Connecting-IP':createId()}});const first=await publicRateLimit(db,request,now);assert.equal(first,undefined);const rows=await db.prepare('SELECT bucket FROM public_rate_limits WHERE expires_at=?').bind(now+120000).all<{bucket:string}>();assert.ok(rows.results.every(row=>!row.bucket.includes(request.headers.get('CF-Connecting-IP')!)));for(let i=1;i<300;i++)assert.equal(await publicRateLimit(db,request,now),undefined);const blocked=await publicRateLimit(db,request,now);assert.equal(blocked?.status,429);assert.ok(blocked?.headers.get('Retry-After'));assert.equal(await publicRateLimit(db,request,now+60000),undefined);
 // Unverified Slack callbacks spend their network's public budget and write no audit row per request.
 const app=createApp({database:db,assets:{fetch:async()=>new Response('test')}}),network={'CF-Connecting-IP':createId()},audits=()=>db.prepare("SELECT count(*) n FROM audit_entries WHERE action IN('slack.event-refused','slack.action-refused')").first('n'),audited=await audits();let admitted=0;
 for(;admitted<700;admitted++){const response=await app.request(`https://orbit.test/api/v1/slack/${admitted%2?'actions':'events'}`,{method:'POST',headers:network,body:''});if(response.status===429)break;assert.ok([200,401].includes(response.status),String(response.status));}
 assert.ok(admitted>=300&&admitted<700,`unverified Slack callbacks are limited per network (${admitted} admitted)`);assert.equal(await audits(),audited,'unverified Slack callbacks leave no audit rows');
});
test('BASE-SECRET-002 explicit provider configuration rejects partial inputs by variable name',()=>{
 assert.equal(createAIProvider({}),undefined);assert.throws(()=>createAIProvider({OPENAI_API_KEY:'test-secret'}),/AI_MODEL/);assert.throws(()=>createAIProvider({OPENAI_API_KEY:'test-secret',AI_MODEL:'configured'}),/AI_INPUT_COST_PER_MILLION/);assert.throws(()=>createSourceSecurity({ORBIT_ENCRYPTION_KEY:'invalid'}),/ORBIT_ENCRYPTION_KEY/);
});
test('BASE-ACCESS-004 BASE-INPUT-001 malformed authenticated JSON and cross-origin mutations fail before writing',async()=>{
 const deps=createDependencies(db),actor=createId();await deps.auth.ensureOperator({id:actor,email:`${actor}@test.invalid`,displayName:'Boundary test'});const session=await deps.auth.createSession(actor);const app=createApp({database:db,assets:{fetch:async()=>new Response('test')}});const headers={cookie:`__Host-orbit_session=${session.token}`,origin:'https://orbit.test','content-type':'application/json'};assert.equal((await app.request('https://orbit.test/api/v1/assistance/preview',{method:'POST',headers,body:'{bad'})).status,400);assert.equal((await app.request('https://orbit.test/api/v1/settings/operators',{method:'POST',headers:{...headers,origin:'https://evil.test'},body:JSON.stringify({email:'no@test.invalid',displayName:'No'})})).status,403);assert.equal(await db.prepare('SELECT id FROM operators WHERE email=?').bind('no@test.invalid').first(),null);
});

test('PUBLIC-003 BASE-SECRET-002 an installed origin reports unconfigured sign-in while partial mail credentials fail by name',async()=>{
 const installed={DB:db,AUTH_ORIGIN:'https://unconfigured.orbit.test',AUTH_LOCAL:'false',SESSION_SECRET:TEST_SESSION_SECRET,OWNER_EMAIL:'owner@orbit.test'} as PlatformBindings;
 assert.equal(identityConfig({DB:db,AUTH_ORIGIN:'https://unconfigured.orbit.test'} as PlatformBindings),null);
 assert.throws(()=>identityConfig({...installed,MAIL_FROM:'test@example.invalid'}),/SENDGRID_API_KEY/);assert.throws(()=>identityConfig({...installed,SENDGRID_API_KEY:'test-only'}),/MAIL_FROM/);
 const ask=(bindings:PlatformBindings,request:Request)=>identityResponse(request,bindings,{ownerClaimed:async()=>true});
 const fresh=await ask({DB:db,AUTH_ORIGIN:'https://unconfigured.orbit.test'} as PlatformBindings,new Request('https://unconfigured.orbit.test/signin'));assert.equal(fresh!.status,200);assert.match(await fresh!.text(),/not configured/);assert.doesNotMatch(await (await ask({DB:db} as PlatformBindings,new Request('https://unconfigured.orbit.test/signin')))!.text(),/<input/,'no credential field');
 const page=await ask(installed,new Request('https://unconfigured.orbit.test/signin'));assert.equal(page!.status,200);const html=await page!.text();assert.match(html,/Sign-in email is not available right now/);assert.doesNotMatch(html,/<input/,'no credential field without sign-in mail');
 const request=await ask(installed,new Request('https://unconfigured.orbit.test/auth/magic-link',{method:'POST',headers:{Origin:'https://unconfigured.orbit.test','content-type':'application/json','CF-Connecting-IP':'192.0.2.30'},body:JSON.stringify({email:'test@example.invalid'})}));
 assert.equal(request!.status,503);assert.deepEqual(await request!.json(),{error:'mail_unavailable'});
 assert.equal((await ask({...installed,AUTH_ORIGIN:'http://invalid.test'},new Request('http://invalid.test/signin')))!.status,503,'a deployment origin must be HTTPS');
});

test('BASE-INPUT-001 SIGNAL-004 malformed held-reply and signal review identities return400 before persistence',async()=>{
 const deps=createDependencies(db),actor=createId();await deps.auth.ensureOperator({id:actor,email:`${actor}@test.invalid`,displayName:'Review boundary'});const session=await deps.auth.createSession(actor),app=createApp({database:db,assets:{fetch:async()=>new Response('test')}}),headers={cookie:`__Host-orbit_session=${session.token}`,origin:'https://orbit.test','content-type':'application/json'};
 for(const [path,input] of [[`replies/${createId()}/link`,{}],['replies/not-an-id/link',{opportunityId:createId()}],[`unlinked/${createId()}/link`,{type:'contact',id:'invalid'}]])assert.equal((await app.request(`https://orbit.test/api/v1/sources/${path}`,{method:'POST',headers,body:JSON.stringify(input)})).status,400);assert.equal((await app.request('https://orbit.test/api/v1/signals/invalid%20source',{method:'POST',body:'{}'})).status,400);
});
