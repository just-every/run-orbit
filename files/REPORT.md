# sd-orbit-c-f106 results

Repository: `just-every/run-orbit`. Branch: `cloud/sd-orbit-c-f106`.

OPP-007 remains PARTIAL. This round closes only the planner-selected close-clock deficit in acceptance point 1. The existing implementation already satisfies that selected outcome, so no production source correction is needed. The existing single request-scheduling registration is extended; no test or assertion is removed or narrowed, and no new registration is added.

The journey creates a distinct deal through authenticated Records with an explicit null owner and a future expected close time. Fresh Records and NOW reads prove it is open and outside NOW before the deadline, with no queue.now event. The controlled clock crosses that deadline. Ordinary request work races hosted timer execution and repeated hosted ticks. Fresh authenticated Records and NOW reads show the same deal in NOW exactly once, the close-deadline reason, exactly one timer-sourced feature timeline transition, null actor identity and null actor name. Score, band, owner, stage and lifecycle remain unchanged. Existing scheduled-send single-submission and awaiting-response transition assertions remain active.

No UI is changed. This selected point is an HTTP and timer journey; new browser screenshots are not applicable. No migration, new policy, provider request, account, key or external consent is needed for this selected point. No hold is released. OPP-003 scoring, OPP-006 ordering, RECORD-007's creation-default conflict and TEAM-005's existing dependency remain untouched.

The complete omitted remainder remains recorded in OPP-007's Gap: stale-clock behavior; genuine five-working-day awaiting-response construction in the workspace timezone; complete form, reply, booking and failure reason and transition reconciliation; all NEXT and removal paths; the complete event matrix and one transition per other triggering event. No acceptance sentence changes. No DONE promotion or count change. Before and after: 36 DONE, 136 PARTIAL, 32 MISSING; 204 total. Plan change: only mark the selected OPP-007 close-clock proof present, leave its queue entry PARTIAL and every other queue line, note, hold and release prerequisite unchanged.

## Plan and proof mapping

The actual plan is retained in PLAN.md. Acceptance point 1 is a compound journey; this round establishes only its expected-close deadline portion. The public doors are POST `/api/v1/records/opportunity`, GET `/api/v1/records/opportunity/:id` and GET `/api/v1/opportunities/now`, followed by the existing hosted scheduled handler in the same race registration. The test is `tests/core/request-scheduling.test.ts`, “a fresh hosted schedule sends once through ordinary requests racing Cron, and due follow-ups return to NOW”. Its baseline prevents vacuous already-NOW proof. Its final reads check the observable record and timeline, not only internal storage.

The production files inspected were `src/core/features/outreach/timing-repository.ts`, `src/core/features/outreach/scheduler.ts`, `src/core/features/records/routes.ts`, `src/core/features/records/repository.ts` and `src/core/features/opportunities/repository.ts`. The timer batches transition selection, timeline insertion and opportunity update atomically; the existing queue-state fence suppresses later duplicate selection.

## DONE riders and pre-ready review

There is no DONE claim or judge request. The rows are assessed for this partial candidate:

1. PARTIAL: the selected close-clock outcome is reached and checked; the full clause's other outcomes remain unproved and named in Gap.
2. PASS for the selected point: a real persisted, distinct, non-NOW deal is used; disabling only the close trigger made the same journey fail with actual queue state none instead of now. No unsafe money or authority verb is changed.
3. UNQUALIFIED for DONE: exact-SHA push Verify 42207947654 concluded failure solely from the expected generated-view check, with dependent missing artifacts and aggregate failure; runtime shards were skipped. The committed journey passes locally on that exact SHA. The explicit cloud generated-view exception permits this partial handoff, and the lander must regenerate views and obtain green CI. No full-green runtime Verify is claimed.
4. PASS: the final touched journey passes on committed candidate 9441ea5ecb98b11306978f3228d55807f383f46d after the negative control was restored. No source or test changes follow that run.
5. UNCHANGED: the clause already cites BASE-INPUT-001. No inherited duty is added, removed or claimed complete.
6. PARTIAL: Evidence is updated for this proof and the Gap preserves missing outcomes. Generated views are written and checked locally, then restored to main for the lander. Historical judgment provenance is preserved because this round makes no judgment award.
7. PASS: no acceptance text, CT rider, ID or coverage obligation changes.
8. NOT APPLICABLE to the change: no permission, refund or authority path changes.
9. PASS: no live provider or legal boundary is claimed.
10. NOT APPLICABLE: no policy default is introduced.
11. PENDING guarded landing: publication scan, main equality, final Verify and Run site custody remain with the fleet. Cloud-side publication scanning is not claimed.

