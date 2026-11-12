import {isolateBrowserTemp} from '../support/browser-temp.mjs';
isolateBrowserTemp();
import { test } from 'node:test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { chromium, expect } from '@playwright/test';
import { isolatedDatabase } from '../support/isolated-database';
import { createTestDependencies } from '../support/test-dependencies';
import { sampleData } from '../fixtures/sample-data';
import { sessionCookieName } from '../support/test-auth';
import { identityVarArgs } from '../support/worker-identity.mjs';

test('full related names and contact labels remain readable; deal and company Stripe evidence and paused owner setup work at desktop and mobile widths', async () => {
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
    await fixture.db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(sampleData.operators[0].id).run();
    const billingDeal=sampleData.opportunities.find(deal=>deal.companyId)!;
    const billingCompany=sampleData.companies.find(company=>company.id===billingDeal.companyId)!;
    const billingContact=sampleData.contacts.find(contact=>contact.companyId===billingCompany.id&&contact.email)!;
    const customerId='synthetic-orbit-browser-1',customerHash=createHash('sha256').update(customerId).digest('hex');
    const receivedAt=new Date().toISOString();
    // Persisted evidence is portable; leaving credentials absent proves its truthful paused state after restore.
    await fixture.db.batch([
      fixture.db.prepare("INSERT INTO billing_connection(id,connected_at,checked_at,last_event_at) VALUES('stripe',?,?,?)").bind(receivedAt,receivedAt,receivedAt),
      fixture.db.prepare('INSERT INTO billing_mappings(customer_id,customer_hash,company_id,opportunity_id,contact_id,name,email,domain,reviewed_at,reviewed_by) VALUES(?,?,?,?,?,?,?,?,?,?)')
        .bind(customerId,customerHash,billingCompany.id,billingDeal.id,billingContact.id,billingContact.name,billingContact.email,billingCompany.primaryDomain,receivedAt,sampleData.operators[0].id),
      ...[
        {id:'synthetic-orbit-browser-2',type:'invoice.payment_failed',state:'past-due',amount:125000},
        {id:'synthetic-orbit-browser-3',type:'invoice.paid',state:'paid',amount:125000},
        {id:'synthetic-orbit-browser-4',type:'charge.refunded',state:'refunded',amount:25000},
      ].map((event,index)=>{
        const occurredAt=new Date(Date.parse(receivedAt)-(3-index)*60000).toISOString();
        return fixture.db.prepare('INSERT INTO billing_events(id,customer_id,customer_hash,object_id,event_type,state,currency,amount_cents,occurred_at,source_created,received_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
          .bind(event.id,customerId,customerHash,`synthetic-orbit-browser-object-${index}`,event.type,event.state,'USD',event.amount,occurredAt,Math.floor(Date.parse(occurredAt)/1000),receivedAt);
      }),
    ]);
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
    const initial = await context.request.get(`/api/v1/records/opportunity/${opportunity.id}`);
    expect(initial.ok()).toBe(true);
    const original = await initial.json(), linkedContact = original.contacts.find((row: any) => row.name === contact);
    expect(linkedContact).toBeDefined();
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
        // OR3: each list has its own address; a row is a link to the record's own page, its related records in Details.
        await page.goto(`/app/${tab.toLowerCase()}`);
        await page.getByRole('searchbox', { name: 'Search records and timeline', exact: true }).fill(name);
        const card = page.locator('.operator-queue-card').filter({ has: page.getByRole('heading', { name, exact: true }) });
        await expect(card).toHaveCount(1); await card.getByRole('link').click();
        await expect(page.getByRole('heading', { name, exact: true, level: 1 })).toBeVisible();
        const details = page.getByTestId('record-details');
        for (const text of related) await readable(details.locator('.r-person, .r-deal-rows li').filter({ hasText: text }).first(), text);
        await page.screenshot({ path: `${evidence}/${tab.toLowerCase()}-${width}.png`, fullPage: true });
        if (tab === 'Opportunities') {
          const person = details.locator('.r-person').filter({ hasText: contact });
          await expect(person).toHaveCount(1);
          await readable(person, contact);
          await expect(person).toContainText('Primary recipient');
          const more=person.getByRole('button', { name: `More for ${contact}`, exact: true });
          await expect(more).toBeEnabled();
          await more.focus();
          await expect(page.getByRole('tooltip',{name:`More for ${contact}`,exact:true})).toBeVisible();
          await more.blur();
          await expect(page.getByLabel('Opportunity title', { exact: true })).toHaveValue(title);
          await page.screenshot({ path: `${evidence}/editor-${width}.png`, fullPage: true });
          const saved = await (await context.request.get(`/api/v1/records/opportunity/${opportunity.id}`)).json();
          expect(saved.record.title).toBe(title);
          expect(saved.contacts.some((row: any) => row.name === contact)).toBe(true);
          expect(saved.contacts.find((row: any) => row.id === linkedContact.id)?.is_primary).toBe(1);
        }
      }
    }
    const beforeBilling=await (await context.request.get(`/api/v1/records/opportunity/${billingDeal.id}`)).json();
    for(const width of [1440,390]){
      await page.setViewportSize({width,height:1000});
      for(const [recordKind,recordId] of [['opportunities',billingDeal.id],['companies',billingCompany.id]] as const){
        await page.goto(`/app/${recordKind}/${recordId}`);
        const panel=page.locator('.deal-billing');
        await expect(panel).toBeVisible();
        await expect(panel.locator('.billing-timeline li')).toHaveCount(3);
        for(const eventType of ['invoice.payment_failed','invoice.paid','charge.refunded']){
          const event=panel.locator('.billing-timeline li').filter({hasText:eventType});
          await expect(event).toHaveCount(1);
          await expect(event.locator('.billing-meta')).toContainText(/Occurred .+ · Received .+/);
          await readable(event,eventType);
        }
        await expect(panel.locator('.billing-timeline li').filter({hasText:'invoice.payment_failed'})).toContainText('Past due');
        await expect(panel.locator('.billing-timeline li').filter({hasText:'invoice.paid'})).toContainText('USD 1,250.00');
        await expect(panel.locator('.billing-timeline li').filter({hasText:'charge.refunded'})).toContainText('USD 250.00');
        await expect(panel.locator('.billing-source')).toContainText(/Paused/);
        await expect(panel.locator('.billing-source')).toContainText(/Last Stripe event received/);
        await readable(panel.locator('.billing-identity'),billingContact.email!);
        await expect(panel.locator('.billing-identity')).toContainText(billingCompany.primaryDomain!);
        await expect(panel.locator('.billing-identity a')).toHaveAttribute('href',`https://dashboard.stripe.com/test/customers/${customerId}`);
        await expect(panel.getByRole('button',{name:'Confirm customer link',exact:true})).toHaveCount(0);
        await expect(panel.locator('form')).toHaveCount(0);
        await page.screenshot({path:`${evidence}/stripe-${recordKind}-${width}.png`,fullPage:true});
        await panel.screenshot({path:`${evidence}/stripe-${recordKind}-panel-${width}.png`});
      }
      await page.goto('/app/settings/integrations#stripe-settings');
      const settings=page.locator('.stripe-settings');
      await expect(settings.locator('.stripe-connection')).toHaveAttribute('data-state','paused');
      await expect(settings.locator('input[type="password"]')).toHaveCount(2);
      await expect(settings.getByRole('button',{name:'Check and connect Stripe test mode',exact:true})).toBeDisabled();
      await expect(settings.locator('.stripe-webhook code')).toContainText('/api/v1/billing/stripe/events');
      await readable(settings.locator('.stripe-webhook'),'/api/v1/billing/stripe/events');
      await page.screenshot({path:`${evidence}/stripe-settings-${width}.png`,fullPage:true});
      await settings.screenshot({path:`${evidence}/stripe-settings-card-${width}.png`});
    }
    const afterBilling=await (await context.request.get(`/api/v1/records/opportunity/${billingDeal.id}`)).json();
    expect(afterBilling.record.stage_id).toBe(beforeBilling.record.stage_id);
    expect(afterBilling.record.lifecycle).toBe(beforeBilling.record.lifecycle);
    expect(errors).toEqual([]);
  } finally {
    await browser?.close();
    if (worker && worker.exitCode === null) { const exit = once(worker, 'exit'); worker.kill('SIGTERM'); await exit; }
    await fixture.dispose();
  }
});
