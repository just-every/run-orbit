# sd-orbit-c-f88 results

TASK-001 remains PARTIAL → PARTIAL. The sole planner-selected delivery-proof point was already implemented in the required f85 base, commit `8349d342994e3ecbfbdd565451db08711f22fbd8`. This continuation ran and independently probed that exact source without changing product code, acceptance text, Status rows, tests or source lock. No duplicate test or empty commit was created. Product branch: `cloud/sd-orbit-c-f88` in just-every/run-orbit. No PR is required by the repository's push workflow.

The existing proof is `tests/core/today-brief.test.ts`, line 30, “TASK-001 TEAM-004 BRIEF-001 BRIEF-002 AI-003 a seller starts each simulated day from one brief built from records only: replies, meetings, observed and inferred signals, overdue promises and unresolved identity, each line linked to its evidence”. Its `exerciseSalesTasks` helper in `tests/support/sales-tasks.ts`, lines 22–48, authenticates as the receiving full operator, reads their actual notification endpoint before reassignment, requires exactly one new assignment notice, checks the exact task link, reads that task as the receiver, rejects the stale request and requires unchanged notice identities and unread count. The registration retains its recurrence, erasure and removal-handover assertions.

The native assignment effect in `src/core/features/tasks/effects.ts` uses the recipient and assignment revision as a durable unique event and attaches the exact task link. The authenticated read in `src/core/features/notifications/routes.ts` scopes notifications and unread counts to the current operator and projects that link. No demonstrated defect justified a source change.

## Actual checks and public-door probe

- The selected existing Today registration passed: one test, zero failures. Full output is in `touched-test.log`.
- Typecheck passed; output is in `typecheck.log`.
- `rer check --profile first-party` exited zero with no stdout; the actual empty output is `first-party.log` and its exit receipt is `checks.json`.
- Contract generator write and check both exited zero. Generated views were restored whole from `origin/main`; neither is committed. Actual outputs are `views-write.log` and `views-check.log`.
- Edition-authoring lock regeneration and its integrity check both exited zero and changed no tracked bytes. Complete stdout is in `lock-write.log` and `lock-check.log`.
- No migration changed, so no ledger check applies.
- All 204 parent Status identities remain. Before and after counts: 36 DONE, 136 PARTIAL, 32 MISSING. The suite remains 198 registrations plus two qualifications, total 200. No assertion was removed, narrowed or conditionally excluded.

PROBE TASK-001 receiver-inbox: authenticated task reassignment produced exactly one new task.assigned notice in the receiver's own native inbox, the exact task href and matching receiver-readable task; replay of the stale reassignment returned 409 and preserved the same inbox identities and unread count. The separate disposable-fixture execution passed on the candidate SHA; complete non-secret observed identities and counts are in `probe.json`, with terminal output in `probe.log`. This probe adds no permanent registration and disposes its database.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0, views restored from origin/main; ledger=none exit=0.

## Retained scope and DONE riders

No clause status was promoted and no ct judge request is made. The selected delivery deficit is proven already; daily task view completion, visible personal-channel qualification and an actual persisted-store recurrence restart remain omitted by this continuation's POINTS. Existing recurrence, Slack actor, Slack source, single-use action and removal proofs remain intact. Personal email, push and Slack reminders remain unavailable under NOTIFY-003. Administrator due-work channel notices do not establish personal preferences. Push still requires Apple and Google accounts. TEAM-005 remains held on ct's contract cleanup and the resulting new main. Every other shipped queue note, hold and release prerequisite is unchanged. No other clause is started.

Rider assessment, without a DONE claim:

