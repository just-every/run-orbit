# Orbit send-outcome notice wording

Tag: ct-orbit-own-action-notices-2
Repository: just-every/run-orbit
Branch: cloud/ct-orbit-own-action-notices-2
Base: bd9c4b5223b28c5c90923b2c8b22bfca2daaf42b
Candidate: bc1573da1a8c6ca747978c338dbef2a299a0e2e3
PR: none; the repository instructions and cloud adaptation use branch custody for the fleet lander.

## Plan

1. Configure the fleet identity, launcher, credential helper, push guard and commit hooks.
2. Clone fresh main shallowly; read the fleet rules, repository instructions and target clauses.
3. Inspect native-action notification context, recipient selection, immediate settlement and later provider-event handling.
4. Amend only OUT-005 acceptance 1 and OUT-006 Requirement/Acceptance wording. Preserve every status, gap, evidence cell, clause id, tier, acceptance number and count; leave NOTIFY-001, OUT-023 and OUT-017 unchanged.
5. Run declared contract write/check, restore the generated views, regenerate the source lock last, then run its check and rer check. No product tests, UI, browser journey or DONE claim for this wording-only change.
6. Fetch current main and rebase before the first commit/push, resolve source first if needed, rerun relevant generators if main changes, inspect the exact diff and every candidate commit identity/trailer, and push only the named cloud branch through the guard.
7. Use a single budgeted REST watcher for exact-SHA Verify; retain full results and receipts outside the product tree. Publish the explicitly selected report packet to the evidence ref, then delete the successfully pushed product clone and report terminal custody.

## Precise wording changes

### OUT-005 — Acceptance 1

Before: Accept an approved send, replay its provider response and inspect one timeline message, completed action, NEXT transition and notification.

After: Accept an approved send, replay its provider response and inspect one timeline message, completed action, NEXT transition and one notification for the responsible operator unless the outcome was caused by their own action, including their own immediate send outcome. The outcome remains visible on the record/timeline; this exception leaves other recipients' notices and later provider-event notices unchanged.

### OUT-006 — Requirement

Before: A transient submission failure retries up to 5 times over 1 hour. A permanent failure or an exhausted retry returns the opportunity to NOW, notifies the responsible operator once, and shows the provider's reason on the message. A permanent bounce also sets the contact do-not-contact under RECORD-012.

After: A transient submission failure retries up to 5 times over 1 hour. A permanent failure or an exhausted retry returns the opportunity to NOW, notifies the responsible operator once unless the outcome was caused by their own action (including their own immediate send outcome), and shows the provider's reason on the message. A permanent bounce also sets the contact do-not-contact under RECORD-012. The own-action exception leaves the outcome visible on the record/timeline and leaves other recipients' notices and later provider-event notices unchanged.

### OUT-006 — Acceptance 1

Before: Fail a submission transiently, permanently and ambiguously; verify bounded known-unsent retries, visible exhausted failure, one notification and permanent-bounce stop.

After: Fail a submission transiently, permanently and ambiguously; verify bounded known-unsent retries, visible exhausted failure, one notification unless the responsible operator's own action caused the outcome (including their own immediate send outcome), and permanent-bounce stop. Verify that the outcome remains visible on the record/timeline and that other recipients' notices and later provider-event notices are unchanged.

## Checked code semantics

- `src/core/app/app.ts:65` wraps the installation database with `notificationDatabase`. At lines 103–109, the native authenticated mutation middleware supplies `c.get('operator').operatorId` to `directNotificationAction`. GET/HEAD/OPTIONS, imports, capture and saved-workflow processing do not borrow a direct-person context. Provider ingress, delegation and public API routes are registered before that middleware.
- `src/core/features/notifications/direct-action.ts:7` stores the native actor in AsyncLocalStorage. The D1 wrapper adds `direct_notification_actor` only around the same transaction and removes it afterwards; a batch outside that scope uses the original database. This is the person who made the current request, not an assumption that every sender or saved message operator is always the actor.
- `migrations/core/0079_direct_notification_actor.sql:4` suppresses only an INSERT whose `NEW.operator_id` equals that direct actor. It excludes agent write context and restore/archive/workflow contexts. Other recipients and existing notices remain untouched.
- `migrations/core/0010_notification_record_scope.sql:17` selects the responsible active operator from opportunity owner, then latest operator timeline actor scoped to that opportunity, then the message operator. The self-notice rule compares that selected recipient with the current native actor; it does not suppress notices merely because a person sent the message.
- `src/core/features/outreach/service.ts:33` immediately settles failed/ambiguous submission outcomes and acceptance under the current request. The state trigger handles accepted, failed, bounced and delivery-unknown transitions once. Immediate own-send outcomes therefore share the direct-person exception; an outcome for another responsible operator retains its notice.
- `src/core/features/outreach/settlement.ts:12` retains message state and the corresponding `message.<state>` timeline write; acceptance also retains history links, awaiting-response timing, recommendation completion and queue work. Suppressing the notice does not suppress these record/timeline effects.
- `src/core/features/outreach/provider-events.ts:20` applies later provider settlement/state transitions and records a provider timeline entry without assigning a direct-person context. `src/core/features/outreach/service.ts` scheduled dispatch/reconciliation and `scheduler.ts` likewise use their background door. The wording expressly preserves later provider notices; it does not infer an asynchronous exemption from `message.operator_id` being the original sender.
- Existing retained proof helpers `tests/support/notification-direct-proof.ts` and `tests/support/notification-automation.mjs` distinguish the direct person from a colleague, an agent and automation and retain replay/read-state checks. These files were inspected, not changed or rerun; no new behavioral proof or DONE claim is made.

