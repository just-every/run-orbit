# sd-orbit-c-f111 results

OPP-007 remains PARTIAL. The one planner-selected close-deadline point was already implemented and documented in the required f106 base, 9441ea5ecb98b11306978f3228d55807f383f46d. This run independently executed that proof, integrated current main without rewriting published history, regenerated the source lock and published the named candidate. No additional production defect was demonstrated, so no runtime source or test assertion was changed. No DONE award, hold release, acceptance rewrite or count change is proposed.

Repository: just-every/run-orbit. Product branch: cloud/sd-orbit-c-f111. Candidate: 64303bb57b751b6a599db247756c15aa90808622. Integration main: 74f72f01ad3532725c71bd0832a774abd2c5a6ec. New commit: 64303bb57b751b6a599db247756c15aa90808622, a merge preserving the original f106 proof and main's newer OPP-001 won-close readback and judgment. No PR: push is this repository's Verify entry point. The product push succeeded on the first guarded attempt.

## Plan and actual results

1. Read the shipped campaign extract, target requirement, acceptance sentence, full Status Gap, latest Orbit ruling and DONE riders. Map the selected close-clock point to the existing ordinary-request and hosted-timer registration. Result: the exact requested scenario already exists in f106; every held remainder stays held. No plan was rebuilt or reordered.
2. Inspect the native Records creation and read routes, NOW projection, hosted scheduler, ordinary-request scheduler and timer transaction. Result: Records explicitly preserves null ownership, creates the future-close deal outside NOW and permits a fresh read before the deadline; timer publication and state movement are transactional. No defect was demonstrated.
3. Run the selected public-door journey and typecheck, then integrate main while preserving both parents. Result: local journey, typecheck and first-party checks exit zero. Main's newer won-close assertion and OPP-001 judgment are retained. OPP-003, OPP-006, RECORD-007 and TEAM-005 scopes and judgments are unchanged.
4. Run the documented contract generator write and check. Restore ACCEPTANCE.md and docs/CLAIMS.md whole from main. Regenerate sources.lock.json last and run its integrity check. Result: write and check exit zero before restoration; both generated files equal main in the committed candidate; lock generation and check exit zero. No migration was added or edited.
5. Stage the complete merge, check removed Status lines and compare parent row sets. Commit with fleet author and committer and active co-author-cleanup hooks. Result: 458 table rows and all 368 backticked table IDs, including all 204 clause Status rows, retained from each merge parent; no clause Status row dropped. All two candidate commits, including the base side parent, carry fleet identity and no co-author trailers.
6. Push only the named branch through cloud-push.py. Run the focused journey again on the exact committed SHA and collect actual receipts. Result: guarded push succeeds; exact-candidate journey passes, 1 registration, no failures or skips, in 28.528 seconds. CI discovery and final disposition are recorded below. Publish this complete explicitly selected packet to the separate evidence ref, then remove the product clone once transfer and push are verified.

## Acceptance coverage and the remaining Gap

The selected part of acceptance point 1 is covered by tests/core/request-scheduling.test.ts, “a fresh hosted schedule sends once through ordinary requests racing Cron, and due follow-ups return to NOW” (lines 28–93). Native POST /api/v1/records/opportunity creates a distinct open deal with explicit null owner and a future expected_close_at. Native Records and NOW reads confirm that it is initially outside NOW, with no queue.now event (lines 36–62). The controlled clock advances across the deadline while ordinary HTTP work races and repeats the hosted timer (lines 63–77). Fresh Records and NOW reads require the expected-close reason, exactly one queue.now transition, timer source, feature actor and null human actor; score, band, owner, stage, lifecycle and expected close remain unchanged (lines 79–93).

The pre-existing scheduled-send and awaiting-response assertions remain at lines 30–35 and 63–77. Mail is replaced only at the network boundary; exactly one accepted send and one attempt remain asserted. The awaiting-response fixture sets an already constructed due time directly; it does not prove genuine five-working-day deadline construction. The existing request-scheduling file is discovered by scripts/verification-inventory.mjs and scheduled by the core partitions in scripts/verification-plan.mjs; no workflow was edited.

PROBE OPP-007 acceptance-1-close-clock: authenticated Records POST with explicit null owner and future expected_close_at; Records and NOW GET before deadline; advance controlled clock 120001 ms; drain ordinary-request work and race/repeat hosted timers; fresh Records and NOW GET -> one NOW entry with Expected close date passed, exactly one queue.now event, source timer, actor_type feature, no actor_id or actor_name, unchanged score, band, owner, stage and lifecycle; exact-SHA journey exit=0.

Remaining unproved outcomes are unchanged: stale-clock behavior; genuine five-working-day awaiting-response deadline construction in the workspace timezone; complete form, reply, booking and failure reason and transition reconciliation; every NEXT and removal path; the complete event matrix and one transition per triggering event beyond close-deadline. This run does not release any held point or scope. No new policy choice or external dependency was introduced. TEAM-005 remains held on ct's cleanup and its resulting new main. There is no new blocker for the selected native point.

