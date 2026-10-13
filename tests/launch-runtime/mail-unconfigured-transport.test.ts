import assert from 'node:assert/strict';
import {test} from 'node:test';
import {publicIdentity} from '../../src/core/platform/public-rate-limit';
import {isolatedDatabase} from '../support/isolated-database';
import {emittedMailWorker} from '../support/emitted-mail-worker';
import {mailBody, mailTransportClient, mailTransportKeys, type MailKind} from '../support/mail-transport-client';

test('emitted Worker rejects unconfigured header-only providers without spending signed quota and stays healthy', async () => {
  for (const configured of ['relay', 'sendgrid'] as const) {
    const fixture = await isolatedDatabase(), keys = mailTransportKeys();
    const bindings: Record<string, string> = configured === 'relay'
      ? {RER_MAIL_RELAY_SECRET: keys.bindings.RER_MAIL_RELAY_SECRET}
      : {SENDGRID_WEBHOOK_PUBLIC_KEY: keys.bindings.SENDGRID_WEBHOOK_PUBLIC_KEY};
    const worker = await emittedMailWorker(fixture.directory, bindings);
    const client = mailTransportClient(worker.origin), exhausted = 'unconfigured-' + crypto.randomUUID();
    const missing: MailKind[] = configured === 'relay' ? ['sendgrid', 'reply'] : ['relay'];
    let signed = 0;
    try {
      const now = Date.now();
      for (const time of [now, now + 60000, now + 120000]) {
        await fixture.db.prepare('INSERT INTO public_rate_limits VALUES(?,?,?)').bind(`ingress:${Math.floor(time / 60000)}`, 600, time + 120000).run();
        await fixture.db.prepare('INSERT INTO public_rate_limits VALUES(?,?,?)').bind(`public:${await publicIdentity(new Request(worker.origin, {headers: {'CF-Connecting-IP': exhausted}}), time)}`, 300, time + 120000).run();
      }
      await fixture.close(); await worker.start();
      for (const kind of missing) {
        for (const identity of ['fresh-' + crypto.randomUUID(), exhausted]) {
          const rejected = await client.send('/api/v1/mail/events/' + kind, {'Content-Length': '2147483648', 'CF-Connecting-IP': identity}, [], 'stall');
          assert.equal(rejected.status, identity === exhausted ? 429 : 403);
          const health = await fetch(worker.origin + '/health'); assert.equal(health.status, 200); await health.arrayBuffer();
          const general = await client.send('/api/v1/mail/events/unsupported', {'CF-Connecting-IP': exhausted}, [Buffer.from('[]')]);
          assert.equal(general.status, 429);
          const valid = mailBody(configured);
          const accepted = await client.send('/api/v1/mail/events/' + configured, {...await keys.headers(configured, valid.body, exhausted), 'Content-Type': valid.type}, [valid.body]);
          assert.equal(accepted.status, 200); signed++;
        }
      }
      await worker.stop(); await fixture.reopen();
      assert.equal((await fixture.db.prepare("SELECT sum(count) n FROM public_rate_limits WHERE bucket LIKE 'signed-mail:%'").first())!.n, signed);
      for (const table of ['mail_provider_events', 'unlinked_replies', 'signals']) {
        assert.equal((await fixture.db.prepare(`SELECT count(*) n FROM ${table}`).first())!.n, 0);
      }
    } finally { client.close(); await worker.stop(); await fixture.dispose(); }
  }
});
