# Orbit mailbox response-body proof repair

Task: sd-orbit-mailbox-proof-body-1. Repository: just-every/run-orbit. Claim: none.

## Plan and scope

The complete plan is in PLAN.md. The execution sequence is: fresh shallow filtered main clone and fleet authentication/hooks; baseline targeted native test before edits; change only response-body handling in the leased helper; regenerate its source-lock hash; preserve assertion predicates and expected values; run the same native case, all other cases in its sole importer, typecheck, source check, contract check and build; inspect all candidate commit identities/trailers; push only cloud/sd-orbit-mailbox-proof-body-1; watch exact-SHA Verify through REST; publish this complete selected report packet on its separate evidence ref. No landing is performed here.

## Baseline and reproduction limits

The clean origin/main clone was 8f4e14a5ef9fd82fcc91e40e540aa2ac22e17a74. The dedicated cloud runner is Linux x86_64, Node v24.19.0, pnpm 10.12.4. The supplied toolchain script retained this newer installed Node; the repository's Node pin is 22.20.0. The GitHub Verify workflow selects that repository pin independently.

Before any source edit, the existing CAPTURE-006 deletion/calendar consent and OUT-013 mailbox send consent, exact review, Sent, uncertainty and revocation case passed, 1/1, in 779.453 seconds. It ran under the Verify tsx/node-test runner with --test, --no-test-only, --test-concurrency=1 and the spec reporter, filtered by its existing test name, with an external 900-second process bound. No assertion or test timeout was changed. The cloud instructions replace remote heavy-slot execution with a direct bounded command in this dedicated VM.

This VM did not reproduce “Body is unusable.” The brief reports that failure on win-runner and M1; this task has not rerun those platforms. The successful baseline is retained as an actual receipt, not presented as a reproduced failure.

## Repair

Every clone-then-original-read site in tests/support/mailbox-send-proof.ts now reads the original response text once, retains that text for the same status diagnostics, and parses that text when JSON data is needed. In particular, reviewedValue is parsed immediately after the review response and its saved revision is reused after the later render requests. No original body is read after a clone, and no clone remains in this helper. Status-only diagnostics consume their original body once.

The change preserves all 129 assertion predicates, expected values and ordering. The AST audit records 129 before and 129 after, and 10 response clone sites before versus 0 after. Requests, provider fixtures, timeout settings, product code and all other tests remain unchanged. The only additional changed file is sources.lock.json: the documented lock generator changes exactly the leased helper's hash, required by the existing source-integrity gate. audit.json verifies no other lock entry or lock metadata changed.

## Contract custody

CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md remain unchanged. Counts before and after: 42 done, 130 partial, 32 missing, total 204. CAPTURE-006 stays partial; OUT-013 stays missing. No Status, Gap or Evidence judgment is changed and no clause is claimed.

## Validation and publication

Baseline contract and source checks passed. After the repair, typecheck, source check, contract-docs check and the application build passed. The identical post-edit mailbox command passed 1/1 in 842.822 seconds. The other four cases in tests/core/capture-providers.test.ts passed 4/4 in 403.825 seconds under an explicit positive name filter, with zero skipped, failed or cancelled tests in that completed run. Together the two successful post-edit selections cover all five tests in that sole importer of mailboxSendProof. The initial negative-filter importer command unexpectedly also selected the mailbox test after four passes; I manually terminated that duplicate selection (exit 241, one cancellation, no assertion failure) and reran the four explicit cases to a clean exit. Both the interrupted receipt and the successful correction are retained. No test source or timeout was changed to correct command selection.

All raw non-secret check logs and command/exit/time receipts selected for transfer are retained alongside this report. The packet is separate from the product branch. Product readiness will be based only on the exact pushed SHA's Verify result, not this evidence transfer.

## Terminal product and CI receipt

UTC report stamp: 2026-11-13T11:31:37.232486+00:00.

Product branch: cloud/sd-orbit-mailbox-proof-body-1.
Product commit: 088a5263487a37ae465e7e42d1bb1b64167686b0.
Base: 8f4e14a5ef9fd82fcc91e40e540aa2ac22e17a74.
Push: success on the first fleet-guard attempt, after inspecting every candidate identity and full commit message. The sole candidate has fleet author and committer and no co-author trailer. The product worktree is clean and both tested file hashes match the committed candidate. There is one product commit, with no [skip ci]. No PR is created or required by this repository's stated instructions. No main/default branch, tag, landing or history rewrite is performed.

Exact-SHA Verify run: 43412938780.
URL: https://github.com/just-every/run-orbit/actions/runs/43412938780.
Observed status: in_progress; conclusion: None.
Observed head: 088a5263487a37ae465e7e42d1bb1b64167686b0.
GitHub calls recorded for task monitoring/diagnosis: 8. The single watcher uses at least 300 seconds between run discovery/poll calls. Raw responses and timestamps are retained in CI.json, ci-call-*.json and github-calls.jsonl.

Terminal custody: PUSHED.
Blockers: none.
Clause changes: none; counts remain 42 done / 130 partial / 32 missing / 204 total.
CAPTURE-006 stays partial and OUT-013 stays missing. CLAIM none.

The complete actual check commands, exit codes and UTC times are in receipt.json and the individual .json/.log pairs. The initial manual duplicate-run interruption is retained and distinguished from the later clean four-case result. Evidence is published separately in refs/heads/evidence/sd-orbit-mailbox-proof-body-1 and is not a landing or product-readiness signal. The successful product checkout is disposable only after this packet is transferred; a verified product bundle is retained outside the clone for custody.
