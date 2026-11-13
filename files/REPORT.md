# Orbit stale draft truth — main-orbit-stale-draft-truth-1

Repository: just-every/run-orbit
Product branch: cloud/main-orbit-stale-draft-truth-1

## Result and scope

The reported stranger-28 item 1 and item 6 both reproduced on current main, initially 0e9e55cf150dfcc781d1d9e62b2d88c15c9b6a63. A handwritten, unscheduled draft with no mail sender, made stale by an imported .eml reply whose link and next-action proposals were accepted, displayed “Customer replied, so the scheduled follow-up was cancelled.” After the contact was set to Do not contact, the selected review option contained “do_not_contact”. The actual failing browser output is retained in reproduction.log; before screenshots show synthetic data only.

Draft invalidation now keeps the actual cause and omits the claim about cancelling a schedule. The same presentation correction applies to previously persisted explanations when the saved draft is read. This avoids leaving existing saved drafts with the false claim. Actual outbound cancellation records retain their full explanation and their state='scheduled' predicates. The stale draft review uses Orbit's existing record-state presentation helper for both the contact-only context sentence and every recipient option, displaying Do not contact and Contactable in plain words.

No stale trigger, permission, approval, revision, confirmation, or dispatch predicate changes. No new migration or external service configuration. No changes to other draft screens, CONTRACT.md status/gap/evidence, generated view files, or release acceptance claims. No PR is required by the repository's checked-in landing guidance; the fleet owns landing after its publication scan.

## Plan and execution

The complete original plan is PLAN.md. The launcher was refreshed, fleet identity/authentication and the commit-message cleanup hook were installed, and the pinned project setup completed with the authorized fleet owner email. All code work stayed in this repository. The browser ran against the emitted real Worker with isolated D1 state and system Chromium at /usr/bin/chromium with --no-sandbox. Synthetic mail was imported through the rendered Capture file upload; link and next-action proposals were accepted through Review. Do not contact was applied through the contact's native confirmation control.

The existing ACTION-005 browser test was extended, retaining its meeting-staleness, explicit acknowledgment, new draft revision, saved-content, and no-approval assertions. It now also creates an unscheduled handwritten draft, imports a reply, accepts both proposal kinds, checks a reply cause without a cancellation/scheduling claim, verifies no outbound message exists, checks disabled stale editing/review before acknowledgment, and verifies a disabled Do not contact option with no raw permission code. Assertions run at 1440; optional proof captures only the affected saved-draft screens at 1440 and 390.

The existing capture-boundaries public HTTP test was extended: accepting the reply link produces a truthful stale reason; the real approval route, with its existing permitted network-edge mail fixture style, returns 409 and creates no outbound message or provider call. It also reads a draft with an old persisted cancellation explanation to prove existing data is corrected on read. The existing scheduled-outreach stop journey was selected to confirm actual scheduled cancellation and its explanations are preserved.

The suite was at its hard cap, so no test registrations were added. Counts are 198 cases + 2 qualifications = 200 before and after. ACTION-005 remains partial; all summary counts are unchanged: 42 done, 130 partial, 32 not done, 204 total. The report does not promote any clause.

Before publication, main advanced to 008e46c (full base SHA in BASELINE.json). The work was preserved outside the product checkout, the branch was rebased onto origin/main, and the patch reapplied without conflicts. Main's newer saved-record-view implementation, migration, tests, contract and source lock were preserved. The touched browser and core journeys, typecheck and boundaries were repeated on the combined tree. The source lock was generated using the documented authoring lock command and its check passed. Contract generation check passed without editing or committing its views.

## Evidence and validation

CHECKS.json records the final product SHA, exact commands and outcomes. CI.json records actual exact-SHA workflow observations. The complete relevant logs and four final screenshots are included in this packet. Initial fixture troubleshooting involved waiting for PUT when native autosave sends PATCH and using an unsuitable generic disabled matcher on an option; the retained final journey waits for PATCH and checks the native option.disabled property. These were probe fixes, not product failures.

The full local suite was not run; the exact-SHA branch Verify is the full wall. The cloud adaptation reserves the full publication scan for the fleet lander. Only added-diff credential-shape inspection was run here. This packet contains no keys, environment dumps, sessions, dev-entry links, private held-out material, or symlinks.

CLAIM ACTION-005 PARTIAL points=1 tests=tests/e2e/stale-review.spec.mjs#an operator sees new evidence and confirms a stale draft without sending; tests/core/capture-boundaries.test.ts#CAPTURE-003 CAPTURE-005 OUT-001 OUT-007 ACTION-005 RECORD-012 SIGNAL-009 a captured reply stops outreach at once while its proposals wait; capture never drafts, sends or makes anyone contactable, and only an operator session may capture
DEFAULT ACTION-005: Draft reasons report the stale cause regardless of whether any message was scheduled; cancellation records alone describe actual schedule cancellation.
GAP ACTION-005: This scoped round proves the imported-reply and contact-permission review slice and retains meeting review; it does not claim complete qualification of every stale trigger or whole-clause DONE.

Terminal custody and exact workflow conclusion are recorded in CHECKS.json and CI.json. Evidence publication is report transport only and is not product READY, acceptance, or landing.

## Terminal handoff

Product head: c390b8b4a8f2cf89534b2cefad4fbc9f46106410
Product custody: PUSHED. The remote branch head was verified identical after the successful first-attempt guarded push. No product changes followed that push.

Verify run: 43363949058 — https://github.com/just-every/run-orbit/actions/runs/43363949058
Last exact-SHA observation: 2026-11-13T04:53:06.339433+00:00, in_progress, conclusion null. Nine GitHub calls were used, each observation at least 300 seconds after the previous call. The next permitted poll would be after the brief's 45-minute wait limit (push at 04:12:08 UTC). No completed failure was observed, so no failed-log download or rerun was appropriate.

The job inventory at 04:43:05 UTC showed source/build and 19 of 20 shard jobs successful. Job 131685237985, shards (batch-3), was then in progress at step 15, Verify routine product shard. The local plan maps that job to core-1: capture-no-console, crm-import-erasure, crm-import, managed-owner and request-scheduling tests. This is a timestamped last job observation, not a claim that its current job state was re-read at 04:53. The overall run was still in progress at that later exact-SHA poll. CI.json retains the complete observations and job inventory.

All scoped local checks passed. Tests: 200 before, 200 after. ACTION-005 remains partial; no clause status, gap, evidence, acceptance text or summary counts changed. There is no PR. The remaining release gate is the pending exact-SHA Verify; the fleet owns subsequent observation, publication scanning and landing. Evidence transfer does not imply readiness or acceptance.
