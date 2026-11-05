import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createApp} from '../support/app';
import {isolatedDatabase} from '../support/isolated-database';
import {createDependencies} from '../support/dependencies';
import {createId} from '../../src/core/shared/ids';
import {WorkbenchRepository} from '../../src/core/features/workbench/repository';
import {OutreachRepository} from '../../src/core/features/workbench/outreach-repository';
import {ApprovalRepository} from '../../src/core/features/outreach/approval-repository';
import {OutreachService} from '../../src/core/features/outreach/service';
import {runHostedTimers} from '../../src/core/features/outreach/scheduler';
import type {OutboundMail} from '../../src/core/platform/outbound-mail';
import {SendGridSendError} from '../../src/base/modules/mail/src/sendgrid-email/index.mjs';
async function fixture(db:D1Database){const deps=createDependencies(db),actor=createId(),stage=createId();await deps.auth.ensureOperator({id:actor,email:`${actor}@test.invalid`,displayName:'Limits operator'});await deps.workspace.ensureWorkspace({name:'Limits',timezone:'UTC',currency:'USD',workingHours:{days:[1,2,3,4,5],start:'08:00',end:'18:00'},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});await deps.workspace.ensurePipelineStage({id:stage,name:'First',position:0});const opportunity=await new WorkbenchRepository(db).createOpportunity({title:'Limits acceptance',companyName:'Limit company',contactName:'Limit contact',email:`${createId()}@test.invalid`,stageId:stage,valueCents:0},actor);const contact=await db.prepare('SELECT contact_id FROM opportunity_contacts WHERE opportunity_id=?').bind(opportunity.id).first<{contact_id:string}>();return{actor,opportunityId:opportunity.id,contactId:contact!.contact_id};}
test('OUT-006 BASE-OPS-004 transient rate limits stop after five attempts within one hour and notify once',async context=>{
 const p=await isolatedDatabase();try{const f=await fixture(p.db),approval=new ApprovalRepository(p.db),outreach=new OutreachRepository(p.db);context.mock.timers.enable({apis:['Date'],now:Date.parse('2030-01-07T10:00:00Z')});const draft=await outreach.createDraft(f.opportunityId,{contactId:f.contactId,subject:'Bounded retries',body:'Exact reviewed body'},f.actor),message=await approval.approve(draft.id,1,f.actor,{scheduledAt:'2030-01-07T10:01:00Z'});let calls=0;const service=new OutreachService(p.db,{send:async()=>{calls++;throw new SendGridSendError('rate_limited','Test provider rate limit',429);}});
 for(let i=0;i<6;i++){context.mock.timers.setTime(Date.parse('2030-01-07T10:01:00Z')+i*5*60000);await service.dispatchDue();}assert.equal(calls,5);const failed=await approval.message(message.id);assert.equal(failed.state,'failed');assert.equal(failed.attempt_count,5);assert.match(failed.failure!,/rate limit/);assert.equal((await p.db.prepare("SELECT COUNT(*) n FROM notifications WHERE event_key=?").bind(`message:${message.id}:failed`).first<{n:number}>())!.n,1);
 }finally{context.mock.timers.reset();await p.dispose();}
});
test('OUT-010 OUT-018 one user\'s volume never consumes another\'s budget and every deferral names its limit',async context=>{
 const p=await isolatedDatabase();context.mock.timers.enable({apis:['Date'],now:Date.parse('2030-01-07T10:00:00Z')});try{
  const db=p.db,f=await fixture(db),deps=createDependencies(db),approval=new ApprovalRepository(db),outreach=new OutreachRepository(db);let calls=0;
  await db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(f.actor).run();
  const users=[f.actor];for(let i=1;i<12;i++){const id=createId();await deps.auth.ensureOperator({id,email:`${id}@test.invalid`,displayName:`Seller ${String(i).padStart(2,'0')}`});users.push(id);}
  const [owner,heavy,lowered,other]=users as [string,string,string,string];
  const submissions:Parameters<OutboundMail['send']>[0][]=[];
  const mail:OutboundMail={send:async message=>{submissions.push(message);calls++;return{providerMessageId:`limits-${calls}`};}};
  const app=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})},outboundMail:mail});
  const sessions=new Map<string,string>();for(const user of users)sessions.set(user,(await deps.auth.createSession(user)).token);
  const api=async<T=any>(user:string,path:string,method='GET',body?:unknown)=>{const response=await app.request(`https://orbit.test/api/v1/${path}`,{method,headers:{Cookie:`__Host-orbit_session=${sessions.get(user)}`,Origin:'https://orbit.test','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,body:await response.json() as T};};
  const history=(user:string,count:number,minutesAgo:number)=>db.batch(Array.from({length:count},(_,i)=>{const id=createId(),at=new Date(Date.now()-minutesAgo*60000+i).toISOString();return db.prepare("INSERT INTO outbound_messages(id,revision,opportunity_id,operator_id,contact_id,recipient_email,subject,body,state,created_at,updated_at,idempotency_key,message_id,approved_at,claimed_at) VALUES(?,1,?,?,?,'test@example.invalid','Historical approved mail','Test fixture','accepted',?,?,?,?,?,?)").bind(id,f.opportunityId,user,f.contactId,at,at,id,`<${id}@test.invalid>`,at,at);}));
  const send=async(user:string,subject:string)=>{const draft=await outreach.createDraft(f.opportunityId,{contactId:f.contactId,subject,body:'Exact reviewed body'},user);return api<{id:string;state:string;error?:string;retryAfter?:string}>(user,`workbench/drafts/${draft.id}/approve`,'POST',{revision:1});};
  assert.equal((await api(other,`settings/sending/operators/${lowered}`,'PUT',{oneToOnePerDay:50})).status,403,'Only the owner changes budgets until TEAM-005');
  assert.equal((await api(owner,`settings/sending/operators/${lowered}`,'PUT',{oneToOnePerDay:50})).status,200);
  const changed=await db.prepare("SELECT actor_id,details_json FROM audit_entries WHERE action='sending.budget.changed' AND entity_id=?").bind(lowered).first<{actor_id:string;details_json:string}>();assert.equal(changed!.actor_id,owner);assert.deepEqual(JSON.parse(changed!.details_json),{budget:'one-to-one',previous:1000,current:50});
  for(const user of users)await history(user,user===heavy?1000:user===lowered?50:40,120);
  const heavyHeld=await send(heavy,'Over the default budget');assert.equal(heavyHeld.status,409);assert.equal(heavyHeld.body.state,'draft');assert.match(heavyHeld.body.error!,/one-to-one budget of 1000 messages a rolling day/);assert.equal(heavyHeld.body.retryAfter,new Date(Date.parse('2030-01-08T08:00:00Z')).toISOString());
  const loweredHeld=await send(lowered,'Over a lowered budget');assert.equal(loweredHeld.status,409);assert.match(loweredHeld.body.error!,/one-to-one budget of 50 messages a rolling day/);
  for(const user of users.filter(user=>user!==heavy&&user!==lowered))assert.equal((await send(user,'Within my own budget')).body.state,'accepted','Another user\'s volume never holds this user\'s mail');
  assert.equal(calls,10);
  const own=await api<{users:{id:string;used:number;remaining:number;budget:number}[]}>(lowered,'settings/sending');assert.deepEqual(own.body.users.map(user=>[user.id,user.used,user.remaining,user.budget]),[[lowered,50,0,50]],'A user sees their own budget');
  const all=await api<{users:{id:string;used:number;remaining:number}[];shared:{perMinute:number}}>(owner,'settings/sending');assert.equal(all.body.users.length,12);assert.equal(all.body.shared.perMinute,100);assert.deepEqual(all.body.users.find(user=>user.id===other),{...all.body.users.find(user=>user.id===other),used:41,remaining:959});
  assert.equal((await api(owner,'settings/sending/shared','PUT',{perMinute:10})).status,200);assert.ok(await db.prepare("SELECT 1 FROM audit_entries WHERE action='sending.shared_rate.changed' AND actor_id=?").bind(owner).first());
  const rateHeld=await send(other,'Over the shared rate');assert.equal(rateHeld.status,409);assert.match(rateHeld.body.error!,/shared sending rate of 10 messages a minute/);assert.doesNotMatch(rateHeld.body.error!,/one-to-one/);assert.ok(Date.parse(rateHeld.body.retryAfter!)<=Date.now()+60000);
  const service=new OutreachService(db,{send:async()=>{calls++;return{providerMessageId:'never-without-review'};}});
  context.mock.timers.setTime(Date.parse('2030-01-09T10:00:00Z'));await service.dispatchDue();assert.equal(calls,10,'A held message is never retried without operator action');
  assert.equal((await api(owner,'settings/sending/shared','PUT',{perMinute:null})).status,200);
  const retried=await api<{state:string}>(lowered,`workbench/messages/${loweredHeld.body.id}/retry`,'POST',{});assert.equal(retried.body.state,'accepted');assert.equal(calls,11);

  // Approval reserves exact content, not future capacity. Fill each window only
  // after scheduling, then enter through the same timer as hosted dispatch.
  for(const scenario of [
   {limit:'shared',start:'2030-01-14T10:00:00Z',sender:other,consumer:owner,rate:1,budget:1000,retryAt:'2030-01-14T10:01:30.000Z',reason:/shared sending rate of 1 messages a minute/},
   {limit:'sender',start:'2030-01-21T10:00:00Z',sender:lowered,consumer:lowered,rate:100,budget:1,retryAt:'2030-01-22T10:00:30.000Z',reason:/this sender's one-to-one budget of 1 messages a rolling day/},
  ]){
   const start=Date.parse(scenario.start),due=new Date(start+60000).toISOString();
   context.mock.timers.setTime(start);
   for(const user of [owner,scenario.sender])sessions.set(user,(await deps.auth.createSession(user)).token);
   assert.equal((await api(owner,'settings/sending/shared','PUT',{perMinute:scenario.rate})).status,200);
   assert.equal((await api(owner,`settings/sending/operators/${scenario.sender}`,'PUT',{oneToOnePerDay:scenario.budget})).status,200);
   const capacity=await api<{shared:{used:number};users:{id:string;used:number}[]}>(scenario.sender,'settings/sending');
   assert.equal(capacity.status,200);assert.equal(capacity.body.shared.used,0);assert.equal(capacity.body.users[0]!.used,0,'Both limits have capacity when exact content is approved');
   const content={contactId:f.contactId,subject:`Scheduled ${scenario.limit} limit`,body:'synthetic-orbit-1'};
   const created=await api<{id:string}>(scenario.sender,`workbench/opportunities/${f.opportunityId}/drafts`,'POST',content);
   assert.equal(created.status,201);
   const detail=await api<{draft:{id:string;revision:number;recipientEmail:string}}>(scenario.sender,`drafts/${created.body.id}`);assert.equal(detail.status,200);
   const draft=detail.body.draft,preview=await api<{scheduledAt:string}>(scenario.sender,`workbench/drafts/${draft.id}/approval-preview?scheduledAt=${encodeURIComponent(due)}`);
   assert.equal(preview.status,200);assert.equal(preview.body.scheduledAt,due);
   const scheduled=await api<{id:string;state:string;scheduledAt:string}>(scenario.sender,`workbench/drafts/${draft.id}/approve`,'POST',{revision:draft.revision,scheduledAt:due,scheduledAtConfirmation:preview.body.scheduledAt});
   assert.equal(scheduled.status,200);assert.equal(scheduled.body.state,'scheduled');assert.equal(scheduled.body.scheduledAt,due);
   type Message={id:string;draftId:string;revision:number;state:string;recipientEmail:string;subject:string;body:string;failure:string|null;retryAfter:string|null;scheduledAt:string;providerMessageId:string|null;acceptedAt:string|null};
   const read=async()=>{const response=await api<{messages:Message[]}>(scenario.sender,`workbench/opportunities/${f.opportunityId}/messages`);assert.equal(response.status,200);return response.body.messages;};
   const saved=(await read()).find(message=>message.id===scheduled.body.id)!;
   assert.ok(saved);assert.equal(saved.state,'scheduled');assert.equal(saved.draftId,draft.id);assert.equal(saved.revision,draft.revision);assert.equal(saved.subject,content.subject);assert.equal(saved.body,content.body);assert.equal(saved.recipientEmail,draft.recipientEmail);
   const inventoryBefore=(await read()).map(message=>message.id).sort(),sentBefore=calls;
   context.mock.timers.setTime(start+30000);
   const consumed=await send(scenario.consumer,`Fill ${scenario.limit} after approval`);
   assert.equal(consumed.status,200);assert.equal(consumed.body.state,'accepted');assert.equal(calls,sentBefore+1);
   context.mock.timers.setTime(start+60000);
   const beforeDispatch=calls;
   await runHostedTimers(db,mail);
   assert.equal(calls,beforeDispatch,'Scheduled submission rechecks the filled limit before touching the mail edge');
   assert.equal(submissions.filter(message=>message.id===scheduled.body.id).length,0);
   const held=(await read()).find(message=>message.id===scheduled.body.id)!;
   assert.equal(held.state,'draft');assert.match(held.failure!,scenario.reason);assert.equal(held.retryAfter,scenario.retryAt);
   assert.doesNotMatch(held.failure!,scenario.limit==='shared'?/one-to-one budget/:/shared sending rate/,'The reason identifies only the limiting window');
   assert.deepEqual(held,{...saved,state:'draft',failure:held.failure,retryAfter:scenario.retryAt},'The original exact revision stays visibly unsent without losing its content or identity');
   assert.deepEqual((await read()).map(message=>message.id).sort(),[...inventoryBefore,consumed.body.id].sort(),'Dispatch neither merges nor creates a message');
   assert.equal((await approval.message(scheduled.body.id)).attempt_count,0,'Refusal consumed no submission attempt');
   const early=await api(scenario.sender,`workbench/messages/${scheduled.body.id}/retry`,'POST',{});
   assert.equal(early.status,409);assert.match(early.body.error,scenario.reason);assert.equal(calls,beforeDispatch);
   await runHostedTimers(db,mail);assert.equal(calls,beforeDispatch,'Another timer does not silently retry a held message');
   context.mock.timers.setTime(Date.parse(scenario.retryAt)+1000);
   const freed=await api<{shared:{used:number};users:{used:number;remaining:number}[]}>(scenario.sender,'settings/sending');
   assert.equal(freed.status,200);assert.equal(freed.body.shared.used,0);assert.equal(freed.body.users[0]!.remaining>0,true,'The relevant sender budget is available again');
   await runHostedTimers(db,mail);await runHostedTimers(db,mail);
   assert.equal(calls,beforeDispatch,'Returning capacity does not authorize an automatic resend');
   assert.deepEqual((await read()).find(message=>message.id===held.id),held,'The same held item and its reason survive later timers');
   const retry=await api<{id:string;state:string}>(scenario.sender,`workbench/messages/${held.id}/retry`,'POST',{});
   assert.equal(retry.status,200);assert.equal(retry.body.id,held.id);assert.equal(retry.body.state,'accepted');
   assert.equal(calls,beforeDispatch+1);assert.deepEqual(submissions.filter(message=>message.id===held.id).map(message=>[message.recipient_email,message.subject,message.body]),[[saved.recipientEmail,content.subject,content.body]],'Explicit reviewed retry submits the same exact message once');
   assert.equal((await read()).find(message=>message.id===held.id)!.state,'accepted');
   assert.equal((await api(scenario.sender,`workbench/messages/${held.id}/retry`,'POST',{})).status,409);
   await runHostedTimers(db,mail);assert.equal(calls,beforeDispatch+1,'Repeated retry and dispatch cannot submit it twice');
  }
 }finally{context.mock.timers.reset();await p.dispose();}
});
test('OUT-007 OUT-009 OUT-012 a signed provider unsubscribe stops the recipient and schedule within sixty seconds and returns the opportunity to NOW once',async()=>{
 const p=await isolatedDatabase();try{const db=p.db,f=await fixture(db),approval=new ApprovalRepository(db),outreach=new OutreachRepository(db),draft=await outreach.createDraft(f.opportunityId,{contactId:f.contactId,subject:'Accepted message',body:'Reviewed content'},f.actor),accepted=await approval.approve(draft.id,1,f.actor,{quietHoursConfirmation:(await approval.preview(draft.id)).localTime});await outreach.settle(accepted.id,f.actor,'accepted','test-provider-receipt',null);const next=await outreach.createDraft(f.opportunityId,{contactId:f.contactId,subject:'Do not send after unsubscribe',body:'Scheduled'},f.actor),scheduled=await approval.approve(next.id,1,f.actor,{scheduledAt:new Date(Date.now()+3*86400000).toISOString()});const waiting=await outreach.createDraft(f.opportunityId,{contactId:f.contactId,subject:'Waiting for review',body:'Reviewed after the unsubscribe'},f.actor);const {createMailEventRoutes}=await import('../../src/core/features/outreach/provider-routes'),{signRelayBody}=await import('../../src/base/sendgrid-event-relay/crypto'),secret='unsubscribe-test-secret-'.repeat(3),app=createMailEventRoutes(db,{relaySecret:secret}),timestamp=String(Math.floor(Date.now()/1000)),body=JSON.stringify([{sg_event_id:createId(),event:'group_unsubscribe',timestamp:Number(timestamp),email:'test@example.invalid',rer_product:'orbit',rer_delivery_id:accepted.idempotency_key}]),signature=await signRelayBody(secret,timestamp,body),started=Date.now();
 const post=()=>app.request('https://orbit.test/relay',{method:'POST',headers:{'x-rer-mail-timestamp':timestamp,'x-rer-mail-signature':signature},body});assert.equal((await post()).status,200);assert.equal((await post()).status,200);assert.ok(Date.now()-started<60000);const session=await createDependencies(db).auth.createSession(f.actor),operatorApp=createApp({database:db,assets:{fetch:async()=>new Response('test')}}),detail=await operatorApp.request(`https://orbit.test/api/v1/opportunities/${f.opportunityId}`,{headers:{cookie:`__Host-orbit_session=${session.token}`}});assert.equal(detail.status,200,'Verified provider activity remains readable in the operator detail');assert.ok((await detail.json() as {opportunity:{timeline:{actorName:string}[]}}).opportunity.timeline.some(entry=>entry.actorName==='SendGrid delivery events'));assert.equal((await approval.message(scheduled.id)).state,'cancelled');assert.equal((await db.prepare('SELECT contactability FROM contacts WHERE id=?').bind(f.contactId).first<{contactability:string}>())!.contactability,'do_not_contact');assert.equal((await db.prepare('SELECT queue_state FROM opportunities WHERE id=?').bind(f.opportunityId).first<{queue_state:string}>())!.queue_state,'now');assert.equal((await db.prepare("SELECT COUNT(*) n FROM timeline_entries WHERE kind='message.schedule_stopped' AND json_extract(payload_json,'$.messageId')=?").bind(scheduled.id).first<{n:number}>())!.n,1);
 // OUT-012: after the unsubscribe a new draft to the same contact cannot be created, a draft made before it cannot be approved, and nothing new is queued or sent.
 const outbound=async()=>Number((await db.prepare('SELECT COUNT(*) n FROM outbound_messages').first<{n:number}>())!.n),sentBefore=await outbound();
 await assert.rejects(()=>outreach.createDraft(f.opportunityId,{contactId:f.contactId,subject:'After the unsubscribe',body:'Must not be queued'},f.actor),/must not be contacted/);
 let mailed=0;const mailApp=createApp({database:db,assets:{fetch:async()=>new Response('test')},outboundMail:{send:async()=>{mailed++;return{providerMessageId:'after-unsubscribe'};}}}),refusal=await mailApp.request(`https://orbit.test/api/v1/workbench/drafts/${waiting.id}/approve`,{method:'POST',headers:{cookie:`__Host-orbit_session=${session.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},body:JSON.stringify({revision:1,quietHoursConfirmation:(await approval.preview(waiting.id)).localTime})});
 assert.equal(refusal.status,409,await refusal.clone().text());assert.equal((await refusal.clone().json() as {error:string}).error,'Revision already approved, changed, or is no longer permitted.','The refusal is the unsubscribe one, not the quiet-hours one, at any hour');assert.equal(await outbound(),sentBefore,'The refused approval creates no outbound message');assert.equal(mailed,0,'Nothing is sent to the unsubscribed contact');
 }finally{await p.dispose();}
});
