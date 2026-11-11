import assert from 'node:assert/strict';
import {test} from 'node:test';
import {isolatedDatabase} from './tests/support/isolated-database';
import {stalledRiskBrowser} from './tests/support/stalled-risk-browser';
import {createApp} from './src/core/app/app';
import {operatorFromRequest,requireStepUp} from './src/core/features/identity';
import {orbitAgentDoor} from './src/core/features/agent-door';

test('manual draft content is identical through authenticated native HTTP and MCP',async context=>{
 const fixture=await isolatedDatabase();
 try {
  const origin='https://orbit.example.test',setup=await stalledRiskBrowser(context,fixture.db,origin);
  const bindings={...setup.vars,DB:fixture.db,ASSETS:{fetch:async()=>new Response('asset')} as Fetcher};
  const app=createApp({database:fixture.db,assets:bindings.ASSETS,authenticate:r=>operatorFromRequest(r,bindings),stepUp:(r,a,p)=>requireStepUp(r,bindings,a,p)});
  const native=async(path:string,body?:object)=>{
   const response=await app.request(origin+'/api/v1'+path,{method:body?'POST':'GET',headers:{Cookie:setup.cookie,Origin:origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
   assert.ok(response.ok,await response.clone().text());return response.json() as Promise<any>;
  };
  const inventory=await native('/workbench');
  const opportunity=await native('/workbench/opportunities',{title:'Synthetic parity probe',companyName:'Synthetic probe company',contactName:'Synthetic probe buyer',email:['synthetic-orbit-probe','draft.example.test'].join('@'),stageId:inventory.stages[0].id,valueCents:100});
  const detail=await native('/opportunities/'+opportunity.id),contact=detail.opportunity.contacts[0];
  const content={subject:' \tSynthetic padded proposal\n ',body:' \nHello buyer.\n\n  Keep interior spacing.\t '};
  const person=await native('/workbench/records/opportunity/'+opportunity.id+'/drafts',{contactId:contact.id,...content});
  const door=orbitAgentDoor(bindings);
  const adopted=await door.handle(new Request(origin+'/api/rer/agent-policy',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({policy:await setup.policy('autonomous')})}));assert.equal(adopted!.status,200);
  const method=['tools','call'].join('/'),tool='orbit.drafts.create';
  const response=await door.handle(new Request(origin+'/mcp',{method:'POST',headers:{Authorization:'Bearer '+await setup.bearer('drafts:read drafts:write'),'Content-Type':'application/json','MCP-Protocol-Version':'2026-07-28','MCP-Method':method,'MCP-Name':tool},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params:{name:tool,arguments:{kind:'opportunity',id:opportunity.id,contact_id:contact.id,...content,idempotency_key:'synthetic-orbit-probe'},_meta:{'io.modelcontextprotocol/protocolVersion':'2026-07-28'}}})}));
  assert.equal(response!.status,200);const result=(await response!.json() as any).result;assert.equal(result.isError,false);
  const nativeDraft=(await native('/drafts/'+person.id)).draft,agentDraft=(await native('/drafts/'+result.structuredContent.id)).draft;
  console.log(JSON.stringify({native:{subject:nativeDraft.subject,body:nativeDraft.body},mcp:{subject:agentDraft.subject,body:agentDraft.body}}));
  assert.equal(agentDraft.subject,nativeDraft.subject);assert.equal(agentDraft.body,nativeDraft.body);
 } finally {await fixture.dispose();}
});
