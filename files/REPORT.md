# sd-orbit-c-f122 results

Repository: just-every/run-orbit
Branch: cloud/sd-orbit-c-f122
Candidate: f4b2d04fb3ab2b4779f93c4db16d7c4b263b3dcb
Base: 43497d9593cdf019042332a4bf8bae27f4004ede
Product push: succeeded on the first attempt. No PR is required: Verify starts on the branch push. No PR created. No main push or landing performed.

BASE-AGENT-007 remains PARTIAL. The selected rejection portion of acceptance 5 now has native runtime coverage. Counts before and after: 36 DONE, 136 PARTIAL, 32 MISSING, 204 total. Tests before and after: 198 registrations plus two qualifications, total 200. No registration, assertion, clause sentence, Status, Gap, Evidence, summary count, policy, Base pin, workflow or UI changed. No plan row was edited. The plan update for the lane is the selected acceptance-5 rejection gap closed; the clause judgment and all held remainder stay unchanged.

## Plan and implementation

The full execution plan is in PLAN.md. Read the repository rules, supplied builder rules, plan extract, ruling index, Orbit rulings and DONE riders. Inspected ./src/base/modules/agent-door/approvals.ts, ./src/base/modules/agent-door/pipeline.ts and ./src/core/features/agent-door/reports.ts. Rejected approvals already replay as approval_rejected; the pipeline returns retained refusal evidence without executing the report. Native report computation runs only through its current review-hash and source fences. The new public-door journey demonstrates that behavior, so no production repair was justified.

Extended the existing managed-owner registration with rejectedNativeReportProof in ./tests/core/managed-owner.test.ts. ./tests/support/agent-door-proof.ts exposes the existing populated protected report and native signed-in owner context to that helper. Its Business MCP helper accepts an explicit RPC ID; existing callers retain their previous default. The focused helper previews the existing report, adopts a signed held policy naming person:business-owner, and submits the genuine standard and sensitive compute request. It reads the server summary and expiry through the native owner session, rejects the exact revision and digest, and retries the unchanged arguments and idempotency key through MCP using RPC 52 after pending RPC 51.

The retry completes with an error-only approval_rejected result, absent structured success, absent pending continuation and absent completion receipt. Full sorted row witnesses cover definitions, snapshots, source lineage, graph records, native companies, contacts and opportunities, snapshot domain events, snapshot domain audit and report.computed effects. Those rows remain identical during pending, rejection and retry. The approval stays rejected with no execution result and no replacement approval, and its rejection event names the signed-in owner. A separate autonomous request with a distinct key creates one readable native report, one source lineage row, one domain event, one audit and one computed effect, preserving its source records. Existing successful approval and receipt assertions in ./src/base/modules/agent-door/conformance/journey.mjs (lines 95 to 118) remain unchanged; they are credited as existing assertions, not presented as a new full conformance run.

## Selected runtime proof register

All new assertions run inside ./tests/core/managed-owner.test.ts, test “Managed owner claim verifies RER authority and creates the native owner/session exactly once”. The helper is called unconditionally from ./tests/support/agent-door-proof.ts:208. Existing Verify planning includes that registration in core-1; no new workflow entry or environment switch was added. Verify event is push, run 42419962332, exact candidate, initially queued. The final observed CI state is recorded below and in the CI receipt.

| ID | Outcome and door | Assertion location | Disposition |
| --- | --- | --- | --- |
| R1 | Preview genuine protected report through MCP with one known source and private measurement group | managed-owner.test.ts:26 to 32 | PASS exact-head local runtime |
| R2 | Signed held policy; compute carries both server-computed standard and sensitive classes and returns input_required with no effect | managed-owner.test.ts:33 to 52 | PASS exact-head local runtime |
| R3 | Signed-in named owner sees the server summary, policy revision, expiry and exact summary digest | managed-owner.test.ts:53 to 66 | PASS exact-head local runtime |
| R4 | Native owner rejects that exact saved revision and digest; rejection has no native effect | managed-owner.test.ts:67 to 70 | PASS exact-head local runtime |
| R5 | Same compute arguments and key, new RPC ID, terminal approval_rejected without success data, continuation or receipt | managed-owner.test.ts:71 to 81 | PASS exact-head local runtime |
| R6 | Rejection and retry preserve snapshots, sources and computed effects; retained approval has no execution result or replacement, with person attribution | managed-owner.test.ts:82 to 94 | PASS exact-head local runtime |
| R7 | Separate permitted autonomous control creates one readable snapshot and lineage, one effect set, and preserves source records | managed-owner.test.ts:96 to 105 | PASS exact-head local runtime |

