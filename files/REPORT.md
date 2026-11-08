# Orbit agent documentation inventory

Scope: BASE-AGENT-013 acceptance 1 for the currently declared registry. The clause remains PARTIAL. Existing holds remain in force.

Plan:
1. Read the current clause, existing registries, docs rendering and native tests.
2. Generate resource templates beside the existing tool inventory.
3. Publish the canonical agent guide and retain its previous URL through the same docs components, in installed and static builds.
4. Extend existing native and browser registrations without increasing the test budget. Compare rendered tool names and resource template identities and names with authenticated MCP discovery under autonomous and held policies.
5. Run touched tests, typecheck, registry freshness, first-party checks, contract generation and source-lock integrity. Inspect the changed guide at desktop and phone widths.
6. Merge current main as needed, retain every Status row, check every candidate identity and trailer, push only the named cloud branch, and record exact-SHA CI.
7. Publish this report and actual non-secret receipts to the separate evidence branch. Leave publication scanning, landing and Run site custody with the fleet.

## Candidate and results

Terminal disposition: BLOCKED by the unreproduced exact-SHA Verify failure described below. The product implementation is pushed; it is not READY.

Repository: just-every/run-orbit
Branch: cloud/sd-orbit-c-f133
Head: 37614c3bb58648da47b79089c9418665eb21a26a
Fresh base: a301c3152b7c1c564610f20b1e5100e98dd46ba6
PR: none; Verify runs on branch push.
Verify: 42474856032, push, completed with failure on the exact candidate. The docs browser registration passed in this run (4.3 seconds). Batch 13 failed in the existing desktop route-recovery journey; diagnostic replay is in progress. The exact-SHA result is retained in candidate-ci.json and receipt.json. GitHub call budget: 10 of 10 used, including the single failed-job archive read.

BASE-AGENT-013 remains PARTIAL. Acceptance 1 is closed for the current declared registry: generated tools, resource template URIs, resource names and scopes; canonical agent guide access; the former guide URL retained; authenticated inventory parity under autonomous and held policies.

Current-main counts before and after this change: 36 DONE, 136 PARTIAL, 32 MISSING, 204 total. The initial clone had 37 DONE, 135 PARTIAL and 32 MISSING; another writer's PUBLIC-002 judgment changed main during the run. This candidate retains that newer judgment whole and awards no status or count change. Test budget remains 198 registrations plus two qualifications, 200 total. No registration added or removed. Generated resource inventory rows: absent before, the complete current registry afterward (10 at execution); no inventory count is pinned in tests.

Implementation:
- scripts/agent-surface.ts:3 and :56 generates the resource table beside the existing tool table from runtime definitions.
- docs/site.json declares the canonical page and its prior slug as an alias. The docs manifest validates unique alias slugs, and the existing virtual loading boundary maps both names to the same Markdown chunk.
- src/routes/docs.$slug.tsx:9 redirects installed aliases to their canonical route, keeping hydrated navigation current. The static run-site build emits both document paths.
- Existing DocsPage, DocsArticle, navigation, table and typography components are retained.
- tests/agent-door/native-journey.mjs:4 provides the rendered inventory comparison, called by tests/core/managed-owner.test.ts:12 under both signed policies. The credential requests scopes advertised by native protected-resource metadata.
- tests/e2e/worker-smoke.spec.mjs:52 extends the existing navigation registration to reach both URLs, compare rendered inventories, retain current navigation and record the public guide at 1440 and 390.

## Proof register

| Item | Result | Actual proof |
| --- | --- | --- |
| Acceptance 1, current registry | PASS locally; whole Verify red on existing desktop recovery | tests/core/managed-owner.test.ts:12–22, registered as “Managed owner claim verifies RER authority and creates the native owner/session exactly once”; authenticated native MCP lists compare exactly with rendered HTML through agentDocsInventory, tests/agent-door/native-journey.mjs:4–24, under autonomous and held policies. |
| Contractual guide and prior URL | PASS locally; whole Verify red on existing desktop recovery | tests/e2e/worker-smoke.spec.mjs:72–81, “DOCS-001 — installed docs navigation reaches every page”; both URLs end at the canonical guide with the complete declared inventories and current navigation. Static build emits both documents. |
| Acceptance 2 | UNCLAIMED | Computed-class proof documentation remains omitted. Existing classes are retained in the tool inventory. |
| Acceptance 3 | UNCLAIMED | The complete harness failure matrix is not qualified by this round. The installed harness passes 3,520 checks locally, which is not a claim that every contractual matrix obligation is complete. |
| Acceptance 4 | UNCLAIMED | Every-point, every-policy qualification remains omitted beyond the current inventory comparison. |
| Acceptance 5 | UNCLAIMED | Complete stranger-agent discovery and specialist journey remain omitted. |
| Inherited Core and planned jobs | UNCLAIMED | No broader registry or obligation release; no receiving clause changed. |

