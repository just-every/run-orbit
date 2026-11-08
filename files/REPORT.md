# sd-orbit-main-saved-sales-1

Product status: **READY**. Repository: `just-every/run-orbit`.

- Branch: `cloud/sd-orbit-main-saved-sales-1`
- Final full SHA: `d73cee9b7dc9f87cbf4e7dce8848ed090339bbeb`
- Initial fresh full-history main: `7381a4b3fc7cd35dfc04ad0ececa428cc00e3ed0` (`git clone --filter=blob:none`, not shallow).
- Updated main merged after the first published save: `da808d8668d700da20bd4ef782c8baea85029a47`.
- First published product commit: `5b08deaa2b998951f875ea2a906c36ef83848384`; retained without rebase or rewrite.
- Final exact-SHA Verify: [42509314876](https://github.com/just-every/run-orbit/actions/runs/42509314876) — **completed/success**, head `d73cee9b7dc9f87cbf4e7dce8848ed090339bbeb`.
- Superseded first-save Verify: `42507727160`; its sole observation was in progress on the first SHA. It is not evidence for the final SHA.
- PR: none; this repository has a branch-push Verify entry point. No default branch was pushed or fast-forwarded, and no deployment or landing was performed.
- Author/committer: `Run Edit Run fleet <fleet@runeditrun.com>`. All candidate commits and side parents were inspected; no co-author trailers.

## Plan and completed work

1. Installed the requested fleet Git identity, launcher credentials, push guard and commit hooks; read launcher/repository instructions and the product contract, intent and reporting requirements.
2. Read the time-relative New York fixture, snapshot/history loader, export access fences and report navigation. Ran the original file alone under a hard timeout before changing the reported path.
3. Varied month-boundary clock, export refusal and navigation ordering. Reproduced the exact missing-list assertion with real saved/history HTTP responses and controlled scheduling.
4. Fixed only the report drawer's causal state transition and extended its existing browser journey without deleting, skipping, weakening or retrying any test. Captured the changed drawer at 1440 and 390.
5. Ran the standalone file, full planned batch-8, typecheck, contract write/check and source lock/check. After updated main was discovered, merged it, preserved its source, repeated mechanical/type/build checks and the complete batch on the merged candidate.
6. Published the first real product commit and the substantial merge through the cloud push guard, with identity/message scans before each push. Used one bounded exact-SHA REST watcher at a time, at least 300 seconds between observations. Product and evidence custody are separate.
7. Retained actual non-secret reports and receipts here for report-only publication. The product clone and its node_modules are to be removed after evidence publication; the packet remains outside the clone.

## Cause and change

`SalesReportPage.save()` publishes the saved `SalesView` before its asynchronous saved-result address transition finishes. An operator can open Report options during that interval. The effect depending on `search.result` later dismissed that newly opened drawer, making `Saved sales results` and its list disappear even though history returned HTTP 200 with one item.

`src/core/features/reports/sales-report.tsx` now closes options for version changes only. Reopen and recompute retain their existing explicit dismissal handlers. A save's later URL update preserves options opened since that save.

`newtests/t096/browser-sales-report.ts` extends the existing 1440 journey: hold only the address transition, save through the real UI and snapshot route, open and check actual history, complete navigation and two browser frames, then verify the same dialog and one saved result remain. The router method is restored after that one transition. All original figure reconciliation, JSON exports, phone views, access revocation, late evidence and archive assertions remain. `sources.lock.json` was regenerated. Relative to updated main, these are the only three changed files.

Main's incoming owner workflow-authoring changes did not overlap the report fix or change CONTRACT.md. They were retained through a merge, with no published-history rewrite. The lock was regenerated from the merged source.

## Reproduction and probes

REPRO saved sales results: the initial file-alone run passed the reported assertion locally. Controlled delayed saved-result navigation on the original artifact reproduced the exact `toHaveCount(1)` failure: history HTTP 200/items=1, then drawer open→closed and rendered count 0, using the unchanged 5000 ms assertion timeout (`navigation-order-before.log`).

PROBE saved sales results: real UI save + delayed saved-result address at 1440 -> before fix, rendered saved history 0 after navigation; after fix, dialog retained and history count 1 (`navigation-order-after.log`).

PROBE saved sales results: merged candidate, New York workspace, clock `2026-12-01T00:00:00-05:00`, delayed address and real private-sharing refusal -> history HTTP 200/items=1, drawer retained, owner export 200, unauthorized collaborator export 403, no source-row leak; both 1440/390 captures completed (`month-revoked-navigation-after.log`).

The failed-main job was read once with `gh run view 42503239635 --repo just-every/run-orbit --job 128800841670 --log-failed`. It shows a successful save and history 200 before the failed assertion. The adjacent export 200/403 pair belongs to the following API test's deliberate access checks, not an owner history failure. Initial network-delay probes did not reproduce the issue; deferring the address transition did. No fake report response or retry wrapper supplies the result.

## Validation and actual receipts

| Check | Result | Actual evidence |
| --- | --- | --- |
| Initial file alone | 2 passed, 0 failed | `repro.log` |
| Fixed file alone | 2 passed, 0 failed, 0 skipped; 636830 ms | `fixed-file.log`, `fixed-file-results.jsonl` |
| First-save complete batch-8 | 3 passed, 0 failed, 0 skipped; 665797 ms | `first-save-batch-8.log`, `first-save-batch-8-receipt.json` |
| Final merged complete batch-8 | 3 passed, 0 failed | `batch-8.log`, `batch-8-receipt.json`, `batch-8-results.jsonl` |
| Typecheck, including after merge | exit 0 | `typecheck.log`, `merge-typecheck.log` |
| Build after merge | exit 0 | `merge-build.log` |
| Contract generator write then check, before and after merge | all exit 0 | `mechanical.json`, `merge-mechanical.json` |
| Source lock regeneration then check, before and after merge | all exit 0 | same mechanical receipts, `final-lock-check.log` |
| Test inventory | 100 files, 198 cases + 2 qualifications = 200 | `test-inventory.json` |
| Exact-SHA Verify | completed/success, head matches final SHA | `ci.json`, `ci-watch.log` |

Batch-8 is exactly `fold-domain-0`: `pnpm run build:app`, then serial Node tests for `newtests/t096/collaborator-links.test.ts` and `newtests/t096/report-disclosure.test.ts`. Its complete command arguments and terminal counts are in the shard receipt. Local receipts record the pre-commit HEAD by harness design; the final patch hash and source lock identify the tested worktree, and remote Verify supplies independent exact-commit evidence.

MECHANICAL lock=`node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock` exit=0; lock-check=`node node_modules/@runeditrun/rer/edition-authoring/cli.mjs check` exit=0; views=`node src/base/contract-docs.mjs write` exit=0 then `node src/base/contract-docs.mjs check` exit=0. Restored generated views whole with `git checkout origin/main -- ACCEPTANCE.md docs/CLAIMS.md` before regenerating the lock last. No generated view or clause judgment was committed.

## Before/after counts and clauses

| Tier | Done before→after | Partial before→after | Missing before→after | Total |
| --- | --- | --- | --- | --- |
| Core | 38→38 | 116→116 | 24→24 | 178 |
| Agent surface | 0→0 | 18→18 | 8→8 | 26 |
| Later | 0→0 | 0→0 | 0→0 | 0 |
| Full target | 38→38 | 134→134 | 32→32 | 204 |

Claims remain 12: 2 done, 10 partial, 0 missing. REPORT-001 stays done; REPORT-002, REPORT-003 and REPORT-004 stay partial. Clause status changes: **none**. Main batch-8 was 2 passed / 1 failed; the final local planned batch is 3 passed / 0 failed. Test registration remains 200 total flows. Field proof remains 12 not run; no new acceptance, provider delivery or full-capacity release qualification is claimed.

## Execution qualifications and blockers

The initial file-alone command used host Node 24.19.0; rer selected pinned Node for setup/build. Subsequent probes and candidate checks used Node 22.20.0 and pnpm 10.12.4. Chromium was `/usr/bin/chromium` with `--no-sandbox` through an external preload; no cloud adapter entered product source. Commands used the supplied subreaper and hard timeouts.

An early batch/probe overlap hit the fixture's unchanged 60000 ms migration subprocess deadline before product assertions. Those actual failures are retained as `startup-failed` logs/receipts. Serial runs passed without a deadline or product change. One exploratory workspace-shared export probe incorrectly expected denial; the correct response was a limited 200. The private-sharing probe supplies the actual 403 path. One combined diagnostic read the id from an intentionally delayed URL; it was corrected to read the real save response (`month-revoked-navigation-after-probe-error.log`).

The initial baseline save/history assertion ran on the original artifact before any edit. A later rebuild overlapped only that initial run's archive tail, so the strongest before-fix evidence is the independent original-artifact navigation-order reproduction, not a claim that every baseline archive step used unchanged assets.

Product push receipts, candidate identity inspection, the full patch, mechanical receipts, actual test events, browser images and observations, and CI observations are explicitly selected for report-only evidence publication. No credentials, environment dumps, private held-out gate material, archives with installation state, or symlinks are selected. Only CI shell environment boilerplate was omitted from the failed-job log; its assertion and HTTP output are retained. The fleet's publication scan and landing run independently on its own machine.

Blockers: none observed.
