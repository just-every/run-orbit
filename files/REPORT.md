# Zoom archive compatibility repair

Tag: sd-orbit-c-f175-fix1
Repository: just-every/run-orbit
Branch: cloud/sd-orbit-c-f175-fix1
Published source candidate: 974775b13604d9e299858ece3fdeb3dd1a115e9b
First merged main: eab0faafccd2eb0945dddb7d0f52c30ce573c04c
Final merged main: e397ddbd66ed9254302f762b7db3e831b5b72de5
Final product head: 0a994fa3fce9b37137e71a7de2e9208db4dbb1cf
Exact-SHA push Verify: 43257990247; full observations and final conclusion are in CI.json.

## Result and scope

Blocking finding B is reproduced before the repair. The original native onboarding archive registration fails at tests/core/onboarding-archive.test.ts:83 with POST records/archive/imports: 400 {"error":"Invalid complete archive lineage."}; exit 1. The direct structural manifest probe also refuses a complete prior generation with all three Zoom tables absent. These observations match the frozen gate, without editing its report or held-out checks.

The repair imports the existing zoomArchiveTables constant into src/core/shared/archive-transfer-profile.ts and adds that group to optionalGroups. A complete prior generation may omit the entire group. The existing validator continues to refuse every one-table and two-table subset, duplicates, absent mandatory tables and inconsistent row totals. The manifest format, count checks, schema inventory validation and archive lineage validation remain intact. No dummy tables, validator bypass, fallback, timeout change or test weakening is introduced.

The published source ancestry is preserved by merging current main. The archive-generations conflict retains main's preGraphProposalCatalog and composes the independent graph and Zoom predecessors: current catalog, pre-graph with Zoom, pre-Zoom with graph, and neither extension, followed by all prior generations. The deployment-spec conflict keeps both 0081_graph_proposals.sql and 0081_zoom_meetings.sql; all applied SQL and hashes from both parents are unchanged. The migration probe compares all entries with the repository's actual collector and validates the specification. Other feature groups are retained. No f170 source is overwritten.

Main's complete Status section, including Gap, Evidence, provenance and counts, is retained byte for byte. The inherited BOUNDARY-001 clause text adds Zoom to the actual connected-product list, as in the published source candidate. This fix makes no acceptance or status-credit edit. Generated ACCEPTANCE.md and docs/CLAIMS.md are restored whole from main and are not new generated changes in this candidate. No generated view is committed to repair CI.

## Plan and validation

The complete authorized sequence is in PLAN.md. Execution uses the launcher credential helper, fleet identity, preserved repository hooks and the guarded cloud branch push. No other repository is cloned or written. No main, tag, landing or workflow change is made.

The before and after commands and actual exits are in RECEIPTS.json. Complete selected native-test output is retained in before-onboarding.log, after-onboarding.log, archive-transfer.log and zoom-meeting.log. The manifest-probe.mjs source and its before-manifest.json and after-manifest.json outputs prove the precise finite-generation change. They are report-only probes, not new permanent tests. Migration-probe.mjs and migration-receipt.json retain the independent generation and applied-SQL check.

The original onboarding registration passes after the repair (one test, zero failures; 564041.986877 ms). Both archive-transfer registrations pass (272293.625333 ms total). The selected native Zoom lifecycle registration passes (390506.572615 ms). Typecheck passes. First-party check passes. Contract generation write and check pass locally before restoring the views. The edition source lock is regenerated last with node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and its check passes. Complete command outputs are retained as the selected log files.

The retained native Zoom registration exercises reviewed attach, signed completion, replay and reorder refusal, cancellation isolation, erasure, private archive export and restore with paused connection authority. Its exact name is used below. Only the focused native registration is selected; no browser, production, full local suite or broad provider exercise is added. UI code is not changed by this fix; inherited screen proof remains historical. Full-history publication scanning and guarded landing remain the fleet's work and are not claimed complete by this cloud builder.

The exact-SHA Verify is discovered through REST, with one watcher and no repeat query for a run within 300 seconds. CI.json records the actual run identities and conclusions. A generator-only failure is described expressly; it is not called a fully passing runtime wall. No duplicate dispatch or rerun is made.

## Counts, claims and holds

Before and after: 42 DONE, 130 PARTIAL, 32 MISSING, 204 clauses; 198 registered cases plus two qualifications, 200 budgeted flows. Existing assertions are unchanged. No permanent test is added or removed. No plan row or status judgment is changed. The builder retains the scoped PARTIAL point 1 claim; the repository's existing INTEGRATE-002 Status cell remains main's MISSING judgment pending gate and lander disposition. Award: zero DONE, zero restorations, zero releases.

CLAIM INTEGRATE-002 PARTIAL points=1 tests=tests/core/today-brief.test.ts#INTEGRATE-002 BRIEF-004 RECORD-010 RECORD-017 RECORD-023 OUT-001 cited meeting plans, mention authority and Zoom lifecycle custody

