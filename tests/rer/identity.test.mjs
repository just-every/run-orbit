import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { after, before, test } from 'node:test';
import { chromium } from '@playwright/test';
import { accessible } from './onboarding-journey.mjs';
import { browserAPI } from './browser-api.mjs';
import { freePort, freshCheckout } from './checkout.mjs';
import { devKey, emailLinkSignIn, openLink, outboxLink, outboxMessages } from './sign-in.mjs';

// Base sign-in in a fresh checkout through the public rer commands: rer dev
// opens signed in, personas show Orbit's real role and field-access
// differences, an invitation is accepted through the email link, and a store
// from before the upgrade signs in. Screens at 1440 and 390, axe clean.
const evidence = process.env.ORBIT_EVIDENCE_DIR;
const widths = [1440, 390];
let checkout, browser;
before(async () => { checkout = await freshCheckout(); browser = await chromium.launch(); });
after(async () => { await browser?.close(); await checkout?.rer(['dev', '--stop']); await checkout?.close(); });
const exitOf = async (result, code, label) => { assert.equal(result.code, code, `${label}\n${result.output.slice(-1500)}`); return result.output; };
async function shot(page, name) {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await accessible(page);
    if (evidence) { await mkdir(evidence, { recursive: true }); await page.screenshot({ path: join(evidence, `${name}-${width}.png`), fullPage: true }); }
  }
}
const enter = async (page, origin, as) => { await page.goto(`${origin}/auth/dev/enter?as=${as}&returnTo=${encodeURIComponent('/app/access')}`); await page.waitForLoadState('networkidle'); };

test('AUTH-5 rer dev opens signed in, personas switch role and field access, and an invitation is accepted by email link', { timeout: 30 * 60_000 }, async () => {
  const port = await freePort(), origin = `http://127.0.0.1:${port}`;
  await exitOf(await checkout.rer(['setup', '--owner-email', 'owner@example.test', '--port', String(port), '--non-interactive']), 0, 'setup');
  const dev = checkout.serve(['dev']), ready = await dev.ready, key = await devKey(checkout.root);
  try {
  assert.match(ready, /^RER_SIGNED_IN owner@example\.test$/m);
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto(openLink(ready));
  await page.waitForURL((url) => url.pathname === '/setup');
  await page.getByLabel('Business name').fill('Identity journey');
  await page.getByRole('button', { name: 'Finish setup' }).click();
  await page.waitForURL(`${origin}/app`);
  await page.getByText('Dev: owner@example.test (owner)').waitFor();
  await shot(page, 'owner-app');

  // Real records and personas: the seller is a full operator, the collaborator an invited analyst.
  const workbench = await browserAPI(page, '/api/v1/workbench');
  const created = await browserAPI(page, '/api/v1/workbench/opportunities', 'POST', { title: 'Persona renewal', companyName: 'Persona Co', contactName: 'Casey Persona', email: 'casey@persona.example', stageId: workbench.stages[0].id, valueCents: 900000 });
  const contact = (await browserAPI(page, `/api/v1/opportunities/${created.id}`)).opportunity.contacts[0];
  await browserAPI(page, `/api/v1/records/contact/${contact.id}`, 'PUT', { name: 'Casey Persona', email: 'casey@persona.example', phone: '+1 555 0199', job_title: 'Buyer' });
  const personas = await (await fetch(`${origin}/__dev/personas`, { headers: { 'x-rer-dev-key': key } })).json();
  assert.deepEqual(personas.map((persona) => [persona.as, persona.role ?? null]), [['owner', 'owner'], ['seller', 'admin'], ['collaborator', 'member'], ['signed-out', null]]);

  await enter(page, origin, 'seller');
  await page.getByText('Dev: seller@dev.localhost (admin)').waitFor();
  assert.deepEqual(await browserAPI(page, '/api/v2/access/class'), { access_class: 'native_full' });
  assert.equal((await browserAPI(page, '/api/v2/workspaces/workspace/records/contact/' + contact.id)).fields.phone, '+1 555 0199', 'a full operator sees every field');
  await page.goto(`${origin}/app/records?kind=contact&record=${contact.id}`);
  await page.getByText('+1 555 0199').first().waitFor();
  await shot(page, 'seller-contact');

  await enter(page, origin, 'collaborator');
  await page.getByText('Dev: collaborator@dev.localhost (member)').waitFor();
  assert.deepEqual(await browserAPI(page, '/api/v2/access/class'), { access_class: 'collaborator' });
  assert.equal(await page.evaluate(async () => (await fetch('/api/v1/workbench')).status), 403, 'a collaborator has no native operator access');
  const collaboratorId = (await browserAPI(page, '/api/v2/access/workspaces/workspace/administration').catch(() => null))?.members;
  assert.equal(collaboratorId, undefined, 'a collaborator cannot administer access');

  // The owner limits the analyst profile to two fields; the collaborator then sees only those.
  await enter(page, origin, 'owner');
  const members = (await browserAPI(page, '/api/v2/access/workspaces/workspace/administration')).members;
  assert.equal(members.find((member) => member.email === 'collaborator@dev.localhost').access_class, 'collaborator');
  await browserAPI(page, '/api/v2/access/workspaces/workspace/roles/analyst', 'PUT', { actions: ['graph.read', 'graph.search', 'analytics.read'], fields: ['name', 'email'] });
  await enter(page, origin, 'collaborator');
  const shared = await browserAPI(page, '/api/v2/workspaces/workspace/records/contact/' + contact.id);
  assert.deepEqual(Object.keys(shared.fields).sort(), ['email', 'name'], 'the collaborator sees only granted fields');
  await page.goto(`${origin}/app/shared-records?kind=contact&id=${contact.id}`);
  await page.getByRole('heading', { name: 'Permitted fields' }).waitFor();
  assert.equal(await page.getByText('+1 555 0199').count(), 0);
  await shot(page, 'collaborator-shared');

  // An invitation accepted through the email link, without the dev layer.
  await enter(page, origin, 'owner');
  const invitation = await browserAPI(page, '/api/v2/access/workspaces/workspace/invitations', 'POST', { email: 'invitee@example.test', role: 'seller', expiresAt: new Date(Date.now() + 86_400_000).toISOString() });
  const invitee = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await invitee.goto(`${origin}/signin?returnTo=${encodeURIComponent('/app/access')}`);
  await shot(invitee, 'signin');
  await invitee.fill('#signin-email', 'invitee@example.test');
  await invitee.getByRole('button', { name: 'Email a sign-in link' }).click();
  await invitee.getByRole('status').filter({ hasText: 'a sign-in link is on its way' }).waitFor();
  await invitee.goto(await outboxLink(origin, key, 'invitee@example.test'));
  await shot(invitee, 'confirm');
  await invitee.getByRole('button', { name: 'Confirm' }).click();
  await invitee.waitForURL(`${origin}/app/access`);
  // The token form submits through the hydrated page; act once rer dev's Vite page has settled.
  await invitee.waitForLoadState('networkidle');
  await invitee.getByLabel('Invitation token').fill(invitation.token);
  await invitee.getByRole('button', { name: 'Accept invitation', exact: true }).click();
  await invitee.getByText('Invitation accepted. Your collaborator access is active.').waitFor();
  await shot(invitee, 'invitation-accepted');
  assert.deepEqual(await browserAPI(invitee, '/api/v2/access/workspaces/workspace/self'), { role: 'seller', access_class: 'collaborator' });
  } finally { await checkout.rer(['dev', '--stop']); await dev.exited; }
});

