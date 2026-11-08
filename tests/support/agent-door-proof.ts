import assert from 'node:assert/strict';
import {isolatedDatabase} from './isolated-database';
import {identityResponse, operatorFromRequest} from '../../src/core/features/identity';
import {orbitAgentDoor, orbitBusinessSettings} from '../../src/core/features/agent-door';
import {SettingsRepository} from '../../src/core/features/settings/repository';
import {localAgentCredentialProof} from './agent-door-local-proof';
import {agentDoorBodyLimitProof} from './agent-door-body-limit';
import {agentAuditRetentionProof} from './agent-door-audit-proof';
import {checkAgentArtifacts} from '../../src/base/modules/agent-door/index.ts';
import {contactAgentArtifacts} from '../../src/core/features/agent-door/erasure';
import {foldInstalledCatalog} from '../../src/core/features/records/archive-fold-catalog';
import portabilityPolicy from '../../scripts/installer/portability-policy.mjs';
import {orbitPeople} from '../../src/core/features/agent-door/people';
import {autonomousPolicy,heldPolicy,policyEnvelope} from '../../src/base/modules/agent-door/conformance/crypto.mjs';
import type {AgentDoor} from '../../src/base/modules/agent-door/index.ts';
import type {PlatformBindings} from '../../src/core/platform/assets';

export interface RejectedReportProofContext {
  bindings: PlatformBindings;
  door: ReturnType<typeof orbitAgentDoor>;
  cookie: string;
  ownerId: string;
  sourceId: string;
  period: {id: string; version: number; from: string; through: string};
  adopt: (policy: ReturnType<typeof autonomousPolicy>) => Promise<void>;
  businessCall: (name: string, args: Record<string, unknown>, overrides?: Record<string, unknown>, method?: string, rpcId?: number) => Promise<{status: number; body: any}>;
}

