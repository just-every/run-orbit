import assert from 'node:assert/strict';
import {createApp} from '../../src/core/app/app';
import {identityResponse,operatorFromRequest,requireStepUp} from '../../src/core/features/identity';
import type {orbitAgentDoor} from '../../src/core/features/agent-door';
import type {PlatformBindings} from '../../src/core/platform/assets';

export interface CollaboratorProofContext {
  bindings:PlatformBindings;
  door:ReturnType<typeof orbitAgentDoor>;
  cookie:string;
  setPolicy:(mode:'autonomous'|'held')=>Promise<void>;
  bearerFor:(email:string,operatorId:string)=>Promise<string>;
}

/** Compare an accepted collaborator's record authority at both authenticated doors. */
export async function agentDoorCollaboratorProof({bindings,door,cookie,setPolicy,bearerFor}:CollaboratorProofContext) {
  const db=bindings.DB,origin=bindings.AUTH_ORIGIN!,base='/api/v2/access/workspaces/workspace';
  const app=createApp({database:db,assets:bindings.ASSETS,
    authenticate:request=>operatorFromRequest(request,bindings),
    stepUp:(request,action,returnTo)=>requireStepUp(request,bindings,action,returnTo)});
  async function native(path:string,session:string,method='GET',body?:object) {
    const response=await app.request(origin+path,{method,headers:{Cookie:session,Origin:origin,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
    return {status:response.status,body:await response.json() as any};
  }
  const email=['synthetic-orbit-collaborator','example.test'].join('@');
  const invitation=await native(base+'/invitations',cookie,'POST',{email,role:'guest',expiresAt:new Date(Date.now()+86400000).toISOString()});
  assert.equal(invitation.status,200);
  const sent:Array<{text?:string}>=[],options={mailSender:{async send(message:{text?:string}) {
    sent.push(message);return {status:'accepted' as const,provider:'synthetic-orbit-mail-edge',providerMessageId:null};
  }}};
  const post=(path:string,body:object)=>new Request(origin+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.20'},body:JSON.stringify(body)});
  const identityBindings={...bindings,MAIL_FROM:['synthetic-orbit-auth','example.test'].join('@')};
  assert.equal((await identityResponse(post('/auth/magic-link',{email,returnTo:'/app'}),identityBindings,options))!.status,202);
  const link=sent.flatMap(message=>message.text?.match(/https:\/\/[^\s]+/g)??[]).map(value=>new URL(value)).find(value=>value.pathname==='/auth/confirm');
  assert.ok(link);assert.equal(link.origin,origin);
  const confirmed=await identityResponse(post('/auth/confirm',{token:link.searchParams.get('token')}),identityBindings,options);
  assert.equal(confirmed!.status,303);
  const collaboratorCookie=confirmed!.headers.get('set-cookie')!.split(';')[0]!;
  const collaborator=await operatorFromRequest(new Request(origin+'/app',{headers:{Cookie:collaboratorCookie}}),bindings);
  assert.ok(collaborator);
  assert.equal((await native('/api/v2/access/invitations/accept',collaboratorCookie,'POST',{token:invitation.body.token})).status,200);
  const name='Synthetic read-only company',domain='synthetic-orbit.example.test',hidden='synthetic-orbit-private-company-value';
  const created=await native('/api/v1/records/company',cookie,'POST',{name,primary_domain:domain,custom_fields:{private_note:hidden}});
  assert.equal(created.status,201);
  // SharedRecords opens and saves this endpoint for a collaborator.
  const companyId=created.body.id,path='/api/v2/workspaces/workspace/records/company/'+companyId;
  const grant=await native(base+'/grants',cookie,'POST',{subjectKind:'operator',subjectId:collaborator.operatorId,resourceType:'company',resourceId:companyId,actions:['graph.read'],fields:['name','primary_domain'],purpose:'Synthetic read-only company review',expiresAt:null});
  assert.equal(grant.status,200);
  const bearer=await bearerFor(email,collaborator.operatorId);
  let rpcId=600;
  async function mcp(name:string,args:object) {
    const response=await door.handle(new Request(origin+'/mcp',{method:'POST',headers:{Authorization:'Bearer '+bearer,'Content-Type':'application/json','MCP-Protocol-Version':'2026-07-28','MCP-Method':'tools/call','MCP-Name':name},body:JSON.stringify({jsonrpc:'2.0',id:++rpcId,method:'tools/call',params:{name,arguments:args,_meta:{'io.modelcontextprotocol/protocolVersion':'2026-07-28'}}})}));
    assert.ok(response);
    return {status:response.status,body:await response.json() as any};
  }
  // Access administration intentionally records its own grant mutation. Keep
  // all record effects in this witness, apart from those access audit rows.
  const state=async()=>Object.fromEntries(await Promise.all(['companies','contacts','opportunities','graph_records','timeline_entries','timeline_entry_records','audit_entries','domain_events','domain_audit','handoff_tasks','record_mail_drafts','record_mail_outbound_messages','orbit_agent_write_context'].map(async table=>{
    const filter=table==='domain_events'?" WHERE kind NOT LIKE 'access.%'":table==='domain_audit'?" WHERE operation NOT LIKE 'access.%'":'';
    return [table,(await db.prepare('SELECT * FROM '+table+filter).all()).results.map(row=>JSON.stringify(row)).sort()];
  })));
  const before=await state();
  const ownerRead=await native('/api/v1/records/company/'+companyId,cookie);
  assert.equal(ownerRead.body.record.custom_fields_json,JSON.stringify({private_note:hidden}),'hidden data really exists');
  const refused=(answer:Awaited<ReturnType<typeof mcp>>)=>{
    assert.equal(answer.status,200);assert.equal(answer.body.error,undefined);
    assert.equal(answer.body.result.isError,true);
    assert.equal(answer.body.result._meta['com.runeditrun/error'].code,'resource_unavailable');
    assert.deepEqual(answer.body.result.content,[{type:'text',text:JSON.stringify({code:'resource_unavailable'})}]);
    assert.equal(answer.body.result.structuredContent,undefined);
    assert.equal(answer.body.result.requestState,undefined);
    assert.equal(answer.body.result._meta['com.runeditrun/approval'],undefined);
    assert.equal(answer.body.result._meta['com.runeditrun/receipt'],undefined);
  };
  for(const mode of ['autonomous','held'] as const) {
    await setPolicy(mode);
    const browser=await native(path,collaboratorCookie),agent=await mcp('orbit.records.read',{kind:'company',id:companyId});
    assert.equal(browser.status,200);assert.equal(agent.status,200);assert.equal(agent.body.result.isError,false);
    const projection=agent.body.result.structuredContent;
    assert.equal(projection.ref.id,companyId);assert.equal(browser.body.ref.id,companyId);
    assert.deepEqual(projection.fields,{name,primary_domain:domain});
    assert.deepEqual(browser.body.fields,projection.fields);
    assert.deepEqual(browser.body.editableFields,[],'the Records screen offers no edit fields for this read-only grant');
    assert.ok(!JSON.stringify(browser.body).includes(hidden));assert.ok(!JSON.stringify(agent.body).includes(hidden));
    assert.equal(browser.body.fields.custom_fields_json,undefined);
    assert.equal(agent.body.result._meta['com.runeditrun/decision'].disposition,mode==='held'?'review':'autonomous');
    const fields={name:'Synthetic unauthorized company edit'};
    const nativeWrite=await native(path,collaboratorCookie,'PUT',fields);
    assert.equal(nativeWrite.status,403);assert.equal(nativeWrite.body.error,'This operation is not permitted.');
    refused(await mcp('orbit.records.update',{kind:'company',id:companyId,fields,expected_revision:projection.ref.revision,idempotency_key:'synthetic-orbit-readonly-'+mode}));
    assert.deepEqual(await state(),before,mode+': permitted reads and refused writes preserve populated native state');
  }
  assert.equal((await native(base+'/grants/'+grant.body.id,cookie,'DELETE')).status,200);
  const administration=await native(base+'/administration',cookie);
  const grants=administration.body.grants.filter((row:any)=>row.subject_id===collaborator.operatorId);
  assert.equal(grants.length,1);assert.equal(grants[0].id,grant.body.id);assert.ok(grants[0].revoked_at);
  assert.equal(await db.prepare("SELECT count(*) FROM domain_events WHERE kind='access.grant.revoked' AND aggregate_id=?").bind(grant.body.id).first('count(*)'),1,'native grant revocation retains its access event');
  assert.equal(await db.prepare("SELECT count(*) FROM domain_audit WHERE operation='access.grant.revoked' AND json_extract(resource_json,'$.id')=?").bind(grant.body.id).first('count(*)'),1,'native grant revocation retains its audit');
  assert.equal((await native(base+'/self',collaboratorCookie)).status,200,'record revocation leaves the same native session and membership active');
  for(const mode of ['autonomous','held'] as const) {
    await setPolicy(mode);
    const browser=await native(path,collaboratorCookie);
    assert.equal(browser.status,403);assert.equal(browser.body.fields,undefined);assert.equal(browser.body.ref,undefined);
    refused(await mcp('orbit.records.read',{kind:'company',id:companyId}));
    refused(await mcp('orbit.records.update',{kind:'company',id:companyId,fields:{name:'Synthetic revoked edit'},idempotency_key:'synthetic-orbit-revoked-'+mode}));
    assert.ok(!JSON.stringify(browser.body).includes(name));assert.ok(!JSON.stringify(browser.body).includes(hidden));
    assert.deepEqual(await state(),before,mode+': revoking only the record grant exposes no record or native write effect');
  }
  console.log(JSON.stringify({proof:'BASE-AGENT-005.1.collaborator-record-parity',policies:['autonomous','held'],toolScopes:['records:read','records:write'],fields:['name','primary_domain'],nativeRead:200,nativeWrite:403,revokedNativeRead:403,revokedMcpCode:'resource_unavailable',sameBearer:true,sameNativeSession:true,unchangedNativeState:true}));
}
