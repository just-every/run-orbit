# sd-orbit-c-f158 report

Repository: just-every/run-orbit. Product branch: cloud/sd-orbit-c-f158.
Candidate: `088146e9bab27f7c093f59a1128273327b9956ab`. Main incorporated: `b3e94efdc16e4ae467cd2ed283ee4eb0dc4c0c31`. No PR is required: Verify has a push entry point. No push to main, default branch update or landing was performed.

SURFACE-009 is claimed PARTIAL. Acceptance 1 and acceptance 2's customer-message limb are implemented and exercised. The whole second acceptance sentence includes commitment jobs, whose DocuSign developer sandbox prerequisite remains held. Formal CONTRACT.md status remains missing on this branch; the builder changes no Status, Gap or Evidence cell. No DONE award or hold release is claimed.

Before and after: 42 DONE, 130 PARTIAL, 32 MISSING, 204 total. Tests remain 198 cases and two qualifications, 200 total. Registry: 28 to 29 tools, ten resource templates unchanged, 40 to 42 declared journey steps. Plan result: only this extract's leased SURFACE-009 message point advances. The Mac plan and every other queue entry remain unchanged.

## Plan and implementation

The complete working plan is PLAN.md. The work followed the existing native agent, person and mail doors. Added `src/core/features/agent-door/messages.ts`, registered `orbit.messages.send`, and extended the existing draft read to expose its send revision and rendered review. The server computes external recipient count one and current counterparty facts from the contact, company, active operator addresses and installation sender and owner domains, excluding configured free-mail domains. Callers cannot supply those facts.

The saved send hash binds native draft revision, current recipient identity and relationship, rendered subject and body, merge review, opt-out state, transport and agent for person sender. The shared door consumes its reserved expected_revision; a required send_revision keeps the same hash available to the final native send fence. Policy-held work uses the native signed-in sponsor approval of the exact summary. The native ApprovalRepository claims the saved revision, and OutreachService performs submission. Suppression, native stale review, quiet-hours confirmation, budgets and opt-out remain in those shared paths. Caller confirmation flags and class claims grant nothing.

The direct mail adapter carries the agent for the person as its outside display name while retaining the configured sender address. Unsupported transports return sender_unavailable with a visible reason before a submission. Saved attribution also survives timer dispatch and later settlement. Native rendering and opt-out implementations were reused without a second approval engine or mail queue. No migration was needed. The optional existing native schedule keeps conformance independent of runner weekday and time; immediate sends are independently exercised at fixed clocks.

A public-door erasure probe demonstrated a retained autonomous success after its recipient was erased. Retained results now include their native contact identity, allowing the existing erasure artifact matcher to retire that call and its replay alias. Replaying it returns subject_erased and submits nothing. No erasure guard was weakened.

The manifest and guide are regenerated from the runtime registry. The existing managed-owner registration invokes the focused helper through `tests/support/agent-door-proof.ts`; the existing emitted browser registration invokes the screen helper. No registration was added, removed or skipped. Existing assertions remain intact. Fixtures construct synthetic addresses, use synthetic-orbit keys, and replace only the mail HTTP edge.

## Acceptance and inherited-duty proof

All leased acceptance and inherited-duty rows below are covered by the push Verify event, run 43121155664, conclusion success, exact head 088146e9bab27f7c093f59a1128273327b9956ab. The external commitment-job row remains NOT RUN.

Retained registration: `tests/core/managed-owner.test.ts` — Managed owner claim verifies RER authority and creates the native owner and session exactly once; company text cannot change MCP classification; stalled risks agree across policy and native doors; exact saved messages honor policy and native send fences.

