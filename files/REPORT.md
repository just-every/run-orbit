# Orbit own-notifications repair — main-orbit-own-notifications-1-c1

Repository: just-every/run-orbit
Product branch: cloud/main-orbit-own-notifications-1-c1
Starting product SHA: 285123446209ab1c0eb5496c6a593dd2b54bc66c
Original failed Verify: 43001814461

## Plan

1. Read all six failed shard jobs once and reproduce the failing paths locally on the requested starting SHA.
2. Preserve direct-person silence across the common notification insertion gate. Keep other-person, provider, agent and saved-workflow notices and existing stored rows intact.
3. Repair notification marker interference with native delegation epoch fences using a new additive migration; preserve all existing migration bytes and all revision assertions.
4. Teach archive generation reconstruction about the notification trigger so old archive schema identities remain exact.
5. Replace obsolete own-send/own-create notification expectations in contact-mail and operator desktop/phone journeys with public-door colleague and saved-automation notification evidence.
6. Extend existing registrations only; retain the 200-test cap. Run the failing and changed tests, notification and agent proofs, typecheck, source-lock validation and browser proof at 1440/390.
7. Merge updated main without rewriting the published line; keep its newer contract/test text. Regenerate the source lock last, audit every candidate commit's identity/trailers, and publish through the fleet push guard.
8. Discover and poll only the exact candidate SHA's Verify through REST within the ten-call GitHub budget. Publish this complete non-secret packet separately on the evidence ref; leave landing/publication scan to the fleet.

## Findings so far

- batch-4, job 130461172119: contact-mail browser journey expects the direct sender's accepted-message self-notification. Obsolete behaviour expectation.
- batch-7, job 130461172226: current notification_skip_direct_actor trigger leaks into the reconstructed 0049 catalog. Product archive compatibility regression.
- batch-13, job 130461172401, and batch-15, job 130461172312: operator desktop/phone journeys expect a notification for their own created opportunity. Obsolete behaviour expectations.
- batch-16, job 130461172233: risk task and meeting next-action writes return revision conflicts. Product regression: inserting the ephemeral notification marker advances the delegation epoch before the already-reviewed guard executes.
- batch-18, job 130461172232: the next-action focus assertion fails because that same write returns 409. Product regression, assertion retained.

All six log-archive commands were invoked once. gh 2.46 printed empty log-failed output because the archive uses whole-job log files, but downloaded the run archive into its cache. Relevant original test output was recovered locally from that cache, without additional GitHub requests.

No unrelated original failure was identified. No clause Status, Gap or Evidence cells will change. NOTIFY-001 and NOTIFY-002 remain PARTIAL; no DONE claim.

## Implementation

- Added `0080_notification_context_fence.sql`; every earlier migration, including 0079, is unchanged. The new migration only replaces the three runtime-control epoch triggers. Inserting/deleting the transaction-scoped `direct_notification_actor` does not change the delegation epoch. Real runtime controls still advance it; renames to/from a real control remain fenced. No notification row or other stored product row is rewritten.
- Added a supported pre-direct-notification archive generation and carried it through older generation reconstruction. Manifest selection uses the exact schema hash when two supported generations have identical tables/columns. The existing 0049 exact catalog assertion remains unchanged; the released upgrade journey additionally checks current and pre-0079 archives with the same inventory but different trigger hashes.
- Contact-mail fixture: asserts immediate own acceptance leaves the inbox unchanged; another authenticated operator assigns the contact to its recipient, preserving the browser's contact-title/link/opening assertions; the recipient's saved automation still creates one unread notice and reprocessing creates none.
- Operator desktop/phone fixture: asserts its own create has no notice; a separate native seller assigns the owner a task on the opportunity; a saved automation reacts to a note and notifies its own operator. Existing notification navigation/read assertions stay in place.
- Shared automation proof checks exactly one new unread row, badge/feed agreement and idempotent processing. Existing agent-door proof still exercises an authenticated agent acting for the person, saved-workflow processing, unchanged earlier notices and replay.
- Merged main at `cb9e02a` without rebasing the published line. Combined main's `agentErasureSecret` wiring and `--guide-owner` session support with notification database wrapping and `--notification-colleague`. Main's newer contract text and tests were preserved; neither generated view was committed by this round.

## Reproduction and intermediate corrections

Every original failure reproduced locally before its expectation or product path was changed: Today core (2 failures), Today browser (next-action focus), forward-upgrade (0049 catalog), contact-mail browser (missing Morgan Chen notice), operator desktop and phone (missing opportunity notice).

An early archive repair missed the separate pre-agent-door reconstruction branch; the unchanged exact 0049 assertion caught it. That branch now also reconstructs from the pre-notification catalog. An early operator fixture supplied `dueAt:null`, which the task API correctly rejected; it now supplies a real future ISO timestamp. One local contact-mail rerun timed out in its disposable D1 migration setup before product assertions; it is being rerun with the pinned Node and fewer simultaneous checks. No assertion or timeout was weakened.

The first published save is `2ccd809` (full identity in product custody receipt), containing main's merge and this round's work. It carries `[skip ci]`; it is preservation, not a READY claim. The final candidate will be a real commit without a skip marker.

