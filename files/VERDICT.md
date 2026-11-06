# OPP-003 independent original-source judgment

**OPP-003 STAYS PARTIAL.** The four original frozen outcomes are MET, but a native People association edit does not evaluate an open opportunity within the original requirement's 30 seconds. This is one observed **NEW ordinary-correctness blocker**, not a missing per-field assertion, a new acceptance point, a UI judgment or a request to widen the frozen rubric.

Repository: just-every/run-orbit. Exact judged source: `3b0ce18793254ec00c67e677dad3b081c3cb83d2`. Existing product branch: cloud/sd-orbit-c-f62. Replacement commission: ct-judge-orbit-opp003-20261105-2330-sol1. Actual reviewer route: Codex gpt-6.1-sol, xhigh, one authorized subscription session. No model API or usage credits, subordinate agents, second gate or successor session was used.

The product remained read-only: no source edit, added repository test, mutation test, commit, product push, PR, CI query, dispatch, rerun, deployment, provider operation or source lifecycle change. The only publication is the separate report-only evidence ref. READY at the end of this review means the CT report is returned; it grants no product READY conversion, source acceptance, award, pin, hold waiver or release.

## Buyer and product bar

Pinned CONTRACT.md identifies the category as Sales CRM. The first buyer is a US small-business sales manager and their reps, selling in USD, using Google Workspace or Microsoft 365, working across US timezones and US daylight-saving transitions. The named switching incumbents are HubSpot Sales Hub, Pipedrive and Salesforce Sales Cloud; the named up-and-comers are Attio, Day.ai and Twenty. These facts come exclusively from the pinned contract, not the fixture, planner or an outside category definition. Its primary journey brings customer records across, connects sales evidence, works the explained NOW queue, prepares and sends relevant follow-up, and reconciles the customer's reply with the sales outcome.

## Original clause and inheritance

The full original OPP-003 Requirement is unchanged:

> A linked signal whose type carries a non-zero weight in the scoring policy, or a change to an open opportunity's stage, expected close date, value, owner, or associations, evaluates that opportunity within 30 seconds. The result records a 0–100 score, a low, medium, or high band, the evaluation time, the policy version, and each contributing signal's contribution. A closed opportunity is not evaluated. The default is each contributing signal's configured weight decays linearly to zero over the 30 days after its occurred time, the sum is clamped to 0–100, and 0–39 is low, 40–69 is medium, 70–100 is high.

Acceptance 1 is unchanged:

> Ingest weighted signals and edit an open opportunity; inspect computed score, band, contributions and policy version, including decay and closed-deal exclusion.

The clause's metadata cites BASE-INPUT-001. BASELINE.md defines that duty as validating every request body, query and path parameter against a schema at the boundary, returning standard-format 400 for invalid input before a service. The original refusal and protected-state inventory duties remain applicable. Pinned RULINGS.md contains RL-1 through RL-7; none changes OPP-003 or authorizes narrowing its association trigger. No contract-standard rewrite or structural change was performed.

Both complete public pinned CONTRACT.md and ACCEPTANCE.md were obtained through raw.githubusercontent.com and matched the clone. All 204 Requirement and Acceptance blocks were parsed and cross-compared: zero differences between them. All 204 fresh-main Status rows, including their entire Gap and Evidence fields, were compared against the candidate: only OPP-003 differs. The complete pinned documents and fresh-main contract remain in the local packet for readback. The original clause, metadata, Status, provenance, applicable rulings, inherited validation duty and relied-on scoring and native journey paths were examined without rewriting any document.

## Single clause judgment table

| Clause | Original acceptance and public doors | Named journeys and result | Recorded Verify | Verdict |
| --- | --- | --- | --- | --- |
| OPP-003 | Acceptance 1 and the entire Requirement, including all stated edit triggers. Signed source HTTP; authenticated opportunity GET; native Records PATCH and lifecycle POST; emitted opportunity People control and its native relationship PUT. BASE-INPUT-001 and riders 1–11 retained. | `tests/core/signals-outreach.test.ts`, “SIGNAL-001 SIGNAL-003 SIGNAL-004 SIGNAL-007 SIGNAL-008 signed replay-safe ingestion links exact identity; unauthorized and anonymous tracking write nothing”: PASS on the exact source. `tests/core/source-onboarding.test.ts`, the source-onboarding registration whose full name is preserved below and in the command log: PASS on the exact source. One functional browser journey through the real emitted opportunity page also exercised signed evidence and actual People removal: executed, with NEW-1's required reevaluation absent. | Supplied recorded workflow_dispatch Verify 42126142966 on this exact source completed failure at generated-view freshness; runtime shards skipped. No new query or run. This is the permitted candidate exception, not final runtime green. | STAYS PARTIAL because of NEW-1. R1–R4 MET; final integration rows 3 and 11 remain pending separately. |

