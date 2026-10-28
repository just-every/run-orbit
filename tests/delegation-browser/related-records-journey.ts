import {expect,type BrowserContext} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
export async function relatedRecordsJourney(context:BrowserContext){
 const page=await context.newPage(),errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 const origin=context.request===undefined?'':new URL((await context.request.get('/health')).url()).origin;
 const evidence=resolve(process.env.ORBIT_RELATED_RECORD_EVIDENCE??'verification/ui/related-records');await mkdir(evidence,{recursive:true});
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
    for (const width of [1440]) {
      await page.setViewportSize({ width, height: 900 });
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
          const chip = page.getByRole('list', { name: 'Associated contacts', exact: true }).getByRole('listitem').filter({ hasText: contact });
          await expect(chip).toHaveCount(1);
          await readable(chip, contact);
          await expect(chip.getByRole('button', { name: 'Remove contact', exact: true })).toBeEnabled();
          const primary = page.getByRole('combobox', { name: 'Primary recipient', exact: true });
          await expect(primary).toHaveValue(linkedContact.id);
          await expect(primary.locator('option:checked')).toHaveText(contact);
          await primary.selectOption(linkedContact.id);
          await expect(page.getByLabel('Opportunity title', { exact: true })).toHaveValue(title);
          await page.screenshot({ path: `${evidence}/editor-${width}.png`, fullPage: true });
          await page.getByRole('button', { name: 'Save changes', exact: true }).click();
          await expect(page.getByRole('heading', { name: title, exact: true, level: 1 })).toBeVisible();
          const saved = await (await context.request.get(`/api/v1/records/opportunity/${opportunity.id}`)).json();
          expect(saved.record.title).toBe(title);
          expect(saved.contacts.some((row: any) => row.name === contact)).toBe(true);
          expect(saved.contacts.find((row: any) => row.id === linkedContact.id)?.is_primary).toBe(1);
        }
      }
    }
    expect(errors).toEqual([]);
 await page.close();
}
