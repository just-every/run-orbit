# Orbit record-read race: sd-orbit-readcontext-race-1

Repository: just-every/run-orbit. Product branch: cloud/sd-orbit-readcontext-race-1.
Baseline: 7c3cb25fb66a9c7879f2ddb386473805106f994d.
Claim: none. Contract judgments, evidence fields, generated views, homepage and timeouts are unchanged.

## Plan and implementation

The complete plan is PLAN.md. Refresh fleet setup; clone current main shallow and filtered; reproduce the race in the existing T099 desktop test; preserve HTTP statuses; select failures deterministically across parallel required reads; run focused/affected checks and source lock validation; push only the named branch under fleet identity; wait for exact-SHA Verify; return actual reports on the separate evidence ref.

readContext now attaches the response HTTP status, retaining its original server message and malformed-JSON fallback. readOperatorResource, beside useOperatorResource, waits for the required parallel reads to settle, chooses the first 404 in declared read order, otherwise chooses the first failure in that order, and returns the original results on success. The existing hook continues to call notFound only for its existing detail keys and 404 status. Other errors keep their messages and status. Optional opportunity reads retain their existing catches.

Both customer and opportunity record loaders use this helper. The two-line opportunity-loader change is necessary because it owns the same T099 race and otherwise still lets another required read win by timing. No other product behavior was edited. sources.lock.json was regenerated after the source/test changes and passes the documented source check.

The regression extends the existing 1440px T099 case, with no new suite or registered test and no timeout or assertion weakening. It gates primary/relationships responses explicitly, waits for the first response to finish and two animation frames, then releases the second response. It checks contact and opportunity pages, both orders, 404/404 and mixed 404/503 failures, non-404 precedence for 401/403/409/500, and single failures with the other read succeeding: 52 combinations. Assertions run at 1440px. Recovery screenshots are taken once per record type at 1440 and 390.

## Actual before/after evidence

The baseline proof uses a detached worktree of the exact original main, with only the regression test copied in; the journey itself creates another fresh state-free checkout. race-before.log records the expected product assertion failure: contact, primary 404, relationships 404, relationships first; expected "This contact does not exist.", received "relationships refused (404)". This is the original recovery assertion, not a synthetic assertion on an implementation detail.

The first harness attempt exposed the journey helper's networkidle default, which cannot finish while a response is deliberately held. The harness now uses domcontentloaded only for the controlled navigation and explicitly waits for the first response; all original timeouts remain. An initial baseline-worktree dependency symlink also needed a local Git exclude so the fresh-checkout copier did not treat it as a file. These harness failures are retained separately. The first typecheck exposed a generic-array filter narrowing error; an explicit rejected-result list fixed the typing while preserving the same selection behavior, and the final typecheck exited 0. One initial database-test command lacked ORBIT_TEST_STATE; it was rerun after the documented isolated-state preparation. None of these initial attempts is counted as a product regression proof or pass.

Final validation, product SHA, CI run IDs, publication custody and any remaining limitations are recorded in RECEIPT.json and the final result below.

## Counts and clause changes

Registered tests: 198 before and after; qualification flows: 2 before and after; total: 200 before and after. The existing T099 includes 52 controlled read-order combinations.

Contract: 204 clauses; 42 done, 130 partial, 32 missing before and after. Changed clauses: none. No status flip or whole-clause acceptance claim.

The candidate passed all 52 controlled browser combinations and the full unchanged remainder of T099 (1 test passed, 0 failed). The existing records-complete file passed both tests. Final build, typecheck, source and contract checks, boundaries, rer check and the additional final-code API diagnostic all passed.

## Product publication

Product commit: 43cc56c444c9d519c297913fcdc4fdfc59741d71. The named branch was pushed successfully on the first attempt after every candidate author, committer and trailer was checked, including side parents. Worktree is clean. No PR, main, default branch, tag or landing write occurred. Verify run 43385726764 is being watched on this exact SHA with the ten-call/300-second REST budget. The final custody and workflow result are recorded below.

## Final result

UTC stamp (`date -u`): 2026-11-13T08:01:43Z. Product head: 43cc56c444c9d519c297913fcdc4fdfc59741d71. Custody: PUSHED. Verify run 43385726764: in_progress, conclusion None, exact SHA confirmed. GitHub reads used: 8/10, one watcher, at least 300 seconds between run reads.

Verify was still in progress when the run-read budget became short. Product is PUSHED, not READY. No completed failure was observed in the returned run receipts, and no source fix or rerun was invented. Remaining work is the exact-SHA workflow result and the fleet publication/landing gates. This is a pending workflow, not a product push blocker. Two calls remain reserved for failure investigation.

Local results: deterministic baseline failure reproduced; 52 controlled response-order combinations passed; full T099 at 1440 passed; existing records-complete tests 2/2 passed; final typecheck, build, source lock/check, contract generator check, boundaries, rer check and final API diagnostic passed. Both record recovery screens were captured at 1440 and 390. Registered tests remain 198 + 2 qualification flows = 200. Contract counts remain 42 done, 130 partial and 32 missing (204 total); no clause changes or claim. No PR was required or created. No main/default branch, tag, inbox/state or landing write occurred.

The managed environment restarted during the wait. The watcher resumed from its saved call count/timestamp, retaining the same product SHA and reports. Evidence is a separate report-only ref and never signals acceptance or landing. The final evidence head is in the terminal EVIDENCE line and the local publication receipt outside the self-hashed packet.
