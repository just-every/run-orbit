# sd-orbit-c-f175 actual implementation report

Repository: just-every/run-orbit. Product branch: cloud/sd-orbit-c-f175. Candidate: 974775b13604d9e299858ece3fdeb3dd1a115e9b. Fresh main merged: 01c15358b1bada090ebe87fe1dd9a72bf22b6082. No pull request is required: Verify has a push entrypoint. Only this cloud branch was pushed. Main was never pushed or rewritten.

INTEGRATE-002 is claimed PARTIAL. Its checked-in Status judgment remains MISSING, byte for byte from main, pending the fleet’s judgment update. The selected native limb of acceptance 1 is implemented and exercised against Zoom's documented HTTP boundaries. Counts remain 42 DONE, 130 PARTIAL, 32 MISSING, 204 total. The test inventory remains 198 registered cases plus two qualification flows, 200 total. No Status, Gap, Evidence or acceptance point changed. The sole contract prose change adds Zoom to BOUNDARY-001's list of actual connected products, matching the deliberate Zoom-only assertion update.

## Plan and changes

The original complete six-step plan is retained in PLAN.md. Each step was completed for the native scope:

1. Added focused Zoom modules and mounted their authenticated Settings, reviewed meeting and signed webhook doors in the existing app. The owner checks Server-to-Server OAuth credentials before installation-local sealing. Browsers receive neither saved credentials nor access tokens. Refused and revoked credentials show unresolved setup. A full operator may attach a meeting; owner authority is required to manage credentials. Conservative authority stays within the brief's existing owner floor.
2. An exact scheduled non-recurring meeting ID and explicitly chosen deal produce a review digest. Confirmation re-reads Zoom and refuses changed details. One Zoom-sourced scheduled signal and activity contain topic, times, duration, host, ID and join link. Only exact normalized email matches link contacts. A valid operator and contact collision stays visibly ambiguous. Attachment and capture do not alter saved drafts, outbound inventories or outreach authority.
3. HMAC verification covers the timestamp and exact raw body, with a five-minute freshness window. URL validation is answered correctly. Forged, stale, body-modified and replayed deliveries are refused. Completion reads only documented attendance metadata and updates the same activity once. Reordered terminal messages add nothing. A factual recap cites the saved preparation, attendance and signed completion; it does not infer discussion or transcript content. Follow-up remains an explicit existing reviewed plan-action handoff.
4. A second meeting's deletion cancels that activity and its own open mapped handoffs, leaving the first meeting and its handoff intact. Cancelled preparation and new follow-up are refused. Native contact erasure removes attendance identity and the occurrence; capture privacy matching keys prevent resurrection. Both actual Records archives and CLI portability retain completed and cancelled activities, exclude credentials and pause restored Zoom. Migration 0081 is additive and registered in native archive lineage, schema and portability policy.
5. Extended and retitled the existing meeting-plan test registration; no new registered case. The existing source-onboarding boundary case removes Zoom alone from its not-listed product list and asserts its truthful unresolved state. Existing Today and Calling browser journeys retain their prior assertions and exercise the actual new Settings card and meeting-plan UI. New assertions run at 1440; changed screens were captured at 1440 and 390. Screens were visually inspected. New controls have text labels; existing shell tooltip behavior remains. Configuration stays under Settings, with the existing Orbit type and components.
6. Preserved concurrent main's Slack declaration and disconnect work during the merge. Generated the contract views, checked them, then restored both views from main. Regenerated deployment specification and source lock using repository scripts. Typecheck, first-party, boundaries, manifest, source lock, deployment and migration ledger checks pass. Fleet identities and all candidate messages were inspected before each guarded product push. The report packet is transported separately on the evidence ref.

Booking and deal-activity source files from live INTEGRATE-001 were not edited. Homepage, logos, Base pin and Verify workflow were not edited. No provider deployment, live Zoom account action, meeting creation, recording retrieval or transcript retrieval was attempted.

## Actual local results and limits

