# Orbit complete-product acceptance

The target is a full small-team US sales CRM replacing HubSpot Sales Hub, Pipedrive or Salesforce Sales Cloud, with Attio, Day.ai and Twenty as modern relationship/context comparators. The [contract](CONTRACT.md) defines the outcome, including every target clause below and the applicable [baseline](BASELINE.md). Buoy remains the separate post-sale customer-success product.

This is a build backlog and acceptance specification, not a claim of current product completion. Status is tied to inspected main `ef68930d3213735986e93c630827f0aa890862dc`, starting from the inventory code audit at `64f66dd936b78c84ef1d839c68fd735851752ae9` and re-reading changed evidence. `done` means source plus an exercising test for the stated behavior; `partial` identifies an implemented subset and its remaining work; `missing` has no implementation of that flow. Test paths are existing evidence, not claims of a new execution on this documentation commit. Hosted/provider outcomes remain unverified unless independently recorded for the exact candidate.

`rer verify` retains its existing bold published-clause execution catalog and fails unmapped, failed or skipped published IDs. All existing IDs and checks remain. New named target headings are not yet execution mappings: they remain mandatory acceptance obligations with the status below. A green existing-code execution report does not satisfy unfinished target clauses or the full text of a broadened clause. No result is waived, relabelled or manufactured to make this documentation pass. Build rounds must implement and map the target journeys without weakening the retained checks.

Complete acceptance requires an immutable exact candidate, frozen install, full CI, native empty-installation sign-in and authorized provider connections, realistic customer data, both 1440px desktop and 390px phone inspection, keyboard/accessibility checks, recorded failure/restart/revocation journeys, export/restore equivalence and an owner-intent-preserving update. Public Lobby, run site and fictional read-only demo retain their approved behavior. No owner data, mutation, AI call or sending authority may leak into the demo. Runtime test providers do not establish real mailbox delivery, a call, a booking, a signature or a payment.

For each journey below, use the named native page or documented public API, persist and reload its end state, and test the failure/stop case. Network/paid edges may use test doubles in automated suites only; final provider acceptance uses authorized test accounts and real recipient/device observations. Exact-message approval, current access, privacy and audit apply in every new flow. Report executed gates, incomplete target obligations and external unknowns separately. No new product screen was changed by this documentation-only round.

## Clause-by-clause journeys

### TEAM-001 — Equal operators.

Status: **partial**.

Sign in as two full administrators, a restricted seller and an invited analyst; confirm admin access and deny restricted users records/fields/actions outside their grants through UI and APIs.

Current evidence: `src/core/features/access/service.ts`; `src/core/features/records/routes.ts`; `newtests/t096/collaborator-lifecycle.test.ts`. Restricted collaborator access exists; native sellers remain full peers and the target role model is incomplete.

### TEAM-002 — Management.

Status: **partial**.

Invite an operator, accept sign-in, remove them, and attempt a new and previously issued session; exercise the setup-owner removal restriction.

Current evidence: `src/core/features/access/service.ts`; `src/core/features/records/routes.ts`; `newtests/t096/collaborator-lifecycle.test.ts`. Setup-owner and management policy breadth needs the exact native-management journey; collaborator roles do not establish seller hierarchy.

### TEAM-003 — One workspace.

Status: **partial**.

Complete first-run setup with US timezone and USD, change working hours and stale intervals, reload, and observe the persisted settings across records.

Current evidence: `src/core/features/access/service.ts`; `src/core/features/records/routes.ts`; `newtests/t096/collaborator-lifecycle.test.ts`. Workspace settings exist; multiple pipeline configuration is not implemented.

### TEAM-004 — Removal handover.

Status: **partial**.

Remove a rep with an owned opportunity and scheduled message; verify revoked sessions, cancellation, unassignment and attributed historical notes.

Current evidence: `src/core/features/access/service.ts`; `src/core/features/records/routes.ts`; `newtests/t096/collaborator-lifecycle.test.ts`. Removal and preserved history have implementation; complete handover acceptance is pending.

### RECORD-001 — Core records.

Status: **done**.

Through authenticated Records, create and edit a company, contact and USD opportunity with custom fields; reload and read back the associations and values.

Current evidence: `src/core/features/records/routes.ts`; `src/core/features/records/repository.ts`; `tests/core/crm-import.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### RECORD-002 — Associations.

Status: **partial**.

Associate two contacts and a company with a deal, choose the primary recipient, change the associations, and confirm historical timeline entries stay put.

Current evidence: `src/core/features/records/routes.ts`; `src/core/features/records/repository.ts`; `tests/core/crm-import.test.ts`. Core primary-company/deal associations exist; multiple company relationships and full historical acceptance are pending.

### RECORD-003 — Identity keys.

Status: **done**.

Create case/whitespace email and domain collisions through Records; require a 409 naming the existing identity and no extra row; exercise free-mail and keyless records.

Current evidence: `src/core/features/records/routes.ts`; `src/core/features/records/repository.ts`; `tests/core/crm-import.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### RECORD-004 — Duplicate merge.

Status: **done**.

Review two duplicates, choose field values and survivor, then change one reviewed record and require refusal; review again and merge once, inheriting a concurrent stop.

Current evidence: `src/core/features/records/merge-review.ts`; `tests/core/records-merge-review.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### RECORD-005 — Timeline.

Status: **done**.

Open a record containing mail, meetings, notes, changes and a merge; inspect occurred/recorded times, source and actor, including out-of-order events.

Current evidence: `src/core/features/records/routes.ts`; `src/core/features/records/repository.ts`; `tests/core/crm-import.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### RECORD-006 — Search and views.

Status: **partial**.

Search records and timeline text, apply owner/stage/band/queue filters and verify results; qualify the 500 ms p95 at declared capacity separately.

Current evidence: `src/core/features/records/repository.ts`; `tests/core/records-search.test.ts`; `tests/performance/records-capacity.ts`. Search/filter tests exist; capacity evidence is historical and must be rerun for the eventual product candidate.

### RECORD-007 — Ownership.

Status: **partial**.

Assign, reassign and unassign an opportunity through its native control; reload and inspect its attributed timeline without changing score.

Current evidence: `src/core/features/records/routes.ts`; `src/core/features/records/repository.ts`; `tests/core/crm-import.test.ts`. Owner assignment exists; full current-head public-door assignment/handover evidence is pending.

### RECORD-008 — Import.

Status: **done**.

Move mapped HubSpot/Pipedrive CSV contacts, companies, deals, notes and suppression through saved preview and Apply; replay, change a source row, interrupt and undo while preserving native edits and stops.

