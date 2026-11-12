# Orbit contact consent creation

Repository: just-every/run-orbit
Branch: cloud/main-orbit-contact-consent-1

## Plan
1. Reproduce unknown-sender capture creation and manual recreation of a contactable erased address through native browser controls before product edits.
2. Route evidence-based contact creation through a guarded server action; default to Do not contact, record the decision on the contact timeline, and explain it in place.
3. Reuse existing anonymous capture-erasure mailbox proofs for new manual, imported and captured contacts. Preserve established contactability and the explicit recorded clear action. Store no second erased-address list.
4. Extend current capture, erasure and import journeys without increasing the 200-test inventory. Assert at 1440; show changed screens at 1440 and 390.
5. Run touched tests and typecheck, synchronize main without rewriting published history, regenerate/check the source lock last, inspect identities/trailers and push only the named cloud branch through the guard.
6. Observe exact-SHA Verify within the GitHub budget. Publish actual non-secret reports and receipts separately on evidence/main-orbit-contact-consent-1. The fleet owns acceptance judgments, publication scan and landing.

## Scope and defaults
DEFAULT CAPTURE-005: Every contact created from an unlinked event starts Do not contact; no new inline consent override is offered. The existing explicit operator clear remains the way to permit contact.
DEFAULT RECORD-012: Every new record using a previously erased primary or merged alias address starts Do not contact, even if an import claims permission. Existing contactable records are unchanged.
No CONTRACT.md status, gap or evidence edits; no DONE claim. Generated acceptance views are not committed.

## Baseline
Source inspection: unlinked-review.tsx posted a manual contact without a permission value; erasure generated capture.erased_mailbox HMAC proofs but creation only checked contact.suppressed proofs. Existing proposal acceptance already created Do not contact.
Inventory before: 198 registrations + 2 qualifications = 200.

## Baseline browser result
Both findings reproduced on b3e94efdc16e4ae467cd2ed283ee4eb0dc4c0c31 at 1440 using native upload/review/create/delete controls: captured contact = contactable; erased contactable address recreated manually = contactable. baseline.json records actual new record IDs and the observed states. Baseline images are synthetic data.

## Implementation
- The unlinked-event create action reads the verified event on the server, forces Do not contact, and commits contact creation, event association and an operator-attributed contactability timeline entry atomically. A repeated action is refused; caller-supplied contactability cannot grant permission.
- Manual creation and import application query the existing anonymous capture.erased_mailbox proofs, using the same HMAC contexts as replay prevention. Primary and merged alias addresses are covered. No migration or duplicate erased-address registry is added.
- Import review distinguishes new identities from current contacts. A current contact explicitly cleared by an operator remains contactable when imported again; unsubscribe suppression still takes precedence.
- Contact details explain a captured-evidence or erased-address starting state in ordinary text. The erasure explanation contains no prior name, record ID or history. The existing reviewed clear records its own timeline entry and does not revive cancelled work.
- README explains these defaults and the existing permission action. CONTRACT.md and generated views remain unchanged.

## Local gates so far
- Typecheck passed (exit 0).
- Core source boundary check passed for 828 files.
- Source lock regenerated and its authoring check passed. New source/test helper files are included in the tracked graph.
- Inventory remains 198 registrations + 2 qualifications = 200 (before 200, after 200); no test added or removed.
- Baseline public browser proof reproduced both defects. Candidate core and browser results will be recorded after completion.

## Publication custody
Save heads b98e06f and 6670549 were pushed with [skip ci] using fleet identities and the cloud push guard. The first save contains new helpers; the second contains their product wiring and generated lock. These are preservation saves, not READY candidates. Both the initial candidate and the corrected final head have no skip marker. No default-branch push or PR merge is authorized here. The Mac fleet owns the complete publication scan and landing.

## Browser proof and initial runner results
The two requested 1440 browser checks passed: unknown sender captured via the file upload, NOW/Review and Create a contact from this is Do not contact with its initial choice on the timeline; a freshly contactable contact is erased through its native delete control and the same address recreated by hand starts Do not contact, discloses no previous name, and only becomes contactable after the explicit reviewed clear (with timeline receipt). Screenshots of the create/review and blocked-contact states at 1440 and 390 are under candidate/. Both widths were visually inspected.

