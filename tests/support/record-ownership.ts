import assert from 'node:assert/strict';

/** Reviewed ownership is exercised through authenticated record routes. */
export async function exerciseRecordOwnership(request:(path:string,method?:string,body?:unknown)=>Promise<Response>,actor:string,other:string,receiverRequest:(path:string)=>Promise<Response>) {
 async function call(path:string,method='GET',body?:unknown,status=200):Promise<any> {
  const response=await request(path,method,body),result=await response.json();
  assert.equal(response.status,status,JSON.stringify(result));return result;
 }
 const notices=async()=>((await (await receiverRequest('notifications')).json()) as any).notifications.filter((notice:any)=>notice.kind==='record.assigned');
 const initialNotices=(await notices()).length;
 const create=async(name:string)=>(await call('records/contact','POST',{name,email:`${name}@ownership.test`},201)).id as string;
 const detail=(id:string)=>call(`records/contact/${id}`);
 const review=(ids:string[],ownerId:string|null)=>call('records/ownership/review','POST',{kind:'contact',ids,ownerId});
 const apply=(id:string)=>call(`records/ownership/${id}/apply`,'POST',{});
 const undo=(id:string)=>call(`records/ownership/${id}/undo`,'POST',{});
 const first=await create('synthetic-orbit-owner-single');
 assert.equal((await detail(first)).ownership.ownerId,null,'Creation leaves contacts unassigned');
 let batch=await review([first],other);
 assert.equal(batch.items[0].previousOwnerName,null);
 assert.ok(batch.items[0].newOwnerName);
 let result=await apply(batch.id);assert.equal(result.items.filter((item:any)=>item.applied).length,1);
 assert.equal((await notices()).length,initialNotices+1);
 let state=await detail(first);assert.equal(state.ownership.ownerId,other);
 const changed=state.timeline.filter((entry:any)=>entry.kind==='owner.changed');
 assert.equal(changed.length,1);assert.equal(changed[0].actor_id,actor);assert.ok(Number.isFinite(Date.parse(changed[0].occurred_at)));const change=JSON.parse(changed[0].payload_json);assert.equal(change.previous,null);assert.equal(change.current,other);assert.ok(change.currentOwnerName);
 await apply(batch.id);assert.equal((await detail(first)).timeline.filter((entry:any)=>entry.kind==='owner.changed').length,1,'Replay appends no event');
 assert.equal((await notices()).length,initialNotices+1);
 batch=await review([first],other);result=await apply(batch.id);assert.equal(result.items.filter((item:any)=>item.applied).length,0);assert.equal((await notices()).length,initialNotices+1,'Same owner is no change');
 batch=await review([first],actor);await apply(batch.id);assert.equal((await detail(first)).ownership.ownerId,actor);
 const selfNotices=(await call('notifications')).notifications.filter((notice:any)=>notice.kind==='record.assigned');assert.equal(selfNotices.length,0,'Self-assignment notifies nobody');
 batch=await review([first],null);await apply(batch.id);assert.equal((await detail(first)).ownership.ownerId,null);
 const company=await call('records/company','POST',{name:'synthetic-orbit-owned-company'},201);
 batch=await call('records/ownership/review','POST',{kind:'company',ids:[company.id],ownerId:other});
 await apply(batch.id);assert.equal((await call(`records/company/${company.id}`)).ownership.ownerId,other);
 const contacts:string[]=[];for(let n=0;n<20;n++)contacts.push(await create(`synthetic-orbit-owner-bulk-${n}`));
 batch=await review(contacts,other);assert.equal(batch.items.length,20);
 assert.ok(batch.items.every((item:any)=>item.previousOwnerName===null));
 // A real selected contact becomes unavailable after review, without exposing its erased identity.
 await call(`records/contact/${contacts[19]}`,'DELETE',{confirmed:true});
 result=await apply(batch.id);
 assert.equal(result.items.filter((item:any)=>item.applied).length,19);
 assert.equal(result.items.filter((item:any)=>item.failure).length,1);
 for(const id of contacts.slice(0,19)) {
  state=await detail(id);assert.equal(state.ownership.ownerId,other);
  assert.equal(state.timeline.filter((entry:any)=>entry.kind==='owner.changed').length,1);
 }
 const beforeUndo=(await notices()).length;assert.equal(beforeUndo,initialNotices+3,'One receiver notice lists the whole bulk batch');
 const bulkNotice=(await notices()).find((notice:any)=>notice.message.includes('synthetic-orbit-owner-bulk-0'));assert.ok(bulkNotice);for(let n=0;n<19;n++)assert.ok(bulkNotice.message.includes(`synthetic-orbit-owner-bulk-${n}`));
 await apply(batch.id);
 result=await undo(batch.id);assert.equal(result.items.filter((item:any)=>item.undone).length,19);
 for(const id of contacts.slice(0,19))assert.equal((await detail(id)).ownership.ownerId,null);
 await undo(batch.id);assert.equal((await notices()).length,beforeUndo,'Replay and undo add no notices');
 // Ordinary edits as well as later owner changes invalidate a review or undo.
 batch=await review([contacts[0],contacts[1]],other);
 await call(`records/contact/${contacts[0]}`,'PUT',{name:'Changed after review',email:'synthetic-orbit-owner-bulk-0@ownership.test'});
 result=await apply(batch.id);assert.equal(result.items.filter((item:any)=>item.applied).length,1);assert.equal(result.items.filter((item:any)=>item.failure).length,1);
 await call(`records/contact/${contacts[1]}`,'PUT',{name:'Changed after assignment',email:'synthetic-orbit-owner-bulk-1@ownership.test'});
 result=await undo(batch.id);assert.equal(result.items.filter((item:any)=>item.undone).length,0);assert.equal((await detail(contacts[1])).ownership.ownerId,other);
 const inactive=await call('settings/operators','POST',{email:'synthetic-orbit-inactive@ownership.test',displayName:'Inactive rep'},201);
 const privateContact=await create('synthetic-orbit-owner-privacy');
 const privateBatch=await review([privateContact],inactive.id);await apply(privateBatch.id);
 batch=await review([privateContact],other);await apply(batch.id);
 await call(`settings/operators/${inactive.id}`,'DELETE',{confirmed:true});
 await call(`settings/operators/${inactive.id}/erase`,'POST',{confirmed:true});
 assert.ok(!JSON.stringify(await detail(privateContact)).includes('Inactive rep'),'Retired owner names erase from history attributed to another actor');
 assert.ok(!JSON.stringify(await call(`records/ownership/${privateBatch.id}`)).includes('Inactive rep'),'Retired owner names erase from saved reviews');
 assert.ok(!(await notices()).some((notice:any)=>notice.message.includes('Inactive rep')));
 batch=await review([contacts[2]],inactive.id);result=await apply(batch.id);assert.ok(result.items[0].failure);assert.equal((await detail(contacts[2])).ownership.ownerId,null);
 const invalid=await review([contacts[2]],'00000000000000000000000000');
 const refused=await apply(invalid.id);assert.ok(refused.items[0].failure);assert.equal((await detail(contacts[2])).ownership.ownerId,null);
}
