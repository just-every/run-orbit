import assert from 'node:assert/strict';

export async function captureFixture({request,origin,cookie}){
 const native=(path,body)=>request(new URL('/api/v1/capture'+path,origin).href,{method:body===undefined?'GET':'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const connect=async(clientId)=>{
  const start=await native('/oauth/google/start',{name:'Synthetic connected source',clientId,clientSecret:'synthetic-orbit-secret'});
  assert.equal(start.status,200);
  const authorization=new URL((await start.json()).authorizationUrl);
  const callback=await native('/oauth/google/callback?state='+encodeURIComponent(authorization.searchParams.get('state'))+'&code=synthetic-orbit-code');
  assert.equal(callback.status,303);
  const location=new URL(callback.headers.get('location'),origin),id=location.searchParams.get('connected');assert.ok(id);
  assert.equal((await native('/sources/'+id+'/scope',{mail:{folders:['INBOX']}})).status,200);
  return id;
 };
 const id=await connect('synthetic-orbit-client'),personId=await connect('synthetic-orbit-person-client');
 const sync=await native('/sources/'+personId+'/sync',{});
 assert.equal(sync.status,200);assert.equal((await sync.json()).summary.halted,'revoked');
 return {id,personId};
}
