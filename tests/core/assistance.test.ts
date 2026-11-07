import assert from 'node:assert/strict';
import {after,test} from 'node:test';
import {isolatedDatabase} from '../support/isolated-database';
import {createApp} from '../support/app';
import {createDependencies} from '../support/dependencies';
import {mailedIdentity} from '../support/email-link';
import {identityResponse} from '../../src/core/features/identity';
import {createId} from '../../src/core/shared/ids';
import {WorkbenchRepository} from '../../src/core/features/workbench/repository';
import {notificationSession} from '../support/notification-session';
import {notificationResponsibility} from '../support/notification-responsibility';
import {createAIProvider,type AIProvider} from '../../src/core/features/assistance/provider';
import type {OperatorDraft,OpportunityDetail} from '../../src/core/features/operator/ui/operator-api';
import {createOutboundMail,type OutboundMail} from '../../src/core/platform/outbound-mail';
import type {RenderReview} from '../../src/core/features/drafts/render';
const platform=await isolatedDatabase();after(()=>platform.dispose());const db=platform.db;
async function fixture(provider?:AIProvider,outboundMail?:OutboundMail){const deps=createDependencies(db),actor=createId(),stage=createId();await deps.auth.ensureOperator({id:actor,email:`${actor}@test.invalid`,displayName:'Assistance test'});await deps.workspace.ensureWorkspace({name:'Assistance test',timezone:'UTC',currency:'USD',workingHours:{},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});const n=await db.prepare('SELECT COALESCE(MAX(position),0)+1 AS n FROM pipeline_stages').first<{n:number}>();await deps.workspace.ensurePipelineStage({id:stage,name:'Review',position:n!.n});const workbench=new WorkbenchRepository(db);const opportunity=await workbench.createOpportunity({title:'Real D1 test',companyName:'Test company',contactName:'Test contact',email:`${createId()}@test.invalid`,stageId:stage,valueCents:10},actor);await workbench.recordEvent(opportunity.id,{type:'form.submitted',subject:'Requested details',occurredAt:new Date().toISOString(),eventId:createId()},actor);const session=await deps.auth.createSession(actor);const app=createApp({database:db,assets:{fetch:async()=>new Response('test')},aiProvider:provider,outboundMail});const cookie=`__Host-orbit_session=${session.token}`;async function call(path:string,body?:unknown){return app.request(`https://orbit.test/api/v1/${path}`,{method:body?'POST':'GET',headers:{cookie,origin:'https://orbit.test','content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});}return{actor,opportunity,call,app,cookie};}
test('AI-001 AI-002 AI-004 ACTION-003 preview is exact input, cited output creates durable unsent draft and usage',async()=>{
 let received:unknown;const provider:AIProvider={provider:'test',model:'test-model',inputCostPerMillion:1,outputCostPerMillion:2,async generate(input){received=input;const data=input as {evidence:{id:string}[]};return {output:{explanation:'Follow up on their request.',subject:'Your request',body:'Thanks for asking. What would help?',evidenceIds:[data.evidence[0]!.id]},inputTokens:20,outputTokens:10};}};
 const f=await fixture(provider);const previewResponse=await f.call('assistance/preview',{opportunityId:f.opportunity.id,feature:'draft'});assert.equal(previewResponse.status,200);const preview=await previewResponse.json() as {id:string;preview:unknown};const generated=await f.call('assistance/generate',{previewId:preview.id});assert.equal(generated.status,200);assert.deepEqual(received,preview.preview);const body=await generated.json() as {draftId:string};assert.ok(await db.prepare('SELECT id FROM drafts WHERE id=?').bind(body.draftId).first());assert.equal((await db.prepare('SELECT count(*) AS n FROM outbound_messages WHERE opportunity_id=?').bind(f.opportunity.id).first<{n:number}>())!.n,0);assert.equal((await f.call('assistance/generate',{previewId:preview.id})).status,409);const usage=await db.prepare('SELECT input_tokens,output_tokens,status FROM ai_calls WHERE opportunity_id=?').bind(f.opportunity.id).first();assert.deepEqual(usage,{input_tokens:20,output_tokens:10,status:'success'});

 // ACTION-004: edit the saved draft, end its session, and return through native sign-in.
 const path=`drafts/${body.draftId}`,beforeResponse=await f.call(path);
 assert.equal(beforeResponse.status,200);
 const original=(await beforeResponse.json() as {draft:OperatorDraft}).draft;
 assert.equal(original.id,body.draftId);
 assert.equal(original.opportunityId,f.opportunity.id);
 assert.equal(original.authorId,f.actor);
 assert.equal(original.recommendationId,(preview.preview as {recommendation:{id:string}}).recommendation.id);
 assert.ok(original.recommendationId,'the draft retains a real source recommendation');
 assert.ok(Number.isFinite(Date.parse(original.createdAt)));
 assert.equal(original.revision,1);
 const edited={recipientEmail:['synthetic-orbit-1','example.test'].join('@'),subject:'Saved subject after review',body:'Saved body after review.'};
 const update=await f.app.request(`https://orbit.test/api/v1/${path}`,{
  method:'PUT',headers:{Cookie:f.cookie,Origin:'https://orbit.test','Content-Type':'application/json'},
  body:JSON.stringify({revision:original.revision,...edited}),
 });
 assert.equal(update.status,200,await update.clone().text());
 const saved=(await update.json() as {draft:OperatorDraft}).draft;
 assert.deepEqual([saved.recipientEmail,saved.subject,saved.body],[edited.recipientEmail,edited.subject,edited.body]);
 assert.deepEqual([saved.id,saved.recommendationId,saved.authorId,saved.createdAt],[original.id,original.recommendationId,original.authorId,original.createdAt]);
 assert.equal(saved.revision,original.revision+1);
 assert.ok(Number.isFinite(Date.parse(saved.updatedAt)));
 const history=async(cookie:string)=>{
  const response=await f.app.request(`https://orbit.test/api/v1/records/opportunity/${f.opportunity.id}`,{headers:{Cookie:cookie}});
  assert.equal(response.status,200);
  return (await response.json() as {timeline:{id:string;kind:string;actor_id:string;actor_name:string;occurred_at:string;payload_json:string}[]}).timeline;
 };
 const edit=(await history(f.cookie)).find(entry=>entry.kind==='draft.updated'&&JSON.parse(entry.payload_json).draftId===saved.id);
 assert.ok(edit,'the saved edit has visible timeline attribution');
 assert.equal(edit.actor_id,f.actor);
 assert.equal(edit.actor_name,'Assistance test');
 assert.equal(edit.occurred_at,saved.updatedAt);
 assert.equal(JSON.parse(edit.payload_json).revision,saved.revision);

 const mail=mailedIdentity(db),auth=(request:Request)=>identityResponse(request,mail.bindings,{ownerClaimed:async()=>true,mailSender:mail.mailSender});
 const signedOut=await auth(mail.post('/auth/signout',{cookie:f.cookie,form:{}}));
 assert.equal(signedOut!.status,303);
 assert.match(signedOut!.headers.get('set-cookie')!,/Max-Age=0/);
 assert.equal((await f.call(path)).status,401,'the signed-out cookie cannot read the draft');
 const requested=await auth(mail.post('/auth/magic-link',{json:{email:`${f.actor}@test.invalid`,returnTo:`/app/drafts/${saved.id}`}}));
 assert.equal(requested!.status,202);
 assert.equal(mail.sent.length,1,'only the requested sign-in message is transported');
 assert.deepEqual(mail.sent[0]!.to,[`${f.actor.toLowerCase()}@test.invalid`]);
 const link=mail.linkIn(mail.sent[0]);
 assert.ok(link,'the operator receives their own native email link');
 const confirmed=await auth(mail.post('/auth/confirm',{form:{token:new URL(link).searchParams.get('token')!}}));
 assert.equal(confirmed!.status,303);
 assert.equal(confirmed!.headers.get('location'),`/app/drafts/${saved.id}`);
 const cookie=confirmed!.headers.get('set-cookie')!.split(';')[0]!;
 assert.notEqual(cookie,f.cookie,'returning signs in with a distinct new session');
 const session=await auth(new Request(mail.origin+'/auth/session',{headers:{Cookie:cookie}}));
 assert.equal(session!.status,200);
 assert.equal((await session!.json() as {operator:{id:string}}).operator.id,f.actor);
 const reopened=await f.app.request(`https://orbit.test/api/v1/${path}`,{headers:{Cookie:cookie}});
 assert.equal(reopened.status,200);
 assert.deepEqual((await reopened.json() as {draft:OperatorDraft}).draft,saved,'all saved content, identity, source, original author and edit times survive sign-in');
 assert.deepEqual((await history(cookie)).find(entry=>entry.id===edit.id),edit,'the original attributed edit survives sign-in');
 assert.equal((await f.call(path)).status,401,'signing back in never revives the old cookie');
 const messages=await f.app.request(`https://orbit.test/api/v1/workbench/opportunities/${f.opportunity.id}/messages`,{headers:{Cookie:cookie}});
 assert.equal(messages.status,200);
 assert.deepEqual((await messages.json() as {messages:unknown[]}).messages,[],'editing and returning submit no customer message');
});
test('AI-002 invented evidence fails visibly; AI-004 failed usage survives consumed-preview replay; AI-003 unconfigured provider generates nothing',async context=>{
 const provider=createAIProvider({OPENAI_API_KEY:'synthetic-orbit-1',AI_MODEL:'synthetic-orbit-2',AI_INPUT_COST_PER_MILLION:'1',AI_OUTPUT_COST_PER_MILLION:'2'});
 const f=await fixture(provider),previewResponse=await f.call('assistance/preview',{opportunityId:f.opportunity.id,feature:'draft'});
 assert.equal(previewResponse.status,200);
 const preview=await previewResponse.json() as {id:string;configured:boolean;preview:{evidence:{id:string}[]}};
 assert.equal(preview.configured,true);
 const foreignEvidence='synthetic-orbit-3';
 assert.ok(preview.preview.evidence.length>0,'the request contains actual recorded evidence');
 assert.ok(preview.preview.evidence.every(item=>item.id!==foreignEvidence));
 let requests=0;
 context.mock.method(globalThis,'fetch',async(input:RequestInfo|URL,init?:RequestInit)=>{
  assert.equal(input,'https://api.openai.com/v1/responses');
  assert.equal(init?.method,'POST');
  assert.deepEqual(JSON.parse(JSON.parse(String(init?.body)).input),preview.preview,'the real provider sends the saved preview');
  requests++;
  return Response.json({status:'completed',usage:{input_tokens:37,output_tokens:19},output:[{content:[{type:'output_text',text:JSON.stringify({explanation:'Bad evidence',subject:'No',body:'No',evidenceIds:[foreignEvidence]})}]}]});
 });
 const calls=async()=>(await db.prepare('SELECT * FROM ai_calls ORDER BY id').all()).results;
 const before=await calls();
 const failed=await f.call('assistance/generate',{previewId:preview.id});
 assert.equal(failed.status,502);
 assert.match((await failed.json() as {error:string}).error,/AI generation failed/);
 const usage=(await db.prepare('SELECT input_tokens,output_tokens,status FROM ai_calls WHERE opportunity_id=?').bind(f.opportunity.id).all()).results;
 assert.deepEqual(usage,[{input_tokens:37,output_tokens:19,status:'failed'}],'foreign citations retain exactly one failed call with the returned tokens');
 const after=await calls();
 assert.equal(after.length,before.length+1);
 const drafts=async()=>(await db.prepare('SELECT id FROM drafts WHERE opportunity_id=?').bind(f.opportunity.id).all()).results;
 assert.deepEqual(await drafts(),[],'invalid output creates no draft');
 const replay=await f.call('assistance/generate',{previewId:preview.id});
 assert.equal(replay.status,409);
 assert.match((await replay.json() as {error:string}).error,/already used/);
 assert.equal(requests,1,'a consumed preview never makes another provider request');
 assert.deepEqual(await calls(),after,'replay preserves the complete call inventory');
 assert.deepEqual(await drafts(),[],'replay cannot save the rejected draft');
 const off=await fixture();assert.equal((await off.call('assistance/generate',{previewId:createId()})).status,503);
});
test('AI-002 invented evidence fails visibly; AI-003 unconfigured provider generates nothing and handwritten outreach submits once',async context=>{
 context.mock.timers.enable({apis:['Date'],now:new Date('2026-11-06T12:00:00.000Z')});
 const provider:AIProvider={provider:'test',model:'test',inputCostPerMillion:0,outputCostPerMillion:0,async generate(){return{output:{explanation:'Bad evidence',subject:'No',body:'No',evidenceIds:['not-present']},inputTokens:1,outputTokens:1};}};const f=await fixture(provider);const preview=await(await f.call('assistance/preview',{opportunityId:f.opportunity.id,feature:'draft'})).json() as {id:string};assert.equal((await f.call('assistance/generate',{previewId:preview.id})).status,502);assert.equal((await db.prepare('SELECT count(*) AS n FROM drafts WHERE opportunity_id=?').bind(f.opportunity.id).first<{n:number}>())!.n,0);
 const submissions:{personalizations:{to:{email:string}[]}[];subject:string;content:{type:string;value:string}[];asm?:{group_id:number}}[]=[];
 context.mock.method(globalThis,'fetch',async(input:RequestInfo|URL,init?:RequestInit)=>{
  const request=new Request(input,init);
  assert.equal(request.url,'https://api.sendgrid.com/v3/mail/send','only the configured customer-mail HTTP edge may run');
  assert.equal(request.method,'POST');
  submissions.push(await request.json());
  return new Response(null,{status:202,headers:{'x-message-id':'synthetic-orbit-96-receipt'}});
 });
 const mail=createOutboundMail({DB:db,MAIL_PROVIDER:'sendgrid',SENDGRID_API_KEY:'synthetic-orbit-96',MAIL_FROM:['synthetic-orbit-96','example.test'].join('@'),MAIL_REPLY_TO:['synthetic-orbit-97','example.test'].join('@'),SENDGRID_UNSUBSCRIBE_GROUP_ID:'96'});
 assert.ok(mail,'customer mail is configured independently of AI');
 const off=await fixture(undefined,mail);
 const unavailable=await off.call('assistance/generate',{previewId:createId()});
 assert.equal(unavailable.status,503);
 assert.deepEqual(await unavailable.json(),{error:'AI is not configured. Manual work remains available.'});
 const detail=await off.call(`opportunities/${off.opportunity.id}`);
 assert.equal(detail.status,200);
 const opportunity=(await detail.json() as {opportunity:OpportunityDetail}).opportunity;
 const handwritten={contactId:opportunity.contacts[0]!.id,subject:'A handwritten answer',body:'Thanks for requesting details. I can walk through the options with you.'};
 const created=await off.call(`workbench/opportunities/${off.opportunity.id}/drafts`,handwritten);
 assert.equal(created.status,201,await created.clone().text());
 const draftId=(await created.json() as {id:string}).id;
 const savedResponse=await off.call(`drafts/${draftId}`);
 assert.equal(savedResponse.status,200);
 const saved=(await savedResponse.json() as {draft:OperatorDraft}).draft;
 assert.deepEqual([saved.subject,saved.body,saved.recipientEmail],[handwritten.subject,handwritten.body,opportunity.contacts[0]!.email]);
 const rendered=await off.call(`library/drafts/${draftId}/render`);
 assert.equal(rendered.status,200);
 const review=await rendered.json() as RenderReview;
 assert.deepEqual([review.recipientEmail,review.subject,review.body,review.revision],[saved.recipientEmail,saved.subject,saved.body,saved.revision]);
 assert.deepEqual(review.missing,[]);
 assert.deepEqual(review.stale,[]);
 const optOutResponse=await off.call(`workbench/drafts/${draftId}/opt-out`);
 assert.equal(optOutResponse.status,200);
 const optOut=await optOutResponse.json() as {carries:boolean;marking:string|null};
 const approvalPreview=await off.call(`workbench/drafts/${draftId}/approval-preview`);
 assert.equal(approvalPreview.status,200);
 const timing=await approvalPreview.json() as {localTime:string};
 const messages=async()=>{
  const response=await off.call(`workbench/opportunities/${off.opportunity.id}/messages`);
  assert.equal(response.status,200);
  return (await response.json() as {messages:{id:string;draftId:string;revision:number;state:string;recipientEmail:string;subject:string;body:string;optOut:number;providerMessageId:string|null;acceptedAt:string|null}[]}).messages;
 };
 assert.deepEqual(await messages(),[],'manual composition and review submit nothing');
 assert.equal(submissions.length,0);
 const approval={revision:review.revision,quietHoursConfirmation:timing.localTime};
 const approved=await off.call(`workbench/drafts/${draftId}/approve`,approval);
 assert.equal(approved.status,200,await approved.clone().text());
 const accepted=await approved.json() as {id:string;state:string};
 assert.equal(accepted.state,'accepted');
 const snapshot=await db.prepare('SELECT render_snapshot_json FROM outbound_messages WHERE id=?').bind(accepted.id).first<{render_snapshot_json:string}>();
 assert.deepEqual(JSON.parse(snapshot!.render_snapshot_json),review,'approval saves exactly the content the operator read');
 const bound=await db.prepare('SELECT carries,marking FROM outbound_message_opt_out WHERE message_id=?').bind(accepted.id).first<{carries:number;marking:string|null}>();
 assert.deepEqual(bound,{carries:optOut.carries?1:0,marking:optOut.marking},'approval binds the reviewed opt-out state');
 assert.equal(submissions.length,1);
 const wire=submissions[0]!,approvedSnapshot=JSON.parse(snapshot!.render_snapshot_json) as RenderReview;
 assert.deepEqual(wire.personalizations,[{to:[{email:approvedSnapshot.recipientEmail}]}]);
 assert.equal(wire.subject,approvedSnapshot.subject);
 assert.deepEqual(wire.content,[{type:'text/plain',value:approvedSnapshot.body}]);
 assert.deepEqual(wire.asm,bound!.carries?{group_id:96}:undefined);
 const receipts=await messages();
 assert.equal(receipts.length,1);
 assert.deepEqual([receipts[0]!.id,receipts[0]!.draftId,receipts[0]!.revision,receipts[0]!.state],[accepted.id,draftId,review.revision,'accepted']);
 assert.deepEqual([receipts[0]!.recipientEmail,receipts[0]!.subject,receipts[0]!.body,receipts[0]!.optOut],[review.recipientEmail,review.subject,review.body,bound!.carries]);
 assert.equal(receipts[0]!.providerMessageId,'synthetic-orbit-96-receipt');
 assert.equal(receipts[0]!.acceptedAt,new Date().toISOString());
 const repeated=await off.call(`workbench/drafts/${draftId}/approve`,approval);
 assert.equal(repeated.status,409);
 assert.match((await repeated.json() as {error:string}).error,/already approved/);
 assert.deepEqual(await messages(),receipts,'repeated approval leaves the accepted receipt unchanged');
 assert.equal(submissions.length,1,'repeated approval makes no second provider submission');
 assert.equal((await db.prepare('SELECT count(*) AS n FROM ai_calls WHERE opportunity_id=?').bind(off.opportunity.id).first<{n:number}>())!.n,0,'manual continuity makes no AI call');
 const drafts=await off.call(`drafts?opportunityId=${off.opportunity.id}`);
 assert.equal(drafts.status,200);
 assert.deepEqual((await drafts.json() as {drafts:OperatorDraft[]}).drafts,[saved],'only the handwritten draft exists');
 assert.equal((await db.prepare('SELECT count(*) AS n FROM recommendations WHERE opportunity_id=? AND explanation IS NOT NULL').bind(off.opportunity.id).first<{n:number}>())!.n,0,'no generated explanation appears');

});
test('AI-001 DATA-002 changed or deleted preview context never leaves deployment',async()=>{
 let calls=0;
 const provider:AIProvider={provider:'test',model:'test',inputCostPerMillion:0,outputCostPerMillion:0,async generate(){calls++;throw new Error('must not run');}};
 const f=await fixture(provider);
 const preview=await(await f.call('assistance/preview',{opportunityId:f.opportunity.id,feature:'draft'})).json() as {id:string};
 await db.prepare('UPDATE opportunities SET title=? WHERE id=?').bind('Changed after preview',f.opportunity.id).run();
 assert.equal((await f.call('assistance/generate',{previewId:preview.id})).status,409);
 assert.equal(calls,0);

 const erased=await fixture(provider),opportunityResponse=await erased.call(`opportunities/${erased.opportunity.id}`);
 assert.equal(opportunityResponse.status,200);
 const recipient=(await opportunityResponse.json() as {opportunity:OpportunityDetail}).opportunity.contacts[0]!;
 const contactUrl=`https://orbit.test/api/v1/records/contact/${recipient.id}`;
 assert.equal((await erased.app.request(contactUrl,{headers:{Cookie:erased.cookie}})).status,200,'the recipient exists before erasure');
 const previewResponse=await erased.call('assistance/preview',{opportunityId:erased.opportunity.id,contactId:recipient.id,feature:'draft'});
 assert.equal(previewResponse.status,200);
 const saved=await previewResponse.json() as {id:string;preview:{contact:{id:string;email:string}}};
 assert.deepEqual([saved.preview.contact.id,saved.preview.contact.email],[recipient.id,recipient.email]);
 assert.deepEqual(await db.prepare('SELECT id,recipient_contact_id,consumed_at FROM ai_previews WHERE id=?').bind(saved.id).first(),{id:saved.id,recipient_contact_id:recipient.id,consumed_at:null},'a real unused preview is bound to the recipient');
 const deleted=await erased.app.request(contactUrl,{
  method:'DELETE',headers:{Cookie:erased.cookie,Origin:'https://orbit.test','Content-Type':'application/json'},
  body:JSON.stringify({confirmed:true}),
 });
 assert.equal(deleted.status,200,await deleted.clone().text());
 assert.deepEqual(await deleted.json(),{deleted:true});
 assert.equal((await erased.app.request(contactUrl,{headers:{Cookie:erased.cookie}})).status,404,'a fresh authenticated read cannot find the erased recipient');
 assert.equal(await db.prepare('SELECT * FROM contacts WHERE id=?').bind(recipient.id).first(),null);
 assert.equal(await db.prepare('SELECT * FROM ai_previews WHERE id=?').bind(saved.id).first(),null,'erasure withdraws the saved recipient context');
 const drafts=async()=>{
  const response=await erased.call(`drafts?opportunityId=${erased.opportunity.id}`);
  assert.equal(response.status,200);
  return (await response.json() as {drafts:OperatorDraft[]}).drafts;
 };
 assert.deepEqual(await drafts(),[]);
 const inventory=async()=>({
  calls:(await db.prepare('SELECT * FROM ai_calls ORDER BY id').all()).results,
  drafts:(await db.prepare('SELECT * FROM drafts ORDER BY id').all()).results,
  recommendations:(await db.prepare('SELECT * FROM recommendations ORDER BY id').all()).results,
 });
 const afterErasure=await inventory();
 const refused=await erased.call('assistance/generate',{previewId:saved.id});
 assert.equal(refused.status,409);
 assert.deepEqual(await refused.json(),{error:'The preview was already used or is unavailable.'});
 assert.equal(calls,0,'the original preview cannot send erased context to the provider');
 assert.deepEqual(await inventory(),afterErasure,'refusal creates no AI call, draft or generated explanation after erasure');
 assert.deepEqual(await drafts(),[],'the authenticated draft list remains empty');
});
test('NOTIFY-001 NOTIFY-002 queue transitions notify once and recipient read state survives a fresh sign-in',async()=>{
 const f=await fixture();await db.prepare('DELETE FROM notifications WHERE opportunity_id=?').bind(f.opportunity.id).run();await db.prepare("UPDATE opportunities SET queue_state='next' WHERE id=?").bind(f.opportunity.id).run();await db.prepare("UPDATE opportunities SET queue_state='now',updated_at=? WHERE id=?").bind(new Date().toISOString(),f.opportunity.id).run();await db.prepare("UPDATE opportunities SET queue_state='now' WHERE id=?").bind(f.opportunity.id).run();const rows=(await db.prepare("SELECT id FROM notifications WHERE opportunity_id=? AND kind='opportunity.now'").bind(f.opportunity.id).all<{id:string}>()).results;assert.equal(rows.length,1);assert.equal((await f.call(`notifications/${rows[0]!.id}/read`,{})).status,200);assert.ok((await db.prepare('SELECT read_at FROM notifications WHERE id=?').bind(rows[0]!.id).first<{read_at:string}>())!.read_at);const other=await fixture();assert.equal((await other.call(`notifications/${rows[0]!.id}/read`,{})).status,404);
 await notificationSession(db,f.actor,f.cookie,rows[0]!.id,other.cookie);
});
test('NOTIFY-001 assigned owners override latest actors; unassigned NOW, replies and failures follow the latest actor once',async context=>{
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
 await notificationResponsibility(db,context,f.actor,other.actor);
});
test('NOTIFY-001 BASE-OPS-005 an unassigned opportunity without operator history notifies every active operator and leaves a durable feature audit',async()=>{
 const f=await fixture(),deps=createDependencies(db),opportunityId=createId();const stage=await db.prepare('SELECT stage_id FROM opportunities WHERE id=?').bind(f.opportunity.id).first<{stage_id:string}>();await deps.records.ensureOpportunity({id:opportunityId,title:'Unassigned evidence',lifecycle:'open',stageId:stage!.stage_id,ownerId:null,companyId:null,valueCents:0,expectedCloseAt:null,score:0,band:'low',queueState:'now',queueReason:'No previous actor',lastContributingSignalAt:null});const active=(await db.prepare("SELECT id FROM operators WHERE status='active'").all<{id:string}>()).results.map(row=>row.id).sort(),notifications=(await db.prepare('SELECT id,operator_id FROM notifications WHERE opportunity_id=?').bind(opportunityId).all<{id:string;operator_id:string}>()).results;assert.deepEqual(notifications.map(row=>row.operator_id).sort(),active);
 const app=createApp({database:db,assets:{fetch:async()=>new Response('test')}});for(const actor of active){const session=await deps.auth.createSession(actor),response=await app.request('https://orbit.test/api/v1/notifications',{headers:{Cookie:`__Host-orbit_session=${session.token}`}});assert.equal(response.status,200);const inbox=await response.json() as {notifications:{opportunityId:string}[]};assert.equal(inbox.notifications.filter(item=>item.opportunityId===opportunityId).length,1,'Every active operator can read their no-actor NOW notice');}
 const sample=notifications[0]!;const audit=await db.prepare("SELECT actor_id,action,details_json,occurred_at FROM audit_entries WHERE entity_type='notification' AND entity_id=?").bind(sample.id).first<{actor_id:null;action:string;details_json:string;occurred_at:string}>();assert.equal(audit!.action,'notification.created');assert.equal(JSON.parse(audit!.details_json).feature,'notifications');assert.ok(Number.isFinite(Date.parse(audit!.occurred_at)));await db.prepare('DELETE FROM notifications WHERE id=?').bind(sample.id).run();assert.ok(await db.prepare("SELECT id FROM audit_entries WHERE entity_type='notification' AND entity_id=?").bind(sample.id).first());
});
