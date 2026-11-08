# sd-orbit-c-f135 report

Repository: https://github.com/just-every/run-orbit
Product branch: cloud/sd-orbit-c-f135
Candidate: daa9b0a0e50b5e1e97a407f607f0739dc7443fad
Rebased main: a301c3152b7c1c564610f20b1e5100e98dd46ba6
Source starting point: e791bb136781e1c15b607789171530f777e329c7

SURFACE-010 remains PARTIAL. The leased report-definition link slice of acceptance 1 is implemented and locally proven. The starting commit already contained the complete leased implementation and mandatory fixture checks. This continuation requalified that implementation on current main; no additional product edits or empty commits were needed. Its one rebased product commit is daa9b0a0e50b5e1e97a407f607f0739dc7443fad, with message “Return immutable report definition links from MCP”. The code and tests in the leased files are byte-identical to the supplied starting commit. Other writers' current-main changes are retained.

Fresh main's actual counts are 36 DONE, 136 PARTIAL and 32 MISSING, 204 total. Before and after are identical. The continuation quotation's 37 DONE and 135 PARTIAL is historical and is not substituted for current CONTRACT.md. No status, Gap, Evidence, provenance or acceptance text changed. Test inventory remains 198 registered cases plus two qualification flows, total 200. No assertion or registration was removed, narrowed, skipped or put behind an additional condition.

## Plan and completed work

1. Read the inline campaign, rules, current rulings and all eleven DONE riders; read launcher instructions, repository AGENTS.md, README.md, HANDOVER.md, CONTRACT.md, ACCEPTANCE.md, BASELINE.md, DIVERGENCE.md and seed.json. Scope stayed on the single leased slice. The other families and acceptance 2 remain explicitly omitted. TEAM-005's cleanup prerequisite and every existing account, consent, receiving-door, queue, note and release prerequisite remain unchanged.
2. Clone full history, fetch the prior branch, create the named branch at the specified commit and rebase onto fresh main using the fleet identity and preserved repository hooks. The final pre-push fetch and rebase were up to date. No conflict or published-history rewrite occurred. The candidate contains exactly one commit beyond main.
3. Inspect the source and proof end to end. The report write returns its existing version-specific event URI as a resource link. Both generated journey definitions declare required resource fixtures. The existing managed-owner registration invokes the focused helper; it never skips a missing link.
4. Run setup, the existing focused native test, typecheck, first-party checks, surface check, generated-view write and check, lock regeneration and integrity check, budget check and application build. All required local checks pass. The first ad hoc inventory command used a nonexistent export and failed before any test or assertion; the corrected checkTestBudget command passes. Both actual outputs and receipts are retained.
5. Push the candidate with the prescribed cloud guard after inspecting every candidate identity and trailer. The first attempt succeeded. The exact-SHA push Verify started as run 42476333570. No PR is required: this repository starts Verify directly on branch push. No dispatch or rerun was issued. CI status and additional emitted-Worker proof are recorded in the final receipts below.
6. Publish this complete non-secret packet separately on the evidence ref, verify the reported remote product head, and remove the successfully pushed product clone and its dependencies after all local commands finish. Fleet scanning, landing and exact-main site qualification remain with the maintained lander.

No plan row was edited. The proposed sd plan update is the result of this continuation: the report-definition-write slice is requalified on the candidate, with SURFACE-010 still PARTIAL and no hold release. No other campaign was started because the lease explicitly omits every other family and all acceptance 2.

## Product delta and runtime proof

`src/core/features/agent-door/reports.ts:59` returns `resources:[{uri,name:'Native report definition'}]` using the same URI it emits for report.updated. It adds no storage, authority or provider request. Existing definition reads recheck native full-operator admission, analytics permission, current sharing and current policy.

`scripts/agent-surface.ts:36` and `scripts/agent-surface.ts:38`, reflected in agent-surface.json, require first-version and second-version links with the exact written definition as fixture state. The existing Base conformance runner asserts a matching fixture link even if no link is returned, then reads and compares its state. No Base or package pin changed.

The public transport proof is `tests/core/managed-owner.test.ts`, test “Managed owner claim verifies RER authority and creates the native owner/session exactly once”, registered at line 114 and invoking `reportDefinitionLinksProof` at lines 157–160. Its helper is `tests/support/agent-door-proof.ts:30`.

PROBE SURFACE-010 1: authenticated MCP tools call orbit.reports.update for versions 1 and 2, followed by resources read on each actual returned URI under autonomous and held policies -> exactly one immutable link per write, exact saved JSON for both versions, earlier content unchanged after the second save and replay, truthful agent-for-sponsor event and audit attribution, autonomous or review decisions as applicable, and no fabricated person-approval receipt. Current sharing loss returns resource_unavailable, missing read scope returns 403, removed sponsor returns 401, blocked policy returns policy_blocked; none exposes content or changes the two saved definitions, write events or native audit effects. Both policies passed in managed-owner.log on the exact candidate.

