# Orbit portable contract anchor

Task: sd-orbit-contract-anchor-2  
Repository: just-every/run-orbit  
Branch: cloud/sd-orbit-contract-anchor-2  
Product head: 099ffe089261c51f7d3e1316ab5cf6a28151181a  
Base main: f04ffb3c5d01eef2c8163abe98b4c32d9f1e6ae7  
Original contract revision: 28a1db90f135fe783af1c30ba3cf33c339405f9a

## Result and scope

Generated and committed `docs/contract/ANCHOR.json` with the anchor command in the repository's pinned `@runeditrun/rer@0.2.107` package. Regenerated `sources.lock.json` last with the repository's documented command. The only lock change records the new anchor's SHA-256 and executable flag. The product commit changes exactly those two files (34 inserted lines). No product code, homepage, tests, CONTRACT.md, ACCEPTANCE.md, docs/CLAIMS.md, clause Status/Gap/Evidence, or other repository was changed. No PR is required by Orbit's checked-in rules; none was created. No main, tag, default-branch or landing write was performed.

Anchor: schema 1; 6 Git objects; 700575 bytes; SHA-256 `6c54c227b280f193219b584cb6c38be2ec1a46bb36deef98b1db8a4715635419`. Its commit is the original revision recorded by Orbit's `docs/contract/COVERAGE.json` and `ID-MAP.json`, not current main. The anchor command itself enforces that match.

## Plan carried out

1. Refreshed the fleet launcher, read its AGENTS.md and the inline builder rules, installed bundle-reading Git credentials, the push guard, preserving commit hooks and the cloud toolchain. Cloned Orbit with full history and configured fleet identity locally before any commit. Read Orbit's AGENTS.md, contract, acceptance view, package pins, rer-project.json, CI and both contract generators.
2. Read Lamp's committed anchor with one GitHub contents API call, without cloning or writing Lamp. It uses the same schema/commit/objects format and original contract revision `0c54dbcd4352babe9163e1600b6b7c3e0c8d760e`; see reference-receipt.json. Used Orbit's own original revision and its pinned generator to create the equivalent proof.
3. Exercised remote-free, freshly initialized scratch repositories with exactly two fleet-authored commits. Confirmed the original contract commit is unavailable. Recorded baseline failure, after-anchor behavior, cheap verification findings, and a scratch-only regeneration proving that the remaining view mismatch is unrelated to anchor availability.
4. Ran the normal full-clone contract check and typecheck. Fetched main and rebased before publication (already up to date). Staged the anchor before lock regeneration so the tool's tracked-source selection includes it; generated and checked the source lock last. Ran the normal contract check and diff whitespace check again, then committed under fleet author and committer identity with preserving hooks active.
5. Inspected every candidate commit's author, committer, trailers and full message, including all parents in origin/main..HEAD. One candidate commit, both identities `Run Edit Run fleet <fleet@runeditrun.com>`, no trailers or skip markers. Pushed the exact named branch once through cloud-push.py; first attempt succeeded. Product custody is separate from evidence publication and landing.
6. Discovered exact-SHA Verify through REST and used one watcher with at least 300 seconds between status calls. Kept all non-secret reports and actual command receipts outside the product checkout for separate evidence publication. CI and publication-scan outcomes are recorded below when complete.

## Verification and important path differences

The brief's literal `node scripts/contract-docs.mjs check` cannot run on current Orbit main: that file does not exist. Orbit declares `node src/base/contract-docs.mjs check` in AGENTS.md and its source verification plan. That older local generator has no anchor subcommand and does not perform the portable history check. The pinned package supplies `node node_modules/@runeditrun/rer/foundation/runtime/contract-docs.mjs anchor --old <ref>`. It also supplies `check` and `check-prose` with portable-anchor validation. No source path or verification declaration was changed to conceal this difference.

Actual generation command:

```sh
node node_modules/@runeditrun/rer/foundation/runtime/contract-docs.mjs anchor --old 28a1db90f135fe783af1c30ba3cf33c339405f9a
```

Output:

```text
Recorded docs/contract/ANCHOR.json for 28a1db90f135fe783af1c30ba3cf33c339405f9a.
```

Before the anchor, the pinned package's `check` and `check-prose` both exit 1 in the history-less two-commit copy:

```text
docs/contract/ANCHOR.json: contract_anchor_missing: original 28a1db90f135fe783af1c30ba3cf33c339405f9a is unavailable; record it with anchor --old <ref> in a checkout with history.
```

With the anchor, `check-prose` exits 0 in both full history and the exact-candidate two-commit copy, reporting `Contract prose: 0 errors, 5 warnings.` The original commit remains absent, no remote exists and the scratch Git tree exactly equals product tree recorded in candidate-proof-receipt.json. Source integrity and the seed's own `src/base/contract-docs.mjs check` both exit 0 on that exact candidate tree.

