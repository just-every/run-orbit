# Orbit Today Brief test clock

Codex · 2026-11-19T14:58:54Z

- Repository and branch · just-every/run-orbit · cloud/sd-orbit-fix-today-brief-1
- Baseline main · 2288bfae201961fdb966552dc86655a76b2e0247
- Candidate · bfbe479f949fe859556f15849ac49f098208a6bd
- Candidate tree · 4cda9f1444f4a72b20c8068f3a61373f0936e07d

No contract clause claimed; this is a test-clock fix.

## Plan and execution

1. Build clean main and run the Verify batch containing core-8 and rer-operator-small-phone. Both reported Today Brief failures reproduced in core-8. The D1 erasure transaction raised IMPORT_ATOMIC_GUARD and returned HTTP 500 on the contact records route. Resetting the second test's Date mock exposed its expired session and the next authenticated request returned HTTP 401. The batch runner stopped at the red core shard, so the 320-pixel journey ran separately through the same shard runner with the baseline build.
2. Audit tests/ and newtests/ for Date overrides, injected clocks, fixed timestamps, session issuance, and requests after timer resets. Trace fixed-date sessions into SQLite wall-time predicates. The matching journeys were Today Brief, capture archive, and outbound boundaries. Calendar examples, browser-only clocks, intentional expiry cases, and entirely simulated credentials were checked for their use of the wall clock.
3. Anchor the affected fixture clocks to each run while preserving existing assertions and relative deadlines. Regenerate and validate the source lock after editing the tests.
4. Run the candidate source shard, seal its emitted build, execute batch-16, and run all changed test files directly. Fetch and rebase against current main before the single product push. Read Verify for the advertised candidate SHA.

## Changed files

- tests/core/today-brief.test.ts shares one wall-time start for both linked cases and derives the handoff due date as one day before that start. The initial native sessions expire 14 days after the shared start. Their remaining validity at a real-time check is 14 days minus the time already spent in the run. The existing simulated renewals and real-time erasure guard still execute.
- tests/core/capture-data.test.ts and tests/core/outbound-boundaries.test.ts move each weekday-sensitive clock to the next matching UTC weekday and time. Initial native session expiries are 14 to less than 21 days past wall time. The calendar order, dispatch offsets, and session renewal remain intact.
- tests/support/test-clock.ts computes the next occurrence of the weekday and time in a fixture reference.
- tests/support/opt-out-archive.ts derives the scheduled approval and the ten-year capability check from the corresponding fixture time.
- sources.lock.json records the test and helper hashes.

## Results

| Check | Main | Candidate |
| --- | --- | --- |
| core-8 | 15 passed, 2 failed | 17 passed, 0 failed |
| rer-operator-small-phone | 1 passed | 1 passed |
| Registered cases | 198 | 198 |
| Qualification flows | 2 | 2 |
| Contract clauses | 42 done, 130 partial, 32 missing | 42 done, 130 partial, 32 missing |

- The source shard passed all 10 stages, including the build, typecheck, source lock, first-party verification, and contract views check. The shared build seal and check passed.
- The focused run passed all 6 tests in the three changed test files. Its staged tree matches the candidate tree.
- GitHub Verify run 44542147281 reported success on the exact candidate SHA. The exact-SHA batch-16 job 135625590773 concluded success. [Verify run](https://github.com/just-every/run-orbit/actions/runs/44542147281)
- The fleet's publication scan and landing run on the Mac.

See LOCAL-CHECKS.json for actual local verdicts and VERIFY.json for the exact-SHA CI receipt.
