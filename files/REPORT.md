# Captured meeting attendee result

The reported attendee loss does not reproduce on current main. No product code, tests, contract or documentation were changed. The brief explicitly directs the builder to leave a finding that no longer reproduces. The named cloud branch was published at the unchanged refreshed main commit to preserve exact product custody; it contains zero new product commits and has no difference from that fetched main.

Repository: just-every/run-orbit
Branch: cloud/main-orbit-meeting-attendees-1
Initial main: 0e9e55cf150dfcc781d1d9e62b2d88c15c9b6a63
Refreshed and published head: 008e46c5a9f2c87e990e4b2881ab16a962640f11
PR: none; branch equals fetched main and has no product diff.

## Plan and actual results

1. Refreshed the fleet launcher, installed the supplied credential helper, push guard and commit hygiene hook, and read the launcher and Orbit instructions. Used the Cloud Environment runtime skill for the managed environment, networking and browser setup. Cloned only the declared product repository and configured fleet identity.
2. Reproduced the stranger's route on initial main through a real `rer setup` / `rer dev` installation: created contacts, uploaded an iCalendar file through Capture, accepted its proposed link, opened Brief, then Plan this meeting. Both Maya Chen and Aisha Patel appeared. A known organizer also appeared and an unknown third attendee was explicitly unresolved. Named and nameless ATTENDEE variants both worked. The original symptom was absent before any edits.
3. Traced the current source without changing it. `src/core/features/capture/ics.ts` reads every ATTENDEE property and the ORGANIZER property. `facts.ts` retains each participant, `intake.ts` saves all their email addresses in signal data, and `today/meeting-plan.ts` resolves those exact keys and lists unmatched addresses. The observed result agrees with those paths; no speculative parser or UI patch was made.
4. Fetched main and rebased the unpublished local branch. Main advanced to 008e46c5a9f2c87e990e4b2881ab16a962640f11 with saved-record-view work outside this brief. Kept it whole, reran setup and the real browser flow on that head, and again observed every named participant.
5. Ran the existing public-HTTP BRIEF-004 test and typecheck on the final head, then counted the suite and regenerated/checked the source lock last. The source lock remained byte-identical. The product worktree remained clean. No test was added, deleted, skipped or weakened.
6. Reviewed the empty `origin/main..HEAD` candidate range, including all reachable side parents. Pushed only the named cloud branch using the supplied guard. The first transport attempt succeeded. No new author, committer or trailer was introduced; no new commit or history rewrite was needed. No default branch was pushed.
7. Kept all proof and reports outside the product checkout, captured the meeting plan at 1440 and 390, closed the browser, and stopped only this run's supervised server by its PID. Published the complete selected packet solely through the separate evidence ref.

## Observable counts

| Scenario | Known attendees | Known organizer | Unresolved attendee | Unresolved organizer | Outcome |
| --- | ---: | ---: | ---: | ---: | --- |
| Initial main, CN parameters | 2/2 | 1/1 | 1/1 | 0 | All retained |
| Initial main, no CN parameters | 2/2 | 1/1 | 1/1 | 0 | All retained |
| Final head, CN parameters | 2/2 | 1/1 | 1/1 | 0 | All retained |
| Final head, no CN parameters | 2/2 | 1/1 | 1/1 | 0 | All retained |
| Final head, mixed CN and unknown organizer | 2/2 | 0 | 1/1 | 1/1 | All retained |

Each known participant on the final head showed the correct company and their open opportunity. The three known participants had three open opportunities totaling USD 3,750. The no-CN scenario's unresolved address was created using the plan's Create contact control; read-back confirmed that exact address moved into resolved attendees and the unresolved list became empty. No page errors occurred.

Reported historical behavior: one of two known attendees appeared. Observed initial and final behavior: two of two known attendees appeared, plus the organizer and explicit unresolved entries. This run claims no before/after product improvement.

Test inventory before: 198 registered cases + 2 qualifications = 200. After: 198 + 2 = 200. Product files changed: 0. New product commits: 0. Clause status changes: 0.

## Checks and evidence

