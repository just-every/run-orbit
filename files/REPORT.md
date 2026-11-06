# sd-orbit-c-f90 results

Repository: just-every/run-orbit. Branch: cloud/sd-orbit-c-f90. Candidate: `ce8b379b57d1860e67c349868de50f44ee685f40`. No PR is required: Verify has a push entry point. Main was never pushed.

RECORD-003 changes from PARTIAL to DONE in the candidate. Counts change from 36 DONE, 136 PARTIAL and 32 MISSING to 37 DONE, 135 PARTIAL and 32 MISSING, out of 204. This is a proposed contract status for guarded landing, not a claim that main has landed or ct has counted it.

The requested company-domain slice was already implemented at the pinned f87 base `b0ba9d31ad51f48573e3f56e58aee9b8f953fdd3`. The continuation also instructs completing every native remaining outcome. The lane sequencing hold for f87 remains with the fleet: its pinned commit was not observed as an ancestor of the fetched main, and this branch preserves it rather than dropping that proof. This run extends the existing Records registration for normalized contact-email collisions, configured free-mail exclusion, keyless creation and editing, and signed-source non-linking and replay. It adds no registration and changes no runtime product code because the journeys demonstrated no product defect. Test count stays 198 registered cases plus two qualifications.

The proof source save is `da735f9dff2d085612641d00a1e45b4a56bcdd10`, pushed with skip CI. The final candidate preserves that proof and adds revoked-source refusal, the contract status, generated summary counts and a fresh source lock. Main `30f7a864d0a643fa020ea3eaa3d5325a112b872e` was merged after the save, retaining its newer DELEGATE-001 evidence and all 204 rows from each parent. The only conflict was the source lock, which was regenerated. Both generated view files equal that main's versions.

Existing import and Workbench duplicate proofs remain. Guided provider migrations remain MIGRATE-001, MIGRATE-002 and MIGRATE-003. Expanded roles retain TEAM-005 qualification and contract-cleanup prerequisites. The RECORD-007 creation-default conflict, every queue note, hold and release prerequisite remain unchanged. The plan row to update is RECORD-003 only; the full plan was not rebuilt. The clause's requirement and acceptance sentence are byte-identical to current main. No new policy default was adopted.

## Public-door proof

The single registration is `tests/core/records-search.test.ts` — RECORD-016 reviewed owners and guarded bulk undo; OPP-009 TEAM-003 RECORD-015 RECORD-002 RECORD-011 RECORD-006 relationships retain history and pipelines move safely and search matches record and timeline text, intersects every opportunity filter and caps the first page.

| Frozen rubric | Outcome and public door | Evidence |
| --- | --- | --- |
| R1 | An uppercase contact address with surrounding spaces saves as the normalized email key. Equivalent POST and PATCH requests return 409 with the saved contact ID. Nonempty complete Records inventories remain equal after each refusal. | `tests/support/record-identity.ts:23`, especially lines 44 to 53 |
| R2 | Uppercase leading-www company creation normalizes on readback. Equivalent POST and PATCH return 409 with the original company ID. Fresh complete Records reads preserve records, populated associations and notes. | `tests/support/company-identity.ts:8`, especially lines 46 to 57 |
| R3 | Settings configures a free-mail domain. Three companies can hold its normalized display domain after creation and editing, each with a null company key. Signed domain events remain unlinked and visible for review. | `tests/support/record-identity.ts:55` and line 111 |
| R4 | Two same-name keyless contacts and two same-name keyless companies create as separate IDs, accept ordinary edits and read back their saved names and null keys. Domain removal through ordinary edits also remains keyless. | `tests/support/record-identity.ts:75` and line 133 |
| R5 | Successful signed exact-email and exact-domain controls create exactly one visible timeline identity. Matching-name, keyless and free-mail events stay held through replay; all Records details and state remain equal. | `tests/support/record-identity.ts:100` through line 126 |
| R6 | A revoked source refuses both previously accepted identity replay and a new keyed delivery with 403, without changing Records or the held queue. | `tests/support/record-identity.ts:127` |

PROBE RECORD-003 company-create: authenticated Records POST with uppercase leading-www domain, followed by equivalent trimmed domain -> 201 with normalized readback, then 409 naming the original identity; complete populated Records inventory unchanged.
PROBE RECORD-003 company-edit: authenticated Records PATCH of a distinct company onto the normalized key -> 409 naming the original identity; records, associations and timeline inventory unchanged.
PROBE RECORD-003 contact-create-and-edit: authenticated Records POST and PATCH with equivalent case and whitespace email -> 409 naming the original contact after successful normalized creation; complete populated Records inventory unchanged.
PROBE RECORD-003 free-mail: native Settings configuration and company POST and PATCH -> three distinct records with null keys; signed free-domain event held rather than linked.
PROBE RECORD-003 keyless: authenticated Records create and PATCH for two same-name contacts and companies -> distinct saved IDs and names, null keys; signed name-only events and replay remain held.
PROBE RECORD-003 authority: native source disable followed by signed keyed delivery and replay -> 403 twice, unchanged Records and held queue.

## Checks and limitations

Touched Records registration, typecheck and first-party checks pass. Contract generator write and check pass before the mandated restoration of ACCEPTANCE.md and docs/CLAIMS.md from main. Source lock generation and checks pass, including the committed candidate. No migration was edited, so there is no migration-ledger change. The exact committed candidate's rer build also passes.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0, followed by restoring main views; ledger=none exit=0.

One local extension run exposed fixture interaction: the later pipeline journey tried to remove the free-mail setting while this identity fixture still held duplicate domains. Its expected 409 protection was correct. The helper now removes those domains through normal Records edits and restores Settings after its assertions. The complete original registration then passed, and no assertion was deleted, narrowed or moved behind a condition.