| Item | Door and observed outcome | Proof on candidate source |
| --- | --- | --- |
| Acceptance 1: approve an exact saved customer message under held policy | Authenticated MCP returns input_required; signed-in wrong reviewer is refused, wrong summary is refused, sponsor approval submits the saved recipient, subject and body exactly once; native Workbench history reports accepted | `tests/support/agent-message-proof.ts:44` through line 75, called by the managed-owner registration |
| Acceptance 1: change a merge field and require a new saved revision | Native contact PATCH changes job_title; original pending approval returns revision_conflict with no submission; native reviewed-draft save increments revision, fresh render review and fresh MCP call submit once; old call stays refused | `tests/support/agent-message-proof.ts:77` through line 86 |
| Acceptance 2: same permitted external customer message without person approval | All-autonomous policy returns accepted with no approval handle; exact saved HTTP subject, body and outside sender are asserted; replay adds no request | `tests/support/agent-message-proof.ts:88` through line 93 |
| Acceptance 2: commitment jobs | NOT RUN; accepted quote and signature jobs retain QUOTE-001 and the owner-created DocuSign developer sandbox prerequisite | External held remainder; not claimed |
| BASE-AGENT-007 policy duty | Server-computed external with measure one and known counterparty; held call ignores injected autonomous policy and standard class claims; exact summary and current native revision gate execution; blocked and revoked admission remain in retained conformance | `tests/support/agent-message-proof.ts:28` and line 56; source conformance 5,383 of 5,383 |
| BASE-AGENT-008 attribution duty for this message limb | Native timeline actor is agent for sponsor; outside From names agent for person; timer settlement preserves it; unsupported sender transport refuses visibly | `tests/support/agent-message-proof.ts:65`, line 74, line 95 and line 127 |
| Native safety and privacy fences | Sending budget holds an unsent native draft; changed opt-out invalidates approval; quiet-hours caller flag changes nothing; suppression refuses; erasure retires replay; revoked agent gets 401 and no content | `tests/support/agent-message-proof.ts:106` through line 138 |
| Pending and sent browser screens | Real emitted Worker, native session, pending person approval and saved accepted message at 1440 and 390; assertions at 1440; one mail submission during fixture preparation | `tests/support/agent-message-browser.ts:47`, invoked in `tests/delegation-browser/today-brief.test.ts` |

PROBE SURFACE-009 1: authenticated /mcp messages.send with saved send_revision under held policy -> input_required and zero submissions; signed-in sponsor approval -> one exact submission; native contact merge-field change -> revision_conflict; native new saved revision and fresh call -> one further submission.
PROBE SURFACE-009 2: authenticated /mcp messages.send under all-autonomous policy -> accepted with no person approval and exact saved subject, body and sender; replay -> no extra submission. Commitment limb remains external and unclaimed.
PROBE SURFACE-009 safety: changed opt-out, suppressed contact, quiet-hours caller confirmation and unsupported outside sender -> native refusals; exhausted budget -> native draft hold; erased recipient replay -> subject_erased; revoked agent -> 401 with no result.

## DONE riders

This is a partial claim. A pass below applies to the leased message limb; it is not a whole-clause DONE award.

| Rider | Result | Evidence or remaining condition |
| --- | --- | --- |
| 1 | PASS for leased message; full clause held | Acceptance and inherited-duty rows above; commitment job is not proved |
| 2 | PASS | Populated native records, exact positive submissions and unsafe attempts with no added submission; native history checked after actual send |
| 3 | PASS | Push Verify 43121155664 completed success on 088146e9bab27f7c093f59a1128273327b9956ab; existing managed-owner and emitted browser registrations are retained in Verify; no new flag or nightly-only proof |
| 4 | PASS exact candidate | Complete native rerun starts and ends on 088146e9bab27f7c093f59a1128273327b9956ab, exit 0; final browser proof and conformance pass; source hashes and local receipts are retained |
| 5 | PASS | SURFACE-009 already cites BASE-AGENT-007 and BASE-AGENT-008 at CONTRACT.md line 2247; no inheritance text was rewritten |
| 6 | PASS builder mechanics | Contract write and check pass; views restored from main and never committed; all parent Status rows retained; lock regenerated last and check passes. Lander owns any judgment synchronization |
| 7 | PASS | No acceptance point, Status row, Gap cell, Evidence cell or ruling changed |
| 8 | PASS for leased authority | Sponsor approval succeeds; wrong reviewer, wrong summary, insufficient send scope and revoked agent refuse through public doors |
| 9 | PASS honest boundary | Only the permitted mail network edge is replaced; no mailbox delivery, DocuSign sandbox or other live-provider qualification is claimed |
| 10 | PASS | No new policy default was adopted. Existing company-policy and attribution duties govern the call; no scope ASK or hold release |
| 11 | PENDING fleet landing | Branch-only candidate; main equality, COMPLETE full-history publication scan with zero findings and exact-main Run site remain the guarded lander's work |

## Pre-ready self-check

1. Every leased user-visible outcome has a public-door positive and unsafe witness; the full commitment limb remains unclaimed. Exact-SHA Verify is recorded below, never inferred from another SHA.
2. No existing assertion was removed, narrowed or put behind a width or branch condition. The new browser helper asserts at desktop and captures both release widths.
3. Current scope and sponsor authority, replay, erasure and revoked-agent behavior are exercised. A replay cannot add a submission or recover the erased contact's saved content.
4. Screens were inspected without redesign. Visible native approval text is at least 13px (`src/base/modules/agent-door/page-style.ts:8` and line 9), fields and cards use complete borders, actions have text labels, and mail configuration remains in Settings. No icon-only control was added. Existing shared screen styling remains intact.
5. Source lock and source integrity check pass. No Base pin or workflow changed. Publication scan was NOT RUN in cloud, as prescribed; no COMPLETE or zero-findings scan receipt is fabricated. Run site remains post-landing. New fixtures contain no provider-shaped key or literal address. Commit identity and trailer checks cover every candidate commit and side parent before each push.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0, generated views restored from main; ledger=none exit=0 (no migration changed).

