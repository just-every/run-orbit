# gr-mt-orbit-dep-5 — patched Vite and Hono dependencies
Author: Run Edit Run fleet, 2026-11-17.

Repository: just-every/run-orbit.
Branch: cloud/gr-mt-orbit-dep-5.
Candidate: f64dfdc13868f7f15530a513246b199e13a68324.
Base inspected: 163bd9267dad8c5f74c0758632491c81f1c69011.

## Change and coordination

Main already directly and transitively resolves Vite 8.2.4, which is the first patched release for GHSA-698v-4r3x-3vcv. Its package pin and lockfile records are unchanged.

Hono is upgraded from 4.13.5 to the first patched release 4.13.11 for GHSA-5r4p-p66f-jhc7. `package.json` and `pnpm-lock.yaml` change only Hono's pin, resolution and integrity. `sources.lock.json` was regenerated last and changes only the package.json and pnpm-lock.yaml content hashes. No unrelated dependency upgrade, product/UI change, acceptance text, generated view, test or workflow change is included.

PR #11 remains team-owned and open at https://github.com/just-every/run-orbit/pull/11. Its desired TanStack Start 1.168.60 and React Router 1.170.41 versions already appear on the inspected main and remain unchanged. This run neither edits that PR nor merges its branch.

## Before and after

| Measure | Before | After |
| --- | --- | --- |
| Vite direct and locked version | 8.2.4 | 8.2.4 |
| Hono direct and locked version | 4.13.5 | 4.13.11 |
| Vulnerable resolved versions among the two listed package families | 1 | 0 |
| Registered tests | 198 | 198 |
| Qualification flows | 2 | 2 |
| Total test budget | 200 | 200 |
| Clauses Done / Partial / Missing / Total | 42 / 130 / 32 / 204 | 42 / 130 / 32 / 204 |

No clause status changes or new DONE claims. This is dependency maintenance, with no target clause supplied. Dependabot alert state was not read or changed; the vulnerability count describes the committed manifest and lockfile, not the remote alert status.

## Plan and validation

The full plan is retained in PLAN.md. It covers fleet setup, fresh branch custody, dependency inspection and PR coordination, the smallest patched update, pinned validation, source-lock regeneration, exact-tree publication scan, guarded product push, exact-SHA CI and separate evidence return.

Node 22.20.0 and pnpm 10.12.4 were used for dependency installation, update, setup, build, types and tests. The supplied cloud toolchain accepts a newer system Node, so the exact repository Node pin was installed separately and put first on PATH for those commands.

- `pnpm install --frozen-lockfile`: passed before and after the update.
- `pnpm update hono@4.13.11 --save-exact`: passed; no other dependency records changed.
- `npx -y @runeditrun/rer setup --owner-email fleet@runeditrun.com --non-interactive`: passed; built the app, applied 84 migrations and claimed the local owner. Its server exited.
- `npx -y @runeditrun/rer build`: passed for the application and site. Existing warnings concern extensionless imports under Vite's future native config loader.
- `pnpm run typecheck`: passed.
- Existing `tests/core/identity.test.ts` and `tests/core/local-owner.test.ts`: all five cases passed for native email-link sign-in, pre-hydration sign-out, cross-origin refusal, step-up, dev-session boundaries, owner identity and removal.
- Existing `tests/core/platform-boundaries.test.ts`: all five cases passed for durable public rate limits, provider configuration failures, malformed JSON, cross-origin mutation refusal, unconfigured sign-in and invalid review identities.
- Existing `scripts/verify-worker.ts`: passed emitted Worker SSR, live D1 updates, missing/expired/revoked session controls, generated function authentication, browser navigation, assets, missing/dev-only paths, unsupported hosts and client secret boundaries. The external driver changes only Chromium launch options to `/usr/bin/chromium` with `--no-sandbox` and closes the browser. No test assertion is altered.
- `node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock`: passed; source lock regenerated last.
- The matching `check`: passed before and after commit.
- `node scripts/verification-inventory.mjs`: 198 registered cases plus 2 qualifications, unchanged.
- `git diff --check origin/main..HEAD`: passed; product worktree clean.