## Frozen rubric, verbatim

The following is the original immutable rubric. Its original “MET locally” descriptions are quoted as supplied, not silently rewritten into a new checklist.

## Acceptance and frozen rubric

Existing registration: tests/core/signals-outreach.test.ts, “SIGNAL-001 SIGNAL-003 SIGNAL-004 SIGNAL-007 SIGNAL-008 signed replay-safe ingestion links exact identity; unauthorized and anonymous tracking write nothing,” lines 27–98.

- R1 MET locally: signed evidence enters through real source HTTP; the authenticated opportunity route returns every exact signal contribution and their bounded sum, lines 55–68 and 74–77. Negative evidence and both score bounds are exercised, lines 76–85.
- R2 MET locally: score and band agree with the configured policy, policy identity matches the active policy, and evaluation time is recorded, lines 67–71. Existing high-band onboarding proof remains at tests/core/source-onboarding.test.ts:45 in its source-onboarding registration.
- R3 MET locally: Records PATCH changes value after twelve days, observes a distinct decayed evaluation and band, then changes expected close after the decay horizon and observes no remaining contributions, lines 78–84.
- R4 MET locally: Records closes the deal as won and lost; later signed bookings, a value edit and signed replay leave the current evaluation, score, band and complete persisted evaluation and contribution inventories unchanged; new evidence remains on the closed deal, lines 87–96.
- Inherited BASE-INPUT-001 remains cited at CONTRACT.md:119. Existing signed refusal and rollback inventory assertions remain at lines 32–37, with concurrent replay and changed-payload conflict at lines 38–44.

## Scores on this execution

| Frozen ID | Score | Actual evidence |
| --- | --- | --- |
| R1 | MET | Exact-source signed-ingestion registration passed. It uses real migrated isolated D1, a signed HTTP ingress and authenticated opportunity detail. Exact positive and negative per-signal aged contributions, both clamped bounds and the persisted score are checked against the contract's independent decay calculation. |
| R2 | MET | The same passing registration checks recorded bands, evaluation time, current status and `opportunity.scoring.v1` against the active policy; the retained onboarding registration also passed and checks a high band from real signed form, reply and booking evidence. The functional browser readback independently showed a fresh reply contribution 40, score 40, medium band and the same active policy identity. |
| R3 | MET | The frozen passing journey advances twelve days, PATCHes native value, sees a different evaluation and a lower band, advances past day 30, PATCHes expected close and sees no remaining contributions and score zero. This frozen row remains MET; NEW-1 concerns another actual public association-save path explicitly named by the unchanged Requirement. |
| R4 | MET | The passing journey closes won and lost, then accepts later signed bookings, edits value and replays signed evidence. It retains the prior score, band and full evaluation object, and the complete persisted evaluation and contribution inventories remain identical while new evidence stays visible. |

**Frozen result: 4 MET, 0 UNMET. NEW findings: 1 blocking ordinary-correctness finding.** No other blocking outcome was established. No live account, real device or another seed's missing API is needed for these native outcomes.

The configured-value assertions establish fresh contributions 40, 36, 30, 25 and -25, whose sum 106 clamps to 100; after twelve days they become 24, 18, 18, 15 and -15, summing to 60; after expiry there are no contributions and score is zero. Fresh negative evidence remains clamped to zero; the subsequent reply yields 15 before closure. These are values established by the successful strict assertions and the read policy, not separately printed database snapshots. The retained onboarding registration's complete actual name is in focused-journeys.log and the OPP-003 Status Evidence at the pin; no registration was renamed or narrowed.

## NEW-1: Native People edits omit evaluation

Classification: **NEW, ordinary correctness, blocking for OPP-003's entire original Requirement.** This is a pre-existing runtime path observed on the exact claimed source; the candidate changed proof and contract metadata, not runtime code. The rubric exception explicitly permits an ordinary-correctness NEW finding. This does not add a role, stage or deadline qualification. It checks the already-written association trigger and 30-second bound.

