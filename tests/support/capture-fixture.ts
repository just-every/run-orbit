import { isolatedDatabase } from './isolated-database';
import { createDependencies } from './dependencies';
import { createApp } from './app';
import { createId } from '../../src/core/shared/ids';
import { RecordsRepository } from '../../src/core/features/records/repository';
import { OutreachRepository } from '../../src/core/features/workbench/outreach-repository';
import { ApprovalRepository } from '../../src/core/features/outreach/approval-repository';
import { OutreachService } from '../../src/core/features/outreach/service';

/**
 * An Orbit with one account (Acme, acme.example), two contacts, an open
 * opportunity, real accepted sends to both contacts and a scheduled send to Ana.
 * Sends go through Orbit's outreach code; only the mail provider is a fake.
 */
export async function captureFixture() {
  const platform = await isolatedDatabase(), db = platform.db, deps = createDependencies(db), records = new RecordsRepository(db);
  const operator = createId(), stage = createId(), sent: { recipient: string }[] = [];
  await deps.auth.ensureOperator({ id: operator, email: 'seller@orbit.test', displayName: 'Sam Seller' });
  await deps.workspace.ensureWorkspace({ name: 'Capture workspace', timezone: 'UTC', currency: 'USD', workingHours: { days: [1, 2, 3, 4, 5], start: '00:00', end: '23:59' }, staleIntervalDays: 14, awaitingResponseWorkingDays: 5, freeMailDomains: ['freemail.example'] });
  await deps.workspace.ensurePipelineStage({ id: stage, name: 'Qualified', position: 1 });
  const company = (await records.save('company', { name: 'Acme', primary_domain: 'acme.example' }, operator)).id;
  const ana = (await records.save('contact', { name: 'Ana Ruiz', email: 'ana@acme.example', company_id: company }, operator)).id;
  const bob = (await records.save('contact', { name: 'Bob Stone', email: 'bob@acme.example', company_id: company }, operator)).id;
  const opportunity = (await records.save('opportunity', { title: 'Acme rollout', stage_id: stage, company_id: company, value_cents: 500000, contact_ids: [ana, bob], primary_contact_id: ana }, operator)).id;
  const outreach = new OutreachRepository(db), approval = new ApprovalRepository(db);
  const service = new OutreachService(db, { send: async message => { sent.push({ recipient: message.recipient_email }); return { providerMessageId: `provider-${createId()}` }; } });
  const send = async (contactId: string, subject: string) => {
    const draft = await outreach.createDraft(opportunity, { contactId, subject, body: `Reviewed body: ${subject}` }, operator);
    const message = await approval.approve(draft.id, 1, operator, { quietHoursConfirmation: (await approval.preview(draft.id)).localTime });
    await service.submit(message);
    return (await approval.message(message.id)).message_id;
  };
  const anaThread = await send(ana, 'Proposal for Acme'), bobThread = await send(bob, 'Rollout plan');
  const scheduledDraft = await outreach.createDraft(opportunity, { contactId: ana, subject: 'Follow-up', body: 'Scheduled follow-up' }, operator);
  const scheduled = await approval.approve(scheduledDraft.id, 1, operator, { scheduledAt: new Date(Date.now() + 2 * 86400000).toISOString() });
  const unsentDraft = await outreach.createDraft(opportunity, { contactId: ana, subject: 'Unsent idea', body: 'Not yet approved' }, operator);
  const session = await deps.auth.createSession(operator), app = createApp({ database: db, assets: { fetch: async () => new Response('') } });
  const cookie = `__Host-orbit_session=${session.token}`;
  const request = (path: string, init: RequestInit = {}) => app.request(`https://orbit.test${path}`, { ...init, headers: { cookie, origin: 'https://orbit.test', ...init.headers } });
  const upload = (files: { name: string; text: string }[], includeUnknown = false, headers: Record<string, string> = { cookie, origin: 'https://orbit.test' }) => {
    const form = new FormData();
    for (const file of files) form.append('files', new File([file.text], file.name));
    if (includeUnknown) form.append('includeUnknown', 'on');
    return app.request('https://orbit.test/api/v1/capture/imports', { method: 'POST', headers, body: form });
  };
  return { platform, db, deps, app, cookie, operator, company, ana, bob, opportunity, anaThread, bobThread, scheduled: scheduled.id, scheduledDraft: scheduledDraft.id, unsentDraft: unsentDraft.id, sent, request, upload, dispose: () => platform.dispose() };
}
export type CaptureFixture = Awaited<ReturnType<typeof captureFixture>>;

export { eml, fixtureMailbox, unsubscribeMessage } from './capture-mail';
