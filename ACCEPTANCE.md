# Orbit complete-product acceptance

The target is a full small-team US sales CRM replacing HubSpot Sales Hub, Pipedrive or Salesforce Sales Cloud, with Attio, Day.ai and Twenty as modern relationship/context comparators. The [contract](CONTRACT.md) defines the outcome, including every target clause below and the applicable [baseline](BASELINE.md). Buoy remains the separate post-sale customer-success product.

This is a build backlog and acceptance specification, not a claim of current product completion. Status is tied to implementation commit `60ded3ce1077d5f092f4c067f16f48c5b93b42d0` (20 October 2026), starting from the inventory code audit at `64f66dd936b78c84ef1d839c68fd735851752ae9` and re-reading changed evidence. `done` means source plus an exercising test for the stated behavior; `partial` identifies an implemented subset and its remaining work; `missing` has no implementation of that flow. Test paths are existing evidence, not claims of a new execution on this documentation commit. Hosted/provider outcomes remain unverified unless independently recorded for the exact candidate. For the 0.2.0 release record (18 October 2026, commit `5c72dc85b7d4627e8b655246102981992f48a7fa`) every status here matches the CONTRACT.md Status table, and the fifteen published clauses that were partial carry the restated journeys their independent release gate exercised.

`rer verify` retains its existing bold published-clause execution catalog and fails unmapped, failed or skipped published IDs. All existing IDs and checks remain. New named target headings are not yet execution mappings: they remain mandatory acceptance obligations with the status below. A green existing-code execution report does not satisfy unfinished target clauses or the full text of a broadened clause. No result is waived, relabeled or manufactured to make this documentation pass. Build rounds must implement and map the target journeys without weakening the retained checks.

Complete acceptance requires an immutable exact candidate, frozen install, full CI, native empty-installation sign-in and authorized provider connections, realistic customer data, both 1440px desktop and 390px phone inspection, keyboard/accessibility checks, recorded failure/restart/revocation journeys, export/restore equivalence and an owner-intent-preserving update. Public Lobby, run site and fictional read-only demo retain their approved behavior. No owner data, mutation, AI call or sending authority may leak into the demo. Runtime test providers do not establish real mailbox delivery, a call, a booking, a signature or a payment.

For each journey below, use the named native page or documented public API, persist and reload its end state, and test the failure/stop case. Network/paid edges may use test doubles in automated suites only; final provider acceptance uses authorized test accounts and real recipient/device observations. Exact-message approval, current access, privacy and audit apply in every new flow. Report executed gates, incomplete target obligations and external unknowns separately. FORECAST-001 extends the existing Records/Reports journey and screens; unrelated statuses retain their earlier inspected evidence.

## Clause-by-clause journeys

### TEAM-001 — Equal operators.

Status: **done**.

Sign in as two full operators and an invited collaborator; confirm both operators reach every record and action, and that the collaborator is refused records, fields and actions outside the share through UI and APIs.

Current evidence: `src/core/features/access/service.ts`; `src/core/features/records/routes.ts`; `newtests/t096/collaborator-lifecycle.test.ts`; `newtests/t096/browser-journeys.test.ts`. Restricted sellers, managers and analysts are TEAM-005. The v0.2.0 release gate exercised the restated clause through its public door on 5c72dc8.

### TEAM-002 — Management.

Status: **done**.

Invite an operator, sign in as them, remove them, and attempt a previously issued session and a new sign-in request; try to remove the setup owner as another operator and as the only operator.

Current evidence: `src/core/features/access/service.ts`; `src/core/features/records/routes.ts`; `newtests/t096/collaborator-lifecycle.test.ts`; `src/core/features/settings/repository.ts`; `src/core/features/settings/removal-handover.ts`; `tests/core/today-brief.test.ts`; `tests/core/local-owner.test.ts`. The named HTTP journey proves both setup-owner refusals, successor-enabled self-removal, session revocation, suppressed sign-in and audit. Roles, teams and access review are TEAM-005.

### TEAM-003 — One workspace.

Status: **done**.

Complete first-run setup with US timezone and USD, change working hours and stale intervals, reload, and observe the persisted settings across records.

Current evidence: `tests/core/records-search.test.ts`; `src/core/features/pipelines/`; `tests/evidence/contract/TEAM-003/`. Persisted US timezone, USD, working hours and intervals exercised with multiple pipelines through Settings and Records at 1440/390.

### TEAM-004 — Removal handover.

Status: **done**.

Remove an operator who owns an open opportunity, an open sales task, a delegated handoff and a scheduled message; choose a receiver for the opportunity and explicit unassignment for the rest, and verify revoked sessions, cancellation, the recorded choice per set, the attributed owner-change entry and attributed historical notes.

Current evidence: `src/core/features/settings/removal-handover.ts`; `src/core/features/tasks/handover.ts`; `tests/core/today-brief.test.ts`; `tests/evidence/contract/TEAM-004/`. Ownership handover of contacts, leads, companies and custom records is RECORD-016; sequence enrollments are SEQUENCE-001. The v0.2.0 release gate exercised the restated clause through its public door on 5c72dc8.

### RECORD-001 — Core records.

Status: **done**.

Through authenticated Records, create and edit a company, contact and USD opportunity with custom fields; reload and read back the associations and values.

Current evidence: `src/core/features/records/routes.ts`; `src/core/features/records/repository.ts`; `tests/core/crm-import.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### RECORD-002 — Associations.

Status: **done**.

Associate two contacts and a company with a deal, choose the primary recipient, change the associations, and confirm historical timeline entries stay put.

Current evidence: `src/core/features/relationships/`; `src/core/features/records/repository.ts`; `tests/core/records-search.test.ts`; `tests/core/records-merge-review.test.ts`; `tests/evidence/contract/RECORD-002/`. Primary and explicit secondary company associations, reviewed deal stakeholders, reassociation history and merge/erasure handling are implemented without rewriting prior customer history.

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

Status: **done**.

Search records and timeline text, apply state/stage/owner/band/queue filters and verify results and the first-page cap; qualify the 500 ms p95 at declared capacity separately.

Current evidence: `src/core/features/records/repository.ts`; `tests/core/records-search.test.ts`; `tests/performance/records-capacity.ts`. The 500 ms first page at declared capacity is qualified separately and not promised. The v0.2.0 release gate exercised the restated clause through its public door on 5c72dc8.

### RECORD-007 — Ownership.

Status: **done**.

Assign, reassign and unassign an opportunity through its native control; reload and inspect its attributed timeline without changing score.

Current evidence: `src/core/features/records/routes.ts`; `src/core/features/records/repository.ts`; `tests/core/crm-import.test.ts`; `tests/core/records-search.test.ts`. Contact, lead, company and custom-object owners and assignment notifications are RECORD-016. The v0.2.0 release gate exercised the restated clause through its public door on 5c72dc8.

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

Current evidence: `src/core/features/records/manual.ts`; `tests/core/today-brief.test.ts`. Implemented source and exercising tests; file attachments are tracked under RECORD-018; live hosted/provider acceptance remains separate.

### RECORD-011 — Related records.

Status: **done**.

Open a company and contact, move a deal association, reload and compare linked deals, owner/stage and open-value total with the underlying records.

Current evidence: `src/core/features/records/repository.ts`; `src/core/features/operator/ui/records-page.tsx`; `tests/core/records-search.test.ts`; `tests/evidence/contract/RECORD-011/`. Company and contact projections link related records; company totals include only open deals and reconcile after explicit reassociation while historical entries, deal owner and lifecycle remain intact.

### RECORD-012 — Contactability.

Status: **done**.

Set do-not-contact, process unsubscribe and permanent-bounce events, then try immediate and scheduled sending; all remain blocked until an explicit current-state clear. Create a contact by hand and see it start contactable; recreate an erased contact's address and see it start do-not-contact.

Current evidence: `src/core/features/records/suppression.ts`; `src/core/features/records/repository.ts`; `tests/core/launch-suppression.test.ts`; `tests/core/outreach-limits.test.ts`. Implemented source and exercising tests, including the contactable default for a hand-created contact and do-not-contact on normalized recreation of a suppressed address; unattributed opt-outs from multi-recipient messages are inherited by OUT-019. Live hosted/provider acceptance remains separate.

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

Current evidence: `src/core/features/capture/intake.ts`; `src/core/features/capture/proposals.ts`; `tests/core/capture-intake.test.ts`. Implemented source and exercising tests; captured attachments are tracked under RECORD-018; live hosted/provider acceptance remains separate.

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

Current evidence: `src/core/features/capture/privacy.ts`; `tests/core/capture-data.test.ts`; `tests/core/capture-upgrade.test.ts`. Implemented source and exercising tests; attachment portability and erasure are tracked under RECORD-018; live hosted/provider acceptance remains separate.

### CAPTURE-008 — Orbit address.

Status: **done**.

Create and rotate a tagged Orbit address, forward/BCC mail and a Gmail confirmation; accept exact envelope tags only and count oversized mail without retaining it.

Current evidence: `tests/core/capture-no-console.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### CAPTURE-009 — Calendar link.

Status: **done**.

Add a private ICS link, advance the refresh clock, change/cancel an event, then break the link; inspect dedupe, preserved times and the halted-source reason.

