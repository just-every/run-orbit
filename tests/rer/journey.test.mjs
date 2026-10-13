import assert from 'node:assert/strict';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { get } from 'node:http';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { chromium } from '@playwright/test';
import { freePort, freshCheckout, listening } from './checkout.mjs';
import {privateFiles,assertPrivateRoutes,setupWithProbes} from './private-routes.mjs';
import {devKey,emailLinkSignIn,openLink,outboxLink} from './sign-in.mjs';

// The README's "Run it on your computer" journey through the public rer
// commands in a fresh checkout: setup, dev signed in, the end-to-end email
// link through the outbox, /setup, reset and a complete local
// export/import/export round trip. This is Orbit's one email-link test.
let checkout, browser;
before(async () => { checkout = await freshCheckout(); browser = await chromium.launch(); });
after(async () => { await browser?.close(); await checkout?.rer(['dev', '--stop']); await checkout?.rer(['preview', '--stop']); await checkout?.close(); });

const owner = 'owner@example.test';
const exitOf = async (result, code, label) => { assert.equal(result.code, code, `${label}\n${result.output.slice(-1500)}`); return result.output; };
const hostRequest = (port, path, host) => new Promise((done, fail) => get({ host: '127.0.0.1', port, path, headers: { Host: host } }, (response) => {
  let body = ''; response.on('data', (chunk) => { body += chunk; }); response.on('end', () => done({ status: response.statusCode, body }));
}).on('error', fail));
const contentHash = (output) => JSON.parse(output.trim().split('\n').find((line) => line.includes('"event":"result"'))).contentHash;

/** Opens the newest outbox link for the owner and presses Confirm; works without JavaScript. */
async function confirmNewest(origin, context) {
  const page = await context.newPage(), link = await outboxLink(origin, await devKey(checkout.root), owner);
  await page.goto(link);
  await page.getByRole('button', { name: 'Confirm' }).click();
  return { page, link };
}

test('setup refuses legacy preview state under dist and leaves it untouched', { timeout: 10 * 60_000 }, async () => {
  const legacy = join(checkout.root, 'dist/server/.wrangler/state/v3/d1'), sentinel = join(legacy, 'retained.sqlite');
  await mkdir(legacy, { recursive: true });
  await writeFile(sentinel, 'do not erase');
  const refused = await checkout.rer(['setup', '--owner-email', owner, '--port', String(await freePort()), '--non-interactive']);
  assert.equal(refused.code, 4, refused.output.slice(-1500));
  assert.match(refused.output, /Preserve legacy state and recover it explicitly/);
  assert.equal(await readFile(sentinel, 'utf8'), 'do not erase');
  await assert.rejects(stat(join(checkout.root, '.dev.vars')));
  await rm(join(checkout.root, 'dist'), { recursive: true });
});

