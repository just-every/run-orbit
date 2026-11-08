# sd-orbit-c-f146 result

OUT-020 stays PARTIAL. The selected historical pre-setting approval continuity is now asserted in the existing capture-upgrade registration. Product branch: `cloud/sd-orbit-c-f146`. Candidate: `67493ada01c6300a7bd4bf17b109232ac9a0c3dd`. Parent and last fetched main: `2d7b2de603d6925c690816bb68a647fe8c602075`. No PR is needed: a branch push starts Verify. No runtime defect was demonstrated in the three inspected modules, so runtime code is unchanged.

Live contract counts before and after: 38 DONE, 134 PARTIAL, 32 MISSING, 204 total. These are the live source counts, rather than the older 36, 136, 32 in the read-only plan extract. Registered cases remain 198 plus two qualification flows, 200 total. No case was added, deleted, skipped, narrowed or placed behind a viewport condition. No Status, Gap, Evidence, acceptance text or generated view changed. No plan row or hold changed. This round awards no DONE and releases no prerequisite.

## Plan and completed work

The full plan is in `PLAN.md`. Read the inline plan and rider references and the current repository instructions, clause and Gap. Preserve the original upgrade and reply-cancellation flow. Reuse `tests/support/prior-capture-upgrade.ts` to create a second actual migrated historical store, and call the focused `provePriorApprovalContinuity` helper from the same existing registration. Run the selected native Settings and transport probe, touched boundary regression, typecheck, build, first-party and mechanical checks. Fetch main and rebase the unpublished candidate, regenerate the source lock last, inspect all candidate identities and messages, commit and push the named branch. Inspect the populated emitted Settings page at both widths on the committed candidate. Publish this complete non-secret packet only through the evidence ref. Scanning and guarded landing remain fleet duties.

`tests/support/prior-opt-out-continuity.ts` lines 22–124 create a separate historical fixture. The original pending message comes from the immutable pre-migration snapshot, not from a newly approved draft. The fixture creates a current installation owner for the Settings change; it makes no claim that this owner existed historically. It leaves the historical sender, approval, recipient, content, schedule, message identity, delivery identity and original accepted message untouched. The old fixture has no retained unsubscribe group identity; only the currently configured group is asserted. The configured SendGrid adapter is real; only global fetch at its HTTP edge is replaced, with an accepted 202 receipt. The fixed clock follows the stored due time rather than the machine's current weekday.

Inspected runtime: `src/core/features/outreach/opt-out.ts` preserves approved revisions and returns undefined for an unbound historical approval; `src/core/features/outreach/service.ts` passes that legacy state through dispatch and settles the same message once; `src/core/platform/outbound-mail.ts` includes the configured SendGrid group for that historical undefined state. The passing runtime journey demonstrates the requested behavior, so no speculative runtime change was made.

## Frozen rubric for this selected point

The first rubric for this narrow selected point is recorded here; it adds no clause obligation. Every row below refers to `67493ada01c6300a7bd4bf17b109232ac9a0c3dd`. The existing registration is `tests/core/capture-upgrade.test.ts` — CAPTURE-007 OUT-032 the capture migration upgrades a store from the previous main with every prior row and queue unchanged. Its extension is at line 95. The exact-commit local run passed with one registration, no failures and no skips.

| ID | Checkable outcome | Proof and result |
| --- | --- | --- |
| R1 | A genuine pending historical approval survives migration and an owner turns one-to-one opt-out off through native Settings. | PASS: helper lines 23–52 and 62–72; authenticated POST and GET at the Settings route, not a repository setter. |
| R2 | Legacy unsent count and original approval and draft bytes stay unchanged until due dispatch. | PASS: helper lines 64–78; count remains one, no binding is invented, provider calls stay zero, pre-due dispatch sends nothing. |
| R3 | Dispatch submits the original recipient, subject and body through configured SendGrid with its configured unsubscribe group. | PASS: helper lines 40–59 and 79–89; exact serializer output and correlation identities asserted; configured group 146, no claim of the historical group's identity. |
| R4 | One accepted receipt is visible on the original identity and repeat dispatch submits no second message. | PASS: helper lines 91–121; authenticated message read, one accepted timeline event, same message and timeline after two further dispatches including a new service instance. |
| R5 | Existing reply cancellation and all historical retention assertions remain active. | PASS: unchanged original body of `tests/core/capture-upgrade.test.ts` lines 13–94, including original scheduled approval cancellation after imported reply and preserved accepted message. |
| R6 | Populated Settings is inspected at 1440 and 390 with no redesign. | PASS: existing `newtests/t096/browser-opt-out-upgrade.ts` lines 38–73, invoked on candidate using system Chromium. Both screenshots, accessibility reports and browser error reports are in this packet. No overflow, accessibility violations, browser errors or provider connections. |

