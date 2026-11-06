# ACTION-005 exact-source independent product judgment

**Verdict: ACTION-005 ACCEPT ON LANDING.** R1, R2 and R3 are MET on the exact source. There is no substantive unmet outcome and no NEW correctness, exposure, regression or data-loss finding. DONE-RIDERS rows 3 and 11 remain PENDING under the expressly permitted candidate exception. This report awards no status, accepts no landing, transfers no acceptance to a different commit and releases no hold.

## Admission and custody

- Replacement tag: ct-judge-orbit-action005-20261105-1600-sol1. This is the single authorized replacement for ct-judge-orbit-action005-20261105-1600.
- Actual execution: gpt-6.1-sol, xhigh reasoning, Codex cloud subscription session. No other model, subagent, successor session, paid API or usage credits were used.
- Repository: just-every/run-orbit. Source branch: cloud/sd-orbit-c-f46. Exact reviewed source: 3ac8eb791b4d5731ba17adde0b3f454ee17f6b51. The disposable clone stayed detached at this commit throughout execution.
- Supplied comparison main: dc255241b0197b57fbae1e7c0edf3f7dc9a7b726. Fresh remote main observed during this review: c01084f133af9aa484a6c1f5151a4e9cfbc7230f. The remote source branch still advertised the exact reviewed source.
- The supplied request establishes that this is the first CT product judgment of this exact source for ACTION-005, with accepted(source)=[]; no prior exact-source judgment was reused or rejudged.
- No product source edits, commits, pushes, branch creation, PR, CI polling, rerun or dispatch, protected CLI mutation, submission, deployment, provider operation, status award, source-pin change, hold change or release occurred. Only local disposable test state and external report artifacts were created. Report-only evidence publication is separately authorized.
- Existing source and exact-chain holds remain as supplied. Their fleet receipts are unestablished locally; no INBOX or STATE file was read, and no hold was readmitted, resubmitted, changed or released. CT retains original-to-replacement custody and responsibility for retiring the original waiter after actual admission.

## Contract-derived product context

Only the pinned CONTRACT supplies this context. Orbit is a **Sales CRM** for a US small-business sales manager and their reps, selling in USD, using Google Workspace or Microsoft 365, across US timezones and daylight-saving transitions. The incumbent products are **HubSpot Sales Hub, Pipedrive and Salesforce Sales Cloud**; Attio, Day.ai and Twenty are also named competitors. The primary journey brings customer records across, connects sales evidence, works the explained NOW queue, prepares and sends relevant follow-up, and reconciles the customer's reply with the sales outcome.

The complete immutable CONTRACT, ACCEPTANCE, AGENTS and RULINGS inputs were retrieved from raw.githubusercontent.com at the exact source and matched byte-for-byte to the clone. Their full contents were read and indexed; the 204 source status rows were accounted for. The full ACTION-005 text, its generated row, written inheritance, adjacent recommendation, outreach and contactability requirements, all named journeys and their relied-on helpers and source were examined for this judgment. Unrelated clauses were not rejudged. Hashes and byte counts are retained in the source document receipt.

### Complete original requirement and acceptance

Requirement, unchanged from the supplied source:

> A reply, meeting, unsubscribe, do-not-contact, permanent bounce, changed recipient, changed opportunity, or replaced recommendation marks a draft stale. A stale draft is shown as stale, and sending it returns 409 and writes no outbound message until an operator opens it, sees what changed, and confirms.

Acceptance 1, unchanged:

> Change the customer/deal or deliver a stop event after drafting; refuse sending until the operator sees and explicitly reviews current differences.

The published metadata explicitly states `ACTION-005` cites BASE-ROLE-001. D-1 retains person-specific suppression: names, unrelated recipients and ambiguous outside text do not identify a stopped person. D-2 retains current saved identity, evidence, contactability and authority as the decision boundary. Broader mailbox, multi-recipient, agent-policy and team-role clauses retain their own obligations and are not new ACTION-005 bars.

All seven pinned RULINGS were read. None supplies an ACTION-005 acceptance rewrite or a new policy default. No original acceptance text was removed, narrowed or replaced.

## Frozen rubric, verbatim

R1 original single acceptance sentence: independently change the customer/contact and deal after drafting; the same saved draft stales; approval with valid revision and confirmation returns409, unchanged outbound inventory and zero provider submissions.
R2 original single acceptance sentence: another current-context edit invalidates the opened review; old review409/no saved-content or revision change; fresh review alone creates no outbound work, obsolete revision still refuses; only currently reviewed revision schedules exactly one future message with saved subject/body without mail submission.
R3 original single acceptance sentence: actual stale-review screen shows current recipient/deal and what changed, explicit confirmation, stale save/approve disabled, superseded review refused with reload; original meeting, reply, stop/suppression and changed-context generation refusal evidence retained. Run retained relevant public-door journeys; review screen proof1440/390.

