# sd-orbit-c-f154 report

BASE-AGENT-002 remains PARTIAL. The selected acceptance 5 slice is existing manual draft creation and editing. There is no whole-clause completion claim, count change, policy default, hold release or new provider authority.

The supplied continuation head was `12b016db68a798982a9ac6bbe4c02c47f2f9c1e6`. It already implemented action-specific normalization in `src/core/features/drafts/input.ts`, reused by the existing native creation and editing routes and MCP adapters. This round reproduced the former raw-content behavior through authenticated native HTTP and MCP, restored the implementation, and extended its retained parity journey to prove the distinct transport limits remain intact. No additional normalization defect was found.

The new assertions cover both native creation routes at their trimmed limits, refusal above those limits, raw MCP creation and editing ceilings, whitespace-only edit refusal with unchanged state, accepted boundary editing with equal native state, and the native edit action's existing lack of length ceilings. No production limit, recipient rule, deal rule, authority, runtime source, UI, workflow or contract judgment was changed by this round. The product branch includes the supplied predecessor's normalization implementation and its established public-door registrations.

Counts before and after: 42 DONE, 130 PARTIAL, 32 MISSING, 204 total. Test budget before and after: 198 registered cases plus two qualifications, 200 total. No assertion or registration was removed, skipped, narrowed or hidden behind a condition. Plan rows changed: none. This report returns the selected BASE-AGENT-002 point; all other listed queue entries remain held.

## Regression reproduction

A temporary uncommitted adapter variant restored the prior creation behavior, passing the original subject and body strings straight to the existing native repository. The same accepted padded input went through authenticated native HTTP and `/mcp`. Native storage contained `Synthetic padded proposal` and `Hello buyer.` with its interior paragraph spacing. MCP storage retained the leading and trailing whitespace. The public-door equality assertion failed with exit 1 and quoted the raw subject versus the trimmed subject (`normalization-before.log`). Restoring the shared normalizer made the identical probe pass with exit 0 (`normalization-after.log`). The temporary source change and test were removed. Its actual probe source is retained separately as `normalization-probe.ts`. No failing source variant was committed or built into the candidate.

## Scope rubric and acceptance mapping

The permanent native proof is `tests/support/agent-door-draft-parity-proof.ts` → `agentDoorDraftParityProof`, loaded by `tests/core/managed-owner.test.ts` → “Managed owner claim verifies RER authority and creates the native owner and session exactly once; company text cannot change MCP classification; stalled risks agree across policy and native doors”.

The permanent browser proof is the same support file → `draftParityBrowserJourney`, loaded by `tests/delegation-browser/today-brief.test.ts` → “BRIEF-001 BRIEF-002 BRIEF-003 BRIEF-004 BRIEF-005 RECORD-017 a seller starts the day from the brief, plans a meeting, reviews an agent handoff and a colleague opens a mention that keeps its entry in view, in the browser at 1440 and 390”. Existing Verify discovers these registrations; no new registration or workflow is introduced.

| Item | Result and evidence |
| --- | --- |
| R1: Same accepted creation input through native HTTP and MCP | Native proof lines 38–46: equal normalized subject, body, recipient email, recipient contact, opportunity, revision and stale state under autonomous and held-standard policies. |
| R2: Same accepted editing input through both doors | Lines 65–71: equal saved state, revision 2, preserved interior whitespace and truthful preparer attribution under both policies. |
| R3: Native event parity and attribution | Lines 73–80: exactly `draft.created` and `draft.updated` in native timeline and audit, sponsor identity retained and agent activity distinctly attributed. |
| R4: Linked held-standard reviews | Lines 47–60 and 72: correct decision and review identity, native target, exact normalized saved content and agent acting for the sponsor. Browser lines 178–197 show the native saved draft and populated review, mark it reviewed, and reread the unchanged draft. |
| R5: Replay and stale refusal | Lines 62–64 and 82–88: replay returns the retained outcome with no additional draft, revision or event; stale edit is refused by both doors and changes no witnessed native inventory. |
| R6: Existing input boundaries retained | Lines 94–135: native trim-before-limit on both creation routes, raw MCP ceilings, whitespace-only refusals, identical accepted boundary editing and the existing native edit limits. |
| R7: Authority remains current | Lines 134–144: missing scope, blocked policy and revoked-agent replay are refused with unchanged native effects. |
| R8: No outbound effects | Lines 24–25, 90 and 144: both outbound stores unchanged and zero configured provider effects; browser line 198 retains the preexisting message inventory. |
| R9: Native screens | Browser lines 179–197: populated saved draft and linked review shown at 1440 and 390, assertions at 1440, real review control exercised. Four PNG files retained and visually inspected. |