The native test passed one registration in 136,836.870209 ms. The docs browser registration passed in 6.2 seconds, with ordinary server preparation bringing the command to about one minute. Production app build, static run-site build, typecheck, first-party checks, boundaries, registry freshness and source integrity all pass. The installed conformance harness passes 3,520 of 3,520 checks against the stable emitted build.

The first inventory execution exposed a test credential missing meeting and signal scopes. The test was corrected to use advertised native scopes without filtering any expected template or weakening the comparison. The first browser execution exposed missing active navigation at the alias; the production route now redirects to the canonical guide. An initial concurrent conformance execution encountered a removed build manifest because browser setup rebuilt the same output; the isolated run against the stable build passes. No source change was made for that local artifact race.

All relevant source and test bytes at the pushed SHA match the successfully tested pre-rebase bytes. The rebase only brought in main's contract judgments and generated view metadata. Registry and contract checks, generation and source-lock regeneration and checking were repeated afterward. No generated contract view is committed. No clause acceptance text, Status, Gap or Evidence cell is changed relative to fresh main.

## DONE riders

This is a PARTIAL claim, not a DONE request.

| Row | Result | Evidence or remaining boundary |
| --- | --- | --- |
| 1 | PARTIAL overall; selected point locally PASS | Acceptance 1 proof above; points 2–5 remain unclaimed. |
| 2 | PASS for selected point | Exact nonempty rendered-name comparison against authenticated native discovery under both policies; the initial missing-scope execution failed this assertion. No fixed registry count or expected fixture result is used. |
| 3 | FAIL whole Verify | Existing managed-owner core registration, docs browser registration and source conformance are included by scripts/verification-plan.mjs. Run 42474856032 is bound to this candidate; the changed docs browser registration passed, but desktop route recovery failed. |
| 4 | PASS for local proof | Relevant tested source and test blobs are unchanged by rebase; receipt.json records their hashes. Browser screenshots are from those same bytes. |
| 5 | INSPECTED, no new inheritance | No receiving clause or inherited-duty text changed; full Core and planned-job coverage remains unclaimed. |
| 6 | PASS mechanically; judgments retained | Contract write and check pass; generated views restored from main; the candidate has no CONTRACT.md diff from main and a fresh source lock. |
| 7 | PASS | No acceptance text or coverage rewrite. |
| 8 | INSPECTED for this read-only metadata change | No authority mutation introduced. Existing native refusal, replay, revocation and rejected-report no-effect assertions remain and passed. The docs contain registry metadata only. |
| 9 | PASS boundary | No real provider, legal or live-account qualification claimed. |
| 10 | PASS | No new policy default. The test uses existing signed autonomous and held policies. |
| 11 | PENDING fleet custody | No main push or landing. Publication scan and exact-main Run site remain with the guarded lander. |

## Pre-candidate checks and public-door probe

1. The new behavior is asserted through authenticated MCP requests, actual rendered inventories and browser navigation. Removing an inventory row, changing a discovered name or losing a URL fails the comparisons. Exact-SHA Verify is red in the existing desktop route-recovery assertion.
2. No existing assertion was removed, skipped, narrowed or moved behind a width or branch condition. The existing desktop docs width changed from 1280 to the required 1440; the existing phone smoke remains.
3. Public documents contain only registry metadata. No new grant, authority, erasure or replay path was added. Native dangerous-path assertions and installed conformance passed.
4. Public guide inspected at 1440 and 390. Existing table containers scroll on phones; the document has no horizontal overflow at the assertion width. Text uses existing docs typography at 13px or greater. No new icon-only control or configuration surface. The logo link has visible brand text; the other navigation and disclosure controls have text labels.
5. Source lock fresh, generator check passes, no added email-shaped string or fixture value in the changed public text. No publication scan was attempted in cloud.

PROBE BASE-AGENT-013 1: authenticated native MCP discovery under autonomous and held policies -> rendered tool names and resource template URIs and names match exactly; browser GET of /docs/agents and /docs/agent-door -> canonical guide, full inventories and active navigation; static run-site build -> both public documents emitted.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0, generated views restored from origin/main; ledger=none exit=0.