Current evidence: `tests/core/capture-no-console.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### OPP-001 — Lifecycle.

Status: **done**.

Close a deal as won and lost with reasons, ingest later evidence, and explicitly reopen; inspect history and queue membership at every step.

Current evidence: `src/core/features/opportunities/repository.ts`; `src/core/features/workbench/repository.ts`; `tests/core/signals-outreach.test.ts`. The v0.2.0 release gate exercised the restated clause through its public door on 5c72dc8.

### OPP-002 — Independent state.

Status: **done**.

Change stage and owner and ingest scoring evidence; verify lifecycle, queue, stage, owner and score remain independently represented.

Current evidence: `src/core/features/records/repository.ts`; `tests/e2e/operator.spec.mjs`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### OPP-003 — Evaluation.

Status: **done**.

Ingest weighted signals and edit an open opportunity; inspect computed score, band, contributions and policy version, including decay and closed-deal exclusion.

Current evidence: `src/core/features/opportunities/repository.ts`; `src/core/features/workbench/repository.ts`; `tests/core/signals-outreach.test.ts`; `src/core/features/workbench/policies.ts`; `src/core/features/records/repository.ts`. Every opportunity save and every linked weighted signal evaluates in the same write. The v0.2.0 release gate exercised the restated clause through its public door on 5c72dc8.

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

Status: **done**.

Create two pipelines with different ordered stages, move deals between stages and pipelines, and refuse deletion of an occupied stage; preserve move history and independent lifecycle.

Current evidence: `migrations/core/0039_sales_pipelines.sql`; `src/core/features/pipelines/`; `tests/core/records-search.test.ts`; `tests/evidence/contract/OPP-009/`. Native named pipelines, ordered stages, probabilities, required fields, stage stale intervals, guarded moves/history and occupied deletion refusal exercised; board/list share filters. Workflow engine remains tracked under AUTO-002.

### ACTION-001 — Current recommendation.

Status: **done**.

Read an open deal recommendation with observed evidence and version; disable AI and retain the named action/evidence without an invented explanation.

Current evidence: `src/core/features/assistance/provider.ts`; `src/core/features/drafts/service.ts`; `tests/core/assistance.test.ts`; `tests/core/signals-outreach.test.ts`. The v0.2.0 release gate exercised the restated clause through its public door on 5c72dc8.

### ACTION-002 — Replacement.

Status: **done**.

Supersede an action by new evidence or an operator change; the old action remains historical and cannot be drafted, sent or completed.

Current evidence: `src/core/features/assistance/provider.ts`; `src/core/features/drafts/service.ts`; `tests/core/assistance.test.ts`; `src/core/features/workbench/action-repository.ts`; `tests/core/signals-outreach.test.ts`. The v0.2.0 release gate exercised the restated clause through its public door on 5c72dc8.

### ACTION-003 — Draft on request.

Status: **done**.

Preview and request a draft from current customer evidence; inspect the unsent result for cited facts and configured instructions.

Current evidence: `src/core/features/assistance/provider.ts`; `src/core/features/drafts/service.ts`; `tests/core/assistance.test.ts`. Implemented source and exercising tests for drafts on an opportunity's recommendation; drafting from a contact, lead or company record is tracked under OUT-017. Live hosted/provider acceptance remains separate.

### ACTION-004 — Durable draft.

Status: **done**.

Edit recipient/subject/body, sign out, return and read the saved draft with its original source and edit attribution.

Current evidence: `src/core/features/drafts/service.ts`; `tests/e2e/operator.spec.mjs`. Implemented source and exercising tests for a single recipient; To, CC and BCC lists are tracked under OUT-019. Live hosted/provider acceptance remains separate.

### ACTION-005 — Stale draft.

Status: **done**.

Change the customer/deal or deliver a stop event after drafting; refuse sending until the operator sees and explicitly reviews current differences.

Current evidence: `src/core/features/drafts/service.ts`; `tests/e2e/stale-review.spec.mjs`; `tests/core/capture-boundaries.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### OUT-001 — Human send boundary.

Status: **done**.

Attempt sending from ingestion, an agent and an unreviewed draft; only native exact-recipient/subject/body approval permits the unchanged message to dispatch.

Current evidence: `src/core/features/outreach/service.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/signals-outreach.test.ts`. Implemented source and exercising tests for single reviewed sends; batch approval is tracked under SEQUENCE-003 and multi-recipient To/CC/BCC approval under OUT-019. Live hosted/provider acceptance remains separate.

### OUT-002 — Message states.

Status: **done**.

Drive provider acceptance, delivery, bounce, failure and ambiguous responses; inspect each persisted state and truthful buyer-visible labels.

Current evidence: `src/core/features/outreach/service.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/signals-outreach.test.ts`. Implemented source and exercising tests; live hosted/provider acceptance remains separate.

### OUT-003 — Send idempotency.

Status: **done**.

Submit the same approval key concurrently and after restart; observe one outbound intent and at most one provider submission.

Current evidence: `src/core/features/outreach/service.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/signals-outreach.test.ts`; `src/core/features/workbench/routes.ts`. The v0.2.0 release gate exercised the restated clause through its public door on 5c72dc8.

### OUT-004 — Threading.

Status: **done**.

Deliver correct, foreign and absent reply headers with sender checks; attach the correct reply once and hold ambiguous mail for review.

Current evidence: `src/core/features/outreach/reply-matching.ts`; `tests/core/launch-reply-authority.test.ts`; `tests/core/launch-reply-sender.test.ts`. Implemented source and exercising tests for opportunity-linked sends; threading of deal-less sends is tracked under OUT-017, and replies from CC and BCC recipients under OUT-019. Live hosted/provider acceptance remains separate.

### OUT-005 — Accepted outcome.

Status: **done**.

Accept an approved send, replay its provider response and inspect one timeline message, completed action, NEXT transition and notification.

Current evidence: `src/core/features/outreach/service.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/signals-outreach.test.ts`. Implemented source and exercising tests for sends linked to an open opportunity; the deal-less awaiting-response obligation is tracked under OUT-017. Live hosted/provider acceptance remains separate.

### OUT-006 — Delivery failure.

Status: **done**.

Fail a submission transiently, permanently and ambiguously; verify bounded known-unsent retries, visible exhausted failure, one notification and permanent-bounce stop.

Current evidence: `src/core/features/outreach/service.ts`; `tests/core/outreach-limits.test.ts`; `tests/core/signals-outreach.test.ts`. Transient retries, exhaustion, permanent failure and the permanent-bounce stop are each exercised by the cited tests.

### OUT-007 — Stop conditions.

Status: **done**.

Schedule a message, deliver reply/booking/unsubscribe/bounce or a manual stop, then advance dispatch; cancel the message and stale the draft without duplicates.

Current evidence: `src/core/features/outreach/service.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/signals-outreach.test.ts`. Implemented source and exercising tests; pausing for an unattributed multi-recipient stop request is inherited by OUT-019; live hosted/provider acceptance remains separate.

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

Exceed the per-minute and per-operator daily limits before immediate and scheduled submission; retain a visible unsent item with its reason and next permitted time, and see no silent retry.

Current evidence: `src/core/features/outreach/service.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/signals-outreach.test.ts`; `tests/core/outreach-limits.test.ts`. Per-user one-to-one budgets and the team-scaled shared rate are exercised by OUT-018's journey; sequence budgets and mailbox pacing remain OUT-018 obligations inherited by the sequence and mailbox clauses.

### OUT-011 — Unresolved submission.

Status: **done**.

Lose the acceptance transaction or provider response; restart and reconcile the durable intent without submitting again, ending once as accepted or visibly unresolved.

Current evidence: `src/core/features/outreach/service.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/signals-outreach.test.ts`; `src/core/platform/outbound-mail.ts`. Live Email Activity lookup depends on the owner's SendGrid account and was not exercised.

### OUT-012 — Unsubscribe.

Status: **done**.

Inspect unsubscribe headers on actual submitted mail of a type set to carry opt-out, receive a signed unsubscribe and confirm future sending and scheduled work are suppressed.

Current evidence: `tests/core/outbound-boundaries.test.ts`; `tests/core/outreach-limits.test.ts`. Implemented source and exercising tests for single-recipient messages, which carry opt-out where OUT-020's per-type setting puts it (messages approved before that setting keep the unsubscribe group); the single-recipient managed-relay handler is OUT-020; the multi-recipient opt-out scope is inherited by OUT-019. Live hosted/provider acceptance remains separate.

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

Status: **done**.

Visit the public app Lobby and separate run site without a session; verify branding/sign-in links and no installation customer data in HTML or network.

Current evidence: `src/base/lobby.ts`; `tests/e2e/baseline.spec.mjs`. The v0.2.0 release gate exercised the restated clause through its public door on 5c72dc8.

### PUBLIC-002 — Safe demo.

Status: **done**.

Browse the labeled fictional demo and unknown paths at desktop/mobile sizes; verify no owner-data read, D1 write, AI request or send.

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

Status: **done**.

Export through both supported archive doors, restore into eligible empty product state, export again and compare domain contents, captured evidence and audit with declared authority exclusions.

Current evidence: `src/core/features/records/archive-export.ts`; `src/core/features/records/archive-import.ts`; `tests/core/archive-transfer.test.ts`; `newtests/t096/archive-import-recovery.test.ts`; `src/core/shared/archive-identity.ts`. Target-feature additions are DATA-003. The v0.2.0 release gate round-tripped both archive doors on 5c72dc8: a local Records archive restored into an empty hosted installation (resumed after an interruption) and exported again, and a `.rer` export imported after reset with an identical content hash.

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

Before teams ship, they must carry OUT-018's per-team lowering and raising of sending budgets, audited like the per-user change the installation owner makes today.

Before teams ship, they must carry RECORD-017's team mentions: autocomplete offers active teams, a team mention notifies each active member once, and "cannot see the record" follows the team roles and private records instead of the collaborator-only check used today.

Before teams ship, they must carry RECORD-017's per-entry private visibility: an author can make a single note, logged call or meeting, task note or handoff private, and a private entry is hidden from colleagues outside its audience and from a collaborator whose grant includes the record's notes, calls and meetings, on Shared records, in Notifications → Mentions and in mention notifications. Until then every entry on a record is visible to every full operator and to a collaborator whose grant on that record includes its notes, calls and meetings.

Invite a manager and two reps, make one account private, deny its record and field through direct URLs/search/API/report/export/AI preview, share it intentionally, then revoke and repeat after sign-out and restore. Restrict one rep to owned records and verify that their lists, search, API and export show only the contacts and companies they own under RECORD-016, and that reassigning one of those contacts removes it from their next request. Share a deal with a collaborator including its notes, calls and meetings, make one of its notes private, and confirm the collaborator does not see that note on Shared records or through a mention of them.

Current evidence: `src/core/features/access/service.ts`; `src/core/features/access/field-policy.ts`; `newtests/t096/collaborator-lifecycle.test.ts`. Collaborator record/field restrictions exist; native seller/team hierarchy, owned-record restriction keyed to RECORD-016 owners and per-action sales roles are missing.

