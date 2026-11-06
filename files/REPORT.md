# Orbit f40-land-2 exact failed-case diagnosis

Task: `sd-orbit-f40land2-ci-triage-1` · Role: triage · Repository: `just-every/run-orbit`.

**NOT REPRODUCED.** The exact requested file passed once on candidate, fresh main, and original repair (three executions: 3 pass, 0 fail). The source identifies an existing error-classification race shared by all three heads, but none of these three runs reproduces the supplied CI failure; no candidate-specific causal attribution is supported.

This is a read-only technical diagnosis, not a product repair, acceptance judgment, gate, READY claim, or permission to land. The cloud report-return instructions separately authorize report-only publication to `refs/heads/evidence/sd-orbit-f40land2-ci-triage-1`.

## Provenance and scope

| Head | Full commit SHA | Role |
| --- | --- | --- |
| Candidate | `f73da7ab1a8ceebedbb302a415e117a34e2355e9` | Exact supplied candidate; fetched candidate ref matches |
| Fresh main tested | `32c41a210e1488e53b36c79d6d5056a1a9ab60e3` | Main at clone and initial fresh fetch |
| Original repair | `8997ad7e3112fc65ed426845d70a12813ceb8432` | Expanded via `git ls-remote --heads origin '*f40*'`, then fetched fix1 branch |
| Original repair/main common ancestor | `b305e58f673cfe0b9485e179d2678734e261c7a8` | `git merge-base` result |
| Landed source introduction | `47762e3e3173a0804126ed7032801bbbc9e7d46d` | Carry gated Orbit OR3 and OR4 onto main |

The supplied historical evidence says candidate Verify `42270737226`, attempt 1, job `128075546458` (shards batch-13) failed at `tests/rer/operator-routes.mjs:29`: expected “This contact does not exist.”, observed “Record not found.” after the unchanged 5000 ms assertion timeout. It says original repair Verify `42226746421`, attempt 2, passed. Those are supplied historical facts, not newly queried receipts. No GitHub Actions API reads, log downloads, polling, dispatches, reruns, or PR operations were made by this task; GitHub API budget used: 0/10.

Main was unchanged: clone, initial fresh fetch, tested main, and final fresh fetch all resolve to `32c41a210e1488e53b36c79d6d5056a1a9ab60e3`.

The locally created task branch is `cloud/sd-orbit-f40land2-ci-triage-1`, based on initial main. The three source runs used detached committed HEADs in the same disposable clone. No product commit, product push or PR was made. Only the evidence ref is published. No hold, lifecycle, release or clause changes were made.

## Plan and execution

`PLAN.md` contains the full plan. The task followed it in order: read the inline RULES and both AGENTS files; initialize the launcher, bundle-only credential helper and fleet hooks; clone shallow/blob-filtered; record refs; build and run exactly the requested file once per head; compare source blobs and landed history; re-fetch main for the movement record; review and publish the explicit non-secret packet; delete the disposable clone and dependencies after evidence publication.

Cloud adaptation: commands ran directly in the dedicated Linux VM, replacing `heavy-slot.py --remote auto`. There was no Mac load/slot polling. `cloud_run` is the supplied Linux child subreaper. No stress, throttling, test changes, retry of an assertion, wait weakening or timeout change was used.

Common setup commands (all successful):

```sh
git config --global user.name 'Run Edit Run fleet' && git config --global user.email fleet@runeditrun.com
bash /workspace/rer-cloud-launcher/refresh.sh
python3 /tmp/fleet-git-setup.py
git clone --depth 1 --filter=blob:none https://github.com/just-every/run-orbit.git "$HOME/rer-consolidation/work/sd-orbit-f40land2-ci-triage-1/run-orbit"
git config user.name 'Run Edit Run fleet' && git config user.email fleet@runeditrun.com
git switch -c cloud/sd-orbit-f40land2-ci-triage-1 origin/main
python3 /tmp/fleet-hooks.py
git fetch --depth 200 origin main cloud/sd-orbit-c-f40-land-2
git fetch --depth 200 origin refs/heads/cloud/sd-orbit-c-f40-land-2:refs/remotes/origin/cloud/sd-orbit-c-f40-land-2
git ls-remote --heads origin '*f40*'
git fetch --no-tags --depth 200 origin refs/heads/cloud/sd-orbit-c-f40-fix1:refs/remotes/origin/cloud/sd-orbit-c-f40-fix1
source /tmp/rer-cloud-toolchain.sh
pnpm install --frozen-lockfile
npm install --prefix "$HOME/.rer/toolchain/node-22.20.0" --no-audit --no-fund node@22.20.0
export PATH="$HOME/.rer/toolchain/node-22.20.0/node_modules/node/bin:$PATH"
cloud_run npx -y @runeditrun/rer setup --owner-email fleet@runeditrun.com --non-interactive
python3 /tmp/fleet-hooks.py
```

