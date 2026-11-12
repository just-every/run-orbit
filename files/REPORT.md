# Orbit readable values continuation

Repository: just-every/run-orbit
Branch: cloud/main-orbit-readable-values-1-pc1
Starting published head: c902d4c89d7750bbafce59e2ca8d0d22b77690f1
Final product head: d61f2aadce0a80a803ca5cc646f5aef27ee357cc
Final result: READY — pushed named branch; exact-SHA Verify 43170522083 completed/success.
PR: none; fleet branch landing.
Blockers: none.

## Plan

Preserve the saved history, inspect the completed failed Verify, fix the observed cause, merge newer main without rebasing, run the touched journey and typecheck, regenerate/check the source lock, push with fleet identity and the cloud guard, and verify the exact candidate through REST. Keep actual receipts and browser proof outside the product branch and return them through the evidence ref. PLAN.md records the detailed plan.

## Failure and fix

Verify 43161361567 failed in shards (batch-4), job 130994144795, step Verify routine product shard. Its browser journey reached the real Shared records drilldown, where the page correctly displayed Value (USD): 32 for the native 3200-cent value. The existing report-authoring helper still required a Value (in cents) field containing 3200. The aggregate verify failure followed that shard failure.

The continuation changes that helper to identify the amount through the shared record's value field and spinbutton role, assert the currency in its accessible name, and compare the displayed amount with the saved report's native cents divided by 100. All pre-existing report export, grouping, population, input record, period and exact saved cents assertions remain. No registrations were added, removed, skipped or disabled.

Newer main bd9c4b5 (four draft-normalization commits after the previous main) was merged without conflict. Those commits are retained whole. This continuation makes no additional product UI or permission change.

## Retained product behavior

The saved implementation resolves shared stages and permitted operator/user references to names; formats money in workspace currency; formats date/time on the workspace clock; keeps editable values in displayed units and converts them back to native cents/instants when saved. Names and metadata enrich only already-admitted fields. Native API shapes and archive wire formats remain unchanged.

Archive transfers show a readable start time and row/part counts. Copy details retains the support identifier; a collapsed support section permits cross-browser recovery. In-browser saved progress, unfinished-transfer lookup, streamed download, restore and cancellation remain available.

Merge review uses readable labels for supported contact/company/deal/owner fields. Missing-field and stale-value messages use those labels. The template editor's help retains the syntax.

The guest/shared view audit covers stage_id, owner_id, company_id, closed_by and typed custom user references; value_cents and editable money; built-in and typed date/time fields and save feedback; hidden record IDs, revisions, identity keys and unsupported internal foreign keys; record pickers, grant field lists, and notes/calls/meetings. The saved implementation also resolves owner/closed-by attribution, makes pickers and save feedback readable, and hides bookkeeping fields. Shared entry attribution already uses names and formatted times. Customer-authored text and explicit historical IDs supplied as customer data are preserved.

## Acceptance and counts

No CONTRACT.md Status, Gap or Evidence cells changed. No DONE claim. Generated ACCEPTANCE.md and docs/CLAIMS.md are unchanged.

Test budget: 198 registrations + 2 qualification flows = 200 before and after this continuation. The three reported presentation areas are implemented in the saved branch; this continuation repairs one stale money assertion. The old Verify had one failed product shard and its dependent aggregate; all other product shards passed.

## Local environment

The cloud checkout uses the repository's Node 22.20.0 and pnpm 10.12.4. Browser launches use /usr/bin/chromium with --no-sandbox through an external process preload. The initial fixture-migration attempts timed out at 60 seconds on this VM, before reaching a product page, under both VM Node 24 and pinned Node 22. A cloud-only preload first allowed 180 seconds, then 600 seconds for that exact local migration subprocess after parallel startup exceeded 180 seconds. The final focused report check ran serially and passed. The broader local journey attempts stopped in form-identity fixture setup before the touched report surface. A first merge-review run also exceeded its 240-second server startup allowance; its final run uses a 600-second startup allowance. These changes stay outside the checkout and do not change application code, test assertions, or CI timeouts. No private credentials or browser sessions are selected for evidence publication.

Actual test results, product SHA, push and Verify receipts follow below. The Mac fleet owns its independent publication scan and landing; this cloud does not push main or perform that scan.

## Pushed candidate and completed focused checks

Product head: d61f2aadce0a80a803ca5cc646f5aef27ee357cc. The first guarded push succeeded. The commit is a merge of the saved candidate and bd9c4b5, with the report-unit assertion fix and regenerated source lock. Every candidate author and committer was checked, including side parents; all use the fleet identity and all candidate messages are free of co-author trailers.