PROBE SURFACE-010 2: none; cross-channel event identity is explicitly omitted from this lease and remains unclaimed.

## Acceptance and inherited duties

These rows deliberately distinguish the proved slice from complete clause acceptance. Runtime security assertions are executed, not inferred from inspection.

| Item | Outcome on this candidate | Evidence |
| --- | --- | --- |
| SURFACE-010 acceptance 1: read every declared sales resource and follow tool links | PARTIAL: the report-definition-write link slice passes; all other unqualified resource families stay omitted | Focused helper lines 63–103 and 108–130; managed-owner.log, one passed test, zero skipped |
| SURFACE-010 acceptance 2: booking, reply, stage, quote and Buoy same event identity across channels | NOT CLAIMED | Explicit lease omission; existing receiving-door and provider prerequisites unchanged |
| BASE-AGENT-003 acceptance 1: all resource templates listed | Existing surface inventory inspected; no full duty claim | reportResources and generated agent surface; agent-surface.log |
| BASE-AGENT-003 acceptance 2: two roles agree with UI fields | NOT CLAIMED in this slice | Active teammate and current sharing are exercised, not full two-role UI parity |
| BASE-AGENT-003 acceptance 3: missing and out-of-scope responses agree | PARTIAL: current sharing and sponsor loss refuse without content | Helper lines 104–126; missing-ID equivalence beyond this slice unclaimed |
| BASE-AGENT-003 acceptance 4: a write link reads the new state | PASS for both report definition versions under both policies | Helper lines 79–103 and 129–130; mandatory link length at line 85 |
| BASE-AGENT-003 acceptance 5: file bytes and grant budget | NOT APPLICABLE to this JSON definition slice; full duty unclaimed | No file-byte path changed |
| BASE-AGENT-003 acceptance 6: untrusted marker | PASS for the returned definitions | Helper lines 68–70 |
| BASE-AGENT-010 acceptance 1: UI change notification within ten seconds | NOT CLAIMED | No UI or timing work in this lease |
| BASE-AGENT-010 acceptance 2: list and webhook same event ID | NOT CLAIMED | Cross-channel identity remains omitted |
| BASE-AGENT-010 acceptance 3: cursor replay keeps IDs and order | NOT CLAIMED | No event-feed change |
| BASE-AGENT-010 acceptance 4: no channel delivers after revocation | PARTIAL: saved definition reads refuse current access loss; all event channels unclaimed | Helper lines 104–128 |
| BASE-AGENT-010 acceptance 5: visible failed webhook and safe replay | NOT CLAIMED | No webhook work |
| BASE-AGENT-010 acceptance 6: policy and review event classifications | PARTIAL: standard decisions and reviews are truthful for the returned definitions | Helper lines 43–60 and 88–91; broader event families unclaimed |

## DONE riders

No DONE promotion is requested. “PASS slice” does not establish the full clause.

| Rider | Result | Exact evidence or remaining gap |
| --- | --- | --- |
| 1 | FAIL for full DONE; PASS slice | Both policies perform the leased outcomes through authenticated MCP, helper lines 63–130. Other acceptance 1 families and all acceptance 2 remain unqualified. Exact-SHA CI recorded separately. |
| 2 | PASS slice | Nonempty definitions, events and native audit each total two at line 96. Wrong content fails deep equality at line 70; absent links fail line 85. Allowed reads and all four current-access refusals execute, and unchanged native effects are asserted at line 128. |
| 3 | PENDING exact-SHA Verify | Existing managed-owner registration is discovered by the core test globs in scripts/verification-plan.mjs. Push run 42476333570 is on this exact SHA. Final status is in CI receipts. |
| 4 | PASS | Focused runtime, types, build and mechanical receipts bind to daa9b0a0e50b5e1e97a407f607f0739dc7443fad. No later product byte changed. |
| 5 | PASS inheritance declaration | SURFACE-010 cites BASE-AGENT-003 and BASE-AGENT-010. This report claims only their relevant report-link slice; broader duties stay unclaimed. |
| 6 | PASS mechanical, no judgment edit | Contract write and check both exit 0. Main's views and all status cells remain byte-for-byte unchanged; current historical provenance is preserved as instructed. |
| 7 | PASS | No acceptance sentence, ID, ruling or coverage map changed. |
| 8 | PASS slice | Helper lines 104–128 exercise permitted reads, loss of sharing, wrong scope, sponsor removal and blocked policy; no content or definition-write effects follow refusals. |
| 9 | PASS honest boundary | No live-provider, legal, mailbox or customer-delivery proof claimed. All existing provider and account holds remain. |
| 10 | PASS | No new policy default adopted. Existing standard autonomous and held review semantics are used; review is explicitly not represented as person approval. |
| 11 | PENDING lander | Candidate is branch-only. Main equality, COMPLETE publication scan with zero findings and exact-main Run site are lander duties. No landing or scan result fabricated. |