## Full acceptance disposition

These rows preserve the unselected scope. They do not claim the clause DONE or count all of point 5 as newly proven.

| Acceptance | Disposition on this candidate |
| --- | --- |
| 1 | Existing assertions retained. Full per-tool and per-class dispositions remain unqualified in this round. |
| 2 | Existing policy_unset assertion retained. Setup, incomplete revision, wildcard completion and upgrade-class behavior remain unqualified. |
| 3 | Money thresholds and daily-cap routing remain omitted. |
| 4 | This round exercises the existing standard and sensitive combination only. Broader combinations remain omitted. |
| 5 | Selected rejected native pending-write retry proven by R1 to R7. Existing successful approval and receipt assertions retained. Full expiry refusal, changed-input new approval, URL elicitation and named-approver browser matrices remain unqualified by this round. |
| 6 | MCP is exercised for the selected request. Full integration and embedded-agent equality remains omitted. |
| 7 | Existing policy adoption assertions retained. Full timely policy-revision and audit qualification remains omitted. |
| 8 | Bad-signature and foreign-Business policy rejection with last-valid-revision retention remains omitted. |

Inherited duties and limits: Door rule D-3 is exercised through native computed standard and sensitive classification, not caller risk flags (R2). Person decision attribution is exercised on the named owner rejection (R6); no broader BASE-AGENT-008 award is claimed. Native report preview and hash-bound computation use the current REPORT-001 implementation (R1 and R7), without a report-delivery or provider claim. Existing credential revocation, erased-person and replay protections remain unchanged; their broader matrices are not newly qualified. Customer-message, mailbox, Base relay, quote and provider holds remain. TEAM-005 still depends on ct cleanup landing and the resulting main. No hold or release prerequisite changed.

## DONE riders

| Rider | Result | Evidence or remaining obligation |
| --- | --- | --- |
| 1 | FAIL for full DONE; selected portion proven locally | R1 to R7 cover only the selected rejection path; other acceptance outcomes above remain omitted. |
| 2 | PASS for selected path | R2, R4 to R7 use populated native rows, reject the dangerous write without effects and permit an independent control. |
| 3 | PENDING | Recorded exact-candidate push Verify 42419962332 must load core-1 and succeed; no green conclusion is inferred. |
| 4 | PASS for local selected proof | Exact-head runtime receipt identifies candidate and test; no later relevant edits are planned. |
| 5 | INSPECTED | No receiving clause or inherited acceptance text changed; no inheritance award requested. |
| 6 | PASS mechanical; judgments preserved | Contract write and check pass; generated views restored whole from origin/main. Judgment and provenance cells remain main-owned. |
| 7 | PASS | No acceptance sentence changed; no ruling, rider duplication or coverage rewrite introduced. |
| 8 | PASS for selected path only | R3 to R7 bind owner session and named approver to the saved revision, attribute rejection and compare unchanged native state. Broader authority matrices remain held. |
| 9 | PASS boundary honesty | No live provider, legal, custody or delivery guarantee claimed. |
| 10 | PASS | Existing named-person policy semantics used; no new product policy default adopted. |
| 11 | PENDING fleet | Main equality, exact-head green Verify, Run site and complete publication scan are fleet landing custody; no landing or count award claimed. |

## Pre-handoff self-check

