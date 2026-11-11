import assert from 'node:assert/strict';
import {createApp} from '../../src/core/app/app';
import {operatorFromRequest,requireStepUp} from '../../src/core/features/identity';
import {autonomousPolicy,heldPolicy} from '../../src/base/modules/agent-door/conformance/crypto.mjs';
import type {RejectedReportProofContext} from './agent-door-proof';

export type DraftParityProofContext = Pick<RejectedReportProofContext,'bindings'|'door'|'cookie'|'ownerId'|'adopt'|'businessCall'> & {opportunityId:string;contactId:string};

/** The person and agent prepare the same message through their authenticated doors. */
export async function agentDoorDraftParityProof({bindings,door,cookie,ownerId,opportunityId,contactId,adopt,businessCall}:DraftParityProofContext){
 const db=bindings.DB,origin=bindings.AUTH_ORIGIN!,providerCalls:string[]=[];
 const app=createApp({database:db,assets:bindings.ASSETS,authenticate:request=>operatorFromRequest(request,bindings),
  stepUp:(request,action,returnTo)=>requireStepUp(request,bindings,action,returnTo),
  outboundMail:{provider:'sendgrid',async send(){providerCalls.push('mail');throw new Error('Unexpected draft mail');}},
  captureFetch:async input=>{providerCalls.push(String(input));throw new Error('Unexpected draft provider effect');}});
 const native=async(path:string,body?:object,method=body?'POST':'GET',expected=200)=>{
  const response=await app.request(origin+'/api/v1'+path,{method,headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  assert.equal(response.status,expected,await response.clone().text());return response.json() as Promise<any>;
 };
 const content={subject:' \tSynthetic proposal\n ',body:' \nHello buyer,\n\n  Keep this interior spacing.\t '};
 const edited={subject:' \tRevised synthetic proposal\n ',body:' \nRevised message.\n\n  Keep the indentation.\t '};
 const snapshot=(draft:any)=>({subject:draft.subject,body:draft.body,recipientEmail:draft.recipientEmail,recipientContactId:draft.recipientContactId,opportunityId:draft.opportunityId,revision:draft.revision,isStale:draft.isStale});
 const inventories=async()=>Object.fromEntries(await Promise.all(['drafts','record_mail_drafts','outbound_messages','record_mail_outbound_messages','timeline_entries','audit_entries','agent_door_events'].map(async table=>[table,(await db.prepare('SELECT * FROM '+table).all()).results.map(row=>JSON.stringify(row)).sort()])));
 const outbound=async()=>Promise.all(['outbound_messages','record_mail_outbound_messages'].map(async table=>(await db.prepare('SELECT * FROM '+table).all()).results));
 const outboundBefore=await outbound(),savedProofs:unknown[]=[];
 let rpc=310;
 const agent={sub:'synthetic-orbit-draft-agent',name:'Draft helper'};
 const call=(tool:string,args:Record<string,unknown>,overrides:Record<string,unknown>={})=>businessCall('orbit.drafts.'+tool,args,{act:agent,...overrides},['tools','call'].join('/'),++rpc);
 const completed=(response:any)=>{
  assert.equal(response.status,200);assert.equal(response.body.result?.isError,false,JSON.stringify(response.body));
  assert.equal(response.body.result.resultType,'complete');return response.body.result;
 };
 const events=async(id:string)=>{
  const response=await native('/records/opportunity/'+opportunityId);
  return response.timeline.filter((entry:any)=>JSON.parse(entry.payload_json).draftId===id);
 };
 const audit=async(id:string)=>(await db.prepare("SELECT action,actor_id FROM audit_entries WHERE entity_type='draft' AND entity_id=? ORDER BY occurred_at,id").bind(id).all<{action:string;actor_id:string}>()).results;
 for(const mode of ['autonomous','held'] as const){
  await adopt(mode==='held'?heldPolicy():autonomousPolicy());
  const nativeId=(await native('/workbench/records/opportunity/'+opportunityId+'/drafts',{contactId,...content},'POST',201)).id;
  const args={kind:'opportunity',id:opportunityId,contact_id:contactId,...content,idempotency_key:'synthetic-orbit-draft-create-'+mode};
  const response=await call('create',args),created=completed(response),agentId=created.structuredContent.id;
  const personDraft=(await native('/drafts/'+nativeId)).draft,agentDraft=(await native('/drafts/'+agentId)).draft;
  assert.deepEqual(snapshot(agentDraft),snapshot(personDraft),'native and MCP creation save identical normalized content, recipient, relationship and revision');
  assert.equal(agentDraft.subject,'Synthetic proposal');assert.equal(agentDraft.body,'Hello buyer,\n\n  Keep this interior spacing.');
  assert.equal(agentDraft.authorId,ownerId);assert.equal(agentDraft.authorLabel,'Draft helper for Morgan Lee');
  const review=async(result:any,id:string,tool:string)=>{
   const decision=result._meta['com.runeditrun/decision'];assert.equal(decision.disposition,mode==='held'?'review':'autonomous');
   const row=await db.prepare('SELECT row FROM agent_door_audit WHERE id=?').bind(decision.id).first<{row:string}>();assert.ok(row);
   const recorded=JSON.parse(row.row);assert.equal(recorded.outcome,'done');
   if(mode==='held'){
    const linked=result._meta['com.runeditrun/review'];assert.ok(linked?.id);assert.equal(recorded.review.id,linked.id);
    const response=await door.handle(new Request(origin+'/agents/api/reviews',{headers:{Cookie:cookie}}));assert.equal(response!.status,200);
    const item=(await response!.json() as any).reviews.find((r:any)=>r.id===linked.id);
    assert.equal(item.tool,'orbit.drafts.'+tool);assert.equal(item.state,'open');assert.equal(item.decision_id,decision.id);
    assert.deepEqual(item.prepared_by,{agent:agent.name,for:'Morgan Lee'});
    assert.equal(item.summary.target.id,tool==='create'?opportunityId:id);
    const saved=(await native('/drafts/'+id)).draft;assert.ok(item.summary.items.includes(saved.subject));assert.ok(item.summary.items.includes(saved.body),'the linked review shows the exact normalized saved content');
   }
  };
  await review(created,agentId,'create');
  const beforeCreateReplay=await inventories(),replay=await call('create',args);
  assert.notEqual(replay.body.id,response.body.id);assert.deepEqual(completed(replay).structuredContent,created.structuredContent);
  assert.deepEqual(await inventories(),beforeCreateReplay,'creation replay adds no draft or native event');
  const updateArgs={id:agentId,recipient_email:agentDraft.recipientEmail,...edited,expected_revision:agentDraft.revision,idempotency_key:'synthetic-orbit-draft-update-'+mode};
  const updated=completed(await call('update',updateArgs));
  const personUpdated=(await native('/drafts/'+nativeId,{revision:personDraft.revision,recipientEmail:personDraft.recipientEmail,...edited},'PUT')).draft;
  const agentUpdated=(await native('/drafts/'+agentId)).draft;
  assert.deepEqual(snapshot(agentUpdated),snapshot(personUpdated),'native and MCP editing save identical normalized state');
  assert.equal(agentUpdated.revision,2);assert.equal(agentUpdated.subject,'Revised synthetic proposal');assert.equal(agentUpdated.body,'Revised message.\n\n  Keep the indentation.');
  assert.equal(agentUpdated.preparedByLabel,'Draft helper for Morgan Lee');
  await review(updated,agentId,'update');
  for(const id of [nativeId,agentId]){
   const history=await events(id);assert.deepEqual(history.map((entry:any)=>entry.kind).sort(),['draft.created','draft.updated']);
   assert.deepEqual((await audit(id)).map(row=>row.action).sort(),['draft.created','draft.updated']);
   assert.ok((await audit(id)).every(row=>row.actor_id===ownerId));
   for(const entry of history){
    assert.equal(entry.actor_type,id===agentId?'agent':'operator');
    if(id===agentId){const actor=JSON.parse(entry.payload_json).preparedBy;assert.equal(actor.agent.id,agent.sub);assert.equal(actor.for.id,ownerId);assert.equal(actor.label,'Draft helper for Morgan Lee');}
   }
  }
  const beforeUpdateReplay=await inventories();
  assert.deepEqual(completed(await call('update',updateArgs)).structuredContent,updated.structuredContent);
  assert.deepEqual(await inventories(),beforeUpdateReplay,'editing replay adds no revision or event');
  const stale=await call('update',{...updateArgs,idempotency_key:updateArgs.idempotency_key+'-stale'});
  assert.equal(stale.body.result.isError,true);assert.equal(stale.body.result._meta['com.runeditrun/error'].code,'revision_conflict');
  await native('/drafts/'+nativeId,{revision:1,recipientEmail:personDraft.recipientEmail,...content},'PUT',409);
  assert.deepEqual(await inventories(),beforeUpdateReplay,'stale edits through either door have no native effect');
  savedProofs.push({mode,nativeId,agentId,revision:agentUpdated.revision,subject:agentUpdated.subject,body:agentUpdated.body});
  assert.deepEqual(await outbound(),outboundBefore);assert.deepEqual(providerCalls,[]);
 }
 await adopt(autonomousPolicy());
 const createArgs={kind:'opportunity',id:opportunityId,contact_id:contactId,...content,idempotency_key:'synthetic-orbit-draft-limits'};
 // Existing transport ceilings deliberately differ; normalization cannot expand either door.
 const longSubject='x'.repeat(1000);
 await native('/workbench/records/opportunity/'+opportunityId+'/drafts',{contactId,subject:longSubject,body:'Message'},'POST',400);
 const retainedCreate={...createArgs,subject:longSubject};
 const longDraft=completed(await call('create',retainedCreate)).structuredContent.id;
 assert.equal((await native('/drafts/'+longDraft)).draft.subject,longSubject);
 const beforeRefusals=await inventories();
 for(const fields of [{subject:'x'.repeat(1001)},{body:'x'.repeat(100001)},{subject:' \t\n '},{body:' \t\n '}]){
  const rejected=await call('create',{...createArgs,...fields,idempotency_key:'synthetic-orbit-invalid-'+rpc});assert.equal(rejected.body.result.isError,true);assert.equal(rejected.body.result._meta['com.runeditrun/error'].code,'invalid_arguments');
 }
 const noScope=await call('create',{...createArgs,idempotency_key:'synthetic-orbit-draft-no-scope'},{scope:'drafts:read'});assert.equal(noScope.status,403);
 const blocked=autonomousPolicy();blocked.rules=[{id:'synthetic-orbit-draft-block',class:'standard',do:'blocked'}];await adopt(blocked);
 const denied=await call('create',retainedCreate);assert.equal(denied.body.result._meta['com.runeditrun/error'].code,'policy_blocked');
 await adopt(autonomousPolicy());
 const revoked=await door.handle(new Request(origin+'/agents/api/agents/'+agent.sub+'/revoke',{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},body:'{}'}));assert.equal(revoked!.status,200);
 assert.equal((await call('create',retainedCreate)).status,401,'revoked authority cannot replay the completed creation');
 assert.deepEqual(await inventories(),beforeRefusals);assert.deepEqual(await outbound(),outboundBefore);assert.deepEqual(providerCalls,[]);
 console.log(JSON.stringify({proof:'BASE-AGENT-002.5.manual-draft-parity',modes:['autonomous','held'],normalized:true,saved:savedProofs,events:['draft.created','draft.updated'],replayEffects:0,staleEffects:0,providerCalls:0}));
}

/** Existing emitted browser registration shows the same saved draft and linked review. */
export async function draftParityBrowserJourney({page,policy,bearer,evidence}:{page:import('@playwright/test').Page;policy:(mode:'autonomous'|'held')=>Promise<string>;bearer:(scope?:string)=>Promise<string>;evidence:string}){
 const {expect}=await import('@playwright/test'),{mkdir}=await import('node:fs/promises');
 await mkdir(evidence,{recursive:true});await page.setViewportSize({width:1440,height:900});
 const origin=new URL((await page.request.get('/health')).url()).origin;
 const native=async(path:string,body?:object)=>{
  const response=body?await page.request.post('/api/v1'+path,{headers:{Origin:origin},data:body}):await page.request.get('/api/v1'+path);
  expect(response.ok(),await response.text()).toBe(true);return response.json();
 };
 const inventory=await native('/workbench');
 const opportunity=await native('/workbench/opportunities',{title:'Synthetic draft parity opportunity',companyName:'Synthetic draft company',contactName:'Synthetic draft buyer',email:['synthetic-orbit-buyer','draft.example.test'].join('@'),stageId:inventory.stages[0].id,valueCents:100});
 const detail=await native('/opportunities/'+opportunity.id),contact=detail.opportunity.contacts[0];
 const before=await native('/workbench/opportunities/'+opportunity.id+'/messages');
 const content={subject:' \tSynthetic browser draft\n ',body:' \nA private proposal.\n\n  Preserve this indentation.\t '};
 let rpc=600;
 const call=async(tool:string,args:Record<string,unknown>)=>{
  const response=await page.request.post('/mcp',{headers:{Authorization:'Bearer '+await bearer('drafts:read drafts:write'),'MCP-Protocol-Version':'2026-07-28','MCP-Method':['tools','call'].join('/'),'MCP-Name':'orbit.drafts.'+tool},data:{jsonrpc:'2.0',id:++rpc,method:['tools','call'].join('/'),params:{name:'orbit.drafts.'+tool,arguments:args,_meta:{'io.modelcontextprotocol/protocolVersion':'2026-07-28'}}}});
  expect(response.status()).toBe(200);const result=(await response.json()).result;expect(result.isError,JSON.stringify(result)).toBe(false);return result;
 };
 let final:any;
 for(const mode of ['autonomous','held'] as const){
  const adoption=await page.request.post('/api/rer/agent-policy',{headers:{Origin:origin},data:{policy:await policy(mode)}});expect(adoption.status(),await adoption.text()).toBe(200);
  const person=await native('/workbench/records/opportunity/'+opportunity.id+'/drafts',{contactId:contact.id,...content});
  const created=await call('create',{kind:'opportunity',id:opportunity.id,contact_id:contact.id,...content,idempotency_key:'synthetic-orbit-browser-create-'+mode});
  const id=created.structuredContent.id,expected=(await native('/drafts/'+person.id)).draft;
  const draft=(await native('/drafts/'+id)).draft;expect(draft.subject).toBe(expected.subject);expect(draft.body).toBe(expected.body);expect(draft.revision).toBe(expected.revision);
  const update={id,recipient_email:draft.recipientEmail,subject:' \tRevised browser draft\n ',body:' \nThe saved edited proposal.\n\n  Preserve this spacing.\t ',expected_revision:draft.revision,idempotency_key:'synthetic-orbit-browser-update-'+mode};
  const updated=await call('update',update);final=(await native('/drafts/'+id)).draft;
  expect(final.subject).toBe('Revised browser draft');expect(final.body).toBe('The saved edited proposal.\n\n  Preserve this spacing.');expect(final.revision).toBe(2);
  expect((await call('update',update)).structuredContent).toEqual(updated.structuredContent);
  if(mode==='held'){
   await page.goto('/app/drafts/'+id,{waitUntil:'networkidle'});
   await expect(page.getByTestId('draft-subject')).toHaveValue(final.subject);await expect(page.getByTestId('draft-body')).toHaveValue(final.body);
   await expect(page.getByTestId('draft-recipient')).toHaveValue(final.recipientEmail);await expect(page.getByTestId('draft-editor')).toContainText(final.preparedByLabel);
   for(const width of [1440,390]){await page.setViewportSize({width,height:900});await page.screenshot({path:evidence+'/manual-draft-'+width+'.png',fullPage:true});}
   await page.setViewportSize({width:1440,height:900});await page.goto('/agents',{waitUntil:'networkidle'});
   const reviewId=updated._meta['com.runeditrun/review'].id,item=page.locator('[data-review-id="'+reviewId+'"]');
   await expect(item).toHaveAttribute('data-review-state','open');await expect(item).toContainText('Synthetic risk specialist for Rose Owner');
   await expect(item).toContainText('Revised browser draft');await expect(item.getByRole('button',{name:'Mark reviewed',exact:true})).toBeVisible();
   for(const width of [1440,390]){await page.setViewportSize({width,height:900});await item.scrollIntoViewIfNeeded();await page.screenshot({path:evidence+'/manual-draft-review-'+width+'.png',fullPage:true});}
   await page.setViewportSize({width:1440,height:900});await item.getByRole('button',{name:'Mark reviewed',exact:true}).click();await expect(item).toHaveCount(0);
   const rows=await page.request.get('/agents/api/reviews');expect((await rows.json()).reviews.find((row:any)=>row.id===reviewId).state).toBe('reviewed');
   expect((await native('/drafts/'+id)).draft).toEqual(final);
  }
 }
 expect((await native('/workbench/opportunities/'+opportunity.id+'/messages')).messages).toEqual(before.messages);
 console.log(JSON.stringify({proof:'BASE-AGENT-002.5.manual-draft-browser',widths:[1440,390],modes:['autonomous','held'],draft:final.id,revision:final.revision,reviewMarked:true,outboundMessages:0}));
 await page.close();
}
