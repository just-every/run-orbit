import {exerciseTwilio} from '../support/twilio-calls';
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
 const task=(await t.json<any>(`/api/v1/tasks/${work.openTaskId}`)).task;
 const owned=await t.opportunity('Task handover deal','Handover Company','Handover Buyer',`${createId().toLowerCase()}@handover.test`),ownedDetail=await t.json<any>(`/api/v1/records/opportunity/${owned}`);
 await t.json(`/api/v1/records/opportunity/${owned}`,{method:'PUT',body:{...ownedDetail.record,owner_id:work.ownerId,contact_ids:ownedDetail.contacts.map((c:any)=>c.id),primary_contact_id:ownedDetail.contacts[0].id,custom_fields:{}}},200);
 assert.equal((await t.call(`/api/v1/settings/operators/${work.ownerId}`,{method:'DELETE',body:{confirmed:true}})).status,409,'owned work requires explicit reviewed choices');
 const review=await t.json<any>(`/api/v1/settings/operators/${work.ownerId}/removal-review`);
 const {taskContent}=await import('../../src/core/features/tasks/ui/api');
 await t.json(`/api/v1/tasks/${task.id}`,{method:'PUT',body:{...taskContent(task),notes:'Updated before removal',revision:task.revision,status:'open'}},200);
 const plan={review:review.review,opportunities:t.actor,tasks:receiver,handoffs:null};
 assert.equal((await t.call(`/api/v1/settings/operators/${work.ownerId}`,{method:'DELETE',body:{confirmed:true,handover:plan}})).status,409,'changed work refuses the old review');
 const refreshed=await t.json<any>(`/api/v1/settings/operators/${work.ownerId}/removal-review`);
 const leaving=await todayApp(db,{operatorId:work.ownerId});
 await leaving.json(`/api/v1/records/opportunity/${owned}/entries`,{body:{kind:'note',text:'Preserve the leaving rep’s handover notes',occurredAt:new Date().toISOString()}},200);
 await t.json(`/api/v1/settings/operators/${work.ownerId}`,{method:'DELETE',body:{confirmed:true,handover:{...plan,review:refreshed.review}}},200);
 assert.equal((await t.json<any>(`/api/v1/tasks/${task.id}`)).task.ownerId,receiver);
 const handed=await t.json<any>(`/api/v1/records/opportunity/${owned}`);assert.equal(handed.record.owner_id,t.actor);assert.ok(handed.timeline.some((e:any)=>e.actor_id===work.ownerId&&e.payload_json.includes('handover notes')));
 assert.equal((await leaving.call('/api/v1/tasks?view=all')).status,401);
 const notifications=await db.prepare("SELECT count(*) n FROM notifications WHERE operator_id=? AND kind='task.assigned' AND event_key LIKE 'task.handover:%'").bind(receiver).first<{n:number}>();assert.equal(notifications!.n,1);

});

test('BRIEF-003 AI-001 AI-002 AI-003 AI-004 an account summary is sent only as previewed, must cite the brief, and fails visibly without disturbing the brief; AGENT-002 absent decision-maker and conflicting recorded commitments yield cited risks, dismissal and reviewed tasks',async()=>{
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
 await agentRisks(t,off);
});

