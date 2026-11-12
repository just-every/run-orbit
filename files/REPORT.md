# Orbit forward-upgrade repair — sd-orbit-c-f175-fix2

Repository: just-every/run-orbit. Product branch: cloud/sd-orbit-c-f175-fix2.
Starting landing head: 8e7568859399c190aad9d153f0ae0345c4f8c5e3.
Included main: 5f92fa76579961950d49c7411f54d5446516a708.
Release fixture: v0.3.0, commit 01f50794f23160821e02f9c963e907040d6df9da.

## Plan

The complete execution plan is in PLAN.md. Initialize fleet tools and preserving hooks; fetch and resolve the specified landing head and release; reproduce the exact test before edits; repair only the Zoom slice reconstruction; run the same unchanged test, migration-ledger preflight, typecheck, source and deployment checks; regenerate source lock last; inspect all candidate identities and messages; push the named product branch; inspect its exact-SHA Verify; publish this packet separately on the evidence branch. No UI, migration, assertion or acceptance change is in scope.

## Reproduction and cause

On the unmodified landing head, `pnpm exec tsx --test --test-concurrency=1 newtests/t096/forward-upgrade.test.ts` failed with 0 passed / 1 failed in 204426.510536 ms. Its HTTP 400, `Archive inventory does not match a complete supported source generation.`, points to archive-fold-validation.ts:25 and released-forecast-upgrade.ts:69, matching the reported Verify failure.

The test constructs a pre-direct-notification archive by calling `preDirectNotificationCatalog(installed)`. That exported helper already removes the later graph-proposal changes and the notification insertion trigger. It did not remove the later optional Zoom generation. Meanwhile `nativeCatalogGenerations` builds the corresponding supported historical catalog after removing Zoom. The helper-produced manifest therefore retained three Zoom tables that were absent from the supported generation, so exact inventory/schema validation correctly refused it.

## Repair

Change only the table-slice argument in `src/core/features/records/archive-generations.ts:27`, from `[]` to the existing `zoomArchiveTables` constant. Its values are `zoom_meetings`, `zoom_deliveries`, and `zoom_plan_actions`. The helper now uses the same historical slice reconstruction as the supported native generation. Owner tables/columns/objects, trigger filtering, current catalog, all unrelated optional slices, and exact inventory/schema validation are unchanged. `newtests/t096/released-forecast-upgrade.ts` and every assertion remain byte-identical.

The brief's shared/archive-generations.ts path does not exist at this head; the actual generation helper is features/records/archive-generations.ts. This is the archive generation helper expressly permitted by the lease. No dependency on the unlanded f173 branch was introduced.

## Local checks

Actual full logs and local-receipt.json accompany this report. The baseline and patched runs use the cloud toolchain's available Node 24.19.0 and pinned pnpm 10.12.4. The rer commands select the repository's cached Node 22.20.0 automatically.

- Baseline exact case: reproduced the expected HTTP 400, 0 passed / 1 failed.
- Patched exact case: passed, 1 passed / 0 failed / 0 skipped in 464284.058246 ms. The complete released/main/ownership/dashboard/record-mail forward-upgrade assertions ran unchanged.
- Migration ledger: Base `nativeMigrationPreflight` passed against a disposable exact-main database advanced with all current migrations. Its applied ledger exactly equals all 77 checkout SQL filenames; no pending migrations and no foreign-key violations. The actual check script is migration-ledger-check.mjs.
- Typecheck: passed.
- Command contract (`rer check --profile first-party`): passed.
- Boundaries: passed for 852 core source files.
- Contract generation: write and generated check passed without changing CONTRACT.md. Restoring the two views from origin/main showed the expected pre-Zoom BOUNDARY-001 view mismatch. Since current main was already included and no merge/rebase or contract edit occurred, the original landing-head view bytes were retained; final contract check passed. Neither view is included in this repair commit.
- First local setup attempt refused the concurrent baseline test's active workerd (exit 4). This was a local scheduling refusal, not a product assertion failure. Its private raw output is intentionally excluded from this public packet.
- Setup retry: passed. Production `rer build`: passed. Deployment spec regeneration/check: passed with no resulting spec diff. Source lock regenerated last and its check passed; the only lock change is the archive helper hash. No migrations, views, tests or contract text are changed.
- Product commit and guarded push: passed on attempt 1. All 10 candidate commits, including side parents, passed the fleet/owner identity and coauthor inspection. The one new commit has no AI trailer and no [skip ci].

## Claims and limits

CLAIM INTEGRATE-002 PARTIAL points=none tests=newtests/t096/forward-upgrade.test.ts#API-002 credential storage and RECORD-016 ownership and accepted main and released v0.3.0 advance with every native value, custom DDL, live identity and pre-forecast archive schema intact

GAP holds stand. No DONE claim, contract status promotion, release acceptance, live-provider qualification, deployment or landing is asserted. The source contract's INTEGRATE-002 row remains missing. Contract totals before and after are 42 done / 130 partial / 32 missing / 204 total. No new UI/browser proof is required for this archive helper-only repair. The pre-existing Opus result and failed Verify supplied in the brief were context, not newly rerun independent gate evidence.

## Product custody and CI

Product head: `41a18039f0841ecd87c174c9a6123f8908b01a0f`. Guarded product push succeeded; exact-SHA Verify [43310605275](https://github.com/just-every/run-orbit/actions/runs/43310605275) is `completed/success` on that exact head. The repair commit changes two files, two insertions and two deletions (one code line and its lock hash). No PR is required by the repository's branch-push workflow; no PR has been opened. Reports and receipts are outside the product checkout and will be published only on evidence/sd-orbit-c-f175-fix2. Product READY and evidence publication are separate. The fleet publication scan is reserved for the Mac lander and was not run in this cloud. Independent gates must rerun their own checks. No main/default branch, tag, PR or deployment was changed.

## Final observation

UTC: 2026-11-12T21:59:14Z. Product custody: **READY**, branch cloud/sd-orbit-c-f175-fix2, head 41a18039f0841ecd87c174c9a6123f8908b01a0f. Exact-SHA Verify run 43310605275: completed/success. GitHub calls used: 7/10. No PR created.

The required workflow completed successfully on this exact SHA. No generated-view exception was needed. There is no blocking check to report; fleet publication scan and landing remain the fleet's separate work.

Before/after exact test counts: 0 passed / 1 failed -> 1 passed / 0 failed, no skips or assertion changes. Before/after contract totals: 42 done / 130 partial / 32 missing / 204 total, unchanged. No clause status edits; CLAIM INTEGRATE-002 PARTIAL points=none and GAP holds stand.

The separate evidence transport carries explicitly selected report/receipt/log files in a report-only tree. Its exact ref/head is returned in the terminal EVIDENCE line. The product clone is removed only after successful evidence publication, as the brief requests; product source remains on the confirmed remote branch.
