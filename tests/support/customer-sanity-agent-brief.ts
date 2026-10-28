import assert from 'node:assert/strict';
import {isolatedDatabase} from './isolated-database';
import {todayApp} from './today-workspace';
import {nativeDelegation} from './app';
import {eml} from './capture-mail';
import {delegationRoutes} from '../../src/core/features/delegation/routes';
import {random} from '../../src/core/features/delegation/protocol';
import {challenge} from '../../src/core/features/delegation/token';
import {snapshot} from '../../src/core/features/delegation/evidence';
import type {Brief} from '../../src/core/features/today/types';


export async function agentBriefJourney() {

 const fixture=await isolatedDatabase(),db=fixture.db;
 try{
  const t=await todayApp(db),cookie=`__Host-orbit_session=${t.session.token}`,native=nativeDelegation(db),api=delegationRoutes(db);
  const selected=await t.opportunity('Selected renewal','Selected Co','Ana Ruiz','ana@selected.test'),hidden=await t.opportunity('Private deal','Hidden Co','Ben Hale','ben@hidden.test');
  const reply=await t.event(selected,'email.replied','Re: renewal',1),meeting=await t.event(selected,'meeting.booked','Renewal review',0),secret=await t.event(hidden,'email.replied','Re: private terms',1);
  const form=(path:string,body:Record<string,string>)=>native.request('https://orbit.test'+path,{method:'POST',headers:{Cookie:cookie,Origin:'https://orbit.test'},body:new URLSearchParams(body)});
  assert.equal((await form('/clients',{id:'agent',redirect_uri:'https://agent.test/callback'})).status,303);
  async function grant(scope:string,targets=[`opportunities/${selected}`]){
   const verifier=random(),input={client_id:'agent',redirect_uri:'https://agent.test/callback',response_type:'code',state:random(),code_challenge:await challenge(verifier),code_challenge_method:'S256',account_id:'workspace',scope,targets:JSON.stringify(targets)};
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
  // A contact shared with the ungranted deal, and an unknown attendee at its domain, open nothing outside the grant.
  const ana=(await db.prepare('SELECT contact_id AS id FROM opportunity_contacts WHERE opportunity_id=?').bind(selected).first<{id:string}>())!.id;
  const hiddenCompany=(await db.prepare('SELECT company_id AS id FROM opportunities WHERE id=?').bind(hidden).first<{id:string}>())!.id,ben=(await db.prepare('SELECT contact_id AS id FROM opportunity_contacts WHERE opportunity_id=?').bind(hidden).first<{id:string}>())!.id;
  await t.json(`/api/v1/records/opportunity/${hidden}`,{method:'PUT',body:{contact_ids:[ben,ana],primary_contact_id:ben,title:'Private deal',stage_id:(await db.prepare('SELECT stage_id AS id FROM opportunities WHERE id=?').bind(hidden).first<{id:string}>())!.id,company_id:hiddenCompany,value_cents:500000,owner_id:t.actor,custom_fields:{}}},200);
  await t.json(`/api/v1/records/company/${hiddenCompany}`,{method:'PUT',body:{name:'Hidden Co',primary_domain:'hidden.test',custom_fields:{}}},200);
  const draft=(await t.json<{id:string}>(`/api/v1/workbench/opportunities/${hidden}/drafts`,{body:{contactId:ana,subject:'Confidential acquisition terms',body:'Numbers.'}},201)).id;
  const at=(ms:number)=>new Date(Date.now()+ms).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''),files=new FormData();
  files.append('files',new File([['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Fixture//EN','METHOD:REQUEST','BEGIN:VEVENT',`UID:${random().slice(0,16)}@selected.test`,'SEQUENCE:0',`DTSTAMP:${at(-600000)}`,`DTSTART:${at(86400000)}`,`DTEND:${at(88200000)}`,'SUMMARY:Shared review',`ORGANIZER:mailto:${t.actor.toLowerCase()}@seller.test`,'ATTENDEE:mailto:ana@selected.test','ATTENDEE:mailto:cy@hidden.test','STATUS:CONFIRMED','END:VEVENT','END:VCALENDAR'].join('\r\n')],'invite.ics',{type:'text/calendar'}));
  await t.json('/api/v1/capture/imports',{form:files},201);
  const shared=(await db.prepare("SELECT id FROM signals WHERE subject='Shared review'").first<{id:string}>())!.id;
  await t.json(`/api/v1/capture/proposals/${(await db.prepare("SELECT id FROM capture_proposals WHERE signal_id=? AND kind='link_signal'").bind(shared).first<{id:string}>())!.id}/accept`,{body:{}},200);
  const sharedPlan=await reader.request(`/plan?target=signals/${shared}`),sharedText=await sharedPlan.clone().text();assert.equal(sharedPlan.status,200,sharedText);
  for(const leak of [hidden,hiddenCompany,draft,'Confidential acquisition terms','Hidden Co'])assert.ok(!sharedText.includes(leak),`the plan discloses nothing outside the grant: ${leak}`);
  assert.deepEqual((await sharedPlan.json()).plan.unresolved,[{email:'cy@hidden.test',company:null}]);
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

  // An application granted only captured signals sees them, and no name, company or record id beyond its grant.
  const capture=async(from:string,subject:string)=>{const mail=new FormData();mail.append('files',new File([eml({From:from,To:'seller@seller.test',Subject:subject,Date:new Date(Date.now()-3600000).toUTCString(),'Message-ID':`<${random().slice(0,16)}@hidden.test>`},'Body.')],'m.eml',{type:'message/rfc822'}));await t.json('/api/v1/capture/imports',{form:mail},201);
   return (await db.prepare('SELECT id FROM signals WHERE subject=?').bind(subject).first<{id:string}>())!.id;};
  const fromBen=await capture('Ben Hale <ben@hidden.test>','Question on terms'),fromCy=await capture('Cy New <cy@hidden.test>','Intro from Cy');
  const signalsOnly=await grant('crm.evidence.read',[`signals/${fromBen}`,`signals/${fromCy}`]),withBen=await grant('crm.evidence.read',[`signals/${fromBen}`,`contacts/${ben}`]);
  const briefOf=async(app:typeof reader)=>{const text=await(await app.request('/brief')).text();return {text,brief:(JSON.parse(text) as {brief:Brief}).brief};};
  const outside=[hidden,hiddenCompany,ben,'Hidden Co','Private deal'];
  let seen=await briefOf(signalsOnly);
  assert.deepEqual(seen.brief.held.map(l=>[l.evidence.id,l.detail]).sort(),[[fromBen,'Held for review'],[fromCy,'Held for review']].sort());
  for(const leak of [...outside,'Ben Hale'])assert.ok(!seen.text.includes(leak),`a held line names nothing outside the grant: ${leak}`);
  assert.equal((await briefOf(withBen)).brief.held.find(l=>l.evidence.id===fromBen)!.detail,'Held for review: proposed link to Ben Hale','a granted contact may be named');
  await t.json(`/api/v1/capture/proposals/${(await db.prepare("SELECT id FROM capture_proposals WHERE signal_id=? AND kind='link_signal'").bind(fromBen).first<{id:string}>())!.id}/accept`,{body:{}},200);
  seen=await briefOf(signalsOnly);
  assert.deepEqual(seen.brief.accounts,[]);assert.deepEqual(seen.brief.selectedSignals.map(l=>[l.evidence.id,l.records]),[[fromBen,[]]]);
  for(const leak of [...outside,'Ben Hale'])assert.ok(!seen.text.includes(leak),`a linked signal names no ungranted record: ${leak}`);
  seen=await briefOf(withBen);
  assert.deepEqual(seen.brief.accounts.map(a=>[a.key,a.name,a.lines.map(l=>[l.evidence.id,l.records])]),[[`contact:${ben}`,'Ben Hale',[[fromBen,[{type:'contact',id:ben}]]]]]);
  for(const leak of outside.slice(0,2).concat(outside.slice(3)))assert.ok(!seen.text.includes(leak),`a granted contact opens neither its company nor its deals: ${leak}`);
 }finally{await fixture.dispose();}

}
