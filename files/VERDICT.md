# Independent exact-source CT judgment — CAPTURE-006

Tag: ct-judge-orbit-capture006-20261105-2325-sol1
Repository: just-every/run-orbit
Judged source: 977e663adaf18d3ff54b0aecbe7d10355217ab0c
Source branch: cloud/sd-orbit-c-f60
Fresh comparison main: c01084f133af9aa484a6c1f5151a4e9cfbc7230f
Model: gpt-6.1-sol. Reasoning effort: xhigh. This is the single Codex cloud execution authorized by the 2026-11-06T01:26Z replacement routing authority. No other model session, subordinate agent, paid model API or usage-credit call was launched. Billing and external admission ledgers are not visible in this VM; no new admission or allowance was inferred from a helper.

**Verdict: CAPTURE-006 ACCEPT ON LANDING. R1–R7: 7/7 MET in native scope; final rows 3 and 11 pending; no award.**

## Product and judgment scope

The pinned contract identifies the category as **Sales CRM**, the first buyer as a US small-business sales manager and their reps, selling in USD with Google Workspace or Microsoft 365 across US timezones and daylight-saving transitions, and the incumbents as HubSpot Sales Hub, Pipedrive and Salesforce Sales Cloud. It additionally names Attio, Day.ai and Twenty. These identities come only from the pinned contract, not the builder's framing or an outside category assumption.

This judgment covers the whole original CAPTURE-006 Requirement, its single original acceptance point, all five written Base citations, D-1 and D-2, frozen R1–R7 and the requested riders 1–11. The acceptance remains: “Connect each Google/Microsoft read adapter, choose folders/calendars, page and crash before cursor commit; resume without duplicates, revoke, reconnect and disconnect with visible errors.”

The source pin was read back from the remote before execution. Full pinned CONTRACT.md and ACCEPTANCE.md were loaded, their complete 204-clause requirement and acceptance bodies compared, the generated view's distinct wrappers and source lifecycle row read, and all Status, Evidence and Gap records reviewed with repeated identical cells referenced once. All 204 acceptance bodies equal the contract. ACCEPTANCE.md is byte-identical to current main and retains the older partial CAPTURE-006 view. AGENTS.md and all RULINGS.md were read; no ruling changes this clause's acceptance. The inline common judge rules, DONE riders, complete builder report and complete original affected result were read. There is no earlier exact-source CT judgment in the supplied custody, so this is the one original CT commission, distinct from the already completed affected gate.

Repository source, contract, tests, workflow and source lock were not edited. No product commit, branch publication, PR, CI query, rerun, dispatch, deployment, live-provider operation, source-pin change, hold change, acceptance or disposition call or release occurred. Local setup and disposable fixture writes are execution state only.

## Full original clause at the pin

#### CAPTURE-006 — Capture sources

**Requirement.** A source declares the mail folders or labels and the calendars it may read, keeps its cursor exactly as its provider gave it (a Gmail history ID or a Microsoft Graph delta link, for example), and shows its state, last success, last error, items captured, items not stored and proposals waiting. A crash before a page's cursor is stored re-reads that page without duplicating anything. A revoked grant stops intake and shows its error until the source is reconnected; a provider outage records its error and leaves records, queues and manual work unchanged. Disconnecting stops intake at once, deletes the stored credential and keeps captured evidence, shown as coming from a disconnected source. The file import is the first adapter and has no cursor or credential.

**Acceptance.**
1. Connect each Google/Microsoft read adapter, choose folders/calendars, page and crash before cursor commit; resume without duplicates, revoke, reconnect and disconnect with visible errors.

## Original frozen native rubric — verbatim

Each row names the public doors and observable outcomes. No private gate material is included. No temporary product mutations were applied; the distinct counterexamples below describe what the named assertions reject.

