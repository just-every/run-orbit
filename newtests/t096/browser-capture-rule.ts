import { chromium, expect } from '@playwright/test';
import { fixture } from './fixture';
import { emittedWorker } from './emitted-fixture';
import { accessible, watchBrowser } from './browser-observations';
import { captureRuleBrowserSeed } from './capture-rule-browser-seed';
/** A separate real installation keeps these deals out of the preceding report assertions. */
export async function captureRuleBrowserJourney(directory: string) {
    const f = await fixture();
    let worker: Awaited<ReturnType<typeof emittedWorker>> | undefined, browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
    try {
        const seed = await captureRuleBrowserSeed(f);
        worker = await emittedWorker(f.target);
        console.log('Owned capture Worker PID', worker.pid);
        browser = await chromium.launch({ headless: true, args: ['--use-mock-keychain', '--password-store=basic', '--disable-gpu', ...worker.browserArgs] });
        const cdp = await browser.newBrowserCDPSession();
        console.log('Owned capture browser PIDs', (await cdp.send('SystemInfo.getProcessInfo')).processInfo.map(process => ({ pid: process.id, type: process.type })));
        await cdp.detach();
        {
            const width = 1440;
            const context = await browser.newContext({ baseURL: worker.origin, viewport: { width, height: 1000 }, ignoreHTTPSErrors: true, extraHTTPHeaders: { Cookie: f.cookie } }), errors = watchBrowser(context), page = await context.newPage();
            try {
                await page.goto('/app/capture');
                const rule = page.getByLabel('Multi-deal mail rule', { exact: true });
                await expect(rule).toHaveValue('recent');
                await rule.selectOption('all');
                await page.getByRole('button', { name: 'Save mail rule', exact: true }).click();
                await expect(page.getByText('Saved. The rule applies to the next captured message.', { exact: true })).toBeVisible();
                await accessible(page, `capture-mail-rule-${width}`, directory);
                const reviewed = await context.request.get(`/api/v1/capture/signals/${seed.signalId}/deal-links`);
                expect(reviewed.ok()).toBe(true);
                const reset = await context.request.post(`/api/v1/capture/signals/${seed.signalId}/deal-links`, { headers: { Origin: worker.origin }, data: { opportunityId: seed.firstDeal.id, requestId: crypto.randomUUID(), revision: (await reviewed.json()).revision } });
                expect(reset.ok()).toBe(true);
                await page.goto(`/app/records?kind=contact&record=${seed.contactId}`);
                await expect(page.getByRole('heading', { name: 'Avery Kim', exact: true })).toBeVisible();
                const entry = page.locator(`[id="entry-${seed.signalId}"]`);
                await entry.getByRole('button', { name: 'Change deal association', exact: true }).click();
                await expect(entry.getByText(`Linked deals: ${seed.firstDeal.title}`, { exact: true })).toBeVisible();
                await accessible(page, `capture-mail-association-${width}`, directory);
                await expect(entry.getByLabel('Move captured mail to', { exact: true }).locator(`option[value="${seed.secondDeal.id}"]`)).toHaveText(`${seed.secondDeal.title} (won)`);
                await entry.getByLabel('Move captured mail to', { exact: true }).selectOption(seed.secondDeal.id);
                await entry.getByRole('button', { name: 'Move to deal', exact: true }).click();
                await expect(entry.getByText(`Linked deals: ${seed.secondDeal.title}`, { exact: true })).toBeVisible();
                await accessible(page, `capture-mail-moved-${width}`, directory);
                await entry.getByRole('button', { name: 'Remove deal links', exact: true }).click();
                await expect(entry.getByText('Linked deals: None', { exact: true })).toBeVisible();
                await accessible(page, `capture-mail-removed-${width}`, directory);
                await errors.check(directory, `capture-mail-rule-${width}`);
            }
            finally {
                await context.close();
            }
        }
    }
    finally {
        await browser?.close();
        await worker?.dispose();
        await f.close();
    }
}
