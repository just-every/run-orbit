import assert from 'node:assert/strict';
import {Hono} from 'hono';
import {nativeDelegationRoutes} from '../../src/core/features/delegation/native';
import {delegationRoutes} from '../../src/core/features/delegation/routes';
import {operatorFromRequest,requireStepUp} from '../../src/core/features/identity';
import {challenge} from '../../src/core/features/delegation/token';
import {orbitAgentDoor} from '../../src/core/features/agent-door';
import type {PlatformBindings} from '../../src/core/platform/assets';

/** Retained credentials are obtained through actual native consent and PKCE. */
export async function localAgentCredentialProof(bindings:PlatformBindings,cookie:string,opportunityId:string,foreignCompanyId:string,setPolicy:(mode:'autonomous'|'held')=>Promise<void>) {
 const origin=bindings.AUTH_ORIGIN!,client='seller-client-'+crypto.randomUUID(),callback='https://assistant.example.test/callback',verifier=crypto.randomUUID()+crypto.randomUUID();
 const app=new Hono();app.route('/delegation',nativeDelegationRoutes(bindings.DB,request=>operatorFromRequest(request,bindings),(request,action,returnTo)=>requireStepUp(request,bindings,action,returnTo)));app.route('/api/delegation/v1',delegationRoutes(bindings.DB));
 const form=(path:string,body:Record<string,string>)=>app.request(origin+path,{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(body)});
 assert.equal((await form('/delegation/clients',{id:client,redirect_uri:callback})).status,303);
 const consent=await form('/delegation/authorize',{client_id:client,redirect_uri:callback,response_type:'code',state:crypto.randomUUID(),code_challenge:await challenge(verifier),code_challenge_method:'S256',account_id:'workspace',scope:'crm.evidence.read crm.handoff.write',targets:JSON.stringify(['opportunities/'+opportunityId])});
 assert.equal(consent.status,303,await consent.clone().text());
 const code=new URL(consent.headers.get('location')!).searchParams.get('code')!;
 const exchanged=await form('/api/delegation/v1/token',{grant_type:'authorization_code',client_id:client,redirect_uri:callback,code,code_verifier:verifier});assert.equal(exchanged.status,200);
 const credential=await exchanged.json() as {access_token:string};
 const door=orbitAgentDoor(bindings);
 async function call(name:string,args:object) {
  const response=await door.handle(new Request(origin+'/mcp',{method:'POST',headers:{Authorization:'Bearer '+credential.access_token,'Content-Type':'application/json','MCP-Protocol-Version':'2026-07-28','MCP-Method':'tools/call','MCP-Name':name},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args,_meta:{'io.modelcontextprotocol/protocolVersion':'2026-07-28'}}})}));
  return {status:response!.status,body:await response!.json() as any};
 }
 const selected=await call('orbit.records.read',{kind:'opportunity',id:opportunityId});assert.equal(selected.status,200);assert.equal(selected.body.result.structuredContent.ref.id,opportunityId);
 const foreign=await call('orbit.records.read',{kind:'company',id:foreignCompanyId});assert.equal(foreign.body.result._meta['com.runeditrun/error'].code,'resource_unavailable');
 const absent=await call('orbit.records.read',{kind:'opportunity',id:'missing'});assert.equal(absent.body.result._meta['com.runeditrun/error'].code,'resource_unavailable');
 async function resource(uri:string) {
  const response=await door.handle(new Request(origin+'/mcp',{method:'POST',headers:{Authorization:'Bearer '+credential.access_token,'Content-Type':'application/json','MCP-Protocol-Version':'2026-07-28','MCP-Method':'resources/read','MCP-Name':uri},body:JSON.stringify({jsonrpc:'2.0',id:2,method:'resources/read',params:{uri,_meta:{'io.modelcontextprotocol/protocolVersion':'2026-07-28'}}})}));
  const text=await response!.text();return {status:response!.status,text,body:JSON.parse(text)};
 }
 const selectedUri='orbit://records/opportunity/'+opportunityId;
 const foreignUri='orbit://records/company/'+foreignCompanyId,missingUri='orbit://records/company/synthetic-orbit-missing';
 assert.ok(await bindings.DB.prepare('SELECT id FROM companies WHERE id=?').bind(foreignCompanyId).first(),'the unselected company really exists');
 assert.equal(await bindings.DB.prepare('SELECT id FROM companies WHERE id=?').bind('synthetic-orbit-missing').first(),null);
 const nativeState=async()=>Promise.all(['companies','contacts','opportunities','timeline_entries','handoff_tasks','record_mail_drafts','record_mail_outbound_messages'].map(async table=>[table,(await bindings.DB.prepare('SELECT * FROM '+table).all()).results.map(row=>JSON.stringify(row)).sort()]));
 const beforeResources=await nativeState();
 for(const mode of ['autonomous','held'] as const) {
  await setPolicy(mode);
  const allowed=await resource(selectedUri);
  assert.equal(allowed.status,200);assert.equal(allowed.body.error,undefined);
  assert.equal(allowed.body.result.contents.length,1);
  assert.equal(allowed.body.result.contents[0].uri,selectedUri);
  assert.equal(JSON.parse(allowed.body.result.contents[0].text).ref.id,opportunityId,'the selected native grant can read its resource');
  const decision=allowed.body.result._meta['com.runeditrun/decision'];
  assert.equal(decision.disposition,mode==='held'?'review':'autonomous');
  const audit=await bindings.DB.prepare('SELECT row FROM agent_door_audit WHERE id=?').bind(decision.id).first<{row:string}>();
  assert.ok(audit,'the permitted resource read retains its decision audit');
  assert.equal(JSON.parse(audit.row).resource,selectedUri);assert.equal(JSON.parse(audit.row).outcome,'done');
  const review=allowed.body.result._meta['com.runeditrun/review'];
  if(mode==='held') {
   assert.ok(review?.id,'held policy retains the legitimate completed-read review');
   assert.equal(await bindings.DB.prepare('SELECT state FROM agent_door_reviews WHERE id=?').bind(review.id).first('state'),'open');
   assert.equal(JSON.parse(audit.row).review.id,review.id);
  } else assert.equal(review,undefined);
  const unselected=await resource(foreignUri),missing=await resource(missingUri);
  assert.equal(unselected.status,200);assert.equal(missing.status,unselected.status);
  assert.equal(unselected.text,missing.text,mode+': an existing unselected company and a missing company have identical complete public bodies');
  assert.deepEqual(unselected.body,{jsonrpc:'2.0',id:2,error:{code:-32602,message:'Resource unavailable',data:{code:'resource_unavailable'}}});
  assert.equal(unselected.body.error.data.code,'resource_unavailable');
  assert.equal(unselected.body.result,undefined,'a refused resource exposes no content or review receipt');
  assert.deepEqual(await nativeState(),beforeResources,'resource reads and refusals leave native records and write effects unchanged');
 }
 assert.equal((await call('orbit.records.update',{kind:'opportunity',id:opportunityId,fields:{title:'Not authorized by the retained credential'},idempotency_key:'local-write-denied'})).status,403);
 assert.equal((await call('orbit.drafts.read',{id:'missing'})).status,403,'selected handoff authority never becomes draft or mail authority');
 const identity=await app.request(origin+'/api/delegation/v1/identity',{headers:{Authorization:'Bearer '+credential.access_token}});assert.equal(identity.status,200);
 const grant=(await identity.json() as {grantId:string}).grantId;
 assert.equal((await form('/delegation/grants/'+grant+'/revoke',{})).status,303);
 assert.equal((await call('orbit.records.read',{kind:'opportunity',id:opportunityId})).status,401,'native revocation stops the next shared-door call');
 const revokedResource=await resource(selectedUri);assert.equal(revokedResource.status,401);assert.equal(revokedResource.body.result,undefined,'revocation also stops the previously readable resource');
 assert.deepEqual(await nativeState(),beforeResources,'scope and revocation refusals cannot change native records or produce write effects');
}