| Full acceptance sentence | Disposition |
| --- | --- |
| 1: Complete Core coverage or non-tool reasons | Unclaimed. Full Core coverage remains an existing gap. |
| 2: Every fixture result validates its output schema | Unclaimed. All-fixture schema qualification remains an existing gap. |
| 3: Complete truthful read-only, destructive and open-world annotations | Unclaimed. Complete annotation qualification remains an existing gap. |
| 4: Same refusal code for each UI action and tool | Unclaimed as a whole. The selected stale refusal is exercised, but complete refusal-code parity remains an existing gap. |
| 5: Same state and audit event type | Selected manual draft creation and editing slice proved by R1–R9. Other native jobs' state and event parity remain unclaimed. |
| 6: Embedded agents use the same tools in audit | Unclaimed. Existing embedded-agent qualification remains unchanged. |

## DONE riders

No DONE claim is made. Rows below distinguish the selected slice from the whole clause.

| Rider | Result |
| --- | --- |
| 1 | FAIL for whole-clause DONE: acceptance 1–4 and 6 and other jobs in 5 remain unproved. Selected slice R1–R9 is covered by the retained public-door journeys. |
| 2 | PASS for selected slice: populated native state is compared, allowed work completes, stale, blocked, scope and revoked paths are refused without native effects (native proof lines 38–144). |
| 3 | Exact final Verify receipt is recorded below; no earlier SHA's green is claimed for the final candidate. Both permanent registrations remain in existing Verify discovery. |
| 4 | Local proof uses final source and test bytes. The commit changes only those already-tested bytes and the generated source lock. Browser function and runtime bytes are unchanged since the recorded browser run. |
| 5 | INSPECTED: no receiving clause or inherited duty is changed. Existing draft tools retain OUT-001 and ACTION-005 references; preparation is not customer-send approval. |
| 6 | PASS mechanically: contract write and check succeed, source judgment rows and counts are untouched. Existing broader provenance and Gap remain main's property. |
| 7 | PASS: no acceptance sentence, coverage map, ruling, Status, Gap or Evidence cell is edited. |
| 8 | PASS for selected slice: current native authentication, MCP scope, blocked policy, revoked authority and stale revision fences remain active; no authority is widened. Broader roles are unclaimed. |
| 9 | PASS boundary: zero provider calls in selected native proof; no live mailbox, customer-message approval, provider dispatch or legal boundary is claimed. |
| 10 | NOT APPLICABLE: no new policy default, custody choice, spending permission or consent decision. |
| 11 | PENDING guarded landing: cloud does not land main or run the fleet publication scan. Main equality, final scan and final Run site belong to the maintained lander. |

| Inherited duty | Selected-scope evidence |
| --- | --- |
| Native validation and authority | Both adapters retain existing native repositories and service; only action content normalization is shared. R6 and R7 prove retained input and authority boundaries. |
| Exact reviewed-send boundary, OUT-001 and ACTION-005 | R8 proves preparation and review marking produce no outbound message. Real agent customer-message approval and dispatch remain omitted. |
| Replay, revision and truthful actor | R3–R5 and R7 retain one native effect, current revision, linked reviews and agent acting for sponsor attribution. |
| Erasure | No erasure source is edited. The existing managed-owner registration retains business-roster and agent-artifact erasure journeys; no new erasure completeness claim is made. |

## Browser inspection and pre-ready self-check

The populated draft and review screenshots show saved normalized content, recipient, native opportunity link, revision 2 and agent acting for the sponsor at 1440 and 390. The existing review control records a review without sending or rewriting the draft. Labels and content remain legible, the form has complete rounded borders, the disclosure controls have text labels and the phone navigation says Menu. No new icon-only control, configuration location, design, copy pin or count pin is introduced. No UI source was changed.

The selected behavior has public-door assertions; the regression probe demonstrates the core equality assertion fails when raw storage returns. Existing assertions remain. Scope, blocked-policy, revoked-agent, replay and stale paths have no native effects. Broader erasure safeguards remain in the unchanged enclosing registration. Source lock is generated last. Cloud publication scan and exact-main landing receipts are unestablished here and are not represented as complete. No new fixture contains a literal email address or provider-shaped key. The changed-text inspection found no added bare repository-shaped prose token.

## Remaining scope and holds

GAP BASE-AGENT-002: Full Core coverage and non-tool reasons, all-fixture output schemas, complete annotations, refusal-code parity, other jobs' native-state and event parity, and embedded-agent audit use remain unclaimed. Acceptance 5 is claimed only for existing manual draft preparation and editing. Real agent customer-message approval and dispatch remain omitted under OUT-001; OUT-013 owner consent, OUT-019 Base and Platform relay recipient support, SEQUENCE-001 and SEQUENCE-003, and AUTO-001 prerequisites remain unchanged.