## Scope and counts

Only CONTRACT.md and its source-lock hash are committed: three changed target passages, plus the required lock hash. OUT-005 Requirement is deliberately untouched because the brief authorizes only its acceptance 1. NOTIFY-001, OUT-023, OUT-017 and every other clause retain main’s exact bytes. No code, tests, UI, homepage, clause ids, tiers, acceptance numbers, statuses, gaps or evidence cells changed. Each target clause retains one acceptance point, within the eight-point cap.

Before → after: OUT-005 partial → partial; OUT-006 partial → partial. Full-target counts: done 42 → 42, partial 130 → 130, missing 32 → 32, total 204 → 204. Core remains 42 done / 112 partial / 24 missing / 178 total; Agent surface remains 0 done / 18 partial / 8 missing / 26 total; Later remains 0. Tests added/changed/deleted: 0/0/0. No acceptance point is claimed proven by this wording-only round.

## Commands and results

Fleet identity, launcher refresh, credential helper/push guard, pnpm pin shim and preserving commit hooks were installed. Dependencies were installed from the existing frozen lock under `cloud_run`. The owner setup and running app were unnecessary for this contract-only edit. Every commit-creating product command used explicit fleet author/committer environment variables; the commit has no co-author trailers.

Contract generator write and check both exited 0 while generated outputs were present. Generated ACCEPTANCE.md and docs/CLAIMS.md were then restored whole from origin/main. The source lock was regenerated last and its check exited 0. `pnpm exec rer check` exited 0; `git diff --check` passed. The same generation/restoration/lock/check sequence was applied after fetching and rebasing onto origin/main; main was unchanged and replay was clean. The final scope comparison confirmed only the three authorized passages changed in CONTRACT.md and both generated views match main.

No full suite, new test, browser proof or product gate was run locally: the brief is wording only. The cloud cannot run the fleet publication scan; the cloud adaptation explicitly leaves that scan and landing with the Mac fleet. This report does not claim that scan has passed.

All candidate commits including side parents were inspected with the required identity/trailer log. There is one new commit with fleet author and committer, no trailers, and no skip marker. The guarded product push succeeded on attempt 1. No force push, default-branch write, landing or PR was performed.

## CI and terminal custody

Exact-SHA Verify run 43165607287 was discovered through REST on the candidate SHA. The single watcher polls at least 300 seconds apart, within the ten-call budget. Final outcome is recorded below and in RECEIPT.json. The generated views remain the lander’s responsibility; a failure only on their generator check is allowed by the supplied contract.

## Results and blockers

The wording now excludes a person’s own immediate send-outcome notice, keeps the outcome on the record/timeline, and explicitly preserves other recipients’ notices and later provider-event notices. The transient retry, visible exhaustion, provider reason, permanent-bounce stop, accepted-send effects and replay duties remain. No missing ruling or account is needed. Product custody and evidence transfer are reported separately; the fleet must rerun its landing/publication checks.

## Final exact-SHA CI result

Verify run 43165607287 (https://github.com/just-every/run-orbit/actions/runs/43165607287) completed with conclusion **failure** on bc1573da1a8c6ca747978c338dbef2a299a0e2e3. The sole initiating failure is `pnpm exec node src/base/contract-docs.mjs check`: `ACCEPTANCE.md: generated content differs; run contract-docs write.` The source job stopped before its build/release artifacts could be produced; its artifact upload then failed, the dependent shards skipped, and the final verify gate/artifact step failed as consequences.

Both failed-job archives were read successfully once: job 131006767727 (source and shared build) and job 131007005812 (verify). Relevant actual output is retained in ci-source-failure-excerpts.txt and ci-verify-failure-excerpts.txt; only unrelated environment-dump blocks were omitted from publication. Five GitHub CLI/API calls were used in total, including the two archive commands. There was one CI watcher, and its only status poll followed discovery by more than 300 seconds. No workflow was rerun or dispatched.

The supplied cloud/contract rule explicitly permits READY for this generated-view-only failure and its dependent failures/skips. This is that exception, not a literal green workflow result. The lander must generate ACCEPTANCE.md and docs/CLAIMS.md from the merged CONTRACT.md, run the publication scan, and require its own exact-SHA Verify before landing. Generated views were never committed to make CI pass.

The advertised cloud branch ref was independently read with `git ls-remote --refs` and exactly matched the full candidate SHA. The product checkout was clean. No blocker remains for this wording round under the stated exception. The report/evidence transfer is separate from product readiness and acceptance. After evidence publication, the successfully pushed product clone and its node_modules are deleted as required by the brief; the packet and receipts remain outside it.

READY branch=cloud/ct-orbit-own-action-notices-2 head=bc1573da1a8c6ca747978c338dbef2a299a0e2e3
