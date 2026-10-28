import {test, expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {authenticateOperator} from './operator-session.mjs';
import {phoneDashboard} from './phone-dashboard.mjs';

// The installation's only phone journey: a visitor finds the product, signs in,
// opens the seller queue and reviews the exact evidence and saved draft.
test('public entry and a seller’s first review remain private, accessible and usable on a 390px phone', async ({page, context}) => {
  test.setTimeout(180_000);
  await page.setViewportSize({width: 390, height: 844});
  const external = [], errors = [];
  page.on('request', request => { if (new URL(request.url()).origin !== `http://127.0.0.1:${process.env.ORBIT_BROWSER_PORT ?? 8722}`) external.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  const home = await page.goto('/', {waitUntil: 'networkidle'});
  expect(home.status()).toBe(200);
  expect(external).toEqual([]);
  expect(await context.cookies()).toEqual([]);
  await expect(page.locator('body')).not.toContainText('Fieldhouse');
  await expect(page.locator('body')).not.toContainText('maya.patel');
  expect(home.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(home.headers()['x-frame-options']).toBe('DENY');
  const state = await (await page.request.get('/setup/state')).json();
  await expect(page.getByRole('link', {name: state.state === 'claimed' ? 'Sign in' : 'Finish setup', exact: true}))
    .toHaveAttribute('href', state.state === 'claimed' ? '/signin' : '/setup');
  const health = await page.request.get('/health');
  expect(health.status()).toBe(200);
  expect(await health.json()).toMatchObject({ok: true, database: 'ok'});
  for (const path of ['/pricing/', '/review/', '/sent/', '/docs/not-a-page']) expect((await page.request.get(path)).status()).toBe(404);
  expect((await page.request.post('/uploads', {data: 'unsupported upload'})).status()).toBe(404);
  for (const route of ['/api/v1/records/contact', '/api/v1/settings', '/api/v1/notifications', '/api/v1/assistance/usage', '/api/v1/sources']) {
    expect((await page.request.get(route)).status()).toBe(401);
    expect((await page.request.get(route, {headers: {Cookie: '__Host-orbit_session=forged', 'X-Operator-Id': 'setup-owner'}})).status()).toBe(401);
  }
  const gated = await page.request.get('/app', {maxRedirects: 0});
  expect(gated.status()).toBe(302);
  expect(gated.headers().location).toBe('/signin?returnTo=%2Fapp');
  for (const route of ['/', '/signin', '/docs', '/demo']) {
    await page.goto(route, {waitUntil: 'networkidle'});
    if (route === '/signin') {
      await expect(page.getByRole('alert')).toContainText(/email is not available/i);
      await expect(page.getByRole('textbox')).toHaveCount(0);
    }
    if (route === '/docs') {
      await page.getByText('Docs menu', {exact: false}).click();
      const sidebar = page.getByRole('navigation', {name: 'Documentation', exact: true});
      const links = await sidebar.getByRole('link').evaluateAll(items => items.map(item => item.getAttribute('href')));
      expect(links.length).toBeGreaterThan(1);
      for (const href of links) expect((await page.request.get(href)).status(), href).toBe(200);
      await sidebar.getByRole('link').nth(2).click();
      await page.getByText('Docs menu', {exact: false}).click();
      await expect(sidebar.locator('[aria-current=page]')).toHaveAttribute('href', links[2]);
    }
    if (route === '/demo') {
      const selected = page.getByRole('complementary', {name: 'Opportunities'}).getByRole('button').last();
      await selected.focus(); await selected.press('Enter');
      await expect(selected).toHaveAttribute('aria-pressed', 'true');
    }
    await accessible(page);
    await page.goto(route, {waitUntil: 'networkidle'}); await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement !== document.body)).toBe(true);
  }
  const issued = await authenticateOperator(context);
  await page.goto('/app', {waitUntil: 'networkidle'});
  await expect(page.getByText('Observed form submission and meeting booking')).toBeVisible();
  await expect(page.getByText('Why NOW').first()).toBeVisible();
  const menu = page.getByRole('button', {name: 'Menu', exact: true});
  const navigation = page.getByRole('navigation', {name: 'Operator navigation'});
  await expect(navigation).toBeHidden(); await menu.focus(); await menu.press('Enter');
  await expect(navigation).toBeVisible();
  await navigation.getByRole('link', {name: 'Settings', exact: true}).focus(); await page.keyboard.press('Escape');
  await expect(menu).toBeFocused(); await expect(navigation).toBeHidden();
  await page.getByRole('link', {name: 'Open Fieldhouse Studio workspace'}).click();
  await expect(page.getByTestId('next-action')).toBeVisible();
  const evidence = page.getByTestId('contributing-evidence');
  const id = new URL(page.url()).pathname.split('/').at(-1);
  const {opportunity} = await (await page.request.get(`/api/v1/opportunities/${id}`)).json();
  for (const item of opportunity.evaluation.contributions) {
    const signal = opportunity.signals.find(signal => signal.id === item.signalId);
    const row = evidence.getByRole('listitem').filter({has: page.getByText(signal.subject, {exact: true})});
    await expect(row).toHaveCount(1);
    await expect(row.locator('b')).toHaveText(`${item.contribution > 0 ? '+' : ''}${item.contribution}`);
    await expect(row).toContainText(item.source);
    const type = item.signalType.split(/[_.-]/).map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
    await expect(row.getByText(type, {exact: true})).toBeVisible();
  }
  await page.getByText('Audit details', {exact: true}).click();
  await expect(page.getByTestId('opportunity-detail')).toContainText('Occurred');
  await expect(page.getByTestId('opportunity-detail')).toContainText('Recorded');
  await expect(page.getByTestId('opportunity-detail')).toContainText('Actor Website form (Source)');
  await expect(page.getByTestId('opportunity-detail')).toContainText('source Signals');
  await accessible(page);
  await page.goto(`/app/drafts/${issued.draft.id}`);
  await expect(page.getByTestId('draft-body')).toHaveValue(issued.draft.body);
  await accessible(page);
  await page.goto('/app/records?kind=contact');
  await page.getByRole('button', {name: 'Create contact', exact: true}).click();
  await expect(page.getByLabel('Full name', {exact: true})).toBeVisible();
  await accessible(page);
  await page.goto('/app/settings');
  await expect(page.getByRole('button', {name: 'Invite operator', exact: true})).toBeVisible();
  await accessible(page);
  await phoneDashboard(page);
  expect(errors).toEqual([]);
});

async function accessible(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const result = await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(result.violations).toEqual([]);
}
