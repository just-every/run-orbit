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
test('OUT-008 workspace and recipient clocks respect weekdays and DST',()=>{
 const sunday=new Date('2026-09-13T10:00:00Z');assert.equal(nextPermitted(sunday,'Europe/London').toISOString(),'2026-09-14T07:00:00.000Z');
 const friday=new Date('2026-10-30T14:00:00Z');const due=workingDaysAfter(friday,1,'America/New_York');assert.equal(localTime(due,'America/New_York').label,'Mon, 02/11/2026, 10:00');
});
test('OUT-001 OUT-009 scheduled approval preserves content and dispatches once; stopped draft never submits',async()=>{
 const f=await fixture(),outreach=new OutreachRepository(db),approval=new ApprovalRepository(db);await db.prepare("UPDATE outbound_messages SET claimed_at='2000-01-01T00:00:00.000Z' WHERE claimed_at IS NOT NULL").run();
 const now=new Date('2030-01-07T09:00:00Z'),requestedAt='2030-01-12T00:00:00Z'; // Saturday 10am in Brisbane.
 await db.prepare("UPDATE contacts SET timezone='Australia/Brisbane' WHERE id=?").bind(f.contactId).run();
 const draft=await outreach.createDraft(f.opportunityId,{contactId:f.contactId,subject:'Approved',body:'Exact approved body'},f.actor);let calls=0;
 const mail={send:async(input:{body:string})=>{calls++;assert.equal(input.body,'Exact approved body');return{providerMessageId:'receipt'};}};
 const app=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})},outboundMail:mail}),session=await createDependencies(db).auth.createSession(f.actor);
 const request=(path:string,body?:unknown)=>app.request(`https://orbit.test/api/v1/workbench/${path}`,{method:body?'POST':'GET',headers:{Cookie:`__Host-orbit_session=${session.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
 const previewResponse=await request(`drafts/${draft.id}/approval-preview?scheduledAt=${encodeURIComponent(requestedAt)}`);assert.equal(previewResponse.status,200);
 const preview=await previewResponse.json() as {scheduledAt:string;scheduledLocalTime:string;timezone:string;scheduleReason:string};
 assert.equal(preview.scheduledAt,'2030-01-13T22:00:00.000Z');assert.equal(preview.timezone,'Australia/Brisbane');assert.equal(preview.scheduledLocalTime,localTime(new Date(preview.scheduledAt),preview.timezone).label);assert.ok(typeof preview.scheduleReason==='string'&&preview.scheduleReason.length>0,'Adjusted schedules explain why before approval');assert.equal(calls,0);
 const approve=(confirmed:string)=>request(`drafts/${draft.id}/approve`,{revision:1,scheduledAt:requestedAt,scheduledAtConfirmation:confirmed});
 assert.equal((await approve(requestedAt)).status,409,'Unreviewed adjustments are refused');
 await db.prepare("UPDATE contacts SET timezone='UTC' WHERE id=?").bind(f.contactId).run();assert.equal((await approve(preview.scheduledAt)).status,409,'A changed recipient clock requires a fresh review');
 await db.prepare("UPDATE contacts SET timezone='Australia/Brisbane' WHERE id=?").bind(f.contactId).run();
 const response=await approve(preview.scheduledAt);assert.equal(response.status,200);const message=await response.json() as {id:string;state:string;scheduledAt:string};assert.equal(message.state,'scheduled');assert.equal(message.scheduledAt,preview.scheduledAt);
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
 for(let i=0;i<4;i++){const draft=await outreach.createDraft(f.opportunityId,{contactId:f.contactId,subject:`Limit ${i}`,body:'Reviewed'},f.actor);messages.push(await approval.approve(draft.id,1,f.actor,{now:fixed}));}
 assert.deepEqual(messages.map(m=>m.state),['queued','queued','queued','draft']);assert.ok(messages[3]!.failure);assert.equal(messages[3]!.next_attempt_at,'2031-01-06T10:01:00.000Z');
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

test('OUT-004 a reply links only by durable thread headers; unmatched replies require operator review',async()=>{
 const {ProviderRepository}=await import('../../src/core/features/outreach/provider-repository');const f=await fixture(),outreach=new OutreachRepository(db),approval=new ApprovalRepository(db),provider=new ProviderRepository(db);
 const draft=await outreach.createDraft(f.opportunityId,{contactId:f.contactId,subject:'Same subject',body:'Reviewed'},f.actor);
 const message=await approval.approve(draft.id,1,f.actor,{now:new Date('2032-01-05T10:00:00Z'),scheduledAt:'2032-01-05T11:00:00Z'});
 const reply={id:createId(),sender:f.email,subject:'Same subject',body:'Customer reply',messageId:`<${createId()}@customer.example>`,references:message.message_id,occurredAt:f.at};
 await provider.reply(reply,await payloadHash(JSON.stringify(reply)));await provider.reply(reply,await payloadHash(JSON.stringify(reply)));
 assert.equal((await approval.message(message.id)).state,'cancelled');const count=await db.prepare('SELECT COUNT(*) AS n FROM signals WHERE source_event_id=?').bind(reply.id).first<{n:number}>();assert.equal(count?.n,1);
 const unmatched={...reply,id:createId(),messageId:`<${createId()}@customer.example>`,references:''};await provider.reply(unmatched,await payloadHash(JSON.stringify(unmatched)));
 const row=(await provider.unlinkedReplies()).find(row=>row.subject==='Same subject'&&row.sender===f.email);assert.ok(row);
 assert.equal(await db.prepare('SELECT id FROM signals WHERE source_event_id=?').bind(unmatched.id).first(),null);
 await provider.linkReply(String(row.id),f.opportunityId,f.actor);assert.ok(await db.prepare('SELECT id FROM signals WHERE source_event_id=?').bind(unmatched.id).first());await assert.rejects(provider.linkReply(String(row.id),f.opportunityId,f.actor));
});

test('BASE-OPS-004 OPP-005 evaluation failure preserves readable prior evidence and clears on a successful refresh',async()=>{
 const {evaluateOpportunity}=await import('../../src/core/features/workbench/evaluation-repository');const f=await fixture();await new WorkbenchRepository(db).recordEvent(f.opportunityId,{eventId:createId(),type:'email.replied',subject:'Customer evidence',occurredAt:f.at},f.actor);
 const deps=createDependencies(db),before=await deps.opportunities.findDetail(f.opportunityId);
 await db.prepare("CREATE TRIGGER test_fail_refresh BEFORE INSERT ON evaluations BEGIN SELECT RAISE(ABORT,'test evaluation failed'); END").run();
 try{await assert.rejects(evaluateOpportunity(db,f.opportunityId,f.actor,'Operator refresh'));}finally{await db.prepare('DROP TRIGGER test_fail_refresh').run();}
 const failed=await deps.opportunities.findDetail(f.opportunityId);assert.ok(failed!.evaluation?.failureAt);assert.equal(failed!.evaluation?.id,before!.evaluation?.id);assert.deepEqual(failed!.evaluation?.contributions,before!.evaluation?.contributions);
 await evaluateOpportunity(db,f.opportunityId,f.actor,'Operator refresh');const refreshed=await deps.opportunities.findDetail(f.opportunityId);assert.equal(refreshed!.evaluation?.failureAt,null);assert.notEqual(refreshed!.evaluation?.id,before!.evaluation?.id);
});

test('SIGNAL-002 SIGNAL-006 standard and source-namespaced types are isolated; inferred evidence cannot produce a high band or action',async()=>{
 const {standardTypes}=await import('../../src/core/features/ingestion/contracts');const f=await fixture(),security=createSourceSecurity({ORBIT_ENCRYPTION_KEY:'33'.repeat(32)})!,repository=new IngestionRepository(db),source=createId(),secret='test-signal-types-'.repeat(3);await repository.configure({id:source,name:'Typed source',secret,enabled:true},security);const app=createSignalIngress(db,security),timestamp=String(Math.floor(Date.now()/1000));
 async function post(type:string,linked=false){const event={eventId:createId(),type,subject:type,occurredAt:f.at,...(linked?{record:{type:'opportunity',id:f.opportunityId},identityBasis:'Authenticated customer identity'}:{})};const raw=JSON.stringify(event);return app.request(`https://orbit.test/${source}`,{method:'POST',headers:{'X-Orbit-Timestamp':timestamp,'X-Orbit-Signature':await sign(secret,raw,timestamp)},body:raw});}
 for(const type of standardTypes)assert.equal((await post(type)).status,201,type);
 assert.equal((await post(`${source}:customer.custom`)).status,201);assert.equal((await post('other:customer.custom')).status,400);assert.equal((await post('unknown')).status,400);
 const deliberate=['form.submitted','email.replied','meeting.booked','meeting.completed','content.downloaded','chat.started'];for(const type of deliberate){const row=await db.prepare('SELECT confidence FROM signals WHERE source_id=? AND type=?').bind(source,type).first<{confidence:string}>();assert.equal(row?.confidence,'observed');}
 for(let i=0;i<36;i++)assert.equal((await post('email.opened',true)).status,201);
 const state=await db.prepare('SELECT score,band FROM opportunities WHERE id=?').bind(f.opportunityId).first<{score:number;band:string}>();assert.equal(state?.score,69);assert.equal(state?.band,'medium');assert.equal(await db.prepare('SELECT id FROM recommendations WHERE opportunity_id=? AND is_current=1').bind(f.opportunityId).first(),null);
 const count=await db.prepare('SELECT COUNT(*) AS n FROM opportunities WHERE id=?').bind(f.opportunityId).first<{n:number}>();assert.equal(count?.n,1);
});
test('OUT-007 OUT-009 reply, meeting, unsubscribe and permanent bounce cancel reviewed schedules without a provider call',async()=>{
 for(const type of ['email.replied','meeting.booked','email.unsubscribed','email.bounced'] as const){const f=await fixture(),outreach=new OutreachRepository(db),approval=new ApprovalRepository(db),now=new Date('2030-01-07T09:00:00Z');const draft=await outreach.createDraft(f.opportunityId,{contactId:f.contactId,subject:'Stop proof',body:'Reviewed and never sent'},f.actor);const message=await approval.approve(draft.id,1,f.actor,{now,scheduledAt:'2030-01-07T10:00:00Z'});await new WorkbenchRepository(db).recordEvent(f.opportunityId,{type,contactId:f.contactId,permanentBounce:type==='email.bounced',subject:'Customer stop',occurredAt:now.toISOString(),eventId:createId()},f.actor);let calls=0;await new OutreachService(db,{send:async()=>{calls++;return{providerMessageId:'must-not-send'};}}).dispatchDue(new Date('2030-01-07T10:00:00Z'));assert.equal(calls,0);assert.equal((await approval.message(message.id)).state,'cancelled');assert.equal((await db.prepare('SELECT is_stale FROM drafts WHERE id=?').bind(draft.id).first<{is_stale:number}>())!.is_stale,1);}
});
test('OUT-009 dispatch rechecks unchanged content, active operator, lifecycle, current recipient and association before claiming',async()=>{
 const mutations=["UPDATE drafts SET body='Changed' WHERE id=?","UPDATE drafts SET recipient_email='changed@example.invalid' WHERE id=?","UPDATE opportunities SET lifecycle='won' WHERE id=?","UPDATE contacts SET email='changed@example.invalid' WHERE id=?","DELETE FROM opportunity_contacts WHERE opportunity_id=?","UPDATE operators SET status='removed' WHERE id=?"];
 for(let index=0;index<mutations.length;index++){const f=await fixture(),outreach=new OutreachRepository(db),approval=new ApprovalRepository(db),draft=await outreach.createDraft(f.opportunityId,{contactId:f.contactId,subject:'Exact content',body:'Approved only'},f.actor);const message=await approval.approve(draft.id,1,f.actor,{now:new Date('2030-01-07T09:00:00Z'),scheduledAt:'2030-01-07T10:00:00Z'});const target=index<2?draft.id:index===2||index===4?f.opportunityId:index===3?f.contactId:f.actor;await db.prepare(mutations[index]!).bind(target).run();let calls=0;await new OutreachService(db,{send:async()=>{calls++;return{providerMessageId:'must-not-send'};}}).dispatchDue(new Date('2030-01-07T10:00:00Z'));assert.equal(calls,0);assert.equal((await approval.message(message.id)).state,'failed');}
});
test('OUT-002 OUT-007 temporary provider blocks do not permanently suppress a contact; permanent bounces do',async()=>{
 const {ProviderRepository}=await import('../../src/core/features/outreach/provider-repository');for(const type of ['blocked','bounce']){const f=await fixture(),approval=new ApprovalRepository(db),draft=await new OutreachRepository(db).createDraft(f.opportunityId,{contactId:f.contactId,subject:'Bounce classification',body:'Reviewed'},f.actor);await db.prepare("UPDATE outbound_messages SET claimed_at='2000-01-01T00:00:00Z' WHERE claimed_at IS NOT NULL").run();const message=await approval.approve(draft.id,1,f.actor,{quietHoursConfirmation:(await approval.preview(draft.id)).localTime});await new OutreachRepository(db).settle(message.id,f.actor,'accepted','test-receipt',null);const event={sg_event_id:createId(),event:'bounce',type,timestamp:Math.floor(Date.now()/1000),email:f.email,rer_product:'orbit',rer_delivery_id:message.idempotency_key};await new ProviderRepository(db).event(event,await payloadHash(JSON.stringify(event)));assert.equal((await db.prepare('SELECT contactability FROM contacts WHERE id=?').bind(f.contactId).first<{contactability:string}>())!.contactability,type==='bounce'?'do_not_contact':'contactable');}
});
