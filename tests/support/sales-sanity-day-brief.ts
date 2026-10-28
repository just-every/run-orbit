import {exerciseSalesTasks} from './sales-tasks';
import assert from 'node:assert/strict';
import {todayApp} from './today-workspace';
import {eml} from './capture-mail';
import {createId} from '../../src/core/shared/ids';

import type {SalesDayJourney} from './sales-sanity-day-workspace';
export async function startDay(journey:SalesDayJourney){
 const {db,lines,byKind,count,contactOf,overdueHandoff,captureUnknown}=journey;
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

}
