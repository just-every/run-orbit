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
import { emailLinkSignIn } from './email-link';
import { random } from '../../src/core/features/delegation/protocol';
import { challenge } from '../../src/core/features/delegation/token';
import { injectionArgs } from '../../src/base/modules/agent-door/conformance/injection.mjs';
import { auditRows } from '../../src/base/modules/agent-door/conformance/audit-pages.mjs';

// PENDING-SEED-2026-10-28: the full declarative journey still lacks coverage of
// every declared tool/class and native grant-subset fixtures. Main's ct clauses
// remain authoritative; these native assertions exercise the published 0.2.87
// fixes without waiving full production conformance.
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
  const resource=async(uri:string,token?:string)=>{
   token??=await credential();
   const response=await door.handle(jsonRequest('/mcp',{jsonrpc:'2.0',id:++rpcId,method:'resources/read',params:{uri,_meta:{'io.modelcontextprotocol/protocolVersion':'2026-07-28'}}},{Authorization:`Bearer ${token}`,Accept:'application/json, text/event-stream','MCP-Protocol-Version':'2026-07-28','Mcp-Method':'resources/read','Mcp-Name':uri}));
   return{status:response!.status,body:await response!.json() as any};
  };
  const adopt=async(document:ReturnType<typeof autonomousPolicy>,options:Record<string,unknown>={})=>{
   const next=await policyEnvelope(context,document,options);
   const response=await door.handle(jsonRequest('/api/rer/agent-policy',{policy:next.policy}));
   assert.equal(response!.status,200,await response!.clone().text());context.seq=next.payload.seq;context.revision=next.payload.revision;
  };
  const latestAudit=async(key:string)=>JSON.parse((await db.prepare('SELECT row FROM agent_door_audit WHERE json_extract(row,\'$.idempotency_key\')=? ORDER BY sequence DESC LIMIT 1').bind(key).first<{row:string}>())!.row);
  assert.equal(code(await call('orbit.records.create',{kind:'company',fields:{name:'Not admitted'},idempotency_key:'unset'})),'policy_unset');
  assert.equal((await db.prepare('SELECT count(*) AS n FROM companies').first<{n:number}>())!.n,0);
  const context={signer:{privateKey:pair.privateKey,kid,issuer,installationId},origin,business:'Northstar',seq:0,revision:0};
  const envelope=await policyEnvelope(context,autonomousPolicy());
  const adoption=await door.handle(jsonRequest('/api/rer/agent-policy',{policy:envelope.policy}));assert.equal(adoption!.status,200);assert.deepEqual(Object.keys(await adoption!.json() as object).sort(),['adopted','door']);
  context.seq=envelope.payload.seq;context.revision=envelope.payload.revision;
  const created=await call('orbit.records.create',{kind:'company',fields:{name:'Northstar Buyer'},idempotency_key:'create-company'});
  assert.equal(created.body.result?.isError,false,JSON.stringify(created.body));
  const companyId=created.body.result.structuredContent.id;
  const replay=await call('orbit.records.create',{kind:'company',fields:{name:'Northstar Buyer'},idempotency_key:'create-company'});assert.equal(replay.body.result.structuredContent.id,companyId);
  assert.equal((await db.prepare('SELECT count(*) AS n FROM companies').first<{n:number}>())!.n,1);
  assert.equal(code(await call('orbit.records.create',{kind:'company',fields:{name:'Changed request'},idempotency_key:'create-company'})),'idempotency_conflict');
  const current=await call('orbit.records.read',{kind:'company',id:companyId,confirmExternal:true,classes:['standard'],approved:true});assert.equal(current.body.result?.isError,false,JSON.stringify(current.body));assert.equal(current.body.result.structuredContent.fields.name,'Northstar Buyer');
  const before=current.body.result.structuredContent.ref.revision;
  const update=await call('orbit.records.update',{kind:'company',id:companyId,patch:{name:'Reviewed Buyer'},expected_revision:before,idempotency_key:'edit-company'});assert.equal(update.body.result?.isError,false,JSON.stringify(update.body));
  // BASE-AGENT-009: v2 records the resolved visible native identity, not a caller label.
  assert.deepEqual((await latestAudit('edit-company')).resource,{kind:'company',id:companyId});
  assert.deepEqual((await call('orbit.records.update',{kind:'company',id:companyId,patch:{name:'Reviewed Buyer'},expected_revision:before,idempotency_key:'edit-company'})).body.result.structuredContent,update.body.result.structuredContent,'A successful edit replay survives the revision advanced by its own effect');
  // The installed conformance algorithm refreshes read-only revision sources
  // before its separate injected write, rather than replaying the stale read.
  const readStep={id:'read-company',tool:'orbit.records.read',args:{kind:'company',id:companyId,fields:['name']}};
  const injectedStep={id:'update-company',tool:'orbit.records.update',args:{kind:'company',id:companyId,patch:{name:'Reviewed Buyer'},expected_revision:{$from:'read-company',pointer:'/ref/revision'}},inject:{confirmExternal:true,classes:['standard'],approved:true}};
  const outputs=new Map([[readStep.id,current.body.result.structuredContent]]);
  const injected=await injectionArgs({surface:{journey:[readStep,injectedStep],tools:tools.map(t=>({name:t.name,readOnly:t.readOnly}))},
   args:(step:any,values:Map<string,any>)=>({...step.args,...(step===injectedStep?{expected_revision:values.get(readStep.id).ref.revision,idempotency_key:'fresh-injection'}:{})}),
   proof:async()=>({}),tool:async(name:string,args:unknown)=>{const answer=await call(name,args);return{status:answer.status,result:answer.body.result};},
   resolve:(value:unknown)=>value},injectedStep,outputs);
  assert.notEqual(injected.expected_revision,before,'The injection uses the revision after the original native effect');
  const injection=await call('orbit.records.update',injected);assert.equal(injection.body.result.isError,false,JSON.stringify(injection.body));
  assert.deepEqual((await latestAudit('fresh-injection')).classes,[{class:'standard',facts:{measure:1}}]);
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
  // A real retained delegation credential must not disclose an unselected native
  // target through the new attribution hook before its selection fence runs.
  const nativeForm=(path:string,body:Record<string,string>)=>nativeApp.request(origin+path,{method:'POST',headers:{Origin:origin,Cookie:cookie},body:new URLSearchParams(body)});
  const clientId='native-agent-target-reader',redirectUri='https://native-reader.example.test/callback',verifier=random();
  assert.equal((await nativeForm('/delegation/clients',{id:clientId,redirect_uri:redirectUri})).status,303);
  const consent=await nativeForm('/delegation/authorize',{client_id:clientId,redirect_uri:redirectUri,response_type:'code',state:random(),code_challenge:await challenge(verifier),code_challenge_method:'S256',account_id:'workspace',scope:'crm.evidence.read',targets:JSON.stringify([`opportunities/${opportunityId}`])});assert.equal(consent.status,303);
  const authorizationCode=new URL(consent.headers.get('Location')!).searchParams.get('code')!;
  const exchange=await nativeApp.request(origin+'/api/delegation/v1/token',{method:'POST',body:new URLSearchParams({grant_type:'authorization_code',client_id:clientId,redirect_uri:redirectUri,code:authorizationCode,code_verifier:verifier})});assert.equal(exchange.status,200);
  const localToken=(await exchange.json() as {access_token:string}).access_token;
  const localRead=await call('orbit.records.read',{kind:'opportunity',id:opportunityId,fields:['title']},localToken);assert.equal(localRead.body.result?.isError,false,JSON.stringify(localRead.body));
  const outside=await call('orbit.records.read',{kind:'company',id:companyId,fields:['name']},localToken);assert.equal(code(outside),'not_found');
  const outsideAudit=JSON.parse((await db.prepare("SELECT row FROM agent_door_audit WHERE json_extract(row,'$.tool')='orbit.records.read' ORDER BY sequence DESC LIMIT 1").first<{row:string}>())!.row);assert.equal(outsideAudit.resource,null);assert.equal(outsideAudit.code,'not_found');
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
  const nativeDraft=await person('/api/v1/drafts/'+draft.body.result.structuredContent.id);assert.equal(nativeDraft.status,200);
  const savedDraft=(await nativeDraft.json() as any).draft;
  assert.equal(savedDraft.authorId,owner.operatorId,'Native permissions retain the sponsoring operator ID');
  assert.equal(savedDraft.authorLabel,'Riley Sales Agent for Avery Seller','Draft history names the agent preparer and sponsor separately');
  assert.equal((await db.prepare('SELECT count(*) AS n FROM outbound_messages').first<{n:number}>())!.n,0,'Preparing the seller day and draft never submits customer mail');
  // BASE-AGENT-003: resource refusals always expose their machine code in data.
  const absent=await resource('orbit://records/company/missing');assert.equal(code(absent),'resource_unavailable');assert.equal(absent.body.result,undefined);
  const noReadScope=await resource(`orbit://records/company/${companyId}`,await credential({scope:'events:read'}));assert.equal(noReadScope.status,403);assert.equal(code(noReadScope),'insufficient_scope');
  // BASE-AGENT-005: the real native access grant's self-widening path refuses
  // before creating a grant. Revoke-only tools still owe grant-subset fixtures.
  const grantArgs={subjectId:owner.operatorId,resourceType:'company',resourceId:companyId,actions:['graph.read'],fields:['name'],purpose:'Self grant must refuse',expiresAt:null,idempotency_key:'self-grant'};
  const grantsBefore=await db.prepare('SELECT count(*) n FROM access_grants').first('n');
  assert.equal(code(await call('orbit.access.update',grantArgs)),'self_escalation');assert.equal(await db.prepare('SELECT count(*) n FROM access_grants').first('n'),grantsBefore);
  // BASE-AGENT-012: current policy and scope run before a cached native result.
  const replayArgs={kind:'company',id:companyId,patch:{name:'Reviewed Buyer'},expected_revision:before,idempotency_key:'edit-company'};
  await adopt(autonomousPolicy(),{paused:true});
  const pausedReplay=await call('orbit.records.update',replayArgs);assert.equal(code(pausedReplay),'agents_paused');assert.equal(pausedReplay.body.result.structuredContent,undefined);
  const replayAudit=await latestAudit('edit-company');assert.equal(replayAudit.outcome,'refused');assert.equal(replayAudit.decision,'paused');assert.deepEqual(replayAudit.resource,{kind:'company',id:companyId});assert.deepEqual(replayAudit.classes,[{class:'standard',facts:{measure:1}}]);
  const blocked=autonomousPolicy();blocked.rules=[{id:'all',class:'*',do:'blocked'}];await adopt(blocked);
  assert.equal(code(await resource(`orbit://records/company/${companyId}`)),'policy_blocked');
  const blockedReplay=await call('orbit.records.update',replayArgs);assert.equal(code(blockedReplay),'policy_blocked');assert.equal(blockedReplay.body.result.structuredContent,undefined);
  const held={...autonomousPolicy(),rules:[{id:'all',class:'*',do:'approval',approver:['sponsor'],wait:'PT1H'}]};await adopt(held);
  const heldReplay=await call('orbit.records.update',replayArgs);assert.equal(code(heldReplay),'approval_required');assert.equal(heldReplay.body.result.structuredContent,undefined);
  await adopt(autonomousPolicy());const scopedReplay=await call('orbit.records.update',replayArgs,await credential({scope:'events:read'}));assert.equal(scopedReplay.status,403);assert.equal(code(scopedReplay),'insufficient_scope');assert.equal(scopedReplay.body.result?.structuredContent,undefined);
  assert.equal((await db.prepare('SELECT name FROM companies WHERE id=?').bind(companyId).first<{name:string}>())!.name,'Reviewed Buyer');
  // BASE-AGENT-007/008: a second native person completes the real email-link
  // lifecycle and approves an exact summary separately from the agent preparer.
  const reviewerEmail='reviewer@orbit.example.test',reviewerSub=randomUUID();
  const invitation=await person('/api/v1/settings/operators',{email:reviewerEmail,displayName:'Morgan Reviewer'});assert.equal(invitation.status,201);
  const reviewerId=(await invitation.json() as {id:string}).id;
  const signedIn=await emailLinkSignIn(db,reviewerEmail,{origin});assert.equal(signedIn.operator.operatorId,reviewerId);
  const mapped=await signJws(pair.privateKey,kid,'rer-business-settings+jwt',{v:1,iss:issuer,aud:origin,sub:installationId,business:'Northstar',email,jti:randomUUID(),iat,exp:iat+300,rev:2,values:{},logo:null,team:[{id:reviewerSub,email:reviewerEmail,name:'Morgan Reviewer',role:'admin',invite:1}],owner_id:sub});
  assert.equal((await agentDoorResponse(jsonRequest('/api/rer/business-settings',{settings:mapped}),b))!.status,200);
  const reviewerPolicy={...autonomousPolicy(),rules:[{id:'all',class:'*',do:'approval',approver:[`person:${reviewerSub}`],wait:'PT1H'}]};await adopt(reviewerPolicy);
  const pending=await call('orbit.records.update',{kind:'company',id:companyId,patch:{name:'Independently approved buyer'},idempotency_key:'reviewer-edit'});assert.equal(pending.body.result.resultType,'input_required');assert.equal((await db.prepare('SELECT name FROM companies WHERE id=?').bind(companyId).first<{name:string}>())!.name,'Reviewed Buyer');
  const approvalId=pending.body.result._meta['com.runeditrun/approval'].id;
  const approvalRequest=async(path:string,body?:unknown)=>door.handle(new Request(origin+path,{method:body===undefined?'GET':'POST',headers:{Origin:origin,Cookie:signedIn.cookie,'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})}));
  const view=await (await approvalRequest(`/agents/api/approvals/${approvalId}`))!.json() as any;
  assert.deepEqual(view.approval.summary.nativeTarget,{kind:'company',id:companyId});assert.equal(view.approval.prepared_by.agent.name,agent.name);
  const stale=await approvalRequest(`/agents/api/approvals/${approvalId}/approve`,{revision:view.approval.revision,summary_sha256:'stale'});assert.equal(stale!.status,409);assert.equal((await db.prepare('SELECT name FROM companies WHERE id=?').bind(companyId).first<{name:string}>())!.name,'Reviewed Buyer');
  const approved=await approvalRequest(`/agents/api/approvals/${approvalId}/approve`,{revision:view.approval.revision,summary_sha256:view.approval.summary_sha256});assert.equal(approved!.status,200);assert.equal((await approved!.json() as any).approval.state,'executed');
  const nativeActor=JSON.parse((await db.prepare("SELECT actor FROM orbit_native_attribution WHERE table_name='timeline_entries' ORDER BY rowid DESC LIMIT 1").first<{actor:string}>())!.actor);assert.equal(nativeActor.agent.id,agent.id);assert.equal(nativeActor.approvers[0].id,reviewerId);
  const reviewed={...autonomousPolicy(),rules:[{id:'all',class:'*',do:'review'}],reviewers:[`person:${reviewerSub}`]};await adopt(reviewed);
  const reviewCall=await call('orbit.records.update',{kind:'company',id:companyId,patch:{name:'Reviewed Buyer'},idempotency_key:'review-mark'});assert.equal(reviewCall.body.result.isError,false);
  const reviewId=(await db.prepare("SELECT id FROM agent_door_reviews ORDER BY rowid DESC LIMIT 1").first<{id:string}>())!.id;
  const marked=await approvalRequest(`/agents/api/reviews/${reviewId}/reviewed`,{});assert.equal(marked!.status,200);assert.equal((await marked!.json() as any).review.marked_by,reviewerId);
  await adopt(autonomousPolicy());
  // Invalid Business identities refuse before native reads; email never supplies identity.
  assert.equal((await call('orbit.records.read',{kind:'company',id:companyId},await credential({sub:'unmapped',email}))).status,401);
  assert.equal((await call('orbit.records.read',{kind:'company',id:companyId},await credential({aud:'https://elsewhere.test/mcp'}))).status,401);
  const paused=await policyEnvelope(context,autonomousPolicy(),{paused:true});
  assert.equal((await door.handle(jsonRequest('/api/rer/agent-policy',{policy:paused.policy})))!.status,200);
  context.seq=paused.payload.seq;context.revision=paused.payload.revision;
  assert.equal(code(await call('orbit.records.update',{kind:'company',id:companyId,patch:{name:'Paused edit'},idempotency_key:'paused'})),'agents_paused');
  assert.equal((await db.prepare('SELECT name FROM companies WHERE id=?').bind(companyId).first<{name:string}>())!.name,'Reviewed Buyer');
  // Native people still operate while agent policy is paused.
  assert.equal((await person('/api/v1/records/company/'+companyId,{name:'Person still works'},'PUT')).status,200);
  await adopt(autonomousPolicy());
  for(let index=0;index<201;index++){
   const read=await call('orbit.records.read',{kind:'company',id:companyId,fields:['name']});
   assert.equal(read.body.result.isError,false);
  }
  const paginated=await auditRows({agentId:agent.id,personJson:async(path:string)=>{
   const response=await door.handle(new Request(origin+path,{headers:{Cookie:cookie}}));assert.equal(response!.status,200);return response!.json();
  }});
  assert.ok(paginated.rows.length>200,'Native target checks must read beyond the first audit page');
  assert.equal(paginated.differs,0);
  assert.ok(paginated.rows.some((row:any)=>row.idempotency_key==='edit-company'&&row.resource?.id===companyId));
  assert.deepEqual(paginated.rows.at(-1).resource,{kind:'company',id:companyId});
 }finally{await platform.dispose();}
}