| ID | Checkable outcome and door | Proof and lines | Distinct counterexample rejected |
| --- | --- | --- | --- |
| R1 | Both read adapters connect; selected resources page and resume a persisted crash with exact provider cursors and no duplicates. | `tests/core/capture-mail-rules.test.ts` lines 9–20, existing named workspace mail-rule journey; `tests/core/capture-connector.test.ts` line 21, named cursor-resume journey. | Losing the cursor checkpoint or adding a duplicate changes the expected persisted identity count. |
| R2 | Revocation halts reads with a visible error; reconnect clears that state, requires renewed scope selection and resumes positive intake. | `tests/core/capture-mail-rules.test.ts` lines 27–46 through native capture and Records HTTP. | Suppressing the fresh post-reconnect item fails the expected 31 signals and the fresh signal identity; stale reported count fails line 46 independently. |
| R3 | Earlier originals survive reconnect and restarted replay creates no duplicate evidence, proposals or timeline entries. | `tests/core/capture-mail-rules.test.ts` lines 25–26 and 41–49. | Changing any retained original fails its own deep equality; adding a replay effect fails the separately captured effect inventory. |
| R4 | Provider outage preserves records, queues and manual work, and recovery remains possible. | `tests/core/capture-connector.test.ts` line 62, named provider-outage journey; new visible-source assertions at `tests/core/capture-mail-rules.test.ts` lines 27–28. | Mutating customer state or refusing the native note during an outage fails the existing supported manual-work path. |
| R5 | Disconnect stops reads, deletes authority and retains evidence shown as disconnected. | `tests/core/capture-mail-rules.test.ts` lines 50–52; `tests/core/capture-connector.test.ts` line 79, named disconnect journey; `tests/core/capture-providers.test.ts` line 32, named durable-credentials and lease journey; `tests/e2e/capture.spec.mjs` line 80, named provider-status journey. | A further provider read after disconnect changes the read inventory; a surviving credential or lost original fails independent checks. |
| R6 | Inherited validation and secrecy, native authority, erasure and replay fences remain effective. | `tests/core/capture-providers.test.ts` line 12, named OAuth-boundary journey and line 52, named Microsoft delta-link journey; `tests/core/capture-erasure.test.ts` lines 8, 63 and 87, named erasure journeys. | A foreign continuation, revoked operator or reintroduced erased original violates the supported unsafe-path refusal. |
| R7 | Inherited archive custody retains evidence without transplanting authority. | Existing archive and erasure tail of the changed workspace mail-rule journey, using `tests/support/capture-rule-custody.ts` lines 7–12; provider OAuth archive-catalog check at `tests/core/capture-providers.test.ts` line 24. | A credential table in the archive catalog fails its exclusion assertion; an erased address remaining in restored export data fails the custody assertion. |

## One clause decision table

| Clause | Complete public-door coverage | Workflow identity and final disposition |
| --- | --- | --- |
| CAPTURE-006 — Capture sources | `tests/core/capture-mail-rules.test.ts` — CAPTURE-010 workspace mail rules and one-action corrections preserve CAPTURE-006 selected scope, crash replay, incremental reads and unknown-mail exclusion — connects both actual read adapters through native OAuth callbacks, enumerates and selects mail and calendar resources, syncs through authenticated Capture HTTP, crashes before cursor commit, reopens persisted D1, revokes and reconnects, admits fresh intake and reads source status and the contact timeline through authenticated HTTP. The four connector journeys add exact opaque cursor preservation, outage and manual work and in-flight disconnect checks. Provider journeys exercise current authority, credential custody, foreign continuations, size and deletion handling. Three erasure journeys and the workspace journey's actual HTTP and local archive tail cover the written inherited privacy and custody duties. The unchanged provider-status browser journey opens emitted Worker pages, follows both reconnect guides and disconnects populated sources at 1440 and 390. | Existing push Verify 42125980777 is recorded on this exact source, with failure solely from ACCEPTANCE.md freshness and dependent failures and skipped jobs. Its runtime did not execute. No CI request was made by this judge. Independent focused execution below passed; the permitted candidate exception leaves final runtime and guarded landing pending; it does not award DONE. |

## Executed named journeys

These are the existing registrations supplying the original rubric, not additional acceptance points. Each ran once on the pin; the browser entry includes both widths.

In `tests/core/capture-mail-rules.test.ts`:

- CAPTURE-010 workspace mail rules and one-action corrections preserve CAPTURE-006 selected scope, crash replay, incremental reads and unknown-mail exclusion.

In `tests/core/capture-connector.test.ts`:

- CAPTURE-006 a provider cursor resumes after a crash without duplicates and is stored exactly as the provider gave it.
- CAPTURE-006 a revoked grant stops intake and shows its error until the source is reconnected.
- CAPTURE-006 AI-003 a provider outage leaves records, queues and manual work untouched.
- CAPTURE-006 disconnecting stops intake at once, deletes the credential and keeps captured evidence marked as from a disconnected source.

