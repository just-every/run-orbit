# sd-orbit-c-f127 result

SURFACE-002 remains PARTIAL. Only acceptance 1's ordinary record-list item-count limb was corrected and qualified. No other clause, acceptance sentence, Status, Gap, Evidence, provenance or count changed. No default was adopted, hold released or follow-on work opened.

Product: just-every/run-orbit
Branch: cloud/sd-orbit-c-f127
Candidate: a32703b5f60ec948ec3d669d62edc947bdd4e07f
Main read for integration: 43497d9593cdf019042332a4bf8bae27f4004ede
PR: none; push Verify is an existing branch entry point.
CI: Verify 42426022916, push event, exact candidate; discovery observed in_progress with no conclusion. No dispatch or rerun.
Main baseline: Verify 42422161763 and Run site 42418271336 completed successfully on 43497d9593cdf019042332a4bf8bae27f4004ede.
Product push succeeded on its first guard attempt. A subsequent remote-ref read returned HTTP 503. Launcher refresh, repeated Git helper setup and the first retry after 15 seconds succeeded; ls-remote confirms the full candidate SHA.
Counts before and after: 36 DONE, 136 PARTIAL, 32 MISSING; 204 total.
Tests before and after: 198 registrations plus two qualifications, total 200.

## Plan and implementation

The complete initial plan is PLAN.md. The existing native list classifier read the actual GraphRecords page but passed it to the shared recordRisk helper, whose standard measure is intentionally one for its other callers. GraphRecords filters and slices its selected page before returning items; its nextCursor signals an additional page. The fix changes only orbit.records.list's standard class facts to the length of those returned items. The shared helper, single-record and resource reads, mutation classifications, protected-data facts, reports and forecasts retain their previous semantics.

The focused recordListMeasureProof helper is in tests/support/agent-door-proof.ts:15, reached through the existing tests/core/managed-owner.test.ts:6 registration named “Managed owner claim verifies RER authority and creates the native owner/session exactly once”. It creates three distinct native companies through authenticated MCP, then reads empty, complete and limited pages and their continuation under autonomous and held policies. It requires exact native identity sets, matching decision, audit and retained evidence measures, legitimate held reviews, one-item single-record controls, and unchanged native record and effect rows. No registration was added, deleted or replaced; no existing assertion was removed, narrowed, skipped or conditioned.

Product files changed: src/core/features/agent-door/records.ts, tests/support/agent-door-proof.ts, and generated sources.lock.json. The lock contains only the two resulting source-byte changes. CONTRACT.md and both generated contract views match main. No UI, provider, migration, account or permission flow was changed.

## Actual runtime proof

The pre-fix extended public-door journey failed with exit 1 at tests/support/agent-door-proof.ts:35: “autonomous: standard measure counts returned native identities”; actual standard measure was 1 and expected was 0 for the empty page. The failing command and complete error are in reproduction.log.

The corrected journey passed locally, then passed again on committed a32703b5f60ec948ec3d669d62edc947bdd4e07f: one test passed, zero failed, zero skipped. exact-sha-tests.log and exact-sha-tests.exit are the actual receipt. The unchanged body-limit controls also executed and printed 413 refusals, unchanged 277-table inventories, and successful 200 controls.

PROBE SURFACE-002 1: authenticated POST /mcp, orbit.records.list over three distinctive native companies, autonomous policy -> empty 0, complete 3, limited 2, continuation 1 identities; decision, retained audit and evidence each contain the same corresponding standard measure; native records and effects unchanged.
PROBE SURFACE-002 1: authenticated POST /mcp, the same pages under held policy -> 0, 3, 2 and 1 identities and matching measures; each completed read retains its open review; native records and effects unchanged.
Single-record controls return the exact seeded company identity and name with standard measure 1 under both policies.

## Acceptance and inherited proof map

| Item | Result | Runtime proof |
| --- | --- | --- |
| SURFACE-002 acceptance 1, ordinary existing record-list item counts | PASS for selected limb | tests/support/agent-door-proof.ts:18-65, invoked at line 202 by the existing managed-owner registration; authenticated /mcp; exact candidate local pass |
| SURFACE-002 acceptance 1, reversible deal move, task, complete draft and owner-neutral update matrix and Undo | UNCLAIMED | Existing held remainder; no new tool or coverage claim |
| SURFACE-002 acceptance 1, other read families and report and forecast measures | UNCLAIMED | Shared helpers preserved; no broader measure claim |
| SURFACE-002 acceptance 2, full text and argument class-invariance matrix | UNCLAIMED | Existing assertions retained; complete matrix remains omitted |
| Inherited BASE-AGENT-006 actual-effect item measurement for this list door | PASS for selected limb | decision and retained classes at tests/support/agent-door-proof.ts:29-47, exact identities at lines 51-65; broader inherited qualification unclaimed |
| Protected-data and ordinary controls | PASS retained journey | Existing protected report and forecast policy refusal at tests/support/agent-door-proof.ts:244-261, local credential scope and revocation proof invoked at line 273 |

