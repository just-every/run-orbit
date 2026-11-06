# sd-orbit-c-f116 result

The planner-selected native capacity behavior is already implemented in the supplied base commit and passes a fresh real Orbit public-door execution. This continuation adds no product commit, source change or test registration. It preserves that exact commit on the requested product branch. The whole clause remains PARTIAL; no hold is released.

- Repository: just-every/run-orbit.
- Product branch: cloud/sd-orbit-c-f116.
- Candidate: 881c08da6a64512b18389b32ed83790d59e02f1f.
- Observed main: b305e58f673cfe0b9485e179d2678734e261c7a8, an ancestor of the candidate.
- Candidate difference from main: the supplied capacity helper, its existing managed-owner registration wiring, and its generated source lock. No application source or contract text changed.
- Counts before and after: 36 DONE, 136 PARTIAL, 32 MISSING, 204 total.
- Tests before and after: 198 registrations plus two qualification flows, 200 total.
- Plan rows changed: none. Every queue line, note, hold and release prerequisite remains unchanged. Expanded roles retain TEAM-005's existing BLOCKED prerequisite on CT contract cleanup and the resulting main.
- No PR was created: the existing Verify workflow has a branch-push entry point.

The complete execution plan is in PLAN.md. The actual command and custody results are in RECEIPT.json and the explicitly selected log files.

## Selected point and runtime probe

PROBE BASE-AGENT-011 1: raw authenticated MCP under autonomous; discovered capacity=600; admitted native create; overrun=429 Retry-After=50; early retry=429; clock recovery=200 with one native create.

PROBE BASE-AGENT-011 1: raw authenticated MCP under held; discovered capacity=600; admitted native create; overrun=429 Retry-After=60; early retry=429; clock recovery=200 with one native create.

Those capacities and delays are observed outputs, not pinned expectations. The helper obtains the limit through server discovery, uses the real signer, owner sponsor, Business policy and D1 database, and prepares only an already-established admission row. It sends raw authenticated POST requests to `/mcp`, without the retrying conformance client. It checks that real admitted writes change the effect witness, that refused writes leave native records, graph projections, history, call effects, approval effects and review effects unchanged, and that an early retry is still refused. The previously refused idempotency key creates exactly one native company after the controlled clock reaches the advertised delay.

The unchanged helper is `tests/support/agent-door-capacity-proof.ts`: setup and native effect witness at lines 13–34, discovery and established-agent preparation at lines 36–49, admitted control at lines 51–59, raw refusal at lines 61–71, early retry and recovery at lines 73–83. It is called by `tests/support/agent-door-proof.ts:219` within `tests/core/managed-owner.test.ts:7`, test “Managed owner claim verifies RER authority and creates the native owner/session exactly once”.

Fresh execution passes with pinned Node 22.20.0, one registered test, zero failures, duration 93189.028781 ms. An initial execution on the VM's Node 24.19.0 also passed; the pinned-runtime run is the authoritative local receipt. Native admission, transport and the Orbit adapter were inspected. No demonstrated source defect required a correction.

## Acceptance coverage

| Acceptance sentence | Result on candidate | Proof or remaining scope |
| --- | --- | --- |
| 1. A rate overrun returns 429 with Retry-After. | PASS locally under both required policies | Managed-owner test above; capacity helper lines 36–83; fresh Node 22 receipt in managed-owner-node22.log. Exact-SHA Verify receipt is described below. |
| 2. A per-day cap of three outside recipients sends the fourth to the rule past the cap. | OMITTED; unclaimed | Daily recipient caps remain outside the planner-selected point. |
| 3. An exhausted spend cap returns budget_exhausted with no partial effect and shows spend. | OMITTED; unclaimed | Spend reservations, exhaustion and spend display remain unproved. |
| 4. Under no cap, spending runs and appears in usage; zero-spend calls are unaffected. | OMITTED; unclaimed | No-cap and provider-spend qualification remain unproved. |
| 5. Usage shows calls, decisions by class, money and provider spend per agent. | OMITTED; unclaimed | Full usage reconciliation remains unproved. |
| 6. Pause and Pause all stop the next call within 60 seconds, and resume restores access. | PARTIAL existing proof only; unclaimed | Existing native Pause refusal and blocked-class no-effect assertions remain at agent-door-proof.ts lines 139–147; full timed Pause, Pause all and resume qualification remains unproved. |
| 7. An agent token cannot resume. | OMITTED; unclaimed | Agent-resume refusal remains unproved by the cited seed journey. |

No acceptance sentence or requirement was changed. No new policy default was adopted. This is a bounded native capacity proof and does not establish provider cost, daily business limits or complete Pause behavior.

## DONE riders