Current evidence: `src/core/features/imports/contracts.ts`; `tests/core/crm-import.test.ts`; `tests/core/crm-import-erasure.test.ts`; `tests/e2e/imports.spec.mjs`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### RECORD-009 — Duplicate candidates.

Status: **done**.

Create same-name contacts across companies and keyless records; review candidates without a mutation, then complete a chosen merge explicitly.

Current evidence: `src/core/features/records/import-merge.ts`; `tests/core/records-merge-review.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### RECORD-010 — Manual entries.

Status: **done**.

Log, edit and delete a note, call and meeting on a customer record; verify time, duration and attendees, and verify no score or external message changed.

Current evidence: `src/core/features/records/manual.ts`; `tests/core/today-brief.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### RECORD-011 — Related records.

Status: **partial**.

Open a company and contact, move a deal association, reload and compare linked deals, owner/stage and open-value total with the underlying records.

Current evidence: `src/core/features/records/routes.ts`; `src/core/features/records/repository.ts`; `tests/core/crm-import.test.ts`. Related projections exist; a complete total-and-reassociation journey is pending.

### RECORD-012 — Contactability.

Status: **done**.

Set do-not-contact, process unsubscribe and permanent-bounce events, then try immediate and scheduled sending; all remain blocked until an explicit current-state clear.

Current evidence: `src/core/features/records/suppression.ts`; `tests/core/launch-suppression.test.ts`; `tests/core/outreach-limits.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### RECORD-013 — Deletion.

Status: **done**.

Confirm each record deletion; company removal detaches dependents, deal removal preserves sent history, and contact removal performs the erasure journey.

Current evidence: `src/core/features/records/data.ts`; `tests/core/records-complete.test.ts`; `tests/core/contact-erasure.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### SIGNAL-001 — Ingestion.

Status: **done**.

POST a signed configured-source event through its ingestion route and read one attributed signal and linked timeline within the bound.

Current evidence: `src/core/features/ingestion/routes.ts`; `src/core/features/ingestion/repository.ts`; `tests/core/signals-outreach.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### SIGNAL-002 — Signal types.

Status: **done**.

Submit every standard type, a source-namespaced type and an unknown type; accept the first two classes and reject the unknown without writes.

Current evidence: `src/core/features/ingestion/routes.ts`; `src/core/features/ingestion/repository.ts`; `tests/core/signals-outreach.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### SIGNAL-003 — Idempotency.

Status: **done**.

Deliver identical events concurrently and after restart, then change the payload under the same source identity; retain one effect and a visible conflict.

Current evidence: `src/core/features/ingestion/routes.ts`; `src/core/features/ingestion/repository.ts`; `tests/core/signals-outreach.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### SIGNAL-004 — Linking.

Status: **done**.

Ingest exact, ambiguous and unknown identities; verify linked and held queues, then manually link the held event once and inspect evaluation.

Current evidence: `src/core/features/ingestion/routes.ts`; `src/core/features/ingestion/repository.ts`; `tests/core/signals-outreach.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### SIGNAL-005 — Event time.

Status: **done**.

Deliver older evidence after newer evidence and inspect chronological history and fresh evaluation without overwriting later record state.

Current evidence: `src/core/features/ingestion/routes.ts`; `src/core/features/ingestion/repository.ts`; `tests/core/signals-outreach.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### SIGNAL-006 — Evidence confidence.

Status: **done**.

Compare open/page-view inference with observed reply/booking evidence; inferred activity alone cannot create a deal, high band or evidence-backed action.

Current evidence: `src/core/features/ingestion/routes.ts`; `src/core/features/ingestion/repository.ts`; `tests/core/signals-outreach.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### SIGNAL-007 — No tracking.

Status: **done**.

Inspect public assets/network and submit identity-free page/chat events; no Orbit tracker runs and unsupported identity stays outside customer history.

Current evidence: `src/core/features/ingestion/routes.ts`; `src/core/features/ingestion/repository.ts`; `tests/core/signals-outreach.test.ts`. Implemented source and exercising tests for the no-tracker rule; OUT-016's opt-in mail tracking exception is tracked under OUT-016. Live hosted/provider acceptance remains separate.

### SIGNAL-008 — Ingestion failure.

Status: **done**.

POST invalid signatures, unknown sources, oversized input and injected persistence failure; verify status, no partial writes, replay safety and source diagnostics.

Current evidence: `src/core/features/ingestion/routes.ts`; `src/core/features/ingestion/repository.ts`; `tests/core/signals-outreach.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### SIGNAL-009 — Signed sources.

Status: **done**.

Exercise signed callbacks and HTTPS source-scoped automation; refuse invalid, disabled and rotated authority while retaining native session and ownership checks.

Current evidence: `src/core/features/ingestion/routes.ts`; `src/core/features/ingestion/repository.ts`; `tests/core/signals-outreach.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### CAPTURE-001 — File capture.

Status: **done**.

Upload mail and calendar files on Capture, replay and conflict them, then inspect original evidence and explicit invalid-date/identity/timezone errors.

Current evidence: `src/core/features/capture/intake.ts`; `src/core/features/capture/proposals.ts`; `tests/core/capture-intake.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### CAPTURE-002 — Known participants only.

Status: **done**.

Capture known and unknown participants; unknown mail is not retained by default and explicit one-import retention creates only held evidence.

Current evidence: `src/core/features/capture/intake.ts`; `src/core/features/capture/proposals.ts`; `tests/core/capture-intake.test.ts`. Implemented source and exercising tests for file and address capture; the connected-source new-prospect path is tracked under CAPTURE-012. Live hosted/provider acceptance remains separate.

### CAPTURE-003 — What capture applies at once.

Status: **done**.

Capture a threaded reply, booked meeting, permanent bounce and automatic reply; inspect atomic linking/stale/cancellation effects and verify automatic reply stops nothing.

Current evidence: `src/core/features/capture/intake.ts`; `src/core/features/capture/proposals.ts`; `tests/core/capture-intake.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### CAPTURE-004 — Reviewed proposals.

Status: **done**.

Open evidence-backed field/link proposals, accept/edit/decline and repeat; a concurrent field edit refuses stale acceptance and a decline stays declined.

