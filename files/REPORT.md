# Orbit task activity results

Repository: just-every/run-orbit
Branch: cloud/main-orbit-timeline-tasks-1
Candidate: 0fcca5ff82580014891e6d4932a86e9f995605fb
PR: none required by the repository landing instructions; branch Verify is available.

## Plan and execution

The complete plan is PLAN.md. Refreshed launcher credentials, installed fleet identity, commit hooks and guarded Git transport, and cloned only the declared product. Reproduced both findings through authenticated public app doors on main 0e9e55c: a manually created weekly call task, completed through its lifecycle, produced three unnamed Call rows; an activated workflow produced one unnamed Follow Up row. Captured before screenshots at 1440 and 390 and recorded the actual rendered text in reproduction.json.

Rendered task payload titles and lifecycle descriptions in the shared record activity renderer. A recurring creation is identified by its occurrence or existing recurrence reason and says the next occurrence was created, with its due date/time on the workspace clock. Created and completed events have their own descriptions; existing task update, cancellation, reassignment and rescheduling kinds also retain their names. No task persistence, recurrence, timestamp, actor/source, ordering or unrelated timeline-kind code changed.

Extended the retained RECORD-005 browser journey without a new test registration. Its new helper creates a weekly linked deal task through the public HTTP route, completes it through the Tasks UI, activates a workflow and logs a note to create the workflow task, then inspects all four task events on the deal. Assertions cover task names, lifecycle action, next due time, actor/source, absence of raw ids/event codes in ordinary text, unchanged immutable API payloads and metadata, and unchanged event sequence. The existing late-arrival and ID-tie assertions remain intact. Task assertions run at 1440; changed-screen screenshots are captured once each at 1440 and 390.

## Validation and counts

Initial focused journey: PASS (1 test, 29.7 seconds; command 1.6 minutes).
Post-integration final-head focused journey: PASS (1 test, no skips or unexpected results, 91.655 seconds including isolated Worker preparation/build), with Chromium /usr/bin/chromium and --no-sandbox on Node 22.20.0. Final-head typecheck: PASS. rer build: PASS. Regenerated source lock and authoring check: PASS.
Before/after suite: 198 cases + 2 qualification flows = 200/200, unchanged.
Before/after named task rows in the reproduced scenarios: 0/4 to 4/4 (three recurring-task lifecycle rows and one workflow-created row).
Clause status changes: none. RECORD-005 remains partial; Status, Gap, Evidence, CONTRACT.md and generated acceptance/claims views were not edited.

Integrated main 008e46c by rebasing only unpublished work. Pushed the first real product commit through the fleet guard, then committed the source-lock inventory update for the newly tracked helper and pushed it through the guard. Both transports succeeded on attempt 1. All candidate authors and committers were the fleet identity and messages carried no trailers. No main/default-branch push, force push or published-history rewrite occurred.

## Claim and limits

CLAIM RECORD-005 PARTIAL points=none tests=tests/e2e/operator.spec.mjs#RECORD-005 — the mobile opportunity timeline shows metadata and orders out-of-order notes with ID ties
GAP RECORD-005: This scoped task activity proof does not establish the clause's complete combined mail, meetings, stage/owner changes and merge acceptance journey.

The Mac lander owns the full publication scan and landing. Cloud evidence is report transport only and does not establish acceptance, READY or deployment. Final exact-SHA CI results and local post-integration receipts are recorded separately in ci-receipt.json and product-receipt.json.

## CI custody

Verify run [43363443202](https://github.com/just-every/run-orbit/actions/runs/43363443202) completed successfully on exact candidate 0fcca5ff82580014891e6d4932a86e9f995605fb. The final response arrived at the 45-minute observation limit; ten GitHub calls were used, with no per-run calls closer than 300 seconds. The preceding job observation showed only shards (batch-3), job 131683539774, still running at Verify routine product shard, with 21 jobs successful, one skipped and no failed jobs. No rerun or failed-log request was needed. ci-receipt.json contains the actual responses.

Final custody: READY branch candidate, with no remaining local blocker. This is neither a DONE clause claim nor acceptance, landing or deployment. Fleet publication scan and landing remain with the Mac fleet. The product checkout was clean after both guarded pushes. Reports and receipts are selected explicitly for evidence/main-orbit-timeline-tasks-1 only; no evidence enters the product branch.
