# sd-orbit-c-f105 results

SEQUENCE-002 stays PARTIAL. The selected single-scheduled-message human-stop slice is now covered by the existing native stop journey. No product defect was demonstrated, so product runtime source is unchanged. Acceptance text, all other clause judgments and every existing hold remain unchanged. Counts stay 36 DONE, 136 PARTIAL and 32 MISSING, 204 total. The suite stays 198 registered cases plus two qualification flows.

## Change and public-door proof

The registration in `./tests/core/signals-outreach.test.ts:287` retains all existing reply, booking, stage, close, unsubscribe, permanent-bounce, automatic-reply, inferred-open and separate-outcome assertions.

- Lines 294 to 297: create a native draft, approve its exact revision for a future scheduled time, and read its saved recipient, subject, body, revision and scheduled state.
- Lines 298 to 311: cancel through `POST /api/v1/workbench/messages/:id/cancel`, freshly read the message and native opportunity timeline, and require cancelled state, the operator-cancel reason, exactly one `message.cancelled` entry attributed to that operator, one attributed audit row and zero mail submissions.
- Lines 312 to 313: repeat that native cancellation, require HTTP 409 and compare the complete native message and record reads and cancellation audit inventory with the first result.
- Lines 314 to 316: dispatch past the due time with a newly constructed service, require zero submissions and the unchanged cancellation result. This is fresh-service proof only, not persisted-store or process-restart proof.
- Lines 333 to 338: reopen the deal, replay the genuine reply and dispatch late; the manually cancelled message and its first reason remain identical, and the same single attributed human exit remains on the timeline.

PROBE SEQUENCE-002 selected human-stop point: native draft and exact-revision scheduling, followed by POST cancellation -> HTTP 200, cancelled state and first human-stop reason, one operator-attributed timeline entry and zero submission.
PROBE SEQUENCE-002 repeat refusal: POST the same cancellation again -> HTTP 409 and unchanged message, native record and audit effects.
PROBE SEQUENCE-002 late dispatch and replay: fresh service after due time, then replay and deal changes -> zero submission from the cancelled message, same first reason and same single human exit.

## Scope and held remainder

The complete due-step races for every event and a persisted-store and process restart remain omitted. External-colleague thread exits retain OUT-019's Base relay recipient prerequisite. Enrollment exits and pauses, reassignment, permission and mailbox obligations, and enrollment reporting remain with SEQUENCE-001, SEQUENCE-003, AUTO-001, OUT-013 and REPORT-001. Approver-removal cancellation stays with TEAM-004. TEAM-005's cleanup and new-main qualification prerequisite is untouched. There is no DONE promotion, restoration, policy adoption, hold release or additional campaign target.

Plan row returned: SEQUENCE-002 human-stop slice covered; PARTIAL to PARTIAL. All other plan rows, queue notes and release prerequisites remain unchanged.

## Validation and test development

The original focused extended journey passed. A subsequent recipient assertion initially expected the fixture's mixed-case address, while native saved drafts normalize addresses to lowercase. The expectation now checks that normalized recipient, preserving exact equality. The actual failed development log is retained; no product behavior was changed and no assertion was removed or narrowed. This was local test development, not a Verify repair.

Typecheck, first-party check, generator write and check and source-lock check pass. Generated ACCEPTANCE.md and the claims view were restored whole from origin/main; neither is committed. There is no migration, UI change or browser-proof requirement for this test-only slice. No new test registration or fixture address was added. Changed-text checks found no new email-shaped string or bare slash prose token. Every parent Status row is retained in the save.

## DONE riders and pre-ready check

