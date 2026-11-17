# gr-mt-orbit-ci-11

Author: Run Edit Run fleet, 2026-11-17.

Repository: just-every/run-orbit
Product branch: cloud/gr-mt-orbit-ci-11
Candidate: 029751dd8e767f06d57ff0d74e2e7f796884f8c7
Baseline main: a4fcbfcd72fa4253826f43d0b0de02275094f86d

## Finding and change

The supplied completed Verify run 43598471020, on 7ad63db63c46c6a2a59157a5c128bd35f6c20173, failed in job 132458856416, shards (batch-18), at Verify routine product shard. The source/build job and the other product shard jobs passed. Aggregate job 132463886911 consequently failed.

The retained tests/delegation-browser/records-layout.test.ts journey failed inside typedFieldsJourney when reopening a saved view: the search box should have held Synthetic Calendar Contact and instead held an empty string. The failure is consistent with a browser-input synchronization race. The search and view-name inputs are server-rendered before React installs their handlers, while the column catalog only arrives from an effect after hydration. The search URL also catches up on a 300 ms debounce.

The change in tests/delegation-browser/typed-fields-journey.mjs waits for the existing archived-column control before entering either text value, then waits for the expected search URL before changing the view options. An additional assertion requires the entered view name to survive those option changes. Every existing save, reopen, current-row refresh, archived-column, sort, visibility, permission and error assertion is retained. There are no sleeps, timeout increases, skipped tests, product UI changes or dependency upgrades. sources.lock.json was regenerated last and changes only this helper's digest.

A similar fix is already present in commit 84b5f81da192fc4b0b2efb7ce948a13d3205e258 on another remote branch, but it is absent from current main. This candidate applies only the relevant synchronization change onto current main, preserving main's later product work.

## Plan and execution

1. Initialize fleet identity, launcher, decrypted-bundle Git helper, commit hooks and pinned toolchain; read launcher and repository rules.
2. Inspect the supplied completed run and its failing job before editing.
3. Run the unchanged failing journey on current main, then a temporary browser-only six-times CPU-throttle probe around the saved-view portion.
4. Apply the smallest synchronization repair without removing or weakening assertions; restore the temporary throttle.
5. Regenerate the source lock last, check it, commit the helper and lock only, and run the touched journey, typecheck, contract-view check and inventory.
6. Scan the exact committed source through Base's packaged publication scanner with full history and the public main base, inspect all candidate identities and trailers, push only the named cloud branch through the supplied guard, and inspect exact-SHA Verify under the API budget.
7. Write the maintenance result and actual non-secret receipts outside the product; explicitly publish this packet only on the evidence ref and relay the gr lane POST.

## Local observations

- Node 22.20.0 and pnpm 10.12.4; system Chromium /usr/bin/chromium, headless, with --no-sandbox.
- pnpm install --frozen-lockfile: PASS.
- cloud_run npx -y @runeditrun/rer build: PASS.
- Unchanged journey on baseline main: 1 passed, 0 failed, 0 skipped; 174357.354246 ms.
- Temporary browser CPU-throttle probe before the fix: 1 passed, 0 failed, 0 skipped; 191970.026121 ms. The original CI failure did not recur in these two local runs; they are not claimed as failing reproductions or proof that the report was false.
- Candidate typecheck: PASS.
- Contract generator check: PASS, documents already current.
- Source lock generator and source check: PASS.
- Candidate browser journey: PASS, 1 passed / 0 failed / 0 skipped, 197262.617896 ms; saved-view screenshots at 1440 and 390 retained.
- Publication scan: COMPLETE/PASS on the candidate SHA, zero findings; full history scanned (908 commits including the candidate, 904 trees, 9034 blobs).

No full local verification suite was run. Branch CI supplies the full verification wall.

## Counts and clause judgments

Registered cases: 198 before, 198 after.
Qualification flows: 2 before, 2 after.
Total: 200 before, 200 after.
Original failing journey: CI 0 passed / 1 failed; candidate local result recorded in the final receipt.
Contract counts remain 42 done, 130 partial, 32 missing, 204 total.
Clause status changes: none. No target clause is promoted or demoted; no contract text or generated view is changed.

## Evidence transport and limitations

The required gh run view 43598471020 --repo just-every/run-orbit --job 132458856416 --log-failed returned exit 0 with empty output under the installed gh 2.46.0. Its downloaded local archive cache contained the actual failed job log, which was inspected without another API call; the exact failure excerpt is retained in original-failure.txt. The aggregate failed-job command likewise returned empty output.

An attempted retained-artifact read, gh api repos/just-every/run-orbit/actions/artifacts/14116146730/zip, returned exit 1 and HTTP 403 Forbidden at the artifact blob redirect. It was not retried. Signed URL queries and environment dumps are excluded from this packet. This transport failure did not block recovery of the original assertion from the cached workflow archive.

Product publication, exact-SHA CI and final custody are recorded in the finalized receipts. Evidence publication is a separate report-only ref; it does not constitute acceptance, landing or production deployment. The fleet owns landing on main.


## Product publication and CI

The supplied cloud push guard published the exact candidate on its first attempt.
Product ref: refs/heads/cloud/gr-mt-orbit-ci-11
Product head: 029751dd8e767f06d57ff0d74e2e7f796884f8c7
Verify run: 44055814355
Run URL: https://github.com/just-every/run-orbit/actions/runs/44055814355
The discovery response confirms a push event on the named cloud branch and exact candidate SHA. Final status is retained in the CI receipt.
No PR was created; this maintenance candidate uses the existing branch-Verify and guarded fleet landing contract.
No main or default-branch push, force push, workflow rerun, tag, release or deployment was performed.

## Final observed outcome

Exact-SHA Verify remains in progress after the final budgeted read; no READY or landing claim.

Final custody: PUSHED branch=cloud/gr-mt-orbit-ci-11 head=029751dd8e767f06d57ff0d74e2e7f796884f8c7
Verify run 44055814355: in_progress / None.
The run response confirms the exact product SHA. Nine explicit GitHub invocations plus one required Base publication-scan invocation consumed the ten-call task budget. Repeated CI reads are spaced by at least 300 seconds; no short API polling loops were used.

No clause status changes. Tests remain 200 before and after. All local touched checks passed. No product behavior, UI, dependency pin or generated contract view was changed.

Packet transfer is report-only through evidence/gr-mt-orbit-ci-11. The manifest records the separate product branch and SHA. The clone is removed after successful evidence publication per the supplied builder cleanup rule; the product ref and this actual packet preserve custody.

Remaining work: Exact-SHA Verify remains in progress after the final budgeted read; no READY or landing claim.
