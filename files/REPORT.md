# sd-orbit-c-f85 results

TASK-001: PARTIAL → PARTIAL. Closed the selected native reassignment delivery-proof deficit. No production defect was demonstrated; the existing assignment effects and native notification route passed unchanged. This is a pushed branch candidate, with no DONE, acceptance or landing claim.

Repository: just-every/run-orbit. Branch: cloud/sd-orbit-c-f85. Candidate: 8349d342994e3ecbfbdd565451db08711f22fbd8. Main used for integration: d417a80f86f763583e68f7ba8c13cb668f30bbab. Product push succeeded on its first attempt. No PR was needed because Verify starts on branch push.

## Plan and result

The full execution plan is in PLAN.md. Inspection found that exerciseSalesTasks already counted stored assignment rows but did not read the receiving operator inbox. The existing TASK-001 registration in ./tests/core/today-brief.test.ts invokes ./tests/support/sales-tasks.ts, exerciseSalesTasks. The extended helper uses a distinct active full operator session on the actual application, reads that recipient's nonempty native inbox before and after reassignment, identifies exactly one added task.assigned identity, checks the exact task href and increased unread count, and reads the linked task as the receiver with its new owner, title and saved revision. It replays the stale reassignment, requires HTTP 409 and verifies identical inbox identities and unread count. Existing row counts, self-assignment, task attribution, recurrence, erasure and operator-removal handover assertions remain intact.

Only ./tests/support/sales-tasks.ts, CONTRACT.md and sources.lock.json changed. No test registration or assertion was removed, weakened, conditionally hidden or added. The shared test still exercises actual routes and migrated D1, with only test-session setup outside the public door. No model or provider behavior is substituted by this change. The task effects in ./src/core/features/tasks/effects.ts and inbox query in ./src/core/features/notifications/routes.ts were inspected and needed no correction.

Plan row change to relay: TASK-001's one receiving-user notification deficit is now proven through authenticated native HTTP and removed from its Gap. Its Evidence includes ./tests/support/sales-tasks.ts, exerciseSalesTasks. Status stays partial. No acceptance text, other plan row, queue line, release prerequisite or hold changed. Counts remain 36 DONE, 136 PARTIAL, 32 MISSING, 204 total. Tests remain 198 registered plus two qualifications, 200 total. All 204 parent Status IDs and all 458 table rows are retained.

## Public-door probe

PROBE TASK-001 receiving-user assignment notice: receiving full operator GET /api/v1/notifications before and after native PUT /api/v1/tasks/:id from the acting operator → exactly one new task.assigned notice, exact /app/tasks/:id href, previous identities retained and unread count increased by one; receiver GET /api/v1/tasks/:id → HTTP 200 with the assigned task identity, receiver owner and saved revision; stale PUT replay → HTTP 409, identical receiver inbox identities and unchanged unread count. Passed on exact candidate 8349d342994e3ecbfbdd565451db08711f22fbd8.

## Validation

The touched registration is named “TASK-001 TEAM-004 BRIEF-001 BRIEF-002 AI-003 a seller starts each simulated day from one brief built from records only: replies, meetings, observed and inferred signals, overdue promises and unresolved identity, each line linked to its evidence”. It is registered in ./tests/core/today-brief.test.ts:30 and invokes exerciseSalesTasks at line 81. New receiver assertions are ./tests/support/sales-tasks.ts:22 through line 48. Candidate test, pinned Node 22.20.0: one passed, zero failed. Typecheck passed on the same candidate. First-party check passed after correcting an Evidence formatting mistake where a backticked function name was interpreted as a path; no assertion or product code changed for that correction.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0; ledger=none exit=0.

The generator's write and check passed before restoring ACCEPTANCE.md and ./docs/CLAIMS.md wholly from origin/main. Neither generated view was committed. The source lock was regenerated last against those restored bytes and its check passed again after the up-to-date rebase. A candidate Verify failure confined to generated view freshness remains expected under the cloud contract.

Identity and trailer audit covered every candidate commit including side ancestry; the single candidate has fleet author and committer, no trailers, and retains every parent Status ID. No new email-shaped or credential-shaped value was introduced. Existing source fixtures are retained unchanged; this statement is limited to the diff, not a claim that the entire legacy repository contains no email fixtures. Local checks used only the touched registration, typecheck, first-party, contract generation, source lock and test inventory. No full local suite or full Verify was run.

## CI and custody

Exact candidate Verify 42177495814, event push, was in_progress with no conclusion when discovered. URL: https://github.com/just-every/run-orbit/actions/runs/42177495814. No green claim is made for that SHA. Two GitHub API calls were used: main run discovery and exact-candidate run discovery. No dispatch, rerun, failed-job archive download or short-interval polling was performed.

Main d417a80f86f763583e68f7ba8c13cb668f30bbab has successful Verify runs 42173012225 and 42170783887 and successful Run site 42173012218. Those are main evidence, not substituted for candidate verification. The fleet lander owns exact-candidate Verify completion, full-history publication scanning, generated view synchronization, landing and the resulting Run site. Cloud publication scan: NOT RUN as allowed by this task. No main push, fast-forward or force push occurred. Candidate is handed over under the brief's cloud READY rule while Verify is running.

## Remaining scope and rider review

TASK-001 is not DONE. Daily task-view completion, visible personal-channel qualification and a genuinely persisted-store recurrence restart remain unqualified in the carried Gap, along with the other inherited proof gaps that this selected point did not reopen. Existing recurrence and Slack actor, source and single-use action proofs are retained. Personal email, push and Slack reminders remain visibly unavailable until NOTIFY-003 ships those channels; administrator due-work channel notices must not imply personal preferences. Mobile push still needs Apple and Google accounts. TEAM-005 retains its contract-cleanup landing prerequisite and resulting new main. No new policy default was adopted and no scope question or judge request is needed.

DONE-RIDERS reviewed without claiming DONE: row 1 selected native inbox outcome PASS, other outcomes remain UNMET; row 2 seeded nonempty inbox and stale refusal PASS; row 3 exact-SHA Verify is RUNNING; row 4 exact-candidate touched proof PASS; row 5 BASE-ROLE-001 citation retained; row 6 Evidence and selected Gap updated with generator checks PASS before generated-view restoration, existing judged provenance retained because no promotion is claimed; row 7 acceptance text and inherited obligations unchanged; row 8 actual recipient session and denied stale write PASS within the selected scope; row 9 external boundaries remain named and unclaimed; row 10 no new default; row 11 landing, publication scan and candidate Run site PENDING with the fleet.

Pre-READY review: selected outcome has runtime assertions, all existing assertions retained, stale replay and existing erasure and removed-session checks pass; no UI, authority, provider, money, migration or storage implementation changed. No browser proof was rerun because no screen changed. The lock is fresh and generated views remain lander-owned. There is no known real candidate failure or blocker for this selected proof. This does not remove the wider clause's holds.

The separate evidence packet is public-safe reporting only. Product status and custody do not depend on report publication. The product clone and its dependencies will be removed after verifying the pushed product ref and publishing evidence; the complete selected packet remains outside that clone.