Current evidence: `src/core/features/capture/proposals.ts`; `tests/core/capture-review.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### CAPTURE-005 — Human boundary.

Status: **done**.

Attempt capture with native, collaborator, source and delegation authority; only permitted native/address intake succeeds, and a proposed new contact stays blocked.

Current evidence: `src/core/features/capture/providers/oauth.ts`; `tests/core/capture-providers.test.ts`; `tests/core/capture-boundaries.test.ts`. Implemented source and exercising tests; the explicit contactability choice on accepting a new-prospect proposal is tracked under CAPTURE-012. Live hosted/provider acceptance remains separate.

### CAPTURE-006 — Capture sources (`capture.source.v1`).

Status: **done**.

Connect each Google/Microsoft read adapter, choose folders/calendars, page and crash before cursor commit; resume without duplicates, revoke, reconnect and disconnect with visible errors.

Current evidence: `src/core/features/capture/providers/service.ts`; `tests/core/capture-providers.test.ts`; `tests/core/capture-connector.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### CAPTURE-007 — Captured data.

Status: **done**.

Export/restore captured evidence and proposals, verify no source credential travels, erase a contact and replay intake to prove erased originals stay fenced.

Current evidence: `src/core/features/capture/privacy.ts`; `tests/core/capture-data.test.ts`; `tests/core/capture-upgrade.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### CAPTURE-008 — Orbit address.

Status: **done**.

Create and rotate a tagged Orbit address, forward/BCC mail and a Gmail confirmation; accept exact envelope tags only and count oversized mail without retaining it.

Current evidence: `tests/core/capture-no-console.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### CAPTURE-009 — Calendar link.

Status: **done**.

Add a private ICS link, advance the refresh clock, change/cancel an event, then break the link; inspect dedupe, preserved times and the halted-source reason.

Current evidence: `tests/core/capture-no-console.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### OPP-001 — Lifecycle.

Status: **partial**.

Close a deal as won and lost with reasons, ingest later evidence, and explicitly reopen; inspect history and queue membership at every step.

Current evidence: `src/core/features/opportunities/repository.ts`; `src/core/features/workbench/repository.ts`; `tests/core/signals-outreach.test.ts`. Lifecycle fields and reasons exist; the complete close/reopen journey is pending.

### OPP-002 — Independent state.

Status: **done**.

Change stage and owner and ingest scoring evidence; verify lifecycle, queue, stage, owner and score remain independently represented.

Current evidence: `src/core/features/records/repository.ts`; `tests/e2e/operator.spec.mjs`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### OPP-003 — Evaluation.

Status: **partial**.

Ingest weighted signals and edit an open opportunity; inspect computed score, band, contributions and policy version, including decay and closed-deal exclusion.

Current evidence: `src/core/features/opportunities/repository.ts`; `src/core/features/workbench/repository.ts`; `tests/core/signals-outreach.test.ts`. Scoring implementation exists; full decay/timing/closed-deal semantic breadth is pending.

### OPP-004 — Explainability.

Status: **done**.

Open a scored deal and follow every contribution to its source evidence and current action reason.

Current evidence: `src/core/features/opportunities/repository.ts`; `tests/e2e/operator.spec.mjs`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### OPP-005 — Evaluation failure.

Status: **done**.

Cause evaluation to fail after a valid score; read the last value as stale with failure time and verify no fabricated replacement.

Current evidence: `src/core/features/opportunities/repository.ts`; `src/core/features/workbench/repository.ts`; `tests/core/signals-outreach.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### OPP-006 — NOW ordering.

Status: **done**.

Create tied and untied NOW opportunities, filter by rep/stage/band and verify deterministic persisted ordering.

Current evidence: `src/core/features/opportunities/repository.ts`; `tests/e2e/operator.spec.mjs`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### OPP-007 — Queue entry.

Status: **done**.

Advance close/stale/awaiting clocks and deliver a form, reply, booking and send failure; inspect NOW/NEXT reasons and one timeline transition per event.

Current evidence: `src/core/features/opportunities/repository.ts`; `src/core/features/workbench/repository.ts`; `tests/core/signals-outreach.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### OPP-008 — Manual completion.

Status: **done**.

Complete or skip the current action without sending; inspect the recorded outcome and only a genuinely new recommendation.

Current evidence: `src/core/features/opportunities/repository.ts`; `src/core/features/workbench/repository.ts`; `tests/core/signals-outreach.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### OPP-009 — Pipeline stages.

Status: **partial**.

Create two pipelines with different ordered stages, move deals between stages and pipelines, and refuse deletion of an occupied stage; preserve move history and independent lifecycle.

Current evidence: `src/core/features/records/schema.ts`; `src/core/features/opportunities/repository.ts`. Only one pipeline and stage list exist; multiple pipelines, rules and safe cross-pipeline moves remain target work.

### ACTION-001 — Current recommendation.

Status: **partial**.

Read an open deal recommendation with observed evidence and version; disable AI and retain the named action/evidence without an invented explanation.

Current evidence: `src/core/features/assistance/provider.ts`; `src/core/features/drafts/service.ts`; `tests/core/assistance.test.ts`. Recommendations and cited drafts exist; full evidence/version and AI-absent journey remains pending.

### ACTION-002 — Replacement.

Status: **partial**.

Supersede an action by new evidence or an operator change; the old action remains historical and cannot be drafted, sent or completed.

Current evidence: `src/core/features/assistance/provider.ts`; `src/core/features/drafts/service.ts`; `tests/core/assistance.test.ts`. Supersession exists; complete old-action refusal evidence is pending.

### ACTION-003 — Draft on request.

Status: **done**.

Preview and request a draft from current customer evidence; inspect the unsent result for cited facts and configured instructions.

Current evidence: `src/core/features/assistance/provider.ts`; `src/core/features/drafts/service.ts`; `tests/core/assistance.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### ACTION-004 — Durable draft.

Status: **done**.

Edit recipient/subject/body, sign out, return and read the saved draft with its original source and edit attribution.

Current evidence: `src/core/features/drafts/service.ts`; `tests/e2e/operator.spec.mjs`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### ACTION-005 — Stale draft.

Status: **done**.

Change the customer/deal or deliver a stop event after drafting; refuse sending until the operator sees and explicitly reviews current differences.

Current evidence: `src/core/features/drafts/service.ts`; `tests/e2e/stale-review.spec.mjs`; `tests/core/capture-boundaries.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### OUT-001 — Human send boundary.

Status: **done**.

Attempt sending from ingestion, an agent and an unreviewed draft; only native exact-recipient/subject/body approval permits the unchanged message to dispatch.