Counts before and after: 36 DONE, 136 PARTIAL, 32 MISSING, 204 total. Test budget: 198 registered cases plus two qualifications, 200 total; zero new registrations, zero assertions removed, narrowed, skipped or hidden behind a width condition. No pin tests or duplicates were encountered or removed. OPP-007 is PARTIAL to PARTIAL; no other clause status changes. Plan row changed: none; this report returns the existing OPP-007 selected-point qualification only.

## Mechanical and safety checks

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0 before restoring main's generated files; ledger=none exit=0.

Native probe, typecheck, first-party, generator and lock outputs are actual files in this packet. probe-receipt.json binds the execution to the candidate and records source hashes; integration-receipt.json records ancestry, counts, parent-row preservation and generated-view equality. candidate.diff contains the complete product difference from integrated main. No fleet report or receipt is committed on the product branch.

No runtime source, authority, erasure, capture replay, provider operation, UI screen, homepage or logo changed. No browser journey was needed or run for this proof-only integration. No new email-shaped fixture text or credential-shaped text appears in the added product lines. Publication scan, final main equality and exact-main Run site belong to the maintained fleet lander and are not claimed here. The known main baseline was green: Verify 42208022590 and 42205006070 and Run site 42208022677, all on 74f72f01ad3532725c71bd0832a774abd2c5a6ec; these are not candidate receipts.

## DONE-rider disposition; no DONE claim

1. FAIL for complete clause: selected close-clock outcome passes the native journey, but the remaining outcomes above are not established. OPP-007 stays PARTIAL.
2. PASS for selected point: real persisted Records data, negative pre-deadline NOW read, exact reason, one transition and independent field checks; no empty-list-only proof.
3. NOT ESTABLISHED for complete DONE: exact-candidate Verify 42213255746 stopped at the expected generated-view check; runtime shards were skipped. The local controlled-clock journey passes on the exact candidate. This is no DONE promotion.
4. PASS for selected proof: probe-receipt.json names 64303bb57b751b6a599db247756c15aa90808622 and hashes the tested file and relevant runtime sources. The test is byte-identical to the prescribed base.
5. INSPECTED: existing BASE-INPUT-001 citation and duties remain unchanged; no new inherited obligation is claimed.
6. PARTIAL: the full existing Gap remains named and acceptance is unchanged; generator write and check pass, then main's generated views are restored as required. No new Judged-from award is claimed.
7. PASS: acceptance requirement and sentence are byte-identical to main; no rewritten or added acceptance point.
8. Not applicable to the selected proof: no permission or destructive-action behavior changed, and no new authority assurance is claimed.
9. PASS boundary: no provider or real-world qualification is claimed; the existing mail edge remains a fake transport.
10. PASS: no policy default was adopted or counted.
11. PENDING fleet landing: branch push is not main equality, a COMPLETE publication scan or green exact-main Run site.

## Candidate CI

Initial discovery: Verify 42213255746, push event, head 64303bb57b751b6a599db247756c15aa90808622, in_progress. No dispatch, rerun, PR or workflow change was made. Final observed CI state and custody are appended after the bounded watcher observation.

Final observation: Verify 42213255746 completed with conclusion failure on the exact candidate. Source job 127876997777 stops at its first source command, `pnpm exec node src/base/contract-docs.mjs check`, with `ACCEPTANCE.md: generated content differs; run contract-docs write.` (exit 1). Its later artifact-retention step has no source bundle because the preceding source command stopped. Aggregate job 127877226437 fails its required-source condition and has no combined runtime artifacts because the shards were skipped. The logs show no independent product assertion failure. Both failed-job archives were read once using the prescribed gh run view commands; selected actual excerpts exclude all environment sections. ci-receipt.json records the commands and results. No repair, dispatch or rerun was made.

This is the brief's permitted generated-view-only exception. The candidate is READY for the guarded lander; this does not claim that the runtime shards executed or that Verify was fully green. The lander must generate the views from the merged CONTRACT.md, run its exact-final Verify and publication scan, and enforce main and Run site gates. There are no new product blockers. The clause stays PARTIAL and all held remainders, queue notes and release prerequisites remain unchanged.

GitHub budget used: six logical invocations: known-main runs discovery, candidate runs discovery, candidate run status after at least 300 seconds, candidate job enumeration, and one failed-log command for each failed job. No provider calls, CI dispatches, reruns or PRs. Browser and full-suite checks were not run in this proof-only integration.

The evidence publication command selects REPORT.md, the actual probe and integration receipts, CI receipt, native test and mechanical logs, the public product diff and non-secret push and ref receipts. It writes only evidence/sd-orbit-c-f111 and leaves the product head and index unchanged. Publication result is returned by its exact EVIDENCE line in the terminal message. Product and evidence publication are separate; neither constitutes landing or a DONE award.