Publication scan: commit=37614c3bb58648da47b79089c9418665eb21a26a, complete=unestablished, historyScanned=unestablished, findings=unestablished. Not run in cloud; the guarded fleet lander owns the full-history scan. Main equality is false: the candidate remains on its named branch. Exact-main Run site is pending landing.

## Candidate CI failure and reproduction

Verify 42474856032 failed job 128714323632, shards (batch-13). Its actual command was:
node scripts/verification-batch.mjs '["runtime-browser","rer-operator-desktop"]'
The existing test “BASE-PUBLIC-003 T099 native operator routes and expanded data views at 1440px” failed at tests/rer/operator-routes.mjs:29 in expectRouteRecovery: expected “This contact does not exist.”, received “Record not found.”, after 5,000 ms.
The changed docs navigation registration passed in the same CI job, as did the 29-case browser suite and the existing archive browser case. No test assertion, product route or landing guard was weakened.
The failed archive was read once with gh run view 42474856032 --repo just-every/run-orbit --job 128714323632 --log-failed. Transport succeeded. The final two GitHub calls identified the failed job and read this archive; the ten-call budget is exhausted.
The exact batch command was replayed once on the candidate with Node 22.20.0, pinned pnpm, the CI shard flags and ports, and the required system Chromium. It exited 1 before reaching the desktop target: ACTION-004 timed out at 30 seconds during page navigation, and the two existing Lobby cases observed a console 404. Twenty-six browser cases passed, including the changed docs case. This replay did not reproduce the original CI assertion.

The actual failing desktop gate command was then run directly, unchanged, on the candidate and on pinned main a301c3152b7c1c564610f20b1e5100e98dd46ba6 on this same VM. It passed both times:
- Candidate exit 0, one test passed, 243,780.856554 ms.
- Pinned main exit 0, one test passed, 256,645.632485 ms.
- Browser adaptation for both: system Chromium at /usr/bin/chromium with --no-sandbox. No assertion changed.

VERIFY_NOT_REPRODUCED: the CI assertion expected “This contact does not exist.” and received “Record not found.”; neither direct replay reproduced it. Full actual command and outcomes are in verify-desktop-candidate.json and verify-desktop-main.json. The earlier full-batch result is in verify-reproduction-candidate.json. No repair round or source edit was attempted after CI.

BLOCKED: Verify 42474856032 is red on 37614c3bb58648da47b79089c9418665eb21a26a, job 128714323632. The brief's VERIFY REPAIR instruction says to stop when the failure does not reproduce and not guess a fix. FV needs matching-runner reproduction or disposition. No READY, green Verify or landing is claimed. The complete actual diagnostics are returned through the separate evidence branch.

## CI context and custody

Original cloned-main SHA d79771a425e3d316f95256aa767dbfd2c50ea6db has successful push Verify 42471083923 and Run site 42472817888. A later push Verify 42472817911 failed in job 128707846156, batch-7, before the collaborator lifecycle test body: isolatedDatabase migration setup returned spawnSync Node ETIMEDOUT at 60 seconds. Its failed log archive was read exactly once with:
gh run view 42472817911 --repo just-every/run-orbit --job 128707846156 --log-failed
Transport succeeded. No repair or CI rerun was performed. This known migration-startup flake is relayed to FV.

The product push succeeded on its first guarded attempt. Every candidate commit and side parent was inspected for fleet author, committer and trailer policy. The checkout is clean. No PR is required by the current branch-push workflow. No force push, published-history rewrite, main update, acceptance promotion or hold release occurred.

Plan row changed in this report only: BASE-AGENT-013, scoped acceptance 1 now locally proven for the current registry; clause PARTIAL remains PARTIAL. No lane inbox or plan file was read or written in the VM. Other queue rows, TEAM-005's cleanup dependency, account and consent holds and release prerequisites remain unchanged.

CLAIM BASE-AGENT-013 PARTIAL points=1 tests=tests/core/managed-owner.test.ts#Managed owner claim verifies RER authority and creates the native owner/session exactly once; tests/e2e/worker-smoke.spec.mjs#DOCS-001 — installed docs navigation reaches every page
GAP BASE-AGENT-013: Computed-class proof documentation, the complete harness failure matrix, every-point qualification, the stranger specialist journey, full Core and planned-job coverage and complete discovery instructions remain unclaimed; no existing hold is released.

The main diagnostic worktree is removed before final evidence transfer; the product clone is removed after the product ref and final evidence ref are verified. The packet remains outside both checkouts.
