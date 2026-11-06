# CAPTURE-003 original exact-source verdict

**CAPTURE-003: ACCEPT ON LANDING, conditional on the explicitly retained final verification and landing guards.** R1–R4 are MET in the independent focused execution. No substantive unmet outcome or NEW correctness, exposure or data-loss finding was found. This is a product-scope judgment, not source acceptance, a released hold, a product READY receipt, or a landing authorization. The source and exact-chain review holds remain ACTIVE.

Execution: ct-judge-orbit-capture003-20261105-1520-sol1, replacing the original ct-judge-orbit-capture003-20261105-1520 commission. Model and reasoning routing: **gpt-6.1-sol, xhigh**, as specified for this fresh execution; no secondary judge, subagent, model override, paid API or usage-credit operation was launched. The tool interface does not expose a separate model-attestation receipt. Review date: 6 November 2026 UTC.

Repository: just-every/run-orbit. Exact source: **a6adec278a7fa27edcdc32289c5fde0b2175ad9e**. Fresh remote root ref cloud/sd-orbit-c-f43 matched that full SHA. The disposable shallow filtered checkout remained detached at it. No product branch was created, no product source or test was edited, and no product commit, product push or PR was made. The generic cloud builder instructions are superseded by the commission's read-only restriction. The report-only evidence ref is separate.

## Product and scope

From the immutable CONTRACT.md only: category **Sales CRM**; first buyer **a US small-business sales manager and their reps, selling in USD, using Google Workspace or Microsoft 365, working across US timezones and US daylight-saving transitions**. Incumbents: **HubSpot Sales Hub, Pipedrive, Salesforce Sales Cloud**. Named up-and-comers: Attio, Day.ai, Twenty. The primary journey brings records across, connects customer evidence, works the explained NOW queue, prepares and sends relevant follow-up, and reconciles the customer's reply with the sales outcome.

Affected scope is exactly CAPTURE-003. Accepted(source) remains empty. Earlier sources, refusals, original frozen outcomes, lifetime FIX custody and other concurrent claims are not reopened. The task states no prior judgment of this exact source; this execution does not launch a duplicate or transfer acceptance from another SHA. The provided builder READY time (15:03:37Z), affected gate completion (15:13:15Z, exit 0, GATE PASS) and earlier CI information are supplied context, not newly retrieved or independently observed remote receipts.

The full pinned CONTRACT.md, ACCEPTANCE.md and AGENTS.md were retrieved from immutable raw URLs and byte-matched against the checkout. All 204 source Status rows and their evidence and Gap contents were inventoried in DOCUMENT-RECEIPT.json. The scoped requirement, acceptance, receiving Base citations, D-1 and D-2, related capture, threading, stop, draft and contactability requirements, full RULINGS.md, named journeys and relied-on helpers and commit paths were examined. This is not a new judgment of the other 203 clauses. The supplied inline excerpt, judge-common and DONE-RIDERS are the fleet documents used; unshipped lane files, INBOX, STATE, private gate materials and Mac receipts were not accessed.

## Unchanged original requirement and acceptance

> A reply from the recipient of an Orbit send that carries that send's message headers attaches once to its opportunity under OUT-004. A delivery report for an Orbit send to that recipient records the bounce, and a permanent one sets do-not-contact under RECORD-012. A captured reply or booked meeting from a known contact cancels that contact's scheduled messages and marks their unsent drafts stale under OUT-007 and ACTION-005 in the same commit, while the proposals from the same message wait for review. An automatic reply stops nothing.

Original A1, the sole acceptance point:

> Capture a threaded reply, booked meeting, permanent bounce and automatic reply; inspect atomic linking/stale/cancellation effects and verify automatic reply stops nothing.

These are unchanged from the supplied original commission. No acceptance sentence, provider boundary or test assertion was weakened or added by this judge. CAPTURE-003 explicitly cites BASE-INPUT-001, BASE-DATA-004, BASE-SECRET-001, BASE-DATA-001 and BASE-DATA-003, and applies D-1 and D-2.

## Frozen rubric and scores

No earlier separate rubric file was shipped. The original affected outcome map below is retained verbatim, including its original compact punctuation; R1–R4 remain outcomes of A1, not four new acceptance points.