A single functional browser journey used headless current `/usr/bin/chromium` with `--no-sandbox`, the real HOME, a fresh ephemeral context and the pinned emitted Worker. Original test fixtures prepared an isolated migrated D1 and issued a local native operator session; no profile, external account or system browser session was copied. A newly configured disposable signed source accepted a fresh customer reply (HTTP 201). Authenticated detail and the rendered deal exposed its actual contribution 40, score 40, medium band and active policy.

The journey then clicked the actual People menu's **Remove from deal** action. Its native PUT to the relationship endpoint returned HTTP 200; the persisted stakeholder count changed from one to zero, and browser reload showed “No one on this deal yet.” The opportunity remained open. After a 31-second wait, readback retained evaluation ID `01M6Q9N2YPFBS75CQA30RWG17Q` and evaluation time `2026-11-06T02:05:26.354Z`, identical to before the association edit. Immediate and post-deadline IDs matched. The recorded total observation interval, including final reload, was 33,083 ms. No evaluation was produced.

This is not a requirement that removing a contact erase historical evidence or change the numeric score. Old evidence should remain where recorded. The missing behavior is the required new evaluation of the still-open deal.

The source trace explains the result:

- `src/core/features/operator/ui/record/people.tsx` saves the stakeholder set through context autosave.
- `src/core/features/operator/ui/record/record-api.ts` sends that change to the separate native relationship endpoint.
- `src/core/features/relationships/opportunity.ts` commits stakeholder and primary-recipient changes, their history and stale-draft effects, but appends neither evaluation statements nor an evaluation job.
- `src/core/features/relationships/snapshot.ts` atomically commits those supplied statements and adds no evaluation.
- `src/core/app/app.ts` drains evaluation jobs for successful Records, Capture and Settings mutations, but the separate relationship route is outside those wrappers. No relationship-side evaluation job is queued anyway.
- By comparison, `src/core/features/records/repository.ts` explicitly appends evaluation statements for ordinary opportunity edits, and native stage movement queues a job that the Records middleware drains.

The original default policy, owner semantics, stage independence and other clause obligations are unchanged. There is no demonstrated introduced data loss or exposure. NEW-1 is an observed failure to perform a named ordinary business outcome, not a surviving mutation, missing unit test, empty-list assertion, receipt-format concern or Gap-cell wording objection.

The functional command exited 0 because it successfully collected the observations; `reevaluated: false` is the failed product outcome. It was not represented as a passing reevaluation test. No repository test was added and no source mutation was applied. The complete standalone command source, observations and command receipt are included in the packet.

## DONE-RIDERS 1–11

| Rider | Judgment |
| --- | --- |
| 1 | NOT MET for the entire original Requirement because of NEW-1. The written association-edit trigger is actually exercised and does not evaluate within 30 seconds. The frozen acceptance outcomes otherwise execute and pass locally. |
| 2 | MET for the frozen journeys: populated exact output, bounded score and independent decay calculations; missing and invalid signatures, unknown sources and oversized requests are actually refused with complete protected-state inventory equality. NEW-1 is a separate positive-path correctness failure. |
| 3 | PENDING final integration. The source planner unconditionally includes signals-outreach in core-6, batch-9, and source-onboarding in core-3, batch-12. Recorded Verify 42126142966 is workflow_dispatch, exact source, failure solely at generated views and derivative artifact/verdict requirements; runtime skipped. The permitted candidate exception is not final runtime green and is not the reason for STAYS PARTIAL. |
| 4 | MET locally. Both relied-on focused registrations were run once on the exact pin and pinned Node. Functional browser proof used a build of that exact pin. Candidate versus fresh main changes only CONTRACT.md, sources.lock.json and the existing signed registration; runtime and browser source bytes are identical. |
| 5 | MET. OPP-003 explicitly cites BASE-INPUT-001. Its boundary schemas and original signed-refusal and protected-inventory proof remain present; no inherited duty is reassigned or silently dropped. |
| 6 | Mechanical freshness and final provenance remain lander work, not a product blocker. Candidate source has an empty done Gap, while the carried generated acceptance still says partial and retains the older Gap. Local full-document parsing establishes matching Requirements/APs and all other main Status/Gap/Evidence rows are preserved. Current OPP provenance cites proof commit 39dfa7ba77ad36f12dcf861447cf0790ab603c24. NEW-1 means an empty final Gap would be substantively false. |
| 7 | MET by inspection and exact diff. No original Requirement or Acceptance changed; all 204 Status IDs and unrelated complete rows survive. No new ruling or coverage rewrite was invented. |
| 8 | MET for applicable signed authority scope: allowed requests execute; missing and invalid signatures, unconfigured source and oversized input are refused without protected writes. Native detail and record edits use actual Base-backed operator sessions over the disposable D1. No broader role qualification is claimed. |
| 9 | MET boundary discipline. Native evaluation only; synthetic provider edges in the retained onboarding flow do not establish production provider, legal, delivery, retention or device qualification. External duties remain with their existing owners and field-proof register. |
| 10 | MET. No policy default was adopted or changed. The existing configured weights, 30-day decay and active policy are used. No fleet ruling, hold or source lifecycle was changed. |
| 11 | PENDING. No main equality, exact-FINAL runtime success, complete full-history NEW 0 scan, exact-main Run site or guarded landing receipt is claimed. Main remains the baseline and no product push or PR was made. |

