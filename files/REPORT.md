# Orbit manual deal defaults carry and correction

Repository: just-every/run-orbit
Branch: cloud/main-orbit-record-defaults-1-c1
Initial main: bd9c4b5223b28c5c90923b2c8b22bfca2daaf42b
Final parent main: a8f2deb844acfdefa84bae782f5f4c22299200c6
Product head: d3abcfc8e5cfc04936e8a0bd6f6481cdf8999660
Prior round: 17d10024cb3301208e42eb1e0e543faacdab41ba

The candidate carries optional company creation, the explicit Owner choice, and clear No company / Unassigned labels from the prior round. It corrects two compatibility regressions: the shared assignment policy is restored exactly to main, and the workbench inventory keeps its original response shape. The form obtains eligible active native operators from the existing settings endpoint. An empty manual Owner choice posts ownerId:null; an explicit choice posts its operator ID. Existing callers omitting ownership retain main's assignment policy, including fixtures, imports and workflow/notice paths. No existing customer is reassigned and there is no migration.

The first-customer checklist and New opportunity use the same CreateOpportunityPage. Company remains visible and optional, for both new and existing contacts. Repository and route validation allow zero companies and reject ambiguous dual company input. Explicit owner IDs are validated against active native operators. Lists, NOW, pipeline, deal pages and report/forecast row and group presentations retain clear missing-association labels.

The prior round was squashed onto current main. Immediately before the first push, main advanced with contract-only changes to NOTIFY-001 / OUT-023. The unpublished single commit was rebased onto that main; the new contract judgments and source-lock entries were retained. Product/runtime/tests did not change in the rebase. The lock was regenerated again and remained byte-identical, with its check green. The published branch contains exactly one commit and no merge commit. The only source-lock conflict was resolved from main before regeneration. CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md remain byte-identical to main; no Status, Gap or Evidence cell changed. The candidate restores src/ext/records.ts byte-for-byte to main. The six original assertion source files also remain byte-identical to main, recorded in unchanged-contract-and-assertions.json. No setup change to those six tests was necessary: retaining legacy omitted-owner semantics preserves their owned fixtures.

The expanded existing workbench browser journey checks manual default unassignment, a chosen owner, company-free existing contacts, reload, list and pipeline. The existing Records journey retains main's legacy native creation assertions and also checks explicit manual null ownership, company-free new and existing contacts, chosen ownership and invalid owner refusal. There are no new test registrations: 198 cases + 2 qualifications = 200 before and after. Homepage claim counts remain 12: 3 done, 9 partial, 0 missing. RECORD-001 and RECORD-007 remain partial. No clause status changes or DONE claim are proposed.

## Plan

The complete plan is PLAN.md. Work is limited to carrying and correcting manual deal defaults; it excludes other stranger findings, deployment and landing. Source lock generation and check run last. The fleet Mac owns the publication scan and landing. No PR is required by the repository's instructions.

## Original Verify regression mapping

Original Verify: 43152719971, head 17d10024cb3301208e42eb1e0e543faacdab41ba.

- batch-3: managed-owner.test.ts / notificationDirectProof: replay still notifies the other responsible person once.
- batch-9: prior-auth-upgrade.test.ts: owner:workbench prior-session response stays equal to the recorded access answer.
- batch-12: source-onboarding.test.ts / proveSlackNotices: won notices retain permitted field values, including the native owner.
- batch-13: operator-desktop.test.mjs / workflowValuesBrowserJourney: the fixture retains a native operator owner for the user field.
- batch-14: identity.test.mjs: collaborators see only owners of deals they can read.
- batch-15: capture-review.test.ts / workflowRecordJourney: copying the trigger owner into a related contact's custom user field retains the expected native operator ID. The original failure was undefined versus the operator ID. This was recovered from the archive downloaded by the one gh run view log command; no second log download was needed.

## Validation and custody

regression-matrix.json maps each of the six original failures to an unchanged assertion source and its actual local result. The enclosing Slack case remains recorded as locally failed; it is never counted as a passing complete local case. Exact-SHA Verify is the full-case verdict.