- `pnpm exec tsx --test --test-name-pattern=BRIEF-004 tests/core/today-brief.test.ts`: passed, 1 test, 0 failures. The actual command and complete output are in `checks-receipt.json` and `meeting-plan-test.log`.
- `pnpm run typecheck`: passed. Complete output is in `typecheck.log`.
- `node scripts/verification-inventory.mjs`: 200 total, unchanged. Both actual inventories are selected.
- Source lock regeneration: passed with zero worktree changes. Source check: `ok: true`; complete actual output is in `source-check.json`.
- Browser assertions ran at 1440. `browser-receipt.json` contains the final exact head, public-door read-backs for three calendar variants, exact-address creation and zero page errors. `browser-proof.mjs` and its complete successful output retain the executable probe and result. The probe needs the local checkout's private dev link at runtime; no private URL, cookie, token, credential file or environment value is included in this packet.
- `meeting-plan-1440.png` and `meeting-plan-390.png` show the unchanged final meeting plan. Initial observations are separately named `initial-*` and bound to the initial head in their receipt. Synthetic ICS inputs are selected explicitly.
- `product-push.log` is the actual sanitized product custody receipt. Publication scanning remains the fleet Mac's landing duty.

The CLI brought its pinned Node 22.20.0 for setup/dev. The supplied task shell selected Node 24.19.0 with pnpm 10.12.4 for the focused test and typecheck; both passed. No dependency or toolchain source was changed.

## Contract and disposition

BRIEF-004 remains unchanged. No Status, Gap, Evidence or generated summary/view was edited. No DONE claim is made. The existing BRIEF-004 test proves the named acceptance point's notes, next-action and no-outreach behavior, while the supplemental real-browser probe verifies this brief's attendee variants on the unchanged published head. Historical behavior on 2045bd23 was not rerun; the brief calls for reproduction on current main. The original stranger calendar bytes were not supplied; the retained synthetic ICS files contain the exact ATTENDEE parameter forms described in the brief. No historical root cause is inferred.

CLAIM BRIEF-004 PARTIAL points=1 tests=tests/core/today-brief.test.ts#BRIEF-004 RECORD-010 RECORD-017 RECORD-023 OUT-001 a booked meeting gets a cited plan with unresolved attendees shown, notes saved as one editable note, and plan lines become next actions without sending anything; a mention notifies once, asks to share the deal with its notes, calls and meetings before notifying a collaborator, who then reads only their own mention and opens the entry on Shared records until the grant is revoked; it withdraws on delete and never reaches AI or a customer

No product blocker remains. Because the reported failure is absent, there is no fix to land. The published cloud branch only identifies the tested current-main product tree. Evidence publication carries no independent acceptance or landing signal.

CI details and the evidence transfer head are recorded in the final message and selected CI receipt files.

## Exact-SHA CI watcher

Candidate Verify: 43363594947 (https://github.com/just-every/run-orbit/actions/runs/43363594947). First permitted status poll: in_progress. The final observed result is retained in `candidate-ci-final.json`. No result from another SHA is used. One watcher owns the run, with at least 300 seconds between discovery and each status read.

At GitHub call 9, the candidate source/shared build and 19 of 20 shard jobs had completed successfully. The remaining job was `shards (batch-3)`, job id 131683805996, in the `Verify routine product shard` step. The complete actual job/step snapshot is retained in `candidate-ci-jobs.json`. No logs of an unfinished job were read and no workflow was rerun.

## Terminal disposition

PUSHED custody, with no product changes or new product commits. The named branch points to 008e46c5a9f2c87e990e4b2881ab16a962640f11. At 2026-11-13T04:50:55Z, exact-SHA candidate Verify run 43363594947 remained `in_progress` with no conclusion. The ten-call GitHub API budget is exhausted after roughly forty minutes since the candidate push, so the cloud returns PUSHED rather than claiming a green verdict. The last job snapshot (call 9) identified job 131683805996, `shards (batch-3)`, on `Verify routine product shard`; source/shared build and the other nineteen shard jobs had passed. No unfinished job logs were read. No rerun was issued. A prior Verify success on this same SHA is retained in the discovery receipt for provenance but is not substituted for this candidate run.

The fleet can continue watching that exact run. No product bug fix or contract status update is proposed. The browser and dev server were closed by this run, and the successfully published clone is removed after final evidence transfer verification; the complete local report packet remains outside it.
