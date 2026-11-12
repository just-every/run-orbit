import assert from 'node:assert/strict';
import {proveSequenceErasure} from './sequence-erasure-proof';
import {fixture,signIn} from '../../newtests/t096/fixture';
import {archiveHttp,httpArchive,httpRestore} from '../../newtests/t096/archive-http-proof';
import {createApp} from './app';
import {createDependencies} from './dependencies';
import {createId} from '../../src/core/shared/ids';
import {isolatedDatabase} from './isolated-database';
import {localArchiveRoundTrip} from './capture-privacy-archive';
import type {SequenceView,SequenceStep} from '../../src/core/features/sequences/ui/api';

/** Definitions cross the same authenticated routes and populated archive as the operator. */
export async function proveSequenceAuthoring(){
 const f=await fixture();let submissions=0;
 try{
  await f.db.prepare("UPDATE workspace_settings SET timezone='America/New_York',working_hours_json=? WHERE id='workspace'").bind(JSON.stringify({days:[1,3,5],start:'09:00',end:'17:00'})).run();
  const owner=f.operator.operatorId,other=createId(),email=['synthetic-orbit-sequence-2','people.test'].join('@');
  await createDependencies(f.db).auth.ensureOperator({id:other,email,displayName:'Jordan Reyes'});
  const second=await signIn(f.db,email),invitationEmail=['synthetic-orbit-sequence-guest','people.test'].join('@');
  const invitation=await f.admin.invite(await f.nativeContext(),{email:invitationEmail,role:'guest',expiresAt:new Date(Date.now()+86400000).toISOString()});
  const invited=await signIn(f.db,invitationEmail);await f.admin.accept(invited.operator,invitation.token);
  const app=createApp({database:f.db,assets:{fetch:async()=>new Response('')},outboundMail:{send:async()=>{submissions++;throw new Error('Authoring must never submit mail.');}},captureFetch:async()=>{submissions++;throw new Error('Authoring must never call a provider.');}});
  const request=async(cookie:string,path:string,method='GET',body?:unknown)=>{const response=await app.request('https://orbit.test/api/v1/'+path,{method,headers:{Cookie:cookie,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});return{status:response.status,body:await response.json() as any};};
  const api=(path:string,method='GET',body?:unknown)=>request(f.cookie,path,method,body);
  const steps:SequenceStep[]=[{kind:'email',condition:'always',delayBusinessDays:0,subject:'Next steps for your operations team',body:'Can we review the rollout plan together?'},{kind:'wait',condition:'no_reply',delayBusinessDays:1},{kind:'call',condition:'no_reply',delayBusinessDays:1,title:'Call about the rollout',instructions:'Ask which milestones need support.'},{kind:'meeting',condition:'task_completed',delayBusinessDays:1,title:'Review the implementation plan',instructions:'Prepare the agenda and confirm the meeting manually.'},{kind:'linkedin',condition:'no_meeting',delayBusinessDays:1,title:'Connect with the operations lead',instructions:'Review their profile and write a personal note manually.'}];
  const created=await api('sequences','POST',{name:'Operations introduction',steps});assert.equal(created.status,201,JSON.stringify(created.body));let current=created.body as SequenceView;
  assert.equal(current.visibility,'private');assert.equal(current.ownerId,owner);assert.equal(current.version,1);assert.deepEqual(current.steps,steps);assert.deepEqual(current.calendar,{timezone:'America/New_York',days:[1,3,5]});
  assert.equal((await request(second.cookie,`sequences/${current.id}`)).status,404);assert.ok(!(await request(second.cookie,'sequences')).body.sequences.some((sequence:any)=>sequence.id===current.id));
  for(const invalid of [{...steps[0],condition:'opened'},{...steps[0],delayBusinessDays:-1},{...steps[0],cc:['internal']},{...steps[2],kind:'auto_linkedin'}])assert.equal((await api('sequences','POST',{name:'Invalid definition',steps:[invalid]})).status,400);
  const preview=await api(`sequences/${current.id}/preview`,'POST',{startAt:'2030-03-08T14:00:00.000Z'});assert.equal(preview.status,200,JSON.stringify(preview.body));assert.deepEqual(preview.body.steps.map((step:any)=>step.dueAt),['2030-03-08T14:00:00.000Z','2030-03-11T13:00:00.000Z','2030-03-13T13:00:00.000Z','2030-03-15T13:00:00.000Z','2030-03-18T13:00:00.000Z'],'The workspace calendar skips Tuesday and Thursday and preserves 9am across US daylight saving');
  const shared=await api(`sequences/${current.id}/share`,'POST',{version:current.version,visibility:'workspace'});assert.equal(shared.status,200,JSON.stringify(shared.body));current=shared.body;
  const sharedRead=await request(second.cookie,`sequences/${current.id}`);assert.equal(sharedRead.status,200);assert.equal(sharedRead.body.visibility,'workspace');
  assert.equal((await request(second.cookie,`sequences/${current.id}`,'PUT',{version:current.version,name:'Unowned edit',steps})).status,403);
  assert.equal((await request(second.cookie,`sequences/${current.id}/share`,'POST',{version:current.version,visibility:'private'})).status,403);
  const stale=current.version,prior=current.history;
  const changed=await api(`sequences/${current.id}`,'PUT',{version:current.version,name:'Operations introduction revised',steps:steps.map((step,index)=>index===0?{...step,subject:'Review the next milestone'}:step)});assert.equal(changed.status,200,JSON.stringify(changed.body));current=changed.body;
  assert.equal(current.version,stale+1);for(const version of prior)assert.deepEqual(current.history.find(item=>item.version===version.version),version,'Earlier content and calendar versions remain immutable');
  assert.equal((await api(`sequences/${current.id}`,'PUT',{version:stale,name:'Stale overwrite',steps})).status,409);assert.equal((await api(`sequences/${current.id}/share`,'POST',{version:stale,visibility:'private'})).status,409);
  const copyResponse=await request(second.cookie,`sequences/${current.id}/copy`,'POST',{version:current.version,name:'Jordan operations introduction'});assert.equal(copyResponse.status,201,JSON.stringify(copyResponse.body));const copy=copyResponse.body as SequenceView;
  assert.notEqual(copy.id,current.id);assert.equal(copy.ownerId,other);assert.equal(copy.visibility,'private');assert.equal(copy.version,1);assert.deepEqual(copy.source,{id:current.id,version:current.version});assert.deepEqual(copy.steps,current.steps);assert.equal(copy.history.length,1);assert.equal((await api(`sequences/${copy.id}`)).status,404,'The source owner cannot read the other operator private copy');
  const copyEdit=await request(second.cookie,`sequences/${copy.id}`,'PUT',{version:copy.version,name:'Jordan independent plan',steps});assert.equal(copyEdit.status,200);assert.equal(copyEdit.body.version,2);assert.deepEqual((await api(`sequences/${current.id}`)).body,current,'Copy edits never change the shared source');
  const before=JSON.stringify((await api(`sequences/${current.id}`)).body);
  for(const [path,method,body]of [['sequences','POST',{name:'Forbidden author',steps}],[`sequences/${current.id}`,'PUT',{version:current.version,name:'Forbidden edit',steps}],[`sequences/${current.id}/share`,'POST',{version:current.version,visibility:'private'}],[`sequences/${current.id}/copy`,'POST',{version:current.version,name:'Forbidden copy'}],[`sequences/${current.id}`,'GET',undefined],['sequences','GET',undefined]] as const)assert.equal((await request(invited.cookie,path,method,body)).status,403,`Invited collaborator cannot ${method} ${path}`);
  assert.equal(JSON.stringify((await api(`sequences/${current.id}`)).body),before);
  const template=await api('library','POST',{kind:'template',name:'Operations library note',subject:'Hello {{contact.name}}',body:'Review the implementation plan.',visibility:'shared'});assert.equal(template.status,201);
  const reference={kind:'email',condition:'always',delayBusinessDays:0,library:{id:template.body.id,revision:template.body.revision}};
  const librarySequence=await api('sequences','POST',{name:'Library reference plan',steps:[reference]});assert.equal(librarySequence.status,201,JSON.stringify(librarySequence.body));assert.deepEqual(librarySequence.body.steps,[reference]);assert.ok(!JSON.stringify(librarySequence.body).includes('Hello {{contact.name}}'),'The definition retains a reference, never a rendered message');
  assert.equal((await api('sequences','POST',{name:'Stale library reference',steps:[{...reference,library:{...reference.library,revision:99}}]})).status,409);
  const archive=await httpArchive(archiveHttp(app,()=>f.cookie));assert.ok(archive.manifest.tables.some(table=>table.name==='sequence_versions'&&table.rows>=6));
  const target=await fixture();try{let cookie=target.cookie;const restoredApp=createApp({database:target.db,assets:{fetch:async()=>new Response('')}});await httpRestore(archiveHttp(restoredApp,()=>cookie),archive);const ownerEmail=await f.db.prepare('SELECT email FROM operators WHERE id=?').bind(owner).first<string>('email');cookie=(await signIn(target.db,ownerEmail!)).cookie;const restored=await restoredApp.request(`https://orbit.test/api/v1/sequences/${current.id}`,{headers:{Cookie:cookie}});assert.equal(restored.status,200);assert.deepEqual(await restored.json(),current,'Populated export and restore retain versions and calendar history');assert.equal(await target.db.prepare('SELECT count(*) n FROM outbound_messages').first('n'),0);}finally{await target.close();}
  const local=await isolatedDatabase();try{await localArchiveRoundTrip(f.db,local.db);for(const table of ['sequences','sequence_versions'])assert.deepEqual((await local.db.prepare(`SELECT * FROM ${table} ORDER BY 1,2`).all()).results,(await f.db.prepare(`SELECT * FROM ${table} ORDER BY 1,2`).all()).results,'The CLI portability policy retains the complete definition and source history');}finally{await local.dispose();}
  const oldSession=second.cookie;await createDependencies(f.db).auth.revoke(second.operator.sessionId);assert.equal((await request(oldSession,`sequences/${current.id}/copy`,'POST',{version:current.version,name:'Revoked copy'})).status,401);
  for(const table of ['outbound_messages','record_mail_outbound_messages','sales_tasks'])assert.equal(await f.db.prepare(`SELECT count(*) n FROM ${table}`).first('n'),0,'Authoring never dispatches, enrolls or creates scheduled human tasks');assert.equal(submissions,0);
 }finally{await f.close();}
 await proveSequenceErasure();
}
