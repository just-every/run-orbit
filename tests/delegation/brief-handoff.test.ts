import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {test} from 'node:test';
import {isolatedDatabase} from '../support/isolated-database';
import {todayApp} from '../support/today-workspace';
import {nativeDelegation} from '../support/app';
import {eml} from '../support/capture-mail';
import {delegationRoutes} from '../../src/core/features/delegation/routes';
import {random} from '../../src/core/features/delegation/protocol';
import {challenge} from '../../src/core/features/delegation/token';
import {snapshot} from '../../src/core/features/delegation/evidence';
import type {Brief} from '../../src/core/features/today/types';
import {createSourceSecurity} from '../../src/core/platform/source-security';
import {zoomNetwork} from '../support/zoom-network.mjs';

test('BRIEF-005 OUT-001 SIGNAL-009 an application reads the brief and a meeting plan with crm.evidence.read and proposes cited handoffs with crm.handoff.write; consent, scope, revocation and the human send boundary hold',async()=>{
 const fixture=await isolatedDatabase(),db=fixture.db;
 try{
  const zoom=zoomNetwork(['ana@selected.test','ben@hidden.test','cy@hidden.test']),security=createSourceSecurity({ORBIT_ENCRYPTION_KEY:'bc'.repeat(32)})!;
  const zoomTitle='Synthetic review with Ben Hale';
  zoom.meetings.get('98765432101')!.topic=zoomTitle;
  const t=await todayApp(db,{calling:{sourceSecurity:security,captureOrigin:'https://orbit.test',captureFetch:zoom.fetch}}),cookie=`__Host-orbit_session=${t.session.token}`,native=nativeDelegation(db),api=delegationRoutes(db);
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

  // A completed Zoom plan is still a selected-record read, including its nested recap and attendance.
  await db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(t.actor).run();
  await t.json('/api/v1/settings/zoom/connect',{body:zoom.credentials},200);
  const selection={meetingId:'98765432101',opportunityId:hidden},preview=await t.json<any>('/api/v1/zoom/meetings/preview',{body:selection},200);
  const attached=await t.json<any>('/api/v1/zoom/meetings/attach',{body:{...selection,previewDigest:preview.digest,confirmed:true}},201),zoomSignal=attached.signalId as string;
  const saved=await t.json<{entryId:string}>(`/api/v1/today/meetings/${zoomSignal}/plan`,{method:'PUT',body:{agenda:'Confidential acquisition terms',prep:'Private deal preparation'}},200);
  const endedAt=new Date().toISOString(),timestamp=String(Math.floor(Date.now()/1000)),raw=JSON.stringify({event:'meeting.ended',event_ts:Date.now(),payload:{object:{id:Number(selection.meetingId),uuid:preview.meeting.uuid,end_time:endedAt}}});
  const completed=await t.app.request('https://orbit.test/api/v1/signals/zoom',{method:'POST',headers:{'content-type':'application/json','x-zm-request-timestamp':timestamp,'x-zm-signature':'v0='+createHmac('sha256',zoom.credentials.webhookSecret).update(`v0:${timestamp}:${raw}`).digest('hex')},body:raw});
  assert.equal(completed.status,200,await completed.clone().text());
  const contactReader=await grant('crm.evidence.read',[`contacts/${ana}`]),zoomResponse=await contactReader.request(`/plan?target=signals/${zoomSignal}`),zoomText=await zoomResponse.text();
  assert.equal(zoomResponse.status,200,zoomText);
  for(const leak of [ben,'ben@hidden.test','Ben Hale','cy@hidden.test',hidden,hiddenCompany,'Private deal','Hidden Co','Confidential acquisition terms','Private deal preparation',saved.entryId])assert.ok(!zoomText.includes(leak),`a contact grant discloses no other Zoom identity or deal, even in nested fields: ${leak}`);
  const limited=JSON.parse(zoomText).plan;assert.ok(typeof limited.meeting.subject==='string'&&limited.meeting.subject.length>0);
  assert.deepEqual(limited.attendees.map((person:any)=>[person.contact.id,person.contact.name,person.email,person.company,person.opportunities]),[[ana,'Ana Ruiz','ana@selected.test',null,[]]]);
  assert.deepEqual(limited.zoom.attendance.map((person:any)=>[person.email,person.match.contactId,person.joinedAt,person.leftAt]),[['ana@selected.test',ana,zoom.attendance[0].join_time,zoom.attendance[0].leave_time]]);
  assert.deepEqual(limited.unresolved,[]);assert.equal(limited.primaryOpportunityId,null);assert.deepEqual(limited.opportunities,[]);assert.equal(limited.note,null);
  assert.equal(limited.zoom.state,'completed');assert.equal(limited.zoom.completedAt,endedAt);assert.ok(limited.zoom.recap.summary.includes('1 attendance records'));
  assert.equal(limited.zoom.hostId,null);
  assert.equal(limited.zoom.recap.citations.find((citation:any)=>citation.kind==='completion').href,`/app/meetings/${zoomSignal}`);
  const owner=(await t.json<any>(`/api/v1/today/meetings/${zoomSignal}`,{},200)).plan;
  assert.equal(owner.meeting.subject,zoomTitle,'the owner retains the complete provider title');
  assert.deepEqual(owner.zoom.attendance.map((person:any)=>person.email),['ana@selected.test','ben@hidden.test','cy@hidden.test']);
  assert.deepEqual(owner.attendees.map((person:any)=>person.contact.id).sort(),[ana,ben].sort());assert.ok(owner.unresolved.some((person:any)=>person.email==='cy@hidden.test'));
  assert.equal(owner.primaryOpportunityId,hidden);assert.ok(owner.opportunities.some((deal:any)=>deal.id===hidden&&deal.title==='Private deal'));
  assert.equal(owner.note.agenda,'Confidential acquisition terms');assert.ok(owner.zoom.recap.summary.includes('3 attendance records'));
  assert.equal(owner.zoom.hostId,preview.meeting.hostId);assert.equal(owner.zoom.joinUrl,preview.meeting.joinUrl);
  assert.ok(owner.zoom.recap.citations.find((citation:any)=>citation.kind==='completion').href.startsWith(`/app/opportunities/${hidden}#entry-`));
  const dealReader=await grant('crm.evidence.read',[`opportunities/${hidden}`]),dealPlan=(await(await dealReader.request(`/plan?target=signals/${zoomSignal}`)).json()).plan;
  assert.deepEqual(dealPlan.zoom.attendance.map((person:any)=>person.match.contactId).sort(),[ana,ben].sort());
  assert.equal(dealPlan.meeting.subject,zoomTitle,'a grant including both known attendees retains the title');
  assert.equal(dealPlan.primaryOpportunityId,hidden);assert.equal(dealPlan.note.agenda,owner.note.agenda);assert.deepEqual(dealPlan.zoom.recap.citations,owner.zoom.recap.citations);
  const signalReader=await grant('crm.evidence.read',[`signals/${zoomSignal}`]),signalResponse=await signalReader.request(`/plan?target=signals/${zoomSignal}`),signalText=await signalResponse.text();assert.equal(signalResponse.status,200,signalText);
  for(const leak of ['Ben Hale',ana,ben,'ana@selected.test','ben@hidden.test','cy@hidden.test',hidden,hiddenCompany,'Confidential acquisition terms'])assert.ok(!signalText.includes(leak),`a signal-only grant discloses no Zoom identity or deal: ${leak}`);
  assert.deepEqual(JSON.parse(signalText).plan.zoom.attendance,[]);assert.ok(JSON.parse(signalText).plan.meeting.subject.length>0);
  for(const application of [contactReader,signalReader]){
   const briefResponse=await application.request('/brief'),briefText=await briefResponse.text();assert.equal(briefResponse.status,200,briefText);
   assert.ok(!briefText.includes('Ben Hale'),'the complete brief never echoes an unselected attendee in a meeting title');
   if(application===signalReader)assert.ok(JSON.parse(briefText).brief.selectedSignals.some((line:any)=>line.evidence.id===zoomSignal));
   const recordsResponse=await application.request('/records'),recordsText=await recordsResponse.text();assert.equal(recordsResponse.status,200,recordsText);
   assert.ok(!recordsText.includes('Ben Hale'),'the complete records response never echoes an unselected attendee in a meeting title');
   if(application===contactReader){assert.ok(recordsText.includes(ana));assert.ok(recordsText.includes('Ana Ruiz'));}
   else {
    assert.ok(JSON.parse(recordsText).items.some((item:any)=>item.target===`signals/${zoomSignal}`&&item.name.length>0));
    const searched=await application.request('/records?q='+encodeURIComponent('Ben Hale'));assert.equal(searched.status,200);assert.deepEqual((await searched.json()).items,[],'searching an unselected name cannot discover the meeting');
    const evidenceResponse=await application.request(`/evidence?target=signals/${zoomSignal}`),evidenceText=await evidenceResponse.text();assert.equal(evidenceResponse.status,200,evidenceText);
    assert.ok(!evidenceText.includes('Ben Hale'),'neither the evidence title nor embedded source title echoes an unselected name');
   }
  }
  const authorizedRecords=await(await dealReader.request('/records')).text();assert.ok(authorizedRecords.includes(hidden)&&authorizedRecords.includes('Private deal'));

  assert.equal((await reader.request(`/plan?target=signals/${zoomSignal}`)).status,404,'an unrelated selected deal does not grant the Zoom plan');
  assert.deepEqual(zoom.unexpected,[]);
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
});
