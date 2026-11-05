import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { isolatedDatabase } from '../support/isolated-database';
import { createDependencies } from '../support/dependencies';
import { createId } from '../../src/core/shared/ids';
import { WorkbenchRepository } from '../../src/core/features/workbench/repository';
import { OutreachRepository } from '../../src/core/features/workbench/outreach-repository';
import { ApprovalRepository } from '../../src/core/features/outreach/approval-repository';
import { OutreachService } from '../../src/core/features/outreach/service';
import { createOutboundMail } from '../../src/core/platform/outbound-mail';
import { createMailEventRoutes } from '../../src/core/features/outreach/provider-routes';
import { signRelayBody } from '../../src/base/sendgrid-event-relay/crypto';
import { createApp } from '../support/app';
import { runOrbitTimers } from '../../src/core/features/outreach/timing-repository';

for (const status of [202, 408]) test(`SendGrid ${status} persists honest outcome, never resubmits, and reconciles real evidence`, async context => {
  const platform = await isolatedDatabase();
  try {
    const db = platform.db, deps = createDependencies(db), actor = createId(), stage = createId();
    await deps.auth.ensureOperator({ id: actor, email: 'owner@test.invalid', displayName: 'Owner' });
    await deps.workspace.ensureWorkspace({ name: 'Receipt test', timezone: 'UTC', currency: 'USD', workingHours: { days: [1,2,3,4,5], start: '08:00', end: '18:00' }, staleIntervalDays: 14, awaitingResponseWorkingDays: 5, freeMailDomains: [] });
    await deps.workspace.ensurePipelineStage({ id: stage, name: 'First', position: 0 });
    const opportunity = await new WorkbenchRepository(db).createOpportunity({ title: 'Reviewed outreach', companyName: 'Customer', contactName: 'Contact', email: 'customer@test.invalid', stageId: stage, valueCents: 0 }, actor);
    const contact = await db.prepare('SELECT contact_id FROM opportunity_contacts WHERE opportunity_id=?').bind(opportunity.id).first<{contact_id:string}>();
    const approval = new ApprovalRepository(db);
    const draft = await new OutreachRepository(db).createDraft(opportunity.id, { contactId: contact!.contact_id, subject: 'Reviewed subject', body: 'Reviewed body' }, actor);
    const message = await approval.approve(draft.id, 1, actor, { quietHoursConfirmation: (await approval.preview(draft.id)).localTime });
    let sends = 0, lookups = 0;
    const originalFetch = globalThis.fetch;
    context.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === 'https://api.sendgrid.com/v3/mail/send') {
        sends++;
        const body = JSON.parse(String(init?.body));
        assert.equal(body.custom_args.rer_delivery_id, message.idempotency_key);
        return new Response(null, { status });
      }
      if (String(input).startsWith('https://api.sendgrid.com/v3/messages?')) {
        lookups++;
        assert.ok(new URL(String(input)).searchParams.get('query')?.includes(message.idempotency_key));
        return Response.json({ messages: [{ msg_id: 'provider-verified-receipt', status: 'processed' }] });
      }
      return originalFetch(input, init);
    });
    const mail = createOutboundMail({ SENDGRID_API_KEY: 'test-key', MAIL_FROM: 'owner@test.invalid', SENDGRID_UNSUBSCRIBE_GROUP_ID: '1', MAIL_REPLY_TO: 'reply@test.invalid' })!;
    const service = new OutreachService(db, mail);
    assert.equal((await service.submit(message)).state, status === 202 ? 'accepted' : 'delivery-unknown');
    assert.equal((await approval.message(message.id)).provider_message_id, null);
    assert.equal(sends, 1);
    await service.dispatchDue(new Date(Date.now() + 600_000));
    await service.reconcile(new Date(Date.now() + 600_000));
    assert.equal(sends, 1);
    assert.equal(lookups, status === 202 ? 0 : 1);
    assert.equal((await approval.message(message.id)).state, 'accepted');
    // The signed durable delivery key, not a fabricated provider ID, establishes delivery.
    const secret = 'test-relay-secret-'.repeat(3), timestamp = String(Math.floor(Date.now() / 1000));
    const body = JSON.stringify([{ sg_event_id: createId(), event: 'delivered', timestamp: Number(timestamp), email: 'customer@test.invalid', sg_message_id: 'actual-delivery-receipt', rer_product: 'orbit', rer_delivery_id: message.idempotency_key }]);
    const signature = await signRelayBody(secret, timestamp, body);
    const app = createMailEventRoutes(db, { relaySecret: secret });
    const post = () => app.request('https://orbit.test/relay', { method: 'POST', headers: { 'x-rer-mail-timestamp': timestamp, 'x-rer-mail-signature': signature }, body });
    assert.equal((await post()).status, 200);
    assert.equal((await post()).status, 200);
    assert.equal((await approval.message(message.id)).state, 'delivered');
    assert.equal(sends, 1);
    if(status===408)await unresolvedReadback(db,actor,stage,context);
  } finally { context.mock.restoreAll(); await platform.dispose(); }
});

