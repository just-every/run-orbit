# sd-orbit-c-f62 — OPP-003 evaluation

Product repository: just-every/run-orbit. Branch: cloud/sd-orbit-c-f62. Candidate: 3b0ce18793254ec00c67e677dad3b081c3cb83d2. Proof commit: 39dfa7ba77ad36f12dcf861447cf0790ab603c24. Baseline main: c01084f133af9aa484a6c1f5151a4e9cfbc7230f. No PR is required: Verify supports branches. No default branch was pushed.

OPP-003 changes from PARTIAL to DONE on the candidate. All four planner-selected deficits are closed: exact contribution values, recorded active-policy identity, time decay and exclusion of closed deals. The carried band proof is retained and passed again. This is a candidate status change, subject to the guarded lander's exact-SHA gates and independent judgment. No runtime defect was demonstrated, so runtime source was preserved. Only the existing signed-ingestion registration, CONTRACT.md and the generated source lock changed.

Counts: 35 DONE, 137 PARTIAL, 32 MISSING before; 36 DONE, 136 PARTIAL, 32 MISSING after; 204 total throughout. The suite remains 198 registered cases plus two qualifications. No registration or existing assertion was removed, skipped, narrowed or hidden behind a condition. The existing ten-second visibility bound now uses the monotonic performance clock so mocking Date cannot make it vacuous.

## Plan and scope

The complete working plan is PLAN.md. It maps the single acceptance sentence to signed weighted ingestion and authenticated opportunity detail, Records edits under an advancing controlled clock, and won and lost closure followed by later signed evidence and replay. Then it checks the existing suite, typecheck, first-party validity, contract generation, generated-view restoration, source lock, identity and parent-row retention, publication custody and evidence return.

Only the OPP-003 plan row changes: the four selected native proof gaps close and the row can be marked DONE after landing gates. No other plan is rebuilt or changed. OPP-002 owner and stage independence, OPP-007 queue deadline qualification, TEAM-005 expanded roles, every existing hold and release prerequisite remain unchanged. The extract provides no subsequent unblocked target in these same files beyond entries already assigned or held; no extra clause is promoted.

## Acceptance and frozen rubric

Existing registration: tests/core/signals-outreach.test.ts, “SIGNAL-001 SIGNAL-003 SIGNAL-004 SIGNAL-007 SIGNAL-008 signed replay-safe ingestion links exact identity; unauthorized and anonymous tracking write nothing,” lines 27–98.

- R1 MET locally: signed evidence enters through real source HTTP; the authenticated opportunity route returns every exact signal contribution and their bounded sum, lines 55–68 and 74–77. Negative evidence and both score bounds are exercised, lines 76–85.
- R2 MET locally: score and band agree with the configured policy, policy identity matches the active policy, and evaluation time is recorded, lines 67–71. Existing high-band onboarding proof remains at tests/core/source-onboarding.test.ts:45 in its source-onboarding registration.
- R3 MET locally: Records PATCH changes value after twelve days, observes a distinct decayed evaluation and band, then changes expected close after the decay horizon and observes no remaining contributions, lines 78–84.
- R4 MET locally: Records closes the deal as won and lost; later signed bookings, a value edit and signed replay leave the current evaluation, score, band and complete persisted evaluation and contribution inventories unchanged; new evidence remains on the closed deal, lines 87–96.
- Inherited BASE-INPUT-001 remains cited at CONTRACT.md:119. Existing signed refusal and rollback inventory assertions remain at lines 32–37, with concurrent replay and changed-payload conflict at lines 38–44.

## Runtime probes

PROBE OPP-003 contribution values: signed reply, six-day-old booking, completed meeting, form and bounce; authenticated opportunity GET -> contributions 40, 36, 30, 25 and -25; sum 106 is clamped to score 100, high band.
PROBE OPP-003 active policy identity: authenticated opportunity GET -> opportunity.scoring.v1, matching the imported active scoring policy; evaluation time 2034-04-05T12:00:00.000Z under the controlled clock.
PROBE OPP-003 decay: twelve-day clock advance and native value PATCH -> contributions 24, 18, 18, 15 and -15, score 60, medium band, new evaluation identity; day 31 expected-close PATCH -> score 0 and no contributions; a fresh negative contribution is clamped to 0.
PROBE OPP-003 closed exclusion: fresh reply produces score 15 from 40 and -25; native won and lost closures followed by signed bookings, native value edits and replay -> score remains 15, low band, with identical prior evaluation and contribution inventories and visible new evidence.

These outputs are checked by the successful strict assertions in candidate-probe.log on the exact candidate. The command runs through source HTTP and native authenticated routes over real migrated isolated D1, with no scoring or persistence fake. No provider account, live-model call or held-out material is used.

## Validation

- Exact candidate on Node 22.20.0: the focused signed-ingestion registration passed, 1 test, exit 0, 30.674 seconds including isolated migration setup. See candidate-probe.log.
- Complete touched file: 16 passed, exit 0, 626.588 seconds. See signals-outreach.log. It ran on Node 24.19.0 before selecting the installed Node 22 pin; all relevant source and test bytes match the candidate exactly.
- Existing source-onboarding registration: 1 passed, exit 0, 407.415 seconds. See source-onboarding.log. Its relevant bytes remain unchanged. Existing clock-dependent helper warnings did not fail the case.
- Pinned Node typecheck and first-party check passed, exit 0.
- Contract generator write then check passed. It updated the summary counts mechanically. Generated ACCEPTANCE.md and docs/CLAIMS.md were restored from main and are absent from both product commits.
- Source lock regenerated last and its check passed on the exact candidate. No migration changed.
- Every parent Status ID is retained in both commits: 204 clause rows and 458 total table lines. OPP-003 acceptance text is unchanged.
- All candidate author and committer identities and trailers were checked before both guarded pushes. There are no co-author trailers. Both pushes succeeded on their first attempts. Added text contains no email-shaped string or conflict marker.
- No screen changed, so no new browser proof is needed for this native HTTP acceptance sentence. No UI design tool was called.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0; ledger=none exit=0.

