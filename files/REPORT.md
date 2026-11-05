# sd-orbit-c-f61 results

Repository: https://github.com/just-every/run-orbit
Branch: cloud/sd-orbit-c-f61

Candidate: 52a352d70f487c38015e5a17c7d85ec9c5c757a9. Tested source: fc718f30cdd6b3f8d8c6180c2d9573a1cdd307dd.

RECORD-001 changes PARTIAL to DONE. Counts change 35 DONE, 137 PARTIAL, 32 MISSING to 36 DONE, 136 PARTIAL, 32 MISSING, total 204. All 204 parent Status rows remain in both commits. RECORD-001 is the only planned clause changed. Its single acceptance sentence requires authenticated creation and editing of a company, contact and USD opportunity with custom fields, followed by association and value readback. The planner credited creation, custom values and associations and selected three scalar persistence deficits. The existing journey is extended to reach those deficits. No runtime defect was demonstrated, so product implementation, UI, migrations, dependencies, workflows and acceptance text are unchanged.

The plan is recorded in PLAN.md. The suite remains 198 registered cases plus two qualification flows, total 200. No registration was added or removed, and every prior assertion remains. The existing RECORD-014 registration now names RECORD-001 too; it still calls typedFieldsProof, which calls recordChangesProof before its typed validation, immutable definition history and existing archive roundtrip.

## Public-door proof

All three entities are created with custom values by native authenticated Records POST requests. Fresh GET requests check the returned identities and exact scalars, followed by company-to-contact, company-to-deal, contact-to-company, contact-to-deal and deal-to-primary-contact associations. Settings readback explicitly verifies USD. Ordinary PUT edits change the company name and primary domain; contact name, address, phone, job title and timezone; and deal title, owner, amount and expected close date. Custom values change with these edits. Every edited value is read independently from native detail responses. Native PATCH edits then change these scalars again without resending custom values or associations; final detail reads require both to remain intact.

PROBE RECORD-001 contact: authenticated contact PUT and PATCH followed by GET -> changed name, address, phone, job title and timezone retained; licensed seats 24, reference and original company and deal retained.
PROBE RECORD-001 company: authenticated company PUT and PATCH followed by GET -> changed name and primary domain retained; seats 24 and reviewed true retained; same contact and deal retained.
PROBE RECORD-001 opportunity: authenticated USD deal PUT and PATCH followed by GET -> amount 987654 then 246810 cents, close date 2027-01-15T18:30:00.000Z then 2027-02-19T19:45:00.000Z, changed title and explicit owner retained; renewal true, same company and same primary contact retained.
PROBE RECORD-001 authority: each single-field PATCH without the native cookie -> 401; fresh full detail equals the pre-request detail, including values, links and history. The authenticated request then succeeds.

## Frozen rubric

R1: Create and edit a contact through authenticated Records, read exact ordinary and custom fields from the same identity and retain associations. Proven by the existing Records registration, coreRecordsPersistenceProof in tests/support/record-changes-proof.ts.
R2: Create and edit a company through authenticated Records, read exact ordinary and custom fields from the same identity and retain associations. Same native journey.
R3: Create and edit a USD opportunity through authenticated Records, read exact amount, close date, title, owner, stage and custom values from the same identity and retain its company and primary contact. Same native journey.
R4: Refuse an unauthenticated single-field edit without changing values, associations or history, and allow the authenticated edit. Same native journey.

The source and assertions directly compare independent native read responses to the changed input values; a save that drops or reverts a scalar fails that scalar's readback. No mutation run is claimed. The rubric is about visible persisted outcomes, not implementation shape or a separate test for each field.

## DONE riders and proportional self-check

1. PASS locally: the single acceptance journey creates, edits and reloads all three associated identities and custom values. Exact-SHA Verify qualification is reported separately.
2. PASS: populated native D1, independent detail reads, exact changed scalar values and primary associations. Unauthenticated writes are refused without changes; authorized edits succeed.
3. The existing push Verify inventory includes tests/core/records-complete.test.ts through the core partition. The exact candidate run and conclusion are in CI.json. No outside-Verify proof is substituted for it.
4. Final local Records execution and source identity are in RECEIPT.json. Any later change is contract metadata and its generated source lock; no test or implementation byte is changed after that execution.
5. PASS INSPECTED: RECORD-001 retains its existing Base citations for validation, roles, uploads and erasure in the published clause metadata list. Non-deal ownership remains explicitly RECORD-016's duty.
6. Generator write and check receipts prove the contract generates. The done row's Gap is empty and its Evidence names the registration and helper. Generated views are restored from main and excluded from product commits, as required for cloud candidates. The provenance names the tested source commit; the final contract update is metadata only.
7. PASS INSPECTED: no acceptance sentence, requirement, Base citation, coverage map or unrelated clause status is changed; all parent Status identities are retained.
8. PASS for the touched write door: missing native authority returns 401 and no change. No role, credential, erasure, capture or replay implementation is changed. Existing revocation, erasure and replay assertions are retained.
9. PASS INSPECTED: this clause's acceptance sentence has no live provider, legal, timing, scale or device requirement. No provider qualification is claimed and every existing hold remains unchanged.
10. PASS INSPECTED: no new policy default or scope choice is introduced. Existing authority rules are exercised unchanged.
11. PENDING LANDER: this builder pushes only the named cloud branch. Main equality, complete full-history publication scanning and Run site qualification belong to the maintained Mac lander. A cloud-side publication scan is not claimed.