Original rider 2 mutation receipts and mechanical rider 6 receipts in the immutable builder input remain attributed to that builder. They were not re-executed by this reviewer. The original affected gate's actual PASS on this source, ended 2026-11-05T23:41:53Z exit 0, is retained; no second affected gate or inferred PASS is substituted. Its four frozen outcomes and 17 targeted tests do not erase NEW-1 found in this CT review of the entire clause.

## Actual commands, exits and omissions

| Operation | Command or method | Actual result |
| --- | --- | --- |
| Fleet identity and launcher | Required global Git identity; supplied refresh.sh; decrypted-bundle Git helper setup | Exit 0. No credential values printed. |
| Exact source | Shallow filtered clone of cloud/sd-orbit-c-f62; local fleet identity; rev-parse and public ls-remote | Exact `3b0ce18793254ec00c67e677dad3b081c3cb83d2`; read-only clone. |
| Dependency setup | cloud_run timeout 600 npx -y @runeditrun/rer install | Exit 0. Frozen dependencies; RER selected the repository Node pin. |
| Focused registrations | cloud_run timeout 1200 pnpm exec tsx --test --test-concurrency=1 --test-name-pattern='signed replay-safe\|^NOTIFY-003 opt-in' tests/core/signals-outreach.test.ts tests/core/source-onboarding.test.ts | Exit 0, Node v22.20.0, 536.526 s command duration; 2 passed, 0 failed, 0 skipped. Individual case times 9,356.306 ms and 487,651.941 ms. The exact argv is preserved in focused-journeys.receipt.json; the regex contains an ordinary alternation, not a literal backslash. |
| Verify scheduling inspection | Import verification-plan and verificationBatches, select the two actual file registrations | Exit 0; no tests or CI operations executed by this inspection. |
| Browser server | cloud_run timeout 900 node scripts/browser-server.mjs with an explicitly owned isolated test-state path and port 15870 | Original prepare-state and sample services migrated/seeded D1 and original build:app completed; health HTTP 200. Owned server stopped, exit 0. No rer setup or provider setup was needed for this existing isolated browser harness. |
| Functional browser | cloud_run timeout 240 node ../browser-functional.mjs | Exit 0, Node v22.20.0, 47.651 s; actual signed evidence, 1440 and 390 screenshots, native People removal and post-deadline readback. Product reevaluation outcome FAIL, NEW-1. |
| Fresh main and preservation | fetch --depth 1 origin main; full Status-row and original Requirement/AP comparison; diff | Main c01084f133af9aa484a6c1f5151a4e9cfbc7230f. Exactly three changed files and one changed Status row; every other full row byte-equal. |
| Final product check | git rev-parse HEAD; git status --porcelain | Exact source unchanged; no tracked or untracked changes before cleanup. No product commits, pushes or PRs. |

A first metadata-only comparison accidentally counted non-Status tables and raised an assertion before comparison; it was corrected to delimit the Status section. This was a report-harness error, not a candidate failure or a rerun of any product journey. Some exploratory reads used nonexistent sibling filenames; actual implementation paths were located and read. No product assertion, implementation or fixture was changed to obtain a pass.

