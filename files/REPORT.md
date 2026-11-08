# sd-orbit-c-f138 — OUT-026 retry timing

Scope: only acceptance 2's provider-throttle next-permitted-time limb for one native one-to-one message. OUT-026 remains PARTIAL. No acceptance text, Status cells, Gap cells, Evidence cells or held prerequisites will change.

Plan:
1. Map OUT-026 acceptance and the existing bounded-retry registration; inspect the service, Workbench history repository and routes.
2. Extend that registration through a separate focused helper. Create and approve exact saved content through authenticated Workbench. Use the configured native SendGrid adapter, replacing only its HTTP submission edge with one 429 followed by one acceptance.
3. Freshly GET the same unsent message from authenticated history. Advance the fixed clock to immediately before its returned future retryAfter and dispatch without submitting; dispatch at the returned time and read the same identity and provider receipt. Repeat dispatch to prove no additional submission. Preserve the five-attempt assertions and OUT-018 accounting scope.
4. Run the touched registration/file, typecheck and first-party checks; generate and check contract views, restore them from main, regenerate source lock last and check it. Inspect test count and unchanged contract judgments.
5. Update from main without rewriting published history, commit with fleet identity and hooks, inspect all candidate commits, push only the named product branch, discover exact-SHA Verify through REST, publish this report and actual receipts separately on the evidence ref. The fleet retains scanning and landing custody.

Unproved acceptance:
- Point 1: measured submission latencies at 25-user capacity. Manifest remains estimated-until-load-tested.
- Point 2: numeric provider-limit value and complete provider-throttle qualification; sequence-budget and mailbox-pace reasons and times. This round proves only the selected native timing limb.
- Point 3: every-user and mailbox usage under the complete 12-user mixed-transport morning.
- Real-provider qualification, Base relay single-To, sequence and mailbox-consent prerequisites and TEAM-005 cleanup prerequisites remain unchanged.

No UI changes are planned, so no changed-screen browser proof is applicable. No new policy default is needed. No DONE promotion or count change is claimed.

## Implementation and local results

Added `./tests/support/outreach-retry-timing.ts`, called unconditionally at `./tests/core/outreach-limits.test.ts:17` by the existing registration `OUT-006 BASE-OPS-004 transient rate limits stop after five attempts within one hour and notify once`. No registration was added, deleted, skipped or narrowed. The original five-attempt and single-notification assertions remain at line 16. The separate OUT-010 and OUT-018 budget case remains unchanged.

Inspected the full service, the Workbench history repository and its routes. Existing service behavior already meets the selected timing limb; no production correction was demonstrated or made. The new helper uses the real configured SendGrid adapter. Only its HTTP edge returns the synthetic 429 and subsequent 202 receipt. Draft creation, approval, authenticated history, persistence, due selection, claims and settlement use native code and migrated D1.

- Lines 42–58: create and read exact saved content, approve its revision through Workbench, observe one rejected provider submission with exact recipient, subject and body.
- Lines 59–74: freshly read the same unsent identity, rate-limit reason, absent acceptance receipt and future retryAfter through authenticated history; an unauthenticated read returns 401.
- Lines 75–85: dispatch one millisecond before the returned time without a submission, then at that time with exactly one retry carrying identical request bytes and delivery identity.
- Lines 86–102: read the same message's accepted state, provider receipt and acceptance time; repeat dispatch without another submission or message.

Initial touched-file run: all three tests pass, exit 0. Typecheck, first-party and boundaries checks pass, exit 0. Contract generator write and check both pass, exit 0; generated views were restored from main and committed neither. Final lock generation and integrity check pass, exit 0. The new helper was staged before lock generation and is included in the lock. No migration changed; ledger check is not applicable.

Fresh main advanced from `5766138b54403d4ad4588bf1a6e1795912dea83d` to `6d869cb48cbd6bcebb1566be460b49223e892bb6`. Rebased before the first product publication; its additions are unrelated agent-capacity tests and are preserved. No published history was rewritten. The first real commit was pushed immediately with fleet author and committer identity, hooks active, no coauthor trailers, and no subsequent product commits.

