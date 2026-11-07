# sd-orbit-c-f120 results

BASE-AGENT-009 remains PARTIAL. The selected acceptance 6 behavior is proven through the shipped agent revocation action under autonomous and held company policies. No runtime defect was demonstrated, so runtime source is unchanged.

Repository: just-every/run-orbit
Branch: cloud/sd-orbit-c-f120
Candidate: 4b4824919f577d175b0cdb64476d93d2d25f3b8c
Base main observed before publication: 43497d9593cdf019042332a4bf8bae27f4004ede
Product push: successful, first attempt. No pull request was needed; push is a Verify entry point.
Verify: push run 42419849424 completed SUCCESS on the exact candidate. Its source job and all twenty shard jobs succeeded; the final aggregate completed at 22:35:55 UTC on 7 November 2026. No rerun or workflow dispatch was used. The completed result was observed at 22:37 UTC.
Counts before and after: 36 DONE, 136 PARTIAL, 32 MISSING, 204 total.
Test budget before and after: 198 registrations plus two qualification flows, 200 total.

## Plan and execution

The full actual plan is retained in PLAN.json. Read the supplied campaign extract, ruling index, Orbit ruling and DONE riders. Read the target clause and its existing Status judgment, and map the existing managed-owner registration to the selected point. Inspect credential verification, admitted-agent persistence, the owner revocation route and audit projection. Add a focused helper through the existing native-door proof, run only the touched registration plus typecheck and first-party checks, preserve the contract and generated views, regenerate and check the source lock last, integrate current main before publication, check candidate identities, push the named branch, inspect exact-head CI, and return the explicit evidence packet separately.

All implementation work in that plan is complete. The public-door proof is loaded by the existing test named “Managed owner claim verifies RER authority and creates the native owner/session exactly once” at ./tests/core/managed-owner.test.ts:7 and :50. That registration already invokes agentDoorProof. Its new helper call is at ./tests/support/agent-door-proof.ts:219. No registration was added, removed, skipped or narrowed. No existing assertion was removed or changed. No campaign row, hold, prerequisite, contract sentence, Status cell, Gap cell, Evidence cell, homepage or workflow was changed.

The only product-branch files changed are ./tests/support/agent-door-audit-proof.ts, ./tests/support/agent-door-proof.ts and ./sources.lock.json. All fleet reports and receipts are outside that branch.

## Native result and inspection

The new helper at ./tests/support/agent-door-audit-proof.ts:8 uses the native MCP transport and the real edition migrations and D1 repositories. For each policy it signs a fresh Business credential for a distinct synthetic agent with an act.sub unrelated to the other fixture agents, reads an existing company, updates its name at the current revision, and checks the stored native result. It captures populated audit rows through the authenticated owner audit endpoint. It checks the exact agent identity, name and specialist, sponsor identity and name, attribution label, tool, native resource and completed write identity. Held policy produces the expected standard review receipt; autonomous policy completes autonomously.

It posts the admitted agent's act.sub to the shipped owner revocation endpoint. Reusing the very same outstanding Business token is refused with HTTP 401 and no result; complete native company and timeline inventories remain unchanged. It then requests the owner's own email link, replacing only the mail transport, confirms the link by POST, verifies the distinct issued cookie resolves to the same native owner, and reads the filtered audit history using that new cookie. Every original row is compared by its saved identity and full contents. The additional refused attempt must have its own correctly attributed audit row. The Agents endpoint must still show the revoked agent, its name and its sponsoring person's name.

Inspected source:
- ./src/base/modules/agent-door/credentials.ts authenticates the signed Business token and resolves its current native sponsor.
- ./src/base/modules/agent-door/admission.ts records the admitted identity and retains its sponsor and names while refusing a revoked admission.
- ./src/base/modules/agent-door/person-doors.ts restricts the revoke action to a signed-in owner and marks the stored agent revoked.
- ./src/base/modules/agent-door/audit.ts projects retained audit content without dropping rows merely because the agent is revoked.