TEAM-005 inherits FORECAST-001’s real team quota membership, team-scoped forecast/override permissions and rep/team quota-attainment acceptance; the owner administers the current per-rep forecast until then.

### RECORD-014 — Configurable sales data and custom objects.

Status: **partial**.

Create a Territory object and required deal field, validate bad input, qualify a lead, link stakeholders, save a filtered view, bulk-change selected records with one denied item, then archive a field and inspect history/export.

Current evidence: `src/core/features/records/schema.ts`; `src/core/features/graph/repository.ts`; `tests/core/crm-import.test.ts`. Native custom JSON fields and graph projections exist; configurable schema, conversion, saved views and bulk workflows are incomplete.

### RECORD-015 — Deal stakeholders and buying context.

Status: **done**.

Associate champion and evaluator with a USD deal, add a verified decision-maker and a second-company relationship, move the primary association and inspect the preserved customer history and authorization.

Current evidence: `src/core/features/relationships/`; `src/core/features/operator/ui/buying-context.tsx`; `tests/core/records-search.test.ts`; `tests/evidence/contract/RECORD-015/`. Explicit multi-role stakeholders, human verification, missing-role disclosure, secondary company relationships, products, next step and mutual commitments are implemented. Relationship changes preserve identity, history, lifecycle, owner and contact permission.

### RECORD-016 — Owners for contacts, leads, companies and custom objects.

Status: **missing**.

Import HubSpot contacts and companies with Contact owner and Company owner columns, one owner value unmatched; map it in the dry run, apply, and see each record's owner and attributed import entry. Bulk-reassign 20 contacts with one denied item and see 19 changes, one listed failure and 19 timeline entries. Enable the company-to-contact rule, preview it, change a company owner and see only its unowned contacts take that owner. Enable the first-email rule, send a first email to an unowned lead and see the sender become its owner. Sign in as a seller restricted to owned records: "My contacts" opens by default, and lists, search, API and export show only their own contacts and companies. Remove a rep and hand over their contacts and companies explicitly under TEAM-004. Assign a company to a rep and see one notification naming it and the assigner; bulk-assign 20 contacts to another rep and see one notification listing them; assign a contact to yourself and see none.

Current evidence: No implementation found. `src/core/features/records/schema.ts` holds `owner_id` only on opportunities; contacts, leads, companies and custom objects have no owner, bulk assignment, owner import mapping, assignment rules, assignment notifications or owned-record views.

### RECORD-017 — Mentions in notes and activities.

Status: **done**.

Today a user mentions a colleague as `@Display Name`, or as `@email` when two active colleagues share a name, in a note, a logged call or meeting, a task note or a person's handoff; while they type, autocomplete offers active full operators and collaborators who accepted their invitation. Until TEAM-005's roles exist every full operator sees every record (pattern 4), so only a collaborator can be without access. A collaborator opens a mention only through a live grant on that record that includes its notes, calls and meetings (ct, 19 October): the collaborator grant carries an "Include notes, calls and meetings" option, off by default, set by whoever shares (the installation owner acts for the administrator until TEAM-005, pattern 2), and creating the grant and each change of the option are audited with who changed it and the old and new value. Saving text that mentions a collaborator who cannot see the record, or whose grant leaves out its notes, calls and meetings, is refused with their names; the author shares the record with them including its notes, calls and meetings, or turns the option on for that grant, explicitly, or removes the mention, and a mention never grants access or turns the option on. Each mentioned colleague other than the author receives one in-app notification naming the author and the record and opening the exact entry, task or handoff; an edit notifies only colleagues not yet notified for that entry; deleting an entry withdraws its unread mention notifications and leaves an attributed "entry deleted" timeline record. Notifications → Mentions lists every entry, task note and handoff that mentions the user now. An application's proposed handoff notifies nobody until a person accepts or edits it. Mentions are internal: no customer message carries entry text, AI-001 previews carry no notes, and AGENT-002's conflict check sends note lines only exactly as its preview shows them. An entry's mentions are saved with it (a task note or handoff keeps them in its text), so they are exported with it, and deleting or erasing the record erases its mention notifications (DATA-002). With the option on, the collaborator sees that record's notes, logged calls and meetings, task notes and handoffs on Shared records, read-only, and never another record's entries; a mention opens there at the exact entry. A collaborator's notifications (`GET /api/v1/notifications` and Notifications → Mentions) are only their own mention notifications about records they can read now under such a grant, with only their own unread count, never another operator's notifications or counts; when the grant is revoked or expires they are hidden, not deleted, and a new grant shows them again. TEAM-005 inherits team mentions and per-entry private visibility, and NOTIFY-003 inherits email, push and Slack delivery by preference.

On a deal, a rep writes a note mentioning their manager and a call log mentioning a colleague without access to the deal. The manager receives one notification linking to the note. Before saving, the author is asked to share the deal or remove the second mention; they share it explicitly, and only then is the colleague notified. Edit the note to add a third user; only that user is notified. Delete the call log, and the colleague's unread mention notification is withdrawn. Verify that no access was granted without the explicit share and that no customer message or score changed. A collaborator mentioned after the deal is shared with them including its notes, calls and meetings opens the exact entry from their own notifications at 1440 and 390; with that option off the save asks first; after the grant is revoked the notification is hidden from them, and a new grant shows it again.

Current evidence: `src/core/features/records/mentions.ts`; `src/core/features/records/manual.ts`; `src/core/features/access/grant-entries.ts`; `src/core/features/notifications/collaborator.ts`; `src/core/features/records/shared-entries.ts`; `src/core/features/access/shared-entries.tsx`; `src/core/features/operator/ui/mention-field.tsx`; `tests/core/today-brief.test.ts` — “BRIEF-004 RECORD-010 RECORD-017 OUT-001 a booked meeting gets a cited plan with unresolved attendees shown, notes saved as one editable note, and plan lines become next actions without sending anything; a mention notifies once, asks to share the deal with its notes, calls and meetings before notifying a collaborator, who then reads only their own mention and opens the entry on Shared records until the grant is revoked; it withdraws on delete and never reaches AI or a customer”; `tests/evidence/contract/RECORD-017/`. Mentions in notes, logged calls and meetings, task notes and handoffs, autocomplete, the share-or-remove prompt, the audited "Include notes, calls and meetings" grant option (off by default) and its ask before saving, one notification per colleague opening the exact entry, a collaborator's own scoped notifications and count opening the entry on Shared records read-only, hidden on revocation and shown again on a new grant, the edit and delete rules, the Mentions view, AI and customer exclusion and export and erasure are proven through public HTTP and at 1440/390. Team mentions and per-entry private visibility are TEAM-005's and email, push or Slack delivery NOTIFY-003's.

### RECORD-018 — Files on records, activities and mail.

Status: **missing**.

Upload a PDF to a deal and a file to a logged call; see both on the deal's Files list with name, type, size, uploader and time; upload a new version of the PDF; and see an executable and a 150 MB file refused with the reason. Receive a captured Gmail reply with a signed PDF attachment and an inline logo: see the PDF on the contact, company and deal and open it from the timeline entry, with the logo not listed. As a restricted rep, be refused a direct download of a file on a deal you cannot see. Migrate a HubSpot deal with two record attachments and a note attachment, and reconcile file counts and bytes in the dry run and after applying. Export and restore, and compare every file's bytes by SHA-256. Delete a file and see the attributed timeline entry. Erase the contact: their mail attachments are gone from the deal, while the user-uploaded PDF stays.

Current evidence: No implementation found. There is no file storage, upload route or Files list on any record or activity, and `src/core/features/capture/mime.ts` skips every `Content-Disposition: attachment` part when parsing captured mail, so captured attachments are dropped; migration presets carry no files.

### MIGRATE-001 — HubSpot Sales Hub migration.

Status: **partial**.

From Import choose HubSpot, authorize a test account and preview a multi-company export/API pull including activities, associations, separate Contact, Company and deal owners, and a deal with two record attachments and a note attachment; apply, interrupt/resume and rerun; compare source totals and file counts and bytes, inspect a deal workflow's actions listed against AUTO-002, and undo around native edits. Final acceptance includes a real authorized customer export.

Current evidence: `src/core/features/imports/contracts.ts`; `tests/core/crm-import.test.ts`; `tests/e2e/imports.spec.mjs`. Reviewed HubSpot CSV presets cover core records/deals/prepared notes; connected migration and full activity/owner/pipeline and attachment coverage are missing.

### MIGRATE-002 — Pipedrive migration.

Status: **partial**.

Choose Pipedrive, connect an authorized account containing two pipelines, cross-linked activities and deal files, preview/apply, resume a rate-limited page and rerun; reconcile every exported entity and association, then undo without losing a native note. Include a real authorized export.

Current evidence: `src/core/features/imports/contracts.ts`; `tests/core/crm-import.test.ts`. Pipedrive core CSV presets exist; complete connected migration, products, activity history and files remain missing.

### MIGRATE-003 — Salesforce Sales Cloud migration.

Status: **missing**.

Connect a Salesforce sandbox with converted leads, two record types, linked activity/custom-object data and Files on an Opportunity; dry-run, map, apply, interrupt/resume and rerun, reconcile record/association totals and file counts and bytes, and demonstrate conflict-preserving undo. Repeat with an authorized real export.

Current evidence: No implementation found. No implementation of this complete target flow was found.

### CAPTURE-010 — Continuous authorized mail and calendar reads.

Status: **partial**.

Connect each provider through Capture, import historical and new Inbox/Sent/calendar items, crash/resume an incremental page, resolve ambiguous deal links, switch the multi-deal rule to most recently active open deal and see the next such thread associated automatically with the rule named and then moved in one action, see an unknown correspondent become a CAPTURE-012 proposal, see a captured reply's PDF attachment listed on its contact, company and deal with its inline image not listed, revoke/reconnect and verify no unauthorized folder/mailbox is read. Complete an authorized live Gmail and Microsoft tenant journey.

