# Orbit HubSpot CSV import

Task: main-orbit-hubspot-import-1
Repository: just-every/run-orbit
Product branch: cloud/main-orbit-hubspot-import-1

Final candidate: 2c3212cc106f8c82bed3c14673bd74277ddcf7ca

Final exact-SHA Verify: completed/success, run 42992780622.

Blockers: none. Candidate custody is READY; landing and the fleet publication scan remain independent gates.

## Plan and implementation

The complete plan and official documentation references are in [PLAN.md](PLAN.md).

1. Reproduced the standard notes export through the running installed app, Settings → Data → import, using synthetic contacts and two notes. Record ID, Note Body and Associated Contact IDs mapped; Create Date did not. Both note rows were rejected, and the review incorrectly mentioned name-derived companies.
2. Reproduced pre-script selection by delaying JavaScript requests while using the server-rendered form. HubSpot reverted to Generic and the review button remained disabled. The native file input still contained the file, but application state did not recognize it. This probe reproduced the reset without a React recovery; the reported stranger's mismatch was not independently observed.
3. Added standard HubSpot note labels and retained legacy prepared/API-style labels. Activity date takes priority, then hs_timestamp, then Create Date. Association IDs and historical activity owner map automatically. Missing and future dates retain their refusals. The already supported contact/company/deal fields were checked against official HubSpot documentation. No marketing-contact classification becomes subscribed consent.
4. The import page adopts the live source and all native file inputs once when scripts attach. Radios remain controlled thereafter. A source-selection revision prevents an outstanding file read from repopulating a different source. The banner reports row, rejection and suppression totals without making a blanket company-creation claim; derived companies, when present, remain visible in their individual row results.
5. Updated both the repository moving guide and the in-app static guide for the supported note export labels. Preserved unrelated legacy prose.
6. Extended the existing import-route registration and browser registration; added no test registration. The inventory stays 198 registered cases plus two qualifications = 200 of 200. Assertions run at 1440; changed upload, mapping, review and completion screens were captured at 1440 and 390.

## Before and after

| Observation | Before | After |
| --- | --- | --- |
| Two standard notes | 0 ready, 2 rejected | 2 ready, 0 rejected; 2 timeline entries after Apply |
| Activity date/time mapping | Unmapped | Create Date |
| HubSpot chosen before scripts | Reset to Generic | HubSpot retained |
| Files chosen before scripts | File DOM present, app state missing, review disabled | All five recognized; review enabled |
| Name-derived company claim without derived companies | Present | Absent |
| Test budget | 200/200 | 200/200 |

The first native reproduction used two notes and one associated contact. The browser regression additionally includes companies, deals and standalone suppression, with explicit source IDs and associations. The screenshot review therefore has six source rows, including two notes, with zero rejected rows.

## Verification

Actual command output and receipts accompany this report. [browser-receipt.json](browser-receipt.json) records the passing browser journey, two imported notes, five pre-script files, zero hydration recoveries, and the screenshot names. Core route assertions use the public import dry-run/Apply/undo routes and native record reads. Typecheck and the generated contract-view check passed. The first complete core-file run passed three of four cases. Its long vendor case exceeded the initial ten-minute email proof before the existing owner-erasure assertion; that assertion now uses the fresh session the fixture had already obtained for the same operator. No authorization guard or assertion was weakened. The affected case passed in its targeted rerun; all four touched core cases are now covered by passing runs. The source lock is regenerated after staged product changes and checked separately.

The first browser test attempt had a Playwright paused-request cleanup error. The second exposed uncontrolled radio state when switching back to Generic; the final implementation keeps controlled radios and the controlled-radio browser run passed, and a further run passed after simplifying the banner. An ad hoc route probe launched as CommonJS outside the module repository produced an import-kit WeakMap guard error; switching the probe to ESM removed that harness error. The first ESM probe interleaved a second source import before replay, which produced a native-edit conflict; legacy-format validation now runs after the original source's replay/undo so each source journey is isolated.

## Contract and limits

