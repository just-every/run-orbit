import {agentDoorDraftParityProof} from '../support/agent-door-draft-parity-proof';
import assert from 'node:assert/strict';
import {agentWorkflowProof} from '../support/agent-workflow-proof';
import {test} from 'node:test';
import {agentDiscoveryProof} from '../support/agent-discovery-proof';
import {isolatedDatabase} from '../support/isolated-database';
import {agentDoorProof, type RejectedReportProofContext} from '../support/agent-door-proof';
import {agentDoorBusinessStopProof} from '../support/agent-door-business-stop-proof';
import {businessRosterErasureProof} from '../support/business-roster-erasure-proof';
import {agentErasureMatcherProof} from '../support/agent-erasure-matcher-proof';
import {savedReportDeletionProof} from '../support/agent-report-deletion-proof';
import {agentDoorCaptureSecurityProof} from '../support/agent-door-capture-security-proof';
import {agentDoorCollaboratorProof} from '../support/agent-door-collaborator-proof';
import {identityResponse, operatorFromRequest} from '../../src/core/features/identity';
import {autonomousPolicy,heldPolicy} from '../../src/base/modules/agent-door/conformance/crypto.mjs';

async function rejectedNativeReportProof(context: RejectedReportProofContext) {
  const {bindings,door,cookie,ownerId,sourceId,period,adopt,businessCall}=context;
  const origin=bindings.AUTH_ORIGIN!,db=bindings.DB;
  await agentDiscoveryProof(context);
  const inventory=async()=>{
    const queries={
      definitions:'SELECT * FROM analytics_definitions',
      snapshots:'SELECT * FROM analytics_snapshots',
      sources:'SELECT * FROM analytics_snapshot_sources',
      records:'SELECT * FROM graph_records',
      opportunities:'SELECT * FROM opportunities',
      contacts:'SELECT * FROM contacts',
      companies:'SELECT * FROM companies',
      computedEvents:"SELECT * FROM domain_events WHERE kind='analytics.snapshot'",
      computedAudit:"SELECT * FROM domain_audit WHERE operation='analytics.snapshot'",
      computedEffects:"SELECT * FROM agent_door_events WHERE json_extract(event,'$.type')='report.computed'",
    };
    return Object.fromEntries(await Promise.all(Object.entries(queries).map(async([name,sql])=>
      [name,(await db.prepare(sql).all()).results.map(row=>JSON.stringify(row)).sort()])));
  };
  const preview=await businessCall('orbit.reports.preview',period,{},'tools/call',50);
  assert.equal(preview.status,200);assert.equal(preview.body.result.isError,false);
  const measurement=preview.body.result.structuredContent;
  assert.equal(measurement.values.value,1);
  assert.deepEqual(measurement.inputs.map((input:{id:string})=>input.id),[sourceId]);
  assert.ok(JSON.stringify(measurement.values.groups).includes('private_amount'));
  const args={...period,review_hash:measurement.reviewHash,idempotency_key:'synthetic-orbit-rejected-report'};
  const held=heldPolicy();
  held.rules.find((rule:{do:string})=>rule.do==='approval')!.approver=['person:business-owner'];
  await adopt(held);
  const before=await inventory();
  assert.ok(before.snapshots!.length>0&&before.sources!.length>0&&before.computedEffects!.length>0,'the no-effect witness starts with populated native reports');
  const pending=await businessCall('orbit.reports.compute',args,{},'tools/call',51);
  assert.equal(pending.status,200);assert.equal(pending.body.id,51);
  assert.equal(pending.body.error,undefined);
  assert.equal(pending.body.result.resultType,'input_required');
  assert.ok(pending.body.result.requestState,'the write retains a pending handle');
  const decision=pending.body.result._meta['com.runeditrun/decision'];
  assert.equal(decision.disposition,'approval');
  assert.deepEqual(decision.classes.map((item:{class:string})=>item.class).sort(),['sensitive','standard']);
  assert.equal(pending.body.result.structuredContent,undefined);
  assert.equal(pending.body.result.content,undefined);
  assert.equal(pending.body.result._meta['com.runeditrun/receipt'],undefined);
  assert.deepEqual(await inventory(),before,'pending native computation has no report or source effects');
  const handle=pending.body.result._meta['com.runeditrun/approval'];
  assert.ok(handle.id);assert.equal(handle.url,origin+'/agents/approvals/'+handle.id);
  assert.ok(Date.parse(handle.expires_at)>Date.now());
  const approvalRequest=(action?:string,body?:object)=>new Request(origin+'/agents/api/approvals/'+handle.id+(action?'/'+action:''),{
    method:action?'POST':'GET',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},
    ...(body?{body:JSON.stringify(body)}:{}),
  });
  assert.equal((await operatorFromRequest(approvalRequest(),bindings))?.operatorId,ownerId);
  const review=await door.handle(approvalRequest());assert.equal(review!.status,200);
  const approval=(await review!.json() as any).approval;
  assert.equal(approval.state,'pending');assert.equal(approval.tool,'orbit.reports.compute');
  assert.deepEqual(approval.approvers,['person:business-owner']);
  assert.equal(approval.prepared_by.for.id,ownerId);
  assert.equal(approval.revision,decision.revision);assert.equal(approval.expires_at,handle.expires_at);
  assert.equal(approval.summary.target.id,period.id);
  for(const item of [`Version: ${period.version}`,`From: ${period.from}`,`Through: ${period.through}`,`Native review: ${args.review_hash}`])assert.ok(approval.summary.items.includes(item));
  assert.match(approval.summary_sha256,/^[a-f0-9]{64}$/);
  const rejected=await door.handle(approvalRequest('reject',{revision:approval.revision,summary_sha256:approval.summary_sha256}));
  assert.equal(rejected!.status,200);
  assert.equal((await rejected!.json() as any).approval.state,'rejected');
  assert.deepEqual(await inventory(),before,'the named owner rejection leaves the native report unchanged');
  const retry=await businessCall('orbit.reports.compute',args,{},'tools/call',52);
  assert.equal(retry.status,200);assert.equal(retry.body.id,52);
  assert.equal(retry.body.error,undefined);
  assert.equal(retry.body.result.resultType,'complete');assert.equal(retry.body.result.isError,true);
  assert.equal(retry.body.result._meta['com.runeditrun/error'].code,'approval_rejected');
  assert.deepEqual(retry.body.result.content,[{type:'text',text:JSON.stringify({code:'approval_rejected'})}]);
  assert.equal(retry.body.result.structuredContent,undefined,'a rejected retry returns no successful native snapshot');
  assert.equal(retry.body.result.requestState,undefined,'a rejection is terminal, without a new pending handle');
  assert.equal(retry.body.result._meta['com.runeditrun/approval'],undefined);
  assert.equal(retry.body.result._meta['com.runeditrun/receipt'],undefined,'a rejected retry returns no completion receipt');
  assert.deepEqual(await inventory(),before,'the same arguments and key with a new RPC ID cannot compute after rejection');
  const retained=await db.prepare('SELECT state,saved,result FROM agent_door_approvals WHERE id=?').bind(handle.id).first<{state:string;saved:string;result:string|null}>();
  assert.equal(retained?.state,'rejected');assert.equal(retained.result,null);
  const saved=JSON.parse(retained.saved);
  assert.equal(saved.key,args.idempotency_key);assert.equal(saved.summary_sha256,approval.summary_sha256);
  assert.equal(saved.revision,approval.revision);assert.equal(saved.result.receipt,undefined);
  assert.equal(await db.prepare('SELECT count(*) n FROM agent_door_approvals').first('n'),1,'retry does not open a replacement approval');
  const rejectionEvents=(await db.prepare("SELECT event FROM agent_door_events WHERE uri=? AND json_extract(event,'$.type')='approval.decided'").bind(handle.url).all<{event:string}>()).results;
  assert.equal(rejectionEvents.length,1);
  const rejectionEvent=JSON.parse(rejectionEvents[0]!.event);
  assert.equal(rejectionEvent.state,'rejected');assert.equal(rejectionEvent.actor.kind,'person');
  assert.equal(rejectionEvent.actor.person.id,ownerId,'the decision is attributed to the signed-in named owner');

  await adopt(autonomousPolicy());
  const control=await businessCall('orbit.reports.compute',{...args,idempotency_key:'synthetic-orbit-autonomous-report'},{},'tools/call',53);
  assert.equal(control.status,200);assert.equal(control.body.result.isError,false);
  assert.equal(control.body.result._meta['com.runeditrun/decision'].disposition,'autonomous');
  const snapshot=control.body.result.structuredContent;
  assert.equal(snapshot.definitionId,period.id);assert.equal(snapshot.values.value,1);
  const readback=await businessCall('orbit.reports.read',{id:snapshot.id},{},'tools/call',54);
  assert.equal(readback.body.result.isError,false);assert.equal(readback.body.result.structuredContent.id,snapshot.id);
  assert.deepEqual(readback.body.result.structuredContent.inputs.map((input:{id:string})=>input.id),[sourceId]);
  const after=await inventory();
  for(const name of ['snapshots','sources','computedEvents','computedAudit','computedEffects'])assert.equal(after[name]!.length,before[name]!.length+1,'the independent autonomous control produces one '+name);
  for(const name of ['definitions','records','opportunities','contacts','companies'])assert.deepEqual(after[name],before[name],'the autonomous snapshot preserves '+name);
  console.log(JSON.stringify({proof:'BASE-AGENT-007.5.rejected-native-write',
    pendingRpc:pending.body.id,retryRpc:retry.body.id,classes:decision.classes.map((item:{class:string})=>item.class),
    approval:handle.id,revision:approval.revision,summary_sha256:approval.summary_sha256,
    state:retained.state,code:retry.body.result._meta['com.runeditrun/error'].code,
    successContent:false,completionReceipt:false,unchangedNativeState:true,
    autonomousControl:{snapshot:snapshot.id,addedSnapshots:1,addedSources:1,addedComputedEffects:1}}));
}

