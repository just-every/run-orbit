# sd-orbit-c-f132 results

Product: just-every/run-orbit, branch cloud/sd-orbit-c-f132.
Candidate: e791bb136781e1c15b607789171530f777e329c7.
Fresh main integrated before publication: d79771a425e3d316f95256aa767dbfd2c50ea6db.
One product commit, pushed successfully through the fleet guard. No pull request is required by this repository; push starts Verify. Main was not changed.

The selected report-definition-write link is implemented and locally proved. The existing immutable definition URI is now returned as an MCP resource_link by orbit.reports.update, alongside the unchanged structured result. The emitted report.updated event uses that same URI. The generator declares required resource fixtures for both definition saves, so the conformance runner cannot silently skip an absent definition link.

The focused proof is reportDefinitionLinksProof in tests/support/agent-door-proof.ts, lines 29–134, invoked by the existing test at tests/core/managed-owner.test.ts, lines 114–161: “Managed owner claim verifies RER authority and creates the native owner/session exactly once”. The helper is not a new registration. All existing assertions remain and no assertion was skipped, narrowed or made conditional.

The full plan is PLAN.md. Actual check exits, file digests, transport outputs and both policy proof records are in RECEIPT.json, managed-owner.log and mechanical.log. No fleet report is committed to the product branch.

## Scope and counts

SURFACE-010 remains PARTIAL. This is the planner's narrow slice of acceptance 1, not a completed acceptance sentence or a DONE award. Every other declared resource family and the complete cross-channel booking, reply, stage, quote and Buoy event identity requirement remain unclaimed. Acceptance 2 is untouched. TEAM-005 and all account, consent, provider, receiving-door, queue, note and release prerequisites retain their existing dispositions. No new policy default was needed.

Counts before and after: 37 DONE, 135 PARTIAL, 32 MISSING, 204 total. Test budget before and after: 198 registered cases plus 2 qualifications, 200 total. No contract acceptance text, Status, Gap, Evidence, generated view or summary count was changed. No test was deleted or replaced.

Plan rows changed: none. Proposed campaign result for SURFACE-010: the report-definition-write link slice is closed; the full clause and all held remainder stay PARTIAL. No further unheld clause touching these files was supplied in the extract.

## Runtime proof

Under both autonomous and held policy, authenticated MCP saves versions 1 and 2 of one definition. The returned link is mandatory, identifies the exact saved version and reads back the complete expected definition. The definitions differ in name, description, unit and source type. Version 1 remains byte-for-byte unchanged after version 2 and after replay of the original version-1 write. Replay returns the original result and link with no extra native definition, audit effect or report.updated event.

The public resource door refuses both saved links after sharing is lost, with insufficient read scope, after native sponsor membership removal and under a newly blocked current policy. No refusal returns content. Retained definition and native write-effect inventories remain unchanged. Restoring permitted current authority reads both original versions again.

Both the write and resource-read decisions carry standard class with measure 1. Autonomous policy records autonomous completion. Held policy records completed review with an open review entry, and no approval receipt. The audit matches its actual decision and revision, names the native sponsor and the acting agent, and records each returned resource. The report.updated event names “Ari for Morgan Lee”.

PROBE SURFACE-010 1: authenticated orbit.reports.update twice, followed by resources/read for each returned URI under autonomous and held policies -> exact distinct versions; earlier content unchanged; sharing, scope, sponsor and current-policy refusals without definition or write-effect changes.
PROBE SURFACE-010 2: none, the planner explicitly omitted cross-channel event identity and all acceptance 2.

## Frozen scope rubric

| Item | Result | Evidence |
| --- | --- | --- |
| R1 Return the existing immutable definition URI as a tool resource link | MET locally | reports.ts:59; proof lines 79–92 requires exactly one returned link and reads it |
| R2 Two saved versions each read their exact content; earlier content unchanged | MET locally | proof lines 63–72 and 79–103, then 128–130 |
| R3 Autonomous and held policy decisions remain truthful | MET locally | proof lines 43–61 and 74–75; both policy receipts in managed-owner.log |
| R4 Current access failures reveal no content and change no definitions or write effects | MET locally | proof lines 104–130; all four refusal classes executed through authenticated MCP |
| R5 Truthful native sponsor and agent attribution | MET locally | proof lines 48–59, 88–91 |
| R6 Require the generated fixture link | MET by inspection and validation | scripts/agent-surface.ts:36–38; generated fixture state for both writes; validateAgentSurface passed all 359 points; existing Base checkResources records a failed link-presence assertion when matching is empty |

