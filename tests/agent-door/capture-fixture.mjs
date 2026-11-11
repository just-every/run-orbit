import assert from 'node:assert/strict';
import {captureOrigins} from './capture-network.mjs';

export async function captureFixture({request,origin,cookie,fixtures}){
 for(const edge of captureOrigins)await fixtures.set(edge,{person:false});
 const native=(path,body)=>request(new URL('/api/v1/capture'+path,origin).href,{method:body===undefined?'GET':'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const start=await native('/oauth/google/start',{name:'Synthetic connected source',clientId:'synthetic-orbit-client',clientSecret:'synthetic-orbit-secret'});
 assert.equal(start.status,200);
 const authorization=new URL((await start.json()).authorizationUrl);
 const callback=await native('/oauth/google/callback?state='+encodeURIComponent(authorization.searchParams.get('state'))+'&code=synthetic-orbit-code');
 assert.equal(callback.status,303);
 const location=new URL(callback.headers.get('location'),origin),id=location.searchParams.get('connected');assert.ok(id);
 assert.equal((await native('/sources/'+id+'/scope',{mail:{folders:['INBOX']}})).status,200);
 return {id};
}

export async function beforeCaptureStep({request,origin,cookie,fixtures,step,args}){
 if(step.id!=='capture_person_step')return;
 for(const edge of captureOrigins)await fixtures.set(edge,{person:true});
 const sync=await request(new URL('/api/v1/capture/sources/'+args.id+'/sync',origin).href,{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},body:'{}'});
 assert.equal(sync.status,200);assert.equal((await sync.json()).summary.halted,'revoked');
 // Any mistaken retry meets the same refusal; only native reconnect may clear it.
}