NOT RUN: full touched file, baseline and full suite (the commission requires only focused relied-on journeys once); additional per-field pin tests or mutations (prohibited and not a basis for refusal); generator write, lock regeneration and full verification (read-only commission and already supplied mechanical facts; final integration owns regenerated merged source and source lock last); CI query, rerun or dispatch (expressly prohibited); publication scan and main/site landing checks (cloud reviewer cannot perform the fleet's final publication/landing mechanics); live provider accounts, real devices, legal qualification or other seeds' APIs (not required by the native OPP-003 outcomes and no broader claim is made). No undocumented held-out material or Mac evidence path was read.

## Exact Gap, flips and counts

Suggested exact substantive Gap for OPP-003 while STAYS PARTIAL:

> Native People association edits on an open opportunity do not trigger evaluation within 30 seconds: a successful Remove from deal changes persisted stakeholders from one to zero but retains the prior evaluation ID and evaluation time after 31 seconds. Signed weighted ingestion, recorded contributions, score bounds, bands, active-policy identity, value and expected-close decay edits, expiry, and won/lost closed-deal exclusion pass on 3b0ce18793254ec00c67e677dad3b081c3cb83d2. Final merged runtime Verify, current generated views/counts/provenance, source lock last, full-history publication NEW 0 and guarded main/site qualification remain pending.

The source-lineage custodian can resolve the ordinary relationship-save evaluation behavior while preserving the closed-opportunity guard, existing historical evidence, authority fences, frozen rubric and all newer main assertions. No such implementation or status edit was made in this read-only review. This report is not a new builder commission or permission to release anything.

Before candidate: 35 DONE, 137 PARTIAL, 32 MISSING, 204 total. Candidate proposal: 36 DONE, 136 PARTIAL, 32 MISSING, 204 total. The proposal remains **UNAWARDED**. This verdict supports no increase: admitted delta 0; OPP-003 STAYS PARTIAL. If the custodian records this refusal in candidate source, the exact flip is OPP-003 done → partial, keep current successful Evidence and append NEW-1 proof, replace the empty Gap with the wording above, and regenerate counts to 35 DONE, 137 PARTIAL, 32 MISSING (candidate-relative -1 DONE/+1 PARTIAL). Generated views must follow the lander's source rules; none was edited here. No counts from different candidates are summed.

Fresh-main guard: preserve main's entire Status AND full Gap, Evidence, provenance and newer assertions, not only its status labels. OPP-002 independence, OPP-007 queue qualification, TEAM-005 roles and all other existing holds stay untouched. Any eventual supported disposition remains with the installed source-lineage custodian and original integration family. Final integration still owes merged generator write/check/current counts, provenance naming this exact judged source and report, source lock LAST and its check, actually executed full-green exact-FINAL runtime Verify loading these journeys, complete full-history publication NEW 0, guarded main equality and exact-main Run site. Rows 3 and 11 stay pending until those actual guards; generated-only candidate failure is never promoted into final runtime green.

## Packet and custody

PLAN.md holds the full execution plan. RECEIPT.json, source-custody.json, source-path-review.json, focused-journeys.log and its receipt, verify-registration.json, CI-AND-CUSTODY.json, browser-functional.mjs, browser-functional.json and its command receipt, browser-functional.log and screenshots provide the actual non-secret results. Browser screenshots show functional evidence only; no UI or visual-quality judgment was assigned. No changed screens or product UI edits exist.

The browser and owned server have ended. Disposable browser state and dependencies are removed before evidence publication; the remaining disposable clone is deleted immediately after successful evidence return. The local packet is retained under the commission's fleet work directory. Publication is only to evidence/ct-judge-orbit-opp003-20261105-2330-sol1, never the product branch, main or a PR. Evidence publication conveys no product acceptance or landing.

## Evidence transport note

The first publication attempt stopped before any push: the added identity audit tried to fetch its main boundary through the local shallow filtered clone. Local upload-pack disables lazy promisor fetching, so it could not supply a missing main-tree object and exited 128 (HTTP not applicable; unknown). The audit was corrected to fetch the same declared repository’s public main boundary directly, shallow and filtered, using the existing decrypted-bundle Git helper. All candidate identities, messages and trailers are checked again before publication. This is transport-harness mechanics, not a product failure or a product retry. Actual sanitized diagnostics are in evidence-transport-diagnosis.json.