1. FAIL for a full DONE claim: the selected native outcome is covered at lines 294 to 338; complete event races, restart and the held thread and enrollment duties are not proved.
2. PASS for this slice: seeded scheduled mail is actually cancelled; repeat refusal and late dispatch are checked against populated readback, including attribution and zero submission.
3. FAIL for a full DONE claim: exact-candidate push Verify 42207936435 failed only at generated-view freshness; runtime shards were skipped. This is the documented handoff exception, not full-green runtime proof.
4. PASS locally: the final focused registration passes on candidate 25ad07ce9805fd8254b1332a2674035460a0ec82. All 16 touched-file cases pass on the checkpoint source tree, with the final changed registration separately rerun on the candidate.
5. Existing Base citations and inherited duties are unchanged.
6. PARTIAL gap names remaining proof; write and check pass before restoring generated views. The lander owns generated view freshness and judged provenance.
7. PASS: acceptance text and obligations are unchanged; no ruling or coverage rewrite is needed.
8. No authority path changes. The existing dispatch-rechecks registration retains its active-operator and permission assertions. This slice exercises the scheduled state and refuses a second cancellation without effects.
9. PASS: no live provider, legal boundary or restart claim is made. Mail transport is replaced only at its network edge.
10. Not applicable: no new policy decision or default.
11. Pending guarded landing, exact-main equality, publication scan and Run site. No landing is claimed.

Existing assertions are retained. No erasure, credential or replay production path changes; selected replay checks prove the cancelled message is not revived. No screen is touched. Publication scanning is delegated to the fleet by the cloud adaptation; its result is not fabricated here. READY or PUSHED custody does not award DONE or release a hold.

## Candidate and mechanical receipts

Branch: cloud/sd-orbit-c-f105. Full candidate SHA: 25ad07ce9805fd8254b1332a2674035460a0ec82. Two fleet-authored and fleet-committed product commits are pushed, the first a CI-skipping save. Every author, committer and trailer in the candidate range, including side parents, was checked before each push. Both candidate commits retain all 204 parent Status rows; both old and new contract pipe-row counts are 458. Fresh main was fetched and merged before the candidate; it was already up to date. No published history was rewritten.

The full touched test file passed 16 of 16 cases with no failures. Its long existing OUT-017 archive and erasure case took about 562 seconds; nothing was disabled or bypassed. The final changed registration passed separately on the exact candidate in 39.5 seconds, including fixture setup. Final typecheck, first-party check and edition source-lock check all exit 0 on that SHA. The source lock is generated, not hand-edited. The only product-branch files changed are CONTRACT.md, sources.lock.json and the existing signals-outreach test file.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0, then generated files restored from origin/main; ledger=none exit=0.

Main observed at d89ffcc89d4e87b5276f13298210de9eb21f4f35 has successful Verify 42198798726 and successful Run site 42198798685. These are main's results, not candidate results. Candidate Run site, main equality and publication scanning remain the fleet's landing duties. No PR was required by the native push entry point and none was opened. The declared repository was the sole cloned and written product repository.

## Final CI disposition and handoff

Exact-candidate push Verify 42207936435 completed with conclusion failure on 25ad07ce9805fd8254b1332a2674035460a0ec82. Source job 127859269578 ran `pnpm exec node src/base/contract-docs.mjs check` and reported exactly: `ACCEPTANCE.md: generated content differs; run contract-docs write.` The source artifact was consequently unavailable. Verify job 127859518686 failed its dependency guard and its missing-artifact upload because source failed and runtime shards were skipped. Both failed-job archives were read once, with no retry or rerun. Six GitHub command invocations were used. No product assertion failed in candidate CI and no repair was attempted. The generated-view-only exception applies; the lander must regenerate the views and qualify its resulting commit. No full-green candidate Verify, runtime shard execution, scan, landing or candidate Run site is claimed.

The exact pushed product branch was independently read back and matches the candidate SHA. Publication scanning remains NOT RUN in cloud and owed by the fleet. No DONE award or release follows this handoff. The target's remaining races, persisted restart and inherited holds are unchanged. Detailed plan and complete relevant non-secret receipts are published separately through the evidence branch. No evidence file enters the product branch. Raw failed-job logs contain GitHub's printed workflow environment sections and are retained locally as diagnostics; only their actual failure excerpts, with those environment sections omitted, are selected for public evidence. Push receipts omit the guard's credential fingerprint metadata.

No product blocker remains for this selected partial slice. SEQUENCE-002 as a whole remains incomplete for the named gaps. The cloud clone and its dependencies are removed after successful product custody and evidence publication; the packet stays outside the clone.
