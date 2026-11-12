# sd-orbit-c-f170-fix1 repair report

Recorded 2026-11-12T15:36:19.377334+00:00.

The archive compatibility repair is committed and pushed to just-every/run-orbit, branch `cloud/sd-orbit-c-f170-fix1`, head `e02ddbe65a208cef96cb1bfb66f2a02cef80c202`, tree `abcf7292c65607d476038f96fe70e14c17eff04d`. The product checkout is clean. PR: none; push is this repository's Verify entry point. This is a branch candidate for the lane's re-gate, not a landing, release or DONE award.

Verify 43243939499, event push, completed, conclusion success, exact head e02ddbe65a208cef96cb1bfb66f2a02cef80c202. https://github.com/just-every/run-orbit/actions/runs/43243939499

The complete plan is in `PLAN.md`. The scope is only the BLOCKING BAR of the supplied immutable gate report for 1914f2a25ed651ecb26867cc01ebc7ea72a14c7e. No C follow-up was repaired.

## Reproduction and repair

Before editing, the exact failed batch ran on the original failed SHA, with Node 22.20.0, `ORBIT_VERIFY_PREBUILT=1`, `ORBIT_VERIFY_JOURNEYS=1`, `ORBIT_VERIFY_TIER=push`, the supplied fixed-port environment and a sealed emitted build. Its actual command was `node scripts/verification-batch.mjs '["fold-domain-3"]'`. It completed with five cases passed and one failed, exit 1. The only failure was the named populated forward-upgrade journey, at `newtests/t096/released-forecast-upgrade.ts:69:21`, reporting “Archive inventory does not match a complete supported source generation.” See `before-shard.log`, `before-shard-receipt.json`, `before-test-events.jsonl` and `reproduction.json`.

The same focused journey passed on current main 32b17e54f1f1adfec68b73daab058c88162166ec, exit 0, 469600.581013 ms. That main carried the same archive generation code as the integrated main. The integration then retained main a1d1e109b7e53e5cd692032258ebdaff0ce40fcf whole, including its newer graph proposals, tests, contract judgments, manual deal defaults and Slack declaration.

The root cause was a composition mismatch. The candidate derived its supported historical generations after removing Zendesk's five portable tables and erasure triggers, but its exported pre-direct-notification helper retained those later additions. Calling the helper on the current catalog therefore described no complete supported source generation.

`src/core/features/records/archive-generations.ts` now composes the pre-support and main's pre-graph transforms into the historical notification helper. Its supported list explicitly retains both complete source branches and their common predecessor before deriving older generations. Exact inventory, exact schema identity, row validation and authority exclusions stay intact. `archive-generations.diff` records this repair against the original failed candidate.

No permanent tests were added, removed, weakened or skipped. Both failing test files and `src/core/features/records/archive-fold-validation.ts` remain byte-identical to the failed head; `unchanged-guards.json` records their hashes. Every original main assertion is preserved. No support application module changed beyond the archive composition repair. The connected-products merge conflict combined the existing Zendesk imports with main's newer Slack type import; it preserves both existing features.

## Local proof

The unchanged focused forward-upgrade journey passed after the repair in 464825.279542 ms. It retains native values, custom DDL, owner-added fields, live identity and the historical archive assertions, and completes the later populated native archive checks. The upgrade preflight passed in 146205.460845 ms, proving active native v2 import phases refuse migration before effects and can continue through their original finish or abort. The onboarding archive journey passed in 509978.270599 ms, retaining records, local credential custody and hosted-owner sign-in without reviving sessions.

Together these three cases recorded terminal Node runner success: 3 passed, 0 failed, 0 skipped, 0 cancelled. See `after-archive-tests.log`, `after-test-events.jsonl` and `local-test-receipt.json`. The execution connection reset while the tests were running; their processes continued and the terminal reporter persisted success. The completed timeout wrapper retained a kernel wait status of 0 in /proc/19835/stat field 52, so the actual command exit code 0 was recovered despite the lost shell handle. The receipt records that observation.

A separate structural supplement used catalogs captured from real migrated databases on the original candidate and main, rather than replacing the populated guard's archive fixtures. The unchanged validator accepts the Zendesk-only source catalog (133 tables), main's graph-only source catalog (128 tables), the merged catalog (133 tables) and the complete pre-notification generation (128 tables). It refuses an incomplete Zendesk inventory with status 400 at the complete-lineage guard. The catalogs, proof source and actual result are in `support-only-catalog.json`, `graph-only-catalog.json`, `capture-current.mts`, `generation-proof.mts` and `generation-proof.log`. This structural supplement is not presented as a populated transfer receipt.

