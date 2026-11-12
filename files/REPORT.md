# Orbit RECORD-014 saved views republication

Updated: 2026-11-12T17:12:13Z

Task: sd-orbit-c-f162-rebase-1. Repository: just-every/run-orbit.

Product branch: cloud/sd-orbit-c-f162-rebase-1. Product head: 0fe9665a018e3e1d499fefdf14993163674be433. Push custody: pushed-and-remote-sha-verified.

Candidate READY: exact-SHA Verify run 43261466746 completed/success on 0fe9665a018e3e1d499fefdf14993163674be433. Eight affected local test cases passed after the historical release fixture was fetched. No clause status changed.

## Outcome

Mechanically merged the gate-passed saved-view candidate f15a833113df39d8cbfbf8ac56202d1234b0720b with main e397ddbd66ed9254302f762b7db3e831b5b72de5. Renamed the round’s saved-view migration to 0082 after main’s 0081 graph migration, resolved archive generation ordering, and regenerated deployment spec and source lock. The feature and Value-column fix are retained. No acceptance or status flips, production work, homepage changes, additional repository writes, main push, tag push, PR creation, or landing occurred.

The prior GATE PASS is provenance supplied by the brief; its fleet-only report was not shipped to this VM and was not independently read here. This task produces a new candidate, not a renewed independent gate verdict.

## Plan and content evidence

PLAN.md contains the complete execution plan. CONTENT-DIFF.md explains the comparison against the old gate-passed head. content-proof.json records file hashes and ancestry. product-vs-main.patch contains the complete product delta against the merged main; adaptation-vs-f15a8331.patch contains the migration/archive/generated-file comparison against the old head, including inherited main content.

Of the original round’s 19 feature/test files outside the four adaptation areas, 18 remain byte-identical to f15a8331 and records-list.tsx equals the clean three-way merge with main. All original test assertions are retained. The actual archive generation file is src/core/features/records/archive-generations.ts. The saved-view SQL is byte-identical under its new filename (SHA-256 4d5c969fca698f1107f71ffc973708cec64ca8f8aa02e9a0399cb0fb5cd92100). All 76 core migrations already on main remain byte-identical. No 0083 or 0084 migration is used.

Archive schema and portability registration already refer to table names; no additional filename references required edits. No obsolete 0081_saved_record_views.sql reference remains in the candidate. The deployment spec equals main plus the renamed saved-view entry; inherited graph content remains intact. The source lock was regenerated last.

## Local verification

Node 22.20.0 and pnpm 10.12.4 were used for final checks and observed in test processes. Initial rer install provisioned the pins; setup used fleet@runeditrun.com non-interactively. The cached rer pnpm shim invoked the VM Node for pnpm itself; the final toolchain selects the pinned official pnpm launcher, and final typecheck was repeated with exact pins. Browser proof uses /usr/bin/chromium and --no-sandbox. Build, setup, and long-running tests use cloud_run. No broad local suite was run.

| Check | Exit | Command | Actual log |
| --- | ---: | --- | --- |
| build | 0 | `npx -y @runeditrun/rer build` | build.log |
| typecheck-pinned | 0 | `pnpm run typecheck` | typecheck-pinned.log |
| migration-ledger-pinned | 0 | `node node_modules/@runeditrun/rer/bin/rer.mjs check --profile first-party` | migration-ledger-pinned.log |
| deployment-generate | 0 | `node scripts/publish-deployment-spec.mjs` | deployment-generate.log |
| deployment-check | 0 | `node scripts/publish-deployment-spec.mjs --check` | deployment-check.log |
| contract-generate | 0 | `node src/base/contract-docs.mjs write` | contract-generate.log |
| contract-check-generated | 0 | `node src/base/contract-docs.mjs check` | contract-check-generated.log |
| source-lock-final | 0 | `node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock` | source-lock-final.log |
| source-check-final | 0 | `node node_modules/@runeditrun/rer/edition-authoring/cli.mjs check` | source-check-final.log |
| prepare-state | 0 | `pnpm exec tsx tests/support/prepare-state.ts` | prepare-state.log |
| saved-views-core | 0 | `pnpm exec tsx --test --test-concurrency=1 tests/core/records-complete.test.ts` | saved-views-core.log |
| saved-views-browser | 0 | `pnpm exec tsx --test --test-concurrency=1 tests/delegation-browser/records-layout.test.ts` | saved-views-browser.log |
| archive-migration | 1 | `pnpm exec tsx --test --test-concurrency=1 tests/core/migration-recovery.test.ts newtests/t096/archive-schema-objects.test.ts newtests/t096/forward-upgrade.test.ts tests/core/archive-transfer.test.ts` | archive-migration.log |
| forward-upgrade-retry | 0 | `pnpm exec tsx --test --test-concurrency=1 newtests/t096/forward-upgrade.test.ts` | forward-upgrade-retry.log |