## Local validation and receipts

`mechanical-receipt.json` contains the actual commands and exits for first-party checks, registry validation, boundaries, contract write and check, view restoration, lock and lock check. `test-count.json` records the unchanged budget. All evidence remains outside the product branch.

The initial cloud migration setup exceeded the fixture's 60-second timeout before assertions. Local test commands use the supplied task-only migration timeout adapter, which changes only that child process setup timeout to 300 seconds; no product or assertion behavior is replaced and the adapter is not a product change. Browser uses /usr/bin/chromium with --no-sandbox and an owned runtime that is closed in finally. No local full-suite verify was run.

Source conformance: 5,383 of 5,383 checks passed. The focused native helper counted exactly four HTTP submissions: held original, held fresh merge revision, autonomous immediate and native timer dispatch. Replays and every unsafe attempt added zero. The complete native registration and complete touched browser registration both pass. The final unpublished amend changed approval-summary formatting and the browser runtime lifecycle, plus the regenerated lock; final-amend.diff records that difference. The complete native registration was then rerun on the committed candidate and passed in 602178 ms with four mail submissions. Its start and end both name 088146e9bab27f7c093f59a1128273327b9956ab; native-exact-receipt.json and native-exact-run.txt retain the actual command, exit, proof and full log. Browser proof and conformance also use the final source. Initial logs, commands and exits are recorded in local-receipts.json. Browser files below contain actual emitted screens, never mockups.

- screens/pending-approval-1440.png
- screens/pending-approval-390.png
- screens/sent-message-1440.png
- screens/sent-message-390.png

## Custody and independent gates

Product push: successful through the fleet guard on 088146e9bab27f7c093f59a1128273327b9956ab. See product-push.txt.
Exact-SHA Verify: push run 43121155664 completed success on 088146e9bab27f7c093f59a1128273327b9956ab. URL: https://github.com/just-every/run-orbit/actions/runs/43121155664. Seven GitHub calls were used; one watcher observed the run at intervals of at least 300 seconds. ci-final-receipt.json and all actual discovery and status receipts are included. No CI failure, workflow dispatch, rerun or repair round occurred. The unchanged verification plan includes every tests/core file in core shards and every tests/delegation-browser file in runtime-delegation (scripts/verification-plan.mjs lines 62 and 89 to 92), with an inventory check requiring each discovered test exactly once.
Run site: NOT RUN here; post-landing fleet obligation.
Publication scan: NOT RUN in cloud; full history is present for the fleet's exact-tree scan. Exact candidate scan state: {"commit":"088146e9bab27f7c093f59a1128273327b9956ab","complete":false,"historyScanned":false,"findings":null,"reason":"cloud route defers scan to guarded lander"}.
Main equality: not landed; main incorporated is b3e94efdc16e4ae467cd2ed283ee4eb0dc4c0c31.
Evidence publication: separate refs/heads/evidence/sd-orbit-c-f158; the terminal message names its exact head after successful transfer.

## Held remainder and plan return

GAP SURFACE-009: Acceptance 2's commitment-job limb remains held on QUOTE-001 and an owner-created DocuSign developer sandbox. Attachments retain RECORD-018 and MIGRATE-001 inheritance or ct ruling; tracking retains OUT-016 policy; several recipients, CC, BCC and reply-all retain OUT-019 and Base relay support; connected mailbox sending retains OUT-013 owner consent; sequence, batch and workflow messages retain SEQUENCE-001, SEQUENCE-003 and AUTO-001 prerequisites. Broader BASE-AGENT-008 attribution, SURFACE-003 matrix, SURFACE-011 reconciliation and SURFACE-013 follow-up qualification remain unclaimed. OUT-001 gains no credit; TEAM-001, TEAM-005, live SURFACE-007 and every existing queue hold remain unchanged.

CLAIM SURFACE-009 PARTIAL points=1 tests=tests/core/managed-owner.test.ts#Managed owner claim verifies RER authority and creates the native owner and session exactly once; company text cannot change MCP classification; stalled risks agree across policy and native doors; exact saved messages honor policy and native send fences

The cloud handoff is READY on the exact pushed candidate. Main equality, publication scanning and Run site remain pending the guarded fleet lander.

No buildable leased message point is left unfinished. No whole-clause DONE, change to acceptance wording, acceptance count promotion, outside account qualification or landing is claimed.
