import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createAIProvider} from '../../src/core/features/assistance/provider';
import {createOutboundMail} from '../../src/core/platform/outbound-mail';
import manifest from '../../seed.json' with {type:'json'};
test('BASE-DATA-004 BASE-DATA-005 OUT-012 configured user-data flows target only declared providers and never an author or marketplace',async()=>{
 const actual=globalThis.fetch,requests:{url:string;body:any}[]=[];
 globalThis.fetch=async(input,init)=>{const url=String(input);requests.push({url,body:JSON.parse(String(init?.body??'{}'))});if(url==='https://api.sendgrid.com/v3/mail/send')return new Response(null,{status:202,headers:{'x-message-id':'test-provider-receipt'}});if(url==='https://api.openai.com/v1/responses')return Response.json({status:'completed',usage:{input_tokens:1,output_tokens:1,input_tokens_details:{cached_tokens:0}},output:[{content:[{type:'output_text',text:JSON.stringify({explanation:'Observed request.',subject:'Request',body:'Thank you for your request.',evidenceIds:['test-evidence']})}]}]});throw new Error('Unexpected outbound target');};
 try{
  await createAIProvider({OPENAI_API_KEY:'test-key',AI_MODEL:'test-model',AI_INPUT_COST_PER_MILLION:'0.2',AI_OUTPUT_COST_PER_MILLION:'1.2'})!.generate({evidence:[{id:'test-evidence',subject:'Test-owned request'}]});
  await createOutboundMail({SENDGRID_API_KEY:'test-key',MAIL_FROM:'test@example.invalid',MAIL_REPLY_TO:'reply@example.invalid',SENDGRID_UNSUBSCRIBE_GROUP_ID:'1'})!.send({id:'test-id',recipient_email:'customer@example.invalid',subject:'Reviewed test subject',body:'Reviewed test body'});
  assert.deepEqual(requests.map(r=>new URL(r.url).hostname),['api.openai.com','api.sendgrid.com']);
  assert.deepEqual(new Set(manifest.externals.map(item=>item.id)),new Set(['openai','sendgrid']));
  assert.equal(requests[1]!.body.personalizations[0].to[0].email,'customer@example.invalid');assert.equal(requests[1]!.body.content[0].value,'Reviewed test body');assert.deepEqual(requests[1]!.body.asm,{group_id:1});assert.equal(requests[1]!.body.tracking_settings.subscription_tracking.enable,false);assert.equal(requests[0]!.body.store,false);
 }finally{globalThis.fetch=actual;}
});