test('AUTH-5 a store from before the upgrade keeps its people and signs in on Base', { timeout: 30 * 60_000 }, async () => {
  const port = await freePort(), origin = `http://127.0.0.1:${port}`;
  const capture = JSON.parse(await readFile(join(checkout.root, 'tests/fixtures/prior-auth/capture.json'), 'utf8'));
  await exitOf(await checkout.rer(['reset', '--yes']), 0, 'reset');
  // The captured pre-change store becomes this checkout's local database; setup applies only the new migrations.
  const d1 = join(checkout.root, '.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
  await mkdir(d1, { recursive: true });
  await writeFile(join(d1, '9ba2b04bf514d9facfd57ed57d849e77241a7adc99d1c1545d06688b43d84248.sqlite'), gunzipSync(await readFile(join(checkout.root, 'tests/fixtures/prior-auth/store.sqlite.gz'))));
  const setup = await exitOf(await checkout.rer(['setup', '--owner-email', capture.people.owner.email, '--port', String(port), '--non-interactive']), 0, 'setup over the prior store');
  assert.match(setup, /existing owner was kept/);
  const dev = checkout.serve(['dev']), ready = await dev.ready, key = await devKey(checkout.root);
  try {
  assert.match(ready, new RegExp(`^RER_SIGNED_IN ${capture.people.owner.email}$`, 'm'));
  const owner = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await owner.goto(openLink(ready));
  await owner.waitForURL(`${origin}/app`);
  assert.equal((await browserAPI(owner, `/api/v1/opportunities/${capture.opportunityId}`)).opportunity.title, 'Prior renewal');
  await owner.goto(`${origin}/app/opportunities/${capture.opportunityId}`);
  await owner.getByText('Prior renewal').first().waitFor();
  await shot(owner, 'prior-owner');

  for (const who of ['seller', 'analyst']) {
    const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
    await emailLinkSignIn(page, origin, key, capture.people[who].email, '/app/access');
    assert.equal(new URL(page.url()).pathname, '/app/access');
    const self = await browserAPI(page, '/api/v2/access/workspaces/workspace/self');
    assert.deepEqual(self, who === 'seller' ? { role: 'legacy_operator', access_class: 'native_full' } : { role: 'analyst', access_class: 'collaborator' }, who);
    if (who === 'analyst') { await page.goto(`${origin}/app/access`); await shot(page, 'prior-analyst'); }
  }
  // The removed operator gets the same public answer and no new link (the store keeps their pre-upgrade messages).
  const earlier = await outboxMessages(origin, key, capture.people.leaver.email);
  const leaver = await (await browser.newContext({ javaScriptEnabled: false })).newPage();
  await leaver.goto(`${origin}/signin`);
  await leaver.fill('#signin-email', capture.people.leaver.email);
  await leaver.getByRole('button', { name: 'Email a sign-in link' }).click();
  await leaver.getByRole('status').filter({ hasText: 'a sign-in link is on its way' }).waitFor();
  assert.deepEqual(await outboxMessages(origin, key, capture.people.leaver.email), earlier);
  } finally { await checkout.rer(['dev', '--stop']); await dev.exited; }
});
