import {expect} from "@playwright/test";

import { authenticateOperator } from "./operator-session.mjs";

export function watchFailures(page, expectedConsoleErrors = []) {
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


export const operatorJourney1 = async ({ page }) => {
    await page.setViewportSize({ width:1440, height: 900 });
    const failures = watchFailures(page);
    await page.goto("/app", { waitUntil: "networkidle" });

    await expect(page.getByTestId("now-queue")).toBeVisible();
    const {opportunities}=await (await page.request.get('/api/v1/opportunities/now')).json();
    const ordered=[...opportunities].sort((a,b)=>b.score-a.score || (b.lastContributingSignalAt??'').localeCompare(a.lastContributingSignalAt??'') || a.id.localeCompare(b.id));
    expect(await page.locator('.operator-queue-card > a').evaluateAll(links=>links.map(link=>link.getAttribute('href')))).toEqual(ordered.map(row=>`/app/opportunities/${row.id}`));
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
  };

export const operatorJourney2 = async ({ page }) => {
    await page.setViewportSize({ width:1440, height: 900 });
    const failures = watchFailures(page);
    await page.goto("/app", { waitUntil: "networkidle" });

    await expect(page.getByText("Observed form submission and meeting booking")).toBeVisible();
    await expect(page.getByText("Why NOW").first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    expect(failures).toEqual([]);
  };

export const operatorJourney3 = async ({ page }) => {
    await page.setViewportSize({ width:1440, height: 900 });
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
  };

export const operatorJourney4 = async ({ page }, info) => {
    await page.setViewportSize({ width:1440, height: 900 });
    const failures = watchFailures(page);
    await openOpportunity(page);

    const evidence = page.getByTestId("contributing-evidence");
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
    await page.screenshot({path:info.outputPath('evidence-1440.png'),fullPage:true});
    expect(failures).toEqual([]);
  };

export const operatorJourney5 = async ({ page }) => {
    await page.setViewportSize({ width:1440, height: 900 });
    const failures = watchFailures(page);
    await openOpportunity(page);

    await page.getByText("Audit details", {exact:true}).click();
    const timeline = page.getByTestId("opportunity-detail");
    await expect(timeline).toContainText("Occurred");
    await expect(timeline).toContainText("Recorded");
    await expect(timeline).toContainText("Actor Website form (Source)");
    await expect(timeline).toContainText("source Signals");
    await recordHistoryValues(page);
    await expectNoHorizontalOverflow(page);
    expect(failures).toEqual([]);
  };

export const operatorJourney6 = async ({ browser, page }) => {
    await page.setViewportSize({ width:1440, height: 900 });
    const failures = watchFailures(page);
    const issued = await authenticateOperator(page.context());
    const draftHref = `/app/drafts/${issued.draft.id}`;

    const secondContext = await browser.newContext({viewport:{width:1440,height:900},baseURL:`http://127.0.0.1:${process.env.ORBIT_BROWSER_PORT ?? 8722}`});
    try {
    await authenticateOperator(secondContext, issued);
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
    expect(newPageFailures).toEqual([]);
    await newPage.close();

    await staleEditor.getByTestId("draft-body").fill(`Conflicting operator edit ${Date.now()}.`);
    await staleEditor.getByTestId("save-draft").click();
    await expect(staleEditor.getByText("The draft changed or is stale. Reload it before editing.")).toBeVisible();
    await staleEditor.getByRole("button", { name: "Reload saved draft" }).click();
    await expect(staleEditor.getByTestId("draft-body")).toHaveValue(savedBody);
    await expectNoHorizontalOverflow(page);
    expect(failures).toEqual([]);
    expect(staleFailures).toEqual([]);
    } finally {
      await secondContext.close();
    }
  };


async function recordHistoryValues(page) {
  const issued = await authenticateOperator(page.context()), origin = new URL(page.url()).origin;
  const call = async (path, method = "GET", body, status = 200) => {
    const response = await page.request.fetch(path, { method, headers: { Origin: origin }, ...(body === undefined ? {} : { data: body }) });
    expect(response.status(), `${method} ${path}`).toBe(status);
    return response.json();
  };
  const name = `History values ${Date.now()}`;
  const created = await call("/api/v1/records/contact", "POST", { name }, 201);
  const path = `/api/v1/records/contact/${created.id}`, read = () => call(path);
  const initial = await read();
  await page.goto(`/app/records?kind=contact&record=${created.id}`, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit details", exact: true }).click();
  const saved = page.waitForResponse(response => new URL(response.url()).pathname === path && response.request().method() === "PUT");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  expect((await (await saved).json()).changed).toBe(false);
  await expect(page.getByRole("status").filter({ hasText: /no changes/i })).toBeVisible();
  expect(await read()).toEqual(initial); // Includes updated_at, complete details and timeline.

  const values = { member_names: '["ada","bo"]', empty_list: "[]", empty_object: "{}", is_ready: false, zero: 0 };
  expect((await call(path, "PUT", { name, custom_fields: values })).changed).toBe(true);
  const changed = await read(), entry = changed.timeline.find(item => item.kind === "record.updated");
  const settings = await call("/api/v1/settings"), actor = settings.operators.find(operator => operator.id === issued.draft.authorId);
  expect(entry.actor_id).toBe(issued.draft.authorId);
  expect(entry.actor_name).toBe(actor.display_name);
  const lines = [
    'Changed Member names: Empty → ["ada","bo"]',
    "Changed Empty list: Empty → []", "Changed Empty object: Empty → {}",
    "Changed Is ready: Empty → false", "Changed Zero: Empty → 0"
  ];
  for (const line of lines) expect(JSON.parse(entry.payload_json).text).toContain(line);
  expect((await call(path, "PUT", { name, custom_fields: Object.fromEntries(Object.entries(values).reverse()) })).changed).toBe(false);
  expect(await read()).toEqual(changed);
  await page.reload({ waitUntil: "networkidle" });
  const field = label => page.locator(".records-detail-list > div").filter({ has: page.locator("dt").filter({ hasText: new RegExp(`^${label}$`) }) }).locator(":scope > dd");
  for (const [label, value] of [["Member names", values.member_names], ["Empty list", "[]"], ["Empty object", "{}"], ["Is ready", "false"], ["Zero", "0"]]) {
    await expect(field(label)).toHaveText(value);
  }
  const timelineEntry = page.locator(`#entry-${entry.id}`);
  await expect(timelineEntry).toContainText(actor.display_name);
  for (const line of lines) await expect(timelineEntry).toContainText(line);

  const literal = { ...values, member_names: "ada; bo" };
  expect((await call(path, "PUT", { name, custom_fields: literal })).changed).toBe(true);
  expect((await read()).timeline.some(item => item.kind === "record.updated" && JSON.parse(item.payload_json).text.includes('["ada","bo"] → ada; bo'))).toBe(true);
  const importSource = JSON.stringify({ vendor: "hubspot", account: "CRM 42", sourceId: "old-42", owner: "Ada", stage: null, description: null });
  await call(path, "PUT", { name, custom_fields: { ...literal, import_source: importSource } });
  const provenance = await read();
  expect(JSON.parse(provenance.record.custom_fields_json).import_source).toBe(importSource);
  expect(provenance.timeline.some(item => item.kind === "record.updated" && JSON.parse(item.payload_json).text.includes("Changed Import source: Empty → Imported from: CRM 42 (HubSpot export); ID in old system: old-42; Owner in old system: Ada"))).toBe(true);
  await page.reload({ waitUntil: "networkidle" });
  await expect(field("Member names")).toHaveText("ada; bo");
  await expect(field("Import source")).toContainText("CRM 42 (HubSpot export)");
  await call(path, "PUT", { name, custom_fields: { ...literal, import_source: "Reviewed by Ada" } });
  const replaced = await read();
  const replacement = replaced.timeline.find(item => item.kind === "record.updated" && JSON.parse(item.payload_json).text.includes("Changed Import source: Replaced import details from CRM 42 (HubSpot export) with text: Reviewed by Ada"));
  expect(replacement).toBeTruthy();
  await page.reload({ waitUntil: "networkidle" });
  await expect(field("Import source")).toHaveText("Reviewed by Ada");
  await expect(page.locator(`#entry-${replacement.id}`)).toContainText("Replaced import details from CRM 42 (HubSpot export) with text: Reviewed by Ada");
}
