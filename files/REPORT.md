# sd-orbit-c-f73 results

FORM-004 remains PARTIAL. This round closes the selected native unassigned-rule proof; it does not claim full-clause DONE. Counts remain 36 DONE, 136 PARTIAL and 32 MISSING, 204 total. The suite remains 198 registrations plus two qualification flows.

## Scope and result

The existing `formsMappedJourney` in `newtests/t096/forms-mapped-journey.ts` is invoked by the mapped cross-origin capture registration in `newtests/t096/forms-native.test.ts`. The added segment at lines 64 to 91 saves an explicit unassigned rule, compiles its exact revision, approves the artifact and publishes it. An anonymous cross-origin submission creates a fresh native contact. Authenticated Records readback and the persisted ownership row must both show a null owner with revision one. The exact contact timeline must contain one source-attributed assignment entry naming this form, this submission, a null owner and the unassigned reason. Replaying the identical intake must return the original submission and preserve ownership, the exact assignment entry and the full submission and notification inventories. The notice inventory is populated by the earlier assignment scenarios. The existing NOW notices remain valid on the initial intake; no form-owner notice is added, and the entire resulting notification inventory is unchanged by replay.

Inspected `src/core/features/forms/assignment.ts`, `src/core/features/forms/service.ts` and the native capture wiring. Explicit null ownership, the source assignment entry and early replay receipt already exist. No product implementation change is made. The change adds proof to the existing registration and records it in FORM-004's Status evidence and Gap text. No acceptance sentence, status rank, inherited duty, prior assertion, UI or migration is changed.

## Acceptance map and held remainder

Acceptance sentence 1 already has rotation across two full operators, inactive-operator exclusion, persisted restart and notification checks in the mapped journey. This round adds no team claim. Acceptance sentence 2 now directly exercises a newly published unassigned rule with fresh intake, native ownership readback, exact source assignment history and replay inventories. Existing owner preservation, mapped intake, publication review, consent, archive transfer and erasure assertions are retained in the same registration and its custody helper.

Real team queues and team notifications remain TEAM-005, with its recorded ct cleanup and resulting-main prerequisite. Deal-less lead views and lead and custom-object intake remain RECORD-014. Email and push remain NOTIFY-003; mobile push still needs Apple and Google accounts. The omitted complete routing and UI and inherited consent, abuse, export and erasure qualification remain unclaimed. All existing queue notes, holds and release prerequisites are unchanged. No new policy ruling is needed or adopted.

The plan row changed by this report is FORM-004's selected native unassigned-rule deficit, now proved locally. No Mac plan file is written and no adjacent clause is taken on; the explicit selected POINTS boundary and held remainder remain in effect. The full execution plan is in PLAN.md.

## Local proof and mechanics

The first attempt used the VM's Node 24.19.0 and timed out applying the existing fixture migrations at 60000 milliseconds, before any form assertion. No implementation or timeout guard was edited. Subsequent runtime proof uses the repository-installed Node 22.20.0. Its first run reached and passed the new ownership and source-history checks, then rejected a new overly broad test expectation that initial intake emitted no notices at all. The scenario also creates a NOW deal, which legitimately emits existing opportunity.now notices. The new expectation was corrected to check form-owner notices and to compare the entire post-intake inventory after replay. No existing assertion was changed. Both Node versions pass typecheck. First-party checks pass. Contract generator write and check pass, after which ACCEPTANCE.md and docs/CLAIMS.md are restored from main. The source lock is regenerated with the documented command and its check passes. No migration ledger is applicable.

No browser screen changed. No new browser qualification is claimed. Existing emitted browser coverage remains unchanged. No existing assertion is removed, narrowed, skipped or moved behind a condition. The new fixture address is constructed from synthetic components; no new email-shaped literal or bare repository-shaped prose token is introduced in the product diff. The Base pin and Verify workflow remain unchanged.

## DONE riders

No DONE flip or judge request is made. The following is the honest status of each rider, not a claim of complete qualification.