export async function agentDoorProof(rejectedReportProof: (context: RejectedReportProofContext) => Promise<void>) {
  const fixture = await isolatedDatabase();
  try {
    await checkAgentArtifacts(fixture.db,contactAgentArtifacts);
    for(const table of ['agent_door_replay_aliases','agent_door_relay'])assert.ok(portabilityPolicy.excludeTables.includes(table),'CLI archives exclude '+table);
    for(const catalog of [await foldInstalledCatalog(fixture.db)]) {
      assert.ok(!catalog.some(table=>['agent_door_replay_aliases','agent_door_relay'].includes(table.name)),'agent replay and relay custody stays installation-local');
    }
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
    const settingsRepository=new SettingsRepository(fixture.db),teammate=await settingsRepository.invite('jamie@example.test','Jamie Rivera',owner.operatorId);
    assert.equal(await people.sponsor({sub:'business-jamie'}),null,'native membership alone is not a Business binding');
    const roster={...document,jti:crypto.randomUUID(),rev:2,team:[{id:'business-jamie',email:'jamie@example.test',name:'Jamie Rivera',role:'admin',invite:0}]};
    const rosterApplied=await settings.handle(post('/api/rer/business-settings',{settings:await sign('rer-business-settings+jwt',roster)}));
    assert.equal(rosterApplied!.status,200,await rosterApplied!.clone().text());
    const mappedTeammate=await people.sponsor({sub:'business-jamie'});assert.equal(mappedTeammate?.id,teammate.id);
    assert.deepEqual(await people.businessMember!(mappedTeammate!),{id:'business-jamie',role:'editor'});
    const reviewerMail:Array<{text?:string}>=[];
    const reviewerBindings={...bindings,MAIL_FROM:'auth@example.test'};
    const reviewerOptions={...ownerOptions,mailSender:{async send(message:{text?:string}){reviewerMail.push(message);return {status:'accepted' as const,provider:'test-mail-edge',providerMessageId:'native-reviewer-mail'};}}};
    assert.equal((await identityResponse(post('/auth/magic-link',{email:mappedTeammate!.email,returnTo:'/agents'}),reviewerBindings,reviewerOptions))!.status,202);
    const reviewerLink=reviewerMail.flatMap(mail=>mail.text?.match(/https:\/\/[^\s]+/g)??[]).map(link=>new URL(link)).find(link=>link.pathname==='/auth/confirm');
    assert.ok(reviewerLink);assert.equal(reviewerLink.origin,origin);
    const reviewerConfirmed=await identityResponse(post('/auth/confirm',{token:reviewerLink.searchParams.get('token')}),reviewerBindings,reviewerOptions);
    assert.equal(reviewerConfirmed!.status,303);
    const reviewerCookie=reviewerConfirmed!.headers.get('set-cookie')!.split(';')[0]!;
    assert.notEqual(reviewerCookie,cookie,'native reviewer signs in with an independent session');
    assert.equal((await operatorFromRequest(new Request(origin+'/agents',{headers:{Cookie:reviewerCookie}}),bindings))?.operatorId,teammate.id);


    const door=orbitAgentDoor(bindings);
    const metadata=await door.handle(new Request(origin+'/.well-known/oauth-protected-resource/mcp'));
    assert.equal((await metadata!.json() as {resource:string}).resource,origin+'/mcp');
    for(const version of ['2026-07-28','2025-06-18']) {
      const bearer=await sign('at+jwt',{iss:issuer,aud:origin+'/mcp',sub:'business-owner',email:owner.email,act:{sub:'seller-assistant',name:'Ari'},client_id:'door-test',business:'door-company',scope:'events:read',consent:'consent-test',jti:crypto.randomUUID(),iat:now,exp:now+300});
      const call=new Request(origin+'/mcp',{method:'POST',headers:{Authorization:'Bearer '+bearer,'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':version,'MCP-Method':'initialize'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{_meta:{'io.modelcontextprotocol/protocolVersion':version},protocolVersion:version,capabilities:{},clientInfo:{name:'door-test',version:'1'}}})});
      const response=await door.handle(call);
      assert.equal(response!.status,200);
      assert.equal((await response!.json() as {result:{protocolVersion:string}}).result.protocolVersion,version);
    }
    const principal={person:{id:owner.operatorId},agent:{id:'ari',name:'Ari'},scopes:['records:read','records:write','handoffs:read','handoffs:write','events:read','drafts:read','drafts:write','briefs:read','risks:read','sources:read','forecasts:read','forecasts:write','reports:read','reports:write','operations:read'],consent:'door-test-consent'};
    const companyArgs={kind:'company',record:{name:'Brightwork Studio'},idempotency_key:'native-company'};
    assert.equal((await door.invoke('orbit.records.create',companyArgs,principal)).code,'policy_unset');
    const envelope=await policyEnvelope({origin,business:'door-company',seq:0,revision:0,signer:{privateKey:keys.privateKey,kid:'test',issuer,installationId:installation}},autonomousPolicy());
    const adopted=await door.handle(post('/api/rer/agent-policy',{policy:envelope.policy}));
    assert.equal(adopted!.status,200,await adopted!.clone().text());
    async function businessCall(name:string,args:Record<string,unknown>,overrides:Record<string,unknown>={},method='tools/call',rpcId=2) {
      const bearer=await sign('at+jwt',{iss:issuer,aud:origin+'/mcp',sub:'business-owner',email:bindings.OWNER_EMAIL,act:{sub:'business-ari',name:'Ari'},client_id:'business-client',business:'door-company',scope:principal.scopes.join(' '),consent:'door-test-consent',jti:crypto.randomUUID(),iat:now,exp:now+300,...overrides});
      const response=await door.handle(new Request(origin+'/mcp',{method:'POST',headers:{Authorization:'Bearer '+bearer,'Content-Type':'application/json','MCP-Protocol-Version':'2026-07-28','MCP-Method':method,'MCP-Name':method==='resources/read'?String(args.uri):name},body:JSON.stringify({jsonrpc:'2.0',id:rpcId,method,params:{...(method==='tools/call'?{name,arguments:args}:args),_meta:{'io.modelcontextprotocol/protocolVersion':'2026-07-28'}}})}));
      return {status:response!.status,body:await response!.json() as any};
    }
    const unavailableResource=await businessCall('',{uri:'unregistered://missing'},{},'resources/read');
    assert.equal(unavailableResource.body.error?.data?.code,'tool_not_found','resource refusal retains its JSON-RPC data.code');
    assert.equal(unavailableResource.body.result,undefined);
    assert.equal((await businessCall('orbit.records.list',{}, {sub:'unmapped-person'})).status,401);
    assert.equal((await businessCall('orbit.records.list',{}, {aud:origin+'/wrong-audience'})).status,401);
    assert.equal((await businessCall('orbit.records.list',{}, {scope:'events:read'})).status,403);
    const created=await door.invoke('orbit.records.create',companyArgs,principal);
    assert.equal(created.outcome,'done',JSON.stringify(created));
    const companyId=(created.result as {id:string}).id;
    const validBusiness=await businessCall('orbit.records.read',{kind:'company',id:companyId});
    assert.equal(validBusiness.status,200);assert.equal(validBusiness.body.result.structuredContent.ref.id,companyId);
    assert.equal(validBusiness.body.result.isError,false);
    // An outstanding Business token stops working when its mapped native sponsor changes email.
    const teammateToken=await sign('at+jwt',{iss:issuer,aud:origin+'/mcp',sub:'business-jamie',email:mappedTeammate!.email,act:{sub:'jamie-assistant',name:'Jules'},client_id:'business-client',business:'door-company',scope:principal.scopes.join(' '),consent:'door-test-consent',jti:crypto.randomUUID(),iat:now,exp:now+300});
    const teammateRead=async()=>{
      const response=await door.handle(new Request(origin+'/mcp',{method:'POST',headers:{Authorization:'Bearer '+teammateToken,'Content-Type':'application/json','MCP-Protocol-Version':'2026-07-28','MCP-Method':'tools/call','MCP-Name':'orbit.records.read'},body:JSON.stringify({jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'orbit.records.read',arguments:{kind:'company',id:companyId},_meta:{'io.modelcontextprotocol/protocolVersion':'2026-07-28'}}})}));
      return {status:response!.status,body:await response!.json() as any};
    };
    const teammateCall=await teammateRead();
    assert.equal(teammateCall.status,200,JSON.stringify(teammateCall.body));assert.equal(teammateCall.body.result.isError,false);
    assert.equal(teammateCall.body.result.structuredContent.ref.id,companyId);
    await fixture.db.prepare('UPDATE operators SET email=? WHERE id=?').bind('jamie.changed@example.test',teammate.id).run();
    const changedEmailCall=await teammateRead();
    assert.equal(changedEmailCall.status,401,'the same outstanding token must be refused after a native email change');
    assert.equal(changedEmailCall.body.error.code,-32001);
    assert.equal(changedEmailCall.body.error.message,'Unauthorized');
    assert.equal(changedEmailCall.body.result,undefined);
    await fixture.db.prepare('UPDATE operators SET email=? WHERE id=?').bind(mappedTeammate!.email,teammate.id).run();
    const read=await door.invoke('orbit.records.read',{kind:'company',id:companyId},principal);
    assert.equal(read.outcome,'done',JSON.stringify(read));
    const current=(read.result as {ref:{revision:number}}).ref.revision;
    const updateArgs={kind:'company',id:companyId,fields:{name:'Brightwork Studio North'},expected_revision:current,idempotency_key:'native-company-update'};
    const edited=await door.invoke('orbit.records.update',updateArgs,principal);
    assert.equal(edited.outcome,'done',JSON.stringify(edited));
    const replay=await door.invoke('orbit.records.update',updateArgs,principal);
    assert.deepEqual(replay.result,edited.result,'same native key has one retained outcome');
    const auditRow=await fixture.db.prepare("SELECT row FROM agent_door_audit WHERE json_extract(row,'$.idempotency_key')=? AND json_extract(row,'$.outcome')='done'").bind(updateArgs.idempotency_key).first<{row:string}>();
    assert.deepEqual(JSON.parse(auditRow!.row).resource,{kind:'company',id:companyId},'native write audit identifies its actual record');
    const readWitness=async()=>JSON.stringify((await fixture.db.prepare('SELECT * FROM companies WHERE id=?').bind(companyId).first()));
    const beforeReplay=await readWitness();
    let policySeq=0;
    const adopt=async(policy:ReturnType<typeof autonomousPolicy>,paused=false)=>{
      const signed=await policyEnvelope({origin,business:'door-company',seq:++policySeq,revision:policySeq,signer:{privateKey:keys.privateKey,kid:'test',issuer,installationId:installation}},policy,{paused});
      assert.equal((await door.handle(post('/api/rer/agent-policy',{policy:signed.policy})))!.status,200);
    };
    await adopt(autonomousPolicy(),true);
    const pausedReplay=await door.invoke('orbit.records.update',updateArgs,principal);
    assert.equal(pausedReplay.code,'agents_paused');assert.equal(pausedReplay.result,undefined);
    const blockedReplayPolicy=autonomousPolicy();blockedReplayPolicy.rules=[{id:'all',class:'*',do:'blocked'}];
    await adopt(blockedReplayPolicy);
    const blockedReplay=await door.invoke('orbit.records.update',updateArgs,principal);
    assert.equal(blockedReplay.code,'policy_blocked');assert.equal(blockedReplay.result,undefined);
    assert.equal(await readWitness(),beforeReplay,'current replay refusals cannot repeat a native effect');
    await adopt(autonomousPolicy());

    assert.equal((await door.invoke('orbit.records.update',{...updateArgs,idempotency_key:'stale-company-update'},principal)).code,'revision_conflict');
    assert.equal(await fixture.db.prepare('SELECT name FROM companies WHERE id=?').bind(companyId).first('name'),'Brightwork Studio North');
    const timeline=await fixture.db.prepare("SELECT actor_type,payload_json FROM timeline_entries WHERE source='records' AND json_extract(payload_json,'$.preparedBy.agent.id')='ari' ORDER BY recorded_at DESC LIMIT 1").first<{actor_type:string;payload_json:string}>();
    assert.equal(timeline?.actor_type,'agent');
    assert.equal(JSON.parse(timeline!.payload_json).preparedBy.label,'Ari for Morgan Lee');
    assert.equal(await fixture.db.prepare('SELECT count(*) n FROM orbit_agent_write_context').first('n'),0,'transaction-local attribution is never retained as admission');
    const call=async(name:string,args:Record<string,unknown>)=>{
      const answer=await door.invoke(name,args,principal);assert.equal(answer.outcome,'done',name+': '+JSON.stringify(answer));return answer.result as Record<string,any>;
    };
    const contact=await call('orbit.records.create',{kind:'contact',record:{name:'Maya Chen',email:'maya@example.test',company_id:companyId},idempotency_key:'native-contact'});
    const stage=await fixture.db.prepare('SELECT id FROM pipeline_stages ORDER BY position LIMIT 1').first<string>('id');
    const opportunity=await call('orbit.records.create',{kind:'opportunity',record:{title:'Brightwork Team plan',stage_id:stage,value_cents:750000,company_id:companyId,contact_ids:[contact.id],primary_contact_id:contact.id},idempotency_key:'native-opportunity'});
    const bodyLimitNow=Math.floor(Date.now()/1000);
    await agentDoorBodyLimitProof({db:fixture.db,door,origin,
      bearer:await sign('at+jwt',{iss:issuer,aud:origin+'/mcp',sub:'business-owner',email:bindings.OWNER_EMAIL,act:{sub:'business-ari',name:'Ari'},client_id:'business-client',business:'door-company',scope:principal.scopes.join(' '),consent:'door-test-consent',jti:crypto.randomUUID(),iat:bodyLimitNow,exp:bodyLimitNow+300}),
      record:{stage_id:stage!,value_cents:750000,company_id:companyId,contact_ids:[contact.id],primary_contact_id:contact.id}});
    const risks=await call('orbit.risks.read',{id:opportunity.id});
    assert.equal(risks.risks.deal.id,opportunity.id);
    assert.ok(Array.isArray(risks.risks.findings),'native rule findings are available over MCP as JSON');
    const target=`opportunities/${opportunity.id}/handoffs/seller-day`;
    const handoff=await call('orbit.handoffs.read',{target});
    const content={title:'Prepare buyer follow-up',description:'Use the current customer context',assigneeId:owner.operatorId,dueAt:null,status:'open'};
    const handoffArgs={target,source_revision:handoff.revision,audience_revision:handoff.audienceRevision,content,idempotency_key:'native-handoff'};
    await call('orbit.handoffs.upsert',handoffArgs);
    await call('orbit.handoffs.upsert',handoffArgs);
    assert.equal(await fixture.db.prepare('SELECT count(*) n FROM handoff_tasks WHERE id=?').bind('seller-day').first('n'),1);
    assert.equal((await door.invoke('orbit.handoffs.upsert',{...handoffArgs,idempotency_key:'stale-handoff'},principal)).code,'revision_conflict');
    const draft=await call('orbit.drafts.create',{kind:'opportunity',id:opportunity.id,contact_id:contact.id,subject:'Brightwork next steps',body:'Maya, here is the saved proposal outline.',idempotency_key:'native-draft'});
    const saved=await call('orbit.drafts.read',{id:draft.id});
    await call('orbit.drafts.update',{id:draft.id,recipient_email:'maya@example.test',subject:'Brightwork next steps',body:'Maya, here is the revised saved proposal outline.',expected_revision:saved.draft.revision,idempotency_key:'native-draft-update'});
    assert.equal(await fixture.db.prepare('SELECT count(*) n FROM record_mail_outbound_messages').first('n'),0,'preparation never approves or sends');
    await call('orbit.briefs.read',{});
    await call('orbit.sources.read',{});
    await call('orbit.forecasts.read',{});
    await call('orbit.forecasts.update',{id:opportunity.id,forecast:{probability:40,category:'pipeline',closeDate:null,schedules:[],reason:'CRM estimate from current buyer evidence'},idempotency_key:'native-forecast'});
    const definition=await call('orbit.reports.update',{definition:{name:'Opportunity count',description:'Current native opportunity count',aggregation:'count',unit:'opportunities',sourceTypes:['opportunity'],sourceOperation:'graph.read',sourceFields:[],currency:null,missingPolicy:'incomplete',lateArrival:'recompute',attributionModel:'none',attributionWindowDays:30},idempotency_key:'native-report-definition'});
    const period={id:definition.id,version:1,from:'2026-01-01T00:00:00Z',through:'2027-01-01T00:00:00Z'};
    const preview=await call('orbit.reports.preview',period);
    const report=await call('orbit.reports.compute',{...period,review_hash:preview.reviewHash,idempotency_key:'native-report-snapshot'});
    await call('orbit.reports.read',{id:report.id});
    const privateOpportunity=await call('orbit.records.create',{kind:'opportunity',record:{title:'Protected amount',stage_id:stage,value_cents:750000,custom_fields:{private_amount:1200}},idempotency_key:'private-opportunity'});
    const privateDefinition=await call('orbit.reports.update',{definition:{name:'Protected amount sum',description:'Native protected source measurement',aggregation:'count',unit:'opportunities',sourceTypes:['opportunity'],sourceOperation:'graph.read',sourceFields:['custom_fields_json'],groupBy:'custom_fields_json',filters:{id:privateOpportunity.id},currency:null,missingPolicy:'incomplete',lateArrival:'recompute',attributionModel:'none',attributionWindowDays:30},idempotency_key:'private-definition'});
    const privatePeriod={...period,id:privateDefinition.id};
    const privatePreview=await call('orbit.reports.preview',privatePeriod);
    const privateMcpPreview=await businessCall('orbit.reports.preview',privatePeriod);
    assert.equal(privateMcpPreview.status,200);assert.equal(privateMcpPreview.body.result._meta['com.runeditrun/untrusted'],true,'native protected report groups remain data, never instructions');
    assert.equal(privatePreview.values.value,1);assert.ok(JSON.stringify(privatePreview.values.groups).includes('private_amount'));
    const privateReport=await call('orbit.reports.compute',{...privatePeriod,review_hash:privatePreview.reviewHash,idempotency_key:'private-report'});
    await rejectedReportProof({bindings,door,cookie,ownerId:owner.operatorId,sourceId:privateOpportunity.id,period:privatePeriod,adopt,businessCall});
    await call('orbit.forecasts.read',{opportunity_id:privateOpportunity.id});
    const sensitiveBlocked=autonomousPolicy();sensitiveBlocked.rules.push({id:'protected',class:'sensitive',do:'blocked'});
    const blockEnvelope=await policyEnvelope({origin,business:'door-company',seq:++policySeq,revision:policySeq,signer:{privateKey:keys.privateKey,kid:'test',issuer,installationId:installation}},sensitiveBlocked);
    assert.equal((await door.handle(post('/api/rer/agent-policy',{policy:blockEnvelope.policy})))!.status,200);
    for(const [name,args]of [['orbit.forecasts.read',{opportunity_id:privateOpportunity.id}],['orbit.reports.preview',privatePeriod],['orbit.reports.read',{id:privateReport.id}]] as const) {
      const refused=await door.invoke(name,args,principal);assert.equal(refused.code,'policy_blocked',JSON.stringify(refused));
    }
    await call('orbit.forecasts.read',{opportunity_id:opportunity.id});
    await call('orbit.reports.read',{id:report.id});
    assert.equal((await door.invoke('orbit.reports.compute',{...privatePeriod,review_hash:privatePreview.reviewHash,idempotency_key:'blocked-private-compute'},principal)).code,'policy_blocked');
    const events=await call('orbit.events.list',{limit:200});
    assert.ok(events.events.some((event:any)=>event.actor.kind==='agent'&&event.actor.label==='Ari for Morgan Lee'&&event.native_activity_id),'native activity is the retained event source');
    // BASE-AGENT-009.relay: signed pulls use the installation trust without a person session.
    const pullTime=Math.floor(Date.now()/1000);
    const pull=await sign('rer-agent-decisions+jwt',{v:1,iss:issuer,aud:origin,sub:installation,business:'door-company',after:0,limit:200,iat:pullTime,exp:pullTime+60,jti:crypto.randomUUID()});
    const relay=await door.handle(post('/api/rer/agent-decisions',{pull}));
    assert.equal(relay!.status,200,'BASE-AGENT-009.relay.route');
    const feed=await relay!.json() as {decisions:Array<{id:string;seq:number}>,cursor:number,head:number,more:boolean};
    assert.ok(feed.decisions.length>0,'Business MCP audits enter the relay');
    assert.equal(new Set(feed.decisions.map(row=>row.id)).size,feed.decisions.length);
    assert.equal((await door.handle(post('/api/rer/agent-decisions',{pull:'foreign.invalid.signature'})))!.status,401,'BASE-AGENT-009.relay.foreign');
    const setPolicy=(mode:'autonomous'|'held')=>adopt(mode==='held'?heldPolicy():autonomousPolicy());
    await adopt(autonomousPolicy());
    await localAgentCredentialProof(bindings,cookie,opportunity.id,companyId,setPolicy,async localBearer=>{
      const issued=Math.floor(Date.now()/1000);
      const businessBearer=await sign('at+jwt',{iss:issuer,aud:origin+'/mcp',sub:'business-owner',email:bindings.OWNER_EMAIL,act:{sub:'business-ari',name:'Ari'},client_id:'business-client',business:'door-company',scope:principal.scopes.join(' '),consent:'door-test-consent',jti:crypto.randomUUID(),iat:issued,exp:issued+300});
      await personOnlyDecisionMarksProof({db:fixture.db,door,origin,cookie,ownerId:owner.operatorId,opportunityId:opportunity.id,
        bearers:[{name:'Business',token:businessBearer},{name:'retained local agent',token:localBearer}],setPolicy,call:businessCall,
        reportArgs:{...privatePeriod,review_hash:privateMcpPreview.body.result.structuredContent.reviewHash}});
    });
    await agentAuditRetentionProof({bindings,cookie,companyId,issuer,sign,sponsor:{id:owner.operatorId,name:owner.displayName},
      setPolicy:mode=>adopt(mode==='held'?heldPolicy():autonomousPolicy())});
    await adopt(sensitiveBlocked);
    const witness=await call('orbit.operations.read',{});
    assert.ok(witness.record_mail_drafts.rows>0);
    await settingsRepository.remove(teammate.id,owner.operatorId,undefined,owner.sessionId);
    assert.equal((await businessCall('orbit.records.read',{kind:'company',id:companyId},{sub:'business-jamie',email:mappedTeammate!.email,act:{sub:'jamie-assistant',name:'Jules'}})).status,401,'native teammate removal overrides a still-applied Business mapping');
    await fixture.db.prepare('UPDATE operators SET email=? WHERE id=?').bind('renamed@example.test',owner.operatorId).run();
    assert.equal((await people.sponsor({sub:'business-owner'}))?.id,owner.operatorId);
    await fixture.db.prepare("UPDATE operators SET status='removed' WHERE id=?").bind(owner.operatorId).run();
    assert.equal(await people.sponsor({sub:'business-owner'}),null);
  } finally {await fixture.dispose();}
}

