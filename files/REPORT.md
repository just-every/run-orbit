# Orbit readable values — main-orbit-readable-values-1

Repository: just-every/run-orbit  
Branch: cloud/main-orbit-readable-values-1  
Product head: c902d4c89d7750bbafce59e2ca8d0d22b77690f1  
Initial base: b3e94efdc16e4ae467cd2ed283ee4eb0dc4c0c31; merged current main: e98f2c8f81b525ce27573a917b355100c6bf8774  
Product pushes: initial candidate, compatibility save and final merged head each succeeded on the first guarded attempt. Published history was preserved; the final merge head has no skip-CI marker. No PR is required by this repository's supplied landing rules; the fleet owns landing.  
Initial Verify: [43153414852](https://github.com/just-every/run-orbit/actions/runs/43153414852) failed on the first pushed SHA. Its diagnosed API-shape compatibility failures are fixed in the follow-up candidate described below; see CI-FAILURE-DIAGNOSTICS.json and CI-FAILED-JOBS.json.

## Plan and implementation

The full plan is in PLAN.md. Reproduction went through native rer setup, local owner sign-in, an invited/accepted Guest, ordinary record/library APIs and the real app pages. REPRODUCTION.json records the three original findings. Work remained on the shared-record, archive and merge-review surfaces.

Shared record detail now resolves permitted stage, owner and closing-actor references, formats stored cents with the owner's existing workspace-currency formatter and renders dates on the workspace clock. Editable currency units and local time convert back to cents and UTC at save. Internal bookkeeping is hidden; typed custom user/date values and save confirmations are readable. Field authorization stays in the existing graph/access checks; presentation is built only from projected fields and is opt-in through presentation=readable for the browser, preserving the default API response shape. Company reads retain their separate field authorization.

Archive transfers show start time from their existing ULID timestamp and available row/part counts, preserving native archive API payloads. Copy details and collapsed support details retain the technical identity and support cross-browser recovery. Session resumption, unfinished-transfer discovery, streamed download, immutable snapshots, confirmation, rollback and renewed sign-in remain in place. Discard/cancel clears the selected transfer so starting another transfer does not require editing an ID. Browser conflict recovery uses the unfinished-transfer picker; terminal recovery retains the technical identity.

Merge review and missing-field messages use readable field labels. The supported syntax remains in the library editor's help. Rendering, review hashes, stale-input fences and approved immutable bytes are unchanged.

AUDIT.md lists each guest/shared path inspected and each additional raw value corrected.

## Validation and proof

- Final typecheck and application build passed.
- The prior-auth exact response-shape upgrade passed. The full retained-main/released-v0.3.0 upgrade and archive case passed after the API compatibility correction and historical-source recovery.
- The existing OUT-014 missing/stale merge and immutable approved-content case passed.
- The extended draft editor browser case passed, including its retained persistence and conflict assertions and the new library/review assertions.
- The extended native archive browser/terminal journey passed: preparation, Copy details, hidden support IDs, reload/resume, streamed download, refused restore, confirmed rollback, restored records and CLI transfer.
- Every newly added shared-value browser assertion passed in a focused native-fixture invocation: stage, owner and company names, readable money/date, no raw values in the read-only detail, and saved cents/UTC after edits. A shared closing-actor field also reads as the closing person's name.
- Existing collaborator permission/core assertions passed. The broader local lifecycle run had 1 pass/1 failure before the last accessibility fix: its new exact Stage label locator failed after the value/save assertions passed. The final focused rerun passed after explicit selector labels were added. Exact-SHA Verify supplies the complete unchanged registration.
- Source lock was regenerated last after staging the new files, then checked successfully. Diff whitespace and candidate identity/trailer checks passed.
- Tests remain **200 → 200**: 198 registrations plus two qualification flows. No test registration was added, removed or skipped.
- Assertions for the new behavior run at 1440. The screenshots under screens/ show shared records, archives, library and merge review at 1440 and 390; these were inspected.

VALIDATION.json is the actual check receipt, SHARED-VALUES.json records the successful storage-unit/time conversion assertions, and selected non-secret runner logs are included. Browser traces, session cookies, local environment files and archive payloads are excluded.

Initial fixture startup exceeded the repository's 60-second allowance on this VM under both Node 24 and pinned Node 22. Local runs used temporary migration startup allowances of 180 seconds, then 300 seconds for sequential compatibility revalidation; the repository's CI fixture stays unchanged. Headless Chromium used /usr/bin/chromium with --no-sandbox. The expanded draft journey has a 180-second overall allowance. An initial typo in the terminal recovery audience was caught and corrected by final typecheck.

## Clause custody and remaining scope

No CONTRACT.md, ACCEPTANCE.md or docs/CLAIMS.md changes. No Status, Gap or Evidence cell was edited; no DONE claim is made. Before/after clause status counts are unchanged: 42 done, 32 missing, 130 partial.

CLAIM OUT-014 PARTIAL points=4,6 tests=tests/core/signals-outreach.test.ts#OUT-014 missing merge fields block; template revisions never rewrite approved content; tests/e2e/operator.spec.mjs#ACTION-004 — the desktop draft editor saves D1 state and surfaces a revision conflict
CLAIM TEAM-005 PARTIAL points=none tests=newtests/t096/collaborator-lifecycle.test.ts#TEAM-001 signed-in peers use native and shared record actions while collaborators obey fields, grants and lifecycle fences
CLAIM DATA-001 PARTIAL points=none tests=tests/archive/browser.spec.mjs#native archive preparation, streamed download, confirmed restore and renewed session preserve workspace records

DEFAULT TEAM-005: Keep current sharing permissions, including the Share Company UI's existing separate company-name grant; no other company fields are added.
GAP TEAM-005: This polish round does not claim the full teams/restricted-role acceptance point.
GAP DATA-001: This round proves the archive controls and retained journey, not every full-target portability obligation.
Mac publication scan and landing remain with the fleet. The first candidate had API-shape compatibility failures. Both diagnosed causes are corrected and local revalidation passed. Final exact-SHA Verify remains in progress; its success is not claimed. Other stranger findings and parallel rounds remain outside this change.

Product custody and this report-only evidence publication are separate. The product branch contains only product/test/source-lock changes. The evidence ref is evidence/main-orbit-readable-values-1.

## CI compatibility correction

The first full Verify found strict retained-version comparisons broken by two added JSON properties. The failure excerpts identify createdAt in archive status and presentation in default shared-record reads. The browser now derives transfer start time from its existing ULID; native archive repository/status code is restored byte-for-byte to main. Shared-record presentation is opt-in for the UI, preserving the prior default response shape and the original upgrade assertions. No test assertion was weakened. Diagnosis used nine GitHub calls; final corrected-head run discovery used the tenth. Other failed logs were not read beyond that budget. These failures are caused by this round, so they require a real follow-up commit, not a rerun of the old SHA.

Released-upgrade fixture recovery: fetched the missing v0.3.0 tag, then recovered from one HTTP 503 during lazy historical-source download by refreshing the prescribed launcher bundle, reinstalling the prescribed fleet Git helper, and batch-fetching the release objects. The first batched fetch succeeded with zero missing release source objects. No credential source was substituted.

## Final custody

PUSHED branch=cloud/main-orbit-readable-values-1 head=c902d4c89d7750bbafce59e2ca8d0d22b77690f1

[Final Verify 43161361567](https://github.com/just-every/run-orbit/actions/runs/43161361567) was in_progress on this exact SHA at the final REST discovery. Ten of ten allowed GitHub calls were used, including two failed-job log reads; no further polling or green claim is made. The earlier failed run is superseded by this candidate. Main e98f2c8's unrelated two guide assertions were retained through a real merge, and the source lock was regenerated and checked on the merged tree. The final product checkout was clean after the guarded push.

The final guest journey also proves closing-actor names and preserves ordinary custom text whose key ends in _at. Only native timestamp fields or declared datetime fields receive timestamp conversion. No local application assertion remains red on the corrected paths. The outstanding gate is successful final exact-SHA Verify, owned by the fleet after this budget-limited return.
