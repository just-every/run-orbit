# sd-orbit-c-f171 — sequence authoring continuation

Repository: https://github.com/just-every/run-orbit
Product branch: cloud/sd-orbit-c-f171
Candidate: 34171c0c784ef3271537ed7adba7b92d8d7484e6
Base main observed: b3e94efdc16e4ae467cd2ed283ee4eb0dc4c0c31

Disposition: SEQUENCE-001 remains PARTIAL. The prior round already implements the planner-selected authoring limbs; this continuation qualifies that implementation. No additional product edit, acceptance change, Status change, new test registration or new product commit has been necessary. The inherited six product commits remain intact. Fresh main was fetched and an identity-bound rebase reported the branch up to date.

Counts before and after: 42 DONE, 130 PARTIAL, 32 MISSING, 204 clauses. Test count before and after: 198 registered cases plus two qualifications, total 200. The SEQUENCE-001 plan row stays PARTIAL. All existing queue entries, holds, release prerequisites and other plan rows remain unchanged.

## Scope and complete plan

The complete execution plan is in PLAN.md. The scope is private authoring, workspace sharing and independent copying by current full operators, outside internal CC and TEAM-005 role semantics. The implementation is already in the inherited candidate: additive migration 0081, sequence schema and repository and routes, mounted native API, list and editor pages, immutable version history, calendar snapshot and preview, message-library references, portability policies and deployment specification. The previous round also excludes the newer sequence schema from historical notification catalogs. No homepage, branding, workflow or Base pin changed.

## Acceptance and inherited-duty map

Native registration N: tests/core/outreach-limits.test.ts — “SEQUENCE-001 authoring and archive restore; OUT-010 OUT-018 isolated budgets and visible deferrals”, invoking tests/support/sequence-authoring-proof.ts.

Browser registration B: newtests/t096/browser-journeys.test.ts — “SEQUENCE-001 OUT-032 CAPTURE-010 OUT-017 OUT-023 FORM-001 RECORD-016 FORECAST-001 native operator browser journeys”, invoking newtests/t096/browser-sequence-authoring.ts.

| Item | Evidence on candidate | Disposition |
| --- | --- | --- |
| Acceptance 1: seller create and share the five ordered kinds; read-only author refused | N helper lines 23–26 and 30–34; B helper lines 12–21. Current full operators can author and share; an accepted invited collaborator is refused at N lines 41–43. | Selected authoring limbs covered; complete sentence unclaimed because seller and read-only roles belong to held TEAM-005. |
| Acceptance 2: copy, manager lock, versioned conditions, business-day delays, allowed shares and internal CC | N helper lines 27–40 covers calendar, share, append version, immutable prior versions, stale writes and independent copy with source; B lines 21–27 covers saved preview, readable old content, populated list and independent copy. | Selected authoring limbs covered; complete sentence unclaimed for manager lock, team sharing and internal-only CC. |
| BASE-ROLE-001 authority at existing authoring doors | N lines 25, 32–34 and 41–43 checks private-read isolation, refusal of foreign edit and share, and collaborator read and write refusal; line 51 refuses a revoked-session copy. | Native current full-operator scope only. Expanded sales roles stay TEAM-005. |
| BASE-MAIL-001 and OUT-014 content boundary | N lines 23–24 retains authored email bytes; lines 44–47 retains a template reference and revision without expansion and refuses stale references; line 52 checks empty outbound and task inventories and zero mail or provider submissions. | Definitions only. No execution or provider qualification claimed. |
| DATA-003 custody of new definition data | N lines 48–50 compares populated Records restore and local CLI round trip, retaining versions, calendar snapshots and copy provenance. | Native archive behavior covered. |
| OUT-018, OUT-020, SEQUENCE-002, SEQUENCE-003, SEQUENCE-004, SEQUENCE-006 execution inheritance | No enrollment or dispatch is introduced. Existing reviewed single-message proof remains in N. | Sequence budgets, pace, fair drain, threading, per-recipient rendering and approval, opt-out removal and immediate exits remain held with their existing clauses. |

## Frozen scope rubric

