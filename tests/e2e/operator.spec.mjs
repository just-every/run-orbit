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
  await expect(page.getByTestId("opportunity-detail")).toBeVisible();
}

test.describe("authenticated operator UI", () => {
  test.beforeEach(async ({ context }) => {
    await authenticateOperator(context);
  });

  contract("OPP-006", "the desktop NOW queue applies persisted filters before ordered results", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const failures = watchFailures(page);
    await page.goto("/app", { waitUntil: "networkidle" });

    await expect(page.getByTestId("now-queue")).toBeVisible();
    await expect(page.getByTestId("now-ordering")).toHaveText("Policy: opportunity.prioritization.v1");
    await expect(page.locator(".operator-queue-card").first()).toContainText("Ordering proof X");
    await page.getByLabel("Filter by owner").selectOption("unassigned");
    await expect(page.getByText("Fieldhouse Studio workspace", { exact: true })).toHaveCount(0);
    await expect(page.locator(".operator-queue-card")).toHaveCount(3);
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
    await expect(page.locator(".operator-queue-card")).toHaveCount(4);
    await expectNoHorizontalOverflow(page);
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

    const fields = page.getByTestId("opportunity-detail");
    await expect(fields).toContainText("Lifecycle");
    await expect(fields).toContainText("Qualified");
    await expect(fields).toContainText("Maya Patel");
    await expect(fields).toContainText("92");
    await expect(fields).toContainText("High");
    await expect(fields).toContainText("Now");
    await expectNoHorizontalOverflow(page);
    expect(failures).toEqual([]);
  });

  contract("OPP-004", "the mobile detail renders current score evidence and recommendation reason", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const failures = watchFailures(page);
    await openOpportunity(page);

    const evidence = page.getByTestId("contributing-evidence");
    await expect(evidence).toContainText("Used for this recommendation");
    await expect(page.getByTestId("next-action")).toContainText("Write follow-up");
    await page.getByText("Audit details", {exact:true}).click();
    const audit=page.getByTestId("current-evaluation");
    await expect(audit).toContainText("01J0000000000000000000000K");
    await expect(audit).toContainText("Website form");
    await expect(audit).toContainText("observed");
    await expect(audit).toContainText("+42");
    await expectNoHorizontalOverflow(page);
    expect(failures).toEqual([]);
  });

  contract("RECORD-005", "the mobile opportunity timeline shows occurred, recorded, actor, and source", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const failures = watchFailures(page);
    await openOpportunity(page);

    await page.getByText("Audit details", {exact:true}).click();
    const timeline = page.getByTestId("opportunity-detail");
    await expect(timeline).toContainText("Occurred");
    await expect(timeline).toContainText("Recorded");
    await expect(timeline).toContainText("Actor Website form (Source)");
    await expect(timeline).toContainText("source Signals");
    await expectNoHorizontalOverflow(page);
    expect(failures).toEqual([]);
  });

  contract("ACTION-004", "the desktop draft editor saves D1 state and surfaces a revision conflict", async ({ browser, page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
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
    await expect(metadata).toContainText(`Author${issued.draft.authorId}`);
    await expect(metadata).toContainText(`Source recommendation${issued.draft.recommendationId}`);
    await expect(metadata).toContainText("Created");
    await expect(metadata).toContainText("Last updated");
    const savedBody = `Persisted operator edit ${Date.now()}.`;
    await page.getByTestId("draft-body").fill(savedBody);
    const refreshedOpportunity = page.waitForResponse(response => response.url().endsWith(`/api/v1/opportunities/${issued.draft.opportunityId}`) && response.request().method() === "GET");
    await page.getByTestId("save-draft").click();
    await (await refreshedOpportunity).finished();
    await expect(page.getByText(/Saved revision \d+\. Your changes are saved\./)).toBeVisible();
    await page.waitForLoadState("networkidle");
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByTestId("draft-body")).toHaveValue(savedBody);

    const newPage = await page.context().newPage();
    const newPageFailures = watchFailures(newPage);
    await newPage.goto(draftHref, { waitUntil: "networkidle" });
    await expect(newPage.getByTestId("draft-body")).toHaveValue(savedBody);
    await newPage.close();

    await staleEditor.getByTestId("draft-body").fill(`Conflicting operator edit ${Date.now()}.`);
    await staleEditor.getByTestId("save-draft").click();
    await expect(staleEditor.getByText("The draft changed or is stale. Reload it before editing.")).toBeVisible();
    await staleEditor.getByRole("button", { name: "Reload saved draft" }).click();
    await expect(staleEditor.getByTestId("draft-body")).toHaveValue(savedBody);
    await expectNoHorizontalOverflow(page);
    expect(failures).toEqual([]);
    expect(newPageFailures).toEqual([]);
    expect(staleFailures).toEqual([]);
    await secondContext.close();
  });
});