The base Verify 42178577492 failed only at contract-docs check with `ACCEPTANCE.md: generated content differs; run contract-docs write.` Source job 127762784950 was read once with the required archive command and reproduced using `node scripts/verification-shard.mjs source`, exit 1, on the failed SHA. Missing source bundle and skipped shards were downstream consequences. No generated-view repair or workflow change was made.

VERIFY_REPRODUCED {"head":"b0ba9d31ad51f48573e3f56e58aee9b8f953fdd3","job":"source and shared build (127762784950)","command":"node scripts/verification-shard.mjs source","test":"contract-docs check","exit":1,"failure":"ACCEPTANCE.md: generated content differs; run contract-docs write."}

Current main has exact-SHA green Verify 42179778674 and Run site 42182721336 at `30f7a864d0a643fa020ea3eaa3d5325a112b872e`. A duplicate main Verify was in progress at observation. These are main provenance, not the candidate's runs. Candidate CI is recorded separately in candidate-ci.json and the final observation below.

No UI source changed, so no additional browser screenshots were required. No provider sandbox or scale proof is claimed. No external account or key was used for the native identity proofs. The new helper contains no email-shaped literal, and its source transport is configured through native Settings and Sources doors. No assertions were removed from the existing registration. The Base and rer pins and workflows are unchanged.

## DONE riders

| Rider | Candidate assessment | Evidence or custody boundary |
| --- | --- | --- |
| 1 | LOCAL PASS on exact committed head; CI view exception | R1 to R6 above, all through native public doors, in the existing Verify registration. |
| 2 | PASS | Successful seeded create and edit operations plus unsafe collision refusals and full populated fresh-read equality. |
| 3 | PENDING LANDER | The registration is loaded by the existing core Verify plan; candidate Verify is recorded below. A generated-view-only failure is the explicitly permitted cloud exception. |
| 4 | PASS locally | Candidate source file hashes and logs are recorded in RECEIPT.json; exact-head execution is retained separately. |
| 5 | PASS | RECORD-003's published meta line already cites BASE-INPUT-001, BASE-ROLE-001, BASE-INPUT-003 and BASE-DATA-003. No inherited obligation was rewritten. |
| 6 | PASS mechanically before view restoration; provenance explicit | DONE Gap is empty; Evidence names both helpers; generator write and check pass. Contract provenance names source save da735f9, while the receipt binds final code and additional revocation proof to the final candidate. The lander owns the final view refresh. |
| 7 | PASS | Requirement and acceptance unchanged; only the Status evidence, status and source provenance change. |
| 8 | PASS for touched authority | Revoked source refuses new delivery and replay with no Records effects; all native writes require the real operator session. Existing erasure implementation is unchanged. |
| 9 | PASS | Provider and expanded-role qualification remains with its existing clauses and holds. No provider or legal proof is claimed. |
| 10 | PASS | Existing explicit identity semantics used; no new custody, spending, consent or authority policy. |
| 11 | PENDING LANDER | Main equality, candidate's complete full-history publication scan and resulting Run site are the guarded lander's duties. No cloud-side scan or landing claim is made. |

Pre-ready self-check: all named native outcomes run through public doors with observable assertions; no previous assertion was removed or weakened; revoked-source and replay refusal is exercised; no screen was touched; source lock is fresh. Exact-SHA full CI, publication scanning and landing custody remain explicit below and with the fleet Mac.

## Mutation reading

No product mutation was applied. The rubric's observable assertions were inspected against distinct failure modes: wrong normalized saved email (R1), wrong normalized company domain (R2), non-null free-mail key (R3), collapsed same-name keyless IDs (R4), automatically linked keyless event (R5), and accepted delivery after source revocation (R6). Each has a direct assertion rather than an aggregate inferred result. This is inspected sensitivity, not a claim of executed mutation receipts.

No known product blocker remains. Product and evidence pushes are separate and neither means main has landed. The independent lander reruns its own gates.

## Final exact-head custody

Product ref cloud/sd-orbit-c-f90 is verified remotely at ce8b379b57d1860e67c349868de50f44ee685f40. The clean committed candidate's complete Records registration passes with one test, zero failures and no skipped assertions (records-search-exact-head.log). Its build also passes.

Exact-SHA push Verify 42183438475 completed with conclusion failure. Source job 127778214884 fails solely at `node src/base/contract-docs.mjs check`: `ACCEPTANCE.md: generated content differs; run contract-docs write.` Local `node scripts/verification-shard.mjs source` on this exact SHA reproduces that expected exit 1. Missing source artifacts, aggregate job 127778403000 and skipped test shards are consequences. The brief explicitly accepts this generated-view-only result for READY; it is not reported as a green Verify. No dispatch or rerun was used. Nine GitHub CLI calls were used in total, with 390 seconds between candidate discovery calls and each failed job log read once.

VERIFY_REPRODUCED {"head":"ce8b379b57d1860e67c349868de50f44ee685f40","job":"source and shared build (127778214884)","command":"node scripts/verification-shard.mjs source","test":"contract-docs check","exit":1,"failure":"ACCEPTANCE.md: generated content differs; run contract-docs write."}

The complete actual report, plan, test and mechanical receipts, sanitized CI diagnostics and push receipts are selected explicitly for evidence/sd-orbit-c-f90. Workflow environment blocks are omitted from diagnostic logs. No credential files, environment dumps, held-out gate material or symlinks are selected. Publication scan, final regenerated-view Verify, main equality and Run site remain with the fleet Mac. No known product blocker remains; all original lane sequencing and qualification holds remain.