R1: Private five-kind definition with authored content and validated conditions and delays — N lines 23–29.
R2: Workspace sharing, new immutable content version and readable prior history — N lines 30–36; B lines 20–24.
R3: Another full operator creates and edits an independent private copy with source and its own version line — N lines 37–40; B lines 25–27.
R4: Stale edit, foreign edit and share, collaborator authoring and copying, private-read isolation and revoked session are refused without changing the source — N lines 25 and 32–43 and 51.
R5: Library references retain exact revision without rendering or sending — N lines 44–47 and 52.
R6: Populated Records export and restore and CLI portability retain definitions and source history — N lines 48–50.
R7: Populated list, editor, history and copy are visible without severe accessibility errors or horizontal overflow at 1440 and 390 — B lines 12–27.

## DONE riders

No DONE award is requested. Rows are scored against the full clause, with narrower selected limbs identified above.

| Rider | Result | Basis |
| --- | --- | --- |
| 1 | PARTIAL | Both whole acceptance sentences still contain explicit held outcomes. The selected authoring outcomes use N and B. |
| 2 | Selected scope covered | Populated definitions and histories, independent copies, unsafe authoring refusals and opened restored content are asserted in N; this is not an empty-list proof. |
| 3 | Exact-SHA CI PASS | Push Verify 43148461566 completed success on 34171c0c784ef3271537ed7adba7b92d8d7484e6. Its source build and all 20 runtime shard jobs passed; light was skipped because this was full coverage. |
| 4 | Exact source | Local proof runs against the unchanged candidate; no source or test bytes changed after the cited CI. |
| 5 | INSPECTED | SEQUENCE-001 explicitly cites BASE-MAIL-001 and BASE-ROLE-001. OUT-014 and the execution clauses retain their written inheritance. |
| 6 | Mechanical PASS; judgment retained | Contract write and check pass. Generated views were restored from main. Status, Gap, Evidence and provenance remain main's text. The lander owns updates. |
| 7 | PASS | No acceptance text, ruling, coverage map or obligation changed. |
| 8 | Selected scope covered | N refuses another full operator's edits and sharing, the accepted collaborator's authoring and copying and a revoked session; the shared source remains unchanged. TEAM-005 authority remains unclaimed. |
| 9 | Boundary retained | No call, meeting invitation, LinkedIn post, enrollment, mail dispatch or live-provider result is claimed. |
| 10 | No new default | The inherited current full-operator boundary is retained. Real sales roles, manager lock and team sharing remain held under TEAM-005. |
| 11 | Pending fleet | Main equality, publication scan and Run site are owned by the guarded fleet lander. No landing or main push was performed here. |

## Pre-ready self-check

1. The selected visible behaviors are exercised through native HTTP and emitted pages by N and B. Whole acceptance points remain unclaimed.
2. No existing assertion was removed, weakened, skipped or moved behind a width condition. No new test was registered. The candidate retains the existing two-width browser helper unchanged.
3. The revoked session is refused. There is no contact enrollment or capture replay path in this authoring-only change. Existing erasure and replay paths were not edited. Archive restore introduces no dispatch authority; N checks zero outbound records.
4. Sequence controls have visible text labels; sequence screen inputs use 15px, metadata 14px, headings and legends 16px, with complete field borders. No icon-only sequence action or new configuration screen was introduced. Screens are inspected from actual browser artifacts.
5. Exact-SHA Verify is successful. Source lock and generated-document checks pass. Publication scanning, guarded landing, main equality and Run site remain pending with the fleet. No cloud scan receipt is invented.

## Known boundaries

GAP SEQUENCE-001: Whole acceptance 1 and 2 remain open for TEAM-005 sales-role permissions, read-only author, manager lock and team sharing, plus Base relay internal-only CC. Enrollment, dispatch, threading, per-step opt-out and sequence budgets and pacing remain held under SEQUENCE-004, SEQUENCE-006, OUT-018 and OUT-020. No hold or prerequisite is released.

Publication scan: candidate=34171c0c784ef3271537ed7adba7b92d8d7484e6; complete=NOT RUN IN CLOUD; historyScanned=NOT RUN IN CLOUD; findings=UNESTABLISHED. Full-history scan is required on the fleet machine before landing.

Main equality: no; main remains b3e94efdc16e4ae467cd2ed283ee4eb0dc4c0c31 at the observed fetch. Run site for candidate: pending guarded landing. PR: none; the repository starts Verify on branch push.

Browser harness note: the first invocation omitted ORBIT_FOLD_BROWSER_EVIDENCE and failed with “Private browser evidence directory is required.” It was interrupted after the fixture leaked its runtime on this early harness error. Only the recorded attempt's processes were terminated. The configured retry uses the installed pinned Node 22.20.0, system Chromium and a preload that sets executablePath and adds --no-sandbox; no product or test source was edited.

