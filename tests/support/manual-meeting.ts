import assert from 'node:assert/strict';
import type {TodayApp} from './today-workspace';

/** Two full operators use Records; editing a meeting retains its original author and context. */
export async function exerciseManualMeeting(db:D1Database,author:TodayApp,editor:TodayApp){
 const contacts=[];
 for(const name of ['synthetic-orbit-97 attendee','synthetic-orbit-98 attendee'])contacts.push(await author.json<{id:string}>('/api/v1/records/contact',{body:{name}},201));
 const stages=await author.json<{stages:{id:string}[]}>('/api/v1/workbench',{},200);
 const {id}=await author.json<{id:string}>('/api/v1/records/opportunity',{body:{title:'synthetic-orbit-97 meeting',stage_id:stages.stages[0]!.id,value_cents:450000,contact_ids:contacts.map(c=>c.id),primary_contact_id:contacts[0]!.id}},201);
 await author.event(id,'form.submitted','Customer requested a meeting',1);
 const path=`/api/v1/records/opportunity/${id}`,read=()=>editor.json<any>(path,{},200);
 const inventory=async()=>({drafts:(await db.prepare('SELECT * FROM drafts ORDER BY id').all()).results,messages:(await db.prepare('SELECT * FROM outbound_messages ORDER BY id').all()).results});
 const state=async()=>{const {record}=await read();return {score:record.score,band:record.band,mail:await inventory()};};
 const before=await state();assert.ok(before.score>0,'The meeting must preserve an already scored deal');
 const original={kind:'meeting',text:'Discussed the rollout with both buyers',occurredAt:'2026-01-12T14:07:00.000Z',durationMinutes:37,contactIds:contacts.map(c=>c.id)};
 const created=await author.json<{id:string}>(path+'/entries',{body:original},200);
 const entry=async()=>{const row=(await read()).timeline.find((item:any)=>item.id===created.id);assert.ok(row,'The meeting is visible on a fresh record read');return row;};
 const first=await entry();
 assert.deepEqual([first.kind,first.occurred_at,first.actor_id,JSON.parse(first.payload_json)],['manual.meeting',original.occurredAt,author.actor,{text:original.text,durationMinutes:37,contactIds:original.contactIds}]);
 const changed={...original,text:'Confirmed the rollout with both buyers',occurredAt:'2026-01-12T15:23:00.000Z'};
 await editor.json(path+`/entries/${created.id}`,{method:'PUT',body:changed},200);
 const edited=await entry();
 assert.deepEqual([edited.kind,edited.occurred_at,edited.recorded_at,edited.actor_id,edited.actor_name,JSON.parse(edited.payload_json)],['manual.meeting',changed.occurredAt,first.recorded_at,author.actor,first.actor_name,{text:changed.text,durationMinutes:37,contactIds:original.contactIds}]);
 assert.deepEqual((await read()).contacts.map((c:any)=>c.id).sort(),original.contactIds.slice().sort(),'Attendee identities resolve to the associated contacts');
 assert.deepEqual(await state(),before,'Creating and editing a meeting changes no score, band, draft or outbound row');
 await editor.json(path+`/entries/${created.id}`,{method:'DELETE',body:{}},200);
 const deleted=await read();assert.equal(deleted.timeline.some((item:any)=>item.id===created.id),false);
 const traces=deleted.timeline.filter((item:any)=>item.kind==='entry.deleted'&&JSON.parse(item.payload_json).entryId===created.id);
 assert.deepEqual(traces.map((row:any)=>({actor:row.actor_id,payload:JSON.parse(row.payload_json)})),[{actor:editor.actor,payload:{entryId:created.id,kind:'meeting'}}]);
 assert.equal((await editor.call(path+`/entries/${created.id}`,{method:'DELETE',body:{}})).status,404,'A repeated deletion cannot add another trace');
 assert.deepEqual(await state(),before,'Deletion leaves the scored deal and every draft and outbound row unchanged');
}