Full acceptance sentence disposition:
1. “Read each declared sales resource and follow tool links to the changed record.” PARTIAL: only this definition-write link slice is claimed.
2. “Follow booking, reply, stage, quote and Buoy handoff outcomes by the same event identity across the supported channels.” UNCLAIMED.
Inherited BASE-AGENT-003: selected immutable report resource link locally proven, remaining records and resource breadth unclaimed.
Inherited BASE-AGENT-010: selected report.updated URI and native attribution locally proven, cross-channel identity unclaimed.

## DONE riders

No DONE claim is made. The results below distinguish the scoped local work from the full clause.

| Rider | Result | Evidence or limitation |
| --- | --- | --- |
| 1 | FAIL for full DONE; selected slice PASS locally | Full acceptance 1 resource breadth and all acceptance 2 remain unproved. Selected proof lines 63–130 passed. |
| 2 | PASS for selected slice | Populated distinct versions, permitted reads and four unsafe refusal paths; exact inventory equality at line 128. |
| 3 | PENDING | Push Verify 42474485790 on exact candidate was in progress at discovery; existing registration is included in push core test globs in scripts/verification-plan.mjs:62–81. No CI success is claimed. |
| 4 | PASS local byte binding | RECEIPT.json records code and test digests equal to HEAD; no relevant source or test byte changed after the passing touched run. |
| 5 | PASS inspected | SURFACE-010 explicitly cites BASE-AGENT-003 and BASE-AGENT-010 in CONTRACT.md:2257. |
| 6 | PASS mechanical, full Gap preserved | Contract write and check exit 0; generated views restored from main; contract source unchanged. |
| 7 | PASS inspected | No acceptance text, Status row or coverage map changed. |
| 8 | PASS for selected slice | Sharing, scope and native sponsor removal refusals at proof lines 104–121 return no content; inventories unchanged at line 128. |
| 9 | PASS boundary honesty | No provider or live-account qualification claimed; all existing holds retained. |
| 10 | PASS; no new default | Existing company policy and native access semantics reused; no ruling or policy change introduced. |
| 11 | PENDING fleet landing | Main remains the integrated base. Candidate Verify, full-history publication scan, guarded landing and candidate main Run site remain fleet gates. |

## Checks and custody

Touched registration: 1 passed, 0 failed, 0 skipped, about 148 seconds. Typecheck, first-party check, generated surface check and static surface validation all pass. Source lock regenerated last and validated with ok=true across 2676 files. Initial local proof-query failure was corrected from a pattern match to exact URI membership; the full touched registration then passed. No CI repair round was performed.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock, then check exit=0; views=node src/base/contract-docs.mjs write, then check exit=0; ledger=none exit=0.
The views were restored with git checkout origin/main -- ACCEPTANCE.md docs/CLAIMS.md before committing; neither is in the commit. No migration changed. Contract source diff is empty. All candidate identities and trailers were checked including side parents. The only candidate author and committer are the fleet identity, with no trailers. Inspection of added lines found zero email-shaped strings; slash pairs are protocol names, metadata keys, MIME types or actual repository paths.

PRE-READY checks: the selected behavior has mandatory public-door assertions; all original assertions remain. Current sponsor and read-scope revocation and replay are exercised. Existing erasure and audit-retention helper execution remains in the same passing registration; no new erasure behavior is claimed. No screens or icon-only controls are touched, so browser width proof is not applicable. Source lock is fresh. Exact-SHA Verify and fleet landing evidence remain pending and are not presented as green.

Exact candidate CI: Verify 42474485790, push event, in_progress at 2026-11-08T11:09:45Z, head e791bb136781e1c15b607789171530f777e329c7.
https://github.com/just-every/run-orbit/actions/runs/42474485790
No PR created. Four GitHub CLI calls were used: base discovery, failed base job discovery, one failed-job archive read, and candidate discovery. No workflow dispatch or rerun was requested.

Base custody: exact-base Verify 42471083923 succeeded; exact-base Run site 42472817888 succeeded. Later duplicate base Verify 42472817911 failed job 128707846156 in migration setup for “TEAM-001 native peers stay full while a distinct accepted collaborator obeys fields, grants and lifecycle fences”. Error: spawnSync /opt/hostedtoolcache/node/22.20.0/x64/bin/node ETIMEDOUT, at isolatedDatabase in tests/support/isolated-database.ts:11, before the test body. No product repair was attempted for this recognized infrastructure timeout. Route it to FV with its actual run and job IDs.

Publication scan text: commit=e791bb136781e1c15b607789171530f777e329c7 complete=UNESTABLISHED historyScanned=UNESTABLISHED findings=UNESTABLISHED. Cloud does not run this scan; the fleet must scan the full history before landing. Main equality=false before guarded landing; candidate main Verify and Run site receipts are not yet established. No landing or DONE count is claimed.

No product blocker was found for the selected slice. The rest of SURFACE-010 remains the declared scope gap. Product custody and evidence publication are separate; an evidence receipt does not signal acceptance, READY or landing.