Two one-off harness errors are retained honestly: the first capture script used a .ts extension outside an ES module package and could not run top-level await; its .mts correction passed. The first negative proof expected the later inventory error, while the unchanged validator correctly refused earlier with “Invalid complete archive lineage.” Correcting that proof's expected error required no product or permanent-test change. See the two harness-error logs.

Typecheck passed, exit 0 (`typecheck.log`). The candidate build passed, exit 0 (`candidate-build.log`). First-party checks and boundaries passed. All 77 deployment migrations map through the package's native ledger helper; each spec hash and SQL body equals its source file, including both 0081 migrations. Contract write wrote 0 documents; contract check passed; both generated views were restored whole from main. The lock was regenerated last and its check passed, then regenerated and checked again after the final merge-preserving rebase. See `mechanical.log`, `migration-ledger.mjs` and `final-lock.log`.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=node ../packet/migration-ledger.mjs exit=0.

PROBE ARCHIVE-COMPAT: the unchanged populated forward-upgrade guard failed on the original candidate, passed on main and passed on the repair; actual source catalogs from both migration branches validate, and an incomplete native inventory is refused.
PROBE INTEGRATE-004: no new support feature probe; this round changes archive compatibility only. Original support behavior and external holds remain with the frozen rubric and lane re-gate.

## Counts, holds and custody

Counts before and after: 42 DONE, 130 PARTIAL, 32 MISSING, 204 total. Tests before and after: 198 registrations plus 2 qualification flows, total 200. No clause text, Status, Gap, Evidence, summary count or plan row changed. The product contract and generated views equal integrated main byte for byte. INTEGRATE-004's builder claim remains PARTIAL with no complete acceptance point claimed; the stored main judgment remains missing, deliberately untouched under the no-judgment-edits instruction.

Live Zendesk qualification, Help Scout, HappyToHelp, specifically authorized sensitive ticket content, TEAM-005 seller audiences and the complete inherited buyer walk remain held or unclaimed. INTEGRATE-001, INTEGRATE-003 and every other existing external prerequisite remain unchanged. The three prior C follow-ups—duplicate-merge association retirement, per-ticket provider fan-out and subdomain remapping—remain out of scope.

Pre-READY self-check: the exact regression now has a passing unchanged guard; no assertion was removed or narrowed; archive and credential safety remain covered by the existing real-app checks; no UI or icon control was changed by this repair, so no new screen proof is required. The full exact-SHA branch Verify is recorded above. The full-history publication scan, independent re-gate, guarded landing and main-only Run site remain fleet duties, not cloud claims. No main push, tag, release, provider qualification, new account setup or rer pin bump occurred.

All four candidate commits, including every side parent in origin/main..HEAD, passed the fleet author, committer and trailer audit. The first push succeeded on attempt 1 through the supplied guard. The final merge-preserving rebase left the tested SHA and tree unchanged. No published history was rewritten and no force push occurred. Receipts: `commit-audit.log`, `product-push.log`, `product-receipt.json` and `ci-receipt.json`. CI uses one REST watcher, at least 300 seconds between calls, currently 7 of the ten-call budget. No workflow was dispatched or re-run.

There is no remaining product repair blocker in the local proof. Terminal custody: READY; acceptance and landing remain with the fleet. The explicitly selected non-secret packet will be published only to evidence/sd-orbit-c-f170-fix1, separately from product custody. Disposable clone and dependencies will be removed after both publications succeed. Credentials, environment dumps, private installation state, raw archives, symlinks and held-out gate material are excluded.

CLAIM INTEGRATE-004 PARTIAL points=none tests=newtests/t096/forward-upgrade.test.ts#API-002 credential storage and RECORD-016 ownership and accepted main and released v0.3.0 advance with every native value, custom DDL, live identity and pre-forecast archive schema intact
GAP INTEGRATE-004: Every original live-provider, Help Scout, HappyToHelp, sensitive-content, TEAM-005 and complete buyer-walk hold remains unchanged; no DONE promotion.

VERIFY_REPRODUCED {"command": "node scripts/verification-batch.mjs '[\"fold-domain-3\"]'", "environment": {"ORBIT_VERIFY_JOURNEYS": "1", "ORBIT_VERIFY_PREBUILT": "1", "ORBIT_VERIFY_TIER": "push", "node": "22.20.0"}, "exit": 1, "failure": "Archive inventory does not match a complete supported source generation.", "finishedAt": "2026-11-12T14:34:13Z", "head": "1914f2a25ed651ecb26867cc01ebc7ea72a14c7e", "job": 130976890004, "location": "newtests/t096/released-forecast-upgrade.ts:69:21", "run": 43155978313, "startedAt": "2026-11-12T14:22:23Z", "test": "newtests/t096/forward-upgrade.test.ts#API-002 credential storage and RECORD-016 ownership and accepted main and released v0.3.0 advance with every native value, custom DDL, live identity and pre-forecast archive schema intact"}
