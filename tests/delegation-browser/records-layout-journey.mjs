import { expect } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tabTo } from '../support/keyboard-focus.mjs';

const evidence = resolve(process.env.ORBIT_RECORD_EVIDENCE ?? '.orbit-viewport-evidence/record-layout');
const viewports = [
  { name: '320', width: 320, height: 844 },
  { name: '390', width: 390, height: 844 },
  { name: '430', width: 430, height: 932 },
  { name: 'desktop', width: 1440, height: 900 }
];

function longName(prefix, nonce) {
  return `${prefix}${nonce}${'x'.repeat(200 - prefix.length - nonce.length)}`;
}

export async function nativeLongRecordLayoutJourney(page) {
  await mkdir(evidence, { recursive: true });
  const diagnostics = { viewportChecks: [], consoleErrors: [], pageErrors: [], failedRequests: [] };
  page.on('console', message => { if (message.type() === 'error') diagnostics.consoleErrors.push(message.text()); });
  page.on('pageerror', error => diagnostics.pageErrors.push(error.message));
  page.on('requestfailed', request => diagnostics.failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));

  try {
    await page.goto('/app/records', { waitUntil: 'networkidle' });
    const origin = new URL(page.url()).origin;
    const nonce = randomBytes(10).toString('hex');
    const companyName = longName('company', nonce);
    const editedCompanyName = `${companyName.slice(0, -1)}y`;
    const contactName = longName('contact', nonce);
    const editedContactName = `${contactName.slice(0, -1)}y`;
    const opportunityTitle = longName('opportunity', nonce);
    const editedOpportunityTitle = `${opportunityTitle.slice(0, -1)}y`;
    expect([companyName, contactName, opportunityTitle].map(value => value.length)).toEqual([200, 200, 200]);

    const companyResponse = await page.request.post('/api/v1/records/company', {
      headers: { Origin: origin },
      data: { name: companyName }
    });
    expect(companyResponse.status(), await companyResponse.text()).toBe(201);
    const company = await companyResponse.json();
    const contactResponse = await page.request.post('/api/v1/records/contact', {
      headers: { Origin: origin },
      data: { name: contactName, email: `record-layout-${nonce}@example.test` }
    });
    expect(contactResponse.status(), await contactResponse.text()).toBe(201);
    const contact = await contactResponse.json();

    await editRecordThroughKeyboard(page, 'company', companyName, 'Company name', editedCompanyName);
    await expectRecordList(page, 'company', editedCompanyName, 'company', diagnostics);

    await editRecordThroughKeyboard(page, 'contact', contactName, 'Full name', editedContactName);
    await expectRecordList(page, 'contact', editedContactName, 'contact', diagnostics);

    const nowResponse = await page.request.get('/api/v1/opportunities/now');
    expect(nowResponse.status(), await nowResponse.text()).toBe(200);
    const now = await nowResponse.json();
    expect(now.opportunities.length).toBeGreaterThan(0);
    const target = now.opportunities[0];

    await editRecordThroughKeyboard(page, 'opportunity', target.title, 'Opportunity title', editedOpportunityTitle, async () => {
      await page.getByRole('combobox', { name: 'Linked company', exact: true }).selectOption(company.id);
      const contactOption = page.locator('.record-editor fieldset label').filter({ hasText: editedContactName }).locator('input[type="checkbox"]');
      await contactOption.check();
      await page.getByRole('combobox', { name: 'Primary recipient', exact: true }).selectOption(contact.id);
    });
    await expectRecordList(page, 'opportunity', editedOpportunityTitle, 'opportunity', diagnostics);

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/app', { waitUntil: 'networkidle' });
      const row = page.getByRole('link', { name: `Open ${editedOpportunityTitle}`, exact: true });
      await expect(row).toBeVisible();
      const companyLine = row.locator('.operator-queue-card__headline p');
      await expect(companyLine).toHaveText(editedCompanyName);
      await assertWrappedText(companyLine, editedCompanyName);
      const metrics = await assertReadablePage(page, viewport, row.getByRole('heading', { name: editedOpportunityTitle, exact: true }), editedOpportunityTitle);
      diagnostics.viewportChecks.push({ name: viewport.name, surface: 'now', ...metrics });
      await page.screenshot({ path: `${evidence}/now-${viewport.name}.png`, fullPage: true });
    }

    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto('/app');
    const targetLink = page.getByRole('link', { name: `Open ${editedOpportunityTitle}`, exact: true });
    await expect(targetLink).toBeVisible();
    await tabTo(page, async active => await active.getAttribute('aria-label') === `Open ${editedOpportunityTitle}`);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: editedOpportunityTitle, exact: true, level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: editedCompanyName, exact: true, level: 2 })).toBeVisible();
    // An opportunity without handoffs shows no empty handoff section; its next action is always present.
    await expect(page.getByTestId('next-action')).toBeVisible();
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const title = page.getByRole('heading', { name: editedOpportunityTitle, exact: true, level: 1 });
      await expect(title).toBeVisible();
      const companyHeading = page.getByRole('heading', { name: editedCompanyName, exact: true, level: 2 });
      await expect(companyHeading).toBeVisible();
      const metrics = await assertReadablePage(page, viewport, title, editedOpportunityTitle);
      await assertWrappedText(companyHeading, editedCompanyName);
      diagnostics.viewportChecks.push({ name: viewport.name, surface: 'opportunity-detail', ...metrics });
      await page.screenshot({ path: `${evidence}/detail-${viewport.name}.png`, fullPage: true });
    }

    expect(diagnostics.consoleErrors).toEqual([]);
    expect(diagnostics.pageErrors).toEqual([]);
    expect(diagnostics.failedRequests).toEqual([]);
  } finally {
    await writeFile(`${evidence}/browser-diagnostics.json`, JSON.stringify(diagnostics, null, 2) + '\n');
  }
}

