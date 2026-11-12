# Dashboard quota and shared-field correction

Repository: just-every/run-orbit
Branch: cloud/main-orbit-dashboard-truth-1

## Plan
1. Prepare the authorized clone with fleet identity, credential helper and preserved commit hooks; read repository rules and relevant contract clauses.
2. Reproduce monthly quota loss and imported provenance in dashboard filters through the authenticated emitted application, before product edits.
3. Keep monthly and quarterly forecast quotas distinct and consistent with the live forecast, including dashboard exports. Exclude internal import provenance and non-readable structured values from the shared field list used by dashboard filter and binding pickers.
4. Extend the existing dashboard browser journey at 1440; retain the existing 390 smoke and capture the changed screens at both widths. Add no registration because the budget is 200/200.
5. Run the touched journey and typecheck, refresh main without rewriting any published commit, regenerate/check the source lock last, and publish only the named product branch.
6. Inspect exact-SHA Verify via REST within the ten-call budget, then publish actual reports and receipts separately to the evidence branch. Return provenance, claims, gaps and lane POST lines.

## Scope and defaults
No CONTRACT.md status, gap or evidence edits; no DONE claim. Monthly and quarterly quota totals are separate and both shown when both overlap, as on the live forecast. No quota proration or new forecast math. Internal provenance remains stored intact. No deployment or main push. The cloud cannot run the Mac publication scan; the fleet retains that landing gate.

## Results
Baseline b3e94efdc16e4ae467cd2ed283ee4eb0dc4c0c31 reproduced both defects through the emitted Worker and authenticated pages. A real reviewed CSV import populated import_source. The live forecast and dashboard JSON both carried 5,000,000 cents of monthly quota, while the tile rendered $0.00 and No quota set. The filter list offered the importer JSON string. See reproduction.json and before screenshots.

Implementation shares quota-period selection between the live forecast and tiles, shows each overlapping monthly/quarterly target and its own attainment, and applies the same selection to PDF/CSV. No calculation changes. Customer filter values remain string/number/boolean and are bounded by the API's 200-character limit; import_source is excluded from the shared list and from the legacy selected-option fallback. Stored importer provenance is unchanged.

The existing dashboard registration now saves the owner's $50,000 monthly quota in the browser; creates native/imported $10,000 at 30% and $20,000 at 60%; compares the live forecast and live/saved dashboard tiles; checks the real CSV; excludes import_source while retaining text/number/boolean customer fields; checks owner filtering, separate monthly/quarterly quotas, zero-quota review, immutable saved results and unchanged provenance. Desktop assertions run at 1440; changed-screen browser captures run at 1440 and 390. Initial local iteration exposed an incomplete native PUT in the test fixture; it was corrected to use the required saved deal fields.

Test count before: 198 registrations + 2 qualification flows = 200. After: 198 + 2 = 200. No registrations added, removed, skipped or weakened. Contract status counts and clause Status/Gap/Evidence are unchanged.

Validation: build and typecheck passed. Final touched report file passed: 2/2 tests, 0 failures, 0 skipped; duration 756,097 ms. Final typecheck, source lock check and contract generator check passed. Main refresh/rebase was a no-op at b3e94efdc16e4ae467cd2ed283ee4eb0dc4c0c31. Both new files were staged before the final lock generation. All candidate author/committer identities were fleet and trailers were absent. The first real product commit was pushed immediately through cloud-push.py, successfully on its first attempt.

Product head: d9e00933665a7f860930cc4fd778ec69eef9c9f7
PR: none required or created.
CI: exact-SHA Verify 43151582979 completed/success on d9e00933665a7f860930cc4fd778ec69eef9c9f7; https://github.com/just-every/run-orbit/actions/runs/43151582979. Six GitHub REST calls were used, spaced at least 300 seconds apart. The full workflow, including its required aggregate, passed.
Assigned-work blockers: none.
Terminal product custody: READY branch=cloud/main-orbit-dashboard-truth-1 head=d9e00933665a7f860930cc4fd778ec69eef9c9f7
Clause statuses before/after: 41 done, 126 partial, 32 missing; no change.

CLAIM REPORT-002 PARTIAL points=1 tests=newtests/t096/browser-dashboard.ts#dashboardJourney; newtests/t096/dashboard-truth-journey.ts#dashboardTruthJourney
DEFAULT REPORT-002: Show monthly and quarterly quotas separately when both overlap, matching the live forecast; do not choose one silently or sum them.
GAP REPORT-002: Team filters remain inherited by TEAM-006; no whole-clause or acceptance-point-3 completion is claimed by this focused fix. Email delivery and other out-of-scope gaps remain unchanged.

The two named browser journeys run inside the existing REPORT-002 REPORT-003 REPORT-004 registration in newtests/t096/report-disclosure.test.ts; local-receipt.json records its complete registered name and passing result. No FORECAST-001 whole-point or DONE claim is made: this round verifies the dashboard quota presentation subset, not a fresh full forecast qualification.

The Mac publication scan remains a fleet landing gate and was not run in this cloud. No main ref was changed.
