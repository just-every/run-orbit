# Orbit exact-head CI triage

Task: sd-orbit-c-f176-fix1-rebased-ci-triage-1. Repository: just-every/run-orbit. This is an investigation and one permitted failed-job retry, with no product edits or landing admission.

## Candidate and original failure

The investigated candidate is **fc2af9e59b27a655602ab4c0deca8cac1b48bc59**, Verify **43246891287**, attempt **1**. The actual workflow branch is `cloud/sd-orbit-c-f176-fix1-rebase-fc2af9e59b27a655602ab4c0deca8cac1b48bc59`; the assignment names the originating branch `cloud/sd-orbit-c-f176-fix1`. The earlier successful Verify **43219714316** on candidate prefix `3e3d6fe7` is supplied context only and cannot establish success on this different head.

Run URL: https://github.com/just-every/run-orbit/actions/runs/43246891287

The failed product job is **131283662502**, **shards (batch-14)**, on **GitHub Actions 1000315000**. Its `Verify routine product shard` step failed at 2026-11-12T15:37:49Z. The logical shard is **runtime-launch**, and the failing stage is `pnpm run test:worker`, which invokes `tsx scripts/verify-worker.ts`.

The actual assertion is:

> AssertionError [ERR_ASSERTION]: Unconfigured emitted Worker starts on its assigned host
>
> at verifyUnconfiguredHost (.../scripts/verify-unconfigured-host.ts:10:175)
> at async .../scripts/verify-worker.ts:26:24
>
> actual: false; expected: true; operator: ==

`verifyUnconfiguredHost` launches the emitted Worker with Wrangler, an empty `AUTH_ORIGIN`, the assigned proof port plus one, and HTTP Host `fresh-install.example`. It requests `/health` up to 100 times, sleeping 100 ms between attempts, and requires a 200 response. This readiness assertion failed before the subsequent sign-in, session, public-root and private-API assertions could run. The child process uses `stdio: 'ignore'`; the archive therefore does not expose its exit diagnostics or the observed health response. The assertion proves failure to obtain readiness, not its underlying cause.

All 20 product jobs have only attempt 1 in the initial `filter=all` job response: **19 passed; 1 failed**. No prior retry was recorded for the failed shard on this exact head. The aggregate job **131299331175** was also red because required work failed and its combined verdict artifact was absent. It is a consequence of the product failure, not the failed product shard to retry.

## Retry and investigation method

At 2026-11-12T16:06:28Z the task requested **only job 131283662502** through `POST repos/just-every/run-orbit/actions/jobs/131283662502/rerun`. GitHub accepted the request. No whole-workflow rerun, successful-shard retry, aggregate-job rerun request, or new Verify dispatch was made. The exact-head status subsequently reported attempt 2 in progress. Attempt 2 completed with failure; the final result is recorded below.

The failed job archive was read once using the specifically authorized command:

`gh run view 43246891287 --repo just-every/run-orbit --job 131283662502 --log-failed`

That command succeeded. The packet retains the actual failed-command and assertion excerpt. No direct job-log blob download was attempted. Run status is polled by REST at least 300 seconds apart by a single bounded watcher, within the ten-command gh budget. The command receipts distinguish actual responses from interpretation.

## Main comparison and same-runner limitation

The observed main checkout is **eab0faafccd2eb0945dddb7d0f52c30ce573c04c**. Its `.github/workflows/verify.yml`, `scripts/verify-unconfigured-host.ts`, and `scripts/verify-worker.ts` are byte-identical to the candidate's files. `source-comparison.json` records both hashes for each path. This is static evidence only; no main execution result is claimed.

Existing Verify dispatch inputs offer only release qualification. The hosted shard checks out the triggering revision, runs a complete planned batch, and has no baseline-ref, single-test override, or runner-affinity input. The shard executor prepares state and runs the other launch checks before the emitted Worker proof. Using dispatch or the complete batch as a substitute would violate the assignment's targeted-main constraint. The cloud heavy-slot stand-in runs on this VM, rather than the failing GitHub-hosted runner.