No UI file or screen is touched, so screen typography, tooltip and responsive design proof are not applicable to this native HTTP proof change. No browser proof is claimed. Added text contains no email-shaped literal or provider-shaped key fixture; synthetic addresses are assembled only in the test runtime. Changed comments use real paths or plain prose rather than ambiguous GitHub-like shorthand.

Non-deal ownership remains with RECORD-016. Expanded roles remain with TEAM-005 and its existing cleanup and qualification prerequisites. RECORD-007 creation-default policy and all other holds, releases and planner entries remain unchanged. The plan return changes only the RECORD-001 row, recording the three selected scalar deficits closed; no plan is rebuilt or re-sorted. The cloud adaptation limits the assignment to the selected RECORD-001 points; historical campaign entries remain read-only context, so no additional clause is changed.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0; ledger=none exit=0.

The first tested product save and final metadata candidate were each pushed through the fleet guard on attempt 1. Both candidate commits have the fleet author and committer and no co-author trailers. No main or default branch was pushed, no history was rewritten and no PR was opened. Current main was fetched and merged before the final status change; it was already up to date at c01084f133af9aa484a6c1f5151a4e9cfbc7230f.

Fresh native probes also passed on the exact final candidate, using the committed recordChangesProof helper in an isolated D1 fixture. PROBES.json records actual native read responses and the final head. The company, contact and deal have the same identities in every association, the deal reads 246810 cents and close date 2027-02-19T19:45:00.000Z, and unauthorized PATCH is 401 with unchanged detail. No secret or session value is included.

## Gate provenance

The proof map gives the exact registration and assertion lines. The final metadata candidate has identical bytes to the tested source for the Records registration, both helpers and all three named Records implementation files; RECEIPT.json records that comparison. The final exact-head probes independently execute the committed native helper.

Main at the last fetch was c01084f133af9aa484a6c1f5151a4e9cfbc7230f. Its Verify 42116055029 and Run site 42116055015 were completed successfully. Those main results are context, never candidate CI proof. The two product commits are fc718f30cdd6b3f8d8c6180c2d9573a1cdd307dd and 52a352d70f487c38015e5a17c7d85ec9c5c757a9. Both carry skip-ci markers, as the first is a preservation save and the second changes only contract metadata and its lock. After the final push, exact-SHA discovery returned no Verify; exactly one workflow dispatch was requested. No existing run was rerun, and one watcher waits at least 300 seconds between discovery calls.

The cloud-environment runtime skill was used only to inspect supported environment and network readiness. No design skill, provider account, live mailbox, browser profile, deployment or other repository was used. The product branch contains no report files or credentials. The separate evidence publication conveys reports only and does not signal acceptance, READY or landing.

## Candidate CI and custody

Exact candidate Verify 42125192325 (workflow_dispatch) completed with conclusion failure on 52a352d70f487c38015e5a17c7d85ec9c5c757a9. Failed source job 127587612480 stopped at its first command, pnpm exec node src/base/contract-docs.mjs check: "ACCEPTANCE.md: generated content differs; run contract-docs write." and "docs/CLAIMS.md: generated content differs; run contract-docs write." Source artifact upload then found no bundle, product shards were skipped and aggregate job 127587816463 failed its dependency checks. The failed source log was read once with gh run view and is retained verbatim in verify-failed.log. This is solely the explicitly permitted generated-view freshness exception; it is not reported as an actual green workflow. The current exact-tree check reproduces those two stale generated files and no CONTRACT.md mismatch. No CI repair, rerun or workflow edit was performed.

DONE riders 3 and 11 remain the maintained lander's qualification duties. The cloud instruction explicitly permits READY for this generated-view failure and requires the lander to regenerate views, run exact-SHA Verify again and perform its full-history publication scan before landing. The contract generator write and check passed locally before the generated views were restored from main. There is no product blocker. Six GitHub calls were used: main context discovery, candidate discovery, one dispatch, delayed exact-candidate discovery, jobs detail, and one failed-source-job log read.

No publication scan, landing, main equality or candidate Run site success is claimed. READY is branch custody for the guarded lander. Before ending, this packet is published separately under refs/heads/evidence/sd-orbit-c-f61. Product refs contain only the two requested test files, CONTRACT.md and sources.lock.json. The clone is removed only after product and evidence remote refs are verified.
