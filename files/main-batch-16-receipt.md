# Clean main batch-16 reproduction

SHA: 2288bfae201961fdb966552dc86655a76b2e0247
Tree: 392187aa90b286fbb10cfbe3e06e6e9426bca2bf
Shard started: 2026-11-19T13:04:05.448Z
Shard finished: 2026-11-19T13:19:50.067Z
Toolchain: Node 22.20.0, pnpm 10.12.4, rer 0.2.113
Build and seal: exit 0
Batch exit: 1
Cases: 17 total, 15 passed, 2 failed

~~~sh
pnpm install --frozen-lockfile
cloud_run pnpm exec rer build
node scripts/verification-build.mjs seal
node scripts/verification-build.mjs check
export ORBIT_VERIFY_PREBUILT=1 ORBIT_VERIFY_JOURNEYS=1 ORBIT_VERIFY_TIER=push
export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium
cloud_run node scripts/verification-batch.mjs '["core-8","rer-operator-small-phone"]'
~~~

The checkout was clean at start. The command used the Verify workflow's CI
port values and prepared fresh local D1 state. The batch stopped in core-8
on the same two assertions as the earlier CI attempt. Its small-phone shard
was not reached.

Actual output, with the synthetic record ID and checkout prefix shortened.

~~~text
✔ BASE-DATA-001 abort preserves the original administrator, session and exact metadata and a concurrent export part cannot revive private transfer data (136842.29151ms)
✔ API-002 credential custody and DATA-002 contact erasure invalidate exports, downloads and restore copies and fences a snapshot created during discovery (99498.583303ms)
✔ CAPTURE-007 DATA-002 BASE-DATA-003 erasing a contact erases their captured originals and proposals; the audit trail keeps counts and anonymous replay proofs (112575.531555ms)
✔ CAPTURE-007 DATA-002 erased provider originals stay erased after expired history, crashes and reconnect while new evidence remains eligible (44686.182498ms)
✔ CAPTURE-007 DATA-002 erasure fences an already-resolved capture commit and its later replay (36821.129981ms)
✔ PUBLIC-004 email link: one answer for every address, inert preview, one-use POST confirmation, expiry and removed-operator refusal (29851.887798ms)
✔ PUBLIC-004 sign-out by a form before hydration revokes the session; foreign origins are refused (38.082071ms)
✔ AUTH-5 step-up guards export, delete and minting delegation credentials with a fresh email proof in the asking session (3150.82785ms)
✔ AUTH-5 dev sessions and the credentials they mint count only behind the checkout key (3708.939243ms)
✔ OUT-006 BASE-OPS-004 transient rate limits stop after five attempts within one hour and notify once (27939.881131ms)
✔ OUT-010 OUT-018 one user's volume never consumes another's budget and every deferral names its limit (42391.462106ms)
✔ OUT-007 OUT-009 OUT-012 a signed provider unsubscribe stops the recipient and schedule within sixty seconds and returns the opportunity to NOW once (28397.138037ms)
Orbit records: unexpected Error: IMPORT_ATOMIC_GUARD
✖ TASK-001 TEAM-004 BRIEF-001 BRIEF-002 AI-003 a seller starts each simulated day from one brief built from records only: replies, meetings, observed and inferred signals, overdue promises and unresolved identity, each line linked to its evidence (16435.189402ms)
✖ BRIEF-003 AI-001 AI-002 AI-003 AI-004 an account summary is sent only as previewed, must cite the brief, and fails visibly without disturbing the brief; AGENT-002 absent decision-maker and conflicting recorded commitments yield cited risks, dismissal and reviewed tasks (4075.652617ms)
✔ INTEGRATE-002 BRIEF-004 RECORD-010 RECORD-017 RECORD-023 OUT-001 cited meeting plans, mention authority and Zoom lifecycle custody (219886.180239ms)
✔ CALL-001 owner-managed Twilio dialing reviews exact numbers, submits once, orders signed receipts and preserves privacy and report counts (13216.885867ms)
✔ delegation and handoff native routes against isolated real D1 (29990.969745ms)
ℹ tests 17
ℹ suites 0
ℹ pass 15
ℹ fail 2
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 898283.664787
✖ failing tests:
test at tests/core/today-brief.test.ts:1:2574
✖ TASK-001 TEAM-004 BRIEF-001 BRIEF-002 AI-003 a seller starts each simulated day from one brief built from records only: replies, meetings, observed and inferred signals, overdue promises and unresolved identity, each line linked to its evidence (16435.189402ms)
  Error: /api/v1/records/contact/<id> answered 500: {"error":"Record operation failed; no success was confirmed."}
      at Object.json (tests/support/today-workspace.ts:16:245)
      at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
      at async exerciseSalesTasks (tests/support/sales-tasks.ts:79:2)
      at async TestContext.<anonymous> (tests/core/today-brief.test.ts:95:13)
      at async Test.run (node:internal/test_runner/test:1054:7)
      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:296:3)
test at tests/core/today-brief.test.ts:1:21185
✖ BRIEF-003 AI-001 AI-002 AI-003 AI-004 an account summary is sent only as previewed, must cite the brief, and fails visibly without disturbing the brief; AGENT-002 absent decision-maker and conflicting recorded commitments yield cited risks, dismissal and reviewed tasks (4075.652617ms)
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
