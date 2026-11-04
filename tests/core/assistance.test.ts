import assert from 'node:assert/strict';
import {after,test} from 'node:test';
import {isolatedDatabase} from '../support/isolated-database';
import {createApp} from '../support/app';
import {createDependencies} from '../support/dependencies';
import {createId} from '../../src/core/shared/ids';
import {WorkbenchRepository} from '../../src/core/features/workbench/repository';
import type {AIProvider} from '../../src/core/features/assistance/provider';
import {identityResponse} from '../../src/core/features/identity';
import {mailedIdentity} from '../support/email-link';
const platform=await isolatedDatabase();after(()=>platform.dispose());const db=platform.db;
async function fixture(provider?:AIProvider){const deps=createDependencies(db),actor=createId(),stage=createId(),email=['synthetic-orbit-'+actor.toLowerCase(),'test.invalid'].join('@');await deps.auth.ensureOperator({id:actor,email,displayName:'Assistance test'});await deps.workspace.ensureWorkspace({name:'Assistance test',timezone:'UTC',currency:'USD',workingHours:{},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});const n=await db.prepare('SELECT COALESCE(MAX(position),0)+1 AS n FROM pipeline_stages').first<{n:number}>();await deps.workspace.ensurePipelineStage({id:stage,name:'Review',position:n!.n});const workbench=new WorkbenchRepository(db);const opportunity=await workbench.createOpportunity({title:'Real D1 test',companyName:'Test company',contactName:'Test contact',email:`${createId()}@test.invalid`,stageId:stage,valueCents:10},actor);await workbench.recordEvent(opportunity.id,{type:'form.submitted',subject:'Requested details',occurredAt:new Date().toISOString(),eventId:createId()},actor);const session=await deps.auth.createSession(actor);const app=createApp({database:db,assets:{fetch:async()=>new Response('test')},aiProvider:provider});async function call(path:string,body?:unknown){return app.request(`https://orbit.test/api/v1/${path}`,{method:body?'POST':'GET',headers:{cookie:`__Host-orbit_session=${session.token}`,origin:'https://orbit.test','content-type':['application','json'].join('/')},...(body?{body:JSON.stringify(body)}:{})});}return{actor,email,cookie:`__Host-orbit_session=${session.token}`,app,opportunity,call};}
test('AI-001 AI-002 AI-004 ACTION-003 preview is exact input, cited output creates durable unsent draft and usage',async()=>{
 let received:unknown;const provider:AIProvider={provider:'test',model:'test-model',inputCostPerMillion:1,outputCostPerMillion:2,async generate(input){received=input;const data=input as {evidence:{id:string}[]};return {output:{explanation:'Follow up on their request.',subject:'Your request',body:'Thanks for asking. What would help?',evidenceIds:[data.evidence[0]!.id]},inputTokens:20,outputTokens:10};}};
 const f=await fixture(provider);const previewResponse=await f.call('assistance/preview',{opportunityId:f.opportunity.id,feature:'draft'});assert.equal(previewResponse.status,200);const preview=await previewResponse.json() as {id:string;preview:unknown};const generated=await f.call('assistance/generate',{previewId:preview.id});assert.equal(generated.status,200);assert.deepEqual(received,preview.preview);const body=await generated.json() as {draftId:string};assert.ok(await db.prepare('SELECT id FROM drafts WHERE id=?').bind(body.draftId).first());assert.equal((await db.prepare('SELECT count(*) AS n FROM outbound_messages WHERE opportunity_id=?').bind(f.opportunity.id).first<{n:number}>())!.n,0);assert.equal((await f.call('assistance/generate',{previewId:preview.id})).status,409);const usage=await db.prepare('SELECT input_tokens,output_tokens,status FROM ai_calls WHERE opportunity_id=?').bind(f.opportunity.id).first();assert.deepEqual(usage,{input_tokens:20,output_tokens:10,status:'success'});
});
test('AI-002 invented evidence fails visibly; AI-003 unconfigured provider generates nothing',async()=>{
 const provider:AIProvider={provider:'test',model:'test',inputCostPerMillion:0,outputCostPerMillion:0,async generate(){return{output:{explanation:'Bad evidence',subject:'No',body:'No',evidenceIds:['not-present']},inputTokens:1,outputTokens:1};}};const f=await fixture(provider);const preview=await(await f.call('assistance/preview',{opportunityId:f.opportunity.id,feature:'draft'})).json() as {id:string};assert.equal((await f.call('assistance/generate',{previewId:preview.id})).status,502);assert.equal((await db.prepare('SELECT count(*) AS n FROM drafts WHERE opportunity_id=?').bind(f.opportunity.id).first<{n:number}>())!.n,0);const off=await fixture();assert.equal((await off.call('assistance/generate',{previewId:createId()})).status,503);
});
test('AI-001 DATA-002 changed or deleted preview context never leaves deployment',async()=>{
 let calls=0;const f=await fixture({provider:'test',model:'test',inputCostPerMillion:0,outputCostPerMillion:0,async generate(){calls++;throw new Error('must not run');}});const preview=await(await f.call('assistance/preview',{opportunityId:f.opportunity.id,feature:'draft'})).json() as {id:string};await db.prepare('UPDATE opportunities SET title=? WHERE id=?').bind('Changed after preview',f.opportunity.id).run();assert.equal((await f.call('assistance/generate',{previewId:preview.id})).status,409);assert.equal(calls,0);
});
test('NOTIFY-001 NOTIFY-002 queue transitions notify responsible operator once and read state belongs to recipient',async()=>{
 const f=await fixture();await db.prepare('DELETE FROM notifications WHERE opportunity_id=?').bind(f.opportunity.id).run();await db.prepare("UPDATE opportunities SET queue_state='next' WHERE id=?").bind(f.opportunity.id).run();await db.prepare("UPDATE opportunities SET queue_state='now',updated_at=? WHERE id=?").bind(new Date().toISOString(),f.opportunity.id).run();await db.prepare("UPDATE opportunities SET queue_state='now' WHERE id=?").bind(f.opportunity.id).run();
 const rows=(await db.prepare("SELECT id FROM notifications WHERE opportunity_id=? AND kind='opportunity.now'").bind(f.opportunity.id).all<{id:string}>()).results;
 assert.equal(rows.length,1);
 const id=rows[0]!.id,other=await fixture();
 type Inbox={notifications:{id:string;readAt:string|null}[];unread:number};
 const inbox=async(call:typeof f.call)=>{const response=await call('notifications');assert.equal(response.status,200);return await response.json() as Inbox;};
 const before=await inbox(f.call),otherBefore=await inbox(other.call);
 assert.equal(before.notifications.find(row=>row.id===id)!.readAt,null,'the known notice starts unread');
 assert.ok(!otherBefore.notifications.some(row=>row.id===id),'another recipient never sees the notice');
 assert.equal((await other.call(`notifications/${id}/read`,{})).status,404);
 assert.equal((await f.call(`notifications/${id}/read`,{})).status,200);
 const read=await inbox(f.call),notice=read.notifications.find(row=>row.id===id)!;
 assert.ok(notice.readAt);
 assert.equal((await db.prepare('SELECT read_at FROM notifications WHERE id=?').bind(id).first<{read_at:string}>())!.read_at,notice.readAt);
 assert.equal(read.unread,before.unread-1,'marking removes exactly one unread event');

 const mail=mailedIdentity(db),ask=(request:Request)=>identityResponse(request,mail.bindings,{ownerClaimed:async()=>true,mailSender:mail.mailSender});
 const signedOut=await ask(mail.post('/auth/signout',{cookie:f.cookie,form:{}}));
 assert.equal(signedOut!.status,303);
 assert.equal((await f.call('notifications')).status,401,'the signed-out cookie cannot read notifications');
 assert.equal((await f.call(`notifications/${id}/read`,{})).status,401,'the signed-out cookie cannot change read state');
 assert.equal((await ask(mail.post('/auth/magic-link',{json:{email:f.email,returnTo:'/app/notifications'}})))!.status,202);
 assert.equal(mail.sent.length,1,'only the requested sign-in mail is captured');
 assert.deepEqual(mail.sent[0]!.to,[f.email],'this operator requests their own link');
 const link=mail.linkIn(mail.sent[0]);assert.ok(link);
 const confirmed=await ask(mail.post('/auth/confirm',{form:{token:new URL(link).searchParams.get('token')!}}));
 assert.equal(confirmed!.status,303);
 assert.equal(confirmed!.headers.get('location'),'/app/notifications');
 const cookie=confirmed!.headers.get('set-cookie')!.split(';')[0]!;
 assert.notEqual(cookie,f.cookie,'confirmation issues a distinct session cookie');
 const session=await ask(new Request(mail.origin+'/auth/session',{headers:{Cookie:cookie}}));
 assert.equal(session!.status,200);
 assert.equal((await session!.json() as {operator:{id:string}}).operator.id,f.actor);
 const freshCall:typeof f.call=async(path,body)=>f.app.request(body?mail.post('/api/v1/'+path,{cookie,json:body}):new Request(mail.origin+'/api/v1/'+path,{headers:{Cookie:cookie}}));
 const reopened=await inbox(freshCall);
 assert.deepEqual(reopened.notifications.find(row=>row.id===id),notice,'the same notice and exact read time survive a new native sign-in');
 assert.equal(reopened.unread,read.unread,'sign-in does not make the event unread again');
 assert.equal(reopened.notifications.filter(row=>row.id===id).length,1,'sign-in does not duplicate the event');
 assert.equal((await freshCall(`notifications/${id}/read`,{})).status,200);
 assert.deepEqual(await inbox(freshCall),reopened,'repeated marking preserves the original read time and unread count');
 assert.equal((await f.call('notifications')).status,401,'the old cookie remains revoked after a new sign-in');
 assert.equal((await other.call(`notifications/${id}/read`,{})).status,404);
 assert.deepEqual(await inbox(other.call),otherBefore,'the recipient state remains isolated across sign-in');
});
test('NOTIFY-001 unassigned responsibility follows latest timeline actor for NOW, replies and failures; events remain unique',async()=>{
 const f=await fixture(),other=await fixture(),workbench=new WorkbenchRepository(db);
 await db.prepare('UPDATE opportunities SET owner_id=NULL WHERE id=?').bind(f.opportunity.id).run();
 await workbench.recordEvent(f.opportunity.id,{type:'meeting.booked',subject:'Second operator action',occurredAt:new Date().toISOString(),eventId:createId()},other.actor);
 await db.prepare('DELETE FROM notifications WHERE opportunity_id=?').bind(f.opportunity.id).run();
 await db.prepare("UPDATE opportunities SET queue_state='next' WHERE id=?").bind(f.opportunity.id).run();await db.prepare("UPDATE opportunities SET queue_state='now',updated_at=? WHERE id=?").bind(new Date().toISOString(),f.opportunity.id).run();
 const now=await db.prepare("SELECT operator_id FROM notifications WHERE opportunity_id=? AND kind='opportunity.now'").bind(f.opportunity.id).all();assert.deepEqual(now.results,[{operator_id:other.actor}]);
 await db.prepare('DELETE FROM notifications WHERE opportunity_id=?').bind(f.opportunity.id).run();await db.prepare("UPDATE opportunities SET queue_state='next' WHERE id=?").bind(f.opportunity.id).run();
 const eventId=createId();await workbench.recordEvent(f.opportunity.id,{type:'email.replied',subject:'Customer reply',occurredAt:new Date().toISOString(),eventId},other.actor);const replies=await db.prepare("SELECT operator_id,kind FROM notifications WHERE opportunity_id=?").bind(f.opportunity.id).all();assert.deepEqual(replies.results,[{operator_id:other.actor,kind:'customer.reply'}],'A reply and its resulting NOW transition are one notification');
 await workbench.recordEvent(f.opportunity.id,{type:'email.replied',subject:'Customer reply',occurredAt:(await db.prepare('SELECT occurred_at FROM signals WHERE source_event_id=?').bind(eventId).first<{occurred_at:string}>())!.occurred_at,eventId},other.actor);assert.equal((await db.prepare('SELECT count(*) AS n FROM notifications WHERE opportunity_id=?').bind(f.opportunity.id).first<{n:number}>())!.n,1);
 const {OutreachRepository}=await import('../../src/core/features/workbench/outreach-repository'),{ApprovalRepository}=await import('../../src/core/features/outreach/approval-repository');const contact=await db.prepare('SELECT contact_id FROM opportunity_contacts WHERE opportunity_id=?').bind(f.opportunity.id).first<{contact_id:string}>();const draft=await new OutreachRepository(db).createDraft(f.opportunity.id,{contactId:contact!.contact_id,subject:'Unsent notification proof',body:'No provider submission.'},f.actor);const approval=new ApprovalRepository(db),preview=await approval.preview(draft.id),message=await approval.approve(draft.id,1,f.actor,{quietHoursConfirmation:preview.localTime});
 await workbench.recordEvent(f.opportunity.id,{type:'meeting.booked',subject:'Latest responsible actor',occurredAt:new Date().toISOString(),eventId:createId()},other.actor);
 for(const state of ['failed','bounced','delivery-unknown']){await db.prepare('UPDATE outbound_messages SET state=?,updated_at=? WHERE id=?').bind(state,new Date().toISOString(),message.id).run();await db.prepare('UPDATE outbound_messages SET state=? WHERE id=?').bind(state,message.id).run();const rows=await db.prepare('SELECT operator_id FROM notifications WHERE opportunity_id=? AND kind=?').bind(f.opportunity.id,`message.${state}`).all();assert.deepEqual(rows.results,[{operator_id:other.actor}]);}
});
test('NOTIFY-001 BASE-OPS-005 an unassigned opportunity without operator history notifies every active operator and leaves a durable feature audit',async()=>{
 const f=await fixture(),deps=createDependencies(db),opportunityId=createId();const stage=await db.prepare('SELECT stage_id FROM opportunities WHERE id=?').bind(f.opportunity.id).first<{stage_id:string}>();await deps.records.ensureOpportunity({id:opportunityId,title:'Unassigned evidence',lifecycle:'open',stageId:stage!.stage_id,ownerId:null,companyId:null,valueCents:0,expectedCloseAt:null,score:0,band:'low',queueState:'now',queueReason:'No previous actor',lastContributingSignalAt:null});const active=(await db.prepare("SELECT id FROM operators WHERE status='active'").all<{id:string}>()).results.map(row=>row.id).sort(),notifications=(await db.prepare('SELECT id,operator_id FROM notifications WHERE opportunity_id=?').bind(opportunityId).all<{id:string;operator_id:string}>()).results;assert.deepEqual(notifications.map(row=>row.operator_id).sort(),active);
 const sample=notifications[0]!;const audit=await db.prepare("SELECT actor_id,action,details_json,occurred_at FROM audit_entries WHERE entity_type='notification' AND entity_id=?").bind(sample.id).first<{actor_id:null;action:string;details_json:string;occurred_at:string}>();assert.equal(audit!.action,'notification.created');assert.equal(JSON.parse(audit!.details_json).feature,'notifications');assert.ok(Number.isFinite(Date.parse(audit!.occurred_at)));await db.prepare('DELETE FROM notifications WHERE id=?').bind(sample.id).run();assert.ok(await db.prepare("SELECT id FROM audit_entries WHERE entity_type='notification' AND entity_id=?").bind(sample.id).first());
});
