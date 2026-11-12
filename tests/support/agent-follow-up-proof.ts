import assert from 'node:assert/strict';
import type {TestContext} from 'node:test';
import {createApp} from '../../src/core/app/app';
import {operatorFromRequest,requireStepUp} from '../../src/core/features/identity';
import {autonomousPolicy,heldPolicy} from '../../src/base/modules/agent-door/conformance/crypto.mjs';
import {createOutboundMail} from '../../src/core/platform/outbound-mail';
import {OutreachService} from '../../src/core/features/outreach/service';
import {recordMailDatabase} from '../../src/core/features/outreach/record-mail-storage';
import {createMailEventRoutes} from '../../src/core/features/outreach/provider-routes';
import {dispatchObligationReminders} from '../../src/core/features/obligations/effects';
import {mailTransportKeys} from './mail-transport-client';
import {isolatedDatabase} from './isolated-database';
import {localArchiveRoundTrip} from './capture-privacy-archive';
import {createDependencies} from './dependencies';
import {dispatchSalesTaskReminders} from '../../src/core/features/tasks/reminders';
import type {CaptureSecurityProofContext} from './agent-door-capture-security-proof';

/** One complete meeting obligation through native HTTP, company-policy MCP and signed provider transport. */
export async function agentFollowUpProof(context:TestContext,{bindings,door,cookie,reviewerCookie,ownerId,adopt,businessCall}:CaptureSecurityProofContext){
 const db=bindings.DB,origin=bindings.AUTH_ORIGIN!,keys=mailTransportKeys(),submissions:unknown[]=[],lookups:string[]=[];
 let nextStatus=408;
 const realFetch=globalThis.fetch;
 context.mock.method(globalThis,'fetch',async(input:RequestInfo|URL,init?:RequestInit)=>{
  if(String(input)==='https://api.sendgrid.com/v3/mail/send'){
   submissions.push(JSON.parse(String(init?.body)));return new Response(null,{status:nextStatus});
  }
  if(String(input).startsWith('https://api.sendgrid.com/v3/messages?')){lookups.push(String(input));return Response.json({messages:[{msg_id:'synthetic-orbit-provider-1',status:'processed'}]});}
  return realFetch(input,init);
 });
 const mail=createOutboundMail({SENDGRID_API_KEY:'synthetic-orbit-81',MAIL_FROM:['synthetic-orbit','sender.test'].join('@'),SENDGRID_UNSUBSCRIBE_GROUP_ID:'1',MAIL_REPLY_TO:['synthetic-orbit','reply.test'].join('@')})!;
 const app=createApp({database:db,assets:bindings.ASSETS,authenticate:request=>operatorFromRequest(request,bindings),stepUp:(request,action,returnTo)=>requireStepUp(request,bindings,action,returnTo),outboundMail:mail,agentErasureSecret:bindings.SESSION_SECRET});
 const native=async(path:string,method='GET',body?:object,status=200,session=cookie)=>{
  const response=await app.request(origin+'/api/v1'+path,{method,headers:{Cookie:session,Origin:origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  assert.equal(response.status,status,path+': '+await response.clone().text());return response.json() as Promise<any>;
 };
 let rpc=1800;
 const agent={sub:'synthetic-orbit-follow-up-agent',name:'Follow-up helper'};
 const call=async(tool:string,args:Record<string,unknown>,overrides:Record<string,unknown>={})=>businessCall(tool,args,{act:agent,...overrides},['tools','call'].join('/'),++rpc);
 const done=(answer:any)=>{assert.equal(answer.status,200);assert.equal(answer.body.result?.isError,false,JSON.stringify(answer.body));return answer.body.result;};
 const pipeline=await native('/settings/pipelines','POST',{name:'Synthetic follow-up pipeline',stages:[{name:'Synthetic meeting',probability:20,requiredFields:[],staleIntervalDays:14},{name:'Synthetic advancement',probability:70,requiredFields:[],staleIntervalDays:14}]},201);
 const settings=await native('/settings'),stages=settings.stages.filter((s:any)=>s.pipeline_id===pipeline.id).sort((a:any,b:any)=>a.position-b.position);
 const buyer=await native('/records/contact','POST',{name:'Synthetic follow-up buyer',email:['synthetic-orbit-81','buyer.test'].join('@')},201);
 const deal=await native('/records/opportunity','POST',{title:'Synthetic meeting outcome',stage_id:stages[0].id,owner_id:ownerId,value_cents:0,contact_ids:[buyer.id],primary_contact_id:buyer.id},201);
 const meeting=await native(`/workbench/opportunities/${deal.id}/events`,'POST',{type:'meeting.completed',subject:'Synthetic completed meeting',occurredAt:new Date(Date.now()-3600000).toISOString(),eventId:'synthetic-orbit-meeting-81'},201);
 const input={meetingId:meeting.id,opportunityId:deal.id,contactId:buyer.id,ownerId,dueAt:new Date(Date.now()-60000).toISOString(),goalStageId:stages[1].id,title:'Agree the next stage',stopCondition:'Stop on the goal stage or an explicit human stop'};
 const inventory=async()=>JSON.stringify((await db.prepare('SELECT * FROM follow_up_obligations ORDER BY id').all()).results);
 const before=await inventory();
 await native('/obligations','POST',{...input,goalStageId:stages[0].id},409);
 await native('/obligations','POST',{...input,meetingId:'synthetic-orbit-missing'},409);
 await native('/obligations','POST',{...input,contactId:'synthetic-orbit-missing'},409);
 await native('/obligations','POST',{...input,ownerId:'synthetic-orbit-missing'},409);
 await native('/obligations','POST',input,401,'');
 assert.equal(await inventory(),before);
 const proofs:any[]=[];
 for(const mode of ['autonomous','held'] as const){
  await adopt(mode==='held'?heldPolicy():autonomousPolicy());
  const args={...input,title:input.title+' '+mode,idempotency_key:'synthetic-orbit-obligation-'+mode};
  const result=done(await call('orbit.obligations.accept',args)),id=result.structuredContent.id;
  const planUri=`orbit://meetings/${meeting.id}/plan`;
  assert.ok(result.content.some((item:any)=>item.type==='resource_link'&&item.uri===planUri),'acceptance returns the existing meeting plan resource');
  const linked=await businessCall('',{uri:planUri},{act:agent,scope:'meetings:read'},['resources','read'].join('/'),++rpc);
  assert.equal(linked.status,200);assert.equal(linked.body.error,undefined);
  const linkedPlan=JSON.parse(linked.body.result.contents.find((item:any)=>item.uri===planUri).text).plan;
  assert.equal(linkedPlan.obligations.find((item:any)=>item.id===id).goalState,'open','the resource reads back the accepted obligation under current policy');
  const decision=result._meta['com.runeditrun/decision'];assert.deepEqual(decision.classes.map((c:any)=>c.class),['standard']);assert.equal(decision.disposition,mode==='held'?'review':'autonomous');
  const row=await db.prepare("SELECT actor_type,payload_json FROM timeline_entries WHERE kind='obligation.accepted' AND json_extract(payload_json,'$.obligationId')=?").bind(id).first<{actor_type:string;payload_json:string}>();
  assert.equal(row!.actor_type,'agent');const attributed=JSON.parse(row!.payload_json);assert.equal(attributed.preparedBy.agent.id,agent.sub);assert.equal(attributed.preparedBy.for.id,ownerId);assert.deepEqual(attributed.evidence,[meeting.id]);
  if(mode==='held'){
   const review=result._meta['com.runeditrun/review'];assert.ok(review?.id);
   const list=await door.handle(new Request(origin+'/agents/api/reviews',{headers:{Cookie:cookie}}));
   const item=(await list!.json() as any).reviews.find((r:any)=>r.id===review.id);assert.equal(item.decision_id,decision.id);assert.equal(item.state,'open');assert.deepEqual(item.prepared_by,{agent:agent.name,for:'Morgan Lee'});
   const reviewRequest=(session:string)=>new Request(origin+`/agents/api/reviews/${review.id}/reviewed`,{method:'POST',headers:{Cookie:session,Origin:origin,'Content-Type':'application/json'},body:'{}'});
   assert.equal((await door.handle(reviewRequest(reviewerCookie)))!.status,403);
   assert.equal((await door.handle(reviewRequest(cookie)))!.status,200);
  }
  const once=await inventory();assert.deepEqual(done(await call('orbit.obligations.accept',args)).structuredContent,{id});assert.equal(await inventory(),once);
  const draftArgs={kind:'opportunity',id:deal.id,contact_id:buyer.id,obligation_id:id,subject:'Synthetic meeting next step',body:'The exact meeting follow-up. Please confirm the next stage.',idempotency_key:'synthetic-orbit-obligation-draft-'+mode};
  const draft=done(await call('orbit.drafts.create',draftArgs)).structuredContent;
  const saved=(await native('/drafts/'+draft.id)).draft;assert.equal(saved.authorLabel,'Follow-up helper for Morgan Lee');
  assert.equal(submissions.length,0,'accepting and preparing cannot send');
  proofs.push({id,args,draft,saved,mode,decision:decision.id,review:result._meta['com.runeditrun/review']?.id??null});
 }
 const read=async(id:string)=>(await native('/obligations/opportunities/'+deal.id)).obligations.find((o:any)=>o.id===id);
 const main=proofs[1],failed=proofs[0];
 const handoffTarget=`opportunities/${deal.id}/handoffs/synthetic-orbit-follow-up-81`;
 const handoff=done(await call('orbit.handoffs.read',{target:handoffTarget})).structuredContent;
 done(await call('orbit.handoffs.upsert',{target:handoffTarget,source_revision:handoff.revision,audience_revision:handoff.audienceRevision,obligation_id:main.id,
  content:{title:'Review the customer advancement',description:'From the completed meeting',assigneeId:ownerId,dueAt:input.dueAt,status:'open',evidence:[meeting.id]},idempotency_key:'synthetic-orbit-follow-up-handoff-81'}));
 await native(`/today/meetings/${meeting.id}/actions`,'POST',{title:'Cited plan follow-up',dueAt:input.dueAt,evidenceId:meeting.id,obligationId:main.id},201);
 assert.equal((await read(main.id)).draft_id,main.draft.id);
 assert.equal((await read(main.id)).messageState,'draft');assert.equal((await read(main.id)).goalState,'open');
 nextStatus=400;
 const failedPreview=await native(`/workbench/drafts/${failed.draft.id}/approval-preview`);
 await native(`/workbench/drafts/${failed.draft.id}/approve`,'POST',{revision:failed.saved.revision,quietHoursConfirmation:failedPreview.localTime},502);
 assert.equal(submissions.length,1);assert.equal((await read(failed.id)).messageState,'failed');assert.ok((await read(failed.id)).failure);assert.equal((await read(failed.id)).goalState,'open');
 nextStatus=408;
 const preview=await native(`/workbench/drafts/${main.draft.id}/approval-preview`);
 await native(`/workbench/drafts/${main.draft.id}/approve`,'POST',{revision:main.saved.revision+1,quietHoursConfirmation:preview.localTime},409);
 assert.equal(submissions.length,1,'wrong exact revision refuses without a provider request');
 await native(`/workbench/drafts/${main.draft.id}/approve`,'POST',{revision:main.saved.revision,quietHoursConfirmation:preview.localTime},502);
 assert.equal(submissions.length,2);assert.equal((await read(main.id)).messageState,'submitted-uncertain');assert.equal((await read(main.id)).responded_at,null);
 assert.equal((submissions[1] as any).subject,main.saved.subject);assert.equal((submissions[1] as any).content[0].value,main.saved.body);
 const service=new OutreachService(recordMailDatabase(db),mail);
 await service.dispatchDue(new Date(Date.now()+600000));await service.reconcile(new Date(Date.now()+600000));await service.reconcile(new Date(Date.now()+1200000));
 assert.equal(submissions.length,2);assert.equal(lookups.length,1);assert.equal((await read(main.id)).messageState,'submitted');assert.equal((await read(main.id)).goalState,'open');
 const message=await db.prepare('SELECT * FROM record_mail_outbound_messages WHERE draft_id=?').bind(main.draft.id).first<any>();
 const replyApp=createMailEventRoutes(db,{parseKey:keys.bindings.SENDGRID_PARSE_PUBLIC_KEY});
 const reply=async(automatic=false,valid=true)=>{
  const form=new FormData();form.set('from',['synthetic-orbit-81','buyer.test'].join('@'));form.set('subject','Re: Synthetic meeting next step');form.set('text','I replied; we have not advanced.');
  form.set('headers',[`Message-ID: <${['synthetic-orbit-'+(automatic?'automatic':'human'),'buyer.test'].join('@')}>`,`Date: ${new Date().toUTCString()}`,`In-Reply-To: ${message.message_id}`,`References: ${message.message_id}`,...(automatic?['Auto-Submitted: auto-replied']:[])].join('\r\n'));
  const request=new Request(origin+'/reply',{method:'POST',body:form}),raw=new Uint8Array(await request.arrayBuffer()),headers=await keys.headers('reply',raw,'192.0.2.81');
  return replyApp.request(origin+'/reply',{method:'POST',headers:{'Content-Type':request.headers.get('content-type')!,...headers,...(!valid?{'X-Twilio-Email-Event-Webhook-Signature':'invalid'}:{})},body:raw});
 };
 assert.equal((await reply(false,false)).status,401);assert.equal((await read(main.id)).responded_at,null);
 assert.equal((await reply(true)).status,200);assert.equal((await read(main.id)).responded_at,null,'automatic mail is never a human response');
 assert.equal((await reply()).status,200);assert.equal((await reply()).status,200);
 const responded=await read(main.id);assert.equal(responded.messageState,'responded');assert.equal(responded.goalState,'open');assert.ok(responded.response_evidence_id);
 assert.deepEqual(await db.prepare('SELECT source_id,type FROM signals WHERE id=?').bind(responded.response_evidence_id).first(),{source_id:'sendgrid-replies',type:'email.replied'});
 const meetingRead=done(await call('orbit.meetings.read',{id:meeting.id},{scope:'meetings:read'})).structuredContent;assert.equal(meetingRead.plan.obligations.find((o:any)=>o.id===main.id).goalState,'open');
 assert.equal((await native('/records/opportunity/'+deal.id)).record.stage_id,stages[0].id,'a genuine reply never moves stage');
 // An independently accepted obligation proves explicit stop and remaining approved scheduled work.
 const stopped=await native('/obligations','POST',{...input,title:'Explicitly stopped meeting follow-up'},201);
 const stopDraft=await native(`/workbench/records/opportunity/${deal.id}/drafts`,'POST',{contactId:buyer.id,obligationId:stopped.id,subject:'Scheduled follow-up',body:'This approved message must never dispatch.'},201);
 const schedulePreview=await native(`/workbench/drafts/${stopDraft.id}/approval-preview`),scheduledAt=new Date(Date.now()+7*86400000).toISOString();
 const schedule=await native(`/workbench/drafts/${stopDraft.id}/approval-preview?scheduledAt=${encodeURIComponent(scheduledAt)}`);
 await native(`/workbench/drafts/${stopDraft.id}/approve`,'POST',{revision:1,scheduledAt,scheduledAtConfirmation:schedule.scheduledAt??scheduledAt,quietHoursConfirmation:schedulePreview.localTime});
 const followUpTask=await native('/tasks','POST',{recordType:'opportunity',recordId:deal.id,obligationId:stopped.id,title:'Remaining follow-up task',ownerId,dueAt:input.dueAt,priority:'normal',type:'follow_up',notes:'Review the meeting outcome',recurrence:'none',timezone:'UTC',reminderMinutes:0},201);
 await dispatchSalesTaskReminders(db);
 assert.equal((await native('/tasks/'+followUpTask.id)).task.status,'open');
 await dispatchObligationReminders(db);assert.ok(await db.prepare("SELECT 1 FROM notifications WHERE event_key=?").bind('obligation.due:'+stopped.id).first());
 const stop=await native('/obligations/'+stopped.id+'/stop','POST',{reason:'Buyer asked to stop'});
 assert.deepEqual(await native('/obligations/'+stopped.id+'/stop','POST',{reason:'A replay cannot replace this reason'}),stop);
 const taskAfter=(await native('/tasks/'+followUpTask.id));assert.equal(taskAfter.task.status,'cancelled');assert.equal(taskAfter.history[0].payload.reason,'Stopped: Buyer asked to stop');
 const stoppedMessage=await db.prepare('SELECT state,failure FROM record_mail_outbound_messages WHERE draft_id=?').bind(stopDraft.id).first<any>();
 assert.deepEqual(stoppedMessage,{state:'cancelled',failure:'Stopped: Buyer asked to stop'},'the approved scheduled message exits with the explicit stop reason');
 const closed=await read(stopped.id);assert.equal(closed.goalState,'closed');assert.equal(closed.closed_by,ownerId);assert.equal(closed.closed_reason,'Stopped: Buyer asked to stop');assert.ok(closed.work.every((w:any)=>w.exit_reason===closed.closed_reason));
 assert.equal(await db.prepare('SELECT count(*) n FROM handoff_tasks WHERE id IN(SELECT item_id FROM follow_up_work WHERE obligation_id=?) AND status=\'open\'').bind(stopped.id).first('n'),0);
 await native(`/records/opportunity/${deal.id}/move`,'POST',{stageId:stages[1].id,reviewedStageId:stages[0].id});
 const advanced=await read(main.id);assert.equal(advanced.goalState,'closed');assert.equal(advanced.messageState,'responded');assert.equal(advanced.closed_by,ownerId);assert.match(advanced.closed_reason,/Advancement goal reached/);assert.ok(advanced.work.every((w:any)=>w.exit_reason===advanced.closed_reason));
 const closureCount=await db.prepare("SELECT count(*) n FROM timeline_entries WHERE kind='obligation.closed' AND json_extract(payload_json,'$.obligationId')=?").bind(main.id).first('n');assert.equal(closureCount,1);
 const closedInventory=await inventory();
 assert.deepEqual(done(await call('orbit.obligations.accept',main.args)).structuredContent,{id:main.id});
 assert.equal(await inventory(),closedInventory,'replaying acceptance preserves the closed goal and original closure');
 await native(`/records/opportunity/${deal.id}/move`,'POST',{stageId:stages[1].id,reviewedStageId:stages[1].id});
 await service.dispatchDue(new Date(Date.now()+10*86400000));await dispatchObligationReminders(db,new Date(Date.now()+10*86400000).toISOString());await dispatchSalesTaskReminders(db,new Date(Date.now()+10*86400000).toISOString());assert.equal(submissions.length,2);
 assert.equal(await db.prepare('SELECT count(*) n FROM notifications WHERE event_key IN(?,?)').bind('obligation.due:'+main.id,'obligation.due:'+stopped.id).first('n'),0);
 // Prepare one still-open obligation for both actual archive doors and a restarted destination.
 await native(`/records/opportunity/${deal.id}/move`,'POST',{stageId:stages[0].id,reviewedStageId:stages[1].id});
 const retained=await native('/obligations','POST',{...input,title:'Restore pauses this obligation'},201);
 const retainedTask=await native('/tasks','POST',{recordType:'opportunity',recordId:deal.id,obligationId:retained.id,title:'Restored reminder stays paused',ownerId,dueAt:input.dueAt,priority:'normal',type:'follow_up',notes:'No reminder after restore',recurrence:'none',timezone:'UTC',reminderMinutes:0},201);
 let target=await isolatedDatabase();
 try{
  await localArchiveRoundTrip(db,target.db);
  console.log(JSON.stringify({proof:'AGENT-003.archive',phase:'cli-restored',obligation:retained.id}));
  const restored=await target.db.prepare('SELECT * FROM follow_up_obligations WHERE id=?').bind(retained.id).first<any>();assert.equal(restored.paused,1);assert.equal(restored.closed_at,null);
  await dispatchObligationReminders(target.db,new Date(Date.now()+10*86400000).toISOString());
  await dispatchSalesTaskReminders(target.db,new Date(Date.now()+10*86400000).toISOString());
  assert.equal(await target.db.prepare("SELECT count(*) n FROM notifications WHERE kind='task.reminder' AND id IN(SELECT notification_id FROM sales_task_notification_links WHERE task_id=?)").bind(retainedTask.id).first('n'),0);
  assert.equal(await target.db.prepare('SELECT count(*) n FROM notifications WHERE event_key=?').bind('obligation.due:'+retained.id).first('n'),0);
  assert.equal((await target.db.prepare('SELECT * FROM follow_up_obligations WHERE id=?').bind(main.id).first<any>()).closed_at,advanced.closed_at);
  await target.close();await target.reopen();
  assert.equal((await target.db.prepare('SELECT closed_at FROM follow_up_obligations WHERE id=?').bind(main.id).first<any>()).closed_at,advanced.closed_at);
  await target.dispose();target=await isolatedDatabase();
  const targetDependencies=createDependencies(target.db);
  await targetDependencies.auth.ensureOperator({id:ownerId,email:bindings.OWNER_EMAIL!,displayName:'Morgan Lee'});
  await targetDependencies.workspace.ensureWorkspace({name:'Restore destination',timezone:'UTC',currency:'USD',workingHours:{},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});
  // Prior sections retain a completed immutable snapshot. Explicitly discard it through its native door.
  for(const job of (await native('/records/archive/exports')).jobs)await native(`/records/archive/exports/${job.id}/abort`,'POST',{});
  let exported=await native('/records/archive/exports','POST',{},201);
  for(let n=0;n<500&&exported.state!=='ready';n++)exported=await native(`/records/archive/exports/${exported.id}/advance`,'POST',{});
  assert.equal(exported.state,'ready');const archive=await native(`/records/archive/exports/${exported.id}/download`);
  const archived=archive.parts.flatMap((part:any)=>part.records).find((record:any)=>record.table==='follow_up_obligations'&&record.row.id===retained.id);
  assert.equal(archived.row.paused,0,'Records export opens the actual live obligation data');
  console.log(JSON.stringify({proof:'AGENT-003.archive',phase:'native-exported',parts:archive.parts.length,rows:archive.manifest.rows}));
  const restoredBindings={...bindings,DB:target.db},restoredApp=createApp({database:target.db,assets:bindings.ASSETS,authenticate:request=>operatorFromRequest(request,restoredBindings),stepUp:(request,action,returnTo)=>requireStepUp(request,restoredBindings,action,returnTo)});
  const session=await createDependencies(target.db).auth.createSession(ownerId);
  const restoreRequest=async(path:string,method='GET',body?:object,sessionToken=session.token)=>{const response=await restoredApp.request(origin+'/api/v1'+path,{method,headers:{Cookie:'__Host-orbit_session='+sessionToken,Origin:origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});assert.ok(response.ok,path+': '+await response.clone().text());return response.json() as Promise<any>;};
  let imported=await restoreRequest('/records/archive/imports','POST',{confirmed:true,manifest:archive.manifest});
  for(const part of archive.parts)await restoreRequest(`/records/archive/imports/${imported.id}/parts/${part.index}`,'PUT',part);
  console.log(JSON.stringify({proof:'AGENT-003.archive',phase:'native-uploaded',parts:archive.parts.length}));
  for(let n=0;n<1000&&imported.state!=='complete';n++)imported=await restoreRequest(`/records/archive/imports/${imported.id}/finalize`,'POST',{});
  assert.equal(imported.state,'complete');
  console.log(JSON.stringify({proof:'AGENT-003.archive',phase:'native-restored',steps:imported.completedSteps}));
  const freshSession=await createDependencies(target.db).auth.createSession(ownerId);
  const restoredPanel=(await restoreRequest('/obligations/opportunities/'+deal.id,'GET',undefined,freshSession.token)).obligations;
  assert.equal(restoredPanel.find((o:any)=>o.id===retained.id).goalState,'paused');assert.equal(restoredPanel.find((o:any)=>o.id===main.id).closed_at,advanced.closed_at);
  await target.close();await target.reopen();
  assert.equal((await target.db.prepare('SELECT closed_at FROM follow_up_obligations WHERE id=?').bind(main.id).first<any>()).closed_at,advanced.closed_at);
  const restartedService=new OutreachService(recordMailDatabase(target.db),mail);
  await restartedService.dispatchDue(new Date(Date.now()+10*86400000));
  await restartedService.reconcile(new Date(Date.now()+10*86400000));
  assert.equal(submissions.length,2,'a fresh dispatcher after restored database restart cannot revive the stopped scheduled message');
  assert.deepEqual(await target.db.prepare('SELECT state,failure FROM record_mail_outbound_messages WHERE draft_id=?').bind(stopDraft.id).first(),stoppedMessage);
  assert.equal(await target.db.prepare("SELECT count(*) n FROM timeline_entries WHERE kind='obligation.closed' AND json_extract(payload_json,'$.obligationId')=?").bind(main.id).first('n'),1,'restart and late dispatch retain exactly one closure');
  assert.deepEqual((await target.db.prepare('SELECT kind,item_id,exited_at,exit_reason FROM follow_up_work WHERE obligation_id=? ORDER BY kind,item_id').bind(stopped.id).all()).results,closed.work.map(({kind,item_id,exited_at,exit_reason}:any)=>({kind,item_id,exited_at,exit_reason})), 'restart keeps each remaining work item exited once with its original reason');
  await dispatchObligationReminders(target.db,new Date(Date.now()+10*86400000).toISOString());
  await dispatchSalesTaskReminders(target.db,new Date(Date.now()+10*86400000).toISOString());
  assert.equal(await target.db.prepare("SELECT count(*) n FROM notifications WHERE kind='task.reminder' AND id IN(SELECT notification_id FROM sales_task_notification_links WHERE task_id=?)").bind(retainedTask.id).first('n'),0);
  assert.equal(await target.db.prepare('SELECT count(*) n FROM notifications WHERE event_key=?').bind('obligation.due:'+retained.id).first('n'),0);

 }finally{await target.dispose();}
 // Archive work can outlast the signed policy lease; refresh the same held policy before testing replay authority.
 await adopt(heldPolicy());
 const survivor=await native('/records/contact','POST',{name:'Synthetic follow-up buyer',email:['synthetic-orbit-survivor','buyer.test'].join('@')},201);
 const pair=(await native('/records/contact/duplicates')).groups.find((group:any[])=>group.some(record=>record.id===buyer.id));
 await native('/records/contact/merge','POST',{survivorId:survivor.id,retiredId:buyer.id,choices:{email:'survivor'},reviewed:{survivor:pair.find((record:any)=>record.id===survivor.id).mergeReviewToken,retired:pair.find((record:any)=>record.id===buyer.id).mergeReviewToken},confirmed:true});
 assert.ok((await native('/obligations/opportunities/'+deal.id)).obligations.every((o:any)=>o.contact_id===survivor.id));
 await native('/records/contact/'+survivor.id,'DELETE',{confirmed:true});
 const redacted=(await native('/obligations/opportunities/'+deal.id)).obligations;
 for(const o of redacted){assert.equal(o.contact_id,null);assert.equal(o.meeting_id,null);assert.equal(o.draft_id,null);assert.equal(o.title,'Erased follow-up');assert.equal(o.goalState,'closed');assert.equal(o.messageState,'erased');}
 const erasedState=await inventory();
 const erasedReplay=await call('orbit.obligations.accept',main.args);assert.equal(erasedReplay.body.result._meta['com.runeditrun/error'].code,'subject_erased');
 assert.equal((await reply()).status,200);assert.equal(await inventory(),erasedState,'late provider replay and the erased agent call cannot revive an obligation');
 await service.dispatchDue(new Date(Date.now()+10*86400000));await dispatchObligationReminders(db,new Date(Date.now()+10*86400000).toISOString());
 assert.equal(submissions.length,2);
 const blocked=autonomousPolicy();blocked.rules=[{id:'block',class:'standard',do:'blocked'}];await adopt(blocked);
 const refused=await call('orbit.obligations.accept',{...input,idempotency_key:'synthetic-orbit-blocked'});assert.equal(refused.body.result._meta['com.runeditrun/error'].code,'policy_blocked');
 await adopt(autonomousPolicy());
 const revoke=await door.handle(new Request(origin+'/agents/api/agents/'+agent.sub+'/revoke',{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},body:'{}'}));assert.equal(revoke!.status,200);
 assert.equal((await call('orbit.obligations.accept',main.args)).status,401);
 console.log(JSON.stringify({proof:'AGENT-003.meeting-follow-up',policies:proofs.map(({id,mode,decision,review})=>({id,mode,decision,review})),submissions:submissions.length,lookupCount:lookups.length,uncertainReconciled:true,replyLeavesGoalOpen:true,advancedOnce:true,stoppedOnce:true,lateDispatchRefused:true,restorePaused:true,restart:true,erasureRedacted:true}));
 context.mock.restoreAll();
}