Every existing assertion remains; new assertions have no width or branch condition. Authority, erasure and replay product paths are unchanged. The selected replay risk (duplicate timer transition) is exercised by the race and repeated hosted timer. No screen is touched. No new email-shaped fixture value or provider-shaped credential value is introduced. Local execution uses the supplied toolchain shim, pnpm 10.12.4 and the VM's Node 24.19.0; exact-SHA CI uses the repository's pinned Node 22.20.0. The supplied toolchain script keeps a newer installed Node. Build and browser proof are not needed for this test-only native-HTTP extension.

## Custody

Candidate: `9441ea5ecb98b11306978f3228d55807f383f46d`; main basis: `d89ffcc89d4e87b5276f13298210de9eb21f4f35`. The cloud push guard published the named product branch on attempt 1. All candidate authors and committers are fleet identity, with no trailers. All 204 Status rows and all 458 table rows remain present. Only CONTRACT.md, the existing request-scheduling test and the generated source lock are committed.

Terminal provenance, commands, real exit codes and CI observations are retained in RECEIPT.json and the explicitly selected logs. No product READY or landed claim follows from evidence transfer. Publication scanning is NOT RUN in cloud; the fleet must require COMPLETE, full history, zero findings on the exact integration candidate before landing. No PR is required: Verify has a push entry point.

PROBE OPP-007 acceptance-1 selected close clock: Records POST with explicit null owner and future expected close, fresh Records and NOW reads, controlled clock crossing, ordinary requests racing and repeated hosted timers -> one NOW row, one queue.now transition, close reason, timer source, feature actor with no human identity, and unchanged score, band, owner, stage and lifecycle.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0, generated views restored from origin/main; ledger=none exit=0.

Selected proof lines in tests/core/request-scheduling.test.ts: 36-62 create and freshly read the non-NOW deal; 66-72 cross the deadline and race/repeat timers; 79-93 read and assert the single explained transition and unchanged sales state. Existing scheduled-send and awaiting-response checks remain at 73-77. The behavior-removal control disables only close-deadline selection and fails at line 80, with exit 1. Its source change is restored and absent from the product commit. No assertion was removed, skipped, narrowed or conditionally gated.

Local checks: exact-SHA touched test 1 passed, 0 failed; typecheck, first-party validation, contract write and check, source lock write and check, and test-budget check all exit 0. The candidate intentionally retains main's generated views; running the generator check on that exact candidate returns exit 1 only because ACCEPTANCE.md differs from generated content. This expected condition is retained in views-candidate-expected.log and is left for the lander. No view file is committed.

Main-basis CI at d89ffcc89d4e87b5276f13298210de9eb21f4f35 was green: Verify 42198798726 and Run site 42198798685. The candidate has its own push Verify 42207947654; main's run is not offered as candidate proof. Six counted GitHub calls were used: main-basis discovery, candidate discovery, one run poll after five minutes, job listing, and one failed-log read for each of the two failed jobs. No rerun, dispatch or PR has been created.

## Final CI disposition

Exact-SHA push Verify 42207947654 on 9441ea5ecb98b11306978f3228d55807f383f46d concluded failure. Plan job 127859162830 passed. Source job 127859341936 stopped at `pnpm exec node src/base/contract-docs.mjs check`: “ACCEPTANCE.md: generated content differs; run contract-docs write.” Exit 1. Its subsequent always-run source-artifact upload failed because the stopped source stage had produced no artifacts. Runtime shards were skipped. Aggregate job 127859552121 failed because SOURCE was failure and SHARDS skipped, and its artifact upload had no combined result. Neither failed log shows a runtime assertion failure. The local exact-SHA generator check reproduces the same expected ACCEPTANCE.md diagnostic; write and check passed before restoring views. This is exactly the cloud exception for uncommitted generated views and their dependent jobs. No repair, rerun or dispatch is attempted. It is not reported as a green runtime Verify.

The local command `pnpm exec tsx --test --test-concurrency=1 tests/core/request-scheduling.test.ts` passes on committed 9441ea5ecb98b11306978f3228d55807f383f46d: one test passed, none failed. Source lock check also passes on that SHA. No substantive blocker is known for this selected partial proof. The fleet owes generation, source lock regeneration on integration, exact-final green Verify, COMPLETE full-history scan with zero findings and exact-main Run site. No READY claim implies those have already happened.

Failed job log commands, invoked once each and both successful: `gh run view 42207947654 --repo just-every/run-orbit --job 127859341936 --log-failed` and `gh run view 42207947654 --repo just-every/run-orbit --job 127859552121 --log-failed`. Published logs retain actual command, failure and dependent failure output while omitting workflow environment blocks. No environment dump, secret material or signed transport URL is selected for evidence.