In `tests/core/capture-providers.test.ts`:

- CAPTURE-005 OAuth binds native session, provider, origin, expiry and one use; encrypted authority stays out of status and archives.
- CAPTURE-006 refreshed credentials are durable, leases prevent concurrent reads and disconnect fences in-flight tokens and callbacks.
- CAPTURE-006 Microsoft rejects foreign host, user, folder and calendar delta links before bearer disclosure.
- CAPTURE-006 oversized mail skips once while both providers finish other messages and selected calendars.
- CAPTURE-006 provider deletion respects occurrence and erasure; CAPTURE-011 read-only and writeback consent request and store distinct scopes.

In `tests/core/capture-erasure.test.ts`:

- CAPTURE-007 DATA-002 BASE-DATA-003 erasing a contact erases their captured originals and proposals; the audit trail keeps counts and anonymous replay proofs.
- CAPTURE-007 DATA-002 erased provider originals stay erased after expired history, crashes and reconnect while new evidence remains eligible.
- CAPTURE-007 DATA-002 erasure fences an already-resolved capture commit and its later replay.

In `tests/e2e/capture.spec.mjs`:

- CAPTURE provider status keeps revoked access clear, reconnects through the guided setup and disconnect preserves captured history.

## Journey and helper review

The relied-on registrations were read end to end, including their reachable fixture and assertion helpers: provider fixture and network and provider items, capture fixture and mail, fake provider, mail-rule and rule custody, recovery and privacy fixtures, erasure fixture and decoded import-copy inspection, HTTP archive export and restore, local archive roundtrip, isolated D1 lifecycle, native-session test adapter and email-link sign-in, browser authentication, offline fixture broker, populated browser source fixture and state preparation. Actual provider implementations, scope validation, cursor storage, OAuth callback fences, durable refresh and leases, source status and disconnect, credential sealing, file adapter and archive exclusion policy were traced.

The core fixture writes actual Orbit records, sends through Orbit's outreach implementation with a synthetic mail edge, applies real migrations to isolated D1 and composes the real app with native identity admission. The provider fetcher substitutes only the external Google and Microsoft Graph edge and rejects unexpected endpoints and non-read capture calls. The crash proxy interrupts the actual cursor UPDATE; reopening replaces the database handle over the persisted store. No added test or temporary product mutation was used. The connector's fake adapter is supporting exact-cursor and outage proof; both real adapter loops supply the Google and Microsoft acceptance proof.

The browser fixture deliberately seeds two revoked source cards with retained evidence and reported counts 7 captured, 2 not stored and 1 proposal. Those are functional status fixtures, not seven newly fetched provider messages. Positive real-adapter intake and original retention are separately asserted by the core journey. The browser registration itself and its 1440/390 loop remain unchanged. An external runner config only selects installed /usr/bin/chromium, appends --no-sandbox, and places output outside the checkout; real HOME and a fresh ephemeral context are used. No profile or session is copied and no visual-quality decision is assigned.

## Inherited duties and frozen-row reasoning

- BASE-INPUT-001: native scope and account selection are validated; foreign host, other user, other folder and other calendar continuations are refused before bearer disclosure. Malformed and redirect responses retain the saved cursor. Provider-invalid bodies and oversized responses do not silently advance it.
- BASE-SECRET-001: a successful OAuth connection seals authority, status contains no synthetic client secret or token, wrong session, provider or origin, expired or replayed flow and insufficient scope are refused, and the credential, OAuth and lease tables are excluded from the actual archive catalog. Both providers' in-flight refresh and callbacks are fenced by disconnect and current operator authority.
- BASE-DATA-001: the existing workspace mail-rule tail actually downloads and opens a populated Records archive, restores it into eligible product data, then round-trips the restored store through the local portability engine. Rule values and correction-history payloads survive; a subsequent contact erasure leaves no erased address in a reopened archive. This is the original R7 mapping, not a new audit of every unrelated DATA-001 obligation.
- BASE-DATA-003: populated original, proposal, alias and derivative erasure is followed by physical-store and decoded import-copy inspection, unrelated-original equality, anonymous-count audit and later export checks. Expired history, crash and reopen, reconnect, replacement source, calendar revision and in-flight replay cannot resurrect erased originals; genuinely new evidence remains eligible and retains do-not-contact.
- BASE-DATA-004, D-1 and D-2: the capture read edge remains GET-only; separate explicit calendar-write consent cannot be inferred from read consent, and an unsolicited write grant is refused. Captured evidence does not create contact permission. Actual reviewed sends in fixture setup use the normal outreach service; no live customer send or provider write was attempted. Broader send and other owning-clause duties are not promoted by this review.

