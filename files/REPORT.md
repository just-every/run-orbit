# sd-orbit-c-f93 result

OPP-001: PARTIAL → PARTIAL. The planner-selected won-close reason persistence deficit is closed. No DONE award or hold release is claimed.

Repository: just-every/run-orbit.
Branch: cloud/sd-orbit-c-f93.
Candidate: 4ec6648812344d00172e50e7255346dccb84f835.
Starting and rebased main: 30f7a864d0a643fa020ea3eaa3d5325a112b872e.
PR: none required or created; Verify is triggered by push.
Exact-candidate Verify: 42194374549, event push, completed / failure.
Exact-candidate CI disposition: Verify 42194374549 completed with failure. Source job 127814045283 stopped at its first command, pnpm exec node src/base/contract-docs.mjs check, with the sole source-check error "ACCEPTANCE.md: generated content differs; run contract-docs write." The source candidate artifact was consequently absent; the aggregate job 127814305009 failed its required-upstream guard and the runtime shards were skipped. The source archive was read once using gh run view with --log-failed, exit 0. This is the cloud protocol's expressly permitted generated-view exception, not a full-green runtime receipt. No repair, workflow edit, dispatch or rerun was made. No DONE claim rests on these skipped runtime shards. Total GitHub calls: six of ten, including one historical source lookup and the current-main lookup.

Counts before and after: 36 DONE, 136 PARTIAL, 32 MISSING, 204 clauses.
Tests before and after: 198 registrations and two qualifications, total 200.

## Change and proof

Immediately after the existing authenticated won-close POST with reason Signed, the existing sanity journey now issues a fresh authenticated GET to the same opportunity and requires record.close_reason to equal Signed. The request helper checks HTTP 200 before reading the body. The assertion does not read the POST response or a locally constructed expected record.

Evidence: tests/core/signals-outreach.test.ts, registration "OUT-007 OUT-009 SEQUENCE-002 stage move, close and genuine reply end scheduled follow-up atomically; automatic reply and open report do not", lines 282 to 321, with the new readback at lines 310 and 311. Verify discovers this file in core-6 through the existing verification plan. No workflow changed.

The lifecycle route passes the submitted reason to the repository; the repository stores it in the same D1 batch as the lifecycle transition; the record-detail route reads durable state. The ordinary journey passes without a production correction, so routes.ts and repository.ts are unchanged.

The existing scheduled-send cancellation, explicit reopening, genuine-reply replay, late dispatch, no resend, first exit reason, single stop entry and outcome assertions are retained. No assertion was removed, narrowed, skipped or hidden by a width condition. No UI, provider, authority, erasure or queue-policy path changed, and reopening is not forced into NOW.

PROBE OPP-001 won-close reason: authenticated POST /api/v1/records/opportunity/:id/lifecycle with state won and reason Signed, followed immediately by authenticated GET /api/v1/records/opportunity/:id -> record.close_reason equals Signed.

The temporary negative probe replaced only the durable close_reason binding with NULL. The new assertion failed at line 311 with null !== Signed, process exit 1. The production source was restored byte for byte in a finally block and has no candidate diff. This was a one-off build probe, not a retained registration or a CI repair.

## Validation

- Selected native public-door journey on pinned Node 22.20.0: pass.
- Exact committed candidate native journey on pinned Node 22.20.0: pass.
- Whole touched file on inherited Node 24.19.0: 16 tests, 16 passed, 0 failed.
- Typecheck on pinned Node 22.20.0: pass.
- First-party RER check on pinned Node 22.20.0: pass.
- Test inventory: 198 registered cases plus two qualifications, unchanged.
- Parent Status rows: all 204 retained; 458 Markdown table rows before and after; no status change.
- Contract generator write and check: exit 0. Both generated views were restored whole from origin/main and are absent from the commit.
- Source lock regenerated last by the documented command; source and exact-candidate lock checks: exit 0.
- Git identities and trailers: every candidate commit, including all parents, inspected and approved before the guarded push.
- Product push: first attempt succeeded; remote cloud branch equals the full candidate SHA.
- Browser proof: not applicable because no screen or product UI changed.
- Migration ledger: not applicable because no migration changed.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0.

## Remaining scope and DONE riders

Lost-close reason, closing operator and time, later evidence keeping the deal closed, complete queue-membership and lifecycle-history reconciliation, and stage and owner preservation through reopening remain omitted. Existing queue rules continue to determine reopening eligibility. No clause-specific hold or broader plan prerequisite is released. TEAM-005 remains held under the supplied cleanup prerequisite. The remaining plan rows, notes and holds are unchanged. This report updates only the OPP-001 row's selected point; the original campaign is not rebuilt and no next campaign target is taken.

1. Full-clause journey coverage: unmet; the remaining outcomes above are not claimed. OPP-001 stays PARTIAL.
2. Real seeded outcome: selected point passes through native HTTP; the negative storage probe produces the distinct expected failure.
3. Exact-SHA Verify: generated-view-only failure, permitted for handing off this partial-point candidate; source job 127814045283 and aggregate job 127814305009. Runtime shards were skipped and do not establish full-clause proof.
4. Evidence freshness: selected candidate test bytes are unchanged since the local proof; an additional committed-head probe is recorded.
5. Inherited duty: existing BASE-INPUT-001 citation preserved; no duty rewrite.
6. Metadata: only selected won-reason deficit removed, missing operator, time and reopening preservation made explicit; acceptance text and status unchanged. Generated views checked locally and left to the lander.
7. Acceptance text: unchanged; no CT ruling needed for the evidence addition.
8. Authority: no new permission or dangerous path introduced; existing authenticated requests retained.
9. Provider boundary: no provider proof claimed or required by this selected native persistence point.
10. Policy default: none introduced.
11. Landing: pending the fleet's guarded lander, exact-source scan and main-only Run site; no landing or main equality claim.

Full-history cloud clone was used. No cloud publication scan was required by the supplied adaptation. COMPLETE scan with zero findings, guarded landing, main equality and Run site remain the fleet's duties and are not claimed here. No product blocker is known from the selected journey. This is a partial-point candidate only.

## Custody

The full plan, point report, test output, negative-probe receipt, mechanical receipt, identity audit, source hashes, counts, CI metadata and product push receipt are retained in this packet. They are published only through the separate evidence ref. Evidence transfer does not award DONE or signal product landing.