DEFAULT NOTIFY-001: Only native authenticated person mutations suppress that same person's notification; provider callbacks, authenticated agents and saved automation retain notification delivery.
GAP NOTIFY-001: The clause remains PARTIAL; this repair does not claim every contract obligation DONE.
GAP NOTIFY-002: The clause remains PARTIAL; this repair does not claim every contract obligation DONE.

CLAIM NOTIFY-001 PARTIAL points=1 tests=tests/core/assistance.test.ts#NOTIFY-001 assigned owners override latest actors; unassigned NOW, replies and failures follow the latest actor once
CLAIM NOTIFY-002 PARTIAL points=1 tests=tests/core/assistance.test.ts#NOTIFY-001 NOTIFY-002 queue transitions notify once and recipient read state survives a fresh sign-in; tests/e2e/zz-notifications.spec.mjs#NOTIFY-002 direct actions stay silent while another person updates the badge within five seconds and opening persists one read

The complete forward-upgrade journey now passes, including the original exact 0049 assertion, unchanged historical rows/custom DDL/identity, current archive validation and the new trigger-only historical generation validation.

Two additional fixture interactions were caught by the broader touched checks: the desktop workflow journey previously selected the first arbitrary workflow card, which is no longer the correct run once the notification automation exists. It now selects the `Prepare account review` run inside Execution history, asserts that run completed, opens its evidence and undoes that same run. All original outcome assertions remain. The extended agent journey also reused the original roster's five-minute issue/expiry times when signing a later collaborator update. It now timestamps that newly signed update at issuance; the product's expiry validation and negative expiry cases are unchanged. Assistance passed all six cases, and all three authority-regression cases passed; the intermediate aggregate's single failure was that expired positive roster fixture, which is rerun separately after the correction.

## Final local results and product custody

The final product branch is `cloud/main-orbit-own-notifications-1-c1` at `78cb6f33609b7afa72e5941f95c7247dd1082df1`, independently matched to the remote branch by `git ls-remote`. The tree was clean after publication. The final subject has no skip marker. All six candidate commits, including side parents, passed the fleet identity and trailer audit.

A final main refresh brought in `49cc3869cd1de88a8b07c37356cc564cf798719a` (queue cause labels and reduced repeated activity labels); it was merged without rebasing. Its tests and UI text were retained. Contract views were restored from main, the source lock regenerated last, and typecheck/contract/source/deployment checks passed.

Local passing flows: Today core 4; Today browser 1; full forward upgrade 1; assistance 6; delegation authority 3; authenticated agent/managed-owner 1; complete contact-mail/form/ownership/forecast/archive browser journey 1; desktop 1; phone 1. A fresh notification browser journey is also run after the final candidate build. The exact command outputs, counts and hashes are in `CHECKS.json` and the explicitly published logs. The 200-test inventory is unchanged: **200 before, 200 after; no registration added, deleted or skipped in source**. Selective local command arguments limit execution to this brief's flows; full branch Verify remains the independent wall.

The original no-self-notification result remains: this task starts with direct-own-create unread delta **0** and finishes with **0**. The earlier round changed the old product's +1 to 0; this repair preserves that. The authenticated integration receipt records direct-create 0, colleague +1, authenticated agent +1, saved automation +1, replay 0, and unchanged pre-existing notice rows. Stored product rows are not rewritten by this migration.

Both NOTIFY clauses remain PARTIAL with point 1 carried; no Status, Gap or Evidence cell was edited and no DONE claim is made. No PR was required by the repository's branch-landing contract. No deploy, main push, force push, original-branch write or inbox write was performed. The fleet owns the publication scan, landing and subsequent main checks.

Browser proof: `notifications-1440.png`, `notifications-390.png`, `record-mail-notification-1440.png`, `record-mail-notification-390.png`. They show the real emitted app over synthetic records, with other-person/automatic notices retained and the visible unread count matching the feed. No screenshot or report file is committed on the product branch.

## Exact-SHA Verify

Verify `43043047002` (https://github.com/just-every/run-orbit/actions/runs/43043047002) is running on the exact final SHA. Its first REST observation at 18 minutes was `in_progress`, conclusion null. No green/READY claim is made while it is pending. Seven GitHub-budget invocations read the original jobs/log archives. Candidate discovery and polling use the remaining three calls, one watcher, with at least 300 seconds between observations. A report-only evidence ref never signals product READY or landing.

## Tests whose old self-notification expectations were replaced

Their registration names are unchanged; the supporting public-door fixtures now assert direct silence, another person's notice and a saved automation's notice:

- `newtests/t096/browser-journeys.test.ts#OUT-032 established opt-out upgrade, CAPTURE-010 workspace rules, OUT-017 OUT-023 record mail, FORM-001 mapped, picklist, hidden and framed capture, RECORD-016 reviewed ownership and FORECAST-001 USD weighted value, override, quotas and recurring schedules preserve prior snapshots`
- `tests/rer/operator-desktop.test.mjs#BASE-PUBLIC-003 T099 native operator routes and expanded data views at 1440px`
- `tests/rer/operator-phone.test.mjs#BASE-PUBLIC-003 T099 native operator routes and expanded data views at 390px`

The risk-task, meeting-action and exact historical-schema assertions were retained. Their failures were repaired in product code/new migration, not removed or relaxed in the tests.