- Full native Today file: four tests passed, zero failures, 1,082,278 ms. This includes the complete Zoom lifecycle, both archive transports, erasure, and the existing Today, risk, mention and Twilio assertions. It ran on the merged implementation; later relevant changes were the stronger recap-time assertion and isolated browser runtime cleanup.
- Exact candidate native meeting-plan registration: one passed, zero failures, 779,891 ms on exact committed head 974775b13604d9e299858ece3fdeb3dd1a115e9b. Command: `pnpm exec tsx --test --test-name-pattern='INTEGRATE-002' tests/core/today-brief.test.ts`.
- Touched source-onboarding registration: one passed, zero failures, 1,312,704 ms on the candidate source bytes. Command: `pnpm exec tsx --test --test-name-pattern='NOTIFY-003 opt-in' tests/core/source-onboarding.test.ts`.
- Full Today browser registration: one passed, zero failures, 363,372 ms. Its source and test bytes equal the committed candidate; the commit was created while it was running. The compiled product differs from the candidate only in test files and the source lock. The final successful run covers every original phase and the new Zoom phase.
- Full Records-layout browser registration, which invokes the Calling Integrations visit: one passed, zero failures, 363,626 ms. Its relevant source and test bytes are unchanged from merged save 4f6ab894ae337fb6b1a224a592b643ea2fc03632. Later product CSS changes only the saved meeting-plan status notice, which this flow does not use.
- App build, typecheck, first-party profile, manifest, boundaries, deployment spec, generator write and check, source lock generation and check, and migration ledger: exit 0. Generated views were restored and remain identical to origin/main. All Status rows are identical to fresh main. Final working tree is clean.

All local commands used pinned Node 22.20.0 and pnpm 10.12.4. Long-running commands used cloud_run and hard timeouts. Headless Chromium used the installed system binary with no sandbox. No personal browser profile was copied.

Disposable Wrangler migration startup intermittently exceeded the fixture's original 60-second subprocess allowance on this VM. The outside-repository MIGRATION-ALLOWANCE.cjs, included as actual evidence, changed only that local migrations-apply bootstrap allowance to 180 seconds. No assertion, product timeout, test registration or committed guard was changed. An independent direct migration application completed, and the ledger reports no migrations to apply. The successful native and browser runs used this allowance; CI receives no such helper.

Demonstrated defects corrected during the build: signal and activity identity alignment; valid operator-contact collision resolution; the accessible Deal select name; saved preparation notice contrast found by Axe; cross-realm Request handling in the HTTP-only fake; and the separate Zoom browser runtime so teardown does not invalidate the existing risk phase. The archive guard correctly rejected an invalid duplicate identity fixture; the fixture was corrected to a valid collision and the guard stayed intact. No CI repair round has been performed. The exact failed source command was reproduced unchanged at the candidate and exits 1 with the same generated-view error; it requires no product or workflow repair.

## Frozen native coverage rubric

The native test registration is `tests/core/today-brief.test.ts` — `INTEGRATE-002 BRIEF-004 RECORD-010 RECORD-017 RECORD-023 OUT-001 cited meeting plans, mention authority and Zoom lifecycle custody`. The implementation extends it through `tests/support/zoom-meeting-proof.ts`, `exerciseZoom`, with real native auth, sealing, database transactions, archive transports and erasure. Only Zoom's documented HTTP edges are faked. Line references below are at the candidate.

