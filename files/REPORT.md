# Orbit readable workflow runs and Zoom setup continuation

Repository: just-every/run-orbit
Branch: cloud/main-orbit-readable-runs-1-pc2
Candidate: 89e4e3dcef68fb1e93f1e10d21343a38e6bc2705
Saved continuation: 7e577833179cbd0fb8db8500b61a8bd0a1d2e56b
Product commits retained: 97bec7a7809848abf1aafe4fe5e4423e99b13922 and 7e577833179cbd0fb8db8500b61a8bd0a1d2e56b
New forward commit: 89e4e3dcef68fb1e93f1e10d21343a38e6bc2705
PR: none; this lane returns a named cloud branch to the fleet lander.

## Plan and implementation

The complete plan is in PLAN.md. I installed fleet authentication and commit hooks, cloned only the declared repository, fetched the exact continuation, inspected its failed Verify, installed dependencies, and exercised the affected public doors. Fetching main found no newer main commit to merge. I preserved both saved commits and used one forward commit; no rebase, amend, force push, main push or generated view edit occurred.

The saved product changes make expanded workflow runs readable: named owner, linked task and deal, action attempts/outcomes, linked source evidence, and readable retained Undo. Raw execution data is in the deliberately opened Technical details disclosure. The Zoom setup page explains Server-to-Server OAuth app creation, the account/client/secret values, webhook secret location, scopes, events, activation and endpoint validation. It links Zoom's own instructions and explains public HTTPS hosting or a temporary HTTPS tunnel instead of loopback.

Local reproduction found a remaining test defect in tests/rer/workflow-journey.mjs: after Undo, its record change can enqueue a newer loop-stopped run. The existing first-row locator therefore switched from the completed/undone run to the new stopped row. The forward commit selects the unique retained Undone row for the same workflow, asserts its visible inspection reason, and keeps the existing assertion that the actual record title is restored. No execution or provider behavior changed. The documented authoring CLI regenerated sources.lock.json last, and its exact check passed.

## Local results

- Native rer install, non-interactive setup and build passed, through the cloud subreaper.
- The retained RECORD-005 browser journey in tests/e2e/operator.spec.mjs passed on the candidate. Its taskActivityJourney extension exercises the native Settings pipeline history, opens the created task and source evidence, checks the named owner, checks absence of raw JSON/internal identifiers from the default expanded result and Undo, opens Technical details deliberately, and verifies that Undo retains the created task. It asserts at 1440 and captures both 1440 and 390.
- The existing BASE-PUBLIC-003 T099 native operator routes and expanded data views at 1440px journey in tests/rer/operator-desktop.test.mjs first reproduced the wrong-row failure on the saved head and passed after the fix. It retains the field-write, Undo restoration and later workflow behavior assertions.
- Typecheck passed on the candidate.
- node node_modules/@runeditrun/rer/edition-authoring/cli.mjs check passed; git diff --check passed; worktree clean.
- The expanded Zoom guide was inspected through Settings > Integrations > Connect Zoom and How to set this up, with captures at 1440 and 390. The document width equaled the viewport width in both cases. No Zoom connection, provider behavior or wording-pin test was added.
- All browser launches used disposable contexts and /usr/bin/chromium with --no-sandbox. The temporary local browser overrides were outside the product tree. Started servers and browsers were stopped by their own tracked process handles or PIDs.

Complete actual receipts: LOCAL-RECEIPT.json, desktop-before-fix.log, desktop-candidate.log, workflow-browser.log, typecheck.log, source-lock-check.json and zoom-browser.log. Six PNG captures show workflow outcome, Undo and expanded Zoom setup at 1440 and 390. No browser trace, cookie/session state, credentials or environment dump is included.

## Counts and clauses

Before/after test inventory: 198 tests + 2 qualification scripts = 200 / 200, unchanged. No registrations added or removed. The two stranger findings remain addressed by the retained product commits. This continuation fixes one test defect: one reproduced failing existing journey -> passing. Combined branch diff: 9 files, 170 insertions, 14 deletions. Continuation diff: 2 files, 6 insertions, 4 deletions, including the generated source lock.

CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md were unchanged. Clause Status, Gap and Evidence cells were unchanged; there is no DONE claim and no claim to have proven a complete AUTO-001 or INTEGRATE-002 acceptance point. The outcome presentation assertions supply partial evidence for AUTO-001's readable retained execution requirement. Zoom setup is copy/proof only; live provider qualification and the wider INTEGRATE-002 buyer journey remain outside this round.

CLAIM AUTO-001 PARTIAL points=none tests=tests/e2e/operator.spec.mjs#RECORD-005 — the mobile opportunity timeline shows metadata and orders out-of-order notes with ID ties; tests/rer/operator-desktop.test.mjs#BASE-PUBLIC-003 T099 native operator routes and expanded data views at 1440px
GAP INTEGRATE-002: This copy change proves no complete provider acceptance point; live Zoom qualification remains outside this round.

## CI and custody

Prior Verify: 43567551061 on saved SHA 7e577833179cbd0fb8db8500b61a8bd0a1d2e56b, with batch-18 and aggregate failure. A single failed-job retry was requested before local reproduction identified the test issue; it is not used as candidate acceptance. Prior failed-job stdout was empty; the artifact download was Forbidden (HTTP 403), documented in TRANSPORT.md without signed queries. No blocked archive was retried.

Candidate Verify: 43575692792 on exact SHA 89e4e3dcef68fb1e93f1e10d21343a38e6bc2705. Its final result is recorded in CI-RECEIPT.json and the terminal return. REST discovery/polls use one watcher, at least 300 seconds between calls for that run, within the ten-call GitHub budget.

Every candidate author, committer, trailer and complete message was inspected before product pushes: all identities were Run Edit Run fleet <fleet@runeditrun.com>, with no co-author trailers. The cloud push guard confirmed the saved named branch and pushed the forward commit. Product receipts are product-push.txt and product-push-fix.txt. All evidence stays outside the product branch, and is published separately to evidence/main-orbit-readable-runs-1-pc2. Evidence publication grants no product acceptance or landing signal. The fleet owns the unavailable publication scan and landing gates after return.

## Terminal outcome

PUSHED: product branch cloud/main-orbit-readable-runs-1-pc2 has exact remote head 89e4e3dcef68fb1e93f1e10d21343a38e6bc2705. Both local browser journeys, typecheck, source-lock validation and the 1440/390 screen checks passed. The exact-SHA Verify run 43575692792 remained in_progress with conclusion null at the final REST observation, 2026-11-14T09:02Z, approximately 38 minutes after the candidate push. Ten GitHub calls were used, and no additional polls or unrelated workflow reruns were made. No READY, CI-green, acceptance or landing claim is made. No known local product blocker remains; the only outstanding gate is completion of that exact-SHA Verify.

Counts remain 198 tests + 2 qualification scripts = 200/200 before and after. Clause status changes: none. Product execution and Zoom provider behavior are unchanged in this continuation. The plan and all actual local/CI/custody receipts are in this packet; the initial evidence transfer was fetched back successfully and all 24 initial file hashes verified. The final packet adds the later REST observations and terminal provenance on the same report-only evidence ref. The product clone will be removed after successful final evidence publication; this packet is retained outside it.
