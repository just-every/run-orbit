# gr-mt-orbit-dep-8: Zod security update

The product branch is pushed. Exact-SHA Verify remains in progress after twenty minutes with eight of the ten GitHub calls used. Returning PUSHED under the brief low-budget rule; no green CI or landing is claimed.

Repository: just-every/run-orbit
Branch: cloud/gr-mt-orbit-dep-8
Commit: 7ad63db63c46c6a2a59157a5c128bd35f6c20173
Parent main: bfc52fadd56ae3fa38cb48de9484de61810e7cbd
Verify: 43594201856, https://github.com/just-every/run-orbit/actions/runs/43594201856
PR: none; branch-push Verify is available and no repository PR requirement was found.

Change and reason:
- package.json pins Zod 4.6.6, the supplied first patched version for GHSA-mrhx-c7xc-m3w5 (Dependabot alerts 32 and 33).
- pnpm-lock.yaml replaces vulnerable 4.1.5 and 4.6.5 resolutions with 4.6.6, including all three TanStack snapshot edges. No override was needed.
- sources.lock.json was regenerated last and changes only the package.json and pnpm-lock.yaml hashes.
- No product source, UI, homepage copy, owner screen, test, acceptance clause or generated acceptance view changed.

Before/after counts:
- Vulnerable Zod versions: 2 -> 0; unique Zod versions: 2 -> 1 (4.6.6).
- Lockfile package entries: 429 -> 428; unrelated package upgrades: 0.
- Tests: 198 cases + 2 qualification flows = 200 -> 200. Focused executions: 6 passed, 0 failed, 0 skipped.
- Clause statuses: 42 done / 130 partial / 32 missing -> unchanged. No status, gap, evidence cell or acceptance point was edited; no CLAIM promotion is made.

Plan and execution:
1. Initialized the supplied launcher, bundle-backed Git authentication, fleet author/committer identity, preserving commit hooks and push guard. Cloned full history into the required maintenance work directory and created only the named cloud branch.
2. Read AGENTS.md, CLAUDE.md and TESTING.md plus the supplied builder rules; inspected all Zod dependency edges and affected native validation flows.
3. Used Node 22.20.0 and pnpm 10.12.4. Ran `pnpm update zod@4.6.6 --depth 100 --lockfile-only --ignore-scripts`; the package-entry diff confirms no unrelated dependency update.
4. Ran frozen install, non-interactive RER setup with the fleet owner mailbox, RER build and typecheck. Ran only existing focused platform-boundaries and records-search journeys against disposable local D1 state with one worker. All passed. No full local suite was run; branch CI supplies the full wall.
5. Fresh fetch and unpublished rebase confirmed main unchanged. Regenerated sources.lock.json last, checked it, checked generated contract documents and whitespace. Commit hooks were reinstalled after dependency/setup work. The product commit has the fleet author/committer and no trailers.
6. Ran unchanged Base publication scanner with pinned, checksum-verified Gitleaks 8.30.1, full history, the remote public main base and environment-value checks. The initial scan found only private ignored runtime/build artifacts in working-tree scope (11 findings, no release-tree or newly-public finding). Repeated the same scan in a clean detached worktree at the exact same commit and tree: COMPLETE/PASS, zero findings. Five already-public findings remain separately recorded by Base. No source, history, scanner rule or allowlist was changed.
7. Rechecked every candidate commit identity and full message plus exact scan commit/tree immediately before the fleet-guarded push. The push succeeded on the first attempt. No main/default branch, force push, tag, release, deployment or PR write was performed.
8. Discovered and watched exact-SHA Verify through REST with one watcher and ten-minute polling, within the ten-call task budget. The actual observations are in ci-receipt.json. Saved the required result.json and non-secret receipts; report transport is separate from product readiness.

Validation commands and actual results are in validation-receipt.json, setup-receipt.json, source-check.json, the focused/build/typecheck logs and ci-receipt.json. The complete candidate patch and before/after inventory are included. Browser screenshot proof is not applicable because this changes no UI. Historical receipts were not used as current proof.

Security and custody:
- The packet contains explicitly selected regular report/receipt files, no symlinks, injected secret values, private settings, environment dumps, setup links or held-out gate material. Raw private setup output is deliberately excluded.
- A verified incremental recovery bundle is retained outside the clone at /home/agent/rer-consolidation/work/gr-mt-orbit-dep-8/product-candidate.bundle; bundle-receipt.json gives its SHA-256 and public-main prerequisite. It is recovery data, not READY proof.
- Other default-branch vulnerability notices from GitHub's push response are outside this Zod-only upgrade and were not expanded into unrelated upgrades.
- No owner ruling is required. The only remaining gate is exact-SHA Verify completion; no failing check has been observed.
- Evidence publication uses only refs/heads/evidence/gr-mt-orbit-dep-8 and does not signal acceptance or landing. The fleet independently reruns its landing gates.

PUSHED branch=cloud/gr-mt-orbit-dep-8 head=7ad63db63c46c6a2a59157a5c128bd35f6c20173
