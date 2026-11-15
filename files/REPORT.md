# gr-mt-orbit-dep-10 result

Author: Run Edit Run fleet. Date: 2026-11-15.

Outcome: **no-change**. The requested security fix is already on the current default branch. This report verifies the existing fix; it does not claim that Dependabot alert state was queried or changed.

Repository: just-every/run-orbit.
Local branch: cloud/gr-mt-orbit-dep-10.
Final HEAD and final fetched main: bca89d44de7c8357544fc54375a030f9d1d4611f.
Initial main and local-check SHA: 22ca38c0e0bb5784440df021e8a5eb5b41a81de8.
Existing fixing commit: bfc52fadd56ae3fa38cb48de9484de61810e7cbd, dated 2026-11-14, an ancestor of current main.
Clone: /home/agent/rer-consolidation/work/maint/gr-mt-orbit-dep-10/repo.
Result: /home/agent/rer-consolidation/work/maint/gr-mt-orbit-dep-10/result.json.

## Dependency evidence

The existing fixing commit changed package.json, pnpm-lock.yaml and sources.lock.json. It added the scoped pnpm override `miniflare>undici: 7.30.1`, replaced the previous locked Undici 7.29.0 runtime with 7.30.1, and updated the Miniflare snapshot. Current main retains those exact dependency files.

The installed graph has four paths, all resolving to Undici 7.30.1:

- miniflare > undici
- wrangler > miniflare > undici
- @cloudflare/vite-plugin > miniflare > undici
- @cloudflare/vite-plugin > wrangler > miniflare > undici

`undici-types@6.21.0` is a TypeScript declaration package rather than an Undici runtime version. There are no locked vulnerable Undici runtime versions. The dependency receipt records the lockfile digest, ancestry, exact versions and final clean worktree.

## Commands and actual results

The full plan is in PLAN.md. Every build/test command ran through cloud_run, with Node 22.20.0 and pnpm 10.12.4. No full local verification suite ran.

| Command | Result | Receipt |
| --- | --- | --- |
| pnpm install --frozen-lockfile | exit 0; lockfile already current | install.log |
| pnpm why undici --json | four patched paths | dependency-tree.json |
| pnpm run typecheck | exit 0 | typecheck.log |
| npx -y @runeditrun/rer build | exit 0; app built | build.log |
| node node_modules/@runeditrun/rer/edition-authoring/cli.mjs check | exit 0; ok true | source-check.json |
| pnpm exec tsx --test --test-concurrency=1 tests/launch-runtime/mail-body-transport.test.ts | exit 0; 1 passed, 0 failed/skipped/cancelled | transport-test.log |
| node scripts/verification-inventory.mjs | 198 registered cases + 2 qualifications = 200 | test-inventory.json |
| git fetch origin main; inspect manifest, lockfile and ancestry | dependency files unchanged on latest main; fixing commit retained | dependency-receipt.json |
| git merge --ff-only origin/main | local task branch advanced to current main; no commit created | dependency-receipt.json |

The focused test exercised emitted HTTP mail ingress, declared/chunked body limits and quota isolation through the real Worker runtime. Its processes finished and no browser or dev server was started. Build warnings concern existing Vite extension resolution and proxy use; the build succeeded. No setup or hosted operation was needed for these checks.

Local build/typecheck/source/transport results belong to the initial SHA above. The later main advance changed unrelated product/UI files and sources.lock.json; it changed neither package.json nor pnpm-lock.yaml. No local check is represented as having run on the later SHA.

## Exact-SHA CI

GitHub Actions runs were discovered via REST with freshly loaded fleet credentials. No workflow was dispatched or rerun. The packet retains the selected response fields without credentials.

- Initial main Verify 43705866695: completed/success at 22ca38c0e0bb5784440df021e8a5eb5b41a81de8. https://github.com/just-every/run-orbit/actions/runs/43705866695
- Initial main Run site 43705866781: completed/success at the same initial SHA.
- Final main's exact-SHA branch Verify 43706656140: completed/success at bca89d44de7c8357544fc54375a030f9d1d4611f. https://github.com/just-every/run-orbit/actions/runs/43706656140
- Final main push Verify 43710660126: still in progress at observation; not claimed successful. Its existing successful branch Verify is on exactly the same final SHA.
- Final main Run site 43710660286: completed/success at the final SHA.

Three explicit GitHub API calls were made: two exact-SHA run discoveries and one Gitleaks release-metadata lookup while assessing publication tooling. The latter was unnecessary for this no-change product result; no scanner binary was installed. No CI polling or failed-job log request was needed.

## Before/after counts and scope

- Vulnerable locked Undici runtime versions at task start/end: 0 / 0.
- Unique Undici runtime versions at task start/end: 1 / 1, both 7.30.1.
- Existing fixing commit's historical version transition: 7.29.0 to 7.30.1.
- Registered tests at task start/end: 198 / 198; qualification flows 2 / 2; total 200 / 200. No test was added, removed, skipped or weakened.
- Acceptance counts unchanged: 42 done, 130 partial, 32 missing; total 204.
- Clause status changes: none. No target clause or acceptance point was added or claimed.
- Product files changed by this task: 0. New product commits: 0. PR: none. Product branch push: none.

No product publication scan or READY/PUSHED claim is applicable: there is no new product candidate or product push. The requested no-change path resolves an already-fixed item without merging. The report-only evidence ref is separate from product custody and acceptance. No credentials, environment dump, private held-out gate material, symlink, installer state or generated acceptance view is selected for evidence.

Blockers: none for the dependency item. Default/remaining work: none. The separate evidence transfer result is reported in the terminal response; a transfer failure would not turn this already-fixed item into an unverified product change.
