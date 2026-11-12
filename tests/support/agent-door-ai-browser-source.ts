import assert from 'node:assert/strict';
import {getPlatformProxy} from 'wrangler';
import {requestOfflineFixture} from '../../scripts/browser-runtime.mjs';
import {orbitAgentDoor} from '../../src/core/features/agent-door';
import {autonomousPolicy,heldPolicy} from '../../src/base/modules/agent-door/conformance/crypto.mjs';
import {identityVars} from './worker-identity.mjs';
import {sampleData} from '../fixtures/sample-data';
import {testState} from './test-state';
import type {PlatformBindings} from '../../src/core/platform/assets';

if(await requestOfflineFixture('tests/support/agent-door-ai-browser-source.ts',process.argv.slice(2)))process.exit(0);
const platform=await getPlatformProxy<{DB:D1Database}>({configPath:'wrangler.jsonc',envFiles:['tests/support/no-local-settings.env'],persist:{path:`${testState()}/v3`},remoteBindings:false});
const realFetch=globalThis.fetch;
let requests=0;
try {
 const db=platform.env.DB,origin=`http://127.0.0.1:${process.env.PORT??8722}`;
 const bindings={DB:db,ASSETS:{fetch:async()=>new Response('')},...identityVars(origin),OPENAI_API_KEY:'synthetic-orbit-169',AI_MODEL:'synthetic-orbit-model',AI_INPUT_COST_PER_MILLION:'1',AI_OUTPUT_COST_PER_MILLION:'2'} as PlatformBindings;
 const setPolicy=async(policy:object)=>db.prepare('INSERT INTO agent_door_state(id,local_document,local_revision) VALUES(1,?,1) ON CONFLICT(id) DO UPDATE SET local_document=excluded.local_document,local_revision=agent_door_state.local_revision+1').bind(JSON.stringify(policy)).run();
 const who={person:{id:sampleData.operators[0].id},agent:{id:'synthetic-orbit-ai-inspection',name:'Synthetic AI assistant'},scopes:['drafts:read','drafts:write']};
 const door=orbitAgentDoor(bindings),args={opportunity_id:sampleData.opportunities[0].id,feature:'draft'};
 await setPolicy(autonomousPolicy());
 const preview=await door.invoke('orbit.assistance.preview',args,who);assert.equal(preview.outcome,'done');
 const input=preview.result as any;
 globalThis.fetch=async(request,init)=>{
  if(String(request)!=='https://api.openai.com/v1/responses')return realFetch(request,init);
  const body=JSON.parse(String(init!.body));assert.deepEqual(JSON.parse(body.input),input.preview);requests++;
  return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({explanation:'Follow up on the cited evidence.',subject:'Synthetic buyer next steps',body:'Thank you for the discussion. Shall we review the next step?',evidenceIds:[input.preview.evidence[0].id]})}]}],usage:{input_tokens:20,output_tokens:10}});
 };
 const generated=await door.invoke('orbit.assistance.generate',{...args,source_revision:input.revision,expected_revision:input.revision,idempotency_key:crypto.randomUUID()},who);assert.equal(generated.outcome,'done',JSON.stringify(generated));assert.equal(requests,1);
 await setPolicy(heldPolicy());
 const pending=await door.invoke('orbit.assistance.generate',{...args,source_revision:input.revision,expected_revision:input.revision,idempotency_key:crypto.randomUUID()},who);assert.equal(pending.outcome,'pending');assert.equal(requests,1);
 console.log(JSON.stringify({approval:pending.approval!.id,draftId:(generated.result as any).draftId,previewHash:input.previewHash,modelRequests:requests}));
}finally{globalThis.fetch=realFetch;await platform.dispose();}
