import assert from 'node:assert/strict';
import {isolatedDatabase} from './isolated-database';
import {identityResponse, operatorFromRequest} from '../../src/core/features/identity';
import {orbitAgentDoor, orbitBusinessSettings} from '../../src/core/features/agent-door';
import {orbitPeople} from '../../src/core/features/agent-door/people';

export async function agentDoorProof() {
  const fixture = await isolatedDatabase();
  try {
    const origin='https://orbit.example.test', issuer='https://business.example.test', installation='orbit-door-test';
    const keys=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
    const publicKey=await crypto.subtle.exportKey('jwk',keys.publicKey);
    const bindings={DB:fixture.db,ASSETS:{fetch:async()=>new Response('asset')} as Fetcher,
      AUTH_ORIGIN:origin,OWNER_EMAIL:'morgan@example.test',SESSION_SECRET:'s'.repeat(64),SETUP_TOKEN:'t'.repeat(64),
      RER_OWNER_CLAIM_ISSUER:issuer,RER_OWNER_CLAIM_INSTALLATION_ID:installation,RER_OWNER_CLAIM_APP_ORIGIN:origin,RER_OWNER_CLAIM_PUBLIC_KEYS:JSON.stringify({test:publicKey}),
      RER_BUSINESS_TRUST:JSON.stringify({v:1,issuer,audience:origin,subject:installation,keys:{test:publicKey}})};
    const encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url');
    async function sign(typ:string,claims:object) {
      const body=`${encode({alg:'ES256',typ,kid:'test'})}.${encode(claims)}`;
      return body+'.'+Buffer.from(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},keys.privateKey,new TextEncoder().encode(body))).toString('base64url');
    }
    const now=Math.floor(Date.now()/1000);
    const token=await sign('rer-owner-claim+jwt',{v:1,iss:issuer,aud:origin,installationId:installation,email:bindings.OWNER_EMAIL,jti:crypto.randomUUID(),iat:now,exp:now+300});
    const post=(path:string,body:object)=>new Request(origin+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify(body)});
    const ownerOptions={ownerClaimed:async()=>Boolean(await fixture.db.prepare('SELECT 1 FROM owner_bootstrap').first())};
    assert.equal((await identityResponse(post('/auth/owner-claim',{token:bindings.SETUP_TOKEN}),bindings,ownerOptions))!.status,403);
    const claimed=await identityResponse(post('/auth/owner-claim',{token,displayName:'Morgan Lee',returnTo:'/setup'}),bindings,ownerOptions);
    assert.equal(claimed!.status,303);
    const cookie=claimed!.headers.get('set-cookie')!.split(';')[0]!;
    const owner=await operatorFromRequest(new Request(origin+'/app',{headers:{Cookie:cookie}}),bindings);
    assert.ok(owner);
    const settings=orbitBusinessSettings(bindings), people=orbitPeople(bindings);
    assert.equal(await people.sponsor({sub:'business-owner'}),null);
    const document={v:1,iss:issuer,aud:origin,sub:installation,business:'door-company',email:bindings.OWNER_EMAIL,jti:crypto.randomUUID(),iat:now,exp:now+300,rev:1,values:{display_name:'Door Company'},logo:null,team:[],owner_id:'business-owner'};
    const applied=await settings.handle(post('/api/rer/business-settings',{settings:await sign('rer-business-settings+jwt',document)}));
    assert.equal(applied!.status,200,await applied!.text());
    assert.equal((await people.sponsor({sub:'business-owner'}))?.id,owner.operatorId);
    assert.equal(await people.sponsor({sub:owner.email}),null,'token email never supplies Business authority');
    const door=orbitAgentDoor(bindings);
    const metadata=await door.handle(new Request(origin+'/.well-known/oauth-protected-resource/mcp'));
    assert.equal((await metadata!.json() as {resource:string}).resource,origin+'/mcp');
    for(const version of ['2026-07-28','2025-11-25']) {
      const bearer=await sign('at+jwt',{iss:issuer,aud:origin+'/mcp',sub:'business-owner',email:owner.email,act:{sub:'seller-assistant',name:'Ari'},client_id:'door-test',business:'door-company',scope:'events:read',consent:'consent-test',jti:crypto.randomUUID(),iat:now,exp:now+300});
      const call=new Request(origin+'/mcp',{method:'POST',headers:{Authorization:'Bearer '+bearer,'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':version,'MCP-Method':'initialize'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{_meta:{'io.modelcontextprotocol/protocolVersion':version},protocolVersion:version,capabilities:{},clientInfo:{name:'door-test',version:'1'}}})});
      const response=await door.handle(call);
      assert.equal(response!.status,200);
      assert.equal((await response!.json() as {result:{protocolVersion:string}}).result.protocolVersion,version);
    }
    await fixture.db.prepare('UPDATE operators SET email=? WHERE id=?').bind('renamed@example.test',owner.operatorId).run();
    assert.equal((await people.sponsor({sub:'business-owner'}))?.id,owner.operatorId);
    await fixture.db.prepare("UPDATE operators SET status='removed' WHERE id=?").bind(owner.operatorId).run();
    assert.equal(await people.sponsor({sub:'business-owner'}),null);
  } finally {await fixture.dispose();}
}
