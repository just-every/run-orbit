import { expect, test } from "@playwright/test";
import {createHmac,randomUUID} from "node:crypto";

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
    await recorded.locator(":scope > summary").click();
    await expect(recorded).toContainText("Needs attention · Open deal · score 92, High priority");
    await expectNoHorizontalOverflow(page);
    expect(failures).toEqual([]);
  });

  contract("OPP-004", "the mobile detail renders current score evidence and recommendation reason", async ({ page }, info) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    const failures = watchFailures(page);
    // Create the scored deal through native doors. Both originals deliberately share a subject.
    const origin = new URL(info.project.use.baseURL).origin;
    const headers = {Origin:origin};
    const settings = await (await page.request.get('/api/v1/settings')).json();
    const created = await page.request.post('/api/v1/records/opportunity', {headers,data:{
      title:'Source evidence navigation',stage_id:settings.stages[0].id,value_cents:0
    }});
    expect(created.status()).toBe(201);
    const {id} = await created.json();
    const sourceId = `synthetic-orbit-${randomUUID()}`;
    const configured = await page.request.put(`/api/v1/sources/${sourceId}`, {headers,data:{name:'Evidence source',enabled:true}});
    expect(configured.status()).toBe(200);
    const {secret} = await configured.json();
    const originals = [];
    for (const [type,points,confidence,kind] of [
      ['meeting.booked',45,'Observed','Meeting Booked'],
      ['email.bounced',-25,'Inferred','Delivery problem reported']
    ]) {
      const event = {eventId:`synthetic-orbit-${randomUUID()}`,type,subject:'Shared source subject',
        occurredAt:new Date(Date.now()-60_000).toISOString(),record:{type:'opportunity',id},
        data:{detail:`Original ${type} evidence`,literal:'<script>window.evidenceExecuted=true</script>'}};
      const raw = JSON.stringify(event), timestamp = String(Math.floor(Date.now()/1000));
      const response = await page.request.post(`/api/v1/signals/${sourceId}`, {data:raw,headers:{
        'Content-Type':'application/json','X-Orbit-Timestamp':timestamp,
        'X-Orbit-Signature':createHmac('sha256',secret).update(`${timestamp}.${raw}`).digest('hex')
      }});
      expect(response.status()).toBe(201);
      originals.push({signalId:(await response.json()).id,event,raw,points,confidence,kind});
    }
    await page.goto(`/app/opportunities/${id}`, {waitUntil:'networkidle'});
    const evidence = page.getByTestId('contributing-evidence');
    await evidence.locator('summary').click();
    await expect(evidence).toContainText('Used for this recommendation');
    const next = page.getByTestId('next-action');
    await expect(next).toContainText('Write follow-up');
    await expect(next).toContainText('Delivery problem');
    await expect(next.locator('.r-next-line')).toHaveText('Shared source subject');
    const recorded = page.getByTestId('recorded-details');
    for (const item of originals) {
      const link = evidence.getByRole('link').filter({hasText:item.signalId});
      const row = link.locator('..').locator('..');
      await expect(row).toContainText(item.event.subject);
      await expect(row.getByText(item.kind,{exact:true})).toBeVisible();
      await expect(row).toContainText('Evidence source');
      await expect(row).toContainText(item.confidence.toLowerCase());
      await expect(row.locator('b')).toHaveText(`${item.points>0?'+':''}${item.points}`);
      await expect(row.locator('b')).toBeVisible();
      await link.focus();
      await page.keyboard.press('Enter');
      const summary = recorded.locator(`#signal-evidence-${item.signalId}`);
      const target = summary.locator('..');
      await expect(summary).toBeFocused();
      await expect(target).toContainText('linked by explicit orbit record id');
      await expect(target).toContainText(item.signalId);
      await expect(target).toContainText(item.confidence);
      await expect(target).toContainText('Occurred');
      await expect(target).toContainText('Received');
      const original = target.getByRole('region',{name:`Source evidence for signal ${item.signalId}`});
      await expect(original).toBeVisible();
      await expect(original).toContainText(item.event.eventId);
      await expect(original.locator('pre')).toHaveText(item.raw);
      expect(await page.evaluate(()=>window.evidenceExecuted)).toBeUndefined();
    }
    await expect(recorded.getByTestId('current-recommendation')).toContainText('Review customer activity');
    await expectNoHorizontalOverflow(page);
    await page.screenshot({path:info.outputPath('evidence-1440.png'),fullPage:true});
    // The same screen and native links are exercised for the phone proof; assertions run at 1440.
    await page.setViewportSize({width:390,height:844});
    for (const item of originals) {
      await evidence.getByRole('link').filter({hasText:item.signalId}).click();
    }
    await page.screenshot({path:info.outputPath('evidence-390.png'),fullPage:true});
    expect(failures).toEqual([]);
  });

  contract("RECORD-005", "the mobile opportunity timeline shows occurred, recorded, actor, and source", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const failures = watchFailures(page);
    await openOpportunity(page);

    const timeline = page.getByTestId("recorded-details");
    await timeline.locator(":scope > summary").click();
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
