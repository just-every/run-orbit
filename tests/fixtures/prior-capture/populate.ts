// Populates an Orbit store with the code of main ce67062, the main before mail
// and calendar capture, through its own signed-ingestion route and outreach code.
// Run from a checkout of that commit: tsx tests/fixtures/prior-capture/populate.ts OUT_DIR
// It writes store.sqlite.gz (the D1 file) and capture.json (the IDs it made).
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { isolatedDatabase } from '../../support/isolated-database';
import { createDependencies } from '../../support/dependencies';
import { createId } from '../../../src/core/shared/ids';
import { createSourceSecurity } from '../../../src/core/platform/source-security';
import { createSignalIngress } from '../../../src/core/features/ingestion/routes';
import { IngestionRepository } from '../../../src/core/features/ingestion/repository';
import { signSource } from '../../../src/core/features/ingestion/booking-webhooks';
import { RecordsRepository } from '../../../src/core/features/records/repository';
import { ManualRepository } from '../../../src/core/features/records/manual';
import { OutreachRepository } from '../../../src/core/features/workbench/outreach-repository';
import { ApprovalRepository } from '../../../src/core/features/outreach/approval-repository';
import { OutreachService } from '../../../src/core/features/outreach/service';

const out = process.argv[2];
if (!out) throw new Error('Usage: populate.ts OUT_DIR');
const platform = await isolatedDatabase(), db = platform.db, deps = createDependencies(db), records = new RecordsRepository(db);
const operator = createId(), stage = createId(), source = 'prior-tool', secret = 'prior-signing-secret-'.repeat(3);
await deps.auth.ensureOperator({ id: operator, email: 'owner@prior.example', displayName: 'Prior Owner' });
await deps.workspace.ensureWorkspace({ name: 'Prior workspace', timezone: 'UTC', currency: 'USD', workingHours: { days: [1, 2, 3, 4, 5], start: '00:00', end: '23:59' }, staleIntervalDays: 14, awaitingResponseWorkingDays: 5, freeMailDomains: ['gmail.com'] });
await deps.workspace.ensurePipelineStage({ id: stage, name: 'Qualified', position: 1 });
const company = (await records.save('company', { name: 'Prior Acme', primary_domain: 'prior-acme.example' }, operator)).id;
const ana = (await records.save('contact', { name: 'Ana Prior', email: 'ana@prior-acme.example', company_id: company }, operator)).id;
const bob = (await records.save('contact', { name: 'Bob Prior', email: 'bob@prior-acme.example', company_id: company }, operator)).id;
const opportunity = (await records.save('opportunity', { title: 'Prior rollout', stage_id: stage, company_id: company, value_cents: 250000, contact_ids: [ana, bob], primary_contact_id: ana }, operator)).id;
await new ManualRepository(db).save('company', company, { kind: 'note', text: 'Met the prior team in person', occurredAt: new Date().toISOString() }, operator);

// Real signals through the signed route: a linked reply, an unlinked page view and a booked meeting.
const security = createSourceSecurity({ ORBIT_ENCRYPTION_KEY: '55'.repeat(32) })!, ingress = createSignalIngress(db, security);
await new IngestionRepository(db).configure({ id: source, name: 'Prior signed tool', enabled: true, secret }, security);
for (const event of [
  { eventId: 'prior-reply-1', type: 'email.replied', subject: 'Prior reply', occurredAt: new Date(Date.now() - 3600000).toISOString(), email: 'ana@prior-acme.example' },
  { eventId: 'prior-view-1', type: 'page.viewed', subject: 'Pricing page', occurredAt: new Date(Date.now() - 1800000).toISOString(), email: 'ana@prior-acme.example' },
  { eventId: 'prior-meeting-1', type: 'meeting.booked', subject: 'Prior meeting', occurredAt: new Date(Date.now() - 900000).toISOString(), email: 'bob@prior-acme.example' },
]) {
  const raw = JSON.stringify(event), timestamp = String(Math.floor(Date.now() / 1000));
  const response = await ingress.request(`https://orbit.test/${source}`, { method: 'POST', headers: { 'X-Orbit-Timestamp': timestamp, 'X-Orbit-Signature': await signSource(secret, `${timestamp}.${raw}`) }, body: raw });
  if (response.status !== 201) throw new Error(`Signal ${event.eventId}: ${response.status} ${await response.text()}`);
}

// A real accepted send to Ana, then a scheduled send to Ana that waits in NEXT.
const outreach = new OutreachRepository(db), approval = new ApprovalRepository(db);
const service = new OutreachService(db, { send: async () => ({ providerMessageId: 'prior-provider-receipt' }) });
const sentDraft = await outreach.createDraft(opportunity, { contactId: ana, subject: 'Prior proposal', body: 'Reviewed prior body' }, operator);
const sent = await approval.approve(sentDraft.id, 1, operator, { quietHoursConfirmation: (await approval.preview(sentDraft.id)).localTime });
await service.submit(sent);
const laterDraft = await outreach.createDraft(opportunity, { contactId: ana, subject: 'Prior follow-up', body: 'Scheduled prior follow-up' }, operator);
const scheduled = await approval.approve(laterDraft.id, 1, operator, { scheduledAt: new Date(Date.now() + 30 * 86400000).toISOString() });

const directory = platform.directory;
await platform.dispose(true);
const d1 = join(directory, 'v3/d1/miniflare-D1DatabaseObject'), file = (await readdir(d1)).find(name => name.endsWith('.sqlite'))!;
// Fold the write-ahead log into the database file so the store is complete on its own.
const store = new DatabaseSync(join(d1, file));store.exec('PRAGMA wal_checkpoint(TRUNCATE)');store.close();
await mkdir(out, { recursive: true });
await writeFile(join(out, 'store.sqlite.gz'), gzipSync(await readFile(join(d1, file))));
await writeFile(join(out, 'capture.json'), JSON.stringify({ commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), capturedAt: new Date().toISOString(), operator, company, ana, bob, opportunity, sentMessage: sent.id, scheduledMessage: scheduled.id, scheduledDraft: laterDraft.id, source }, null, 1) + '\n');
await rm(directory, { recursive: true, force: true });
console.log(`populated ${file}`);
