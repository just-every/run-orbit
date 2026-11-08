# sd-orbit-c-f129 — Orbit native-agent revocation qualification

Repository: https://github.com/just-every/run-orbit
Branch: cloud/sd-orbit-c-f129
Starting candidate: cc690e5e27d6f63613b78eb7e502be0fe61d6a42

The supplied starting commit already contains the requested focused helper and transport ordering correction. This continuation qualifies that implementation rather than adding a duplicate product edit or an empty commit. No clause is promoted to DONE. BASE-AGENT-004 remains PARTIAL.

## Plan and scope

1. Read the supplied campaign extract, builder rules, DONE riders and rulings, then the seed guidance and target clause. Map the existing managed-owner journey to the selected native revocation limb.
2. Inspect admission.ts, execution.ts, person-doors.ts, the Orbit adapter and transport.ts. Confirm the native revoked identity check precedes both handshake success returns and that copied-source origins are retained.
3. Run the existing journey on the supplied candidate. Temporarily restore the old early-return ordering and run the same public-door journey to reproduce the unsafe success. Restore the committed implementation without retaining the temporary mutation.
4. Run the touched journey and typecheck, first-party check, contract generation and check. Restore generated views from current main. Regenerate the source lock last and check freshness.
5. Update from main without rewriting published history or changing any contract judgment. Inspect all candidate identities and trailers, then publish only the named product branch with the fleet guard.
6. Discover exact-SHA Verify through REST, publish this explicit non-secret packet to the separate evidence ref, verify custody, and remove the pushed scratch clone.

Only acceptance 6's native-agent revocation limb for MCP initialize and server/discover is selected. No additional clause is taken: the supplied campaign retains the other holds and explicitly requires this clause first. TEAM-005 remains held on CT's contract cleanup and resulting new main. No policy default, new acceptance point, contract judgment, queue order or hold is changed.

## Product behavior and proof

The inherited correction moves admission and its native revoked-agent refusal ahead of the two transport success returns. Policy revocation checks remain in place. Tool calls keep their existing admission and pipeline behavior. The exact upstream revision and comparison bytes remain in base-copies.json and the source lock; the local transport adaptation has its acknowledged digest.

One existing registration invokes the proof:
tests/core/managed-owner.test.ts — Managed owner claim verifies RER authority and creates the native owner/session exactly once
It calls agentDoorProof from tests/support/agent-door-proof.ts, which calls agentDoorRevocationProof from tests/support/agent-door-revocation-proof.ts.

The helper:
- creates distinct target and control Business agent identities for each of autonomous and held policies;
- admits both through an actual native company read, and successfully negotiates both methods before revocation;
- refuses an unauthenticated revocation request, then uses the signed-in owner's exact-identity revocation endpoint;
- reads the native agent roster to establish the exact target is revoked and the control is still admitted;
- attempts initialize and server/discover with both the retained token and a newly signed token for that same identity;
- requires 401, the exact resource_metadata challenge, an Unauthorized error and no result;
- requires the separate control agent to continue succeeding;
- compares digests of all 276 other native tables before and after, normalizing only session last-seen activity. The admission table is excluded because admission counting and revocation deliberately change it.

This is a public-door security journey using real native persistence and signed Business tokens, not a mock of authorization or of the revocation route.

## Acceptance map and frozen scope

| Acceptance | Result for this continuation | Evidence and remaining qualification |
| --- | --- | --- |
| 1 | Existing assertions retained; full point unclaimed | agent-door-proof.ts reads protected metadata. Full trusted-server and scope matrices remain omitted. |
| 2 | Existing assertions retained; full point unclaimed | agent-door-proof.ts tests a valid Business read, unmapped subject and wrong audience. Actual sibling-seed audience proof remains omitted. |
| 3 | Unclaimed | Expiration and lifetime matrix remains omitted. |
| 4 | Existing assertion retained; full point unclaimed | agent-door-proof.ts refuses a reduced-scope read. Full write and aggregate challenge matrix remains omitted. |
| 5 | Unclaimed | Query-token refusal and log nonretention qualification remains omitted. |
| 6 | Selected native limb proven; full point unclaimed | agent-door-revocation-proof.ts lines 30–65 covers both policies, exact native identity revocation, retained and fresh tokens, both selected methods, challenge, no result, positive control and unchanged effects. Complete seed and Business consent revocation, timing and every-method coverage remain omitted. |
| 7 | Unclaimed | Unpairing, native sign-in and broader identity, device and role qualification remain omitted. |

## DONE riders

These rows are recorded to prevent the selected limb being mistaken for full-clause DONE.

| Rider | Result | Evidence |
| --- | --- | --- |
| 1 | PASS for selected limb; FAIL for full clause | Public-door helper lines 30–65; omitted outcomes listed above. |
| 2 | PASS for selected limb | Real populated company read at lines 35–38, permitted handshakes at 41–44, revocation refusals and successful independent control at 46–62, unchanged native table digests at 64. Old ordering is tested separately and must fail. |
| 3 | PASS on supplied exact SHA | Verify 42426050372, push event, completed success on cc690e5e27d6f63613b78eb7e502be0fe61d6a42. The existing Verify core partition loads managed-owner.test.ts. Final branch discovery is recorded separately. |
| 4 | PASS when final source equals the tested source | Exact hashes and local command receipts are recorded separately. Any final main integration is qualified before publication. |
| 5 | INSPECTED | BASE-AGENT-004 is the Base duty being tested, not a new receiving clause. No inheritance text changes. |
| 6 | Mechanical check recorded separately; no judgment edit | Contract generator write and check followed by restoration of generated views from main; Status, Gap and Evidence stay main's. |
| 7 | PASS | No acceptance, ruling, coverage map or provenance origin is changed by this continuation. |
| 8 | PASS for selected authority path; full clause unclaimed | Missing-session revocation refused; owner revokes exact identity; refused agent cannot regain handshake access with a fresh token. Native effects unchanged. |
| 9 | PASS for honest boundary | No live provider, device or full Business consent qualification claimed. |
| 10 | PASS | No new policy default is adopted. |
| 11 | PENDING fleet landing | No main push, scan, main equality or Run site claim. Fleet must perform its exact-SHA publication scan and guarded landing. |

