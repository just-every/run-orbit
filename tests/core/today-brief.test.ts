import {exerciseSalesTasks} from '../support/sales-tasks';
import assert from 'node:assert/strict';
import {after,test} from 'node:test';
import {isolatedDatabase} from '../support/isolated-database';
import {todayApp,type TodayApp} from '../support/today-workspace';
import {eml} from '../support/capture-mail';
import {snapshot} from '../../src/core/features/delegation/evidence';
import {createAIProvider} from '../../src/core/features/assistance/provider';
import {createId} from '../../src/core/shared/ids';
import type {Brief,BriefLine} from '../../src/core/features/today/types';

const platform=await isolatedDatabase();after(()=>platform.dispose());const db=platform.db;
const lines=(brief:Brief)=>[...brief.accounts.flatMap(account=>account.lines),...brief.unresolved];
const byKind=(brief:Brief,kind:BriefLine['kind'])=>lines(brief).filter(line=>line.kind===kind);
const count=async(sql:string)=>(await db.prepare(sql).first<{n:number}>())!.n;

async function contactOf(t:TodayApp,opportunityId:string){return (await t.json<{opportunity:{contacts:{id:string}[]}}>(`/api/v1/opportunities/${opportunityId}`,{},200)).opportunity.contacts[0]!.id;}
async function overdueHandoff(t:TodayApp,opportunityId:string,title:string){
 const target=`opportunities/${opportunityId}/handoffs/${createId()}`,s=await snapshot(db,target,true);
 const response=await t.app.request('https://orbit.test/delegation/handoffs',{method:'POST',headers:{cookie:`__Host-orbit_session=${t.session.token}`,origin:'https://orbit.test','content-type':'application/json'},body:JSON.stringify({operationKey:createId(),operation:'orbit.handoff.upsert',target,expectedRevision:s.revision,expectedAudienceRevision:s.audience.audienceRevision,content:{title,description:'Promised on the last call',assigneeId:t.actor,dueAt:new Date(Date.now()-86400000).toISOString(),status:'open'}})});
 assert.equal(response.status,200,await response.clone().text());return target.split('/')[3]!;
}
async function captureUnknown(t:TodayApp,subject:string){
 const form=new FormData();form.append('includeUnknown','on');
 form.append('files',new File([eml({From:'Pat Unknown <pat@unmatched.test>',To:'seller@seller.test',Subject:subject,Date:new Date(Date.now()-3600000).toUTCString(),'Message-ID':`<${createId()}@unmatched.test>`},'Is anyone there?')],'unknown.eml',{type:'message/rfc822'}));
 const result=await t.json<{summary:unknown}>('/api/v1/capture/imports',{form},201);return result;
}

