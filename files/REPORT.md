# sd-orbit-c-f137 — OUT-018 retry accounting

Repository: just-every/run-orbit. Product branch: cloud/sd-orbit-c-f137.

## Scope and plan

The assignment leases only acceptance 1's existing single-recipient one-to-one count-once limb. OUT-018 remains PARTIAL. No acceptance sentence, Status, Gap, Evidence, hold, prerequisite or generated view is changed. Counts before and after are 36 DONE, 136 PARTIAL and 32 MISSING, 204 total. The test budget remains 198 registered cases plus two qualifications, total 200.

1. Read the full OUT-018 requirement, acceptance sentences and carried Status gap, the inline plan and rulings, DONE-RIDERS and repository authoring rules. Map the existing bounded-attempt, per-sender budget and next-claim assertions before extending them.
2. Inspect sending-limits.ts, service.ts, approval-repository.ts, Workbench routes, outreach-repository.ts and migration 0056. The budget view projects one row per saved message from the native and record-mail stores. Due retries update the original message's claim and attempt count, rather than inserting another budget row.
3. Extend the existing limits registration with a focused helper. Create a native Workbench draft, read its exact saved recipient and content, confirm its rendered review, preview and approve its future schedule. Use createOutboundMail with the configured SendGrid adapter; replace only global fetch at the SendGrid HTTP edge. Submit a 429, then a 202 with an accepted receipt through normal hosted timer dispatch.
4. Read authenticated Settings after scheduling, each attempt, repeated approval and subsequent timer invocations. Require usage 0 before dispatch, usage 1 after the 429 and still 1 after acceptance, with the other sender's nonzero usage and every other user's usage unchanged. Retain one saved message, exact content and delivery identity, two attempts, the next due time, and no extra submission after repeated approval.
5. Run the touched three-case file, typecheck, first-party check, contract generator write and check, test inventory and source lock regeneration and check. Restore both generated views. Fetch fresh main before the final commit; retain its newer judgments. Inspect all candidate identities and trailers and push through the fleet guard.
6. Discover exact-head Verify with the REST API. Publish this report and actual non-secret receipts only on the evidence ref. The maintained fleet owns scanning, exact-SHA branch Verify, guarded landing and Run site qualification.

## Implementation and initial feedback

The only intended product-tree changes are tests/core/outreach-limits.test.ts, tests/support/outreach-retry-accounting.ts and the regenerated sources.lock.json. No runtime correction or additive migration was justified. All existing assertions remain intact, including the five-attempt bound, next-claim budget change, shared-rate deferral, sender isolation and unsubscribe stop paths. No new test registration was added.

The first local execution reached accepted retry and all Settings accounting assertions, then exposed an error in the new helper: it read custom_args inside a personalization. The configured adapter emits custom_args and headers at message level. The helper was corrected to assert that actual wire shape; no runtime behavior or existing assertion was changed. The actual first-run log is retained as initial-helper.log. Final results are recorded below after the final rerun.

## Acceptance coverage and held remainder

- Acceptance 1, selected count-once limb: tests/core/outreach-limits.test.ts — OUT-010 OUT-018 one user's volume never consumes another's budget and every deferral names its limit; delegated to proveRetryAccounting in tests/support/outreach-retry-accounting.ts. It traverses native creation, draft read, rendered review, schedule preview, approval, hosted timers, message readback and authenticated Settings. The supported retry completes; unsafe duplicate approval is refused with 409 and no extra effect.
- Acceptance 1, other limbs: separate sequence budgets and administration, sequence independence from one-to-one mail, multi-recipient counting, provider recipient limits, team administration and full transport qualification remain unclaimed.
- Acceptance 2: the SDR-50 sequence-isolation journey remains unclaimed. SEQUENCE-001, SEQUENCE-003 and AUTO-001 prerequisites, OUT-013 owner-consented mailbox sending and TEAM-005's cleanup hold remain unchanged.
- Inherited duties: BASE-MAIL-001, BASE-ROLE-001 and BASE-OPS-003 remain explicitly cited in OUT-018. This round proves only truthful scheduled versus accepted readback and duplicate suppression within the selected limb. It does not qualify the whole inherited duty set or a real recipient receipt.

## DONE-RIDERS assessment

1. PARTIAL: the selected limb is reached through public routes and transport; the held acceptance outcomes are not claimed.
2. Selected limb locally exercised: a populated other sender, exact saved data, real configured adapter, one accepted retry and refused repeated approval. Broader clause remains partial.
3. Pending exact-head Verify. Existing push Verify loads the touched registration via the existing core test partition; no workflow was edited.
4. Final local test and typecheck receipts bind the final relevant test bytes. Candidate identity is recorded in RECEIPT.json; any final main drift is recorded below.
5. INSPECTED: the receiving clause already cites BASE-MAIL-001, BASE-ROLE-001 and BASE-OPS-003. No citation was added or removed.
6. Generator write and check locally pass; generated views are restored from origin/main and are not committed. Carried Status and Gap are preserved, not awarded or narrowed.
7. INSPECTED: no acceptance text, rider, coverage map or ruling changed.
8. Existing owner-only budget-administration refusal remains; the new duplicate approval is refused and changes neither submission count nor budget use. Complete TEAM-005 authority qualification remains held.
9. Network-edge proof only. A provider's accepted HTTP receipt does not prove mailbox delivery or a person's receipt. Live provider and mailbox qualification remain unclaimed.
10. No policy choice or new default was introduced.
11. Guarded landing pending. The cloud does not claim main equality, a completed publication scan or candidate Run site success.