Candidate: `ae5c8f3fcf701c704938bc9a669d9e72c1509e1e`, branch `cloud/sd-orbit-c-f138`. Product push succeeded on attempt 1. Remote branch equality was read back. No PR is required by this repository's push Verify entry point; none was created.

Counts before and after: 36 DONE, 136 PARTIAL, 32 MISSING, 204 total. OUT-026 stays PARTIAL. Test budget before and after: 198 registrations plus two qualifications, total 200. No plan rows, contract text, Status, Gap, Evidence, generated counts, homepage or UI changed. All previous holds and prerequisites remain in force.

## Acceptance and inherited-duty coverage

| Item | Result on this candidate | Proof and boundary |
| --- | --- | --- |
| Acceptance 1: measured 25-user submission latencies before removing estimate | UNPROVED | No capacity journey was run; the manifest remains estimated-until-load-tested. |
| Acceptance 2: reasons, limit values and next permitted times for the named limits | PARTIAL | The existing retry registration invokes the new helper at line 17. Helper lines 50–102 prove only the selected provider-throttle timing limb for one native one-to-one message. Numeric provider-limit value, complete throttle qualification and sequence-budget and mailbox-pace reasons and times remain omitted. Existing one-to-one and shared-rate assertions remain intact. |
| Acceptance 3: own and administrator usage under the complete 12-user mixed morning | UNPROVED | Existing separate sender-budget assertions remain; complete mixed-transport morning and every mailbox's usage are unclaimed. |
| BASE-MAIL-001: truthful outcomes in this flow | MET FOR SELECTED LIMB | Helper lines 65–68 show scheduled and no receipt after 429; lines 91–94 show accepted only with the 202 provider receipt. Neither delivery nor human receipt is claimed. Broader Base qualification is unchanged. |
| BASE-ROLE-001: current authority | INSPECTED, NO EXPANSION CLAIM | All reads and approval use native session admission; helper line 74 attempts a missing-session read and requires 401. No authority implementation changes. Broad role matrix remains outside this selected point. |
| BASE-OPS-003: replay safety | MET FOR SELECTED LIMB | Identical retry envelope and delivery identity at line 85; same message inventory at line 87; later dispatches yield no submission at lines 97–101. Broader replay qualification is unchanged. |

## DONE-RIDERS review

No DONE claim is made. Each row is reviewed explicitly, without treating partial proof as whole-clause qualification.

| Rider | Result | Evidence or remaining qualification |
| --- | --- | --- |
| 1 | FAIL FOR DONE | Only the selected acceptance 2 limb is proved by the retry registration and helper lines 42–102; points 1 and 3 and the remaining limbs of point 2 remain unproved. |
| 2 | PASS FOR SELECTED LIMB | Populated native D1, exact wire content, refused early dispatch, receipt absent before acceptance, matching message after acceptance, and duplicate dispatch refusal; helper lines 42–102. |
| 3 | PENDING CI | Existing core discovery loads the file through `./scripts/verification-plan.mjs:82`; exact-SHA push Verify run 42479341040 was discovered in progress. Exact-head local runtime receipt is recorded separately. |
| 4 | PASS LOCAL | The relevant source bytes and test bytes are bound to the exact candidate by product-receipt.json and runtime-receipt.json. |
| 5 | PASS INSPECTED | OUT-026's existing meta line cites BASE-MAIL-001, BASE-ROLE-001 and BASE-OPS-003; it is unchanged. |
| 6 | PASS MECHANICAL, NO PROMOTION | Generator write and check pass; views restored from main. Full Status, Gap, Evidence and counts preserved byte for byte. Unproved scope is reported here for the lander. |
| 7 | PASS INSPECTED | No acceptance or contract edits; no ruling, coverage rewrite or duplicate rider was introduced. |
| 8 | NO NEW AUTHORITY, NO BROAD CLAIM | The selected flow has native authenticated approval and history plus a refused missing-session read. No permission code changed; broader role qualification is not awarded. |
| 9 | PASS BOUNDARY | Only a native network-edge fake is claimed. Real provider, mailbox and load qualification remain omitted. |
| 10 | NOT APPLICABLE | No new policy default, authority, custody or spending decision. |
| 11 | PENDING FLEET | Candidate is branch-only. Publication scan, landing, final main equality and candidate Run site are owned by the maintained lander. |

