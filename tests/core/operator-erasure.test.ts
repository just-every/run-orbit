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
  const session=await deps.auth.createSession(admin),app=createApp({database:db,assets:{fetch:async()=>new Response('')}});
  const erase=(id:string)=>app.request(`https://orbit.test/api/v1/settings/operators/${id}/erase`,{method:'POST',headers:{cookie:`__Host-orbit_session=${session.token}`,origin:'https://orbit.test','content-type':'application/json'},body:JSON.stringify({confirmed:true})});
  const operator=async(email:string,displayName:string,text:string)=>{
   const id=createId(),call=createId();await deps.auth.ensureOperator({id,email,displayName});
   await db.prepare("INSERT INTO ai_calls(id,operator_id,provider,model,feature,duration_ms,status,error,created_at) VALUES(?,?,'test','test','draft',1,'failed',?,?)").bind(call,id,text,now).run();
   const company=await records.save('company',{name:`${displayName} account`},id),entry=await manual.save('company',company.id,{kind:'note',text,occurredAt:now},id);
   return {id,call,entry:entry.id};
  };
  const mark=await operator('mark@example.test','Mark','Marketing plan drafted by Mark at MARK@example.test. Also jomark@example.test.');
  const other=await operator('jomark@example.test','Marketing lead','Marketing review: Mark asked for the Marketing plan');
  const snapshot=async(row:{id:string;call:string;entry:string})=>({operator:await db.prepare('SELECT * FROM operators WHERE id=?').bind(row.id).first(),call:await db.prepare('SELECT * FROM ai_calls WHERE id=?').bind(row.call).first(),entry:await db.prepare('SELECT * FROM timeline_entries WHERE id=?').bind(row.entry).first()});
  const otherBefore=await snapshot(other);
  await new SettingsRepository(db).remove(mark.id,admin);assert.equal((await erase(mark.id)).status,200);
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
