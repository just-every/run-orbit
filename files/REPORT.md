# sd-orbit-c-f148 · OUT-020 historical approval continuity

Candidate: `67493ada01c6300a7bd4bf17b109232ac9a0c3dd`, branch `cloud/sd-orbit-c-f148`, repository just-every/run-orbit. Base main: `2d7b2de603d6925c690816bb68a647fe8c602075`. No PR is required by this repository's push workflow, and none was created. The product branch was pushed successfully with the fleet guard on its first attempt and its advertised head was verified. Main was not changed.

The requested change is already implemented in the supplied continuation commit, also the head of `cloud/sd-orbit-c-f146`. This round independently ran and inspected that exact implementation and published the named continuation branch without making a redundant or empty commit. No additional acceptance credit is claimed beyond that existing continuation. OUT-020 remains PARTIAL. Counts before and after: 38 DONE, 134 PARTIAL, 32 MISSING, 204 total. Test budget before and after: 198 registered cases and two qualification flows, 200 total. No assertion was removed, narrowed, skipped or placed behind a new condition. No clause, Status, Gap, Evidence or plan row was edited.

## Plan and result

The complete working plan is in PLAN.md. Read the supplied campaign extract, rulings and eleven DONE riders, the launcher instructions and repository guidance; inspect the full target and its Gap; validate the historical fixture and public-door proof; inspect built Settings at both widths; run the touched test, typecheck and required mechanical checks; publish the branch and evidence separately. Every step is complete except fleet-owned scanning and landing, and the named branch's new Verify is still running. No blocker was found in the selected work.

The source inspection covered `src/core/features/outreach/opt-out.ts`, `src/core/features/outreach/service.ts` and `src/core/platform/outbound-mail.ts`. No demonstrated product defect requires correction. An absent historical binding remains undefined at dispatch; the SendGrid adapter therefore includes the currently configured group. This proves legacy transport behavior, not the identity of any historical unsubscribe group. The test inserts a current owner for Settings authority without changing the historical approver or message. It uses the real configured SendGrid serializer and replaces only its HTTP edge.

## Selected proof and scope

The retained registration is `tests/core/capture-upgrade.test.ts` # `CAPTURE-007 OUT-032 the capture migration upgrades a store from the previous main with every prior row and queue unchanged`. Its line 95 calls `provePriorApprovalContinuity`, implemented in `tests/support/prior-opt-out-continuity.ts`. The separate `tests/support/prior-capture-upgrade.ts` fixture restores the committed historical database, snapshots it before migration, applies actual pending migrations and opens the migrated persisted database. The original reply-cancellation journey runs first on a separate store and is unchanged.

| Item | Door, assertion and source lines | Result |
| --- | --- | --- |
| Acceptance 1, existing bound approval and count behavior | `tests/core/outbound-boundaries.test.ts` lines 54–57, native Settings and scheduled dispatch | INSPECTED, existing credit only; no new test or claim |
| Acceptance 2, original pre-setting scheduled approval | `tests/support/prior-opt-out-continuity.ts` lines 23–32 reads the original scheduled message from the pre-migration snapshot, with no receipt or previous attempt | PASS in local capture-upgrade run on the candidate |
| Acceptance 2, owner turns one-to-one off | Helper lines 34–52 and 62–73 use an authenticated current owner and POST native Settings, then read it again; original approval and draft bytes and pre-setting count remain unchanged, binding inventory empty, provider submissions zero | PASS |
| Acceptance 2, original due time | Helper lines 75–78 dispatch before the original due time and retain the unsent count with no submission | PASS |
| Acceptance 2, exact legacy content and configured group | Helper lines 79–89 dispatch the original migrated approval through the configured SendGrid adapter, compare recipient, subject, body, Message-ID, references and durable delivery correlation, and require configured group 146 | PASS; no original group identity invented |
| Acceptance 2, truthful accepted receipt | Helper lines 91–107 read native message history and require the original identity, exact content, accepted state, provider receipt, zero remaining legacy unsent count and one accepted timeline receipt | PASS |
| Acceptance 2, replay safety and no invented state | Helper lines 108–121 repeat dispatch and construct a fresh dispatcher: total submissions stays one, receipt count stays one, messages and timeline stay unchanged, historical drafts unchanged, no binding added, unrelated messages byte-equal | PASS |
| Acceptance 2, established upgrade and cancellation retained | `tests/core/capture-upgrade.test.ts` lines 14–40 preserve all old rows and columns and additive defaults; lines 45–78 exercise Settings and a captured reply cancelling the old scheduled message while preserving the already accepted message | PASS; no new credit for previously asserted display or default behavior |
| Acceptance 2, other existing subcases | `tests/core/outbound-boundaries.test.ts` # `OUT-020 OUT-029 OUT-032 managed opt-out is approval-bound, suppresses only its recipient and stops replayed dispatch` covers new defaults, removal rules, addition, current binding, provider switch, explicit off and transport refusal | INSPECTED; already asserted and receives no new credit |
| Acceptance 3 | Gmail one-to-one, sequence step with headers and link, relationship-marked sequence removal | UNPROVED and unclaimed; existing holds unchanged |
| Inherited BASE-MAIL-001 selected duty | Helper lines 79–107 only records acceptance after a SendGrid 202 receipt; original content and provider receipt visible through native message history | PASS for the selected edge-faked path; live qualification unclaimed |
| Inherited BASE-ROLE-001 selected duty | Helper lines 34–52 uses current installation owner authority for Settings; `opt-out.ts` refuses actors without active setup-owner authority; prior outbound boundaries registration attempts a non-owner change | PASS selected owner path; wider role matrix receives no new credit |
| Inherited BASE-OPS-003 selected duty | Helper lines 108–121 repeat the real dispatcher and instantiate a fresh one without another submission or accepted receipt | PASS |

