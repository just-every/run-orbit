# sd-orbit-c-f153 — manual draft parity

Repo: https://github.com/just-every/run-orbit
Branch: cloud/sd-orbit-c-f153
Candidate: 12b016db68a798982a9ac6bbe4c02c47f2f9c1e6. Exact-SHA push Verify 43101418941 is in progress; no green CI or landing is claimed.

BASE-AGENT-002 remains PARTIAL. The selected manual creation and editing slice of acceptance 5 is implemented. No Core completion, whole-clause completion or hold release is claimed. CONTRACT.md, its Status cells and acceptance text are unchanged. Counts remain 42 DONE, 130 PARTIAL, 32 MISSING, 204 total; tests remain 198 registrations plus two qualifications.

## Plan and result

The complete execution plan is in PLAN.md. All campaign rows, holds, notes and prerequisites from the supplied extract remain unchanged. The only proposed plan-row update is to record the manual draft normalization result for BASE-AGENT-002; its formal state stays PARTIAL.

The original native HTTP creation accepted padded subject and body and saved trimmed content. The authenticated MCP creation accepted the identical input but saved its outer whitespace. The reproduction log records unequal content with the same recipient contact, recipient address, opportunity and revision. Editing used the same inconsistent adapter pattern on inspection.

A focused shared input module now supplies the native action-specific content rules to the existing manual creation and edit routes and the MCP adapters. The adapters still call RecordMailRepository and DraftsService under their existing native authority and revision fences. Both adapters normalize outer whitespace and preserve interior newlines and indentation. Linked held reviews display the normalized content actually saved.

Existing ceilings are preserved: native creation trims before its existing subject and body checks; native editing retains its absence of a length ceiling; MCP retains its raw transport ceilings before normalization. Whitespace-only content is refused. No recipient, deal, authority, send-approval or provider behavior is added. No migrations, dependency pins, workflow definitions, homepage content or product UI are changed.

The existing managed-owner registration exercises authenticated native HTTP and signed MCP creation and editing under autonomous and held-standard policy. It checks saved content, recipient, opportunity, revision, native timeline and audit types, agent and sponsor attribution, linked reviews containing exact saved content, replay with a fresh RPC identity, stale refusal, transport ceilings, insufficient scope, policy blocking, revoked replay, unchanged native inventories on refusal, and zero outbound and provider effects.

The existing emitted browser registration also loads draftParityBrowserJourney. It creates and edits real saved drafts through both doors, opens the populated draft and linked held review, verifies recipient, normalized content, attribution, opportunity link and revision, marks the review and checks that the saved draft and outbound inventory stay unchanged. Assertions run at 1440; screenshots show each scoped populated state at 1440 and 390. The initial focused emitted browser probe passed, and all four images were visually inspected. The complete existing browser registration passed after the final browser assertions, with one registration passed and zero failures. Its four final manual draft and review screenshots were inspected at both widths.

No existing assertion was removed, narrowed or conditioned on width. The shared browser fixture's optional bearer scope retains its existing default. No registrations were added or removed. No copy, count, hash or version pin test was introduced.

## Proof map

| Acceptance sentence | Result in this round | Public-door proof |
| --- | --- | --- |
| 1. Every Core clause has tools or a permitted non-tool reason | UNCLAIMED | Existing coverage retained; complete coverage omitted by the brief. |
| 2. Every fixture result validates against its output schema | UNCLAIMED | Existing schema checks retained; all-fixture qualification omitted. |
| 3. Truthful read, destructive and external annotations | UNCLAIMED | Existing declarations unchanged; complete annotation qualification omitted. |
| 4. UI and tool refusal codes agree | UNCLAIMED as a complete point | The scoped stale fence is exercised; broad refusal-code parity remains omitted. |
| 5. UI and tool give the same record state and audit type | MET for manual draft creation and editing only | tests/core/managed-owner.test.ts invokes agentDoorDraftParityProof in tests/support/agent-door-draft-parity-proof.ts; tests/delegation-browser/today-brief.test.ts invokes draftParityBrowserJourney from that same helper. |
| 6. Embedded agents are audited as the same tools | UNCLAIMED | Existing assertions retained; embedded-agent audit qualification omitted. |

