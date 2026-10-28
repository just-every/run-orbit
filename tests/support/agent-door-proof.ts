import assert from 'node:assert/strict';
import {isolatedDatabase} from './isolated-database';
import {identityResponse, operatorFromRequest} from '../../src/core/features/identity';
import {orbitAgentDoor, orbitBusinessSettings} from '../../src/core/features/agent-door';
import {orbitPeople} from '../../src/core/features/agent-door/people';
import {autonomousPolicy,policyEnvelope} from '../../src/base/modules/agent-door/conformance/crypto.mjs';

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
    const principal={person:{id:owner.operatorId},agent:{id:'ari',name:'Ari'},scopes:['records:read','records:write','handoffs:read','handoffs:write','events:read','drafts:read','drafts:write','briefs:read','sources:read','forecasts:read','forecasts:write','reports:read','reports:write','operations:read'],consent:'door-test-consent'};
    const companyArgs={kind:'company',record:{name:'Brightwork Studio'},idempotency_key:'native-company'};
    assert.equal((await door.invoke('orbit.records.create',companyArgs,principal)).code,'policy_unset');
    const envelope=await policyEnvelope({origin,business:'door-company',seq:0,revision:0,signer:{privateKey:keys.privateKey,kid:'test',issuer,installationId:installation}},autonomousPolicy());
    const adopted=await door.handle(post('/api/rer/agent-policy',{policy:envelope.policy}));
    assert.equal(adopted!.status,200,await adopted!.clone().text());
    async function businessCall(name:string,args:Record<string,unknown>,overrides:Record<string,unknown>={}) {
      const bearer=await sign('at+jwt',{iss:issuer,aud:origin+'/mcp',sub:'business-owner',email:bindings.OWNER_EMAIL,act:{sub:'business-ari',name:'Ari'},client_id:'business-client',business:'door-company',scope:principal.scopes.join(' '),consent:'door-test-consent',jti:crypto.randomUUID(),iat:now,exp:now+300,...overrides});
      const response=await door.handle(new Request(origin+'/mcp',{method:'POST',headers:{Authorization:'Bearer '+bearer,'Content-Type':'application/json','MCP-Protocol-Version':'2026-07-28','MCP-Method':'tools/call','MCP-Name':name},body:JSON.stringify({jsonrpc:'2.0',id:2,method:'tools/call',params:{name,arguments:args,_meta:{'io.modelcontextprotocol/protocolVersion':'2026-07-28'}}})}));
      return {status:response!.status,body:await response!.json() as any};
    }
    assert.equal((await businessCall('orbit.records.list',{}, {sub:'unmapped-person'})).status,401);
    assert.equal((await businessCall('orbit.records.list',{}, {aud:origin+'/wrong-audience'})).status,401);
    assert.equal((await businessCall('orbit.records.list',{}, {scope:'events:read'})).status,403);
    const created=await door.invoke('orbit.records.create',companyArgs,principal);
    assert.equal(created.outcome,'done',JSON.stringify(created));
    const companyId=(created.result as {id:string}).id;
    const validBusiness=await businessCall('orbit.records.read',{kind:'company',id:companyId});
    assert.equal(validBusiness.status,200);assert.equal(validBusiness.body.result.structuredContent.ref.id,companyId);
    assert.equal(validBusiness.body.result.isError,false);
    const read=await door.invoke('orbit.records.read',{kind:'company',id:companyId},principal);
    assert.equal(read.outcome,'done',JSON.stringify(read));
    const current=(read.result as {ref:{revision:number}}).ref.revision;
    const updateArgs={kind:'company',id:companyId,fields:{name:'Brightwork Studio North'},expected_revision:current,idempotency_key:'native-company-update'};
    const edited=await door.invoke('orbit.records.update',updateArgs,principal);
    assert.equal(edited.outcome,'done',JSON.stringify(edited));
    const replay=await door.invoke('orbit.records.update',updateArgs,principal);
    assert.deepEqual(replay.result,edited.result,'same native key has one retained outcome');
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
    const events=await call('orbit.events.list',{limit:200});
    assert.ok(events.events.some((event:any)=>event.actor.kind==='agent'&&event.actor.label==='Ari for Morgan Lee'&&event.native_activity_id),'native activity is the retained event source');
    const witness=await call('orbit.operations.read',{});
    assert.ok(witness.record_mail_drafts.rows>0);
    await fixture.db.prepare('UPDATE operators SET email=? WHERE id=?').bind('renamed@example.test',owner.operatorId).run();
    assert.equal((await people.sponsor({sub:'business-owner'}))?.id,owner.operatorId);
    await fixture.db.prepare("UPDATE operators SET status='removed' WHERE id=?").bind(owner.operatorId).run();
    assert.equal(await people.sponsor({sub:'business-owner'}),null);
  } finally {await fixture.dispose();}
}