test('TASK-001 TEAM-004 BRIEF-001 BRIEF-002 AI-003 a seller starts each simulated day from one brief built from records only: replies, meetings, observed and inferred signals, overdue promises and unresolved identity, each line linked to its evidence',async()=>{
 const t=await todayApp(db);
 // A day with nothing: the brief says so plainly.
 const empty=await t.brief();assert.deepEqual([empty.accounts.length,empty.unresolved.length],[0,0]);assert.equal(empty.sinceBasis,'stale-interval');

 // Earlier days, through the public doors with their real occurred times.
 const acme=await t.opportunity('Acme renewal','Acme Logistics','Ana Ruiz','ana@acme.test'),bright=await t.opportunity('Brightline pilot','Brightline Health','Jo Park','jo@brightline.test'),cobalt=await t.opportunity('Cobalt expansion','Cobalt Works','Lee Chan','lee@cobalt.test');
 const form=await t.event(acme,'form.submitted','Pricing request',3),view=await t.event(acme,'page.viewed','Viewed pricing page',2),oldReply=await t.event(acme,'email.replied','Re: contract terms',9);
 const completed=await t.event(bright,'meeting.completed','Pilot kickoff',3);
 const draft=(await t.json<{id:string}>(`/api/v1/workbench/opportunities/${cobalt}/drafts`,{body:{contactId:await contactOf(t,cobalt),subject:'Expansion pricing',body:'Here are the numbers we discussed.'}},201)).id;
 const handoff=await overdueHandoff(t,cobalt,'Send the security questionnaire');
 await captureUnknown(t,'Question about your product');
 const unlinked=(await db.prepare("SELECT signal_id AS id FROM unlinked_signals WHERE resolved_at IS NULL").first<{id:string}>())!.id;

 const first=await t.brief();
 const ours=new Set([acme,bright,cobalt,form,view,oldReply,completed,draft,handoff,unlinked]);
 for(const line of lines(first)){
  assert.ok(ours.has(line.evidence.id),`only this workspace's evidence appears: ${line.id}`);
  assert.ok(line.href.startsWith('/app/'),line.href);assert.ok(Number.isFinite(Date.parse(line.occurredAt)));
 }
 assert.deepEqual(first.accounts.map(a=>a.name).sort(),['Acme Logistics','Brightline Health','Cobalt Works']);
 assert.deepEqual(byKind(first,'reply').map(l=>l.evidence.id),[oldReply]);
 assert.deepEqual(byKind(first,'signal').map(l=>[l.evidence.id,l.confidence]).sort(),[[form,'observed'],[view,'inferred']].sort());
 assert.deepEqual(byKind(first,'reply-unanswered').map(l=>l.evidence.id),[oldReply]);
 assert.deepEqual(byKind(first,'meeting-no-next-step').map(l=>l.evidence.id),[completed]);
 assert.deepEqual(byKind(first,'draft-unsent'),[],'A newly saved draft is not overdue');
 assert.deepEqual(byKind(first,'handoff-due').map(l=>[l.evidence.id,l.href]),[[handoff,`/app/opportunities/${cobalt}#handoff-${handoff}`]]);
 assert.deepEqual(byKind(first,'unlinked-signal').map(l=>[l.evidence.id,l.href]),[[unlinked,`/app/sources#unlinked-${unlinked}`]]);
 // A signal line points at the timeline entry the signal made on its opportunity.
 const detail=await t.json<{opportunity:{timeline:{id:string;kind:string;payload:{signalId?:string}}[]}}>(`/api/v1/opportunities/${acme}`,{},200);
 const entry=detail.opportunity.timeline.find(item=>item.kind==='signal.recorded'&&item.payload.signalId===form)!;
 assert.equal(byKind(first,'signal').find(l=>l.evidence.id===form)!.href,`/app/opportunities/${acme}#entry-${entry.id}`);

 // The operator marks the brief seen; the next day only what arrived since is new, and promises stay until kept.
 assert.equal((await t.call('/api/v1/today/seen',{body:{through:first.generatedAt}})).status,200);
 const quiet=await t.brief();assert.equal(quiet.sinceBasis,'seen');assert.equal(quiet.since,first.generatedAt);
 assert.deepEqual(byKind(quiet,'reply').length+byKind(quiet,'signal').length,0);assert.equal(quiet.counts.promises,3);
 const reply=await t.event(acme,'email.replied','Re: pricing request',0),booked=await t.event(bright,'meeting.booked','Pilot review',0);
 const next=await t.brief();
 assert.deepEqual(byKind(next,'reply').map(l=>l.evidence.id),[reply]);
 assert.deepEqual(byKind(next,'meeting').map(l=>[l.evidence.id,l.planHref]),[[booked,`/app/meetings/${booked}`]]);
 // Answering the customer keeps the promise: the newer reply supersedes the old one, and a logged call answers it.
 assert.deepEqual(byKind(next,'reply-unanswered'),[]);
 await t.json(`/api/v1/records/opportunity/${bright}/entries`,{body:{kind:'note',text:'Agreed pilot scope; next step is the review.',occurredAt:new Date().toISOString()}},200);
 assert.deepEqual(byKind(await t.brief(),'meeting-no-next-step'),[]);
 // The seller's own answer, captured from their mailbox and linked, answers a captured customer reply.
 await t.opportunity('Eden renewal','Eden Foods','Eve Hart','eve@eden.test');
 const capture=async(from:string,to:string,ageDays:number)=>{const files=new FormData();files.append('files',new File([eml({From:from,To:to,Subject:'Re: renewal terms',Date:new Date(Date.now()-ageDays*86400000).toUTCString(),'Message-ID':`<${createId()}@capture.test>`},'Renewal terms.')],'mail.eml',{type:'message/rfc822'}));await t.json('/api/v1/capture/imports',{form:files},201);
  for(const proposal of (await t.json<{proposals:{id:string;kind:string}[]}>('/api/v1/capture/proposals')).proposals.filter(p=>p.kind==='link_signal'))await t.json(`/api/v1/capture/proposals/${proposal.id}/accept`,{body:{}},200);};
 await capture('Eve Hart <eve@eden.test>',`${t.actor.toLowerCase()}@seller.test`,9);assert.deepEqual(byKind(await t.brief(),'reply-unanswered').map(l=>l.title),['Re: renewal terms']);
 await capture(`${t.actor.toLowerCase()}@seller.test`,'Eve Hart <eve@eden.test>',0);assert.deepEqual(byKind(await t.brief(),'reply-unanswered'),[]);
 const work=await exerciseSalesTasks(t,db),receiver=(await t.json<{id:string}>('/api/v1/settings/operators',{body:{email:`handover-${createId().toLowerCase()}@example.test`,displayName:'Alex Handover'}},201)).id;
 const companyReceiver=(await t.json<{id:string}>('/api/v1/settings/operators',{body:{email:`companies-${createId().toLowerCase()}@example.test`,displayName:'Casey Companies'}},201)).id;
 const task=(await t.json<any>(`/api/v1/tasks/${work.openTaskId}`)).task;
 const owned=await t.opportunity('Task handover deal','Handover Company','Handover Buyer',`${createId().toLowerCase()}@handover.test`),ownedDetail=await t.json<any>(`/api/v1/records/opportunity/${owned}`);
 await t.json(`/api/v1/records/opportunity/${owned}`,{method:'PUT',body:{...ownedDetail.record,owner_id:work.ownerId,contact_ids:ownedDetail.contacts.map((c:any)=>c.id),primary_contact_id:ownedDetail.contacts[0].id,custom_fields:{}}},200);
 const contacts:string[]=[],companies:string[]=[];
 for(let i=0;i<4;i++)contacts.push((await t.json<{id:string}>('/api/v1/records/contact',{body:{name:`Handover contact ${i+1}`,email:`${createId().toLowerCase()}@handover.test`,owner_id:work.ownerId}},201)).id);
 for(let i=0;i<2;i++)companies.push((await t.json<{id:string}>('/api/v1/records/company',{body:{name:`Handover company ${i+1}`,owner_id:work.ownerId}},201)).id);
 const leaving=await todayApp(db,{operatorId:work.ownerId});
 for(const [kind,id]of [['opportunity',owned],['contact',contacts[0]],['company',companies[0]]])await leaving.json(`/api/v1/records/${kind}/${id}/entries`,{body:{kind:'note',text:'Preserve the leaving rep’s handover notes',occurredAt:new Date().toISOString()}},200);
 const {createApp}=await import('../support/app');let paidCalls=0;
 const mailApp=createApp({database:db,assets:{fetch:async()=>new Response('test')},outboundMail:{send:async()=>{paidCalls++;return {providerMessageId:'handover-sent-receipt'};}}});
 const mail=async(path:string,body?:unknown)=>{const response=await mailApp.request(`https://orbit.test/api/v1/workbench/${path}`,{method:body?'POST':'GET',headers:{cookie:`__Host-orbit_session=${leaving.session.token}`,origin:'https://orbit.test','content-type':'application/json'},body:body?JSON.stringify(body):undefined});assert.equal(response.status,200,await response.clone().text());return response.json() as Promise<any>;};
 const retentionDraft=async(subject:string)=>(await leaving.json<{id:string}>(`/api/v1/workbench/opportunities/${owned}/drafts`,{body:{contactId:ownedDetail.contacts[0].id,subject,body:'Exact retained message content.'}},201)).id;
 const unsent=await retentionDraft('Unsent retained draft'),sentDraft=await retentionDraft('Already sent retained message');
 const preview=await mail(`drafts/${sentDraft}/approval-preview`),sent=await mail(`drafts/${sentDraft}/approve`,{revision:1,quietHoursConfirmation:preview.localTime});assert.equal(sent.state,'accepted');
 const scheduledDraft=await retentionDraft('Cancel on rep removal'),scheduled=await mail(`drafts/${scheduledDraft}/approve`,{revision:1,scheduledAt:new Date(Date.now()+3*86400000).toISOString()});assert.equal(scheduled.state,'scheduled');
 assert.equal((await t.call(`/api/v1/settings/operators/${work.ownerId}`,{method:'DELETE',body:{confirmed:true}})).status,409,'owned work requires explicit reviewed choices');
 const review=await t.json<any>(`/api/v1/settings/operators/${work.ownerId}/removal-review`);
 assert.deepEqual(review.contacts.map((row:any)=>row.id).sort(),[...contacts].sort());assert.deepEqual(review.companies.map((row:any)=>row.id).sort(),[...companies].sort());
 const plan={review:review.review,opportunities:t.actor,contacts:receiver,companies:companyReceiver,tasks:receiver,handoffs:null};
 const remove=(handover:unknown)=>t.call(`/api/v1/settings/operators/${work.ownerId}`,{method:'DELETE',body:{confirmed:true,handover}});
 const {contacts:missing,...incomplete}=plan;assert.equal((await remove(incomplete)).status,400,'every set needs a recorded choice');
 const {taskContent}=await import('../../src/core/features/tasks/ui/api');
 await t.json(`/api/v1/tasks/${task.id}`,{method:'PUT',body:{...taskContent(task),notes:'Updated before removal',revision:task.revision,status:'open'}},200);
 assert.equal((await remove(plan)).status,409,'changed tasks refuse the old review');
 const beforeNew=await t.json<any>(`/api/v1/settings/operators/${work.ownerId}/removal-review`);
 contacts.push((await t.json<{id:string}>('/api/v1/records/contact',{body:{name:'Handover contact 5',owner_id:work.ownerId}},201)).id);
 assert.equal((await remove({...plan,review:beforeNew.review})).status,409,'new owned contacts require a fresh review');
 const beforeEdit=await t.json<any>(`/api/v1/settings/operators/${work.ownerId}/removal-review`);
 await t.json(`/api/v1/records/company/${companies[0]}`,{method:'PUT',body:{name:'Reviewed handover company',owner_id:work.ownerId}},200);
 assert.equal((await remove({...plan,review:beforeEdit.review})).status,409,'changed companies require a fresh review');
 const beforeReassign=await t.json<any>(`/api/v1/settings/operators/${work.ownerId}/removal-review`),contact=(await t.json<any>(`/api/v1/records/contact/${contacts[0]}`)).record;
 for(const owner_id of [receiver,work.ownerId])await t.json(`/api/v1/records/contact/${contacts[0]}`,{method:'PUT',body:{...contact,owner_id,custom_fields:{}}},200);
 assert.equal((await remove({...plan,review:beforeReassign.review})).status,409,'an owner changed and restored still invalidates the review');
 const refreshed=await t.json<any>(`/api/v1/settings/operators/${work.ownerId}/removal-review`);assert.equal(refreshed.contacts.length,5);assert.equal(refreshed.companies.length,2);
 const inactive=(await t.json<{id:string}>('/api/v1/settings/operators',{body:{email:`inactive-${createId().toLowerCase()}@example.test`,displayName:'Inactive Receiver'}},201)).id;
 await t.json(`/api/v1/settings/operators/${inactive}`,{method:'DELETE',body:{confirmed:true}},200);
 assert.equal((await remove({...plan,review:refreshed.review,contacts:inactive})).status,409,'a receiver removed after review cannot receive work');
 const beforeHandover=(await t.json<any>(`/api/v1/records/opportunity/${owned}`)).record,finalPlan={...plan,review:refreshed.review};
 assert.deepEqual((await Promise.all([remove(finalPlan),remove(finalPlan)])).map(response=>response.status).sort(),[200,409],'concurrent removals commit one handover');
 assert.equal((await remove(finalPlan)).status,409,'replay adds no owner changes or notifications');
 assert.equal((await t.json<any>(`/api/v1/tasks/${task.id}`)).task.ownerId,receiver);
 const handed=await t.json<any>(`/api/v1/records/opportunity/${owned}`);assert.equal(handed.record.owner_id,t.actor);for(const field of ['score','band','lifecycle','stage_id','company_id'])assert.equal(handed.record[field],beforeHandover[field],`${field} stays independent of owner handover`);assert.ok(handed.timeline.some((e:any)=>e.actor_id===work.ownerId&&e.payload_json.includes('handover notes')));
 for(const [kind,ids,owner]of [['contact',contacts,receiver],['company',companies,companyReceiver]]as const)for(const id of ids){
  const detail=await t.json<any>(`/api/v1/records/${kind}/${id}`);assert.equal(detail.record.owner_id,owner);
  const entries=detail.timeline.filter((e:any)=>e.kind==='owner.changed'&&JSON.parse(e.payload_json).source==='Operator removal handover');assert.equal(entries.length,1);assert.equal(entries[0].actor_id,t.actor);
  const payload=JSON.parse(entries[0].payload_json);assert.equal(payload.previousOwnerId,work.ownerId);assert.equal(payload.ownerId,owner);
  if(id===ids[0])assert.ok(detail.timeline.some((e:any)=>e.actor_id===work.ownerId&&e.payload_json.includes('handover notes')));
 }
 assert.equal(handed.record.queue_state,'now','cancelled scheduled outreach returns the deal to NOW');assert.equal(handed.record.next_due_at,null);
 assert.equal((await leaving.call('/api/v1/tasks?view=all')).status,401);
 const messages=(await t.json<any>(`/api/v1/workbench/opportunities/${owned}/messages`)).messages;
 assert.equal(messages.find((message:any)=>message.id===scheduled.id).state,'cancelled');assert.equal(messages.find((message:any)=>message.id===sent.id).state,'accepted');assert.equal((await db.prepare('SELECT operator_id FROM outbound_messages WHERE id=?').bind(sent.id).first<{operator_id:string}>())!.operator_id,work.ownerId);assert.equal(paidCalls,1);
 assert.ok(await db.prepare('SELECT id FROM drafts WHERE id=? AND author_id=?').bind(unsent,work.ownerId).first());
 assert.equal((await db.prepare("SELECT count(*) n FROM notifications WHERE operator_id=? AND kind='task.assigned' AND event_key LIKE 'task.handover:%'").bind(receiver).first<{n:number}>())!.n,1);
 const audit=await db.prepare("SELECT details_json FROM audit_entries WHERE action='operator.removed' AND entity_id=?").bind(work.ownerId).first<{details_json:string}>(),receipt=JSON.parse(audit!.details_json);
 assert.deepEqual(receipt.contacts.sort(),[...contacts].sort());assert.deepEqual(receipt.companies.sort(),[...companies].sort());assert.equal(receipt.choices.contacts,receiver);assert.equal(receipt.choices.companies,companyReceiver);
 for(const owner of [receiver,companyReceiver])assert.equal((await db.prepare("SELECT count(*) n FROM notifications WHERE operator_id=? AND kind='owner.assigned' AND event_key=?").bind(owner,`owner:${receipt.operation}:${owner}`).first<{n:number}>())!.n,1);


});