/** Exercise the real transports and authenticated reads while only the provider HTTP edges fail. */
async function unresolvedReadback(db:D1Database,actor:string,stage:string,context:TestContext){
  context.mock.timers.enable({apis:['Date'],now:Date.parse('2030-01-07T10:00:00Z')});
  try{
    const session=await createDependencies(db).auth.createSession(actor),relayUrl='https://managed-mail.example.test/send';
    for(const provider of ['sendgrid','rer'] as const){
      const opportunity=await new WorkbenchRepository(db).createOpportunity({title:`synthetic-orbit-${provider}`,companyName:'Customer',contactName:'Contact',email:[createId(),'test.invalid'].join('@'),stageId:stage,valueCents:0},actor);
      const contact=await db.prepare('SELECT contact_id FROM opportunity_contacts WHERE opportunity_id=?').bind(opportunity.id).first<{contact_id:string}>();
      const mail=createOutboundMail({DB:db,AUTH_ORIGIN:'https://orbit.test',MAIL_PROVIDER:provider,MAIL_FROM:['sender','test.invalid'].join('@'),MAIL_REPLY_TO:['reply','test.invalid'].join('@'),SENDGRID_API_KEY:'synthetic-orbit-4',SENDGRID_UNSUBSCRIBE_GROUP_ID:'1',MAIL_RELAY_URL:relayUrl,MAIL_API_KEY:'synthetic-orbit-5'})!;
      if(provider==='rer')assert.equal(mail.lookup,undefined,'Managed relay has no acceptance lookup');
      const app=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})},outboundMail:mail}),approval=new ApprovalRepository(db);
      const api=async<T=any>(path:string,body?:unknown,status=200)=>{
        const response=await app.request(`https://orbit.test/api/v1/${path}`,{method:body?'POST':'GET',headers:{Cookie:`__Host-orbit_session=${session.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
        assert.equal(response.status,status,path);return await response.json() as T;
      };
      const draft=await api<{id:string}>(`workbench/opportunities/${opportunity.id}/drafts`,{contactId:contact!.contact_id,subject:'synthetic-orbit-6',body:'Reviewed unresolved message'},201);
      let sends=0,lookups=0,key='';
      const originalFetch=globalThis.fetch;
      context.mock.method(globalThis,'fetch',async(input:RequestInfo|URL,init?:RequestInit)=>{
        const url=new URL(String(input));
        if(url.href==='https://api.sendgrid.com/v3/mail/send'||url.href===relayUrl){
          sends++;
          const intent=await db.prepare('SELECT idempotency_key,state FROM outbound_messages WHERE draft_id=?').bind(draft.id).first<{idempotency_key:string;state:string}>();assert.ok(intent);assert.equal(intent.state,'queued');key=intent.idempotency_key;
          const wire=JSON.parse(String(init?.body));
          if(provider==='sendgrid')assert.equal(wire.custom_args.rer_delivery_id,key);
          else{const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key));assert.equal(wire.messageKey,`orbit:${Buffer.from(digest).toString('hex')}`);}
          return new Response(null,{status:408});
        }
        if(url.origin==='https://api.sendgrid.com'&&url.pathname==='/v3/messages'){
          lookups++;assert.equal(provider,'sendgrid','Managed relay must never attempt a provider lookup');
          assert.equal(url.searchParams.get('query'),`unique_args['rer_delivery_id']="${key}"`);
          return new Response(null,{status:403});
        }
        return originalFetch(input,init);
      });
      const approved=await api<{id:string;state:string}>(`workbench/drafts/${draft.id}/approve`,{revision:1},502);assert.equal(approved.state,'delivery-unknown');
      const read=async()=>{
        const result=await api<{messages:{id:string;state:string;failure:string|null;retryAfter:string|null;providerMessageId:string|null;acceptedAt:string|null}[];outcomes:{accepted:number}}>(`workbench/opportunities/${opportunity.id}/messages`);
        assert.equal(result.outcomes.accepted,0);assert.equal(result.messages.length,1);assert.equal(result.messages[0]!.id,approved.id);assert.equal(result.messages[0]!.providerMessageId,null);assert.equal(result.messages[0]!.acceptedAt,null);
        return result.messages[0]!;
      };
      assert.equal((await read()).state,'delivery-unknown');assert.equal(sends,1);assert.equal(lookups,0);
      for(let attempt=1;attempt<=2;attempt++){
        context.mock.timers.tick(299999);await runOrbitTimers(db,mail);assert.equal(lookups,provider==='sendgrid'?attempt-1:0);
        context.mock.timers.tick(1);await runOrbitTimers(db,mail);
        const visible=await read();assert.equal(visible.state,'delivery-unknown');assert.equal(visible.retryAfter,new Date(Date.now()+300000).toISOString());
        assert.match(visible.failure!,provider==='sendgrid'?/Email Activity lookup failed \(403\).*Email Activity API access/:/Managed mail acceptance is unresolved.*automatic resend is disabled/);
        assert.equal(sends,1);assert.equal(lookups,provider==='sendgrid'?attempt:0);
      }
      const intent=await approval.message(approved.id),deadline=Date.parse(intent.first_attempt_at!)+86400000;
      context.mock.timers.tick(deadline-Date.now()-1);await runOrbitTimers(db,mail);assert.equal((await read()).state,'delivery-unknown','Neither transport claims a terminal result before the deadline');
      const beforeDeadlineLookups=lookups;
      context.mock.timers.tick(300000);await runOrbitTimers(db,mail);
      const terminal=await read();
      if(provider==='sendgrid'){
        assert.equal(terminal.state,'failed');assert.match(terminal.failure!,/acceptance remained unresolved for 24 hours/);
        assert.equal(lookups,beforeDeadlineLookups);
        const notices=await api<{notifications:{id:string;opportunityId:string;kind:string}[]}>('notifications');
        assert.equal(notices.notifications.filter(row=>row.opportunityId===opportunity.id&&row.kind==='message.failed').length,1,'The responsible operator sees the terminal failure once');
      }else{
        assert.equal(terminal.state,'delivery-unknown');assert.match(terminal.failure!,/Reconcile with the recipient or hosting provider before resending/);assert.equal(lookups,0);
      }
      context.mock.timers.tick(86400000);await runOrbitTimers(db,mail);await new OutreachService(db,mail).reconcile();
      const final=await read();assert.equal(final.state,terminal.state);assert.equal(sends,1);assert.equal(lookups,beforeDeadlineLookups);
      const saved=await approval.message(approved.id);assert.equal(saved.idempotency_key,key);assert.equal(saved.attempt_count,1);
      const notices=await api<{notifications:{opportunityId:string;kind:string}[]}>('notifications');
      assert.equal(notices.notifications.filter(row=>row.opportunityId===opportunity.id&&row.kind==='message.failed').length,provider==='sendgrid'?1:0);
      console.log(`PROBE OUT-011 ${provider}: authenticated message read after failed provider response and timers beyond 24 hours -> ${final.state}; submissions=1 lookups=${lookups}`);
    }
  }finally{context.mock.timers.reset();}
}
