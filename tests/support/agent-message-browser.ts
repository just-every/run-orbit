import assert from 'node:assert/strict';
import type {TestContext} from 'node:test';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {expect,type Page} from '@playwright/test';
import {createApp} from '../../src/core/app/app';
import {orbitAgentDoor} from '../../src/core/features/agent-door';
import {operatorFromRequest,requireStepUp} from '../../src/core/features/identity';
import type {stalledRiskBrowser} from './stalled-risk-browser';

/** Reuse the signed installation and native person session; only the mail HTTP edge is replaced. */
export async function savedMessageBrowserFixture(context:TestContext,db:D1Database,installation:Awaited<ReturnType<typeof stalledRiskBrowser>>,origin:string) {
 const vars={...installation.vars,MAIL_FROM:['synthetic-orbit-sender','installation.test'].join('@'),MAIL_REPLY_TO:['synthetic-orbit-replies','installation.test'].join('@'),SENDGRID_API_KEY:'synthetic-orbit-mail-edge',SENDGRID_UNSUBSCRIBE_GROUP_ID:'1'};
 const bindings={...installation.bindings,...vars,DB:db},door=orbitAgentDoor(bindings),submissions:any[]=[];
 const app=createApp({database:db,assets:bindings.ASSETS,authenticate:request=>operatorFromRequest(request,bindings),stepUp:(request,action,returnTo)=>requireStepUp(request,bindings,action,returnTo)});
 const native=async(path:string,body:object)=>{
  const response=await app.request(origin+path,{method:'POST',headers:{Cookie:installation.cookie,Origin:origin,Host:new URL(origin).host,'Content-Type':'application/json'},body:JSON.stringify(body)});
  assert.ok(response.ok,await response.clone().text());return response.json() as Promise<any>;
 };
 const mcp=async(name:string,args:object,pending=false)=>{
  const response=await door.handle(new Request(origin+'/mcp',{method:'POST',headers:{Authorization:'Bearer '+await installation.bearer('drafts:read drafts:write messages:send'),Host:new URL(origin).host,'Content-Type':'application/json','MCP-Protocol-Version':'2026-07-28','MCP-Method':'tools/call','MCP-Name':name,Origin:origin,Accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args,_meta:{'io.modelcontextprotocol/protocolVersion':'2026-07-28'}}})}));
  const body=await response!.json() as any;assert.equal(response!.status,200,JSON.stringify(body));if(pending){assert.equal(body.result?.resultType,'input_required',JSON.stringify(body));assert.equal(body.result.structuredContent,undefined);}else assert.equal(body.result?.isError,false,JSON.stringify(body));return body.result;
 };
 const adopt=async(mode:'held'|'autonomous')=>{const response=await door.handle(new Request(origin+'/api/rer/agent-policy',{method:'POST',headers:{Origin:origin,Host:new URL(origin).host,'Content-Type':'application/json'},body:JSON.stringify({policy:await installation.policy(mode)})}));assert.equal(response!.status,200);};
 const email=['synthetic-orbit-browser-buyer','customer.test'].join('@'),contact=await native('/api/v1/records/contact',{name:'Synthetic message buyer',email,timezone:'UTC'});
 const subject='Synthetic exact saved message',body='Hello buyer,\nHere are the exact saved next steps.';
 const create=async(key:string)=>(await mcp('orbit.drafts.create',{kind:'contact',id:contact.id,contact_id:contact.id,opportunity_id:null,subject,body,idempotency_key:'synthetic-orbit-browser-'+key})).structuredContent.id as string;
 const args=async(id:string,key:string)=>{const {sendRevision}=(await mcp('orbit.drafts.read',{id})).structuredContent;return {id,send_revision:sendRevision,expected_revision:sendRevision,idempotency_key:'synthetic-orbit-browser-send-'+key};};
 const original=globalThis.fetch;
 let sentDraft:string;
 context.mock.timers.enable({apis:['Date'],now:new Date('2026-11-11T12:00:00.000Z')});
 try {
  await adopt('autonomous');
  globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
   if(String(input)!=='https://api.sendgrid.com/v3/mail/send')return original(input,init);
   submissions.push(JSON.parse(String(init?.body)));return new Response(null,{status:202,headers:{'x-message-id':'synthetic-orbit-browser-receipt'}});
  }) as typeof fetch;
  sentDraft=await create('sent');const sent=await mcp('orbit.messages.send',await args(sentDraft,'sent'));assert.equal(sent.structuredContent.state,'accepted');
  assert.equal(submissions.length,1);assert.equal(submissions[0].from.name,'Synthetic risk specialist for Rose Owner');
  assert.equal(submissions[0].subject,subject);assert.equal(submissions[0].content[0].value,body);
 } finally {globalThis.fetch=original;context.mock.timers.reset();}
 // The pending handle uses the real inspection clock; no expired fixture is presented as pending.
 await adopt('autonomous');const heldDraft=await create('held');await adopt('held');
 const pending=await mcp('orbit.messages.send',await args(heldDraft,'held'),true);
 assert.equal(pending.resultType,'input_required');assert.equal(submissions.length,1);
 return {vars,approvalId:pending._meta['com.runeditrun/approval'].id as string,sentDraft,contactId:contact.id,email,subject,body,submissions:submissions.length};
}

/** Inspect the existing pending and sent screens once at each release width; assert at desktop. */
export async function savedMessageScreens(page:Page,fixture:Awaited<ReturnType<typeof savedMessageBrowserFixture>>,evidence:string) {
 await mkdir(evidence,{recursive:true});
 for(const width of [1440,390]) {
  await page.setViewportSize({width,height:900});
  await page.goto('/agents/approvals/'+fixture.approvalId,{waitUntil:'networkidle'});
  if(width===1440) {
   await expect(page.getByRole('heading',{name:'Send an exact saved customer message',exact:true})).toBeVisible();
   await expect(page.locator('[data-approval-summary]')).toContainText(fixture.body);
   await expect(page.locator('[data-approval-summary]')).toContainText('Sender: Synthetic risk specialist for Rose Owner');
   await expect(page.getByRole('button',{name:'Approve',exact:true})).toBeVisible();
  }
  await page.screenshot({path:join(evidence,`pending-approval-${width}.png`),fullPage:true});
  await page.goto('/app/drafts/'+fixture.sentDraft,{waitUntil:'networkidle'});
  if(width===1440) {
   await expect(page.getByTestId('sent-message')).toContainText(fixture.subject);
   await expect(page.getByTestId('sent-message')).toContainText(fixture.body);
   await expect(page.getByTestId('sent-message')).toContainText(fixture.email);
   await expect(page.getByRole('button',{name:'Approve and send exact revision',exact:true})).toHaveCount(0);
  }
  await page.screenshot({path:join(evidence,`sent-message-${width}.png`),fullPage:true});
 }
 console.log(JSON.stringify({proof:'SURFACE-009.browser',widths:[1440,390],pending:fixture.approvalId,sentDraft:fixture.sentDraft,submissions:fixture.submissions}));
}
