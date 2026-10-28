import {expect} from '@playwright/test';
export async function inspectQueue(page) {
 await page.goto('/app',{waitUntil:'networkidle'});
    await expect(page.getByTestId("now-queue")).toBeVisible();
    const {opportunities}=await (await page.request.get('/api/v1/opportunities/now')).json();
    const ordered=[...opportunities].sort((a,b)=>b.score-a.score || (b.lastContributingSignalAt??'').localeCompare(a.lastContributingSignalAt??'') || a.id.localeCompare(b.id));
    expect(await page.locator('.operator-queue-card > a').evaluateAll(links=>links.map(link=>link.getAttribute('href')))).toEqual(ordered.map(row=>`/app/opportunities/${row.id}`));
    await page.getByLabel("Filter by owner").selectOption("unassigned");
    await expect(page.getByText("Fieldhouse Studio workspace", { exact: true })).toHaveCount(0);
    await expect(page.locator(".operator-queue-card")).toHaveCount(opportunities.filter(row=>!row.ownerId).length);
    await page.getByLabel("Filter by owner").selectOption("all");
    const stageFilter = page.getByLabel("Filter by stage");
    const firstPersistedStage = await stageFilter.locator("option").nth(1).getAttribute("value");
    expect(firstPersistedStage).toBeTruthy();
    const stageResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === "/api/v1/opportunities/now" && url.searchParams.get("stageId") === firstPersistedStage;
    });
    await stageFilter.selectOption(firstPersistedStage);
    await stageResponse;
    const bandResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === "/api/v1/opportunities/now" && url.searchParams.get("band") === "high";
    });
    await page.getByLabel("Filter by band").selectOption("high");
    await bandResponse;
    const filtered=await(await page.request.get(`/api/v1/opportunities/now?stageId=${firstPersistedStage}&band=high`)).json();
    await expect(page.locator(".operator-queue-card")).toHaveCount(filtered.opportunities.length);


}
