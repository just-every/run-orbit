# Orbit continuation sd-orbit-c-f179-pc1

Repository: just-every/run-orbit. Product branch: cloud/sd-orbit-c-f179-pc1.
Starting head: 816aea662699ca8b0ed2e559c116078ef57f02d0. Preserve all published commits and fix forward only.

Plan:
1. Read the saved mailbox implementation, contract, current archive handling and failed Verify 43320028360 (batch-0 job 131539756426 and batch-5 job 131539756536).
2. Reproduce the exact failed batch commands with Node 22.20.0, prebuilt app, push tier and journeys enabled, before editing.
3. Correct demonstrated historical archive restore defects while preserving source inventory validation, native owner additions, immutable message history and paused send authority.
4. Run the failed batches again and touched mailbox send, provider outcome, sending limit and signal checks, plus typecheck and first-party checks. No new registered cases and no assertion removal.
5. Generate and check contract views, restore generated views from main, merge current main without rewriting published history, regenerate source lock last, inspect every candidate identity and trailer, and push only the named branch through the fleet push guard.
6. Discover exact-head Verify through REST, report its actual result within the API budget, publish this complete non-secret report packet on the separate evidence ref, and hand custody to the fleet. Do not push main.

Scope: OUT-013 selected native single-recipient provider send limb. The full acceptance point also requires owner-consented real provider Sent and genuine recipient reply proof. Those external proofs, attachments, multiple recipients, provider-thread replies, sequence execution, provider quota qualification and all inherited holds remain unclaimed. No Status, Gap, Evidence or acceptance text edits are planned. No plan rows or counts are changed.

Initial CI failures:
- batch-0: onboarding archive restore fails NOT NULL on outbound_messages.mailbox_submission_claimed while restoring the legacy source.
- batch-5: immutable accepted-main archive import rejects a complete historical source inventory.

GitHub API budget: 3 logical calls used initially (jobs plus one archive log read for each failed shard). No direct blob download.

Current contract counts (unchanged): 42 DONE, 130 PARTIAL, 32 MISSING, 204 total. Test budget: 198 registered cases plus two qualification flows, total 200. OUT-013 remains MISSING in the source judgment; the builder claim is PARTIAL for the native implementation, with no full acceptance point awarded.

Provider boundary found in the saved implementation: Google send authorization and delivery are implemented. Microsoft send authorization is refused before OAuth because the requested Graph draft-creation flow requires Mail.ReadWrite, while this brief permits adding only Mail.Send. The saved default remains deny by default with no scope widening. The Microsoft journey asserts refusal and zero send authority; it does not prove Microsoft delivery. No Graph send success is claimed.

Frozen repair rubric:
- R1: A complete immutable accepted-main archive imports through authenticated Records and survives restart and re-export, preserving its owner-defined tables and columns.
- R2: Historical outgoing messages restore with the additive mailbox defaults, without creating mailbox credentials or send authority; restored scheduled work stays cancelled.
- R3: Current message provenance and submission-claim history survive export and restore; no automatic resend is introduced.
- R4: Malformed source inventory remains refused before an import job is created; no arbitrary missing tables or columns become accepted.
- R5: Existing Gmail authorization, bound exact review, one submission, reply capture, revocation, timeout reconciliation, mailbox deferral, suppression and erasure journey stays passing. Microsoft refusal remains explicit.
- R6: Existing registered assertions and test count remain intact; typecheck, first-party checks, contract generation and source lock are checked after the final edit.
- R7: Existing consent and send-as browser screens are exercised at 1440 and 390; this repair adds no screen or design.
- R8: Final candidate preserves published history, has exact-head Verify success, and leaves scanning, Run site, status judgments and landing to the fleet.

VERIFY_REPRODUCED {"head": "816aea662699ca8b0ed2e559c116078ef57f02d0", "job": "shards (batch-5)", "job_id": 131539756536, "run": 43320028360, "command": "ORBIT_VERIFY_PREBUILT=1 ORBIT_VERIFY_JOURNEYS=1 ORBIT_VERIFY_TIER=push node scripts/verification-batch.mjs '[\"fold-accepted-main\"]'", "test": "newtests/t096/archive-lineage-accepted-main.test.ts#authenticated immutable native accepted-main archive preserves its complete 100-table baseline across fold restore, restart and re-export", "exit": 1, "failure": "Native authenticated POST /imports: 400 {\"error\":\"Archive inventory does not match a complete supported source generation.\"}"}

DONE-RIDERS assessment for this PARTIAL claim (final verification results follow below):
1. UNMET-EXTERNAL: full acceptance 1 needs owner-consented Gmail and Microsoft Sent plus a real recipient reply; Microsoft delivery is also unimplemented under the permitted scopes. No complete point is awarded.
2. Native dangerous-path proof: existing capture-providers registration covers allowed Gmail submission and refused missing, unsolicited, calendar-only and revoked authority; final runtime result is recorded below.
3. Exact candidate Verify is required for custody. Full provider acceptance remains unclaimed regardless of its outcome.
4. Archive repair proofs are rerun after edits; browser source and screens are unchanged by this continuation and are exercised on the candidate.
5. INSPECTED: OUT-013 cites BASE-MAIL-001, BASE-ROLE-001 and BASE-OPS-003. No inheritance text is changed.
6. Mechanical only: preserve main's Status, Gap, Evidence, generated views and counts. Generate and check views locally, restore them, and regenerate the source lock last.
7. PASS by unchanged contract diff: no acceptance sentence or Status row changes, no scope narrowing and no rewritten obligation.
8. Native authority refusals remain in the public-door provider journey; no widened mailbox or installation authority is introduced by adding archive defaults.
9. Full live-provider proof is not claimed. The owner-consent, Graph scope, attachment, multiple-recipient, sequence, tracking, account-limit and team boundaries remain named.
10. No new consent or authority default is awarded. The saved Microsoft deny-by-default boundary is retained pending a permission decision.
11. PENDING FLEET: product branch only. Main equality, COMPLETE full-history publication scan with zero findings and Run site belong to the guarded lander. No cloud scan or landing is claimed.