/** Person-only marks must reject usable credentials even beside the owner's cookie. */
async function personOnlyDecisionMarksProof({db,door,origin,cookie,ownerId,opportunityId,bearers,setPolicy,call,reportArgs}:{
  db:D1Database;door:AgentDoor;origin:string;cookie:string;ownerId:string;opportunityId:string;
  bearers:Array<{name:string;token:string}>;setPolicy:(mode:'autonomous'|'held')=>Promise<void>;
  call:(name:string,args:Record<string,unknown>)=>Promise<{status:number;body:any}>;reportArgs:Record<string,unknown>;
}) {
  const request=async(path:string,body?:object,bearer?:string,withCookie=true)=>{
    const response=await door.handle(new Request(origin+path,{method:body?'POST':'GET',
      headers:{Origin:origin,'Content-Type':'application/json',...(withCookie?{Cookie:cookie}:{}),...(bearer?{Authorization:'Bearer '+bearer}:{})},
      ...(body?{body:JSON.stringify(body)}:{})}));
    assert.ok(response);return {status:response.status,body:await response.json() as any};
  };
  const tables=['agent_door_approvals','agent_door_reviews','agent_door_state','agent_door_agents','agent_door_audit','agent_door_calls','agent_door_events','agent_door_usage','agent_door_relay',
    'analytics_definitions','analytics_snapshots','analytics_snapshot_sources','domain_audit','domain_events',
    'companies','contacts','opportunities','timeline_entries','handoff_tasks','record_mail_drafts','record_mail_outbound_messages'];
  const unchangedState=async()=>{
    const rows=await db.batch(tables.map(table=>db.prepare('SELECT * FROM '+table)));
    return rows.map((result,index)=>[tables[index],result.results.map(row=>JSON.stringify(row)).sort()]);
  };
  async function prepare() {
    const pending=await call('orbit.reports.compute',{...reportArgs,idempotency_key:'synthetic-orbit-'+crypto.randomUUID()});
    assert.equal(pending.status,200);assert.equal(pending.body.result.resultType,'input_required');
    const meta=pending.body.result._meta,approvalId=meta['com.runeditrun/approval']?.id;
    assert.ok(approvalId,'a genuine protected report call is pending approval');
    assert.equal(meta['com.runeditrun/decision'].disposition,'approval');
    assert.ok(meta['com.runeditrun/decision'].classes.some((item:{class:string})=>item.class==='sensitive'));
    const ownerRead=await request('/agents/api/approvals/'+approvalId);
    assert.equal(ownerRead.status,200);
    const approval=ownerRead.body.approval;
    assert.equal(approval.id,approvalId);assert.equal(approval.state,'pending');assert.deepEqual(approval.approvals,[]);
    assert.equal(approval.decision_id,meta['com.runeditrun/decision'].id);
    assert.equal(approval.revision,meta['com.runeditrun/decision'].revision);
    assert.match(approval.summary_sha256,/^[a-f0-9]{64}$/);
    const saved=JSON.parse((await db.prepare('SELECT saved FROM agent_door_approvals WHERE id=?').bind(approvalId).first<string>('saved'))!);
    assert.deepEqual(approval.summary,saved.summary);assert.equal(approval.summary_sha256,saved.summary_sha256);
    assert.equal(approval.revision,saved.revision);assert.equal(saved.args.review_hash,reportArgs.review_hash);
    assert.equal(approval.prepared_by.for.id,ownerId);
    const completed=await call('orbit.records.read',{kind:'opportunity',id:opportunityId});
    assert.equal(completed.status,200);assert.equal(completed.body.result.isError,false);
    assert.equal(completed.body.result.structuredContent.ref.id,opportunityId);
    const reviewId=completed.body.result._meta['com.runeditrun/review']?.id;
    assert.ok(reviewId,'a completed standard read has a real open review');
    const reviews=await request('/agents/api/reviews');assert.equal(reviews.status,200);
    const review=reviews.body.reviews.find((item:{id:string})=>item.id===reviewId);
    assert.ok(review);assert.equal(review.state,'open');assert.equal(review.marked_by,null);assert.equal(review.marked_at,null);
    assert.equal(review.decision_id,completed.body.result._meta['com.runeditrun/decision'].id);
    return {approval,review};
  }
  for(const bearer of bearers) {
    await setPolicy('autonomous');
    const usable=await door.handle(new Request(origin+'/mcp',{method:'POST',headers:{Authorization:'Bearer '+bearer.token,'Content-Type':'application/json',
      'MCP-Protocol-Version':'2026-07-28','MCP-Method':'tools/call','MCP-Name':'orbit.records.read'},
      body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'orbit.records.read',arguments:{kind:'opportunity',id:opportunityId},_meta:{'io.modelcontextprotocol/protocolVersion':'2026-07-28'}}})}));
    assert.equal(usable!.status,200);
    const readable=await usable!.json() as any;assert.equal(readable.result.isError,false);assert.equal(readable.result.structuredContent.ref.id,opportunityId);
    for(const mode of ['autonomous','held'] as const) {
      await setPolicy('held');
      const target=await prepare(),control=await prepare();
      if(mode==='autonomous')await setPolicy(mode);
      const state=await request('/agents/api/state');assert.equal(state.status,200);assert.deepEqual(state.body.paused,{business:false,local:false});
      const before=await unchangedState();
      const refusals:Array<{withCookie:boolean;approval:number;review:number}>=[];
      for(const withCookie of [false,true]) {
        const label=mode+' '+bearer.name+(withCookie?' beside owner cookie':' alone');
        const approved=await request('/agents/api/approvals/'+target.approval.id+'/approve',
          {revision:target.approval.revision,summary_sha256:target.approval.summary_sha256},bearer.token,withCookie);
        assert.equal(approved.status,403,label);assert.deepEqual(approved.body,{code:'person_session_required'},label);
        assert.deepEqual(await unchangedState(),before,label+': no approval mark, receipt, policy, Pause or native effect');
        const reviewed=await request('/agents/api/reviews/'+target.review.id+'/reviewed',{},bearer.token,withCookie);
        assert.equal(reviewed.status,403,label);assert.deepEqual(reviewed.body,{code:'person_session_required'},label);
        assert.deepEqual(await unchangedState(),before,label+': no review mark, receipt, policy, Pause or native effect');
        refusals.push({withCookie,approval:approved.status,review:reviewed.status});
      }
      assert.deepEqual(await request('/agents/api/approvals/'+target.approval.id),{status:200,body:{approval:target.approval}});
      const reviews=await request('/agents/api/reviews');assert.deepEqual(reviews.body.reviews.find((item:{id:string})=>item.id===target.review.id),target.review);
      assert.deepEqual(await request('/agents/api/state'),state);
      const approved=await request('/agents/api/approvals/'+control.approval.id+'/approve',
        {revision:control.approval.revision,summary_sha256:control.approval.summary_sha256});
      const result=JSON.parse((await db.prepare('SELECT result FROM agent_door_approvals WHERE id=?').bind(control.approval.id).first<string>('result'))!);
      assert.equal(approved.status,200);assert.equal(approved.body.approval.state,mode==='held'?'executed':'refused',JSON.stringify({mode,bearer:bearer.name,code:result.code,outcome:result.outcome}));
      assert.deepEqual(approved.body.approval.approvals.map((mark:{person:string})=>mark.person),[ownerId]);
      if(mode==='held') {
        assert.equal(result.outcome,'done');assert.equal(result.receipt.approval_id,control.approval.id);
        assert.deepEqual(result.receipt.approved_by,[ownerId]);assert.equal(result.receipt.prepared_by.agent.id,control.approval.prepared_by.agent.id);
        assert.ok(await db.prepare('SELECT id FROM analytics_snapshots WHERE id=?').bind(result.result.id).first(),'the cookie-only control saves its native report');
      } else {
        assert.equal(result.code,'approval_evidence_changed');assert.equal(result.receipt,undefined,'a newer current policy cannot authorize old evidence');
      }
      const reviewed=await request('/agents/api/reviews/'+control.review.id+'/reviewed',{});
      assert.equal(reviewed.status,200);assert.equal(reviewed.body.review.state,'reviewed');assert.equal(reviewed.body.review.marked_by,ownerId);assert.ok(reviewed.body.review.marked_at);
      assert.deepEqual(await request('/agents/api/state'),state,'person marks do not change policy or Pause');
      // A stale-policy refusal is retained above, but cannot stand in for a
      // successful person-only control. Prepare equivalent fresh evidence at
      // the held revision so the owner can actually complete both acts.
      let freshCookieApproval=approved.body.approval.state;
      if(mode==='autonomous') {
        await setPolicy('held');
        const fresh=await prepare(),freshState=await request('/agents/api/state');
        const snapshots=await db.prepare('SELECT count(*) n FROM analytics_snapshots').first<number>('n');
        const freshApproved=await request('/agents/api/approvals/'+fresh.approval.id+'/approve',
          {revision:fresh.approval.revision,summary_sha256:fresh.approval.summary_sha256});
        assert.equal(freshApproved.status,200);assert.equal(freshApproved.body.approval.state,'executed');
        assert.deepEqual(freshApproved.body.approval.approvals.map((mark:{person:string})=>mark.person),[ownerId]);
        const freshResult=JSON.parse((await db.prepare('SELECT result FROM agent_door_approvals WHERE id=?').bind(fresh.approval.id).first<string>('result'))!);
        assert.equal(freshResult.outcome,'done');assert.equal(freshResult.receipt.approval_id,fresh.approval.id);
        assert.deepEqual(freshResult.receipt.approved_by,[ownerId]);
        assert.equal(freshResult.receipt.prepared_by.agent.id,fresh.approval.prepared_by.agent.id);
        assert.equal(await db.prepare('SELECT count(*) n FROM analytics_snapshots').first<number>('n'),snapshots!+1);
        assert.ok(await db.prepare('SELECT id FROM analytics_snapshots WHERE id=?').bind(freshResult.result.id).first(),'fresh cookie-only evidence saves its native report');
        const freshReviewed=await request('/agents/api/reviews/'+fresh.review.id+'/reviewed',{});
        assert.equal(freshReviewed.status,200);assert.equal(freshReviewed.body.review.state,'reviewed');
        assert.equal(freshReviewed.body.review.marked_by,ownerId);assert.ok(freshReviewed.body.review.marked_at);
        assert.deepEqual(freshReviewed.body.review.prepared_by,fresh.review.prepared_by);
        assert.deepEqual(await request('/agents/api/state'),freshState,'fresh controls preserve policy and Pause');
        assert.deepEqual(await request('/agents/api/approvals/'+target.approval.id),{status:200,body:{approval:target.approval}});
        const retained=await request('/agents/api/reviews');
        assert.deepEqual(retained.body.reviews.find((item:{id:string})=>item.id===target.review.id),target.review,'fresh controls leave the refused target open');
        freshCookieApproval=freshApproved.body.approval.state;
      }
      console.log(JSON.stringify({proof:'BASE-AGENT-008.2',bearer:bearer.name,policy:mode,refusals,unchangedTables:tables.length,
        cookieApproval:approved.body.approval.state,cookieReview:reviewed.body.review.state,freshCookieApproval}));
    }
  }
}