No demonstrated production defect required a correction. An initial development assertion compared the entire audit page before and after a deliberately refused call; it failed because that refusal correctly appended an audit row and advanced the cursor. The final assertion requires all original full rows plus that correctly attributed refused row. The actual initial failure is retained in test-development-failure.log. This was development of the new test, not a CI repair or a change to a pre-existing assertion.

## Acceptance proof register

| Acceptance sentence | Scope and result | Proof |
| --- | --- | --- |
| 1. One write leaves a complete audit row. | Existing assertions retained; broad complete-field and trace qualification unclaimed. The selected write is real and its original full returned row is retained. | ./tests/support/agent-door-audit-proof.ts:42 and :58; ./tests/support/agent-door-proof.ts unchanged native write assertions. |
| 2. Refused, pending, unset and self-escalation calls are audited. | Full matrix unclaimed. The new revoked attempt is refused without native effects and retains its own attributed refusal audit. | ./tests/support/agent-door-audit-proof.ts:75 and :105. |
| 3. Agents counts equal the fixture week's rows by class and decision. | Omitted by this lease; not newly qualified. | Existing tests preserved. |
| 4. Exact review feed, person review mark and reversible Undo. | Broader qualification omitted; a held standard write's legitimate review identity is retained. | ./tests/support/agent-door-audit-proof.ts:73; existing review assertions preserved. |
| 5. Filtering by agent or class and complete export fields. | Full point unclaimed. Only the selected agent-filtered audit read is exercised for retained history. | ./tests/support/agent-door-audit-proof.ts:53. |
| 6. Removing the agent keeps its rows and its name. | Selected behavior PASS locally under autonomous and held policy through the shipped revocation action; fresh native owner sign-in retains original row identities, names and attribution, with revoked-token refusal. | ./tests/support/agent-door-audit-proof.ts:21 to :117 through ./tests/core/managed-owner.test.ts, named registration above. Exact-head Verify core-1 loads this registration. |
| 7. Agents page at both viewports with no serious or critical axe findings. | Omitted by this lease. No screen was changed and no new browser or axe qualification is claimed. | Existing browser assertions preserved. |
| Inherited BASE-OPS-005 audit duty | Full inherited qualification unclaimed; the selected native history and attribution duty is exercised. | New populated audit and refusal path above; all existing assertions retained. |

## DONE riders

This is a PARTIAL claim. No DONE award, release or count change is requested.

| Rider | Result against the selected candidate | Evidence or remaining boundary |
| --- | --- | --- |
| 1 | PARTIAL for the whole clause; selected point passes locally | Populated native update, owner revocation and fresh-session history read. Other acceptance outcomes remain unqualified as specified above. |
| 2 | PASS for selected point | Real seeded company changes through MCP; the unsafe revoked-token call is 401 and changes neither company nor timeline inventory. |
| 3 | PASS for selected point on exact-head CI | Verify push run 42419849424 SUCCESS; core-1 loads the managed-owner registration in batch-3, job 128546305721 SUCCESS. All twenty runtime shards ran and succeeded; light mode was skipped. |
| 4 | PASS local source binding | The passing touched run used identical relevant source and test bytes to the candidate; only lock generation and commit followed. RECEIPT.json records candidate file hashes. |
| 5 | INSPECTED, no receiving duty changed | The existing clause explicitly extends BASE-OPS-005; no inherited requirement was rewritten or newly claimed. |
| 6 | PASS mechanical; judgment preserved | Contract generation wrote zero documents, its check passed, generated views restored from main, and every Status judgment and count retained. |
| 7 | PASS | No acceptance text or coverage map was changed. |
| 8 | PASS for selected point | Native owner performs revoke; the very same outstanding Business credential then fails without native effects. Existing non-owner and token authority assertions are retained. |
| 9 | PASS boundary honesty | No live provider, separate deletion mechanism, legal retention, fixture-week or complete export qualification claimed. |
| 10 | PASS, not applicable | No new policy choice or default was adopted; both existing company policies are used. |
| 11 | PENDING fleet custody | Candidate remains branch-only. Main equality, exact-main Run site and complete full-history publication scan belong to the guarded lander; no landing is claimed. |

## Local checks and probes