test('README local journey: setup, dev sign-in, /setup, reset and complete data round trip', { timeout: 30 * 60_000 }, async () => {
  const port = await freePort(), origin = `http://127.0.0.1:${port}`;
  const privatePaths=await privateFiles(checkout.root);
  await exitOf(await checkout.rer(['check', '--profile', 'first-party']), 0, 'structural check before configuration');
  await exitOf(await checkout.rer(['setup', '--non-interactive', '--port', String(port)]), 3, 'non-interactive setup without an owner email');

  const setup = await exitOf(await setupWithProbes(checkout,['setup', '--owner-email', owner, '--port', String(port), '--non-interactive'],origin,privatePaths), 0, 'setup');
  assert.match(setup, new RegExp(`^RER_SETUP_READY ${origin}$`, 'm'));
  assert.match(setup, /rer dev opens .* signed in as the owner/);
  assert.equal(await listening(port), false, 'setup leaves no app running');
  const settings = join(checkout.root, '.dev.vars'), bytes = await readFile(settings);
  assert.equal((await stat(settings)).mode & 0o777, 0o600);
  await exitOf(await checkout.rer(['setup', '--port', String(port), '--non-interactive']), 0, 'repeat setup keeps the owner');
  assert.ok((await readFile(settings)).equals(bytes), 'repeat setup keeps exact private settings');
  await exitOf(await checkout.rer(['setup', '--owner-email', 'other@example.test', '--port', String(port), '--non-interactive']), 4, 'conflicting owner');

  const dev = checkout.serve(['dev']);
  const ready = await dev.ready, key = await devKey(checkout.root);
  assert.match(ready, new RegExp(`^RER_READY ${origin}$`, 'm'));
  assert.match(ready, new RegExp(`^RER_SIGNED_IN ${owner}$`, 'm'));
  // rer dev opens signed in: RER_OPEN trades the checkout key for a cookie and enters as the owner.
  const opened = await (await browser.newContext()).newPage();
  await opened.goto(openLink(ready));
  await opened.waitForURL((url) => url.pathname === '/setup');
  await opened.close();
  assert.equal((await fetch(`${origin}/health`)).status, 200);
  await assertPrivateRoutes(origin,privatePaths);
  // The outbox answers only its exact loopback origin.
  for (const host of ['orbit.example.com', `localhost:${port}`]) {
    const foreign = await hostRequest(port, '/__dev/outbox', host);
    assert.notEqual(foreign.status, 200, host);
    assert.doesNotMatch(foreign.body, /Open this link|To: /, host);
  }
  // Without the checkout key the outbox, dev sign-in and personas do not exist.
  for (const path of ['/__dev/outbox', '/auth/dev/enter?as=owner', '/__dev/personas']) assert.equal((await hostRequest(port, path, `127.0.0.1:${port}`)).status, 404, path);
  assert.equal((await fetch(`${origin}/__dev/outbox`, { headers: { 'x-rer-dev-key': key } })).status, 200);
  await exitOf(await checkout.rer(['reset', '--yes']), 4, 'reset refuses while dev owns the state');

  // Before hydration: no JavaScript at all, at both supported widths.
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const link = await emailLinkSignIn(page, origin, key, owner);
  assert.equal(new URL(page.url()).pathname, '/setup', 'the email-link sign-in reaches first-run setup');
  await page.getByRole('heading', { name: 'Set up your workspace.' }).waitFor();
  await page.screenshot({ path: join(process.env.ORBIT_EVIDENCE_DIR ?? checkout.root, 'setup-1440.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= 390), 'no horizontal scroll at 390');
  await page.screenshot({ path: join(process.env.ORBIT_EVIDENCE_DIR ?? checkout.root, 'setup-390.png'), fullPage: true });
  const reused = await (await browser.newContext({ javaScriptEnabled: false })).newPage();
  assert.equal((await reused.goto(link)).status(), 400, 'a sign-in link works once');
  await reused.getByRole('link', { name: 'Request a new link' }).waitFor();
  await page.goto(`${origin}/app/records`);
  assert.equal(new URL(page.url()).pathname, '/setup', 'unfinished setup holds every app route');
  await page.fill('#setup-name', 'Harbor Revenue');
  await page.fill('#setup-timezone', 'Australia/Brisbane');
  await page.fill('#setup-currency', 'aud');
  await page.fill('#setup-stages', 'New\nQualified\nProposal\nWon');
  await page.getByRole('button', { name: 'Finish setup' }).click();
  assert.equal(new URL(page.url()).pathname, '/app');
  await page.goto(`${origin}/setup`);
  assert.equal(new URL(page.url()).pathname, '/app', 'finished setup continues into the app');

  // The CLI's own request is proven by the checkout, so it never spends the owner's sign-in allowance.
  await exitOf(await checkout.rer(['outbox', '--owner-email', owner]), 0, 'outbox requests a fresh link');
  const operator = (await confirmNewest(origin, await browser.newContext())).page;
  const api = (path, data) => operator.evaluate(async ([path, data]) => (await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })).status, [path, data]);
  assert.equal(await api('/api/v1/records/company', { name: 'Northwind Freight', primary_domain: 'northwind.example' }), 201);
  assert.equal(await api('/api/v1/records/contact', { name: 'Ada Lovelace', email: 'ada@northwind.example' }), 201);
  await exitOf(await checkout.rer(['dev', '--stop']), 0, 'dev stop');
  assert.equal((await dev.exited).code, 0);
  assert.equal(await listening(port), false, 'dev stop closes the port');

  const preview=checkout.serve(['preview']);await preview.ready;
  await assertPrivateRoutes(origin,privatePaths.filter(p=>!p.endsWith('.rer')));
  await exitOf(await checkout.rer(['preview','--stop']),0,'preview stop');
  assert.equal((await preview.exited).code,0);assert.equal(await listening(port),false);

  await exitOf(await checkout.rer(['import', '--input', 'exports/missing.rer']), 4, 'import requires confirmation');
  const first = contentHash(await exitOf(await checkout.rer(['export', '--output', 'exports/first.rer', '--json']), 0, 'export'));
  assert.equal((await stat(join(checkout.root, 'exports/first.rer'))).mode & 0o777, 0o600);
  await exitOf(await checkout.rer(['export', '--output', 'exports/first.rer']), 4, 'export refuses an existing archive');
  // A build refuses output holding an installation archive, renamed or not, and builds again once it is moved out.
  await mkdir(join(checkout.root, 'public'), { recursive: true });
  for (const planted of ['public/planted.rer', 'public/planted.json']) {
    await writeFile(join(checkout.root, planted), await readFile(join(checkout.root, 'exports/first.rer')), { mode: 0o600 });
    assert.match(await exitOf(await checkout.rer(['build']), 1, `build with ${planted}`), /contains an installation archive/);
    await rm(join(checkout.root, planted));
  }
  await exitOf(await checkout.rer(['build']), 0, 'build after the archive moved out');
  await writeFile(join(checkout.root, 'exports/corrupt.rer'), (await readFile(join(checkout.root, 'exports/first.rer'), 'utf8')).replace('Ada Lovelace', 'Ada Byron'), { mode: 0o600 });

  const reset = await exitOf(await checkout.rer(['reset', '--yes']), 0, 'reset');
  assert.match(reset, /reset inventory: .*\.wrangler\/state.*\.dev\.vars/);
  assert.match(await exitOf(await checkout.rer(['reset', '--yes']), 0, 'second reset'), /reset inventory: \(empty\)/);
  await stat(join(checkout.root, 'exports/first.rer'));
  assert.match(await exitOf(await checkout.rer(['import', '--input', 'exports/corrupt.rer', '--yes']), 1, 'a corrupt archive is refused'), /part_checksum/);
  assert.equal(contentHash(await exitOf(await checkout.rer(['import', '--input', 'exports/first.rer', '--yes', '--json']), 0, 'import')), first);
  assert.equal(contentHash(await exitOf(await checkout.rer(['export', '--output', 'exports/second.rer', '--json']), 0, 'second export')), first, 'export/import/export is equivalent');

  // The restored owner signs in again through setup, with search rebuilt.
  await exitOf(await checkout.rer(['setup', '--owner-email', owner, '--port', String(port), '--non-interactive']), 0, 'setup after import');
  const restored = checkout.serve(['dev']);
  await restored.ready;
  const again = await confirmNewest(origin, await browser.newContext({ javaScriptEnabled: false }));
  assert.equal(new URL(again.page.url()).pathname, '/app', 'restored first-run completion opens the app');
  await exitOf(await checkout.rer(['outbox', '--owner-email', owner]), 0, 'outbox requests a fresh link');
  const searcher = (await confirmNewest(origin, await browser.newContext())).page;
  const found = await searcher.evaluate(async () => (await fetch('/api/v1/records/contact?q=Lovelace')).text());
  assert.match(found, /Ada Lovelace/, 'restored contacts are searchable');
  await exitOf(await checkout.rer(['dev', '--stop']), 0, 'dev stop');
  await restored.exited;

  await exitOf(await checkout.rer(['reset', '--yes']), 0, 'reset before fresh setup');
  await exitOf(await checkout.rer(['setup', '--owner-email', 'fresh@example.test', '--port', String(port), '--non-interactive']), 0, 'fresh setup after reset');
});
