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
    await page.goto('/app/opportunities', { waitUntil: 'networkidle' });
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

    await editRecordThroughKeyboard(page, 'contact', contactName, 'Contact name', editedContactName);
    await expectRecordList(page, 'contact', editedContactName, 'contact', diagnostics);

    const nowResponse = await page.request.get('/api/v1/opportunities/now');
    expect(nowResponse.status(), await nowResponse.text()).toBe(200);
    const now = await nowResponse.json();
    expect(now.opportunities.length).toBeGreaterThan(0);
    const target = now.opportunities[0];
    const multipleOwners = new Set(now.opportunities.map(item => item.ownerId)).size > 1;
    const expectedMeta = [editedCompanyName, target.stage, ...(multipleOwners ? [target.ownerName ?? 'Unassigned'] : [])].filter(Boolean).join(' · ');

    // OR3+OR4: a deal's company and people are values in its Details; each choice saves its relationships at once.
    await editRecordThroughKeyboard(page, 'opportunity', target.title, 'Opportunity title', editedOpportunityTitle, async () => {
      const details = page.getByTestId('record-details');
      const relationships = () => page.waitForResponse(response => response.request().method() === 'PUT' && new URL(response.url()).pathname === `/api/v1/relationships/opportunity/${target.id}`);
      let saved = relationships();
      await details.getByRole('searchbox', { name: 'Company', exact: true }).fill(editedCompanyName);
      await details.getByRole('list', { name: 'Company: matches', exact: true }).getByRole('button').filter({ hasText: editedCompanyName }).click();
      expect((await saved).ok()).toBe(true);
      saved = relationships();
      await details.getByRole('searchbox', { name: 'Add a person', exact: true }).fill(editedContactName);
      await details.getByRole('list', { name: 'Add a person: matches', exact: true }).getByRole('button').filter({ hasText: editedContactName }).click();
      expect((await saved).ok()).toBe(true);
      const person = details.locator('.r-person').filter({ hasText: editedContactName });
      await expect(person).toHaveCount(1);
      if (!(await person.innerText()).includes('Primary recipient')) {
        saved = relationships();
        await person.getByRole('button', { name: `More for ${editedContactName}`, exact: true }).click();
        await page.getByRole('menuitem', { name: 'Make primary recipient', exact: true }).click();
        expect((await saved).ok()).toBe(true);
      }
      await expect(person).toContainText('Primary recipient');
    });
    await expectRecordList(page, 'opportunity', editedOpportunityTitle, 'opportunity', diagnostics);
    const savedOpportunity = await page.request.get(`/api/v1/records/opportunity/${target.id}`);
    const savedDetail = await savedOpportunity.json();
    expect(savedDetail.contacts.some(item => item.id === contact.id && item.is_primary === 1)).toBe(true);
    expect(savedDetail.record.company_id).toBe(company.id);

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/app', { waitUntil: 'networkidle' });
      const row = page.getByRole('link', { name: `Open ${editedOpportunityTitle}`, exact: true });
      await expect(row).toBeVisible();
      const companyLine = row.locator('.operator-queue-card__headline p');
      await expect(companyLine).toHaveText(expectedMeta);
      await assertWrappedText(companyLine, expectedMeta);
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
    const companyLink = page.getByRole('main').getByRole('link', { name: editedCompanyName, exact: true }).first();
    await expect(companyLink).toBeVisible();
    // An opportunity without handoffs shows no empty handoff section; its next action is always present.
    await expect(page.getByTestId('next-action')).toBeVisible();
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await expect(page.getByRole('heading', { name: editedOpportunityTitle, exact: true, level: 1 })).toBeVisible();
      const title = page.getByLabel('Opportunity title', { exact: true });
      await expect(companyLink).toBeVisible();
      const metrics = await assertReadablePage(page, viewport, title, editedOpportunityTitle);
      await assertWrappedText(companyLink, editedCompanyName);
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

const listPath = { company: '/app/companies', contact: '/app/contacts', opportunity: '/app/opportunities' };

