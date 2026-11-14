# gr-mt-orbit-dep-6

Repository: just-every/run-orbit
Product branch: cloud/gr-mt-orbit-dep-6
Candidate: a35d331920a4bace2548bbd0efaf9344ffcd32a6
Base: 31ee78c0d348ba5c0d9e5ad530d8d23dbde5f47d

## Change and scope

Upgraded the exact direct Vite devDependency from 8.2.2 to the first patched version 8.2.4 for GHSA-r825-w8mm-5pxw and GHSA-587h-7wmj-h5pm. Regenerated pnpm-lock.yaml with pnpm 10.12.4 and updated sources.lock.json last with the documented authoring command. Only package.json, pnpm-lock.yaml and sources.lock.json changed. Vite peer references changed consistently; no other resolved package version changed.

Resolved package entries: 363 before, 363 after. Vulnerable Vite resolutions: 1 before, 0 after. The four cited Dependabot alert records cover the two advisories in both manifest and lockfile; alert closure is not claimed before landing.

Registered tests: 198 before and after, plus 2 qualification programs, total 200. No tests added, removed, skipped or weakened. CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md are unchanged. No clause status or acceptance-point changes are claimed by this dependency maintenance task.

## Plan

The complete actual plan is PLAN.md: inspect fleet and seed rules; perform the minimal pinned dependency update; frozen install and focused build/type/runtime checks; regenerate and validate source lock; integrate main and inspect all candidate identities; complete Base publication scan; publish only the named product branch through the guard and wait for exact-SHA Verify; separately return the actual report packet through the evidence branch.

## Local results

Node 22.20.0 and pnpm 10.12.4 were used for dependency regeneration and validation.

- pnpm install --lockfile-only: passed.
- pnpm install --frozen-lockfile: passed.
- npx -y @runeditrun/rer setup --owner-email fleet@runeditrun.com --non-interactive: passed; 83 migrations and owner setup.
- npx -y @runeditrun/rer build: passed, including app and public site outputs.
- pnpm run typecheck: passed.
- node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock: passed.
- node node_modules/@runeditrun/rer/edition-authoring/cli.mjs check: passed.
- node scripts/verification-inventory.mjs: 198 registered cases plus 2 qualification programs, within the 200 cap.
- pnpm exec tsx tests/support/prepare-state.ts: passed in isolated disposable D1 state.
- pnpm run test:worker: passed the existing emitted Worker qualification. It checks live D1 SSR, valid/expired/revoked/missing session enforcement through documents, APIs and generated server functions, client navigation without a page reload, static assets, unknown-host refusal and absence of private values from client output. Browser errors: 0; RPC requests observed: 5. An external preload selected /usr/bin/chromium with --no-sandbox; no product source or test assertion changed. worker-proof.json retains the actual qualification receipt.

The full local suite was not run, per the task's touched-check limit. There are no UI edits. Existing Vite warnings identify extensionless imports under a future config-loader default; changing those unrelated imports is deferred. All runtime proof processes exited through their own cleanup and the disposable D1 state was removed.

## Publication and CI

Base publication scan: COMPLETE/PASS, zero findings on a35d331920a4bace2548bbd0efaf9344ffcd32a6, tree b3a2a970bc1a899c218129801c90b6fb2c394a7b. Five pre-existing items are classified separately by the unmodified scanner against the remote main public base; none is a new finding. The final scan inspected 891 commits and completed in 387.5 seconds. The actual full report is publication-scan.json. Earlier receipts retain the initial missing-blob refusal and the managed-environment interruption; both were followed by a complete passing run.

The named product branch was pushed successfully on the first guarded attempt. product-push.log records the command and success. Exact-SHA Verify 43528233170: in_progress/pending on a35d331920a4bace2548bbd0efaf9344ffcd32a6. URL: https://github.com/just-every/run-orbit/actions/runs/43528233170. Status observations used one watcher at intervals of at least 300 seconds, including discovery. 10/10 GitHub calls were used across tooling and CI. ci-receipt.json and ci-watch.log retain the actual observations.

Base's publication scanner inspected raw bytes of the exact committed source in a separate materialized tree with mirrored full history and the remote main public base. No local installation settings or runtime outputs enter that tree. The cloud scan does not receive the owner's private environment values; the fleet retains its independent publication and landing gates.

## Custody

The report packet received a supplementary Gitleaks review: 18 raw hex detections are the nine public component baseline hashes repeated in the lock and check command outputs. Both complete outputs were verified structurally equal to committed sources.lock.json (apart from the check command's ok=true), and every detection was checked at its exact line. There are zero credential findings and no selected symlinks; packet-scan-receipt.json records that review.

All report files and command receipts remain outside the product repository under work/gr-mt-orbit-dep-6/packet. Product publication and report-only evidence publication are separate. No default branch push, PR, tag, release or deployment was made. Product publication is limited to cloud/gr-mt-orbit-dep-6.


## Terminal result

The branch is pushed and all local touched checks and the complete product publication scan passed. Exact-SHA Verify remains in progress at the last permitted observation as the ten-call GitHub budget runs short. No green CI or READY claim is made. The fleet must observe this exact run/head before landing. No PR was required or created. No known product blocker was identified; CI completion is pending.

PUSHED branch=cloud/gr-mt-orbit-dep-6 head=a35d331920a4bace2548bbd0efaf9344ffcd32a6