Verify event for the candidate proof is push, run 42426022916. Its final conclusion is not yet established in this report; the local exact-SHA receipt is not a CI receipt.

## DONE-RIDERS assessment

| Row | Result | Evidence or boundary |
| --- | --- | --- |
| 1 | PARTIAL for whole clause | Selected list limb passes the native journey; the other outcomes above remain unclaimed |
| 2 | PASS for selected limb | Three actual created identities, empty and populated results, and explicit limited-page identities at lines 18-65; the pre-fix empty control failed |
| 3 | PENDING exact-SHA Verify | Existing managed-owner registration is loaded by the unchanged verification plan's core test glob; push run 42426022916 discovered |
| 4 | PASS local exact SHA | exact-sha-tests.log on a32703b5f60ec948ec3d669d62edc947bdd4e07f; no subsequent source edit |
| 5 | PASS inspected | SURFACE-002 already cites BASE-AGENT-006; citation and all acceptance text preserved |
| 6 | PASS mechanical, no promotion | Generator write and check exit 0; views restored from main; no judgment-cell edits |
| 7 | PASS inspected | No acceptance or ruling rewrite; coverage obligations preserved |
| 8 | PASS retained controls for touched door | Auth refusals, selected native scope, removed sponsor and revoked native credential remain in the passing managed-owner journey; no new standing authority |
| 9 | NOT APPLICABLE | No live-provider or legal claim; broader qualification remains unclaimed |
| 10 | PASS inspected | Existing autonomous and held policies used without adopting a new policy default |
| 11 | PENDING maintained lander | No main push, publication scan or main Run site on the candidate is claimed |

## Mechanical checks and pre-handoff checks

All touched checks passed: managed-owner journey, typecheck and rer check --profile first-party.
MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0; ledger=none exit=0.
Contract generation wrote zero documents and check reported current. Generated views were restored from origin/main. The source lock was regenerated after the final edit and main update, checked successfully, then checked again on the committed candidate.
git fetch origin main and the required unpublished rebase completed before the candidate; main had not advanced. Source and tests were preserved. Every candidate author and committer is the fleet identity, all candidate and side-parent messages were inspected, and there are no trailers.
The added product and test lines contain no email-shaped strings or provider-shaped secrets. Necessary MCP metadata keys use the existing protocol spelling. No publication scanner ran in cloud.

Pre-handoff 1: The selected user-visible item-count behavior has authenticated runtime assertions which fail on the old constant. Full-clause outcomes remain partial and CI is still recorded separately.
Pre-handoff 2: No existing assertion was removed, narrowed, skipped or hidden.
Pre-handoff 3: Existing revoked-authority and replay refusals pass; no erasure, capture-replay or permission implementation was changed or newly claimed.
Pre-handoff 4: No screen was touched; viewport screenshots, text and icon-control audit are not applicable.
Pre-handoff 5: Source lock is fresh. Exact candidate Verify is pending; candidate main equality, Run site and publication scan remain the maintained lander's duties, with no invented receipt.

Publication scan: commit=a32703b5f60ec948ec3d669d62edc947bdd4e07f, status=NOT RUN IN CLOUD, complete=unestablished, historyScanned=unestablished, findings=unestablished. Product clone has full history. Fleet scanning and landing remain pending.

## Scope and return

Plan rows changed: no plan file or queue was edited. The SURFACE-002 row may record this item-count result only. TEAM-005's existing cleanup dependency and every other queue line, hold, note and release prerequisite remain unchanged.
There is no known product blocker. The clause is not DONE and no broader acceptance closure is claimed.
GAP SURFACE-002: Only ordinary orbit.records.list item counts in acceptance 1 are qualified here; reversible deal-move, task and Undo tools, the complete draft and owner-neutral update matrix, other read-family and report and forecast measures, broader grant, role and protected subsets, and acceptance 2's complete text and argument class-invariance matrix remain omitted or retain existing assertions. No hold is released.

Final CI observation: Verify 42426022916 remains in_progress with conclusion None on a32703b5f60ec948ec3d669d62edc947bdd4e07f, checked once at least 300 seconds after discovery. Three GitHub API calls total: main discovery, candidate discovery and this status read. No dispatch, rerun or failed-log read. The short cloud CI wait window is exhausted; terminal custody is PUSHED, with no READY or CI-success claim.
