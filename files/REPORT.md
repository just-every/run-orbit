# sd-orbit-c-f70 report

RECORD-005 remains PARTIAL. The supplied base `a2a3e752f89e80ed0af776463c2313f4fcb9e0bc` already implements the entire planner-selected ordering change, including its contract evidence. This run found no demonstrated source defect and made no new product commit or acceptance edit. It freshly verified and published that exact candidate on `cloud/sd-orbit-c-f70`, preserving the previous builder's work.

## Scope and result

The selected point is deterministic native and visible ordering of out-of-order notes and equal occurred-time ties. The existing registration in `./tests/e2e/operator.spec.mjs:138`, “the mobile opportunity timeline shows metadata and orders out-of-order notes with ID ties,” creates three distinctive notes through authenticated native entry POSTs. The oldest arrives first, followed by two notes sharing a later occurred time. Lines 166 through 175 compare the returned identities, occurred times and note text from both native Records and opportunity reads against occurred time descending, then ID ascending. Lines 177 through 194 reload the actual activity, assert its three note identities and titles at 390, and retain a second reloaded observation and screenshot at 1440. Existing metadata labels, error monitoring and overflow assertions remain intact.

The focused registration passed twice on the exact candidate: once to establish the supplied base behavior, and again to retain the actual structured browser receipt. No source or test byte changed between runs. The final receipt records a 13.256-second passing test with no errors. Both API identity sequences equal the expected sequence, and both reloaded visible activity sequences equal those same identities. Desktop horizontal fit is true; the existing phone overflow assertion passed. Both screenshots were visually inspected. They show tie-one, tie-two, then the older note.

`./src/core/features/records/repository.ts:137` orders by occurred time descending and ID ascending. `./src/core/features/timeline/repository.ts:56` applies the same ordering. The visible activity preserves the native note tie ordering. No correction to those repositories, activity rendering or timeline entry rendering was warranted.

PROBE RECORD-005 ordering: authenticated native creation of three notes in reverse timeline order, including an equal-time pair, then both timeline GETs and reloaded activity -> three distinct identities ordered by occurred time descending and ID ascending in both API responses and at 390 and 1440. The complete actual identities and observations are in `timeline-order.json`.

## Honest remaining scope

No new acceptance point was closed beyond confirming the selected point already present at the requested base. The existing Gap remains accurate: combined mail, meeting, note, stage and owner change, and merge coverage; exact per-entry occurred and recorded timestamps, source and actor remain unproved. This does not qualify that combined journey. Provider qualification, TEAM-005 expanded roles and all existing queue notes, holds and release prerequisites remain unchanged. No external account, provider or policy boundary was newly claimed. No next clause was started because the assignment explicitly requires this clause first and limits this round to the selected point.

Counts remain **35 DONE, 137 PARTIAL, 32 MISSING**, 204 total. The suite remains **198 registrations plus two qualification flows**, total 200. No existing assertion was removed, narrowed, skipped or moved. No new fixture, mailbox literal, provider key, migration, dependency or workflow change was introduced. All 204 parent Status rows are retained. No clause Status rank changed.

## Local checks and custody

- Contract generator write: exit 0; check immediately after write: exit 0. The generated ACCEPTANCE.md and docs/CLAIMS.md were restored whole from current main. No generated view was committed.
- Edition source lock regeneration and its check: exit 0, fresh, with no resulting tracked edit.
- Typecheck: exit 0. First-party RER check: exit 0. Git diff whitespace check: exit 0. No migration ledger check applies.
- Fresh full-history clone, requested base checked out, then current main fetched and rebased before publication. Rebase was a no-op because main `c01084f133af9aa484a6c1f5151a4e9cfbc7230f` is already the candidate's parent. No published history was rewritten.
- Every candidate author, committer and trailer was inspected. The inherited candidate is fleet-authored and fleet-committed, with no trailers. The guard pushed the named branch successfully on its first attempt. The product checkout remained clean. No PR is required by the repository's push Verify entry point, and none was created.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0, generated views restored from main; ledger=none exit=0.

