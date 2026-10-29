import {exerciseRecordMail} from '../support/record-mail';
import assert from 'node:assert/strict';
import { after,test } from 'node:test';
import { isolatedDatabase } from '../support/isolated-database';
import { createDependencies } from '../support/dependencies';
import { createApp } from '../support/app';
import { createId } from '../../src/core/shared/ids';
import { createSourceSecurity,payloadHash } from '../../src/core/platform/source-security';
import { createSignalIngress } from '../../src/core/features/ingestion/routes';
import { IngestionRepository } from '../../src/core/features/ingestion/repository';
import { WorkbenchRepository } from '../../src/core/features/workbench/repository';
import { OutreachRepository } from '../../src/core/features/workbench/outreach-repository';
import { ApprovalRepository } from '../../src/core/features/outreach/approval-repository';
import { OutreachService } from '../../src/core/features/outreach/service';
import { nextPermitted,workingDaysAfter,localTime } from '../../src/core/features/outreach/time';
import { signedReplies } from '../support/signed-reply';
const platform=await isolatedDatabase();after(()=>platform.dispose());const db=platform.db;
async function fixture(){const deps=createDependencies(db),actor=createId(),stage=createId(),at=new Date().toISOString();await deps.auth.ensureOperator({id:actor,email:`${actor}@test.example`,displayName:'Signals operator'});await deps.workspace.ensureWorkspace({name:'Signals workspace',timezone:'UTC',currency:'USD',workingHours:{},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:['gmail.com']});const position=await db.prepare('SELECT COALESCE(MAX(position),0)+1 AS n FROM pipeline_stages').first<{n:number}>();await deps.workspace.ensurePipelineStage({id:stage,name:'Test',position:position!.n});const email=`${createId()}@customer.example`;const opportunity=await new WorkbenchRepository(db).createOpportunity({title:'Signals test',companyName:'Customer',contactName:'Contact',email,stageId:stage,valueCents:100},actor);const contact=await db.prepare('SELECT contact_id FROM opportunity_contacts WHERE opportunity_id=?').bind(opportunity.id).first<{contact_id:string}>();return{actor,opportunityId:opportunity.id,contactId:contact!.contact_id,email,at};}
async function sign(secret:string,body:string,timestamp:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`${timestamp}.${body}`))),b=>b.toString(16).padStart(2,'0')).join('');}
test('SIGNAL-001 SIGNAL-003 SIGNAL-004 SIGNAL-007 SIGNAL-008 signed replay-safe ingestion links exact identity; unauthorized and anonymous tracking write nothing',async()=>{
 const f=await fixture(),security=createSourceSecurity({ORBIT_ENCRYPTION_KEY:'11'.repeat(32)})!,repository=new IngestionRepository(db),source=createId(),secret='source-secret-'.repeat(4);await repository.configure({id:source,name:'Source',enabled:true,secret},security);const app=createSignalIngress(db,security),timestamp=String(Math.floor(Date.now()/1000));
 const event={eventId:createId(),type:'email.replied',subject:'Reply',occurredAt:f.at,email:f.email};const raw=JSON.stringify(event),signature=await sign(secret,raw,timestamp);
 const request=(body=raw,sig=signature)=>app.request(`https://orbit.test/${source}`,{method:'POST',headers:{'X-Orbit-Timestamp':timestamp,'X-Orbit-Signature':sig},body});
 assert.equal((await request(raw,'invalid')).status,401);assert.equal((await request('x'.repeat(262145))).status,413);
 const results=await Promise.all([request(),request()]);assert.deepEqual(results.map(r=>r.status),[201,201]);const ids=await Promise.all(results.map(r=>r.json() as Promise<{id:string}>));assert.equal(ids[0]!.id,ids[1]!.id);
 const changed=JSON.stringify({...event,subject:'Different'});assert.equal((await request(changed,await sign(secret,changed,timestamp))).status,409);
 const signal=await db.prepare('SELECT COUNT(*) AS n FROM signals WHERE source_id=?').bind(source).first<{n:number}>();assert.equal(signal?.n,1);
 const score=await db.prepare('SELECT score FROM opportunities WHERE id=?').bind(f.opportunityId).first<{score:number}>();assert.equal(score?.score,40);
 const tracking={...event,eventId:createId(),type:'page.viewed'};await repository.ingest(source,tracking,await payloadHash(JSON.stringify(tracking)),JSON.stringify(tracking));const unlinked=await repository.unlinked();assert.ok(unlinked.some(row=>row.type==='page.viewed'));
 const diagnostics=await repository.sources();assert.equal(diagnostics.find(row=>row.id===source)?.rejected_count,1);
});
test('OUT-008 recipient clocks respect weekdays, DST and time to review an out-of-hours send',async context=>{
 const sunday=new Date('2026-09-13T10:00:00Z');assert.equal(nextPermitted(sunday,'Europe/London').toISOString(),'2026-09-14T07:00:00.000Z');
 const friday=new Date('2026-10-30T14:00:00Z');const due=workingDaysAfter(friday,1,'America/New_York');assert.equal(due.toISOString(),'2026-11-02T15:00:00.000Z','The working-day deadline stays at 10am after the DST transition');
 context.mock.timers.enable({apis:['Date'],now:Date.parse('2030-01-07T06:59:30Z')});
 try{
  const f=await fixture(),outreach=new OutreachRepository(db);let sends=0;
  const app=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})},outboundMail:{send:async()=>{sends++;return{providerMessageId:'test-confirmed'};}}}),session=await createDependencies(db).auth.createSession(f.actor);
  const request=(path:string,body?:unknown)=>app.request(`https://orbit.test/api/v1/workbench/${path}`,{method:body?'POST':'GET',headers:{Cookie:`__Host-orbit_session=${session.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  const draft=await outreach.createDraft(f.opportunityId,{contactId:f.contactId,subject:'Take time to review',body:'The exact approved message'},f.actor);
  const preview=await (await request(`drafts/${draft.id}/approval-preview`)).json() as {localTime:string};
  context.mock.timers.tick(61000);
  assert.equal((await request(`drafts/${draft.id}/approve`,{revision:1,quietHoursConfirmation:preview.localTime})).status,200,'Confirmation survives the minute boundary');
  assert.equal(sends,1);
  const next=await outreach.createDraft(f.opportunityId,{contactId:f.contactId,subject:'Expired review',body:'Still needs approval'},f.actor);
  const expired=await (await request(`drafts/${next.id}/approval-preview`)).json() as {localTime:string};
  context.mock.timers.tick(11*60000);
  assert.equal((await request(`drafts/${next.id}/approve`,{revision:1,quietHoursConfirmation:expired.localTime})).status,409,'An old confirmation requires review again');
  assert.equal(sends,1);
 }finally{context.mock.timers.reset();}
});
test('OUT-014 missing merge fields block; template revisions never rewrite approved content',async()=>{
 const f=await fixture(),second=await fixture(),outreach=new OutreachRepository(db),approval=new ApprovalRepository(db);await db.prepare("UPDATE outbound_messages SET claimed_at='2000-01-01T00:00:00.000Z' WHERE claimed_at IS NOT NULL").run();
 await db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(f.actor).run();
 const ownerSession=await createDependencies(db).auth.createSession(f.actor),repSession=await createDependencies(db).auth.createSession(second.actor);
 const edge:{recipient_email:string;subject:string;body:string}[]=[];
 const libraryApp=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})},outboundMail:{send:async input=>{edge.push(input);return{providerMessageId:'library-receipt'};}}});
 const api=async(path:string,method='GET',data?:unknown,token=ownerSession.token)=>libraryApp.request(`https://orbit.test/api/v1/${path}`,{method,headers:{Cookie:`__Host-orbit_session=${token}`,Origin:'https://orbit.test','Content-Type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)})});
 const content={kind:'template',name:'Discovery follow-up',subject:'Next steps for {{company.name}}',body:'Hi {{contact.name}},\nYour role: {{contact.job_title}}.\nLet’s discuss {{deal.title}}.',visibility:'shared'};
 assert.equal((await api('library','POST',content,repSession.token)).status,403,'Only the current administrator can share content');
 const saved=await api('library','POST',content);assert.equal(saved.status,201);const template=await saved.json() as {id:string;revision:number};
 const snippet=await (await api('library','POST',{kind:'snippet',name:'Meeting note',body:'We can review the plan with {{contact.name}}.',visibility:'shared'})).json() as {id:string};
 const signature=await (await api('library','POST',{kind:'signature',name:'Sales signature',body:'Best,\nThe Customer team',visibility:'shared'})).json() as {id:string};
 const privateResult=await api('library','POST',{kind:'signature',name:'Personal signature',body:'Private signature',visibility:'private'},repSession.token);assert.equal(privateResult.status,201);const privateEntry=await privateResult.json() as {id:string};
 assert.ok(!(await (await api('library')).json() as {entries:{id:string}[]}).entries.some(entry=>entry.id===privateEntry.id),'Private entries never appear to other operators');
 assert.equal((await api(`library/${template.id}`,'PUT',{...content,revision:template.revision},repSession.token)).status,403);
 // A real collaborator class has no message-library or approval authority, regardless of shared visibility.
 const collaborator=createId();await db.prepare('INSERT INTO access_collaborators(operator_id,invited_at) VALUES(?,?)').bind(collaborator,f.at).run();await createDependencies(db).auth.ensureOperator({id:collaborator,email:`${collaborator}@test.example`,displayName:'Library collaborator'});
 const collaboratorSession=await createDependencies(db).auth.createSession(collaborator);
 assert.equal((await api('library','GET',undefined,collaboratorSession.token)).status,403);assert.equal((await api('library','POST',content,collaboratorSession.token)).status,403);
 await db.prepare("UPDATE contacts SET name='Maya Chen',job_title='Operations lead' WHERE id=?").bind(f.contactId).run();
 await db.prepare("UPDATE contacts SET name='Jordan Lee',job_title=NULL WHERE id=?").bind(second.contactId).run();
 const libraryDrafts=[];
 for(const target of [f,second]){const created=await api(`workbench/opportunities/${target.opportunityId}/drafts`,'POST',{contactId:target.contactId,subject:'Initial subject',body:'Initial body'});assert.equal(created.status,201);const draft=await created.json() as {id:string};assert.equal((await api(`library/drafts/${draft.id}/apply`,'POST',{revision:1,templateId:template.id,snippetId:snippet.id,signatureId:signature.id})).status,200);libraryDrafts.push(draft);}
 const [personalized,missingDraft]=libraryDrafts as [{id:string},{id:string}];
 assert.equal((await api(`library/drafts/${personalized.id}/apply`,'POST',{revision:2,templateId:template.id},collaboratorSession.token)).status,403);
 assert.equal((await api(`workbench/drafts/${personalized.id}/approve`,'POST',{revision:2},collaboratorSession.token)).status,403);
 assert.equal((await api(`library/drafts/${personalized.id}/apply`,'POST',{revision:2,signatureId:privateEntry.id})).status,404,'Private content cannot be applied by another operator');
 const missing=await (await api(`library/drafts/${missingDraft.id}/render`)).json() as {missing:string[];body:string;reviewHash:string};assert.ok(missing.missing.includes('contact.job_title'));assert.match(missing.body,/Jordan Lee/);
 assert.equal((await api(`library/drafts/${missingDraft.id}/render`,'POST',{revision:2,reviewHash:missing.reviewHash})).status,409);
 const schedule={revision:2,scheduledAt:'2030-01-07T10:00:00.000Z'};
 assert.equal((await api(`workbench/drafts/${missingDraft.id}/approve`,'POST',schedule)).status,409);
 let rendered=await (await api(`library/drafts/${personalized.id}/render`)).json() as {reviewHash:string;subject:string;body:string};
 assert.match(rendered.body,/Maya Chen/);assert.match(rendered.body,/Operations lead/);
 assert.equal((await api(`library/drafts/${personalized.id}/render`,'POST',{revision:2,reviewHash:rendered.reviewHash})).status,200);
 await db.prepare("UPDATE contacts SET job_title='VP Operations' WHERE id=?").bind(f.contactId).run();
 assert.equal((await api(`workbench/drafts/${personalized.id}/approve`,'POST',schedule)).status,409,'Stale merge values block approval');
 assert.equal((await api(`library/drafts/${personalized.id}/render`,'POST',{revision:2,reviewHash:rendered.reviewHash})).status,409,'A stale preview cannot mark current values reviewed');
 rendered=await (await api(`library/drafts/${personalized.id}/render`)).json() as typeof rendered;
 assert.equal((await api(`library/drafts/${personalized.id}/render`,'POST',{revision:2,reviewHash:rendered.reviewHash})).status,200);
 const approved=await api(`workbench/drafts/${personalized.id}/approve`,'POST',schedule);assert.equal(approved.status,200);const approvedMessage=await approved.json() as {id:string};
 const before=await approval.message(approvedMessage.id);assert.equal(before.body,rendered.body);assert.equal(before.subject,rendered.subject);
 assert.equal((await api(`library/${template.id}`,'PUT',{...content,body:'Changed library body for {{contact.name}}',revision:1})).status,200);
 assert.equal((await api(`workbench/drafts/${missingDraft.id}/approve`,'POST',schedule)).status,409,'Unapproved selections need the current template revision');
 assert.ok((await (await api(`library/drafts/${missingDraft.id}/render`)).json() as {stale:string[]}).stale.length>0,'The review names the stale library revision');
 const libraryService=new OutreachService(db,{send:async input=>{edge.push(input);return{providerMessageId:'library-receipt'};}});await libraryService.dispatchDue(new Date(schedule.scheduledAt));await libraryService.dispatchDue(new Date(schedule.scheduledAt));
 assert.deepEqual(edge.map(({recipient_email,subject,body})=>({recipient_email,subject,body})),[{recipient_email:f.email.toLowerCase(),subject:rendered.subject,body:rendered.body}],'Dispatch sends exactly the approved rendered bytes once after a library revision');
 const after=await approval.message(approvedMessage.id);assert.equal(after.body,before.body);assert.equal(after.subject,before.subject);assert.equal(after.render_snapshot_json,before.render_snapshot_json);
 const now=new Date('2030-01-07T09:00:00Z'),requestedAt='2030-01-12T00:00:00Z'; // Saturday 10am in Brisbane.
 await db.prepare("UPDATE contacts SET timezone='Australia/Brisbane' WHERE id=?").bind(f.contactId).run();
 const draft=await outreach.createDraft(f.opportunityId,{contactId:f.contactId,subject:'Approved',body:'Exact approved body'},f.actor);let calls=0;
 const mail={send:async(input:{body:string})=>{calls++;assert.equal(input.body,'Exact approved body');return{providerMessageId:'receipt'};}};
 const background:Promise<unknown>[]=[];
 const app=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})},outboundMail:mail,hosted:true}),session=await createDependencies(db).auth.createSession(f.actor);
 const request=(path:string,body?:unknown)=>app.request(`https://orbit.test/api/v1/workbench/${path}`,{method:body?'POST':'GET',headers:{Cookie:`__Host-orbit_session=${session.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined},undefined,{waitUntil(promise:Promise<unknown>){background.push(promise);},passThroughOnException(){}} as ExecutionContext);
 const previewResponse=await request(`drafts/${draft.id}/approval-preview?scheduledAt=${encodeURIComponent(requestedAt)}`);assert.equal(previewResponse.status,200);
 const preview=await previewResponse.json() as {scheduledAt:string;scheduledLocalTime:string;timezone:string;scheduleReason:string};
 assert.equal(preview.scheduledAt,'2030-01-13T22:00:00.000Z');assert.equal(preview.timezone,'Australia/Brisbane');assert.equal(preview.scheduledLocalTime,localTime(new Date(preview.scheduledAt),preview.timezone).label);assert.ok(typeof preview.scheduleReason==='string'&&preview.scheduleReason.length>0,'Adjusted schedules explain why before approval');assert.equal(calls,0);
 const approve=(confirmed:string)=>request(`drafts/${draft.id}/approve`,{revision:1,scheduledAt:requestedAt,scheduledAtConfirmation:confirmed});
 assert.equal((await approve(requestedAt)).status,409,'Unreviewed adjustments are refused');
 await db.prepare("UPDATE contacts SET timezone='UTC' WHERE id=?").bind(f.contactId).run();assert.equal((await approve(preview.scheduledAt)).status,409,'A changed recipient clock requires a fresh review');
 await db.prepare("UPDATE contacts SET timezone='Australia/Brisbane' WHERE id=?").bind(f.contactId).run();
 const response=await approve(preview.scheduledAt);assert.equal(response.status,200);const message=await response.json() as {id:string;state:string;scheduledAt:string};assert.equal(message.state,'scheduled');assert.equal(message.scheduledAt,preview.scheduledAt);
 await Promise.all(background);
 const service=new OutreachService(db,mail);await service.dispatchDue(new Date(requestedAt));assert.equal(calls,0);await service.dispatchDue(new Date(message.scheduledAt));await service.dispatchDue(new Date(message.scheduledAt));assert.equal(calls,1);
 const next=await outreach.createDraft(f.opportunityId,{contactId:f.contactId,subject:'Stop',body:'Must not send'},f.actor);await approval.approve(next.id,1,f.actor,{now,scheduledAt:message.scheduledAt});await db.prepare("UPDATE contacts SET contactability='do_not_contact' WHERE id=?").bind(f.contactId).run();await service.dispatchDue(new Date(message.scheduledAt));assert.equal(calls,1);
});

test('OUT-011 unknown delivery reconciles by durable provider key and never submits again',async()=>{
 const f=await fixture(),outreach=new OutreachRepository(db),approval=new ApprovalRepository(db);await db.prepare("UPDATE outbound_messages SET claimed_at='2000-01-01T00:00:00.000Z' WHERE claimed_at IS NOT NULL").run();
 const draft=await outreach.createDraft(f.opportunityId,{contactId:f.contactId,subject:'Unknown',body:'Reviewed body'},f.actor);const message=await approval.approve(draft.id,1,f.actor,{quietHoursConfirmation:(await approval.preview(draft.id)).localTime});let sends=0,lookups=0;
 const service=new OutreachService(db,{send:async()=>{sends++;throw new Error('Transport timed out');},lookup:async key=>{lookups++;assert.equal(key,message.idempotency_key);return{providerMessageId:'reconciled-receipt'};}});
 assert.equal((await service.submit(message)).state,'delivery-unknown');await service.reconcile(new Date(Date.now()+6*60000));await service.reconcile(new Date(Date.now()+12*60000));assert.equal(sends,1);assert.equal(lookups,1);assert.equal((await approval.message(message.id)).state,'accepted');
});

test('OPP-008 completion removes an exhausted recommendation; new observed evidence produces another',async()=>{
 const {completeAction}=await import('../../src/core/features/workbench/action-repository');const f=await fixture(),workbench=new WorkbenchRepository(db);
 await workbench.recordEvent(f.opportunityId,{type:'email.replied',subject:'Reply',occurredAt:f.at,eventId:createId()},f.actor);
 const current=await db.prepare('SELECT id FROM recommendations WHERE opportunity_id=? AND is_current=1').bind(f.opportunityId).first<{id:string}>();assert.ok(current);
 await completeAction(db,current.id,f.actor,'completed','Handled personally');
 const state=await db.prepare('SELECT queue_state FROM opportunities WHERE id=?').bind(f.opportunityId).first<{queue_state:string}>();assert.equal(state?.queue_state,'none');
 await workbench.recordEvent(f.opportunityId,{type:'meeting.booked',subject:'Meeting',occurredAt:new Date().toISOString(),eventId:createId()},f.actor);
 const next=await db.prepare('SELECT id FROM recommendations WHERE opportunity_id=? AND is_current=1').bind(f.opportunityId).first<{id:string}>();assert.ok(next);assert.notEqual(next.id,current.id);
});

test('OUT-010 over-limit approval remains durably unsent with retry time',async()=>{
 const f=await fixture(),outreach=new OutreachRepository(db),approval=new ApprovalRepository(db);await db.prepare("UPDATE outbound_messages SET claimed_at='2000-01-01T00:00:00.000Z' WHERE claimed_at IS NOT NULL").run();
 const fixed=new Date('2031-01-06T10:00:00Z');const messages=[];
 await db.prepare("INSERT INTO sending_limits VALUES('shared',3,?,?)").bind(f.actor,fixed.toISOString()).run();
 try{for(let i=0;i<4;i++){const draft=await outreach.createDraft(f.opportunityId,{contactId:f.contactId,subject:`Limit ${i}`,body:'Reviewed'},f.actor);messages.push(await approval.approve(draft.id,1,f.actor,{now:fixed}));}}
 finally{await db.prepare("DELETE FROM sending_limits WHERE id='shared'").run();}
 assert.deepEqual(messages.map(m=>m.state),['queued','queued','queued','draft']);assert.match(messages[3]!.failure!,/shared sending rate of 3 messages a minute/);assert.equal(messages[3]!.next_attempt_at,'2031-01-06T10:01:00.000Z');
});

test('BASE-OPS-003 OUT-002 OUT-005 signed provider delivery is verified and idempotent',async()=>{
 const {createMailEventRoutes}=await import('../../src/core/features/outreach/provider-routes');const f=await fixture(),outreach=new OutreachRepository(db),approval=new ApprovalRepository(db);await db.prepare("UPDATE outbound_messages SET claimed_at='2000-01-01T00:00:00.000Z' WHERE claimed_at IS NOT NULL").run();
 const draft=await outreach.createDraft(f.opportunityId,{contactId:f.contactId,subject:'Delivery',body:'Reviewed provider content'},f.actor),message=await approval.approve(draft.id,1,f.actor,{quietHoursConfirmation:(await approval.preview(draft.id)).localTime});
 const keys=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);const pub=btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.exportKey('spki',keys.publicKey))));const app=createMailEventRoutes(db,{eventKey:pub});const timestamp=String(Math.floor(Date.now()/1000));const body=JSON.stringify([{sg_event_id:createId(),event:'delivered',rer_product:'orbit',timestamp:Number(timestamp),email:f.email,rer_delivery_id:message.idempotency_key,sg_message_id:'delivery-receipt'}]);
 const raw=new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},keys.privateKey,new TextEncoder().encode(timestamp+body)));const integer=(bytes:Uint8Array)=>{let start=0;while(start<31&&bytes[start]===0)start++;const value=Array.from(bytes.slice(start));return value[0]!&128?[0,...value]:value;};const r=integer(raw.slice(0,32)),s=integer(raw.slice(32)),der=[48,4+r.length+s.length,2,r.length,...r,2,s.length,...s];const signature=btoa(String.fromCharCode(...der));
 const post=(sig:string)=>app.request('https://orbit.test/sendgrid',{method:'POST',headers:{'X-Twilio-Email-Event-Webhook-Timestamp':timestamp,'X-Twilio-Email-Event-Webhook-Signature':sig},body});assert.equal((await post('invalid')).status,401);assert.equal((await post(signature)).status,200);assert.equal((await post(signature)).status,200);assert.equal((await approval.message(message.id)).state,'delivered');
 const count=await db.prepare("SELECT COUNT(*) AS n FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id WHERE r.record_id=? AND t.kind='provider.delivered'").bind(f.opportunityId).first<{n:number}>();assert.equal(count?.n,1);
});

test('SIGNAL-004 SIGNAL-005 SIGNAL-008 unlinked review evaluates once and a persistence failure rolls back all signal effects',async()=>{
 const f=await fixture(),repository=new IngestionRepository(db),source=createId(),security=createSourceSecurity({ORBIT_ENCRYPTION_KEY:'22'.repeat(32)})!;await repository.configure({id:source,name:'Review source',secret:'s'.repeat(40),enabled:true},security);
 const event={eventId:createId(),type:'meeting.booked',subject:'Late customer meeting',occurredAt:new Date(Date.now()-86400000).toISOString()};const raw=JSON.stringify(event),signal=await repository.ingest(source,event,await payloadHash(raw),raw);const prior=await db.prepare('SELECT score FROM opportunities WHERE id=?').bind(f.opportunityId).first<{score:number}>();assert.equal(prior?.score,0);
 await repository.link(signal.id,{type:'opportunity',id:f.opportunityId,basis:'Operator review'},f.actor);await assert.rejects(repository.link(signal.id,{type:'opportunity',id:f.opportunityId,basis:'Operator review'},f.actor));
 const entry=await db.prepare('SELECT occurred_at FROM timeline_entries WHERE id=?').bind(signal.id).first<{occurred_at:string}>();assert.equal(entry?.occurred_at,event.occurredAt);
 const candidate={...event,eventId:createId(),record:{type:'opportunity' as const,id:f.opportunityId}};const candidateRaw=JSON.stringify(candidate);
 await db.prepare("CREATE TRIGGER test_reject_evaluation BEFORE INSERT ON evaluations BEGIN SELECT RAISE(ABORT,'fixture persistence failure'); END").run();
 try{await assert.rejects(repository.ingest(source,candidate,await payloadHash(candidateRaw),candidateRaw));}finally{await db.prepare('DROP TRIGGER test_reject_evaluation').run();}
 const absent=await db.prepare('SELECT id FROM signals WHERE source_id=? AND source_event_id=?').bind(source,candidate.eventId).first();assert.equal(absent,null);
});

test('SIGNAL-009 shared provider relay authenticates destination HMAC and refuses modified events',async()=>{
 const {createMailEventRoutes}=await import('../../src/core/features/outreach/provider-routes');const {signRelayBody}=await import('../../src/base/sendgrid-event-relay/crypto');const secret='relay-only-secret-'.repeat(3),app=createMailEventRoutes(db,{relaySecret:secret}),timestamp=String(Math.floor(Date.now()/1000));const body=JSON.stringify([{sg_event_id:createId(),event:'delivered',timestamp:Number(timestamp),email:'other@example.test',rer_delivery_id:createId(),rer_product:'orbit'}]);const signature=await signRelayBody(secret,timestamp,body);
 const post=(raw:string,sig:string)=>app.request('https://orbit.test/relay',{method:'POST',headers:{'x-rer-mail-timestamp':timestamp,'x-rer-mail-signature':sig},body:raw});assert.equal((await post(body,signature)).status,200);assert.equal((await post(body+' ',signature)).status,401);assert.equal((await post(body,'v1='+'0'.repeat(64))).status,401);
});


test('BASE-OPS-004 OUT-006 provider retry expiry fails before quiet-hours deferral and never resends',async()=>{
 const f=await fixture(),outreach=new OutreachRepository(db),approval=new ApprovalRepository(db);
 const draft=await outreach.createDraft(f.opportunityId,{contactId:f.contactId,subject:'Retry expiry',body:'Reviewed'},f.actor);
 const message=await approval.approve(draft.id,1,f.actor,{now:new Date('2030-01-04T17:00:00Z'),scheduledAt:'2030-01-04T17:30:00Z'});
 await db.prepare("UPDATE outbound_messages SET first_attempt_at='2030-01-04T17:30:00.000Z',attempt_count=1,next_attempt_at='2030-01-04T17:31:00.000Z' WHERE id=?").bind(message.id).run();
 let calls=0;await new OutreachService(db,{send:async()=>{calls++;return{providerMessageId:'must-not-send'};}}).dispatchDue(new Date('2030-01-05T10:00:00Z'));
 const persisted=await approval.message(message.id);assert.equal(calls,0);assert.equal(persisted.state,'failed');assert.match(persisted.failure!,/retry window expired/);
 const opportunity=await db.prepare('SELECT queue_state,queue_reason FROM opportunities WHERE id=?').bind(f.opportunityId).first<{queue_state:string;queue_reason:string}>();assert.equal(opportunity?.queue_state,'now');assert.match(opportunity!.queue_reason,/retry window expired/);
});

test('OUT-017 record mail preserves exact approval, sender promises, custody and OUT-004 header-only reply matching',async context=>{
 const {ProviderRepository}=await import('../../src/core/features/outreach/provider-repository');const f=await fixture(),outreach=new OutreachRepository(db),approval=new ApprovalRepository(db),provider=new ProviderRepository(db);
 const draft=await outreach.createDraft(f.opportunityId,{contactId:f.contactId,subject:'Same subject',body:'Reviewed'},f.actor);
 const message=await approval.approve(draft.id,1,f.actor,{now:new Date('2032-01-05T10:00:00Z'),scheduledAt:'2032-01-05T11:00:00Z'});
 const reply={id:createId(),sender:f.email,subject:'Same subject',body:'Customer reply',messageId:`<${createId()}@customer.example>`,references:message.message_id,occurredAt:f.at};
 await provider.reply(reply,await payloadHash(JSON.stringify(reply)));await provider.reply(reply,await payloadHash(JSON.stringify(reply)));
 assert.equal((await approval.message(message.id)).state,'cancelled');const count=await db.prepare('SELECT COUNT(*) AS n FROM signals WHERE source_event_id=?').bind(reply.id).first<{n:number}>();assert.equal(count?.n,1);
 const unmatched={...reply,id:createId(),messageId:`<${createId()}@customer.example>`,references:''};await provider.reply(unmatched,await payloadHash(JSON.stringify(unmatched)));
 const row=(await provider.unlinkedReplies()).find(row=>row.subject==='Same subject'&&row.sender===f.email);assert.ok(row);
 assert.equal(await db.prepare('SELECT id FROM signals WHERE source_event_id=?').bind(unmatched.id).first(),null);
 await provider.linkReply(String(row.id),f.opportunityId,f.actor);assert.ok(await db.prepare('SELECT id FROM signals WHERE source_event_id=?').bind(unmatched.id).first());await assert.rejects(provider.linkReply(String(row.id),f.opportunityId,f.actor));await exerciseRecordMail(context);
});

test('BASE-OPS-004 OPP-005 evaluation failure preserves readable prior evidence and clears on a successful refresh',async()=>{
 const {evaluateOpportunity}=await import('../../src/core/features/workbench/evaluation-repository');const f=await fixture();await new WorkbenchRepository(db).recordEvent(f.opportunityId,{eventId:createId(),type:'email.replied',subject:'Customer evidence',occurredAt:f.at},f.actor);
 const deps=createDependencies(db),before=await deps.opportunities.findDetail(f.opportunityId);
 await db.prepare("CREATE TRIGGER test_fail_refresh BEFORE INSERT ON evaluations BEGIN SELECT RAISE(ABORT,'test evaluation failed'); END").run();
 try{await assert.rejects(evaluateOpportunity(db,f.opportunityId,f.actor,'Operator refresh'));}finally{await db.prepare('DROP TRIGGER test_fail_refresh').run();}
 const failed=await deps.opportunities.findDetail(f.opportunityId);assert.ok(failed!.evaluation?.failureAt);assert.equal(failed!.evaluation?.id,before!.evaluation?.id);assert.deepEqual(failed!.evaluation?.contributions,before!.evaluation?.contributions);
 await evaluateOpportunity(db,f.opportunityId,f.actor,'Operator refresh');const refreshed=await deps.opportunities.findDetail(f.opportunityId);assert.equal(refreshed!.evaluation?.failureAt,null);assert.notEqual(refreshed!.evaluation?.id,before!.evaluation?.id);
});

test('SIGNAL-002 SIGNAL-006 standard and source-namespaced types are isolated; inferred evidence cannot create a deal, high band or action',async()=>{
 const {standardTypes}=await import('../../src/core/features/ingestion/contracts');const f=await fixture(),security=createSourceSecurity({ORBIT_ENCRYPTION_KEY:'33'.repeat(32)})!,repository=new IngestionRepository(db),source=createId(),secret='test-signal-types-'.repeat(3);await repository.configure({id:source,name:'Typed source',secret,enabled:true},security);const app=createSignalIngress(db,security),timestamp=String(Math.floor(Date.now()/1000));
 async function post(type:string,linked=false){const event={eventId:createId(),type,subject:type,occurredAt:f.at,...(linked?{record:{type:'opportunity',id:f.opportunityId},identityBasis:'Authenticated customer identity'}:{})};const raw=JSON.stringify(event);return app.request(`https://orbit.test/${source}`,{method:'POST',headers:{'X-Orbit-Timestamp':timestamp,'X-Orbit-Signature':await sign(secret,raw,timestamp)},body:raw});}
 for(const type of standardTypes)assert.equal((await post(type)).status,201,type);
 assert.equal((await post(`${source}:customer.custom`)).status,201);assert.equal((await post('other:customer.custom')).status,400);assert.equal((await post('unknown')).status,400);
 const deliberate=['form.submitted','email.replied','meeting.booked','meeting.completed','content.downloaded','chat.started'];for(const type of deliberate){const row=await db.prepare('SELECT confidence FROM signals WHERE source_id=? AND type=?').bind(source,type).first<{confidence:string}>();assert.equal(row?.confidence,'observed');}
 const native=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})}}),session=await createDependencies(db).auth.createSession(f.actor);
 const email=[createId(),'customer.example'].join('@');
 const created=await native.request('https://orbit.test/api/v1/records/contact',{method:'POST',headers:{Cookie:`__Host-orbit_session=${session.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},body:JSON.stringify({name:'synthetic-orbit-1',email})});
 assert.equal(created.status,201);const contact=await created.json() as {id:string};
 async function contactDetail(){
  const response=await native.request(`https://orbit.test/api/v1/records/contact/${contact.id}`,{headers:{Cookie:`__Host-orbit_session=${session.token}`}});
  assert.equal(response.status,200);
  return response.json() as Promise<{opportunities:{id:string}[];timeline:{id:string;signal_type:string}[]}>;
 }
 async function opportunityIds(){return (await db.prepare('SELECT id FROM opportunities ORDER BY id').all<{id:string}>()).results.map(row=>row.id);}
 assert.deepEqual((await contactDetail()).opportunities,[],'The known contact starts without a deal');
 const before=await opportunityIds();assert.ok(before.includes(f.opportunityId));
 for(const type of ['email.opened','page.viewed']){
  const event={eventId:createId(),type,subject:'synthetic-orbit-2',occurredAt:f.at,email,...(type==='page.viewed'?{identityBasis:'Authenticated customer identity'}:{})},raw=JSON.stringify(event);
  const deliver=()=>app.request(`https://orbit.test/${source}`,{method:'POST',headers:{'X-Orbit-Timestamp':timestamp,'X-Orbit-Signature':signature},body:raw});
  const signature=await sign(secret,raw,timestamp),accepted=await deliver();assert.equal(accepted.status,201);
  const signal=await accepted.json() as {id:string;linked:boolean};assert.equal(signal.linked,true,'The signed inference reaches the known contact');
  assert.equal((await db.prepare('SELECT confidence FROM signals WHERE id=?').bind(signal.id).first<{confidence:string}>())?.confidence,'inferred');
  const delivered=await contactDetail();assert.ok(delivered.timeline.some(entry=>entry.id===signal.id&&entry.signal_type===type),'The accepted inference appears on the contact timeline');
  assert.deepEqual(delivered.opportunities,[]);assert.deepEqual(await opportunityIds(),before,`${type} creates no deal anywhere in the workspace`);
  const replay=await deliver();assert.equal(replay.status,201);assert.deepEqual(await replay.json(),{id:signal.id,replayed:true});
  const replayed=await contactDetail();assert.equal(replayed.timeline.filter(entry=>entry.id===signal.id).length,1,'Replay retains one timeline event');
  assert.deepEqual(replayed.opportunities,[]);assert.deepEqual(await opportunityIds(),before,`${type} replay creates no deal`);
 }
 for(let i=0;i<36;i++)assert.equal((await post('email.opened',true)).status,201);
 const state=await db.prepare('SELECT score,band FROM opportunities WHERE id=?').bind(f.opportunityId).first<{score:number;band:string}>();assert.equal(state?.score,69);assert.equal(state?.band,'medium');assert.equal(await db.prepare('SELECT id FROM recommendations WHERE opportunity_id=? AND is_current=1').bind(f.opportunityId).first(),null);
 assert.deepEqual(await opportunityIds(),before,'Inferred activity changes no opportunity identities');
 const count=await db.prepare('SELECT COUNT(*) AS n FROM opportunities WHERE id=?').bind(f.opportunityId).first<{n:number}>();assert.equal(count?.n,1);
});
test('OUT-007 OUT-009 SEQUENCE-002 stage move, close and genuine reply end scheduled follow-up atomically; automatic reply and open report do not',async()=>{
 for(const type of ['email.replied','meeting.booked','email.unsubscribed','email.bounced'] as const){const f=await fixture(),outreach=new OutreachRepository(db),approval=new ApprovalRepository(db),now=new Date('2030-01-07T09:00:00Z');const draft=await outreach.createDraft(f.opportunityId,{contactId:f.contactId,subject:'Stop proof',body:'Reviewed and never sent'},f.actor);const message=await approval.approve(draft.id,1,f.actor,{now,scheduledAt:'2030-01-07T10:00:00Z'});await new WorkbenchRepository(db).recordEvent(f.opportunityId,{type,contactId:f.contactId,permanentBounce:type==='email.bounced',subject:'Customer stop',occurredAt:now.toISOString(),eventId:createId()},f.actor);let calls=0;await new OutreachService(db,{send:async()=>{calls++;return{providerMessageId:'must-not-send'};}}).dispatchDue(new Date('2030-01-07T10:00:00Z'));assert.equal(calls,0);assert.equal((await approval.message(message.id)).state,'cancelled');assert.equal((await db.prepare('SELECT is_stale FROM drafts WHERE id=?').bind(draft.id).first<{is_stale:number}>())!.is_stale,1);}
 const f=await fixture(),deps=createDependencies(db),approval=new ApprovalRepository(db),advanced=createId(),session=await deps.auth.createSession(f.actor);let calls=0;
 const position=await db.prepare('SELECT COALESCE(MAX(position),0)+1 AS n FROM pipeline_stages').first<{n:number}>();await deps.workspace.ensurePipelineStage({id:advanced,name:'Advanced',position:position!.n});
 const mail={send:async()=>{calls++;return{providerMessageId:`test-receipt-${calls}`};}},app=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})},outboundMail:mail}),service=new OutreachService(db,mail),post=signedReplies(db);
 const api=async<T=any>(path:string,body?:unknown,status=200)=>{const response=await app.request(`https://orbit.test/api/v1/${path}`,{method:body?'POST':'GET',headers:{Cookie:`__Host-orbit_session=${session.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});assert.equal(response.status,status,path);return await response.json() as T;};
 const due=['2030-01-07T10:00:00.000Z','2030-01-08T10:00:00.000Z','2030-01-09T10:00:00.000Z'];
 async function schedule(subject:string,at=due[1]!){const draft=await api<{id:string}>(`workbench/opportunities/${f.opportunityId}/drafts`,{contactId:f.contactId,subject,body:'Reviewed follow-up'},201);return (await api<{id:string;state:string}>(`workbench/drafts/${draft.id}/approve`,{revision:1,scheduledAt:at})).id;}
 const reply=(automatic:boolean,references:string)=>{const form=new FormData();form.set('from',f.email);form.set('subject','Re: follow-up');form.set('text','Customer reply');form.set('headers',`Message-ID: <${createId()}@reply.test>\r\nDate: ${new Date().toUTCString()}\r\nReferences: ${references}${automatic?'\r\nAuto-Submitted: auto-replied':''}`);return form;};
 const first=await schedule('First touch',due[0]);await service.dispatchDue(new Date(due[0]!));assert.equal(calls,1);const sent=await approval.message(first);assert.equal(sent.state,'accepted');
 await new Promise(resolve=>setTimeout(resolve,1000));// mail Date headers have whole seconds; replies must date after the acceptance
 const followUp=await schedule('Follow-up after an automatic reply');
 assert.equal((await post(reply(true,sent.message_id))).status,200);
 await api(`workbench/opportunities/${f.opportunityId}/events`,{type:'email.opened',contactId:f.contactId,subject:'Open reported',occurredAt:new Date().toISOString(),eventId:createId()},201);
 assert.equal((await approval.message(followUp)).state,'scheduled','An automatic reply and an open report leave scheduled follow-up in place');
 const genuine=reply(false,sent.message_id);assert.equal((await post(genuine)).status,200);
 const stopped=await approval.message(followUp);assert.equal(stopped.state,'cancelled');assert.match(stopped.failure!,/Customer repl/);
 const deal=async()=>(await api<{record:{stage_id:string}}>(`records/opportunity/${f.opportunityId}`)).record;
 const beforeMove=await schedule('Follow-up before a stage move'),stage=(await deal()).stage_id;
 await api(`records/opportunity/${f.opportunityId}/move`,{stageId:advanced,reviewedStageId:stage});
 const moved=await approval.message(beforeMove);assert.equal(moved.state,'cancelled');assert.equal(moved.failure,'Deal stage changed, so the scheduled follow-up was cancelled');assert.equal((await db.prepare('SELECT updated_at FROM outbound_messages WHERE id=?').bind(beforeMove).first<{updated_at:string}>())!.updated_at,(await db.prepare("SELECT t.occurred_at FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id WHERE t.kind='stage.changed' AND r.record_type='opportunity' AND r.record_id=?").bind(f.opportunityId).first<{occurred_at:string}>())!.occurred_at,'The send ends in the stage move commit');
 const beforeClose=await schedule('Follow-up before a close',due[2]);
 await api(`records/opportunity/${f.opportunityId}/lifecycle`,{state:'won',reason:'Signed'});
 const closed=await approval.message(beforeClose);assert.equal(closed.state,'cancelled');assert.equal(closed.failure,'Deal closed won, so the scheduled follow-up was cancelled');
 await api(`records/opportunity/${f.opportunityId}/lifecycle`,{state:'open',reason:''});assert.equal((await post(genuine)).status,200,'Replaying the reply is accepted once');
 for(const at of due)await service.dispatchDue(new Date(Date.parse(at)+60000));
 assert.equal(calls,1,'Reopen, replay and late dispatch revive no stopped send');
 for(const [id,exit] of [[followUp,stopped],[beforeMove,moved],[beforeClose,closed]] as const){const after=await approval.message(id);assert.equal(after.state,'cancelled');assert.equal(after.failure,exit.failure,'The first exit reason stands');}
 for(const id of [followUp,beforeMove])assert.equal((await db.prepare("SELECT COUNT(*) n FROM timeline_entries WHERE kind='message.schedule_stopped' AND json_extract(payload_json,'$.messageId')=?").bind(id).first<{n:number}>())!.n,1,'One exit reason on the open deal timeline');
 await api(`records/opportunity/${f.opportunityId}/lifecycle`,{state:'won',reason:'Signed again'});
 const {outcomes}=await api<{outcomes:Record<string,unknown>}>(`workbench/opportunities/${f.opportunityId}/messages`);
 assert.deepEqual({...outcomes,firstAcceptedAt:Boolean(outcomes.firstAcceptedAt),closedAt:Boolean(outcomes.closedAt)},{firstAcceptedAt:true,accepted:1,delivered:0,humanReplies:1,meetingsBooked:0,stageAdvances:1,lifecycle:'won',closedAt:true,inferredReports:1,automaticReplies:1});
});
test('OUT-009 dispatch rechecks unchanged content, active operator, lifecycle, current recipient and association before claiming',async()=>{
 const mutations=["UPDATE drafts SET body='Changed' WHERE id=?","UPDATE drafts SET recipient_email='changed@example.invalid' WHERE id=?","UPDATE opportunities SET lifecycle='won' WHERE id=?","UPDATE contacts SET email='changed@example.invalid' WHERE id=?","DELETE FROM opportunity_contacts WHERE opportunity_id=?","UPDATE operators SET status='removed' WHERE id=?"];
 for(let index=0;index<mutations.length;index++){const f=await fixture(),outreach=new OutreachRepository(db),approval=new ApprovalRepository(db),draft=await outreach.createDraft(f.opportunityId,{contactId:f.contactId,subject:'Exact content',body:'Approved only'},f.actor);const message=await approval.approve(draft.id,1,f.actor,{now:new Date('2030-01-07T09:00:00Z'),scheduledAt:'2030-01-07T10:00:00Z'});const target=index<2?draft.id:index===2||index===4?f.opportunityId:index===3?f.contactId:f.actor;await db.prepare(mutations[index]!).bind(target).run();let calls=0;await new OutreachService(db,{send:async()=>{calls++;return{providerMessageId:'must-not-send'};}}).dispatchDue(new Date('2030-01-07T10:00:00Z'));assert.equal(calls,0);assert.equal((await approval.message(message.id)).state,'failed');}
});
test('OUT-002 OUT-007 temporary provider blocks do not permanently suppress a contact; permanent bounces do',async()=>{
 const {ProviderRepository}=await import('../../src/core/features/outreach/provider-repository');for(const type of ['blocked','bounce']){const f=await fixture(),approval=new ApprovalRepository(db),draft=await new OutreachRepository(db).createDraft(f.opportunityId,{contactId:f.contactId,subject:'Bounce classification',body:'Reviewed'},f.actor);await db.prepare("UPDATE outbound_messages SET claimed_at='2000-01-01T00:00:00Z' WHERE claimed_at IS NOT NULL").run();const message=await approval.approve(draft.id,1,f.actor,{quietHoursConfirmation:(await approval.preview(draft.id)).localTime});await new OutreachRepository(db).settle(message.id,f.actor,'accepted','test-receipt',null);const event={sg_event_id:createId(),event:'bounce',type,timestamp:Math.floor(Date.now()/1000),email:f.email,rer_product:'orbit',rer_delivery_id:message.idempotency_key};await new ProviderRepository(db).event(event,await payloadHash(JSON.stringify(event)));assert.equal((await db.prepare('SELECT contactability FROM contacts WHERE id=?').bind(f.contactId).first<{contactability:string}>())!.contactability,type==='bounce'?'do_not_contact':'contactable');}
});