/** AGENT-002 on current sources: recorded roles, commitments and calls; observation apart from inference; nothing moves the deal. */
async function agentRisks(t:TodayApp,off:TodayApp){
 const deal=await t.opportunity('Northwind renewal','Northwind','Ana Ruiz','ana@northwind.test',1800000),ana=await contactOf(t,deal),risks=(app=t)=>app.json<any>(`/api/v1/risks/${deal}/findings`,{},200);
 const context=await t.json<any>(`/api/v1/relationships/opportunity/${deal}`,{},200);
 await t.json(`/api/v1/relationships/opportunity/${deal}`,{method:'PUT',body:{revision:context.revision,companyId:context.company?.id??null,primaryContactId:ana,stakeholders:[{contactId:ana,roles:['champion'],verified:true}],products:['Annual licence'],nextStep:'Send the order form',mutualCommitments:'Kickoff on 2026-11-03 at USD 18,000 per year once legal signs.'}},200);
 const call=await t.json<{id:string}>(`/api/v1/records/opportunity/${deal}/entries`,{body:{kind:'call',text:'Ana said kickoff is 2026-11-17 and the price she approved is USD 21,000 per year.',occurredAt:new Date(Date.now()-60000).toISOString(),durationMinutes:15}},200);
 const promised=await overdueHandoff(t,deal,'Send the security questionnaire');
 // Fixture: the deal entered its stage 30 days ago; nothing since moved it.
 await db.prepare('UPDATE opportunities SET created_at=? WHERE id=?').bind(new Date(Date.now()-30*86400000).toISOString(),deal).run();
 const overdueTask=await t.json<{id:string}>('/api/v1/tasks',{body:{title:'Send the pricing sheet',recordType:'opportunity',recordId:deal,ownerId:t.actor,dueAt:new Date(Date.now()-3600000).toISOString(),priority:'high',type:'follow_up',notes:'',recurrence:'none',timezone:'UTC',reminderMinutes:null}},201);
 const businessState=async()=>[await db.prepare('SELECT stage_id,value_cents,expected_close_at,lifecycle,closed_at FROM opportunities WHERE id=?').bind(deal).first(),(await t.json<any>(`/api/v1/relationships/opportunity/${deal}`,{},200)).stakeholders.map((s:any)=>[s.contactId,s.roles,s.verified]),await db.prepare('SELECT mutual_commitments,next_step FROM opportunity_buying_context WHERE opportunity_id=?').bind(deal).first(),await count('SELECT count(*) AS n FROM drafts'),await count('SELECT count(*) AS n FROM outbound_messages')];
 const before=await businessState(),first=await risks();
 const absent=first.findings.find((f:any)=>f.key==='absent-role:decision_maker');
 assert.deepEqual([absent.kind,absent.inference,absent.citations],['absent-role',null,[{evidenceId:`${deal}#roles`,quote:'Ana Ruiz: Champion (confirmed)'}]],'A missing role is an observation of recorded roles, never an invented stakeholder');
 assert.equal(first.evidence.find((e:any)=>e.id===call.id).label,'Logged call');
 assert.ok(first.findings.some((f:any)=>f.kind==='missed-promise'&&JSON.stringify(f.citations)===JSON.stringify([{evidenceId:`handoff-due:${promised}`,quote:'Send the security questionnaire'}])),'An overdue promise is cited exactly');
 assert.ok(first.findings.some((f:any)=>f.key===`missed-promise:task:${overdueTask.id}`&&f.citations[0].quote==='Send the pricing sheet'),'An overdue assigned task is a missed promise');
 const stalled=first.findings.find((f:any)=>f.kind==='stalled');assert.equal(stalled.inference.source,'rule');assert.match(stalled.citations[0].quote,/^In Qualified since \d{4}-\d{2}-\d{2}$/);
 // The conflict check sends only the previewed recorded lines; an unsupported citation fails the whole result.
 const original=fetch,sent:unknown[]=[];let answer=()=>new Response('down',{status:503});
 globalThis.fetch=async(_url,init)=>{sent.push(JSON.parse(JSON.parse(String(init!.body)).input));return answer();};
 const reply=(output:unknown)=>()=>Response.json({status:'completed',usage:{input_tokens:80,output_tokens:30},output:[{content:[{type:'output_text',text:JSON.stringify(output)}]}]});
 const conflict={kind:'conflicting-date',explanation:'The commitments and the logged call give different kickoff dates.',citations:[{evidenceId:`${deal}#commitments`,quote:'2026-11-03'},{evidenceId:call.id,quote:'2026-11-17'}],nextTask:'Confirm the kickoff date with Ana in writing'};
 try{
  const preview=await t.json<any>(`/api/v1/risks/${deal}/conflicts/preview`,{body:{}},200);
  assert.ok(preview.request.lines.some((l:any)=>l.evidenceId===call.id)&&preview.request.lines.every((l:any)=>!l.label.startsWith('Provider open')));
  for(const output of [{findings:[{...conflict,citations:[conflict.citations[0],{evidenceId:call.id,quote:'2026-12-01'}]}]},{findings:[{...conflict,citations:[conflict.citations[0],{evidenceId:'invented-evidence',quote:'2026-11-17'}]}]}]){
   answer=reply(output);const failed=await t.call(`/api/v1/risks/${deal}/conflicts`,{body:{requestHash:preview.requestHash}});assert.equal(failed.status,502);assert.equal((await failed.json() as any).findings,undefined);
  }
  answer=reply({findings:[conflict]});
  const checked=await t.json<any>(`/api/v1/risks/${deal}/conflicts`,{body:{requestHash:preview.requestHash}},200);assert.deepEqual(sent.at(-1),preview.request,'exactly the previewed request is sent');
  assert.deepEqual([checked.findings[0].kind,checked.findings[0].inference,checked.findings[0].citations],['conflicting-date',{source:'ai',text:conflict.explanation},conflict.citations]);
 }finally{globalThis.fetch=original;}
 assert.deepEqual((await db.prepare("SELECT status FROM ai_calls WHERE feature='deal.risks' ORDER BY created_at,id").all<{status:string}>()).results.map(r=>r.status),['failed','failed','success']);
 // A dismissal needs a reason and survives reload; a rule adjustment is attributed; an approved task cites current evidence only.
 assert.equal((await t.call(`/api/v1/risks/${deal}/dismissals`,{body:{key:absent.key,title:absent.title,reason:' '}})).status,400);
 await t.json(`/api/v1/risks/${deal}/dismissals`,{body:{key:absent.key,title:absent.title,reason:'Ana owns the business and signs herself'}},201);
 await t.json(`/api/v1/risks/${deal}/rules`,{body:{role:'procurement',required:true,reason:'Renewals above USD 15,000 need procurement'}},201);
 const reloaded=await risks();assert.deepEqual(reloaded.findings.find((f:any)=>f.key===absent.key).dismissed.reason,'Ana owns the business and signs herself');
 assert.ok(reloaded.findings.some((f:any)=>f.key==='absent-role:procurement'&&!f.dismissed));assert.equal(reloaded.rules.find((r:any)=>r.role==='procurement').by,t.actor);
 assert.equal((await t.call(`/api/v1/risks/${deal}/tasks`,{body:{title:'Uncited',dueAt:null,evidenceIds:['invented-evidence']}})).status,400);
 const task=await t.json<{observed:{target:string}}>(`/api/v1/risks/${deal}/tasks`,{body:{title:conflict.nextTask,dueAt:null,evidenceIds:conflict.citations.map(c=>c.evidenceId)}},201);
 assert.deepEqual(await db.prepare('SELECT title,status,assignee_id FROM handoff_tasks WHERE id=?').bind(task.observed.target.split('/')[3]).first(),{title:conflict.nextTask,status:'open',assignee_id:t.actor});
 assert.deepEqual(await businessState(),before,'Findings, checks, dismissals, rules and tasks never move stage, amount, close date, stakeholders, commitments or mail');
 assert.equal((await risks(off)).aiConfigured,false);assert.equal((await off.call(`/api/v1/risks/${deal}/conflicts`,{body:{requestHash:'0'.repeat(64)}})).status,503);
}