These are the assignment's existing frozen rows. No per-field assertion, per-point test, hidden criterion, new visual bar or live-account requirement was added.

## One-clause judgment table

| Clause | Named journeys and public doors | Original acceptance and inherited duties reached | Exact-SHA Verify record | Judgment |
| --- | --- | --- | --- | --- |
| ACTION-005 — Stale draft | `tests/core/assistance.test.ts` — AI-001 DATA-002 ACTION-005 changed context refuses generation and stale drafts need fresh explicit review, calling `tests/support/stale-draft-review.ts`: authenticated Records PATCH, draft GET, review POST, approval preview and approval POST, message inventory GET. `tests/core/capture-boundaries.test.ts` — CAPTURE-003 CAPTURE-005 OUT-001 OUT-007 ACTION-005 RECORD-012 SIGNAL-009 a captured reply stops outreach at once while its proposals wait; capture never drafts, sends or makes anyone contactable, and only an operator session may capture: native multipart capture and source HTTP doors, populated accepted and scheduled work. `tests/e2e/stale-review.spec.mjs` — an operator reviews new meeting evidence and native record changes before a fresh draft revision: emitted browser documents, native Records edits and review form. Retained `tests/core/signals-outreach.test.ts` journeys are named below. | Complete original acceptance sentence, R1–R3, written BASE-ROLE-001, D-1 and D-2. Allowed current review and future scheduling complete; stale approval, obsolete revision, superseded review, unsafe capture and stopped dispatch refuse with unchanged relevant custody. | Supplied workflow_dispatch Verify 42054664493 on 3ac8eb791b4d5731ba17adde0b3f454ee17f6b51 failed only generated-view freshness and dependent failures; runtime shards skipped. This is not full green. Pinned workflow can run core and browser journeys on push, pull_request and dispatch. No CI request was made. Exact-final full runtime Verify remains required. | ACCEPT ON LANDING, with rows 3 and 11 pending. No award or automatic release. |

## Scores and observed outcomes

| Frozen row | Score | Actual observations and source corroboration |
| --- | --- | --- |
| R1 | MET | The native journey creates a real saved draft against a real migrated local D1 and signed-in operator, changes its contact name through Records, and proves the same draft identity and revision are stale. Approval uses that valid revision and a fresh quiet-hours confirmation and returns 409; the message inventory equals its baseline and the provider submission counter stays zero. Explicit current review clears staleness without outbound work. A separate native deal-title edit stales that same saved draft and the otherwise valid approval is refused again with unchanged inventory and zero submissions. Browser evidence independently shows both current-context edits. |
| R2 | MET | A further native deal edit invalidates the opened review token even though the saved draft revision has not changed. Posting the old revision and reviewedUpdatedAt returns 409; the entire read-back draft equals the pre-refusal snapshot and outbound inventory and provider calls are unchanged. Reading current contact and deal, reviewing the current snapshot, and then attempting the obsolete revision still returns 409 with no messages. Only approval of the fresh reviewed revision creates exactly one scheduled future message; its draft ID, revision, state, schedule, subject and body match the saved reviewed content, and provider submissions remain zero. The browser independently gets 409 for the superseded form, reloads current records, and confirms a fresh revision while generating no outbound work. |
| R3 | MET | The emitted browser journey retains its original new-meeting assertions and executes the current-recipient and current-deal reviews at 1440. Four actual captures at 1440 and 390 were viewed. They show the changed-context reason, current selected contact, current deal and retained meeting evidence, unchecked explicit confirmation, disabled confirmation and Save draft, and disabled Approve and send exact revision. The superseded review produces the reload refusal; reload shows Synthetic latest deal and the current recipient before confirmation. The native journey retains changed-context generation 409 with zero AI calls. The populated capture journey retains genuine reply cancellation and draft staleness, accepted person-specific do-not-contact, forged identity refusals and unchanged message and draft counts with no new provider submission. The retained stop journeys execute reply, meeting, unsubscribe and permanent bounce cancellation with zero stopped dispatch; unsafe current content, recipient, association, lifecycle and operator changes are refused. |

The approval-disabled observation is supported by the inspected captures and the unchanged `src/core/features/operator/ui/draft-approval.tsx` stale guards, alongside the actual native approval refusals. It is not represented as a new Playwright assertion. The browser's assertions run at 1440; 390 is functional screen proof, with no design or layout-quality judgment.

The populated capture fixture begins with two accepted customer messages, a scheduled follow-up and an unsent draft across two real contacts. Its refusal and stop checks do not rely solely on an empty inventory. The newly drafted contact-and-deal journey legitimately starts with no outbound work; the same journey ends by asserting the supported one-message scheduling case. External providers are test boundary adapters; the application routes, migrated database, auth checks, review, scheduler and emitted browser runtime are real. There is no live mail or production account claim.