The source wraps per-resource cursor strings in its own progress structure but preserves each provider-given history ID and delta URL without numeric conversion or rewriting. The exact opaque cursor connector check and Google's greater-than-safe-integer history ID exercise that distinction. The file adapter returns null cursor, has no credential creation and is actually used by the erasure and import journeys. This structural fact is INSPECTED in addition to executed file intake, not an invented separate frozen row.

## Scope, status and counts

Fresh main and the pin both have 204 Status rows. The candidate differs from main only in CONTRACT.md, sources.lock.json and the existing capture-mail-rule registration. Compared with proved code source 54956cf7ad9ab14c3c609b6d2497d95a138cd02f, it differs only in CONTRACT.md and the lock. No application, UI, fixture, dependency, migration or workflow byte changes. The complete test diff strengthens the existing registration; no assertion, registration or width is removed, skipped or narrowed.

All requirement and acceptance bodies and all unrelated Status, Evidence and Gap cells equal fresh main. The only changed status record is CAPTURE-006, partial to done with the named evidence and an empty Gap. Provenance appends the original proved code source without replacing earlier judgments. Full source and comparison receipts are in SOURCE-REVIEW.json and candidate.diff. ACCEPTANCE-REVIEW.json records the complete generated view's entries.

Current main before landing: **35 DONE, 137 PARTIAL, 32 MISSING = 204**.
Pinned source proposal: **36 DONE, 136 PARTIAL, 32 MISSING = 204**.
Proposed delta: **+1 DONE, -1 PARTIAL, 0 MISSING; UNAWARDED**.
This judge makes **zero status or count changes** and awards **zero**. No candidate deltas may be added together.

The exact older Gap cleared by the candidate is:
“Unasserted in the carried evidence: Google adapter read; Microsoft adapter read; selected folders/calendars. Asserted: interruption before cursor commit; resumed cursor and deduplication; revoke halts reads and preserves records; reconnect restores capture; disconnect removes credential; visible error reason.”

If accepted at guarded landing, retain the original acceptance and requirement, preserve every newer main Status and complete Gap, Evidence, provenance and assertion, retain only this clause's supported status and evidence delta and generate counts from the actually merged CONTRACT.md. No CT flip edit is made here. With a substantive failed outcome the disposition would retain partial and name every uncovered outcome in its Gap; mechanical view freshness alone is not such an outcome.

## External boundaries and NOT RUN

- Live Google Workspace and Microsoft 365 tenant and account consent and production qualification: NOT RUN, UNMET-EXTERNAL; no authorized live account is part of this commission. R-1 and R-2 remain not run. Existing OPS-001, CAPTURE-010, CAPTURE-011, provider, consent, field, legal, account, device, Base, adoption and release obligations stay intact.
- Full or baseline suite, broad capacity and release qualification, standalone typecheck and unrelated journeys: NOT RUN; the brief authorizes focused relied-on sanity journeys once only. No corresponding full-product green claim is made.
- CI discovery, status queries, logs, rerun or dispatch: NOT RUN; the specific read-only commission forbids them. CI run facts below are supplied immutable factual input, not a fresh observation.
- Contract generator write, source-lock regeneration, product edits, commits, pushes or PRs, merge, deployment, hold, pin, lifecycle or source acceptance or release calls: NOT RUN; prohibited in this read-only judgment. Only read-only generator and committed-lock checks are executed.
- Full-history publication scan: NOT RUN and unestablished here; shallow source inspection is not that scan. The Mac's COMPLETE publication NEW 0 is still owed.
- Exact-final Verify, exact-main Run site and main equality to a final integration SHA: NOT RUN; no final integration exists in this commission. Old successful main runs are not substituted.
- Later ACTIVE protection readback and final supported disposition: NOT RUN; only the installed original source-lineage custodian may perform those operations. The inline 23:22Z protection readback is historical, not a current ACTIVE receipt.