One preliminary Git fetch (before the successful ref fetches above) exited 128 because an abbreviated commit was used as a remote ref: `git fetch --depth 160 origin main cloud/sd-orbit-c-f40-land-2 8997ad7e`, diagnostic `fatal: couldn't find remote ref 8997ad7e`. It was a ref-name error, not an authentication or transport failure. It was resolved by discovering and fetching the named fix1 ref with its full SHA, without another credential or a GitHub API request.

Per head, `git switch --detach <FULL_SHA>` exited 0. Before every build/test sequence `git status --porcelain` was empty. Commands and complete actual outputs are in `<head>-receipt.json` and `<head>-{build,seal,prepare,test}.log`, with the machine-readable test events in `<head>-results.jsonl`:

```sh
# Each fresh command shell sourced /tmp/rer-triage-env.sh, which sources the supplied
# toolchain and then selects Node 22.20.0 and the shared system Chromium cache.
cloud_run npx -y @runeditrun/rer build
pnpm exec node scripts/verification-build.mjs seal && pnpm exec node scripts/verification-build.mjs check
cloud_run pnpm exec tsx tests/support/prepare-state.ts
cloud_run pnpm exec node --test --no-test-only --test-concurrency=1 --test-reporter=spec --test-reporter-destination=stdout --test-reporter=./scripts/core-results.mjs --test-reporter-destination=verification/rer-operator-desktop-results.jsonl tests/rer/operator-desktop.test.mjs
```

The last command is the exact requested CI test command, wrapped only in the supplied process subreaper. No other test file or suite was run. The prepare command applies migrations and synthetic fixtures, as the CI shard does. Each head has its own newly built app and seal/check receipt; no app build from another SHA was reused. The fixture itself creates its own disposable installation and runs its native setup/dev flow, exactly as in the unchanged test. The initial candidate build was completed just before the driver and copied into its receipt rather than repeated.

| Head | Build exit | Seal/check exit | Prepare exit | Test exit | Tests / pass / fail | Test duration |
| --- | ---: | ---: | ---: | ---: | --- | ---: |
| candidate | 0 | 0 | 0 | 0 | 1 / 1 / 0 | 192.362 s |
| main | 0 | 0 | 0 | 0 | 1 / 1 / 0 | 196.499 s |
| original | 0 | 0 | 0 | 0 | 1 / 1 / 0 | 199.682 s |

All per-head before/after source checks were clean: True. These local tests are not a replacement for exact-SHA Verify and do not turn the historical red CI run green.

## Same runner

`runner.json` records the stable machine-id SHA-256, Linux kernel/architecture, and tool versions. All three runs used the same dedicated Debian 13 x86_64 VM and checkout path, Node **22.20.0**, pnpm **10.12.4**, Playwright **1.64.1**, rer **0.2.96**, and `/usr/bin/chromium` **154.0.8037.57**, with Playwright’s default `--no-sandbox` argument retained. External Playwright browser-cache launch paths were symlinked to that system binary; no tracked test, product, config or dependency source was edited. No real browser profile or cookies were copied.

The supplied toolchain initially prints the VM’s Node 24.19.0 before the explicit PATH override selects 22.20.0; this explains that first line in command logs. Both the command process and its spawned native setup/dev/browser driver used the pinned override. Differences from GitHub’s runner are Debian 13 vs Ubuntu 24.04, and system Chromium 154 vs Playwright-managed Chromium 156. Thus these are controlled same-runner comparisons, not a claim to recreate GitHub’s exact machine image.

## Source trace and smallest supported mechanism

`source-identities.json` proves identical Git blob IDs on all three heads for 18 relevant files, including the failing test/helper, checkout/fixture driver, contact route, missing-page component, record/context readers, resource hook, record/relationship API handlers, dependency lockfile, package manifest and Node pin. `source-trace.txt` retains the decisive numbered lines, and `source-history.log` retains the candidate delta and landed source diff.

1. `tests/rer/operator-routes.mjs:17-29` visits each kind with `invalid.id` and the syntactically valid but absent `00000000000000000000000000`, requiring the main alert to contain the kind-specific missing message. Contacts are checked before companies.
2. `src/routes/app.contacts.$id.tsx:5-8` validates the ID with `requireDetailId` and registers `operatorDetailErrors('contact')`. `invalid.id` throws the route’s `notFound` before component loading. The all-zero ID satisfies the ULID-shaped regex in `src/routes/-operator-detail.tsx:17-19`, so its absence must be handled by the data load.
3. `src/routes/-operator-detail.tsx:22-33` supplies **“This contact does not exist.”** with a Contacts-list recovery link when the route reaches `notFoundComponent`.
4. `src/core/features/operator/ui/record/customer-record.tsx:36-41` instead starts three loads in one `Promise.all`: `readRecord`, settings, and (for contacts) `readContext`. The first rejection owns the resource failure.
5. Both missing-record paths produce **“Record not found.”** at the server: `src/core/features/records/shared.ts:12` (record read via `RecordsRepository.detail`) and `src/core/features/relationships/snapshot.ts:35` (relationship snapshot via `readContactContext`). Their Hono error handlers return the error text with HTTP 404.
6. `src/core/features/operator/ui/record/record-api.ts:19-23` preserves the record endpoint’s HTTP status on the thrown Error. `src/core/features/operator/ui/use-operator-resource.ts:31-32` sees status 404 on `contact:<id>` and throws `notFound`, producing the expected kind-specific alert.
7. But `readContext` in `record-api.ts:37-40` throws a plain Error and **drops the response’s status**. If this parallel relationship read rejects before the record read, the resource hook cannot recognize it as a 404. `customer-record.tsx:49` renders `resource.error.message` directly as the main alert, producing the observed generic **“Record not found.”**. Waiting 5000 ms cannot change which rejection won the already-settled Promise.all; this is a semantic error-classification race, not evidence for a timeout raise.

