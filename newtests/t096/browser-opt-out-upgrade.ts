import assert from 'node:assert/strict';
import {createServer} from 'node:https';
import {chromium, expect} from '@playwright/test';
import {priorCaptureUpgrade} from '../../tests/support/prior-capture-upgrade';
import {testAuth} from '../../tests/support/test-auth';
import {closeServer, customCertificate, serverOrigin} from '../../tests/support/http-listener-fixture';
import {emittedWorker} from './emitted-fixture';
import {accessible, watchBrowser} from './browser-observations';

/** Read the migrated historical installation in the built local app, without running hosted timers. */
export async function optOutUpgradeBrowserJourney(directory: string) {
  const target = await priorCaptureUpgrade();
  let worker: Awaited<ReturnType<typeof emittedWorker>> | undefined;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  const certificate = await customCertificate(target.directory);
  let providerConnections = 0, providerSubmissions = 0;
  const provider = createServer(certificate, (request, response) => {
    if (request.method === 'POST') providerSubmissions++;
    request.resume(); response.writeHead(503).end();
  });
  provider.on('connection', () => { providerConnections++; });
  try {
    const relay = await serverOrigin(provider, '127.0.0.1', true);
    const session = await testAuth(target.db).createSession(target.prior.operator);
    const email = await target.db.prepare('SELECT email FROM operators WHERE id=?').bind(target.prior.operator).first<string>('email');
    assert.ok(email);
    worker = await emittedWorker(target, undefined, {
      AUTH_LOCAL: 'true', OWNER_EMAIL: email, MAIL_FROM: email,
      MAIL_PROVIDER: 'rer', MAIL_RELAY_URL: relay.href, MAIL_API_KEY: 'synthetic-orbit-upgrade-relay',
    });
    browser = await chromium.launch({headless: true, args: ['--use-mock-keychain', '--password-store=basic', '--disable-gpu', ...worker.browserArgs]});
    for (const width of [1440, 390]) {
      const context = await browser.newContext({baseURL: worker.origin, viewport: {width, height: 1000}, ignoreHTTPSErrors: true, extraHTTPHeaders: {Cookie: `__Host-orbit_session=${session.token}`}});
      const errors = watchBrowser(context), page = await context.newPage();
      try {
        await page.goto('/app/settings/mail#opt-out-links');
        const settings = page.getByRole('region', {name: 'Opt-out links', exact: true});
        await settings.locator('fieldset[data-type="one_to_one"] input').first().waitFor();
        if (width === 1440) {
          const type = settings.getByRole('group', {name: 'One-to-one email and replies', exact: true});
          await expect(type.getByRole('checkbox', {name: 'Add opt-out headers and link', exact: true})).toBeChecked();
          await expect(type).toContainText('Kept on for an upgraded installation');
          await expect(settings).toContainText('1 approved before this setting existed');
          await page.reload();
          await expect(type.getByRole('checkbox', {name: 'Add opt-out headers and link', exact: true})).toBeChecked();
          await expect(type).toContainText('Kept on for an upgraded installation');
          const response = await context.request.get('/api/v1/settings/opt-out');
          assert.equal(response.status(), 200);
          const body = await response.json();
          assert.equal(body.types.find((row: {type: string}) => row.type === 'one_to_one').basis, 'kept on for an upgraded installation');
          assert.deepEqual(body.approvedUnsent, {carrying: 0, notCarrying: 0, approvedBeforeSetting: 1});
        }
        await accessible(page, `opt-out-upgrade-${width}`, directory);
        await errors.check(directory, `opt-out-upgrade-${width}`);
      } finally { await context.close(); }
    }
    await browser.close(); browser = undefined;
    await worker.dispose(); worker = undefined;
    const after = target.snapshot().rows;
    assert.deepEqual(after.outbound_messages, target.after.rows.outbound_messages, 'Settings and reload preserve the complete historical approval bytes and states');
    assert.deepEqual(after.drafts, target.after.rows.drafts, 'Settings and reload preserve the historical drafts');
    assert.deepEqual(after.outbound_message_opt_out, [], 'Historical approvals acquire no invented binding');
    assert.deepEqual(after.opt_out_settings, target.after.rows.opt_out_settings, 'Opening Settings never changes the retained upgrade basis');
    assert.equal(providerSubmissions, 0, 'Reading Settings submits no customer mail');
    assert.equal(providerConnections, 0, 'Reading Settings never attempts a provider connection');
    console.log('PROBE OUT-032 established upgrade: emitted Settings and reload -> one-to-one on, upgrade basis retained, historical approvals unchanged, provider submissions=0; screens 1440 and 390');
  } finally {
    await browser?.close(); await worker?.dispose(); await closeServer(provider); await target.dispose();
  }
}
