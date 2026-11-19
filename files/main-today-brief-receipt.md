# Focused Today Brief reproduction on Orbit main

SHA: 2288bfae201961fdb966552dc86655a76b2e0247
Started: 2026-11-19T13:04:59Z
Finished: 2026-11-19T13:11:14Z
Runtime: Node 22.20.0, pnpm 10.12.4
Result: exit 1; 4 cases, 2 passed, 2 failed

~~~sh
cloud_run pnpm exec tsx --test --no-test-only --test-concurrency=1 --test-reporter=spec tests/core/today-brief.test.ts
~~~

Actual output, with the synthetic record ID and checkout prefix shortened.

~~~text
Orbit records: unexpected Error: IMPORT_ATOMIC_GUARD
✖ TASK-001 TEAM-004 BRIEF-001 BRIEF-002 AI-003 a seller starts each simulated day from one brief built from records only: replies, meetings, observed and inferred signals, overdue promises and unresolved identity, each line linked to its evidence (16918.769449ms)
✖ BRIEF-003 AI-001 AI-002 AI-003 AI-004 an account summary is sent only as previewed, must cite the brief, and fails visibly without disturbing the brief; AGENT-002 absent decision-maker and conflicting recorded commitments yield cited risks, dismissal and reviewed tasks (4739.367478ms)
✔ INTEGRATE-002 BRIEF-004 RECORD-010 RECORD-017 RECORD-023 OUT-001 cited meeting plans, mention authority and Zoom lifecycle custody (285148.114403ms)
✔ CALL-001 owner-managed Twilio dialing reviews exact numbers, submits once, orders signed receipts and preserves privacy and report counts (17383.07822ms)
ℹ tests 4
ℹ suites 0
ℹ pass 2
ℹ fail 2
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 374343.067649
✖ failing tests:
test at tests/core/today-brief.test.ts:1:2574
✖ TASK-001 TEAM-004 BRIEF-001 BRIEF-002 AI-003 a seller starts each simulated day from one brief built from records only: replies, meetings, observed and inferred signals, overdue promises and unresolved identity, each line linked to its evidence (16918.769449ms)
  Error: /api/v1/records/contact/<id> answered 500: {"error":"Record operation failed; no success was confirmed."}
      at Object.json (tests/support/today-workspace.ts:16:245)
      at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
      at async exerciseSalesTasks (tests/support/sales-tasks.ts:79:2)
      at async TestContext.<anonymous> (tests/core/today-brief.test.ts:95:13)
      at async Test.run (node:internal/test_runner/test:1054:7)
      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:296:3)
test at tests/core/today-brief.test.ts:1:21185
✖ BRIEF-003 AI-001 AI-002 AI-003 AI-004 an account summary is sent only as previewed, must cite the brief, and fails visibly without disturbing the brief; AGENT-002 absent decision-maker and conflicting recorded commitments yield cited risks, dismissal and reviewed tasks (4739.367478ms)
  Error: /api/v1/workbench/opportunities answered 401: {"error":"Operator session required."}
      at json (tests/support/today-workspace.ts:16:245)
      at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
      at async Object.opportunity (tests/support/today-workspace.ts:19:104)
      at async agentRisks (tests/core/today-brief.test.ts:249:13)
      at async TestContext.<anonymous> (tests/core/today-brief.test.ts:244:2)
      at async Test.run (node:internal/test_runner/test:1054:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:744:7)
~~~

Recorded by Codex, 2026-11-19 UTC.