async function editRecordThroughKeyboard(page, kind, title, fieldLabel, editedTitle, afterTitle) {
  await awaitRecordReload(page, kind, '', () => page.goto(listPath[kind], { waitUntil: 'networkidle' }));
  const search = page.getByRole('searchbox', { name: 'Search records and timeline', exact: true });
  await awaitRecordReload(page, kind, title, () => search.fill(title));
  const card = page.locator('.operator-queue-card').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
  await expect(card).toHaveCount(1);
  await tabTo(page, async active => await active.evaluate((element, expected) => element.matches('a') && element.closest('.operator-queue-card')?.querySelector('h2')?.textContent === expected, title));
  await expect(card.getByRole('link')).toBeFocused();
  await awaitRecordDetail(page, kind, () => page.keyboard.press('Enter'));
  await expect(page).toHaveURL(new RegExp(`${listPath[kind]}/[0-9A-HJKMNP-TV-Z]{26}$`));
  // The title is the record's name as a field: Enter saves it, as leaving it would.
  const field = page.getByLabel(fieldLabel, { exact: true });
  await field.fill(editedTitle);
  const saved = page.waitForResponse(response => response.request().method() === 'PATCH' && new URL(response.url()).pathname.startsWith(`/api/v1/records/${kind}/`));
  await field.press('Enter');
  expect((await saved).ok()).toBe(true);
  if (afterTitle) await afterTitle();
  await expect(page.getByRole('heading', { name: editedTitle, exact: true, level: 1 })).toBeVisible();
  // The record lives in the address bar, so a reload reopens the saved record itself. The reload commits before its
  // reads are awaited, so a read the save started in the old page is never taken for the new page's.
  await page.reload({ waitUntil: 'commit' });
  await awaitRecordDetail(page, kind, () => page.waitForLoadState('networkidle'));
  await expect(page.getByRole('heading', { name: editedTitle, exact: true, level: 1 })).toBeVisible();
  await awaitRecordReload(page, kind, '', () => page.goto(listPath[kind], { waitUntil: 'networkidle' }));
  await awaitRecordReload(page, kind, editedTitle, () => page.getByRole('searchbox', { name: 'Search records and timeline', exact: true }).fill(editedTitle));
  await expect(page.getByRole('heading', { name: editedTitle, exact: true })).toBeVisible();
}

async function expectRecordList(page, kind, title, evidenceName, diagnostics) {
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await awaitRecordReload(page, kind, '', () => page.goto(listPath[kind], { waitUntil: 'networkidle' }));
    await awaitRecordReload(page, kind, title, () => page.getByRole('searchbox', { name: 'Search records and timeline', exact: true }).fill(title));
    const heading = page.getByRole('heading', { name: title, exact: true });
    await expect(heading).toBeVisible();
    if (kind !== 'opportunity') {
      const selection = page.getByRole('checkbox', { name: `Select ${title}`, exact: true });
      await selection.check();
      await expect(page.getByRole('button', { name: 'Review assignment', exact: true })).toBeVisible();
      await selection.uncheck();
      await expect(page.getByRole('button', { name: 'Review assignment', exact: true })).toHaveCount(0);
    }
    const metrics = await assertReadablePage(page, viewport, heading, title);
    diagnostics.viewportChecks.push({ name: viewport.name, surface: evidenceName, ...metrics });
    await page.screenshot({ path: `${evidence}/${evidenceName}-${viewport.name}.png`, fullPage: true });
    if (viewport.name === '320') {
      await tabTo(page, async active => await active.evaluate((element, expected) => element.matches('a') && element.closest('.operator-queue-card')?.querySelector('h2')?.textContent === expected, title));
      await awaitRecordDetail(page, kind, () => page.keyboard.press('Enter'));
      await expect(page.getByRole('heading', { name: title, exact: true, level: 1 })).toBeVisible();
    }
  }
}

async function awaitRecordDetail(page, kind, action) {
  // The heading renders before the proposal and relationship reads finish.
  // Read every one before editing, reloading, or leaving this record. Only reads this action starts count: a save's
  // own re-read, or the open page's periodic one, may still be answering when a reload navigates away from it.
  const started = new Set();
  const track = request => { if (request.method() === 'GET') started.add(request); };
  page.on('request', track);
  const read = response => started.has(response.request());
  const detailLoad = page.waitForResponse(response => {
    const url = new URL(response.url());
    return read(response) && new RegExp(`^/api/v1/records/${kind}/[0-9A-HJKMNP-TV-Z]{26}$`).test(url.pathname);
  });
  const proposalsLoad = kind === 'opportunity' ? undefined : page.waitForResponse(response => {
    const url = new URL(response.url());
    return read(response) && url.pathname === '/api/v1/capture/proposals' && url.searchParams.get('recordType') === kind;
  });
  const relationshipsLoad = kind === 'company' ? undefined : page.waitForResponse(response => {
    return read(response) && new URL(response.url()).pathname.startsWith(`/api/v1/relationships/${kind}/`);
  });
  const [detailResponse, proposalsResponse, relationshipsResponse] = await Promise.all([detailLoad, proposalsLoad, relationshipsLoad, action()]).finally(() => page.off('request', track));
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
}

async function awaitRecordReload(page, kind, query, action) {
  // A list reads its kind's records for the search in its box; act only once that read has answered.
  const load = page.waitForResponse(response => {
    const url = new URL(response.url());
    return response.request().method() === 'GET' && url.pathname === `/api/v1/records/${kind}` && (url.searchParams.get('q') ?? '') === query;
  });
  const [response] = await Promise.all([load, action()]);
  expect(response.ok(), `${response.url()}: ${await response.text()}`).toBe(true);
  expect(Array.isArray((await response.json()).records)).toBe(true);
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
    value: node instanceof HTMLTextAreaElement ? node.value : node.textContent,
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
