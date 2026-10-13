import assert from 'node:assert/strict';
import { test } from 'node:test';
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
  } finally { context.mock.restoreAll(); await platform.dispose(); }
});
