# sd-orbit-c-f125 report

Product branch: cloud/sd-orbit-c-f125
Full candidate: 4b4824919f577d175b0cdb64476d93d2d25f3b8c
Main at final fetch: 43497d9593cdf019042332a4bf8bae27f4004ede
Repository: just-every/run-orbit

BASE-AGENT-009 remains PARTIAL. Acceptance 6 is proven through the shipped agent-revocation action under autonomous and held policies. No separate deletion mechanism or broader qualification is claimed. Counts remain 36 DONE, 136 PARTIAL and 32 MISSING, 204 total. Suite remains 198 registered cases plus two qualification flows, 200 total.

## Plan and results

1. Configured fleet identity, refreshed the launcher, installed the bundle-reading Git credential helper, commit hook and push guard, and made a full-history clone of the declared repository. Fetched the prior continuation and created the named branch at the required pinned commit. No other repository was cloned or written.
2. Read repository instructions, product references, the complete target clause, its Status row and the inline plan, rulings and DONE riders. Inspected credentials.ts, admission.ts, person-doors.ts and audit.ts under ./src/base/modules/agent-door/. Business credentials establish the named sponsor and agent; admission refuses a revoked agent; the owner revoke action sets revoked without deleting history; audit readback retains persisted identities. No defect was demonstrated, so no production source was changed.
3. The pinned continuation already contains exactly the requested focused helper, ./tests/support/agent-door-audit-proof.ts. It is invoked by agentDoorProof at ./tests/support/agent-door-proof.ts:219, through the existing managed-owner registration at ./tests/core/managed-owner.test.ts:50. Reused it without a duplicate test, changed assertion or empty commit. No new product commit was created in this continuation; the proof commit 4b4824919f577d175b0cdb64476d93d2d25f3b8c is retained intact.
4. Installed frozen dependencies and completed native local setup. Ran the touched managed-owner test, typecheck, first-party check, contract generator write and check, source lock regeneration and integrity check. All passed. Generated views were restored from main and remain unmodified; source lock regeneration produced no drift. No migrations, UI screens, assertions, acceptance text, Status cells, Gap cells or Evidence cells changed.
5. Fetched main and ran the required identity-bound rebase immediately before the candidate push; it was already up to date. Main is the candidate's immediate parent. Checked all candidate author, committer and trailer fields, including all reachable side parents: one candidate commit, fleet identity, no trailers. Pushed only cloud/sd-orbit-c-f125 with the cloud push guard; first attempt succeeded.
6. Discovered exact-SHA Verify runs once using REST. Prior push Verify 42419849424 is completed and successful on this exact full SHA, on cloud/sd-orbit-c-f120. New push Verify 42422721321 on cloud/sd-orbit-c-f125 is in progress. No workflow dispatch or rerun and no PR were needed. Publication scanning, landing, main equality and Run site remain the guarded Mac lander's duties. Report and actual receipts are published only through the separate evidence ref.

## Focused proof

Test name: Managed owner claim verifies RER authority and creates the native owner/session exactly once
Test path: ./tests/core/managed-owner.test.ts:7, existing registration, passing exact candidate locally.
Detailed helper: ./tests/support/agent-door-audit-proof.ts:24–117.

| Rubric | Outcome | Evidence | Result |
| --- | --- | --- | --- |
| R1 | Distinct admitted Business agent performs a real native record update under both policies | Helper lines 24–51; MCP read and write, 200, saved company name and correct policy disposition | PASS |
| R2 | Audit has actual original identities, names, sponsor and attribution | Lines 53–73; two nonempty original rows, write decision identity, target and held review identity | PASS |
| R3 | Signed-in owner revokes the exact agent subject | Lines 75–77; native revoke route returns 200 and revoked true | PASS |
| R4 | Outstanding revoked token is refused and cannot change native state | Lines 78–83; same bearer, write returns 401, no result, complete company and timeline snapshots unchanged | PASS |
| R5 | Fresh requested and confirmed native owner sign-in can still read original audit history | Lines 85–116; only mail transport captured, 202 request, 303 confirmation, distinct cookie, correct owner, identical original rows, three total rows including refusal, retained revoked-agent and sponsor names | PASS |

PROBE BASE-AGENT-009 6: autonomous policy, native MCP update then signed-in owner revoke and fresh native owner sign-in -> update 200, two original audit rows retained exactly, revoked write 401 with unchanged native state, three rows including refusal, original agent and sponsor names and attribution retained.
PROBE BASE-AGENT-009 6: held policy, native MCP update then signed-in owner revoke and fresh native owner sign-in -> update 200 with review decision, two original audit rows retained exactly, revoked write 401 with unchanged native state, three rows including refusal, original agent and sponsor names and attribution retained.