| Item | Required outcome and public proof | Local result |
| --- | --- | --- |
| R1 | Connect and truthful state: authenticated Settings connect, owner refusal, provider refusal, sealed custody and no secret readback; helper lines 26–35 and 82–84, 91 | PASS |
| R2 | Explicit exact meeting and deal review; missing confirmation and stale preview refused; same occurrence reattaches once; helper lines 36–45 | PASS |
| R3 | Exact email linkage, valid ambiguous operator-contact collision, unknown visible, no guessed person; helper lines 19–21, 38, 46–50, 66 | PASS |
| R4 | Preparation has Zoom URL, ID, host, duration, attendees and recording state; saved agenda and prep; helper lines 48–54, browser journey lines 173–183 | PASS |
| R5 | Signed endpoint validation; forged, stale and exact-body tampering refused without change; helper lines 55–64 | PASS |
| R6 | Signed completion updates the same activity, matches attendance once and cites saved plan, attendance and completion; helper lines 65–71 | PASS |
| R7 | Replay and reordered completion add no provider read or state change; populated outreach inventories unchanged; helper lines 23–25, 68–72 | PASS |
| R8 | Recording permission denied and transcript missing stated plainly; denied attendance remains unresolved; no content endpoint ever called; helper lines 50, 79–81, 92 | PASS |
| R9 | Second cancellation isolates its activity and open handoffs, first retained, later preparation/action refused; helper lines 73–78 | PASS |
| R10 | Revocation and erasure cannot resurrect or expose identity; helper lines 82–91 | PASS |
| R11 | Actual Records export opened, secrets absent, full restored rows equal, connection paused; CLI archive roundtrip separately compared; helper lines 95–115 | PASS |
| R12 | Connected and unresolved Zoom card; actual attach, preparation, completion recap and access links in browser, visible at both widths; `tests/delegation-browser/today-journey.mjs` lines 157–190 and `calling-journey.mjs` lines 10–15 | PASS |
| A1 | Contract acceptance sentence 1: connect, attach, prepare, finish, cited recap, denied recording, replay and cancel second without fabricated context; R1–R12 collectively | Native limb PASS; live qualification not claimed |
| A2 | Contract acceptance sentence 2: BOUNDARY-001 walk's booked USD deal, full booking/product prerequisites | HELD and unclaimed |
| I1 | BASE-ROLE-001 inherited authority: native auth and owner-only credentials; full-operator attachment; helper lines 28–30; existing class boundary and reviewed plan-action paths retained | PASS for selected scope; TEAM-005 audiences held |
| I2 | BASE-SECRET-001 inherited custody: seal never echoed, no token persisted, both archive paths exclude secret and restored source paused; R1, R10, R11 | PASS for selected scope |
| I3 | BASE-DATA-004 inherited erasure and portability: real downloads and restores plus erased occurrence replay; R10–R11 | PASS for selected scope |
| I4 | SIGNAL-004 exact identity; BRIEF-004 saved preparation and citations; reviewed follow-up only; R3–R7 and R9 | PASS for selected scope |
| I5 | BOUNDARY-001 truthful product ownership; Zoom-only product assertion change at source-onboarding lines 104–106; browser card and Zoom ownership text | PASS for selected native scope; complete buyer walk held |

Verify is a push run on the exact candidate. Unchanged verification partitions register the native test in core-8, the source-onboarding test in core-3, and both browser files in runtime-delegation; proof-registration.json records the actual plan. This run did not execute runtime shards because the expected source-view check failed first. Exact CI receipt: push Verify 43182632225 completed with conclusion failure. Source job 131062244357 ran `node scripts/verification-shard.mjs source`; its first command, `pnpm exec node src/base/contract-docs.mjs check`, exited 1 with `ACCEPTANCE.md: generated content differs; run contract-docs write.` Runtime shards were skipped. Missing source and verdict artifacts and aggregate job 131062504235 are downstream effects of that source check. Both failed-job logs were read once. No test assertion failed in CI; no rerun or dispatch was made. The brief explicitly permits this generated-view-only failure for the cloud handoff; the lander regenerates views and runs exact-final Verify before landing. No local proof is represented as a completed green CI run.

## DONE-RIDERS assessment

| Row | Assessment on this partial candidate | Evidence or limit |
| --- | --- | --- |
| 1 | PASS for selected native limb; full clause not claimed | R1–R12; acceptance 2 and live boundaries remain named |
| 2 | PASS | Real populated deal, draft and activity inventories; allowed and refused authority, signature, stale review, erasure and archive paths |
| 3 | PENDING exact-final runtime CI; permitted generated-view-only handoff | Exact-SHA push Verify 43182632225; native and browser registrations are always loaded, not newly gated by an environment flag |
| 4 | PASS for native and browser source equivalence | Exact candidate native rerun; final Today browser same bytes; Calling bytes unchanged, as described above |
| 5 | PASS for selected inherited duties | INTEGRATE-002 cites BASE-ROLE-001, BASE-SECRET-001 and BASE-DATA-004; I1–I4 show concrete duties |
| 6 | PASS mechanical; lander judgment updates pending | Generator write and check exit 0, views restored whole; no builder changes to Status, Gap or Evidence |
| 7 | PASS | No acceptance point added, removed or rewritten; only actual product enumeration adds Zoom |
| 8 | PASS for selected authority | Owner connect allowed; unauthenticated and non-owner refused before provider call; stale review and cancelled action refused |
| 9 | HONEST HELD BOUNDARY | No live account, recording content, transcript, legal retention or full buyer-walk qualification claim |
| 10 | PARTIAL retained | Owner-only credential custody and no content retrieval follow the explicit brief and standing conservative floor; no broader policy award or release |
| 11 | PENDING GUARDED LANDER | Main equality, full-history publication scan and exact-main Run site have not been performed by this cloud |