The first full touched-browser invocation completed with 4 passed, 1 failed. The sole failure was the unchanged provider-status journey's offline fixture setup socket timing out at 60 seconds, before its assertions. The extended capture journey and all three record journeys passed. The initial core invocation passed capture-intake (including its pre-existing 500-item capture limit) but three launch-suppression cases timed out in isolatedDatabase's migration startup, before assertions. Parallel local preparation was reduced; only failed checks are retried. The failing fixture/migration timers and their assertions were not changed. The existing record-browser case has a larger overall timeout to accommodate the added erasure journey.

New-deal creation has a separate direct contact INSERT. Its new-contact predicate now also reuses the erasure fence, with an additional assertion inside the existing erasure-creation helper. This completes the manual creation doors without changing how existing selected contacts behave.

Erasure creation retry: the existing RECORD-012/DATA-002 creation journey passed after the new-deal safeguard, including manual primary/alias recreation, explicit clear, CSV recreation despite subscribed permission and preservation of an existing cleared record on subsequent import. The existing concurrent-stop and Mailchimp cases continue in the same file. Fresh origin/main is still b3e94efdc16e4ae467cd2ed283ee4eb0dc4c0c31; merge reports already up to date, preserving all published history.

## Completed local verification and candidate
All touched cases now have passing results: capture-intake passed (1 case), launch-suppression passed on retry (3 cases), the initial touched browser run passed the extended capture case and all three record cases (4 cases), and its sole failed provider-fixture case passed in its isolated retry (1 case). Total distinct touched cases: 9, all passing, none skipped. Final typecheck passed under Node 22.20.0; boundary and source-authoring checks passed. Initial runner failures and complete non-secret logs are retained, rather than described as successful invocations. No full local verify was run; branch Verify is the full wall.

Initial candidate: bdef459c5b3ed8491de96b8ba36924bbfc544d05, branch cloud/main-orbit-contact-consent-1, pushed successfully through the guard. Three candidate commits have fleet authors and committers, no coauthor trailers, no credentials detected in the new diff, and no proof/report/image files in the product diff. The final commit has no skip marker. No PR was required by this repository's AGENTS.md and none was created. Main was fetched and merged after the preservation saves; its source was unchanged at b3e94efdc16e4ae467cd2ed283ee4eb0dc4c0c31. The Mac fleet owns the complete publication scan and landing.

## Claims and gaps
CLAIM CAPTURE-005 PARTIAL points=none tests=tests/e2e/capture.spec.mjs#CAPTURE-001 CAPTURE-004 an operator adds a mailbox and calendar files, reviews the proposals and opens the account at 1440 and 390
GAP CAPTURE-005: The blocked-creation part of acceptance 1 is proven; this round does not claim the complete intake authority matrix.
CLAIM RECORD-012 PARTIAL points=2 tests=tests/e2e/records.spec.mjs#record creation, edits, manual entries and workspace operator management persist through the interface
GAP RECORD-012: Acceptance 1's complete sending matrix is not newly claimed by this focused creation round; its existing assertions remain intact.

Contract status changes: none. RECORD-012 remains as main published it; CAPTURE-005 remains partial. No DONE judgment is made. Before/after inventory: 200/200. Before/after reproduced failures in the two requested creation flows: 2/0. Existing contacts keep their permission; new records at erased primary or alias addresses are held until an explicit current-state clear.

## Exact-SHA CI and evidence return
Verify run 43152352749 was discovered for bdef459c5b3ed8491de96b8ba36924bbfc544d05 in progress. One watcher uses REST no more often than every 301 seconds, with at most seven observation calls reserved inside the ten-call budget. ci.json records each latest actual state. The evidence packet contains only explicitly selected regular files, synthetic screenshots, actual non-secret test receipts and this report; it passed a check against the injected secret values and credential patterns. No trace archive, session file, environment dump or held material is selected.

Initial evidence preservation succeeded: refs/heads/evidence/main-orbit-contact-consent-1 at a843839403cb2aac430724eb9b781f61e68e3341 contains the 26-file packet with the then-current in-progress CI receipt. The final evidence publication will advance this report-only branch with the completed CI observation. Product head and index were unchanged.

## First candidate CI failure and correction
Exact-SHA Verify 43152352749 completed failure on bdef459c5b3ed8491de96b8ba36924bbfc544d05. Source/shared build and eighteen product shards succeeded. Batch-3 job 130965149033 failed the generic CSV journey with HTTP 409, `Import stopped: A valid commercial contact email is required`. Batch-13 job 130965149110 failed the import wizard while waiting for its dry-run review. The aggregate then correctly failed. The completed-job metadata and exact assertion excerpts are retained separately.