### Retained focused journeys actually executed

- `tests/core/signals-outreach.test.ts` — OPP-008 completion removes an exhausted recommendation; new observed evidence produces another.
- `tests/core/signals-outreach.test.ts` — OUT-007 OUT-009 SEQUENCE-002 stage move, close and genuine reply end scheduled follow-up atomically; automatic reply and open report do not.
- `tests/core/signals-outreach.test.ts` — OUT-009 dispatch rechecks unchanged content, active operator, lifecycle, current recipient and association before claiming.
- `tests/core/signals-outreach.test.ts` — OUT-002 OUT-007 temporary provider blocks do not permanently suppress a contact; permanent bounces do.

The stop journey includes real native HTTP approval, signed genuine and automatic reply transport, record stage move and lifecycle doors; its initial stop-event loop also invokes native repositories and dispatch. The capture journey exercises the public capture door with the prior custody populated. No direct repository assertion is misrepresented as an independent live-provider proof. BASE-ROLE-001's unchanged native boundary was inspected: full operators proceed, collaborators cannot reach these native review and approval operations. The capture journey actually refuses unsigned, cross-origin and collaborator capture. The broader unchanged role surface was not requalified.

## Actual commands and exits

The following commands ran once for the selected journeys from the detached checkout. Each fresh shell sourced the supplied toolchain. Long-lived commands used cloud_run. The complete actual logs and command receipt accompany this verdict.

| Command | Exit and result |
| --- | --- |
| `pnpm install --frozen-lockfile` through cloud_run | 0; pnpm 10.12.4; no package or lock edits. |
| `pnpm exec tsx --test --test-concurrency=1 --test-name-pattern='AI-001 DATA-002 ACTION-005\|CAPTURE-003 CAPTURE-005 OUT-001 OUT-007 ACTION-005' tests/core/assistance.test.ts tests/core/capture-boundaries.test.ts` through cloud_run | 0; 2 passed, 0 failed, 0 skipped; 83,506.860175 ms. |
| `pnpm exec tsx --test --test-concurrency=1 --test-name-pattern='OPP-008 completion\|OUT-007 OUT-009 SEQUENCE-002\|OUT-009 dispatch rechecks\|OUT-002 OUT-007 temporary' tests/core/signals-outreach.test.ts` through cloud_run | 0; 4 passed, 0 failed, 0 skipped; 49,166.851280 ms. |
| `pnpm exec playwright test --config ../judge.playwright.config.mjs tests/e2e/stale-review.spec.mjs --grep 'ACTION-005'` through cloud_run | 0; 1 passed; 14.2-second test, total reported 1.0 minute; four captures. The external harness config is included in the packet; no tracked config was changed. |
| `node src/base/contract-docs.mjs check` | 1; exactly: ACCEPTANCE.md: generated content differs; run contract-docs write. No generator write or view edit was made. |
| `git diff --exit-code`, `git diff --cached --exit-code`, and `git status --porcelain=v1` | 0 and empty status; tracked tree and index unchanged. |

The receipt has the exact unescaped argv text for the two test patterns. The table escapes pipe characters only for Markdown rendering. The supplied toolchain selected pnpm 10.12.4 and retained the VM's newer Node v24.19.0; it does not downgrade to the repository's Node 22.20.0 pin. This runtime difference is recorded honestly; pinned CI remains a pending final guard. The browser used `/usr/bin/chromium` with --no-sandbox. The unchanged browser server applied real migrations, built the app through its existing build command, and served the emitted Worker locally. All command processes completed, browsers closed, and owned app servers stopped.

NOT RUN: full or baseline suite; complete Verify; live provider, real device or production account qualification; CI polling, rerun or dispatch; merged generation and source-lock regeneration; full-history publication scan; final landing and Run site. Reasons: focused once-only reviewer scope, explicit CI and product mutation prohibition, and duties reserved to the guarded lander. No missing live-account or device qualification is promoted to a product FIX. No secret or held-out material was sought or published.

## DONE-RIDERS 1–11

