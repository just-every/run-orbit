# Orbit Verify attempt 2 batch-16 receipt

Source SHA: 0e97e8b4d5f543afe2e8c144217403e89652f0a5
Verify run: 44519677469, attempt 2
Batch job: 135566036109, failure
Aggregate job: 135573532708, failure
Failed step: Verify routine product shard
Batch: ["core-8", "rer-operator-small-phone"], stopped in core-8
Log archive: fetched once with exit 0

https://github.com/just-every/run-orbit/actions/runs/44519677469/job/135566036109

Failed cases in tests/core/today-brief.test.ts:

- TASK-001 TEAM-004 BRIEF-001 BRIEF-002 AI-003 a seller starts each simulated day from one brief built from records only: replies, meetings, observed and inferred signals, overdue promises and unresolved identity, each line linked to its evidence
- BRIEF-003 AI-001 AI-002 AI-003 AI-004 an account summary is sent only as previewed, must cite the brief, and fails visibly without disturbing the brief; AGENT-002 absent decision-maker and conflicting recorded commitments yield cited risks, dismissal and reviewed tasks

Relevant raw-message excerpt, with the synthetic record ID and checkout prefix shortened.

~~~text
2026-11-19T12:48:40.1060265Z Orbit records: unexpected Error: IMPORT_ATOMIC_GUARD
2026-11-19T12:52:42.3285708Z ℹ tests 17
2026-11-19T12:52:42.3287891Z ℹ pass 15
2026-11-19T12:52:42.3288816Z ℹ fail 2
2026-11-19T12:52:42.3306520Z ✖ failing tests:
2026-11-19T12:52:42.3307237Z test at tests/core/today-brief.test.ts:1:2574
2026-11-19T12:52:42.3313322Z   Error: /api/v1/records/contact/<id> answered 500: {"error":"Record operation failed; no success was confirmed."}
2026-11-19T12:52:42.3317722Z       at async exerciseSalesTasks (tests/support/sales-tasks.ts:79:2)
2026-11-19T12:52:42.3319517Z       at async TestContext.<anonymous> (tests/core/today-brief.test.ts:95:13)
2026-11-19T12:52:42.3323107Z test at tests/core/today-brief.test.ts:1:21185
2026-11-19T12:52:42.3328155Z   Error: /api/v1/workbench/opportunities answered 401: {"error":"Operator session required."}
2026-11-19T12:52:42.3333708Z       at async agentRisks (tests/core/today-brief.test.ts:249:13)
2026-11-19T12:52:42.3335224Z       at async TestContext.<anonymous> (tests/core/today-brief.test.ts:244:2)
2026-11-19T12:52:42.4490743Z ##[error]Process completed with exit code 1.
~~~

Last confirmed green batch-16: job 135191810815, Verify 44414160948, exact main SHA
2288bfae201961fdb966552dc86655a76b2e0247, completed 2026-11-18T23:01:00Z.
https://github.com/just-every/run-orbit/actions/runs/44414160948/job/135191810815

Exact-main Verify REST also returned success for push run 44405043610 and scheduled run
44468725120. The schedule run completed at 2026-11-19T06:07:37Z.

Recorded by Codex, 2026-11-19 UTC.