Passed locally: setup, app build, typecheck, contract-documents check, source lock/check, 200-test inventory, the existing readableSharedValues public-door helper, and the corrected authorReport public-door helper. The report helper still exports 3200 cents and now proves the displayed 32 USD. The shared helper proves USD 10,000, workspace-local close time, resolved references, 10000.25 -> 1000025-cent persistence and local-time -> ISO persistence. Reviewed synthetic screenshots at 1440 and 390 show readable values with no horizontal overflow; serious/critical axe findings for the report/drilldown are zero.

Clause counts before/after: 42 done, 130 partial, 32 missing. Status changes: none. The exact-SHA Verify is run 43170522083: https://github.com/just-every/run-orbit/actions/runs/43170522083 . CI poll receipts and the GitHub call ledger are kept in this packet. All scoped browser checks and the full exact-SHA Verify have since passed.

## Merge review browser result

The existing ACTION-004 draft-editor journey passed on the committed candidate, including the readableMergeReview extension (1 passed, 4.3 minutes including startup). It verifies rendered values against the render API, readable labels without dotted/underscored syntax, missing-value approval blocking when applicable, retained template syntax in editor help, and browser screenshots of the library and review at 1440 and 390. The screenshots were visually reviewed.

CLAIM OUT-014 PARTIAL points=6 tests=tests/e2e/operator.spec.mjs#ACTION-004 — the desktop draft editor saves D1 state and surfaces a revision conflict
CLAIM TEAM-005 PARTIAL points=none tests=newtests/t096/collaborator-lifecycle.test.ts#TEAM-001 signed-in peers use native and shared record actions while collaborators obey fields, grants and lifecycle fences
GAP TEAM-005: This round proves readable shared-record presentation and edits; it does not claim the complete manager/team/restricted-seller acceptance journey.

## Archive browser result

The existing native archive journey passed on the committed candidate (1 passed, 5.6 minutes including startup). It checks that everyday transfer summaries contain neither the transfer ULID nor a raw ISO timestamp, that Copy details returns the exact support ID/start/row counts, that the support section exposes the ID only when opened, that reload/resume uses the same transfer, and that unfinished-export choices use readable labels. It exercises streamed download, cancellation/rollback, confirmed restore, renewed authorization, current owner preservation and browser/CLI domain-content roundtrips. Its desktop and phone screenshots were visually reviewed and retained; the phone check confirms no horizontal overflow.

CLAIM DATA-001 PARTIAL points=3 tests=tests/archive/browser.spec.mjs#native archive preparation, streamed download, confirmed restore and renewed session preserve workspace records

There are no product blockers identified in the scoped checks. The committed-head typecheck also passed. The full exact-SHA Verify completed successfully on the pushed candidate. No PR was created; this repository's instructions assign the named branch to fleet landing.

## Final result and custody

Verify 43170522083 is completed/success on exactly d61f2aadce0a80a803ca5cc646f5aef27ee357cc. The final REST receipt is ci-8.json. Eight GitHub calls were used, including initial failed-job discovery and the one prior failed-job log retrieval; CI discovery/polls respected the 300-second minimum. The previous 43161361567 product-shard failure and dependent aggregate failure are resolved by the new green exact-SHA run.

Before/after: 200/200 tests; 42/42 done, 130/130 partial, 32/32 missing contract clauses. No contract judgment, status, gap or evidence cell was edited. Three requested presentation areas are covered, including the additional shared-field audit described above. No DONE claim or new test registration was made.

Successful local checks: application build; typecheck again on the committed candidate; source lock/check; contract-documents check; inventory; readable shared values; saved-report/drilldown units; merge-review draft journey; native browser/CLI archive journey. Browser proof covers 1440 and 390. Early local fixture/server startup timeouts remain recorded honestly and did not change product or CI assertions. No failing product check remains.

The guarded product push succeeded on attempt 1. Candidate authors, committers and messages were inspected, including side parents. The checkout is clean. Evidence publication is report-only and independent of product READY, publication scanning and landing. The fleet Mac performs its publication scan and landing; this cloud did neither, pushed no default branch, and created no PR. The product checkout will be removed after successful evidence publication; the report packet remains outside it.

POST lanes/main/INBOX.md: main-orbit-readable-values-1-pc1 READY d61f2aadce0a80a803ca5cc646f5aef27ee357cc on cloud/main-orbit-readable-values-1-pc1; fixed the stale shared-report currency assertion and merged bd9c4b5 without rewriting published history; Verify 43170522083 success replaces failed 43161361567; 200->200 tests, clause status changes none; PARTIAL claims OUT-014 point 6, DATA-001 point 3, TEAM-005 points none; full reports, receipts and 1440/390 proof return via the evidence ref.

READY branch=cloud/main-orbit-readable-values-1-pc1 head=d61f2aadce0a80a803ca5cc646f5aef27ee357cc