Current evidence: `src/core/features/outreach/service.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/signals-outreach.test.ts`. Implemented source and exercising tests for single reviewed sends; batch approval is tracked under SEQUENCE-003. Live hosted/provider acceptance remains separate.

### OUT-002 — Message states.

Status: **done**.

Drive provider acceptance, delivery, bounce, failure and ambiguous responses; inspect each persisted state and truthful buyer-visible labels.

Current evidence: `src/core/features/outreach/service.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/signals-outreach.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### OUT-003 — Send idempotency.

Status: **partial**.

Submit the same approval key concurrently and after restart; observe one outbound intent and at most one provider submission.

Current evidence: `src/core/features/outreach/service.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/signals-outreach.test.ts`. Idempotent send machinery exists; full concurrent/restart public-door proof is pending.

### OUT-004 — Threading.

Status: **done**.

Deliver correct, foreign and absent reply headers with sender checks; attach the correct reply once and hold ambiguous mail for review.

Current evidence: `src/core/features/outreach/reply-matching.ts`; `tests/core/launch-reply-authority.test.ts`; `tests/core/launch-reply-sender.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### OUT-005 — Accepted outcome.

Status: **done**.

Accept an approved send, replay its provider response and inspect one timeline message, completed action, NEXT transition and notification.

Current evidence: `src/core/features/outreach/service.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/signals-outreach.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### OUT-006 — Delivery failure.

Status: **partial**.

Fail a submission transiently, permanently and ambiguously; verify bounded known-unsent retries, visible exhausted failure, one notification and permanent-bounce stop.

Current evidence: `src/core/features/outreach/service.ts`; `tests/core/outreach-limits.test.ts`. Known failure/limit behavior is tested; every retry/exhaustion/ambiguous outcome in the clause is not established by these citations.

### OUT-007 — Stop conditions.

Status: **done**.

Schedule a message, deliver reply/booking/unsubscribe/bounce or a manual stop, then advance dispatch; cancel the message and stale the draft without duplicates.

Current evidence: `src/core/features/outreach/service.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/signals-outreach.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### OUT-008 — Quiet hours.

Status: **done**.

Approve outside recipient-local quiet hours, including daylight-saving boundaries; require the extra immediate confirmation or delay the schedule to the permitted window.

Current evidence: `src/core/features/outreach/service.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/signals-outreach.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### OUT-009 — Scheduled send.

Status: **done**.

Schedule/cancel approved content, then change its evidence, permission and recipient before dispatch; only unchanged current authorized content can reach the provider.

Current evidence: `src/core/features/outreach/scheduler.ts`; `tests/core/outreach-limits.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### OUT-010 — Sending limits.

Status: **done**.

Exhaust deployment and rep limits before immediate and scheduled submission; retain a visible unsent item with its reason and next permitted time.

Current evidence: `src/core/features/outreach/service.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/signals-outreach.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### OUT-011 — Unresolved submission.

Status: **partial**.

Lose the acceptance transaction or provider response; restart and reconcile the durable intent without submitting again, ending once as accepted or visibly unresolved.

Current evidence: `src/core/features/outreach/service.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/signals-outreach.test.ts`. Reconciliation tests exist; real provider lookup and the full 24-hour unresolved journey remain unproven.

### OUT-012 — Unsubscribe.

Status: **done**.

Inspect unsubscribe headers on actual submitted mail, receive a signed unsubscribe and confirm future sending and scheduled work are suppressed.

Current evidence: `tests/core/outbound-boundaries.test.ts`; `tests/core/outreach-limits.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### AI-001 — Provider and input.

Status: **done**.

Open an AI request preview, inspect all customer fields and instructions, then compare the provider-edge request with that exact unchanged preview.

Current evidence: `src/core/features/assistance/provider.ts`; `tests/core/assistance.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### AI-002 — Output validation.

Status: **done**.

Return invalid schema, foreign citations and a transport error at the provider edge; fail invalid content visibly with no invented repair and bound transport retry.

Current evidence: `src/core/features/assistance/provider.ts`; `tests/core/assistance.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### AI-003 — Provider failure.

Status: **done**.

Leave AI unconfigured and fail a configured request; finish manual CRM, ingestion, scoring and handwritten outreach flows while generation reports failure.

Current evidence: `src/core/features/assistance/provider.ts`; `tests/core/assistance.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### AI-004 — Cost.

Status: **done**.

Generate successful and failed requests, then inspect provider/model/tokens/duration/status/cost and day/feature totals in Settings.

Current evidence: `src/core/features/assistance/provider.ts`; `tests/core/assistance.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### BRIEF-001 — Today's brief.

Status: **done**.

Open Today with fresh, held and unlinked events; follow every line to evidence, mark seen, receive a later event and confirm it remains new.

Current evidence: `src/core/features/today/brief.ts`; `src/core/features/today/promises.ts`; `tests/core/today-brief.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### BRIEF-002 — Overdue promises.

Status: **done**.

Advance past each task/reply/meeting/draft deadline, complete the corresponding obligation and verify overdue lines appear and clear from actual records.

Current evidence: `src/core/features/today/brief.ts`; `src/core/features/today/promises.ts`; `tests/core/today-brief.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### BRIEF-003 — Account summary.

Status: **done**.

Preview an account summary, alter the brief before generation and require refusal; generate on a fresh preview and reject uncited provider output.

Current evidence: `src/core/features/today/brief.ts`; `src/core/features/today/promises.ts`; `tests/core/today-brief.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### BRIEF-004 — Meeting plan.

Status: **done**.

Open a linked meeting, inspect resolved/unresolved attendees and promises, save agenda/prep and create a cited internal task without customer outreach.

Current evidence: `src/core/features/today/brief.ts`; `src/core/features/today/promises.ts`; `tests/core/today-brief.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### BRIEF-005 — Agent handoff.

Status: **done**.

Read a selected-record brief/meeting through delegation, propose a cited handoff, review it natively and revoke the grant; no outside evidence or sending becomes available.