| ID | Original frozen outcome, verbatim | Score and executed proof |
| --- | --- | --- |
| R1 | threaded reply attaches once to correct opportunity with original evidence and permanent bounce records bounce/do-not-contact | **MET.** Intake journey imports the original mbox with a reply carrying an actual accepted Orbit send's headers; reads its retained headers and body, one opportunity and company timeline association, and NOW state. Replay preserves effect counts. The original delivery-status report names Bob and his Orbit message; reads Bob as do-not-contact and the outbound message as bounced. The boundary journey also accepts the genuine exact sender and refuses encoded-name and Cc impersonation. |
| R2 | independent known-contact booking and human reply cancel scheduled message and stale both fresh drafts atomically, proposals pending/contact changes unapplied | **MET.** immediateCaptureEffects runs fresh independent booking and human-reply fixtures. Each begins with one scheduled message and two non-stale drafts, uploads through the native Capture import door, reads cancellation and reason through workbench messages, reads both drafts as stale through draft routes, reads nonempty pending proposals, and compares contact rows unchanged. Booking retains a pending next-action proposal. |
| R3 | late actual D1 failure refuses with full inventories and authenticated work unchanged, retry succeeds once and replay changes nothing/sends nothing | **MET.** For both booking and human reply, a real SQLite trigger aborts capture_proposals insertion after the other planned effects. Native import returns 500 and exactly the generic refusal. Full rows of the 16 enumerated affected tables and authenticated workbench and draft readbacks equal their populated pre-attempt snapshots. After removing only the fixture trigger, retry captures one item and applies one stop; replay captures zero and changes neither the complete effect inventory nor work. Configured customer-mail transport calls do not increase, including assertions at intake lines 193 and 231. |
| R4 | independent threaded automatic reply attaches but schedule and both drafts remain unchanged | **MET.** A separate Bob follow-up fixture imports its actual threaded automatic EML alone, reports one attachment and zero stops, and deep-compares the scheduled message and both fresh drafts unchanged. Its replay changes no inventory and sends nothing. |

The full original public-door journey names are:

- `tests/core/capture-intake.test.ts` — CAPTURE-001 CAPTURE-002 CAPTURE-003 SIGNAL-003 OUT-004 RECORD-012 an mbox and calendar files become signals with their evidence; replay, threading, delivery reports and private mail behave as the contract says.
- `tests/core/capture-boundaries.test.ts` — CAPTURE-003 CAPTURE-005 OUT-001 OUT-007 ACTION-005 RECORD-012 SIGNAL-009 a captured reply stops outreach at once while its proposals wait; capture never drafts, sends or makes anyone contactable, and only an operator session may capture.

Both are single existing registrations, executed once. The first calls the independent fixture loop before its original mailbox journey. Public doors are authenticated multipart POST /api/v1/capture/imports, GET workbench messages, GET drafts and GET capture proposals; the original test also exercises signed inbound provider reply deduplication and native form redirect behavior. The second exercises the actual capture and signed-source HTTP routes, source configuration, proposal review, anonymous refusal, cross-origin refusal and collaborator refusal. Database observations inspect the real local D1, not an application database mock.

## Why the execution is meaningful

The fixture applies the real edition migrations to isolated local D1 through Wrangler with remoteBindings false. It creates accepted customer sends using Orbit's draft, approval and outreach services; generated message IDs are the headers later returned by the customer fixture. Native sessions are seeded as test setup, then validated by the real Base operator authentication composed by the test app. The Hono application, routes, repositories, parsing, D1 batch and stop logic are production code. Only the external mail provider is replaced by a recording transport; no provider receipt or live-account qualification is claimed. In the immediate-effect cases that recording transport is explicitly configured on the application, and approval-preview returns 200 before capture. This makes zero-send assertions materially different from testing an unavailable sender.

The intake batch contains signal, captured item, links and timeline or held evidence, source captured count, immediate stop effects and the final pending proposal writes. Threaded reply effects use IngestionRepository.linkStatements; held known-contact replies and bookings use stopStatements. Both participate in the same db.batch. Automatic replies use the namespaced inferred auto-reply type and do not enter reply or meeting stop branches. Proposal acceptance is a separate reviewed batch. The late trigger tests this real commit boundary, with 16 populated affected-table inventories covering signals, capture_items, capture_proposals, signal_links, timeline_entries, timeline_entry_records, evaluations, evaluation_contributions, evaluation_job_runs, recommendations, notifications, contacts, opportunities, drafts, outbound_messages and capture_sources. This is an affected-state inventory, not a claim that every installation table is exhaustively compared.

No reading-only PASS substitutes for the executed rollback or authority paths. The boundary journey retains native authority and capture namespace refusals, protects a real reply identity against signed-source pre-emption, refuses forged display-name identity, leaves the contact phone unapplied while proposals wait, and confirms no drafts, approvals or new outbound sends result. Its signed Bearer request is not represented as a newly qualified live delegation account. Existing exact identity and person-specific suppression duties remain in force.