Every actual command receipt includes UTC timestamps, duration, exit code and the SHA-256 of its sanitized output. Both initial and final lock/check receipts are retained in the packet. applied-migration-ledger.json independently compares the test D1 ledger to all 77 current migration filenames and verifies graph 0081 immediately precedes saved views 0082. The repository AGENTS.md does not name a separate migration-ledger CLI; the repository’s first-party rer check, migration recovery tests, applied ledger comparison and migration-byte preservation provide the recorded migration checks.

The initial archive/migration invocation passed four cases and failed the forward-upgrade case because the shallow checkout lacked the v0.3.0 release tag (Git reported Not a valid object name v0.3.0). The release tag was fetched from the declared Orbit repository with depth 1, and only forward-upgrade.test.ts was rerun. Both the original failure and retry receipts are retained; no test assertion was changed.

The final affected test verdict is eight passing cases (test-verdict.json). The original first-party check, final pinned first-party check, typecheck, build, deployment spec, contract generation, source lock and source check all passed. The four saved-view browser screenshots at 1440 and 390 are retained with hashes in browser-proof.json.

## Contract status and counts

CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md match the merged main exactly. Contract write reported zero documents changed; check passed, and both generated views were restored whole from origin/main before locking. RECORD-014 remains PARTIAL. Clause changes by this task: none.

| Tier | Before done / partial / missing / total | After done / partial / missing / total |
| --- | --- | --- |
| Core | 42 / 112 / 24 / 178 | 42 / 112 / 24 / 178 |
| Agent surface | 0 / 18 / 8 / 26 | 0 / 18 / 8 / 26 |
| Later | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 |
| Full target | 42 / 130 / 32 / 204 | 42 / 130 / 32 / 204 |

## Publication and CI custody

The merge preserves published history. The new merge commit uses fleet author and committer, the fleet cleanup hook remains active, and no new AI trailer is added. The complete origin/main..HEAD candidate range including side parents is checked before each guarded push. Existing published f15a8331 retains its OpenAI <noreply@github.com> trailer, whose address is expressly allowed by this task; published history is not rewritten. identity-receipt.json and candidate-identities.txt record every candidate. The named product branch is the only product ref written.

CI discovery/polling uses gh REST with GH_TOKEN explicitly reloaded from the decrypted fleet bundle for each call; no credential value enters the packet. One watcher discovers the exact-SHA push Verify and polls at most once per 300 seconds. No duplicate workflow dispatch is made. github-calls.jsonl records the ten-call budget and each request; ci-receipt.json records exact SHA and run URL.

Current CI receipt:

```json
{
  "conclusion": "success",
  "head_sha": "0fe9665a018e3e1d499fefdf14993163674be433",
  "html_url": "https://github.com/just-every/run-orbit/actions/runs/43261466746",
  "id": 43261466746,
  "status": "completed",
  "expected_head": "0fe9665a018e3e1d499fefdf14993163674be433",
  "repository": "just-every/run-orbit",
  "observed_at": "2026-11-12T17:11:47Z"
}
```

A completed/success Verify on this SHA is required for READY, except the explicit generated-view-only allowance. The fleet Mac must run its independent publication gate and land; this cloud does neither. An uncompleted Verify is reported PUSHED. Evidence publication is report transport and makes no READY, acceptance or landing claim.

## Retention and blockers

The complete non-secret packet remains under $HOME/rer-consolidation/work/sd-orbit-c-f162-rebase-1/packet/. Only explicitly named regular report/receipt/screenshot files are selected for the report-only evidence ref. Credential files, environment dumps, private held-out gate material, symlinks, setup state, and product working trees are excluded. The successful product clone is deleted only after checks, product push, CI observation, and evidence publication; finished unpushed work is preserved with a verified bundle if push recovery fails.

Blockers: none.