test('BRIEF-004 RECORD-010 RECORD-017 OUT-001 a booked meeting gets a cited plan with unresolved attendees shown, notes saved as one editable note, and plan lines become next actions without sending anything; a mention notifies once, asks to share the deal with its notes, calls and meetings before notifying a collaborator, who then reads only their own mention and opens the entry on Shared records until the grant is revoked; it withdraws on delete and never reaches AI or a customer',async()=>{
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
 // RECORD-017 through the public doors: a manager, a colleague and a collaborator without access to the deal.
 const colleague=async(name:string,collaborator=false)=>{const id=createId();if(collaborator)await db.prepare('INSERT INTO access_collaborators VALUES(?,?)').bind(id,new Date().toISOString()).run();const app=await todayApp(db,{operatorId:id});await db.prepare('UPDATE operators SET display_name=? WHERE id=?').bind(name,id).run();if(collaborator){const {token}=await t.json<{token:string}>('/api/v2/access/workspaces/workspace/invitations',{body:{email:`${id.toLowerCase()}@seller.test`,role:'guest',expiresAt:new Date(Date.now()+86400000).toISOString()}},200);await app.json('/api/v2/access/invitations/accept',{body:{token}},200);}return app;};
 const manager=await colleague('Morgan Manager'),riley=await colleague('Riley Rep'),casey=await colleague('Casey Contractor',true);
 await db.prepare("UPDATE operators SET display_name='Avery Author',setup_owner=1 WHERE id=?").bind(t.actor).run();
 assert.deepEqual((await t.json<{colleagues:{name:string}[]}>('/api/v1/records/mentionable',{},200)).colleagues.map(c=>c.name).filter(name=>['Morgan Manager','Riley Rep','Casey Contractor'].includes(name)),['Casey Contractor','Morgan Manager','Riley Rep'],'Autocomplete offers active colleagues');
 const mentionCount=async(who:TodayApp)=>(await who.json<{notifications:{id:string;kind:string;href:string|null;message:string}[]}>('/api/v1/notifications',{},200)).notifications.filter(n=>n.kind==='record.mention');
 const caseyMentions=()=>count(`SELECT count(*) AS n FROM notifications WHERE kind='record.mention' AND operator_id='${casey.actor}'`);
 const scored=await db.prepare('SELECT score,band FROM opportunities WHERE id=?').bind(opportunity).first(),sends={drafts:await count('SELECT count(*) AS n FROM drafts'),messages:await count('SELECT count(*) AS n FROM outbound_messages')};
 const entry=(body:Record<string,unknown>,id?:string)=>t.call(`/api/v1/records/opportunity/${opportunity}/entries${id?`/${id}`:''}`,{method:id?'PUT':'POST',body:{occurredAt:new Date(Date.now()-60000).toISOString(),...body}});
 const note=await entry({kind:'note',text:'@Morgan Manager can you review the rollout pricing?'});assert.equal(note.status,200,await note.clone().text());const noteId=(await note.json() as {id:string}).id;
 const [notified]=await mentionCount(manager);assert.equal((await mentionCount(manager)).length,1);assert.equal(notified!.href,`/app/opportunities/${opportunity}#entry-${noteId}`);assert.equal(notified!.message,'Avery Author mentioned you in a note on Delta rollout.');
 const hidden=await entry({kind:'call',text:'Walked @Casey Contractor through the rollout plan',durationMinutes:15});assert.equal(hidden.status,409);
 assert.deepEqual(((await hidden.json()) as {withoutAccess:{name:string;ask:string}[]}).withoutAccess.map(c=>[c.name,c.ask]),[['Casey Contractor','share']],'The author is asked to share or remove the mention before saving');
 assert.equal(await caseyMentions(),0);assert.equal(await count(`SELECT count(*) AS n FROM access_grants WHERE subject_id='${casey.actor}'`),0,'A mention never grants access');
 // A share leaves notes, calls and meetings out by default, so the save still asks; only whoever shares turns them on, and that is audited.
 const grants='/api/v2/access/workspaces/workspace/grants',share=(actions:string[],purpose:string)=>t.json<{id:string}>(grants,{body:{subjectKind:'operator',subjectId:casey.actor,resourceType:'opportunity',resourceId:opportunity,actions,fields:['*'],purpose,expiresAt:null}},200);
 const grantId=(await share(['graph.read'],'Mentioned in a call log')).id;
 const withoutEntries=await entry({kind:'call',text:'Walked @Casey Contractor through the rollout plan',durationMinutes:15});assert.equal(withoutEntries.status,409);
 assert.deepEqual(((await withoutEntries.json()) as {withoutAccess:{name:string;ask:string;grantId:string}[]}).withoutAccess.map(c=>[c.name,c.ask,c.grantId]),[['Casey Contractor','entries',grantId]],'With entries off the save asks first');
 assert.equal(await caseyMentions(),0);assert.equal(await count(`SELECT count(*) AS n FROM access_grants WHERE subject_id='${casey.actor}' AND actions_json LIKE '%entries.read%'`),0,'A mention never turns entries on');
 assert.equal((await casey.call(`${grants}/${grantId}/entries`,{method:'PUT',body:{include:true}})).status,403,'A collaborator cannot turn entries on for themselves');
 await t.json(`${grants}/${grantId}/entries`,{method:'PUT',body:{include:true}},200);
 const audit=async(operation:string)=>(await db.prepare("SELECT actor_json,details_ref FROM domain_audit WHERE operation=? AND json_extract(resource_json,'$.id')=?").bind(operation,grantId).all<{actor_json:string;details_ref:string}>()).results.map(row=>({by:JSON.parse(row.actor_json).operatorId,...JSON.parse(row.details_ref)}));
 assert.deepEqual((await audit('access.grant.created')).map(row=>[row.by,row.actions]),[[t.actor,['graph.read']]],'The grant was created with entries off');
 assert.deepEqual((await audit('access.grant.entries.changed')).map(row=>[row.by,row.before,row.includeEntries]),[[t.actor,false,true]],'Turning entries on is audited with who and the old and new value');
 const call=await entry({kind:'call',text:'Walked @Casey Contractor through the rollout plan',durationMinutes:15});assert.equal(call.status,200,await call.clone().text());const callId=(await call.json() as {id:string}).id;
 assert.equal(await caseyMentions(),1,'Only after the explicit share with entries is the collaborator notified');
 // The collaborator's own inbox: only their mention, counted alone, opening the exact entry on Shared records.
 const inbox=()=>casey.json<{notifications:{kind:string;href:string}[];unread:number}>('/api/v1/notifications',{},200),opened=`/app/shared-records?kind=opportunity&id=${opportunity}#entry-${callId}`;
 const own=await inbox();assert.deepEqual([own.notifications.map(n=>[n.kind,n.href]),own.unread],[[['record.mention',opened]],1],'A collaborator reads only their own mention and its count');
 assert.ok(await count(`SELECT count(*) AS n FROM notifications WHERE operator_id<>'${casey.actor}' AND read_at IS NULL`)>0,'Other operators hold unread notifications the collaborator never sees');
 assert.equal((await casey.call(`/api/v1/notifications/${notified!.id}/read`,{body:{}})).status,404,'Nor can they mark another operator\'s notification');
 assert.deepEqual((await casey.json<{mentions:{id:string;href:string}[]}>('/api/v1/records/mentions',{},200)).mentions.map(m=>[m.id,m.href]),[[callId,opened]],'Notifications → Mentions lists it, opening on Shared records');
 const entriesOf=(id:string)=>casey.call(`/api/v2/workspaces/workspace/records/opportunity/${id}/entries`);
 const shared=await (await entriesOf(opportunity)).json() as {included:boolean;entries:{source:string;id:string;text:string}[]};
 const onDeal=(await db.prepare("SELECT t.id FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id WHERE r.record_id=? AND t.kind IN('manual.note','manual.call','manual.meeting')").bind(opportunity).all<{id:string}>()).results.map(row=>row.id).sort();
 assert.deepEqual([shared.included,shared.entries.filter(e=>e.source==='entry').map(e=>e.id).sort(),shared.entries.find(e=>e.id===callId)?.text],[true,onDeal,'Walked @Casey Contractor through the rollout plan'],'Shared records shows this deal\'s entries, the mentioned one included');
 const otherDeal=await t.opportunity('Echo pilot','Echo Freight','Eli Moss','eli@echo.test');assert.equal((await entriesOf(otherDeal)).status,403,'Never another record\'s entries');
 // Revoking the grant hides the notification without deleting it; a new grant shows it again.
 await t.json(`${grants}/${grantId}`,{method:"DELETE",body:{}},200);
 const revoked=await inbox();assert.deepEqual([revoked.notifications,revoked.unread,await caseyMentions()],[[],0,1],'After revocation the notification is hidden, not deleted');
 assert.deepEqual([(await entriesOf(opportunity)).status,(await casey.json<{mentions:unknown[]}>('/api/v1/records/mentions',{},200)).mentions],[403,[]]);
 await share(['graph.read','entries.read'],'Back on the rollout');assert.deepEqual((await inbox()).notifications.map(n=>n.href),[opened],'Re-granting shows it again');
 assert.equal((await entry({kind:'note',text:'@Morgan Manager can you review the rollout pricing? Looping in @Riley Rep.'},noteId)).status,200);
 assert.deepEqual([(await mentionCount(manager)).length,(await mentionCount(riley)).length],[1,1],'An edit notifies only the newly added mention');
 {const removed=await t.call(`/api/v1/records/opportunity/${opportunity}/entries/${callId}`,{method:'DELETE',body:{}});assert.equal(removed.status,200,await removed.text());}
 assert.equal(await caseyMentions(),0,'Deleting the entry withdraws its unread mention');
 assert.deepEqual(await db.prepare("SELECT t.actor_id,json_extract(t.payload_json,'$.entryId') AS entryId FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id WHERE t.kind='entry.deleted' AND r.record_id=?").bind(opportunity).first(),{actor_id:t.actor,entryId:callId});
 const priceTask=await t.json<{id:string}>('/api/v1/tasks',{body:{title:'Price review',recordType:'opportunity',recordId:opportunity,ownerId:t.actor,dueAt:new Date(Date.now()+86400000).toISOString(),priority:'normal',type:'follow_up',notes:'@Riley Rep owns the discount sheet',recurrence:'none',timezone:'UTC',reminderMinutes:null}},201);
 assert.deepEqual((await mentionCount(riley)).map(n=>n.href).sort(),[`/app#sales-task-${priceTask.id}`,`/app/opportunities/${opportunity}#entry-${noteId}`]);
 assert.deepEqual((await riley.json<{mentions:{source:string;id:string}[]}>('/api/v1/records/mentions',{},200)).mentions.map(m=>[m.source,m.id]).sort(),[['entry',noteId],['task',priceTask.id]],'The Mentions view lists every entry that mentions the user');
 assert.equal((await t.call('/api/v1/tasks',{body:{title:'Hidden',recordType:'opportunity',recordId:opportunity,ownerId:t.actor,dueAt:new Date(Date.now()+86400000).toISOString(),priority:'normal',type:'other',notes:'Ask @Casey Contractor',recurrence:'none',timezone:'UTC',reminderMinutes:null}})).status,201,'The explicit share covers task notes on the deal too');
 assert.equal(JSON.stringify(await db.prepare("SELECT payload_json FROM timeline_entries WHERE id=?").bind(noteId).first()).includes(riley.actor),true,'Mentions are saved with the entry, so they export and erase with it');
 assert.deepEqual([await db.prepare('SELECT score,band FROM opportunities WHERE id=?').bind(opportunity).first(),{drafts:await count('SELECT count(*) AS n FROM drafts'),messages:await count('SELECT count(*) AS n FROM outbound_messages')}],[scored,sends],'Mentions change no score and send nothing');
 await exerciseTwilio(db);
});
