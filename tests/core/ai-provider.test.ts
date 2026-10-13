import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createAIProvider} from '../../src/core/features/assistance/provider';
const config={OPENAI_API_KEY:'test-only',AI_MODEL:'test-model',AI_INPUT_COST_PER_MILLION:'0.2',AI_OUTPUT_COST_PER_MILLION:'1.2',AI_CACHED_INPUT_COST_PER_MILLION:'0.02'};
function answer(overrides:Record<string,unknown>={}){return Response.json({status:'completed',usage:{input_tokens:100,output_tokens:20,input_tokens_details:{cached_tokens:80}},output:[{content:[{type:'output_text',text:JSON.stringify({explanation:'Observed evidence',subject:'Request',body:'Thank you.',evidenceIds:['evidence']})}]}],...overrides});}
test('AI-002 transient transport retries at most twice; malformed or refused semantic output never retries',async()=>{
 const original=fetch;try{let calls=0;globalThis.fetch=async()=>{calls++;return new Response('busy',{status:429});};await assert.rejects(createAIProvider(config)!.generate({}),/429/);assert.equal(calls,3);
 calls=0;globalThis.fetch=async()=>{calls++;return calls<3?new Response('busy',{status:503}):answer();};const result=await createAIProvider(config)!.generate({});assert.equal(calls,3);assert.equal(result.cachedInputTokens,80);
 for(const response of [()=>answer({status:'incomplete'}),()=>answer({output:[{content:[{type:'output_text',text:'{"madeUp":true}'}]}]}),()=>new Response('rejected',{status:400})]){calls=0;globalThis.fetch=async()=>{calls++;return response();};await assert.rejects(createAIProvider(config)!.generate({}));assert.equal(calls,1);}
 }finally{globalThis.fetch=original;}
});
test('AI-004 invalid cached rates and impossible provider token accounting cannot become misleading costs',async()=>{
 for(const rate of ['-1','NaN','Infinity'])assert.throws(()=>createAIProvider({...config,AI_CACHED_INPUT_COST_PER_MILLION:rate}),/nonnegative/);
 const original=fetch;try{globalThis.fetch=async()=>answer({usage:{input_tokens:2,output_tokens:1,input_tokens_details:{cached_tokens:3}}});await assert.rejects(createAIProvider(config)!.generate({}),/token accounting/);}finally{globalThis.fetch=original;}
});
