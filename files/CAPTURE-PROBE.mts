import assert from 'node:assert/strict';
import {isolatedDatabase} from '/workspace/orbit-f157/tests/support/isolated-database.ts';
import {agentDoorCaptureSourceProof} from '/workspace/orbit-f157/tests/support/agent-door-capture-source-proof.ts';
import {orbitAgentDoor,orbitBusinessSettings} from '/workspace/orbit-f157/src/core/features/agent-door/index.ts';
import {identityResponse,operatorFromRequest} from '/workspace/orbit-f157/src/core/features/identity/index.ts';
import {signJws,policyEnvelope,autonomousPolicy} from '/workspace/orbit-f157/src/base/modules/agent-door/conformance/crypto.mjs';
const fixture=await isolatedDatabase();
try{
 const origin='https://orbit.example.test',issuer='https://business.example.test',installation='synthetic-orbit-capture-probe';
 const keys=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const publicKey=await crypto.subtle.exportKey('jwk',keys.publicKey),email=['synthetic-orbit-owner','example.test'].join('@');
 const bindings={DB:fixture.db,ASSETS:{fetch:async()=>new Response('asset')},AUTH_ORIGIN:origin,OWNER_EMAIL:email,SESSION_SECRET:'s'.repeat(64),SETUP_TOKEN:'t'.repeat(64),ORBIT_ENCRYPTION_KEY:'5c'.repeat(32),
  RER_OWNER_CLAIM_ISSUER:issuer,RER_OWNER_CLAIM_INSTALLATION_ID:installation,RER_OWNER_CLAIM_APP_ORIGIN:origin,RER_OWNER_CLAIM_PUBLIC_KEYS:JSON.stringify({test:publicKey}),RER_BUSINESS_TRUST:JSON.stringify({v:1,issuer,audience:origin,subject:installation,keys:{test:publicKey}})};
 const post=(path:string,body:object)=>new Request(origin+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify(body)});
 const claimed=await identityResponse(post('/auth/bootstrap',{token:bindings.SETUP_TOKEN,displayName:'Synthetic owner',returnTo:'/setup'}),bindings,{ownerClaimed:async()=>Boolean(await fixture.db.prepare('SELECT 1 FROM owner_bootstrap').first())});
 assert.equal(claimed!.status,303);
 const cookie=claimed!.headers.get('set-cookie')!.split(';')[0]!;
 const owner=await operatorFromRequest(new Request(origin+'/app',{headers:{Cookie:cookie}}),bindings);assert.ok(owner);
 const now=Math.floor(Date.now()/1000);
 const document={v:1,iss:issuer,aud:origin,sub:installation,business:'synthetic-orbit-business',email,jti:crypto.randomUUID(),iat:now,exp:now+300,rev:1,values:{display_name:'Synthetic Capture company'},logo:null,team:[],owner_id:'business-owner'};
 const settings=await orbitBusinessSettings(bindings).handle(post('/api/rer/business-settings',{settings:await signJws(keys.privateKey,'test','rer-business-settings+jwt',document)}));assert.equal(settings!.status,200);
 const door=orbitAgentDoor(bindings);let seq=0;
 const adopt=async(policy:ReturnType<typeof autonomousPolicy>)=>{
  const envelope=await policyEnvelope({origin,business:'synthetic-orbit-business',seq,revision:seq,signer:{privateKey:keys.privateKey,kid:'test',issuer,installationId:installation}},policy);
  const response=await door.handle(post('/api/rer/agent-policy',{policy:envelope.policy}));assert.equal(response!.status,200);seq++;
 };
 const businessCall=async(name:string,args:Record<string,unknown>,overrides={},method='tools/call',rpcId=1)=>{
  const issued=Math.floor(Date.now()/1000);
  const bearer=await signJws(keys.privateKey,'test','at+jwt',{iss:issuer,aud:origin+'/mcp',sub:'business-owner',email,act:{sub:'synthetic-orbit-capture-agent',name:'Synthetic Capture assistant'},client_id:'synthetic-orbit-probe',business:'synthetic-orbit-business',scope:'capture:read capture:write',consent:'synthetic-orbit-consent',jti:crypto.randomUUID(),iat:issued,exp:issued+300,...overrides});
  const response=await door.handle(new Request(origin+'/mcp',{method:'POST',headers:{Authorization:'Bearer '+bearer,'Content-Type':'application/json','MCP-Protocol-Version':'2026-07-28','MCP-Method':method,'MCP-Name':name},body:JSON.stringify({jsonrpc:'2.0',id:rpcId,method,params:{name,arguments:args,_meta:{'io.modelcontextprotocol/protocolVersion':'2026-07-28'}}})}));
  return {status:response!.status,body:await response!.json()};
 };
 await agentDoorCaptureSourceProof({bindings,door,cookie,reviewerCookie:cookie,ownerId:owner.operatorId,adopt,businessCall});
 console.log('PROBE SURFACE-005 provider-response: native MCP sync, token refusal, gated replay and native reconnect -> PASS');
}finally{await fixture.dispose();}