async function editRecordThroughKeyboard(page, kind, title, fieldLabel, editedTitle, beforeSave) {
  await page.goto('/app/records', { waitUntil: 'networkidle' });
  if (kind === 'company') await awaitRecordReload(page, kind, '', () => page.getByRole('button', { name: 'Companies', exact: true }).click());
  if (kind === 'contact') await awaitRecordReload(page, kind, '', () => page.getByRole('button', { name: 'Contacts', exact: true }).click());
  const search = page.getByRole('searchbox', { name: 'Search records and timeline', exact: true });
  await awaitRecordReload(page, kind, title, () => search.fill(title));
  const card = page.locator('.operator-queue-card').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
  await expect(card).toHaveCount(1);
  await tabTo(page, async active => await active.evaluate((element, expected) => element.matches('button') && element.closest('.operator-queue-card')?.querySelector('h2')?.textContent === expected, title));
  await expect(card.getByRole('button')).toBeFocused();
  await awaitRecordDetail(page, kind, () => page.keyboard.press('Enter'));
  await expect(page.getByRole('button', { name: 'Edit details', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit details', exact: true }).click();
  await page.getByLabel(fieldLabel, { exact: true }).fill(editedTitle);
  if (beforeSave) await beforeSave();
  await awaitRecordDetail(page, kind, () => awaitRecordReload(page, kind, title, () => page.getByRole('button', { name: 'Save changes', exact: true }).click()));
  await expect(page.getByRole('heading', { name: editedTitle, exact: true, level: 1 })).toBeVisible();
  // The open record lives in the address bar, so a reload reopens the saved record itself.
  await awaitRecordDetail(page, kind, () => page.reload({ waitUntil: 'networkidle' }));
  await expect(page.getByRole('heading', { name: editedTitle, exact: true, level: 1 })).toBeVisible();
  await page.goto('/app/records', { waitUntil: 'networkidle' });
  const tabName = kind === 'company' ? 'Companies' : kind === 'contact' ? 'Contacts' : 'Opportunities';
  if (kind !== 'opportunity') await awaitRecordReload(page, kind, '', () => page.getByRole('button', { name: tabName, exact: true }).click());
  await awaitRecordReload(page, kind, editedTitle, () => page.getByRole('searchbox', { name: 'Search records and timeline', exact: true }).fill(editedTitle));
  await expect(page.getByRole('heading', { name: editedTitle, exact: true })).toBeVisible();
}

async function expectRecordList(page, kind, title, evidenceName, diagnostics) {
  const tabName = kind === 'company' ? 'Companies' : kind === 'contact' ? 'Contacts' : 'Opportunities';
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/app/records', { waitUntil: 'networkidle' });
    if (kind !== 'opportunity') await awaitRecordReload(page, kind, '', () => page.getByRole('button', { name: tabName, exact: true }).click());
    await awaitRecordReload(page, kind, title, () => page.getByRole('searchbox', { name: 'Search records and timeline', exact: true }).fill(title));
    const heading = page.getByRole('heading', { name: title, exact: true });
    await expect(heading).toBeVisible();
    const metrics = await assertReadablePage(page, viewport, heading, title);
    diagnostics.viewportChecks.push({ name: viewport.name, surface: evidenceName, ...metrics });
    await page.screenshot({ path: `${evidence}/${evidenceName}-${viewport.name}.png`, fullPage: true });
    if (viewport.name === '320') {
      await tabTo(page, async active => await active.evaluate((element, expected) => element.matches('button') && element.closest('.operator-queue-card')?.querySelector('h2')?.textContent === expected, title));
      await awaitRecordDetail(page, kind, () => page.keyboard.press('Enter'));
      await expect(page.getByRole('heading', { name: title, exact: true, level: 1 })).toBeVisible();
    }
  }
}

async function awaitRecordDetail(page, kind, action) {
  // The heading renders before the capture and relationship panels finish.
  // Read every panel before editing, reloading, or leaving this record.
  const detailLoad = page.waitForResponse(response => {
    const url = new URL(response.url());
    return response.request().method() === 'GET' && url.pathname.startsWith(`/api/v1/records/${kind}/`);
  });
  const proposalsLoad = kind === 'opportunity' ? undefined : page.waitForResponse(response => {
    const url = new URL(response.url());
    return response.request().method() === 'GET' && url.pathname === '/api/v1/capture/proposals' && url.searchParams.get('recordType') === kind;
  });
  const relationshipsLoad = kind === 'company' ? undefined : page.waitForResponse(response => {
    return response.request().method() === 'GET' && new URL(response.url()).pathname.startsWith(`/api/v1/relationships/${kind}/`);
  });
  const optionLoads = kind === 'company' ? [] : (kind === 'contact' ? ['company'] : ['contact', 'company']).map(type => page.waitForResponse(response => {
    const url = new URL(response.url());
    return response.request().method() === 'GET' && url.pathname === `/api/v1/records/${type}` && url.searchParams.get('q') === '';
  }));
  const [detailResponse, proposalsResponse, relationshipsResponse, ...optionResponses] = await Promise.all([detailLoad, proposalsLoad, relationshipsLoad, ...optionLoads, action()]);
  expect(detailResponse.ok(), `${detailResponse.url()}: ${await detailResponse.text()}`).toBe(true);
  const detail = await detailResponse.json();
  if (proposalsResponse) {
    expect(new URL(proposalsResponse.url()).searchParams.get('recordId')).toBe(detail.record.id);
    expect(proposalsResponse.ok(), `${proposalsResponse.url()}: ${await proposalsResponse.text()}`).toBe(true);
    expect(Array.isArray((await proposalsResponse.json()).proposals)).toBe(true);
  }
  if (relationshipsResponse) {
    expect(relationshipsResponse.ok(), `${relationshipsResponse.url()}: ${await relationshipsResponse.text()}`).toBe(true);
    const context = await relationshipsResponse.json();
    expect(new URL(relationshipsResponse.url()).pathname).toBe(`/api/v1/relationships/${kind}/${detail.record.id}`);
    expect(context.kind).toBe(kind);
  }
  // The last Promise.all result belongs to the action itself.
  for (const response of optionResponses.slice(0, optionLoads.length)) {
    expect(response.ok(), `${response.url()}: ${await response.text()}`).toBe(true);
    expect(Array.isArray((await response.json()).records)).toBe(true);
  }
}

async function awaitRecordReload(page, kind, query, action) {
  // RecordsPage.reload loads these four responses together after tab/search/save.
  // A saved detail heading (or a row still matching the new search) can appear
  // before its supporting loads finish; navigating then aborts real requests.
  const loads = [
    { path: `/api/v1/records/${kind}`, query },
    { path: '/api/v1/records/company' },
    { path: '/api/v1/records/contact' },
    { path: '/api/v1/settings' }
  ].map(async ({ path, query: expectedQuery }) => {
    const response = await page.waitForResponse(response => {
      const url = new URL(response.url());
      return response.request().method() === 'GET' && url.pathname === path &&
        (expectedQuery === undefined ? url.search === '' : url.searchParams.get('q') === expectedQuery);
    });
    expect(response.ok(), `${response.url()}: ${await response.text()}`).toBe(true);
    const body = await response.json();
    if (path === '/api/v1/settings') {
      expect(body.workspace).toBeTruthy();
      expect(Array.isArray(body.stages)).toBe(true);
      expect(Array.isArray(body.operators)).toBe(true);
    } else {
      expect(Array.isArray(body.records)).toBe(true);
    }
  });
  await Promise.all([...loads, action()]);
}

async function assertReadablePage(page, viewport, heading, expectedText) {
  const document = await page.evaluate(() => {
    const root = document.documentElement, body = document.body;
    const overflowingElements = Array.from(body.querySelectorAll('*')).map(element => {
      const rect = element.getBoundingClientRect();
      return { tag: element.tagName.toLowerCase(), className: typeof element.className === 'string' ? element.className : '', right: Math.round(rect.right), left: Math.round(rect.left) };
    }).filter(item => item.right > innerWidth + 1 || item.left < -1).slice(0, 20);
    return { viewportWidth: innerWidth, documentWidth: Math.max(root.scrollWidth, body.scrollWidth), overflowingElements };
  });
  expect(document.documentWidth, `${viewport.name}: ${JSON.stringify(document.overflowingElements)}`).toBeLessThanOrEqual(viewport.width);
  expect(document.overflowingElements, `${viewport.name}: elements outside the viewport`).toEqual([]);
  const text = await assertWrappedText(heading, expectedText);
  return { ...document, titleWidth: text.clientWidth, titleHeight: text.scrollHeight, overflowWrap: text.overflowWrap };
}

async function assertWrappedText(element, expectedText) {
  const text = await element.evaluate(node => ({
    value: node.textContent,
    scrollWidth: node.scrollWidth,
    clientWidth: node.clientWidth,
    scrollHeight: node.scrollHeight,
    lineHeight: Number.parseFloat(getComputedStyle(node).lineHeight),
    overflowWrap: getComputedStyle(node).overflowWrap
  }));
  expect(text.value).toBe(expectedText);
  expect(text.scrollWidth).toBeLessThanOrEqual(text.clientWidth + 1);
  expect(text.scrollHeight).toBeGreaterThan(text.lineHeight + 1);
  expect(text.overflowWrap).toBe('anywhere');
  return text;
}