| Rider | Result | Evidence or reason |
| --- | --- | --- |
| 1 | FAIL for whole clause; PASS for selected point | Capacity is reached and inspected through the native door, but acceptance points 2–7 are not fully reached by this round's proof. |
| 2 | PASS for selected point | Capacity helper lines 51–83 admits native writes, demonstrates a nonempty effect witness, then refuses unsafe writes without native effects before recovery. |
| 3 | PENDING exact-SHA overall green | The existing push Verify plan includes the managed-owner file in its core glob. Current and previous exact-SHA runs are recorded in the CI receipt. No whole-clause DONE claim rests on a pending or failed run. |
| 4 | PASS local exact candidate | managed-owner-node22.log records fresh execution at 881c08da6a64512b18389b32ed83790d59e02f1f; no source changed afterwards. |
| 5 | INSPECTED; unchanged | BASE-AGENT-011 itself owns this duty. No receiving clause or inheritance claim changed. |
| 6 | PASS mechanical; judgments unchanged | Generator write and check both exited 0. Generated views were restored from main; Status, Gap, Evidence, provenance and counts are byte-for-byte unchanged from main. |
| 7 | PASS | Acceptance text, coverage and rulings were not edited. |
| 8 | PASS selected capacity boundary | Real signed owner-sponsored requests run under autonomous and held policies; rate refusal precedes native effects. Existing native removal, email-change and policy replay refusals are retained. No new authority path was added. |
| 9 | PASS honest boundary | Provider-spend and external qualification are explicitly unclaimed. |
| 10 | NOT APPLICABLE | No custody, consent, spending or authority policy was introduced or changed. |
| 11 | PENDING guarded landing | Product branch is pushed; main remains the observed earlier commit. Publication scanning and exact-main Run site belong to the Mac lander. No landing or count increase is claimed. |

## Mechanical and pre-ready checks

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0; ledger=none exit=0.

The following all passed: touched managed-owner registration on pinned Node, typecheck, first-party profile check, contract generation, source lock regeneration and integrity check, and test budget. The product worktree is clean after regeneration and restoration. No view file was committed. Refresh and rebase onto origin/main were a no-op before publication. All candidate commit identities and complete commit messages were inspected; authors and committers are fleet, with no co-author trailer. The inherited application and test assertions are preserved. No assertion was removed, narrowed, skipped or placed behind a width or branch condition. No screen changed, so new browser screenshots and UI polish work are not applicable to this capacity-only continuation. Erasure, replay and revoked-authority paths are unchanged; their broader obligations are not newly claimed.

Cloud publication scan: commit=881c08da6a64512b18389b32ed83790d59e02f1f; complete=UNESTABLISHED; historyScanned=UNESTABLISHED; findings=UNESTABLISHED. The cloud-specific route delegates the full-history publication scan and guarded landing to the Mac. This report makes no COMPLETE or zero-finding claim.

## CI and custody

Observed main has green exact-SHA push Verify 42217956400 and Run site 42217956677. Earlier Verify 42214478644 is also green on that main SHA.

Product push succeeded on the first guarded attempt. Remote ref readback confirms cloud/sd-orbit-c-f116 equals 881c08da6a64512b18389b32ed83790d59e02f1f. The branch push started Verify 42231683336 on that exact SHA. Initial discovery reported in_progress. No dispatch or rerun was requested.

The earlier supplied-base Verify 42225041552 failed job 127917289309, shards (batch-8), in fold-domain-0. Its actual assertion is unrelated to MCP capacity: `newtests/t096/browser-sales-report.ts:101`, called by `newtests/t096/report-disclosure.test.ts:98`, expected one saved sales result but received zero after 5000 ms. The completed job's archive was read once with the prescribed gh command. CI-FAILURE.txt contains the actual failure excerpt. No repair was edited before exact-command reproduction. The exact candidate batch completed with exit 0: all three registered cases passed in 641401.795074 ms, including the original failing saved-result assertion and all subsequent archive checks. Its build and shard receipt bind the execution to the exact candidate. The original CI assertion did not reproduce, so no speculative source repair was attempted. The same shard was then run on observed main b305e58f673cfe0b9485e179d2678734e261c7a8 on this same runner. Main reproduced the identical saved-sales-result failure with exit 1, two passing cases and one failing case, duration 318402.495186 ms. Under the supplied RED VERIFY rule, a failure also present on main is classified as a flake and is reported to FV; it is not a source repair round or a newly introduced MCP defect. Actual command receipts are in candidate-shard.json and main-shard.json. No source or assertion was changed, no repair was attempted and no rerun was dispatched.

## Claim

CLAIM BASE-AGENT-011 PARTIAL points=1 tests=tests/core/managed-owner.test.ts#Managed owner claim verifies RER authority and creates the native owner/session exactly once

GAP BASE-AGENT-011: Points 2–7 remain unclaimed: daily recipient caps, spend reservations and exhaustion, no-cap behavior, usage reconciliation, timed Pause and Pause all, resume and agent-resume refusal. Existing holds and prerequisites remain unchanged.

POST lanes/fv/INBOX.md: FLAKE just-every/run-orbit run=42225041552 job=127917289309 also fails on main b305e58f673cfe0b9485e179d2678734e261c7a8 on the same cloud runner: saved sales results expected 1, received 0 at newtests/t096/browser-sales-report.ts:101; candidate exact fold-domain-0 batch passes 3 of 3; no repair edit.

## Terminal handoff

Latest exact-SHA REST observation: Verify 42231683336 is in_progress on 881c08da6a64512b18389b32ed83790d59e02f1f. Seven of the ten allowed GitHub calls were used, with one watcher and at least 300 seconds between active-run status observations. No overall green Verify or landing is claimed. Earlier red Verify 42225041552 is explicitly retained; its only product shard failure was independently reproduced on main and the exact candidate shard passes. No speculative fix, CI dispatch or failed-job rerun was performed.

The selected point is locally proven and its supplied source is unchanged. The remaining clause points and every existing hold remain unclaimed. There is no new product blocker. The terminal signal is PUSHED while the new Verify is pending. Main equality with the candidate, the full-history publication scan, guarded landing, and exact-main Run site remain with the fleet.

The completed main comparison worktree was removed. The product clone and its dependencies are removed after report publication and evidence-ref readback. All selected reports and actual receipts remain outside the product clone in the packet directory.