No clause Status, Gap or Evidence cell was edited; CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md remain unchanged. No DONE claim is made. This is a CSV-preset and native-wizard improvement. Connected migration, authorized customer export, full activity/attachment coverage and all other MIGRATE-001 obligations remain outside this round. See the final receipt for product SHA and exact-SHA CI custody.

The cloud cannot run the fleet's publication scan. The existing fleet must run it before landing. All evidence stays on the separate evidence/main-orbit-hubspot-import-1 ref; evidence publication is not product READY or landing.

## Product custody

Product head: f3bd24f93130404f9dc3de0823363a5d5ee72b76

Product tree: 3e0c947e9821c713dfad004a2dd7e38c904fdfb1

Pushed only cloud/main-orbit-hubspot-import-1. No pull request is required by this repository’s builder rules. Exact-SHA Verify is checked separately; no main or default branch was pushed.

CLAIM RECORD-008 PARTIAL points=1 tests=tests/core/crm-import.test.ts#RECORD-008 vendor exports and generic spreadsheets dry-run, reconcile, re-import and undo through current operator routes; tests/e2e/imports.spec.mjs#RECORD-008 reviewed vendor files and plain CSV import and undo through the responsive native wizard

CLAIM MIGRATE-001 PARTIAL points=none tests=tests/core/crm-import.test.ts#RECORD-008 vendor exports and generic spreadsheets dry-run, reconcile, re-import and undo through current operator routes

GAP MIGRATE-001: CSV preset coverage is proven with synthetic exports; connected migration, authorized customer export and complete activity/attachment coverage remain unproven.

Verify run: 42986499140 — https://github.com/just-every/run-orbit/actions/runs/42986499140 (exact product head; conclusion recorded in [ci-run.json](ci-run.json)).

The pushed clone is removed after evidence publication and terminal provenance is retained in this packet.

## Browser proof

- Upload: [1440](hubspot-upload-1440.png), [390](hubspot-upload-390.png).
- Mapping: [1440](hubspot-mapping-1440.png), [390](hubspot-mapping-390.png).
- Review: [1440](hubspot-review-1440.png), [390](hubspot-review-390.png).
- Completed: [1440](hubspot-completed-1440.png), [390](hubspot-completed-390.png).

Actual local command receipts: [local-receipts.json](local-receipts.json). Identity and diff check: [publication-receipt.json](publication-receipt.json).

## Full-wall CI follow-up

Verify 42986499140 completed with failure on the initial product head. Its only failed product shard was batch-7 / fold-domain-3, job 130410050543. The TEAM-001 collaborator journey observed a contact-list 403 in the browser console while grants were changing; the final verifier job 130418212629 failed as a consequence. The failed job archive was read once successfully; an assertion excerpt is retained without the workflow environment block.

A fixture sequencing correction waits for the redirected guest list read to settle before revocation. All existing positive and negative permission assertions and console checks remain. The first local retry passed the desktop checks but hit the existing five-second readback timeout after the phone’s pre-script company creation; the fixture now waits up to 30 seconds for the destination detail loader to expose the required value. No runtime permission code or import behavior changed in this follow-up. Actual local result and final exact-SHA CI custody are recorded separately.

Final product head: 2c3212cc106f8c82bed3c14673bd74277ddcf7ca

Final product tree: 0f5d6a9ad39623f645b2353fec78482b6c96bc2a

The follow-up fixture case passed locally at both widths (435.390 seconds). Typecheck, source-lock check, contract-view check and the 200-test inventory passed again. No runtime source changed between the first and final product heads. Both commits were pushed with the cloud push guard; every candidate author, committer and trailer was inspected. The final exact-SHA run is recorded in [ci-final-run.json](ci-final-run.json).

## Final result

Verify 42992780622 completed successfully on 2c3212cc106f8c82bed3c14673bd74277ddcf7ca. Ten GitHub calls were used: six initial-run discovery/polls, one failed-job listing, one failed-job archive read, and two final-run discovery/poll calls. All requested import changes and the fixture sequencing follow-up are pushed. No clause status or generated acceptance view changed.
