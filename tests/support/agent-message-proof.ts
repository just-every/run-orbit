import assert from 'node:assert/strict';
import type {TestContext} from 'node:test';
import {createApp} from '../../src/core/app/app';
import {operatorFromRequest,requireStepUp} from '../../src/core/features/identity';
import {createOutboundMail} from '../../src/core/platform/outbound-mail';
import {runHostedTimers} from '../../src/core/features/outreach/scheduler';
import {autonomousPolicy,heldPolicy} from '../../src/base/modules/agent-door/conformance/crypto.mjs';
import type {RejectedReportProofContext} from './agent-door-proof';

/** Authenticated MCP, signed-in approval and native message history; only mail HTTP is replaced. */
export async function agentMessageProof(context:TestContext,{bindings,door,cookie,reviewerCookie,ownerId,adopt,businessCall}:RejectedReportProofContext) {
 const origin=bindings.AUTH_ORIGIN!,db=bindings.DB,submissions:any[]=[],originalFetch=globalThis.fetch;
 const old={MAIL_FROM:bindings.MAIL_FROM,MAIL_REPLY_TO:bindings.MAIL_REPLY_TO,SENDGRID_API_KEY:bindings.SENDGRID_API_KEY,SENDGRID_UNSUBSCRIBE_GROUP_ID:bindings.SENDGRID_UNSUBSCRIBE_GROUP_ID,MAIL_PROVIDER:bindings.MAIL_PROVIDER};
 Object.assign(bindings,{MAIL_FROM:['synthetic-orbit-sender','installation.test'].join('@'),MAIL_REPLY_TO:['synthetic-orbit-replies','installation.test'].join('@'),SENDGRID_API_KEY:'synthetic-orbit-mail-edge',SENDGRID_UNSUBSCRIBE_GROUP_ID:'1'});
 const app=createApp({database:db,assets:bindings.ASSETS,agentErasureSecret:bindings.SESSION_SECRET,outboundMail:createOutboundMail(bindings),authenticate:request=>operatorFromRequest(request,bindings),
  stepUp:(request,action,returnTo)=>requireStepUp(request,bindings,action,returnTo)});
 const nativeResponse=(path:string,method='GET',body?:object,session=cookie)=>app.request(origin+path,{method,headers:{Cookie:session,Origin:origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const native=async(path:string,method='GET',body?:object)=>{const response=await nativeResponse(path,method,body);assert.ok(response.ok,`native message ${response.status}: ${await response.clone().text()}`);return response.json() as Promise<any>;};
 const person=(path:string,body?:object,session=cookie)=>door.handle(new Request(origin+'/agents/api/approvals/'+path,{method:body?'POST':'GET',headers:{Cookie:session,Origin:origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}));
 const agent={sub:'synthetic-orbit-message-agent',name:'Ari',specialist:'sales rep'};
 let rpc=1000;
 const mcp=(name:string,args:Record<string,unknown>,overrides={})=>businessCall('orbit.'+name,args,{act:agent,...overrides},'tools/call',++rpc);
 const done=(response:Awaited<ReturnType<typeof businessCall>>)=>{assert.equal(response.status,200);assert.equal(response.body.error,undefined);assert.equal(response.body.result?.isError,false,JSON.stringify(response.body));return response.body.result.structuredContent;};
 const refused=(response:Awaited<ReturnType<typeof businessCall>>,code:string)=>{assert.equal(response.status,200);assert.equal(response.body.result?.isError,true,JSON.stringify(response.body));assert.equal(response.body.result._meta['com.runeditrun/error'].code,code);};
 const inventory=async()=>JSON.stringify((await db.prepare('SELECT * FROM record_mail_outbound_messages ORDER BY id').all()).results);
 const read=async(id:string)=>done(await mcp('drafts.read',{id}));
 const sendArgs=async(id:string,key:string)=>{const {sendRevision}=await read(id);return {id,send_revision:sendRevision,expected_revision:sendRevision,idempotency_key:'synthetic-orbit-'+key};};
 const pending=async(args:Record<string,unknown>)=>{
  const response=await mcp('messages.send',args);assert.equal(response.status,200);assert.equal(response.body.result.resultType,'input_required',JSON.stringify(response.body));
  const result=response.body.result,decision=result._meta['com.runeditrun/decision'];
  assert.equal(decision.disposition,'approval');assert.deepEqual(decision.classes.map(({class:cls,facts}:any)=>({class:cls,facts})),[{class:'external',facts:{measure:1,counterparty:'known'}}]);
  const handle=result._meta['com.runeditrun/approval'],view=await person(handle.id);assert.equal(view!.status,200);
  return (await view!.json() as any).approval;
 };
 const approve=async(approval:any,session=cookie)=>{
  const response=await person(approval.id+'/approve',{revision:approval.revision,summary_sha256:approval.summary_sha256},session);
  return {response:response!,body:await response!.json() as any};
 };
 context.mock.timers.enable({apis:['Date'],now:new Date('2026-11-11T12:00:00.000Z')});
 globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
  if(String(input)==='https://api.sendgrid.com/v3/mail/send') {submissions.push(JSON.parse(String(init?.body)));return new Response(null,{status:202,headers:{'x-message-id':'synthetic-orbit-mail-'+submissions.length}});}
  return originalFetch(input,init);
 }) as typeof fetch;
 try {
  await adopt(autonomousPolicy());
  await native('/api/v1/settings/opt-out/one_to_one','POST',{carries:true,removalAllowed:true});
  const company=await native('/api/v1/records/company','POST',{name:'Synthetic message company',primary_domain:'customer.test'});
  const email=['synthetic-orbit-buyer','customer.test'].join('@');
  const contact=await native('/api/v1/records/contact','POST',{name:'Synthetic buyer',email,job_title:'Buyer',company_id:company.id,timezone:'UTC'});
  const makeDraft=async(key:string)=>done(await mcp('drafts.create',{kind:'contact',id:contact.id,contact_id:contact.id,opportunity_id:null,
   subject:'Next steps for {{contact.name}}',body:'Hello {{contact.name}},\nYour role: {{contact.job_title}}\nExact saved bytes.\n',idempotency_key:'synthetic-orbit-draft-'+key})).id as string;
  const review=async(id:string)=>{const render=await native(`/api/v1/library/drafts/${id}/render`);return native(`/api/v1/library/drafts/${id}/render`,'POST',{revision:render.revision,reviewHash:render.reviewHash});};
  const draft=await makeDraft('held');await review(draft);
  const original=await read(draft);assert.equal(original.render.subject,'Next steps for Synthetic buyer');
  await adopt(heldPolicy());
  const heldArgs={...await sendArgs(draft,'held'),confirmed:true,confirmExternal:true,classes:['standard'],policy:'autonomous'},before=await inventory(),approval=await pending(heldArgs);
  assert.equal(approval.prepared_by.agent.name,'Ari');assert.equal(approval.prepared_by.for.name,'Morgan Lee');
  assert.deepEqual(approval.summary.recipients,[email]);assert.ok(approval.summary.items.includes(original.render.body));
  assert.ok(approval.summary.items.includes('Sender: Ari for Morgan Lee'));
  assert.equal(await inventory(),before);assert.equal(submissions.length,0);
  assert.equal((await approve(approval,reviewerCookie)).response.status,403,'only the named sponsor approves');
  assert.equal(submissions.length,0);
  const mismatch=await person(approval.id+'/approve',{revision:approval.revision,summary_sha256:'0'.repeat(64)});
  assert.equal(mismatch!.status,409);assert.equal(submissions.length,0);
  const approved=await approve(approval);assert.equal(approved.response.status,200);assert.equal(approved.body.approval.state,'executed',JSON.stringify(approved.body));
  assert.equal(submissions.length,1);
  assert.deepEqual(submissions[0].personalizations[0].to,[{email}]);assert.equal(submissions[0].from.name,'Ari for Morgan Lee');
  assert.equal(submissions[0].subject,original.render.subject);assert.equal(submissions[0].content[0].value,original.render.body);
  assert.equal(submissions[0].asm.group_id,1);
  await approve(approval);done(await mcp('messages.send',heldArgs));assert.equal(submissions.length,1,'approval and MCP replays submit nothing');
  const history=await native(`/api/v1/workbench/records/contact/${contact.id}/mail`);
  assert.equal(history.messages.length,1);assert.equal(history.messages[0].body,original.render.body);assert.equal(history.messages[0].state,'accepted');
  const timeline=await native(`/api/v1/records/contact/${contact.id}`);
  const accepted=timeline.timeline.find((entry:any)=>entry.kind==='message.accepted');assert.ok(accepted);assert.equal(accepted.actor_type,'agent');
  assert.equal(JSON.parse(accepted.payload_json).preparedBy.label,'Ari for Morgan Lee');

  await adopt(autonomousPolicy());const changedDraft=await makeDraft('merge');await review(changedDraft);
  await adopt(heldPolicy());const staleArgs=await sendArgs(changedDraft,'old-merge'),staleApproval=await pending(staleArgs);
  await native(`/api/v1/records/contact/${contact.id}`,'PATCH',{changes:{job_title:'Director'},base:{job_title:'Buyer'}});
  const stale=await approve(staleApproval);assert.equal(stale.body.approval.state,'refused');assert.equal(stale.body.approval.code,'revision_conflict');assert.equal(submissions.length,1);
  const staleRead=await native(`/api/v1/drafts/${changedDraft}`),staleDraft=staleRead.draft;
  assert.equal(staleDraft.isStale,true);
  await native(`/api/v1/workbench/drafts/${changedDraft}/review`,'POST',{revision:staleDraft.revision,reviewedUpdatedAt:staleDraft.updatedAt,recipientContactId:contact.id,recipientEmail:email,subject:staleDraft.subject,body:staleDraft.body});
  await review(changedDraft);const fresh=await read(changedDraft);assert.equal(fresh.draft.revision,staleDraft.revision+1);assert.ok(fresh.render.body.includes('Director'));
  const freshApproval=await pending(await sendArgs(changedDraft,'fresh-merge'));assert.equal((await approve(freshApproval)).body.approval.state,'executed');assert.equal(submissions.length,2);
  refused(await mcp('messages.send',staleArgs),'revision_conflict');assert.equal(submissions.length,2);

  await adopt(autonomousPolicy());const autonomous=await makeDraft('autonomous');await review(autonomous);
  const autoSaved=await read(autonomous),autoArgs=await sendArgs(autonomous,'autonomous'),auto=await mcp('messages.send',autoArgs);
  assert.equal(done(auto).state,'accepted');assert.equal(auto.body.result._meta['com.runeditrun/decision'].disposition,'autonomous');
  assert.equal(auto.body.result._meta['com.runeditrun/approval'],undefined);assert.equal(submissions.length,3);
  assert.equal(submissions[2].subject,autoSaved.render.subject);assert.equal(submissions[2].content[0].value,autoSaved.render.body);assert.equal(submissions[2].from.name,'Ari for Morgan Lee');
  done(await mcp('messages.send',autoArgs));assert.equal(submissions.length,3);

  const scheduled=await makeDraft('scheduled');await review(scheduled);
  const scheduledArgs={...await sendArgs(scheduled,'scheduled'),scheduled_at:'2026-11-11T12:02:00.000Z'};
  const queued=done(await mcp('messages.send',scheduledArgs));assert.equal(queued.state,'scheduled');assert.equal(submissions.length,3);
  context.mock.timers.setTime(Date.parse('2026-11-11T12:02:00.000Z'));
  await runHostedTimers(db,createOutboundMail(bindings));assert.equal(submissions.length,4);assert.equal(submissions[3].from.name,'Ari for Morgan Lee');
  const scheduledHistory=await native(`/api/v1/records/contact/${contact.id}`);
  const scheduledEntry=scheduledHistory.timeline.find((entry:any)=>entry.kind==='message.accepted'&&JSON.parse(entry.payload_json).messageId===queued.id);
  assert.ok(scheduledEntry);assert.equal(scheduledEntry.actor_type,'agent');assert.equal(JSON.parse(scheduledEntry.payload_json).preparedBy.label,'Ari for Morgan Lee');
  await runHostedTimers(db,createOutboundMail(bindings));assert.equal(submissions.length,4,'timer replay adds no submission');
  done(await mcp('messages.send',scheduledArgs));assert.equal(submissions.length,4);

  const limited=await makeDraft('limited');await review(limited);
  await native(`/api/v1/settings/sending/operators/${ownerId}`,'PUT',{oneToOnePerDay:1});
  const limitedResult=done(await mcp('messages.send',await sendArgs(limited,'limited')));
  assert.equal(limitedResult.state,'draft');assert.match(limitedResult.reason,/Sending limit/);assert.equal(submissions.length,4);
  await native(`/api/v1/settings/sending/operators/${ownerId}`,'PUT',{oneToOnePerDay:null});

  const optDraft=await makeDraft('opt-out');await review(optDraft);await adopt(heldPolicy());
  const optApproval=await pending(await sendArgs(optDraft,'old-opt-out'));
  await native('/api/v1/settings/opt-out/one_to_one','POST',{carries:false,removalAllowed:true});
  const optChanged=await approve(optApproval);assert.equal(optChanged.body.approval.state,'refused');assert.equal(optChanged.body.approval.code,'revision_conflict');assert.equal(submissions.length,4);
  await native('/api/v1/settings/opt-out/one_to_one','POST',{carries:true,removalAllowed:true});await adopt(autonomousPolicy());

  const fenced=await makeDraft('fences');await review(fenced);
  const fenceArgs=await sendArgs(fenced,'missing-scope'),fenceBefore=await inventory();
  assert.equal((await mcp('messages.send',fenceArgs,{scope:'drafts:read'})).status,403);assert.equal(await inventory(),fenceBefore);
  // Neither an ordinary confirmation nor invented class facts can supply a native time confirmation.
  context.mock.timers.setTime(Date.parse('2026-11-11T22:00:00.000Z'));await adopt(autonomousPolicy());
  const quietArgs=await sendArgs(fenced,'quiet');
  const quiet=await mcp('messages.send',{...quietArgs,confirmed:true,quietHoursConfirmation:'confirmed',classes:['standard']});refused(quiet,'revision_conflict');assert.match(quiet.body.result._meta['com.runeditrun/error'].reason,/Outside recipient sending hours/);
  assert.equal(await inventory(),fenceBefore);assert.equal(submissions.length,4);
  context.mock.timers.setTime(Date.parse('2026-11-11T12:00:00.000Z'));await adopt(autonomousPolicy());
  bindings.MAIL_PROVIDER='rer';bindings.MAIL_RELAY_URL='https://relay.example.test/mail';bindings.MAIL_API_KEY='synthetic-orbit-relay';
  const unsupported=await mcp('messages.send',await sendArgs(fenced,'transport'));refused(unsupported,'sender_unavailable');assert.match(unsupported.body.result._meta['com.runeditrun/error'].reason,/cannot name the agent/);assert.equal(submissions.length,4);assert.equal(await inventory(),fenceBefore);
  bindings.MAIL_PROVIDER=undefined;
  await native(`/api/v1/records/contact/${contact.id}`,'PATCH',{changes:{contactability:'do_not_contact'},base:{contactability:'contactable'}});
  refused(await mcp('messages.send',await sendArgs(fenced,'stopped')),'revision_conflict');assert.equal(submissions.length,4);
  await native(`/api/v1/records/contact/${contact.id}`,'DELETE',{confirmed:true});
  assert.equal((await nativeResponse(`/api/v1/records/contact/${contact.id}`)).status,404);
  refused(await mcp('messages.send',autoArgs),'subject_erased');assert.equal(submissions.length,4);
  assert.deepEqual((await native(`/api/v1/workbench/records/contact/${contact.id}/mail`)).messages,[]);
  const erasedApproval=await person(approval.id);assert.deepEqual((await erasedApproval!.json() as any).approval.summary,{});
  const revoke=await door.handle(new Request(origin+'/agents/api/agents/'+agent.sub+'/revoke',{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},body:'{}'}));
  assert.equal(revoke!.status,200);const revoked=await mcp('messages.send',autoArgs);assert.equal(revoked.status,401);assert.equal(revoked.body.result,undefined);assert.equal(submissions.length,4);
  console.log(JSON.stringify({proof:'SURFACE-009.saved-message',held:'accepted-once',mergeConflict:'refused',freshRevision:'accepted-once',autonomous:'accepted-once',submissions:submissions.length,nativeHistory:true,actor:'agent-for-person',sender:'agent-for-person',optOutRevision:'refused',scheduledAttribution:'preserved',limits:'native-held',erasureReplay:'subject-erased',revoked:'refused',scope:'refused',quietHours:'refused',unsupportedSender:'refused',suppression:'refused'}));
 } finally {globalThis.fetch=originalFetch;context.mock.timers.reset();Object.assign(bindings,old);delete bindings.MAIL_RELAY_URL;delete bindings.MAIL_API_KEY;await adopt(autonomousPolicy());}
}