## Pre-handoff self-check

1. The selected behavior is asserted through native routes and the real provider adapter. Breaking the public retry time, dispatch eligibility, exact content, identity or receipt makes the named journey fail. Exact-SHA CI is reported separately, never inferred from another SHA.
2. No prior assertion was removed, narrowed or moved behind a condition. Only the unconditional helper invocation and helper were added.
3. No runtime authority, erasure or replay code changed. Missing-session history is refused; repeated dispatch of the accepted identity does not submit again. No broader revoked-credential or erased-person qualification is claimed.
4. No screens changed; browser screenshots and UI audits are not applicable to this test-only change.
5. Source lock is fresh. There are no new email-shaped literals in the helper; existing fixture literals were retained. Full-history publication scanning is not run in this cloud. Exact candidate scan fields: commit ae5c8f3fcf701c704938bc9a669d9e72c1509e1e, complete UNESTABLISHED, historyScanned UNESTABLISHED, findings UNESTABLISHED. Main is still the base rather than the candidate; candidate main equality and Run site remain pending fleet landing. Base main's successful Verify is 42477363510 and Run site is 42479134746, both on 6d869cb48cbd6bcebb1566be460b49223e892bb6; these are not candidate results.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0, restored from main; ledger=none exit=0.

CLAIM OUT-026 PARTIAL points=2 tests=tests/core/outreach-limits.test.ts#OUT-006 BASE-OPS-004 transient rate limits stop after five attempts within one hour and notify once
GAP OUT-026: Only acceptance 2's selected native provider-throttle timing limb is closed. Numeric provider-limit value, complete throttle qualification, sequence-budget and mailbox-pace reasons and times, measured 25-user latency, complete 12-user mixed-transport morning, every-user and mailbox usage and real-provider qualification remain omitted; all prior holds remain unchanged.

## Exact-head runtime receipt and CI

The exact candidate local run completed 2026-11-08T12:16:57.790998+00:00 with exit 0: 3 tests passed, 0 failed, 0 skipped. Command: `python3 /tmp/rer-reap.py pnpm exec tsx --test --test-concurrency=1 tests/core/outreach-limits.test.ts`. The actual receipt is runtime-receipt.json; exact output is exact-head-tests.log.

PROBE OUT-026 2: authenticated Workbench approval of one exact revision, SendGrid HTTP 429, fresh history GET -> message 01Q40FF280KV34RWTBH8NTXN41 scheduled with no receipt and retryAfter 2030-01-08T10:01:00.000Z; dispatch at 2030-01-08T10:00:59.999Z -> no further submission; dispatch at 2030-01-08T10:01:00.000Z -> one matching retry accepted with provider receipt synthetic-orbit-4; repeated dispatch -> no further submission.

Candidate push Verify 42479341040: in_progress at discovery, push event, head ae5c8f3fcf701c704938bc9a669d9e72c1509e1e. No green conclusion is claimed. The cloud brief directs prompt handoff to the maintained lander after the successful local proof. No dispatch, rerun, failed-job log request or PR was issued. GitHub REST calls used: two (base main and candidate discovery). No known real failure or product blocker. Scan and landing custody remain with the fleet.

Report and receipt publication uses only the evidence ref. The product branch carries no fleet evidence. Branch and manifest heads will be verified before clone cleanup.
