import assert from 'node:assert/strict';
import type {CaptureFixture} from './capture-fixture';
import type {launchFixture} from './launch-fixture';
import {testAuth} from './test-auth';

type WorkflowData={
 delayed:{id:string;previewId:string;runId:string;recordId:string;before:string|null};
 written:{id:string;previewId:string;runId:string;writeId:string;recordId:string;initialBefore:string|null;before:string;after:string};
 approval:{id:string;previewId:string;runId:string;approvalId:string;recordId:string;before:number;after:number};
};
type Call=(path:string,body?:unknown,method?:string)=>Promise<any>;

/** Seed active source authority and durable workflow history through authenticated public routes. */
export async function seedWorkflowCustody(f:CaptureFixture,call:Call):Promise<WorkflowData>{
 await f.db.prepare("UPDATE operators SET setup_owner=1 WHERE id=? AND status='active'").bind(f.operator).run();
 const create=async(name:string,recordType:'contact'|'opportunity',field:string,value:unknown,condition:{field:string;operator:'equals';value:unknown},delayMinutes=0)=>{
  const definition={trigger:{kind:'record_changed',recordType},conditions:[condition],actions:[{kind:'set',field,value}],delayMinutes};
  const saved=await call('/api/workflows',{name,definition},'POST');
  const preview=await call(`/api/workflows/${saved.workflow.id}/preview`,{},'POST');
  assert.ok(preview.previewId,`${name} has a saved preview`);
  await call(`/api/workflows/${saved.workflow.id}/activate`,{previewId:preview.previewId},'POST');
  return{id:saved.workflow.id,previewId:preview.previewId};
 };
 const contact=(await call(`/api/v1/records/contact/${f.ana}`)).record,beforeAna=contact.job_title??null;
 const delayed=await create('Archive delayed contact','contact','job_title','Workflow delayed result',{field:'job_title',operator:'equals',value:'Workflow delayed target'},60);
 await call(`/api/v1/records/contact/${f.ana}`,{name:contact.name,email:contact.email,phone:contact.phone,job_title:'Workflow delayed target',timezone:contact.timezone,company_id:contact.company_id,contactability:contact.contactability,custom_fields:JSON.parse(contact.custom_fields_json??'{}')},'PUT');
 await call('/api/workflows/process',{},'POST');
 const delayedRun=await f.db.prepare("SELECT id FROM workflow_runs WHERE workflow_id=? AND record_id=? AND status='queued' ORDER BY created_at DESC LIMIT 1").bind(delayed.id,f.ana).first<string>('id');
 assert.ok(delayedRun,'delayed contact trigger remains queued');

 const bob=(await call(`/api/v1/records/contact/${f.bob}`)).record,beforeBob=bob.job_title??null;
 const written=await create('Archive immediate contact','contact','job_title','Workflow write result',{field:'job_title',operator:'equals',value:'Workflow write target'});
 await call(`/api/v1/records/contact/${f.bob}`,{name:bob.name,email:bob.email,phone:bob.phone,job_title:'Workflow write target',timezone:bob.timezone,company_id:bob.company_id,contactability:bob.contactability,custom_fields:JSON.parse(bob.custom_fields_json??'{}')},'PUT');
 await call('/api/workflows/process',{},'POST');
 const write=await f.db.prepare("SELECT id,run_id,before_json,after_json FROM workflow_record_writes WHERE workflow_id=? AND record_id=? AND field='job_title' ORDER BY occurred_at DESC LIMIT 1").bind(written.id,f.bob).first<{id:string;run_id:string;before_json:string;after_json:string}>();
 assert.ok(write,'immediate contact workflow creates a durable write receipt');
 assert.deepEqual(JSON.parse(write.before_json),'Workflow write target');
 assert.equal(JSON.parse(write.after_json),'Workflow write result');

 const opportunity=(await call(`/api/v1/records/opportunity/${f.opportunity}`)).record,beforeAmount=opportunity.value_cents;
 const approval=await create('Archive material deal approval','opportunity','value_cents',beforeAmount+1000000,{field:'title',operator:'equals',value:'Workflow approval target'});
 const links=(await f.db.prepare('SELECT contact_id,is_primary FROM opportunity_contacts WHERE opportunity_id=? ORDER BY contact_id').bind(f.opportunity).all<{contact_id:string;is_primary:number}>()).results;
 await call(`/api/v1/records/opportunity/${f.opportunity}`,{title:'Workflow approval target',stage_id:opportunity.stage_id,owner_id:opportunity.owner_id,company_id:opportunity.company_id,value_cents:beforeAmount,expected_close_at:opportunity.expected_close_at,contact_ids:links.map(link=>link.contact_id),primary_contact_id:links.find(link=>link.is_primary)?.contact_id??null,custom_fields:JSON.parse(opportunity.custom_fields_json??'{}')},'PUT');
 await call('/api/workflows/process',{},'POST');
 const pending=await f.db.prepare("SELECT a.id,a.run_id,a.plan_json FROM workflow_approvals a JOIN workflow_runs r ON r.id=a.run_id WHERE r.workflow_id=? AND r.record_id=? AND a.status='pending'").bind(approval.id,f.opportunity).first<{id:string;run_id:string;plan_json:string}>();
 assert.ok(pending,'material opportunity write waits for an approval');
 const approvedPlan=JSON.parse(pending.plan_json);
 assert.equal(approvedPlan.field,'value_cents');
 assert.equal(approvedPlan.before,beforeAmount);
 assert.equal(approvedPlan.after,beforeAmount+1000000);
 assert.equal(Number(await f.db.prepare("SELECT count(*) n FROM workflow_approvals a JOIN workflow_runs r ON r.id=a.run_id WHERE r.workflow_id=? AND r.record_id=? AND a.status='pending'").bind(approval.id,f.opportunity).first('n')),1,'only the selected material deal change is pending');
 assert.equal((await call(`/api/v1/records/opportunity/${f.opportunity}`)).record.value_cents,beforeAmount,'approval does not apply the material amount change');
 const writtenRun=await f.db.prepare('SELECT status FROM workflow_runs WHERE id=?').bind(write.run_id).first<string>('status');
 assert.equal(writtenRun,'completed','immediate contact workflow completes after its durable write');
 return{
  delayed:{...delayed,runId:delayedRun,recordId:f.ana,before:beforeAna},
  written:{...written,runId:write.run_id,writeId:write.id,recordId:f.bob,initialBefore:beforeBob,before:'Workflow write target',after:'Workflow write result'},
  approval:{...approval,runId:pending.run_id,approvalId:pending.id,recordId:f.opportunity,before:beforeAmount,after:beforeAmount+1000000}
 };
}

