import assert from 'node:assert/strict';
import {createDependencies} from './dependencies';
import {createApp} from './app';
import {createId} from '../../src/core/shared/ids';
import {OutreachRepository} from '../../src/core/features/workbench/outreach-repository';
import {ApprovalRepository} from '../../src/core/features/outreach/approval-repository';
import {OutreachService} from '../../src/core/features/outreach/service';
import {nextPermitted,workingDaysAfter,localTime} from '../../src/core/features/outreach/time';
import type {SalesMailJourney} from './sales-sanity-mail-workspace';
export async function reviewRecipientClock({db,context,fixture,customer,sign}:SalesMailJourney){
 const sunday=new Date('2026-09-13T10:00:00Z');assert.equal(nextPermitted(sunday,'Europe/London').toISOString(),'2026-09-14T07:00:00.000Z');
 const friday=new Date('2026-10-30T14:00:00Z');const due=workingDaysAfter(friday,1,'America/New_York');assert.equal(due.toISOString(),'2026-11-02T15:00:00.000Z','The working-day deadline stays at 10am after the DST transition');
 context.mock.timers.enable({apis:['Date'],now:Date.parse('2030-01-07T06:59:30Z')});
 try{
  const f=await customer(),outreach=new OutreachRepository(db);let sends=0;
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
}
export async function holdRateLimitedApproval({db,context,fixture,customer,sign}:SalesMailJourney){
 const f=await customer(),outreach=new OutreachRepository(db),approval=new ApprovalRepository(db);await db.prepare("UPDATE outbound_messages SET claimed_at='2000-01-01T00:00:00.000Z' WHERE claimed_at IS NOT NULL").run();
 const fixed=new Date('2031-01-06T10:00:00Z');const messages=[];
 await db.prepare("INSERT INTO sending_limits VALUES('shared',3,?,?)").bind(f.actor,fixed.toISOString()).run();
 try{for(let i=0;i<4;i++){const draft=await outreach.createDraft(f.opportunityId,{contactId:f.contactId,subject:`Limit ${i}`,body:'Reviewed'},f.actor);messages.push(await approval.approve(draft.id,1,f.actor,{now:fixed}));}}
 finally{await db.prepare("DELETE FROM sending_limits WHERE id='shared'").run();}
 assert.deepEqual(messages.map(m=>m.state),['queued','queued','queued','draft']);assert.match(messages[3]!.failure!,/shared sending rate of 3 messages a minute/);assert.equal(messages[3]!.next_attempt_at,'2031-01-06T10:01:00.000Z');
}
export async function personalizeReviewedContent({db,context,fixture,customer,sign}:SalesMailJourney){
 const f=await customer(),second=await fixture(true),outreach=new OutreachRepository(db),approval=new ApprovalRepository(db);await db.prepare("UPDATE outbound_messages SET claimed_at='2000-01-01T00:00:00.000Z' WHERE claimed_at IS NOT NULL").run();
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
}
export async function recheckSendAuthority({db,context,fixture,sign}:SalesMailJourney){
 const mutations=["UPDATE drafts SET body='Changed' WHERE id=?","UPDATE drafts SET recipient_email='changed@example.invalid' WHERE id=?","UPDATE opportunities SET lifecycle='won' WHERE id=?","UPDATE contacts SET email='changed@example.invalid' WHERE id=?","DELETE FROM opportunity_contacts WHERE opportunity_id=?","UPDATE operators SET status='removed' WHERE id=?"];
 for(let index=0;index<mutations.length;index++){const f=await fixture(index===mutations.length-1),outreach=new OutreachRepository(db),approval=new ApprovalRepository(db),draft=await outreach.createDraft(f.opportunityId,{contactId:f.contactId,subject:'Exact content',body:'Approved only'},f.actor);const message=await approval.approve(draft.id,1,f.actor,{now:new Date('2030-01-07T09:00:00Z'),scheduledAt:'2030-01-07T10:00:00Z'});const target=index<2?draft.id:index===2||index===4?f.opportunityId:index===3?f.contactId:f.actor;await db.prepare(mutations[index]!).bind(target).run();let calls=0;await new OutreachService(db,{send:async()=>{calls++;return{providerMessageId:'must-not-send'};}}).dispatchDue(new Date('2030-01-07T10:00:00Z'));assert.equal(calls,0);assert.equal((await approval.message(message.id)).state,'failed');}
}
