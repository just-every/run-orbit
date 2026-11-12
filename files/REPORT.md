# Orbit meeting follow-up FIX round
Tag: sd-orbit-c-f173-fix1
Date: 2026-11-12 UTC
Repository: just-every/run-orbit
Branch: cloud/sd-orbit-c-f173-fix1
Starting head: 97348c587039a6456d3496f58a0b514a462db641
Merged main: c3065f3b5be9b169501be552ae6a6e65c02fe57d

## Assignment and implementation
The complete plan is in PLAN.md. This round addresses only the two blocking archive regressions and the requested migration renumber. The original meeting follow-up work is retained. No follow-up C item or out-of-scope E item is repaired.

The transfer manifest recognizes follow_up_obligations and follow_up_work as one optional group, alongside every existing optional group. A historical archive may omit both, while an incomplete obligation group remains invalid.

preDirectNotificationCatalog strips preObligationCatalog as well as the graph-proposal changes before removing the notification trigger. The supported generation sequence now follows the actual migration order: current, before obligations, before graph proposals, before direct notifications. The unreachable combination with obligations present but graph proposals absent is removed.

0081_meeting_follow_up.sql becomes 0085_meeting_follow_up.sql. Current main ends at 0081_graph_proposals.sql; 0082 to 0084 stay reserved. The migration bytes are identical, SHA-256 164e4b2d44f68fcc3daed21699a2516864bb71e71013f41611eed8b2db7c9296. The generated deployment specification registers 0085. The source lock is regenerated last after staging the rename. No other current registration, test or document names the old meeting migration; the archive-schema export and portability policy select tables rather than migration filenames and remain unchanged.

The current main merge preserves its newer contract judgments, tests, AI assistance registry, forecast proof and marketing contact merge. Conflict resolution combines the obligation and assistance tools, and the obligation, marketing and mail contact-merge effects. The existing managed-owner test keeps all of main's body and title, with the meeting follow-up outcome appended to that title. CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md equal the merged main byte for byte.

## Reproduction before editing
Both unchanged cases executed on the pristine pinned head and exited 1.

VERIFY_REPRODUCED {"head":"97348c587039a6456d3496f58a0b514a462db641","job":"131110825604","command":"pnpm exec tsx --test --test-concurrency=1 tests/core/onboarding-archive.test.ts","test":"API-002 credentials stay local while DATA-001 local archive restores records and keeps the hosted owner able to sign in by mail without reviving sessions","exit":1,"failure":"POST records/archive/imports: 400 {\"error\":\"Invalid complete archive lineage.\"}"}

VERIFY_REPRODUCED {"head":"97348c587039a6456d3496f58a0b514a462db641","job":"131110825455","command":"pnpm exec tsx --test --test-concurrency=1 newtests/t096/forward-upgrade.test.ts","test":"API-002 credential storage and RECORD-016 ownership and accepted main and released v0.3.0 advance with every native value, custom DDL, live identity and pre-forecast archive schema intact","exit":1,"failure":"Archive inventory does not match a complete supported source generation."}

The first failure is at onboarding-archive.test.ts:83. The second is at released-forecast-upgrade.ts:69. The v0.3.0 tag is fetched; historical source blobs are prefetched for the released runtime. Neither assertion is changed.

## Validation and receipt interpretation
Actual command output and exit receipts accompany this report. before-*.json describes the pinned starting head. Local after-change checks run on the final working tree before its merge commit; their head field records the then-current parent HEAD, not a claim that the old head contains the fix. tested-source-files.json records the tested runtime, source, migration and test bytes; final provenance verifies those same bytes in the committed candidate. The final CI receipt is separately bound to the exact candidate SHA.

Build, deployment generation and check, typecheck, first-party check, boundary check and agent-surface check passed. Contract write and check passed; the two generated views were restored whole from main. Source lock generation and check passed after staging the migration rename. The ledger probe uses the installed Base migration mapper, compares all 77 migration names and hashes with the deployment specification, and refuses corrupt hashes and duplicate entries.

The optional-group probe accepts current and pre-obligation inventories, refuses either missing member separately, refuses duplicate tables and refuses an incomplete sibling task group. Its initial harness attempts used the wrong module suffix and the wrong version-2 validator; both errors were in the external probe, not the product or its tests. The corrected probe uses the same shared validator as production and passes. The initial source-lock attempt ran before staging the rename and reported the removed path; staging the rename and rerunning the documented command resolved it. These initial actual receipts are retained.

No registered test is added, deleted, skipped or weakened. Inventory remains 198 registered cases plus two qualification flows, total 200. No new UI behavior is authored by this FIX round; the original gate's meeting journey passed, and this round's own evidence makes no fresh browser or live-provider claim.

## Clause disposition and remaining boundaries
AGENT-003 remains PARTIAL. No clause Status, Gap or Evidence cell is authored by this round, and no hold is released. The product's recorded before and after counts remain 42 DONE, 130 PARTIAL, 32 MISSING, 204 total. The selected native meeting journey is the only acceptance point this round can claim, subject to its passing receipt.

