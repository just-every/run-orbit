import {requestOfflineFixture} from "../../scripts/browser-runtime.mjs";
import { testState } from "./test-state";
if (await requestOfflineFixture("tests/support/issue-operator-session.ts", process.argv.slice(2))) process.exit(0);
import { getPlatformProxy } from "wrangler";

import { createDependencies } from "./dependencies";
import { sessionCookieName } from "./test-auth";
import { sampleData } from "../fixtures/sample-data";
import { createId } from "../../src/core/shared/ids";

const platform = await getPlatformProxy<{ DB: D1Database }>({
  configPath: "wrangler.jsonc", envFiles:["tests/support/no-local-settings.env"],
  persist: { path: `${testState()}/v3` },
  remoteBindings: false
});

try {
  const dependencies = createDependencies(platform.env.DB);
  for (const opportunity of [
    { id: "01J0000000000000000000000X", score: 99, lastContributingSignalAt: "2026-08-01T00:00:00.000Z" },
    { id: "01J0000000000000000000000Y", score: 92, lastContributingSignalAt: "2026-08-31T00:00:00.000Z" },
    { id: "01J0000000000000000000000Z", score: 92, lastContributingSignalAt: "2026-08-29T00:00:00.000Z" }
  ]) {
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
  const draftId = createId();
  const draft = {
    id: draftId,
    opportunityId: sampleData.opportunities[0].id,
    recommendationId: sampleData.recommendations[0].id,
    authorId: sampleData.operators[0].id,
    recipientContactId: sampleData.contacts[0].id,
    recipientEmail: "elena@fieldhouse.example",
    subject: "Operator durability review",
    body: "This draft is created through the real DraftsService for the browser durability test.",
    revision: 1,
    isStale: false,
    staleReason: null
  };
  await dependencies.drafts.ensureDraft(draft);
  const session = await dependencies.auth.createSession(sampleData.operators[0].id);
  process.stdout.write(JSON.stringify({ cookieName: sessionCookieName, expiresAt: session.expiresAt, token: session.token, draft }));
} finally {
  await platform.dispose();
}
