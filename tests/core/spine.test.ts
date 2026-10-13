import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { getPlatformProxy } from "wrangler";

import { createApp } from "../support/app";
import { createTestDependencies } from "../support/test-dependencies";
import { sessionCookieName } from "../support/test-auth";
import { emailLinkSignIn } from "../support/email-link";
import { sampleData } from "../fixtures/sample-data";
import { createId } from "../../src/core/shared/ids";
import { testState } from '../support/test-state';

const platform = await getPlatformProxy<{ DB: D1Database }>({
  configPath: "wrangler.jsonc", envFiles:["tests/support/no-local-settings.env"],
  persist: { path: `${testState()}/v3` },
  remoteBindings: false
});
const dependencies = createTestDependencies(platform.env.DB);
const assets = { fetch: async () => new Response("<!doctype html><div id=\"root\"></div>") };
const app = createApp({ assets, database: platform.env.DB });
const operatorId = sampleData.operators[0].id;
const now = "2026-08-31T00:00:00.000Z";

before(async () => {
  await dependencies.sampleData.seed();
});

after(async () => {
  await platform.dispose();
});

test("the service seed is idempotent and creates association timestamps", async () => {
  const secondRun = await dependencies.sampleData.seed();
  assert.equal(secondRun.applied, false);

  const association = await platform.env.DB
    .prepare("SELECT created_at AS createdAt FROM opportunity_contacts WHERE opportunity_id = ? AND contact_id = ?")
    .bind(sampleData.opportunityContacts[0].opportunityId, sampleData.opportunityContacts[0].contactId)
    .first<{ createdAt: string }>();

  assert.ok(association?.createdAt);
});

test("BASE-OPS-001 D1-backed health reports supplied deployment identity and database failure semantics", async () => {
  const healthy = await app.request("https://orbit.test/health");
  assert.equal(healthy.status, 200);
  assert.deepEqual(await healthy.json(), { ok: true, service: "orbit", status: "ok", database: "ok" });

  const deployment = {
    sourceSha: randomBytes(20).toString("hex"),
    fingerprint: randomBytes(32).toString("hex"),
    versionId: randomUUID()
  };
  const deployedApp = createApp({ assets, database: platform.env.DB, deployment });
  const deployed = await deployedApp.request("https://orbit.test/health");
  assert.equal(deployed.status, 200);
  assert.deepEqual(await deployed.json(), {
    ok: true,
    service: "orbit",
    status: "ok",
    database: "ok",
    deployment
  });

  const unavailableApp = createApp({
    assets,
    deployment,
    database: { prepare: () => { throw new Error("D1 unavailable"); } } as unknown as D1Database
  });
  const unavailable = await unavailableApp.request("https://orbit.test/health");
  assert.equal(unavailable.status, 503);
  assert.deepEqual(await unavailable.json(), {
    service: "orbit",
    status: "unavailable",
    database: "unavailable"
  });
});

test("BASE-ACCESS-001 BASE-ACCESS-002 opaque D1 sessions guard APIs, authenticate, revoke, and bound their lifetime", async () => {
  const unauthenticated = await app.request("https://orbit.test/api/v1/opportunities/now");
  assert.equal(unauthenticated.status, 401);

  const issued = await dependencies.auth.createSession(operatorId);
  const stored = await platform.env.DB
    .prepare("SELECT token_hash AS tokenHash FROM sessions WHERE id = ?")
    .bind(issued.id)
    .first<{ tokenHash: string }>();
  assert.match(stored?.tokenHash ?? "", /^[a-f\d]{64}$/);
  assert.notEqual(stored?.tokenHash, issued.token);

  const authenticated = await app.request("https://orbit.test/api/v1/opportunities/now", {
    headers: { cookie: `${sessionCookieName}=${issued.token}` }
  });
  assert.equal(authenticated.status, 200);
  const authenticatedPayload = await authenticated.json() as { opportunities: Array<{ id: string }> };
  assert.ok(authenticatedPayload.opportunities.some((opportunity) => opportunity.id === sampleData.opportunities[0].id));
  const operatorShell = await app.request("https://orbit.test/app", {
    headers: { cookie: `${sessionCookieName}=${issued.token}` }
  });
  // Document routes belong to the TanStack Start Worker, not the Hono API router.
  assert.equal(operatorShell.status, 404);

  await dependencies.auth.revoke(issued.id);
  const revoked = await app.request("https://orbit.test/api/v1/opportunities/now", {
    headers: { cookie: `${sessionCookieName}=${issued.token}` }
  });
  assert.equal(revoked.status, 401);
  // A real email-link sign-in issues a session with a bounded lifetime (Base's maximum is 30 days).
  const email = (await platform.env.DB.prepare("SELECT email FROM operators WHERE id=?").bind(operatorId).first<{ email: string }>())!.email;
  const signedIn = await emailLinkSignIn(platform.env.DB, email);
  const lifetime = await platform.env.DB.prepare("SELECT created_at, expires_at FROM sessions WHERE id=?").bind(signedIn.operator.sessionId).first<{ created_at: string; expires_at: string }>();
  const span = Date.parse(lifetime!.expires_at) - Date.parse(lifetime!.created_at);
  assert.ok(span > 0 && span <= 1000 * 60 * 60 * 24 * 30, `session lifetime ${span}ms`);
});

