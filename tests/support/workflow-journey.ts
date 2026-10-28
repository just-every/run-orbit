import assert from 'node:assert/strict';
import {createApp} from './app';
import type {CaptureFixture} from './capture-fixture';
import {createId} from '../../src/core/shared/ids';
import {RecordsRepository} from '../../src/core/features/records/repository';
import {createDependencies} from './dependencies';

/** Reviewed capture and activated workflows deliberately have different write authority. */
export async function workflowJourney(f:CaptureFixture){
 let db=f.db;await db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(f.operator).run();
 const other=createId();await f.deps.auth.ensureOperator({id:other,email:['synthetic-orbit-1','example.invalid'].join('@'),displayName:'Morgan Sales'});
 let webhookCalls=0,webhookOkay=false;
 const fetcher=async()=>{webhookCalls++;return new Response(null,{status:webhookOkay?204:503});};
 const makeApp=()=>createApp({database:db,assets:{fetch:async()=>new Response('')},captureFetch:fetcher});let app=makeApp();
 const request=(path:string,body?:unknown,cookie=f.cookie)=>app.request(`https://orbit.test${path}`,{method:body===undefined?'GET':'POST',headers:{cookie,origin:'https://orbit.test',...(body===undefined?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const json=async(path:string,body?:unknown)=>{const response=await request(path,body),result=await response.json() as any;assert.equal(response.status,200,`${path}: ${JSON.stringify(result)}`);return result;};
 const base={trigger:{kind:'record_changed',recordType:'opportunity'},conditions:[{field:'title',operator:'equals',value:'Workflow candidate'}],actions:[{kind:'set',field:'title',value:'Workflow applied'}],delayMinutes:0,order:0};
 const save=async(name:string,definition:any)=>{const {workflow}=await json('/api/workflows',{name,definition});return workflow;};
 const activate=async(workflow:any)=>{const p=await json(`/api/workflows/${workflow.id}/preview`,{});assert.ok(p.previewId);await json(`/api/workflows/${workflow.id}/activate`,{previewId:p.previewId});return p;};
 const records=()=>new RecordsRepository(db);
 const change=async(id:string,changes:Record<string,unknown>)=>{const r=await (await request(`/api/v1/records/opportunity/${id}`)).json() as any;const response=await app.request(`https://orbit.test/api/v1/records/opportunity/${id}`,{method:'PUT',headers:{cookie:f.cookie,origin:'https://orbit.test','content-type':'application/json'},body:JSON.stringify({...r.record,...changes,custom_fields:JSON.parse(r.record.custom_fields_json??'{}')})});assert.equal(response.status,200,await response.text());};
 const process=()=>json('/api/workflows/process',{});
 const w=await save('Qualified review',{...base,actions:[{kind:'set',field:'title',value:'Workflow applied'},{kind:'create_task',title:'Confirm rollout',operatorIds:[f.operator]},{kind:'notify',title:'Review is ready',operatorIds:[f.operator]}]});
 await activate(w);await change(f.opportunity,{title:'Workflow candidate'});
 let listed=await json('/api/workflows');const run=listed.runs.find((r:any)=>r.workflowId===w.id);assert.equal(run.status,'queued');
 const proposalsBefore=await db.prepare('SELECT count(*) n FROM capture_proposals').first('n');await process();await process();
 assert.equal(await db.prepare('SELECT title FROM opportunities WHERE id=?').bind(f.opportunity).first('title'),'Workflow applied');assert.equal(await db.prepare('SELECT count(*) n FROM capture_proposals').first('n'),proposalsBefore,'activated internal writes require no capture proposal');
 assert.equal(await db.prepare("SELECT count(*) n FROM sales_tasks WHERE title='Confirm rollout'").first('n'),1);assert.equal(await db.prepare("SELECT count(*) n FROM notifications WHERE kind='workflow.notice' AND message='Review is ready'").first('n'),1);
 const detail=await json(`/api/v1/records/opportunity/${f.opportunity}`);assert.ok(detail.timeline.some((t:any)=>t.source==='workflow'&&JSON.parse(t.payload_json).workflowId===w.id&&JSON.parse(t.payload_json).version===1),'record timeline attributes the write to its version and trigger');
 const undo=await json(`/api/workflows/runs/${run.id}/undo`,{});assert.ok(undo.results.some((r:any)=>r.undone));assert.equal(await db.prepare('SELECT title FROM opportunities WHERE id=?').bind(f.opportunity).first('title'),'Workflow candidate');assert.equal(await db.prepare("SELECT count(*) n FROM sales_tasks WHERE title='Confirm rollout'").first('n'),1,'undo does not reopen or delete tasks');
 await json(`/api/workflows/${w.id}/pause`,{});
 // Activation binds the exact preview; a later edit writes nothing until another preview and activation.
 const draft=await json(`/api/workflows/${w.id}`,{name:'Qualified review',definition:{...base,actions:[{kind:'set',field:'title',value:'New version'}]}});assert.equal(draft.workflow.version,2);
 const preview=await json(`/api/workflows/${w.id}/preview`,{});await change(f.opportunity,{title:'Changed after preview'});assert.equal((await request(`/api/workflows/${w.id}/activate`,{previewId:preview.previewId})).status,409);
 // Material money stays unchanged until the named owner's exact per-record approval.
 await change(f.opportunity,{title:'Money candidate'});const money=await save('Budget adjustment',{...base,conditions:[{field:'title',operator:'equals',value:'Money candidate'}],actions:[{kind:'set',field:'value_cents',value:712345}]});await activate(money);await change(f.opportunity,{title:'Money candidate',value_cents:500001});await process();
 listed=await json('/api/workflows');const approval=listed.approvals.find((a:any)=>a.field==='value_cents'&&a.status==='pending');assert.ok(approval);assert.notEqual(await db.prepare('SELECT value_cents FROM opportunities WHERE id=?').bind(f.opportunity).first('value_cents'),712345);const otherSession=await createDependencies(db).auth.createSession(other);assert.equal((await request(`/api/workflows/approvals/${approval.id}/accept`,{},`__Host-orbit_session=${otherSession.token}`)).status,403);
 await json(`/api/workflows/approvals/${approval.id}/accept`,{});assert.equal(await db.prepare('SELECT value_cents FROM opportunities WHERE id=?').bind(f.opportunity).first('value_cents'),712345);await json(`/api/workflows/${money.id}/pause`,{});
 // Dispatch checks current conditions and refuses a changed activating authority.
 await change(f.opportunity,{title:'Guard candidate'});const guarded=await save('Guarded update',{...base,conditions:[{field:'title',operator:'equals',value:'Guard candidate'}],actions:[{kind:'set',field:'title',value:'Unsafe overwrite'}]});await activate(guarded);await change(f.opportunity,{title:'Guard candidate',value_cents:500002});await change(f.opportunity,{title:'User changed condition'});await process();assert.equal(await db.prepare('SELECT title FROM opportunities WHERE id=?').bind(f.opportunity).first('title'),'User changed condition');listed=await json('/api/workflows');assert.ok(listed.runs.some((r:any)=>r.workflowId===guarded.id&&r.reason==='condition no longer true'));
 await change(f.opportunity,{title:'Guard candidate'});await db.prepare("UPDATE operators SET updated_at=? WHERE id=?").bind(new Date(Date.now()+1000).toISOString(),f.operator).run();
 const refreshed=await createDependencies(db).auth.createSession(f.operator);f.cookie=`__Host-orbit_session=${refreshed.token}`;await process();listed=await json('/api/workflows');assert.ok(listed.workflows.find((r:any)=>r.id===guarded.id).needsReactivation);assert.equal(await db.prepare('SELECT title FROM opportunities WHERE id=?').bind(f.opportunity).first('title'),'Guard candidate');
 // A failed declared webhook survives a real database restart and resumes once on explicit request.
 const web=await save('Sales handoff',{...base,conditions:[{field:'title',operator:'equals',value:'Webhook candidate'}],actions:[{kind:'webhook',url:'https://hooks.example.com/orbit',body:JSON.stringify({action:'handoff'})}]});await activate(web);await change(f.opportunity,{title:'Webhook candidate'});await process();listed=await json('/api/workflows');const failed=listed.runs.find((r:any)=>r.workflowId===web.id&&r.status==='failed');assert.ok(failed);assert.match(failed.reason,/503/);assert.equal(webhookCalls,1);
 await f.platform.close();await f.platform.reopen();db=f.platform.db;app=makeApp();webhookOkay=true;await json(`/api/workflows/runs/${failed.id}/resume`,{});await process();await process();assert.equal(webhookCalls,2);listed=await json('/api/workflows');assert.equal(listed.runs.find((r:any)=>r.id===failed.id).status,'completed');
 assert.equal((await request('/api/workflows',undefined,`__Host-orbit_session=${otherSession.token}`)).status,403,'a full operator without workflow authority cannot author or inspect runs');
 // A queued contact action and its copied data are removed by erasure and cannot resume.
 const contact=await records().save('contact',{name:'Disposable workflow person'},f.operator);const eraseRule=await save('Contact hygiene',{...base,trigger:{kind:'record_changed',recordType:'contact'},conditions:[{field:'name',operator:'equals',value:'Disposable workflow person'}],actions:[{kind:'set',field:'job_title',value:'Pending private data'}]});await activate(eraseRule);await records().save('contact',{name:'Disposable workflow person'},f.operator,contact.id);await json('/api/v1/settings',undefined);await process();
 const eraseResponse=await app.request(`https://orbit.test/api/v1/records/contact/${contact.id}`,{method:'DELETE',headers:{cookie:f.cookie,origin:'https://orbit.test','content-type':'application/json'},body:JSON.stringify({confirmed:true})});assert.equal(eraseResponse.status,200,await eraseResponse.text());await process();assert.equal(await db.prepare('SELECT count(*) n FROM workflow_record_writes WHERE record_id=?').bind(contact.id).first('n'),0);assert.equal(await db.prepare('SELECT count(*) n FROM workflow_runs WHERE record_id=?').bind(contact.id).first('n'),0);
}
