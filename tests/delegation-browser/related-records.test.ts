import {isolateBrowserTemp} from '../support/browser-temp.mjs';
isolateBrowserTemp();
import { test } from 'node:test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { isolatedDatabase } from '../support/isolated-database';
import { createTestDependencies } from '../support/test-dependencies';
import { sampleData } from '../fixtures/sample-data';
import { sessionCookieName } from '../support/test-auth';
import { identityVarArgs } from '../support/worker-identity.mjs';

test('full related names and associated-contact labels remain readable in native record details and editors', async () => {
  const fixture = await isolatedDatabase();
  const port = Number(process.env.ORBIT_RELATED_RECORD_PORT ?? 8729);
  const origin = `http://127.0.0.1:${port}`;
  const evidence = resolve(process.env.ORBIT_RELATED_RECORD_EVIDENCE ?? 'verification/ui/related-records');
  await mkdir(evidence, { recursive: true });
  let worker: ReturnType<typeof spawn> | undefined;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    const deps = createTestDependencies(fixture.db);
    await deps.sampleData.seed();
    const session = await deps.auth.createSession(sampleData.operators[0].id);
    await fixture.close();
    worker = spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'dev', '--config',
      'dist/server/wrangler.json', '--local', '--persist-to', fixture.directory, '--port', String(port),
      '--inspector-port', process.env.ORBIT_RELATED_RECORD_INSPECTOR_PORT ?? '0', ...identityVarArgs(origin)],
      { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, CI: '1' } });
    let output = '';
    worker.stdout!.on('data', chunk => { output += chunk; });
    worker.stderr!.on('data', chunk => { output += chunk; });
    let ready = false;
    for (let i = 0; i < 300; i++) {
      try { if ((await fetch(origin + '/health')).ok) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!ready) throw new Error(output || 'Related-record Worker startup failed.');
    browser = await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']});
    const context = await browser.newContext({ baseURL: origin, extraHTTPHeaders: { Cookie: `${sessionCookieName}=${session.token}` } });
    const page = await context.newPage(), errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const title = 'M'.repeat(200), company = 'W'.repeat(200), contact = 'Q'.repeat(200);
    const inventory = await (await context.request.get('/api/v1/workbench')).json();
    const created = await context.request.post('/api/v1/workbench/opportunities', { headers: { Origin: origin },
      data: { title, companyName: company, contactName: contact, email: 'full-related-name@example.test',
        stageId: inventory.stages[0].id, valueCents: 12345678 } });
    expect(created.status(), await created.text()).toBe(201);
    const opportunity = await created.json();
    async function readable(locator: any, text: string) {
      await expect(locator).toBeVisible();
      const result = await locator.evaluate((element: HTMLElement, expected: string) => {
        const violations: string[] = [];
        if (!element.textContent?.includes(expected)) violations.push('missing full text');
        for (let ancestor: HTMLElement | null = element; ancestor; ancestor = ancestor.parentElement) {
          const style = getComputedStyle(ancestor);
          if (['hidden', 'clip'].includes(style.overflowX) || style.textOverflow === 'ellipsis'
              || !['none', '0', ''].includes(style.webkitLineClamp)) violations.push('clipped or truncated ancestor');
        }
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        let node: Node | null;
        while ((node = walker.nextNode())) {
          for (let i = 0; i < (node.textContent?.length ?? 0); i++) {
            if (!node.textContent![i].trim()) continue;
            const range = document.createRange(); range.setStart(node, i); range.setEnd(node, i + 1);
            const boxes = [...range.getClientRects()];
            if (!boxes.length || boxes.some(box => box.left < -0.5 || box.right > innerWidth + 0.5)) violations.push('character outside viewport');
          }
        }
        const offenders = [...document.querySelectorAll<HTMLElement>('body *')].filter(node => node.getBoundingClientRect().right > innerWidth + 1).slice(-12).map(node => ({tag:node.tagName,classes:node.className,text:node.textContent?.slice(0,70),width:node.getBoundingClientRect().width}));
        return { violations, width: document.documentElement.scrollWidth, viewport: innerWidth, offenders };
      }, text);
      expect(result.violations).toEqual([]);
      expect(result.width, JSON.stringify(result.offenders)).toBeLessThanOrEqual(result.viewport);
    }
    for (const width of [320, 390, 430, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const [tab, name, related] of [['Companies', company, [contact, title]], ['Contacts', contact, [title]], ['Opportunities', title, [contact]]] as const) {
        await page.goto('/app/records');
        const button = page.getByRole('button', { name: tab, exact: true });
        await expect(button).toBeEnabled(); await button.click();
        await page.getByRole('searchbox', { name: 'Search records and timeline', exact: true }).fill(name);
        const card = page.locator('.operator-queue-card').filter({ has: page.getByRole('heading', { name, exact: true }) });
        await expect(card).toHaveCount(1); await card.getByRole('button').click();
        await expect(page.getByRole('heading', { name, exact: true, level: 1 })).toBeVisible();
        for (const text of related) await readable(page.locator('.workbench-summary p').filter({ hasText: text }), text);
        await page.screenshot({ path: `${evidence}/${tab.toLowerCase()}-${width}.png`, fullPage: true });
        if (tab === 'Opportunities') {
          await page.getByRole('button', { name: 'Edit details', exact: true }).click();
          const label = page.locator('.record-editor fieldset label').filter({ hasText: contact });
          await expect(label.locator('input[type=checkbox]')).toBeChecked();
          await readable(label, contact);
          await expect(page.getByLabel('Opportunity title', { exact: true })).toHaveValue(title);
          await page.screenshot({ path: `${evidence}/editor-${width}.png`, fullPage: true });
          await page.getByRole('button', { name: 'Save changes', exact: true }).click();
          await expect(page.getByRole('heading', { name: title, exact: true, level: 1 })).toBeVisible();
          const saved = await (await context.request.get(`/api/v1/records/opportunity/${opportunity.id}`)).json();
          expect(saved.record.title).toBe(title);
          expect(saved.contacts.some((row: any) => row.name === contact)).toBe(true);
        }
      }
    }
    expect(errors).toEqual([]);
  } finally {
    await browser?.close();
    if (worker && worker.exitCode === null) { const exit = once(worker, 'exit'); worker.kill('SIGTERM'); await exit; }
    await fixture.dispose();
  }
});