The touched native test passed: one registration, zero failures, approximately 168.5 seconds. The final typecheck and first-party check pass. Contract generation and check pass. Source lock generation and check pass after the new helper was staged, with the new helper included in the lock. No migration changed, so a migration-ledger check is not applicable. Actual output is retained in the selected log files and RECEIPT.json.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0; ledger=none exit=0

PROBE BASE-AGENT-009 6: autonomous Business MCP orbit.records.update -> 200 and saved native name; signed-in owner revoke -> 200; outstanding token update -> 401 with unchanged native company and timeline inventories; fresh native owner email-link confirmation -> distinct owner cookie; authenticated agent-filtered audit -> both original rows unchanged, names and attribution retained, plus one attributed refusal row.
PROBE BASE-AGENT-009 6: held Business MCP orbit.records.update -> 200 under standard review and saved native name; signed-in owner revoke -> 200; outstanding token update -> 401 with unchanged native company and timeline inventories; fresh native owner email-link confirmation -> distinct owner cookie; authenticated agent-filtered audit -> both original rows unchanged, names and attribution retained, plus one attributed refusal row.

## Pre-handoff checks and limits

1. The selected allowed and refused paths have populated public-door assertions and the exact-head push Verify is green. Removing retained rows, changing original names or attribution, accepting the revoked credential, or failing the native write makes this journey fail. Full-clause qualification remains unclaimed.
2. No existing assertion or registration was deleted, weakened or hidden behind a condition.
3. The selected revoked credential is proved unable to write. Existing erasure and replay assertions remain; no new broad erasure or replay matrix or separate deletion mechanism is claimed.
4. No screen or UI control changed. The explicitly omitted viewport and axe qualification remains omitted.
5. Source lock is fresh. All candidate authors and committers use the fleet identity, with no trailers. New helper source contains no email literal, provider-shaped key or new prose slash token. Authentication keys and generated sign-in links are neither persisted in the packet nor exposed by it.

Exact candidate publication scan: commit=4b4824919f577d175b0cdb64476d93d2d25f3b8c; status=NOT_RUN_CLOUD; complete=unestablished; historyScanned=unestablished; findings=unestablished. The cloud adaptation assigns this scan to the fleet lander. No scan completion or zero-finding claim is made.
Observed main was 43497d9593cdf019042332a4bf8bae27f4004ede, distinct from the candidate. Initial main Run site 42418271336 was success; main Verify 42418271312 was still running when read. Candidate Run site is not expected before landing.

Broader complete-field and trace coverage; refused, pending, unset and self-escalation matrices; fixture-week counts; exact review feed, person marks and Undo; complete filtering and export fields; viewport and axe qualification; and any separate deletion mechanism remain omitted or retain existing assertions. Expanded roles retain TEAM-005's existing hold on the ct cleanup and new main. No queue line, hold, release prerequisite or ct ruling was changed. No policy default was needed. No dependency blocks the selected native point.

The campaign result to record is BASE-AGENT-009 PARTIAL to PARTIAL, selected acceptance 6 history proof added, counts unchanged and no hold released. No other plan row was changed. Product readiness, evidence transfer and landing are separate custody steps.

CLAIM BASE-AGENT-009 PARTIAL points=6 tests=tests/core/managed-owner.test.ts#Managed owner claim verifies RER authority and creates the native owner/session exactly once
GAP BASE-AGENT-009: Full-clause audit, review, filtering, export and viewport qualification remains omitted by the lease; all existing holds and prerequisites remain unchanged.

## Terminal CI and custody

Exact-head push Verify 42419849424 is completed and successful on 4b4824919f577d175b0cdb64476d93d2d25f3b8c. The touched registration is in core-1, batch-3, job 128546305721, completed SUCCESS. Source and shared build job 128545804574 succeeded. All twenty shard jobs and the aggregate Verify job succeeded. Seven explicit repository API calls were used, with one watcher and at least 300 seconds between observations of this run. No failed job needed log access or repair.

Product branch custody is PUSHED and ready for the fleet gates. Evidence is returned through the separate report-only ref. Publication scanning, main equality, final status bookkeeping, guarded landing and exact-main Run site remain with the fleet. No product, account, ruling or selected-point blocker remains. No default was adopted and no hold was released.