## Pre-READY self-check

The selected user-visible accounting behavior is checked through authenticated Settings, message readback and the real adapter. Existing tests and assertions were neither removed nor narrowed. No new runtime door, authority grant, capture replay, erasure behavior or screen was changed. Screen sizing, tooltips and browser proof are not applicable to this test-only extension. No credential or environment value is included in this packet; the synthetic adapter configuration is test data. New fixture address construction introduces no literal email-shaped string. Repository-wide publication hygiene remains the fleet scanner's duty, rather than a cloud claim.

Exact-source publication scan: NOT RUN in cloud; complete, historyScanned and findings are unestablished and must be recorded by the maintained fleet. Main equality and candidate Run site: pending guarded landing. Main at clone time was 5766138b54403d4ad4588bf1a6e1795912dea83d; its push Verify 42476775501 and Run site 42476775394 were completed successfully, as retained in main-ci.json.

## Plan disposition

Only the OUT-018 selected count-once continuation is returned as proved on successful local qualification. OUT-018 remains PARTIAL to PARTIAL; all other plan rows and holds remain unchanged. No scope expansion, ct promotion, release or second clause is requested.

## Selected public-door probe

PROBE OUT-018 1: Native Workbench creation, rendered review and scheduled approval, then hosted due dispatch with SendGrid HTTP 429 followed by HTTP 202 -> one saved message; authenticated Settings usage 0 before dispatch, 1 after refusal and 1 after acceptance; every other user's usage unchanged; repeated approval returns 409, early timer dispatch makes no request and accepted-message timer replay keeps the total at two requests. This observation is established by the passing registration and its committed assertions, rather than a live-provider claim.

Proof locations: tests/core/outreach-limits.test.ts:19 invokes the existing registration and :46 calls the focused helper. In tests/support/outreach-retry-accounting.ts, :31 reads Settings, :36 compares sender and all other users, :42 replaces only the HTTP edge, :50 creates the draft, :53 reads its rendered review, :55 confirms it, :60 approves the reviewed schedule, :72 dispatches the first attempt, :74 requires one unit, :78 rejects repeated approval, :79 refuses an early retry, :80 dispatches the due retry, :82 keeps usage at one, :84 retains delivery identity and increments attempts, :85 requires exact wire equality and :91–93 refuse duplicate approval and further submission after acceptance.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0 (no migration changed). The final lock is regenerated after the last source edit. No generated view or CONTRACT.md cell is staged.

## Main integration and local results

Fresh main advanced to 6d869cb48cbd6bcebb1566be460b49223e892bb6 during work. The unpublished branch was updated to it before the candidate commit. Its unrelated managed-owner and agent-door test additions were preserved. CONTRACT.md and both generated views are byte-for-byte equal to that main. No product history was rewritten after publication.

The complete touched file passed all three registrations after integration (outreach-limits.log). Final representation-only cleanup gives API path strings explicit leading slashes and constructs standard MIME labels without bare prose slash tokens; it changes no request value or assertion strength. The selected registration is run once more against those final bytes (retry-accounting-final.log). Typecheck and first-party checks pass. Generator write and check pass, both generated views are restored, and source-lock write and check pass. Test inventory remains 198 plus two qualifications. There are no runtime repairs, added migrations, UI changes, deleted tests or narrowed existing assertions.

## Terminal product provenance

Full candidate SHA: daf0a697d35bf4250bcdbef1bd394b6e6fbcf742. Branch: cloud/sd-orbit-c-f137. Product push succeeded on attempt 1 and the remote ref was read back at this exact SHA. No PR is required because Verify has a push entry point.

Exact-candidate Verify: run 42479905857, event push, status in_progress, conclusion None. URL: https://github.com/just-every/run-orbit/actions/runs/42479905857. This is a discovery receipt, not a green-CI claim. No workflow was dispatched or rerun, and no CI repair was attempted. Two GitHub REST calls were used: one for initial main and one for the candidate. Per the cloud handoff rule, the maintained fleet waits for this exact run and performs scanning and landing.

The final selected registration passed one test with zero failures on the exact committed helper bytes. The complete three-case file passed with zero failures immediately before the representation-only route-string cleanup; its original bounded-attempt and unsubscribe cases are unchanged. Final typecheck passed after the cleanup and main integration. Sources are clean and locked. The no-op pre-push rebase changed no source bytes.

CLAIM OUT-018 PARTIAL points=1 tests=tests/core/outreach-limits.test.ts#OUT-010 OUT-018 one user's volume never consumes another's budget and every deferral names its limit

GAP OUT-018: Separate sequence budgets and administration, sequence independence from one-to-one mail, multi-recipient counting and provider recipient limits, SDR-50 sequence isolation, team administration and complete declared-team and transport qualification remain unclaimed; every existing hold and prerequisite remains unchanged.

Transport log product-push.log retains the actual command, attempt and success response; credential fingerprint metadata is omitted. Full reports and receipt files are published only to the evidence ref. The product clone is removed after successful transfer and remote-head verification, while this packet remains under the fleet work directory.
