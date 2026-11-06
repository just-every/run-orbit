import assert from 'node:assert/strict';
import type {TestContext} from 'node:test';
type Request=(path:string,method?:string,body?:unknown)=>Promise<Response>;

/** A scored deal changes hands through the native record door, after its evidence has aged. */
export async function exerciseOpportunityOwnership(request:Request,otherRequest:Request,revokeOther:()=>Promise<void>,actor:string,other:string,stage:string,context:TestContext){
 const call=async(path:string,method='GET',body?:unknown,status=200,asOther=false):Promise<any>=>{const response=await (asOther?otherRequest:request)(path,method,body);const result=await response.json();assert.equal(response.status,status,JSON.stringify(result));return result;};
 const started=Date.now();context.mock.timers.enable({apis:['Date'],now:started});
 try{
  const deal=await call('/records/opportunity','POST',{title:'Ownership journey',stage_id:stage,owner_id:null,value_cents:125000},201),path=`/records/opportunity/${deal.id}`;
  const event={eventId:crypto.randomUUID(),type:'email.replied',subject:'Buyer requested a proposal',occurredAt:new Date().toISOString()};
  await call(`/workbench/opportunities/${deal.id}/events`,'POST',event,201);
  const original=await call(path);assert.ok(original.record.score>0);
  context.mock.timers.tick(2*86400000);
  let previous:string|null=null;
  for(const owner of [actor,other,null]){
   await call(path,'PATCH',{changes:{owner_id:owner},base:{owner_id:previous}},200,owner!==actor);
   const fresh=await call(path),view=(await call(`/opportunities/${deal.id}`)).opportunity;
   assert.equal(fresh.record.owner_id,owner);assert.equal(view.ownerId,owner);
   assert.equal(fresh.record.score,original.record.score,'Changing owner must not age the score');assert.equal(view.score,original.record.score);
   assert.equal(fresh.record.stage_id,original.record.stage_id);assert.equal(fresh.record.value_cents,original.record.value_cents);
   const changes=fresh.timeline.filter((entry:any)=>entry.kind==='owner.changed');
   const entry=changes.find((entry:any)=>{const payload=JSON.parse(entry.payload_json);return payload.previous===previous&&payload.current===owner;});
   assert.ok(entry);assert.equal(entry.actor_id,owner===actor?actor:other);assert.equal(entry.actor_type,'operator');assert.equal(entry.actor_name,'Search operator');
   const payload=JSON.parse(entry.payload_json);assert.equal(payload.previousOwnerName,previous?'Search operator':null);assert.equal(payload.currentOwnerName,owner?'Search operator':null);
   previous=owner;
  }
  const before=await call(path);
  await call(path,'PATCH',{changes:{owner_id:null},base:{owner_id:null}});
  assert.deepEqual((await call(path)).timeline,before.timeline,'Saving the same owner adds no history');
  await call(path,'PATCH',{changes:{owner_id:actor},base:{owner_id:other}},409);
  await call(path,'PATCH',{changes:{owner_id:'not-a-record'},base:{owner_id:null}},400);
  assert.deepEqual(await call(path),before,'Refused and unchanged assignments write nothing');
  context.mock.timers.setTime(started);
  const retired=await call('/settings/operators','POST',{displayName:'Retired opportunity owner',email:['synthetic-orbit-702','operator.test'].join('@')},201);
  await call(path,'PATCH',{changes:{owner_id:retired.id},base:{owner_id:null}});
  await call(path,'PATCH',{changes:{owner_id:null},base:{owner_id:retired.id}});
  await call(`/settings/operators/${retired.id}`,'DELETE',{confirmed:true});
  await call(`/settings/operators/${retired.id}/erase`,'POST',{confirmed:true});
  const erased=await call(path);assert.ok(!JSON.stringify(erased).includes('Retired opportunity owner'));
  await call(path,'PATCH',{changes:{owner_id:retired.id},base:{owner_id:null}},400);
  await call(`/workbench/opportunities/${deal.id}/events`,'POST',event,201);
  assert.deepEqual(await call(path),erased,'Replayed evidence cannot restore an erased owner or change ownership');
  await revokeOther();await call(path,'PATCH',{changes:{owner_id:other},base:{owner_id:null}},401,true);
  assert.deepEqual(await call(path),erased,'Revoked credentials cannot assign the deal');
 }finally{context.mock.timers.reset();}
}
