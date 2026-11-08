import { BROWSER_TEST_ORBIT_ENCRYPTION_KEY, requestOfflineFixture } from '../../scripts/browser-runtime.mjs';
import { getPlatformProxy } from 'wrangler';
import { connectSource } from '../../src/core/features/capture/sources';
import { createSourceSecurity, payloadHash } from '../../src/core/platform/source-security';
import { createId } from '../../src/core/shared/ids';
import { sampleData } from '../fixtures/sample-data';
import {orbitAgentDoor} from '../../src/core/features/agent-door';
import {createForwardAddress,forwardAddressRevision} from '../../src/core/features/capture/forward/source';
import {receiveForwarded} from '../../src/core/features/capture/forward/receive';
import {mailboxConfig} from '../../src/core/features/capture/forward/address';
import {heldPolicy} from '../../src/base/modules/agent-door/conformance/crypto.mjs';
import {identityVars} from './worker-identity.mjs';
import type {PlatformBindings} from '../../src/core/platform/assets';
import {eml} from './capture-fixture';
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
  const db=platform.env.DB,actor=sampleData.operators[0]!.id;
  const addressConfig=mailboxConfig(['synthetic-orbit','capture.example.test'].join('@'))!;
  const address=await createForwardAddress(db,security,addressConfig,actor,[]);
  const buyer=sampleData.contacts[0]!;
  await receiveForwarded(db,security,addressConfig,{recipients:[address],raw:eml({From:buyer.email!,To:['Synthetic seller','example.test'].join('@'),Subject:'Synthetic Capture browser evidence',Date:new Date().toUTCString(),'Message-ID':['<synthetic-orbit-capture-browser','example.test>'].join('@')},'Retain this buyer evidence through the reviewed address rotation.')});
  const policy=heldPolicy();policy.rules.find((rule:{do:string})=>rule.do==='approval')!.approver=['sponsor'];
  await db.prepare('INSERT INTO agent_door_state(id,local_document,local_revision) VALUES(1,?,1) ON CONFLICT(id) DO UPDATE SET local_document=excluded.local_document,local_revision=agent_door_state.local_revision+1').bind(JSON.stringify(policy)).run();
  const origin=`http://127.0.0.1:${process.env.PORT??8722}`;
  const bindings={DB:db,ASSETS:{fetch:async()=>new Response('')},...identityVars(origin),ORBIT_ENCRYPTION_KEY:BROWSER_TEST_ORBIT_ENCRYPTION_KEY,CAPTURE_MAIL_ADDRESS:['synthetic-orbit','capture.example.test'].join('@')} as PlatformBindings;
  const pending=await orbitAgentDoor(bindings).invoke('orbit.capture.address_rotate',{source_revision:await forwardAddressRevision(db,addressConfig),idempotency_key:'synthetic-orbit-browser-rotation-'+crypto.randomUUID()},
   {person:{id:actor},agent:{id:'synthetic-orbit-browser-assistant',name:'Synthetic assistant'},scopes:['capture:write']});
  if(pending.outcome!=='pending')throw new Error('Capture browser approval preparation failed.');
  process.stdout.write(JSON.stringify({sources:sourceSpecs.map(({id})=>id),approval:pending.approval?.id}));
} finally {
  await platform.dispose();
}