## Executed local checks and CI observations

The native registration passed in 438262 ms total process time, one case passed and zero failed. Typecheck, first-party contract check, deployment-spec check, test inventory, contract generation and source-lock write and check all returned 0. Local native and type checks used the supplied toolchain's Node 24.19.0; the emitted browser uses the available exact pinned Node 22.20.0. The existing exact-SHA CI uses the repository pin.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none (no migration edited in this continuation; the inherited migration and archive ledger are exercised by the native proof) exit=0.

Fresh main's successful exact-SHA Verify is 43089571350 and Run site is 43094710902. A later duplicate main Verify 43094710689 reports failure, with no failed jobs returned by the jobs endpoint; this is reported honestly without guessing a test failure or making a repair. The candidate's existing complete runtime Verify 43148461566 is successful. The new named-branch push started Verify 43154797991 on the same full SHA; its observed state was in_progress. No workflow was dispatched or rerun, and no PR was opened. Five GitHub REST calls have been used at this observation.

The guarded product push succeeded on attempt 1, creating only cloud/sd-orbit-c-f171. All six candidate commits have the allowed owner author and committer identity and no trailers. No new product commit was created. The product checkout remained clean, and the CONTRACT.md diff against main remained empty.

PROBES.md records the public-door inputs and outcomes established by the passing native assertions. Complete actual machine-readable outcomes and command identities are in RECEIPTS.json. Browser results and evidence publication are appended after their actual completion.

## Screen inspection

All eight selected sequence screenshots have been inspected: populated list, private editor, opened original version history and independent copy at 1440 and 390. They are readable and retain the five ordered steps and visible conditions and delays. The history shows the original authored subject while the current version has its edited subject. The private copy shows source version 3 and its own version 2 and independent history. All eight accessibility checks report zero serious or critical violations; the runtime overflow assertions pass. All four sequence contexts report zero page errors and zero unexpected console errors. No UI defect requiring a code change was demonstrated. SCREENS.json records the actual screenshot hashes and accessibility results.

## Terminal result

The complete retained browser registration passed on this exact candidate, exit 0: one case passed, zero failed, zero skipped, in 1213188 ms total process time (1205198 ms test body). The emitted Worker, browser contexts and later populated archive and erasure checks completed, and runtime-closure.json confirms zero owned Workers and zero owned browsers. No command remains pending. The filtered actual browser transcript is browser-summary.log; it removes only 47022 repetitive TimeoutOverflowWarning lines and their identical timeout-duration continuations, retaining actual probes, archive observations and the complete terminal TAP result. The unfiltered private diagnostic stays outside the publication packet; its hash is recorded in RECEIPTS.json.

R1 through R7 of the selected-scope rubric are MET by the passing native registration and the complete passing emitted browser registration. This closes no additional whole acceptance point: internal CC and TEAM-005 roles, manager lock and team shares remain held. SEQUENCE-001 stays PARTIAL, counts stay 42 DONE, 130 PARTIAL and 32 MISSING, and the suite stays at 198 cases plus two qualifications. No plan row or source file changed in this continuation.

At the last permitted status read, new branch Verify 43154797991 was still in_progress on 34171c0c784ef3271537ed7adba7b92d8d7484e6; the prior full-runtime push Verify 43148461566 is completed success on that identical SHA. No failing candidate run is known. Seven GitHub REST calls were used, with one watcher and reads at least 300 seconds apart for the new run. The publication scan and main landing and resulting Run site remain the fleet's responsibility.

The packet publishes only explicitly named regular reports, receipts and synthetic sequence screenshots. Trace archives, temporary sign-in material, credentials and unrelated screen artifacts are excluded. Product custody and report publication are separate. The evidence ref is refs/heads/evidence/sd-orbit-c-f171; its exact publication head is returned in the terminal message.

CLAIM SEQUENCE-001 PARTIAL points=none tests=tests/core/outreach-limits.test.ts#SEQUENCE-001 authoring and archive restore; OUT-010 OUT-018 isolated budgets and visible deferrals; newtests/t096/browser-journeys.test.ts#SEQUENCE-001 OUT-032 CAPTURE-010 OUT-017 OUT-023 FORM-001 RECORD-016 FORECAST-001 native operator browser journeys