test("NOW and detail APIs are persisted, authenticated, and preserve polymorphic record boundaries", async () => {
  const issued = await dependencies.auth.createSession(operatorId);
  const headers = { cookie: `${sessionCookieName}=${issued.token}` };
  const nowResponse = await app.request("https://orbit.test/api/v1/opportunities/now", { headers });
  const nowPayload = await nowResponse.json();
  assert.equal(nowResponse.status, 200);
  assert.equal(nowPayload.opportunities[0].queueState, "now");
  assert.ok(nowPayload.opportunities.some((opportunity: { id: string }) => opportunity.id === sampleData.opportunities[0].id));
  const invalidDetail = await app.request("https://orbit.test/api/v1/opportunities/not-an-id", { headers });
  assert.equal(invalidDetail.status, 400);

  const collisionSignalId = createId(Date.now());
  await dependencies.records.ensureContact({
    id: sampleData.opportunities[0].id,
    companyId: null,
    name: "Unrelated colliding record",
    email: "collision@example.test",
    emailKey: "collision@example.test",
    phone: null,
    jobTitle: null,
    timezone: null,
    contactability: "contactable"
  });
  await dependencies.signals.recordSignal({
    id: collisionSignalId,
    sourceId: sampleData.signalSources[0].id,
    sourceEventId: `collision-${collisionSignalId}`,
    type: "contact_only_signal",
    subject: "Must not appear on the opportunity",
    occurredAt: now,
    receivedAt: now,
    payloadHash: "a".repeat(64),
    confidence: "observed",
    linkingBasis: "test"
  });
  await dependencies.signals.ensureLink({
    signalId: collisionSignalId,
    recordType: "contact",
    recordId: sampleData.opportunities[0].id,
    linkingBasis: "test",
    linkedAt: now
  });
  const collisionTimelineId = createId(Date.now() + 1);
  await dependencies.timeline.ensureEntry({
    id: collisionTimelineId,
    kind: "contact.only",
    occurredAt: now,
    recordedAt: now,
    actorType: "test",
    actorId: null,
    source: "test",
    payloadJson: "{}"
  });
  await dependencies.timeline.ensureRecord({
    timelineEntryId: collisionTimelineId,
    recordType: "contact",
    recordId: sampleData.opportunities[0].id
  });

  const detailResponse = await app.request(
    `https://orbit.test/api/v1/opportunities/${sampleData.opportunities[0].id}`,
    { headers }
  );
  const detailPayload = await detailResponse.json();
  assert.equal(detailResponse.status, 200);
  assert.equal(detailPayload.opportunity.evaluation.status, "current");
  assert.ok(detailPayload.opportunity.timeline.length >= 2);
  const recordedSignal = detailPayload.opportunity.timeline.find((entry: { id: string }) => entry.id === sampleData.timelineEntries[0].id);
  assert.deepEqual(
    { actorName: recordedSignal.actorName, sourceName: recordedSignal.sourceName },
    { actorName: "Website form", sourceName: "Signals" }
  );
  assert.ok(!detailPayload.opportunity.signals.some((signal: { id: string }) => signal.id === collisionSignalId));
  assert.ok(!detailPayload.opportunity.timeline.some((entry: { id: string }) => entry.id === collisionTimelineId));

  const draftListResponse = await app.request(
    `https://orbit.test/api/v1/drafts?opportunityId=${sampleData.opportunities[0].id}`,
    { headers }
  );
  assert.equal(draftListResponse.status, 200);
  const draftList = await draftListResponse.json() as { drafts: Array<{ id: string; opportunityId: string }> };
  assert.ok(draftList.drafts.some((draft) => draft.id === sampleData.drafts[0].id));
  assert.ok(draftList.drafts.every((draft) => draft.opportunityId === sampleData.opportunities[0].id));
});