## Pre-ready self-check

1. The leased visible transport outcomes have assertions that fail for an absent link, wrong version JSON, mutation of earlier content, false decisions or attribution, and exposed content after authority loss. Local focused proof passed. Complete clause coverage is not claimed; exact-SHA Verify is separately recorded.
2. No assertion was removed, narrowed, skipped or hidden behind an added width or branch condition. No permanent test registration was added or removed; total remains 200.
3. Current scope, sharing, sponsor and policy revocations are exercised on the actual saved links. Replaying a definition write retains one outcome and does not mutate earlier content or duplicate writes. Broader erasure and capture-replay qualification remains unchanged and unclaimed by this slice; no new retention or capture path is introduced.
4. No UI screen, icon control, typography, configuration or homepage changed. Width-specific browser proof is not applicable to this MCP-only lease.
5. Source lock is fresh and first-party checks pass. CI, main equality, site and full-history publication scan are described honestly below. The added diff has zero email-shaped strings; existing fixture addresses were not changed. Cloud-side publication scanning is not required or available under the task's lander split.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0; ledger=none exit=0

Publication scan: commit=daa9b0a0e50b5e1e97a407f607f0739dc7443fad complete=NOT_RUN historyScanned=NOT_RUN findings=NOT_RUN. Full-history clone was used. Cloud publication is branch-only; the lander must produce its own exact-tree COMPLETE result before landing.

Main equality at integration: false, intentionally; main=a301c3152b7c1c564610f20b1e5100e98dd46ba6 and candidate=daa9b0a0e50b5e1e97a407f607f0739dc7443fad. Main had successful exact-SHA push Verify 42473069891 and Run site 42474803915; duplicate push Verify 42474803928 was still running at the single observation. Those runs are baseline context only, never candidate-green proof.

CLAIM SURFACE-010 PARTIAL points=1 tests=tests/core/managed-owner.test.ts#Managed owner claim verifies RER authority and creates the native owner/session exactly once; tests/support/agent-door-proof.ts#reportDefinitionLinksProof
GAP SURFACE-010: Only acceptance 1's report-definition-write link slice is proven here. Remaining declared resource families, booking, reply, stage, quote and Buoy cross-channel identity and all acceptance 2 remain unclaimed. No existing hold is released; TEAM-005 and all account, consent, receiving-door, queue, note and release prerequisites remain unchanged.

No product blocker is known from the local checks. The full clause is not DONE; the named broader gaps prevent a full DONE claim. This partial-point handoff does not change any clause judgment.

## Additional emitted-Worker proof

The exact candidate application build passed. The installed pinned Base agent-door command then passed all 3647 of 3647 conformance points against the emitted Worker. In both autonomous and held phases, both definition and definition_v2 fixtures had mandatory matching-link and written-state assertions. The full actual output is agent-conformance.log; PROBES.json retains the focused public-door outcomes and the emitted fixture assertions. This is native conformance evidence, not a promotion of the unclaimed broader SURFACE-010 scope.

## Terminal custody and CI observation

Product push succeeded on the first attempt and git ls-remote confirmed the exact candidate on refs/heads/cloud/sd-orbit-c-f135. Push Verify 42476333570 was discovered at 11:34:29 UTC and polled once at 11:39:30 UTC, respecting the 300-second interval. Its exact head is daa9b0a0e50b5e1e97a407f607f0739dc7443fad, event push, status in_progress and conclusion null at the last observation. CI is not reported green. No failing job is known; no archive log, dispatch, rerun or CI repair was requested. Total GitHub API calls: 3, including the baseline query.

The top-level cloud custody rule requires PUSHED when Verify remains running; this packet and terminal handoff therefore use PUSHED, with no claim of READY, DONE, acceptance, scan completion or landing. The lander must evaluate exact-SHA Verify and the publication scan before landing. No PR was created because branch push already starts the required workflow.

Full scope, complete local proof, all eleven DONE-rider results, inherited-duty rows and the unchanged counts are above. The only failed local command was an ad hoc count command with an incorrect export name; its corrected invocation passed, and neither product code nor an assertion was changed to address it.

PUSHED branch=cloud/sd-orbit-c-f135 head=daa9b0a0e50b5e1e97a407f607f0739dc7443fad