## Pre-ready self-check

1. Selected behavior is exercised in both directions and the original ordering is restored temporarily to demonstrate that the journey rejects the unsafe behavior. Complete clause acceptance remains unclaimed.
2. No assertion is removed, narrowed or hidden behind a condition. No test registration is added. Suite remains 198 registrations plus two qualification flows, total 200.
3. Revocation is exercised with retained and fresh credentials and unchanged native records and effects. Unrelated erasure and capture replay paths are not changed and receive no new claim.
4. No screen or control changes; browser widths and tooltip work are not applicable to this transport-only continuation.
5. Exact-SHA Verify, lock and mechanical receipts are recorded separately. Publication scanning and Run site are fleet duties; this cloud does not claim to have performed them. No new product fixture, email literal, provider-shaped key or bare prose repository token is introduced.

## Counts and disposition

Before and after: 36 DONE, 136 PARTIAL, 32 MISSING; 204 clause rows.
Before and after: 198 test registrations plus two qualification flows; 200 total.
BASE-AGENT-004: PARTIAL → PARTIAL. No count change or hold release.
Plan rows changed: none. Report the native revocation limb as qualified; preserve every existing remainder and TEAM-005 prerequisite.
No PR is required by this repository's push Verify entry point.

## Actual results and custody

Final product head: cc690e5e27d6f63613b78eb7e502be0fe61d6a42.
Product branch: cloud/sd-orbit-c-f129.
The final fetch and rebase reported the branch already up to date; main was 43497d9593cdf019042332a4bf8bae27f4004ede. No commit was rewritten or created in this continuation. The named branch push succeeded on attempt 1 and its advertised ref was checked against the full SHA.

The untouched supplied fix was already green in Verify 42426050372 (push on cloud/sd-orbit-c-f126, completed success). All 20 runtime shard jobs and the source job passed; their job IDs and step conclusions are in ci-initial-jobs.json. The existing core-1 partition includes managed-owner.test.ts. The new named-branch push started Verify 42428239921, push event, same exact SHA; the final discovery observed it in progress. No workflow was dispatched or rerun and no green from another SHA is used. Three GitHub API calls were used. No PR was opened.

Actual local results:
- Setup completed with exit 0; private setup output is excluded.
- Initial managed-owner journey passed with one registration.
- Restoring the old early-return ordering temporarily made that same registration fail with exit 1: "autonomous retained initialize refuses the next call after native revocation", "200 !== 401". ordering-reproduction.log and ordering-reproduction.json retain the actual failure. This was an intentional regression reproduction, not a failed Verify repair. The committed transport was restored in a finally block and its bytes were checked.
- Final managed-owner journey passed on the candidate with pinned Node 22.20.0: one test, one pass, zero failures. Both policy receipts report 401 for retained and fresh credentials, 200 for the independent control, no success result for the revoked agent and 276 unchanged native tables.
- Typecheck, first-party, contract write, contract check, source lock regeneration, lock check and test inventory all exited 0.
- Contract write reported "Wrote 0 contract documents." and check reported "Contract documents are current." Both generated views were explicitly restored from main. Lock regeneration left no source change.
- Full-history clone, clean index and working tree, copied-source adaptation digest, all candidate author and committer identities and complete trailer messages were checked. CONTRACT.md differs from main by zero bytes; all 204 parent Status rows remain.
- No migration changed, so the migration-ledger check is not applicable.
- No UI changed, so no new browser screenshot or screen qualification is claimed.
- No local publication scan or Run site was performed. scan-custody.json explicitly records commit, complete=null, historyScanned=null, findings=null and the fleet responsibility. Main equality, a COMPLETE scan with zero findings, final branch Verify and exact-main Run site remain the guarded lander's work.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock, then check exit=0; views=node src/base/contract-docs.mjs write, then check, then git checkout origin/main -- ACCEPTANCE.md docs/CLAIMS.md exit=0; ledger=none exit=0.

PROBE BASE-AGENT-004 6: autonomous policy, signed Business target and control admitted through native company reads; signed-in owner POST to the exact target revoke door -> 200; retained and fresh target tokens for initialize and server/discover -> 401 with resource_metadata and no result; control -> 200; 276 native tables unchanged.
PROBE BASE-AGENT-004 6: held policy, independent signed Business target and control admitted through native company reads; signed-in owner POST to the exact target revoke door -> 200; retained and fresh target tokens for initialize and server/discover -> 401 with resource_metadata and no result; control -> 200; 276 native tables unchanged.

No blocker exists for the selected native limb. No broader qualification, live provider boundary, existing hold or release prerequisite is retired. The only product change relative to main is the inherited five-file commit supplied by this assignment; this continuation adds no product edit, test, contract text or empty commit.

CLAIM BASE-AGENT-004 PARTIAL points=6 tests=tests/core/managed-owner.test.ts#Managed owner claim verifies RER authority and creates the native owner/session exactly once
GAP BASE-AGENT-004: Only acceptance 6's native-agent revocation limb for initialize and server/discover is qualified. Full metadata and scope matrices, actual sibling audience, expiration and lifetime, query-token log nonretention, complete seed and Business consent revocation with timing and every-method coverage, unpairing and native sign-in, and broader identity, device and role qualification remain unclaimed. All holds, queue entries and TEAM-005's cleanup prerequisite remain unchanged.