| Row | Assessment |
| --- | --- |
| 1 | Original substantive outcomes reached by the named native and browser journeys at the exact source. Local execution MET; recorded full-green exact-final workflow remains row 3's pending guard. No outcome is replaced with an implementation-only assertion. |
| 2 | MET: allowed fresh review and exact future scheduling succeed; stale and superseded attempts refuse. Populated capture and stop custody remain unchanged where required. No extra per-point tests were created. |
| 3 | PENDING: the supplied dispatch Verify 42054664493 failed generated ACCEPTANCE freshness and dependent jobs, with runtime skipped. The pinned workflow schedules all named core files and runtime-browser, but actual full-green runtime execution on the resulting exact FINAL head is still owed. No claim of green from another SHA. |
| 4 | MET for this review: all focused execution and four captures were produced while HEAD was the exact source, with no tracked modifications. The diff against supplied original main changes only CONTRACT, source lock, two extended test files and one helper; runtime, browser product source, dependencies and workflow are identical to that base. |
| 5 | MET: the ACTION-005 published metadata explicitly cites BASE-ROLE-001. D-1 and D-2 remain written global doors. Unchanged authority and adapters do not acquire new bars. |
| 6 | Mechanical landing work PENDING, not a product refusal: source ACTION-005 is proposed done with empty Gap and new named evidence, while generated ACCEPTANCE remains partial with its old Gap and counts. Local check confirms only that freshness diagnostic. Merged source provenance, counts and all newer main assertions must be reconciled before generation; no generated view is committed by this judge. |
| 7 | MET: ACTION-005 requirement and acceptance are unchanged in the complete diff; no new policy or acceptance ruling was inferred. Unrelated original prose and newer main judgments must remain intact. |
| 8 | MET for affected danger: current record and exact review fences refuse stale approval and superseded review; successful scheduling binds the fresh saved revision. Capture actually refuses unauthorized and collaborator requests. Unchanged broader team-role acceptance remains with its owning clauses. |
| 9 | MET as an honest boundary: local provider adapters prove no forbidden submission and current scheduling; they do not prove production delivery, provider consent, legal qualification or native devices. Those external fields remain unestablished and do not block this frozen rubric. |
| 10 | MET: no custody, consent, spending, authority or opt-out default is introduced by this candidate or this judgment. No policy choice was supplied by the judge. |
| 11 | PENDING: merged generator write and check, resulting counts and provenance, source lock generated LAST and checked, actual full-green exact-final runtime Verify containing relied-on journeys, complete full-history publication scan NEW 0, guarded landing equality with main, and green exact-main Run site. None was performed or awarded here. |

## Status, Gap, count delta and fresh-main preservation

At the source, CONTRACT proposes ACTION-005 partial to done, replaces only its Evidence cell with the named native and browser proof, and empties its Gap. The stale generated ACCEPTANCE still says partial. Its exact old Gap is:

> Unasserted in the carried evidence: customer/deal mutation stales draft; stale send refused; current differences shown before new review. Asserted: reply stop stales draft.

Each original missing outcome is now reached by R1–R3. On a permitted guarded landing the ACTION-005 Gap is empty; no original requirement or acceptance edit is authorized. If final integration cannot execute the relied-on journeys or introduces a substantive failure, the clause stays partial with that actual missing outcome stated; this report supplies no advance acceptance of changed code.

Conditional original claim, **unawarded**: full target **35 done, 137 partial, 32 missing → 36 done, 136 partial, 32 missing**, 204 IDs; published **27 done, 52 partial, 0 missing → 28 done, 51 partial, 0 missing**, 79 IDs. Target and push further remain 8 done, 85 partial, 32 missing, 125 IDs. This is one clause's delta and must not be summed with concurrent claims. Nothing was counted on main by this session.

Fresh main c01084f133af9aa484a6c1f5151a4e9cfbc7230f still has ACTION-005 partial and 35 done, 137 partial, 32 missing. Its 204 full status rows were compared with the source. Apart from ACTION-005, the differing rows are OUT-032 and PUBLIC-004: newer main adds established-upgrade execution evidence and a more precise remaining Gap to OUT-032, and uninvited callback populated-inventory refusal evidence to PUBLIC-004. Preserve both **entire newer main Evidence and Gap cells**, their statuses, their acceptance and source assertions, and all newer provenance. The exact newer rows are retained in the preservation receipt. This is not a judgment of those clauses, a replay of source-era current-main findings, or permission to overwrite them. The lander must freshly reconcile again if main advances.

The final guarded integration retains source and exact-chain holds until its own conditions are met. It resolves CONTRACT first using newer main clause judgments, regenerates its views without carrying builder edits to ACCEPTANCE or CLAIMS, preserves all unrelated prose and assertions, regenerates source lock LAST, and executes its own final guards. Evidence publication is report custody only.

## Complete blockers and disposition

Substantive failing frozen rows: **none**. NEW findings: **none**. Required reviewer journey NOT RUN: **none**. No product FIX is requested. Generated-view freshness, exact-final full runtime Verify and the guarded landing steps above remain pending; receipt form, Gap wording and broader live-account qualifications are not converted into refusal reasons. No landing, product READY, acceptance award or release has occurred.

**ACTION-005 ACCEPT ON LANDING**, conditional solely on the retained final integration guards. The disposable clone and dependencies are removed after the separate evidence packet is published and verified; the report packet remains outside that clone.
