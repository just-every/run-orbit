import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createOperatorAuth,createAuthHandler} from '@runeditrun/rer/modules/operator-auth';
import {createNativeAccounts} from '../../src/core/features/identity/accounts';
import {createNativeProofs} from '../../src/core/features/identity/proofs';
import {sessionStore} from '../../src/core/features/identity/store';
import type {TodayApp} from './today-workspace';
import {emailLinkSignIn,mailedIdentity} from './email-link';
import {identityResponse} from '../../src/core/features/identity';
import {TEST_SESSION_SECRET} from './worker-identity.mjs';
/** A local issuer at the network edge; admission, signatures, policy and sessions are real. */
export async function requireSignInDomains(db:D1Database,t:TodayApp){
 const origin='https://orbit.test',issuer='https://issuer.example.invalid',client='synthetic-orbit-client';
 const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const jwk={...await crypto.subtle.exportKey('jwk',keys.publicKey),kid:'synthetic-orbit-signing',alg:'RS256',use:'sig'};
 const encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url');
 let nonce='',email='synthetic-orbit-owner@example.com',verified=true,subject='synthetic-orbit-operator',tokenRequests=0;
 const server=createServer(async(request,response)=>{response.setHeader('Content-Type','application/json');
  if(request.url==='/.well-known/openid-configuration')return response.end(JSON.stringify({issuer,authorization_endpoint:issuer+'/authorize',token_endpoint:issuer+'/token',jwks_uri:issuer+'/jwks',response_types_supported:['code'],id_token_signing_alg_values_supported:['RS256'],token_endpoint_auth_methods_supported:['client_secret_post']}));
  if(request.url==='/jwks')return response.end(JSON.stringify({keys:[jwk]}));
  if(request.url==='/token'){tokenRequests++;request.resume();const now=Math.floor(Date.now()/1000),body=encode({alg:'RS256',kid:jwk.kid,typ:'JWT'})+'.'+encode({iss:issuer,sub:subject,aud:client,iat:now,exp:now+300,nonce,email,email_verified:verified});const signature=Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,new TextEncoder().encode(body))).toString('base64url');return response.end(JSON.stringify({id_token:body+'.'+signature,access_token:'synthetic-orbit-access',token_type:'Bearer'}));}
  response.statusCode=404;response.end('{}');
 });
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();assert.ok(address&&typeof address!=='string');const edge=`http://127.0.0.1:${address.port}`;
 try{
  await db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(t.actor).run();
  const store=sessionStore(db,{devAdmitted:async()=>false}),accounts=createNativeAccounts(store,{clock:Date.now});
  const auth=createOperatorAuth({db,accounts,proofs:createNativeProofs(store),clientIp:()=> '192.0.2.10',config:{origin,OWNER_EMAIL:email,SESSION_SECRET:TEST_SESSION_SECRET,OIDC_TRANSACTION_SECRET:'synthetic-orbit-transaction-secret-0123456789',providers:[{id:'auth',preset:'legacy-rs256',issuer,clientId:client,tokenAuthMethod:'client_secret_post',clientSecret:'synthetic-orbit-client-secret',endpointPins:{authorization:issuer+'/authorize',token:issuer+'/token',jwks:issuer+'/jwks'}}]},fetch:async(input,init)=>{const url=new URL(String(input));assert.equal(url.origin,issuer);assert.equal(init?.redirect,'manual');const result=await fetch(edge+url.pathname,init);return new Response(result.body,{status:result.status,headers:result.headers});}});
  await auth.providers!.relink('auth');
  await db.prepare('UPDATE identity_settings SET idp_sign_in=1 WHERE id=1').run();
  const policy='/api/v1/settings/sign-in-policy';
  await t.json(policy,{method:'PUT',body:{domain:'example.com',providerId:'auth'}},200);
  assert.deepEqual((await t.json<any>(policy)).policies,[{domain:'example.com',provider_id:'auth'}]);
  const handler=createAuthHandler(auth);
  async function signIn(){const begin=await handler(new Request(origin+'/auth/oidc/auth/start',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams()}));assert.ok(begin);assert.equal(begin.status,303);const authorize=new URL(begin.headers.get('location')!);nonce=authorize.searchParams.get('nonce')!;assert.equal(authorize.searchParams.get('redirect_uri'),origin+'/auth/oidc/auth/callback');const callback=origin+'/auth/oidc/auth/callback?'+new URLSearchParams({state:authorize.searchParams.get('state')!,code:'synthetic-orbit-code'});const result=await handler(new Request(callback,{headers:{Cookie:begin.headers.get('set-cookie')!.split(';')[0]!,Origin:origin}}));assert.ok(result);return result;}
  const admitted=await signIn();assert.equal(admitted.status,303,await admitted.clone().text());const sessionCookie=admitted.headers.getSetCookie().find(c=>c.startsWith('__Host-orbit_session='))!.split(';')[0]!;
  const request=new Request(origin+'/app',{headers:{Cookie:sessionCookie}});assert.ok(await auth.getSession(request));
  verified=false;assert.equal((await signIn()).status,403,'unverified email is refused');verified=true;
  email='uninvited@example.com';subject='synthetic-orbit-uninvited';assert.equal((await signIn()).status,403,'uninvited identity is refused');
  email='synthetic-orbit-owner@example.com';subject='synthetic-orbit-operator';
  // Existing binding cannot substitute a different verified email, even when no other operator has it.
  email='changed@example.com';assert.equal((await signIn()).status,403,'bound subject still needs matching email');email='synthetic-orbit-owner@example.com';
  await t.json(policy,{method:'PUT',body:{domain:'example.com',providerId:null}},200);assert.equal(await auth.getSession(request),null,'policy changes fence old provider sessions');
  const linked=await signIn();assert.equal(linked.status,303);const linkedCookie=linked.headers.getSetCookie().find(c=>c.startsWith('__Host-orbit_session='))!.split(';')[0]!;
  await auth.providers!.unlink('auth');assert.equal(await auth.getSession(new Request(origin+'/app',{headers:{Cookie:linkedCookie}})),null,'unlink ends access on the next request');
  assert.ok(await emailLinkSignIn(db,email),'email links remain available');

  await auth.providers!.relink('auth');
  const invited=await t.json<any>('/api/v1/settings/operators',{body:{email:'synthetic-orbit-invited@example.com',displayName:'Synthetic invited operator'}},201);
  const peerEmail=await emailLinkSignIn(db,'synthetic-orbit-invited@example.com');
  const mail=mailedIdentity(db,origin,{OWNER_EMAIL:'synthetic-orbit-owner@example.com'});
  async function emailDoor(request:Request){const response=await identityResponse(request,mail.bindings,{mailSender:mail.mailSender,ownerClaimed:async()=>true});assert.ok(response);return response;}
  const protectedRoute=(cookie='')=>t.app.request(origin+'/api/v2/access/class',{headers:{Cookie:cookie}});
  // Recovery is the email form on Base's sign-in page after an unavailable provider.
  const recovery=await emailDoor(new Request(origin+'/signin?notice=oidc_provider_unavailable'));
  assert.equal(recovery.status,200);assert.match(await recovery.text(),/<form[^>]+action="\/auth\/magic-link"/);
  const pendingEmail=await emailDoor(mail.post('/auth/magic-link',{json:{email:'synthetic-orbit-invited@example.com'}}));assert.equal(pendingEmail.status,202);
  const pendingLink=mail.linkIn(mail.sent.at(-1));assert.ok(pendingLink);

  await t.json(policy,{method:'PUT',body:{domain:'example.com',providerId:'auth'}},200);
  assert.equal(await auth.getSession(new Request(origin+'/app',{headers:{Cookie:peerEmail.cookie}})),null,'requiring a provider ends an older non-owner email session');
  assert.equal((await protectedRoute(peerEmail.cookie)).status,401,'the protected API rejects an older required-domain email session');
  const sentBefore=mail.sent.length;
  for(const request of [mail.post('/auth/magic-link',{json:{email:'synthetic-orbit-invited@example.com'}}),mail.post('/auth/magic-link',{form:{email:'synthetic-orbit-invited@example.com',returnTo:'/app'}})]){
   const result=await emailDoor(request);assert.equal(result.status,request.headers.get('content-type')==='application/json'?202:303);
   assert.equal(result.headers.get('set-cookie'),null,'neither magic link nor email recovery issues a session cookie');
   assert.equal(mail.sent.length,sentBefore,'required-domain non-owners receive no email proof');
   assert.equal((await protectedRoute()).status,401,'the protected API refuses both email paths');
  }
  const stale=await emailDoor(mail.post('/auth/confirm',{form:{token:new URL(pendingLink).searchParams.get('token')!}}));
  assert.equal(stale.status,403,'a proof issued before the domain requirement cannot bypass it');assert.equal(stale.headers.get('set-cookie'),null);
  assert.equal((await protectedRoute()).status,401);
  async function admittedEmail(address:string,recovery=false){
   const requested=await emailDoor(mail.post('/auth/magic-link',recovery?{form:{email:address,returnTo:'/app'}}:{json:{email:address,returnTo:'/app'}}));assert.equal(requested.status,recovery?303:202);
   const link=mail.linkIn(mail.sent.at(-1));assert.ok(link);const preview=await emailDoor(new Request(link));assert.equal(preview.status,200);assert.equal(preview.headers.get('set-cookie'),null);
   const confirmed=await emailDoor(mail.post('/auth/confirm',{form:{token:new URL(link).searchParams.get('token')!}}));assert.equal(confirmed.status,303);
   const cookie=confirmed.headers.getSetCookie().find(value=>value.startsWith('__Host-orbit_session='))?.split(';')[0];assert.ok(cookie);
   assert.ok(await auth.getSession(new Request(origin+'/app',{headers:{Cookie:cookie}})));assert.equal((await protectedRoute(cookie)).status,200);
  }
  await admittedEmail('synthetic-orbit-owner@example.com',true);
  await t.json('/api/v1/settings/operators',{body:{email:'synthetic-orbit-unrestricted@elsewhere.test',displayName:'Synthetic unrestricted operator'}},201);
  await admittedEmail('synthetic-orbit-unrestricted@elsewhere.test');
  email='synthetic-orbit-invited@example.com';subject='synthetic-orbit-invited';
  const operatorSignIn=await signIn();assert.equal(operatorSignIn.status,303);const operatorCookie=operatorSignIn.headers.getSetCookie().find(c=>c.startsWith('__Host-orbit_session='))!.split(';')[0]!;
  const operatorRequest=new Request(origin+'/app',{headers:{Cookie:operatorCookie}});assert.ok(await auth.getSession(operatorRequest));assert.equal((await protectedRoute(operatorCookie)).status,200,'the selected local OIDC issuer admits the same required-domain operator');
  await t.json(`/api/v1/settings/operators/${invited.id}`,{method:'DELETE',body:{confirmed:true}},200);assert.equal(await auth.getSession(operatorRequest),null,'operator removal ends provider access on the next request');
  assert.equal((await signIn()).status,403,'removed operator cannot sign in again');

 }finally{server.closeAllConnections();await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
}
