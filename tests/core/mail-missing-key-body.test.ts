import assert from 'node:assert/strict';
import {test} from 'node:test';
import {isolatedDatabase} from '../support/isolated-database';
import {createMailEventRoutes} from '../../src/core/features/outreach/provider-routes';

test('unconfigured providers reject before any application body read or cancellation', async () => {
  const fixture = await isolatedDatabase();
  const app = createMailEventRoutes(fixture.db, {});
  try {
    for (const kind of ['relay', 'reply', 'sendgrid']) {
      for (const length of [undefined, '2147483648']) {
        let pulls = 0, cancellations = 0;
        const body = new ReadableStream<Uint8Array>({
          pull() { pulls++; },
          cancel() { cancellations++; },
        }, {highWaterMark: 0});
        const response = await app.request(new Request(`https://orbit.test/${kind}`, {
          method: 'POST', body, duplex: 'half',
          headers: length === undefined ? {} : {'Content-Length': length},
        } as RequestInit));
        assert.equal(response.status, 403);
        assert.equal(pulls, 0);
        assert.equal(cancellations, 0);
      }
    }
    assert.equal(await fixture.db.prepare("SELECT count FROM public_rate_limits WHERE bucket LIKE 'signed-mail:%'").first(), null);
    assert.equal((await fixture.db.prepare('SELECT count(*) n FROM mail_provider_events').first())!.n, 0);
  } finally { await fixture.dispose(); }
});