Current evidence: `src/core/features/today/brief.ts`; `tests/delegation/brief-handoff.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### NOTIFY-001 — Responsible operator.

Status: **done**.

Trigger queue entry, reply and delivery problems on assigned and unassigned deals; verify responsible recipients and one notification on replay.

Current evidence: `src/core/features/notifications/routes.ts`; `tests/core/assistance.test.ts`; `tests/e2e/zz-notifications.spec.mjs`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### NOTIFY-002 — Read state.

Status: **done**.

Open and mark notifications read across sessions; inspect recipient-specific state and an unread count without duplicate events.

Current evidence: `src/core/features/notifications/routes.ts`; `tests/core/assistance.test.ts`; `tests/e2e/zz-notifications.spec.mjs`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### PUBLIC-001 — Landing page.

Status: **partial**.

Visit the public app Lobby and separate run site without a session; verify branding/sign-in links and no installation customer data in HTML or network.

Current evidence: `src/base/lobby.ts`; `tests/e2e/baseline.spec.mjs`. Current app root is Base Lobby and the approved marketing page is a separate run site; exact-candidate public acceptance is pending.

### PUBLIC-002 — Safe demo.

Status: **done**.

Browse the labelled fictional demo and unknown paths at desktop/mobile sizes; verify no owner-data read, D1 write, AI request or send.

Current evidence: `src/demo.ts`; `tests/core/public-demo.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### PUBLIC-003 — Unconfigured sign-in.

Status: **done**.

Visit sign-in without configured mail/provider; see unavailable state and attempt to obtain a session without a valid native proof.

Current evidence: `src/base/lobby.ts`; `tests/e2e/baseline.spec.mjs`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### PUBLIC-004 — Native sign-in.

Status: **done**.

Request and confirm a native magic link, test unknown/inactive and expired/reused links, sign out and exercise optional linked identity without admitting new operators.

Current evidence: `src/core/features/identity/index.ts`; `tests/core/identity.test.ts`; `tests/core/prior-auth-upgrade.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### DATA-001 — Export contents.

Status: **partial**.

Export through both supported archive doors, restore into eligible empty product state, export again and compare domain contents, captured evidence and audit with declared authority exclusions.

Current evidence: `src/core/features/records/archive-export.ts`; `src/core/features/records/archive-import.ts`; `tests/core/archive-transfer.test.ts`. Both archive paths exist, with different formats and exclusions; full target additions do not yet round-trip.

### DATA-002 — Contact erasure.

Status: **done**.

Delete a contact containing aliases, imported/captured mail and notes, drafts and transfer copies; verify search/export/AI/mail absence and anonymized audit within five minutes, including replay.

Current evidence: `src/core/features/records/data.ts`; `tests/core/contact-erasure.test.ts`; `tests/core/crm-import-erasure.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### DELEGATE-001 — Selected application authority.

Status: **done**.

Authorize selected records through native consent and PKCE, read and propose a handoff, refuse outside scope, revoke immediately, and restore without restoring credential authority.

Current evidence: `src/core/features/delegation/protocol.ts`; `tests/delegation/authority-regressions.test.ts`; `tests/delegation/archive-regression.test.ts`. Scoped delegation exists; never grants outreach authority.

### TEAM-005 — Sales roles and private records.

Status: **partial**.

Invite a manager and two reps, make one account private, deny its record and field through direct URLs/search/API/report/export/AI preview, share it intentionally, then revoke and repeat after sign-out and restore.

Current evidence: `src/core/features/access/service.ts`; `src/core/features/access/field-policy.ts`; `newtests/t096/collaborator-lifecycle.test.ts`. Collaborator record/field restrictions exist; native seller/team hierarchy and per-action sales roles are missing.

### RECORD-014 — Configurable sales data and custom objects.

Status: **partial**.

Create a Territory object and required deal field, validate bad input, qualify a lead, link stakeholders, save a filtered view, bulk-change selected records with one denied item, then archive a field and inspect history/export.

Current evidence: `src/core/features/records/schema.ts`; `src/core/features/graph/repository.ts`; `tests/core/crm-import.test.ts`. Native custom JSON fields and graph projections exist; configurable schema, conversion, saved views and bulk workflows are incomplete.

### RECORD-015 — Deal stakeholders and buying context.

Status: **partial**.

Associate champion and evaluator with a USD deal, add a verified decision-maker and a second-company relationship, move the primary association and inspect the preserved customer history and authorization.

Current evidence: `src/core/features/records/repository.ts`; `src/core/features/graph/repository.ts`; `tests/core/crm-import.test.ts`. Basic deal/contact/company associations exist; stakeholder roles and broader relationship authoring remain target work.

### MIGRATE-001 — HubSpot Sales Hub migration.

Status: **partial**.

From Import choose HubSpot, authorize a test account and preview a multi-company export/API pull including activities and associations; apply, interrupt/resume and rerun; compare source totals and undo around native edits. Final acceptance includes a real authorized customer export.

Current evidence: `src/core/features/imports/contracts.ts`; `tests/core/crm-import.test.ts`; `tests/e2e/imports.spec.mjs`. Reviewed HubSpot CSV presets cover core records/deals/prepared notes; connected migration and full activity/owner/pipeline coverage are missing.

### MIGRATE-002 — Pipedrive migration.

Status: **partial**.

Choose Pipedrive, connect an authorized account containing two pipelines and cross-linked activities, preview/apply, resume a rate-limited page and rerun; reconcile every exported entity and association, then undo without losing a native note. Include a real authorized export.

Current evidence: `src/core/features/imports/contracts.ts`; `tests/core/crm-import.test.ts`. Pipedrive core CSV presets exist; complete connected migration, products and activity history remain missing.

### MIGRATE-003 — Salesforce Sales Cloud migration.

Status: **missing**.

Connect a Salesforce sandbox with converted leads, two record types and linked activity/custom-object data; dry-run, map, apply, interrupt/resume and rerun, reconcile record/association totals and demonstrate conflict-preserving undo. Repeat with an authorized real export.

Current evidence: No implementation found.. No implementation of this complete target flow was found.

### CAPTURE-010 — Continuous authorized mail and calendar reads.

Status: **partial**.

Connect each provider through Capture, import historical and new Inbox/Sent/calendar items, crash/resume an incremental page, resolve ambiguous deal links, see an unknown correspondent become a CAPTURE-012 proposal, revoke/reconnect and verify no unauthorized folder/mailbox is read. Complete an authorized live Gmail and Microsoft tenant journey.

Current evidence: `src/core/features/capture/providers/google.ts`; `src/core/features/capture/providers/microsoft.ts`; `src/core/features/capture/providers/service.ts`; `tests/core/capture-providers.test.ts`. Read adapters, durable selected-scope cursors and OAuth safeguards exist; current fixed calendar window needs explicit extension and live provider acceptance is unmeasured.

### CAPTURE-011 — Two-way calendar and CRM activity.

Status: **partial**.

For both calendars create an approved meeting in Orbit, verify it in the provider, reschedule it there and read it back, edit concurrently, cancel one recurring occurrence and reconnect after revocation without duplicate invitations.

