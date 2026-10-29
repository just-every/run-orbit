import assert from 'node:assert/strict';
import {createId} from '../../src/core/shared/ids';
import {createApp,TEST_SESSION_SECRET} from './app';

/** Publish a real form and prove its fixed hidden field can drive one workflow write. */
export async function workflowFormJourney({db,operator,cookie}:{db:D1Database;operator:string;cookie:string}){
 await db.prepare("UPDATE operators SET setup_owner=1 WHERE id=? AND status='active'").bind(operator).run();
 const app=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})},formAbuse:{secret:TEST_SESSION_SECRET}});
 const request=(path:string,body?:unknown,method=body===undefined?'GET':'POST',headers:Record<string,string>={})=>app.request(`https://orbit.test${path}`,{method,headers:{Cookie:cookie,Origin:'https://orbit.test',...(body===undefined?{}:{'Content-Type':'application/json'}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const json=async(path:string,body?:unknown)=>{const response=await request(path,body),value=await response.json() as any;assert.ok(response.ok,`${path}: ${response.status} ${JSON.stringify(value)}`);return value;};
 const publicJson=async(path:string,body:unknown)=>{const response=await app.request(`https://orbit.test${path}`,{method:'POST',headers:{Origin:'https://orbit.test','Content-Type':'application/json'},body:JSON.stringify(body)}),value=await response.json() as any;assert.ok(response.ok,`${path}: ${response.status} ${JSON.stringify(value)}`);return value;};
 const formPath='/api/v2/workspaces/workspace/forms',form=await json(formPath,{form:{title:'Workflow enquiry',fields:[{id:'name',label:'Name',required:true},{id:'email',label:'Email',required:true},{id:'tracking_code',label:'Tracking code',required:false,type:'hidden',hidden:{value:'Workflow form provenance'}}],consentWording:null},landing:{title:'Workflow enquiry',heading:'Tell us about your account',paragraphs:['Share a few details.']}});
 const slug=`workflow-form-${createId().toLowerCase()}`,compiled=await json(`${formPath}/compile`,{formId:form.id,revision:form.revision,reviewedHash:form.hash,slug,maxRecords:10,expiresAt:new Date(Date.now()+86400000).toISOString()});
 await json(`${formPath}/publications/${compiled.operationId}/approve`,{artifactHash:compiled.hash,formRevision:form.revision});
 await json(`${formPath}/publications/${compiled.operationId}/publish`,{});
 const contactName=`Workflow form target ${createId()}`,workflow=await json('/api/workflows',{name:'Copy reviewed form field',definition:{trigger:{kind:'form_submitted',recordType:'contact'},conditions:[{field:'name',operator:'equals',value:contactName}],actions:[{kind:'copy',field:'job_title',sourceTarget:'form',sourceField:'tracking_code'}],delayMinutes:0,order:0}});
 const preview=await json(`/api/workflows/${workflow.workflow.id}/preview`,{});assert.ok(preview.previewId);assert.ok([...preview.records,...preview.historical].every((row:any)=>!row.errors.length));
 await json(`/api/workflows/${workflow.workflow.id}/activate`,{previewId:preview.previewId});
 const idempotencyKey=crypto.randomUUID(),challenge=await publicJson(`/api/public/forms/${slug}/challenge`,{idempotencyKey}),email=[createId().toLowerCase(),'example.invalid'].join('@');
 await new Promise(resolve=>setTimeout(resolve,2100));
 const intake={revision:form.revision,operationId:compiled.operationId,idempotencyKey,values:{name:contactName,email},consent:false,honeypot:'',fillToken:challenge.token};
 const submitted=await publicJson(`/api/public/forms/${slug}`,intake),replayed=await publicJson(`/api/public/forms/${slug}`,intake);
 assert.equal(submitted.replayed,false);assert.equal(replayed.replayed,true);assert.equal(replayed.submissionId,submitted.submissionId);
 await json('/api/workflows/process',{});await json('/api/workflows/process',{});
 const contactId=await db.prepare('SELECT contact_id FROM marketing_form_submissions WHERE id=?').bind(submitted.submissionId).first<string>('contact_id');assert.ok(contactId);
 assert.equal(await db.prepare('SELECT job_title FROM contacts WHERE id=?').bind(contactId).first('job_title'),'Workflow form provenance');
 const writes=(await db.prepare('SELECT id,workflow_id,version,event_id,field,before_json,after_json FROM workflow_record_writes WHERE workflow_id=?').bind(workflow.workflow.id).all<any>()).results;
 assert.equal(writes.length,1,'replayed submission creates one workflow write');assert.equal(writes[0].version,1);assert.equal(writes[0].field,'job_title');assert.equal(writes[0].event_id,submitted.submissionId);assert.equal(JSON.parse(writes[0].before_json),null);assert.equal(JSON.parse(writes[0].after_json),'Workflow form provenance');
 assert.equal(Number(await db.prepare('SELECT count(*) n FROM marketing_form_submissions WHERE form_id=? AND idempotency_key=?').bind(form.id,idempotencyKey).first('n')),1);
 const history=await json(`/api/workflows/records/contact/${contactId}/history`);
 assert.equal(history.history.length,1);assert.equal(history.history[0].source,'workflow');assert.equal(history.history[0].workflowId,workflow.workflow.id);assert.equal(history.history[0].version,1);assert.equal(history.history[0].eventId,submitted.submissionId);assert.equal(history.history[0].after,'Workflow form provenance');
 const dryRun=await json(`/api/workflows/${workflow.workflow.id}/preview`,{}),past=dryRun.historical.find((row:any)=>row.eventId===submitted.submissionId);assert.ok(past,'retained form event is evaluated in the historical dry run');assert.deepEqual(past.errors,[]);assert.ok(past.changes.some((change:any)=>change.field==='job_title'&&change.before===null&&change.after==='Workflow form provenance'));assert.equal(dryRun.historyCoverage.complete,false,'pre-installation form events are not invented');

}
