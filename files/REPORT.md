# gr-mt-orbit-dep-7: Undici security maintenance

Repository: just-every/run-orbit
Product branch: cloud/gr-mt-orbit-dep-7
Candidate: bfc52fadd56ae3fa38cb48de9484de61810e7cbd
Base: 7e577833179cbd0fb8db8500b61a8bd0a1d2e56b

## Goal and change

Resolve GHSA-xjj6-f33q-929c / Dependabot alert 36 without unrelated upgrades. The existing lockfile resolved Undici 7.29.0 through Miniflare 5.20260907.0-alpha. Registry metadata confirmed that Miniflare pins that vulnerable version exactly. A `pnpm.overrides` entry scoped to `miniflare>undici` selects 7.30.1, the first patched version. The lockfile was regenerated with pnpm 10.12.4. No direct package versions, runtime code, migrations, UI, contract clauses or tests changed.

Product files:

- `package.json`: scoped transitive override.
- `pnpm-lock.yaml`: override plus Undici package integrity and snapshot resolution.
- `sources.lock.json`: regenerated hashes for those two files, validated with the documented source checker.

Unique vulnerable Undici resolutions: 1 before, 0 after. Undici resolved version: 7.29.0 before, 7.30.1 after. Verification inventory: 198 cases plus 2 qualifications = 200 before and after. Clause status changes: none. No CLAIM lines apply to this dependency-only maintenance task.

## Completed work and validation

The full plan is retained in PLAN.md. The launcher refreshed its decrypted fleet bundle; Git uses only the required decrypted-bundle credential helper. The full-history repository was cloned fresh, local fleet identity configured, and the fleet commit hook installed before the first commit and reinstalled after dependency/setup steps. Every commit command used explicit fleet author and committer environment variables. There are no commit trailers. Main was fetched; after committing, rebase onto origin/main reported up to date. The initial pre-commit rebase attempt refused unstaged changes and changed no history.

All package operations and checks used Node 22.20.0 and pnpm 10.12.4. The supplied toolchain script retained the VM's newer Node initially, so the exact repository Node version was installed separately and selected ahead of it for all package operations and checks.

Passed:

- `pnpm install --lockfile-only`
- `pnpm install --frozen-lockfile`
- `npx -y @runeditrun/rer setup --owner-email fleet@runeditrun.com --non-interactive`, via cloud_run; 83 migrations applied and owner setup completed.
- `npx -y @runeditrun/rer build`, via cloud_run.
- `pnpm run typecheck`, via cloud_run.
- `pnpm exec tsx --test --test-concurrency=1 tests/core/archive-transfer.test.ts`, via cloud_run; 2 passed, 0 failed, 0 skipped. These existing public-door tests exercise Miniflare-backed D1 restore rollback, session/data preservation, API credential custody and erasure/export fences.
- Documented edition-authoring `lock` and `check` commands; regenerated source lock last.
- Verification inventory before and after, and `git diff --check`.

No full local verification suite was run, as directed. Browser screenshots do not apply to this dependency-only change. No hosted deployment, real mail or provider operation was requested or performed.

## Publication and CI custody

The final publication scan completed PASS / complete=true / zero findings on candidate bfc52fadd56ae3fa38cb48de9484de61810e7cbd (tree eb4d80931bae45b75cf88f08d097a65af67245d8). It inspected 894 commits, 890 trees, 8,936 blobs, 894 commit messages and 13 tag messages in 396.7 seconds. The branch pushed successfully through cloud-push.py on its first attempt. Exact-SHA Verify run 43584388505 (https://github.com/just-every/run-orbit/actions/runs/43584388505) is pending; its observations are retained in ci-receipt.json. The pinned RER package includes Base's publication scanner. Gitleaks 8.30.1 was obtained through the upstream GitHub release asset with gh api after the VM's `go` command proved not to be the Go compiler. A read-only Base tree lookup and the two release asset calls used three GitHub API calls. Subsequent scanner and CI calls share a ten-call-enforcing shim that loads only the injected bundle credential.

Two superseded scanner attempts were interrupted by this builder: the first targeted the development checkout, which includes ignored setup state; the second had incorrect destination arguments. Neither is claimed as a passing gate. The final invocation scans a clean detached worktree at the exact candidate SHA, with full history, the remote main public base, and the correct committed project/destination identities. It changes no product source or product ref. Superseded receipts remain in the packet for transparency.

The product push used only the named cloud branch through cloud-push.py after the publication gate passed. The fleet owns landing and its independent publication scan; this task never pushes or fast-forwards main. Evidence uses only the separate evidence/gr-mt-orbit-dep-7 ref and does not assert product readiness.

## Defaults and remaining scope

Keep the pinned patched Miniflare and Wrangler releases unchanged and use a scoped override rather than upgrading their unrelated dependency trees. Keep contract statuses and generated acceptance views unchanged. No new product acceptance obligation is claimed. The override can be removed in future maintenance once the chosen Miniflare release carries patched Undici directly.

The correctly scoped clean-worktree scan reached its default 300-second deadline and returned INCOMPLETE (`scan.deadline-exceeded`), without a completed verdict. Its actual receipt is retained as publication-scan-default-timeout.json. The same scanner was restarted with its documented `--timeout-seconds 1800` option; no detector, history, destination or content check was disabled.

A complete-history recovery bundle was created and verified outside the clone: `work/maint/gr-mt-orbit-dep-7/candidate.bundle`, SHA-256 `cb3b26fa2482e92475e4233074a38bd2fc4ceb4bea1571e102aad3de3739d4fd`. Every push attempt also runs the complete candidate identity/trailer audit through the pre-push hook before the repository hook.

Evidence preflight found no injected credential values in any explicitly selected file. A direct Gitleaks directory scan flagged 18 `key` fields in the two complete source-lock command logs. Every match was verified to be a component content hash present byte-for-byte in committed sources.lock.json, which passed the complete Base publication scan; no credential was identified. The value-free evidence-preflight.json records this classification.

## Terminal result

PUSHED branch=cloud/gr-mt-orbit-dep-7 head=bfc52fadd56ae3fa38cb48de9484de61810e7cbd

The named product branch was pushed successfully. Verify run 43584388505 remained `in_progress` on the exact candidate SHA at 2026-11-14T10:30:39Z, after observations at discovery, five, ten and fifteen minutes. Eight of ten budgeted GitHub API calls have been used (three read-only tool/source lookups, one publication reference resolution, and four exact-SHA CI observations). The single watcher was stopped by its own recorded PID with the budget short. No completed success, READY, acceptance or landing is claimed. The lane can continue observing the existing run; no workflow was re-run or dispatched. No completed red workflow or failed assertion was observed, so no job-log download was attempted.

There is no known product blocker. Full branch CI remains pending. No PR was created: the repository instructions use the fleet's guarded cloud branch landing path. Main and default branches were never pushed or fast-forwarded. Contract statuses and generated acceptance views remain unchanged. No tests were added, deleted, skipped or weakened. Test inventory remains 200; vulnerable Undici resolutions decreased from one to zero.

The complete non-secret plan, result.json, validation receipt, source lock/check outputs, build/typecheck/setup/focused-test logs, publication receipts, CI observations and exact diff are selected explicitly for evidence/gr-mt-orbit-dep-7. Evidence publication conveys reports only and does not change product custody. The bundle and result.json remain outside the product checkout for recovery.