Current evidence: `src/core/features/capture/providers/google.ts`; `src/core/features/capture/providers/microsoft.ts`; `tests/core/capture-providers.test.ts`. Provider calendars are read and cancellation occurrences captured; calendar writeback and invitations do not exist.

### CAPTURE-012 — New prospects from connected mail and calendars.

Status: **partial**.

With a connected Gmail source, send from Gmail to an unknown address at an unknown non-free-mail domain and receive their reply; also receive cold inbound mail from a second unknown person and a bulk newsletter. Verify proposals for the two people (none for the newsletter) with direction and evidence; accept the first with the `rep-initiated conversation` basis and see the full thread back-filled once on the new contact and company, then reply from Orbit on the same thread. Decline the second and confirm it is not proposed again, then create a contact manually for a third earlier correspondent and see their history back-filled. Repeat the inbound case through Microsoft 365.

Current evidence: `src/core/features/capture/intake.ts`; `src/core/features/capture/routes.ts`; `src/core/features/capture/sources.ts`; `tests/core/today-brief.test.ts`. File uploads can keep unknown-participant mail as held unlinked evidence; connected sources still discard it, and new-prospect proposals, back-fill and the recorded contactability basis are missing.

### FORM-001 — Lead capture forms on the buyer's website.

Status: **partial**.

Build a Contact sales form mapping name, email, company, phone and a custom deal-size field, publish it hosted and embedded on an allowlisted test HTTPS domain, and submit from that domain both framed and by direct post: a new person, an existing contact with a changed name, a honeypot-filled bot entry, a too-fast entry, a replay and a post from a non-allowlisted origin. Verify the contact, company and deal creation, the reviewed proposal for the changed name with the stored value untouched, the consent record, round-robin owners alternating across two reps, one notification per accepted submission, NOW entry, spam and origin refusals with counts, and no cookie or tracker on either page.

Current evidence: `src/core/features/forms/service.ts`; `src/core/features/forms/native-capture.ts`; `src/core/features/forms/embedding.ts`; `src/core/platform/response-policy.ts`; `newtests/t096/forms-native.test.ts`. A reviewed hosted form with five fixed contact fields, framed embedding on allowlisted origins, exact-email create-or-update that leaves existing contacts unchanged for review, consent records, idempotent atomic intake and observed form signals exist; company/deal/custom-property mapping, direct cross-origin posting, spam protection, owner rotation and team notification are missing.

### OUT-013 — Gmail and Microsoft 365 mailbox sending.

Status: **missing**.

Connect each provider, review recipient/subject/body/signature/attachment, send once and verify provider Sent, a real recipient reply and Orbit threading; revoke before a scheduled send and cause a timeout to demonstrate visible uncertainty with no duplicate or transport switch.

Current evidence: No implementation found.. No implementation of this complete target flow was found.

### OUT-014 — Reusable personalized templates and sales content.

Status: **missing**.

Save a team template, render it for two contacts, block one with a missing field, approve one, revise the template and confirm the approved bytes remain unchanged; send an authorized attachment and refuse a forbidden one.

Current evidence: No implementation found.. No implementation of this complete target flow was found.

### OUT-015 — Honest open and reply tracking.

Status: **partial**.

Ingest accepted/delivered/open events and genuine/automatic/foreign replies; show each distinct status and provenance on the same deal, label unknown opens honestly, and verify only a genuine linked reply exits follow-up.

Current evidence: `src/core/features/outreach/provider-events.ts`; `src/core/features/outreach/reply-sender.ts`; `tests/core/signals-outreach.test.ts`; `tests/core/launch-reply-authority.test.ts`. Provider events and reply attribution exist; end-to-end mailbox/open reporting is not complete.

### OUT-016 — Disclosed per-message open and click tracking.

Status: **missing**.

Enable open and click tracking with disclosure, approve a tracked one-to-one message sent through OUT-013 Gmail and a tracked sequence step sent through Microsoft 365, open each in a real mail client and click a link; verify one inferred open and one click signal on the deal, a 302 to the unchanged reviewed destination, one deduplicated real-time rep notification, a proxy prefetch and a scanner click labelled automated, no cookie or script, no sequence exit or high band from the open, and `not tracked` on an untracked message; mark the contact do-not-track, erase another contact and verify nothing further is recorded.

Current evidence: No implementation found. No tracking token, link redirect or tracked open/click signal exists; Orbit currently serves no tracker under SIGNAL-007.

### TASK-001 — Assigned prioritized recurring sales tasks.

Status: **partial**.

Create a high-priority due call and weekly follow-up, assign/reassign and complete from the daily task view, restart around recurrence and verify one next occurrence; remove the rep and hand over remaining tasks.

Current evidence: `src/core/features/delegation/effects.ts`; `src/core/features/today/plan-actions.ts`; `tests/delegation/brief-handoff.test.ts`; `tests/core/today-brief.test.ts`. Linked assigned due tasks and review exist; explicit priority, recurrence, unified task calendar and full handover are incomplete.

### NOTIFY-003 — Reminders that reach an absent seller.

Status: **missing**.

Leave Orbit closed, advance a task reminder/digest schedule, receive it in a real mailbox/device and inspect its evidence link; complete or reassign the task before dispatch, simulate a provider failure and restart without stale or duplicate reminders.

Current evidence: No implementation found.. No implementation of this complete target flow was found.

### SEQUENCE-001 — Multi-step sales sequences.

Status: **partial**.

Create a five-step email/call/manual-LinkedIn sequence, enroll eligible contacts with exact-content approvals, complete the manual task, advance business time and restart mid-step; verify one action per due step, per-rep limit enforcement and no unapproved send.

Current evidence: `src/core/features/outreach/scheduler.ts`; `src/core/features/drafts/service.ts`; `tests/core/outreach-limits.test.ts`. Reviewed single scheduled messages exist; multi-step definitions, enrollments and manual step execution are missing.

### SEQUENCE-002 — Immediate sequence exits and accountable outcomes.

Status: **partial**.

Race an approved due step with each reply/booking/stage/stop event, restart and replay; verify no prohibited send, one exit reason and separate reply/meeting/deal-outcome measures.

Current evidence: `src/core/features/ingestion/stop-repository.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/signals-outreach.test.ts`. Contact-level scheduled-message stop rules exist; enrollment/stage exits and outcome reporting are missing.

### SEQUENCE-003 — Bulk enrollment with one reviewed batch approval.

Status: **missing**.

