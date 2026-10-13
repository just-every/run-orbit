import assert from 'node:assert/strict';
import {test} from 'node:test';
import {isolatedDatabase} from '../support/isolated-database';
import {todayApp} from '../support/today-workspace';
import {nativeDelegation} from '../support/app';
import {delegationRoutes} from '../../src/core/features/delegation/routes';
import {random} from '../../src/core/features/delegation/protocol';
import {challenge} from '../../src/core/features/delegation/token';
import {snapshot} from '../../src/core/features/delegation/evidence';
import type {Brief} from '../../src/core/features/today/types';

test('BRIEF-005 OUT-001 SIGNAL-009 an application reads the brief and a meeting plan with crm.evidence.read and proposes cited handoffs with crm.handoff.write; consent, scope, revocation and the human send boundary hold',async()=>{
 const fixture=await isolatedDatabase(),db=fixture.db;
 try{
  const t=await todayApp(db),cookie=`__Host-orbit_session=${t.session.token}`,native=nativeDelegation(db),api=delegationRoutes(db);
  const selected=await t.opportunity('Selected renewal','Selected Co','Ana Ruiz','ana@selected.test'),hidden=await t.opportunity('Private deal','Hidden Co','Ben Hale','ben@hidden.test');
  const reply=await t.event(selected,'email.replied','Re: renewal',1),meeting=await t.event(selected,'meeting.booked','Renewal review',0),secret=await t.event(hidden,'email.replied','Re: private terms',1);
  const form=(path:string,body:Record<string,string>)=>native.request('https://orbit.test'+path,{method:'POST',headers:{Cookie:cookie,Origin:'https://orbit.test'},body:new URLSearchParams(body)});
  assert.equal((await form('/clients',{id:'agent',redirect_uri:'https://agent.test/callback'})).status,303);
  async function grant(scope:string){
   const verifier=random(),input={client_id:'agent',redirect_uri:'https://agent.test/callback',response_type:'code',state:random(),code_challenge:await challenge(verifier),code_challenge_method:'S256',account_id:'workspace',scope,targets:JSON.stringify([`opportunities/${selected}`])};
   const consent=await form('/authorize',input);assert.equal(consent.status,303,await consent.clone().text());
   const code=new URL(consent.headers.get('Location')!).searchParams.get('code')!;
   const token=(await(await api.request('https://orbit.test/token',{method:'POST',body:new URLSearchParams({grant_type:'authorization_code',client_id:'agent',redirect_uri:input.redirect_uri,code,code_verifier:verifier})})).json()).access_token as string;
   const request=(path:string,body?:unknown)=>api.request('https://orbit.test'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
   return {request,id:(await(await request('/identity')).json()).grantId as string};
  }
  const handoff=async(request:(path:string,body?:unknown)=>Promise<Response>,key:string,content:Record<string,unknown>,id=random().slice(0,32))=>{
   // The current revisions an application reads from /check and /audience; a read-only grant may not ask for the write audience.
   const target=`opportunities/${selected}/handoffs/${id}`,current=await snapshot(db,target,true);
   return request('/effects',{operationKey:key,operation:'orbit.handoff.upsert',target,expectedRevision:current.revision,expectedAudienceRevision:current.audience.audienceRevision,content:{title:'Send the renewal summary',description:'From the brief',assigneeId:t.actor,dueAt:null,status:'open',...content}});
  };
  const counts=async()=>Object.fromEntries(await Promise.all(['handoff_tasks','drafts','outbound_messages'].map(async table=>[table,(await db.prepare(`SELECT count(*) AS n FROM ${table}`).first<{n:number}>())!.n])));

  // No consent: an ambient session or an unknown bearer reads and writes nothing.
  for(const headers of [{Cookie:cookie},{Authorization:'Bearer '+'a'.repeat(64)},{}] as Record<string,string>[]){
   assert.equal((await api.request('https://orbit.test/brief',{headers})).status,401);
   assert.equal((await api.request(`https://orbit.test/plan?target=signals/${meeting}`,{headers})).status,401);
   assert.equal((await api.request('https://orbit.test/effects',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:'{}'})).status,401);
  }

  // Read scope: the brief and the plan, narrowed to the selected opportunity; no write.
  const reader=await grant('crm.evidence.read');
  const read=await(await reader.request('/brief')).json() as {brief:Brief};
  const evidence=read.brief.accounts.flatMap(a=>a.lines).map(l=>l.evidence.id);
  assert.ok(evidence.includes(reply)&&evidence.includes(meeting));assert.ok(!evidence.includes(secret)&&!read.brief.accounts.some(a=>a.name==='Hidden Co'));
  const plan=await reader.request(`/plan?target=signals/${meeting}`);assert.equal(plan.status,200);assert.equal((await plan.json()).plan.meeting.subject,'Renewal review');
  assert.equal((await reader.request(`/plan?target=signals/${secret}`)).status,404);
  const before=await counts();
  assert.equal((await handoff(reader.request,'read-only',{evidence:[reply]})).status,403);
  assert.deepEqual(await counts(),before);

  // Write scope: every proposed handoff cites evidence on that record; nothing can approve or start a message.
  assert.equal((await reader.request(`/audience?operation=orbit.handoff.upsert&target=opportunities/${selected}/handoffs/x`)).status,403);
  const writer=await grant('crm.evidence.read crm.handoff.write');
  assert.equal((await writer.request(`/audience?operation=orbit.handoff.upsert&target=opportunities/${selected}/handoffs/x`)).status,200);
  assert.equal((await handoff(writer.request,'foreign',{evidence:[secret]})).status,422);
  for(const extra of [{recipient:'ana@selected.test',subject:'Hi',body:'Approved'},{approve:true},{send:true}])assert.equal((await handoff(writer.request,'mail-'+Object.keys(extra)[0],{evidence:[reply],...extra})).status,400);
  assert.equal((await handoff(writer.request,'sent-status',{evidence:[reply],status:'sent'})).status,400);
  assert.deepEqual(await counts(),before);
  const proposal=await handoff(writer.request,'cited',{evidence:[reply,meeting]});assert.equal(proposal.status,200,await proposal.clone().text());
  const target=(await proposal.json()).receipt.target as string,taskId=target.split('/')[3]!;
  assert.deepEqual((await(await writer.request('/effects/cited')).json()).observed.content.evidence,[reply,meeting]);
  const proposed=(await t.brief()).accounts.flatMap(a=>a.lines).filter(l=>l.kind==='handoff-proposed');
  assert.deepEqual(proposed.map(l=>[l.evidence.id,l.detail]),[[taskId,'Proposed by agent; cites 2 evidence items; accept, edit or dismiss']]);

  // A person accepts the proposal: one attributed timeline entry; still no draft or message.
  const listed=await(await native.request(`https://orbit.test/handoffs/${selected}`,{headers:{Cookie:cookie}})).json() as {tasks:{target:string;revision:string;audienceRevision:string;task:Record<string,unknown>}[]};
  const entry=listed.tasks.find(item=>item.target===target)!;assert.equal(entry.task.source_client_id,'agent');
  const accept=await native.request('https://orbit.test/handoffs',{method:'POST',headers:{Cookie:cookie,Origin:'https://orbit.test','Content-Type':'application/json'},body:JSON.stringify({operationKey:random().slice(0,40),operation:'orbit.handoff.upsert',target,expectedRevision:entry.revision,expectedAudienceRevision:entry.audienceRevision,content:{title:'Send the renewal summary',description:'From the brief',assigneeId:t.actor,dueAt:null,status:'open'},review:'accepted'})});
  assert.equal(accept.status,200,await accept.clone().text());
  const accepted=await db.prepare("SELECT actor_type,actor_id,json_extract(payload_json,'$.proposedBy') AS proposedBy,json_extract(payload_json,'$.evidence') AS evidence FROM timeline_entries WHERE kind='handoff.accepted' AND json_extract(payload_json,'$.handoffId')=?").bind(taskId).all();
  assert.deepEqual(accepted.results,[{actor_type:'operator',actor_id:t.actor,proposedBy:'agent',evidence:JSON.stringify([reply,meeting])}]);
  assert.equal((await db.prepare('SELECT source_client_id FROM handoff_tasks WHERE id=?').bind(taskId).first<{source_client_id:string|null}>())!.source_client_id,null);
  const after=await counts();assert.deepEqual([after.drafts,after.outbound_messages],[before.drafts,before.outbound_messages]);

  // Revoking stops every further read and write at once.
  assert.equal((await form(`/grants/${writer.id}/revoke`,{})).status,303);
  for(const path of ['/brief',`/plan?target=signals/${meeting}`,'/effects/cited'])assert.equal((await writer.request(path)).status,401,path);
  assert.equal((await handoff(writer.request,'after-revoke',{evidence:[reply]})).status,401);
  assert.equal((await reader.request('/brief')).status,200,'revoking one grant leaves another consented grant alone');
  assert.equal((await reader.request('/revoke',{})).status,200);assert.equal((await reader.request('/brief')).status,401);
 }finally{await fixture.dispose();}
});