Current evidence: `src/core/features/capture/providers/google.ts`; `src/core/features/capture/providers/microsoft.ts`; `src/core/features/capture/providers/service.ts`; `tests/core/capture-providers.test.ts`. Read adapters, durable selected-scope cursors and OAuth safeguards exist; current fixed calendar window needs explicit extension, the configurable multi-deal association rule and attachment capture (RECORD-018) are missing and live provider acceptance is unmeasured.

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

Current evidence: `src/core/features/forms/service.ts`; `src/core/features/forms/native-capture.ts`; `src/core/features/forms/embedding.ts`; `src/core/platform/response-policy.ts`; `newtests/t096/forms-native.test.ts`; `newtests/t096/browser-journeys.test.ts`. Reviewed fixed contact forms, consent, atomic intake and observed signals ship with honeypot, server-issued two-second fill proof, per-form/network limits, optional interaction-only Turnstile, counted refusal reasons, erasable spam review and exactly-once full-operator release. Company/deal/custom-property mapping, direct cross-origin posting, reviewed field proposals, owner rotation and team notification remain missing (RECORD-014, RECORD-016, NOTIFY-003).

### OUT-013 — Gmail and Microsoft 365 mailbox sending.

Status: **missing**.

Before mailbox sending ships, it must satisfy OUT-018: each mailbox paced within its provider's limits and never by a deployment-wide throttle, a provider `429` deferring only that mailbox's mail visibly until its `Retry-After`, and each mailbox's usage in the administrator's view.

Before mailbox sending ships, it must reuse OUT-020's installation-origin capability handler, exact approved headers and visible link, per-recipient suppression, erasure invalidation and atomic stops. The handler may ship independently for single-recipient managed-relay mail (ct, 20 October 07:15Z).

Before mailbox sequence sending ships, a mailbox disconnect must pause that mailbox's enrollments visibly with the reason, and a genuine reply on the provider's own thread or conversation must exit them under SEQUENCE-002.

Before mailbox sending ships, it must satisfy OUT-015’s separate acceptance/delivery/inferred-report/human-reply provenance and genuine-reply stop semantics, with open/click not tracked unless OUT-016 is explicitly enabled.

Connect each provider, review recipient/subject/body/signature/attachment, send once and verify provider Sent, a real recipient reply and Orbit threading; revoke before a scheduled send and cause a timeout to demonstrate visible uncertainty with no duplicate or transport switch.

Current evidence: No implementation found. No implementation of this complete target flow was found.

### OUT-014 — Reusable personalized templates and sales content.

Status: **missing**.

Save a team template, render it for two contacts, block one with a missing field, approve one, revise the template and confirm the approved bytes remain unchanged; send an authorized attachment and refuse a forbidden one.

Current evidence: No implementation found. No implementation of this complete target flow was found.

### OUT-015 — Honest open and reply tracking.

Status: **done**.

Ingest accepted/delivered/open events and genuine/automatic/foreign replies; show separate provider acceptance, reported delivery, inferred historical open/click reports and human replies with source and occurred/recorded time on account/contact/deal history. Duplicate reports have one effect; automatic replies, foreign senders and ambiguous threads leave scheduled follow-up unchanged, including after manual linking of nonhuman evidence. Without tracking, show `open/click not tracked`. Only a genuine exact-identity linked reply stops follow-up; add no pixel, redirect token or tracking collection.

OUT-013 inherits these reporting/provenance and genuine-reply semantics for mailbox sending; OUT-016 inherits disclosed opt-in collection and proxy/automated classification; OUT-019 inherits genuine multi-recipient attribution; SEQUENCE-002 inherits genuine-reply exits. Each must pass the corresponding expanded journey before shipping.

Current evidence: `tests/core/launch-reply-authority.test.ts` — “OUT-015 automatic/foreign replies never stop follow-up; inferred reports and untracked opens stay distinct”; `tests/core/signals-outreach.test.ts`; `src/core/features/outreach/provider-replies.ts`; `src/core/features/operator/ui/mail-evidence.tsx`. Signed public HTTP and populated account/deal history at 1440/390 exercise current behavior. Existing unsolicited reports are inferred historical provider evidence only, under ct’s 19 October 06:03Z approval; no new tracking collection or live-mailbox completion is claimed.

### OUT-016 — Disclosed per-message open and click tracking.

Status: **missing**.

Before tracking collection ships, it must satisfy OUT-015’s source/time, inferred/unreliable report and proxy/automated classifications; reports never become human replies or stop follow-up.

Enable open and click tracking with disclosure, approve a tracked one-to-one message sent through OUT-013 Gmail and a tracked sequence step sent through Microsoft 365, open each in a real mail client and click a link; verify one inferred open and one click signal on the deal, a 302 to the unchanged reviewed destination, one deduplicated real-time rep notification, a proxy prefetch and a scanner click labeled automated, no cookie or script, no sequence exit or high band from the open, and `not tracked` on an untracked message; mark the contact do-not-track, erase another contact and verify nothing further is recorded.

Current evidence: No implementation found. No tracking token, link redirect or tracked open/click signal exists; Orbit currently serves no tracker under SIGNAL-007.

### OUT-017 — One-to-one email from any permitted record.

Status: **partial**.

Through OUT-013, email a lead with no company or deal from its record and receive a real reply; from a contact record, email a contact whose only deal is closed won and receive their reply; bulk-enroll ten deal-less contacts in a sequence under SEQUENCE-003 and receive a reply to one first step. For each, verify exact-content approval, the sent message and reply threaded onto the contact timeline and, where the contact has one, the company timeline, no deal created or required, the won deal's lifecycle unchanged, and the deal-less awaiting-response line appearing in the brief after the interval and clearing on the reply. Attempt a send to a do-not-contact lead and see it refused; email a contact on an open deal from their company record, link it to the deal and see OUT-005's NEXT move.

Current evidence: `src/core/features/outreach/service.ts`; `src/core/features/drafts/service.ts`; `tests/core/signals-outreach.test.ts`; `tests/core/outreach-limits.test.ts`. Reviewed one-to-one mail to a contact on an open opportunity exists; the dispatcher in `src/core/features/outreach/service.ts` submits only drafts joined to an open opportunity's contact, so composing from contact, lead and company records, sends to contacts on won/lost or no deals, contact/company reply threading and the contact-level awaiting-response obligation are missing.

### OUT-018 — Sending capacity for a whole sales team.

Status: **done**.

Today every message is one-to-one mail through the shared transport, and these values are in force: each user's one-to-one budget (1,000 a rolling day by default) and the shared rate (100 a minute by default, 4 for each of the 25 declared users) replace the former deployment-wide 3 a minute and 100 per user, and a change applies to the next claim. Until TEAM-005 adds the administrator role, the installation owner sets each user's one-to-one budget, up to the shared rate's daily capacity, and the shared rate, and each change is audited with the owner, the old and new values and the time; per-team budgets come with TEAM-005's teams. A held message names the limit that stopped it with its value, and the time it may be sent. Settings → Sending capacity shows each user their own budget used and remaining, and the owner every user's. SEQUENCE-001, SEQUENCE-003 and AUTO-001 inherit the sequence budget and pace, one-to-one priority, the 75% sequence share and fair draining; OUT-013 inherits per-mailbox pacing, provider quota and `Retry-After` deferral and mailbox usage in the administrator's view. `seed.json` declares 100 a minute and 1,000 a user per rolling day, still marked `estimated-until-load-tested`: no measured submission latency is claimed until the acceptance load journey runs.

With 12 users (nine AEs, two SDRs and one manager) sending through Gmail and Microsoft 365 mailboxes and the shared transport, in one business morning each user approves 40 one-to-one messages while two SDRs each approve a 100-recipient, four-step SEQUENCE-003 batch. Verify that every one-to-one message is submitted within 60 seconds of its approval while the batches drain; that each SDR's 100 first steps are submitted within the business day inside their own sequence budget, interleaved with the other SDR's; and that no deployment-wide throttle delays a mailbox send. Inject a provider 429 for one mailbox and see only that mailbox's mail deferred, visibly, until its `Retry-After`. Lower one SDR's sequence budget to 50: only that SDR's remaining steps defer, visibly, naming the limit and the next permitted time, while the other SDR's steps and everyone's one-to-one mail continue. Record the measured submission latencies at the declared 25-user capacity before `seed.json` drops `estimated-until-load-tested`.

Current evidence: `tests/core/outreach-limits.test.ts` — “OUT-010 OUT-018 one user's volume never consumes another's budget and every deferral names its limit”; `src/core/features/outreach/sending-limits.ts`; `src/core/features/outreach/service.ts`; `src/core/features/outreach/approval-repository.ts`; `src/core/features/operator/ui/sending-capacity.tsx`; `tests/evidence/contract/OUT-018/`. Public HTTP approvals by twelve users with a lowered budget and a changed shared rate, a dispatch two days later and an explicit retry; Settings → Sending capacity and a held message inspected at 1440/390. Inherited obligations and the unmeasured load journey are stated above.

### OUT-019 — To, CC and BCC, reply and reply all.

Status: **missing**.

Before sequence steps with CC ship, a genuine reply from any external participant of a step's thread must exit that enrollment under SEQUENCE-002.

Before multi-recipient sending ships, it must satisfy OUT-015’s exact-identity genuine-reply attribution for every external recipient; automatic, foreign and ambiguous replies never complete awaiting-response or stop follow-up.

Through Gmail, receive a captured thread from a contact with two CC'd colleagues, one of them unknown. Reply all from Orbit, adding the team's internal sales engineer in CC and another existing contact in BCC. Verify that the pre-filled To and CC lists leave out the rep's own mailbox; that the unknown colleague needs an explicit choice and becomes a contact with basis `inbound conversation`; that the provider records one message with exactly the approved To, CC and BCC lists and no BCC header in delivered copies; that the reply is logged once on each external contact and once on their company and the linked deal; that the BCC address is absent from the other contacts' timelines and the other recipients' copies; and that a later reply from the CC'd colleague threads back onto their contact, company and deal and closes the awaiting-response obligation. Add a do-not-contact contact in CC and see the send refused, naming them; remove them and approve the re-rendered message. Add a one-off external address and an erased contact's address: the first is sent with its basis recorded, and the second is refused without naming the person. Repeat the reply-all journey through Microsoft 365, and once through `mail.sender.v1` with one-to-one opt-out turned on, where one recipient's opt-out through the message's link stops only that recipient (OUT-020).