## Recorded CI and distinct affected qualification

The original affected gate ended 2026-11-05T23:39:30Z, exit 0, GATE PASS on the exact judged source, with frozen R1–R7 PASS, ten affected capture tests and unchanged emitted browser proof at 1440 and 390. Its complete immutable input was supplied inline. This establishes the required original affected actual PASS as factual input; this judge neither starts a duplicate gate nor claims its command execution as this session's.

Original push Verify **42125980777** on **977e663adaf18d3ff54b0aecbe7d10355217ab0c** concluded **failure**, with source job **127590333732** failing only pnpm exec node src/base/contract-docs.mjs check: “ACCEPTANCE.md: generated content differs; run contract-docs write.” Missing source outputs, skipped runtime shards and aggregate job **127590557364** are derivative. It is the expressly permitted CANDIDATE generated-view exception, never a successful runtime Verify. Main Verify 42116055029 and Run site 42116055015 on c01084f133af9aa484a6c1f5151a4e9cfbc7230f are historical and confer no candidate runtime qualification.

## Required final integration guards

Before any acceptance or disposition, the original integration family and installed source-lineage custodian must independently verify the supported-source and exact-land protections ACTIVE. They retain every original pin, hold and lifecycle duty and the separate affected-gate provenance.

Rows 3 and 11 remain pending until actual guarded integration: resolve merged CONTRACT.md first with main's newer judgments, preserve all newer Status and full Gap, Evidence, provenance and assertions, perform documented generator write and check, recompute merged counts, add provenance naming this exact source and report, regenerate and check the source lock LAST, and obtain an ACTUALLY EXECUTED full-green exact-FINAL runtime Verify that loads the relied-on journeys. The guarded lander also owes COMPLETE full-history publication NEW 0, its guarded fast-forward/main equality and exact-main green Run site. This reader does not perform any such operation.

C goes to the next planned touch; F and G mechanics never become product FIX. No out-of-rubric item is promoted into a blocker. Any allowed NEW would have to demonstrate introduced data loss or exposure, plausible regression or ordinary correctness. The generated-view exception changes none of the final DONE bar.

## Independent execution results and scores

The single focused core command completed at 2026-11-06T02:23:16Z, exit **0**, in **901.343 seconds**: **13 passed, 0 failed, 0 skipped, 0 canceled**. The extended workspace mail-rule registration passed in **328.136 seconds**, including both adapters and its existing archive and erasure tail. Each relied-on core registration ran once.

The selected emitted Worker browser registration completed at 2026-11-06T02:26:17Z, exit **0**, in **47.005 seconds including build and state preparation**; Playwright reported **1 passed (46.4s)**. The test's existing loop executed at **1440 and 390**, with both providers' revoked status, guidance, masked secret control, callback copy text, disconnect and retained counts checked. Its existing overflow and serious/critical axe assertions passed. All six captured PNGs were inspected for those functional states and are in screenshots; no visual-quality verdict is made.

NOTE G, runner command only: the first browser invocation returned exit **1**, “No tests found”, because an anchored grep was applied to Playwright's composite test name. The Worker build completed, but no test or browser assertion ran. Removing the anchor in the command, with no repository change, made filtered --list report exactly one registration. That unchanged registration was then actually executed once and passed. Both invocations and the filtered selection have actual receipts; the failed selection is not hidden, counted as an application assertion failure or treated as product FIX.

