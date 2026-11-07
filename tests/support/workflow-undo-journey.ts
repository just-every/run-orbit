import assert from 'node:assert/strict';
import {createId} from '../../src/core/shared/ids';
import {RecordsRepository} from '../../src/core/features/records/repository';

/** Undo archives a created deal nobody touched, skips the rest with who and when, and sends and deletes nothing. */
export async function workflowUndoJourney({db,operator,request,process,otherCookie}:any){
 const json=async(path:string,body?:unknown,method?:string)=>{const response=await request(path,body,method),data=await response.json();assert.equal(response.status,200,`${path}: ${JSON.stringify(data)}`);return data;};
 const configure=async(name:string,definition:any)=>{const {workflow}=await json('/api/workflows',{name,definition}),preview=await json(`/api/workflows/${workflow.id}/preview`,{});await json(`/api/workflows/${workflow.id}/activate`,{previewId:preview.previewId});return workflow;};
 const records=new RecordsRepository(db),count=async(sql:string)=>Number(await db.prepare(sql).first('n'));
 const company=await records.save('company',{name:'Undo archive business'},operator);
 const stageId=await db.prepare('SELECT id FROM pipeline_stages ORDER BY position LIMIT 1').first<string>('id'),pipelineId=await db.prepare('SELECT pipeline_id FROM pipeline_stage_rules WHERE stage_id=?').bind(stageId).first<string>('pipeline_id');
 const people=[] as {id:string}[];for(const n of [1,2,3])people.push(await records.save('contact',{name:`Undo archive person ${n}`,company_id:company.id},operator));
 const base={trigger:{kind:'record_changed',recordType:'contact'},conditions:[{field:'job_title',operator:'equals',value:'Undo archive trigger'}],actions:[{kind:'create_record',recordType:'opportunity',stage:stageId,pipelineId,values:{title:{sourceField:'name'},owner_id:operator,value_cents:0}}],delayMinutes:0,order:0};
 const rule=await configure('Archive undo rule',base);
 for(const person of people)await records.save('contact',{name:(await db.prepare('SELECT name FROM contacts WHERE id=?').bind(person.id).first<string>('name'))!,company_id:company.id,job_title:'Undo archive trigger'},operator,person.id);
 await process();await process();await process();
 const deals=[] as string[];for(const n of [1,2,3])deals.push((await db.prepare('SELECT id FROM opportunities WHERE title=?').bind(`Undo archive person ${n}`).first<string>('id'))!);
 assert.equal(await count(`SELECT count(*) n FROM opportunities WHERE company_id='${company.id}'`),3,'each run created one deal');
 // A person edits the second deal, and logs a note on the third, after the workflow created them.
 const second=await json(`/api/v1/records/opportunity/${deals[1]}`);await json(`/api/v1/records/opportunity/${deals[1]}`,{...second.record,title:'Edited by a person',custom_fields:JSON.parse(second.record.custom_fields_json??'{}')},'PUT');
 await json(`/api/v1/records/opportunity/${deals[2]}/entries`,{kind:'note',text:'A person called the buyer',occurredAt:new Date().toISOString()});
 // A stage move by a workflow is reversed into stage history, attributed, and queues no Slack notice.
 const now=new Date().toISOString(),moved=createId();
 await db.batch([db.prepare("INSERT INTO slack_installation(id,team_id,bot_user_id,state,origin,connected_at) VALUES(?,?,?,?,?,?)").bind('install','team','bot','connected','https://orbit.test',now),db.prepare("INSERT INTO slack_channels(id,name,events_json,enabled) VALUES('channel','sales','[\"stage\",\"won\",\"handoff\"]',1)")]);
 await db.prepare('INSERT INTO pipeline_stages(id,name,position,created_at,updated_at) VALUES(?,?,?,?,?)').bind(moved,'Undo review',30,now,now).run();
 const stageDeal=await records.save('opportunity',{title:'Undo stage deal',stage_id:stageId,owner_id:operator,value_cents:0,contact_ids:[]},operator);
 const mover=await configure('Stage undo rule',{trigger:{kind:'activity_logged',recordType:'opportunity',activityKind:'meeting'},conditions:[{field:'id',operator:'equals',value:stageDeal.id}],actions:[{kind:'move_stage',stage:moved}],delayMinutes:0,order:0});
 await json(`/api/v1/records/opportunity/${stageDeal.id}/entries`,{kind:'meeting',text:'Review meeting',durationMinutes:30,occurredAt:new Date().toISOString()});await process();
 assert.equal(await db.prepare('SELECT stage_id FROM opportunities WHERE id=?').bind(stageDeal.id).first('stage_id'),moved);
 const moveRun=(await json('/api/workflows')).runs.find((r:any)=>r.workflowId===mover.id);
 const scheduled=createId();await db.prepare("INSERT INTO outbound_messages(id,revision,opportunity_id,operator_id,recipient_email,subject,body,state,created_at,updated_at,idempotency_key,message_id,scheduled_at,approved_at) VALUES(?,1,?,?,?,?,?,'scheduled',?,?,?,?,?,?)").bind(scheduled,stageDeal.id,operator,['synthetic-orbit-undo','example.invalid'].join('@'),'Scheduled follow-up','Reviewed text',now,now,`key-${scheduled}`,`<${scheduled}@orbit.test>`,new Date(Date.now()+86400000).toISOString(),now).run();
 const before={messages:await count('SELECT count(*) n FROM outbound_messages'),mail:await count('SELECT count(*) n FROM record_mail_outbound_messages'),notices:await count('SELECT count(*) n FROM slack_notices'),notifications:await count('SELECT count(*) n FROM notifications'),tasks:await count('SELECT count(*) n FROM sales_tasks'),entries:await count("SELECT count(*) n FROM timeline_entries WHERE kind IN('manual.note','note')")};
 const listing=await json('/api/workflows'),runs=listing.runs.filter((r:any)=>r.workflowId===rule.id);assert.equal(runs.length,3);
 const from=new Date(Date.now()-3600000).toISOString(),to=new Date(Date.now()+3600000).toISOString();
 assert.equal((await request(`/api/workflows/${rule.id}/undo`,{version:1,from,to},'POST',otherCookie)).status,403,'an operator without workflow authority cannot undo');
 assert.equal(await count(`SELECT count(*) n FROM opportunities WHERE company_id='${company.id}' AND lifecycle='lost'`),0,'the refused undo changed nothing');
 assert.deepEqual((await json(`/api/workflows/${rule.id}/undo`,{version:1,from:'2020-01-01T00:00:00.000Z',to:'2020-01-02T00:00:00.000Z'})).runs,[],'runs outside the chosen range are untouched');
 const undone=await json(`/api/workflows/${rule.id}/undo`,{version:1,from,to});
 const outcomes=undone.runs.flatMap((r:any)=>r.results);assert.equal(outcomes.filter((r:any)=>r.undone&&r.archived).length,1,'only the untouched created deal is archived');
 const skipped=outcomes.filter((r:any)=>r.skipped);assert.equal(skipped.length,2);
 const name=await db.prepare('SELECT display_name FROM operators WHERE id=?').bind(operator).first<string>('display_name');
 for(const item of skipped)assert.match(item.reason,new RegExp(`Changed by ${name} at \\d{4}-\\d{2}-\\d{2}T`),'a skipped record names who touched it and when');
 const states=await Promise.all(deals.map(id=>db.prepare('SELECT lifecycle,close_reason,closed_by FROM opportunities WHERE id=?').bind(id).first<any>()));
 assert.equal(states[0].lifecycle,'lost');assert.match(states[0].close_reason,/Archived by undoing Archive undo rule/);assert.equal(states[0].closed_by,operator);assert.equal(states[1].lifecycle,'open');assert.equal(states[2].lifecycle,'open');
 assert.ok(await db.prepare("SELECT 1 FROM audit_entries WHERE action='workflow.record_undone' AND entity_id=? AND actor_id=?").bind(deals[0],operator).first(),'the archive is attributed and audited');
 assert.ok(await db.prepare("SELECT 1 FROM audit_entries WHERE action='workflow.undone' AND actor_id=?").bind(operator).first(),'the version undo is audited');
 // Undo sends nothing and deletes or reopens nothing, and a replay changes nothing.
 await json(`/api/workflows/runs/${moveRun.id}/undo`,{});
 assert.equal(await db.prepare('SELECT stage_id FROM opportunities WHERE id=?').bind(stageDeal.id).first('stage_id'),stageId);
 assert.equal(await db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(scheduled).first('state'),'scheduled','reversing a stage move cancels no scheduled message');
 const history=(await json(`/api/v1/records/opportunity/${stageDeal.id}`)).movementHistory;assert.equal(history.length,2,'the reversal is recorded in stage history');
 assert.ok(await db.prepare("SELECT 1 FROM audit_entries WHERE action='workflow.record_undone' AND entity_id=? AND actor_id=?").bind(stageDeal.id,operator).first());
 for(const run of runs)await json(`/api/workflows/runs/${run.id}/undo`,{});
 const after={messages:await count('SELECT count(*) n FROM outbound_messages'),mail:await count('SELECT count(*) n FROM record_mail_outbound_messages'),notices:await count('SELECT count(*) n FROM slack_notices'),notifications:await count('SELECT count(*) n FROM notifications'),tasks:await count('SELECT count(*) n FROM sales_tasks'),entries:await count("SELECT count(*) n FROM timeline_entries WHERE kind IN('manual.note','note')")};
 assert.deepEqual(after,before);assert.equal((await db.prepare('SELECT lifecycle FROM opportunities WHERE id=?').bind(deals[0]).first<string>('lifecycle')),'lost');
}