/** Verify archive import keeps the evidence while discarding every executable source grant. */
export async function proveWorkflowCustody(source:CaptureFixture,target:Awaited<ReturnType<typeof launchFixture>>,data:WorkflowData,request:(path:string,body?:unknown,method?:string,cookie?:string)=>Promise<Response>){
 const ownerId=await target.db.prepare("SELECT id FROM operators WHERE setup_owner=1 AND status='active'").first<string>('id');assert.ok(ownerId);
 const ownerSession=await testAuth(target.db).createSession(ownerId),ownerCookie=`__Host-orbit_session=${ownerSession.token}`;
 const asOwner=(path:string,body:unknown)=>request(path,body,'POST',ownerCookie);
 if(ownerId!==target.actor){const session=await testAuth(target.db).createSession(target.actor);assert.equal((await request('/api/workflows/process',{},'POST',`__Host-orbit_session=${session.token}`)).status,403,'full receiver access alone never grants workflow authority');}
 const receipt=await target.db.prepare('SELECT * FROM workflow_record_writes WHERE id=?').bind(data.written.writeId).first<Record<string,unknown>>();
 const sourceReceipt=await source.db.prepare('SELECT * FROM workflow_record_writes WHERE id=?').bind(data.written.writeId).first<Record<string,unknown>>();
 const versions=(await target.db.prepare('SELECT workflow_id,version,status,preview_id,preview_json FROM workflow_versions WHERE workflow_id IN(?,?,?)').bind(data.delayed.id,data.written.id,data.approval.id).all<any>()).results;
 assert.equal(versions.length,3);
 for(const v of versions){assert.equal(v.status,'paused');assert.equal(v.preview_id,null);assert.equal(v.preview_json,null);}
 const delayed=await target.db.prepare('SELECT id,status FROM workflow_runs WHERE id=?').bind(data.delayed.runId).first<any>();
 assert.deepEqual(delayed,{id:data.delayed.runId,status:'stopped'});
 const run=await target.db.prepare('SELECT status FROM workflow_runs WHERE id=?').bind(data.written.runId).first<string>('status');
 assert.equal(run,'completed','completed run history remains completed');
 const approval=await target.db.prepare('SELECT status FROM workflow_approvals WHERE id=?').bind(data.approval.approvalId).first<any>();
 assert.deepEqual(approval,{status:'expired'});
 assert.ok(receipt,'durable write receipt survives archive restore');
 assert.deepEqual(receipt,sourceReceipt,'the archive retains the complete source write receipt');
 assert.equal(receipt.workflow_id,data.written.id);
 assert.equal(receipt.version,1);
 assert.equal(receipt.record_id,data.written.recordId);
 assert.equal(receipt.field,'job_title');
 assert.deepEqual(JSON.parse(String(receipt.before_json)),data.written.before);
 assert.deepEqual(JSON.parse(String(receipt.after_json)),data.written.after);
 const delayBefore=await target.db.prepare('SELECT job_title FROM contacts WHERE id=?').bind(data.delayed.recordId).first<string>('job_title');
 assert.equal(delayBefore,'Workflow delayed target');
 const beforeProcess=await target.db.prepare('SELECT job_title FROM contacts WHERE id=?').bind(data.written.recordId).first<string>('job_title');
 const amountBefore=await target.db.prepare('SELECT value_cents FROM opportunities WHERE id=?').bind(data.approval.recordId).first<number>('value_cents');
 const processed=await asOwner('/api/workflows/process',{});assert.equal(processed.status,200,await processed.clone().text());
 assert.equal(await target.db.prepare('SELECT job_title FROM contacts WHERE id=?').bind(data.delayed.recordId).first<string>('job_title'),delayBefore);
 assert.equal(await target.db.prepare('SELECT job_title FROM contacts WHERE id=?').bind(data.written.recordId).first<string>('job_title'),beforeProcess);
 assert.equal(await target.db.prepare('SELECT value_cents FROM opportunities WHERE id=?').bind(data.approval.recordId).first<number>('value_cents'),amountBefore);
 const activation=await asOwner(`/api/workflows/${data.written.id}/activate`,{previewId:data.written.previewId});
 assert.equal(activation.status,409,'source preview cannot reactivate a restored workflow');
 const stillPaused=(await target.db.prepare('SELECT workflow_id,status,preview_id FROM workflow_versions WHERE workflow_id IN(?,?,?)').bind(data.delayed.id,data.written.id,data.approval.id).all<any>()).results;
 assert.ok(stillPaused.every(row=>row.status==='paused'&&row.preview_id===null),'processing and source preview do not resume source authority');
}
