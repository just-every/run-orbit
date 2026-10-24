import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createOperatorAuth,createAuthHandler} from '@runeditrun/rer/modules/operator-auth';
import {createNativeAccounts} from '../../src/core/features/identity/accounts';
import {createNativeProofs} from '../../src/core/features/identity/proofs';
import {sessionStore} from '../../src/core/features/identity/store';
import {isolatedDatabase} from './isolated-database';
import {todayApp} from './today-workspace';
import {emailLinkSignIn,mailedIdentity} from './email-link';
import {createOrbitIdentity} from '../../src/core/features/identity';
import {TEST_SESSION_SECRET} from './worker-identity.mjs';
/** A local issuer at the network edge; admission, signatures, policy and sessions are real. */
export async function signInDomains(){
 const fixture=await isolatedDatabase(),db=fixture.db,t=await todayApp(db,{email:'synthetic-orbit-owner@example.com'}),origin='https://orbit.test',issuer='https://issuer.example.invalid',client='synthetic-orbit-client';
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
  assert.equal(tokenRequests,5);
  await auth.providers!.relink('auth');
  const invited=await t.json<any>('/api/v1/settings/operators',{body:{email:'synthetic-orbit-invited@example.com',displayName:'Synthetic invited operator'}},201);
  const peerEmail=await emailLinkSignIn(db,'synthetic-orbit-invited@example.com');
  await t.json(policy,{method:'PUT',body:{domain:'example.com',providerId:'auth'}},200);
  assert.equal(await auth.getSession(new Request(origin+'/app',{headers:{Cookie:peerEmail.cookie}})),null,'requiring a provider ends an older non-owner email session');
  const mail=mailedIdentity(db),native=createOrbitIdentity(mail.bindings,{mailSender:mail.mailSender})!;await native.auth.requestMagicLink(mail.post('/auth/magic-link'),{email:'synthetic-orbit-invited@example.com'});assert.equal(mail.sent.length,0,'a required domain cannot bypass its provider with a new email link');
  assert.ok(await emailLinkSignIn(db,'synthetic-orbit-owner@example.com'),'owner recovery email remains available under the domain requirement');
  email='synthetic-orbit-invited@example.com';subject='synthetic-orbit-invited';
  const operatorSignIn=await signIn();assert.equal(operatorSignIn.status,303);const operatorCookie=operatorSignIn.headers.getSetCookie().find(c=>c.startsWith('__Host-orbit_session='))!.split(';')[0]!;
  const operatorRequest=new Request(origin+'/app',{headers:{Cookie:operatorCookie}});assert.ok(await auth.getSession(operatorRequest));
  await t.json(`/api/v1/settings/operators/${invited.id}`,{method:'DELETE',body:{confirmed:true}},200);assert.equal(await auth.getSession(operatorRequest),null,'operator removal ends provider access on the next request');
  assert.equal((await signIn()).status,403,'removed operator cannot sign in again');

 }finally{server.closeAllConnections();await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));await fixture.dispose();}
}