The retry remains red. The precise unresolved dependency is the fleet's existing targeted same-runner baseline facility: execute only this failing unconfigured-host proof against current main on the same runner as the candidate, with the required emitted build and prepared D1 state. This cloud has no such controller or workflow entry point. An execution on this cloud VM would not establish that comparison. Main has not been tested, and a regression versus baseline has not been established.

## Custody and counts

The local task branch `cloud/sd-orbit-c-f176-fix1-rebased-ci-triage-1` was created from main at **eab0faafccd2eb0945dddb7d0f52c30ce573c04c** solely for the declared clone and report transport. It has no new product commits and is not pushed. No PR was created. Product files, tests, contract statuses, generated views, locks and landing records were not changed. The evidence manifest's `product_head` describes this unchanged local checkout; the investigated failing candidate is explicitly named above and in `CI-RECEIPT.json`.

Before and after source clause counts: **42 done, 130 partial, 32 missing; 204 total**. Clause status changes: **none**. Gate FIX increment: **0**. The triage must not be treated as a FIX round or as landing admission. No READY or product PUSHED claim is made for the report-only evidence publication.

The full plan is in `PLAN.md`; actual job, status, retry, assertion and source comparison receipts are included separately. All packet files are selected explicitly for public evidence publication. No credential bundle, environment dump, private held-out material, symlink, or full unreviewed execution archive is selected.

## Final result and narrow next action

Verify **43246891287**, attempt **2**, completed **failure** on exact head **fc2af9e59b27a655602ab4c0deca8cac1b48bc59**, updated 2026-11-12T16:20:31Z. The retried product job is **131310860168**, **shards (batch-14)**, on **GitHub Actions 1000315256**, started 16:06:35Z and finished 16:20:24Z. Its product step repeated the same readiness assertion at 16:20:16Z, with actual false and expected true. The failed-job archive was read once for this job; `FAILED-ASSERTION-attempt-2.log` is its actual assertion excerpt.

The one permitted retry is now exhausted. Product-shard results remain **19 passed / 1 failed**, before and after. This is not the contract generated-view exception. The failure is a repeated startup-readiness failure; it has not been proven a candidate regression or a main-baseline failure. No gate FIX count is added.

GitHub automatically scheduled dependent aggregate **131319816047**, which failed after the shard. No aggregate rerun was explicitly requested. Its attempt-2 response also repeats successful-job rows with new IDs but their original attempt-1 timestamps; those rows are reused successes, not successful-shard rerun requests. The only retry mutation issued by this task addressed the failed product job.

**REMOTE-NEEDS-LOCAL:** the fleet's existing same-runner targeted baseline executor is required to run only `verifyUnconfiguredHost` from current main with its matching emitted build and prepared D1 state. The cloud's hosted Verify workflow has no baseline-ref/single-test/runner-affinity door, and the original hosted runners cannot be addressed from this VM. Do not substitute a full suite, a baseline workflow dispatch, another shard retry, or an execution on a different runner.

**Next:** sd/fv should route that one targeted main comparison through an existing fleet facility and retain both run/job IDs and the main SHA. If the same assertion fails on main, classify and route the baseline/infrastructure failure to fv. If main passes under that comparison, return the proven candidate-specific failure to sd for a narrowly scoped decision. Keep landing refused until the exact candidate Verify is green; do not readmit or edit landing records from this task.

GitHub budget used: **9 of 10 gh command invocations**, including both failed-job archive reads and the single retry request. Status polls are separated by at least 300 seconds. No further GitHub API investigation is necessary to report this blocker.

Final state: **BLOCKED on the unavailable same-runner main comparison and the still-red exact-head Verify**. Product, clause status and gate FIX changes: zero. Report-only evidence is published separately; no product branch was pushed and no PR was created.

Report finalized 2026-11-12T16:23:18Z.
