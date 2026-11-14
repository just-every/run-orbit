# Orbit form notification fix round

Tag: main-orbit-form-notify-once-1-c1-fix1
Repository: just-every/run-orbit
Branch: cloud/main-orbit-form-notify-once-1-c1-fix1
Candidate: 9940c015edce444ed02c8f23fee20aac6a947761
Base: f81354dbd80552d9841f7e48fdb8f7a6541b8ade

The gate A finding is repaired. An unassigned consented enquiry that creates a deal again produces one normal opportunity.now notification for each active full operator. The intake marker is now written only when assignment.ownerId is present, and its value is that operator ID. Migration 0092 suppresses a NOW insert only when NEW.operator_id matches the marker. The marker and capture writes remain one atomic D1 batch. The fixed-owner submission notice, contact/deal links, unread increment and replay behavior remain intact. A different deal owner's NOW notice is no longer suppressed by another recipient's marker; no separate follow-up scope was added.

## Plan and implementation

The full initial plan is in PLAN.md. The original ef7efc1eeee05bd87323e3bcb9d06cb349e00a9b change was cherry-picked cleanly onto current main, then corrected and amended while unpublished into one linear candidate. Original notification presentation and archive compatibility changes were retained. Migration 0092 was still unused on main and was fixed in place. The existing mapped journey was extended, with no new test registration. No routing, consent or deal-creation rules were changed.

Before the fix, the strengthened existing public mapped journey failed with an empty new-notification inventory instead of the two active operator IDs. See before-test.log. That run exercised the consented, reviewed and published unassigned form through anonymous cross-origin HTTP. Afterward the same journey checks exactly one normal NOW notice for each active operator, unread +1 in each authenticated inbox, the created deal's NOW state and ID, cleared runtime marker, unchanged replay and the original fixed-owner, round-robin, inactive-user, consent, DNC and custody assertions.

