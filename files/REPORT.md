# Orbit restore permission copy — sd-orbit-data001-copy-1

Repository: just-every/run-orbit. Branch: cloud/sd-orbit-data001-copy-1.
Base: 9940c015edce444ed02c8f23fee20aac6a947761.

## Plan and implementation

The complete plan is in PLAN.md. The implementation stays within Settings > Data restore preview/data sources and the restore-hold history text. It adds no migrations and does not edit suppression.ts, clearContactSuppression, the existing alias suppression decisions, generated acceptance/claims views, or CONTRACT.md.

The preview streams the selected archive as before, additionally collecting contact names/permissions, retired addresses, anonymous stop proofs and clear receipts. It asks a new authenticated read-only archive preview endpoint about up to 200 addresses per request. Matching keys from the destination never leave the server. The endpoint creates no archive job or safety proof. The preview honors clear receipts from both the archive and destination, and counts each contact once even when multiple addresses have stops.

The Email permission after restore panel now states the exact count returning as Do not contact, lists up to five names alphabetically and adds “and N more” when necessary. It distinguishes contacts already held in the archive from additional holds, and explains that a stop may be on another address of the contact.

Restore still makes its existing suppression decision. Additional read-only provenance uses the existing recovery snapshot to determine whether active matching proofs were already present in this installation or came from the restored archive. New restore-hold history names this installation, the restored archive, or both, and explains that another address of the same contact may carry the stop. No historical audit entry is rewritten.

## Before and after

| Behavior | Before | After |
| --- | --- | --- |
| Preview of the populated permission fixture | General retained-stop rule, no count or names | 8 contacts, five listed names, “and 3 more”; one archived hold and seven additional holds |
| Archive-only retired-address hold history | Claimed “this installation retains an email stop for this address” | Names “the restored archive” and mentions another address of the same contact; never claims this installation for that case |
| Explicitly cleared contact | Contactable | Contactable, clear history retained, no new restore hold |
| Empty archive preview | General rule | Explicitly says 0 contacts will return as Do not contact |

Contract summary counts before and after are identical: Published 31 done / 48 partial / 0 missing / 79 total; Target and push further 11 done / 82 partial / 32 missing / 125 total; All 42 done / 130 partial / 32 missing / 204 total. No clause status, gap or evidence cells change. The required builder claim is DATA-001 PARTIAL points=none, with no DONE claim.

## Validation

The existing native archive browser journey was extended, with no new test file. It exercises real archive export/restore, destination-only holds, an archive-only stop on a retired merged address, an explicitly cleared control, the eight-contact preview count, alphabetical five-name cap, remaining count, empty preview, and persisted restore-hold provenance. New assertions run at 1440. Settings > Data was inspected at 1440 and 390; the new paragraph's computed font size is at least 13px and the desktop layout has no horizontal overflow. Screenshots are in this packet.

The first browser execution passed: 1 test, 3.8 minutes test execution / 4.8 minutes total. An initial typecheck found a missing import, which was corrected; the subsequent typecheck passed. The final replay validates a small provenance lookup optimization and the final fixture source. The final replay also passed: 1 test, 3.7 minutes test execution / 4.7 minutes total. Final statuses, commit identity, exact-SHA CI observations and push custody are recorded in receipt.json and CI.json.

Source lock generation and its check passed. The contract document check passed. No generated view was changed. The full fleet publication scan and landing remain the Mac lander's responsibility, as required by the cloud instructions.

## Scope and remaining qualification

Only the two copy follow-ups are addressed. No permission decision, reviewed-clear behavior, alias rule, email-only contact title, form notification behavior, migration, or acceptance claim is changed. No deployment or default-branch write is performed. No PR is required by the brief or repository rules. No gate is required for this follow-up. Complete native verification is delegated to exact-SHA Verify; local work runs only the touched archive journey, typecheck and required source/contract integrity checks.

## Product custody

One linear product commit, `3b6296cbd5e6b0c10f93a9c84277c9b88373e906`, was rebased on the unchanged origin/main and pushed once to `cloud/sd-orbit-data001-copy-1` with the fleet guard. The first push attempt succeeded. All candidate authors/committers are Run Edit Run fleet <fleet@runeditrun.com>; no trailer or co-author line is present. The product worktree is clean. No PR was created. CI.json records every exact-SHA REST query under the specified budget.

## Exact-SHA Verify result

Verify run `43639155299` completed with conclusion `success` on `3b6296cbd5e6b0c10f93a9c84277c9b88373e906`. The final REST observation is recorded in CI.json. Product custody is READY; this is not a landing or deployment claim. The fleet still performs its own publication scan and landing. No blockers remain.

The CI watcher was resumed once after environment reconnection, preserving its accumulated call count and next allowed polling timestamp. Seven REST calls were used. No task server or subreaper remained at cleanup.