test('Managed owner claim verifies RER authority and creates the native owner and session exactly once; company text cannot change MCP classification; stalled risks and cited graph proposals agree across policy and native doors', async context => {
  const fixture = await isolatedDatabase();
  try {
    const origin = 'https://orbit.example.test', issuer = 'https://rer.example.test';
    const keys = await crypto.subtle.generateKey({name: 'ECDSA', namedCurve: 'P-256'}, true, ['sign', 'verify']);
    const publicKey = await crypto.subtle.exportKey('jwk', keys.publicKey);
    const bindings = {DB: fixture.db, ASSETS: {fetch: async () => new Response('asset')} as Fetcher,
      AUTH_ORIGIN: origin, OWNER_EMAIL: 'owner@example.test', SESSION_SECRET: 's'.repeat(64), SETUP_TOKEN: 't'.repeat(64),
      RER_OWNER_CLAIM_ISSUER: issuer, RER_OWNER_CLAIM_INSTALLATION_ID: 'orbit-managed',
      RER_OWNER_CLAIM_APP_ORIGIN: origin, RER_OWNER_CLAIM_PUBLIC_KEYS: JSON.stringify({test: publicKey})};
    const options = {ownerClaimed: async () => Boolean(await fixture.db.prepare('SELECT 1 FROM owner_bootstrap').first())};
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const signed = async (overrides = {}) => {
      const now = Math.floor(Date.now() / 1000);
      const body = `${encode({alg: 'ES256', typ: 'rer-owner-claim+jwt', kid: 'test'})}.${encode({v: 1, iss: issuer, aud: origin, installationId: 'orbit-managed', email: bindings.OWNER_EMAIL, jti: crypto.randomUUID(), iat: now, exp: now + 300, ...overrides})}`;
      return body + '.' + Buffer.from(await crypto.subtle.sign({name: 'ECDSA', hash: 'SHA-256'}, keys.privateKey, new TextEncoder().encode(body))).toString('base64url');
    };
    const post = (token: string, from = origin) => identityResponse(new Request(origin + '/auth/owner-claim', {
      method: 'POST', headers: {Origin: from, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1'},
      body: JSON.stringify({token, displayName: 'Morgan Lee', returnTo: '/setup'}),
    }), bindings, options);
    const page = await identityResponse(new Request(origin + '/auth/owner-claim'), bindings, options);
    assert.equal(page!.status, 200);
    assert.equal(page!.headers.get('set-cookie'), null, 'confirmation GET is inert');
    assert.equal((await post(await signed(), issuer))!.status, 403, 'foreign POST cannot claim');
    assert.equal((await post(await signed({email: 'other@example.test'})))!.status, 403);
    assert.equal((await post(await signed({exp: Math.floor(Date.now() / 1000) - 1})))!.status, 403);
    assert.equal(await fixture.db.prepare('SELECT count(*) n FROM owner_bootstrap').first('n'), 0);
    const token = await signed(), responses = await Promise.all([post(token), post(token)]);
    assert.deepEqual(responses.map(response => response!.status).sort(), [303, 409]);
    const claimed = responses.find(response => response!.status === 303)!;
    assert.equal(claimed!.headers.get('location'), '/setup');
    const cookie = claimed!.headers.get('set-cookie')!.split(';')[0]!;
    const owner = await operatorFromRequest(new Request(origin + '/app', {headers: {Cookie: cookie}}), bindings);
    assert.equal(owner?.email, bindings.OWNER_EMAIL);
    assert.equal(await fixture.db.prepare('SELECT count(*) n FROM operators WHERE setup_owner=1').first('n'), 1);
    const direct = await identityResponse(new Request(origin + '/auth/bootstrap', {
      method: 'POST', headers: {Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1'},
      body: JSON.stringify({token: bindings.SETUP_TOKEN, displayName: 'Replacement', returnTo: '/setup'}),
    }), bindings, options);
    assert.equal(direct!.status, 409);
    assert.equal((await direct!.json() as {error: string}).error, 'already_initialized');
  } finally { await fixture.dispose(); }
  await agentDoorProof(context,async proof=>{await rejectedNativeReportProof(proof);await savedReportDeletionProof(proof);},agentDoorCollaboratorProof,agentWorkflowProof,agentDoorCaptureSecurityProof,agentDoorDraftParityProof);
  await agentDoorBusinessStopProof();
  await businessRosterErasureProof();
  await agentErasureMatcherProof();
});