test("NOW ordering keeps queue, score, signal time, and ID independent", async () => {
  // Sample dates are relative to today; place the proofs around the sample opportunity's own signal time.
  const sampleSignalAt = Date.parse(sampleData.opportunities[0].lastContributingSignalAt!), hour = 3_600_000;
  const ordered = [
    { id: "01J0000000000000000000000X", score: 99, lastContributingSignalAt: new Date(sampleSignalAt - 30 * 24 * hour).toISOString() },
    { id: "01J0000000000000000000000Y", score: 92, lastContributingSignalAt: new Date(sampleSignalAt + 12 * hour).toISOString() },
    { id: "01J0000000000000000000000Z", score: 92, lastContributingSignalAt: new Date(sampleSignalAt - 36 * hour).toISOString() }
  ];
  for (const opportunity of ordered) {
    await dependencies.records.ensureOpportunity({
      ...opportunity,
      title: `Ordering proof ${opportunity.id.slice(-1)}`,
      lifecycle: "open",
      stageId: sampleData.pipelineStages[0].id,
      ownerId: null,
      companyId: null,
      valueCents: 0,
      expectedCloseAt: null,
      band: "high",
      queueState: "now",
      queueReason: "Ordering proof"
    });
  }

  const nowOpportunities = await dependencies.opportunities.listNow();
  const relevantIds = new Set([...ordered.map((proof) => proof.id), sampleData.opportunities[0].id]);
  const proofIds = nowOpportunities.filter((item) => relevantIds.has(item.id)).map((item) => item.id);
  assert.deepEqual(proofIds, [ordered[0].id, ordered[1].id, sampleData.opportunities[0].id, ordered[2].id]);

  const issued = await dependencies.auth.createSession(operatorId);
  const headers = { cookie: `${sessionCookieName}=${issued.token}` };
  const filteredResponse = await app.request(
    `https://orbit.test/api/v1/opportunities/now?ownerId=unassigned&stageId=${sampleData.pipelineStages[0].id}&band=high`,
    { headers }
  );
  assert.equal(filteredResponse.status, 200);
  const filteredPayload = await filteredResponse.json() as {
    facets: { owners: Array<{ id: string | null }>; stages: Array<{ id: string }>; bands: string[] };
    opportunities: Array<{ ownerId: string | null; stageId: string; band: string }>;
  };
  assert.ok(filteredPayload.opportunities.length >= ordered.length);
  assert.ok(filteredPayload.opportunities.every((opportunity) => (
    opportunity.ownerId === null && opportunity.stageId === sampleData.pipelineStages[0].id && opportunity.band === "high"
  )));
  assert.ok(filteredPayload.facets.owners.some((owner) => owner.id === sampleData.operators[0].id));
  assert.ok(filteredPayload.facets.stages.some((stage) => stage.id === sampleData.pipelineStages[0].id));
  assert.ok(filteredPayload.facets.bands.includes("high"));
});

test("evaluation current-state changes and revision-safe drafts are transactional", async () => {
  const opportunityId = sampleData.opportunities[1].id;
  const firstEvaluationId = createId(Date.now());
  const secondEvaluationId = createId(Date.now() + 1);
  const evaluation = {
    opportunityId,
    score: 70,
    band: "medium" as const,
    evaluatedAt: now,
    policyVersion: "opportunity.scoring.v1",
    status: "current" as const,
    failureAt: null,
    now
  };
  await dependencies.opportunities.recordCurrentEvaluation({ ...evaluation, id: firstEvaluationId });
  await dependencies.opportunities.recordCurrentEvaluation({ ...evaluation, id: secondEvaluationId });
  await dependencies.opportunities.recordCurrentEvaluation({ ...evaluation, id: secondEvaluationId });

  const currentEvaluations = await platform.env.DB
    .prepare("SELECT id FROM evaluations WHERE opportunity_id = ? AND status = 'current'")
    .bind(opportunityId)
    .all<{ id: string }>();
  assert.deepEqual(currentEvaluations.results.map((row) => row.id), [secondEvaluationId]);

  const issued = await dependencies.auth.createSession(operatorId);
  const headers = { cookie: `${sessionCookieName}=${issued.token}`, "content-type": "application/json", origin: "https://orbit.test" };
  const original = await dependencies.drafts.readDraft(sampleData.drafts[0].id);
  assert.ok(original);
  const malformed = await app.request(`https://orbit.test/api/v1/drafts/${original.id}`, {
    method: "PUT",
    headers,
    body: "{"
  });
  assert.equal(malformed.status, 400);
  assert.deepEqual(await malformed.json(), { error: "Request body must be valid JSON." });

  const update = await app.request(`https://orbit.test/api/v1/drafts/${original.id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      revision: original.revision,
      recipientEmail: original.recipientEmail,
      subject: `${original.subject} updated`,
      body: `${original.body}\n\nPrepared for review.`
    })
  });
  assert.equal(update.status, 200);
  assert.equal((await update.json()).draft.revision, original.revision + 1);

  const staleUpdate = await app.request(`https://orbit.test/api/v1/drafts/${original.id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      revision: original.revision,
      recipientEmail: original.recipientEmail,
      subject: original.subject,
      body: original.body
    })
  });
  assert.equal(staleUpdate.status, 409);
});
