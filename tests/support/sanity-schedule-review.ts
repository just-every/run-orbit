import assert from 'node:assert/strict';
import type {TestContext} from 'node:test';
import {createApp} from './app';
import {createDependencies} from './dependencies';
import {createSourceSecurity} from '../../src/core/platform/source-security';
import {createHmac} from 'node:crypto';
import {createId} from '../../src/core/shared/ids';
import {runHostedTimers} from '../../src/core/features/outreach/scheduler';
import type {OutboundMail} from '../../src/core/platform/outbound-mail';

export async function scheduleReview(context:TestContext,db:D1Database,actor:string,token:string,stage:string,mail:OutboundMail,sends:()=>number){
 const security=createSourceSecurity({ORBIT_ENCRYPTION_KEY:'86'.repeat(32)})!,app=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})},sourceSecurity:security,outboundMail:mail});
 const request=(path:string,body?:unknown,method=body===undefined?'GET':'POST')=>app.request('https://orbit.test/api/v1/'+path,{method,headers:{Cookie:`__Host-orbit_session=${token}`,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const api=async(path:string,body?:unknown,method?:string)=>{const response=await request(path,body,method);assert.ok(response.ok,`${path}: ${response.status} ${await response.clone().text()}`);return response.json() as Promise<any>;};
 const customer=async()=>{const deal=await api('workbench/opportunities',{title:'Scheduled follow-up',companyName:'Schedule account',contactName:'Schedule buyer',email:`${createId().toLowerCase()}@customer.test`,stageId:stage,valueCents:0});const detail=(await api(`opportunities/${deal.id}`)).opportunity;return{deal:deal.id,contact:detail.contacts[0].id,email:detail.contacts[0].email};};
 const draft=async(c:{deal:string;contact:string},subject:string)=>api(`workbench/opportunities/${c.deal}/drafts`,{contactId:c.contact,subject,body:'Unchanged reviewed scheduled body'});
 const schedule=async(c:{deal:string;contact:string},subject:string,scheduledAt='2030-01-14T10:00:00Z')=>{const saved=await draft(c,subject),approved=await api(`workbench/drafts/${saved.id}/approve`,{revision:1,scheduledAt});return{...approved,draft:saved.id};};
 const state=async(c:{deal:string},id:string)=>(await api(`workbench/opportunities/${c.deal}/messages`)).messages.find((m:any)=>m.id===id);
 context.mock.timers.setTime(Date.parse('2030-01-08T06:59:30Z'));
 const c=await customer(),first=await draft(c,'Review outside recipient hours'),preview=await api(`workbench/drafts/${first.id}/approval-preview`),before=sends();
 assert.equal(preview.quietHours,true);assert.equal((await request(`workbench/drafts/${first.id}/approve`,{revision:1})).status,409);
 context.mock.timers.tick(61000);assert.equal((await request(`workbench/drafts/${first.id}/approve`,{revision:1,quietHoursConfirmation:preview.localTime})).status,200);assert.equal(sends(),before+1);
 const expired=await draft(c,'Review expires'),old=await api(`workbench/drafts/${expired.id}/approval-preview`);context.mock.timers.tick(11*60000);assert.equal((await request(`workbench/drafts/${expired.id}/approve`,{revision:1,quietHoursConfirmation:old.localTime})).status,409);assert.equal(sends(),before+1);
 // The recipient clock adjusts a weekend schedule visibly and changing that clock invalidates the reviewed adjustment.
 await api(`records/contact/${c.contact}`,{name:'Schedule buyer',timezone:'Australia/Brisbane'},'PUT');
 const saved=await draft(c,'Weekend in Brisbane'),requestedAt='2030-01-12T00:00:00Z',adjusted=await api(`workbench/drafts/${saved.id}/approval-preview?scheduledAt=${encodeURIComponent(requestedAt)}`);
 assert.notEqual(adjusted.scheduledAt,requestedAt);assert.ok(adjusted.scheduleReason);assert.equal(adjusted.timezone,'Australia/Brisbane');assert.ok(adjusted.scheduledLocalTime);
 const approve=(confirmed:string)=>request(`workbench/drafts/${saved.id}/approve`,{revision:1,scheduledAt:requestedAt,scheduledAtConfirmation:confirmed});
 assert.equal((await approve(requestedAt)).status,409);
 // This is a recipient fixture clock change, without changing the saved draft under review.
 await db.prepare("UPDATE contacts SET timezone='UTC' WHERE id=?").bind(c.contact).run();assert.equal((await approve(adjusted.scheduledAt)).status,409);await db.prepare("UPDATE contacts SET timezone='Australia/Brisbane' WHERE id=?").bind(c.contact).run();
 const scheduledResponse=await approve(adjusted.scheduledAt);assert.equal(scheduledResponse.status,200);const scheduled=await scheduledResponse.json() as any;
 const beforeDue=sends();context.mock.timers.setTime(Date.parse(requestedAt));await runHostedTimers(db,mail);assert.equal(sends(),beforeDue);context.mock.timers.setTime(Date.parse(adjusted.scheduledAt));await runHostedTimers(db,mail);await runHostedTimers(db,mail);assert.equal(sends(),beforeDue+1);assert.equal((await state(c,scheduled.id)).body,'Unchanged reviewed scheduled body');
 // Public source stops apply by exact email and cannot revive on replay or a later dispatch.
 const source=await api('sources/scheduled-stops',{name:'Customer stop source',enabled:true},'PUT');
 context.mock.timers.setTime(Date.parse('2030-01-14T09:00:00Z'));
 for(const type of ['email.replied','meeting.booked','email.unsubscribed','email.bounced']){
  const buyer=await customer(),message=await schedule(buyer,`Stop on ${type}`),body=JSON.stringify({eventId:createId(),type,subject:'Customer stop',occurredAt:new Date().toISOString(),email:buyer.email,permanentBounce:type==='email.bounced'}),timestamp=String(Math.floor(Date.now()/1000));
  const post=()=>app.request('https://orbit.test/api/v1/signals/scheduled-stops',{method:'POST',headers:{'X-Orbit-Timestamp':timestamp,'X-Orbit-Signature':createHmac('sha256',source.secret).update(timestamp+'.'+body).digest('hex')},body});
  assert.equal((await post()).status,201);assert.equal((await post()).status,201);assert.equal((await state(buyer,message.id)).state,'cancelled');assert.equal(await db.prepare('SELECT is_stale FROM drafts WHERE id=?').bind(message.draft).first('is_stale'),1);
 }
 const cancelledBuyer=await customer(),cancelled=await schedule(cancelledBuyer,'Operator cancels before dispatch');await api(`workbench/messages/${cancelled.id}/cancel`,{});assert.equal((await state(cancelledBuyer,cancelled.id)).state,'cancelled');
 const stageBuyer=await customer(),move=await schedule(stageBuyer,'Stop on stage move'),advanced=createId();await createDependencies(db).workspace.ensurePipelineStage({id:advanced,name:'Advanced',position:50});await api(`records/opportunity/${stageBuyer.deal}/move`,{stageId:advanced,reviewedStageId:stage});assert.equal((await state(stageBuyer,move.id)).state,'cancelled');
 const closedBuyer=await customer(),close=await schedule(closedBuyer,'Stop on close');await api(`records/opportunity/${closedBuyer.deal}/lifecycle`,{state:'won',reason:'Signed'});assert.equal((await state(closedBuyer,close.id)).state,'cancelled');await api(`records/opportunity/${closedBuyer.deal}/lifecycle`,{state:'open'});assert.equal((await state(closedBuyer,close.id)).state,'cancelled');
 const changedBuyer=await customer(),changed=await schedule(changedBuyer,'Recipient changed after approval');await api(`records/contact/${changedBuyer.contact}`,{name:'Schedule buyer',email:'replacement@new.test'},'PUT');
 context.mock.timers.setTime(Date.parse('2030-01-14T10:00:00Z'));const permittedSends=sends();await runHostedTimers(db,mail);assert.equal(sends(),permittedSends);assert.ok(['failed','cancelled'].includes((await state(changedBuyer,changed.id)).state));
 // Customer evidence, drafts, notifications and audit history never expire simply because the workspace is quiet.
 const tables=['contacts','companies','opportunities','signals','drafts','notifications','audit_entries'];const retained=await Promise.all(tables.map(async table=>({table,ids:(await db.prepare(`SELECT id FROM ${table}`).all<{id:string}>()).results.map(row=>row.id)})));
 context.mock.timers.setTime(Date.parse('2040-01-16T10:00:00Z'));await runHostedTimers(db,mail);
 for(const {table,ids} of retained){const after=new Set((await db.prepare(`SELECT id FROM ${table}`).all<{id:string}>()).results.map(row=>row.id));for(const id of ids)assert.ok(after.has(id),`${table} evidence remains after years of inactivity`);}
}