## Acceptance sentence disposition

| Point | Disposition | Proof or retained gap |
| --- | --- | --- |
| 1 | Unclaimed complete-field proof | This journey checks write identity, agent, specialist, sponsor, label, tool, target and decision; broader complete-field and trace proof remains omitted. |
| 2 | Partial existing proof retained | Revoked-token refusal audit is asserted at helper lines 105–112; full refused, pending, unset and self-escalation matrix remains omitted. |
| 3 | Unclaimed | Fixture-week class and decision counts remain omitted. |
| 4 | Unclaimed | Full exact review feed, person marks and Undo qualification remains omitted. |
| 5 | Partial existing proof retained | Public agent filtering is used on nonempty history; complete filtering and export fields remain omitted. |
| 6 | Proven for the shipped revoke action | R1–R5 above; exact-SHA local managed-owner test passed; exact-SHA push Verify 42419849424 success. Separate deletion mechanisms remain outside this bounded claim. |
| 7 | Unclaimed | Existing screens and assertions unchanged. No new 1440 or 390 axe qualification; no UI change or browser proof is claimed. |
| Inherited BASE-OPS-005 | Scoped retention proof | Native write and audit actor are observed before and after authority withdrawal. This does not claim target erasure or broader Base conformance. |

## DONE riders and pre-ready check

The clause is intentionally PARTIAL. These are honest dispositions, not a DONE award.

| Rider | Result | Evidence |
| --- | --- | --- |
| 1 | FAIL for whole clause; PASS for selected point | Point 6 public-door journey above passes; other acceptance outcomes remain unclaimed. |
| 2 | PASS for selected point | Real populated read and write, explicit revoked-token refusal and unchanged native state, helper lines 42–83. |
| 3 | PASS exact SHA; new branch run pending | Verify 42419849424, push, success, exact 4b4824919f577d175b0cdb64476d93d2d25f3b8c; new branch push run 42422721321 in progress. Existing Verify inventory includes managed-owner. |
| 4 | PASS | Local run is on unchanged exact candidate; no source or test edit since the run. |
| 5 | INSPECTED, unchanged | Clause Requirement explicitly extends BASE-OPS-005; inherited duty not expanded. |
| 6 | PASS mechanics, judgment unchanged | Generator write: 0 documents; check: current. Status, full Gap, Evidence, provenance and counts remain main's bytes. |
| 7 | PASS | No acceptance change or contract rewrite. |
| 8 | PASS selected authority boundary | Allowed update completes; revoked credential is refused without native effects. |
| 9 | PASS bounded claim | No live provider, separate erasure, external legal retention or deletion qualification claimed. |
| 10 | PASS | No policy decision or new conservative default adopted. |
| 11 | PENDING guarded landing | Main is 43497d9593cdf019042332a4bf8bae27f4004ede; publication scan and exact-main Run site are not cloud receipts. No main push was made. |

Pre-ready: the chosen user-visible retention outcome and its unsafe control pass; no assertion was removed, narrowed or moved behind a condition. Revocation is tested; broader erasure and replay assertions remain unchanged rather than newly qualified. No touched screens. Source lock is fresh. Exact-SHA Verify 42419849424 is green; this run's Verify remains in progress. Full-history scan result: commit=4b4824919f577d175b0cdb64476d93d2d25f3b8c, complete=NOT RUN, historyScanned=NOT RUN, findings=NOT RUN in cloud. It is required of the lander. Main equality and Run site remain pending. No new fixture address literals or bare prose repository tokens were introduced in the product diff. There is no product blocker and no DONE promotion.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0; ledger=none exit=0

Plan rows changed: none. Existing queue entries, holds and release prerequisites remain unchanged. Expanded roles remain TEAM-005, held on ct cleanup landing and the resulting main. No follow-on clause was selected because the planner bounded this continuation to the retained-history point and explicitly held the broader qualification.

CLAIM BASE-AGENT-009 PARTIAL points=6 tests=tests/core/managed-owner.test.ts#Managed owner claim verifies RER authority and creates the native owner/session exactly once
GAP BASE-AGENT-009: Broader complete-field and trace proof, full decision matrices, fixture-week counts, full review feed and person marks and Undo, complete filtering and export, 1440 and 390 axe qualification and any separate deletion mechanism remain unclaimed; all existing holds and release prerequisites remain unchanged.
