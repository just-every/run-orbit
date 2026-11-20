# Orbit RER adoption check receipts

## Checkout and source

- Orbit base `a9fa1830c1913562154dedaeb5a1322ead7c3e6b`. Candidate `6e5164471b51f5a9efacf86d27d441df6b9986a1`. The candidate has one parent, one commit above `origin/main`, an empty merge list and an empty worktree status.
- Node `22.20.0`, pnpm `10.12.4`, installed RER `0.2.125`. `pnpm add --save-dev --save-exact --lockfile-only @runeditrun/rer@0.2.125` and `pnpm install --frozen-lockfile` exited 0. The package manager changed only the requested dependency and its integrity entry in the lockfile.
- `pnpm exec rer refresh-base --ref 965e8d4e105f6f4d281dacb3c099f6a958a886e7 --base ../base` reported `refresh-base: complete (exit 0)`. There were six added operator-auth files, two updated operator-auth entry files, one changed Base adoption guide and the refreshed Base copy record.
- `node node_modules/@runeditrun/rer/edition-authoring/cli.mjs verify-base --base ../base` found zero hash/mode drift and one unrecorded byte match. The existing Orbit migration `migrations/core/0070_agent_door.sql` and Base's archived test fixture `modules/agent-door/tests/fixtures/schema-0.2.93/agent-door.sql` had the same object `47d4cc8153f902cb1cded1c3dc9c48048844207f` at the prior pins. `verify-base --offline` reported `ok: true`.
- `node src/base/contract-docs.mjs write` printed `Wrote 0 contract documents.` The subsequent `check` printed `Contract documents are current.` The two views were restored from main before regenerating `sources.lock.json`. The edition-authoring `lock` and `check` both exited 0. The lock contains the six added Base files.
- `git diff --cached --check` exited 0. The candidate's author and committer passed the fleet identity check and the commit body has no trailers.

## Local source gates

| Gate | Observed result |
| --- | --- |
| `pnpm exec rer check --profile first-party` | exit 0 |
| `pnpm run check:boundaries` | 892 core source files checked |
| `pnpm run check:manifest` | `1/1 valid` |
| `pnpm run agent:surface` | 32 tools, 10 resources and 47 native journey steps |
| `npx -y @runeditrun/rer build` via `cloud_run` | `Your application is built`, `build: complete (exit 0)` |
| `pnpm exec node node_modules/@runeditrun/rer/cli/agent-door.mjs . deploy.json` | `Agent door conformance: 6017/6017 points passed.` |
| `pnpm exec node scripts/publish-deployment-spec.mjs --check` | Deployment spec matches the build and setup digest |
| `pnpm run typecheck` | `tsc --noEmit` exited 0 |

## Stock Orbit archive

The disposable checkout used the candidate's source and a successful RER setup. Setup applied 84 migrations. The initial setup attempt from the product checkout had found the concurrent local Agent door process and exited 4. The disposable checkout supplied its own build and state.

```sh
pnpm exec rer export --output exports/orbit-adoption.rer
mv .wrangler/state .wrangler/source-state
test ! -e .wrangler/state
pnpm exec rer import --input exports/orbit-adoption.rer --yes
pnpm exec wrangler d1 execute DB --config wrangler.jsonc --local --persist-to .wrangler/state --command 'SELECT (SELECT count(*) FROM operators) AS restored_operators, (SELECT count(*) FROM d1_migrations) AS applied_core_migrations' --json
pnpm exec rer export --output exports/orbit-reexport.rer
```

The CLI uses the checkout's `.wrangler/state` for local import. Wrangler's post-import read supplied the explicit `--persist-to` path. Export, fresh import and re-export each completed successfully with 138 tables and 19 rows. The database contained one restored operator and 84 applied core migrations. The original and re-exported manifests and footers agreed on those totals and the content hash.

## Emitted Orbit Worker archive

```sh
pnpm exec tsx --test --no-test-only --test-concurrency=1 newtests/t096/archive-cli-native.test.ts newtests/t096/archive-export-recovery.test.ts
```

TAP reported two passes, zero failures, zero skips. The first journey exported through the built Worker, refused tamper, truncation and an invalid typed value, restored the fresh destination and verified and re-exported native records, an owner-defined test table, binary data and the maximum exact integer. The second journey verified owner recovery, resume and discard of a frozen export before a fresh shipped CLI export.

## Base Worker owner-migration replay