test('BRIEF-003 AI-001 AI-002 AI-003 AI-004 an account summary is sent only as previewed, must cite the brief, and fails visibly without disturbing the brief',async()=>{
 const config={OPENAI_API_KEY:'test-only',AI_MODEL:'test-model',AI_INPUT_COST_PER_MILLION:'1',AI_OUTPUT_COST_PER_MILLION:'2'};
 const operator=createId(),t=await todayApp(db,{provider:createAIProvider(config),operatorId:operator}),off=await todayApp(db,{operatorId:operator});
 const brief=await t.brief(),account=brief.accounts.find(a=>a.name==='Acme Logistics')!,ids=account.lines.map(l=>l.evidence.id);
 const original=fetch,sent:unknown[]=[];let answer:()=>Response=()=>new Response('down',{status:503});
 globalThis.fetch=async(_url,init)=>{sent.push(JSON.parse(JSON.parse(String(init!.body)).input));return answer();};
 const reply=(output:unknown)=>()=>Response.json({status:'completed',usage:{input_tokens:50,output_tokens:20},output:[{content:[{type:'output_text',text:JSON.stringify(output)}]}]});
 try{
  const preview=await t.json<{configured:boolean;request:{lines:{evidenceId:string}[]};requestHash:string}>('/api/v1/today/summary/preview',{body:{account:account.key}},200);
  assert.equal(preview.configured,true);assert.deepEqual(preview.request.lines.map(l=>l.evidenceId),ids);
  answer=reply({summary:'Ana asked for pricing and replied about the contract.',evidenceIds:[ids[0]]});
  const ok=await t.json<{status:string;summary:string;evidenceIds:string[]}>('/api/v1/today/summary',{body:{account:account.key,requestHash:preview.requestHash}},200);
  assert.equal(ok.status,'succeeded');assert.deepEqual(sent.at(-1),preview.request,'exactly the previewed request is sent');
  for(const output of [{summary:'No citations at all.',evidenceIds:[]},{summary:'Cites something invented.',evidenceIds:['invented-evidence']}]){
   answer=reply(output);const failed=await t.call('/api/v1/today/summary',{body:{account:account.key,requestHash:preview.requestHash}});
   assert.equal(failed.status,502);const body=await failed.json() as {status:string;summary?:string};assert.equal(body.status,'failed');assert.equal(body.summary,undefined);
  }
  assert.equal((await t.call('/api/v1/today/summary',{body:{account:account.key,requestHash:'0'.repeat(64)}})).status,409);
  answer=()=>new Response('down',{status:503});
  assert.equal((await t.call('/api/v1/today/summary',{body:{account:account.key,requestHash:preview.requestHash}})).status,502);
  const calls=(await db.prepare("SELECT status FROM ai_calls WHERE feature='brief.summary' ORDER BY created_at,id").all<{status:string}>()).results.map(r=>r.status);
  assert.deepEqual(calls,['success','failed','failed','failed']);
 }finally{globalThis.fetch=original;}
 // The brief is whole while the provider is down, and with no provider at all.
 const{generatedAt:_a,...whole}=await t.brief(),{generatedAt:_b,...unconfigured}=await off.brief();assert.deepEqual(unconfigured,whole);
 assert.equal((await off.json<{configured:boolean}>('/api/v1/today/summary/preview',{body:{account:account.key}},200)).configured,false);
 assert.equal((await off.call('/api/v1/today/summary',{body:{account:account.key,requestHash:'0'.repeat(64)}})).status,503);
});