## DONE-RIDERS and inherited duty disposition

| Row | Finding and disposition |
| --- | --- |
| 1 | **Substantive outcomes MET locally, conditional on row 3.** R1–R4 cover every original requirement and the single A1 through the named native capture journeys. Both passed at the exact source. No missing outcome was found. |
| 2 | **MET.** Fresh populated scheduled work and two non-stale drafts prevent an earlier stop from masking a missing effect. Real late D1 failure refuses both supported stop cases and leaves affected state and authenticated readbacks unchanged. The dangerous authority and impersonation refusals execute too. |
| 3 | **PENDING final recorded full runtime Verify.** Pinned workflow is Verify, with push, pull_request and dispatch entry points. The complete verification plan schedules intake in core-4 and boundaries in core-5. Supplied push run 42048803012 failed generated-view freshness and dependent work; runtime shards were skipped. It is not full green and is not presented as runtime proof. No CI poll, rerun or dispatch was performed. The supplied candidate exception avoids rejection solely for the view check, but does not supply the skipped runtime evidence. |
| 4 | **MET for local focused proof.** Every recorded command in COMMANDS.jsonl names the exact source SHA. It remained unchanged throughout. Remote final-candidate proof remains row 3's guard. |
| 5 | **MET by written inheritance; no scope deletion.** All five required Base duties are explicitly cited in the CAPTURE-003 metadata. Validation and generic refusal are exercised, configured-transport zero-send checks execute. Archive and erasure duties are retained as below, not silently awarded. |
| 6 | **Mechanical work PENDING, not a new product FIX.** Source CONTRACT proposes done with empty Gap; generated ACCEPTANCE still says partial, carries the exact old Gap below and reports old counts. contract-docs check exits 1 only for ACCEPTANCE freshness. No generated view was written or committed. Final merged regeneration, counts, provenance and source-lock-last are lander duties. |
| 7 | **INSPECTED; no new acceptance edit.** Requirement and A1 match the original supplied text. RULINGS.md contains RL-1–RL-7; none changes CAPTURE-003's acceptance. This judge made no rewrite or coverage change. |
| 8 | **MET for the scoped changed behavior and retained authority boundaries.** Native capture succeeds; anonymous, signed-source, reserved namespace, foreign-origin, collaborator and forged identity attempts are refused with the existing checks. No broader role or account qualification is inferred. |
| 9 | **Boundary retained.** No live Gmail, Microsoft, legal-consent or device qualification was attempted or awarded. Those missing external proofs remain UNMET-EXTERNAL in their owning scopes and do not create new CAPTURE-003 acceptance points. |
| 10 | **MET for this commission.** No new policy default, account authority, consent, spending disposition or contactability rule was adopted. CAPTURE-012 and unknown-participant, provider and consent holds remain unchanged. |
| 11 | **PENDING.** Guarded landing, main equality, final exact-main Verify and Run site, and COMPLETE full-history publication scan NEW 0 have not been established here. The source and exact-chain holds remain ACTIVE. No acceptance, landing or release is performed. |

Inherited duties are not separate newly judged clauses:

- BASE-INPUT-001: invalid file and malformed identity or calendar input are exercised through import; appropriate refusal or explicit skip stores no captured effect. Existing size and file-kind checks remain. This is affected-door proof, not a new audit of every product input.
- BASE-SECRET-001: the actual late D1 failure returns only `Capture failed; nothing was confirmed.` The injected trigger's diagnostic is not returned. Global bundle and client secret guarantees are not newly qualified by this focused run.
- BASE-DATA-004: the configured recording mail transport sees zero extra calls on failed capture, successful capture and replay (intake lines 193 and 231). Boundary capture and review likewise send nothing. No provider was contacted.
- BASE-DATA-001 and BASE-DATA-003: **INSPECTED, NOT RUN here**, because this commission runs the two focused capture files once and forbids the full or baseline suite. The retained archive and erasure files are `tests/core/capture-data.test.ts`, `tests/core/capture-erasure.test.ts` and `tests/core/capture-replay-archive.test.ts`. Their journey definitions were read; the verification plan schedules them in core-7, core-8 and core-9 respectively, including actual archive round-trip, source credential exclusion, contact erasure and replay barriers. No reading-only data-loss PASS is awarded. Their actual invocation and success in final full runtime Verify remain mandatory.

No new blocker was found outside the frozen rubric. No per-point test, mutation experiment, full suite, browser run, build, provider operation, account setup, source edit, source pin, hold operation, resubmission or successor task was performed. Viewports are N/A: this commission is non-UI and changes no screen.

## Actual commands and results

