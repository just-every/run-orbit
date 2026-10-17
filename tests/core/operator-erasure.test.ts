import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isolatedDatabase } from '../support/isolated-database';
import { createDependencies } from '../support/dependencies';
import { createApp } from '../support/app';
import { RecordsRepository } from '../../src/core/features/records/repository';
import { ManualRepository } from '../../src/core/features/records/manual';
import { SettingsRepository } from '../../src/core/features/settings/repository';
import { createId } from '../../src/core/shared/ids';

test('BASE-DATA-003 operator erasure redacts only the erased operator\'s own whole name and mailbox; another person\'s text never changes',async()=>{
 const fixture=await isolatedDatabase(),db=fixture.db,now=new Date().toISOString();
 try{
  const deps=createDependencies(db),records=new RecordsRepository(db),manual=new ManualRepository(db),admin=createId();
  await deps.auth.ensureOperator({id:admin,email:'admin@example.test',displayName:'Administrator'});
  await deps.workspace.ensureWorkspace({name:'Operator privacy',timezone:'UTC',currency:'USD',workingHours:{},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});
  const session=await deps.auth.createSession(admin),app=createApp({database:db,assets:{fetch:async()=>new Response('')}});
  const erase=(id:string)=>app.request(`https://orbit.test/api/v1/settings/operators/${id}/erase`,{method:'POST',headers:{cookie:`__Host-orbit_session=${session.token}`,origin:'https://orbit.test','content-type':'application/json'},body:JSON.stringify({confirmed:true})});
  const operator=async(email:string,displayName:string,text:string)=>{
   const id=createId(),call=createId();await deps.auth.ensureOperator({id,email,displayName});
   await db.prepare("INSERT INTO ai_calls(id,operator_id,provider,model,feature,duration_ms,status,error,created_at) VALUES(?,?,'test','test','draft',1,'failed',?,?)").bind(call,id,text,now).run();
   const company=await records.save('company',{name:`${displayName} account`},id),entry=await manual.save('company',company.id,{kind:'note',text,occurredAt:now},id);
   return {id,call,entry:entry.id,company:company.id};
  };
  const mark=await operator('mark@example.test','Mark','Marketing plan drafted by Mark at MARK@example.test. Also jomark@example.test.');
  const other=await operator('jomark@example.test','Marketing lead','Marketing review: Mark asked for the Marketing plan');
  const snapshot=async(row:{id:string;call:string;entry:string})=>({operator:await db.prepare('SELECT * FROM operators WHERE id=?').bind(row.id).first(),call:await db.prepare('SELECT * FROM ai_calls WHERE id=?').bind(row.call).first(),entry:await db.prepare('SELECT * FROM timeline_entries WHERE id=?').bind(row.entry).first()});
  const otherBefore=await snapshot(other);
  const request=async(path:string,method='GET',body?:unknown)=>app.request(`https://orbit.test/api/v1/${path}`,{method,headers:{cookie:`__Host-orbit_session=${session.token}`,origin:'https://orbit.test','content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  const json=async(path:string,method='GET',body?:unknown,status=200)=>{const response=await request(path,method,body);assert.equal(response.status,status,await response.clone().text());return response.json() as Promise<any>;};
  const source={vendor:'csv',account:'Operator privacy source',contactability:'confirmed_contactable',files:[{kind:'contact',name:'operator-owner.csv',csv:'id,email,name,owner\r\na,privacy-buyer@example.test,Buyer privacy handover,mark@example.test',mapping:{id:'id',email:'email',name:'name',owner:'owner'},separator:';'}]};
  const imported=await json('imports/dry-run','POST',source);let importedJob:any;
  for(let step=0;step<20;step++){importedJob=await json(`imports/${imported.id}/apply`,'POST',{confirmed:true,fingerprint:imported.fingerprint});if(importedJob.job.state==='completed')break;}
  assert.equal(importedJob.job.state,'completed');
  const {importCopies}=await import('../support/crm-import-privacy');assert.ok((await importCopies(db)).includes('mark@example.test'),'fixture retains original operator source bytes before erasure');
  const contact={id:(await json('records/contact?q=privacy-buyer@example.test')).records[0].id};assert.equal((await records.detail('contact',contact.id)).record.owner_id,mark.id);
  await json(`records/owners/company/${mark.company}`,'PUT',{ownerId:mark.id});
  const task=await json('tasks','POST',{title:'Privacy handover task',recordType:'contact',recordId:contact.id,ownerId:mark.id,dueAt:new Date(Date.now()+86400000).toISOString(),priority:'normal',type:'follow_up',notes:'Retain useful due work',recurrence:'none',timezone:'UTC',reminderMinutes:null},201);
  assert.equal((await erase(mark.id)).status,409,'an active operator must first complete removal');
  assert.equal((await request(`settings/operators/${mark.id}`,'DELETE',{confirmed:true})).status,409,'contacts and companies cannot bypass review');
  // A restored historical operator can already be removed while owning work. Privacy
  // erasure refuses that status as a shortcut around required explicit handover.
  await db.prepare("UPDATE operators SET status='removed' WHERE id=?").bind(mark.id).run();
  assert.equal((await erase(mark.id)).status,409);assert.equal((await records.detail('contact',contact.id)).record.owner_id,mark.id);
  await db.prepare("UPDATE operators SET status='active' WHERE id=?").bind(mark.id).run();
  const review=await json(`settings/operators/${mark.id}/removal-review`);
  await json(`settings/operators/${mark.id}`,'DELETE',{confirmed:true,handover:{review:review.review,opportunities:null,contacts:other.id,companies:null,tasks:other.id,handoffs:null}});
  assert.equal((await records.detail('company',mark.company)).record.owner_id,null,'the company is explicitly unassigned');
  const owned=(await records.detail('contact',contact.id)).record;assert.equal(owned.owner_id,other.id);
  const assignment=await db.prepare("SELECT id FROM notifications WHERE operator_id=? AND kind='owner.assigned' AND message LIKE '%previous owner: Mark%'").bind(other.id).first<{id:string}>();assert.ok(assignment);
  const taskNotice=await db.prepare("SELECT id FROM notifications WHERE operator_id=? AND kind='task.assigned' AND event_key LIKE 'task.handover:%'").bind(other.id).first<{id:string}>();assert.ok(taskNotice);
  assert.equal((await erase(mark.id)).status,200);
  assert.equal((await json(`imports/${imported.id}`)).sourceWithdrawn,true,'operator source review is withdrawn');
  const custody=await importCopies(db);
  assert.ok(!custody.includes('mark@example.test'),'native/import custody contains no erased operator mailbox');
  assert.ok(!custody.includes('"ownerName":"Mark"'),'mapped personal owner labels are withdrawn from private plans');
  assert.ok(!JSON.stringify((await records.detail('contact',contact.id)).record).includes('mark@example.test'),'receiving contact retains no copied operator mailbox');
  const ownerHistory=(await records.detail('contact',contact.id)).timeline.filter((entry:any)=>entry.kind==='owner.changed').map((entry:any)=>JSON.parse(entry.payload_json));
  assert.ok(ownerHistory.some((payload:any)=>payload.previousOwnerId===mark.id&&payload.previousOwnerName==='Erased operator'));
  assert.ok(ownerHistory.some((payload:any)=>payload.ownerId===mark.id&&payload.ownerName==='Erased operator'));
  assert.equal((await records.detail('contact',contact.id)).record.owner_id,other.id,'erasure preserves the receiving owner');
  assert.equal(await db.prepare('SELECT id FROM notifications WHERE id=?').bind(assignment!.id).first(),null,'assignment notices containing erased personal context are withdrawn');
  assert.equal(await db.prepare('SELECT id FROM notifications WHERE id=?').bind(taskNotice!.id).first(),null,'the audited task handover notice is withdrawn');assert.equal((await json(`tasks/${task.id}`)).task.ownerId,other.id);
  const call=await db.prepare('SELECT error FROM ai_calls WHERE id=?').bind(mark.call).first<{error:string}>();
  assert.equal(call!.error,'Marketing plan drafted by Erased operator at Erased operator. Also jomark@example.test.');
  const entry=await db.prepare('SELECT actor_id,payload_json FROM timeline_entries WHERE id=?').bind(mark.entry).first<{actor_id:string;payload_json:string}>();
  assert.equal(entry!.actor_id,mark.id,'Attribution keeps the stable operator ID');
  const note=JSON.parse(entry!.payload_json).text as string;
  assert.equal(note,'Marketing plan drafted by Erased operator at Erased operator. Also jomark@example.test.','Inside structured content only whole-word string values change; a longer word or another mailbox never does');
  assert.deepEqual(await snapshot(other),otherBefore,'Another operator, their text and their notes are unchanged');
  const erased=await db.prepare('SELECT display_name,email FROM operators WHERE id=?').bind(mark.id).first<{display_name:string;email:string}>();assert.equal(erased!.display_name,'Erased operator');assert.ok(erased!.email.endsWith('@example.invalid'));

  // 'Ann' is also part of another operator's name, so whose name attributed text means is ambiguous.
  const ann=await operator('ann@example.test','Ann','Annual review with Ann');await operator('annlee@example.test','Ann Lee','Ann Lee prepared the annual plan');
  const annBefore=await snapshot(ann);await new SettingsRepository(db).remove(ann.id,admin);const removed=await snapshot(ann);
  const refused=await erase(ann.id);assert.equal(refused.status,409);
  assert.deepEqual(await snapshot(ann),removed,'A refused erasure writes nothing');assert.equal((annBefore.call as {error:string}).error,'Annual review with Ann');
 }finally{await fixture.dispose();}
});