The task-side full-history publication scan is not available or required by the cloud adaptation. No COMPLETE scan or zero-finding scan result is claimed. The maintained fleet lander owns the scan, generated-view publication, landing and exact-main Run site check. Main was never pushed. The actual packet is kept outside the product tree and published only through the separate evidence ref.

## CI

The supplied base's exact-SHA push Verify **42141809102** failed only because `ACCEPTANCE.md` differs from the generator output. Source job **127643840517** reports “ACCEPTANCE.md: generated content differs; run contract-docs write.” Downstream work skipped; the aggregate failed as a consequence. The failed source job archive was read once using the authorized failed-job command. No CI repair was attempted, no failed test was guessed at, and no workflow was dispatched or rerun. This is the explicit generated-view-only exception in the task; it does not establish a recorded CI browser pass.

Current main has green Verify **42116055029** and Run site **42116055015** on `c01084f133af9aa484a6c1f5151a4e9cfbc7230f`. These are main receipts, not candidate proof. The named branch's exact-SHA push Verify **42146195804** completed with the same generated-view-only failure in source job **127658273520**. Its failed archive was read once and confirms the same ACCEPTANCE.md diagnostic. There was no repair, dispatch or rerun. Candidate discovery is recorded in `candidate-ci.json`, and the actual failure excerpt is included. Seven GitHub inspection commands were used in total; no polling interval was shorter than 300 seconds for discovery of the same head.

## DONE riders and pre-READY review

1. FAIL for the full clause: the combined history and exact per-entry provenance journey remains absent. PASS for the selected ordering point, through the focused public-door journey and its actual receipt.
2. PASS for ordering: three actual seeded note identities are compared with an independently ordered expectation, not an empty list. Reversing either occurred-time priority or tie-ID direction would change the expected API and DOM sequence. This is INSPECTED proof of assertion sensitivity; no mutation run is claimed.
3. UNESTABLISHED for full DONE: local exact-SHA browser proof passed, but the CI source job prevents later jobs through the generated-view-only failure. The permitted landing exception does not make skipped browser execution into a passing execution.
4. PASS: all local proof uses this exact head, with no intervening source or test change.
5. PASS as inspected: the receiving RECORD-005 metadata already cites BASE-INPUT-001, BASE-ROLE-001, BASE-INPUT-003 and BASE-DATA-003. No inheritance edit was made.
6. PASS for this PARTIAL row: Evidence and Gap already identify the selected proof and the remaining omissions. Local generated write and check pass; the main versions are deliberately restored under the cloud rule. No DONE provenance assertion is made.
7. PASS: no acceptance text, rider or coverage rewrite.
8. NOT APPLICABLE to this change: no new authority or dangerous action path. All note creation and private reads use the existing native authenticated doors.
9. PASS: no provider, legal, retention or live-account qualification is claimed.
10. NOT APPLICABLE: no policy default or new authority decision.
11. PENDING with the guarded lander: main does not equal the candidate, and no candidate publication scan or candidate-main Run site receipt is claimed. Therefore no DONE promotion or landing is claimed.

The ordering behavior has a public-door assertion that detects a changed order. Existing assertions remain intact. No authority, erasure, replay, privacy, money or data-loss path was changed. No screen code or icon control was changed. The local source lock is fresh. The only observed candidate Verify defect is the explicitly permitted generated-view check. All unestablished gates are reported honestly.

## Plan return

The RECORD-005 selected ordering row is confirmed already implemented and freshly verified at the supplied base. Its status remains PARTIAL, with no count change. The current campaign, all holds and other plan rows remain unchanged. This is verification and custody of the existing result, not a new DONE claim. Full execution plan: `PLAN.md`; actual checks, browser proof and CI receipts accompany this report. No real product blocker was found within the selected point.

The product branch was verified advertised remotely at the reported full SHA. There is no unpublished product work. Local test browsers and their Worker servers have exited. The product clone and dependencies are removed after successful evidence publication, under the task cleanup rule.
