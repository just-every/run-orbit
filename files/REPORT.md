# gr-mt-orbit-ci-4 — already fixed on current main

Author: Run Edit Run fleet. Date: 15 November 2026 (UTC).

## Result

Status: **no-change**. Repository: `just-every/run-orbit`.
Local branch: `cloud/gr-mt-orbit-ci-4`.
HEAD and freshly fetched origin/main: `22ca38c0e0bb5784440df021e8a5eb5b41a81de8`.
No product files changed, no new product commits, no product push and no PR.
The maintenance result is saved at `$HOME/rer-consolidation/work/maint/gr-mt-orbit-ci-4/result.json` and copied into this packet.

Main's latest push Verify **43705866695** completed successfully on this exact SHA:
https://github.com/just-every/run-orbit/actions/runs/43705866695
The same SHA also passed full Verify **43701118360**, with source, all 20 product batches (including batch 4), and the aggregate successful:
https://github.com/just-every/run-orbit/actions/runs/43701118360
This is a verified existing repair, not a conclusion from failing to reproduce the report.

## Full plan and execution

1. Set fleet Git identity before repository work, refresh the launcher, install the decrypted-bundle Git helper and push guard, clone the declared repository with full history, configure its local identity and preserving commit hooks, and create the named cloud branch from origin/main. Read the launcher instructions, inline fleet rules, AGENTS.md, CLAUDE.md, TESTING.md, contract and generated progress.
2. Inspect original run 41363734349 through REST. Job 125019951726 (`shards (batch-4)`) failed in `Verify routine product shard`; the aggregate failure followed it. Invoke `gh run view 41363734349 --repo just-every/run-orbit --job 125019951726 --log-failed` once. The installed gh 2.46.0 returned exit 0 with empty stdout/stderr but downloaded its log archive into its ordinary cache. Read that already-downloaded archive locally, without another log/API request, to recover the failing assertion. Preserve the actual failure excerpt, excluding runner environment listings.
3. Trace that assertion and its existing fix in Git history. Confirm the fix is an ancestor of current main and remains in the current source and retained regression helper.
4. Install frozen dependencies. Select the exact Node 22.20.0 pin for validation (the supplied toolchain script retained the VM's newer Node 24, so the checks explicitly prepend the separately installed pin). Run typecheck, build through `cloud_run`, and a focused emitted-Worker/browser proof using the unchanged `authorReport` helper. It passes at 1440 with system Chromium and `--no-sandbox`.
5. Discover exact-SHA CI through REST, inspect the successful full run's jobs, and read main's latest run after the polling interval. Both exact-SHA runs are successful. Fetch main once more and verify HEAD, origin/main, the index and the working tree remain unchanged.
6. Return no-change under the brief's explicit already-fixed allowance. Keep reports outside the product checkout and publish only the separately authorized evidence ref. No candidate needs landing; no READY/PUSHED product claim is made. Retain the requested local clone and result.

## Root cause and existing correction

Original failing run: https://github.com/just-every/run-orbit/actions/runs/41363734349
Original failing source: `newtests/t096/browser-journeys.test.ts`, calling `newtests/t096/browser-report-authoring.ts`.
The phone run waited for `Saved result · measured …`, but the UI instead showed:
“Report inputs changed after preview. Review a fresh preview before saving.”
The shard had one passing and one failing case, with no skipped or cancelled cases.

Changing the report period launched a new preview while the previous preview remained visible. Save combined the new requested period with the old preview's review hash; the server correctly rejected that mismatched pair.

Existing commit **c5fef74276b106cc2660384644a851ed9100d831**, `Save the reviewed custom report preview on screen`, already fixes this exact incident and cites run 41363734349 in its commit body. It changed:

- `src/core/features/reports/custom-report-page.tsx`: save uses the shown report's definition version, period and review hash, while Save result waits during computation.
- `newtests/t096/browser-report-authoring.ts`: hold the applied preview at the network edge, assert Save is disabled, then save and verify the exported result carries that applied preview's period.
- `sources.lock.json`: regenerate the source lock for that existing repair.

These are historical changes already on main, not changes made by this task. The current retained helper still asserts the held-preview/save/export behavior; no test was skipped, weakened or deleted by this task.

## Local validation and receipts

All validation below uses Node 22.20.0 and pnpm 10.12.4, one browser and one Worker:

- `pnpm run typecheck`: PASS, exit 0 (`typecheck.log`).
- `cloud_run npx -y @runeditrun/rer build`: PASS, exit 0. Existing Vite extension warnings remain informational.
- `cloud_run pnpm exec tsx /tmp/gr-mt-orbit-ci-4/report-smoke.mts`: PASS, exit 0 (`local-report-smoke.log`, exact script copied as `local-report-smoke.mts`). This invokes the existing public UI regression helper against the actual emitted Worker, saves the held preview, checks the exported period against its request, verifies USD 32.00 from the one native opportunity, and follows the record drilldown. Actual exported JSON, screenshots and accessibility results are included under `browser/`.
- Main ancestry: `git merge-base --is-ancestor c5fef74 origin/main`: PASS.
- `git diff --exit-code`, `git diff --cached --exit-code`, and clean porcelain status: PASS.
- `git log origin/main..HEAD --format="%an <%ae>%n%cn <%ce>%n%(trailers:only,unfold)"`: empty; zero candidate product commits.

The focused local check ran at 1440; there are no changed UI screens requiring new dual-width candidate proof. The unchanged full CI journey covers its existing desktop/phone flow. No full local verify was run.
Browser and owned Worker PID 2139 were closed by the scratch proof's finally blocks; its `cloud_run` subreaper returned exit 0. No server remains from this task. No deployed application or external provider was changed.

## Counts, clauses and publication

Before → after: 198 registered cases + 2 qualification flows = **200 → 200**. No test registrations changed.
Contract progress is unchanged: **42 done / 130 partial / 32 missing**, 204 total (Core 42/112/24; Agent surface 0/18/8).
Clause text, statuses, gap/evidence cells, generated views and source lock all remain unchanged. No new clause claim is made.

Six GitHub read invocations were used: original jobs, the single original failed-log read, exact-SHA run discovery, successful full-run jobs, its exact run detail, and latest main run detail. No dispatch, rerun, comment or PR write occurred.
No public product push is necessary for a verified no-change result; there is no new product tree to publication-scan. Evidence publication is separate report-only custody at `refs/heads/evidence/gr-mt-orbit-ci-4`, with explicitly selected files and fleet commit identity, and conveys no product READY or landing signal.

Blockers: none. The initial empty rendered gh log was resolved from its existing downloaded cache, without a second network read.
Default: close this maintenance item as already repaired; do not create an empty candidate or duplicate the existing fix.
