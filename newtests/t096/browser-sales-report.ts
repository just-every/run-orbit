import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, type Browser, type Locator, type Page } from '@playwright/test';
import { accessible, watchBrowser } from './browser-observations';
import { emittedRequest } from './emitted-request';
import { newYork, iso, type seedSalesReport } from './sales-report-fixture';
import { salesReportArchive } from './sales-report-archive';
/** REPORT-001 through the Reports UI and its HTTP routes: a US monthly two-pipeline report is built, saved, reconciled by
 * drill-through and exported; a collaborator's grant is revoked; late evidence arrives; every figure is hand-counted; the
 * report travels through Records and local archives and erasure withdraws it. */
type Seed = Awaited<ReturnType<typeof seedSalesReport>>;
type Worker = {
    origin: string;
    certificate: {
        cert: string;
    };
};
const DAY = 86400000, ops = '/api/v2/workspaces/workspace/operations', access = '/api/v2/access/workspaces/workspace';
const usd = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
const pct = (value: number) => new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 }).format(value);
const days = (ms: number) => `${(ms / DAY).toFixed(1)} days`, mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const monthName = (key: string) => { const [year, month] = key.split('-').map(Number); return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(Date.UTC(year!, month! - 1, 1))); };
const section = (result: Locator, title: string) => result.locator('.sales-section').filter({ has: result.page().getByRole('heading', { name: title, exact: true }) });
const figure = (scope: Locator, label: string, value: string) => expect(scope.getByRole('button', { name: `${value} ${label}: show the records behind it`, exact: true })).toBeVisible();
/** Open every figure in `buttons` and check that the listed records reconcile to it: their number, their amounts or their rate. */
async function reconcile(scope: Locator, buttons: Locator) {
    for (const button of await buttons.all()) {
        const shown = (await button.textContent())!.trim(), label = (await button.getAttribute('aria-label'))!.replace(/: show the records behind it$/, '').slice(shown.length + 1);
        await button.click();
        const drill = scope.locator('.sales-drill');
        await expect(drill).toHaveAttribute('aria-label', `Records behind ${label}`);
        const items = await drill.locator('ol > li').allTextContents(), summary = (await drill.getByRole('status').textContent())!;
        if (/^\$/.test(shown))
            assert.equal(usd(items.reduce((total, item) => total + Math.round(Number(item.match(/\$[\d,]+\.\d{2}$/)![0].replace(/[$,]/g, '')) * 100), 0)), shown, `${label} amounts reconcile`);
        else if (shown.endsWith('%')) {
            const counted = items.filter(item => item.endsWith('counted in the rate')).length;
            assert.equal(pct(counted / items.length), shown, `${label} rate reconciles`);
        }
        else if (shown.endsWith('days'))
            assert.match(summary, new RegExp(`^${items.length} records?, mean ${shown}\\.`), `${label} mean reconciles`);
        else if (shown !== 'Not available')
            assert.equal(items.length, Number(shown), `${label} rows reconcile`);
        await button.click();
        await expect(drill).toHaveCount(0);
    }
}
/** The export's own cells reconcile to their rows, independently of the page. */
function reconcileExport(view: any) {
    for (const part of view.sections)
        for (const cell of [...part.totals, ...part.tables.flatMap((table: any) => table.groups.flatMap((group: any) => group.cells)), ...part.months.flatMap((group: any) => group.cells)]) {
            const values = cell.rows.map((key: string) => cell.values?.[key]);
            if (cell.format === 'count')
                assert.equal(cell.value, cell.rows.length, `${part.measure} ${cell.label}`);
            else if (cell.format === 'money')
                assert.equal(cell.value, cell.rows.length ? values.reduce((a: number, b: number) => a + b, 0) : cell.value, `${part.measure} ${cell.label}`);
            else if (cell.format === 'percent')
                assert.equal(cell.value, cell.rows.length ? cell.numerator.length / cell.rows.length : null, `${part.measure} ${cell.label}`);
            else
                assert.equal(cell.value, values.length ? mean(values) : null, `${part.measure} ${cell.label}`);
            for (const key of cell.rows)
                assert.ok(view.rows[key], `${part.measure} ${cell.label} names an exported row`);
        }
}
const totals = (view: any, measure: string) => Object.fromEntries(view.sections.find((part: any) => part.measure === measure).totals.map((cell: any) => [cell.key, cell.value]));
async function download(page: Page, scope: Locator, path: string) { const downloading = page.waitForEvent('download'); await scope.getByRole('link', { name: 'Export sales result', exact: true }).first().click(); await (await downloading).saveAs(path); return JSON.parse(await readFile(path, 'utf8')); }
export async function salesReportJourney({ browser, worker, ownerCookie, seller, seed, directory }: {
    browser: Browser;
    worker: Worker;
    ownerCookie: string;
    seller: {
        cookie: string;
        operatorId: string;
        email: string;
        displayName?: string;
    };
    seed: Seed;
    directory: string;
}) {
    const call = async (cookie: string, path: string, method = 'GET', body?: unknown) => { const response = await emittedRequest(worker, cookie, path, method, body), text = await response.text(); assert.ok(response.ok, `${method} ${path}: ${response.status} ${text}`); return text ? JSON.parse(text) : null; };
    const context = async (width: number, cookie: string) => { const created = await browser.newContext({ baseURL: worker.origin, viewport: { width, height: 1000 }, ignoreHTTPSErrors: true, extraHTTPHeaders: { Cookie: cookie } }); return { created, errors: watchBrowser(created), page: await created.newPage() }; };
    const { at, months } = seed, workspace = (await call(ownerCookie, '/api/v1/settings')).workspace;
    const setCurrency = (currency: string) => call(ownerCookie, '/api/v1/settings', 'PUT', { name: workspace.name, timezone: workspace.timezone, currency, workingHours: JSON.parse(workspace.working_hours_json), staleIntervalDays: workspace.stale_interval_days, awaitingResponseWorkingDays: workspace.awaiting_response_working_days, freeMailDomains: JSON.parse(workspace.free_mail_domains_json) });
    assert.equal(workspace.timezone, 'America/New_York');
    await setCurrency('USD'); // A US workspace: USD in Settings, New York time.
    try {
        // The owner opens the built-in monthly report, saves it for two pipelines, shared with one collaborator by name.
        const owner = await context(1440, ownerCookie), page = owner.page, reports = page.getByRole('region', { name: 'Sales reports', exact: true });
        await page.goto('/app/reports');
        await expect(reports.getByRole('heading', { name: 'Built-in sales reports', exact: true })).toBeVisible();
        if (!await reports.locator('.sales-suite').evaluate(element => element.hasAttribute('open')))
            await reports.locator('.sales-suite>summary').click();
        await expect(reports.locator('.sales-suite li').getByRole('button')).toHaveCount(10);
        await accessible(page, 'sales-reports-1440', directory);
        await reports.getByRole('button', { name: 'Open Monthly sales report', exact: true }).click();
        await expect(reports.getByRole('heading', { name: 'Sales report preview', exact: true })).toBeVisible();
        await reports.getByText('Edit filters, grouping and sharing', { exact: true }).click();
        const editor = reports.locator('.sales-editor');
        await editor.getByLabel('Report name', { exact: true }).fill('US monthly sales');
        await editor.getByLabel('Report description', { exact: true }).fill('Two US pipelines by New York calendar month');
        for (const pipeline of ['New business', 'Renewals'])
            await editor.getByRole('checkbox', { name: pipeline, exact: true }).check();
        await editor.getByLabel('Report key', { exact: true }).fill('us-monthly');
        await editor.getByRole('radio', { name: 'Named people', exact: true }).check();
        await editor.getByRole('checkbox', { name: `${seller.displayName ?? seller.email} (${seller.email}, collaborator)`, exact: true }).check();
        await Promise.all([page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/operations/metrics') && response.request().method() === 'POST' && response.status() === 200), editor.getByRole('button', { name: 'Save as new report', exact: true }).click()]);
        await expect(reports.getByRole('combobox', { name: 'Sales report', exact: true })).toHaveValue('us-monthly:1');
        await reports.getByLabel('First month', { exact: true }).fill(months.first);
        await reports.getByLabel('Last month', { exact: true }).fill(months.current);
        await reports.getByRole('button', { name: 'Preview sales report', exact: true }).click();
        const result = reports.locator('.sales-result');
        await expect(result.getByRole('heading', { name: 'Sales report preview', exact: true })).toBeVisible();
        await expect(result.locator('.sales-result__name')).toHaveText('US monthly sales · version 1');
        const basis = result.locator('.sales-basis');
        for (const text of [`${monthName(months.first)} to ${monthName(months.current)}`, 'America/New_York', 'Monthly buckets on local calendar months', 'USD, from each deal amount', 'Pipelines: New business, Renewals.', 'Computed from every record', 'Not saved.'])
            await expect(basis).toContainText(text);
        // Hand-counted figures for both pipelines; the default pipeline's Grove deal, call and booking are filtered out.
        const pipeline = section(result, 'Open pipeline value and count'), reasons = section(result, 'Won and lost reasons'), revenue = section(result, 'Closed-won revenue'), rate = section(result, 'Win rate');
        await figure(pipeline, 'Open deals', '3');
        await figure(pipeline, 'Open value', usd(5300000));
        await figure(pipeline, 'Deals · New business', '2');
        await figure(pipeline, 'Value · Renewals', usd(1500000));
        await figure(pipeline, 'Value · Riley Chen', usd(1500000));
        await figure(reasons, 'Won deals', '2');
        await figure(reasons, 'Won value', usd(5200000));
        await figure(reasons, 'Lost deals', '2');
        await figure(reasons, 'Lost value', usd(3000000));
        for (const [reason, value] of [['Won · Better fit', 4000000], ['Won · Renewed', 1200000], ['Lost · Price', 2500000], ['Lost · No decision', 500000]] as const)
            await figure(reasons, `Value · ${reason}`, usd(value));
        await figure(revenue, 'Closed-won revenue', usd(5200000));
        await figure(revenue, `Closed-won revenue · ${monthName(months.last)}`, usd(5200000));
        await figure(rate, 'Win rate', pct(0.5));
        await figure(rate, 'Win rate · New business', pct(1 / 3));
        await figure(rate, `Win rate · ${monthName(months.last)}`, pct(2 / 3));
        const conversion = section(result, 'Stage-to-stage conversion');
        await figure(conversion, 'Recorded stage moves', '7');
        for (const [stage, entered, onward] of [['New business · Discovery', 5, 4], ['New business · Proposal', 4, 2], ['Renewals · Renewal review', 2, 1]] as const) {
            await figure(conversion, `Entered · ${stage}`, String(entered));
            await figure(conversion, `Moved on · ${stage}`, String(onward));
            await figure(conversion, `Conversion · ${stage}`, pct(onward / entered));
        }
        const cycleWon = [at.atlasWon - at.atlasCreated, at.cedarWon - at.cedarCreated], cycleLost = [at.birchLost - at.birchCreated, at.firLost - at.firCreated], cycle = section(result, 'Sales cycle');
        await figure(cycle, 'Won: mean days', days(mean(cycleWon)));
        await figure(cycle, 'Lost: mean days', days(mean(cycleLost)));
        await figure(cycle, 'All closed: mean days', days(mean([...cycleWon, ...cycleLost])));
        const activities = section(result, 'Rep activities');
        for (const [label, value] of [['Notes', '2'], ['Calls', '2'], ['Meetings', '2'], ['Reviewed sent messages', '4'], ['All activities', '10'], ['All activities · Owner', '6'], ['All activities · Riley Chen', '4'], [`Meetings · ${monthName(months.first)}`, '1']] as const)
            await figure(activities, label, value);
        const tasks = section(result, 'Task completion');
        for (const [label, value] of [['Due', '5'], ['Completed', '2'], ['Overdue', '3'], ['Completed of due', pct(0.4)], ['Overdue · Owner', '2'], ['Completed · Riley Chen', '1']] as const)
            await figure(tasks, label, value);
        const bookings = section(result, 'Bookings');
        for (const [label, value] of [['Booked meetings', '2'], ['Cancellations', '1'], ['Booked meetings · Cal.com', '1'], ['Cancellations · Calendly', '1']] as const)
            await figure(bookings, label, value);
        const followUp = section(result, 'Follow-up outcomes');
        for (const [label, value] of [['Scheduled messages sent', '3'], ['Delivered', '2'], ['Genuine replies', '1'], ['Meetings booked', '1'], ['Stage advances', '1'], ['Deals won', '0'], ['Reported opens (inferred, never success)', '2'], ['Automatic replies (never a reply)', '1']] as const)
            await figure(followUp, label, value);
        await expect(followUp.locator('.sales-totals .sales-not-success')).toHaveCount(2);
        // An inferred open and an automatic reply are never a success: the Elm message has both and no genuine reply.
        await followUp.getByRole('button', { name: '1 Genuine replies: show the records behind it', exact: true }).click();
        await expect(followUp.locator('.sales-drill li')).toHaveCount(1);
        await expect(followUp.locator('.sales-drill')).toContainText('Reviewed message on Dune pilot');
        await expect(followUp.locator('.sales-drill')).not.toContainText('Elm upgrade');
        await followUp.getByRole('button', { name: '1 Genuine replies: show the records behind it', exact: true }).click();
        // Every total and every reason opens the exact records behind it, and they reconcile to the figure shown.
        for (const part of await result.locator('.sales-section').all())
            await reconcile(part, part.locator('.sales-totals button'));
        await reconcile(reasons, reasons.getByRole('region', { name: 'Won and lost reasons by outcome · reason' }).getByRole('button'));
        await page.getByRole('button', { name: 'Save reviewed sales result', exact: true }).click();
        await expect(result.getByRole('heading', { name: 'Saved sales result', exact: true })).toBeVisible();
        const history = reports.getByRole('region', { name: 'Saved sales results' });
        await expect(history.locator('ol > li')).toHaveCount(1);
        for (const text of ['America/New_York', 'USD', 'Monthly buckets on local calendar months', 'Saved result measured'])
            await expect(history).toContainText(text);
        const saved = await download(page, history, join(directory, 'sales-report-1440.json'));
        reconcileExport(saved);
        assert.deepEqual([saved.saved, saved.currency, saved.timezone, saved.period.fromMonth, saved.period.throughMonth, saved.definition.pipelineIds], [true, 'USD', 'America/New_York', months.first, months.current, [seed.pipelines.newBusiness, seed.pipelines.renewals]]);
        assert.deepEqual(saved.period.months.map((month: any) => month.key), [months.first, months.last, months.current]);
        assert.ok(saved.sources.includes('opportunities.close_reason'));
        assert.match(saved.freshness, new RegExp(`^Saved result measured .+ \\(${saved.asOf.replaceAll('.', '\\.')}\\)\\.`));
        assert.equal(saved.access.limited, false);
        assert.deepEqual(totals(saved, 'follow_up'), { sent: 3, delivered: 2, replied: 1, meeting: 1, advanced: 1, won: 0, won_value: 0, inferred_open: 2, automatic_reply: 1 });
        assert.deepEqual(totals(saved, 'tasks'), { due: 5, completed: 2, overdue: 3, completion: 0.4 });
        assert.deepEqual(totals(saved, 'bookings'), { booked: 2, cancelled: 1 });
        assert.deepEqual(totals(saved, 'win_rate'), { won: 2, lost: 2, rate: 0.5 });
        const stageAge = [saved.asOf, saved.asOf, saved.asOf].map((asOf, index) => Date.parse(asOf) - [at.duneProposal, at.elmCreated, at.hazelNegotiation][index]!);
        assert.ok(Math.abs(totals(saved, 'stage_age').age - mean(stageAge) / DAY) < 1e-9, 'stage age is the mean time in the current stage');
        await figure(section(result, 'Stage age'), 'Mean days in stage', days(mean(stageAge)));
        await reasons.getByRole('button', { name: `${usd(5200000)} Won value: show the records behind it`, exact: true }).click();
        await accessible(page, 'sales-report-1440', directory);
        await owner.errors.check(directory, 'sales-report-1440');
        await owner.created.close();
        // The author narrows access to the saved custom result.
        const custom = await context(1440, ownerCookie), customReports = custom.page.locator('.analytics-console');
        await custom.page.goto('/app/reports');
        await customReports.getByRole('combobox', { name: 'Report', exact: true }).selectOption('disclosed-value-1440:1');
        await customReports.getByText('Sharing: Shared with the workspace', { exact: true }).click();
        await customReports.getByRole('radio', { name: 'Only me (and the installation owner)', exact: true }).check();
        await customReports.getByRole('button', { name: 'Save sharing', exact: true }).click();
        await expect(customReports.getByText('Sharing: Private', { exact: true })).toBeVisible();
        await custom.errors.check(directory, 'report-private-1440');
        await custom.created.close();
        const share = await call(ownerCookie, `${ops}/reports/disclosed-value-1440/sharing`);
        await call(ownerCookie, `${ops}/reports/disclosed-value-1440/sharing`, 'PUT', { audience: 'private', operatorIds: [], revision: share.revision });
        // A collaborator sees only their grants: Atlas without its amount, with its entries; Cedar with every field.
        await call(ownerCookie, `${access}/roles/seller`, 'PUT', { actions: ['analytics.read'], fields: ['*'] });
        await call(ownerCookie, `${access}/grants`, 'POST', { subjectKind: 'operator', subjectId: seller.operatorId, resourceType: 'opportunity', resourceId: seed.deals.atlas, actions: ['graph.read', 'entries.read'], fields: ['title', 'lifecycle', 'stage_id', 'owner_id', 'closed_at', 'close_reason', 'created_at'], purpose: 'Quarterly review', expiresAt: null });
        await call(ownerCookie, `${access}/grants`, 'POST', { subjectKind: 'operator', subjectId: seller.operatorId, resourceType: 'opportunity', resourceId: seed.deals.cedar, actions: ['graph.read'], fields: ['*'], purpose: 'Renewal review', expiresAt: null });
        const limited = async (width: number, name: string, check: (result: Locator, exported: any) => Promise<void>) => {
            const viewer = await context(width, seller.cookie), viewerReports = viewer.page.getByRole('region', { name: 'Sales reports', exact: true });
            await viewer.page.goto('/app/reports');
            await expect(viewer.page.locator('.analytics-console').getByRole('combobox', { name: 'Report', exact: true }).locator('option')).toHaveCount(1); // private reports are not listed
            await viewerReports.getByRole('combobox', { name: 'Sales report', exact: true }).selectOption('us-monthly:1');
            await expect(viewerReports.getByText('Shared with named people. Only the report owner or the installation owner changes its sharing.', { exact: true })).toBeVisible();
            await viewerReports.getByRole('button', { name: 'Reopen sales result', exact: true }).click();
            const view = viewerReports.locator('.sales-result');
            await expect(view.getByRole('heading', { name: 'Saved sales result', exact: true })).toBeVisible();
            await expect(view.locator('.sales-basis')).toContainText('Limited to your access');
            for (const hidden of ['Riley Chen', 'Dune pilot', 'Elm upgrade', 'Hazel expansion', 'Birch rollout', 'Fir trial'])
                await expect(view).not.toContainText(hidden);
            const exported = await download(viewer.page, viewerReports.getByRole('region', { name: 'Saved sales results' }), join(directory, `${name}.json`));
            reconcileExport(exported);
            assert.equal(exported.access.limited, true);
            await check(view, exported);
            await reconcile(section(view, 'Won and lost reasons'), section(view, 'Won and lost reasons').locator('button.sales-cell'));
            await accessible(viewer.page, name, directory);
            await viewer.errors.check(directory, name);
            await viewer.created.close();
        };
        await limited(1440, 'sales-limited-1440', async (view, exported) => {
            const shown = section(view, 'Won and lost reasons');
            await figure(shown, 'Won deals', '2');
            await figure(shown, 'Won value', usd(1200000));
            await figure(shown, 'Lost deals', '0');
            await figure(shown, 'Value · Won · Better fit', 'Not available');
            await figure(shown, 'Value · Won · Renewed', usd(1200000));
            await shown.getByRole('button', { name: `${usd(1200000)} Won value: show the records behind it`, exact: true }).click();
            await expect(shown.locator('.sales-drill')).toContainText('Only amounts you may read are included.');
            await expect(shown.locator('.sales-drill li')).toHaveCount(1);
            await shown.getByRole('button', { name: `${usd(1200000)} Won value: show the records behind it`, exact: true }).click();
            await figure(section(view, 'Rep activities'), 'All activities', '2');
            await figure(section(view, 'Task completion'), 'Due', '1');
            await figure(section(view, 'Bookings'), 'Booked meetings', '0');
            await expect(section(view, 'Bookings')).toContainText('only full operators read');
            await expect(section(view, 'Rep activities')).toContainText('per-person groups are withheld');
            assert.deepEqual(totals(exported, 'reasons'), { won: 2, won_value: 1200000, lost: 0, lost_value: 0 });
            assert.deepEqual(totals(exported, 'activities'), { note: 0, call: 1, meeting: 1, sent: 0, total: 2 });
            assert.doesNotMatch(JSON.stringify(exported), /:4000000\b/, 'the hidden Atlas amount never leaves the server');
        });
        // Revoking Cedar's grant on the Access page changes the reopened report and its export on the next request.
        const revoking = await context(1440, ownerCookie);
        await revoking.page.goto('/app/access');
        const grant = revoking.page.locator('.fold-row').filter({ hasText: 'Why: Renewal review' });
        await expect(grant.getByRole('heading', { name: 'Opportunity: Cedar renewal', exact: true })).toBeVisible();
        await grant.getByRole('button', { name: 'Revoke grant', exact: true }).click();
        await expect(revoking.page.getByRole('status').filter({ hasText: 'Grant revoked' })).toBeVisible();
        await revoking.errors.check(directory, 'report-grant-revoked');
        await revoking.created.close();
        await limited(1440, 'sales-revoked-1440', async (view, exported) => {
            const shown = section(view, 'Won and lost reasons');
            await figure(shown, 'Won deals', '1');
            await figure(shown, 'Won value', 'Not available');
            await expect(shown).not.toContainText('Renewed');
            await expect(view).not.toContainText('Cedar renewal');
            assert.deepEqual(totals(exported, 'reasons'), { won: 1, won_value: null, lost: 0, lost_value: 0 });
            assert.ok(!JSON.stringify(exported).includes(seed.deals.cedar), 'no revoked row, count or identifier is exported');
        });
        // Sharing names who may open the report: a full operator it was not shared with is refused.
        const savedId = saved.id;
        assert.equal((await emittedRequest(worker, seed.rileyCookie, `${ops}/snapshots/${savedId}/export`)).status, 403);
        // Late evidence dated inside the period: a backdated note, a task completion and today's close. The original stays.
        const [year, month] = months.last.split('-').map(Number);
        await call(ownerCookie, `/api/v1/records/opportunity/${seed.deals.dune}/entries`, 'POST', { kind: 'note', text: 'Late pilot recap', occurredAt: iso(newYork(year!, month!, 20)) });
        await call(ownerCookie, `/api/v1/tasks/${seed.tasks.dune.id}`, 'PUT', { ...seed.tasks.dune.input, revision: seed.tasks.dune.revision, status: 'completed' });
        await call(ownerCookie, `/api/v1/records/opportunity/${seed.deals.hazel}/lifecycle`, 'POST', { state: 'won', reason: 'Signed' });
        const late = await context(1440, ownerCookie), lateReports = late.page.getByRole('region', { name: 'Sales reports', exact: true });
        await late.page.goto('/app/reports');
        await lateReports.getByRole('combobox', { name: 'Sales report', exact: true }).selectOption('us-monthly:1');
        await lateReports.getByRole('button', { name: 'Reopen sales result', exact: true }).click();
        const reopened = lateReports.locator('.sales-result');
        await expect(reopened.getByRole('heading', { name: 'Saved sales result', exact: true })).toBeVisible();
        await figure(section(reopened, 'Won and lost reasons'), 'Won deals', '2');
        await figure(section(reopened, 'Rep activities'), 'Notes', '2');
        await figure(section(reopened, 'Task completion'), 'Completed', '2');
        await figure(section(reopened, 'Open pipeline value and count'), 'Open deals', '3');
        const lateSection = reopened.getByRole('region', { name: 'Late-arriving evidence' });
        for (const text of ['Won deals: +1', `Won value: +${usd(3000000)}`, 'Won · Signed', `Closed-won revenue · ${monthName(months.current)}: +${usd(3000000)}`, `Notes · ${monthName(months.last)}: +1`, 'Completed · Owner: +1', 'Deals won: +1', 'Note on Dune pilot', 'Task on Dune pilot', 'Hazel expansion'])
            await expect(lateSection).toContainText(text);
        await accessible(late.page, 'sales-late-1440', directory);
        const afterLate = await download(late.page, lateReports.getByRole('region', { name: 'Saved sales results' }), join(directory, 'sales-late-1440.json'));
        assert.deepEqual(totals(afterLate, 'reasons'), totals(saved, 'reasons'));
        assert.deepEqual(totals(afterLate, 'activities'), totals(saved, 'activities'));
        assert.deepEqual(afterLate.late.sections.find((part: any) => part.measure === 'follow_up').cells.map((cell: any) => [cell.key, cell.value]), [['won', 1], ['won_value', 3000000]]);
        await late.errors.check(directory, 'sales-late-1440');
        await late.created.close();
        await salesReportArchive({ worker, ownerCookie, saved, sellerId: seller.operatorId, contactId: seed.people.Dune!.contact });
    }
    finally {
        await setCurrency(workspace.currency);
    }
}
