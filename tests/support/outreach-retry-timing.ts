import assert from 'node:assert/strict';
import type {TestContext} from 'node:test';
import {createApp} from './app';
import {createDependencies} from './dependencies';
import {createOutboundMail} from '../../src/core/platform/outbound-mail';
import {OutreachService} from '../../src/core/features/outreach/service';

type Fixture = {actor:string;opportunityId:string;contactId:string};
type HistoryMessage = {id:string;draftId:string;revision:number;state:string;recipientEmail:string;subject:string;body:string;failure:string|null;retryAfter:string|null;providerMessageId:string|null;acceptedAt:string|null};

/** The native provider retry boundary, separate from retry exhaustion and budget accounting. */
export async function assertProviderRetryTiming(context:TestContext, db:D1Database, fixture:Fixture) {
  context.mock.timers.setTime(Date.parse('2030-01-08T10:00:00Z'));
  const address = (name:string) => [name,'example.test'].join('@');
  const mail = createOutboundMail({DB:db,SENDGRID_API_KEY:'synthetic-orbit-1',MAIL_FROM:address('synthetic-orbit-2'),MAIL_REPLY_TO:address('synthetic-orbit-3'),SENDGRID_UNSUBSCRIBE_GROUP_ID:'1'});
  assert.ok(mail, 'Use the configured production SendGrid adapter');
  const nativeFetch = globalThis.fetch;
  const submissions:{at:number;method:string;body:string}[] = [];
  const providerReceipt = 'synthetic-orbit-4';
  const edge = context.mock.method(globalThis,'fetch',async (input:RequestInfo|URL,init?:RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.hostname !== 'api.sendgrid.com') return nativeFetch(input,init);
    submissions.push({at:Date.now(),method:init?.method??'GET',body:String(init?.body)});
    assert.equal(url.href,'https://api.sendgrid.com/v3/mail/send');
    return submissions.length === 1 ? new Response(null,{status:429}) : new Response(null,{status:202,headers:{'x-message-id':providerReceipt}});
  });
  try {
    const session = await createDependencies(db).auth.createSession(fixture.actor);
    const app = createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})},outboundMail:mail});
    const api = async <T>(path:string,method='GET',body?:unknown) => {
      const response = await app.request(`https://orbit.test/api/v1/${path}`,{method,headers:{Cookie:`__Host-orbit_session=${session.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
      return {status:response.status,body:await response.json() as T};
    };
    const historyPath = `workbench/opportunities/${fixture.opportunityId}/messages`;
    const history = async () => {
      const response = await api<{messages:HistoryMessage[];mailProvider:string}>(historyPath);
      assert.equal(response.status,200);
      assert.equal(response.body.mailProvider,'sendgrid');
      return response.body.messages;
    };
    const before = await history();
    const content = {contactId:fixture.contactId,subject:'Provider retry boundary',body:'Exact content reviewed before the provider throttle.'};
    const draft = await api<{id:string}>(`workbench/opportunities/${fixture.opportunityId}/drafts`,'POST',content);
    assert.equal(draft.status,201);
    const saved = await api<{draft:{revision:number;recipientEmail:string;subject:string;body:string}}>(`drafts/${draft.body.id}`);
    assert.equal(saved.status,200);
    assert.equal(saved.body.draft.subject,content.subject);
    assert.equal(saved.body.draft.body,content.body);
    assert.equal(submissions.length,0,'Saving and reading the exact content never submits it');
    const approved = await api<{id:string;state:string}>(`workbench/drafts/${draft.body.id}/approve`,'POST',{revision:saved.body.draft.revision});
    assert.equal(approved.status,502,'A throttled attempt is not reported as provider acceptance');
    assert.equal(approved.body.state,'scheduled');
    assert.equal(submissions.length,1,'Only the SendGrid HTTP edge returned the throttle');
    assert.equal(submissions[0]!.method,'POST');
    const wire = JSON.parse(submissions[0]!.body);
    assert.deepEqual(wire.personalizations,[{to:[{email:saved.body.draft.recipientEmail}]}]);
    assert.equal(wire.subject,content.subject);
    assert.deepEqual(wire.content,[{type:['text','plain'].join('/'),value:content.body}]);
    const unsentRows = await history();
    assert.equal(unsentRows.length,before.length+1);
    const unsent = unsentRows.find(message=>message.id===approved.body.id);
    assert.ok(unsent,'Fresh authenticated history returns the same approved message');
    assert.equal(unsent.draftId,draft.body.id);
    assert.equal(unsent.revision,saved.body.draft.revision);
    assert.equal(unsent.state,'scheduled');
    assert.match(unsent.failure!,/SendGrid.*rate limit/i);
    assert.equal(unsent.providerMessageId,null);
    assert.equal(unsent.acceptedAt,null);
    assert.equal(unsent.subject,content.subject);
    assert.equal(unsent.body,content.body);
    assert.ok(unsent.retryAfter);
    const retryAt = Date.parse(unsent.retryAfter);
    assert.ok(Number.isFinite(retryAt) && retryAt>Date.now(),'The visible retry time must be in the future');
    assert.equal((await app.request(`https://orbit.test/api/v1/${historyPath}`)).status,401,'History requires an operator session');
    const service = new OutreachService(db,mail);
    context.mock.timers.setTime(retryAt-1);
    await service.dispatchDue();
    assert.equal(submissions.length,1,'Dispatch immediately before the returned time must not submit');
    assert.deepEqual((await history()).find(message=>message.id===unsent.id),unsent,'The same unsent state and retry time remain visible');
    context.mock.timers.setTime(retryAt);
    await service.dispatchDue();
    assert.equal(submissions.length,2,'Dispatch at the returned time submits exactly once');
    assert.equal(submissions[1]!.at,retryAt);
    assert.equal(submissions[1]!.method,'POST');
    assert.equal(submissions[1]!.body,submissions[0]!.body,'Retry preserves the exact approved envelope and durable delivery identity');
    const acceptedRows = await history();
    assert.deepEqual(acceptedRows.map(message=>message.id).sort(),unsentRows.map(message=>message.id).sort(),'Retry creates no new message');
    const accepted = acceptedRows.find(message=>message.id===unsent.id)!;
    assert.equal(accepted.draftId,unsent.draftId);
    assert.equal(accepted.revision,unsent.revision);
    assert.equal(accepted.state,'accepted');
    assert.equal(accepted.providerMessageId,providerReceipt);
    assert.equal(accepted.acceptedAt,new Date(retryAt).toISOString());
    assert.equal(accepted.failure,null);
    assert.equal(accepted.subject,content.subject);
    assert.equal(accepted.body,content.body);
    await service.dispatchDue();
    context.mock.timers.setTime(retryAt+60000);
    await service.dispatchDue();
    assert.equal(submissions.length,2,'Later dispatches never resubmit the accepted message');
    assert.deepEqual((await history()).find(message=>message.id===unsent.id),accepted);
    context.diagnostic(JSON.stringify({proof:'OUT-026 provider retry timing',messageId:unsent.id,retryAfter:unsent.retryAfter,beforeRetryAt:new Date(retryAt-1).toISOString(),submissionTimes:submissions.map(submission=>new Date(submission.at).toISOString()),providerMessageId:accepted.providerMessageId,acceptedAt:accepted.acceptedAt}));
  } finally {
    edge.mock.restore();
  }
}