The emitted Worker browser probe uses a disposable synthetic installation, real publication APIs, anonymous form submission and authenticated inboxes. Assertions run at 1440; screenshots show the submitted forms and recipient inboxes once at both 1440 and 390. Fixed owner: owner unread 0→0, routed rep 0→1, with one row linking contact and deal. Unassigned: owner 0→1 and routed rep 1→2, one notice each. See browser/receipt.json and browser/*.png. The browser probe ran against the exact product source bytes committed in the candidate, before the final commit metadata was written. Its process cleanup finished successfully. PROOF.ts preserves the probe code; it belongs under .rer/ when run from this checkout. No proof file is in the product commit.

## Counts and contract

Unassigned enquiry notices: 0 total before, 2 total after in the two-active-operator fixture; 0→1 per operator. Fixed-owner enquiry: 1→1 for the routed operator, unread +1. Test budget: 198 registered cases plus 2 qualification flows = 200 before and after. No Status, Gap or Evidence cell was edited; FORM-004 remains partial. CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md are absent from the product diff. No DONE claim is made.

DEFAULT FORM-004: Preserve main's active-operator NOW broadcast for an unassigned form queue.
GAP FORM-004: Team selection/queues inherit TEAM-005, lead views inherit RECORD-014, and email/push inherit NOTIFY-003; this round does not complete those dependencies.

## Validation and publication

Typecheck, the app build, deployment-spec generation/check, source lock generation/check, contract-doc check, test inventory and the emitted Worker browser probe have passed. Detailed command receipts and logs are retained in the packet. All four native form cases have passed, including the mapped journey and custody checks, atomic rollback/concurrent replay, abuse/spam release and existing-contact native evaluation. The forward-upgrade case also passed, including the released-v0.3.0 and pre-0092 archive catalog checks. All five cases passed in 952.2 seconds locally; the upgrade case took 486.0 seconds including historical lazy blob fetches. See after-tests.log and commands-receipt.json.

All candidate authors and committers are Run Edit Run fleet <fleet@runeditrun.com>; trailers are absent, and the final commit has no skip-CI marker. Main was fetched and the unpublished candidate rebased before publication; it was already current. The documented lock command was run last after integration and its exact CI check passed. The tree is clean, linear and one commit ahead of main. Only the named product branch is authorized for product publication. Full publication scanning and landing belong to the fleet Mac; no Mac scanner is available here.

Product custody and evidence transfer are separate. This packet is published only to evidence/main-orbit-form-notify-once-1-c1-fix1; it never constitutes landing or acceptance.

The product push succeeded on attempt 1 through cloud-push.py. The full pushed head is 9940c015edce444ed02c8f23fee20aac6a947761; see product-push.log. The candidate has one commit and no merge commits. The GitHub push message suggested a PR URL but no PR was opened or required by the repository rules; the fleet owns landing. Exact-SHA Verify attempt 1 completed/failure on the pushed SHA. A single watcher made seven discovery/status calls at intervals of at least 300 seconds. One jobs read and one failed-job archive read identified the unrelated saved-record-view failure, and call ten successfully requested the permitted failed-jobs rerun. The retry outcome was not observed because the ten-call budget is exhausted.

CLAIM FORM-004 PARTIAL points=1,2 tests=newtests/t096/forms-native.test.ts#FORM-001 mapped cross-origin capture with picklist and declared hidden fields, reviewed proposals and durable owner rotation retain fixed publication, DNC and consent

## Exact-SHA CI result and terminal custody

Verify: https://github.com/just-every/run-orbit/actions/runs/43622494220
Head: 9940c015edce444ed02c8f23fee20aac6a947761
Attempt 1: completed/failure. The jobs receipt records 21 successful jobs, 2 failures and 4 skipped jobs. The substantive failure is job 132532161962, `shards (batch-18)`, step `Verify routine product shard`; the other failure is the dependent aggregate `verify` job.

The failing assertion is in the unchanged `tests/delegation-browser/typed-fields-journey.mjs:46`, invoked by the unchanged records-layout browser case. After reopening a saved record view, the “Search records and timeline” input is empty instead of “Synthetic Calendar Contact”. Neither that journey, its caller nor the records-view implementation is changed by this round. The notification title/link changes do not change the unread polling hook or record search/view state. This is outside the form-notification fix's changed step; no saved-view code or assertion was altered. The single failed-job archive read succeeded. Its complete failure assertion excerpt is retained, with preceding server request noise omitted and URL credentials/queries/fragments removed.

As the brief permits for a failure in an untouched step, `gh run rerun 43622494220 --repo just-every/run-orbit --failed` was requested once and returned exit 0. See ci-rerun-receipt.json. That was API call 10 of 10. No later query was made; the rerun's outcome is unknown. This is a PUSHED candidate, not READY, and no green exact-SHA Verify is claimed. The remaining landing condition is the exact-SHA retry result, then the fleet's publication scan and independent landing gate. No PR was created.

The full implementation/reproduction plan is in PLAN.md, exact commands in commands-receipt.json, product provenance in candidate-receipt.json and product-push.log, browser proof in browser/receipt.json and ten PNGs, and CI observations in github-calls.jsonl, ci-jobs.json, ci-final.json and ci-rerun-receipt.json. Evidence is a report-only transfer and does not signal acceptance or landing.

POST lanes/main/INBOX.md: main-orbit-form-notify-once-1-c1-fix1 repairs FORM-004 unassigned notices from 0 to 1 per active operator, fixed-owner remains 1 per enquiry, tests 200→200; clause Status/Gap/Evidence unchanged; head=9940c015edce444ed02c8f23fee20aac6a947761; Verify=43622494220 attempt 1 failed only in unchanged typed-fields saved-view search assertion (batch-18), failed jobs rerun requested once, outcome unobserved at 10-call budget. CLAIM PARTIAL points=1,2.

PUSHED branch=cloud/main-orbit-form-notify-once-1-c1-fix1 head=9940c015edce444ed02c8f23fee20aac6a947761