```sh
node --test modules/portability/tests/owner-worker-history.test.mjs
```

This ran from Base at the adopted revision. The installed package's `cli/portability-evidence.mjs`, `owner-history.mjs`, `worker-history.mjs` and `worker-owner-history.mjs` were byte-equal to that checkout. TAP reported one pass, zero skips and zero failures. The test proved restore of interleaved core and owner history, compatible prefix upgrades and zero inserted rows on refusals. Changed owner SQL, a missing owner ALTER, mismatched order and an extra archived owner migration returned HTTP 409 with `schema_mismatch:owner_migration_history`. A missing applied migration file returned HTTP 409 with `schema_mismatch`.

## Synthetic owner-migration restore in a disposable Orbit checkout

The installed RER 0.2.125 ran the production Orbit CLI adapter with one synthetic owner migration declared in the disposable directory. The fixture created a Wrangler-shaped `orbit_ext_migrations` ledger with `applied_at TIMESTAMP TEXT`, then exported via `pnpm exec rer export --output exports/orbit-owner-migration.rer`. The archive contained 139 tables and 20 rows and ended its migration history with `ext-0001_owner.sql`. It excluded the owner ledger from the archived data. After moving the source state out of `.wrangler/state`, `pnpm exec rer import --input exports/orbit-owner-migration.rer --yes` restored all 139 tables and 20 rows. A Wrangler query using `--persist-to .wrangler/state` found the expected synthetic owner value and replayed migration. Replacing the owner SQL and repeating from an empty state returned exit 4 with the following message.

```text
Restore refused (schema_mismatch:owner_migration_history): the recorded migration order or file contents differ from this checkout.
```

## Preview failure on the adopted pin

`node --test --no-test-only --test-concurrency=1 tests/rer/journey.test.mjs` passed the legacy-state safety case. Its full README journey passed the dev and native sign-in setup steps and failed at production preview startup. The independent preview reproduction used a completed setup with 84 migrations and ran `pnpm exec rer preview --port 15630`. It returned exit 1.

```text
Owner entry http://127.0.0.1:15630/__dev/key did not become ready within 60000 ms.
Destination http://127.0.0.1:15630/__dev/key: HTTP 200 (entry exchange not observed; destination document not observed after entry).
Readiness: exchanged=false, documents=1, usable=true, busy=false, refresh=false, fragment=false, sameOrigin=true.
No ready link was announced.
preview: failed (exit 1)
```

A read-only SQLite query of the preview state returned one active setup owner in `operators`. It found neither `oa_owner_signins` nor `oa_operators`. RER's native preview gateway looks for the first table and uses the second table to issue its native grant. Orbit's native identity handler supplies Orbit account and proof adapters, so the built-in Base-native preview entry cannot issue a grant against this installation.

The mismatched owner-migration destination retained zero imported rows. The previous Orbit main source with its frozen RER 0.2.113 lock was also tested after an independent 84-migration setup. Its direct loopback production preview printed `RER_READY` and exited 143 after its own process received SIGTERM. This confirms the change in preview startup from the previous pin.

## Exact candidate's local Verify progress

The full `pnpm exec rer verify` ran from a detached worktree at the candidate SHA. Its source shard completed all ten declared stages. Its `fold-accepted-main` archive test passed and preserved the authenticated 100-table baseline across restore, restart and re-export. The standalone README journey exposed the preview blocker during this run.

The preview refusal repeated with the system Chromium executable. The owned full local Verify was stopped after the independent preview regression was confirmed. It had completed the source and accepted-main archive lineage shards. The full local command exited 143 after SIGTERM.

## Native archive browser check

`pnpm run test:archive` ran on the exact candidate SHA with system Chromium. Playwright reported `1 passed (5.3m)` for native archive preparation, streamed download, confirmed restore and renewed-session preservation of workspace records.

## CI browser assertion comparison

The candidate and previous main were rerun locally with RER 0.2.125 and 0.2.113 respectively using the same frozen dependencies for each head and system Chromium. `pnpm exec tsx --test --no-test-only --test-concurrency=1 newtests/t096/browser-journeys.test.ts` reached and passed the precise assertion that failed in GitHub batch 4 on both heads. Both runs continued through Apply assignment, Undo assignment and recipient notifications at the two widths exercised by the existing test. The first local comparison had stopped earlier because a helper expected Chromium in Playwright's browser cache. The rerun supplied the system executable through the cache path. The CI ownership failure could not be reproduced at that assertion on either head.
