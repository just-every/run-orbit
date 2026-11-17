# gr-mt-orbit-ci-8 maintenance result

Author: Run Edit Run fleet. Date: 2026-11-17.

Outcome: **no-change**. Current main already fixes the reported Verify failure. Its full exact-SHA main-push Verify succeeds, and the retained failing journey passes locally. No product commit, product push, PR or landing is required.

Repository: just-every/run-orbit. Local branch: `cloud/gr-mt-orbit-ci-8`.
HEAD and current main: `a4fcbfcd72fa4253826f43d0b0de02275094f86d`.
Existing repair: `3286d217ddfa4de3a8599bd1fec6f8452416f3f4`.
Clone retained for the maintenance worker: `/home/agent/rer-consolidation/work/maint/gr-mt-orbit-ci-8/repo`.
Result: `/home/agent/rer-consolidation/work/maint/gr-mt-orbit-ci-8/result.json`, copied to this packet as `result.json`.

## Failure, cause and existing repair

The cited main Verify [42647988746](https://github.com/just-every/run-orbit/actions/runs/42647988746), on `2f798f68d71ff16264d3780d5e9230497a26de96`, failed job **129268274694**, `shards (batch-7)`, in **Verify routine product shard**. The source/build and other 19 product batches succeeded. The final verify job **129278331614** subsequently failed its dependency gate.

The product batch completed six cases: five passed and one failed. The failed case was `TEAM-001 signed-in peers use native and shared record actions while collaborators obey fields, grants and lifecycle fences`, registered in `newtests/t096/collaborator-lifecycle.test.ts`. Its browser assertion at `newtests/t096/team-operator-browser.ts:87` required the alert to contain `Record is unavailable`. The alert was absent while the permitted-record list had rendered. This remains wanted behavior: a collaborator's refused record must have visible feedback and must disclose no record details.

`SharedRecords` originally used one error state for both the list read and the individual-record read. A successful list response could arrive after the individual record's 403 and clear its refusal. Existing commit **3286d217**, “fix: an unavailable shared record's refusal survives a late list load”, separates those error states in `src/core/features/access/shared-records.tsx`. A successful list read clears only its own error. The existing browser regression holds the genuine list request until the record refusal appears, releases it, and asserts the alert survives after the permitted record button renders and no unavailable details appear. No refusal assertion was deleted or weakened. That fix and regression are ancestors of current main and remain present in its tree; `existing-fix.patch` records the original change.

## Plan and execution

The complete plan is retained in `PLAN.md`.

1. Set global fleet identity first, read and refresh the supplied launcher, install the decrypted-bundle Git helper and cloud push guard, clone only the declared repository with full history, set local identity and create the named cloud branch from origin/main.
2. Read the inline fleet rules and repository AGENTS.md, CLAUDE.md, TESTING.md, contract introduction and product context. Inspect the historical run metadata and failed job. The prescribed `gh run view 42647988746 --repo just-every/run-orbit --job 129268274694 --log-failed` returned exit 0 and empty stdout/stderr, but downloaded the archive into gh's cache. Recover the exact failed assertion from that cached ZIP without another log request. Retain only the assertion excerpt, excluding job environment dumps.
3. Trace the failed assertion to the repaired product race. Confirm the repair is already on current main. Use the brief's explicit no-change path, subject to focused local checks and exact-SHA CI.
4. Install the frozen dependencies. The supplied toolchain initially retained VM Node 24.19.0; explicitly install/select the repository's exact Node **22.20.0** before build, typecheck and tests. Use pinned pnpm **10.12.4** and install the clone-local co-author cleanup hooks after dependency setup.
5. Build once and run only typecheck and the affected existing test file, with one test worker. Use system Chromium `/usr/bin/chromium` with `--no-sandbox`, real HOME and the supplied subreaper. An external import configures only Chromium's executable and sandbox argument; repository test source and assertions are unchanged.
6. Discover current main's runs using the full SHA and inspect its successful main-push Verify's job coverage. Confirm Git advertises the same default-branch SHA and the checkout is clean. Write the no-change maintenance result and publish this explicit report packet only to the evidence branch.

## Local proof

- `cloud_run pnpm install --frozen-lockfile`: passed, exit 0.
- `cloud_run pnpm exec rer build`: passed, exit 0. Existing Vite native-config compatibility warnings remain in `build.log`; no product tests ran in the build.
- `cloud_run pnpm run typecheck`: passed, exit 0.
- `ORBIT_FOLD_BROWSER_EVIDENCE=<private-output> cloud_run pnpm exec tsx --import /tmp/gr-mt-orbit-system-browser.mjs --test --no-test-only --test-concurrency=1 --test-reporter=spec --test-reporter-destination=stdout --test-reporter=./scripts/core-results.mjs --test-reporter-destination=<packet>/focused-results.jsonl newtests/t096/collaborator-lifecycle.test.ts`: **2 passed, 0 failed, 0 skipped, 0 cancelled**, exit 0, 325.95 seconds. Both native authority and emitted browser paths passed. The original refusal assertion and delayed-list regression passed at **1440 and 390**. The existing teardown closed browser contexts, Chromium, Worker and temporary D1 fixtures; the subreaper completed successfully.
- The journey produced **24 accessibility receipts, 0 serious/critical findings**. Selected refusal screenshots and accessibility/error receipts are included for both widths. Both screenshots show `Record is unavailable` alongside the completed permitted-record list. They contain synthetic fixture records.
- `node scripts/verification-inventory.mjs`: before and after **198 registered cases + 2 qualification flows = 200**. Tests added, removed, skipped or weakened by this task: **0**.
- `git status --porcelain=v1`: empty. `git log origin/main..HEAD` identity/trailer range: empty. The affected files are identical to origin/main. No full local verify or unrelated suite ran.

## Exact-SHA CI and counts

[Main-push Verify 43875960631](https://github.com/just-every/run-orbit/actions/runs/43875960631) is **completed/success** on exactly `a4fcbfcd72fa4253826f43d0b0de02275094f86d`. Its source/build job **133329137033**, every batch **0 through 19**, including batch 7 job **133330706380**, and aggregate verify job **133347335355** succeeded. Light coverage was skipped: these are actual full product shard results. [Main Run site 43875960451](https://github.com/just-every/run-orbit/actions/runs/43875960451) is also completed/success on the same SHA. No workflow was dispatched or rerun by this task.

| Measure | Historical failure | Current result |
| --- | ---: | ---: |
| Passing product batches | 19 | 20 |
| Failing product batches | 1 | 0 |
| Failing retained collaborator cases | 1 | 0 locally |
| Test inventory | 200 on current source before checks | 200 after checks |
| Product files changed by this task | 0 | 0 |
| Clause status changes by this task | 0 | 0 |

The product has advanced since the historical SHA; no unchanged partition mapping or historical inventory total is inferred from these counts. Current contract summaries remain **Core: 42 done / 112 partial / 24 missing; Agent surface: 0 done / 18 partial / 8 missing; total: 42 done / 130 partial / 32 missing, 204 clauses**. TEAM-001 remains partial with its existing broader gap; this focused maintenance result makes no whole-clause claim or promotion. Contract text, judgments, generated views and source lock are unchanged.

## Custody, limitations and defaults

Six GitHub read invocations were used, within the ten-call budget. One mistaken short-SHA discovery returned no runs; the later full-SHA discovery and job read were spaced by at least 300 seconds. `receipt.json` records each command. No blocked archive download, artifact retry, rapid polling loop, PR, product push, main write or other repository write occurred.

The historical failing commit was not rebuilt locally. The explicit no-change outcome is supported by the identified existing repair, the exact original assertion passing on current main and its full exact-SHA CI; this is an already-resolved maintenance item, not an uninvestigated false-positive claim. No product publication scan is claimed because no product tree is being published. Report-only evidence publication is separate from product READY, acceptance and landing.

Blockers: **none**. Default: retain current product behavior, tests and contract judgments. No product READY/PUSHED line is warranted because this task created no product commit and published no product branch. The maintenance clone is retained as the brief's requested return artifact. Full actual non-secret report, command logs and receipts are under `/home/agent/rer-consolidation/work/gr-mt-orbit-ci-8/packet/` and selected explicitly for `refs/heads/evidence/gr-mt-orbit-ci-8`.