GAP AGENT-003: Pending quote obligations retain QUOTE-001 and its DocuSign hold; call agendas and outcomes retain CALL-001; connected-mailbox replies retain the owner-consent holds of OPS-001 and CAPTURE-010 and CAPTURE-011; broader cadence retains SEQUENCE-001 and SEQUENCE-002; agent customer-message dispatch retains OUT-001 and SURFACE-009; deal-less obligations retain OUT-017 and OUT-023; booking lifecycle retains INTEGRATE-001; team ownership retains TEAM-005 and its cleanup prerequisite. TEAM-001's strategy trial, live SURFACE-007 and all other existing queue, provider and release prerequisites stand unchanged.

No policy default is introduced. No plan row is edited; the returned sd entry records this FIX result only. DONE riders 1 and 9 retain the foregoing unclaimed boundaries; rider 3 is established only by the final exact-SHA CI receipt; riders 4, 6 and 7 are supported by source digests, unchanged main contract text and generator checks; the native journey covers current authority, erasure and replay for its selected slice. Rider 11 remains the fleet's independent full-history publication scan, guarded landing, main equality and exact-main Run site. This builder makes no DONE, landing or publication-scan-complete claim.

## Custody
Only the named product branch may be pushed. Evidence is published separately to evidence/sd-orbit-c-f173-fix1 using explicit non-secret regular files. Evidence transport is not product acceptance or landing. Final candidate, push and CI receipts are appended after execution.

Runtime result: the unchanged onboarding archive case passed after the fix (exit 0, 501020 ms test duration). This exercises older-generation import, historical Records restores, local transfer, full current restore, credential exclusions, retained hosted-owner sign-in and erasure without changing the case.

Generation entries: 33 before, 32 after; one unreachable entry removed. Migration files: 77 before and after; SQL bytes unchanged. Counts are recorded in counts.json.

Runtime result: the unchanged forward-upgrade case passed after the fix (exit 0, 454127 ms test duration), including accepted-main and released v0.3.0 preservation, the previously rejected pre-direct-notification archive, custom schema, live identity, ownership, dashboard and record-mail upgrade scenarios.

Toolchain: the supplied cloud shim used pnpm 10.12.4 with host Node 24.19.0 for the direct local test commands, identically before and after. The rer build announced project Node 22.20.0. The repository Verify workflow uses its pinned .node-version; its exact-SHA receipt is the final CI bar.

The complete merged managed-owner case passed (exit 0, 855882 ms test duration), including the AGENT-003 meeting proof under held and autonomous policies. CLI restore and the 983-row native archive restore passed; the latter completed 400 steps.

Final product head: 3cbfd12a47993ba5c90c312f79e53c6f43e7f257
Final tree: 9fffa25bb654c0b6558ee540f00cd0f184ba33e7
All 2387 recorded tested source files match the committed bytes; the staged tested tree equals the committed tree. All nine candidate commits, including side parents, pass the identity and trailer check.

Product push: first attempt succeeded; remote branch advertisement equals 3cbfd12a47993ba5c90c312f79e53c6f43e7f257. No PR is created because Verify has a push entry point.

The first CI discovery request returned successfully but the local URL sanitizer damaged its JSON before parsing. This was a watcher harness error, not a failed workflow or transport rejection. That request remains counted in the ten-call budget. The sanitizer is corrected and the single restarted watcher waits at least 300 seconds from the prior request before discovering again; no workflow is rerun or dispatched.

PROBE DATA-001 restore: POST /api/v1/records/archive/imports with the unchanged older complete manifest -> accepted; the entire onboarding archive case passed, including full historical and current restores.
PROBE forward upgrade: preDirectNotificationCatalog(installed) -> validateFoldManifest accepts the exact supported historical source generation; all original forward-upgrade assertions passed.
PROBE AGENT-003 1: company-policy MCP, native exact-draft approval and signed provider transport -> two submissions, one reconciliation lookup, reply leaves goal open, advancement and stop each close once, late dispatch refused, CLI and Records restores paused, restart and erasure assertions passed.
MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0, restored whole from main; ledger=node /home/agent/rer-consolidation/work/sd-orbit-c-f173-fix1/packet/migration-ledger.mjs exit=0.

CLAIM AGENT-003 PARTIAL points=1 tests=tests/core/managed-owner.test.ts#Managed owner claim verifies RER authority and creates the native owner and session exactly once; company text cannot change MCP classification; stalled risks and cited graph proposals agree across policy and native doors; opportunity AI input binds provider exposure and owner approval; nonbinding forecasts remain standard under both policies; meeting follow-up outcomes retain native authority

## Terminal CI and custody receipt
Exact candidate: 3cbfd12a47993ba5c90c312f79e53c6f43e7f257
Verify run: 43292124952
Event: push
Status: completed
Conclusion: success
URL: https://github.com/just-every/run-orbit/actions/runs/43292124952
GitHub calls: 8
No main or tag write, PR creation, Verify dispatch, rerun, status promotion or hold release was performed. Full-history publication scanning and landing remain with the fleet.
All local touched checks passed, no existing assertion was weakened, authority and erasure and replay checks passed for the selected native journey, and the final lock is fresh. No FIX-round UI behavior was authored.