test('BRIEF-004 RECORD-010 OUT-001 a booked meeting gets a cited plan with unresolved attendees shown, notes saved as one editable note, and plan lines become next actions without sending anything',async()=>{
 const t=await todayApp(db);
 const opportunity=await t.opportunity('Delta rollout','Delta Freight','Mia Stone','mia@delta.test',1250000);
 const prior=await t.event(opportunity,'form.submitted','Rollout questions',4);
 const start=new Date(Date.now()+2*86400000),stamp=(d:Date)=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
 const invite=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Fixture//EN','METHOD:REQUEST','BEGIN:VEVENT',`UID:${createId()}@delta.test`,'SEQUENCE:0',`DTSTAMP:${stamp(new Date(Date.now()-600000))}`,`CREATED:${stamp(new Date(Date.now()-600000))}`,`DTSTART:${stamp(start)}`,`DTEND:${stamp(new Date(start.getTime()+1800000))}`,'SUMMARY:Delta rollout review',`ORGANIZER:mailto:${t.actor.toLowerCase()}@seller.test`,'ATTENDEE;CN=Mia Stone:mailto:mia@delta.test','ATTENDEE;CN=Sam New:mailto:sam@delta.test','STATUS:CONFIRMED','END:VEVENT','END:VCALENDAR'].join('\r\n');
 const files=new FormData();files.append('files',new File([invite],'invite.ics',{type:'text/calendar'}));await t.json('/api/v1/capture/imports',{form:files},201);
 const meeting=(await db.prepare("SELECT s.id FROM signals s JOIN capture_items i ON i.signal_id=s.id WHERE s.subject='Delta rollout review'").first<{id:string}>())!.id;
 // Held for review until a person accepts the link: listed in the brief as held, and the plan exists only after.
 assert.equal((await t.call(`/api/v1/today/meetings/${meeting}`)).status,409);assert.ok((await t.brief()).held.some(line=>line.evidence.id===meeting&&line.kind==='held-capture'));
 const proposal=(await db.prepare("SELECT id FROM capture_proposals WHERE signal_id=? AND kind='link_signal'").bind(meeting).first<{id:string}>())!.id;
 await t.json(`/api/v1/capture/proposals/${proposal}/accept`,{body:{}},200);
 const before={drafts:await count('SELECT count(*) AS n FROM drafts'),messages:await count('SELECT count(*) AS n FROM outbound_messages')};
 const {plan}=await t.json<{plan:any}>(`/api/v1/today/meetings/${meeting}`,{},200);
 assert.equal(plan.meeting.start,start.toISOString().replace(/\.\d{3}Z$/,'.000Z'));
 assert.deepEqual(plan.attendees.map((a:any)=>[a.contact.name,a.company?.name,a.opportunities.map((o:any)=>o.title)]),[['Mia Stone','Delta Freight',['Delta rollout']]]);
 // The company holds no domain key, so no company is inferred for the unknown address either.
 assert.deepEqual(plan.unresolved,[{email:'sam@delta.test',company:null}]);
 assert.equal(plan.primaryOpportunityId,opportunity);assert.equal(plan.openValueCents,1250000);
 assert.ok(plan.interactions.some((line:any)=>line.title==='Rollout questions'&&line.href.startsWith(`/app/opportunities/${opportunity}#entry-`)));
 // Agenda and prep notes are one RECORD-010 note on the opportunity; saving again edits it.
 const saved=await t.json<{entryId:string}>(`/api/v1/today/meetings/${meeting}/plan`,{method:'PUT',body:{agenda:'1. Rollout dates',prep:'Bring the migration checklist'}},200);
 const again=await t.json<{entryId:string}>(`/api/v1/today/meetings/${meeting}/plan`,{method:'PUT',body:{agenda:'1. Rollout dates\n2. Owners',prep:'Bring the migration checklist'}},200);
 assert.equal(again.entryId,saved.entryId);
 const reread=(await t.json<{plan:any}>(`/api/v1/today/meetings/${meeting}`,{},200)).plan;assert.deepEqual([reread.note.agenda,reread.note.prep],['1. Rollout dates\n2. Owners','Bring the migration checklist']);
 assert.equal(await count(`SELECT count(*) AS n FROM timeline_entries WHERE kind='manual.note' AND json_extract(payload_json,'$.plan.meetingSignalId')='${meeting}'`),1);
 // A plan line becomes a manual next action citing it; an uncited line is refused.
 const priorLine=reread.interactions.find((line:any)=>line.title==='Rollout questions');
 const action=await t.json<{observed:{target:string}}>(`/api/v1/today/meetings/${meeting}/actions`,{body:{title:'Confirm rollout owners',dueAt:null,evidenceId:priorLine.evidence.id}},201);
 const task=await db.prepare('SELECT title,status,source_client_id,assignee_id FROM handoff_tasks WHERE id=?').bind(action.observed.target.split('/')[3]).first();
 assert.deepEqual(task,{title:'Confirm rollout owners',status:'open',source_client_id:null,assignee_id:t.actor});
 assert.equal((await t.call(`/api/v1/today/meetings/${meeting}/actions`,{body:{title:'Uncited',dueAt:null,evidenceId:prior}})).status,400);
 assert.deepEqual({drafts:await count('SELECT count(*) AS n FROM drafts'),messages:await count('SELECT count(*) AS n FROM outbound_messages')},before,'planning sends and drafts nothing');
});