From a saved list of 50 eligible and 3 ineligible contacts, enroll all of them in a five-step sequence with four email steps in one action; inspect the excluded reasons, open any rendered message, edit one and remove one, then approve once. Advance business time and verify one provider submission per due email step per remaining recipient with no further approval, a per-rep limit of 40 per day deferring the rest visibly to the next window, a merge-field change on one contact holding only that recipient's step for review, and a workflow-triggered contact waiting in the owner's approval queue until its batch is approved.

Current evidence: No implementation found. Reviewed single scheduled messages exist under OUT-009; sequences, batch rendering and batch approval do not.

### AUTO-001 — Configurable sales workflows and visible execution.

Status: **partial**.

Preview and activate a stale-deal rule, trigger it twice, change the record and revoke permission before dispatch; inspect one authorized task/notification, no stale field write/send, and an actionable failed webhook run after restart.

Current evidence: `src/core/features/capture/proposals.ts`; `src/core/features/delegation/effects.ts`; `tests/core/capture-review.test.ts`. Fixed reviewed proposals and handoffs exist; configurable workflow authoring and durable run management are missing.

### CALL-001 — Provider-backed click-to-call.

Status: **partial**.

Connect Twilio and Aircall in turn, initiate a call from a real deal to an authorized test number, record answered/no-answer/failed dispositions, replay callbacks and revoke the connection; verify one truthful linked call each time.

Current evidence: `src/core/features/records/manual.ts`; `tests/core/today-brief.test.ts`. Manual call logging exists; Twilio/Aircall dialer and call-provider callbacks are missing.

### CALL-002 — Consented recordings and cited transcripts.

Status: **partial**.

Record an authorized test call, decline consent on another, read timestamped transcript evidence from the deal, correct a speaker and approve a stale-guarded proposal; deny an unauthorized user and erase local and provider copies.

Current evidence: `src/core/features/records/manual.ts`; `src/core/features/capture/proposals.ts`; `tests/core/capture-review.test.ts`. Reviewed evidence updates and logged calls exist; recording, transcription and provider erasure are missing.

### REPORT-001 — Sales dashboards and saved reports.

Status: **partial**.

Build and save a US monthly report for two pipelines containing won/lost/open deals and rep activities, reconcile every total and reason by drill-through, export and reopen it after access revocation and late evidence.

Current evidence: `src/core/features/analytics/metrics.ts`; `src/core/features/analytics/report-routes.ts`; `newtests/t096/report-disclosure.test.ts`; `newtests/t096/report-time-boundaries.test.ts`. Versioned count/sum/mean/ratio reports and disclosed snapshots exist; the full sales/activity/outcome suite and drill-through remain incomplete.

### REPORT-002 — Shared sales dashboards.

Status: **missing**.

As a manager, build a dashboard with at least four tiles: open pipeline by stage across two pipelines, won/lost reasons this quarter, activities by rep, and forecast against quota. Apply owner, team and date-range filters, share it with the sales team and set it as the team default. Sign in as a restricted rep and verify that the same dashboard opens by default and shows only totals that reconcile with that rep's permitted drill-through, with no hidden count. Schedule a weekly email to the manager and the rep and verify each received copy matches its recipient's access. Delete one source report and see an unavailable tile.

Current evidence: No implementation found. Single saved reports and snapshots exist under REPORT-001; dashboard composition, filters, sharing, defaults and scheduled delivery do not.

### FORECAST-001 — Weighted forecasts, quotas and revenue schedules.

Status: **missing**.

Create USD 10,000 at 30% and USD 20,000 at 60%, require USD 15,000 weighted total, apply a documented override and close one won; compare rep/team quota attainment, recurring schedule and preserved prior-period snapshot.

Current evidence: No implementation found.. No implementation of this complete target flow was found.

### QUOTE-001 — Products, quotes and signatures.

Status: **missing**.

Quote two products with discount and tax disclosure, require manager approval above its threshold, send the approved version through DocuSign, reject an old version and process signed/declined callbacks once; review the resulting billing handoff.

Current evidence: No implementation found.. No implementation of this complete target flow was found.

### INTEGRATE-001 — Dial and Calendly bookings.

Status: **partial**.

Connect Dial and Calendly, share a reviewed link, book/reschedule/cancel from each provider and inspect the same deal activity and sequence exit; replay and reject a forged callback.

Current evidence: `src/core/features/ingestion/booking-webhooks.ts`; `src/core/features/ingestion/calendly-setup.ts`; `tests/core/source-onboarding.test.ts`. Calendly signed booking ingestion and guided callback registration exist; native Dial links and complete reschedule/completion lifecycle are missing.

### INTEGRATE-008 — Buoy post-sale handoff.

Status: **missing**.

Close an authorized USD deal won, preview and approve its Buoy handoff, inspect the linked receiving account/owner and acceptance, then replay, revoke access and fail the provider; verify one handoff, visible failure and no customer-success workflow built inside Orbit.

Current evidence: No implementation found.. No implementation of this complete target flow was found.

### INTEGRATE-002 — Zoom meetings and preparation.

Status: **missing**.

Connect Zoom, attach an authorized meeting to a deal, open its preparation, finish it and review a cited recap; deny recording permission, replay completion and cancel a second meeting without fabricated context.

Current evidence: No implementation found.. No implementation of this complete target flow was found.

### INTEGRATE-003 — Nectar and Stripe billing context.

Status: **missing**.

Link a Stripe test customer and Nectar account to a USD deal, ingest invoice paid/past-due/refund events, replay them and inspect one status timeline; approve a billing handoff and deny a mismatched customer.

Current evidence: No implementation found.. No implementation of this complete target flow was found.

### INTEGRATE-004 — HappyToHelp, Help Scout and Zendesk account context.

Status: **missing**.

Connect each support service, map a customer, open a ticket on its sales account, restrict a ticket and revoke access; verify current visibility and one reviewed handoff with a returned support outcome.

Current evidence: No implementation found.. No implementation of this complete target flow was found.

### INTEGRATE-005 — Slack sales notifications and handoffs.

Status: **missing**.

Route a stage event and overdue task to an authorized Slack channel, replay the event, deny a private-account disclosure and submit a revoked or foreign action; inspect one correct notification and attributable task.

Current evidence: No implementation found.. No implementation of this complete target flow was found.

### INTEGRATE-006 — QuickBooks Online and Xero accounting handoff.

Status: **missing**.

For both services approve a USD quote-to-invoice handoff, inspect provider lines/tax/identity, receive partial and full payment status and replay a timed-out result without a second invoice.