The pinned package's complete `check` now gets past anchor/prose validation but exits 1 solely because `docs/CLAIMS.md` differs from that newer generator's output. This mismatch also occurs in the unchanged full-history main tree; it is not an anchor failure. In a disposable scratch copy only, running that generator's `write` outputs `Wrote 1 contract documents.` and leaves CONTRACT.md byte-for-byte unchanged. Its following `check` exits 0 with `Contract documents are current.` The product views were never regenerated or committed. The seed's own old generator says `Contract documents are current.` before and after.

The actual `rer-project.json` operations.verify on this main is `pnpm source:check && pnpm exec rer check --profile first-party && pnpm check:boundaries && pnpm check:manifest && pnpm deployment:check && pnpm typecheck`; it does not directly include the brief's contract path. Exercised its cheap individual steps in scratch to enumerate findings without claiming a full verify pass:

| Check | Result |
| --- | --- |
| Source integrity on exact final candidate two-commit tree | PASS; 2835 tracked files, matching regenerated lock |
| `rer check --profile first-party` | PASS |
| Boundaries | PASS; 875 core source files |
| Seed schema/manifest | PASS; 1/1 valid |
| Deployment spec check before a build | FAIL; ENOENT on scratch `dist` |
| Typecheck in full clone | PASS |
| Typecheck in scratch | PASS |
| Seed's normal contract-docs check, full clone and scratch | PASS |
| Pinned package portable prose/history check, with anchor | PASS; 0 errors and 5 pre-existing warnings |
| Pinned package full contract check against tracked views | Existing generated claims-view mismatch only |
| Pinned package full check after scratch-only view regeneration | PASS |

A preliminary scratch source check, run before staging the new anchor and regenerating the lock, correctly failed for a stale lock. The exact-candidate source check after the documented lock regeneration passes; both actual receipts are retained. No build, setup, browser or full suite was necessary for this documentation-only lease. The missing scratch `dist` is a finding for the install/verify follow-up, not a change made here. Toolchain was Node v24.19.0 and pnpm 10.12.4: the supplied shim retains an already-newer Node and emits the repo's exact-22.20.0 engine warning; typecheck passed under it.

## Counts and clause judgments

Counts are identical before and after:

| Group | Done | Partial | Missing | Total |
| --- | ---: | ---: | ---: | ---: |
| Published | 31 | 48 | 0 | 79 |
| Target and push further | 11 | 82 | 32 | 125 |
| All | 42 | 130 | 32 | 204 |
| Core | 42 | 112 | 24 | 178 |
| Agent surface | 0 | 18 | 8 | 26 |

Clause status changes: none. CLAIM: none. Tests added, deleted, weakened or modified: 0. Product/contract acceptance is not asserted by this anchor repair. Generated view maintenance and the fleet's independent final publication/landing gates remain the lander's responsibility.

## Publication scan

The pinned Base publication scanner was attempted on the exact committed product HEAD. The first attempt was `INCOMPLETE` with `scan.gitleaks-unavailable`. Installed Gitleaks 8.30.1 from its official release archive, verified its SHA-256 against the release checksums (`551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb`), and repeated the exact-tree scan. It reached the scanner's default 300-second deadline and returned `INCOMPLETE` with `scan.deadline-exceeded` (exit 2). See publication-scan.json and publication-scan-initial.json. No COMPLETE or passing publication claim is made. The independent fleet publication scan required by the cloud adaptation remains to run before landing; no publication guard was bypassed or repository policy changed.

A separate redacted Gitleaks scan of the public evidence packet found 36 generic-key matches, all content-addressed source snapshot hashes printed by the source-lock tooling. Each exact hash was checked against the already-public `origin/main:sources.lock.json`; there were zero unexplained findings. See packet-scan-receipt.json. No credentials, environment dumps, held-out gates, symlinks or browser/session data are selected for evidence transfer.

## Terminal product custody and CI

UTC: 2026-11-13T14:38:42Z. Product custody: **PUSHED**. Verify remains in progress after six scheduled status polls. Eight of the ten allowed GitHub calls were used, leaving two for required failed-job discovery/log diagnostics. No green CI or READY claim is made.

Verify run: `43439867137` — https://github.com/just-every/run-orbit/actions/runs/43439867137  
Exact head: `099ffe089261c51f7d3e1316ab5cf6a28151181a`  
Last REST status: `in_progress`; conclusion: `None`; observed UTC: `2026-11-13T14:38:29Z`.  
GitHub API/diagnostic calls used: 8/10. One watcher active at a time; discovery and each status poll were at least 300 seconds apart. See github-call-receipt.json, ci-discovery.jsonl, the individual ci-poll files and terminal-receipt.json.

Product blockers identified locally: none within the anchor lease. The literal brief path is absent on this main, the newer generator's existing claims-view mismatch remains for generated-view maintenance, and the scratch deployment check needs a build (`dist`). The independent publication scan remains required because the cloud attempt timed out. These findings were recorded without scope expansion. Product acceptance, landing and publication are not claimed by evidence transfer.

The complete selected public-safe packet is published separately to `refs/heads/evidence/sd-orbit-contract-anchor-2`; the helper's exact acknowledgement is retained outside this packet in evidence-publication.log and copied into the final handoff. No fleet evidence is committed to the product branch. The disposable full-history clone is removed only after product and evidence custody succeed.