| Frozen row | Score | Independent exact-source observations |
| --- | --- | --- |
| R1 | MET (PASS), native scope | Both actual adapter loops enumerate INBOX, SENT and calendar, reject intake before selection, persist a crash with already committed items, reopen and resume to 26 signals, then exercise incremental and recurring reads without duplicates. Supporting connector proof preserves 1001 and the exact provider delta URL; Google's large history ID reaches the subsequent native read unchanged. |
| R2 | MET (PASS), native scope | Each populated source records outage and revoked error text and timestamps, refuses further revoked intake without a provider read, completes renewed OAuth for the same source, refuses before fresh selection, then reads new provider message 25 once. The contact timeline contains its identity; source status is connected with 31 captured, cleared error, last-success time, scope, not-stored count and pending proposals. |
| R3 | MET (PASS) | All 30 old original rows remain byte-for-byte equal after the one new original is admitted. Two restarted replay rounds preserve the complete originals, signals, proposals and timeline inventories, with the visible count still 31. |
| R4 | MET (PASS) | The populated connector fixture preserves complete customer-state tables and the native NOW response during outage, exposes the error, accepts a native manual note and resumes capture after recovery. Both real-adapter loops additionally preserve their cursor and originals across the visible outage. |
| R5 | MET (PASS) | Each real adapter disconnect deletes credentials, retains all 31 originals and refuses a later sync without a provider read. The connector fences a page already in flight and labels retained proposals disconnected. Both-provider refresh and callback races preserve zero credentials after disconnect. The emitted browser performs native disconnects, then reads disconnected state, no credential and unchanged retained counts. |
| R6 | MET (PASS) within original inheritance | OAuth allowed and denied flows, foreign continuation refusals without bearer disclosure, redirect and malformed cursor preservation, current session and operator callback fences, separate write-consent refusal and all three populated erasure, replay and race journeys passed. Unsafe paths were actually attempted, not passed from reading alone. Existing other-clause and live-account obligations remain held. |
| R7 | MET (PASS) within original mapping | The workspace journey actually exports, opens and restores populated HTTP archive data, round-trips through the local portability engine and checks retained rule and correction content; erasure is followed by another opened archive with no erased address. A successfully connected source's actual archive catalog excludes capture credentials, OAuth and locks. This is the frozen custody mapping; unrelated whole-product archive qualification is not claimed. |

**Frozen score: 7 of 7 MET, 0 unmet native rows. NEW: none. No substantive CAPTURE-006 blocker.**

## Requested DONE riders

| Rider | Judgment | Actual basis or pending guard |
| --- | --- | --- |
| 1 | Native outcomes MET under the explicit candidate exception | Whole original AP and Requirement mapped to R1–R7 above, 13 actual focused passes and the actual browser pass. Full recorded final Verify execution remains pending with rider 3. |
| 2 | PASS | Real populated originals, records and queues; positive fresh intake; actual unsafe revoked or disconnected, foreign-continuation, stale-authority and erased-replay refusals preserve the protected state checked by the journeys. |
| 3 | PENDING FINAL; permitted candidate exception only | Existing push Verify 42125980777 is the exact-source generated-view-only failure. The pinned Verify planner schedules the relied-on core files and runtime-browser. No runtime green is inferred from the skipped shards or another SHA. |
| 4 | PASS | This judge executed directly on the exact pin. Comparison with 54956cf7ad9ab14c3c609b6d2497d95a138cd02f changes only contract and lock; runtime and test bytes match that proved code source. |
| 5 | PASS | CAPTURE-006 explicitly cites all five original Base duties and D-1/D-2 in its existing metadata; no new inherited wording or narrowed acceptance was invented. |
| 6 | Mechanically stale view, nonblocking | Candidate source has empty Gap and names the relied-on journeys; all source counts recompute. The actual read-only generator check fails only ACCEPTANCE.md freshness. Committed source-lock check passes. No prohibited write or regeneration is done by this reader. Final merged provenance must name exact judged source and this report while retaining newer main assertions. |
| 7 | PASS | All 204 Requirement and AP bodies equal main and the generated view; no acceptance, clause identity or inherited obligation changed. All unrelated Status, Evidence and Gap cells are unchanged. |
| 8 | PASS, native authority | Positive native authorization and actual wrong-session, wrong-provider and wrong-origin, current-operator, concurrency, foreign continuation, stale and disconnected refusals ran on the pin; credential and original-state protections passed. |
| 9 | PASS with external boundary explicit | Native HTTP-edge adapter proof only. No production tenant, live provider, legal, field or device qualification is claimed; original R-1 and R-2 and all owning-clause holds remain unchanged. |
| 10 | PASS | No runtime change or new policy, spending, consent, custody, retention or authority default is introduced. The existing mail-rule policy is exercised without changing its contract or release boundary. |
| 11 | PENDING GUARDED LANDING | ACTIVE protections, actual merged final Verify, COMPLETE full-history publication NEW 0, guarded main equality and exact-main Run site are still owed by their original custodian. Nothing is counted here. |

## Actual command and exit ledger

