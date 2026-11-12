import assert from 'node:assert/strict';
import type {TestContext} from 'node:test';
import {identityResponse,operatorFromRequest,requireStepUp} from '../../src/core/features/identity';
import {orbitBusinessSettings} from '../../src/core/features/agent-door';
import {createApp} from '../../src/core/app/app';
import {signJws,policyEnvelope,autonomousPolicy,heldPolicy} from '../../src/base/modules/agent-door/conformance/crypto.mjs';
import {identityVars} from './worker-identity.mjs';
import {createStalledRiskFixture} from './agent-door-stalled-risk-proof';

/** Disposable signed installation for the existing browser journey; no held account or provider. */
export async function stalledRiskBrowser(context:TestContext,db:D1Database,origin:string) {
 const issuer='https://synthetic-orbit-business.example.test',installation='synthetic-orbit-risk-browser',business='synthetic-orbit-sales';
 const keys=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const publicKey=await crypto.subtle.exportKey('jwk',keys.publicKey),sign=(typ:string,claims:object)=>signJws(keys.privateKey,'test',typ,claims);
 const vars={...identityVars(origin,['synthetic-orbit-owner','brief.test'].join('@')),SETUP_TOKEN:'synthetic-orbit-setup-token'.repeat(2),RER_OWNER_CLAIM_ISSUER:issuer,RER_OWNER_CLAIM_INSTALLATION_ID:installation,
  RER_OWNER_CLAIM_APP_ORIGIN:origin,RER_OWNER_CLAIM_PUBLIC_KEYS:JSON.stringify({test:publicKey}),
  RER_BUSINESS_TRUST:JSON.stringify({v:1,issuer,audience:origin,subject:installation,keys:{test:publicKey}})};
 const bindings={...vars,DB:db,ASSETS:{fetch:async()=>new Response('asset')} as Fetcher};
 const now=Math.floor(Date.now()/1000),post=(path:string,body:object)=>new Request(origin+path,{method:'POST',headers:{Origin:origin,Host:new URL(origin).host,'Content-Type':'application/json'},body:JSON.stringify(body)});
 const claim=await sign('rer-owner-claim+jwt',{v:1,iss:issuer,aud:origin,installationId:installation,email:vars.OWNER_EMAIL,jti:crypto.randomUUID(),iat:now,exp:now+300});
 const claimed=await identityResponse(post('/auth/owner-claim',{token:claim,displayName:'Rose Owner',returnTo:'/agents'}),bindings,{ownerClaimed:async()=>false});
 assert.equal(claimed!.status,303,await claimed!.clone().text());const cookie=claimed!.headers.get('set-cookie')!.split(';')[0]!;
 const paired=await orbitBusinessSettings(bindings).handle(post('/api/rer/business-settings',{settings:await sign('rer-business-settings+jwt',{
  v:1,iss:issuer,aud:origin,sub:installation,business,email:vars.OWNER_EMAIL,jti:crypto.randomUUID(),iat:now,exp:now+300,rev:1,values:{display_name:'Synthetic sales'},logo:null,team:[],owner_id:'synthetic-orbit-owner'})}));
 assert.equal(paired!.status,200,await paired!.clone().text());
 const app=createApp({database:db,assets:bindings.ASSETS,authenticate:request=>operatorFromRequest(request,bindings),stepUp:(request,action,returnTo)=>requireStepUp(request,bindings,action,returnTo)});
 const native=async(path:string,method='GET',body?:object)=>{
  const response=await app.request(origin+path,{method,headers:{Cookie:cookie,Origin:origin,Host:new URL(origin).host,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  assert.ok(response.ok,await response.clone().text());return response.json() as Promise<any>;
 };
 await native('/api/v1/setup','POST',{ownerName:'Rose Owner',name:'Synthetic sales',timezone:'UTC',currency:'USD',stages:'Discovery\nProposal'});
 const current=Date.now();context.mock.timers.enable({apis:['Date'],now:current});
 let expected:Awaited<ReturnType<typeof createStalledRiskFixture>>;
 try {expected=await createStalledRiskFixture(context,native,current);} finally {context.mock.timers.reset();}
 const signer={privateKey:keys.privateKey,kid:'test',issuer,installationId:installation};
 let revision=0;
 return {vars,cookie,expected,
  async policy(mode:'autonomous'|'held') {const seq=++revision;return (await policyEnvelope({origin,business,seq,revision:seq,signer},mode==='held'?heldPolicy():autonomousPolicy())).policy;},
  async bearer(scope='risks:read') {const iat=Math.floor(Date.now()/1000);return sign('at+jwt',{iss:issuer,aud:origin+'/mcp',sub:'synthetic-orbit-owner',email:vars.OWNER_EMAIL,
   act:{sub:'synthetic-orbit-browser-specialist',name:'Synthetic risk specialist',specialist:'sales rep'},client_id:'synthetic-orbit-risk-browser',business,scope,
   consent:'synthetic-orbit-risk-consent',jti:crypto.randomUUID(),iat,exp:iat+300});},
 };
}