GAP INTEGRATE-002: Owner Zoom developer-app and live-provider qualification remain held. Acceptance 2's booked USD deal and complete BOUNDARY-001 buyer walk remain unclaimed with their account, consent and receiving-product prerequisites. Recording and transcript retrieval and transcript-backed recap remain with CALL-002 and CALL-003, dependent on CALL-001 and the consent and recording-policy ruling. Zoom-side rescheduling and creation remain omitted. Sales-role audiences remain TEAM-005 with its existing contract-cleanup prerequisite. Every other provider, account, buyer-walk and release hold is unchanged.

No new policy default is adopted. Gate follow-ups C and D, including outreach copy, deleted completed meetings and erasure follow-ups, remain outside this repair.

## Readiness limits

The claim remains PARTIAL. This report does not award a DONE result under the DONE riders. The focused archive and custody journeys cover the repaired data-loss regression. Existing authority, erasure and replay assertions remain present. Current runtime verification and publication scan conclusions are reported only from actual receipts; main equality and Run site are owned by the lander. Evidence publication is report transport only and is not product READY or landing proof.

## Final main drift and provenance

Main advanced after the first fully tested merge was prepared. The pre-push assertion detected the advance, but that shell did not stop before committing and pushing 0354536c0ef3d86b2679499d8264f17204e2eda6. That published commit is preserved. Current main was then merged into it without rebasing or force pushing. The second merge is the final pushed head above. No byte under the archive, Zoom, Today, migration or selected test paths changed in the second merge; main-merge-comparison.json records the exact comparison. Typecheck, first-party, contract generation, structural manifest, migration integrity and source-lock checks were rerun successfully after that merge. Local native test output belongs to the relevant source bytes preserved in the final head, not a newly invented execution on that head. Initial push Verify 43257699935 is historical; only the final head's Verify can qualify the handoff.

Both product pushes succeeded on attempt 1. Every author and committer in origin/main..HEAD, including side parents, is Run Edit Run fleet with the fleet address; no trailer is present. candidate-identities.txt retains the exact required log. Product remote identity is independently checked by Git protocol in product-remote.txt. Complete provenance is in PROVENANCE.json. The final local runtime used Node 24.19.0 and pnpm 10.12.4 through the supplied cloud shim; CI uses the repository's Node 22.20.0 pin.

## Exact final Verify disposition

Push Verify 43257990247 completed with conclusion failure on 0a994fa3fce9b37137e71a7de2e9208db4dbb1cf. The source job 131321583908 stopped at its first source gate: pnpm exec node src/base/contract-docs.mjs check reported ACCEPTANCE.md: generated content differs; run contract-docs write. The local exact command on the committed head with main's restored views reproduces exit 1. The preceding local generator write and check had both passed before those views were restored.

The authoritative-source artifact step found no generated source artifacts because source preparation stopped. Runtime shards were skipped. Aggregate job 131321962103 refused the failed source and skipped shards and found no routine verdict artifact. Both failed-job archives were read once using the required gh run view command; both reads succeeded. Their selected logs omit GitHub Actions environment sections and mask credential values and signed URL queries; all remaining failure output is retained. No product assertion failure was observed in CI, and no runtime assertion was executed there. This is the expressly allowed generated-view-only failure and its downstream effects, so the candidate is READY under the brief's exception. It is not described as an actually successful full runtime Verify. No view repair, workflow edit, dispatch or rerun is made. The lander must regenerate the views, run its own exact commit gates, perform the publication scan and land from its machine.

No product blocker remains within this FIX scope. The packet and both product commits remain preserved; evidence transport is separate.

VERIFY_REPRODUCED {"head":"974775b13604d9e299858ece3fdeb3dd1a115e9b","job":"frozen gate blocking B; native onboarding archive case","command":"WRANGLER_SEND_METRICS=false cloud_run node --import tsx --test --test-concurrency=1 --test-name-pattern='API-002 credentials stay local while DATA-001 local archive restores records' tests/core/onboarding-archive.test.ts","test":"tests/core/onboarding-archive.test.ts#API-002 credentials stay local while DATA-001 local archive restores records and keeps the hosted owner able to sign in by mail without reviving sessions","exit":1,"failure":"POST records/archive/imports: 400 {\"error\":\"Invalid complete archive lineage.\"}","line":83}

PROBE INTEGRATE-002 1: native Records archive import of a complete prior generation -> restored records and valid owner access; current Zoom archive -> paused credentials with no secret, replay and erasure assertions pass.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0 before restoring main views; migration inventory and parent hash check exit=0.

Packet finalized at 2026-11-12T16:30:46.158297+00:00. GitHub command budget used: 6 of 10.
