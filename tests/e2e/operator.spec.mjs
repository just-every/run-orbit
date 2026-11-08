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

  contract("OPP-006", "the desktop NOW queue applies persisted filters before ordered results", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const failures = watchFailures(page);
    await page.goto("/app", { waitUntil: "networkidle" });

    await expect(page.getByTestId("now-queue")).toBeVisible();
    const {opportunities}=await (await page.request.get('/api/v1/opportunities/now')).json();
    const ordered=[...opportunities].sort((a,b)=>b.score-a.score || (b.lastContributingSignalAt??'').localeCompare(a.lastContributingSignalAt??'') || a.id.localeCompare(b.id));
    expect(await page.locator('.operator-queue-card > a').evaluateAll(links=>links.map(link=>link.getAttribute('href')))).toEqual(ordered.map(row=>`/app/opportunities/${row.id}`));
    await expect(page.locator(".operator-queue-card").first()).toContainText("Ordering proof X");
    // The filters sit behind one Filter control; each set filter shows as a chip.
    await page.getByRole("button", { name: /^Filter/ }).click();
    await page.getByLabel("Filter by owner").selectOption("unassigned");
    await expect(page.getByText("Fieldhouse Studio workspace", { exact: true })).toHaveCount(0);
    await expect(page.locator(".operator-queue-card")).toHaveCount(3);
    await expect(page.getByRole("list", { name: "Applied filters" })).toContainText("Owner: Unassigned");
    await page.getByLabel("Filter by owner").selectOption("");
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

  contract("RECORD-005", "the mobile opportunity timeline shows metadata and orders out-of-order notes with ID ties", async ({ page }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const failures = watchFailures(page);
    await openOpportunity(page);

    const timeline = page.getByTestId("recorded-details");
    await timeline.locator("summary").click();
    await expect(timeline).toContainText("Occurred");
    await expect(timeline).toContainText("Recorded");
    await expect(timeline).toContainText("Actor Website form (Source)");
    await expect(timeline).toContainText("source Signals");

    const opportunityId = new URL(page.url()).pathname.split('/').at(-1);
    const recordPath = `/api/v1/records/opportunity/${opportunityId}`;
    // A newer event arrives before an older one, then a late event ties the first.
    const notes = [
      { text: 'synthetic-orbit-timeline-tie-one', occurredAt: '2026-01-03T09:00:00.000Z' },
      { text: 'synthetic-orbit-timeline-earlier', occurredAt: '2026-01-02T09:00:00.000Z' },
      { text: 'synthetic-orbit-timeline-tie-two', occurredAt: '2026-01-03T09:00:00.000Z' },
    ];
    for (const note of notes) {
      const response = await page.request.post(`${recordPath}/entries`, {
        headers: { Origin: new URL(page.url()).origin }, data: { kind: 'note', ...note },
      });
      expect(response.ok(), await response.text()).toBe(true);
      note.id = (await response.json()).id;
    }
    expect(new Set(notes.map(note => note.id)).size).toBe(3);
    const expected = [...notes].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || a.id.localeCompare(b.id));
    const ids = new Set(notes.map(note => note.id));
    const readTimelines = async () => {
      const recordsResponse = await page.request.get(recordPath);
      expect(recordsResponse.ok()).toBe(true);
      const recordsTimeline = (await recordsResponse.json()).timeline.filter(entry => ids.has(entry.id));
      expect(recordsTimeline.map(entry => ({ id: entry.id, occurredAt: entry.occurred_at, text: JSON.parse(entry.payload_json).text }))).toEqual(expected);
      const opportunityResponse = await page.request.get(`/api/v1/opportunities/${opportunityId}`);
      expect(opportunityResponse.ok()).toBe(true);
      const opportunityTimeline = (await opportunityResponse.json()).opportunity.timeline.filter(entry => ids.has(entry.id));
      expect(opportunityTimeline.map(entry => ({ id: entry.id, occurredAt: entry.occurredAt, text: entry.payload.text }))).toEqual(expected);
      return { records: recordsTimeline.map(entry => entry.id), opportunity: opportunityTimeline.map(entry => entry.id) };
    };
    const initialReads = await readTimelines();

    await page.reload({ waitUntil: 'networkidle' });
    const activity = page.getByTestId('record-activity');
    const noteRows = activity.locator('.r-feed > li[id^="entry-"]').filter({ hasText: 'synthetic-orbit-timeline-' });
    await expect(noteRows).toHaveCount(3);
    expect(await noteRows.evaluateAll(rows => rows.map(row => row.id))).toEqual(expected.map(note => `entry-${note.id}`));
    expect(await noteRows.locator('.r-entry-title').allTextContents()).toEqual(expected.map(note => note.text));
    await expectNoHorizontalOverflow(page);
    await activity.screenshot({ path: info.outputPath('timeline-390.png') });
    const phoneOrder = await noteRows.evaluateAll(rows => rows.map(row => row.id));
    const phoneReads = await readTimelines();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload({ waitUntil: 'networkidle' });
    await expect(noteRows).toHaveCount(3);
    expect(await noteRows.evaluateAll(rows => rows.map(row => row.id))).toEqual(expected.map(note => `entry-${note.id}`));
    expect(await noteRows.locator('.r-entry-title').allTextContents()).toEqual(expected.map(note => note.text));
    await expectNoHorizontalOverflow(page);
    await activity.screenshot({ path: info.outputPath('timeline-1440.png') });
    const desktopReads = await readTimelines();
    await info.attach('timeline-order.json', { contentType: 'application/json', body: JSON.stringify({
      created: notes, expected, initialReads, phoneReads, desktopReads, phoneOrder,
      desktopOrder: await noteRows.evaluateAll(rows => rows.map(row => row.id)),
      desktopFits: await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    }, null, 2) });
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
