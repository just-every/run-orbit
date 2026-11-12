# Readable values replay result

Repository: just-every/run-orbit
Tag: main-orbit-readable-values-1-c1
Branch: cloud/main-orbit-readable-values-1-c1
Head: d5b68611ed0e6fc2753816edc4ae8a218d0f85b5
Base: eab0faafccd2eb0945dddb7d0f52c30ce573c04c
Tree: b0d499f95537df3d6a8854abc469557a660feecc
Replay source: d61f2aadce0a80a803ca5cc646f5aef27ee357cc
PR: none; the repository does not require a builder PR for this lane.
Exact-SHA Verify: 43256031139 — completed/success
CI URL: https://github.com/just-every/run-orbit/actions/runs/43256031139

The complete plan is in PLAN.md. The executed sequence was: initialize fleet identity and launcher; clone full history and inspect current main and the prior candidate; squash the readable-values net change; restore all three contract files from main; set up the pinned toolchain; regenerate the source lock last; run source, contract, type, build and affected browser checks; preserve one new product commit; inspect all candidate identities and trailers; push through the fleet guard; check exact-SHA Verify via the bounded REST watcher; publish this explicitly selected non-secret packet separately from the product branch.

## Product result

The single replay commit retains readable shared stage, owner and company names; workspace-currency units and workspace dates; native cents and ISO instants in storage/API/export contracts; readable transfer start/size labels with the ID in Copy details and support details; and readable merge-review labels while the editor retains supported merge syntax. Transfer resumption, explicit discard and restore rollback remain exercised through the shipped controls. No sharing permission, export format or template syntax changes were added beyond the requested replay.

All 20 non-lock changed files are byte-identical to the original candidate's corresponding files. The squash applied cleanly, so no manual source or test conflict resolution was necessary. The documented source-authoring lock command regenerated sources.lock.json against main and source:check passes. CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md are byte-identical to the base main files. No generated views, screenshots or fleet evidence enter the product commit.

## Counts and assertions

- Product commits added: 0 → 1; merge commits added: 0.
- Registered tests: 198 → 198; qualification flows: 2 → 2; total: 200 → 200.
- Clause statuses: done 42 → 42, partial 130 → 130, missing 32 → 32.
- Clause status, gap and evidence-cell changes: none.
- Direct assertions in existing touched helpers: 183 → 199, plus assertions in the new readable-values and merge helpers.
- Every original direct assertion is retained except the old 3200-cent display assertion, which is adapted to compare the displayed currency amount with unchanged exported native cents divided by 100 and to require its USD accessible name. No test registration is removed, skipped or loosened.

## Validation

- node src/base/contract-docs.mjs check: passed.
- node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock: completed.
- pnpm run source:check: passed.
- pnpm run typecheck: passed.
- npx -y @runeditrun/rer build through cloud_run: passed.
- tests/e2e/operator.spec.mjs: 6 passed.
- tests/archive/browser.spec.mjs with its archive config and rollback helper: 1 passed.
- newtests/t096/browser-journeys.test.ts and newtests/t096/collaborator-lifecycle.test.ts: 3 passed.
- git diff --check: passed.
- Fleet identity and trailers: all candidate commits checked, including side parents.
- Exact-SHA Verify: completed/success, run 43256031139, SHA d5b68611ed0e6fc2753816edc4ae8a218d0f85b5.

All local browser checks used Node 22.20.0, pinned pnpm 10.12.4, the real HOME, and /usr/bin/chromium with --no-sandbox through a temporary external launch adapter. No product source was changed for the cloud browser environment. The tested source tree equals the committed candidate tree. Browser proof includes shared guest values, report drilldown, archive controls, message library and merge review at viewports 1440 and 390. The new shared-values behavior assertions run at 1440; the 390 shared-values frame is proof. Existing main journeys retain their existing viewport assertions.

The archive journey verifies the copied transfer ID, row count and start instant, hidden support ID, resumption after reload, streamed download, recovery labels, canceled-restore rollback, renewed authentication, and browser/CLI domain-record round trips. The shared-values helper verifies no stored stage/person/company ID, cents number or ISO close timestamp is rendered in the permitted detail; a USD edit and New York wall-time edit persist native cents/UTC instants; custom text remains text; historical closing attribution reads as a person's name.

## Claims and remaining scope

CLAIM OUT-014 PARTIAL points=6 tests=tests/e2e/operator.spec.mjs#ACTION-004 — the desktop draft editor saves D1 state and surfaces a revision conflict
CLAIM DATA-001 PARTIAL points=3 tests=tests/archive/browser.spec.mjs#native archive preparation, streamed download, confirmed restore and renewed session preserve workspace records
CLAIM TEAM-005 PARTIAL points=none tests=newtests/t096/collaborator-lifecycle.test.ts#TEAM-001 signed-in peers use native and shared record actions while collaborators obey fields, grants and lifecycle fences

GAP OUT-014: This round carries screen inspection; remaining template, sharing and immutable-send qualifications stay as recorded on main.
GAP DATA-001: This round carries the existing archive round-trip slice; no complete DATA-003 or hosted qualification is claimed.
GAP TEAM-005: Real sales roles, teams and restricted-role qualification remain outside this readable-values replay.

No DONE claim is made. Existing partial-clause gaps remain as main records them. This round does not claim complete role/team qualification, provider qualification or release acceptance. The supplied policy defaults apply; no missing ruling was needed. The full publication scan and landing remain with the fleet's Mac lander.

## Custody

Product custody is the pushed cloud branch and exact product SHA above. Evidence custody is the separate evidence/main-orbit-readable-values-1-c1 ref and its evidence.json manifest. Neither evidence publication nor these builder receipts signal acceptance or landing. Only explicitly selected regular report, receipt, log and synthetic-fixture screenshot files are published. Credentials, environment dumps, session-bearing traces and private fixture state are excluded.

Blockers: none
