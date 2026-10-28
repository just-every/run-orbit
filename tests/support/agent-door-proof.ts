import assert from 'node:assert/strict';
import { webcrypto, randomUUID } from 'node:crypto';
import { isolatedDatabase } from './isolated-database';
import { createApp } from '../../src/core/app/app';
import { identityResponse, operatorFromRequest, requireStepUp } from '../../src/core/features/identity';
import { orbitAgentDoor, agentDoorResponse } from '../../src/core/features/agent-door';
import { orbitPeople } from '../../src/core/features/agent-door/people';
import { coreTools } from '../../src/core/features/agent-door/tools';
import { accessTools } from '../../src/core/features/agent-door/access-tools';
import { outreachTools } from '../../src/core/features/agent-door/outreach-tools';
import { signJws, policyEnvelope, autonomousPolicy } from '../../src/base/modules/agent-door/conformance/crypto.mjs';
import { snapshot } from '../../src/core/features/delegation/evidence';
import type { PlatformBindings } from '../../src/core/platform/assets';

// PENDING-BASE-2026-10-28: the pinned runner's full conformance retains failing
// assertions for native audit targets, resource error.data.code, replay admission,
// narrowing escalation fixtures and reviewer lifecycle. Do not weaken them here.
// The normal declarative journey remains the completion gate after the Base re-pin.
export async function exerciseAgentDoor(){
 const platform=await isolatedDatabase();
 try{
  const db=platform.db,origin='https://orbit.test',issuer='https://business.example.test',installationId=randomUUID(),sub=randomUUID(),kid=randomUUID(),email='owner@orbit.example.test';
  const pair=await webcrypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
  const publicKey=await webcrypto.subtle.exportKey('jwk',pair.publicKey),publicKeys={[kid]:{...publicKey,kid,alg:'ES256',use:'sig'}};
  const b={DB:db,ASSETS:{fetch:async()=>new Response('')},AUTH_ORIGIN:origin,OWNER_EMAIL:email,SETUP_TOKEN:randomUUID(),SESSION_SECRET:randomUUID()+randomUUID(),RER_OWNER_CLAIM_ISSUER:issuer,RER_OWNER_CLAIM_INSTALLATION_ID:installationId,RER_OWNER_CLAIM_APP_ORIGIN:origin,RER_OWNER_CLAIM_PUBLIC_KEYS:JSON.stringify(publicKeys),RER_BUSINESS_TRUST:JSON.stringify({v:1,issuer,audience:origin,subject:installationId,email,keys:publicKeys})} as unknown as PlatformBindings;
  const jsonRequest=(path:string,body:unknown,headers:Record<string,string>={})=>new Request(origin+path,{method:'POST',headers:{Origin:origin,'content-type':'application/json',...headers},body:JSON.stringify(body)});
  const iat=Math.floor(Date.now()/1000),claim=await signJws(pair.privateKey,kid,'rer-owner-claim+jwt',{v:1,iss:issuer,aud:origin,installationId,email,jti:randomUUID(),iat,exp:iat+300});
  const claimed=await identityResponse(jsonRequest('/auth/owner-claim',{token:claim,displayName:'Avery Seller'}),b,{ownerClaimed:async()=>false});
  assert.equal(claimed?.status,303);const cookie=claimed!.headers.get('set-cookie')!.split(';')[0];
  const nativeApp=createApp({database:db,assets:{fetch:async()=>new Response('')},authenticate:r=>operatorFromRequest(r,b),stepUp:(r,a,to)=>requireStepUp(r,b,a,to)});
  const person=async(path:string,body?:unknown,method=body===undefined?'GET':'POST')=>nativeApp.request(origin+path,{method,headers:{Origin:origin,Cookie:cookie,'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  assert.equal((await person('/api/v1/setup',{ownerName:'Avery Seller',name:'Northstar Sales',timezone:'UTC',currency:'USD',stages:'New\nQualified\nProposal'})).status,200);
  const owner=(await operatorFromRequest(new Request(origin+'/app',{headers:{Cookie:cookie}}),b))!;
  const settings=await signJws(pair.privateKey,kid,'rer-business-settings+jwt',{v:1,iss:issuer,aud:origin,sub:installationId,business:'Northstar',email,jti:randomUUID(),iat,exp:iat+300,rev:1,values:{},logo:null,team:[],owner_id:sub});
  const adoptedSettings=await agentDoorResponse(jsonRequest('/api/rer/business-settings',{settings}),b);
  assert.equal(adoptedSettings?.status,200,await adoptedSettings?.clone().text());
  assert.equal((await orbitPeople(b).sponsor({sub}))?.id,owner.operatorId);
  assert.equal(await orbitPeople(b).sponsor({sub:'email-is-not-authority'}),null);
  // Constructing the production registry validates all schemas and narrowing declarations.
  const door=orbitAgentDoor(b),tools=[...coreTools(),...accessTools(),...outreachTools(b)];
  const agent={id:randomUUID(),name:'Riley Sales Agent',specialist:'sales rep'},scopes=[...new Set([...tools.map(t=>t.scope),'events:read'])];
  const credential=async(overrides:Record<string,unknown>={})=>signJws(pair.privateKey,kid,'at+jwt',{iss:issuer,aud:origin+'/mcp',sub,email,act:{sub:agent.id,name:agent.name,specialist:agent.specialist},client_id:'native-agent-test',scope:scopes.join(' '),business:'Northstar',consent:'current-consent',jti:randomUUID(),iat,exp:iat+300,...overrides});
  let rpcId=0;
  const call=async(name:string,args:unknown,token?:string)=>{
   token??=await credential();
   const response=await door.handle(jsonRequest('/mcp',{jsonrpc:'2.0',id:++rpcId,method:'tools/call',params:{name,arguments:args,_meta:{'io.modelcontextprotocol/protocolVersion':'2026-07-28','io.modelcontextprotocol/clientCapabilities':{elicitation:{url:{}}},'io.modelcontextprotocol/clientInfo':{name:'native-orbit-test',version:'1'}}}},{Authorization:`Bearer ${token}`,Accept:'application/json, text/event-stream','MCP-Protocol-Version':'2026-07-28','Mcp-Method':'tools/call','Mcp-Name':name}));
   return{status:response!.status,body:await response!.json() as any};
  };
  const code=(r:any)=>r.body.result?._meta?.['com.runeditrun/error']?.code??r.body.error?.data?.code;
  assert.equal(code(await call('orbit.records.create',{kind:'company',fields:{name:'Not admitted'},idempotency_key:'unset'})),'policy_unset');
  assert.equal((await db.prepare('SELECT count(*) AS n FROM companies').first<{n:number}>())!.n,0);
  const context={signer:{privateKey:pair.privateKey,kid,issuer,installationId},origin,business:'Northstar',seq:0,revision:0};
  const envelope=await policyEnvelope(context,autonomousPolicy());
  const adoption=await door.handle(jsonRequest('/api/rer/agent-policy',{policy:envelope.policy}));assert.equal(adoption!.status,200);assert.deepEqual(Object.keys(await adoption!.json() as object).sort(),['adopted','door']);
  const created=await call('orbit.records.create',{kind:'company',fields:{name:'Northstar Buyer'},idempotency_key:'create-company'});
  assert.equal(created.body.result?.isError,false,JSON.stringify(created.body));
  const companyId=created.body.result.structuredContent.id;
  const replay=await call('orbit.records.create',{kind:'company',fields:{name:'Northstar Buyer'},idempotency_key:'create-company'});assert.equal(replay.body.result.structuredContent.id,companyId);
  assert.equal((await db.prepare('SELECT count(*) AS n FROM companies').first<{n:number}>())!.n,1);
  assert.equal(code(await call('orbit.records.create',{kind:'company',fields:{name:'Changed request'},idempotency_key:'create-company'})),'idempotency_conflict');
  const current=await call('orbit.records.read',{kind:'company',id:companyId,confirmExternal:true,classes:['standard'],approved:true});assert.equal(current.body.result?.isError,false,JSON.stringify(current.body));assert.equal(current.body.result.structuredContent.fields.name,'Northstar Buyer');
  const before=current.body.result.structuredContent.ref.revision;
  const update=await call('orbit.records.update',{kind:'company',id:companyId,patch:{name:'Reviewed Buyer'},expected_revision:before,idempotency_key:'edit-company'});assert.equal(update.body.result?.isError,false,JSON.stringify(update.body));
  assert.equal(code(await call('orbit.records.update',{kind:'company',id:companyId,patch:{name:'Stale edit'},expected_revision:before,idempotency_key:'stale-edit'})),'revision_conflict');
  const history=(await db.prepare("SELECT actor_type,payload_json FROM timeline_entries WHERE kind='record.updated' ORDER BY recorded_at DESC").all<{actor_type:string;payload_json:string}>()).results;
  assert.equal(history[0].actor_type,'agent');const attribution=await db.prepare("SELECT actor FROM orbit_native_attribution WHERE table_name='timeline_entries' ORDER BY rowid DESC LIMIT 1").first<{actor:string}>();assert.equal(JSON.parse(attribution!.actor).label,'Riley Sales Agent for Avery Seller');
  // A real seller handoff uses current native evidence and audience revisions.
  const settingsRead=await person('/api/v1/settings'),nativeSettings=await settingsRead.json() as any;
  assert.equal(settingsRead.status,200);
  const stage=nativeSettings.stages[0].id;
  const buyer=await call('orbit.records.create',{kind:'contact',fields:{name:'Jordan Buyer',email:'jordan@buyer.example.test',company_id:companyId},idempotency_key:'buyer-contact'});
  assert.equal(buyer.body.result?.isError,false,JSON.stringify(buyer.body));const contactId=buyer.body.result.structuredContent.id;
  const opportunity=await call('orbit.records.create',{kind:'opportunity',fields:{title:'Northstar renewal',stage_id:stage,company_id:companyId,value_cents:1250000,contact_ids:[contactId],primary_contact_id:contactId},idempotency_key:'buyer-opportunity'});
  assert.equal(opportunity.body.result?.isError,false,JSON.stringify(opportunity.body));const opportunityId=opportunity.body.result.structuredContent.id;
  const target=`opportunities/${opportunityId}/handoffs/${randomUUID()}`;
  const source=await call('orbit.handoffs.read',{target});assert.equal(source.body.result?.isError,false,JSON.stringify(source.body));
  const selected=source.body.result.structuredContent;
  const handoff={target,sourceRevision:selected.revision,audienceRevision:selected.audience.audienceRevision,content:{title:'Prepare renewal meeting',description:'Review the current opportunity before the buyer meeting.',assigneeId:owner.operatorId,dueAt:null,status:'open'},idempotency_key:'seller-handoff'};
  const saved=await call('orbit.handoffs.upsert',handoff);assert.equal(saved.body.result?.isError,false,JSON.stringify(saved.body));
  assert.deepEqual((await call('orbit.handoffs.upsert',handoff)).body.result.structuredContent,saved.body.result.structuredContent);
  assert.equal((await db.prepare('SELECT count(*) AS n FROM handoff_tasks WHERE opportunity_id=?').bind(opportunityId).first<{n:number}>())!.n,1);
  assert.equal(code(await call('orbit.handoffs.upsert',{...handoff,idempotency_key:'stale-handoff'})),'native_conflict');
  const draft=await call('orbit.drafts.create',{opportunityId,contactId,subject:'Renewal meeting',body:'Jordan, here is the agenda for our renewal discussion.',idempotency_key:'buyer-draft'});
  assert.equal(draft.body.result?.isError,false,JSON.stringify(draft.body));
  assert.equal((await db.prepare('SELECT count(*) AS n FROM outbound_messages').first<{n:number}>())!.n,0,'Preparing the seller day and draft never submits customer mail');
  // Invalid Business identities refuse before native reads; email never supplies identity.
  assert.equal((await call('orbit.records.read',{kind:'company',id:companyId},await credential({sub:'unmapped',email}))).status,401);
  assert.equal((await call('orbit.records.read',{kind:'company',id:companyId},await credential({aud:'https://elsewhere.test/mcp'}))).status,401);
  const paused=await policyEnvelope({...context,seq:1,revision:1},autonomousPolicy(),{paused:true});
  assert.equal((await door.handle(jsonRequest('/api/rer/agent-policy',{policy:paused.policy})))!.status,200);
  assert.equal(code(await call('orbit.records.update',{kind:'company',id:companyId,patch:{name:'Paused edit'},idempotency_key:'paused'})),'agents_paused');
  assert.equal((await db.prepare('SELECT name FROM companies WHERE id=?').bind(companyId).first<{name:string}>())!.name,'Reviewed Buyer');
  // Native people still operate while agent policy is paused.
  assert.equal((await person('/api/v1/records/company/'+companyId,{name:'Person still works'},'PUT')).status,200);
 }finally{await platform.dispose();}
}
