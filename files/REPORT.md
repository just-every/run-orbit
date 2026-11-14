# Orbit contact permission carry

Repository: just-every/run-orbit
Branch: cloud/main-orbit-contact-permission-1-c1
Initial/main base: de7eb11ff23eb8db6529f6424639a094fc66460c
Carried range: a35d331920a4bace2548bbd0efaf9344ffcd32a6..1bf610b4bd3937e66c745b6a127babd44a373317

## Plan and scope

The complete execution plan is PLAN.md. This round carries the prior gate-passed meeting-plan/restore permission change onto current main as one product commit and fixes the archive journey's asynchronous clear assertion. No other stranger findings or gate copy follow-ups are included. No contract source/status/gap/evidence cells or generated contract views are edited. No tests are added or dropped.

## Diagnosis and reproduction

The complete unmodified carried archive journey passed once locally in 3.2 minutes. It persisted a reviewed clear and restored all three expected contact states. To make the reported intermittent failure observable, only this browser's clear-do-not-contact request was delayed 750 ms before continuing to the real Worker. The existing immediate API assertion then failed exactly as reported: expected contactable, received do_not_contact, although the select already showed contactable. See reproduction-receipt.json and reproduction-delayed-clear.log. Temporary instrumentation was removed before the candidate.

PermissionField uses useAutosave, whose displayed value comes from pending/queued writes. The old test's toHaveValue therefore did not establish persistence. The fix registers waits before each confirming click, verifies a 200 response to the Stop mail PATCH and the Clear do-not-contact POST, then retains the original API, archive, timeline and restored-state assertions. The clear/restore product behavior does not need an additional change beyond the carried patch.

## Carried product behavior

- Brief > Plan this meeting > Create contact explicitly creates a contact on Do not contact; the contact has no Email action while held.
- Settings > Data discloses that archived email permission is kept, with a reasoned protective hold only for an independently retained destination stop.
- A protective restore hold writes both timeline and audit attribution in its durable restore step. Matching source/destination mailboxes use the surviving archive operator identity, preserving historical names even when IDs differ.
- Existing scheduled-mail cancellation, source reconnection, archive format, Capture proposal door, current main tests/migrations and contract judgments are preserved.

## Counts and claims

Before/after: 198 registered test cases + 2 qualification flows = 200/200. The native archive journey remains one registration. Contract source counts remain 42 done, 130 partial and 32 missing; there are no clause status changes. CAPTURE-005 stays partial and DATA-001 stays done under main's newer judgment. The PARTIAL claim lines below describe only this builder round's proved points; they do not demote that judgment.

CLAIM CAPTURE-005 PARTIAL points=none tests=tests/archive/browser.spec.mjs#native archive preparation, streamed download, confirmed restore and renewed session preserve workspace records
CLAIM DATA-001 PARTIAL points=3 tests=tests/archive/browser.spec.mjs#native archive preparation, streamed download, confirmed restore and renewed session preserve workspace records
DEFAULT DATA-001: Preserve archived current email permission; an independent retained destination stop takes precedence with a disclosed and attributed reason.
GAP CAPTURE-005: This round proves the meeting-plan creation behavior, not every native/collaborator/source/delegation intake authority combination in acceptance point 1.
GAP DATA-001: This round does not independently re-prove acceptance points 1 and 2. Main's current done judgment and its existing evidence are untouched.

## Historical CI log availability

The required single gh run view 43604737145 --repo just-every/run-orbit --log-failed exited 0, but returned only aggregate Verify failure. One jobs REST read identified failed batch-13 job 132477737270. Its single permitted gh run view --job 132477737270 --log-failed exited 0 with an empty body. No blocked blob redirects or repeated downloads were used. The brief supplies the original failure location and observed API state, independently reproduced here.

## Publication and custody

Product branch custody and evidence publication are separate. Product code and its source lock are committed only to the named cloud branch. Reports, selected receipts and synthetic browser screenshots are published only to evidence/main-orbit-contact-permission-1-c1. No archive data, session material, trace, credentials, environment dump or private gate material is selected. The cloud cannot run the Mac publication scan; the fleet's guarded lander retains that responsibility. No main push, deployment, PR bypass or lane-file write is performed.

## Local candidate validation

Candidate head: f81354dbd80552d9841f7e48fdb8f7a6541b8ade. Eight product/test/lock files changed (125 insertions, 12 deletions), in one fleet-authored commit. Candidate working tree is clean. A final fetch found main unchanged at de7eb11f; the requested rebase was a no-op. No published history was rewritten. Identity/trailer inspection covered the one complete candidate commit and found the fleet author/committer and no co-author trailers. The first guarded product push succeeded.

The complete archive journey passed in 3.1 minutes after the fix, using pinned Node 22.20.0 and /usr/bin/chromium with --no-sandbox. It asserted at 1440, then captured each changed screen once at 1440 and 390. All ten screenshots were opened and inspected: the meeting plan shows the new attendee held; restored contact details show the captured contact held and the cleared contact contactable with its original attributed clear history; the retained-stop contact has an attributed restore reason; Settings shows the email-permission disclosure before Start restore. There is no horizontal overflow on the asserted restored screens.

Typecheck passed. Contract generation check says the documents are current. The documented source lock command ran last after all code/test edits; the exact CI source check returned ok=true across 2,857 inputs. Source check detail is source-check-receipt.json. Test counts before/after, source status counts, browser hashes and touched command outcomes are recorded in local-checks-receipt.json. No local full verify was run.

Exact-SHA Verify: https://github.com/just-every/run-orbit/actions/runs/43613706021. The first REST discovery observed in_progress for f81354dbd80552d9841f7e48fdb8f7a6541b8ade. One watcher records every subsequent observation in ci-receipt.json at intervals of at least 300 seconds, within the ten-call GitHub budget.

## Terminal product result

Exact-SHA Verify remained in progress at the last permitted poll. The ten-call GitHub budget is exhausted; no green or READY claim is made.

Product custody: PUSHED. Branch: cloud/main-orbit-contact-permission-1-c1. Full head: f81354dbd80552d9841f7e48fdb8f7a6541b8ade. PR: none (the repository rules do not require one for this fleet branch). CI run: 43613706021, status in_progress, conclusion None. GitHub calls used: 10/10. Last exact-SHA observation: 2026-11-14T16:35:53.825535+00:00.

No implementation blocker remains. The native archive journey, typecheck, contract check and source check passed; the count remains 200/200 and all clause judgments stay unchanged. The report-only evidence transfer does not change product custody, acceptance or landing. The fleet owns its publication scan, independent gates and landing.
