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
import type {OperatorDraft} from '../../src/core/features/operator/ui/operator-api';
const platform=await isolatedDatabase();after(()=>platform.dispose());const db=platform.db;
async function fixture(provider?:AIProvider){const deps=createDependencies(db),actor=createId(),stage=createId();await deps.auth.ensureOperator({id:actor,email:`${actor}@test.invalid`,displayName:'Assistance test'});await deps.workspace.ensureWorkspace({name:'Assistance test',timezone:'UTC',currency:'USD',workingHours:{},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});const n=await db.prepare('SELECT COALESCE(MAX(position),0)+1 AS n FROM pipeline_stages').first<{n:number}>();await deps.workspace.ensurePipelineStage({id:stage,name:'Review',position:n!.n});const workbench=new WorkbenchRepository(db);const opportunity=await workbench.createOpportunity({title:'Real D1 test',companyName:'Test company',contactName:'Test contact',email:`${createId()}@test.invalid`,stageId:stage,valueCents:10},actor);await workbench.recordEvent(opportunity.id,{type:'form.submitted',subject:'Requested details',occurredAt:new Date().toISOString(),eventId:createId()},actor);const session=await deps.auth.createSession(actor);const app=createApp({database:db,assets:{fetch:async()=>new Response('test')},aiProvider:provider});const cookie=`__Host-orbit_session=${session.token}`;async function call(path:string,body?:unknown){return app.request(`https://orbit.test/api/v1/${path}`,{method:body?'POST':'GET',headers:{cookie,origin:'https://orbit.test','content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});}return{actor,opportunity,call,app,cookie};}
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
test('AI-002 invalid content fails visibly and native generation bounds transient retries; AI-003 unconfigured provider generates nothing',async context=>{
 const provider:AIProvider={provider:'test',model:'test',inputCostPerMillion:0,outputCostPerMillion:0,async generate(){return{output:{explanation:'Bad evidence',subject:'No',body:'No',evidenceIds:['not-present']},inputTokens:1,outputTokens:1};}};const f=await fixture(provider);const preview=await(await f.call('assistance/preview',{opportunityId:f.opportunity.id,feature:'draft'})).json() as {id:string};assert.equal((await f.call('assistance/generate',{previewId:preview.id})).status,502);assert.equal((await db.prepare('SELECT count(*) AS n FROM drafts WHERE opportunity_id=?').bind(f.opportunity.id).first<{n:number}>())!.n,0);const off=await fixture();assert.equal((await off.call('assistance/generate',{previewId:createId()})).status,503);

 // Exercise native preview and generation with the real adapter; replace only its HTTP edge.
 context.mock.timers.enable({apis:['Date'],now:Date.parse('2030-01-07T10:00:00Z')});
 const nativeFetch=globalThis.fetch;
 type Attempt={at:number;signal:AbortSignal;input:unknown};
 let attempts:Attempt[]=[],edge:(signal:AbortSignal,attempt:number)=>Promise<Response>;
 const real=await fixture(createAIProvider({OPENAI_API_KEY:'synthetic-orbit-1',AI_MODEL:'synthetic-orbit-2',AI_INPUT_COST_PER_MILLION:'1',AI_OUTPUT_COST_PER_MILLION:'2'}));
 const reply=(output:unknown)=>Response.json({status:'completed',usage:{input_tokens:20,output_tokens:10},output:[{content:[{type:'output_text',text:JSON.stringify(output)}]}]});
 globalThis.fetch=async(input,init)=>{
  if(String(input)!=='https://api.openai.com/v1/responses')return nativeFetch(input,init);
  assert.equal(init!.method,'POST');assert.equal(init!.redirect,'manual');
  assert.ok(init!.signal instanceof AbortSignal,'every attempt has a real abort deadline');
  const request=JSON.parse(String(init!.body));assert.equal(request.store,false);
  attempts.push({at:Date.now(),signal:init!.signal,input:JSON.parse(request.input)});
  return edge(init!.signal,attempts.length);
 };
 try {
  const inventory=async()=>({
   drafts:(await db.prepare('SELECT * FROM drafts WHERE opportunity_id=? ORDER BY id').bind(real.opportunity.id).all()).results,
   outbound:(await db.prepare('SELECT * FROM outbound_messages WHERE opportunity_id=? ORDER BY id').bind(real.opportunity.id).all()).results,
   detail:await(await real.call(`opportunities/${real.opportunity.id}`)).json(),
  });
  for(const feature of ['draft','explanation'] as const){
   async function run(label:string,respond:typeof edge,count:number,success=false){
    context.mock.timers.tick(1);attempts=[];edge=respond;
    const before=await inventory(),callsBefore=(await db.prepare('SELECT id FROM ai_calls WHERE opportunity_id=?').bind(real.opportunity.id).all()).results;
    const previewResponse=await real.call('assistance/preview',{opportunityId:real.opportunity.id,feature});
    assert.equal(previewResponse.status,200,label);
    const preview=await previewResponse.json() as {id:string;preview:unknown};
    const started=Date.now(),response=await real.call('assistance/generate',{previewId:preview.id}),body=await response.json() as {error?:string;output?:unknown;draftId?:string};
    assert.equal(response.status,success?200:502,label);assert.equal(attempts.length,count,label);
    for(const attempt of attempts){assert.deepEqual(attempt.input,preview.preview,`${label}: retries send the unchanged preview`);assert.ok(attempt.at-started<30000,`${label}: no new attempt after the shared deadline`);}
    assert.ok(Date.now()-started<=30000,`${label}: one generation deadline`);
    const calls=(await db.prepare('SELECT id,status,duration_ms FROM ai_calls WHERE opportunity_id=? ORDER BY id').bind(real.opportunity.id).all<{id:string;status:string;duration_ms:number}>()).results.filter(call=>!callsBefore.some(row=>row.id===call.id));
    assert.equal(calls.length,1,`${label}: one durable generation outcome`);assert.equal(calls[0]!.status,success?'success':'failed',label);assert.equal(calls[0]!.duration_ms,Date.now()-started);
    if(!success){
     assert.match(body.error!,/AI generation failed/);assert.deepEqual(Object.keys(body),['error'],`${label}: no invented output or draft identity`);
     assert.deepEqual(await inventory(),before,`${label}: no explanation, draft or outbound work changes`);
     assert.ok(!JSON.stringify(body).includes('synthetic-orbit-1'),'provider credentials never enter the visible failure');
    }else{
     const expected={explanation:'Follow up on the recorded request.',subject:'Your request',body:'Thanks for requesting details. What would help?',evidenceIds:[(preview.preview as {evidence:{id:string}[]}).evidence[0]!.id]};
     assert.deepEqual(body.output,expected,'the actual validated provider result is used');
     const after=await inventory();assert.deepEqual(after.outbound,before.outbound,'successful generation submits no message');
     if(feature==='draft'){
      assert.ok(body.draftId);const saved=await real.call(`drafts/${body.draftId}`);assert.equal(saved.status,200);
      const draft=(await saved.json() as {draft:OperatorDraft}).draft;assert.equal(draft.subject,expected.subject);assert.equal(draft.body,expected.body);assert.equal(after.drafts.length,before.drafts.length+1);
     }else{assert.equal((after.detail as {opportunity:{recommendation:{explanation:string}}}).opportunity.recommendation.explanation,expected.explanation);assert.deepEqual(after.drafts,before.drafts);}
    }
    assert.equal((await real.call('assistance/generate',{previewId:preview.id})).status,409,`${label}: replay cannot retry a consumed preview`);assert.equal(attempts.length,count);
   }
   const output=()=>{const preview=attempts.at(-1)!.input as {evidence:{id:string}[]};return{explanation:'Follow up on the recorded request.',subject:'Your request',body:'Thanks for requesting details. What would help?',evidenceIds:[preview.evidence[0]!.id]};};
   await run('transient failures recover on the second retry',async(_signal,attempt)=>{
    context.mock.timers.tick(5000);
    if(attempt===1)throw new TypeError('Synthetic connection reset');
    if(attempt===2)return new Response('Synthetic temporary outage',{status:503});
    return reply(output());
   },3,true);
   await run('transport exhaustion',async()=>{context.mock.timers.tick(5000);throw new TypeError('Synthetic connection reset');},3);
   for(const status of [429,503])await run(`transient HTTP ${status} exhaustion`,async()=>{context.mock.timers.tick(5000);return new Response('Synthetic unavailable',{status});},3);
   for(const status of [400,401,403,404,422])await run(`definite HTTP ${status} refusal`,async()=>new Response('Synthetic rejected',{status}),1);
   await run('invalid operation schema',async()=>reply({...output(),explanation:7}),1);
   await run('foreign citation',async()=>reply({...output(),evidenceIds:['synthetic-orbit-foreign-evidence']}),1);
   await run('overlong content',async()=>reply({...output(),body:'word '.repeat(151)}),1);
   await run('invalid provider content',async()=>new Response('Synthetic invalid JSON',{headers:{'Content-Type':'application/json'}}),1);
   await run('shared deadline aborts the retry',async(signal,attempt)=>{
    if(attempt===1){context.mock.timers.tick(29999);throw new TypeError('Synthetic delayed connection reset');}
    // The native timeout has only the one millisecond left by the first attempt.
    // Keep the event loop alive while waiting for AbortSignal.timeout's unrefed timer.
    return new Promise<Response>((_resolve,reject)=>{
     const watchdog=setTimeout(()=>reject(new Error('Provider request did not abort within its shared deadline')),1000);
     const aborted=()=>{clearTimeout(watchdog);context.mock.timers.tick(1);reject(signal.reason);};
     if(signal.aborted)aborted();else signal.addEventListener('abort',aborted,{once:true});
    });
   },2);
   assert.equal(attempts[1]!.signal.aborted,true,'the pending HTTP retry actually observes cancellation');
   assert.equal(attempts[1]!.at-attempts[0]!.at,29999,'retry does not receive another thirty seconds');
   await run('deadline exhausted by the first attempt',async()=>{context.mock.timers.tick(30000);throw new TypeError('Synthetic deadline transport failure');},1);
  }
 }finally{globalThis.fetch=nativeFetch;context.mock.timers.reset();}

});
test('AI-001 DATA-002 changed or deleted preview context never leaves deployment',async()=>{
 let calls=0;const f=await fixture({provider:'test',model:'test',inputCostPerMillion:0,outputCostPerMillion:0,async generate(){calls++;throw new Error('must not run');}});const preview=await(await f.call('assistance/preview',{opportunityId:f.opportunity.id,feature:'draft'})).json() as {id:string};await db.prepare('UPDATE opportunities SET title=? WHERE id=?').bind('Changed after preview',f.opportunity.id).run();assert.equal((await f.call('assistance/generate',{previewId:preview.id})).status,409);assert.equal(calls,0);
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
