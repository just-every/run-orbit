import assert from 'node:assert/strict';
import {createDependencies} from './dependencies';
import {createApp} from './app';
import {createId} from '../../src/core/shared/ids';
import {payloadHash} from '../../src/core/platform/source-security';
import {WorkbenchRepository} from '../../src/core/features/workbench/repository';
import {OutreachRepository} from '../../src/core/features/workbench/outreach-repository';
import {ApprovalRepository} from '../../src/core/features/outreach/approval-repository';
import {OutreachService} from '../../src/core/features/outreach/service';
import {localTime} from '../../src/core/features/outreach/time';
import {signedReplies} from './signed-reply';
import type {SalesMailJourney} from './sales-sanity-mail-workspace';
export async function acceptSignedDelivery({db,context,fixture,customer,sign}:SalesMailJourney){
 const {createMailEventRoutes}=await import('../../src/core/features/outreach/provider-routes');const f=await customer(),outreach=new OutreachRepository(db),approval=new ApprovalRepository(db);await db.prepare("UPDATE outbound_messages SET claimed_at='2000-01-01T00:00:00.000Z' WHERE claimed_at IS NOT NULL").run();
 const draft=await outreach.createDraft(f.opportunityId,{contactId:f.contactId,subject:'Delivery',body:'Reviewed provider content'},f.actor),message=await approval.approve(draft.id,1,f.actor,{quietHoursConfirmation:(await approval.preview(draft.id)).localTime});
 const keys=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);const pub=btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.exportKey('spki',keys.publicKey))));const app=createMailEventRoutes(db,{eventKey:pub});const timestamp=String(Math.floor(Date.now()/1000));const body=JSON.stringify([{sg_event_id:createId(),event:'delivered',rer_product:'orbit',timestamp:Number(timestamp),email:f.email,rer_delivery_id:message.idempotency_key,sg_message_id:'delivery-receipt'}]);
 const raw=new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},keys.privateKey,new TextEncoder().encode(timestamp+body)));const integer=(bytes:Uint8Array)=>{let start=0;while(start<31&&bytes[start]===0)start++;const value=Array.from(bytes.slice(start));return value[0]!&128?[0,...value]:value;};const r=integer(raw.slice(0,32)),s=integer(raw.slice(32)),der=[48,4+r.length+s.length,2,r.length,...r,2,s.length,...s];const signature=btoa(String.fromCharCode(...der));
 const post=(sig:string)=>app.request('https://orbit.test/sendgrid',{method:'POST',headers:{'X-Twilio-Email-Event-Webhook-Timestamp':timestamp,'X-Twilio-Email-Event-Webhook-Signature':sig},body});assert.equal((await post('invalid')).status,401);assert.equal((await post(signature)).status,200);assert.equal((await post(signature)).status,200);assert.equal((await approval.message(message.id)).state,'delivered');
 const count=await db.prepare("SELECT COUNT(*) AS n FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id WHERE r.record_id=? AND t.kind='provider.delivered'").bind(f.opportunityId).first<{n:number}>();assert.equal(count?.n,1);
}
export async function verifyRelay({db,context,fixture,sign}:SalesMailJourney){
 const {createMailEventRoutes}=await import('../../src/core/features/outreach/provider-routes');const {signRelayBody}=await import('../../src/base/sendgrid-event-relay/crypto');const secret='relay-only-secret-'.repeat(3),app=createMailEventRoutes(db,{relaySecret:secret}),timestamp=String(Math.floor(Date.now()/1000));const body=JSON.stringify([{sg_event_id:createId(),event:'delivered',timestamp:Number(timestamp),email:'other@example.test',rer_delivery_id:createId(),rer_product:'orbit'}]);const signature=await signRelayBody(secret,timestamp,body);
 const post=(raw:string,sig:string)=>app.request('https://orbit.test/relay',{method:'POST',headers:{'x-rer-mail-timestamp':timestamp,'x-rer-mail-signature':sig},body:raw});assert.equal((await post(body,signature)).status,200);assert.equal((await post(body+' ',signature)).status,401);assert.equal((await post(body,'v1='+'0'.repeat(64))).status,401);
}
export async function reconcileUnknownDelivery({db,context,fixture,customer,sign}:SalesMailJourney){
 const f=await customer(),outreach=new OutreachRepository(db),approval=new ApprovalRepository(db);await db.prepare("UPDATE outbound_messages SET claimed_at='2000-01-01T00:00:00.000Z' WHERE claimed_at IS NOT NULL").run();
 const draft=await outreach.createDraft(f.opportunityId,{contactId:f.contactId,subject:'Unknown',body:'Reviewed body'},f.actor);const message=await approval.approve(draft.id,1,f.actor,{quietHoursConfirmation:(await approval.preview(draft.id)).localTime});let sends=0,lookups=0;
 const service=new OutreachService(db,{send:async()=>{sends++;throw new Error('Transport timed out');},lookup:async key=>{lookups++;assert.equal(key,message.idempotency_key);return{providerMessageId:'reconciled-receipt'};}});
 assert.equal((await service.submit(message)).state,'delivery-unknown');await service.reconcile(new Date(Date.now()+6*60000));await service.reconcile(new Date(Date.now()+12*60000));assert.equal(sends,1);assert.equal(lookups,1);assert.equal((await approval.message(message.id)).state,'accepted');
}
export async function expireProviderRetry({db,context,fixture,customer,sign}:SalesMailJourney){
 const f=await customer(),outreach=new OutreachRepository(db),approval=new ApprovalRepository(db);
 const draft=await outreach.createDraft(f.opportunityId,{contactId:f.contactId,subject:'Retry expiry',body:'Reviewed'},f.actor);
 const message=await approval.approve(draft.id,1,f.actor,{now:new Date('2030-01-04T17:00:00Z'),scheduledAt:'2030-01-04T17:30:00Z'});
 await db.prepare("UPDATE outbound_messages SET first_attempt_at='2030-01-04T17:30:00.000Z',attempt_count=1,next_attempt_at='2030-01-04T17:31:00.000Z' WHERE id=?").bind(message.id).run();
 let calls=0;await new OutreachService(db,{send:async()=>{calls++;return{providerMessageId:'must-not-send'};}}).dispatchDue(new Date('2030-01-05T10:00:00Z'));
 const persisted=await approval.message(message.id);assert.equal(calls,0);assert.equal(persisted.state,'failed');assert.match(persisted.failure!,/retry window expired/);
 const opportunity=await db.prepare('SELECT queue_state,queue_reason FROM opportunities WHERE id=?').bind(f.opportunityId).first<{queue_state:string;queue_reason:string}>();assert.equal(opportunity?.queue_state,'now');assert.match(opportunity!.queue_reason,/retry window expired/);
}
export async function stopFollowUp({db,context,fixture,sign}:SalesMailJourney){
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
}
export async function classifyProviderBounce({db,context,fixture,sign}:SalesMailJourney){
 const {ProviderRepository}=await import('../../src/core/features/outreach/provider-repository');for(const type of ['blocked','bounce']){const f=await fixture(),approval=new ApprovalRepository(db),draft=await new OutreachRepository(db).createDraft(f.opportunityId,{contactId:f.contactId,subject:'Bounce classification',body:'Reviewed'},f.actor);await db.prepare("UPDATE outbound_messages SET claimed_at='2000-01-01T00:00:00Z' WHERE claimed_at IS NOT NULL").run();const message=await approval.approve(draft.id,1,f.actor,{quietHoursConfirmation:(await approval.preview(draft.id)).localTime});await new OutreachRepository(db).settle(message.id,f.actor,'accepted','test-receipt',null);const event={sg_event_id:createId(),event:'bounce',type,timestamp:Math.floor(Date.now()/1000),email:f.email,rer_product:'orbit',rer_delivery_id:message.idempotency_key};await new ProviderRepository(db).event(event,await payloadHash(JSON.stringify(event)));assert.equal((await db.prepare('SELECT contactability FROM contacts WHERE id=?').bind(f.contactId).first<{contactability:string}>())!.contactability,type==='bounce'?'do_not_contact':'contactable');}
}
