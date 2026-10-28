import assert from 'node:assert/strict';
export async function exerciseOwnershipRemoval(call:(path:string,method?:string,body?:unknown,status?:number,token?:string)=>Promise<any>,request:(path:string,method?:string,body?:unknown,token?:string)=>Promise<Response>,actor:string,receiver:string){
 const leaving=await call('settings/operators','POST',{email:'synthetic-orbit-handover@ownership.test',displayName:'Casey Taylor'},201);
 const company=await call('records/company','POST',{name:'Handover Manufacturing'},201),contact=await call('records/contact','POST',{name:'Handover buyer',email:'synthetic-orbit-handover-buyer@ownership.test',company_id:company.id},201);
 const assign=async(kind:string,id:string)=>{const batch=await call('records/ownership/review','POST',{kind,ids:[id],ownerId:leaving.id});await call(`records/ownership/${batch.id}/apply`,'POST',{});};
 await assign('company',company.id);await assign('contact',contact.id);
 let review=await call(`settings/operators/${leaving.id}/removal-review`);assert.deepEqual(review.contacts.map((row:any)=>row.id),[contact.id]);assert.deepEqual(review.companies.map((row:any)=>row.id),[company.id]);
 const choices={opportunities:null,tasks:null,handoffs:null,recordMailObligations:null,contacts:receiver,companies:null};
 await call(`settings/operators/${leaving.id}`,'DELETE',{confirmed:true,handover:{review:review.review,opportunities:null,tasks:null,handoffs:null}},409);
 const later=await call('records/contact','POST',{name:'Later handover buyer',email:'synthetic-orbit-handover-later@ownership.test'},201);await assign('contact',later.id);
 await call(`settings/operators/${leaving.id}`,'DELETE',{confirmed:true,handover:{review:review.review,...choices}},409);
 assert.equal((await call(`records/company/${company.id}`)).ownership.ownerId,leaving.id,'A stale review transfers nothing');
 review=await call(`settings/operators/${leaving.id}/removal-review`);await call(`settings/operators/${leaving.id}`,'DELETE',{confirmed:true,handover:{review:review.review,...choices}});
 for(const id of [contact.id,later.id]){
  const result=await call(`records/contact/${id}`);assert.equal(result.ownership.ownerId,receiver);const entries=result.timeline.filter((entry:any)=>entry.kind==='owner.changed'&&JSON.parse(entry.payload_json).reason==='Operator removal handover');assert.equal(entries.length,1);assert.equal(entries[0].actor_id,actor);assert.equal(JSON.parse(entries[0].payload_json).previous,leaving.id);
 }
 assert.equal((await call(`records/company/${company.id}`)).ownership.ownerId,null);
 await call(`settings/operators/${leaving.id}/erase`,'POST',{confirmed:true});assert.ok(!JSON.stringify(await call(`records/contact/${contact.id}`)).includes('Casey Taylor'));
 assert.equal((await request(`settings/operators/${leaving.id}`,'DELETE',{confirmed:true,handover:{review:review.review,...choices}})).status,409);
}
