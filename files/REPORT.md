# Hono security maintenance: gr-mt-orbit-dep-2

Author: Run Edit Run fleet, 2026-11-17.

Repository: just-every/run-orbit. Product branch: cloud/gr-mt-orbit-dep-2.

## Plan

1. Read launcher and repository instructions, inspect the direct Hono dependency and all lockfile resolutions, and preserve the fleet identity and hooks.
2. Update only Hono from 4.13.5 to the first patched release, 4.13.7, with the pinned pnpm 10.12.4 under Node 22.20.0. Verify the regenerated lockfile has no unrelated upgrades.
3. Run a frozen install, noninteractive local setup, production build, typecheck, source-lock regeneration/check, the existing native owner identity HTTP journey, and a temporary JSX boundary escaping probe. Add no registered tests and change no product UI or contract judgments.
4. Refresh main before committing. Scan the exact committed candidate with Base's publication scanner and require complete PASS with zero findings before product publication. Inspect every candidate commit identity and trailer, then push through the fleet guard.
5. Discover and monitor exact-SHA Verify through REST within ten GitHub calls, retaining actual receipts. Publish explicitly selected non-secret reports separately to evidence/gr-mt-orbit-dep-2.

## Initial findings

Main pins Hono 4.13.5 in package.json and pnpm-lock.yaml. The lockfile has one Hono package resolution. GHSA-hxh3-vqpv-xpqv is patched at 4.13.7 according to the assignment. The pnpm-generated diff changes only that dependency, its resolution integrity, importer, and snapshot. No contract clause changes are planned.

Status: BLOCKED on the required publication gate; local dependency validation passed.

## Local results

Candidate: `c367dedb2a7ed7aa040ef150d8e7481874d12691`, based on main `14a3aae44a2e327978f7ce92f099448190362d3d`.

Changed files: `package.json`, `pnpm-lock.yaml`, and the two required manifest/lockfile hashes in `sources.lock.json`. Hono is pinned exactly at 4.13.7. No other direct or development dependency changes, and no unrelated lockfile upgrades.

Node 22.20.0 and pnpm 10.12.4 were used for install, setup, build, typecheck and focused tests. The provided cloud toolchain initially retained the VM's newer Node 24, so the repository's exact Node 22.20.0 was installed and selected before dependency installation and all runtime checks.

Passing checks:
- Frozen pnpm installation.
- Noninteractive RER setup with the fleet mailbox; 84 migrations applied and the first owner claimed. The setup process and its temporary server exited.
- Production RER build.
- TypeScript typecheck.
- Regenerated source lock and source-lock validation. The generator output includes the full source lock and is retained locally outside this public packet; the receipt records successful exit codes.
- The existing `tests/core/local-owner.test.ts` journey: native owner mailbox changes, email-link authentication, invitation, setup-owner removal, session revocation, and audit behavior through HTTP. One test passed, none failed or skipped, with one test worker.
- Four temporary behavioral probes: Suspense and ErrorBoundary both escape plain-string children and plain-string fallback markup. The same probe fails on unmodified Hono 4.13.5 at the first Suspense escaping assertion, confirming the reported regression is exercised. The candidate passes all four.
- Diff whitespace validation and dependency-only manifest comparison.

Before/after: one vulnerable Hono resolution becomes zero; Hono 4.13.5 becomes 4.13.7. Registered tests remain 198 plus two qualification flows, total 200. The carried generated acceptance summary remains 42 done, 130 partial and 32 missing, total 204. No clause text, status, gap, evidence, generated acceptance view or UI was changed; no claim or clause promotion is made.

No full local Verify or browser suite was run, as directed by the maintenance brief. There is no UI change requiring desktop/mobile screenshots. The exact-SHA branch Verify remains the full candidate gate. No PR is required by the repository instructions, and none was opened.

The first attempted precommit rebase refused uncommitted edits. After committing the regenerated source lock with the dependency, the prescribed rebase succeeded as an up-to-date no-op. The candidate has fleet author and committer identities, a plain message, no trailers and no skip-CI marker.

## Publication scan progress

The first full-history scan reached its 600-second deadline and returned INCOMPLETE (`scan.deadline-exceeded`, exit 2). This is retained in `publication-scan-timeout.json`. The official scanner is rerunning on the same exact committed tree with its supported 7200-second timeout and in-memory comparison against the injected private bundle. Bundle contents are never selected for evidence or printed. No product push has occurred.

The scanner includes 2,238 commits across 990 refs in the fresh full-history clone; the candidate ancestry alone has 910 commits. No refs have been removed to reduce inspection scope.

## Terminal publication result

The extended official Base scan completed in 959.121091 seconds with **COMPLETE / FAIL**, scanning 2,238 commits, 2,176 trees, 18,517 unique blobs, 2,238 commit messages and 15 tag messages. Environment comparison ran in memory. The scanner implementation is @runeditrun/rer 0.2.113, digest `c5f2d788f2f08764cd018e049b507c26f5ac01f651e2e8696398d89a5a886ffb`, with Gitleaks 8.30.1.

It returned 1,361 findings: license.missing 1, hygiene.email 285, hygiene.local-path 475, SEC-3 5, secret.assignment 298, hygiene.github-private 291, hygiene.github-missing 6. These are scanner findings; this task does not assert that every historical credential-shaped fixture is a live credential. No values were printed or selected into evidence.

There are **zero findings in the candidate release tree, working tree, or changed files**. Five findings touch the candidate's existing ancestry: four SEC-3 findings in historical `tests/core/capture-boundaries.test.ts` / `tests/support/worker-identity.mjs`, and one hygiene.email finding in a historical vendored `scripts/base-cli/scripts/publish-check/public_hygiene.py`. The rest lie in other existing refs, including prior report-only evidence. The complete value-free scanner report and the ancestry summary are retained in this packet.

The assignment explicitly requires a complete passing publication scan with zero findings before a public product push. That gate is red. Published history must not be rewritten, and unrelated existing refs, historical tests and vendored scanner history are outside this Hono maintenance change. No ref was removed, no finding was waived, and no published history was rewritten. The default is to retain the finished candidate for the fleet to recover and resolve its historical publication policy, with no product push from this run.

Product custody: **UNPUSHED / BLOCKED** at `cloud/gr-mt-orbit-dep-2`, head `c367dedb2a7ed7aa040ef150d8e7481874d12691`. PR: none. CI run IDs: none. Exact-SHA Verify: NOT RUN because the pre-push gate prohibits publishing the candidate. This is not READY or PUSHED.

The source clone and its clean candidate remain at `/home/agent/rer-consolidation/work/maint/gr-mt-orbit-dep-2/repo`. A full standalone bundle outside the clone is verified at `/home/agent/rer-consolidation/work/gr-mt-orbit-dep-2/product-c367dedb2a7ed7aa040ef150d8e7481874d12691.bundle`, SHA-256 `56361e8071f030836ec677b7824460da5d0f07a19dbc545f9bd5681aa05062a5`. Preserve the VM/clone and retrieve that bundle before VM retention expires. Bundle recovery is not a product publication or landing signal.

The requested maintenance `result.json` has status `cannot`, records the successful security upgrade and local checks, and names the historical publication blocker. No product push was attempted, so there is no rejected product push command or HTTP status to report. The earlier scan timeout is separate from this complete failing scan.

The explicitly selected report packet is being published only to `evidence/gr-mt-orbit-dep-2`. Evidence publication is separate from product custody and never signals readiness or landing.