Pre-ready self-check: all selected user-visible native outcomes are exercised through public doors; no pre-existing assertion was removed or narrowed except the explicitly authorized Zoom-only not-listed product update. Forged and revoked authority, erasure and replay paths refuse without resurrection. New controls are text-labelled; touched screens use existing Orbit components with text at least 13px, full borders and Settings placement. Browser Axe checks found no serious or critical violations in the final changed screens. Source lock and migration ledger pass. Exact-SHA Verify status is reported above. Publication scan and guarded main landing remain fleet duties; no scan result, main equality or Run site result is invented.

PROBE INTEGRATE-002 1: owner Settings connect -> 200; non-owner -> 403; exact-ID preview and reviewed attach -> one 201 activity; preparation GET -> saved Zoom metadata and unresolved ambiguous identity; real signed completion -> 200 on the same activity; replay -> 409; forged or stale -> 401; second deletion -> only its activity and open action cancelled; actual archive downloads/restores -> same activities, no credential and paused connection; native erasure/replay -> no attendee identity or recreated occurrence.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0, generated views restored from main; ledger=pnpm exec wrangler d1 migrations list DB --local --config wrangler.jsonc --persist-to /tmp/orbit-migration-probe exit=0.

Publication scan receipt: commit=974775b13604d9e299858ece3fdeb3dd1a115e9b complete=NOT_RUN historyScanned=NOT_RUN findings=NOT_RUN. Cloud branch push is explicitly exempt; the guarded fleet lander owns the complete scan before any landing. Candidate main equality=false. Exact-candidate Run site=NOT_RUN. Seven GitHub command invocations were used, within the ten-call budget; the run was discovered once, polled once after at least 300 seconds, and each failed job log was read once. No main push or PR bypass occurred.

## Remaining scope and plan return

The INTEGRATE-002 plan row gains the selected native Zoom limb; its formal status is unchanged and no DONE count is awarded. No other plan row or hold is changed. Live owner Zoom developer app qualification remains unproved. Acceptance 2's booked USD buyer walk stays with the final shipping named clause under RL-6 and the existing booking, account, consent and receiving-product prerequisites. Recording and transcript retrieval and transcript-backed recap remain CALL-002 and CALL-003, dependent on CALL-001 and the consent-policy ruling. Zoom creation and rescheduling remain omitted. TEAM-005 sales-role audiences retain their stated cleanup and new-main prerequisite. No new account request or hold release is made. All local commands finished and their owned browser and server processes closed before evidence publication. The pushed product clone is removed after the evidence transfer is verified; the actual packet remains outside it.

CLAIM INTEGRATE-002 PARTIAL points=1 tests=tests/core/today-brief.test.ts#INTEGRATE-002 BRIEF-004 RECORD-010 RECORD-017 RECORD-023 OUT-001 cited meeting plans, mention authority and Zoom lifecycle custody; tests/delegation-browser/today-brief.test.ts#INTEGRATE-002 BRIEF-001 BRIEF-002 BRIEF-003 BRIEF-004 BRIEF-005 RECORD-017 a seller plans meetings, reviews cited handoffs and opens permitted mentions at 1440 and 390

DEFAULT INTEGRATE-002: installation owner alone manages sealed Zoom credentials; full operators may explicitly review and attach; deny recording and transcript content retrieval and keep restored connections paused, within the brief's conservative floor.

GAP INTEGRATE-002: live Zoom qualification, acceptance 2 and its complete booked buyer walk, recording and transcript retrieval, transcript-backed recaps, Zoom creation and rescheduling, and TEAM-005 audience qualification remain held or unclaimed.

VERIFY_REPRODUCED {"head":"974775b13604d9e299858ece3fdeb3dd1a115e9b","job":"source and shared build 131062244357","command":"node scripts/verification-shard.mjs source","test":"node src/base/contract-docs.mjs check","exit":1,"failure":"ACCEPTANCE.md: generated content differs; run contract-docs write."}

The complete actual non-secret packet contains this report, PLAN.md, RECEIPTS.json, actual sanitized terminal logs, CI-RUNS.json, the local bootstrap allowance source, and ten screenshot artifacts. Only explicitly selected regular files are published to refs/heads/evidence/sd-orbit-c-f175. Logs omit runtime binding rows and credential fingerprint metadata; no credential, environment dump, private gate material, symlink or product evidence file is committed to the product branch.
