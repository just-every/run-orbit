import {deliveryOutcomes} from '../support/sanity-delivery-outcomes';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createApp} from '../support/app';
import {isolatedDatabase} from '../support/isolated-database';
import {createDependencies} from '../support/dependencies';
import {createId} from '../../src/core/shared/ids';
import {WorkbenchRepository} from '../../src/core/features/workbench/repository';
import {OutreachRepository} from '../../src/core/features/workbench/outreach-repository';
import {ApprovalRepository} from '../../src/core/features/outreach/approval-repository';
import {OutreachService} from '../../src/core/features/outreach/service';
import {SendGridSendError} from '../../src/base/modules/mail/src/sendgrid-email/index.mjs';
async function fixture(db:D1Database){const deps=createDependencies(db),actor=createId(),stage=createId();await deps.auth.ensureOperator({id:actor,email:`${actor}@test.invalid`,displayName:'Limits operator'});await deps.workspace.ensureWorkspace({name:'Limits',timezone:'UTC',currency:'USD',workingHours:{days:[1,2,3,4,5],start:'08:00',end:'18:00'},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});await deps.workspace.ensurePipelineStage({id:stage,name:'First',position:0});const opportunity=await new WorkbenchRepository(db).createOpportunity({title:'Limits acceptance',companyName:'Limit company',contactName:'Limit contact',email:`${createId()}@test.invalid`,stageId:stage,valueCents:0},actor);const contact=await db.prepare('SELECT contact_id FROM opportunity_contacts WHERE opportunity_id=?').bind(opportunity.id).first<{contact_id:string}>();return{actor,opportunityId:opportunity.id,contactId:contact!.contact_id};}
test('OUT-010 OUT-018 one user\'s volume never consumes another\'s budget and every deferral names its limit',async context=>{
 const p=await isolatedDatabase();context.mock.timers.enable({apis:['Date'],now:Date.parse('2030-01-07T10:00:00Z')});try{
  const db=p.db,f=await fixture(db),deps=createDependencies(db),approval=new ApprovalRepository(db),outreach=new OutreachRepository(db);let calls=0;
  await db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(f.actor).run();
  const users=[f.actor];for(let i=1;i<12;i++){const id=createId();await deps.auth.ensureOperator({id,email:`${id}@test.invalid`,displayName:`Seller ${String(i).padStart(2,'0')}`});users.push(id);}
  const [owner,heavy,lowered,other]=users as [string,string,string,string];
  const app=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})},outboundMail:{send:async()=>{calls++;return{providerMessageId:`limits-${calls}`};}}});
  const sessions=new Map<string,string>();for(const user of users)sessions.set(user,(await deps.auth.createSession(user)).token);
  const api=async<T=any>(user:string,path:string,method='GET',body?:unknown)=>{const response=await app.request(`https://orbit.test/api/v1/${path}`,{method,headers:{Cookie:`__Host-orbit_session=${sessions.get(user)}`,Origin:'https://orbit.test','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,body:await response.json() as T};};
  const initial=await api<{users:{id:string;budget:number}[]}>(owner,'settings/sending');
  const defaultBudget=initial.body.users.find(user=>user.id===heavy)!.budget;
  const history=(user:string,count:number,minutesAgo:number)=>db.batch(Array.from({length:count},(_,i)=>{const id=createId(),at=new Date(Date.now()-minutesAgo*60000+i).toISOString();return db.prepare("INSERT INTO outbound_messages(id,revision,opportunity_id,operator_id,contact_id,recipient_email,subject,body,state,created_at,updated_at,idempotency_key,message_id,approved_at,claimed_at) VALUES(?,1,?,?,?,'test@example.invalid','Historical approved mail','Test fixture','accepted',?,?,?,?,?,?)").bind(id,f.opportunityId,user,f.contactId,at,at,id,`<${id}@test.invalid>`,at,at);}));
  const send=async(user:string,subject:string)=>{const created=await api<{id:string}>(user,`workbench/opportunities/${f.opportunityId}/drafts`,'POST',{contactId:f.contactId,subject,body:'Exact reviewed body'});assert.equal(created.status,201);return api<{id:string;state:string;error?:string;retryAfter?:string}>(user,`workbench/drafts/${created.body.id}/approve`,'POST',{revision:1});};
  assert.equal((await api(other,`settings/sending/operators/${lowered}`,'PUT',{oneToOnePerDay:50})).status,403,'Only the owner changes budgets until TEAM-005');
  assert.equal((await api(owner,`settings/sending/operators/${lowered}`,'PUT',{oneToOnePerDay:50})).status,200);
  const changed=await db.prepare("SELECT actor_id,details_json FROM audit_entries WHERE action='sending.budget.changed' AND entity_id=?").bind(lowered).first<{actor_id:string;details_json:string}>();assert.equal(changed!.actor_id,owner);assert.deepEqual(JSON.parse(changed!.details_json),{budget:'one-to-one',previous:defaultBudget,current:50});
  for(const user of users)await history(user,user===heavy?defaultBudget:user===lowered?50:40,120);
  const heavyHeld=await send(heavy,'Over the default budget');assert.equal(heavyHeld.status,409);assert.equal(heavyHeld.body.state,'draft');assert.match(heavyHeld.body.error!,new RegExp(`one-to-one budget of ${defaultBudget} messages a rolling day`));assert.equal(heavyHeld.body.retryAfter,new Date(Date.parse('2030-01-08T08:00:00Z')).toISOString());
  const loweredHeld=await send(lowered,'Over a lowered budget');assert.equal(loweredHeld.status,409);assert.match(loweredHeld.body.error!,/one-to-one budget of 50 messages a rolling day/);
  for(const user of users.filter(user=>user!==heavy&&user!==lowered))assert.equal((await send(user,'Within my own budget')).body.state,'accepted','Another user\'s volume never holds this user\'s mail');
  assert.equal(calls,10);
  const own=await api<{users:{id:string;used:number;remaining:number;budget:number}[]}>(lowered,'settings/sending');assert.deepEqual(own.body.users.map(user=>[user.id,user.used,user.remaining,user.budget]),[[lowered,50,0,50]],'A user sees their own budget');
  const all=await api<{users:{id:string;used:number;remaining:number}[];shared:{perMinute:number}}>(owner,'settings/sending');assert.equal(all.body.users.length,12);assert.deepEqual(all.body.users.find(user=>user.id===other),{...all.body.users.find(user=>user.id===other),used:41,remaining:defaultBudget-41});
  assert.equal((await api(owner,'settings/sending/shared','PUT',{perMinute:10})).status,200);assert.ok(await db.prepare("SELECT 1 FROM audit_entries WHERE action='sending.shared_rate.changed' AND actor_id=?").bind(owner).first());
  const rateHeld=await send(other,'Over the shared rate');assert.equal(rateHeld.status,409);assert.match(rateHeld.body.error!,/shared sending rate of 10 messages a minute/);assert.doesNotMatch(rateHeld.body.error!,/one-to-one/);assert.ok(Date.parse(rateHeld.body.retryAfter!)<=Date.now()+60000);
  const service=new OutreachService(db,{send:async()=>{calls++;return{providerMessageId:'never-without-review'};}});
  context.mock.timers.setTime(Date.parse('2030-01-09T10:00:00Z'));await service.dispatchDue();assert.equal(calls,10,'A held message is never retried without operator action');
  assert.equal((await api(owner,'settings/sending/shared','PUT',{perMinute:null})).status,200);
  const retried=await api<{state:string}>(lowered,`workbench/messages/${loweredHeld.body.id}/retry`,'POST',{});assert.equal(retried.body.state,'accepted');assert.equal(calls,11);
 }finally{context.mock.timers.reset();await p.dispose();}
});
test('OUT-002 OUT-003 OUT-005 OUT-006 OUT-007 OUT-011 OUT-012 bounded provider submission, reconciliation and signed receipts retain honest outcomes and never revive stopped work',async context=>{await deliveryOutcomes(context);});
