import assert from 'node:assert/strict';
import {createApp} from '../../src/core/app/app';
import {operatorFromRequest,requireStepUp} from '../../src/core/features/identity';
import {createSourceSecurity} from '../../src/core/platform/source-security';
import {autonomousPolicy,heldPolicy} from '../../src/base/modules/agent-door/conformance/crypto.mjs';
import {nativeProviderConnection} from './capture-provider-fixture';
import {captureProviderNetwork} from './capture-provider-network';
import type {CaptureSecurityProofContext} from './agent-door-capture-security-proof';

/** Public native consent and MCP sync; only the providers' HTTP responses are replaced. */
export async function agentDoorCaptureSourceProof({bindings,door,cookie,adopt,businessCall}:CaptureSecurityProofContext){
 const db=bindings.DB,origin=bindings.AUTH_ORIGIN!,security=createSourceSecurity(bindings)!;
 let rpc=500;
 const mcp=(verb:string,args:Record<string,unknown>)=>businessCall('orbit.capture.source_'+verb,args,{},'tools/call',++rpc);
 const result=(reply:any)=>{assert.equal(reply.status,200);assert.equal(reply.body.result?.isError,false,JSON.stringify(reply.body));return reply.body.result;};
 const read=async(id:string)=>result(await mcp('read',{id})).structuredContent;
 const nativeState=async(id:string)=>({
  source:await db.prepare('SELECT * FROM capture_sources WHERE id=?').bind(id).first(),
  credential:await db.prepare('SELECT * FROM capture_credentials WHERE source_id=?').bind(id).first(),
  oauth:(await db.prepare('SELECT * FROM capture_oauth WHERE source_id=?').bind(id).all()).results,
  signals:(await db.prepare('SELECT * FROM signals WHERE source_id=? ORDER BY id').bind(id).all()).results,
 });
 const decision=async(reply:any,classes:object[],disposition:string)=>{
  assert.equal(reply.status,200);assert.equal(reply.body.error,undefined);
  const value=reply.body.result._meta['com.runeditrun/decision'];
  assert.equal(value.disposition,disposition);
  assert.deepEqual(value.classes.map(({class:cls,facts}:any)=>({class:cls,facts})),classes);
  const retained=await db.prepare('SELECT row,evidence FROM agent_door_audit WHERE id=?').bind(value.id).first<{row:string;evidence:string}>();
  assert.ok(retained);assert.deepEqual(JSON.parse(retained.row).classes,classes);
  assert.deepEqual(JSON.parse(retained.evidence).classes,classes);
  assert.equal(JSON.parse(retained.row).decision,disposition);
  return value;
 };
 const standard=[{class:'standard',facts:{measure:1}}];
 const originalFetch=globalThis.fetch;
 try{
  for(const provider of ['google','microsoft'] as const){
   const network=captureProviderNetwork(provider);network.state.total=1;
   globalThis.fetch=async(input,init)=>{
    const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
    assert.ok(['oauth2.googleapis.com','www.googleapis.com','gmail.googleapis.com','login.microsoftonline.com','graph.microsoft.com'].includes(url.hostname),'sync never switches provider route');
    return network.fetcher(url.href,{...init,redirect:'error'});
   };
   const app=createApp({database:db,assets:bindings.ASSETS,sourceSecurity:security,captureOrigin:origin,captureFetch:network.fetcher,
    authenticate:request=>operatorFromRequest(request,bindings),stepUp:(request,action,returnTo)=>requireStepUp(request,bindings,action,returnTo)});
   const native=(path:string,body?:unknown)=>app.request(origin+'/api/v1/capture'+path,{method:body===undefined?'GET':'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
   let id=await nativeProviderConnection(provider,native,network);
   const scope=async()=>assert.equal((await native(`/sources/${id}/scope`,{mail:{folders:['INBOX']}})).status,200);
   await scope();
   for(const [policyName,policy] of [['autonomous',autonomousPolicy()],['held',heldPolicy()]] as const){
    await adopt(policy);
    let source=await read(id);
    const key=`synthetic-orbit-${provider}-${policyName}`;
    const positive=await mcp('sync',{id,source_revision:source.revision,idempotency_key:key+'-positive',classes:['gated'],confirmed:true});
    const positiveResult=result(positive);assert.equal(positiveResult.structuredContent.source.state,'connected');
    assert.ok(positiveResult.structuredContent.source.captured+positiveResult.structuredContent.source.skipped>0,'native Capture is populated');
    await decision(positive,standard,policyName==='held'?'review':'autonomous');
    assert.deepEqual(Object.keys(positiveResult.structuredContent).sort(),['source','summary']);
    assert.ok(!JSON.stringify(positive.body).includes('synthetic-orbit-secret'));
    const steps=provider==='google'?['invalid_grant']:['invalid_grant','interaction_required','consent_required','login_required'];
    for(const step of steps){
     source=await read(id);
     const args={id,source_revision:source.revision,idempotency_key:key+'-'+step,classes:['standard'],confirmed:true,confirmExternal:true};
     network.state.early401=true;network.state.tokenError=step;
     const tokens=network.state.tokens,reads=network.state.reads.length;
     const refusal=await mcp('sync',args);
     assert.equal(refusal.body.result.isError,true);
     const error=refusal.body.result._meta['com.runeditrun/error'];
     assert.equal(error.code,'provider_person_required');assert.equal(error.provider,provider);assert.equal(error.step,step);assert.equal(error.person_only,true);
     assert.equal(new URL(error.url).pathname,'/app/settings/capture/connect/'+provider);
     assert.equal(new URL(error.url).searchParams.get('source'),id);
     assert.equal(network.state.tokens,tokens+1);assert.equal(network.state.reads.length,reads+1,'the token refusal is not retried');
     await decision(refusal,standard,policyName==='held'?'review':'autonomous');
     assert.ok(!JSON.stringify(refusal.body).includes('synthetic-orbit-private-description'));
     const snapshot=await nativeState(id);assert.equal((snapshot.source as any).state,'error');
     assert.match((snapshot.source as any).last_error,/Authorization requires attention/);
     const gated=[{class:'gated',facts:{measure:1,provider,step}}];
     for(const replayArgs of [args,{...args,idempotency_key:args.idempotency_key+'-fresh',source_revision:(await read(id)).revision,classes:['standard'],confirmed:true}]){
      let credentialReads=0;
      bindings.DB=new Proxy(db,{get(target,key){
       if(key==='prepare')return (sql:string)=>{if(/capture_credentials/i.test(sql))credentialReads++;return target.prepare(sql);};
       const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;
      }});
      let replay;
      try{replay=await mcp('sync',replayArgs);}finally{bindings.DB=db;}
      assert.equal(credentialReads,0,'gated admission and execution do not read credentials');
      await decision(replay,gated,policyName==='held'?'approval':'autonomous');
      if(policyName==='held'){
       assert.equal(replay.body.result.resultType,'input_required');
       const approval=replay.body.result._meta['com.runeditrun/approval'];assert.ok(approval.url.startsWith(origin+'/agents/approvals/'));
       const review=await door.handle(new Request(origin+'/agents/api/approvals/'+approval.id,{headers:{Cookie:cookie}}));
       assert.equal(review!.status,200);const pending=(await review!.json() as any).approval;
       assert.ok(pending.summary.items.includes(error.url));assert.ok(pending.summary.items.includes('Only the signed-in person can reconnect'));
       const approved=await door.handle(new Request(origin+'/agents/api/approvals/'+approval.id+'/approve',{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({revision:pending.revision,summary_sha256:pending.summary_sha256})}));
       assert.equal(approved!.status,200);
       assert.equal((await approved!.json() as any).approval.state,'executed','approval returns only a handoff, never provider consent');
      }else {const completed=result(replay);const {code:_,...handoff}=error;assert.deepEqual(completed.structuredContent.handoff,handoff);}
      assert.deepEqual(await nativeState(id),snapshot,'gated calls never read or change credentials or source effects');
      assert.equal(network.state.tokens,tokens+1);assert.equal(network.state.reads.length,reads+1);
     }
     // Opening the handoff is inert, and the native POST and callback belong to the person.
     assert.equal((await app.request(origin+'/api/v1/capture/providers')).status,401,'an agent handoff link grants no native session');
     network.state.tokenError='';
     assert.equal(await nativeProviderConnection(provider,native,network,id),id);
     await scope();source=await read(id);assert.equal(source.step,null);
     const stale=await mcp('sync',{id,source_revision:args.source_revision,idempotency_key:args.idempotency_key+'-stale'});
     assert.equal(stale.body.result._meta['com.runeditrun/error'].code,'revision_conflict');
     const resumed=await mcp('sync',{id,source_revision:source.revision,idempotency_key:args.idempotency_key+'-resumed'});
     result(resumed);await decision(resumed,standard,policyName==='held'?'review':'autonomous');
     console.log(JSON.stringify({proof:'SURFACE-005.provider-response',provider,step,policy:policyName,standard:true,refusal:true,gated:true,replayProviderCalls:0,nativeReconnect:true}));
    }
   }
   assert.equal((await native(`/sources/${id}/disconnect`,{confirmed:true})).status,200);
   const before=network.state.tokens+network.state.reads.length;
   const disconnected=await mcp('sync',{id,source_revision:'0'.repeat(64),idempotency_key:'synthetic-orbit-disconnected-'+provider});
   assert.equal(disconnected.body.result._meta['com.runeditrun/error'].code,'resource_unavailable');
   assert.equal(network.state.tokens+network.state.reads.length,before);
  }
 }finally{globalThis.fetch=originalFetch;await adopt(autonomousPolicy());}
}