## Acceptance sentence disposition

| Acceptance | Disposition |
| --- | --- |
| 1. Change the type setting after approval and verify approved unsent state and Settings counts remain unchanged. | Existing bound-state proof in `tests/core/outbound-boundaries.test.ts` — OUT-020 OUT-029 OUT-032 managed opt-out is approval-bound, suppresses only its recipient and stops replayed dispatch — passed unchanged. No new point credit. The selected historical variant is R1 and R2. |
| 2. New-installation default, established upgrade, removal, addition, pre-setting approval, transport-switch continuity, explicit off, historical transport marking. | PARTIAL for the full clause; this round closes only the original migrated pre-setting approval continuation, R1–R5. Existing covered subpoints receive no new credit. The focused helper proves configured SendGrid behavior, not real provider delivery or original group identity. |
| 3. Gmail one-to-one without opt-out, sequence with both, and permitted relationship sequence removal with neither and its review marking. | OMITTED and unchanged: live owner consent and connected-mailbox and sequence prerequisites remain held. |

## Inherited duties

| Duty | Evidence and boundary |
| --- | --- |
| BASE-MAIL-001 truthful mail outcomes | PASS for selected transport edge: helper lines 98–107 assert original identity, accepted state and actual edge receipt; no delivered state or live inbox is claimed. Existing outbound boundary journey passes. |
| BASE-ROLE-001 current authority | PASS for the selected owner Settings path using a real native session, helper lines 34–52. Existing outbound boundary journey retains its 403 non-owner setting-change assertion. Broader role and team matrices remain TEAM-005 and are unclaimed. |
| BASE-OPS-003 replay | PASS for selected dispatch: helper lines 107–121 prove one accepted event, no second provider call, no additional outbound row and an unchanged unrelated historical accepted message after replay. |

## DONE-RIDERS

No DONE claim is made. Rows are scored for the limited point and the honest remaining full-clause boundary.

| Row | Result | Evidence or remaining boundary |
| --- | --- | --- |
| 1 | PARTIAL | Selected R1–R6 pass locally; acceptance 3 and held execution and provider paths remain unproved. |
| 2 | PASS for selected point | Populated historical data, exact wire content and receipt, pre-due no-send and repeated-dispatch no-send; original reply-cancellation negative remains. |
| 3 | PENDING exact-SHA CI | Verify push run 42500712371 discovered in progress on this full SHA. Both extended upgrade and existing browser registration are already loaded by Verify's existing test discovery. No workflow change or separate dispatch. |
| 4 | PASS | Upgrade and browser proof ran on committed candidate. Boundaries, typecheck and build preceded the commit; their relevant source and test bytes are identical, with no later source edit. |
| 5 | INSPECTED | The receiving clause cites BASE-MAIL-001, BASE-ROLE-001 and BASE-OPS-003. No inheritance change. |
| 6 | PASS mechanical | Contract write and check exit zero, both generated files restored from main; no Status, Gap or Evidence edit. Existing Gap stays untouched for lander reconciliation. |
| 7 | PASS | No acceptance or clause rewrite, no ruling needed, no obligation removed. |
| 8 | PASS for selected path | Native current-owner Settings change; existing non-owner refusal and original capture cancellation retained in passing journeys. Broader authority work is unclaimed. |
| 9 | PARTIAL, honest boundary | Only configured HTTP-edge SendGrid acceptance is proved. No live provider, Gmail, sequence or workflow qualification. |
| 10 | NOT APPLICABLE | No new policy default, no scope request, and no held prerequisite released. |
| 11 | PENDING fleet | Candidate is branch-only. Publication scan, main equality and exact-main Run site are not claimed. |