All long-lived installer, core and browser commands ran under the supplied cloud subreaper, one heavy command at a time. Node **22.20.0** and pnpm **10.12.4** were used for the journeys. The supplied toolchain script initially reports the VM Node 24.19.0; its installed project Node 22.20.0 was explicitly placed first on PATH before execution, and an actual process-version receipt confirms it. Real HOME was retained.

| Command | Exit and result |
| --- | --- |
| git clone --depth 1 --filter=blob:none --branch cloud/sd-orbit-c-f60 https://github.com/just-every/run-orbit.git (owned disposable directory) | 0; exact source HEAD confirmed. Local fleet name and email configured; fleet co-author cleanup hook installed after dependency setup and local setup. No product commit was made. |
| timeout 420 npx -y @runeditrun/rer install | 0; frozen repository dependencies installed. |
| timeout 300 npx -y @runeditrun/rer setup --owner-email fleet@runeditrun.com --non-interactive | 0; local setup only, 24.771s. No real provider operation. |
| timeout 1800 pnpm exec tsx --test --test-concurrency=1 tests/core/capture-mail-rules.test.ts tests/core/capture-connector.test.ts tests/core/capture-providers.test.ts tests/core/capture-erasure.test.ts | 0; 13 pass, no skips or failures, 901.343s. |
| timeout 30 node src/base/contract-docs.mjs check | 1; only “ACCEPTANCE.md: generated content differs; run contract-docs write.” |
| timeout 60 node node_modules/@runeditrun/rer/edition-authoring/cli.mjs check | 0; ok=true, committed source lock current. |
| node --input-type=module -e (process.version and process.execPath receipt) | 0; actual Node v22.20.0. |
| timeout 360 pnpm exec playwright test --config /tmp/ct-orbit-playwright.config.mjs --grep '^CAPTURE provider status keeps revoked access clear' --workers=1 --reporter=line | 1; no tests selected, no assertions executed, 26.991s. |
| timeout 30 pnpm exec playwright test --config /tmp/ct-orbit-playwright.config.mjs --grep 'CAPTURE provider status keeps revoked access clear' --list | 0; exactly one registration at tests/e2e/capture.spec.mjs:80. |
| timeout 360 pnpm exec playwright test --config /tmp/ct-orbit-playwright.config.mjs --grep 'CAPTURE provider status keeps revoked access clear' --workers=1 --reporter=line | 0; actual unchanged registration passed once, both widths, 47.005s including build. |

The browser server itself invoked the pinned state preparation and application build before serving the emitted Worker. There was no additional full verify, baseline suite or test retry. Read-only Git fetch and before/after ls-remote receipts establish the source branch and main. Full commands, timestamps, durations and exits are in COMMANDS.jsonl and RECEIPTS.json; the individual core, browser-selection and sanitized browser logs retain the results. Local Worker binding rows are omitted from browser logs. Setup logs, credentials, environment dumps, private held-out gate material, browser traces and session storage are not selected.

## Final verdict and plan return

**CAPTURE-006 ACCEPT ON LANDING** on exact source **977e663adaf18d3ff54b0aecbe7d10355217ab0c**. All seven original frozen native rows pass, including actual allowed and unsafe-refused security and data-loss paths. There is no unmet substantive native outcome and no NEW blocker. The older partial Gap's real-adapter and selected-resource omissions are reached by the exact-source journeys; retaining that exact omission text would be stale after guarded integration. This is a conditional CT product-scope judgment, not source acceptance, a protected final admission, a DONE award, a hold waiver or a product READY conversion.

Plan steps 1–4 are complete: original scope and rubric read and preserved, exact pin confirmed, all focused relied-on journeys actually executed once, complete clause and rider scores returned, native external boundaries retained and counts independently recomputed. Step 5 returns this complete non-secret packet through the separate evidence ref. Successful evidence transfer and manifest verification precede deleting the owned source clone; disposable database and browser state and the checkout's dependencies are cleaned. No product branch or PR is published.

Fresh terminal source and main refs still match the initial readback. Actual status and count changes by this commission: **none**. Proposed supported landing delta remains **+1 DONE and -1 PARTIAL, UNAWARDED**. Rows **3 and 11 remain pending** under all listed final integration guards. CT must preserve original-to-replacement commission custody; this report starts no successor and retires or releases nothing.

READY in the terminal response means only this CT judgment and report is complete.
