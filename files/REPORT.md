# Orbit 0.4.12 release metadata investigation

Codex, 2026-11-19 UTC. Round sd-orbit-release-0-4-12-c1.

## Decision

Case (b) in the brief. The Today Brief fixtures on current Orbit main share
a fixed session issuance time. At 2026-11-19T12:00:00Z, those sessions reached
their real-clock expiry. The prior release branch is a single metadata child
of the exact tested main commit. The local product branch was created from
that main commit for the investigation. There is no product commit, product
push, PR, tag or release from this round. Evidence is attached to the
advertised main SHA on the dedicated evidence ref.

No contract clause claimed; this is release metadata.

## Plan and results

1. Clone Orbit main shallow and blobless, fetch the 0.4.12 branch, and deepen
   only to establish ancestry and trace the fixture history.
2. Retrieve the failed attempt's batch-16 archive once. Identify both failing
   assertions and the last confirmed passing batch on the exact main SHA.
3. Compare the old candidate with main, then build and seal clean main with
   Node 22.20.0, pnpm 10.12.4 and rer 0.2.113. Run the full planned batch-16
   entry point with the same push tier and CI port settings, plus a focused
   Today Brief reproduction.
4. Trace the shared expiry boundary and the commits that introduced it.
   Keep the release metadata pending and return the diagnostic packet for
   the separate defect round.

| Item | Observed |
| --- | --- |
| Main tested | 2288bfae201961fdb966552dc86655a76b2e0247 |
| Prior 0.4.12 product branch | cloud/sd-orbit-release-0-4-12 at 0e97e8b4d5f543afe2e8c144217403e89652f0a5 |
| New product branch | cloud/sd-orbit-release-0-4-12-c1, unpublished |
| Parent of prior 0.4.12 candidate | 2288bfae201961fdb966552dc86655a76b2e0247 |
| Prior candidate diff | CHANGELOG.md, RELEASE.json, RELEASE.md, package.json version, seed.json version, sources.lock.json |
| Product code, workflow and test diffs | 0 |
| Core migrations | 84 to 84, byte-identical from v0.4.11 through main and the earlier candidate |
| Contract counts | 42 done, 130 partial, 32 missing, 204 total before and after |
| Test inventory | 198 registered cases plus 2 qualification flows, 200 total before and after |
| Declared setup hash | Actual and declared match on main and prior candidate, b50fa9e6ead13cc81bd7a994833e3afec8c469cf66023a679d550da6b1ea8013 |
| Local build and build seal verification | Passed on exact main |
| Clean-main batch-16 | Exit 1 in core-8, 15 passed and 2 failed |
| Clean-main focused Today Brief file | Exit 1, 2 passed and 2 failed, same assertions |
| Contract docs check and edition source lock check | Passed on exact main |
| Exact-SHA CI for earlier candidate | Verify 44519677469 attempt 2 failed at batch-16 job 135566036109 and aggregate job 135573532708 |
| Last confirmed green batch-16 on exact main | Verify 44414160948, job 135191810815, completed 2026-11-18T23:01:00Z |
| Other green exact-main Verify runs | 44405043610 (push), 44468725120 (schedule) |
| Explicit GitHub CLI operations | Four, including the single failed-job archive read |

## Two failing assertions in tests/core/today-brief.test.ts

- The seller's simulated-day journey calls exerciseSalesTasks at line 95.
  The helper's tests/support/sales-tasks.ts:79 expects 200 from DELETE
  /api/v1/records/contact/<id>. It gets 500 with “Record operation failed;
  no success was confirmed.” The record route logs IMPORT_ATOMIC_GUARD.
  The simulated JavaScript clock admits the session at the HTTP door.
  src/core/features/imports/erasure.ts:16 checks the same session's expiry
  against D1's real UTC clock in the atomic erasure authorization predicate.
- The summary and account-risks journey resets mocked Date at line 243 and
  reuses its existing sessions at lines 244 and 249. The first opportunity
  POST expects 201 via tests/support/today-workspace.ts:19. It gets 401 with
  “Operator session required” when the HTTP authentication clock goes back
  to real time.

Each fixture issues its native session at mocked time 2026-11-05T12:00:00Z.
tests/support/test-auth.ts:23-27 uses the 14-day native lifetime in
src/core/features/identity/store.ts:19, so real-clock expiry is
2026-11-19T12:00:00Z. The exact-main passing jobs preceded that instant.
The 0.4.12 rerun failed on both assertions after it.

## Introduction range

- a4ada5e8ee73af1dd57154b1e11b03cc5ed5816e (2026-11-04) added the timer
  reset before agentRisks. At the time that test issued sessions at the
  current date.
- 32c41a210e1488e53b36c79d6d5056a1a9ab60e3..6f00d13900a5e2a5fb972b96119f70b5c118bc23
  (2026-11-06T18:13:11Z) introduced the fixed time for both journeys. The change
  put the first journey's existing erasure call under the mocked clock
  and made the summary journey's timer reset reuse a fixed-date session.
  Git confirms this commit is already an ancestor of the v0.4.11 release
  commit a4fcbfcd72fa4253826f43d0b0de02275094f86d.
- The verified scope, v0.4.11..2288bfae, contains 17 commits. The fixed-date
  fixture predates that range.

## Defect-round handoff

Repair the Today Brief test clocks and session lifecycle together. Keep
the simulated business-time assertions and atomic session expiry checks.
The two failures can be tested independently of the 0.4.12 metadata round.
The exact local commands and observed output are in the main reproduction
receipt.