## PRE-READY self-check

The new assertions perform the original historical approval, rather than substituting a new approval or fabricated binding. Removing the configured group, rewriting recipient or body, dropping receipt settlement or resending on replay changes an explicitly checked output. Existing assertions are unchanged. The original cancellation path and boundary journey retain unsafe-path refusals. No authority, erasure, replay, product or UI implementation changes were made; wider erased-person and revoked-credential guarantees are not newly claimed. Populated Settings remains under Settings, uses labelled controls and full rounded borders; both inspected widths are readable and accessible. There are no new icon-only controls. The existing UI describes an original unsubscribe group; this round's transport proof establishes only the currently configured group and does not certify historical group identity. This is existing text, not new continuity evidence.

New source text contains no literal email-shaped string and no new credential-shaped value. Test credentials use synthetic Orbit values. The candidate identity is fleet author and committer, and its message has no trailers. The diff contains only the extended registration, its new helper and the generated source lock. Full history is present; cloud publication scanning is intentionally left to the fleet under the cloud exception.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0

PROBE OUT-020 2: migrated original scheduled approval, native owner Settings one-to-one off, configured SendGrid HTTP edge -> unsent count one before due, original content and configured group, one accepted receipt, repeat submissions zero.

## CI, custody and landing boundary

Product push succeeded on its first attempt. The exact candidate's push Verify is run 42500712371, initially in progress, with no rerun or dispatch. The latest observation is recorded in `ci-final.json` when available. Parent main has successful Verify 42493933858 and Run site 42496142810; a later Verify 42496142843 failed and another 42499172598 was in progress at discovery. This builder neither repaired nor declared those unrelated runs green. Candidate Verify is the required gate; no success is borrowed from main or another SHA.

Publication scan: commit=67493ada01c6300a7bd4bf17b109232ac9a0c3dd, complete=NOT RUN, historyScanned=NOT RUN, findings=UNKNOWN. The full-history scanner is unavailable to this cloud task and is required on the fleet before landing. Main equality: false, candidate is a child of the recorded main. Candidate main-only Run site: not run before landing. No default branch was pushed or fast-forwarded. Product custody and evidence publication are separate; the evidence ref is not acceptance or landing.

No known local blocker. The full clause remains PARTIAL for the held remainder. The complete plan and machine-readable receipts, actual focused logs, browser outputs and candidate diff are explicitly selected for separate evidence publication. No environment dump, decrypted credential, private held-out material, session cookie, source database or symlink is selected.

CLAIM OUT-020 PARTIAL points=2 tests=tests/core/capture-upgrade.test.ts#CAPTURE-007 OUT-032 the capture migration upgrades a store from the previous main with every prior row and queue unchanged

GAP OUT-020: Only acceptance 2's original historical pre-setting approval continuity is newly proved; points=2 names this selected subpoint and does not claim the entire acceptance sentence. Gmail one-to-one, sequence headers and link and relationship-step removal, workflow email and live-provider qualification remain omitted. OUT-013 owner consent, OUT-019 Base relay support, SEQUENCE-001 and SEQUENCE-003, AUTO-001, OUT-032 held paths and TEAM-005 cleanup prerequisites remain unchanged.

Remote ref readback confirms product HEAD on the named branch and main still at the parent. Working tree is clean and the clone has full history. Both browser processes and emitted Worker processes have completed through their owned cleanup paths.

Final CI observation at 2026-11-08T16:41:15Z: Verify 42500712371 remains in_progress on 67493ada01c6300a7bd4bf17b109232ac9a0c3dd, conclusion null. Discovery and the one status poll were 300 seconds apart; total GitHub calls are three including one main-SHA discovery. No run was dispatched, rerun or replaced. Product custody is PUSHED with all local gates passed; exact-SHA CI success is not claimed. The fleet owns the outstanding CI decision, scan and landing.
