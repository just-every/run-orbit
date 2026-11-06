# Actual command receipts

Working source for every product execution: be80a3b8c7c298837fd2692ba905f36648a4792d, advertised at cloud/sd-orbit-c-f51. Disposable checkout only; no product commits, pushes or PRs.

| Command | Actual result | Actual receipt |
| --- | --- | --- |
| git clone --depth 1 --filter=blob:none --branch cloud/sd-orbit-c-f51 https://github.com/just-every/run-orbit.git <disposable checkout> | exit 0 | clone.log |
| git rev-parse HEAD; git ls-remote origin refs/heads/cloud/sd-orbit-c-f51 refs/heads/main | both exit 0, exact source MATCH; main c01084f133af9aa484a6c1f5151a4e9cfbc7230f | provenance.txt |
| git fetch --depth=1 --no-tags origin main:refs/remotes/origin/main | exit 0; no checkout change | main-comparison.json |
| pnpm install --frozen-lockfile | exit 0 | dependencies.log |
| timeout 300 npm install --prefix <disposable toolchain> --no-audit --no-fund node@22.20.0 | exit 0 | node-pin-install.log |
| cloud_run npx -y @runeditrun/rer build | exit 0 with Node 22.20.0 and local pinned rer 0.2.96 | build.log |
| cloud_run pnpm exec tsx --test --test-concurrency=1 tests/core/signals-outreach.test.ts tests/core/launch-provider-conflicts.test.ts | exit 0; 20 passed, 0 failed, 0 skipped, 0 cancelled; duration 1,144,438 ms; invoked once, no test-name selection, no suite rerun | journeys.log |
| cloud_run pnpm exec tsx ../browser-proof.mts | First attempt exit 1 before product execution: import used .mjs where the actual file is .ts | browser-initial-import.log |
| cloud_run pnpm exec tsx ../browser-proof.mts | Second attempt exit 1 in external harness after successful native acceptance: harness read provider correlation from the wrong JSON level; source unchanged | browser-initial-correlation.log |
| cloud_run pnpm exec tsx ../browser-proof.mts | Corrected harness exit 0; emitted Worker native reads, send through real SendGrid adapter with only its HTTP edge replaced, signed replay, forged-receipt refusal, and four functional screenshots at 1440/390 | browser.log; browser-receipt.json; accepted-deal-1440.png; accepted-deal-390.png; responsible-inbox-1440.png; responsible-inbox-390.png |
| node src/base/contract-docs.mjs check | exit 1: ACCEPTANCE.md generated content differs; expected explicit source CANDIDATE exception. No write run | generator-check.log |
| node node_modules/@runeditrun/rer/edition-authoring/cli.mjs check | exit 0, ok=true, manifest dc7d6704d5ed529d120a628ed52e9bd9804900d13506a343fd1606c02de0d59d | source-lock-check.log |
| cloud_run pnpm exec tsc --noEmit | exit 0 | types.log |
| Repository parseContract over the complete pinned and fetched-main CONTRACT.md | exit 0; all 204 clause IDs retained; 36/136/32 source versus 35/137/32 main | parsed-contract-comparison.json; contract-inventory.json; main-comparison.json; main-status-preservation.json |

The prescribed toolchain script was sourced in every dependency/build/test shell. Its version selection retained the VM's newer Node by default, so Node 22.20.0 was explicitly placed first on PATH for all product build, journey, browser and check executions. No repository pin was changed. Chromium was /usr/bin/chromium with --no-sandbox. The external browser harness added no registered test and changed no source. It used only synthetic data and ephemeral signing material; credentials and ephemeral private material are excluded from the packet. Browser contexts, the dev runtime, and test databases were closed by finally blocks. No production or real-provider operation occurred.

## Not run

- Full Verify and any baseline/full suite: forbidden by the focused read-only judgment. Only the two cited affected files run, once.
- Any GitHub Actions lookup, poll, rerun, retry, dispatch or job-log fetch: explicitly forbidden for this judgment. Zero GitHub API calls. Run 42086549248 and its workflow_dispatch/failure classification are supplied context, not independently queried evidence.
- Contract generator write, source-lock regeneration, status flip, product commit/push, main integration, PR, sourcepin, hold, release, readmission or adoption: outside read-only authority.
- Complete full-history publication scan: unavailable to this cloud and assigned to the final guard. No COMPLETE or NEW0 result invented.
- Root-supported readback of distinct source and exact-chain CT protections: not supplied as a readable supported mechanism in this task. ACTIVE is reported in the brief; root custody readback remains prerequisite to acceptance/protected final admission.
- Exact-FINAL full runtime Verify, exact-main Run site, guarded main equality and final diff/provenance/lock checks: lander duties, not satisfiable by this source-only review.
- Real provider, real device, vendor account, tenant approval and other-seed missing APIs: not invoked. UNMET-EXTERNAL, no live qualification; Field proof register remains 12 not run, 0 passed, 0 failed.
- Mutations and per-point new tests: prohibited; no product mutation testing or test-file edits.
- New stale-review API variant and inbox visual-quality/presentation judgment: outside the frozen original rubric and explicit nonvisual assignment. Functional browser proof remains present.
