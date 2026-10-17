import {isolateBrowserTemp} from '../support/browser-temp.mjs';
isolateBrowserTemp();
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdir, readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium, expect} from '@playwright/test';
import {isolatedDatabase} from '../support/isolated-database';
import {emittedMailWorker} from '../support/emitted-mail-worker';

test('the declared owner sign-in opens the emitted email form with an editable login hint', async () => {
 const ownerEmail = process.env.ORBIT_SIGNIN_EMAIL ?? 'owner@example.test';
 const spec = JSON.parse(await readFile('management/integration/deployment-spec.json', 'utf8'));
 const fixture = await isolatedDatabase();
 const worker = await emittedMailWorker(fixture.directory, {MAIL_PROVIDER: 'development', MAIL_FROM: 'auth@localhost.test'});
 let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
 try {
  await fixture.close();
  await worker.start();
  browser = await chromium.launch({ headless: true, args: ['--use-mock-keychain', '--password-store=basic'] });
  const context = await browser.newContext({javaScriptEnabled: false});
  const page = await context.newPage();
  const signIn = new URL(spec.surfaces.app.signIn.path, worker.origin);
  assert.equal(spec.surfaces.app.signIn.loginHint, true);
  signIn.searchParams.set('login_hint', ownerEmail);
  for (const width of [1440, 390]) {
   await page.setViewportSize({width, height: 900});
   const response = await page.goto(signIn.href);
   assert.equal(response?.status(), 200);
   const email = page.getByRole('textbox', {name: 'Email', exact: true});
   await expect(email).toHaveValue(ownerEmail);
   await expect(page.getByRole('button', {name: 'Email a sign-in link', exact: true})).toBeEnabled();
   assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
   if (process.env.ORBIT_SIGNIN_SHOTS) {
    await mkdir(process.env.ORBIT_SIGNIN_SHOTS, {recursive: true});
    await page.screenshot({path: join(process.env.ORBIT_SIGNIN_SHOTS, `signin-${width}.png`), fullPage: true});
   }
   await email.fill('another-owner@example.test');
   await expect(email).toHaveValue('another-owner@example.test');
  }
  await page.goto(new URL(spec.surfaces.app.signIn.path, worker.origin).href);
  await expect(page.getByRole('textbox', {name: 'Email', exact: true})).toHaveValue('');
 } finally {
  await browser?.close();
  await worker.stop();
  await fixture.dispose();
 }
});
