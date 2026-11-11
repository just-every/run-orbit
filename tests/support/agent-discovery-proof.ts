import assert from 'node:assert/strict';
import {buildSite} from '../../src/core/features/public/docs/build/site';
import {agentDocsInventory} from '../agent-door/native-journey.mjs';
import {autonomousPolicy,heldPolicy} from '../../src/base/modules/agent-door/conformance/crypto.mjs';
import type {RejectedReportProofContext} from './agent-door-proof';

/** Authenticated public discovery is descriptive under either company's policy. */
export async function agentDiscoveryProof({bindings,door,adopt,businessCall}: RejectedReportProofContext) {
  const docs=buildSite(process.cwd()),page=docs.pages.find(page=>page.slug==='agents');
  assert.deepEqual(docs.problems,[]);
  assert.ok(page,'the published agent guide exists');
  const metadata=await door.handle(new Request(bindings.AUTH_ORIGIN+'/.well-known/oauth-protected-resource/mcp'));
  assert.equal(metadata!.status,200);
  const scopes=(await metadata!.json() as {scopes_supported:string[]}).scopes_supported;
  const native=async()=>{
    const witness=await businessCall('orbit.operations.read',{});
    assert.equal(witness.status,200);assert.equal(witness.body.result.isError,false);
    const customers=Object.fromEntries(await Promise.all(['companies','contacts','opportunities'].map(async table=>
      [table,(await bindings.DB.prepare(`SELECT * FROM ${table}`).all()).results.map(row=>JSON.stringify(row)).sort()])));
    assert.ok(customers.companies!.length>0&&customers.opportunities!.length>0,'no-effect proof uses populated customer state');
    return {witness:witness.body.result.structuredContent,customers};
  };
  let previous:unknown;
  for(const [name,policy] of [['autonomous',autonomousPolicy()],['held',heldPolicy()]] as const) {
    await adopt(policy);
    const before=await native();
    let providerCalls=0;
    const original=globalThis.fetch;
    globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
      const url=new URL(input instanceof Request?input.url:String(input));
      if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)) {
        providerCalls++;
        throw new Error('Discovery attempted an outside request');
      }
      return original(input,init);
    }) as typeof fetch;
    let inventory;
    try {
      inventory=await agentDocsInventory({html:page.html,mcp:(method:string)=>businessCall('',{},{scope:scopes.join(' ')},method)});
      if(previous)assert.deepEqual(inventory,previous,'company policy does not widen the descriptive exception registry');
      previous=inventory;
    } finally {globalThis.fetch=original;}
    assert.equal(providerCalls,0,'discovery makes no provider request');
    assert.deepEqual(await native(),before,'discovery changes no customer, delivery, authority or native history state');
    const denied=await businessCall('orbit.records.read',{kind:'company',id:'synthetic-orbit-no-authority'},{scope:'events:read'});
    assert.equal(denied.status,403,'declaring non-tools grants no record scope');
    console.log(JSON.stringify({proof:'SURFACE-001.declared-non-tools',policy:name,...inventory,nativeMatch:true,providerCalls,unchangedNativeState:true}));
  }
  await adopt(autonomousPolicy());
}