| Row | Assessment | Evidence or boundary |
| --- | --- | --- |
| 1 | Selected native outcome covered; full clause remains partial | Mapped HTTP journey lines 64 to 91; team and lead remainder above |
| 2 | Real populated data and replay inspected | Fresh contact, persisted ownership, exact nonempty history and populated inventories |
| 3 | Candidate Verify status recorded in RECEIPT.json | Existing push Verify discovers forms-native.test.ts through verification-plan.mjs |
| 4 | Same relevant code and test bytes | Candidate provenance and diff in RECEIPT.json |
| 5 | Existing inheritance retained | FORM-004 cites BASE-PUBLIC-001, BASE-PUBLIC-002 and BASE-INPUT-001 |
| 6 | Partial Gap and evidence retained; generator passes locally | views-write.log, views-check.log and mechanical receipt; generated views restored for lander |
| 7 | Acceptance unchanged | Only the existing Status row gains evidence; parent Status identities retained |
| 8 | No authority change | Existing public and authenticated door checks remain; no implementation delta |
| 9 | Provider and team boundary retained | NOTIFY-003, RECORD-014 and TEAM-005 remainder above |
| 10 | No new policy default | Existing reviewed assignment semantics used unchanged |
| 11 | Pending fleet lander | Main equality, exact branch Verify, complete publication scan and Run site belong to landing |

## Publication and custody

Initial main e010d88be9345bda0c7440b371d7e1cffc87ed83 had successful Verify 42157856242 and Run site 42157856336. Product branch publication, final SHA, exact candidate CI and packet hashes are recorded in RECEIPT.json and the transport receipts. Product publication used only the named cloud branch. Its push started Verify automatically; no PR or workflow dispatch was needed. The fleet Mac performs the complete full-history publication scan and guarded landing. No cloud scan result or landing success is claimed.

MECHANICAL lock=`node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock` then `check` exit=0; views=`node src/base/contract-docs.mjs write` then `check` exit=0, generated views restored; ledger=none exit=0.

## Runtime probe

PROBE FORM-004 unassigned: authenticated form save, compile, exact-artifact approval and publication with assignment mode unassigned, followed by anonymous cross-origin intake for synthetic-orbit-9 -> accepted fresh contact; authenticated native contact read and persisted ownership show ownerId null with revision 1; one source assignment entry has the exact submission identity, null owner and Unassigned form queue reason; identical intake replay returns the original submission with replayed true; ownership, exact assignment entry, full submission inventory and full notification inventory remain unchanged by replay.

## Final candidate

Product branch cloud/sd-orbit-c-f73 is pushed at 4d57464352b71da0b375775e8857518d8ff6d5ea. Remote branch custody was independently read back and matched. The passing complete mapped registration took 445738 milliseconds under Node 22.20.0, with one pass, zero failures and zero skips. Fetch and the unpublished rebase left the branch up to date with main; no relevant code or test bytes changed after that run. After synchronization, generator write and check passed again, generated views were restored, lock regeneration and check passed, and the committed tree was clean. Every candidate author and committer is the fleet identity, trailers are absent, and all 204 parent Status rows remain.

Exact candidate Verify is push run 42168725032. Its status and conclusion are recorded in RECEIPT.json. The restored candidate views intentionally fail the generator freshness check; the generated view exception applies only if this is the sole Verify failure. Publication scan and Run site remain pending the Mac lander. No DONE promotion or main landing is claimed.

## Exact candidate CI conclusion

Push Verify 42168725032 completed with failure on 4d57464352b71da0b375775e8857518d8ff6d5ea. Read each failed job once with the prescribed failed-log archive command: source job 127731397908 and aggregate job 127731550982. The sole root failure is the first source gate, `pnpm exec node src/base/contract-docs.mjs check`, reporting `ACCEPTANCE.md: generated content differs; run contract-docs write.` Source artifact retention then finds no source bundle or check receipts; the aggregate refuses the failed source and skipped shards and has no combined receipts to upload. No runtime test ran or failed in this CI run. This is exactly the generated-view exception in the cloud instructions and is eligible for READY; it is not reported as an actually green workflow. The Mac lander must generate the views and run its own exact candidate Verify and publication scan before landing. There was no CI repair, rerun or workflow change. Six GitHub budget calls were used in total. CI log receipts omit environment metadata blocks.
