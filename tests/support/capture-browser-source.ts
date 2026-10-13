import { BROWSER_TEST_ORBIT_ENCRYPTION_KEY, requestOfflineFixture } from '../../scripts/browser-runtime.mjs';
import { getPlatformProxy } from 'wrangler';
import { connectSource } from '../../src/core/features/capture/sources';
import { createSourceSecurity, payloadHash } from '../../src/core/platform/source-security';
import { createId } from '../../src/core/shared/ids';
import { sampleData } from '../fixtures/sample-data';
import { testState } from './test-state';

if (await requestOfflineFixture('tests/support/capture-browser-source.ts', process.argv.slice(2))) process.exit(0);

const platform = await getPlatformProxy<{ DB: D1Database }>({
  configPath: 'wrangler.jsonc',
  envFiles: ['tests/support/no-local-settings.env'],
  persist: { path: `${testState()}/v3` },
  remoteBindings: false,
});

const lastSuccess = '2026-10-01T12:00:00.000Z';
const sourceSpecs = [
  { id: 'capture-browser-revoked-google', adapter: 'google', name: 'Revoked Gmail proof' },
  { id: 'capture-browser-revoked-microsoft', adapter: 'microsoft', name: 'Revoked Outlook proof' },
] as const;

async function seedRevokedSource(db: D1Database, security: NonNullable<ReturnType<typeof createSourceSecurity>>, source: typeof sourceSpecs[number]) {
  const eventId = `${source.adapter}-browser-fixture-event`;
  await db.prepare('DELETE FROM signals WHERE source_id=? AND source_event_id=?').bind(source.id, eventId).run();
  await connectSource(db, {
    ...source,
    scope: { mail: { folders: [] }, calendars: [] },
    credential: JSON.stringify({ fixture: true }),
  }, security, sampleData.operators[0]!.id);

  const signalId = createId();
  const itemId = createId();
  const proposalId = createId();
  const contact = sampleData.contacts[0]!;
  const event = {
    eventId,
    type: 'email.replied',
    subject: 'Fixture reply',
    occurredAt: lastSuccess,
    data: { participants: ['elena@fieldhouse.example'] },
  };
  const eventHash = await payloadHash(JSON.stringify(event));
  await db.batch([
    db.prepare(`INSERT INTO signals(id,source_id,source_event_id,type,subject,occurred_at,received_at,payload_hash,confidence,linking_basis,created_at,payload_json)
      VALUES(?,?,?,'email.replied',?,?,?,?, 'observed','Browser status fixture',?,?)`)
      .bind(signalId, source.id, event.eventId, event.subject, lastSuccess, lastSuccess, eventHash, lastSuccess, JSON.stringify(event)),
    db.prepare(`INSERT INTO capture_items(id,source_id,signal_id,kind,headers,body,captured_at)
      VALUES(?,?,?,'message','{}','Fixture evidence retained after disconnect.',?)`)
      .bind(itemId, source.id, signalId, lastSuccess),
    db.prepare(`INSERT INTO capture_proposals(id,proposal_key,signal_id,kind,record_type,record_id,field,current_value,proposed_value,details_json,status,created_at)
      VALUES(?,?,?,'set_field','contact',?,'name',?,?,?,'pending',?)`)
      .bind(proposalId, `${source.id}-proposal`, signalId, contact.id, contact.name, 'Elena Fixture', JSON.stringify({
        evidence: {
          source: source.name,
          sender: 'elena@fieldhouse.example',
          date: lastSuccess,
          subject: 'Fixture reply',
          quote: ['Please update my contact name.'],
        },
      }), lastSuccess),
  ]);
  await db.prepare(`UPDATE capture_sources
    SET state='error',last_error='Access was revoked: Reconnect to resume.',last_error_at=?,last_success_at=?,captured_count=7,skipped_count=2
    WHERE id=?`).bind(lastSuccess, lastSuccess, source.id).run();
}

try {
  const security = createSourceSecurity({ ORBIT_ENCRYPTION_KEY: BROWSER_TEST_ORBIT_ENCRYPTION_KEY });
  if (!security) throw new Error('Browser fixture encryption is unavailable.');
  for (const source of sourceSpecs) await seedRevokedSource(platform.env.DB, security, source);
  process.stdout.write(JSON.stringify({ sources: sourceSpecs.map(({ id }) => id) }));
} finally {
  await platform.dispose();
}