The deliberate post-restoration contract-docs check exits 1 naming only ACCEPTANCE.md and docs/CLAIMS.md; committed-views-check.log records it. The user explicitly requires these views to remain main's versions until landing. They were not committed to make CI green.

## Mutation proof

Each temporary mutation ran independently on pinned Node 22, failed the intended assertion with real exit 1, and was restored before committing. All mutation files and logs are outside the product tree.

| Point | Distinct mutation | Failing assertion | Receipt |
| --- | --- | --- | --- |
| Contributions | Return no contributions from authenticated detail | Exact weighted, aged values at signals-outreach.test.ts:66 | mutation-contributions.log |
| Policy identity | Return a different policy identity | Active-policy identity at signals-outreach.test.ts:70 | mutation-policy.log |
| Decay | Change SQL decay horizon from 30 to 60 days | Exact aged contribution at signals-outreach.test.ts:66 | mutation-decay.log |
| Closed exclusion | Remove the SQL open-lifecycle evaluation guard | Preserved prior evaluation at signals-outreach.test.ts:93 | mutation-closed.log |

mutations.json contains the exact edits, exits and durations. These are deliberate test mutations, not failing CI repairs. No real Verify repair round was needed.

## DONE-RIDERS

1. PASS locally; acceptance outcomes are exercised by the signed and native Records journey, lines 55–96. Exact-SHA Verify status is recorded below and remains a landing condition.
2. PASS; seeded evidence is nonempty, exact output is inspected, signed refusal paths remain no-write, and all four distinct mutations fail their intended assertions.
3. PENDING recorded Verify qualification. The registration is unconditionally loaded by the existing push-tier core shard; no environment flag was added. The permitted stale generated views may stop that candidate source shard before tests; the lander regenerates them and reruns its exact-SHA gates.
4. PASS; focused proof is on 3b0ce18793254ec00c67e677dad3b081c3cb83d2; full touched and retained onboarding runs have identical relevant source and test bytes. Contract provenance names the immutable code proof commit, followed only by contract and lock changes.
5. PASS; the receiving OPP-003 metadata already cites BASE-INPUT-001, CONTRACT.md:119. No inherited duty was invented or reassigned.
6. PASS local generation and source provenance; empty DONE Gap and exact journey names. Summary counts are generated. Committed generated-view freshness is intentionally pending the lander, per the cloud exception; no parent Status row is lost.
7. PASS; acceptance text is byte-for-byte retained; only Status, Evidence, provenance and generated summary counts change. No ruling or coverage rewrite is needed.
8. PASS for applicable authority scope; signed refused inputs keep complete no-write inventory assertions, and native reads and writes use real operator sessions. No authority implementation changed.
9. PASS; the claim is limited to native evaluation. No provider, legal, retention or delivery qualification is claimed.
10. PASS; no new policy default is adopted. The test uses the existing active scoring policy.
11. PENDING guarded landing. Main equality, the final exact-SHA Verify after generated-view regeneration, complete full-history publication scan with zero findings, and Run site belong to the maintained fleet lander. No landing or scan result is fabricated.

## CI, custody and remaining conditions

Baseline main Verify 42116055029 and Run site 42116055015 were successful on c01084f133af9aa484a6c1f5151a4e9cfbc7230f. Both product commits carry skip ci as required for a preservation save and metadata-only update. Exact candidate discovery found no Verify run, so exactly one workflow_dispatch was accepted on cloud/sd-orbit-c-f62. No existing run was dispatched or rerun. Candidate CI details will be recorded in RECEIPT.json and the CI receipt below.

Product blockers: none demonstrated. Product push succeeded and all local touched checks passed. The generated-view exception is expected, not a repair. Publication scan status: not run in this cloud, complete unknown, historyScanned unknown, findings unknown; the fleet must run it from full history on the exact landing candidate. Candidate Run site is pending main landing. No customer provider proof or UI change is claimed. All commands started by this task must be finished before teardown.

Evidence is a separate report-only ref, evidence/sd-orbit-c-f62. It carries the selected actual packet and does not signal product acceptance or landing. Product custody is only the pushed cloud branch and exact head above.

## Exact-SHA CI receipt

Verify 42126142966, workflow_dispatch, completed with conclusion failure on 3b0ce18793254ec00c67e677dad3b081c3cb83d2. Plan succeeded. Source job 127590899030 stopped at the first command, node src/base/contract-docs.mjs check: “ACCEPTANCE.md: generated content differs; run contract-docs write.” and “docs/CLAIMS.md: generated content differs; run contract-docs write.” Its authoritative-source artifact was consequently absent. Verdict job 127591166693 then failed its required-source condition and lacked the downstream summary artifact. Test shards were skipped; no runtime assertion failed in CI.

Each failed job's log was read once with gh run view 42126142966 --repo just-every/run-orbit --job JOB_ID --log-failed. The two actual log excerpts retain every failed command and diagnostic, with public environment sections omitted as required for evidence selection. No blocked blob download or retry occurred. Seven GitHub calls were used in total; status discovery respected the five-minute interval.

This is precisely the user-authorized generated-view exception for READY. It is not reported as a successful Verify, and recorded full-shard proof remains with the guarded lander after regeneration. All local tests and mechanical checks listed above passed; no CI repair, source change, assertion weakening or workflow edit was made. Product blockers: none demonstrated. READY custody names the exact pushed head, not main landing.