Commands ran from the exact checkout with the supplied cloud toolchain sourced and the subreaper cloud_run wrapper. The receipt records underlying argv, start, finish, duration, exit and SHA; raw non-secret logs are included.

| Command | Exit and observed result |
| --- | --- |
| git ls-remote https://github.com/just-every/run-orbit.git refs/heads/cloud/sd-orbit-c-f43 | 0; exact source MATCH. |
| git clone --depth 1 --filter=blob:none --single-branch --branch cloud/sd-orbit-c-f43 … | Clone succeeded; the enclosing bootstrap shell subsequently exited 128 when its trailing local identity command ran outside the clone. The required local name and email were then successfully configured inside the checkout, before any commit. |
| pnpm install --frozen-lockfile | 0; lock unchanged, 243 packages installed. |
| pnpm exec tsx --test --no-test-only --test-concurrency=1 tests/core/capture-intake.test.ts tests/core/capture-boundaries.test.ts | **0; 2 tests passed, 0 failed, 0 skipped, 0 canceled.** 01:52:56.329Z–01:55:46.938Z, 170.609 seconds. |
| node src/base/contract-docs.mjs check | **1; only ACCEPTANCE.md generated content differs.** Expected mechanical stale view, left untouched. |
| node node_modules/@runeditrun/rer/edition-authoring/cli.mjs check | **0; ok true.** Source lock validation passed. No lock was regenerated. |
| pnpm run typecheck | **0; tsc --noEmit passed.** |
| git diff --exit-code; git diff --cached --exit-code; git status --short | 0, 0 and empty tracked and untracked status, before report publication. Source HEAD remained the exact pin. |

Runtime was Node v24.19.0 and pnpm 10.12.4. The supplied toolchain leaves an already-newer Node in place; the repository pins Node 22.20.0 and emitted its engine warning. This local receipt is therefore not a claim of having run under Node 22.20.0. The exact-final Verify using the repository's Node pin remains the verification guard. No focused test was rerun to change this fact.

CI calls: **0**. Only cited remote run: **42048803012**, event **push**, conclusion **failure**, source **a6adec278a7fa27edcdc32289c5fde0b2175ad9e**, as supplied by the original commission; no independent API observation is claimed. No green run from another SHA is substituted.

## Status, Gap, counts and pending guards

The generated pre-candidate CAPTURE-003 Gap is exactly:

> Unasserted in the carried evidence: booked meeting cancels scheduled work; drafts staled atomically; automatic reply stops no scheduled work. Asserted: threaded reply linked; permanent bounce stops contact.

Each previously unasserted outcome is now reached by the executed original affected journey. The conditional flip is **CAPTURE-003 PARTIAL → DONE**, replacing that Gap with an empty Gap and the named affected evidence. The source CONTRACT already proposes this flip; this judge changed no file. On landing, the generated ACCEPTANCE and CLAIMS must be written from the merged CONTRACT, preserving every newer main Status, Gap and assertion and unrelated legacy prose.

Individual claim delta only, unawarded and never added to concurrent claims:

| Scope | Before | Proposed after |
| --- | --- | --- |
| Core | 35 done, 119 partial, 24 missing, 178 total | 36 done, 118 partial, 24 missing, 178 total |
| Agent surface | 0 done, 18 partial, 8 missing, 26 total | unchanged |
| Full target | **35 done, 137 partial, 32 missing, 204 total** | **36 done, 136 partial, 32 missing, 204 total** |

The complete pinned source status inventory computes the proposed 36, 136, 32; generated ACCEPTANCE still computes 35, 137, 32. These are snapshots of the pinned proposal and generated view, not authoritative current-main or accepted counts.

Pending guards, all retained:

1. Resolve and preserve merged CONTRACT source judgments first, including every newer main Status, Gap and assertion. Write and check the generated views and update final provenance and counts through the documented lander command; do not hand-resolve or commit the cloud's stale view. Regenerate source lock last and validate it.
2. Actually execute a **full green exact-FINAL runtime Verify** containing both relied-on capture journeys and retained Base archive and erasure journeys. Existing 42048803012 is not that receipt. The generated-view candidate exception does not qualify skipped runtime shards.
3. Complete the full-history publication scan with **NEW 0**.
4. Obtain the guarded lander's receipt: allowed landing, fresh main equality, exact-main green Verify and Run site on that same final SHA. Do not infer those conditions from this evidence publication or from the old source ref.

No substantive product FIX is requested. All actual failures and unestablished guards are listed above. Mechanical F and G bookkeeping is not converted into a lifetime product FIX. The conditional acceptance remains CT-only; CT retains original-to-replacement custody, and only its later lane process may consider the guards.