1. PARTIAL: selected receiver-notification outcome is covered by the passing Today registration and independent probe. The full clause retains the explicitly omitted outcomes above.
2. PASS for selected scope: a real seeded receiver and nonempty inbox are read, exact new identities are compared, the receiver opens the task and stale replay changes nothing. This is a public native HTTP journey, not a test of implementation shape.
3. PARTIAL overall: push Verify 42182019150 at the exact head failed only at the generated-view check; later jobs failed or skipped as consequences. This is the explicitly permitted freshness exception for candidate admission. It does not establish full-clause product coverage or a DONE claim.
4. PASS for selected scope: local journey and probe run on the reported head; relevant source and test bytes remain unchanged.
5. INSPECTED: TASK-001 explicitly cites BASE-ROLE-001. No receiving duty or acceptance point changed.
6. PARTIAL overall: the existing Gap remains honest about unproved clause outcomes. Generator write and check succeed locally; restored stale views are left for the lander. Judged-from provenance was not rewritten without a judgment.
7. PASS: no acceptance text, policy or coverage mapping changed; all parent Status rows remain.
8. PASS for selected replay path: replay returns 409 and changes no receiver notification identity or unread count. Existing parent removal and revoked-session assertions remain and ran in the selected registration. No authority surface changed.
9. PASS as an honest boundary: no provider, mailbox, device, live Slack or legal proof is claimed.
10. NOT APPLICABLE: no policy default was added and no ruling is needed for this proof-only continuation.
11. PENDING guarded landing: no main push, publication scan, landing or Run site success is claimed from this cloud. The fleet owns those gates.

## Publication and lane handoff

The clone has full history. Fetch and rebase before publication found the branch already based on current main `d417a80f86f763583e68f7ba8c13cb668f30bbab`; the requested candidate head did not change. Product identity and trailer audit and transport results will be retained in the packet. Generated views and fleet evidence stay out of the product tree. There are no UI changes and no changed screens, so a new browser proof is not applicable.

Plan rows changed: none. Record this continuation only as fresh qualification of the selected receiver-inbox delivery proof already in f85, with no new acceptance closure or count change. The original full plan is not rebuilt. See `PLAN.md` for the full execution plan and initial acceptance mapping.

Product custody: the guarded push succeeded on its first attempt. The advertised remote branch was checked and equals `8349d342994e3ecbfbdd565451db08711f22fbd8`. Every candidate commit, including any side parents, was inspected; the sole commit has the fleet author and committer and no trailer. No new product commit was needed.

Exact-SHA push Verify 42182019150 on `cloud/sd-orbit-c-f88` completed with failure solely at the generated `ACCEPTANCE.md` check in source job 127773707943. The original f85 push Verify 42177495814 has the same first failure in job 127759350944. Both failed-job archives were read exactly once. Missing source-artifact uploads and aggregate failures are consequences; product shards were skipped. The branch source log is `branch-source-ci-failed.log`; job detail is `branch-jobs.jsonl`. No CI dispatch or rerun was requested. Six GitHub read invocations were used, with no status polling loop.

VERIFY_REPRODUCED {"head":"8349d342994e3ecbfbdd565451db08711f22fbd8","job":"source and shared build","command":"node scripts/verification-shard.mjs source","test":"node src/base/contract-docs.mjs check","exit":1,"failure":"ACCEPTANCE.md: generated content differs; run contract-docs write."}

This reproduction is the expected generated-view exception, not a product repair. Generator write and check passed before restoring main's generated views, and the last lock regeneration and check passed without changing a tracked byte. No test or landing guard was weakened. The candidate is handed over READY under the explicit generated-view-only exception; no normal green Verify, publication scan, main equality, landing or Run site is claimed from this cloud.

Pre-READY assessment for this proof-only continuation: the selected positive inbox and negative replay outcomes are observed through native routes; no assertion was removed or narrowed; existing erasure and removed-session paths ran in the retained parent registration; no UI or configuration surface changed; lock integrity passed. Publication scanning and final generated-view Verify remain the guarded lander's work. All provider, account, team and unqualified full-clause outcomes remain named above. There is no real product blocker newly demonstrated by this run.

Complete plan, report and actual receipts are selected explicitly for publication only on `refs/heads/evidence/sd-orbit-c-f88`. Product and evidence custody are separate.