1. Selected behavior has public-door assertions for pending, exact owner rejection, terminal retry and unchanged native state, paired with the allowed control. It would fail on a successful retry, an extra snapshot or effect, a receipt, a replacement approval or a wrong actor. Full-clause and full-green-CI qualifications are not claimed.
2. No existing assertion was removed, narrowed, skipped or moved behind a condition. Changes replace imports, add the helper and callback, and parameterize the existing RPC ID. The test registration is unchanged.
3. Native authority, erasure and replay code was inspected and left unchanged. Existing managed-owner credential and sponsor-removal checks remain exercised by the touched test. This round adds rejection replay proof, not new erasure or scope claims.
4. No screens or controls changed. Browser proof at 1440 and 390 is not applicable to this test-only addition. No UI implementation or design tool was needed.
5. Local contract generation, typecheck, first-party, boundary, inventory and source-lock checks pass. Exact-head Verify and landing scan are reported honestly below. Added source lines contain no new email-shaped fixture values or credential-shaped strings. Existing unrelated fixtures and prose remain intact.

## Mechanical and custody

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock, then check exit=0; views=node src/base/contract-docs.mjs write, then check exit=0; ledger=none exit=0

The last source lock regeneration followed the final source edit and the fresh-main rebase; only the two touched test digests changed in sources.lock.json. Contract generation wrote zero documents; both generated views were restored from origin/main and neither was committed. Main was fetched immediately before the candidate, and rebase reported the branch up to date. No conflict or published-history rewrite occurred. All candidate authors and committers are fleet identity and no trailer is present. Product push used the cloud guard and succeeded on attempt one. The exact-candidate touched test passed with exit 0, one registration, zero failures, zero skipped cases and zero cancellations; completed at 2026-11-07T22:20:44.179249+00:00. Mechanical command details and exits are in mechanical-receipt.json. Product and branch identities are in product-provenance.json, commit-identities.txt and remote-refs.txt.

Exact-candidate publication scan: commit=f4b2d04fb3ab2b4779f93c4db16d7c4b263b3dcb complete=UNESTABLISHED historyScanned=UNESTABLISHED findings=UNESTABLISHED. NOT RUN in cloud: the task explicitly assigns this scan to the maintained Mac lander. No zero-findings claim is made.

Initial main Run site 42418271336 succeeded. Initial main Verify 42416479058 succeeded; duplicate Verify 42418271312 was running at discovery. Candidate main equality and candidate Run site are pending landing, because this builder never changes main. No CI dispatch or rerun was made. GitHub API budget initially used two calls: exact-main discovery and exact-candidate discovery.

PROBE BASE-AGENT-007 5: MCP protected preview and held compute, signed-in named-owner reject of exact revision and digest, identical compute arguments and key with RPC 52 -> approval_rejected, error-only content, no success or receipt, unchanged native reports and effects; separate autonomous compute -> one readable snapshot and one effect set.

CLAIM BASE-AGENT-007 PARTIAL points=5 tests=tests/core/managed-owner.test.ts#Managed owner claim verifies RER authority and creates the native owner/session exactly once
GAP BASE-AGENT-007: Only acceptance 5's rejected native pending-write retry is closed in this round. Full per-tool and per-class dispositions, setup and upgrade behavior, money and daily caps, broader multiclass combinations, expiry, changed inputs and named-approver browser matrices, transport equality, timely policy and audit qualification, and invalid-policy retention remain unqualified. All customer-message, mailbox, Base relay, quote, provider and TEAM-005 holds remain unchanged.

## Final observed CI and handoff

Exact-candidate push Verify 42419962332 was in_progress with conclusion null after the single follow-up at least 300 seconds after discovery. No failure is known, and no green conclusion is claimed. GitHub API calls used: 3 of 10. No dispatch, rerun or failed-log request was made. The product candidate is PUSHED; independent exact-SHA Verify, scanning, landing and Run site custody remain with the fleet. There is no demonstrated production blocker. No full-clause DONE award or release is requested.

All exact-head local checks and the touched runtime test passed. The packet contains complete actual command receipts, test events and the rejection probe. Setup, environment and credential files were not selected. The product clone is removed only after branch custody and the final evidence transfer have been verified; the packet remains under the task work directory.