This identifies a source-supported intermittent mechanism. The uninstrumented single-run tests do not record the network-completion order, so the source mechanism is not presented as a measured network trace. No delay, mock or instrumentation was added to force either order.

The contact route, concurrent reader, status-dropping `readContext`, missing-page wording, and expanded assertion were carried onto main by **`47762e3e3173a0804126ed7032801bbbc9e7d46d`**, “Carry gated Orbit OR3 and OR4 onto main.” Its diff adds `record-api.ts` with `readRecord` retaining status and `readContext` discarding it, creates the contact route, extends resource 404 recovery to contact/company, and changes `-operator-detail.tsx` to “This … does not exist.” It is not a later literal replacement of “This contact…” with “Record not found.”: those are two different existing error paths. Later `d1f495c2b36ca0e6a7f1c98d9277d1a3fcdce156` adds the full-operator/read-only component split but does not alter this full-operator concurrent read/error handling. Both landed before the original repair.

The entire candidate diff `git diff origin/main...f73da7ab1a8ceebedbb302a415e117a34e2355e9` is six files, 125 insertions/24 deletions: `src/core/features/today/promises.ts`, `tests/core/today-brief.test.ts`, `tests/support/today-workspace.ts`, `CONTRACT.md`, `ACCEPTANCE.md`, and `sources.lock.json`. Candidate product commit `bf41c34e74ba31165f13c8d9251884b6d178bb35` repairs stopped draft/old reply promise selection; the final commit records BRIEF-002 completion. Neither changes contact routes, record/context error status, the failing assertion, package pins or the concurrent loader. A direct original-repair-to-candidate diff for the three promise implementation/test/support files is also empty (exit 0; retained in source-history.log). There is no evidence for a new interaction between the BRIEF-002 repair and a newer main change.

The historical original-repair green run cannot establish that the shared asynchronous race is absent. No new query or log refetch was made to reinterpret that run’s coverage or actual event ordering.

## Counts and clause status

No registrations, assertions, waits, timeouts or test files changed: one existing test executed once per head, three executions total. No product commit or product push; no PR. Clause changes made by this task: **none**.

`contract-observations.json` preserves the already-existing generated counts. Main and original repair have full-target 36 done / 136 partial / 32 missing (204 total); the inspected candidate has 37 done / 135 partial / 32 missing, because its existing final commit records BRIEF-002 partial → done. That is provenance of the supplied candidate, not a status edit or acceptance claim by this triage. This task’s before/after counts on main remain 36/136/32; no generated view was edited or committed.

## Disposition, preservation and cleanup

Triage complete. Send an informational note to fv about the source-supported shared status-loss race in the landed OR3 contact loader, and retain the historical red Verify as supplied. Default: no product FIX, no assertion weakening, no timeout increase, no rerun/dispatch, no clause or lifecycle change, and no gate/landing decision from this report. A future authorized follow-up could investigate preserving the HTTP status on relationship-read errors or making the primary record read own missing-record recovery; this task does not implement or approve such a change.

The first evidence attempt stopped before push: the additional identity audit attempted a local fetch from the shallow blob-filtered product clone, and Git upload-pack could not supply an unfetched promisor object (exit 128; HTTP not applicable). The actual CLI receipt and diagnostic are retained in `evidence-attempt-1.log` and `evidence-local-audit-diagnostic.log`. The audit was changed to fetch the declared repository’s main directly with `--depth 1 --filter=blob:none`; the report-only publish is retried without altering product code or repeating tests. This is a report-transport setup correction, not a product or CI failure.

Report and receipts live under `$HOME/rer-consolidation/work/sd-orbit-f40land2-ci-triage-1/packet/`. Explicitly selected files contain reports, actual command/test output, public source excerpts/hashes, and receipts only. They exclude launcher credentials, setup’s private output, environment dumps, private gate material, browser profiles, sign-in links and symlinks. Evidence commits use fleet author/committer identity and a report-only tree, with no product branch changes or landing signal.

Each completed test closed its own browser, stopped its recorded dev child, confirmed its private port was free, removed its disposable installation and temporary state, and returned through the subreaper. The task branch was restored locally with a clean source tree. After successful report-only publication, the remaining disposable product clone and dependencies are deleted; the terminal answer confirms completion. Packet files remain outside that clone. No finished unpublished product work exists.
