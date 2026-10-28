import assert from 'node:assert/strict';

type Request=(path:string,method?:string,body?:unknown)=>Promise<Response>;

/** Extension of the existing ownership journey, through real authenticated list, search and assignment routes. */
export async function exerciseRecordOwnerViews(request:Request,actor:string,other:string,otherRequest:Request){
 const call=async(path:string,method='GET',body?:unknown)=>{const response=await request(path,method,body),data=await response.json() as any;assert.ok(response.ok,JSON.stringify(data));return data;};
 const prefix='synthetic-orbit-owner-views';
 for(const kind of ['contact','company'] as const){
  const ids:string[]=[];
  for(const suffix of ['mine','theirs','unassigned'])ids.push((await call(`records/${kind}`,'POST',{name:`${prefix}-${kind}-${suffix}`})).id);
  for(const [id,ownerId] of [[ids[0],actor],[ids[1],other],[ids[2],null]] as const){const review=await call('records/ownership/review','POST',{kind,ids:[id],ownerId});await call(`records/ownership/${review.id}/apply`,'POST',{});}
  const list=async(owner:string,needle=prefix)=>call(`records/${kind}?${new URLSearchParams({q:needle,owner_id:owner})}`);
  assert.deepEqual((await list('me')).records.map((row:any)=>row.id),[ids[0]]);
  assert.deepEqual((await list(other)).records.map((row:any)=>row.id),[ids[1]]);
  assert.deepEqual((await list('unassigned')).records.map((row:any)=>row.id),[ids[2]]);
  assert.deepEqual((await list('')).records.map((row:any)=>row.id).sort(),[...ids].sort());
  assert.deepEqual((await list('me',`${prefix}-${kind}-theirs`)).records,[],'Search intersects the selected owner');
  const receiver=await otherRequest(`records/${kind}?${new URLSearchParams({q:prefix,owner_id:'me'})}`);assert.equal(receiver.status,200);assert.deepEqual((await receiver.json() as any).records.map((row:any)=>row.id),[ids[1]],'My uses the signed-in viewer');
  const grouped=(await list('')).records;
  assert.deepEqual(grouped.map((row:any)=>row.ownership.ownerId).sort(),[actor,other,null].sort());
  assert.ok(grouped.filter((row:any)=>row.ownership.ownerId).every((row:any)=>row.ownership.ownerName));
  const reassignment=await call('records/ownership/review','POST',{kind,ids:[ids[0]],ownerId:other});await call(`records/ownership/${reassignment.id}/apply`,'POST',{});
  assert.deepEqual((await list('me')).records,[],'Reassignment changes My on the next request');
 }
}