Initial harness failures are retained honestly: the platform test first refused launch without ORBIT_TEST_STATE; preparing isolated state and rerunning passed. An initial direct `node --import tsx` Worker invocation printed assertion success but exited 1; the repository's `pnpm exec tsx` CLI rerun completed and exited 0. Raw sanitized logs and validation-receipt.json retain these outcomes. The temporary test database was removed after its Worker/browser processes exited. No full local Verify was run.

## Publication and CI custody

Candidate author and committer are Run Edit Run fleet <fleet@runeditrun.com>, with no commit trailers. Fleet cleanup hooks remain enabled and preserve repository hooks. Main was fetched; the clean candidate rebase reported up to date.

The Base publication scanner bundled in @runeditrun/rer 0.2.113 was found and its pinned Gitleaks 8.30.1 prerequisite was installed from the upstream release asset with its SHA-256 digest verified. The installed public_hygiene.py blob exactly matches Base main at 513669ac81ac15506740ca9d2089a1c753e03455; scanner-toolchain-receipt.json records that comparison and the verified binary archive digest. Its first exact-tree attempt was INCOMPLETE because the blobless mirror lacked historical image data. Full origin history was then fetched with `git fetch --refetch --no-filter origin main`, and a second exact committed-source scan completed with the declared public main as baseline. That scan found only `destination.invalid`: the caller supplied a short project name and a bare repository name rather than the scanner's required committed logical project ID and repository URL. The invocation was corrected to `just-every/orbit` and `https://github.com/just-every/run-orbit`, and destination validation is run before the final scan. No product metadata was changed to satisfy this caller error. The scanner reads known environment values only for in-memory matching and emits value-free findings.

The complete scan with incorrect destination arguments recorded five pre-existing findings in historical test fixtures and an old scanner file: four SEC-3 records and one hygiene.email record. None concerns the dependency diff. The full actual reports retain their paths and commit scopes.

The corrected publication scan completed PASS with `complete: true`, zero new findings, and matching candidate commit/tree. It inspected 911 commits, 907 trees, 9,064 blobs, 911 commit messages and 15 tag messages. Five pre-existing findings remain in the historical scope described above. The scan took 457.09 seconds. The final scan made one observed GitHub reference-resolution call.

The product branch was pushed through cloud-push.py successfully on attempt 1, after inspection of every candidate author, committer and trailer. No PR was created and no default branch was pushed or fast-forwarded. Exact-SHA push Verify 44108560566 is running at https://github.com/just-every/run-orbit/actions/runs/44108560566 for f64dfdc13868f7f15530a513246b199e13a68324. CI polling is limited to one observation per 300 seconds including discovery; no workflow is dispatched or rerun.

Terminal custody is **PUSHED** for cloud/gr-mt-orbit-dep-5 at f64dfdc13868f7f15530a513246b199e13a68324. Verify 44108560566 remained `in_progress` with no conclusion at 2026-11-17T15:06:25.972534+00:00, after discovery and two polls spaced at least 300 seconds apart. Monitoring stops at the budget-limited handoff; CI success is not asserted. No failed completed run or product blocker was observed. The fleet must obtain the exact-SHA completed/success result before landing.

No PR was created, no default branch was changed, and no deployment was run. The local result.json has status `done` for the completed maintenance build and explicitly records pending branch CI. Full plan and actual receipts accompany this report. The complete packet is selected explicitly for evidence/gr-mt-orbit-dep-5; it contains no credentials, environment dumps, private gate material or symlinks. The verified external recovery bundle remains under work/push-rescue; its exact path and SHA-256 are in bundle-receipt.json.

Suggested default: preserve the existing TanStack pins and clause judgments; let the existing fleet observe Verify and perform guarded landing. No owner ruling is needed for this dependency patch. All started app, Worker and browser processes have exited; only the isolated clone is retained until evidence transfer finishes.
