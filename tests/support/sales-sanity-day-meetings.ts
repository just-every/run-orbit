import assert from 'node:assert/strict';
import {todayApp,type TodayApp} from './today-workspace';
import {createId} from '../../src/core/shared/ids';

import type {SalesDayJourney} from './sales-sanity-day-workspace';
export async function prepareMeeting(journey:SalesDayJourney){
 const {db,lines,byKind,count,contactOf,overdueHandoff,captureUnknown}=journey;
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
}