PROBE OUT-020 2: migrated pre-setting approval, owner Settings off, configured SendGrid HTTP edge -> original content and configured group, one accepted receipt, repeat submissions=0.

No historical binding or original group identity was fabricated. The fake SendGrid key and receipt use the existing synthetic fixture convention. The selected helper pins Date to the saved approval's actual due time; it does not depend on a current calendar boundary.

## Browser and local verification

The built application ran the existing `optOutUpgradeBrowserJourney` from `newtests/t096/browser-opt-out-upgrade.ts` through the emitted Worker and real migrated store. The one-off runner changes only launch options to `/usr/bin/chromium` and `--no-sandbox`; it does not replace product routes or browser assertions. Settings was shown once at 1440 and 390, including one actual legacy unsent approval and populated owner sending-budget data. At 1440 the existing journey checks the upgrade default, basis and count before and after reload; both widths capture the screen, check overflow, run accessibility analysis and collect browser errors. Both images were visually inspected. No redesign or source UI edit was needed. Text is readable, controls are labelled, cards have whole borders, configuration remains in Settings, and no icon-only control needing a new tooltip was identified.

Both accessibility receipts contain zero violations; both browser error receipts contain no page or unexpected console errors. Reading Settings leaves every historical approval and draft unchanged, adds no binding, and produces zero provider connections and submissions. The owned browser and Worker were closed, and the fixture was disposed. Screenshots and actual error and accessibility receipts are included.

The capture-upgrade registration passed: one test, one pass, zero failures, 42.9 seconds overall. Typecheck passed. Pinned rer install, non-interactive owner setup, build and first-party checks all exited 0. The rer pin remains 0.2.96 as supplied on the pinned tree; it was not upgraded. Tests and the browser driver used Node 22.20.0. Build warnings about future Vite native-loader behavior were non-fatal and required no source repair. Full local verification and unrelated journeys were not run.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0.

Generated ACCEPTANCE.md and docs/CLAIMS.md were restored whole from origin/main after successful generation. No migration changed, so no migration-ledger command applies. Immediately before the product push, main was fetched and rebase reported already up to date; the source lock was regenerated last and checked again. The resulting tree stayed clean. Both the staged CONTRACT.md diff and the candidate CONTRACT.md diff against main are empty. All candidate author and committer identities were inspected, including every reachable candidate parent, using the required range log. They are the fleet identity; trailers are absent.

## DONE riders and pre-READY check

No DONE promotion is requested. These rows distinguish selected proof from full-clause obligations.