Current evidence: No implementation found. Drafts and outbound messages hold a single `recipient_email` matched to one `contact_id`, and the dispatcher in `src/core/features/outreach/service.ts` joins on it; there are no CC or BCC lists, internal or one-off recipients, reply-all pre-fill or per-recipient landing.

### OUT-020 — Opt-out links by message type and per-person opt-out.

Status: **done**.

Today Settings → Opt-out links holds the setting for each type, and each change is audited with the user, the old and new values and the time; the page counts the approved unsent messages bound to each state. The installation owner acts for the administrator until TEAM-005. One-to-one email starts off on a new installation; an installation upgraded with users already present keeps one-to-one opt-out on until an administrator changes it, and the page shows that basis (ct, 19 October). Messages approved before the setting existed keep their original unsubscribe group. Through SendGrid, opt-out is the installation's unsubscribe group: SendGrid adds `List-Unsubscribe`, `List-Unsubscribe-Post` and its footer links together, and a message without opt-out carries none of them. A rep's relationship or transactional removal, or addition, marks that draft for review again, and a change of the one-to-one setting does the same for every draft not yet approved (ACTION-005); the approval binds the reviewed state. ct approved the independent single-recipient managed-relay handler on 20 October at 07:15Z. With that approved path implemented and proved, new managed messages that need opt-out carry the installation-origin capability in the visible footer and both list headers, including replies; they do not use the former reply exception to remove opt-out. Approval and dispatch preserve older SendGrid approvals' opt-out-on state when switching to the relay, and approvals predating the setting remain opt-out-on. An explicit opt-out-off approval, including a permitted relationship or transactional removal, stays off. A historical `transport` marking retains the refusal policy; it is never silently treated as an explicit removal. If the managed path cannot carry the approved state, review and dispatch retain “This relay cannot carry your opt-out link yet (OUT-013)”; refusals remain audited and counted in Settings. The handler no longer depends on OUT-013 mailbox sending shipping first. OUT-013 inherits its mailbox reuse; OUT-019 inherits the several-recipient page and unattributed stop requests; SEQUENCE-001, SEQUENCE-003 and AUTO-001 inherit the stored settings, per-step removal, approval binding and per-person stops before those execution paths ship.

**One external recipient.** A message with opt-out and exactly one external recipient carries one-click headers (`List-Unsubscribe-Post: List-Unsubscribe=One-Click`) and a visible link. Every sequence step is such a message, because SEQUENCE-001 addresses it To the enrolled contact with internal-only CC. For managed relay mail, the header and link use the same opaque message/recipient capability at the installation's configured `AUTH_ORIGIN`; approval binds the capability and the reviewed opt-out state. Base's existing relay serializer carries both list headers. OUT-013 inherits this installation-origin handler for mailbox sends.

The public GET opens a confirmation page without changing contactability or scheduled work. Its plain button posts to the capability; an RFC 8058 POST with `List-Unsubscribe=One-Click` uses that same capability without sign-in. Either POST sets only its bound contact do-not-contact under OUT-012 and RECORD-012 and atomically cancels that contact's scheduled outbound work. Replay is idempotent and a late dispatch cannot revive that work. Neither the capability nor any public response enumerates identities or other recipients; malformed, foreign and erased capabilities disclose no recipient identity and change nothing. Erasure invalidates the capability. Otherwise it has no expiry or automatic rotation. CAN-SPAM requires the opt-out to keep working for at least 30 days after the send; a link that works forever is the honest choice (ct, 20 October 07:15Z). The private archive carries `outbound_opt_out_capabilities`; it does not expire them.

On the managed relay, turn one-to-one opt-out on and approve a single-recipient message: inspect the reviewed footer and the exact submitted `List-Unsubscribe` URL and `List-Unsubscribe-Post: List-Unsubscribe=One-Click`, all bound to the same capability at `AUTH_ORIGIN`. Change the type setting after approval and verify the approved unsent state and Settings counts remain unchanged. Check a new-installation default, an established-installation upgrade, allowed and forbidden removal, explicit addition, a pre-setting approval, a SendGrid opt-out-on approval after a transport switch, an explicit removed/off approval and a historical `transport` marking; none may silently lose its approved opt-out state or refusal. Open the public link and verify GET changes nothing; use the plain POST button and separately the RFC 8058 POST, replay each, and verify only the bound contact is suppressed and all of that contact's scheduled work is canceled atomically, with a different contact's work unchanged and no late dispatch. Try malformed and foreign capabilities and one invalidated by erasure without recipient disclosure or mutation. Round-trip the private capability table through the archive and retain no-expiry behavior. Inspect review, settings, confirmation, unsubscribed and invalid states at 1440 and 390. Relay-edge byte inspection is not live relay delivery qualification.

The following execution paths remain inherited acceptance: With the defaults (one-to-one opt-out off, sequence opt-out on), reply all through Gmail (OUT-013) to a three-person buyer thread and verify that the delivered message has no `List-Unsubscribe` header and no opt-out link; send a sequence step to one of them and verify that it carries `List-Unsubscribe`, `List-Unsubscribe-Post: List-Unsubscribe=One-Click` and the link; remove opt-out from one step as relationship mail and see the review show the marking and the delivered step carry neither. Turn one-to-one opt-out on, see the audit entry, and send a three-recipient message through `mail.sender.v1`: verify that it has no one-click header and one link; one recipient opts out on the page with their own address, and only that contact becomes do-not-contact while the other two can still be emailed and keep their scheduled messages; an address not on the message is refused without listing the recipients. Deliver a signed provider unsubscribe event for that message without a single recipient address: verify that nobody becomes do-not-contact, that every recipient's scheduled message and sequence enrollment pauses with the reason shown, that a new message to one of them is refused naming the request, and that a reply to an inbound message one of them sent after the event can be sent. Resolve the request by naming one person: only they become do-not-contact, the others' paused work resumes, and the resolution is recorded with the user and time.

Current evidence: `src/core/features/outreach/opt-out.ts`; `src/core/platform/outbound-mail.ts`; `src/core/platform/managed-outbound-mail.ts`; `src/core/features/operator/ui/opt-out-settings.tsx`; `src/core/features/operator/ui/draft-opt-out.tsx`; `tests/core/outbound-boundaries.test.ts` — “OUT-020 managed opt-out is approval-bound, suppresses only its recipient and stops replayed dispatch”; `tests/evidence/contract/OUT-020/`. Existing audited settings, new/upgrade defaults, approved per-message choices and SendGrid behavior are retained. ct's 20 October 07:15Z ruling authorizes the independent opaque-capability managed path, GET nonmutation, idempotent POST, recipient-only atomic suppression/stops, erasure invalidation and otherwise indefinite lifetime. HTTP/relay-edge tests passed on 20 October 2026; review, settings, confirmation, unsubscribed and invalid pages were inspected at 1440/390. Records and CLI archive round-trips preserve the capability. Applying the additive migration to the released v0.3.0 schema preserved all 125 existing rows across 203 tables, with no foreign-key violations. No live relay delivery is claimed. OUT-019 inherits multi-recipient and unattributed requests; SEQUENCE-001/003 and AUTO-001 inherit their settings, execution and stops; OUT-013 inherits mailbox reuse.

### TASK-001 — Assigned prioritized recurring sales tasks.

Status: **done**.

Create a high-priority due call and weekly follow-up, assign/reassign and complete from the daily task view, see the new assignee notified once, restart around recurrence and verify one next occurrence; remove the rep and hand over remaining tasks.

Current evidence: `src/core/features/tasks/`; `tests/core/today-brief.test.ts`; `tests/evidence/contract/TASK-001/`. Assigned record-linked tasks, priorities, local-time recurring occurrences, calendar, notifications, reminders and reviewed removal handover are implemented. In-app reminders are the declared channel; email, push and Slack remain visibly unavailable.

### NOTIFY-003 — Reminders that reach an absent seller.

Status: **missing**.

Before email, push or Slack notifications ship, they must deliver RECORD-017's mention notifications by each mentioned user's preference, once per entry, task or handoff, and withdraw an undelivered one when its entry is deleted.

Leave Orbit closed, advance a task reminder/digest schedule, receive it in a real mailbox/device and inspect its evidence link; complete or reassign the task before dispatch, simulate a provider failure and restart without stale or duplicate reminders.

Current evidence: No implementation found. No implementation of this complete target flow was found.

### SEQUENCE-001 — Multi-step sales sequences.

Status: **partial**.

Before sequence sending ships, it must satisfy OUT-018: each sender's sequence budget (500 a rolling day by default) and pace (3 a minute), at most 75% of the shared transport's rate, one-to-one mail claimed first, round-robin draining across users, and deferrals that name the sequence budget or pace and the time.

Before sequence sending ships, each step must satisfy OUT-020's per-type setting, permitted per-step removal, exact approval binding and installation-origin capability headers/link, with per-person atomic stops and no revival. If its transport cannot carry that approved state, the managed-relay refusal remains applicable.