Inherited duties and acceptance scope:
- OUT-013 acceptance 1 (connect both real providers, review, send, Sent and genuine reply, revoke and timeout): PARTIAL native Gmail HTTP proof; UNMET-EXTERNAL for live account proof and UNMET for Microsoft create-then-send under the narrow grant.
- BASE-MAIL-001: native Gmail accepted versus unknown and genuine captured reply assertions remain; real delivery is not inferred from acceptance.
- BASE-ROLE-001: current native source ownership, review binding and revoked authority are checked by the existing provider journey. TEAM-005's broader roles remain held.
- BASE-OPS-003: concurrent approval, replay, no resend after uncertainty and captured reply deduplication remain asserted in the existing provider journey.
- OUT-014: exact rendered signature snapshot remains asserted; attachments remain RECORD-018's held scope.
- OUT-020 and OUT-029: existing single-recipient opt-out capability, per-person suppression and erasure proof is retained; no new award to either clause.
- OUT-018 and OUT-024: mailbox-local Retry-After deferral is native proof only; published account-type limits, full usage administration and provider qualification stay held.
- OUT-019, OUT-016, SEQUENCE-001, SEQUENCE-002, OUT-017, OUT-023, SURFACE-009 and OUT-001: the brief's named recipient-list, thread, tracking, enrollment, provider-reply and agent-message remainders remain unchanged.

VERIFY_REPRODUCED {"head": "816aea662699ca8b0ed2e559c116078ef57f02d0", "job": "shards (batch-0)", "job_id": 131539756426, "run": 43320028360, "command": "ORBIT_VERIFY_PREBUILT=1 ORBIT_VERIFY_JOURNEYS=1 ORBIT_VERIFY_TIER=push node scripts/verification-batch.mjs '[\"core-5\"]'", "test": "tests/core/onboarding-archive.test.ts#API-002 credentials stay local while DATA-001 local archive restores records and keeps the hosted owner able to sign in by mail without reviving sessions", "exit": 1, "failure": "NOT NULL constraint failed: outbound_messages.mailbox_submission_claimed; POST records/archive/imports/<job>/finalize: 500 Archive operation failed. The operation remains resumable; no completion was confirmed."}

Both original failed batches exited 1 before any source edit. Current-main immutable accepted-main archive comparison passed. Repair round 1 applies only the mailbox migration defaults after source validation and reconstructs the exact pre-mailbox V2 inventory. Current row values take precedence over defaults, preserving submission claims and provider provenance. No source schema, acceptance, workflow or authority grant is changed.

Save custody: e130ff766253c5a35cf7684dac5e058de78c0248 pushed through cloud-push.py on attempt 1, with [skip ci]. All seven candidate commits, including side parents, have fleet author and committer and no trailers. Typecheck, first-party, lock and source check exit 0.

The combined main control hit its 20-minute command timeout after its immutable accepted-main case passed; onboarding was still running and showed no assertion failure. Its main onboarding case is therefore run alone with a 40-minute command bound, rather than attributing that combined timeout to the product. Corrected archive batches get bounds appropriate to the full restore after the previously early failure. No assertion or threshold is changed.

Pending proof additions are preserved in assertions.patch: the existing historical restore case checks null mailbox provenance, an unclaimed submission and no send authorization; the current Gmail restore case checks that its completed submission claim stays set. These extend existing public-door flows and add no registrations.

Main control pin: 267fa4d246666bf4eb119f612663c939601f1339. The full immutable accepted-main case passed in 824181 ms. The separately bounded onboarding comparison remains active.

Repair proof locations: src/core/features/outreach/mailbox/archive.ts#upgradeMailboxArchiveRecord; src/core/features/records/archive-fold-validation.ts#validateFoldManifest; src/core/features/records/archive-import.ts#upload. Runtime proof uses tests/core/onboarding-archive.test.ts (historical migration defaults and no authority), newtests/t096/archive-lineage-accepted-main.test.ts (complete immutable source restore and repeated export), and tests/core/capture-providers.test.ts with tests/support/mailbox-send-proof.ts (current submission claim retained after restore). Actual file hashes for this tested working tree are in tested-files.json.

Main onboarding comparison result: {"command": "pnpm exec tsx --test --no-test-only --test-concurrency=1 tests/core/onboarding-archive.test.ts", "exit": 1, "head": "267fa4d246666bf4eb119f612663c939601f1339", "test": "tests/core/onboarding-archive.test.ts", "failure": "spawnSync Node ETIMEDOUT in isolatedDatabase at tests/core/onboarding-archive.test.ts:115; Wrangler local migration subprocess exceeded its existing 60000 ms startup limit", "classification": "local fixture startup; distinct from the reproduced candidate NOT NULL failure", "action": "no product or test threshold change; no further main rerun"}. The comparison passed its historical restore loops and reached the subsequent local archive fixture before this startup timeout. This is not the error from the original CI: the original candidate constraint failure was independently reproduced before edits and remains a real repair. The fixture startup threshold is unchanged.

Local execution adjustment: overlapping fixture-heavy programs caused multiple roughly 60000 ms fixture-startup failures, including the independent main control. The outreach program process group 12831 was stopped explicitly (only this task's process group) to stop repeating startup failures while archive checks drain. No code, test assertion, startup threshold or product behavior was changed. Completed native cases remain recorded; the outreach command will be run serially after the archive programs finish. This is an execution-environment retry, not a second product repair.