The native registration is named “Managed owner claim verifies RER authority and creates the native owner and session exactly once; company text cannot change MCP classification; stalled risks agree across policy and native doors”. The browser registration is named “BRIEF-001 BRIEF-002 BRIEF-003 BRIEF-004 BRIEF-005 RECORD-017 a seller starts the day from the brief, plans a meeting, reviews an agent handoff and a colleague opens a mention that keeps its entry in view, in the browser at 1440 and 390”. Exact line locations and final run results are recorded in RECEIPT.json.

## DONE riders, checked without claiming DONE

| Rider | Result | Evidence or boundary |
| --- | --- | --- |
| 1 | PARTIAL overall; scoped manual outcomes covered | The parity sanity flow reaches creation, editing, replay, stale refusal and linked review on populated records; other clause outcomes remain omitted. |
| 2 | MET for the selected slice | Reproduction fails on original content drift; supported writes and refused unsafe requests compare populated native state. |
| 3 | PENDING exact-final Verify | Both existing registrations are loaded by the unchanged Verify discovery and plan. Final run identity and conclusion belong in the receipt. |
| 4 | MET locally for relevant source, pending final CI | Final qualification uses the changed source; no product source changed after the successful emitted probe. |
| 5 | INSPECTED; no new inheritance claim | The round implements a slice of BASE-AGENT-002 itself and changes no receiving clause or acceptance text. |
| 6 | MET mechanically; judgments unchanged | Contract generation write and check pass. Generated files are restored from main. Status, Gap and Evidence remain main's text. |
| 7 | MET | No acceptance, ruling, coverage-map or clause-id rewrite. |
| 8 | MET for the selected authority boundary | Existing native authority stays in place; insufficient scope, policy refusal and revoked replay leave saved draft state unchanged. |
| 9 | MET boundary disclosure | No real customer message is approved or dispatched. No live-provider qualification is claimed. |
| 10 | MET; no new policy | Existing autonomous and held-standard dispositions are used. No conservative-default ruling or authority expansion is needed. |
| 11 | PENDING guarded landing | Main equality, exact-final Verify, publication scan and exact-main Run site remain fleet responsibilities. No landing is claimed. |

## Pre-ready self-check

The selected user-visible behavior has public-door assertions, including an observed failure before the normalization fix. Existing assertions remain intact. Scope, policy, revision and revoked-replay refusal paths preserve state. Existing erasure and authority journeys remain in the managed-owner registration; no erasure behavior is changed or newly claimed.

Populated native draft and review screens were inspected at both widths. Scoped controls have text labels; no icon-only control was added. Text remains readable, fields retain full borders, and no configuration or navigation design changes were made. New source contains zero email-shaped literals; synthetic addresses are constructed in fixtures. This is a changed-source hygiene check, not a full publication scan.

No cloud publication scan is run. Scan receipt: commit=12b016db68a798982a9ac6bbe4c02c47f2f9c1e6; complete=NOT RUN; historyScanned=NOT RUN; findings=NOT ESTABLISHED. The fleet must run the complete full-history scan, exact-SHA Verify and its guarded landing contract. Main is not advanced from this cloud.

## Local harness and observed failures

The VM took longer than the existing 60-second migration fixture deadline. The initial Node 24 attempt and a pinned Node 22 retry both failed in isolatedDatabase before any product assertion. Local setup completed all migrations successfully. Local runtime proof therefore uses a VM-only preloader that permits 180 seconds for that migration subprocess; every migration and assertion remains unchanged, and neither the preloader nor any deadline change is committed to the product. The actual preloader is included in this evidence packet.

