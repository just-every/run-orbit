import { expect, test } from "@playwright/test";

import { contract } from "../contract.mjs";
import { authenticateOperator } from "./operator-session.mjs";

function watchFailures(page, expectedConsoleErrors = []) {
  const failures = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !expectedConsoleErrors.some((expected) => message.text().includes(expected))) {
      failures.push(`console: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
  page.on("requestfailed", (request) => failures.push(`requestfailed: ${request.url()} ${request.failure()?.errorText}`));
  return failures;
}

async function expectNoHorizontalOverflow(page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

async function openOpportunity(page) {
  await page.goto("/app", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "Open Fieldhouse Studio workspace" }).click();
  await expect(page.getByTestId("next-action")).toBeVisible();
}

test.describe("authenticated operator UI", () => {
  test.beforeEach(async ({ context }) => {
    await authenticateOperator(context);
  });

  contract("OPP-006", "the desktop NOW queue applies persisted filters before ordered results", async ({ page }, info) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const failures = watchFailures(page);
    await page.goto("/app", { waitUntil: "networkidle" });

    await expect(page.getByTestId("now-queue")).toBeVisible();
    const id = suffix => `01J0000000000000000000000${suffix}`;
    const defaultOrder = ["X", "W", "Y", "Z", "F", "U", "V"].map(id);
    const links = page.locator(".operator-queue-card > a");
    async function expectDisplayed(ids) {
      await expect.poll(() => links.evaluateAll(rows => rows.map(row => row.getAttribute("href"))))
        .toEqual(ids.map(value => `/app/opportunities/${value}`));
      await expect(page.locator(".operator-queue-card__rank")).toHaveText(ids.map((_, index) => String(index + 1).padStart(2, "0")));
    }
    async function expectNative(ids, filters = {}) {
      const response = await page.request.get(`/api/v1/opportunities/now?${new URLSearchParams(filters)}`);
      expect(response.status()).toBe(200);
      const { opportunities } = await response.json();
      expect(opportunities.map(row => row.id)).toEqual(ids);
      await expectDisplayed(ids);
      return opportunities;
    }
    // Expected identities are independent of the returned order. X has the highest score;
    // W and Y tie on score and time, and Z has the same score with older evidence.
    const persisted = await expectNative(defaultOrder);
    expect(persisted.filter(row => [id("W"), id("Y"), id("Z")].includes(row.id)).map(row => [row.id, row.score, row.lastContributingSignalAt]))
      .toEqual([[id("W"), 96, "2026-08-31T00:00:00.000Z"], [id("Y"), 96, "2026-08-31T00:00:00.000Z"], [id("Z"), 96, "2026-08-29T00:00:00.000Z"]]);
    await expect(page.locator(".operator-queue-card").first()).toContainText("Ordering proof X");
    // The filters sit behind one Filter control; each set filter shows as a chip.
    await page.getByRole("button", { name: /^Filter/ }).click();
    await page.getByLabel("Filter by owner").selectOption("unassigned");
    await expect(page.getByText("Fieldhouse Studio workspace", { exact: true })).toHaveCount(0);
    await expect(page.locator(".operator-queue-card")).toHaveCount(3);
    await expectNative(["X", "Y", "Z"].map(id), { ownerId: "unassigned" });
    await expect(page.getByRole("list", { name: "Applied filters" })).toContainText("Owner: Unassigned");

    // A named, active rep owns a deliberately mixed set of stages and bands.
    await page.getByLabel("Filter by owner").selectOption({ label: "Maya Patel" });
    const ownerId = id("A"), stageId = id("B");
    await expectNative(["W", "F", "U", "V"].map(id), { ownerId });
    await expect(page.getByRole("list", { name: "Applied filters" })).toContainText("Owner: Maya Patel");
    const stageResponse = page.waitForResponse(response => {
      const url = new URL(response.url());
      return url.pathname === "/api/v1/opportunities/now" && url.searchParams.get("stageId") === stageId;
    });
    await page.getByLabel("Filter by stage").selectOption({ label: "Qualified" });
    await stageResponse;
    await expectNative(["W", "F", "U"].map(id), { ownerId, stageId });
    const bandResponse = page.waitForResponse(response => {
      const url = new URL(response.url());
      return url.pathname === "/api/v1/opportunities/now" && url.searchParams.get("band") === "high";
    });
    await page.getByLabel("Filter by band").selectOption("high");
    await bandResponse;
    await expectNative(["W", "F"].map(id), { ownerId, stageId, band: "high" });
    await page.getByLabel("Filter by owner").selectOption("");
    await expectNative(["X", "W", "Y", "Z", "F"].map(id), { stageId, band: "high" });
    await expect(page.locator(".operator-queue-card")).toHaveCount(5);
    await page.getByLabel("Filter by stage").selectOption("");
    await expectNative(["X", "W", "Y", "Z", "F", "V"].map(id), { band: "high" });
    await page.getByRole("button", { name: "Clear filters", exact: true }).click();
    expect(await expectNative(defaultOrder)).toEqual(persisted);
    await page.reload({ waitUntil: "networkidle" });
    expect(await expectNative(defaultOrder)).toEqual(persisted);
    await expect(page.getByRole("list", { name: "Applied filters" })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: info.outputPath("now-ordering-1440.png"), fullPage: true });
    // Browser proof at the phone width uses the same persisted page; assertions run at 1440.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: info.outputPath("now-ordering-390.png"), fullPage: true });
    expect(failures).toEqual([]);
  });

  contract("OPP-007", "the mobile NOW queue exposes each persisted queue reason", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const failures = watchFailures(page);
    await page.goto("/app", { waitUntil: "networkidle" });

    await expect(page.getByText("Observed form submission and meeting booking")).toBeVisible();
    await expect(page.getByText("Why NOW").first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    expect(failures).toEqual([]);
  });

  contract("OPP-002", "the desktop opportunity detail keeps independent fields visible", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const failures = watchFailures(page);
    await openOpportunity(page);

    // OR3: stage and owner are values in Details; score, band, queue and lifecycle read in Recorded details.
    const details = page.getByTestId("record-details");
    await expect(details.getByLabel("Stage", { exact: true }).locator("option:checked")).toHaveText("Qualified");
    await expect(details.getByLabel("Owner", { exact: true }).locator("option:checked")).toHaveText("Maya Patel");
    await expect(page.getByTestId("contributing-evidence").locator("summary")).toContainText("score 92");
    const recorded = page.getByTestId("recorded-details");
    await recorded.locator("summary").click();
    await expect(recorded).toContainText("Needs attention · Open deal · score 92, High priority");
    await expectNoHorizontalOverflow(page);
    expect(failures).toEqual([]);
  });

  contract("OPP-004", "the mobile detail renders current score evidence and recommendation reason", async ({ page }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const failures = watchFailures(page);
    await openOpportunity(page);

    const evidence = page.getByTestId("contributing-evidence");
    await evidence.locator("summary").click();
    await expect(evidence).toContainText("Used for this recommendation");
    await expect(page.getByTestId("next-action")).toContainText("Write follow-up");
    const id=new URL(page.url()).pathname.split('/').at(-1);
    const {opportunity}=await(await page.request.get(`/api/v1/opportunities/${id}`)).json();
    for(const item of opportunity.evaluation.contributions){
      const signal=opportunity.signals.find(signal=>signal.id===item.signalId);
      expect(signal?.subject).toBeTruthy();
      const signalType=item.signalType.split(/[_.-]/).map(word=>word[0].toUpperCase()+word.slice(1)).join(' ');
      const row=evidence.getByRole('listitem').filter({has:page.getByText(signal.subject,{exact:true})});
      await expect(row).toHaveCount(1);
      await expect(row.getByText(signalType,{exact:true})).toBeVisible();
      await expect(row.locator('b')).toHaveText(`${item.contribution>0?'+':''}${item.contribution}`);
      await expect(row.locator('b')).toBeVisible();
      await expect(row).toContainText(item.source);
    }
    await expectNoHorizontalOverflow(page);
    await page.screenshot({path:info.outputPath('evidence-390.png'),fullPage:true});
    await page.setViewportSize({width:1440,height:900});
    await expectNoHorizontalOverflow(page);
    await page.screenshot({path:info.outputPath('evidence-1440.png'),fullPage:true});
    // Each contribution resolves by signal ID to its source evidence in the deal's recorded details: subject, kind, source and how it was linked.
    const recorded=page.getByTestId("recorded-details");
    await recorded.locator("summary").click();
    for(const item of opportunity.evaluation.contributions){
      const signal=opportunity.signals.find(signal=>signal.id===item.signalId);
      expect(signal.linkingBasis).toBeTruthy();
      const evidenceRow=recorded.getByRole('listitem').filter({hasText:signal.subject}).filter({hasText:'linked by'});
      await expect(evidenceRow).toHaveCount(1);
      await expect(evidenceRow).toContainText(item.source);
    }
    expect(failures).toEqual([]);
  });

  contract("RECORD-005", "the mobile opportunity timeline shows occurred, recorded, actor, and source", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const failures = watchFailures(page);
    await openOpportunity(page);

    const timeline = page.getByTestId("recorded-details");
    await timeline.locator("summary").click();
    await expect(timeline).toContainText("Occurred");
    await expect(timeline).toContainText("Recorded");
    await expect(timeline).toContainText("Actor Website form (Source)");
    await expect(timeline).toContainText("source Signals");
    await expectNoHorizontalOverflow(page);
    expect(failures).toEqual([]);
  });

  contract("ACTION-004", "the desktop draft editor saves D1 state and surfaces a revision conflict", async ({ browser, page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const failures = watchFailures(page);
    const issued = await authenticateOperator(page.context());
    const draftHref = `/app/drafts/${issued.draft.id}`;

    const secondContext = await browser.newContext({ baseURL: `http://127.0.0.1:${process.env.ORBIT_BROWSER_PORT ?? 8722}` });
    await authenticateOperator(secondContext);
    const staleEditor = await secondContext.newPage();
    const staleFailures = watchFailures(staleEditor, ["the server responded with a status of 409"]);
    await staleEditor.goto(draftHref, { waitUntil: "networkidle" });

    await page.goto(draftHref, { waitUntil: "networkidle" });
    await expect(page.getByTestId("draft-recipient")).toHaveValue(issued.draft.recipientEmail);
    await expect(page.getByTestId("draft-subject")).toHaveValue(issued.draft.subject);
    await expect(page.getByTestId("draft-body")).toHaveValue(issued.draft.body);
    await page.getByText("Audit details", {exact:true}).click();
    const metadata = page.getByText("Draft history").locator("..");
    const {operators}=await (await page.request.get('/api/v1/settings')).json();
    await expect(metadata).toContainText(operators.find(operator=>operator.id===issued.draft.authorId).display_name);
    await expect(metadata.getByRole('link')).toHaveAttribute('href',`/app/opportunities/${issued.draft.opportunityId}`);
    await expect(metadata).toContainText("Created");
    await expect(metadata).toContainText("Last updated");
    const savedRecipient = ["synthetic-orbit-2", "example.test"].join("@");
    const savedSubject = "Persisted operator subject";
    const savedBody = `Persisted operator edit ${Date.now()}.`;
    await page.getByTestId("draft-recipient").fill(savedRecipient);
    await page.getByTestId("draft-subject").fill(savedSubject);
    await page.getByTestId("draft-body").fill(savedBody);
    const refreshedOpportunity = page.waitForResponse(response => response.url().endsWith(`/api/v1/opportunities/${issued.draft.opportunityId}`) && response.request().method() === "GET");
    await page.getByTestId("save-draft").click();
    await (await refreshedOpportunity).finished();
    await expect(page.getByText(/Saved revision \d+\. Your changes are saved\./)).toBeVisible();
    await page.waitForLoadState("networkidle");
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByTestId("draft-recipient")).toHaveValue(savedRecipient);
    await expect(page.getByTestId("draft-subject")).toHaveValue(savedSubject);
    await expect(page.getByTestId("draft-body")).toHaveValue(savedBody);

    const newPage = await page.context().newPage();
    const newPageFailures = watchFailures(newPage);
    await newPage.goto(draftHref, { waitUntil: "networkidle" });
    await expect(newPage.getByTestId("draft-recipient")).toHaveValue(savedRecipient);
    await expect(newPage.getByTestId("draft-subject")).toHaveValue(savedSubject);
    await expect(newPage.getByTestId("draft-body")).toHaveValue(savedBody);
    await newPage.close();

    await staleEditor.getByTestId("draft-body").fill(`Conflicting operator edit ${Date.now()}.`);
    await staleEditor.getByTestId("save-draft").click();
    await expect(staleEditor.getByText("The draft changed or is stale. Reload it before editing.")).toBeVisible();
    await staleEditor.getByRole("button", { name: "Reload saved draft" }).click();
    await expect(staleEditor.getByTestId("draft-recipient")).toHaveValue(savedRecipient);
    await expect(staleEditor.getByTestId("draft-subject")).toHaveValue(savedSubject);
    await expect(staleEditor.getByTestId("draft-body")).toHaveValue(savedBody);
    await expectNoHorizontalOverflow(page);
    expect(failures).toEqual([]);
    expect(newPageFailures).toEqual([]);
    expect(staleFailures).toEqual([]);
    await secondContext.close();
  });
});