Cause: my new lookup of current contacts applied contactEmailKey to every raw CSV address before the existing per-row email validation, so an intentionally malformed row aborted the entire plan. The lookup now includes only syntactically valid, normalized addresses; malformed rows continue to appear as rejected rows while valid rows can be reviewed. The existing erased-contact import helper now mixes an invalid address with previously erased and current contactable addresses, asserting one rejected row and preserving the permission safeguards. No test was deleted or weakened.

The batch-3 archive command `gh run view 43152352749 --repo just-every/run-orbit --job 130965149033 --log-failed` initially returned `failed to get run log: zip: not a valid zip file` (no HTTP status supplied). The concurrently downloaded archive for batch-13 was complete; batch-3's log was recovered locally from that same cached archive. Neither failed-job archive command was invoked twice and no blocked blob download was retried. CI observations (6), one jobs query and two failed-job archive invocations use 9 of the 10-call budget. The last call is reserved for the corrected head's Verify discovery.

## Corrected candidate and final local results
Corrected candidate: 62d11cf2ceeff451bf8794123d521d204554981c, cloud/main-orbit-contact-consent-1, successfully pushed. It adds one real correction commit without a skip marker; no published history was rewritten. Fresh main remains b3e94efdc16e4ae467cd2ed283ee4eb0dc4c0c31 and merge was already up to date. All four candidate commit identities/trailers passed the publication identity check, and the checkout is clean.

The direct existing genericCsvFlow passed, including reviewable malformed-row rejection, valid-row apply, replay and undo. The existing consent-creation test passed again with a malformed row mixed with erased and current contactable addresses (1 case, no skips). The full native import-wizard case that failed in CI passed on this clean corrected commit (1 case). Corrected typecheck passed under Node 22.20.0, the source lock was regenerated last and its check passed, and the inventory remains 198 registrations + 2 qualifications = 200. The original nine touched cases have passing results; the import wizard adds one further passing existing case, and the existing generic CSV helper passed as a direct diagnostic.

Local limitation retained honestly: the broader vendor/spreadsheet core case passed both 129-row vendor flows and the formerly failing generic CSV assertions, then failed later in importOwnerFlow with `Import stopped: fetch failed` from the local D1 proxy. Its full result is import-core-full-retry.log. That full test remains unchanged in Verify. Its first local attempt had timed out in migration startup; the warm-cache retry reached these later assertions. No timeout or assertion was weakened to obtain a passing result. The corrected head still needs the full exact-SHA workflow result.

Publication/acceptance custody remains separate: this report makes no READY or DONE claim while the corrected Verify is pending. The first run's red result is not treated as green for the corrected head. The final budgeted REST discovery will be recorded in ci.json; the fleet owns subsequent full-workflow observation, the complete publication scan and landing.

## Terminal product custody
PUSHED branch=cloud/main-orbit-contact-consent-1 head=62d11cf2ceeff451bf8794123d521d204554981c
Corrected exact-SHA Verify: https://github.com/just-every/run-orbit/actions/runs/43158603561 (in_progress at 2026-11-12T05:08:56.291420+00:00). All ten CI/diagnostic calls have been used: six observations of the first run, one completed-jobs query, two failed-job archive invocations and one discovery for this corrected head. No further GitHub API polling is performed. The earlier failed run 43152352749 applies to bdef459c5b3ed8491de96b8ba36924bbfc544d05; its CSV identity-precheck regression was corrected in the final commit. Neither a different SHA nor pending CI is described as green.

The two requested native creation browser checks were rerun on the clean corrected commit and both passed, with no skipped cases. Their fresh 1440/390 screenshots replace the prior candidate images; final-creation-browser.json records the actual run. The native import wizard passed on this same commit. The direct generic CSV diagnostic and the consent-creation core case passed after the fix. The broader core import test's later local D1 transport failure is retained as a verification limitation, and its full case remains in Verify. The completed initial source/build and eighteen shards, local focused results and pending corrected workflow are distinct receipts.

Before/after requested creation-flow failures: 2/0. Test budget: 200/200. Contract status changes: none. Claims remain PARTIAL: RECORD-012 point 2; only the creation slice of CAPTURE-005 acceptance 1 is asserted, so its complete point remains unclaimed. No product change remains identified for this brief; the remaining release gate is successful full Verify on the corrected SHA, followed by the fleet's publication scan and landing. No PR was created. Product work, reports and receipts are preserved in their separate published refs. Clone cleanup follows the completed final evidence transfer.