With that fixture allowance, the reproduction reached and failed the manual creation parity assertion. A first post-fix attempt passed the manual parity assertions but exposed a mistake in an added refusal probe: it reused an idempotency key with different arguments and correctly received idempotency_conflict. The probe was corrected to replay identical arguments before checking policy and revocation fences. A subsequent assertion compared across policy setup and correctly observed the policy-adopted events created by that setup. Each refusal now compares the complete state and complete event inventory immediately before and after that request, preserving all event assertions while allowing the explicit setup actions. A complete run then reached an unchanged audit-retention assertion that expected three rows on its bounded audit page and saw two after the added flow had moved its last row onto the next page. The new parity flow is appended after the established audit-history fixture, leaving the existing main flow and all its assertions intact. The same complete registration passed on an isolated main worktree at b3e94efdc16e4ae467cd2ed283ee4eb0dc4c0c31, confirming that the original fixture passes without the added early history. The read-only comparison worktree was removed after its successful run. No Base audit implementation or existing main assertion is changed. All actual attempt logs are retained.

## Remaining gap and holds

GAP BASE-AGENT-002: Full Core tool coverage and non-tool reasons, all-fixture output schemas, complete annotations, broad refusal-code parity, other jobs' native state and event parity and embedded-agent audit use remain unclaimed. Real agent customer-message approval and dispatch remain omitted under OUT-001. OUT-013 owner consent, OUT-019 Base and Platform relay recipient support, SEQUENCE-001, SEQUENCE-003 and AUTO-001 prerequisites remain. Every provider, account, consent, receiving-door, campaign and continuation hold in the supplied brief stays unchanged.

No PR is required because Verify accepts branch pushes. Product and evidence custody are separate. The complete actual packet is published only to the dedicated evidence branch; publication does not imply READY, acceptance or landing.

## Final local qualification and custody

The complete core registration and complete browser registration each passed, one registration and zero failures. The unchanged main comparison also passed. The core candidate run includes the selected parity flow and the existing security, authority, archive, workflow, capacity and erasure assertions. All tests use the documented VM-only migration setup allowance; no deadline or preloader is in the product tree. Build, final typecheck, boundaries, first-party checks, generator write and check, and the final edition source lock check pass. The source tree is clean, full history is retained, all candidate identities and trailers pass, and the product branch is verified on the remote.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0, generated views restored from main; ledger=none exit=0.

PROBE BASE-AGENT-002 5: authenticated native HTTP and signed MCP accept identical padded manual creation and editing input under autonomous and held-standard policy -> equal normalized content, recipient, opportunity and revisions; matching native draft.created and draft.updated events, truthful agent and sponsor, linked exact-content reviews; replay and stale edits add no draft, revision or event; provider calls and outbound effects are zero. The complete emitted browser registration opens and operates the populated draft and review, including saved revision and opportunity link, at desktop width with screenshots also at phone width. Actual probe rows and source log locations are in PROBES.json.

Main baseline b3e94efdc16e4ae467cd2ed283ee4eb0dc4c0c31 has successful Verify 43089571350 and Run site 43094710902 receipts in main-ci.jsonl. Candidate main equality is false because this run pushes only the cloud branch. The guarded fleet lander owns final scanning, exact-SHA CI admission, main equality and Run site.

CLAIM BASE-AGENT-002 PARTIAL points=5 tests=tests/core/managed-owner.test.ts#Managed owner claim verifies RER authority and creates the native owner and session exactly once; company text cannot change MCP classification; stalled risks agree across policy and native doors

This claim covers only the selected manual draft slice. Every other omitted obligation and hold above remains. There is no DONE promotion and no count change.

## Terminal observation

Exact candidate Verify 43101418941 remains in progress after the required five-minute polling interval. The raw final REST observation is in ci-final-observation.json. This is a PUSHED handoff, with no claim of green candidate CI, publication scanning, main landing or Run site on the candidate. There is no known unresolved local product or test failure. The fleet retains its independent admission and landing gates.

The initial 38-file evidence packet was fetched back from its exact evidence head and every selected byte and manifest hash matched; EVIDENCE-VERIFY.json records that specific packet version. The final packet additionally includes that verification receipt and the final CI observation. The evidence publisher supplies the final complete manifest separately from product custody.

PUSHED branch=cloud/sd-orbit-c-f153 head=12b016db68a798982a9ac6bbe4c02c47f2f9c1e6
