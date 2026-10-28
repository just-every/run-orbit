import {createId} from '../../src/core/shared/ids';
import {scheduleReview} from '../support/sanity-schedule-review';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {isolatedDatabase} from '../support/isolated-database';
import {createApp} from '../support/app';
import {createDependencies} from '../support/dependencies';
import {WorkbenchRepository} from '../../src/core/features/workbench/repository';
import {runHostedTimers,schedulerStatus} from '../../src/core/features/outreach/scheduler';

test('OUT-007 OUT-008 OUT-009 BASE-DATA-002 reviewed schedules respect recipient clocks, request/Cron races, current permission, cancellation and durable history',async context=>{
 const platform=await isolatedDatabase(),db=platform.db;
 context.mock.timers.enable({apis:['Date'],now:Date.parse('2030-01-07T10:00:00Z')});
 const background:Promise<unknown>[]=[];
 let release!:()=>void;
 const submitted=new Promise<void>(resolve=>{release=resolve;});
 try{
  const deps=createDependencies(db),actor=createId(),stage=createId();
  await deps.auth.ensureOperator({id:actor,email:'owner@request-timer.test',displayName:'Avery Patel'});
  await deps.workspace.ensureWorkspace({name:'Northstar Studio',timezone:'UTC',currency:'USD',workingHours:{},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});
  await deps.workspace.ensurePipelineStage({id:stage,name:'Proposal',position:1});
  const opportunity=await new WorkbenchRepository(db).createOpportunity({title:'Northstar renewal',companyName:'Northstar Studio',contactName:'Maya Chen',email:'maya@northstar.example',stageId:stage,valueCents:240000},actor);
  const contact=await db.prepare('SELECT contact_id FROM opportunity_contacts WHERE opportunity_id=?').bind(opportunity.id).first<{contact_id:string}>();
  let calls=0,start!:()=>void;
  const started=new Promise<void>(resolve=>{start=resolve;});
  const mail={send:async()=>{calls++;start();await submitted;return{providerMessageId:'synthetic-provider-receipt'};}};
  const app=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})},outboundMail:mail,hosted:true});
  const session=await deps.auth.createSession(actor);
  const request=(path:string,body?:unknown)=>app.request(`https://orbit.test/api/v1/workbench/${path}`,{method:body?'POST':'GET',headers:{Cookie:`__Host-orbit_session=${session.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined},undefined,{waitUntil(promise:Promise<unknown>){background.push(promise);void promise.catch(()=>{});},passThroughOnException(){}} as ExecutionContext);
  const draft=await (await request(`opportunities/${opportunity.id}/drafts`,{contactId:contact!.contact_id,subject:'Renewal details',body:'Here is the exact reviewed renewal.'})).json() as {id:string};
  const approval=await request(`drafts/${draft.id}/approve`,{revision:1,scheduledAt:'2030-01-07T10:02:00Z'});
  assert.equal(approval.status,200);
  const message=await approval.json() as {id:string;state:string};assert.equal(message.state,'scheduled');
  await request(`opportunities/${opportunity.id}/messages`);await Promise.all(background.splice(0));
  assert.equal((await schedulerStatus(db)).lastRunAt,null);assert.equal(calls,0);
  // Another customer's awaiting-response deadline is processed by the same kick.
  const followup=await new WorkbenchRepository(db).createOpportunity({title:'Harbor follow-up',companyName:'Harbor Labs',contactName:'Sam Lee',email:'sam@harbor.example',stageId:stage,valueCents:90000},actor);
  await db.prepare("UPDATE opportunities SET queue_state='next',next_due_at='2030-01-07T10:02:00.000Z' WHERE id=?").bind(followup.id).run();
  context.mock.timers.tick(120001);
  await request(`opportunities/${opportunity.id}/messages`);await Promise.race([started,Promise.all(background).then(()=>{throw new Error('Due request completed without submitting the scheduled message');})]);
  assert.equal((await schedulerStatus(db)).lastRunAt,null,'Request work never claims a Cron tick');
  const cron=runHostedTimers(db,mail);
  await Promise.all([request(`opportunities/${opportunity.id}/messages`),request(`opportunities/${opportunity.id}/messages`)]);
  release();await Promise.all([...background,cron]);
  await runHostedTimers(db,mail);
  const history=await (await request(`opportunities/${opportunity.id}/messages`)).json() as {messages:Array<{id:string;state:string}>};
  assert.equal(history.messages.find(row=>row.id===message.id)?.state,'accepted');assert.equal(calls,1);
  assert.equal(await db.prepare('SELECT attempt_count FROM outbound_messages WHERE id=?').bind(message.id).first('attempt_count'),1);
  assert.equal(await db.prepare('SELECT queue_state FROM opportunities WHERE id=?').bind(followup.id).first('queue_state'),'now');
  assert.equal(await db.prepare("SELECT COUNT(*) FROM timeline_entry_records r JOIN timeline_entries t ON t.id=r.timeline_entry_id WHERE r.record_id=? AND t.kind='queue.now'").bind(followup.id).first('COUNT(*)'),1);
  await Promise.all(background);
  await scheduleReview(context,db,actor,session.token,stage,mail,()=>calls);
 }finally{release();await Promise.allSettled(background);context.mock.timers.reset();await platform.dispose();}
});