| Rider | Result | Evidence or remaining obligation |
| --- | --- | --- |
| 1 | PARTIAL overall; PASS selected outcome | The helper reaches actual historical dispatch and observes the wire, native history and replay. Acceptance 3 and broader held qualification remain unproved. |
| 2 | PASS selected outcome | A populated historical store, exact original content, early-dispatch refusal, one acceptance, unchanged replay inventories, and the preserved reply-cancellation path are asserted. |
| 3 | PASS recorded exact-SHA Verify; new branch run pending | Push Verify 42500712371 completed success on the full candidate SHA on the f146 branch. The unchanged capture test and browser helper are loaded by the declared verification globs and browser registration. New f148 push Verify 42503134951 was in progress at its first observation. Local selected proofs passed on the same SHA. |
| 4 | PASS | Local test, build and browser evidence all use the exact pushed SHA, with no code edits after proof. |
| 5 | INSPECTED | OUT-020 already cites BASE-MAIL-001, BASE-ROLE-001 and BASE-OPS-003. No inheritance or acceptance text changed. |
| 6 | PASS mechanics; judgment cells remain fleet-owned | Contract write and check succeeded; main's generated views were restored, candidate Status and Gap cells unchanged. No new judgment or count edit claimed. |
| 7 | PASS | No acceptance text, ruling, coverage map or identifier changed. |
| 8 | PASS selected scope; no expanded authority claim | The real owner Settings route runs, original historical approver stays intact, existing cancellation remains asserted. Existing non-owner refusal stays in the outbound-boundaries journey. |
| 9 | PASS honest boundary | Only the configured SendGrid HTTP edge is replaced. No Gmail, sequence, workflow or live-provider qualification is claimed. |
| 10 | PASS | No new policy default, hold release or scope decision was adopted. |
| 11 | PENDING fleet landing | Main remains 2d7b2de603d6925c690816bb68a647fe8c602075; no main equality, Run site or completed publication scan is claimed. |

Pre-READY checks: selected behavior has passing assertions that fail on changed original content, missing group, premature submission, duplicate receipt, repeat send or invented binding. Existing cancellation and other assertions are preserved. No authority, erasure or capture-replay source was changed; broader qualification remains with its existing obligations. Both populated Settings screens passed the described proof. Source lock and generated source checks pass. Exact-SHA Verify has a recorded success; the newly started named-branch run is still running. Scan and Run site are pending the guarded fleet lander under the explicit cloud route, never fabricated as local receipts.

## CI, publication and handoff

Exact SHA `67493ada01c6300a7bd4bf17b109232ac9a0c3dd`:
- Verify 42500712371, event push, branch cloud/sd-orbit-c-f146, completed SUCCESS: https://github.com/just-every/run-orbit/actions/runs/42500712371
- Verify 42503134951, event push, branch cloud/sd-orbit-c-f148, IN_PROGRESS at discovery: https://github.com/just-every/run-orbit/actions/runs/42503134951

Only two GitHub REST calls were made: one exact-SHA discovery, and one first observation filtered to the newly pushed named branch. No run was polled, dispatched or rerun, no log archive was requested and no failure was observed. No CI repair was attempted. No PR was created; Verify has a push entry point.

Publication scan result: commit=67493ada01c6300a7bd4bf17b109232ac9a0c3dd; executed=false; complete=unestablished; historyScanned=unestablished; findings=unestablished. The full-history clone was not shallow. Cloud product pushes are explicitly exempt from running the Mac publication scanner; the maintained lander owes the exact-tree scan and landing conditions. No scan success or main Run site result is claimed.

GAP OUT-020: Gmail one-to-one, sequence header and link behavior, relationship-step removal, workflow email and live-provider qualification remain omitted and unclaimed. OUT-013 owner consent, OUT-019 Base relay recipient support, SEQUENCE-001 and SEQUENCE-003, AUTO-001 and OUT-032 held execution prerequisites remain unchanged. TEAM-005 remains blocked on ct cleanup landing and its resulting main. No existing queue, note, hold or release prerequisite changes.

Plan rows changed: none. Proposed lane record only: independently validated and preserved the pinned pre-setting approval continuity commit, no additional DONE or acceptance credit, unchanged counts and holds. The complete packet is published only to evidence/sd-orbit-c-f148. Product custody and evidence publication are separate. Clone cleanup follows successful evidence publication, with all actual report and receipt files retained outside the clone.

CLAIM OUT-020 PARTIAL points=2 tests=tests/core/capture-upgrade.test.ts#CAPTURE-007 OUT-032 the capture migration upgrades a store from the previous main with every prior row and queue unchanged