Current evidence: No implementation found.. No implementation of this complete target flow was found.

### INTEGRATE-007 — Mailchimp audience and suppression handoff.

Status: **missing**.

Preview an audience containing subscribed, unknown and stopped contacts; sync only the authorized subset, ingest unsubscribe and replay a prior subscription update; verify no resumed outreach or duplicate subscriber.

Current evidence: No implementation found.. No implementation of this complete target flow was found.

### ENRICH-001 — Licensed enrichment and change signals.

Status: **partial**.

Configure a Clay waterfall with two permitted providers, preview cost/fields, enrich a company and contact, refresh a verified job change and conflicting phone, exceed budget, fail one provider and erase/replay; no guessed identity, invented value or outreach permission appears.

Current evidence: `src/core/features/capture/intake.ts`; `src/core/features/capture/proposals.ts`; `tests/core/capture-review.test.ts`. Captured evidence proposes field changes; licensed sources, scheduled news/job signals and enrichment waterfalls are missing.

### API-001 — Public REST API and outbound webhooks.

Status: **partial**.

Create/update/list a deal with a scoped API credential, test pagination, stale writes, revoked scope and denied fields, subscribe an endpoint and verify signed replay-safe change events and visible failed delivery; erase the contact and verify API/export absence.

Current evidence: `src/core/features/ingestion/routes.ts`; `src/core/features/delegation/protocol.ts`; `tests/core/source-onboarding.test.ts`; `tests/delegation/authority-regressions.test.ts`. Session-protected native APIs, signed inbound events, Zapier/Make source automation and narrow delegation exist; general public credentials/API and outbound subscriptions are missing.

### MOBILE-001 — Sales on mobile and desktop.

Status: **partial**.

Use the same realistic USD account on desktop, 390px web, iOS and Android; complete task/call/note/stage and exact-message journeys, lose network mid-edit, resolve a conflict, receive push and revoke the device without stale sends.

Current evidence: `tests/e2e/operator.spec.mjs`; `tests/delegation-browser/viewport.test.ts`; `newtests/t096/report-disclosure.test.ts`. Responsive native web journeys exist; native mobile apps, offline conflict handling and push reminders are missing.

### DATA-003 — Full-target portability, privacy and audit.

Status: **partial**.

Populate each target feature, export/restore/export and reconcile content and anonymous audit while proving no credential or dispatch authority travels; erase a contact and inspect every read/search/report/AI/export plus pending provider deletion without claiming external recall.

Current evidence: `src/core/features/records/archive-export.ts`; `src/core/features/records/archive-import-context.ts`; `tests/core/capture-data.test.ts`; `tests/core/crm-import-erasure.test.ts`. Native archive, erasure and capture privacy exist; target-feature portability and external deletion outcomes await those features.

### OPS-001 — Owned operation and explicit provider failures.

Status: **partial**.

Install an empty edition through the supported CLI, sign in, configure one mail provider, revoke it, restart and upgrade with populated data; inspect credential-free diagnostics, working manual records and preserved audit, then reconnect without replaying customer actions.

Current evidence: `src/core/features/identity/index.ts`; `tests/core/prior-auth-upgrade.test.ts`; `tests/core/capture-providers.test.ts`; `tests/core/provider-redirects.test.ts`. Core operational guards and read-provider failures are implemented; the whole target connector and mobile delivery surface is not.

### AGENT-001 — Keep the customer graph current with evidence.

Status: **partial**.

Authorize one account, introduce a job change and contradictory spoken/written commitment, inspect cited proposals and missing decision-maker question, change a field before acceptance and require conflict; accept another, decline one, revoke the source and erase/replay without re-creation.

Current evidence: `src/core/features/capture/intake.ts`; `src/core/features/capture/proposals.ts`; `tests/core/capture-review.test.ts`; `tests/delegation/brief-handoff.test.ts`. Reviewed provenance-bound capture updates exist; call/enrichment graph maintenance and stakeholder inference are not complete.

### AGENT-002 — Explain stalled deals and contradictory commitments.

Status: **partial**.

Use deals with recent opens but no reply, a missing approver and contradictory quote/call dates; inspect precise cited risk and next action, dismiss one and approve another task, then verify no autonomous stage or forecast change.

Current evidence: `src/core/features/today/promises.ts`; `src/core/features/today/brief.ts`; `src/core/features/workbench/repository.ts`; `tests/core/today-brief.test.ts`. Evidence-based stale queues and overdue promises exist; stakeholder, purchase/quote and contradictory-commitment analysis is missing.

### AGENT-003 — Follow the next action through to a customer outcome.

Status: **partial**.

Accept a meeting follow-up obligation, review and approve its exact draft, fail then reconcile its provider outcome, receive a reply without stage movement and inspect the still-open advancement goal; advance the deal or stop explicitly and verify all remaining work exits once.

Current evidence: `src/core/features/today/promises.ts`; `src/core/features/today/plan-actions.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/today-brief.test.ts`; `tests/core/signals-outreach.test.ts`. Brief promises, handoffs and reviewed scheduled outreach exist; durable cross-step quote-to-close outcome supervision is missing.

### AGENT-004 — Controlled research and agent workflow blocks.

Status: **partial**.

Configure a selected-account web/MCP research block with a USD cap, preview its data, return structured citations into a proposed workflow task, inject untrusted instructions and revoke access mid-run; verify only allowed evidence leaves, no external message runs and budget/schema failures remain visible.

Current evidence: `src/core/features/assistance/provider.ts`; `src/core/features/delegation/protocol.ts`; `tests/core/assistance.test.ts`; `tests/delegation/authority-regressions.test.ts`. Cited AI requests and scoped application evidence/handoffs exist; configurable web/MCP research agents and research-to-workflow runs are missing.

### BOUNDARY-001 — Separate products and US-first delivery.

Status: **partial**.

Walk a US buyer from a USD deal through booking, support context, signed quote, billing/accounting and post-sale Buoy handoff; inspect the correct product links, ownership boundaries and unresolved provider setup without a substituted mock or a reduced CRM scope.

Current evidence: `src/core/features/ingestion/booking-webhooks.ts`; `tests/core/source-onboarding.test.ts`. Native USD defaults and Calendly integration exist; the complete cross-product handoff set is missing.

## Completion accounting

123 product clauses: **61 done, 46 partial, 16 missing**. Baseline obligations remain additional requirements. The status table at the end of CONTRACT.md and the journeys here describe the same set of IDs and statuses. No target is declared complete by its presence in this file.
