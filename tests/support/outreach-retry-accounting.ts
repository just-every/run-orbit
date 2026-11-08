import assert from 'node:assert/strict';
import type {TestContext} from 'node:test';
import {createApp} from './app';
import {createOutboundMail} from '../../src/core/platform/outbound-mail';
import {runHostedTimers} from '../../src/core/features/outreach/scheduler';
import {ApprovalRepository} from '../../src/core/features/outreach/approval-repository';
import type {RenderReview} from '../../src/core/features/drafts/render';

interface User {id:string;token:string}
interface Usage {id:string;used:number;remaining:number;budget:number}
interface WireMessage {
 subject:string;
 content:{type:string;value:string}[];
 personalizations:{to:{email:string}[]}[];
 custom_args:Record<string,string>;
 headers:Record<string,string>;
}

/** A provider retry spends one unit for the saved message, through native review and Settings. */
export async function proveRetryAccounting(input:{db:D1Database;context:TestContext;sender:User;other:User;owner:User;opportunityId:string;contactId:string}) {
 const {db,context,sender,other,owner,opportunityId,contactId}=input;
 const address=['synthetic-orbit-137','test.invalid'].join('@');
 const mail=createOutboundMail({DB:db,MAIL_PROVIDER:'sendgrid',SENDGRID_API_KEY:'synthetic-orbit-137',MAIL_FROM:address,MAIL_REPLY_TO:address,SENDGRID_UNSUBSCRIBE_GROUP_ID:'1'});
 assert.ok(mail);assert.equal(mail.provider,'sendgrid');
 const app=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})},outboundMail:mail});
 const api=async<T>(user:User,path:string,method='GET',body?:unknown,status=200)=>{
  const response=await app.request(`https://orbit.test/api/v1${path}`,{method,headers:{Cookie:`__Host-orbit_session=${user.token}`,Origin:'https://orbit.test','Content-Type':['application','json'].join('/')},body:body===undefined?undefined:JSON.stringify(body)});
  assert.equal(response.status,status,await response.clone().text());
  return await response.json() as T;
 };
 const capacity=async(user:User)=>(await api<{users:Usage[]}>(user,'/settings/sending')).users;
 const baseline=await capacity(owner),ownBefore=(await capacity(sender))[0]!;
 const otherBefore=await capacity(other);
 assert.equal(ownBefore.id,sender.id);assert.equal(ownBefore.used,0);
 assert.ok(otherBefore[0]!.used>0,'Isolation is checked against another sender with real usage');
 const usage=async(spent:number)=>{
  assert.deepEqual(await capacity(sender),[{...ownBefore,used:spent,remaining:ownBefore.remaining-spent}],'Settings charges the sender once for the saved message');
  assert.deepEqual(await capacity(other),otherBefore,'The other sender keeps their existing usage and remaining budget');
  assert.deepEqual(await capacity(owner),baseline.map(row=>row.id===sender.id?{...row,used:row.used+spent,remaining:row.remaining-spent}:row),'Every other user keeps the same usage');
 };
 const submissions:WireMessage[]=[];
 const edge=context.mock.method(globalThis,'fetch',async(url:string|URL|Request,init?:RequestInit)=>{
  assert.equal(String(url),'https://api.sendgrid.com/v3/mail/send');assert.equal(init?.method,'POST');
  submissions.push(JSON.parse(String(init?.body)) as WireMessage);
  assert.ok(submissions.length<=2,'Only the initial attempt and its due retry may reach SendGrid');
  return submissions.length===1?new Response(null,{status:429}):new Response(null,{status:202,headers:{'x-message-id':'synthetic-orbit-137-accepted'}});
 });
 try {
  const content={contactId,subject:'synthetic-orbit-137 retry accounting',body:'Exact saved body for one reviewed message.'};
  const draft=await api<{id:string}>(sender,`/workbench/opportunities/${opportunityId}/drafts`,'POST',content,201);
  const saved=(await api<{draft:{revision:number;recipientEmail:string;subject:string;body:string}}>(sender,`/drafts/${draft.id}`)).draft;
  assert.equal(saved.subject,content.subject);assert.equal(saved.body,content.body);
  const review=await api<RenderReview>(sender,`/library/drafts/${draft.id}/render`);
  assert.equal(review.recipientEmail,saved.recipientEmail);assert.equal(review.subject,saved.subject);assert.equal(review.body,saved.body);
  assert.equal((await api<RenderReview>(sender,`/library/drafts/${draft.id}/render`,'POST',{revision:saved.revision,reviewHash:review.reviewHash})).reviewed,true);
  const due=Date.now()+60000,scheduledAt=new Date(due).toISOString();
  const preview=await api<{scheduledAt:string}>(sender,`/workbench/drafts/${draft.id}/approval-preview?scheduledAt=${encodeURIComponent(scheduledAt)}`);
  assert.equal(preview.scheduledAt,scheduledAt);
  const approval={revision:saved.revision,scheduledAt,scheduledAtConfirmation:preview.scheduledAt};
  const message=await api<{id:string;state:string}>(sender,`/workbench/drafts/${draft.id}/approve`,'POST',approval);
  assert.equal(message.state,'scheduled');assert.equal(submissions.length,0);await usage(0);
  const read=async()=>{
   const {messages}=await api<{messages:{id:string;draftId:string;revision:number;state:string;recipientEmail:string;subject:string;body:string;providerMessageId:string|null;retryAfter:string|null}[]}>(sender,`/workbench/opportunities/${opportunityId}/messages`);
   const matches=messages.filter(row=>row.draftId===draft.id);
   assert.equal(matches.length,1,'Repeated approval never creates another saved message');
   const current=matches[0]!;
   assert.equal(current.id,message.id);assert.equal(current.revision,saved.revision);
   assert.equal(current.recipientEmail,saved.recipientEmail);assert.equal(current.subject,saved.subject);assert.equal(current.body,saved.body);
   return current;
  };
  const repeat=()=>api<{error:string}>(sender,`/workbench/drafts/${draft.id}/approve`,'POST',{revision:saved.revision},409);
  context.mock.timers.setTime(due);await runHostedTimers(db,mail);
  const deferred=await read();assert.equal(deferred.state,'scheduled');assert.equal(deferred.providerMessageId,null);
  assert.equal(submissions.length,1);await usage(1);
  assert.equal(deferred.retryAfter,new Date(due+60000).toISOString());
  const first=await new ApprovalRepository(db).message(message.id);
  assert.equal(first.attempt_count,1);assert.equal(first.draft_id,draft.id);
  assert.match((await repeat()).error,/already approved/);assert.equal(submissions.length,1);await usage(1);
  await runHostedTimers(db,mail);assert.equal(submissions.length,1,'A retry cannot run before its due time');await usage(1);
  context.mock.timers.setTime(due+60000);await runHostedTimers(db,mail);
  const accepted=await read();assert.equal(accepted.state,'accepted');assert.equal(accepted.providerMessageId,'synthetic-orbit-137-accepted');
  assert.equal(submissions.length,2);await usage(1);
  const second=await new ApprovalRepository(db).message(message.id);
  assert.equal(second.attempt_count,2);assert.equal(second.idempotency_key,first.idempotency_key);assert.equal(second.first_attempt_at,first.first_attempt_at);
  assert.deepEqual(submissions[1],submissions[0],'The due retry submits the same exact message and delivery identity');
  const wire=submissions[0]!;
  assert.equal(wire.subject,saved.subject);assert.deepEqual(wire.content,[{type:['text','plain'].join('/'),value:saved.body}]);
  assert.deepEqual(wire.personalizations[0]!.to,[{email:saved.recipientEmail}]);
  assert.equal(wire.custom_args.rer_delivery_id,first.idempotency_key);
  assert.equal(wire.headers['Message-ID'],first.message_id);
  assert.match((await repeat()).error,/already approved/);
  context.mock.timers.setTime(due+120000);await runHostedTimers(db,mail);await runHostedTimers(db,mail);
  assert.equal(submissions.length,2,'Accepted mail and repeated approval never submit again');await usage(1);assert.equal((await read()).state,'accepted');
 } finally {edge.mock.restore();}
}