Verification receipts record actual local outcomes, exact product SHA and the successful guarded first push. Verify run 43170987177 is bound to d3abcfc8e5cfc04936e8a0bd6f6481cdf8999660; its final outcome is recorded in ci-receipt.json and RESULTS.json. Initial local timeouts are retained separately from successful retries. The standalone UI proof passed at 1440 and 390, with twelve screenshots and no page errors. The expanded workbench browser case and touched Records API case passed. Prior-session upgrade, both fresh-install identity cases, the operator actions case, capture/workflow copying, the desktop operator route/workflow-values case, the 390-pixel operator route smoke, and the managed-owner case passed. The combined rer regression command completed five cases with zero failures; the API retry command completed three cases with zero failures. The Slack owner-field assertion passed, but its enclosing local case later failed archive step-up after exceeding the ten-minute proof freshness window; local-timing-limitation.md records this limitation without a local green claim. The VM's 80-migration D1 fixture bootstrap exceeded its original 60-second subprocess allowance; the external VM-only retry preload allows 240 seconds for that subprocess. The external Playwright config allows 240 seconds for server startup. Assertions are unchanged. The final workbench retry has a VM-only 180-second total allowance and 60-second rendering waits; candidate source retains its 60-second total limit and standard assertion waits. The independent screenshot proof uses 60-second rendering waits. After repeated server bootstrap timeouts, the final workbench run starts the built browser runtime on an isolated copy of already migrated synthetic test state; native fixture issuance and all assertions still run. Chromium is /usr/bin/chromium with --no-sandbox, with real HOME and disposable contexts. No browser profile or real session was copied.

Publication evidence is report-only on refs/heads/evidence/main-orbit-record-defaults-1-c1. Product custody and evidence transfer are separate. Evidence is not acceptance or landing authority.

DEFAULT RECORD-001: Company is optional in the shared manual deal form; at least one selected or newly entered contact remains required by that form.
DEFAULT RECORD-007: The manual form sends explicit null for an empty owner choice. Legacy APIs omitting ownership retain main's assignment policy to preserve existing creation paths.
GAP RECORD-001: This scoped proof does not establish every custom-field and record lifecycle requirement of the clause.
GAP RECORD-007: This scoped proof establishes manual default unassignment and explicit chosen ownership; it does not newly qualify every reassignment, unassignment, attributed timeline and unchanged-score obligation.

CLAIM RECORD-001 PARTIAL points=none tests=tests/e2e/workbench.spec.mjs#a real account, attributed event and durable reviewed draft can be created
CLAIM RECORD-007 PARTIAL points=none tests=tests/e2e/workbench.spec.mjs#a real account, attributed event and durable reviewed draft can be created

CI transport note: the fifth watcher request exited 1 without retaining its error body or HTTP status. The prescribed launcher refresh and Git setup were repeated. The replacement watcher captures sanitized error bodies and continues only at the permitted five-minute cadence, within the remaining API budget. ci-transport.json records the original unknown-status failure; ci-recovery-watch.log records subsequent observations.

CI recovery: after refreshing the prescribed bundle, the next permitted request succeeded and confirmed the same exact-SHA Verify was still in_progress. The earlier transport failure did not report a red workflow result. The final captured state is authoritative in ci-receipt.json.

## Terminal result

Verify 43170987177 completed successfully on d3abcfc8e5cfc04936e8a0bd6f6481cdf8999660. This is the full exact-SHA verdict under the repository's normal test limits, including all six original failing paths with unchanged assertion sources. The local Slack archive freshness limitation remains recorded as an actual local failure, and does not replace or weaken the successful full CI case.

The guarded product push succeeded on its first attempt. The branch has exactly one product commit, zero merge commits, a clean checkout, fleet author and committer, and no co-author trailer. No PR was created. CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md equal final parent a8f2deb844acfdefa84bae782f5f4c22299200c6 byte-for-byte. The test inventory is unchanged at 200 (198 cases and 2 qualifications). RECORD-001 and RECORD-007 remain PARTIAL, with no clause status changes. No product blocker remains. Publication scan and landing remain with the fleet Mac.

The completed packet is published separately to refs/heads/evidence/main-orbit-record-defaults-1-c1. The terminal EVIDENCE line names its immutable evidence head. The scratch product clone is removed only after that publication succeeds; reports and receipts remain outside it.

READY branch=cloud/main-orbit-record-defaults-1-c1 head=d3abcfc8e5cfc04936e8a0bd6f6481cdf8999660