Before enrollments ship, they must satisfy SEQUENCE-002: an enrollment exits atomically on a genuine reply (including one from an external participant of a step's thread), a meeting booking, a stage change, a won or lost close, an unsubscribe, a permanent bounce or a human stop; reassignment, revoked permission and mailbox disconnect pause it visibly with the reason; and restart, replay or a late job never revives an exited enrollment.

As a seller, create and share with the team a five-step email/call/manual-LinkedIn sequence whose second email step is threaded and CCs the account's sales engineer, and see a read-only user refused authoring; enroll eligible contacts with and without deals with exact-content approvals, complete the manual task, advance business time and restart mid-step; verify one action per due step, the second email arriving in the first email's thread with the internal CC, OUT-018 per-user budget enforcement and no unapproved send.

Current evidence: `src/core/features/outreach/scheduler.ts`; `src/core/features/drafts/service.ts`; `tests/core/outreach-limits.test.ts`. Reviewed single scheduled messages exist; multi-step definitions, rep authoring and sharing, deal-less enrollments, step threading, internal CC and manual step execution are missing.

### SEQUENCE-002 — Immediate sequence exits and accountable outcomes.

Status: **done**.

Before sequence exits ship, they must satisfy OUT-015: only a genuine attributed human reply exits on reply; automatic mail and inferred open/click reports never do.

Until SEQUENCE-001 enrollments exist, these exits govern each reviewed single scheduled message (OUT-009). A genuine attributed reply or meeting booking (OUT-007, OUT-015), an unsubscribe, a permanent bounce or do-not-contact (RECORD-012), any stage move of its deal (every move counts until a sequence configures which stages exit) and a won or lost close each cancel the affected scheduled messages in the same commit as the event, with the reason recorded on the message; a human cancel does the same. Reopening the deal, replaying the event, restarting or a late dispatch revives none of them, and a new send needs a fresh review. For a single scheduled message, removing the user who approved it cancels it and it needs a fresh approval, which is stricter than a pause; reassigning the deal leaves the message with that approving user. Pausing with a reason on reassignment, revoked permission and mailbox disconnect belongs to enrollments. Each deal's Approved outreach view shows Follow-up outcomes since its first provider-accepted message: accepted, delivery-reported, human replies, meetings booked and stage advances counted separately with the won or lost outcome, and open/click reports and automatic replies listed as not counted.

SEQUENCE-001 and SEQUENCE-003 inherit enrollment exits, pause with a reason on reassignment, revoked permission and mailbox disconnect, and no revival of an exited enrollment; AUTO-001 inherits them for workflow-triggered enrollments; OUT-019 inherits exits on a genuine reply from any external participant of a step's thread; OUT-013 inherits mailbox-disconnect pause and provider-thread exits; REPORT-001 inherits sequence-level outcome reporting. Each must pass this clause's acceptance before shipping.

Race an approved due step with each reply/booking/stage/stop event, including a reply on the step's thread from a colleague the buyer CC'd, restart and replay; verify no prohibited send, one exit reason and separate reply/meeting/deal-outcome measures.

Current evidence: `tests/core/signals-outreach.test.ts` — “OUT-007 OUT-009 SEQUENCE-002 stage move, close and genuine reply end scheduled follow-up atomically; automatic reply and open report do not”; `src/core/features/pipelines/movement.ts`; `src/core/features/records/repository.ts`; `src/core/features/outreach/follow-up-outcomes.ts`; `src/core/features/operator/ui/follow-up-outcomes.tsx`; `tests/evidence/contract/SEQUENCE-002/`. Public HTTP races approved scheduled sends with an automatic reply, an open report, a genuine reply, a stage move and a close, then reopens, replays and dispatches late: no prohibited send, one recorded exit reason each, and separate outcome measures, inspected on the deal at 1440/390. Enrollment exits and pauses are inherited as stated above.

### SEQUENCE-003 — Bulk enrollment with one reviewed batch approval.

Status: **missing**.

Before batch sending ships, it must satisfy OUT-018: each sender's sequence budget (500 a rolling day by default) and pace (3 a minute), at most 75% of the shared transport's rate, one-to-one mail claimed first, round-robin draining across users, and deferrals that name the sequence budget or pace and the time.

Before batch sending ships, each recipient's message must satisfy OUT-020's setting, permitted removal, exact approval binding and installation-origin capability headers/link, with per-person atomic stops and no revival. If its transport cannot carry that approved state, the managed-relay refusal remains applicable.

Before batch enrollment ships, each enrollment in a batch must satisfy SEQUENCE-002's exits, pauses with a reason and no-revival rules on its own, without stopping the rest of the batch.

From a saved list of 50 eligible contacts (ten of them on no deal) and 3 ineligible contacts, enroll all of them in a five-step sequence with four email steps in one action; inspect the excluded reasons, open any rendered message, edit one and remove one, then approve once. Advance business time and verify one provider submission per due email step per remaining recipient with no further approval, a per-rep limit of 40 per day deferring the rest visibly to the next window, a merge-field change on one contact holding only that recipient's step for review, and a workflow-triggered contact waiting in the owner's approval queue until its batch is approved.

Current evidence: No implementation found. Reviewed single scheduled messages exist under OUT-009; sequences, batch rendering and batch approval do not.

### AUTO-001 — Configurable sales workflows and visible execution.

Status: **partial**.

Before workflow email ships, it must satisfy OUT-018: each sender's sequence budget (500 a rolling day by default) and pace (3 a minute), at most 75% of the shared transport's rate, one-to-one mail claimed first, round-robin draining across users, and deferrals that name the sequence budget or pace and the time.

Before workflow email ships, it must satisfy OUT-020's setting, permitted removal, exact approval binding and installation-origin capability headers/link, with per-person atomic stops and no revival. If its transport cannot carry that approved state, the managed-relay refusal remains applicable.

Before workflow-triggered enrollment or workflow email ships, it must satisfy SEQUENCE-002's exits, pauses with a reason and no-revival rules.

Preview and activate a stale-deal rule, trigger it twice, change the record and revoke permission before dispatch; inspect one authorized task/notification, one AUTO-002 field write applied without a proposal, no stale field write/send, and an actionable failed webhook run after restart.

Current evidence: `src/core/features/capture/proposals.ts`; `src/core/features/delegation/effects.ts`; `tests/core/capture-review.test.ts`. Fixed reviewed proposals and handoffs exist; configurable workflow authoring, unattended record updates (AUTO-002) and durable run management are missing.

### AUTO-002 — Workflow record updates applied without per-record review.

Status: **missing**.

As a sales admin, activate three workflows, each after its preview shows per-record current and resulting values: "deal created" sets the primary contact's lead status to "Open deal" and the company's lifecycle stage to "Opportunity"; "deal closed won" sets the company and all its contacts to "Customer", stamps "Became customer" with the run date and creates an onboarding task; "meeting logged on a deal in Qualified" moves the deal to "Meeting held". Create a deal, close another won and log a meeting; verify every field value and the stage move are written with no proposal, each with a timeline entry naming the workflow, its version and the trigger, and replay a trigger to see no second write, task or record. Close a deal won whose company lifecycle stage a user edited after the trigger and verify that write is skipped as changed by that user while the contacts and task are updated. Activate a rule that sets a deal amount and verify an approval item waits for the deal owner, with no change until it is accepted. As a manager without the grant to edit a protected field, try to activate a rule writing it and see the refusal naming the field; reduce a sales admin's grant after activation and see the next run refuse that action visibly. Chain two workflows into a loop and see it stop at the depth limit. Undo the closed-won run after a user edited one contact; verify the other values are restored, that contact is listed as skipped and the stage history records the undo. Restart mid-run and resume without a duplicate write.

Current evidence: No implementation found. No workflow engine writes records: the only writes outside a person's own edit are capture proposals accepted one at a time in `src/core/features/capture/proposals.ts`, whose compare-and-set fence on the current value is the guard this clause extends to unattended workflow writes.

### CALL-001 — Provider-backed click-to-call.

Status: **partial**.

Connect Twilio and Aircall in turn, initiate a call from a real deal to an authorized test number, record answered/no-answer/failed dispositions, replay callbacks and revoke the connection; verify one truthful linked call each time. Place one call and receive one inbound call in the Aircall app outside Orbit and verify each is logged once on the matched contact and deal, with an unknown number held for review. As part of BOUNDARY-001's walk, call the walk's USD deal contact and inspect the provider link, the carrier boundary and an unapproved provider shown as unresolved setup with manual logging still available. Whichever of BOUNDARY-001's named clauses ships last also walks a US buyer from a USD deal through booking, support context, signed quote, billing/accounting and post-sale Buoy handoff, inspecting the correct product links, ownership boundaries and unresolved provider setup without a substituted mock or a reduced CRM scope.

Current evidence: `src/core/features/records/manual.ts`; `tests/core/today-brief.test.ts`. Manual call logging exists; Twilio/Aircall dialer, call-provider callbacks and logging of calls made outside Orbit are missing.

### CALL-002 — Consented recordings and cited transcripts.

Status: **partial**.

Record an authorized test call, decline consent on another, read timestamped transcript evidence from the deal, correct a speaker and approve a stale-guarded proposal; deny an unauthorized user and erase local and provider copies. Contradict a recorded commitment in a transcript and inspect AGENT-002's cited conflict. As part of BOUNDARY-001's walk, record a consented call on the walk's USD deal and inspect the provider link and an unavailable recording provider shown as unresolved setup. Whichever of BOUNDARY-001's named clauses ships last also walks a US buyer from a USD deal through booking, support context, signed quote, billing/accounting and post-sale Buoy handoff, inspecting the correct product links, ownership boundaries and unresolved provider setup without a substituted mock or a reduced CRM scope.

Current evidence: `src/core/features/records/manual.ts`; `src/core/features/capture/proposals.ts`; `tests/core/capture-review.test.ts`. Reviewed evidence updates and logged calls exist; recording, transcription and provider erasure are missing.

### REPORT-001 — Sales dashboards and saved reports.

Status: **partial**.

Before sequence reports ship, they must show SEQUENCE-002's delivered, reply, meeting and stage/revenue measures separately and never count an open as success.

Build and save a US monthly report for two pipelines containing won/lost/open deals and rep activities, reconcile every total and reason by drill-through, export and reopen it after access revocation and late evidence.

Current evidence: `src/core/features/analytics/metrics.ts`; `src/core/features/analytics/report-routes.ts`; `newtests/t096/report-disclosure.test.ts`; `newtests/t096/report-time-boundaries.test.ts`. Versioned count/sum/mean/ratio reports and disclosed snapshots exist; the full sales/activity/outcome suite and drill-through remain incomplete.

### REPORT-002 — Shared sales dashboards.

Status: **missing**.

As a manager, build a dashboard with at least four tiles: open pipeline by stage across two pipelines, won/lost reasons this quarter, activities by rep, and forecast against quota. Apply owner, team and date-range filters, share it with the sales team and set it as the team default. Sign in as a restricted rep and verify that the same dashboard opens by default and shows only totals that reconcile with that rep's permitted drill-through, with no hidden count. Schedule a weekly email to the manager and the rep and verify each received copy matches its recipient's access. Delete one source report and see an unavailable tile.

Current evidence: No implementation found. Single saved reports and snapshots exist under REPORT-001; dashboard composition, filters, sharing, defaults and scheduled delivery do not.

### FORECAST-001 — Weighted forecasts, quotas and revenue schedules.

Status: **done**.

Create USD 10,000 at 30% and USD 20,000 at 60%, require USD 15,000 weighted total independently of engagement scores, apply a reasoned probability/category override and close one won. Review separate open unweighted, weighted expected, committed, best-case, pipeline, omitted, closed-won bookings, one-time scheduled, recurring scheduled, MRR/ARR and quota measures. Compare monthly and quarterly rep quotas, recurring schedule occurrences and the preserved prior-period snapshot. Dates use UTC calendar days, from included and through excluded; amounts and scheduled revenue are sales forecasts, never recognized accounting revenue.

Until TEAM-005, the installation owner acts as forecast administrator; full operators can read and collaborators cannot. TEAM-005 inherits real team membership, team-scoped forecast/override permissions and the rep/team quota comparison. QUOTE-001 inherits product/quote-line linkage and schedule comparison. Both inheritances retain full one-time and recurring schedules for current deals.

Current evidence: `src/core/features/forecast/`; additive `migrations/core/0048_forecasts.sql`; `newtests/t096/browser-journeys.test.ts` — “FORECAST-001 USD weighted value, override, quotas and recurring schedules preserve prior snapshots”; `newtests/t096/browser-forecast-journey.ts`; `newtests/t096/forecast-archive-journey.ts`; `newtests/t096/forward-upgrade.test.ts`; `docs/retained-verification/FORECAST-001/`. The existing browser journey is extended and retitled, with no added registered case. It reviews stage inputs, quotas and a recurring/one-time override through Reports, refuses a stale preview and a collaborator without current access, closes a deal won, reads unchanged prior snapshots, exports/imports forecasts and snapshots through Records, and erases related snapshots and revision streams while preserving an unrelated snapshot. Missing dates/probabilities remain visible. Forecast, override and history are inspected at 1440 and 390. Released v0.3.0 native data upgrades with every prior row unchanged.

### QUOTE-001 — Products, quotes and signatures.

Status: **missing**.

Quote two products with discount and tax disclosure, require manager approval above its threshold, send the approved version through DocuSign, reject an old version and process signed/declined callbacks once; review the resulting billing handoff. As AGENT-002 evidence, contradict a quote date with a logged call and inspect the cited conflict. As the signed-quote step of BOUNDARY-001's walk, quote and sign the walk's USD deal after its support context and inspect the DocuSign link, the signature boundary and an unconfigured provider shown as unresolved setup without a substituted mock. Whichever of BOUNDARY-001's named clauses ships last also walks a US buyer from a USD deal through booking, support context, signed quote, billing/accounting and post-sale Buoy handoff, inspecting the correct product links, ownership boundaries and unresolved provider setup without a substituted mock or a reduced CRM scope.

Current evidence: No implementation found. No implementation of this complete target flow was found.

QUOTE-001 inherits FORECAST-001’s product/quote-line linkage and one-time/recurring schedule comparison. Current deals retain their schedules before quote linkage ships.

### INTEGRATE-001 — Dial and Calendly bookings.

Status: **partial**.

Connect Dial and Calendly, share a reviewed link, book/reschedule/cancel from each provider and inspect the same deal activity and sequence exit; replay and reject a forged callback. As the booking step of BOUNDARY-001's walk, book the walk's USD deal from each provider and inspect its product links, the booking product's ownership of availability and routing, and a disconnected provider shown as unresolved setup without a substituted mock. Whichever of BOUNDARY-001's named clauses ships last also walks a US buyer from a USD deal through booking, support context, signed quote, billing/accounting and post-sale Buoy handoff, inspecting the correct product links, ownership boundaries and unresolved provider setup without a substituted mock or a reduced CRM scope.

Current evidence: `src/core/features/ingestion/booking-webhooks.ts`; `src/core/features/ingestion/calendly-setup.ts`; `tests/core/source-onboarding.test.ts`. Calendly signed booking ingestion and guided callback registration exist; native Dial links and complete reschedule/completion lifecycle are missing.

### INTEGRATE-002 — Zoom meetings and preparation.

Status: **missing**.

Connect Zoom, attach an authorized meeting to a deal, open its preparation, finish it and review a cited recap; deny recording permission, replay completion and cancel a second meeting without fabricated context. As part of BOUNDARY-001's booking step, run this on the walk's booked USD deal and inspect the Zoom link, Zoom's ownership of the meeting and an unconnected Zoom shown as unresolved setup. Whichever of BOUNDARY-001's named clauses ships last also walks a US buyer from a USD deal through booking, support context, signed quote, billing/accounting and post-sale Buoy handoff, inspecting the correct product links, ownership boundaries and unresolved provider setup without a substituted mock or a reduced CRM scope.

Current evidence: No implementation found. No implementation of this complete target flow was found.

### INTEGRATE-003 — Nectar and Stripe billing context.

Status: **missing**.

Link a Stripe test customer and Nectar account to a USD deal, ingest invoice paid/past-due/refund events, replay them and inspect one status timeline; approve a billing handoff and deny a mismatched customer. As the billing step of BOUNDARY-001's walk, hand the walk's signed USD quote to each billing product and inspect its link, the collection boundary and a disconnected provider shown as unresolved setup without a substituted mock. Whichever of BOUNDARY-001's named clauses ships last also walks a US buyer from a USD deal through booking, support context, signed quote, billing/accounting and post-sale Buoy handoff, inspecting the correct product links, ownership boundaries and unresolved provider setup without a substituted mock or a reduced CRM scope.

Current evidence: No implementation found. No implementation of this complete target flow was found.

### INTEGRATE-004 — HappyToHelp, Help Scout and Zendesk account context.

Status: **missing**.

Connect each support service, map a customer, open a ticket on its sales account, restrict a ticket and revoke access; verify current visibility and one reviewed handoff with a returned support outcome. As the support-context step of BOUNDARY-001's walk, open the walk's USD account after its booking and inspect each support product link, the support product's ownership boundary and a disconnected service shown as unresolved setup without a substituted mock. Whichever of BOUNDARY-001's named clauses ships last also walks a US buyer from a USD deal through booking, support context, signed quote, billing/accounting and post-sale Buoy handoff, inspecting the correct product links, ownership boundaries and unresolved provider setup without a substituted mock or a reduced CRM scope.

Current evidence: No implementation found. No implementation of this complete target flow was found.

### INTEGRATE-005 — Slack sales notifications and handoffs.

Status: **missing**.

Route a stage event and overdue task to an authorized Slack channel, replay the event, deny a private-account disclosure and submit a revoked or foreign action; inspect one correct notification and attributable task. On BOUNDARY-001's walk, route the walk's won-deal and Buoy-handoff notices and inspect the Slack link and a disconnected workspace shown as unresolved setup. Whichever of BOUNDARY-001's named clauses ships last also walks a US buyer from a USD deal through booking, support context, signed quote, billing/accounting and post-sale Buoy handoff, inspecting the correct product links, ownership boundaries and unresolved provider setup without a substituted mock or a reduced CRM scope.

Current evidence: No implementation found. No implementation of this complete target flow was found.

### INTEGRATE-006 — QuickBooks Online and Xero accounting handoff.

Status: **missing**.

For both services approve a USD quote-to-invoice handoff, inspect provider lines/tax/identity, receive partial and full payment status and replay a timed-out result without a second invoice. As the accounting step of BOUNDARY-001's walk, hand the walk's signed USD quote to each accounting service and inspect its link, the ledger boundary and a disconnected service shown as unresolved setup without a substituted mock. Whichever of BOUNDARY-001's named clauses ships last also walks a US buyer from a USD deal through booking, support context, signed quote, billing/accounting and post-sale Buoy handoff, inspecting the correct product links, ownership boundaries and unresolved provider setup without a substituted mock or a reduced CRM scope.

Current evidence: No implementation found. No implementation of this complete target flow was found.

### INTEGRATE-007 — Mailchimp audience and suppression handoff.

Status: **missing**.

Preview an audience containing subscribed, unknown and stopped contacts; sync only the authorized subset, ingest unsubscribe and replay a prior subscription update; verify no resumed outreach or duplicate subscriber. On BOUNDARY-001's walk, preview the walk's consented buyer for a Mailchimp audience and inspect the Mailchimp link, its campaign ownership and a disconnected account shown as unresolved setup. Whichever of BOUNDARY-001's named clauses ships last also walks a US buyer from a USD deal through booking, support context, signed quote, billing/accounting and post-sale Buoy handoff, inspecting the correct product links, ownership boundaries and unresolved provider setup without a substituted mock or a reduced CRM scope.

Current evidence: No implementation found. No implementation of this complete target flow was found.

### INTEGRATE-008 — Buoy post-sale handoff.

Status: **missing**.

Close an authorized USD deal won, preview and approve its Buoy handoff, inspect the linked receiving account/owner and acceptance, then replay, revoke access and fail the provider; verify one handoff, visible failure and no customer-success workflow built inside Orbit. As the post-sale step of BOUNDARY-001's walk, hand the walk's won USD deal to Buoy and inspect the Buoy link, Buoy's ownership of customer success and a disconnected Buoy shown as unresolved setup. Whichever of BOUNDARY-001's named clauses ships last also walks a US buyer from a USD deal through booking, support context, signed quote, billing/accounting and post-sale Buoy handoff, inspecting the correct product links, ownership boundaries and unresolved provider setup without a substituted mock or a reduced CRM scope.

Current evidence: No implementation found. No implementation of this complete target flow was found.

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

Use the same realistic USD account on desktop, 390px web, iOS and Android; complete task/call/note/stage journeys and exact-message journeys for a new one-to-one email, a reply all and an approved outreach, lose network mid-edit, resolve a conflict, receive push and revoke the device without stale sends.

Current evidence: `tests/e2e/operator.spec.mjs`; `tests/delegation-browser/viewport.test.ts`; `newtests/t096/report-disclosure.test.ts`. Responsive native web journeys exist; native mobile apps, offline conflict handling, push reminders and phone composing under OUT-017/OUT-019 are missing.

### DATA-003 — Full-target portability, privacy and audit.

Status: **done**.

Populate every currently supported category, export through authenticated HTTP, restore into empty product data, export again and reconcile complete content digests and anonymous audit; refuse unauthorized export and show that credentials, sessions, collaborator/publication/agent authority and scheduled dispatch approval do not travel. Erase a contact and inspect every current read/search/report/AI/export and replay fence. Repeat this journey for each target feature before it ships, including its required provider-deletion requests and separately confirmed outcomes, without claiming recall of downloads or already sent content.

The baseline applies to every currently supported category, including custom fields and relationships, pipelines and movement history, recurring tasks, saved reports, reviewed forecasts and immutable forecast snapshots, reviewed form submissions and spam, capture/proposals, and agent handoff decisions. Before shipping, TEAM-005; RECORD-014/016/017/018; MIGRATE-001–003; CAPTURE-010–012; FORM-001; OUT-013–020; NOTIFY-003; SEQUENCE-001–003; AUTO-001–002; CALL-001–002; REPORT-001–002; FORECAST-001; QUOTE-001; INTEGRATE-001–008; ENRICH-001; API-001; MOBILE-001; OPS-001; and AGENT-001–004 inherit these same export, integrity, erasure, anonymized audit, declared external-deletion and fresh-authority obligations for each added record and derivative. Existing subsets remain covered now; future file versions must round-trip identical bytes and SHA-256 digests.

Current evidence: `tests/core/capture-data.test.ts` — “DATA-003 current sales capabilities round-trip without authority and erase across public reads”; `tests/support/current-sales-data.ts`; `tests/support/current-sales-archive.ts`; `tests/support/current-sales-local.ts`; `scripts/installer/portability-policy.mjs`; `newtests/t096/forms-native.test.ts`; `tests/core/crm-import-erasure.test.ts`. The populated authenticated Records HTTP export→empty restore→export compares complete category digests and original anonymous audit, exercises independent denied export access and removed session/collaborator/form/agent authority, and cancels restored scheduled messages while preserving their historical content. The local `.rer` engine round-trips that same populated source and strips scheduled dispatch approval without changing the source installation. Valid older local archives also lose that approval in staging before atomic publication. Public record/search/report/AI/task/form/capture/export reads and old-mail replay stay erased; configured AI usage costs are recorded in USD. The export/restore and erasure screens are exercised at 1440 and 390. Read-only mailbox disconnect removes Orbit credentials, not the provider’s original mail; this local journey claims no completed external deletion or recall. Required provider requests and separately confirmed outcomes remain obligations as written above.

### OPS-001 — Owned operation and explicit provider failures.

Status: **partial**.

Install an empty edition through the supported CLI, sign in, enable Google and Microsoft sign-in and sign in with each as an invited user while an uninvited and an unverified address are refused, configure one mail provider, revoke it, restart and upgrade with populated data; inspect credential-free diagnostics, working manual records and preserved audit, then reconnect without replaying customer actions.

Current evidence: `src/core/features/identity/index.ts`; `tests/core/prior-auth-upgrade.test.ts`; `tests/core/capture-providers.test.ts`; `tests/core/provider-redirects.test.ts`. Core operational guards and read-provider failures are implemented, and sign-in through one linked OpenID Connect provider exists in `src/core/features/identity/accounts.ts`; direct Google Workspace and Microsoft Entra ID sign-in, the per-domain requirement, and the whole target connector and mobile delivery surface are not.

### AGENT-001 — Keep the customer graph current with evidence.

Status: **partial**.

Authorize one account, introduce a job change and contradictory spoken/written commitment, inspect cited proposals and missing decision-maker question, change a field before acceptance and require conflict; accept another, decline one, revoke the source and erase/replay without re-creation.

Current evidence: `src/core/features/capture/intake.ts`; `src/core/features/capture/proposals.ts`; `tests/core/capture-review.test.ts`; `tests/delegation/brief-handoff.test.ts`. Reviewed provenance-bound capture updates exist; call/enrichment graph maintenance and stakeholder inference are not complete.

### AGENT-002 — Explain stalled deals and contradictory commitments.

Status: **done**.

Use deals with reported opens but no reply, no recorded decision-maker, an overdue promise and task, a deal past its stage's stale interval and contradictory recorded commitment and call dates; inspect precise cited risk, observation apart from inference and next action at 1440 and 390, reject an AI result whose citation is not an exact recorded quote, dismiss one with a reason and reload, adjust a required role and approve another task, then verify no autonomous stage, amount, close date, stakeholder, commitment, forecast or mail change. QUOTE-001 repeats this with contradictory quote dates, and CALL-002 with transcript evidence, before they ship.

Current evidence: `tests/core/today-brief.test.ts` — “AGENT-002 absent decision-maker and conflicting recorded commitments yield cited risks, dismissal and reviewed tasks”; `tests/core/launch-reply-authority.test.ts`; `src/core/features/risks/`; `src/core/features/operator/ui/deal-risks.tsx`; `src/core/features/operator/ui/deal-risk-finding.tsx`; `src/core/features/today/promises.ts`; `tests/evidence/contract/AGENT-002/`. The authenticated HTTP journey records a confirmed champion and no decision-maker, mutual commitments and a logged call with different kickoff dates, an overdue handoff and assigned task, and a deal past its stage interval; findings cite the exact recorded lines, keep observation apart from rule or AI inference, and invent no stakeholder. The conflict check sends exactly the previewed recorded lines, fails whole on a quote missing from its line or an invented line, and records every call; without AI it answers unavailable. Dismissal requires a reason and survives reload on the deal timeline, a required procurement role is attributed, an uncited task is refused and an approved task is an open internal handoff, while stage, amount, close date, stakeholders, commitments, drafts and mail stay unchanged. The OUT-015 journey shows reported opens without a human reply as an inferred, cited risk on the accepted send. The deal risk panel was inspected at 1440 and 390 after approving a task and dismissing a finding.

### AGENT-003 — Follow the next action through to a customer outcome.

Status: **partial**.

Accept a meeting follow-up obligation, review and approve its exact draft, fail then reconcile its provider outcome, receive a reply without stage movement and inspect the still-open advancement goal; advance the deal or stop explicitly and verify all remaining work exits once.

Current evidence: `src/core/features/today/promises.ts`; `src/core/features/today/plan-actions.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/today-brief.test.ts`; `tests/core/signals-outreach.test.ts`. Brief promises, handoffs and reviewed scheduled outreach exist; durable cross-step quote-to-close outcome supervision is missing.

### AGENT-004 — Controlled research and agent workflow blocks.

Status: **partial**.

Configure a selected-account web/MCP research block with a USD cap, preview its data, return structured citations into a proposed workflow task, inject untrusted instructions and revoke access mid-run; verify only allowed evidence leaves, no external message runs and budget/schema failures remain visible.

Current evidence: `src/core/features/assistance/provider.ts`; `src/core/features/delegation/protocol.ts`; `tests/core/assistance.test.ts`; `tests/delegation/authority-regressions.test.ts`. Cited AI requests and scoped application evidence/handoffs exist; configurable web/MCP research agents and research-to-workflow runs are missing.

### BOUNDARY-001 — Separate products and US-first delivery.

Status: **done**.

Walk a US buyer's USD deal through every current capability: signed Calendly booking intake onto the deal, a manual call log, and an exact-message review and send, with the USD amount unchanged and no mail sent by a booking, a manual entry or provider setup. In Settings at 1440 and 390, inspect Connected products: Calendly and Cal.com show their real delivery state, and Dial, Zoom, Twilio/Aircall, HappyToHelp/Help Scout/Zendesk, DocuSign, Nectar/Stripe, QuickBooks Online/Xero, Slack, Mailchimp and Buoy show as not available in Orbit with the job each owns, with no substituted connector or mock and no reduced CRM scope. The complete walk from a USD deal through booking, support context, signed quote, billing/accounting and post-sale Buoy handoff is carried by INTEGRATE-001–008, CALL-001/002 and QUOTE-001, each in its own acceptance, and run end to end by whichever ships last.

Current evidence: `tests/core/source-onboarding.test.ts` — “BOUNDARY-001 current USD sales journey respects product boundaries and exposes unresolved provider setup”; `src/core/features/settings/connected-products.ts`; `src/core/features/operator/ui/connected-products.tsx`; `src/core/features/ingestion/booking-webhooks.ts`; `tests/core/signals-outreach.test.ts`; `tests/support/sales-tasks.ts`; `tests/evidence/contract/BOUNDARY-001/`. The authenticated HTTP journey connects a booking source, accepts a signed Calendly booking as linked deal evidence, logs a manual call, keeps the USD 100.00 amount, reviews and sends exact mail, and shows Calendly receiving while Cal.com awaits delivery and Dial, Zoom, Twilio, Aircall, HappyToHelp, Help Scout, Zendesk, DocuSign, Nectar, Stripe, QuickBooks Online, Xero, Slack, Mailchimp and Buoy are unavailable with no connector door; bookings, manual work and setup send no mail. US timezone and DST behavior stays proven by OUT-008, TASK-001 and TEAM-003. Settings › Connected products and the booked deal were inspected at 1440 and 390. The full walk is now an obligation of INTEGRATE-001–008, CALL-001/002 and QUOTE-001, each in its own acceptance; whichever ships last runs it end to end.

## Completion accounting

131 product clauses: **87 done, 23 partial, 21 missing**. Baseline obligations remain additional requirements. The status table at the end of CONTRACT.md and the journeys here describe the same set of IDs and statuses. No target is declared complete by its presence in this file.