Live SURFACE-001 and SURFACE-007, TEAM-001's strategy model trial r41, TEAM-005's ct cleanup and resulting new-main dependency, RECORD-018's migration-inheritance and ct prerequisite, all provider, account, consent and receiving-door holds, every existing queue entry, note, continuation hold and release prerequisite remain unchanged. No next clause is opened or re-sorted.

## Mechanical, execution and publication receipts

Final provenance and actual command exits are appended after execution. The complete plan is `PLAN.md`. Actual logs, images and command receipts are selected explicitly for the separate evidence ref. Credentials, environment dumps, setup secrets, private gate material and symlinks are excluded.

PROBE BASE-AGENT-002 5: identical accepted whitespace-padded manual draft creation and editing through authenticated native HTTP and MCP, under autonomous and held-standard policies -> normalized saved subject and body, same recipient, relationship and revision, matching native event types, linked truthful review and attribution, replay without another native effect, stale refusal and zero provider effects. The new boundary assertions additionally use both native creation routes and refuse MCP input exceeding its existing raw transport bounds.

The supplied continuation's push Verify `43101418941` completed successfully at SHA `12b016db68a798982a9ac6bbe4c02c47f2f9c1e6`. This establishes the earlier registration's CI result, not the extended final candidate's result. The starting main SHA `b3e94efdc16e4ae467cd2ed283ee4eb0dc4c0c31` has successful push Verify `43089571350` and Run site `43094710902`; an additional Verify `43094710689` failed on the same SHA. Both facts are retained in `main-ci.jsonl` without claiming that the failed duplicate was green.

The extended native parity helper completed all selected assertions and emitted `transportLimitsRetained=true`, `nativeCreateDoors=2`, `replayEffects=0`, `staleEffects=0` and `providerCalls=0` under both policies. The enclosing registration then completed its existing capacity and erasure checks and passed with one test, zero failures and exit 0.


Final product branch: `cloud/sd-orbit-c-f154`. Full head: `ecd95760764af8d529587fd51df2b5fdc19156c6`. Product push succeeded on the first guarded attempt and the remote ref was independently read back at the same SHA. The final commit is not marked to skip CI. No PR was created; Verify has a branch-push entry point.

Exact-final Verify: push run **43107128141**, status **in_progress**, conclusion unset, head `ecd95760764af8d529587fd51df2b5fdc19156c6`. This is the only final-SHA discovery call. The candidate is not claimed CI-green. Four GitHub API calls were used in total; no workflow dispatch or rerun was needed. The maintained cloud landing route takes the pushed candidate and waits for exact-SHA CI on the fleet side.

Local gates: extended native registration PASS (one test, exit 0, 561297 ms); emitted browser registration PASS (one test, exit 0, 176669 ms); typecheck PASS; first-party check PASS; build PASS. The prior raw adapter probe failed as expected (exit 1), and its normalized counterpart passed (exit 0). Test inventory remains 198 cases plus two qualifications. Command logs and their hashes are in `local-receipts.json`.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock, then check exit=0; views=node src/base/contract-docs.mjs write, then check exit=0; ledger=none exit=0.

Both generated view files were restored from origin main before commit. CONTRACT.md has no candidate diff, including every Status, Gap and Evidence cell. A fresh fetch and rebase immediately before the push reported the branch up to date. The source lock was regenerated last and its check passed again on the committed head. All four candidate commits, including side parents, have fleet authors and committers and no co-author trailers; `identity-audit.txt` contains the actual messages and inspection result. No source or test edit followed the passing proof.

Publication scan at `ecd95760764af8d529587fd51df2b5fdc19156c6`: complete=UNESTABLISHED, historyScanned=UNESTABLISHED, findings=UNESTABLISHED. A cloud-side scan is not required by this brief; the fleet must run the complete full-history scan before landing. Main equality is false here: origin main remains `b3e94efdc16e4ae467cd2ed283ee4eb0dc4c0c31`. Final-candidate Run site is not run in cloud; its workflow runs on main after guarded landing. No main push or landing is claimed. Rider 11 remains pending; rider 3 has a running final Verify rather than a green receipt.

CLAIM BASE-AGENT-002 PARTIAL points=5 tests=tests/support/agent-door-draft-parity-proof.ts#agentDoorDraftParityProof; tests/support/agent-door-draft-parity-proof.ts#draftParityBrowserJourney

No implementation blocker remains for the selected manual draft parity slice. All broader acceptance and previously declared holds remain. The full clause remains PARTIAL and counts stay unchanged. The report packet is transported separately to the evidence branch; evidence publication is not product readiness, acceptance or landing.
