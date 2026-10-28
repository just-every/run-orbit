<!-- Generated from CONTRACT.md by contract-docs. Edit CONTRACT.md, then regenerate. -->

# Accept a Orbit installation

The primary journey: Bring customer records across, connect sales evidence, work the explained NOW queue, prepare and send relevant follow-up, and reconcile the customer’s reply with the sales outcome.

## Progress

| Tier | Done | Partial | Missing | Total |
| --- | ---: | ---: | ---: | ---: |
| Core | 8 | 138 | 31 | 177 |
| Agent surface | 0 | 0 | 13 | 13 |
| Later | 0 | 0 | 0 | 0 |
| Full target | 8 | 138 | 44 | 190 |

Judged from the code and tests at commit `b300e460a20da7f09122dc4a9157499430c4f8d5` (27 October 2026). Field proof register: 12 rows; 0 passed, 0 failed, 12 not run.

## Core

### Operators and workspace

#### TEAM-001 — Equal operators

Core · published · **partial** · Cites BASE-ROLE-001, BASE-ACCESS-004

**Requirement.** Every active full operator has equal access to the whole workspace: every record, field and action. An invited collaborator reaches only the records, fields and actions shared with them, and the server refuses the rest; a hidden control never stands in for that refusal. Restricted sellers, managers and analysts with role grants are TEAM-005.

**Acceptance.**
1. Sign in as two full operators and an invited collaborator; confirm both operators reach every record and action, and that the collaborator is refused records, fields and actions outside the share through UI and APIs.

**Evidence.** `src/core/features/access/service.ts`; `src/core/features/records/routes.ts`; `newtests/t096/collaborator-lifecycle.test.ts`; `newtests/t096/browser-journeys.test.ts`
**Gap.** Unasserted in the carried evidence: two full operators reach every record; full operators reach every action; UI refusal for every corresponding door. Asserted: collaborator record refusal; collaborator field refusal; collaborator action refusal.

#### TEAM-002 — Management

Core · published · **partial** · Cites BASE-ROLE-001, BASE-ACCESS-004

**Requirement.** Any active full operator invites and removes operators in Settings. An invitation sends no email: the invited person requests their own sign-in link. Removing an operator revokes their sessions at once, and later sign-in requests for their address send no link. The setup owner can be removed only by themselves, and only while another active full operator exists. Invitations and removals are audited. Roles, teams and access review are TEAM-005; policy `operator.management.v1` may narrow who invites or removes without bypassing server-side checks.

**Acceptance.**
1. Invite an operator, sign in as them, remove them, and attempt a previously issued session and a new sign-in request; try to remove the setup owner as another operator and as the only operator.

**Evidence.** `src/core/features/access/service.ts`; `src/core/features/records/routes.ts`; `newtests/t096/collaborator-lifecycle.test.ts`; `src/core/features/settings/repository.ts`; `src/core/features/settings/removal-handover.ts`; `tests/core/today-brief.test.ts`; `tests/core/local-owner.test.ts`
**Gap.** Unasserted in the carried evidence: invited person signs in through their own link. Asserted: invitation emits no unsolicited email; removed session is refused; removed operator receives no new link; another operator cannot remove the owner; sole owner cannot remove themselves; self-removal with another active operator ends the session.

#### TEAM-003 — One workspace

Core · published · **partial** · Cites BASE-ROLE-001, BASE-ACCESS-004

**Requirement.** A deployment holds one business workspace. Its name, US operating timezone, USD default currency, working hours, stale and awaiting-response intervals, signal sources and free-mail domains are configured in Settings. Multiple sales pipelines are configured under OPP-009 inside that workspace; a second isolated deployment is a separate installation, not an extra pipeline.

**Acceptance.**
1. Complete first-run setup with US timezone and USD, change working hours and stale intervals, reload, and observe the persisted settings across records.

**Evidence.** `tests/core/records-search.test.ts`; `src/core/features/pipelines/`; `tests/evidence/contract/TEAM-003/`
**Gap.** Unasserted in the carried evidence: persisted US timezone; persisted USD default; persisted working hours; persisted stale intervals; reload reads the settings across records. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

#### TEAM-004 — Removal handover

Core · published · **partial** · Cites BASE-ROLE-001, BASE-ACCESS-004

**Requirement.** Removing an operator revokes their sessions, cancels their scheduled messages, and hands over or unassigns their open opportunities, open sales tasks and delegated handoffs. The removal review lists each of those sets, the remover chooses a receiving full operator or explicit unassignment for each, and the removal is refused until every set has a recorded choice or if the reviewed work changed meanwhile; revocation, cancellation and handover then happen together. Each handed-over opportunity gets one attributed owner-change timeline entry. Their notes, drafts, sent messages and timeline entries remain and stay attributed to them. Handing over owned contacts, leads, companies and custom-object records is RECORD-016, and active sequence enrollments are SEQUENCE-001.

**Acceptance.**
1. Remove an operator who owns an open opportunity, an open sales task, a delegated handoff and a scheduled message; choose a receiver for the opportunity and explicit unassignment for the rest, and verify revoked sessions, cancellation, the recorded choice per set, the attributed owner-change entry and attributed historical notes.

**Evidence.** `src/core/features/settings/removal-handover.ts`; `src/core/features/tasks/handover.ts`; `tests/core/today-brief.test.ts`; `tests/evidence/contract/TEAM-004/`
**Gap.** Unasserted in the carried evidence: delegated handoff unassignment; scheduled-message cancellation; choice recorded for every set; one attributed owner-change entry. Asserted: reviewed task handover; reviewed opportunity handover; revoked session; historical note retains its actor.

### Customer records

#### RECORD-001 — Core records

Core · published · **partial** · Cites BASE-INPUT-001, BASE-ROLE-001, BASE-INPUT-003, BASE-DATA-003, BASE-INPUT-003

**Requirement.** Operators can create, edit, and delete contacts, companies, and opportunities. A contact requires a name or an email address and may also hold a phone number, job title, and timezone; a company requires a name and may hold one primary domain; an opportunity requires a title and holds a pipeline stage, a value in the workspace currency, zero or one owner, an expected close date, at most one company, and any number of contacts. Each entity listed in the declared custom-field entities also holds custom fields. Contact, lead, company and custom-object owners, independent of opportunity owners, are defined in RECORD-016.

**Acceptance.**
1. Through authenticated Records, create and edit a company, contact and USD opportunity with custom fields; reload and read back the associations and values.

**Evidence.** `src/core/features/records/routes.ts`; `src/core/features/records/repository.ts`; `tests/core/crm-import.test.ts`
**Gap.** Unasserted in the carried evidence: contact create/read through authenticated Records; contact edits persist; company create/read through authenticated Records; company edits persist; USD opportunity create/edit; custom-field values read back; associations read back. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

#### RECORD-002 — Associations

Core · published · **partial** · Cites BASE-INPUT-001, BASE-ROLE-001, BASE-INPUT-003, BASE-DATA-003, BASE-INPUT-003

**Requirement.** A contact has at most one primary company and can have further explicit company relationships under RECORD-015, and can belong to any number of opportunities. An opportunity with contacts names one primary as its default outreach recipient; a deal without a contact is never recommended an email follow-up. Changing an association moves no old timeline entry.

**Acceptance.**
1. Associate two contacts and a company with a deal, choose the primary recipient, change the associations, and confirm historical timeline entries stay put.

**Evidence.** `src/core/features/relationships/`; `src/core/features/records/repository.ts`; `tests/core/records-search.test.ts`; `tests/core/records-merge-review.test.ts`; `tests/evidence/contract/RECORD-002/`
**Gap.** Unasserted in the carried evidence: two contact associations; company association; primary recipient choice; association change; historical timeline remains unchanged. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

#### RECORD-003 — Identity keys

Core · published · **partial** · Cites BASE-INPUT-001, BASE-ROLE-001, BASE-INPUT-003, BASE-DATA-003, BASE-INPUT-003

**Requirement.** A contact's key is its email address lowercased with surrounding whitespace removed; a company's key is its primary domain lowercased with a leading `www.` removed. A domain on the configured free-mail list is never a company key. Creating or changing a record to a key another record already holds returns 409 with that record's ID and writes nothing. A record with no key is created and edited normally, and signals never link to it automatically. Orbit never merges records by name similarity, fuzzy match, or score. The default is the rules in this clause.

**Acceptance.**
1. Create case/whitespace email and domain collisions through Records; require a 409 naming the existing identity and no extra row; exercise free-mail and keyless records.

**Evidence.** `src/core/features/records/routes.ts`; `src/core/features/records/repository.ts`; `tests/core/crm-import.test.ts`
**Gap.** Unasserted in the carried evidence: case and whitespace contact collision; domain collision; conflict names existing identity; no extra row after either conflict; free-mail keys excluded; keyless record create/edit. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

#### RECORD-004 — Duplicate merge

Core · published · **partial** · Cites BASE-INPUT-001, BASE-ROLE-001, BASE-INPUT-003, BASE-DATA-003, BASE-INPUT-003 · Rules D-1

**Requirement.** Merging two contacts or two companies requires an operator to choose the surviving record and the value of every conflicting field. The request is bound to both reviewed record states; a changed record refuses the merge without modifying either record, requiring a new review. Contactability is not a reviewed choice: a do-not-contact stop that lands after review is inherited by the merge. The merge moves associations and timeline entries once, retires the other record's key as an alias so later signals carrying it link to the survivor, creates no signal, recommendation, or outreach, and records the retired ID in the audit trail.

**Acceptance.**
1. Review two duplicates, choose field values and survivor, then change one reviewed record and require refusal; review again and merge once, inheriting a concurrent stop.

**Evidence.** `src/core/features/records/merge-review.ts`; `tests/core/records-merge-review.test.ts`
**Gap.** Unasserted in the carried evidence: concurrent stop inherited. Asserted: reviewed survivor and field value; stale review returns refusal; stale review preserves both records; merge occurs once; retired id and choices audited.

#### RECORD-005 — Timeline

Core · published · **partial** · Cites BASE-INPUT-001, BASE-ROLE-001, BASE-INPUT-003, BASE-DATA-003, BASE-INPUT-003

**Requirement.** A record's timeline lists its signals, stage and owner changes, notes, logged calls and meetings, recommendations, drafts, outbound attempts, replies, and merges, most recent occurred time first with ties broken by ID. Every entry shows its occurred time, its recorded time, and the operator, source, or feature that created it.

**Acceptance.**
1. Open a record containing mail, meetings, notes, changes and a merge; inspect occurred/recorded times, source and actor, including out-of-order events.

**Evidence.** `src/core/features/records/routes.ts`; `src/core/features/records/repository.ts`; `tests/core/crm-import.test.ts`
**Gap.** Unasserted in the carried evidence: mail entry; meeting entry; note entry; stage/owner change entry; merge entry; occurred and recorded times; source and actor; out-of-order history. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

#### RECORD-006 — Search and views

Core · published · **done** · Cites BASE-INPUT-001, BASE-ROLE-001, BASE-INPUT-003, BASE-DATA-003, BASE-INPUT-003

**Requirement.** Operators can search contacts, companies, opportunities, and timeline text, and can filter opportunities by state, stage, owner, band, and queue. A first page holds at most 50 matches. Answering that first page within 500ms at the declared capacity in the installation manifest is a capacity target qualified separately; this release makes no capacity promise.

**Acceptance.**
1. Search records and timeline text, apply state/stage/owner/band/queue filters and verify results and the first-page cap; qualify the 500 ms p95 at declared capacity separately.

**Evidence.** `src/core/features/records/repository.ts`; `tests/core/records-search.test.ts`; `tests/performance/records-capacity.ts`
**Gap.** None.

#### RECORD-007 — Ownership

Core · published · **partial** · Cites BASE-INPUT-001, BASE-ROLE-001, BASE-INPUT-003, BASE-DATA-003, BASE-INPUT-003

**Requirement.** An opportunity has zero or one owner. Any operator can assign, reassign or unassign it; each change appears on its timeline as an attributed owner change and leaves its score unchanged. The default is an opportunity an operator creates is unassigned. An opportunity created from a published form's enquiry belongs to the operator who published the form. Owners of contacts, leads, companies and custom-object records, and notifications to a deal's new owner, are RECORD-021.

**Acceptance.**
1. Assign, reassign and unassign an opportunity through its native control; reload and inspect its attributed timeline without changing score.

**Evidence.** `src/core/features/records/routes.ts`; `src/core/features/records/repository.ts`; `tests/core/crm-import.test.ts`; `tests/core/records-search.test.ts`
**Gap.** Unasserted in the carried evidence: assign owner; reassign owner; unassign owner; owner persists after reload; attributed timeline entry; score unchanged. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

#### RECORD-008 — Import

Core · published · **partial** · Cites BASE-INPUT-001, BASE-ROLE-001, BASE-INPUT-003, BASE-DATA-003, BASE-INPUT-003 · Rules D-1

**Requirement.** Full native operators move contacts, companies, deals and notes through explicit CSV mappings and a mandatory saved dry run. New contacts are held by default unless mapped explicit subscribed permission or an explicit per-import operator contactability attestation permits contact. Existing do-not-contact stops always win. All suppression and remaining absent-consent holds publish before customer creation or sending; malformed suppression rows block application. Source IDs and explicit associations are retained with inert provenance. Existing native identities are associated without replacing their fields. Every rejected row names its file, row and reason and creates no customer record. Unchanged re-imports reuse native records, associations and notes. Base import-kit records originals, current-session authority, atomic progress and conflict-preserving undo; undo removes or restores only owned, unchanged effects and keeps native edits, independent suppression and their dependency closure. No import approves outreach or grants operator access. Contact-owner and company-owner columns are mapped under RECORD-016.

**Acceptance.**
1. Move mapped HubSpot/Pipedrive CSV contacts, companies, deals, notes and suppression through saved preview and Apply; replay, change a source row, interrupt and undo while preserving native edits and stops.

**Evidence.** `src/core/features/imports/contracts.ts`; `tests/core/crm-import.test.ts`; `tests/core/crm-import-erasure.test.ts`; `tests/e2e/imports.spec.mjs`
**Gap.** Unasserted in the carried evidence: changed source row conflict; interrupted apply resumes without losing progress. Asserted: HubSpot and Pipedrive saved dry run has no writes; contacts and associations applied; deal values retained; notes preserved once; reimport has no duplicate records; undo preserves native edit; independent stop survives undo.

#### RECORD-009 — Duplicate candidates

Core · published · **partial** · Cites BASE-INPUT-001, BASE-ROLE-001, BASE-INPUT-003, BASE-DATA-003, BASE-INPUT-003

**Requirement.** Orbit lists contacts sharing a name across companies, including contacts with no company, and companies sharing a name, as duplicate candidates; names are compared lowercased with runs of whitespace collapsed. A candidate is a review item only: nothing is merged, altered, or hidden until an operator completes RECORD-004.

**Acceptance.**
1. Create same-name contacts across companies and keyless records; review candidates without a mutation, then complete a chosen merge explicitly.

**Evidence.** `src/core/features/records/import-merge.ts`; `tests/core/records-merge-review.test.ts`
**Gap.** Unasserted in the carried evidence: keyless candidate listed. Asserted: same-name contacts across companies listed; same-name companies listed; review changes no records; chosen merge retires exactly one record.

#### RECORD-010 — Manual entries

Core · published · **partial** · Cites BASE-INPUT-001, BASE-ROLE-001, BASE-INPUT-003, BASE-DATA-003, BASE-INPUT-003

**Requirement.** An operator can add a note to any record and log a call or meeting with an occurred time, duration, and attending contacts. A manual entry is attributed to its author, editable and deletable by any operator, never sent to a customer, and never contributes to a score. RECORD-017 adds @mentions of colleagues in these entries, and RECORD-018 attaches files to them.

**Acceptance.**
1. Log, edit and delete a note, call and meeting on a customer record; verify time, duration and attendees, and verify no score or external message changed.

**Evidence.** `src/core/features/records/manual.ts`; `tests/core/today-brief.test.ts`
**Gap.** Unasserted in the carried evidence: note create/edit/delete; call create/edit/delete; meeting create/edit/delete; occurred time retained; duration retained; attendees retained; score unchanged; no external message. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

#### RECORD-011 — Related records

Core · published · **partial** · Cites BASE-INPUT-001, BASE-ROLE-001, BASE-INPUT-003, BASE-DATA-003, BASE-INPUT-003

**Requirement.** A company page lists its contacts and its opportunities with each opportunity's stage, owner, and value, plus the total value of its open opportunities. A contact page lists their opportunities. Both reflect an association change on the next load.

**Acceptance.**
1. Open a company and contact, move a deal association, reload and compare linked deals, owner/stage and open-value total with the underlying records.

**Evidence.** `src/core/features/records/repository.ts`; `src/core/features/operator/ui/records-page.tsx`; `tests/core/records-search.test.ts`; `tests/evidence/contract/RECORD-011/`
**Gap.** Unasserted in the carried evidence: company linked deals; contact linked deals; owner and stage shown; open-value total reconciles; reassociation reflected on next load. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

#### RECORD-012 — Contactability

Core · published · **partial** · Cites BASE-INPUT-001, BASE-ROLE-001, BASE-INPUT-003, BASE-DATA-003, BASE-INPUT-003 · Rules D-1

**Requirement.** A contact is contactable or do-not-contact. An operator can set do-not-contact at any time, and an unsubscribe event that identifies the person (OUT-012, OUT-020) or a permanent bounce also sets it, for that person only. An opt-out that cannot name one recipient of a multi-recipient message pauses those recipients' scheduled work rather than suppressing them (OUT-031). No operation sends customer email to a do-not-contact contact, the state is shown wherever the contact appears, and only an operator can clear it. A contact an operator creates by hand on a record page or through the Records API starts contactable unless the operator chooses do-not-contact or its address matches a retained suppression proof, in which case it starts do-not-contact; other doors state their own default (RECORD-008, CAPTURE-005, CAPTURE-012, FORM-001, OUT-019).

**Acceptance.**
1. Set do-not-contact, process unsubscribe and permanent-bounce events, then try immediate and scheduled sending; all remain blocked until an explicit current-state clear.
2. Create a contact by hand and see it start contactable; recreate an erased contact's address and see it start do-not-contact.

**Evidence.** `src/core/features/records/suppression.ts`; `src/core/features/records/repository.ts`; `tests/core/launch-suppression.test.ts`; `tests/core/outreach-limits.test.ts`
**Gap.** Unasserted in the carried evidence: manual contact starts contactable. Asserted: manual stop stays stopped; unsubscribe stop; permanent-bounce stop; immediate send refuses stopped contact; scheduled work cancelled; explicit current-state clear read back; normalized recreation starts do-not-contact.

#### RECORD-013 — Deletion

Core · published · **partial** · Cites BASE-INPUT-001, BASE-ROLE-001, BASE-INPUT-003, BASE-DATA-003, BASE-INPUT-003

**Requirement.** Deleting a company detaches its contacts and opportunities and deletes neither. Deleting an opportunity deletes its recommendations, drafts, and unsent scheduled messages, and leaves its contacts, its company, and their entries for messages already sent. Deleting a contact follows DATA-002. Each deletion is confirmed before it runs.

**Acceptance.**
1. Confirm each record deletion; company removal detaches dependents, deal removal preserves sent history, and contact removal performs the erasure journey.

**Evidence.** `src/core/features/records/data.ts`; `tests/core/records-complete.test.ts`; `tests/core/contact-erasure.test.ts`
**Gap.** Unasserted in the carried evidence: deletion confirmation enforced; company deletion detaches contacts; company deletion detaches opportunities. Asserted: deal deletion preserves sent history; contact deletion erases mail and linked signals.

### Signals

#### SIGNAL-001 — Ingestion

Core · published · **partial** · Cites BASE-INPUT-001, BASE-OPS-003, BASE-ACCESS-004 · Rules D-2

**Requirement.** A valid event from a configured source, carrying that source's signature, becomes one normalized signal within 10 seconds. The signal keeps its source, source event ID, type, subject, occurred time, received time, payload hash, and linking basis, and is never edited afterwards.

**Acceptance.**
1. POST a signed configured-source event through its ingestion route and read one attributed signal and linked timeline within the bound.

**Evidence.** `src/core/features/ingestion/routes.ts`; `src/core/features/ingestion/repository.ts`; `tests/core/signals-outreach.test.ts`
**Gap.** Unasserted in the carried evidence: linked timeline entry; ingestion within ten seconds. Asserted: one stored signal; attributed configured source attribution..

#### SIGNAL-002 — Signal types

Core · published · **partial** · Cites BASE-INPUT-001, BASE-OPS-003, BASE-ACCESS-004 · Rules D-2

**Requirement.** Orbit accepts form submissions; email sent, opened, replied, bounced, and unsubscribed events; meeting viewed, booked, completed, and canceled events; page views; chats; content downloads; and firmographic changes. A source can add a type namespaced to itself, which changes no existing type. An event whose type is neither standard nor namespaced is rejected with 400.

**Acceptance.**
1. Submit every standard type, a source-namespaced type and an unknown type; accept the first two classes and reject the unknown without writes.

**Evidence.** `src/core/features/ingestion/routes.ts`; `src/core/features/ingestion/repository.ts`; `tests/core/signals-outreach.test.ts`
**Gap.** Unasserted in the carried evidence: every standard type stored/read back; source-namespaced type stored/read back; unknown type leaves no writes. Asserted: unknown type refused.

#### SIGNAL-003 — Idempotency

Core · published · **partial** · Cites BASE-INPUT-001, BASE-OPS-003, BASE-ACCESS-004 · Rules D-2

**Requirement.** Repeated or concurrent delivery of one `(source, source event ID)` produces one signal and one set of downstream evaluations. Reusing that identity with a different payload hash is rejected and recorded as an error on that source.

**Acceptance.**
1. Deliver identical events concurrently and after restart, then change the payload under the same source identity; retain one effect and a visible conflict.

**Evidence.** `src/core/features/ingestion/routes.ts`; `src/core/features/ingestion/repository.ts`; `tests/core/signals-outreach.test.ts`
**Gap.** Unasserted in the carried evidence: replay after restart. Asserted: concurrent delivery returns one identity; one persisted effect; changed payload returns conflict.

#### SIGNAL-004 — Linking

Core · published · **partial** · Cites BASE-INPUT-001, BASE-OPS-003, BASE-ACCESS-004 · Rules D-2

**Requirement.** A signal links first by an Orbit record ID the source supplies, then by RECORD-003. A uniquely linked signal appears once on that record's timeline. A signal with no unique match is held in the unlinked queue, where it changes no score; an operator linking it later appends it to the chosen record's timeline exactly once and triggers one evaluation.

**Acceptance.**
1. Ingest exact, ambiguous and unknown identities; verify linked and held queues, then manually link the held event once and inspect evaluation.

**Evidence.** `src/core/features/ingestion/routes.ts`; `src/core/features/ingestion/repository.ts`; `tests/core/signals-outreach.test.ts`
**Gap.** Unasserted in the carried evidence: ambiguous identity held; exactly one evaluation after link. Asserted: exact identity affects the intended deal; unknown identity held; one manual link allowed; linked timeline retains event time.

#### SIGNAL-005 — Event time

Core · published · **partial** · Cites BASE-INPUT-001, BASE-OPS-003, BASE-ACCESS-004 · Rules D-2

**Requirement.** A late or out-of-order event keeps its occurred time, appears in that position on the timeline, and triggers a fresh evaluation. It never overwrites a record field that a later-occurring event wrote.

**Acceptance.**
1. Deliver older evidence after newer evidence and inspect chronological history and fresh evaluation without overwriting later record state.

**Evidence.** `src/core/features/ingestion/routes.ts`; `src/core/features/ingestion/repository.ts`; `tests/core/signals-outreach.test.ts`
**Gap.** Unasserted in the carried evidence: history sorted around newer evidence; fresh evaluation after late event; later-written fields not overwritten. Asserted: older event retains occurred time.

#### SIGNAL-006 — Evidence confidence

Core · published · **partial** · Cites BASE-INPUT-001, BASE-OPS-003, BASE-ACCESS-004 · Rules D-2

**Requirement.** Every signal carries one confidence: observed, when the customer acted deliberately (form submission, reply, booking, meeting, download, chat), or inferred, when a tool reported activity (email open, page view). An inferred signal alone cannot create an opportunity, produce a high band, or satisfy ACTION-001's evidence requirement.

**Acceptance.**
1. Compare open/page-view inference with observed reply/booking evidence; inferred activity alone cannot create a deal, high band or evidence-backed action.

**Evidence.** `src/core/features/ingestion/routes.ts`; `src/core/features/ingestion/repository.ts`; `tests/core/signals-outreach.test.ts`
**Gap.** Unasserted in the carried evidence: inferred activity cannot create any new deal. Asserted: observed reply/booking classification; inferred activity cannot raise high band; inferred activity creates no current recommendation.

#### SIGNAL-007 — No tracking

Core · published · **partial** · Cites BASE-INPUT-001, BASE-OPS-003, BASE-ACCESS-004 · Rules D-2

**Requirement.** Orbit serves no tracking script, pixel, or cookie, and performs no fingerprinting or cross-site collection. A page-view, chat, or download signal is accepted only when its source supplies the visitor identity it already holds and the basis for holding it; without that basis the event is held unlinked under SIGNAL-004 and never becomes contact history. The one exception is OUT-016's disclosed, opt-in, per-message open and link-click tracking of Orbit-sent customer mail, which adds nothing to Orbit's public pages, its app or any other site.

**Acceptance.**
1. Inspect public assets/network and submit identity-free page/chat events; no Orbit tracker runs and unsupported identity stays outside customer history.

**Evidence.** `src/core/features/ingestion/routes.ts`; `src/core/features/ingestion/repository.ts`; `tests/core/signals-outreach.test.ts`
**Gap.** Unasserted in the carried evidence: no tracking script/pixel/cookie in public assets/network; identity-free chat held; unsupported identity absent from customer history. Asserted: identity-free page view held.

#### SIGNAL-008 — Ingestion failure

Core · published · **partial** · Cites BASE-INPUT-001, BASE-OPS-003, BASE-ACCESS-004 · Rules D-2

**Requirement.** A missing or invalid signature returns 401, a request naming a source this deployment has not configured returns 403, and a payload over `seed.json → limits.signalPayloadBytes` returns 413; none of them writes anything. A persistence failure returns 503 and writes no partial signal, timeline entry, or evaluation, so the source can safely replay the same event identity. Each source shows its last accepted event, its last error, and its rejected-event count in settings.

**Acceptance.**
1. POST invalid signatures, unknown sources, oversized input and injected persistence failure; verify status, no partial writes, replay safety and source diagnostics.

**Evidence.** `src/core/features/ingestion/routes.ts`; `src/core/features/ingestion/repository.ts`; `tests/core/signals-outreach.test.ts`
**Gap.** Unasserted in the carried evidence: unknown source refused; all downstream effects rolled back. Asserted: bad signature refused; oversized input refused; persistence failure leaves no signal; replay safety; source rejection diagnostic.

#### SIGNAL-009 — Signed sources

Core · published · **partial** · Cites BASE-INPUT-001, BASE-OPS-003, BASE-ACCESS-004 · Rules D-2

**Requirement.** Supersedes BASE-ACCESS-004 for the paths the signed signal door and the signed mail-event door only: a request there is authorized by a signature from a source or mail provider configured in this deployment (or, at a source’s the source’s automation door endpoint only, its current private secret in an HTTPS Authorization Bearer header) instead of an operator session, and may write only signals, delivery states, and their timeline entries. The separately scoped application-delegation boundary below is the only additional authorization exception.

**Acceptance.**
1. Exercise signed callbacks and HTTPS source-scoped automation; refuse invalid, disabled and rotated authority while retaining native session and ownership checks.

**Evidence.** `src/core/features/ingestion/routes.ts`; `src/core/features/ingestion/repository.ts`; `tests/core/signals-outreach.test.ts`
**Gap.** Unasserted in the carried evidence: signed provider callback; HTTPS source-scoped automation; disabled authority refused; rotated authority refused; native session checks retained; native ownership checks retained. Asserted: invalid authority refused.

### Mail and calendar capture

#### CAPTURE-001 — File capture

Core · published · **partial** · Cites BASE-INPUT-001, BASE-DATA-004, BASE-SECRET-001, BASE-DATA-001, BASE-DATA-003 · Rules D-1, D-2

**Requirement.** An operator adds `.eml` files, an mbox or `.ics` calendar files on the Capture page. Each message or calendar event becomes one signal with the same columns, confidence and linking rules as SIGNAL-001 to SIGNAL-006, and keeps its original headers, body and non-inline attachments (RECORD-018) as the evidence the signal points to. Replay identity is the Message-ID, or the event UID with its SEQUENCE and what happened (booked, completed or canceled): adding the same item again changes nothing, and a changed copy with the same identity is refused and recorded on the capture source under SIGNAL-003. A calendar event keeps its original start and end times; a missing identity, a missing date or an unknown time zone is reported, never guessed.

**Acceptance.**
1. Upload mail and calendar files on Capture, replay and conflict them, then inspect original evidence and explicit invalid-date/identity/timezone errors.

**Evidence.** `src/core/features/capture/intake.ts`; `src/core/features/capture/proposals.ts`; `tests/core/capture-intake.test.ts`
**Gap.** Unasserted in the carried evidence: invalid-identity error; invalid-timezone error. Asserted: mail and calendar files captured; replay has no duplicate effect; changed content conflict; original evidence headers and body; invalid-date error.

#### CAPTURE-002 — Known participants only

Core · published · **done** · Cites BASE-INPUT-001, BASE-DATA-004, BASE-SECRET-001, BASE-DATA-001, BASE-DATA-003 · Rules D-1, D-2

**Requirement.** A captured message or event is stored only when a participant other than an operator holds a contact's exact email key or a company's exact domain key (RECORD-003). Anything else is not stored, and the import reports how many items were not stored and why. An operator may keep unknown senders for one import; those signals wait in the unlinked queue under SIGNAL-004 and change no record. For a connected mailbox or calendar source (CAPTURE-010), an unknown external participant in a conversation with an operator becomes a held CAPTURE-012 new-prospect proposal instead of being discarded.

**Acceptance.**
1. Capture known and unknown participants; unknown mail is not retained by default and explicit one-import retention creates only held evidence.

**Evidence.** `src/core/features/capture/intake.ts`; `src/core/features/capture/proposals.ts`; `tests/core/capture-intake.test.ts`
**Gap.** None.

#### CAPTURE-003 — What capture applies at once

Core · published · **partial** · Cites BASE-INPUT-001, BASE-DATA-004, BASE-SECRET-001, BASE-DATA-001, BASE-DATA-003 · Rules D-1, D-2

**Requirement.** A reply from the recipient of an Orbit send that carries that send's message headers attaches once to its opportunity under OUT-004. A delivery report for an Orbit send to that recipient records the bounce, and a permanent one sets do-not-contact under RECORD-012. A captured reply or booked meeting from a known contact cancels that contact's scheduled messages and marks their unsent drafts stale under OUT-007 and ACTION-005 in the same commit, while the proposals from the same message wait for review. An automatic reply stops nothing.

**Acceptance.**
1. Capture a threaded reply, booked meeting, permanent bounce and automatic reply; inspect atomic linking/stale/cancellation effects and verify automatic reply stops nothing.

**Evidence.** `src/core/features/capture/intake.ts`; `src/core/features/capture/proposals.ts`; `tests/core/capture-intake.test.ts`
**Gap.** Unasserted in the carried evidence: booked meeting cancels scheduled work; drafts staled atomically; automatic reply stops no scheduled work. Asserted: threaded reply linked; permanent bounce stops contact.

#### CAPTURE-004 — Reviewed proposals

Core · published · **done** · Cites BASE-INPUT-001, BASE-DATA-004, BASE-SECRET-001, BASE-DATA-001, BASE-DATA-003 · Rules D-1, D-2

**Requirement.** Everything else capture finds is a proposal that shows its evidence (sender, date, subject and the quoted lines it rests on): link this evidence to these records, create a contact at a known company by its exact email address, set a contact's name or phone, change an opportunity's next action, or set do-not-contact. A proposal that touches an existing value shows the current and proposed values side by side and is refused with 409 if the current value changed after it was offered. A person accepts, edits or declines each one. Accepting appends one timeline entry attributed to that person and to the capture source; a declined proposal is never offered again for the same evidence. Capture proposes no bought data and no identity guessed from a name, a lookalike address or a similar domain.

**Acceptance.**
1. Open evidence-backed field/link proposals, accept/edit/decline and repeat; a concurrent field edit refuses stale acceptance and a decline stays declined.

**Evidence.** `src/core/features/capture/proposals.ts`; `tests/core/capture-review.test.ts`
**Gap.** None.

#### CAPTURE-005 — Human boundary

Core · published · **partial** · Cites BASE-INPUT-001, BASE-DATA-004, BASE-SECRET-001, BASE-DATA-001, BASE-DATA-003 · Rules D-1, D-2

**Requirement.** Capture never creates a draft, approves or starts a message, or makes a contact contactable. A contact created from a proposal is do-not-contact until an operator clears it under RECORD-012; the person accepting a CAPTURE-012 new-prospect proposal makes that choice explicitly in the same review, with the basis it records, and an unsubscribe request in a captured message is a do-not-contact proposal. Capture endpoints accept only a full native operator's session: a source signature, a delegation credential or an invited collaborator is refused, and the signed paths of SIGNAL-009 cannot write into a capture source. Mail delivered to an operator-created Orbit address (CAPTURE-008) is the only intake without a session; its authority is that address's private tag, and it writes only into that address's source.

**Acceptance.**
1. Attempt capture with native, collaborator, source and delegation authority; only permitted native/address intake succeeds, and a proposed new contact stays blocked.

**Evidence.** `src/core/features/capture/providers/oauth.ts`; `tests/core/capture-providers.test.ts`; `tests/core/capture-boundaries.test.ts`
**Gap.** Unasserted in the carried evidence: delegation credential refused; address-only intake works; proposed new contact stays blocked. Asserted: native intake works; collaborator intake refused; source signature refused.

#### CAPTURE-006 — Capture sources

Core · published · **partial** · Cites BASE-INPUT-001, BASE-DATA-004, BASE-SECRET-001, BASE-DATA-001, BASE-DATA-003 · Rules D-1, D-2

**Requirement.** A source declares the mail folders or labels and the calendars it may read, keeps its cursor exactly as its provider gave it (a Gmail history ID or a Microsoft Graph delta link, for example), and shows its state, last success, last error, items captured, items not stored and proposals waiting. A crash before a page's cursor is stored re-reads that page without duplicating anything. A revoked grant stops intake and shows its error until the source is reconnected; a provider outage records its error and leaves records, queues and manual work unchanged. Disconnecting stops intake at once, deletes the stored credential and keeps captured evidence, shown as coming from a disconnected source. The file import is the first adapter and has no cursor or credential.

**Acceptance.**
1. Connect each Google/Microsoft read adapter, choose folders/calendars, page and crash before cursor commit; resume without duplicates, revoke, reconnect and disconnect with visible errors.

**Evidence.** `src/core/features/capture/providers/service.ts`; `tests/core/capture-providers.test.ts`; `tests/core/capture-connector.test.ts`
**Gap.** Unasserted in the carried evidence: Google adapter read; Microsoft adapter read; selected folders/calendars. Asserted: interruption before cursor commit; resumed cursor and deduplication; revoke halts reads and preserves records; reconnect restores capture; disconnect removes credential; visible error reason.

#### CAPTURE-007 — Captured data

Core · published · **partial** · Cites BASE-INPUT-001, BASE-DATA-004, BASE-SECRET-001, BASE-DATA-001, BASE-DATA-003 · Rules D-1, D-2

**Requirement.** Captured evidence, including its attachments (RECORD-018), proposals and source state are part of every export and restore under DATA-001; source credentials never are, so a restored provider source must be reconnected. Erasing a contact erases the captured evidence and proposals that carry them under DATA-002. The audit trail keeps counts and anonymous keyed replay proofs with erasure times, without addresses, original item identifiers or content, so later intake cannot recreate erased originals. Private matching contexts and proofs travel in archives; restoring an owner's historical archive retains DATA-001's existing behavior.

**Acceptance.**
1. Export/restore captured evidence and proposals, verify no source credential travels, erase a contact and replay intake to prove erased originals stay fenced.

**Evidence.** `src/core/features/capture/privacy.ts`; `tests/core/capture-data.test.ts`; `tests/core/capture-upgrade.test.ts`
**Gap.** Unasserted in the carried evidence: contact evidence erased; replayed erased originals remain absent. Asserted: captured originals exported; proposals restored equivalently; source credentials absent.

#### CAPTURE-008 — Orbit address

Core · published · **partial** · Cites BASE-INPUT-001, BASE-DATA-004, BASE-SECRET-001, BASE-DATA-001, BASE-DATA-003 · Rules D-1, D-2 · Register R-6

**Requirement.** When the installation names a receiving mailbox (the configured receiving mailbox, reached through Cloudflare Email Routing or signed SendGrid Inbound Parse), an operator can create a private Orbit address on the Capture page with no provider console: the mailbox with a random tag, kept sealed like a credential and never in archives. Only mail whose envelope names that exact tagged address is read, so a BCC copy, a forwarded message and automatic forwarding all count, and anything else is refused without storing. Each accepted message follows CAPTURE-001 to CAPTURE-004 exactly as an imported `.eml` file, and a forwarded message counts as coming from the sender it names. A forwarding confirmation from Gmail or Google Workspace is shown to the operator with its code and link instead of being stored as evidence. Replacing the address stops the old one at once and keeps everything captured; a message larger than 10 MB is counted as not stored rather than bounced.

**Acceptance.**
1. Create and rotate a tagged Orbit address, forward/BCC mail and a Gmail confirmation; accept exact envelope tags only and count oversized mail without retaining it.

**Evidence.** `tests/core/capture-no-console.test.ts`
**Gap.** Unasserted in the carried evidence: oversized mail counted; oversized content not retained. Asserted: private tagged address created; tag rotation differs; exact envelope tag accepted; wrong envelope tag stores no signal; forwarded/BCC mail captured; Gmail confirmation read back.

#### CAPTURE-009 — Calendar link

Core · published · **partial** · Cites BASE-INPUT-001, BASE-DATA-004, BASE-SECRET-001, BASE-DATA-001, BASE-DATA-003 · Rules D-1, D-2

**Requirement.** An operator can add a calendar by the private iCal address its own calendar offers (Google, Outlook or iCloud), with no provider console. Orbit checks the link returns a calendar before saving it, keeps it sealed like a credential, reads it only with GET, and refreshes it about every 15 minutes. Each event inside the last 180 days or the next year is one calendar item under CAPTURE-001 to CAPTURE-004; an unchanged calendar is not read again event by event. A link that stops working (refused, missing or no longer a calendar) stops that source and shows its error under CAPTURE-006 until the calendar is added again.

**Acceptance.**
1. Add a private ICS link, advance the refresh clock, change/cancel an event, then break the link; inspect dedupe, preserved times and the halted-source reason.

**Evidence.** `tests/core/capture-no-console.test.ts`
**Gap.** Unasserted in the carried evidence: calendar link validated; clock advancement refreshes; event changes deduplicate; event cancellation retained; original event times retained. Asserted: broken link halts with reason.

### Opportunities and priority

#### OPP-001 — Lifecycle

Core · published · **partial** · Cites BASE-INPUT-001

**Requirement.** An opportunity is open, won, or lost. Closing it as won or lost records the operator, the time, and a reason, and removes it from NOW and NEXT. Later signals append to its timeline and never reopen it; only an operator can reopen it, which returns it to open without changing its stage or owner.

**Acceptance.**
1. Close a deal as won and lost with reasons, ingest later evidence, and explicitly reopen; inspect history and queue membership at every step.

**Evidence.** `src/core/features/opportunities/repository.ts`; `src/core/features/workbench/repository.ts`; `tests/core/signals-outreach.test.ts`
**Gap.** Unasserted in the carried evidence: won close retains reason; lost close retains reason; later evidence never silently reopens; explicit reopen restores correct queue; history records every lifecycle transition. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

#### OPP-002 — Independent state

Core · published · **partial** · Cites BASE-INPUT-001

**Requirement.** Stage, owner, score, band, and queue state are independent fields. A score or band change never changes stage, owner, or won/lost state, and a stage change never changes a score.

**Acceptance.**
1. Change stage and owner and ingest scoring evidence; verify lifecycle, queue, stage, owner and score remain independently represented.

**Evidence.** `src/core/features/records/repository.ts`; `tests/e2e/operator.spec.mjs`
**Gap.** Unasserted in the carried evidence: stage/owner changes preserve independent fields. Asserted: lifecycle independently visible; stage independently visible; owner independently visible; score independently visible; band independently visible; queue independently visible.

#### OPP-003 — Evaluation

Core · published · **partial** · Cites BASE-INPUT-001

**Requirement.** A linked signal whose type carries a non-zero weight in the scoring policy, or a change to an open opportunity's stage, expected close date, value, owner, or associations, evaluates that opportunity within 30 seconds. The result records a 0–100 score, a low, medium, or high band, the evaluation time, the policy version, and each contributing signal's contribution. A closed opportunity is not evaluated. The default is each contributing signal's configured weight decays linearly to zero over the 30 days after its occurred time, the sum is clamped to 0–100, and 0–39 is low, 40–69 is medium, 70–100 is high.

**Acceptance.**
1. Ingest weighted signals and edit an open opportunity; inspect computed score, band, contributions and policy version, including decay and closed-deal exclusion.

**Evidence.** `src/core/features/opportunities/repository.ts`; `src/core/features/workbench/repository.ts`; `tests/core/signals-outreach.test.ts`; `src/core/features/workbench/policies.ts`; `src/core/features/records/repository.ts`
**Gap.** Unasserted in the carried evidence: band; contribution values; policy version; decay; closed-deal exclusion. Asserted: computed score after signal.

#### OPP-004 — Explainability

Core · published · **partial** · Cites BASE-INPUT-001

**Requirement.** The opportunity view shows every signal the current score used, by ID, with its source, occurred time, confidence, and positive or negative contribution, and shows the reason for the current recommendation beside them.

**Acceptance.**
1. Open a scored deal and follow every contribution to its source evidence and current action reason.

**Evidence.** `src/core/features/opportunities/repository.ts`; `tests/e2e/operator.spec.mjs`
**Gap.** Unasserted in the carried evidence: source evidence link. Asserted: every contribution shown; contribution signal type; contribution value; contribution source attribution.; current recommendation reason.

#### OPP-005 — Evaluation failure

Core · published · **done** · Cites BASE-INPUT-001

**Requirement.** If an evaluation fails or returns output that does not validate, the previous score, band, and evidence remain readable and are marked stale with the time of the failed attempt. Orbit shows no score, band, or recommendation it did not compute.

**Acceptance.**
1. Cause evaluation to fail after a valid score; read the last value as stale with failure time and verify no fabricated replacement.

**Evidence.** `src/core/features/opportunities/repository.ts`; `src/core/features/workbench/repository.ts`; `tests/core/signals-outreach.test.ts`
**Gap.** None.

#### OPP-006 — NOW ordering

Core · published · **partial** · Cites BASE-INPUT-001

**Requirement.** NOW lists the open opportunities that OPP-007 placed there, ordered by score descending, then by the occurred time of their most recent contributing signal descending, then by ID. Operators can filter it by owner, stage, and band. The default is the ordering in this clause, and every factor it uses is shown in the opportunity view.

**Acceptance.**
1. Create tied and untied NOW opportunities, filter by rep/stage/band and verify deterministic persisted ordering.

**Evidence.** `src/core/features/opportunities/repository.ts`; `tests/e2e/operator.spec.mjs`
**Gap.** Unasserted in the carried evidence: tied NOW order; rep filter; stage filter; band filter; ordering persists after reload. Asserted: untied NOW order.

#### OPP-007 — Queue entry

Core · published · **partial** · Cites BASE-INPUT-001

**Requirement.** An open opportunity enters NOW when its band rises, a customer form submission, reply or delivery problem arrives, a scheduled message cannot be sent, its expected close date passes, its last timeline entry becomes older than the stale interval, or an operator puts it there. It is in NEXT while it waits for a scheduled send or for a customer response inside the awaiting-response interval, and in neither when no action is pending. The stale interval defaults to 14 days and the awaiting-response interval to 5 working days, counted Monday to Friday in the workspace timezone. Every entry, move, and removal records its reason and actor on the timeline.

**Acceptance.**
1. Advance close/stale/awaiting clocks and deliver a form, reply, booking and send failure; inspect NOW/NEXT reasons and one timeline transition per event.

**Evidence.** `src/core/features/opportunities/repository.ts`; `src/core/features/workbench/repository.ts`; `tests/core/signals-outreach.test.ts`
**Gap.** Unasserted in the carried evidence: close clock; stale clock; awaiting-response clock; form NOW reason; reply NOW reason; booking NOW reason; one transition per triggering event. Asserted: failed-send NOW reason.

#### OPP-008 — Manual completion

Core · published · **partial** · Cites BASE-INPUT-001

**Requirement.** An operator can complete or skip the current recommended action without sending anything, with an optional note; the outcome, note, and operator appear on the timeline. The default is evaluate once, keep the opportunity in NOW if that produces a new recommendation, and otherwise remove it from NOW and NEXT.

**Acceptance.**
1. Complete or skip the current action without sending; inspect the recorded outcome and only a genuinely new recommendation.

**Evidence.** `src/core/features/opportunities/repository.ts`; `src/core/features/workbench/repository.ts`; `tests/core/signals-outreach.test.ts`
**Gap.** Unasserted in the carried evidence: skip retains historical recommendation; no message sent. Asserted: manual completion changes queue; only new recommendation gets a new identity.

#### OPP-009 — Pipeline stages

Core · published · **partial** · Cites BASE-INPUT-001

**Requirement.** Operators configure multiple named pipelines with ordered stages, stage probabilities, required fields and stage-specific stale intervals. Deals retain their pipeline, stage and movement history; permitted users move a deal within or between pipelines with explicit destination mapping. Stage moves record previous stage, actor and time without silently changing lifecycle or score; a move by an AUTO-002 workflow applies the same required fields and records the workflow, its version and the trigger as actor. An occupied stage or pipeline cannot be deleted until its deals have been explicitly moved. Pipeline boards and list views expose the same records and filters.

**Acceptance.**
1. Create two pipelines with different ordered stages, move deals between stages and pipelines, and refuse deletion of an occupied stage; preserve move history and independent lifecycle.

**Evidence.** `migrations/core/0039_sales_pipelines.sql`; `src/core/features/pipelines/`; `tests/core/records-search.test.ts`; `tests/evidence/contract/OPP-009/`
**Gap.** Unasserted in the carried evidence: two pipelines with distinct stages; moves between stages; moves between pipelines; occupied stage cannot be deleted; stage move history preserved; lifecycle independent. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

### Recommendations and drafts

#### ACTION-001 — Current recommendation

Core · published · **partial** · Cites BASE-ROLE-001

**Requirement.** An open opportunity has at most one current recommended action, which is either an email follow-up or a manual action. It names the action, cites at least one observed signal by ID, and records the policy or model version that produced it. Its written explanation is generated under AI-001 and is absent when AI-003 applies.

**Acceptance.**
1. Read an open deal recommendation with observed evidence and version; disable AI and retain the named action/evidence without an invented explanation.

**Evidence.** `src/core/features/assistance/provider.ts`; `src/core/features/drafts/service.ts`; `tests/core/assistance.test.ts`; `tests/core/signals-outreach.test.ts`
**Gap.** Unasserted in the carried evidence: current action evidence; current action version; named action remains with AI disabled; no invented explanation. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

#### ACTION-002 — Replacement

Core · published · **partial** · Cites BASE-ROLE-001

**Requirement.** A new contributing signal, a changed opportunity, a completed or skipped action, or an operator request replaces the current recommendation. The replaced one stays on the timeline marked superseded and can no longer be drafted from, sent, or completed.

**Acceptance.**
1. Supersede an action by new evidence or an operator change; the old action remains historical and cannot be drafted, sent or completed.

**Evidence.** `src/core/features/assistance/provider.ts`; `src/core/features/drafts/service.ts`; `tests/core/assistance.test.ts`; `src/core/features/workbench/action-repository.ts`; `tests/core/signals-outreach.test.ts`
**Gap.** Unasserted in the carried evidence: new evidence supersedes old recommendation; operator change supersedes recommendation; old action stays historical; old action cannot draft; old action cannot send; old action cannot complete. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

#### ACTION-003 — Draft on request

Core · published · **partial** · Cites BASE-ROLE-001

**Requirement.** An operator can request a one-to-one email draft for the current recommendation. Generation reads the opportunity, the primary or operator-selected contact, that contact's company, the cited signals, the messages already exchanged with that contact, and the configured instructions, and sends nothing. The default is at most 150 words, and no fact, price, discount, or commitment that a cited record or signal field does not carry. OUT-017 offers the same draft request from a contact, lead or company record, with no recommendation or open opportunity, under the same preview and policy.

**Acceptance.**
1. Preview and request a draft from current customer evidence; inspect the unsent result for cited facts and configured instructions.

**Evidence.** `src/core/features/assistance/provider.ts`; `src/core/features/drafts/service.ts`; `tests/core/assistance.test.ts`
**Gap.** Unasserted in the carried evidence: draft facts cite current evidence; configured instructions honored. Asserted: request preview matches generated input; draft saved; no outbound message created.

#### ACTION-004 — Durable draft

Core · published · **partial** · Cites BASE-ROLE-001

**Requirement.** Recipient, subject, and body are visible and editable (the recipient being OUT-019's To, CC and BCC lists), and the draft is stored with its author, source recommendation, created time, and last edit time, and is readable after signing out and back in.

**Acceptance.**
1. Edit recipient/subject/body, sign out, return and read the saved draft with its original source and edit attribution.

**Evidence.** `src/core/features/drafts/service.ts`; `tests/e2e/operator.spec.mjs`
**Gap.** Unasserted in the carried evidence: recipient and subject survive sign-out/sign-in. Asserted: recipient saved; subject saved; body saved; source recommendation retained; author metadata retained; body survives new session.

#### ACTION-005 — Stale draft

Core · published · **partial** · Cites BASE-ROLE-001

**Requirement.** A reply, meeting, unsubscribe, do-not-contact, permanent bounce, changed recipient, changed opportunity, or replaced recommendation marks a draft stale. A stale draft is shown as stale, and sending it returns 409 and writes no outbound message until an operator opens it, sees what changed, and confirms.

**Acceptance.**
1. Change the customer/deal or deliver a stop event after drafting; refuse sending until the operator sees and explicitly reviews current differences.

**Evidence.** `src/core/features/drafts/service.ts`; `tests/e2e/stale-review.spec.mjs`; `tests/core/capture-boundaries.test.ts`
**Gap.** Unasserted in the carried evidence: customer/deal mutation stales draft; stale send refused; current differences shown before new review. Asserted: reply stop stales draft.

### One-to-one outreach

#### OUT-001 — Exact-content customer sending

Core · published · **partial** · Cites BASE-MAIL-001, BASE-ROLE-001, BASE-OPS-003 · Rules D-1

**Requirement.** A person’s send binds the exact saved recipients, subject, body, attachments and message settings, and scheduled dispatch uses that unchanged snapshot. Signals, scores, recommendations and generated text are evidence, never authority. An agent’s customer-message call carries external; the company’s policy decides whether it runs, enters review, waits for approval or is off. Under the held company policy a signed-in person approves the exact saved revision before it dispatches. A later content, recipient, permission or evidence change invalidates that approval. Batch and sequence messages retain the exact per-item snapshots in their own clauses.

**Acceptance.**
1. Under the held company policy, attempt sending from ingestion, an agent and an unreviewed draft; only a signed-in person’s approval of the unchanged saved recipient, subject and body permits dispatch.

**Evidence.** `src/core/features/outreach/service.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/signals-outreach.test.ts`; `tests/core/source-onboarding.test.ts`; `tests/rer/onboarding.test.mjs`
**Gap.** Unasserted in the carried evidence: ingestion cannot dispatch; unreviewed agent call has no effect under held policy; signed-in person approves unchanged saved revision. Asserted: exact reviewed bytes dispatched.

#### OUT-002 — Message states

Core · published · **partial** · Cites BASE-MAIL-001, BASE-ROLE-001, BASE-OPS-003 · Rules D-1

**Requirement.** Customer mail is submitted through the shared customer-mail transport. An outbound message is draft, scheduled, queued, reconciling, accepted, delivered, bounced, failed, canceled, or delivery-unknown. The operator view calls a message sent only after the provider accepts it, and delivered only after a delivery event.

**Acceptance.**
1. Drive provider acceptance, delivery, bounce, failure and ambiguous responses; inspect each persisted state and truthful buyer-visible labels.

**Evidence.** `src/core/features/outreach/service.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/signals-outreach.test.ts`
**Gap.** Unasserted in the carried evidence: provider acceptance state; bounce state; persisted buyer-visible labels distinct. Asserted: delivery state; failed state; ambiguous state.

#### OUT-003 — Send idempotency

Core · published · **partial** · Cites BASE-MAIL-001, BASE-ROLE-001, BASE-OPS-003 · Rules D-1

**Requirement.** Repeated or concurrent use of one send idempotency key creates one outbound message and at most one provider submission.

**Acceptance.**
1. Submit the same approval key concurrently and after restart; observe one outbound intent and at most one provider submission.

**Evidence.** `src/core/features/outreach/service.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/signals-outreach.test.ts`; `src/core/features/workbench/routes.ts`
**Gap.** Unasserted in the carried evidence: concurrent approval has one outbound intent; same key after restart; at most one provider submission. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

#### OUT-004 — Threading

Core · published · **partial** · Cites BASE-MAIL-001, BASE-ROLE-001, BASE-OPS-003 · Rules D-1

**Requirement.** An outbound message carries message and reference headers that return the customer's reply to the same opportunity. A reply carrying those headers is attached once; a reply without them becomes an unlinked activity for operator review rather than a subject-based guess. For a message sent with no linked opportunity, or to a contact whose deals are won or lost, OUT-017 returns the reply by the same headers to that contact and their company. A reply from any external recipient of the message, To, CC or BCC, threads back the same way onto that replier's contact (OUT-019).

**Acceptance.**
1. Deliver correct, foreign and absent reply headers with sender checks; attach the correct reply once and hold ambiguous mail for review.

**Evidence.** `src/core/features/outreach/reply-matching.ts`; `tests/core/launch-reply-authority.test.ts`; `tests/core/launch-reply-sender.test.ts`
**Gap.** Unasserted in the carried evidence: absent headers held for review. Asserted: genuine reply stored once; foreign sender leaves schedule/draft unchanged; ambiguous references leave business state unchanged.

#### OUT-005 — Accepted outcome

Core · published · **partial** · Cites BASE-MAIL-001, BASE-ROLE-001, BASE-OPS-003 · Rules D-1

**Requirement.** When the provider accepts a submission, one local transaction records the reviewed content and provider message ID as a timeline activity, completes the recommendation, sets the next action to awaiting response, moves the opportunity from NOW to NEXT, and creates one notification for the responsible operator. A replayed provider event repeats none of it. This clause governs a send linked to an open opportunity; a send with no linked open opportunity records the same timeline activity and notification and opens OUT-017's contact-level awaiting-response obligation instead of a queue move.

**Acceptance.**
1. Accept an approved send, replay its provider response and inspect one timeline message, completed action, NEXT transition and notification.

**Evidence.** `src/core/features/outreach/service.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/signals-outreach.test.ts`
**Gap.** Unasserted in the carried evidence: one sent timeline activity; recommendation completed; NEXT transition (assertion is in uncited tests/core/source-onboarding.test.ts); one notification; replayed provider response has no second effect. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

#### OUT-006 — Delivery failure

Core · published · **partial** · Cites BASE-MAIL-001, BASE-ROLE-001, BASE-OPS-003 · Rules D-1

**Requirement.** A transient submission failure retries up to 5 times over 1 hour. A permanent failure or an exhausted retry returns the opportunity to NOW, notifies the responsible operator once, and shows the provider's reason on the message. A permanent bounce also sets the contact do-not-contact under RECORD-012.

**Acceptance.**
1. Fail a submission transiently, permanently and ambiguously; verify bounded known-unsent retries, visible exhausted failure, one notification and permanent-bounce stop.

**Evidence.** `src/core/features/outreach/service.ts`; `tests/core/outreach-limits.test.ts`; `tests/core/signals-outreach.test.ts`
**Gap.** Unasserted in the carried evidence: ambiguous outcome distinct; permanent bounce stops contact; provider reason retained. Asserted: known-unsent retry bounded to five attempts; exhausted failure visible; one failure notification.

#### OUT-007 — Stop conditions

Core · published · **partial** · Cites BASE-MAIL-001, BASE-ROLE-001, BASE-OPS-003 · Rules D-1

**Requirement.** A reply, a booked meeting, an unsubscribe, a do-not-contact, or a permanent bounce cancels that contact's scheduled messages and marks their unsent drafts stale under ACTION-005. A reply or a bounce ends awaiting response and returns the opportunity to NOW with the reply or the delivery problem as its next action. An OUT-031 unattributed stop request pauses, rather than cancels, the scheduled messages and sequence enrollments of every external recipient of its message until a user resolves it.

**Acceptance.**
1. Schedule a message, deliver reply/booking/unsubscribe/bounce or a manual stop, then advance dispatch; cancel the message and stale the draft without duplicates.

**Evidence.** `src/core/features/outreach/service.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/signals-outreach.test.ts`
**Gap.** Unasserted in the carried evidence: booking cancels scheduled mail; unsubscribe cancels scheduled mail; bounce cancels scheduled mail; manual stop cancels scheduled mail; replay has no second effect. Asserted: reply cancels scheduled mail; stop stales unsent draft.

#### OUT-008 — Quiet hours

Core · published · **partial** · Cites BASE-MAIL-001, BASE-ROLE-001, BASE-OPS-003 · Rules D-1

**Requirement.** A draft can be written at any time. Sending outside 08:00–18:00 Monday to Friday in the contact's timezone, or the workspace timezone when the contact has none, requires a second confirmation naming the recipient's local time; a scheduled send waits for the next permitted minute. The default is the window in this clause, with no holiday calendar.

**Acceptance.**
1. Approve outside recipient-local quiet hours, including daylight-saving boundaries; require the extra immediate confirmation or delay the schedule to the permitted window.

**Evidence.** `src/core/features/outreach/service.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/signals-outreach.test.ts`
**Gap.** Unasserted in the carried evidence: extra immediate confirmation. Asserted: recipient-local weekday/DST window; expired confirmation cannot send; scheduled message waits for reviewed next window.

#### OUT-009 — Scheduled send

Core · published · **partial** · Cites BASE-MAIL-001, BASE-ROLE-001, BASE-OPS-003 · Rules D-1

**Requirement.** An operator can schedule one reviewed message for a future time and cancel it until it dispatches. Dispatch re-checks ACTION-005, RECORD-012, OUT-007, OUT-008, and OUT-010 against the current record and submits only the approved content; a stale or prohibited message is not sent, returns the opportunity to NOW, and shows the reason.

**Acceptance.**
1. Schedule/cancel approved content, then change its evidence, permission and recipient before dispatch; only unchanged current authorized content can reach the provider.

**Evidence.** `src/core/features/outreach/scheduler.ts`; `tests/core/outreach-limits.test.ts`
**Gap.** Unasserted in the carried evidence: schedule and cancel; changed evidence blocks dispatch; changed permission blocks dispatch; changed recipient blocks dispatch; unchanged authorized content submitted. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

#### OUT-010 — Sending limits

Core · published · **partial** · Cites BASE-MAIL-001, BASE-ROLE-001, BASE-OPS-003 · Rules D-1

**Requirement.** Before submission Orbit checks the shared transport's rate and each sender's one-to-one budget under OUT-018 (the installation manifest limits: 100 messages a minute and 1,000 a user per rolling day by default). A message over a limit stays unsent and visible with the limit that stopped it and the time it may be sent; Orbit neither retries it silently nor merges it with another message. Sequence budgets and mailbox pacing are OUT-018's.

**Acceptance.**
1. Exceed the per-minute and per-operator daily limits before immediate and scheduled submission; retain a visible unsent item with its reason and next permitted time, and see no silent retry.

**Evidence.** `src/core/features/outreach/service.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/signals-outreach.test.ts`; `tests/core/outreach-limits.test.ts`
**Gap.** Unasserted in the carried evidence: immediate submission limit; scheduled submission limit. Asserted: per-minute limit visibly holds; per-user daily limit visibly holds; held item shows reason; next permitted time; no silent retry.

#### OUT-011 — Unresolved submission

Core · published · **partial** · Cites BASE-MAIL-001, BASE-ROLE-001, BASE-OPS-003 · Rules D-1

**Requirement.** Orbit records the outbound intent and its provider idempotency key durably before submitting. If the transaction in OUT-005 fails the message becomes reconciling; if the provider's response is a timeout it becomes delivery-unknown. In both states a job queries the provider by that idempotency key every 5 minutes, submits nothing again, and applies the OUT-005 outcome exactly once if acceptance is confirmed. With SendGrid the query uses its Email Activity API; on an account without that API each attempt records the lookup failure on the message. A SendGrid message still unresolved after 24 hours becomes a failure the operator can see, and notifies the responsible operator. Run Edit Run managed mail offers no lookup, so such a message stays delivery-unknown with that explanation, is never submitted again, and is left for the operator to reconcile.

**Acceptance.**
1. Lose the acceptance transaction or provider response; restart and reconcile the durable intent without submitting again, ending once as accepted or visibly unresolved.

**Evidence.** `src/core/features/outreach/service.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/signals-outreach.test.ts`; `src/core/platform/outbound-mail.ts`
**Gap.** Unasserted in the carried evidence: lost acceptance transaction; restart reconciles durable intent; unresolved stays visible. Asserted: lost provider response becomes uncertain; provider never resubmitted; one accepted final outcome.

#### OUT-012 — Unsubscribe

Core · published · **partial** · Cites BASE-MAIL-001, BASE-ROLE-001, BASE-OPS-003 · Rules D-1

**Requirement.** An outbound customer message that carries opt-out under OUT-020 carries the opt-out URL header and the one-click opt-out header headers handled by the mail provider, or by the installation origin for managed relay mail and OUT-013 mailbox sends. An unsubscribe event that identifies one recipient sets that contact do-not-contact under RECORD-012 within 60 seconds and cancels their scheduled messages. OUT-020 sets which message types carry opt-out (sequence email on and one-to-one email off by default) and the scope of an opt-out from a message with more than one external recipient.

**Acceptance.**
1. Inspect unsubscribe headers on actual submitted mail of a type set to carry opt-out, receive a signed unsubscribe and confirm future sending and scheduled work are suppressed.

**Evidence.** `tests/core/outbound-boundaries.test.ts`; `tests/core/outreach-limits.test.ts`
**Gap.** Unasserted in the carried evidence: future immediate send refused. Asserted: submitted opt-out headers; authenticated unsubscribe suppresses contact; all scheduled work cancelled.

### AI

#### AI-001 — Provider and input

Core · published · **partial** · Cites BASE-DATA-004, BASE-SECRET-001

**Requirement.** Recommendation explanations and email drafts go through `ai.provider.v1`. The request preview shows the operator every field, timeline entry, and instruction the request will carry, and nothing outside the preview is sent.

**Acceptance.**
1. Open an AI request preview, inspect all customer fields and instructions, then compare the provider-edge request with that exact unchanged preview.

**Evidence.** `src/core/features/assistance/provider.ts`; `tests/core/assistance.test.ts`
**Gap.** Unasserted in the carried evidence: expected complete customer-field set visible in the preview; configured instructions visible in the preview. Asserted: provider request equals the saved preview.

#### AI-002 — Output validation

Core · published · **partial** · Cites BASE-DATA-004, BASE-SECRET-001

**Requirement.** AI output must validate against its operation's schema and cite only evidence IDs present on the record. Output failing either check fails visibly and is never repaired with invented content or a semantic fallback. Only a transient transport failure is retried, at most twice within 30 seconds.

**Acceptance.**
1. Return invalid schema, foreign citations and a transport error at the provider edge; fail invalid content visibly with no invented repair and bound transport retry.

**Evidence.** `src/core/features/assistance/provider.ts`; `tests/core/assistance.test.ts`
**Gap.** Unasserted in the carried evidence: invalid schema visibly fails; transport error visibly fails; no fabricated repair; bounded transport retries. Asserted: foreign citation leaves no draft.

#### AI-003 — Provider failure

Core · published · **partial** · Cites BASE-DATA-004, BASE-SECRET-001

**Requirement.** When the AI provider is unconfigured or unavailable, records, signal ingestion, linking, scoring, queue placement, search, manual updates, hand-written drafts, and sending all continue to work, and a recommendation still names its action and evidence. A generation request shows the failure and produces no explanation or draft.

**Acceptance.**
1. Leave AI unconfigured and fail a configured request; finish manual CRM, ingestion, scoring and handwritten outreach flows while generation reports failure.

**Evidence.** `src/core/features/assistance/provider.ts`; `tests/core/assistance.test.ts`
**Gap.** Unasserted in the carried evidence: failed generation visible; manual CRM still works; ingestion still works; scoring still works; handwritten sending still works. Asserted: unconfigured generation unavailable.

#### AI-004 — Cost

Core · published · **partial** · Cites BASE-DATA-004, BASE-SECRET-001

**Requirement.** Every AI call records provider, model, input and output tokens, feature, duration, status, and estimated cost. Operators can view totals by day and by feature in settings.

**Acceptance.**
1. Generate successful and failed requests, then inspect provider/model/tokens/duration/status/cost and day/feature totals in Settings.

**Evidence.** `src/core/features/assistance/provider.ts`; `tests/core/assistance.test.ts`
**Gap.** Unasserted in the carried evidence: failed call accounting; provider; model; duration; cost; daily totals; feature totals in Settings. Asserted: successful token counts; status.

### Daily brief and meeting plans

#### BRIEF-001 — Today's brief

Core · published · **done** · Cites BASE-ROLE-001

**Requirement.** The top of the operator home is a brief built from records only, so it works with the AI provider unconfigured (AI-003). Per account (the company when one is known, otherwise the opportunity, otherwise the contact) it lists the customer signals linked since the operator last marked the brief seen, or, before they ever have, over the stale interval counted from the start of the day (UTC), with replies and booked, completed or canceled meetings first and observed signals kept apart from inferred ones (SIGNAL-006); the account's overdue promises (BRIEF-002); and application handoffs waiting for review (BRIEF-005). Signals that match no record and replies without thread headers are listed as unresolved identity, never guessed; captured replies and meetings waiting for a person to accept or decline their proposed link are listed as held for capture review. Every line shows its occurred time and links to the record, timeline entry, draft, task or review item it rests on; a line without such evidence is not shown. Marking the brief seen records the operator and the time the brief was built in the audit trail, so anything arriving later stays new. A day with nothing says so. The brief is for full native operators; invited collaborators cannot read it.

**Acceptance.**
1. Open Today with fresh, held and unlinked events; follow every line to evidence, mark seen, receive a later event and confirm it remains new.

**Evidence.** `src/core/features/today/brief.ts`; `src/core/features/today/promises.ts`; `tests/core/today-brief.test.ts`
**Gap.** None.

#### BRIEF-002 — Overdue promises

Core · published · **partial** · Cites BASE-ROLE-001

**Requirement.** Computed from records when the brief is built: an open internal next action (a handoff task a person wrote or accepted) or an open opportunity's next action past its due time; the latest customer reply on a record with no approved outbound message, captured sent message, logged call or meeting, or completed action on that record since, once the awaiting-response interval (TEAM-003, working days in the workspace timezone) has passed; a meeting completed within the last 120 days with no note, logged call or meeting, completed action, handoff, draft, approved message or captured sent message on its records after it; and a draft on an open opportunity left untouched longer than the workspace stale interval, with no outbound attempt and no customer stop event. A recommendation carries no due time and is never a promise by itself.

**Acceptance.**
1. Advance past each task/reply/meeting/draft deadline, complete the corresponding obligation and verify overdue lines appear and clear from actual records.

**Evidence.** `src/core/features/today/brief.ts`; `src/core/features/today/promises.ts`; `tests/core/today-brief.test.ts`
**Gap.** Unasserted in the carried evidence: overdue task; overdue draft; task completion clears line; draft completion clears line. Asserted: overdue reply; overdue meeting; reply completion clears line; meeting completion clears line.

#### BRIEF-003 — Account summary

Core · published · **partial** · Cites BASE-ROLE-001

**Requirement.** With a provider configured (AI-001), an operator can ask for a one-paragraph summary of one account's brief lines. The request preview shows every field sent, and the request is sent only unchanged from that preview; a brief that changed since the preview is refused with 409. Output must validate and cite only evidence IDs from that account's lines (AI-002); failing or uncited output is recorded (AI-004) and shown as failed, never repaired or replaced. Summaries are not stored, and a provider failure leaves the brief whole.

**Acceptance.**
1. Preview an account summary, alter the brief before generation and require refusal; generate on a fresh preview and reject uncited provider output.

**Evidence.** `src/core/features/today/brief.ts`; `src/core/features/today/promises.ts`; `tests/core/today-brief.test.ts`
**Gap.** Unasserted in the carried evidence: actual brief change before generation refused. Asserted: preview sends exact request; fresh summary result succeeds; uncited output fails with no summary.

#### BRIEF-004 — Meeting plan

Core · published · **partial** · Cites BASE-ROLE-001

**Requirement.** A meeting signal linked to a record (booked, completed or canceled, from a source or from capture) has a plan page: its time exactly as the source gave it or the statement that none was given; attendees resolved by exact email key (RECORD-003) with their company and open opportunities; attendees with no record listed as unresolved, never guessed, with a way to create a contact with that exact address; the opportunities with value, stage and owner and their total open value; the last interactions on its records and the outstanding promises on them (BRIEF-002), each citing its timeline entry or record. The agenda and prep notes are saved as one note under RECORD-010 on the meeting's opportunity (or its company or contact) and edited in place. A person can turn a cited plan line into an internal next action on the meeting's opportunity that cites that line. Planning creates no draft and sends nothing (OUT-001).

**Acceptance.**
1. Open a linked meeting, inspect resolved/unresolved attendees and promises, save agenda/prep and create a cited internal task without customer outreach.

**Evidence.** `src/core/features/today/brief.ts`; `src/core/features/today/promises.ts`; `tests/core/today-brief.test.ts`
**Gap.** Unasserted in the carried evidence: promises on meeting plan. Asserted: resolved attendee fields; unresolved attendee address; agenda/prep read after save; cited internal task; uncited task refused; no draft or customer message created.

#### BRIEF-005 — Agent handoff

Core · published · **done** · Cites BASE-ROLE-001

**Requirement.** Within the scoped application delegation below and with no new scope: the selected-record evidence read also reads the brief, narrowed to lines resting on selected records, and the plan of a meeting that is selected or linked to a selected record, narrowed to the selected records and the contacts and company of selected opportunities; a line or interaction resting only on opportunities outside the grant is left out even when it shares a contact or company, records outside the grant are left off the lines shown, and unresolved attendees show only their address. A line seen only through a signal selected by id keeps only selected records; one left with none is listed apart from the accounts and links to that signal's evidence read. A held line names a proposed contact or company only when it is selected, and a selected contact's line is filed under its company only when that company is selected too. the internal handoff action content may cite evidence IDs; each must be a signal, timeline entry, draft or task on that opportunity, its contacts or its company, or the write is refused with 422. An application handoff carries standard and the company's policy decides its filing; under the held company policy it remains a proposal in the brief and on the opportunity with cited evidence (or the statement that it cites none) until a person accepts, edits or dismisses it; that review appends one timeline entry attributed to the person and naming the application. A handoff supplies evidence rather than message authority; an agent's separate sending call carries external under the company's policy (OUT-001). Without consent, without the write scope or after revocation an application cannot write, and revocation stops its reads at once.

**Acceptance.**
1. Read a selected-record brief/meeting through delegation, propose a cited handoff, review it natively and revoke the grant; no outside evidence or sending becomes available.

**Evidence.** `src/core/features/today/brief.ts`; `tests/delegation/brief-handoff.test.ts`
**Gap.** None.

### Notifications

#### NOTIFY-001 — Responsible operator

Core · published · **partial** · Cites BASE-ROLE-001

**Requirement.** The responsible operator for an opportunity is its owner, or, when it is unassigned, the operator whose action appears most recently on its timeline. They receive one in-app notification when it enters NOW, when a customer reply arrives on it, and when one of its outbound messages fails, bounces, or becomes delivery-unknown. When an unassigned opportunity that no operator has acted on enters NOW, every operator is notified instead. Duplicate source or provider events add no notification.

**Acceptance.**
1. Trigger queue entry, reply and delivery problems on assigned and unassigned deals; verify responsible recipients and one notification on replay.

**Evidence.** `src/core/features/notifications/routes.ts`; `tests/core/assistance.test.ts`; `tests/e2e/zz-notifications.spec.mjs`
**Gap.** Unasserted in the carried evidence: assigned-deal responsible recipient (the fixture leaves the deal unassigned). Asserted: unassigned queue recipient; unassigned reply recipient and replay count; delivery-problem recipient once; no-actor fallback goes to every active operator.

#### NOTIFY-002 — Read state

Core · published · **partial** · Cites BASE-ROLE-001

**Requirement.** A notification is unread until the operator opens it or marks it read. The unread count updates within 5 seconds and never counts one event twice.

**Acceptance.**
1. Open and mark notifications read across sessions; inspect recipient-specific state and an unread count without duplicate events.

**Evidence.** `src/core/features/notifications/routes.ts`; `tests/core/assistance.test.ts`; `tests/e2e/zz-notifications.spec.mjs`
**Gap.** Unasserted in the carried evidence: read state persists after a new sign-in session. Asserted: recipient read mark stored; another recipient cannot mark it; unread count returns to previous value; queue notice not duplicated.

### Public surfaces

#### PUBLIC-001 — Landing page

Core · published · **partial** · Cites BASE-PUBLIC-001, BASE-ACCESS-001, BASE-ACCESS-002, BASE-SIGNIN-001 · Register R-4, R-5

**Requirement.** The public home at the app origin returns the public Base Lobby without a session and links to native sign-in. The separate approved run site uses Orbit's public identity and images. Neither surface exposes this installation's contacts, companies, opportunities or signals. This target-contract round leaves the approved homepage and app interface untouched.

**Acceptance.**
1. Visit the public app Lobby and separate run site without a session; verify branding/sign-in links and no installation customer data in HTML or network.

**Evidence.** `src/base/lobby.ts`; `tests/e2e/baseline.spec.mjs`
**Gap.** Unasserted in the carried evidence: app Lobby branding and sign-in links; separate run-site branding and sign-in links; no customer data in public HTML; no customer data in network responses. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

#### PUBLIC-002 — Safe demo

Core · published · **partial** · Cites BASE-PUBLIC-001, BASE-ACCESS-001, BASE-ACCESS-002, BASE-SIGNIN-001

**Requirement.** When enabled in the public-site configuration, the demo page presents a separate read-only example workspace with twelve fictional deals, relative dates, signals, drafts and a sent-message/reply story. It clearly labels these as examples before displaying them. No example data is written to the owner's database. The demo cannot load owner records, send mail, call AI, approve outreach or mutate data. Unknown demo paths return the styled not-found page. Disabling it returns 404. This deliberately replaces the former dedicated hosted-record walkthrough; all native session, exact-message review and customer-sending requirements remain unchanged.

**Acceptance.**
1. Browse the labeled fictional demo and unknown paths at desktop/mobile sizes; verify no owner-data read, D1 write, AI request or send.

**Evidence.** `src/demo.ts`; `tests/core/public-demo.test.ts`
**Gap.** Unasserted in the carried evidence: unknown demo paths; desktop and phone journey; no owner-data read over populated owner data; no D1 mutation across all tables; no AI request; no customer send. Asserted: fictional demo labeled.

#### PUBLIC-003 — Unconfigured sign-in

Core · published · **partial** · Cites BASE-PUBLIC-001, BASE-ACCESS-001, BASE-ACCESS-002, BASE-SIGNIN-001

**Requirement.** While no sign-in mail is configured, the native sign-in page answers without an operator session and states that sign-in email is unavailable. It presents no credential field, demo account, local-login action, or session bypass.

**Acceptance.**
1. Visit sign-in without configured mail/provider; see unavailable state and attempt to obtain a session without a valid native proof.

**Evidence.** `src/base/lobby.ts`; `tests/e2e/baseline.spec.mjs`
**Gap.** Unasserted in the carried evidence: unconfigured mail/provider state visible; no session without valid native proof. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

#### PUBLIC-004 — Native sign-in

Core · published · **partial** · Cites BASE-PUBLIC-001, BASE-ACCESS-001, BASE-ACCESS-002, BASE-SIGNIN-001

**Requirement.** Native sign-in uses Orbit’s existing operator identities and admits no new operator merely from an identity-provider assertion. Its optional linked provider stays off until the owner enables it, and return locations remain inside the operator app. Missing or failed mail setup remains visible without issuing an Orbit session; the sign-in identity plate carries Orbit’s declared brand and theme. Native email proofs are kept as keyed digests, confirmed from a read-only page by a state-changing submission, single-use and valid for fifteen minutes; only a confirmed proof creates a secure native session.

**Acceptance.**
1. Request and confirm a native magic link, test unknown/inactive and expired/reused links, sign out and exercise optional linked identity without admitting new operators.

**Evidence.** `src/core/features/identity/index.ts`; `tests/core/identity.test.ts`; `tests/core/prior-auth-upgrade.test.ts`
**Gap.** Unasserted in the carried evidence: expired link refused; linked provider admits no new operator. Asserted: valid native link creates current person session; unknown/inactive response matches; single-use link signs in only once; sign-out revokes session.

### Data

#### DATA-001 — Export contents

Core · published · **partial** · Cites BASE-DATA-001, BASE-DATA-003, BASE-AUDIT-001

**Requirement.** The buyer can export and restore contacts, companies, opportunities, associations, custom data, source definitions without secrets, signals and captured evidence, evaluations with policy versions, recommendations, drafts, outbound content/status, tasks, timeline, notifications, settings, reports and audit as versioned data. Both supported archive paths disclose their format and eligible receiving state. Installation-local sessions, identity proofs, source/OAuth credentials, delegation authority, private import originals/custody and collaborator/public-form authority do not travel; reconnection and renewed authorization are explicit. DATA-003 extends these guarantees to every target feature. This records Orbit's installation-authority replacement for literal BASE-DATA-001 credential portability; it does not claim that excluded private originals are portable product records. INTEGRATE-005’s Slack routing choices, mappings, notices and deletion history export as definitions and provenance without authority. Bot tokens, signing secrets and unconsumed action capabilities never travel; restored routes and mappings require fresh administrator confirmation.

**Acceptance.**
1. INTEGRATE-005’s Slack routing choices, mappings, notices and deletion history export as definitions and provenance without authority.
2. Bot tokens, signing secrets and unconsumed action capabilities never travel; restored routes and mappings require fresh administrator confirmation.
3. Export through both supported archive doors, restore into eligible empty product state, export again and compare domain contents, captured evidence and audit with declared authority exclusions.

**Evidence.** `src/core/features/records/archive-export.ts`; `src/core/features/records/archive-import.ts`; `tests/core/archive-transfer.test.ts`; `newtests/t096/archive-import-recovery.test.ts`; `src/core/shared/archive-identity.ts`
**Gap.** Unasserted in the carried evidence: Slack routing choices portable; Slack mappings portable without authority; Slack notices and deletion history portable; bot credentials absent from both archive doors; signing secrets absent; unconsumed action capabilities absent; restored routes require new confirmation; restored mappings require new confirmation; both supported archive doors round-trip all domain content; captured evidence round-trips; audit round-trips; all declared authority exclusions. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

#### DATA-002 — Contact erasure

Core · published · **partial** · Cites BASE-DATA-001, BASE-DATA-003, BASE-AUDIT-001

**Requirement.** Within 5 minutes of an operator deleting a contact, their email addresses, signal payloads, drafts, message bodies, and the notifications naming them are absent from records, search results, exports, and every later AI or mail request. Erasing a contact, company or deal redacts INTEGRATE-005’s stored notice content and issues tracked chat.delete requests for its bot messages, with each deletion outcome visible. Copies already held outside Slack cannot be recalled. Copies already held outside Slack cannot be recalled.

**Acceptance.**
1. Erasing a contact, company or deal redacts INTEGRATE-005’s stored notice content and issues tracked chat.delete requests for its bot messages, with each deletion outcome visible.
2. Delete a contact containing aliases, imported/captured mail and notes, drafts and transfer copies; verify search/export/AI/mail absence and anonymized audit within five minutes, including replay.

**Evidence.** `src/core/features/records/data.ts`; `tests/core/contact-erasure.test.ts`; `tests/core/crm-import-erasure.test.ts`
**Gap.** Unasserted in the carried evidence: contact erasure redacts stored Slack content; company erasure redacts stored Slack content; deal erasure redacts stored Slack content; provider delete requests tracked; each provider-deletion outcome visible; aliases erased; imported/captured evidence erased; drafts erased; transfer copies withdrawn; search absence; export absence; AI absence; mail absence; anonymous audit; completion within five minutes; replay cannot recreate erased content. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

### Scoped application delegation

#### DELEGATE-001 — Selected application authority

Core · published · **partial** · Cites BASE-ACCESS-002, BASE-ACCESS-004, BASE-AGENT-005

**Requirement.** Supersedes BASE-ACCESS-002 and BASE-ACCESS-004 only for the selected-application delegation door: an allowlisted application exchanges a single-use consent code bound to the native operator, workspace, exact callback, PKCE challenge, scopes and selected targets for a bearer credential expiring within 30 days. Ambient cookies confer no authority there. Every operation rechecks scope, expiry, active operator, enabled application and revocation; restore invalidates authority. Native consent, settings and task editing still require the operator session. the selected-record evidence read reads only selected records, and lists them (with the handoffs on selected opportunities) by name and target ID only, so an application can offer them by name. `crm.handoff.write` permits only the internal handoff action, an internal task with title, description, assignee, due time and open/completed/canceled status. It confers no outreach or account-activation authority. Writes bind current source and audience revisions and commit task, timeline, contact provenance and receipt atomically. Exact key replay produces one effect; changed content conflicts. Immutable receipts remain separate from current authorized source readback. Native UI edits the same records. Actual archives retain tasks and contact provenance, exclude codes, credentials and receipts, and revoke restored-installation authority. Full verification includes the delegation D1, archive and native-browser regressions as well as all retained contract gates. An INTEGRATE-009 Slack mapping confers no delegation or outreach authority. Its acknowledgment never accepts an application-proposed handoff; its only writes are acknowledgment and an attributed internal task under current native access.

**Acceptance.**
1. An INTEGRATE-005 Slack mapping confers no delegation or outreach authority.
2. Its acknowledgment never accepts an application-proposed handoff; its only writes are acknowledgment and an attributed internal task under current native access.
3. Authorize selected records through native consent and PKCE, read and propose a handoff, refuse outside scope, revoke immediately, and restore without restoring credential authority.

**Evidence.** `src/core/features/delegation/protocol.ts`; `tests/delegation/authority-regressions.test.ts`; `tests/delegation/archive-regression.test.ts`
**Gap.** Unasserted in the carried evidence: Slack mapping grants no delegation authority; Slack mapping grants no outreach authority; Slack acknowledgment does not accept a proposed handoff; Slack writes only acknowledgment/internal task; task retains current native access and actor; native consent and PKCE scope; selected records readable; outside-scope read refused. Asserted: internal handoff proposed; revocation stops every door; restored credential authority absent; restored history preserved.

### Permissions, records and migration

#### TEAM-005 — Sales roles and assigned records

Core · target · **partial** · Cites BASE-ROLE-001, BASE-ACCESS-004

**Requirement.** An owner assigns sales-admin, manager, seller and read-only roles, teams and record ownership. Managers may see their team; a seller can be restricted to assigned/shared records. Assigned records are exactly the records that seller owns: opportunities under RECORD-007, and contacts, leads, companies and custom-object records under RECORD-016. A restricted role may additionally see records explicitly shared with the seller or their team and, when the administrator enables it for that role, the contacts and company associated with a deal they own. A manager's team scope is the records owned by the team's members. Field-level grants protect sensitive amounts, notes, mail and files (RECORD-018). Import/export, forecast override, source connection, deletion, workflow authoring and activation, sequence authoring and sequence enrollment have distinct permissions. By default only sales-admins activate workflows (AUTO-001), whose record writes stay within the activating user's grants (AUTO-002), and sales-admin, manager and seller roles may author sequences (SEQUENCE-001).

**Acceptance.**
1. Invite a manager and two reps, make one account private, deny its record and field through direct URLs/search/API/report/export/AI preview, share it intentionally, then revoke and repeat after sign-out and restore. Restrict one rep to owned records and verify that their lists, search, API and export show only the contacts and companies they own under RECORD-016, and that reassigning one of those contacts removes it from their next request.

**Evidence.** `src/core/features/records/entry-privacy.ts`; `src/core/features/records/shared-entries.ts`; `src/core/features/notifications/collaborator.ts`; `newtests/t096/collaborator-lifecycle.test.ts`; `newtests/t096/private-entries-proof.ts`; `tests/delegation-browser/records-layout.test.ts`
**Gap.** Implemented first slice: author-controlled privacy for a note, logged call/meeting, task note or handoff; collaborator record/shared/search/mention/notification reads withhold private entries regardless of the record grant. Visibility changes are audited, flags round-trip through the CLI archive and disappear with deleted entries. Private entry, task-note and handoff controls and collaborator Shared records are exercised at 1440 and 390. FORM-001 round robin retains its explicit active full-operator lists; ownership alone grants no current access. Native teams, team mentions, restricted sales roles, team queues and chosen-user/team notifications remain gaps.

#### TEAM-006 — Team forecast, reports and dashboards

Core · target · **partial** · From TEAM-005 · Cites BASE-ROLE-001, BASE-ACCESS-004

**Requirement.** Before teams ship, they must carry FORECAST-001’s real team quota membership, team-scoped forecast and override permissions, and rep/team quota-attainment acceptance. The installation owner administers forecast inputs and per-rep quotas until then. Before teams and restricted sales roles ship, they must carry REPORT-001's manager team scope, team sharing of reports and restricted-seller totals: a manager's reports and drill-through cover the records the team's members own, a report can be shared with a team, and a seller restricted to assigned records sees totals, groups, reasons and drill-through computed only from the records and fields they may see, with no count or sum of hidden records. Until then the installation owner administers report sharing, every full operator reads every record and a collaborator sees only their grants. Before teams and restricted sales roles ship, TEAM-005 carries REPORT-002's Team filter, team dashboard sharing, administrator team default that each user can override, and restricted-seller dashboards: every tile, total, drill row, CSV, PDF and email copy uses only that seller's current permitted records and fields, with no count or sum of hidden records.

**Acceptance.**
1. For a manager, team reports and drill-through cover records the team owns; share a report with a team and verify restricted-seller totals, groups, reasons and drill-through reveal no count or sum of hidden records.
2. Exercise team quota membership, team-scoped forecast overrides and rep/team quota attainment.
3. Use the Team dashboard filter, team sharing, administrator team default and user override; every tile, total, drill row, CSV, PDF and email copy contains only currently permitted records and fields.

**Evidence.** `src/core/features/records/entry-privacy.ts`; `src/core/features/records/shared-entries.ts`; `src/core/features/notifications/collaborator.ts`; `newtests/t096/collaborator-lifecycle.test.ts`; `newtests/t096/private-entries-proof.ts`; `tests/delegation-browser/records-layout.test.ts`
**Gap.** Implemented first slice: author-controlled privacy for a note, logged call/meeting, task note or handoff; collaborator record/shared/search/mention/notification reads withhold private entries regardless of the record grant. Visibility changes are audited, flags round-trip through the CLI archive and disappear with deleted entries. Private entry, task-note and handoff controls and collaborator Shared records are exercised at 1440 and 390. FORM-001 round robin retains its explicit active full-operator lists; ownership alone grants no current access. Native teams, team mentions, restricted sales roles, team queues and chosen-user/team notifications remain gaps.

#### TEAM-007 — Team libraries, mentions and entry privacy

Core · target · **partial** · From TEAM-005 · Cites BASE-ROLE-001, BASE-ACCESS-004

**Requirement.** Before teams and restricted sales roles ship, they must carry OUT-014's template, snippet and signature sharing: real team membership, team-restricted sharing and current role/record/field access govern authoring, use and merge-data reads. The installation owner acts as administrator until then; current full operators may use the library and collaborators are refused. Before teams ship, they must carry TEAM-007's team mentions: autocomplete offers active teams, a team mention notifies each active member once, and "cannot see the record" follows the team roles and private records instead of the collaborator-only check used today. Before teams ship, they must carry TEAM-007's per-entry private visibility: an author can make a single note, logged call or meeting, task note or handoff private, and a private entry is hidden from colleagues outside its audience and from a collaborator whose grant includes the record's notes, calls and meetings, on Shared records, in Notifications → Mentions and in mention notifications. Until then every entry on a record is visible to every full operator and to a collaborator whose grant on that record includes its notes, calls and meetings.

**Acceptance.**
1. Use a template, snippet and signature shared with a real team; current role, record and field access govern authoring, use and merge-data reads.
2. Mention an active team and notify each active member once; users without access require explicit sharing or removal of the mention.
3. Share a deal with a collaborator including its notes, calls and meetings; make one note private and confirm it is absent on Shared records, Notifications → Mentions and mention notices for everyone outside its audience.

**Evidence.** `src/core/features/records/entry-privacy.ts`; `src/core/features/records/shared-entries.ts`; `src/core/features/notifications/collaborator.ts`; `newtests/t096/collaborator-lifecycle.test.ts`; `newtests/t096/private-entries-proof.ts`; `tests/delegation-browser/records-layout.test.ts`
**Gap.** Implemented first slice: author-controlled privacy for a note, logged call/meeting, task note or handoff; collaborator record/shared/search/mention/notification reads withhold private entries regardless of the record grant. Visibility changes are audited, flags round-trip through the CLI archive and disappear with deleted entries. Private entry, task-note and handoff controls and collaborator Shared records are exercised at 1440 and 390. FORM-001 round robin retains its explicit active full-operator lists; ownership alone grants no current access. Native teams, team mentions, restricted sales roles, team queues and chosen-user/team notifications remain gaps.

#### TEAM-008 — Team sending budgets and Slack audiences

Core · target · **partial** · From TEAM-005 · Cites BASE-ROLE-001, BASE-ACCESS-004

**Requirement.** Before teams ship, they must carry OUT-018's per-team lowering and raising of sending budgets, audited like the per-user change the installation owner makes today. TEAM-005 inherits INTEGRATE-005’s real administrator roles and team-scoped Slack channel and audience rules, including the dashboard-ready notice. Until teams exist, the installation owner chooses its channel and explicitly enables its saved schedule. INTEGRATE-009’s Slack mappings confer no role, record or field access. Permission changes apply on the next request and require fresh mapping confirmation. A seller-, team- or otherwise restricted record never counts as visible to every active full operator; a team channel never widens access.

**Acceptance.**
1. INTEGRATE-005’s Slack mappings confer no role, record or field access.
2. Permission changes apply on the next request and require fresh mapping confirmation.
3. A seller-, team- or otherwise restricted record never counts as visible to every active full operator; a team channel never widens access.
4. Exercise real administrator roles, team-scoped Slack channel/audience rules and dashboard-ready notices; a team channel never widens access.
5. Lower and raise sending budgets per team and read back the attributed old/new values and time.

**Evidence.** `src/core/features/records/entry-privacy.ts`; `src/core/features/records/shared-entries.ts`; `src/core/features/notifications/collaborator.ts`; `newtests/t096/collaborator-lifecycle.test.ts`; `newtests/t096/private-entries-proof.ts`; `tests/delegation-browser/records-layout.test.ts`
**Gap.** Implemented first slice: author-controlled privacy for a note, logged call/meeting, task note or handoff; collaborator record/shared/search/mention/notification reads withhold private entries regardless of the record grant. Visibility changes are audited, flags round-trip through the CLI archive and disappear with deleted entries. Private entry, task-note and handoff controls and collaborator Shared records are exercised at 1440 and 390. FORM-001 round robin retains its explicit active full-operator lists; ownership alone grants no current access. Native teams, team mentions, restricted sales roles, team queues and chosen-user/team notifications remain gaps.

#### RECORD-014 — Configurable sales data and custom objects

Core · target · **partial** · Cites BASE-INPUT-001, BASE-ROLE-001, BASE-INPUT-003, BASE-DATA-003, BASE-INPUT-003

**Requirement.** Administrators define typed custom fields, required/unique values, picklists, validation, layouts, custom objects and explicit relationships with contacts, companies and deals. Changes preview affected records before applying; archived fields retain readable history and export meaning. A field can be marked "approve each workflow change" (AUTO-002), and its history names the source of each change: a user, an import, capture, the API or a workflow and its version. Users create saved filtered lists, select columns, sort and bulk-edit permitted records through a review showing individual failures. Leads qualify and convert to associated contact/company/deal records without losing source, activities or consent.

**Acceptance.**
1. Create a Territory object and required deal field, validate bad input, qualify a lead, link stakeholders, save a filtered view, bulk-change selected records with one denied item, then archive a field and inspect history/export.

**Evidence.** `src/core/features/records/typed-fields.ts`; `src/core/features/records/typed-field-history.ts`; `src/core/features/operator/ui/typed-field-settings.tsx`; `src/core/features/operator/ui/typed-field-history.tsx`; `tests/core/records-complete.test.ts`; `tests/support/typed-fields-proof.ts`; `newtests/t096/forms-native.test.ts`; `tests/delegation-browser/records-layout.test.ts`; `tests/delegation-browser/typed-fields-journey.mjs`
**Gap.** Owner-defined text, number, date and picklist fields on contacts, companies and deals retain required/unique validation, affected-record preview and read-only archived values. Settings now reads immutable definition revisions with their original labels, types, choices, required/unique and archived state; paged native HTTP reads and fresh-session reads after local archive restore preserve that meaning. This is definition history, not a claim of per-record value history. Custom objects and explicit relationships/layouts, lead qualification/conversion preserving source, activities and consent, saved filtered lists with column choice and sorting, reviewed bulk field edits with individual failures, and field-value history naming the user/import/capture/API source remain gaps. Workflow-change approval and workflow/version history inherit AUTO-002. Future lead/custom-object intake retains FORM-001 notification, consent, abuse, export and erasure duties, with no custom-object intake carve-out.

#### RECORD-015 — Deal stakeholders and buying context

Core · target · **partial** · Cites BASE-INPUT-001, BASE-ROLE-001, BASE-INPUT-003, BASE-DATA-003, BASE-INPUT-003

**Requirement.** A deal records multiple contacts with roles such as champion, decision-maker, evaluator and procurement, company relationships, products, next step and mutual commitments. A person can represent more than one company via explicit relationship records while retaining an exact identity and a primary company. Sales users can distinguish a missing stakeholder from an inferred role; no inferred identity or relationship grants contact permission.

**Acceptance.**
1. Associate champion and evaluator with a USD deal, add a verified decision-maker and a second-company relationship, move the primary association and inspect the preserved customer history and authorization.

**Evidence.** `src/core/features/relationships/`; `src/core/features/operator/ui/buying-context.tsx`; `tests/core/records-search.test.ts`; `tests/evidence/contract/RECORD-015/`
**Gap.** Unasserted in the carried evidence: champion association; evaluator association; verified decision-maker; second-company relationship; primary association move; history preserved; authorization preserved. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

#### RECORD-016 — Owners for contacts, leads, companies and custom objects

Core · target · **partial** · Cites BASE-INPUT-001, BASE-ROLE-001, BASE-INPUT-003, BASE-DATA-003, BASE-INPUT-003

**Requirement.** Every contact, lead (RECORD-014), company and custom-object record holds zero or one owner, an active user, independent of the owners of its deals (RECORD-007). A new record is unassigned unless an assignment rule below, an import mapping, FORM-001, CAPTURE-012 or an AUTO-001 workflow sets its owner. Automatic rules fill only an empty owner and never overwrite an existing one, except the explicit always-sync company rule. Assigning. A permitted user assigns, reassigns or unassigns the owner on the record page. From any list, search result or saved view (RECORD-014) they can bulk-assign selected records through one review that shows each record's current and new owner and lists individual failures: no permission, an inactive target user, or a record changed since review. Each change appends one timeline entry with the previous owner, new owner, actor (user, import, workflow or rule) and time. A bulk action is one audited batch and can be undone for the records nobody has changed since. Owners and their history are exported and restored under DATA-003 and returned by API-001.

**Acceptance.**
1. Bulk-reassign 20 contacts with one denied item and see 19 changes, one listed failure and 19 timeline entries.
2. Assign, reassign and unassign each record type; one timeline entry holds previous owner, new owner, actor and time; undo only records unchanged since the audited batch.

**Evidence.** `src/core/features/ownership/`; `migrations/core/0054_record_ownership.sql`; `tests/core/records-search.test.ts`; `tests/support/record-ownership.ts`; `newtests/t096/forward-upgrade.test.ts`; `newtests/t096/ownership-upgrade.ts`; `newtests/t096/browser-ownership.ts`; `docs/retained-verification/RECORD-016/`
**Gap.** Contact/company record-page and list/search bulk assignment, attributed history, per-item refusals, guarded undo and grouped native in-app notices ship. Full operators retain existing workspace access; collaborators receive no new ownership mutation authority or content-bearing assignment notice. CSV owner mapping, My/Unassigned default views, owner grouping and report/dashboard filters, company/first-email assignment rules, deal assignment notices and removal handover remain gaps. Leads/custom objects inherit RECORD-014; restricted sellers inherit TEAM-005 and owners never grant access; email/push/Slack delivery inherits NOTIFY-003; connected-mailbox writes inherit OUT-013/CAPTURE-010/CAPTURE-012, workflows AUTO-001 and public responses API-001. Import-provider mappings remain MIGRATE-001/002/003.

#### RECORD-019 — Owner mapping on import and migration

Core · target · **partial** · From RECORD-016 · Cites BASE-INPUT-001, BASE-ROLE-001, BASE-INPUT-003, BASE-DATA-003, BASE-INPUT-003

**Requirement.** Import and migration. RECORD-008 CSV mapping accepts contact-owner and company-owner columns. They are matched to Orbit users by exact email or by an explicit owner mapping table in the saved dry run. Unmatched owner values are listed with their row counts and leave records unassigned unless mapped; the importer is never silently made the owner. Each guided migration maps its own owners under the same review: MIGRATE-001: HubSpot Contact owner, Company owner and custom-object owners; MIGRATE-002: Pipedrive person and organization owners; MIGRATE-003: Salesforce Lead, Account and Contact `OwnerId`, with queue-owned records mapped explicitly to a team queue or left unassigned. Undo restores the prior owners.

**Acceptance.**
1. Import HubSpot contacts and companies with Contact owner and Company owner columns, one owner value unmatched; map it in the dry run, apply, and see each record's owner and attributed import entry.
2. Map HubSpot custom-object owners, Pipedrive people and organizations, and Salesforce Lead, Account and Contact owners; explicitly map queue ownership or leave it unassigned, list unmatched values with counts, and restore prior owners on undo.

**Evidence.** `src/core/features/ownership/`; `migrations/core/0054_record_ownership.sql`; `tests/core/records-search.test.ts`; `tests/support/record-ownership.ts`; `newtests/t096/forward-upgrade.test.ts`; `newtests/t096/ownership-upgrade.ts`; `newtests/t096/browser-ownership.ts`; `docs/retained-verification/RECORD-016/`
**Gap.** Contact/company record-page and list/search bulk assignment, attributed history, per-item refusals, guarded undo and grouped native in-app notices ship. Full operators retain existing workspace access; collaborators receive no new ownership mutation authority or content-bearing assignment notice. CSV owner mapping, My/Unassigned default views, owner grouping and report/dashboard filters, company/first-email assignment rules, deal assignment notices and removal handover remain gaps. Leads/custom objects inherit RECORD-014; restricted sellers inherit TEAM-005 and owners never grant access; email/push/Slack delivery inherits NOTIFY-003; connected-mailbox writes inherit OUT-013/CAPTURE-010/CAPTURE-012, workflows AUTO-001 and public responses API-001. Import-provider mappings remain MIGRATE-001/002/003.

#### RECORD-020 — Automatic record-owner rules

Core · target · **partial** · From RECORD-016 · Cites BASE-INPUT-001, BASE-ROLE-001, BASE-INPUT-003, BASE-DATA-003, BASE-INPUT-003

**Requirement.** Assignment rules. An administrator may enable two optional rules. Each shows a preview of the affected records before it applies. Company-to-contact owner: when a company's owner changes or a contact is associated with that company as primary, unowned contacts take the company owner. The always-sync setting instead keeps every primary contact's owner equal to the company owner. First one-to-one email: an unowned contact becomes owned by the user who first sends them a one-to-one email from Orbit (OUT-017, OUT-013), or whose connected mailbox (CAPTURE-010) exchanges a one-to-one email with them. Automated and bulk mail excluded under CAPTURE-012 never sets an owner. Each rule-made change names the rule on the timeline.

**Acceptance.**
1. Enable the company-to-contact rule, preview it, change a company owner and see only its unowned contacts take that owner.
2. Enable the first-email rule, send a first email to an unowned lead and see the sender become its owner.
3. Preview always-sync company ownership, verify primary-contact ownership follows it, and exclude automated and bulk mail from first-email ownership; every rule change names the rule in the timeline.

**Evidence.** `src/core/features/ownership/`; `migrations/core/0054_record_ownership.sql`; `tests/core/records-search.test.ts`; `tests/support/record-ownership.ts`; `newtests/t096/forward-upgrade.test.ts`; `newtests/t096/ownership-upgrade.ts`; `newtests/t096/browser-ownership.ts`; `docs/retained-verification/RECORD-016/`
**Gap.** Contact/company record-page and list/search bulk assignment, attributed history, per-item refusals, guarded undo and grouped native in-app notices ship. Full operators retain existing workspace access; collaborators receive no new ownership mutation authority or content-bearing assignment notice. CSV owner mapping, My/Unassigned default views, owner grouping and report/dashboard filters, company/first-email assignment rules, deal assignment notices and removal handover remain gaps. Leads/custom objects inherit RECORD-014; restricted sellers inherit TEAM-005 and owners never grant access; email/push/Slack delivery inherits NOTIFY-003; connected-mailbox writes inherit OUT-013/CAPTURE-010/CAPTURE-012, workflows AUTO-001 and public responses API-001. Import-provider mappings remain MIGRATE-001/002/003.

#### RECORD-021 — Assignment notifications

Core · target · **partial** · From RECORD-016 · Cites BASE-INPUT-001, BASE-ROLE-001, BASE-INPUT-003, BASE-DATA-003, BASE-INPUT-003

**Requirement.** Assignment notifications. When a deal (RECORD-007), contact, lead, company, custom-object record or task (TASK-001) is assigned to a user by someone or something other than that user (another user, an import, a rule, FORM-001 or an AUTO-001 workflow), the new owner receives one in-app notification (NOTIFY-001, NOTIFY-002) naming the record, the previous owner and who or what assigned it, plus email, push or Slack under NOTIFY-003 by their preference. A bulk assignment, import or migration sends each receiving user one notification listing their records, not one per record. Assigning a record to yourself notifies no one, and a replayed or undone change sends nothing new. NOTIFY-003 inherits personal Slack assignment DMs under INTEGRATE-009: only the explicitly mapped, opted-in new owner with current access, one notice per bulk batch, none on replay or undo.

**Acceptance.**
1. NOTIFY-003 inherits personal Slack assignment DMs under INTEGRATE-005: only the explicitly mapped, opted-in new owner with current access, one notice per bulk batch, none on replay or undo.
2. Assignment never grants access.
3. Assign a company to another rep and receive one notice naming the record, previous owner and assigner; bulk-assign 20 contacts and receive one batch notice per receiving user.
4. Self-assignment, replay and undo produce no new notice; personal channels follow the receiving user’s preference.

**Evidence.** `src/core/features/ownership/`; `migrations/core/0054_record_ownership.sql`; `tests/core/records-search.test.ts`; `tests/support/record-ownership.ts`; `newtests/t096/forward-upgrade.test.ts`; `newtests/t096/ownership-upgrade.ts`; `newtests/t096/browser-ownership.ts`; `docs/retained-verification/RECORD-016/`
**Gap.** Contact/company record-page and list/search bulk assignment, attributed history, per-item refusals, guarded undo and grouped native in-app notices ship. Full operators retain existing workspace access; collaborators receive no new ownership mutation authority or content-bearing assignment notice. CSV owner mapping, My/Unassigned default views, owner grouping and report/dashboard filters, company/first-email assignment rules, deal assignment notices and removal handover remain gaps. Leads/custom objects inherit RECORD-014; restricted sellers inherit TEAM-005 and owners never grant access; email/push/Slack delivery inherits NOTIFY-003; connected-mailbox writes inherit OUT-013/CAPTURE-010/CAPTURE-012, workflows AUTO-001 and public responses API-001. Import-provider mappings remain MIGRATE-001/002/003.

#### RECORD-022 — Owner views, grouping and removal

Core · target · **partial** · From RECORD-016 · Cites BASE-INPUT-001, BASE-ROLE-001, BASE-INPUT-003, BASE-DATA-003, BASE-INPUT-003

**Requirement.** Views and use. Contacts, Leads and Companies open by default on "My contacts", "My leads" and "My companies". Every list, search (RECORD-006), saved view and report (REPORT-001) filters and groups by these owners and offers "Unassigned". They are the owners that the rest of the contract relies on: TEAM-005 keys assigned-record access to them; TEAM-004 hands them over on removal; AUTO-001's account owner is the company owner; FORM-001 keeps an existing contact owner; CAPTURE-012 makes the mailbox owner the contact owner; NOTIFY-001 and OUT-017 notify the contact owner of a reply to a deal-less message. RECORD-022 inherits REPORT-001's owner grouping: every REPORT-001 measure whose rows name contacts, leads, companies or custom-object records can group by those records' owners, with "Unassigned", under the viewer's access, and each owner group drills through to exactly the records it counts. Before those owners ship, RECORD-016 carries REPORT-002's Owner filter for contact, lead, company and custom-object owners, including Unassigned, under the viewer's current record and field access. Where those owners are unavailable, the dashboard Owner filter applies to deal owners, activity authors and task assignees; bookings disclose that the Owner filter is not applied.

**Acceptance.**
1. Contacts, Leads and Companies open on My records; lists, search, saved views and reports filter and group by each record type’s owner and Unassigned.
2. A seller restricted to owned records sees only their own contacts and companies through lists, search, API and export; reassignment changes the next read.
3. Remove a rep and explicitly hand over owned contacts and companies; report groups drill to exactly their counted permitted records, and dashboard Owner filters include every record type and Unassigned.

**Evidence.** `src/core/features/ownership/`; `migrations/core/0054_record_ownership.sql`; `tests/core/records-search.test.ts`; `tests/support/record-ownership.ts`; `newtests/t096/forward-upgrade.test.ts`; `newtests/t096/ownership-upgrade.ts`; `newtests/t096/browser-ownership.ts`; `docs/retained-verification/RECORD-016/`
**Gap.** Contact/company record-page and list/search bulk assignment, attributed history, per-item refusals, guarded undo and grouped native in-app notices ship. Full operators retain existing workspace access; collaborators receive no new ownership mutation authority or content-bearing assignment notice. CSV owner mapping, My/Unassigned default views, owner grouping and report/dashboard filters, company/first-email assignment rules, deal assignment notices and removal handover remain gaps. Leads/custom objects inherit RECORD-014; restricted sellers inherit TEAM-005 and owners never grant access; email/push/Slack delivery inherits NOTIFY-003; connected-mailbox writes inherit OUT-013/CAPTURE-010/CAPTURE-012, workflows AUTO-001 and public responses API-001. Import-provider mappings remain MIGRATE-001/002/003.

#### RECORD-017 — Mentions in notes and activities

Core · target · **done** · Cites BASE-INPUT-001, BASE-ROLE-001, BASE-INPUT-003, BASE-DATA-003, BASE-INPUT-003

**Requirement.** In a note, a logged call or meeting (RECORD-010), a task note (TASK-001) or an internal handoff, a user can @mention a colleague. Autocomplete offers only active users. Team mentions and per-entry private audiences are TEAM-007. Mentioning someone who cannot see the record under TEAM-005 asks the author either to share the record with them explicitly or to remove the mention; a mention never grants access by itself. Each mentioned user receives one in-app notification (NOTIFY-001, NOTIFY-002) naming the author and record and linking to the exact entry, plus email, push or Slack under NOTIFY-003 by their preference. Editing an entry notifies only newly added mentions. Deleting the entry withdraws that entry's unread mention notifications and leaves an attributed timeline record of the deletion. A "Mentions" view lists every entry that mentions the user. Mentions are internal: they are never sent to a customer, never included in an AI request unless the preview shows them (AI-001), and they are exported with the entry and erased with it (DATA-002).

**Acceptance.**
1. On a deal, a rep writes a note mentioning their manager and a call log mentioning a colleague without access to the deal.
2. The manager receives one notification linking to the note.
3. Before saving, the author is asked to share the deal or remove the second mention; they share it explicitly, and only then is the colleague notified.
4. Edit the note to add a third user; only that user is notified.
5. Delete the call log, and the colleague's unread mention notification is withdrawn. Verify that no access was granted without the explicit share and that no customer message or score changed.

**Evidence.** `src/core/features/records/mentions.ts`; `src/core/features/records/manual.ts`; `src/core/features/access/grant-entries.ts`; `src/core/features/notifications/collaborator.ts`; `src/core/features/records/shared-entries.ts`; `src/core/features/access/shared-entries.tsx`; `src/core/features/operator/ui/mention-field.tsx`; `tests/core/today-brief.test.ts`; `tests/evidence/contract/RECORD-017/`
**Gap.** None.

#### RECORD-023 — Collaborator entry grants and mention access

Core · target · **partial** · From RECORD-017 · Cites BASE-INPUT-001, BASE-ROLE-001, BASE-INPUT-003, BASE-DATA-003, BASE-INPUT-003

**Requirement.** A collaborator can read a record’s notes, logged calls, meetings, task notes and handoffs only through its live Include notes, calls and meetings grant, initially off. Whoever shares changes the option explicitly; the installation owner acts for the administrator until team roles ship. Grant creation and option changes record actor and old/new value. Saving a mention of someone without that access names the person and asks the author to share explicitly, enable the option or remove the mention. The read-only Shared records view opens the exact entry and never another record’s entries. The collaborator’s notification inbox and Mentions view contain only their own currently permitted mentions and unread count. Revocation or expiry hides them without deleting them; a new grant reveals them again.

**Acceptance.**
1. A collaborator mentioned after the record is shared including notes, calls and meetings opens the exact entry from their own notifications at 1440 and 390; with that option off, saving asks first; revoke the grant to hide the notification, and grant again to show it.
2. Grant creation and each change to Include notes, calls and meetings are audited with actor and old/new value; a mention never grants access or turns the option on.
3. A collaborator reads only their own currently accessible mention notices and unread count, never another operator’s notifications or counts.

**Evidence.** `src/core/features/records/mentions.ts`; `src/core/features/records/manual.ts`; `src/core/features/access/grant-entries.ts`; `src/core/features/notifications/collaborator.ts`; `src/core/features/records/shared-entries.ts`; `src/core/features/access/shared-entries.tsx`; `src/core/features/operator/ui/mention-field.tsx`; `tests/core/today-brief.test.ts`; `tests/evidence/contract/RECORD-017/`
**Gap.** Unasserted in the carried evidence: browser proof at 1440; browser proof at 390. Asserted: own notification opens exact Shared entry; entries-off save asks first; revocation hides notice; fresh grant reveals notice; grant creation actor and initial option; option change actor and old/new values; mention does not grant access; mention does not turn option on; only own notifications and unread count; other operators have excluded notices; cannot read another record’s entries.

#### RECORD-024 — Mention delivery through personal channels

Core · target · **missing** · From RECORD-017 · Cites BASE-INPUT-001, BASE-ROLE-001, BASE-INPUT-003, BASE-DATA-003, BASE-INPUT-003

**Requirement.** Its NOTIFY-003 inheritance adopts INTEGRATE-005’s Slack rules: no entry text enters Slack, private entries get a generic notice and exact authenticated entry link, and an undelivered mention is withdrawn on deletion. Slack acknowledgment never accepts an application-proposed handoff.

**Acceptance.**
1. Its NOTIFY-003 inheritance adopts INTEGRATE-005’s Slack rules: no entry text enters Slack, private entries get a generic notice and exact authenticated entry link, and an undelivered mention is withdrawn on deletion.
2. Slack acknowledgment never accepts an application-proposed handoff.
3. Deliver personal email, push and Slack mentions under the receiving user’s preference; no entry text enters Slack, private entries have generic notices, and deletion withdraws an undelivered mention.

**Evidence.** `src/core/features/records/mentions.ts`; `src/core/features/records/manual.ts`; `src/core/features/access/grant-entries.ts`; `src/core/features/notifications/collaborator.ts`; `src/core/features/records/shared-entries.ts`; `src/core/features/access/shared-entries.tsx`; `src/core/features/operator/ui/mention-field.tsx`; `tests/core/today-brief.test.ts`; `tests/evidence/contract/RECORD-017/`
**Gap.** Unasserted in the carried evidence: personal email mentions; personal push mentions; opted-in Slack mentions; private-entry generic notice; undelivered mention withdrawn on source deletion. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

#### RECORD-018 — Files and versions on records and activities

Core · target · **missing** · Cites BASE-INPUT-001, BASE-ROLE-001, BASE-INPUT-003, BASE-DATA-003, BASE-INPUT-003

**Requirement.** Files on records and activities. A user with edit permission on a record (TEAM-005) attaches files to a contact, lead, company, deal or custom-object record (RECORD-014), and to a note, logged call or meeting (RECORD-010) or a task (TASK-001). Files are added by picker or drag and drop on desktop, and from the phone's files or camera on 390px web and the native apps (MOBILE-001). Each record has a Files list that includes the files on its activities and mail. For each file it shows the name, type, size, uploader or source (a user, a captured message, an Orbit send or a migration), the time and the activity it belongs to. File names are searchable (RECORD-006). Uploading a file with the same name to the same record adds a new version and keeps the earlier ones downloadable; OUT-014 records which version was sent. Limits. A file may be up to 100 MB by default, and an administrator can lower the limit. Allowed types are documents (PDF, Word, Excel, PowerPoint, OpenDocument, plain text and CSV), images and ZIP archives, and an administrator can narrow the list. An over-size or disallowed file, including executables and scripts, is refused with a visible reason naming the limit or the type, and nothing is stored. Files are stored in the installation's own Cloudflare R2 bucket, and Settings shows the workspace's stored bytes and their USD cost (OPS-001).

**Acceptance.**
1. Upload a PDF to a deal and a file to a logged call; see both on the deal's Files list with name, type, size, uploader and time; upload a new version of the PDF; and see an executable and a 150 MB file refused with the reason.

**Evidence.** None.
**Gap.** No implementation found. There is no file storage, upload route or Files list on any record or activity, and `src/core/features/capture/mime.ts` skips every `Content-Disposition: attachment` part when parsing captured mail, so captured attachments are dropped; migration presets carry no files.

#### RECORD-025 — File access, previews and deletion

Core · target · **missing** · From RECORD-018 · Cites BASE-INPUT-001, BASE-ROLE-001, BASE-INPUT-003, BASE-DATA-003, BASE-INPUT-003

**Requirement.** Access. Every download and preview checks, at that request, the viewer's current TEAM-005 access to a record the file is on. A file on a record the user cannot see is refused, and a field-level grant on a sensitive deal can withhold its files while the record stays visible. Download links expire within 5 minutes and are served as downloads, never rendered as active content on the installation origin; PDF and image previews are rendered sandboxed. Downloads are recorded in the audit trail. Deletion. A user with edit permission on the record can delete a file or one of its versions. The timeline records the deletion with the file name, the user and the time, and the bytes are removed from storage within 5 minutes. Deleting a note, call or meeting deletes its files the same way.

**Acceptance.**
1. As a restricted rep, be refused a direct download of a file on a deal you cannot see.
2. Delete a file and see the attributed timeline entry.
3. Download and preview a sensitive record with its file field withheld; enforce the current grant, short-lived link and sandboxed preview.
4. Delete a version and an activity; remove its owned bytes within the erasure bound while retaining the attributed timeline.

**Evidence.** None.
**Gap.** No implementation found. There is no file storage, upload route or Files list on any record or activity, and `src/core/features/capture/mime.ts` skips every `Content-Disposition: attachment` part when parsing captured mail, so captured attachments are dropped; migration presets carry no files.

#### RECORD-026 — Captured and sent mail attachments

Core · target · **missing** · From RECORD-018 · Cites BASE-INPUT-001, BASE-ROLE-001, BASE-INPUT-003, BASE-DATA-003, BASE-INPUT-003

**Requirement.** Attachments on mail. Captured mail (CAPTURE-001 files, the CAPTURE-008 Orbit address and CAPTURE-010 connected mailboxes) keeps each non-inline attachment as a file of that message: a part with an attachment disposition, or a named part the body does not reference by an inline content-id. It opens from the message's timeline entry and is listed on each linked contact, their company and the linked deal. Inline images the body references stay with the message body only and are not listed. A connected source fetches attachments from the provider (Gmail the Gmail attachment read, Microsoft Graph message attachments) only for messages it captures from its authorized folders. A replayed message stores no second copy (SIGNAL-003). An attachment over the size limit is listed by name, type and size as not stored, with the reason; it is never dropped silently. Held evidence (SIGNAL-004, CAPTURE-012) keeps its attachments sealed with it and purges them with it. Mail sent from Orbit (OUT-013, OUT-014, OUT-017) lists its sent attachments, at the version sent, on the same records where the message lands. A file from a message is visible only to users who may see that message, and OUT-028's BCC limits apply. Before template attachments ship, RECORD-018 must also satisfy OUT-014: authorized/versioned attachment selection, size/type limits, explicit access and size failures, exact attachment preview before approval, and a record of the precise version sent on the recipients' records. Its acceptance sends an authorized attachment and refuses a forbidden one.

**Acceptance.**
1. Receive a captured Gmail reply with a signed PDF attachment and an inline logo: see the PDF on the contact, company and deal and open it from the timeline entry, with the logo not listed.
2. Select a permitted attachment version, inspect its exact preview and send it; refuse forbidden or oversized selection and record the precise sent version on recipient records.

**Evidence.** None.
**Gap.** No implementation found. There is no file storage, upload route or Files list on any record or activity, and `src/core/features/capture/mime.ts` skips every `Content-Disposition: attachment` part when parsing captured mail, so captured attachments are dropped; migration presets carry no files.

#### RECORD-027 — File migration and portable bytes

Core · target · **missing** · From RECORD-018 · Cites BASE-INPUT-001, BASE-ROLE-001, BASE-INPUT-003, BASE-DATA-003, BASE-INPUT-003

**Requirement.** Migration, data and API. MIGRATE-001, MIGRATE-002 and MIGRATE-003 bring record and activity attachments across with their associations: HubSpot record, note, call, meeting and email attachments; Pipedrive files on deals, people, organizations, notes and activities; and Salesforce Files (`ContentDocument`, `ContentVersion` and `ContentDocumentLink`) and legacy `Attachment` records. The dry run reconciles file counts and bytes per record type, and lists any file the provider will not export with a concrete export step and its source reference. Undo removes only unchanged imported files. Files and their versions travel in DATA-001 and DATA-003 export and restore with SHA-256 digests, so a restore yields identical bytes. Erasing a contact (DATA-002) erases, within 5 minutes, the files uploaded to their record and the attachments of mail they sent or received, wherever those are listed. A file a user uploaded to a company, deal, note, call or meeting stays with that record. API-001 lists, uploads, downloads and deletes files under the same permissions and limits, and its webhooks report files added and deleted. A file's contents are never sent to an AI provider unless the AI-001 preview shows that file.

**Acceptance.**
1. Migrate a HubSpot deal with two record attachments and a note attachment, and reconcile file counts and bytes in the dry run and after applying.
2. Export and restore, and compare every file's bytes by SHA-256.
3. Erase the contact: their mail attachments are gone from the deal, while the user-uploaded PDF stays.
4. List, upload, download and delete files through the public API; observe files-added/deleted webhooks and keep AI file content inside the exact preview.

**Evidence.** None.
**Gap.** No implementation found. There is no file storage, upload route or Files list on any record or activity, and `src/core/features/capture/mime.ts` skips every `Content-Disposition: attachment` part when parsing captured mail, so captured attachments are dropped; migration presets carry no files.

#### MIGRATE-001 — HubSpot Sales Hub migration

Core · target · **partial** · Cites BASE-DATA-001, BASE-INPUT-001 · Rules D-1

**Requirement.** Connect HubSpot with least-privilege authorization and start one guided migration covering contacts/leads, companies, deals, pipelines/stages, owners (Contact owner, Company owner and deal owner, each kept separate under RECORD-016 and RECORD-007), custom fields, notes, tasks, calls, meetings, email activity, record and activity attachments (RECORD-018) and associations. A saved dry run reconciles source totals, file counts and bytes, mappings, unsupported or unavailable fields, duplicates and consent. Source owners are mapped to explicitly chosen Orbit users without invitations. Resume checkpoints, stable source IDs, rerun reconciliation and conflict-preserving undo carry RECORD-008 safeguards. Provider permission or export restrictions name exactly what the buyer must export; they never silently drop history. HubSpot workflows are listed with each "Edit record" and create action named as mapped to an AUTO-002 action, needing approval under AUTO-002, or having no Orbit equivalent; none is activated without an administrator's preview.

**Acceptance.**
1. From Import choose HubSpot, authorize a test account and preview a multi-company export/API pull including activities, associations, separate Contact, Company and deal owners, and a deal with two record attachments and a note attachment; apply, interrupt/resume and rerun; compare source totals and file counts and bytes, inspect a deal workflow's actions listed against AUTO-002, and undo around native edits.
2. Final acceptance includes a real authorized customer export.

**Evidence.** `src/core/features/imports/contracts.ts`; `tests/core/crm-import.test.ts`; `tests/e2e/imports.spec.mjs`
**Gap.** Reviewed HubSpot CSV presets cover core records/deals/prepared notes; connected migration and full activity/owner/pipeline and attachment coverage are missing.

#### MIGRATE-002 — Pipedrive migration

Core · target · **partial** · Cites BASE-DATA-001, BASE-INPUT-001 · Rules D-1

**Requirement.** One guided Pipedrive connection migrates people, organizations, leads, deals, multiple pipelines/stages, products, owners (person, organization and deal owners, kept separate under RECORD-016 and RECORD-007), custom fields, notes, tasks, calls, meetings, mail activity, files on deals, people, organizations, notes and activities (RECORD-018) and linked associations using the saved review, consent, idempotency, source-count reconciliation and safe undo rules of MIGRATE-001. An unavailable provider field or file must be listed with a concrete export step and retained source reference. Pipedrive automations' update and create actions are listed against AUTO-002 as in MIGRATE-001.

**Acceptance.**
1. Choose Pipedrive, connect an authorized account containing two pipelines, cross-linked activities and deal files, preview/apply, resume a rate-limited page and rerun; reconcile every exported entity and association, then undo without losing a native note.
2. Include a real authorized export.

**Evidence.** `src/core/features/imports/contracts.ts`; `tests/core/crm-import.test.ts`
**Gap.** Pipedrive core CSV presets exist; complete connected migration, products, activity history and files remain missing.

#### MIGRATE-003 — Salesforce Sales Cloud migration

Core · target · **missing** · Cites BASE-DATA-001, BASE-INPUT-001 · Rules D-1

**Requirement.** A guided Salesforce OAuth migration maps Leads and conversions, Accounts, Contacts, Opportunities, record types, stages, users, custom fields/objects, products, Notes, Tasks, Events, EmailMessage history, Files (`ContentDocument`, `ContentVersion` and `ContentDocumentLink`) and legacy Attachments (RECORD-018) and associations into the reviewed Orbit model. It previews mapping choices, owner/role translation (Lead, Account, Contact and Opportunity `OwnerId` mapped separately under RECORD-016 and RECORD-007), field permissions and unsupported metadata, preserves original IDs and source currency, and uses incremental checkpoints, repeat-safe application, reconciliation and safe undo. Orbit does not claim to execute Salesforce Apex or rebuild the buyer's Salesforce apps; Flow, Process Builder and workflow-rule field updates and record creations are listed against AUTO-002 actions as in MIGRATE-001, and other unresolved automation is listed for explicit Orbit workflow mapping.

**Acceptance.**
1. Connect a Salesforce sandbox with converted leads, two record types, linked activity/custom-object data and Files on an Opportunity; dry-run, map, apply, interrupt/resume and rerun, reconcile record/association totals and file counts and bytes, and demonstrate conflict-preserving undo.
2. Repeat with an authorized real export.

**Evidence.** None.
**Gap.** No implementation found. No implementation of this complete target flow was found.

### Connected selling, follow-up and automation

#### CAPTURE-010 — Continuous authorized mail and calendar reads

Core · target · **partial** · Cites BASE-INPUT-001, BASE-DATA-004, BASE-SECRET-001, BASE-DATA-001, BASE-DATA-003 · Rules D-1, D-2 · Register R-1, R-2

**Requirement.** Connect Gmail/Google Workspace and Microsoft 365/Outlook by OAuth, select mail folders/labels, calendars and history window, and continuously capture past and future authorized activity with durable cursors, refresh, replay protection and visible lag. Threads and calendar occurrences link automatically only by exact contact/deal or trusted message identity; ambiguous multi-deal mail is held for review by default. An administrator may instead choose a workspace rule for mail with a contact who is on several open deals: associate it with that contact's most recently active open deal, or with all of that contact's open deals. Each automatic association names the rule on the timeline entry and can be moved to another deal or removed in one action, and mail to a contact with no open deal attaches to the contact and company only (OUT-017). An unknown external participant becomes a CAPTURE-012 new-prospect proposal rather than being dropped, and a contact created later with that exact address receives its synced history. Attachments of captured messages are fetched and kept under RECORD-018. Raw permission and privacy boundaries of CAPTURE-002 through CAPTURE-007 remain. Provider app registration, Google verification and Microsoft tenant/admin consent are delivery work with actionable setup states, not reasons to substitute files for live sync.

**Acceptance.**
1. Connect each provider through Capture, import historical and new Inbox/Sent/calendar items, crash/resume an incremental page, resolve ambiguous deal links, switch the multi-deal rule to most recently active open deal and see the next such thread associated automatically with the rule named and then moved in one action, see an unknown correspondent become a CAPTURE-012 proposal, see a captured reply's PDF attachment listed on its contact, company and deal with its inline image not listed, revoke/reconnect and verify no unauthorized folder/mailbox is read.

**Evidence.** `src/core/features/capture/providers/`; `src/core/features/capture/mail-association.ts`; `src/core/features/capture/mail-rule.ts`; `src/core/features/capture/deal-links.ts`; `migrations/core/0057_capture_mail_rule.sql`; `tests/core/capture-mail-rules.test.ts`; `tests/core/capture-providers.test.ts`; `tests/support/capture-rule-custody.ts`; `newtests/t096/forward-upgrade.test.ts`; `newtests/t096/browser-capture-rule.ts`; `docs/retained-verification/CAPTURE-010/`; `newtests/t096/browser-journeys.test.ts`
**Gap.** Durable provider reads retain their selected-scope and OAuth safeguards. The owner chooses held review (default), most recently active open deal or all open deals for exact-contact connected mail; trusted message identity retains priority. Automatic evidence names its rule, and one reviewed action moves or removes deal links without rewriting the original. No-open-deal mail links only the contact and primary company. Reviewed corrections permit any deal the current full operator may view and change, including closed deals and deals unrelated to the captured contact; the original contact and company history remain. TEAM-005 retains real administrator and restricted-record policy; current full operators retain existing workspace access and collaborators gain no capture door. Live Gmail and Microsoft acceptance requires the owner's authorized journey and remains unmeasured; attachments inherit RECORD-018, unknown-participant proposals CAPTURE-012, and the fixed calendar window still needs explicit extension. Implemented first slice: the installation owner acts as administrator until TEAM-005 supplies sales roles. An open deal's activity is the latest recorded source or operator timeline entry, or its creation time when no later entry exists; ties use deal identity order. Active full operators may move captured mail to any currently accessible, changeable deal or remove its deal links. A fingerprint binds the reviewed association, correction history and offered deal revisions; stale reviews return 409, unavailable targets return 403, and collaborators or restricted roles are refused. Replay repeats no mutation or audit.

#### CAPTURE-011 — Two-way calendar and CRM activity

Core · target · **partial** · Cites BASE-INPUT-001, BASE-DATA-004, BASE-SECRET-001, BASE-DATA-001, BASE-DATA-003 · Rules D-1, D-2 · Register R-1, R-2

**Requirement.** Authorized reps create, reschedule and cancel record-linked meetings from Orbit into Google Calendar or Outlook, and provider-side changes update the same activity and attendees. Explicit calendar/write consent is separate from read access. Recurring exceptions, US daylight-saving changes, organizer rights, attendee privacy, conflict handling and replay are visible. A stale edit requires a fresh review; a cancellation never cancels unrelated occurrences. External invitations require the rep to review exact attendees and message before dispatch.

**Acceptance.**
1. For both calendars create an approved meeting in Orbit, verify it in the provider, reschedule it there and read it back, edit concurrently, cancel one recurring occurrence and reconnect after revocation without duplicate invitations.

**Evidence.** `src/core/features/capture/providers/writeback.ts`; `src/core/features/capture/providers/writeback-reconcile.ts`; `tests/core/capture-providers.test.ts`; `tests/support/calendar-writeback.ts`; `tests/delegation-browser/records-layout.test.ts`
**Gap.** Implemented first slice: separate opt-in OAuth write consent requests Google `calendar.events` or Microsoft `Calendars.ReadWrite`; exact saved attendees, message and times are reviewed before one create, reschedule or cancellation attempt. Provider revisions and source/customer authority fence writes; provider edits become conflicts for fresh review, ambiguous outcomes remain held, and cancelling one written occurrence leaves the other intact. Activities retain one entry per written meeting. Google and Microsoft consent screens show the requested read scopes and add write scope only after separate opt-in, at 1440 and 390; their native form submissions request those exact scopes. Read-only tokens contain no write scope, unsolicited write grants are refused, and read-only consent cannot authorize writeback. Invitation review and conflict screens are exercised at 1440 and 390. Writeback currently changes single meetings created by Orbit; provider-captured meeting editing, recurring-series authoring and live-account proof remain gaps.

#### CAPTURE-012 — Unknown-participant proposal custody

Core · target · **partial** · Cites BASE-INPUT-001, BASE-DATA-004, BASE-SECRET-001, BASE-DATA-001, BASE-DATA-003 · Rules D-1, D-2 · Register R-10

**Requirement.** For a connected mailbox or calendar source (CAPTURE-010), a message or meeting whose external participant matches no contact or company key is not discarded. When that participant exchanged mail with an operator (the operator wrote to them, or they wrote to the operator) or attended a meeting with one, Orbit holds a new-prospect proposal showing the exact address, display name, domain, thread subjects, dates and message direction. Held mail stays sealed as held evidence in the SIGNAL-004 unlinked queue for 30 days, changes no record or score, and is purged if nobody accepts it. Automated, bulk and list senders (the opt-out URL header or `Precedence: bulk` mail, no-reply and mailer-daemon addresses, calendar notifications), operator and configured internal domains, and an administrator-maintained exclusion list never produce proposals.

**Acceptance.**
1. Through both connected providers, exchange outgoing/inbound unknown-participant mail and a meeting; inspect exact address, name, domain, thread subjects, dates, direction and source evidence without a record or score.
2. Exclude automated, bulk, list, no-reply, daemon, calendar-notification, internal-domain and administrator-excluded senders; expire sealed unaccepted evidence at 30 days.

**Evidence.** `src/core/features/capture/intake.ts`; `src/core/features/capture/routes.ts`; `src/core/features/capture/sources.ts`; `tests/core/today-brief.test.ts`
**Gap.** CAPTURE-012: connected unknown-participant proposals, explicit reviewed contactability basis, exclusion and retention enforcement, all named back-fill doors, replay and erasure, authorized Gmail and Microsoft proof, provider qualification and jurisdiction-specific legal qualification remain unproved. Same-thread mailbox sending remains OUT-013, record composition OUT-017, reply all OUT-019, expanded roles TEAM-005 and ownership behavior RECORD-016.

#### CAPTURE-013 — Prospect acceptance and history back-fill

Core · target · **partial** · From CAPTURE-012 · Cites BASE-INPUT-001, BASE-DATA-004, BASE-SECRET-001, BASE-DATA-001, BASE-DATA-003 · Rules D-1, D-2 · Register R-10

**Requirement.** The proposal offers a new contact with that exact email key, plus a new company from its domain unless the domain is free-mail (RECORD-003); a domain a company already holds links to that company. Nothing is guessed from a name or a lookalike domain. The mailbox owner, or a reviewer permitted under TEAM-005, accepts, edits or declines it. Accepting makes the mailbox owner the contact owner (RECORD-016) unless the reviewer chooses another. A decline is remembered by a keyed hash, so that source does not propose the same address again. Accepting the proposal, or creating a contact with that exact email through any other door (RECORD-001, RECORD-008, MIGRATE-001 to MIGRATE-003, FORM-001), back-fills that address's already-synced and provider-available history within the source's selected window onto the new contact, its company and any exactly linked deal. The back-fill runs once and creates no duplicate signal (SIGNAL-003). Contactability is the reviewer's explicit choice in the same review and is recorded with its basis: a person who wrote to the rep first is offered `contactable` with basis `inbound conversation` citing their message, and a person the rep emailed first is offered `contactable` with basis `rep-initiated conversation`. The reviewer can set do-not-contact instead, and an unsubscribe or stop request in the thread always wins. Right after acceptance the rep can reply, or reply all, from Orbit on the same thread (OUT-013, OUT-017, OUT-019); no deal is required.

**Acceptance.**
1. Verify proposals for the two people (none for the newsletter) with direction and evidence; accept the first with the `rep-initiated conversation` basis and see the full thread back-filled once on the new contact and company, then reply from Orbit on the same thread.
2. Decline the second and confirm it is not proposed again, then create a contact manually for a third earlier correspondent and see their history back-filled.
3. Repeat the inbound case through Microsoft 365.
4. Through every named create/import/migration/form door, create an exact-address contact and back-fill provider-available history once; an exact-key collision, denied reviewer or concurrent stop does not create guessed identity or permission.

**Evidence.** `src/core/features/capture/intake.ts`; `src/core/features/capture/routes.ts`; `src/core/features/capture/sources.ts`; `tests/core/today-brief.test.ts`
**Gap.** CAPTURE-012: connected unknown-participant proposals, explicit reviewed contactability basis, exclusion and retention enforcement, all named back-fill doors, replay and erasure, authorized Gmail and Microsoft proof, provider qualification and jurisdiction-specific legal qualification remain unproved. Same-thread mailbox sending remains OUT-013, record composition OUT-017, reply all OUT-019, expanded roles TEAM-005 and ownership behavior RECORD-016.

#### CAPTURE-014 — Prospect purpose, retention and suppression

Core · target · **partial** · From CAPTURE-012 · Cites BASE-INPUT-001, BASE-DATA-004, BASE-SECRET-001, BASE-DATA-001, BASE-DATA-003 · Rules D-1, D-2 · Register R-10

**Requirement.** an authorized connected source may retain unknown external participants only within its selected folders, calendars and time window, as sealed review evidence for 30 days from intake. Retention does not create a customer, score, sending permission or research authority. Use exact normalized email identity and exact non-free-mail company domain only; apply the clause’s automated, bulk, internal and administrator exclusions before proposing. The mailbox owner or currently permitted reviewer must explicitly accept or decline. Acceptance records the reviewer, time, source evidence, owner and chosen contactability basis. Inbound conversation and rep-initiated conversation are relationship provenance, not proof of marketing consent. A reviewer may permit relevant US business email after checking purpose and suppression; an unsubscribe or stop always wins. Telephone and automated outreach require separately recorded channel-specific authority under the applicable TCPA policy. Non-US contacts require a recorded purpose and lawful basis with GDPR-style objection, access and erasure handling; uncertain jurisdiction or basis leaves contactability blocked. Unaccepted evidence expires after 30 days; decline and erasure retain only necessary keyed suppression and replay proofs. Provider authorization and jurisdiction-specific legal qualification remain explicit gaps.

**Acceptance.**
1. Read explicit chosen contactability basis, reviewer, time, source evidence and owner; inbound or rep-initiated conversation never becomes marketing consent.
2. Unknown jurisdiction or lawful basis leaves contactability blocked; channel-specific telephone/automated authority is separately recorded, and an unsubscribe always wins.
3. Decline, erase and replay after archive restoration; retain only necessary keyed suppression/replay proofs with no revived source authority or expired sealed evidence.

**Evidence.** `src/core/features/capture/intake.ts`; `src/core/features/capture/routes.ts`; `src/core/features/capture/sources.ts`; `tests/core/today-brief.test.ts`
**Gap.** CAPTURE-012: connected unknown-participant proposals, explicit reviewed contactability basis, exclusion and retention enforcement, all named back-fill doors, replay and erasure, authorized Gmail and Microsoft proof, provider qualification and jurisdiction-specific legal qualification remain unproved. Same-thread mailbox sending remains OUT-013, record composition OUT-017, reply all OUT-019, expanded roles TEAM-005 and ownership behavior RECORD-016.

#### FORM-001 — Forms on the buyer’s website

Core · target · **partial** · Cites BASE-PUBLIC-001, BASE-PUBLIC-002, BASE-INPUT-001 · Rules D-1 · Register R-4, R-5

**Requirement.** Administrators build forms such as Contact sales and Request a demo, with fields mapped to contact, company and deal properties, including custom fields (RECORD-014). Fields can be required, picklist or free text, and hidden fields can carry a fixed value or a query parameter of the embedding page that the form declares. Each published form is reviewed as exact content before publication. It is available as a hosted page on the installation origin and as an embed on the buyer's allowlisted HTTPS site domains, either framed or posting directly from that origin. Neither form sets a cookie or loads a tracking script (SIGNAL-007), and a submission from any other origin is refused.

**Acceptance.**
1. Build a Contact sales form mapping name, email, company, phone and a custom deal-size field, publish it hosted and embedded on an allowlisted test HTTPS domain, and submit from that domain both framed and by direct post.
2. Required, picklist, text and declared fixed/query-derived fields map to contact, company, deal and custom properties; a publication is reviewed as exact content.

**Evidence.** `src/core/features/forms/`; `src/core/features/forms/field-values.ts`; `src/core/features/forms/embed-code.ts`; `migrations/core/0055_form_assignment.sql`; `src/core/features/capture/proposals.ts`; `newtests/t096/forms-native.test.ts`; `newtests/t096/forms-mapped-journey.ts`; `newtests/t096/forms-mapped-custody.ts`; `newtests/t096/browser-form-mapping.ts`; `docs/retained-verification/FORM-001/`
**Gap.** Implemented first slice: Reviewed fixed forms retain consent, atomic intake, honeypot, signed fill proof, per-form/network limits, optional Turnstile, counted refusals, erasable spam and exactly-once release. Allowlisted HTTPS direct posts use the same admission without cookies or tracking. Required and optional free-text and picklist fields map to contact/company/new-deal native and custom JSON properties; exact business domains link/create companies, chosen stages enter NOW, empty values fill and populated differences wait as CAPTURE-004 proposals. A picklist accepts only its reviewed choices. Hidden fields carry a fixed value from the reviewed definition or one declared query parameter, read from the hosted page address, copied from the embedding page by the generated framed embed or sent by a direct post; publication review lists them, and a saved definition change takes effect only after its new revision is compiled, reviewed and published. Forged choices, undeclared names and fixed-value overrides are refused as `invalid_fields` without a customer or proposal write. Existing contact owners remain; fixed, durable active-user round robin and unassigned rules record each choice and notify the selected full operator once per accepted submission. Team selection, team queues and team notifications inherit TEAM-005; explicit full-operator lists are used meanwhile. Lead/custom-object kinds inherit RECORD-014 and email/push delivery NOTIFY-003.

#### FORM-002 — Form abuse refusals and release

Core · target · **partial** · From FORM-001 · Cites BASE-PUBLIC-001, BASE-PUBLIC-002, BASE-INPUT-001 · Rules D-1

**Requirement.** Abuse protection combines a honeypot field, a minimum fill time, per-form and per-network rate limits and optional Cloudflare Turnstile. Refused and suspected-spam submissions are counted with their reason, write no customer record, and can be released by a person from a spam list. A repeated submission key is idempotent. The current checks use a signed fill proof valid for one hour and at least two seconds old, 30 submissions per form and 10 per network in a one-minute window. Only trusted Cloudflare connection metadata supplies the network address; an installation-keyed digest expires with the counter, and raw addresses are not stored. Local submissions share one local network bucket. Opted-in Turnstile loads only after interaction and verifies the form hostname and `orbit_form` action. Release keeps the original consent and current publication/capture authority; erased payloads cannot be released.

**Acceptance.**
1. Submit honeypot-filled, too-fast, over-rate and non-allowlisted entries and verify refusal reasons/counts with no customer write.
2. Replay a submission key once, release suspected spam under its original consent and current authority, and refuse release after erasure; optional Turnstile starts only after interaction.

**Evidence.** `src/core/features/forms/`; `src/core/features/forms/field-values.ts`; `src/core/features/forms/embed-code.ts`; `migrations/core/0055_form_assignment.sql`; `src/core/features/capture/proposals.ts`; `newtests/t096/forms-native.test.ts`; `newtests/t096/forms-mapped-journey.ts`; `newtests/t096/forms-mapped-custody.ts`; `newtests/t096/browser-form-mapping.ts`; `docs/retained-verification/FORM-001/`
**Gap.** Implemented first slice: Reviewed fixed forms retain consent, atomic intake, honeypot, signed fill proof, per-form/network limits, optional Turnstile, counted refusals, erasable spam and exactly-once release. Allowlisted HTTPS direct posts use the same admission without cookies or tracking. Required and optional free-text and picklist fields map to contact/company/new-deal native and custom JSON properties; exact business domains link/create companies, chosen stages enter NOW, empty values fill and populated differences wait as CAPTURE-004 proposals. A picklist accepts only its reviewed choices. Hidden fields carry a fixed value from the reviewed definition or one declared query parameter, read from the hosted page address, copied from the embedding page by the generated framed embed or sent by a direct post; publication review lists them, and a saved definition change takes effect only after its new revision is compiled, reviewed and published. Forged choices, undeclared names and fixed-value overrides are refused as `invalid_fields` without a customer or proposal write. Existing contact owners remain; fixed, durable active-user round robin and unassigned rules record each choice and notify the selected full operator once per accepted submission. Team selection, team queues and team notifications inherit TEAM-005; explicit full-operator lists are used meanwhile. Lead/custom-object kinds inherit RECORD-014 and email/push delivery NOTIFY-003.

#### FORM-003 — Form customer identity and consent

Core · target · **partial** · From FORM-001 · Cites BASE-PUBLIC-001, BASE-PUBLIC-002, BASE-INPUT-001 · Rules D-1

**Requirement.** A submission creates or updates by exact email key (RECORD-003). A new person becomes a contact; a company is linked or created from a non-free-mail domain; and when the form says so, a deal is created in a chosen pipeline and stage (OPP-009). For an existing contact, values fill only empty fields, and changes to existing values wait as a reviewed proposal (CAPTURE-004). Consent is captured with the wording, form revision and time. A form with a marketing consent box makes the person contactable only when it is ticked. An inquiry-only form records the request as the basis for one-to-one sales follow-up, as disclosed on the form. An existing do-not-contact stop always wins.

**Acceptance.**
1. Submit a new person and an existing contact with a changed name through hosted, framed and direct-post forms; create exact-key contact/company/deal associations and leave changed stored values untouched behind a reviewed proposal.
2. Read back consent wording, revision and time; marketing checkbox and inquiry basis govern contactability while a prior stop always wins.

**Evidence.** `src/core/features/forms/`; `src/core/features/forms/field-values.ts`; `src/core/features/forms/embed-code.ts`; `migrations/core/0055_form_assignment.sql`; `src/core/features/capture/proposals.ts`; `newtests/t096/forms-native.test.ts`; `newtests/t096/forms-mapped-journey.ts`; `newtests/t096/forms-mapped-custody.ts`; `newtests/t096/browser-form-mapping.ts`; `docs/retained-verification/FORM-001/`
**Gap.** Implemented first slice: Reviewed fixed forms retain consent, atomic intake, honeypot, signed fill proof, per-form/network limits, optional Turnstile, counted refusals, erasable spam and exactly-once release. Allowlisted HTTPS direct posts use the same admission without cookies or tracking. Required and optional free-text and picklist fields map to contact/company/new-deal native and custom JSON properties; exact business domains link/create companies, chosen stages enter NOW, empty values fill and populated differences wait as CAPTURE-004 proposals. A picklist accepts only its reviewed choices. Hidden fields carry a fixed value from the reviewed definition or one declared query parameter, read from the hosted page address, copied from the embedding page by the generated framed embed or sent by a direct post; publication review lists them, and a saved definition change takes effect only after its new revision is compiled, reviewed and published. Forged choices, undeclared names and fixed-value overrides are refused as `invalid_fields` without a customer or proposal write. Existing contact owners remain; fixed, durable active-user round robin and unassigned rules record each choice and notify the selected full operator once per accepted submission. Team selection, team queues and team notifications inherit TEAM-005; explicit full-operator lists are used meanwhile. Lead/custom-object kinds inherit RECORD-014 and email/push delivery NOTIFY-003.

#### FORM-004 — Form owner routing and sales follow-up

Core · target · **partial** · From FORM-001 · Cites BASE-PUBLIC-001, BASE-PUBLIC-002, BASE-INPUT-001 · Rules D-1

**Requirement.** Owner assignment keeps an existing contact owner (RECORD-016). Otherwise it uses the form's rule: a fixed owner, round-robin rotation across a chosen team (skipping inactive users, persisting its position across restarts and recording the choice on the timeline) or an unassigned team queue. The owner, or the chosen users and team, receive one in-app notification per submission (NOTIFY-001), plus email or push under NOTIFY-003. The new or existing deal enters NOW with the submission as its reason (OPP-007); a lead without a deal appears in the owner's lead view (RECORD-014). Submissions are listed per form, exported (DATA-001) and erased with the contact (DATA-002).

**Acceptance.**
1. Alternate accepted submissions across two reps, skip inactive users, restart and preserve rotation, owner choice timeline and one notification per submission.
2. Preserve an existing contact owner; verify fixed owner and unassigned queue, NOW entry and reason or deal-less lead view, and submission export/erasure.

**Evidence.** `src/core/features/forms/`; `src/core/features/forms/field-values.ts`; `src/core/features/forms/embed-code.ts`; `migrations/core/0055_form_assignment.sql`; `src/core/features/capture/proposals.ts`; `newtests/t096/forms-native.test.ts`; `newtests/t096/forms-mapped-journey.ts`; `newtests/t096/forms-mapped-custody.ts`; `newtests/t096/browser-form-mapping.ts`; `docs/retained-verification/FORM-001/`
**Gap.** Implemented first slice: Reviewed fixed forms retain consent, atomic intake, honeypot, signed fill proof, per-form/network limits, optional Turnstile, counted refusals, erasable spam and exactly-once release. Allowlisted HTTPS direct posts use the same admission without cookies or tracking. Required and optional free-text and picklist fields map to contact/company/new-deal native and custom JSON properties; exact business domains link/create companies, chosen stages enter NOW, empty values fill and populated differences wait as CAPTURE-004 proposals. A picklist accepts only its reviewed choices. Hidden fields carry a fixed value from the reviewed definition or one declared query parameter, read from the hosted page address, copied from the embedding page by the generated framed embed or sent by a direct post; publication review lists them, and a saved definition change takes effect only after its new revision is compiled, reviewed and published. Forged choices, undeclared names and fixed-value overrides are refused as `invalid_fields` without a customer or proposal write. Existing contact owners remain; fixed, durable active-user round robin and unassigned rules record each choice and notify the selected full operator once per accepted submission. Team selection, team queues and team notifications inherit TEAM-005; explicit full-operator lists are used meanwhile. Lead/custom-object kinds inherit RECORD-014 and email/push delivery NOTIFY-003.

#### OUT-013 — Gmail and Microsoft 365 mailbox sending

Core · target · **missing** · Cites BASE-MAIL-001, BASE-ROLE-001, BASE-OPS-003 · Rules D-1 · Register R-1, R-2, R-6

**Requirement.** After separate send authorization, a rep sends a reviewed one-to-one message or approved sequence step as their connected Gmail/Workspace or Microsoft 365/Outlook mailbox. The message may be composed from any permitted contact, lead, company or deal record, with or without a deal (OUT-017). The same conversation appears in Sent and returns replies to the correct contact, their company and the exactly linked deal when there is one. Signatures, approved attachments, thread references and provider message IDs are retained, and sent attachments are listed on the recipients' records under RECORD-018. Opt-out headers and the link are added only where OUT-020's setting puts them, handled at the installation origin. To, CC and BCC lists, reply and reply all follow OUT-019, sent as one provider message on the provider's own thread or conversation. Current recipient permission, unchanged-content review, quiet hours, OUT-018 per-user budgets, OUT-010 visible deferral, cancellation and ambiguous-outcome rules apply identically across mailbox and existing mail transports; a mailbox is paced per mailbox within its provider's limits (OUT-018), never by a deployment-wide throttle. A disconnected mailbox visibly blocks its sends; it never silently switches identities or transport. Before mailbox sending ships, it must satisfy OUT-015’s separate acceptance/delivery/inferred-report/human-reply provenance and genuine-reply stop semantics, with open/click not tracked unless OUT-016 is explicitly enabled. Before mailbox sequence sending ships, a mailbox disconnect must pause that mailbox's enrollments visibly with the reason, and a genuine reply on the provider's own thread or conversation must exit them under SEQUENCE-002. Before mailbox sending ships, it must satisfy OUT-018: each mailbox paced within its provider's limits and never by a deployment-wide throttle, a provider `429` deferring only that mailbox's mail visibly until its `Retry-After`, and each mailbox's usage in the administrator's view. Before mailbox sending ships, it must reuse OUT-029's installation-origin capability handler, exact approved headers and visible link, per-recipient suppression, erasure invalidation and atomic stops. The handler may ship independently for single-recipient managed-relay mail.

**Acceptance.**
1. Connect each provider, review recipient/subject/body/signature/attachment, send once and verify provider Sent, a real recipient reply and Orbit threading; revoke before a scheduled send and cause a timeout to demonstrate visible uncertainty with no duplicate or transport switch.

**Evidence.** None.
**Gap.** No implementation found. No implementation of this complete target flow was found.

#### OUT-014 — Reusable personalized templates and sales content

Core · target · **partial** · Cites BASE-MAIL-001, BASE-ROLE-001, BASE-OPS-003 · Rules D-1

**Requirement.** Reps save and share permission-controlled templates, snippets and signatures with a reviewed fixed list of supported contact/company/deal merge fields. Current full operators may read and use workspace-shared entries and create and edit their own private entries; only the installation owner may create or edit workspace-shared entries. Collaborators cannot read, author, share or apply library entries. The installation owner acts as administrator until TEAM-005 supplies real teams, restricted roles and team-restricted sharing; TEAM-005 inherits those permissions and their acceptance before shipping. Missing merge values and stale rendered inputs block approval and sending until the user reviews a fresh render. Review shows the exact rendered recipient, subject, body and signature together with the message's OUT-020 opt-out state. Approval binds an immutable snapshot of the rendered bytes and their content hash; later template, snippet or signature revisions never rewrite approved content. A changed source is visible for review, and dispatch retains OUT-001's revision and staleness fences. RECORD-018 inherits authorized versioned proposal/file selection, size/type limits, explicit access/size failures, attachment preview before approval and before files ship, and the precise sent-version record on recipients' records. Its acceptance must send an authorized attachment and refuse a forbidden one; this work is required before template attachments ship. SEQUENCE-001 and SEQUENCE-003 each inherit template expansion, per-recipient/per-step rendered-byte snapshots and approval hashing, including missing/stale merge-field blocks, before their execution paths ship. TEAM-005 repeats the sharing journey with real teams and restricted roles; RECORD-018 sends an authorized attachment, refuses a forbidden one, shows size/access failures and preview, and records the exact version sent; SEQUENCE-001 and SEQUENCE-003 each repeat expansion and approval-hash checks per recipient and step.

**Acceptance.**
1. As the installation owner, save a workspace-shared template, snippet and signature; as another full operator, read and use them, create a private entry and be refused a shared-entry write.
2. Render for two contacts and inspect the exact body, signature and OUT-020 state.
3. Refuse a collaborator's library read, authoring, sharing and application attempts.
4. Block approval with a missing merge field and after a merge value changes until a fresh render is reviewed.
5. Approve one render, revise the library entries and verify the approved byte snapshot remains unchanged and dispatch submits exactly those approved bytes under the existing staleness rules.
6. Inspect the library and rendered review at 1440 and 390.

**Evidence.** `src/core/features/drafts/`; `src/core/features/outreach/approval-repository.ts`; `src/core/features/outreach/service.ts`; `migrations/core/0050_message_library.sql`; `tests/core/signals-outreach.test.ts`; `tests/core/onboarding-archive.test.ts`; `newtests/t096/forward-upgrade.test.ts`; `docs/retained-verification/OUT-014/`
**Gap.** Unasserted in the carried evidence: another operator reads/uses library; signature bytes; reviewed opt-out state; library screen at 1440; library screen at 390; rendered review at 1440; rendered review at 390. Asserted: owner creates template/snippet/signature; private entry hidden from others; shared entry write refused; two distinct contact renders; exact body read back; collaborator read refused; collaborator authoring refused; collaborator sharing refused; collaborator application refused; missing field prevents rendering; missing field prevents approval; changed merge value prevents approval; stale preview cannot approve; saved subject/body match rendered snapshot; library revision does not alter approved body; library revision does not alter approved subject; snapshot remains byte-identical; provider receives exactly approved rendered bytes once.

#### OUT-015 — Honest open and reply tracking

Core · target · **partial** · Cites BASE-MAIL-001, BASE-ROLE-001, BASE-OPS-003 · Rules D-1

**Requirement.** Account and deal timelines distinguish provider acceptance, delivery, an open report and an actual human reply, retaining source and observed time. Open reports are explicitly inferred and may be unavailable or privacy-proxied; they never prove reading, intent or a human response. Reply tracking rejects automatic replies and ambiguous identity for stop/completion decisions. Gmail and Microsoft 365 report no opens or clicks through their APIs, so new open and link-click collection for Orbit-sent mail is solely OUT-016's disclosed, opt-in per-message tracking obligation; mail without it shows `open/click not tracked`, never `not opened`. Existing unsolicited provider open/click reports are retained only as inferred historical provider evidence, explicitly labelled unreliable and possibly proxied or automated; they introduce no collection or human-reading claim. SIGNAL-007 otherwise remains: no covert tracking script, pixel, fingerprint or cross-site collection. OUT-013 inherits these reporting/provenance and genuine-reply semantics for mailbox sending; OUT-016 inherits disclosed opt-in collection and proxy/automated classification; OUT-019 inherits genuine multi-recipient attribution; SEQUENCE-002 inherits genuine-reply exits. Each must pass the corresponding expanded journey before shipping.

**Acceptance.**
1. Ingest accepted/delivered/open events and genuine/automatic/foreign replies; show separate provider acceptance, reported delivery, inferred historical open/click reports and human replies with source and occurred/recorded time on account/contact/deal history.
2. Duplicate reports have one effect; automatic replies, foreign senders and ambiguous threads leave scheduled follow-up unchanged, including after manual linking of nonhuman evidence.
3. Without tracking, show `open/click not tracked`.
4. Only a genuine exact-identity linked reply stops follow-up; add no pixel, redirect token or tracking collection.

**Evidence.** `tests/core/launch-reply-authority.test.ts`; `tests/core/signals-outreach.test.ts`; `src/core/features/outreach/provider-replies.ts`; `src/core/features/operator/ui/mail-evidence.tsx`
**Gap.** Unasserted in the carried evidence: no new tracking pixel; no redirect collection; no tracking token collection. Asserted: acceptance distinct from delivery; delivery time read back; historical open/click inference; human reply stored once; source on each timeline; occurred time; recorded time; duplicate event retained once; automatic reply changes no business state; foreign sender changes no business state; ambiguous thread changes no business state; manually linked nonhuman evidence changes no business state; no-tracking label; exact-identity genuine reply stops work.

#### OUT-016 — Disclosed per-message tracking

Core · target · **missing** · Cites BASE-MAIL-001, BASE-ROLE-001, BASE-OPS-003 · Rules D-1 · Register R-9

**Requirement.** An administrator enables tracking for the workspace, choosing open tracking, link-click tracking or both, and the disclosure text Orbit adds to tracked mail and the workspace privacy notice. Each rep then turns tracking on or off per one-to-one message, template and sequence email step (workspace default off; a rep may set their own default on). The OUT-001 review shows the tracking state, every tracked link and its exact destination, and the approval binds that state with the content. For opted-in mail sent through any Orbit transport, including OUT-013 Gmail and Microsoft 365 mailbox sending and the shared customer-mail transport, Orbit embeds one per-message, per-recipient image token and rewrites each tracked link to a per-message redirect on the installation origin that answers 302 to the reviewed destination unchanged. Gmail and Microsoft 365 report no opens or clicks through their APIs, so these tokens are the only source of open and click evidence and Orbit claims no other. Tokens are opaque, scoped to the approved message and recipient, contain no address or CRM id and authorize no other operation. Tracking is off initially; the disclosure and each reviewed destination are explicit.

**Acceptance.**
1. Enable disclosed opens and clicks; review and send a tracked Gmail one-to-one message and Microsoft 365 sequence step, then verify an inferred open, click and unchanged reviewed redirect destination.
2. An untracked message says not tracked; opaque tokens cannot read another message, identify a CRM record or authorize another action.

**Evidence.** None.
**Gap.** OUT-016: the complete original tracking journey, token and retention controls, classification and notification behavior, authorized provider acceptance and legal qualification remain unproved. Mailbox delivery remains OUT-013, sequence execution SEQUENCE-001 and SEQUENCE-003, additional notification channels NOTIFY-003 and multi-recipient behavior OUT-019.

#### OUT-021 — Tracking classification and notifications

Core · target · **missing** · From OUT-016 · Cites BASE-MAIL-001, BASE-ROLE-001, BASE-OPS-003 · Rules D-1 · Register R-9

**Requirement.** No cookie, script, fingerprint or cross-message identifier is set or read, and a token resolves only to its one message and recipient. Each open or click becomes an inferred signal (SIGNAL-006) on the contact, message and deal timeline with first and last time, count and the clicked link. Machine traffic is labeled and not counted as a human event: Apple Mail Privacy Protection and Gmail or Outlook image-proxy prefetches, security-scanner link checks within seconds of delivery, and requests before provider acceptance are classified `proxy` or `automated` with the reason. The sending rep receives a real-time in-app notification (NOTIFY-001), and optionally push or email under NOTIFY-003, for the first human-classified open and the first click on each link, deduplicated per message. Network metadata is inspected transiently without retaining raw IP addresses or full user-agent strings. Uncertain traffic remains unknown; every report is inferred, and only non-machine human-classified events trigger the deduplicated notice with an uncertainty label.

**Acceptance.**
1. Classify known proxies, scanner requests and requests before provider acceptance as proxy or automated with a reason; uncertain traffic remains unknown.
2. Read first/last time, count, clicked link and source on contact, message and deal; the first eligible open and first click per link produce one real-time rep notice, with personal channels under NOTIFY-003.
3. Collect no cookie, script, fingerprint or cross-message identifier and retain no raw network metadata.

**Evidence.** None.
**Gap.** OUT-016: the complete original tracking journey, token and retention controls, classification and notification behavior, authorized provider acceptance and legal qualification remain unproved. Mailbox delivery remains OUT-013, sequence execution SEQUENCE-001 and SEQUENCE-003, additional notification channels NOTIFY-003 and multi-recipient behavior OUT-019.

#### OUT-022 — Tracking expiry, suppression and sales meaning

Core · target · **missing** · From OUT-016 · Cites BASE-MAIL-001, BASE-ROLE-001, BASE-OPS-003 · Rules D-1 · Register R-9

**Requirement.** Opens and clicks never satisfy ACTION-001 evidence, exit or advance a sequence, count as a reply or meeting, or raise a band to high (SIGNAL-006, SEQUENCE-002); reports show them as engagement, separate from replies. A contact can be marked do-not-track, and an administrator can switch tracking off for the workspace at once; do-not-contact, do-not-track, erasure (DATA-002) and contact deletion void that contact's tokens, so later requests still redirect the link but record nothing. Mail not sent through Orbit, or sent with tracking off, shows `not tracked`, never `not opened`. A message with more than one external recipient carries one message-level token whose events are attributed to "a recipient", and is sent untracked if any external recipient is do-not-track (OUT-019). Before tracking collection ships, it must satisfy OUT-015’s source/time, inferred/unreliable report and proxy/automated classifications; reports never become human replies or stop follow-up. Collection stops 90 days after provider acceptance; only aggregate counts, times and inference labels remain under the documented retention policy. Redirects keep the reviewed destination after expiry, disablement, suppression or erasure without keeping erased identity. Non-US collection needs recorded applicable consent or a qualified basis; uncertainty disables it.

**Acceptance.**
1. Mark do-not-track, suppress or erase a recipient, disable the workspace and expire collection; each later request redirects correctly and records nothing further.
2. A multi-recipient event names only a recipient; any do-not-track recipient makes the whole message untracked.
3. Inferred opens/clicks never complete a reply, meeting, action-evidence bar, sequence exit or high-band condition; reports separate engagement from replies.

**Evidence.** None.
**Gap.** OUT-016: the complete original tracking journey, token and retention controls, classification and notification behavior, authorized provider acceptance and legal qualification remain unproved. Mailbox delivery remains OUT-013, sequence execution SEQUENCE-001 and SEQUENCE-003, additional notification channels NOTIFY-003 and multi-recipient behavior OUT-019.

#### OUT-017 — One-to-one email from any permitted record

Core · target · **partial** · Cites BASE-MAIL-001, BASE-ROLE-001, BASE-OPS-003 · Rules D-1

**Requirement.** From a contact, lead (RECORD-014), company or deal record, a user with send permission under TEAM-005 composes a one-to-one email To one or more of that record's contacts. On a company record the To recipients are chosen explicitly from its contacts (RECORD-011). The user may add further To, CC and BCC recipients, internal colleagues and reviewed external addresses under OUT-019. The message can be written by hand, rendered from an OUT-014 template, or drafted on request as in ACTION-003, reading that record's evidence under the AI-001 preview. No open opportunity is required. The following can all be emailed: a lead or contact with no company or deal; a contact whose only deals are won or lost; a contact on an open deal, emailed from their contact or company record. Every send keeps the existing guarantees: OUT-001 exact-content approval; RECORD-012 contactability, including CAPTURE-012's recorded basis; OUT-008 quiet hours, OUT-009 scheduling, and OUT-010 limits with OUT-018's per-user budgets, under which one-to-one mail is never queued behind sequences; OUT-012 opt-out headers and link where OUT-020's setting puts them (off by default for one-to-one mail); OUT-003 and OUT-011 idempotency and reconciliation; OUT-016 tracking choice; OUT-002 states, whether through the shared customer-mail transport or an OUT-013 connected mailbox. Deal link. The composer shows the recipient's open deals. A message composed from an open deal is linked to it; from any other record, the sender may link it to at most one of the recipient's open deals or leave it unlinked. Sending never creates a deal and never reopens a closed one (OPP-001). A message composed from a won or lost deal appears on that deal's timeline as history and changes neither its lifecycle nor its queue.

**Acceptance.**
1. Through a connected mailbox, email a lead without company or deal, a contact with only a won deal, and a contact on an open deal from the company page; receive each reply.
2. Choose a recipient explicitly, use handwriting, a template and a previewed draft, then verify exact content and current contactability, quiet-hour, schedule, budget, tracking and opt-out rules.
3. Sending creates no deal, reopens none and changes neither a closed deal’s lifecycle nor queue; an optional link selects at most one open deal and a prohibited contact is refused.

**Evidence.** `src/core/features/outreach/`; `src/core/features/assistance/record-routes.ts`; `src/core/features/assistance/record-preview.ts`; `migrations/core/0056_record_mail.sql`; `migrations/core/0066_record_mail_completion.sql`; `src/core/features/operator/ui/record-mail.tsx`; `src/core/features/operator/ui/unlinked-replies.tsx`; `src/core/features/settings/removal-handover.ts`; `src/core/features/operator/ui/operator-removal-review.tsx`; `tests/core/signals-outreach.test.ts`; `tests/support/record-mail.ts`; `tests/support/record-mail-ai.ts`; `tests/support/record-mail-held-replies.ts`; `tests/support/record-mail-handover.ts`; `tests/support/record-mail-custody.ts`; `tests/core/operator-erasure.test.ts`; `newtests/t096/forward-upgrade.test.ts`; `tests/support/record-mail-upgrade.ts`; `newtests/t096/browser-record-mail.ts`; `docs/retained-verification/OUT-017/`
**Gap.** Reviewed manual composition from contacts, companies and closed deals uses one explicitly selected recipient, an optional current open-deal link and separate closed-deal history; sending creates or reopens no deal. Exact rendered approval, active/contactable identity, shared sending budgets, clocks, scheduling, reconciliation and contact-wide stops apply to the additive mail store. One accepted activity links reviewed content and provider identity to the contact, primary company and linked/history deal; verified native message headers thread one genuine reply, while missing headers are held. An unlinked accepted message opens one sender-owned contact promise, due in workspace working days and shown in Today when overdue; human replies, booked meetings, later acceptance and explicit sender completion close it. Automatic replies do not; permanent bounce suppresses and cancels contact schedules. Sender/owner reply notices and contact outcomes are native in-app. Full operators retain current authority and collaborators get no new mail door. Record AI drafting from contacts and explicitly selected company contacts uses the assistance preview, exact unchanged evidence and configured instructions through ai.provider.v1, validated citations and length, durable editable unsent drafts and ai_calls accounting; unavailable providers fail visibly. Existing held-reply review attaches genuine or automatic replies to the contact and primary company or dismisses them once with operator attribution; automatic replies and dismissal leave promises open. Removal review includes open contact promises, explicit receiving full operator or unassignment, stale-set refusal and atomic handover with one attributed contact/company entry; original sender attribution remains, receiving overdue promises appear in Today, and unassigned promises remain on their contact. Remaining gaps: additional To/CC/BCC and reply-all inherit OUT-019, mailbox sending and live replies OUT-013, leads RECORD-014, provider-thread capture CAPTURE-010, sequence steps SEQUENCE-001/003 and tracking choice OUT-016.

#### OUT-023 — Record mail history and deal-less obligations

Core · target · **partial** · From OUT-017 · Cites BASE-MAIL-001, BASE-ROLE-001, BASE-OPS-003 · Rules D-1

**Requirement.** Where it lands. On provider acceptance, one transaction records the reviewed content and provider message ID as one timeline activity on each external recipient contact, To, CC or BCC, on each of their primary companies and on the linked deal when there is one, with BCC disclosure limited as in OUT-028. A reply carrying the message's headers (OUT-004), or captured on the same provider thread (CAPTURE-010), threads once onto the same contact, company and linked deal. A reply without them is held for review, never guessed by subject. A send linked to an open deal then follows OUT-005 unchanged. Without an open deal. Instead of OUT-005's NOW→NEXT move, acceptance opens one contact-level awaiting-response obligation owned by the sender. The obligation appears in the sender's Today brief (BRIEF-001) as an overdue promise once the TEAM-003 awaiting-response interval passes, counted in working days in the workspace timezone. It closes on a genuine reply from any external recipient of the message (OUT-019), a booked meeting, a later sent message to that contact, or the sender's explicit completion; an automatic reply does not close it (OUT-015). A reply notifies the sender, and the contact owner (RECORD-016) when that is someone else, once each (NOTIFY-001). A failure, bounce or delivery-unknown outcome notifies the sender and shows on the contact (OUT-006, OUT-011), and a permanent bounce sets do-not-contact. OUT-007 stop conditions cancel the contact's scheduled messages whether or not they are linked to a deal. Sequence enrollment (SEQUENCE-001, SEQUENCE-003) needs no deal, and each deal-less step lands as above.

**Acceptance.**
1. Inspect one sent/reply activity on every external recipient, primary company and linked deal, preserving BCC disclosure; missing reply headers are held rather than guessed.
2. After the awaiting interval in workspace working days, the sender sees the deal-less obligation in Today; a genuine external reply, meeting, later send or explicit completion closes it, while automatic mail does not.
3. Receive sender/contact-owner reply notices once and truthful failure/bounce/uncertain notices; permanent bounce stops contact, scheduled stops work without a deal, and ten deal-less sequence contacts receive their first step and one reply without a new deal.

**Evidence.** `src/core/features/outreach/`; `src/core/features/assistance/record-routes.ts`; `src/core/features/assistance/record-preview.ts`; `migrations/core/0056_record_mail.sql`; `migrations/core/0066_record_mail_completion.sql`; `src/core/features/operator/ui/record-mail.tsx`; `src/core/features/operator/ui/unlinked-replies.tsx`; `src/core/features/settings/removal-handover.ts`; `src/core/features/operator/ui/operator-removal-review.tsx`; `tests/core/signals-outreach.test.ts`; `tests/support/record-mail.ts`; `tests/support/record-mail-ai.ts`; `tests/support/record-mail-held-replies.ts`; `tests/support/record-mail-handover.ts`; `tests/support/record-mail-custody.ts`; `tests/core/operator-erasure.test.ts`; `newtests/t096/forward-upgrade.test.ts`; `tests/support/record-mail-upgrade.ts`; `newtests/t096/browser-record-mail.ts`; `docs/retained-verification/OUT-017/`
**Gap.** Reviewed manual composition from contacts, companies and closed deals uses one explicitly selected recipient, an optional current open-deal link and separate closed-deal history; sending creates or reopens no deal. Exact rendered approval, active/contactable identity, shared sending budgets, clocks, scheduling, reconciliation and contact-wide stops apply to the additive mail store. One accepted activity links reviewed content and provider identity to the contact, primary company and linked/history deal; verified native message headers thread one genuine reply, while missing headers are held. An unlinked accepted message opens one sender-owned contact promise, due in workspace working days and shown in Today when overdue; human replies, booked meetings, later acceptance and explicit sender completion close it. Automatic replies do not; permanent bounce suppresses and cancels contact schedules. Sender/owner reply notices and contact outcomes are native in-app. Full operators retain current authority and collaborators get no new mail door. Record AI drafting from contacts and explicitly selected company contacts uses the assistance preview, exact unchanged evidence and configured instructions through ai.provider.v1, validated citations and length, durable editable unsent drafts and ai_calls accounting; unavailable providers fail visibly. Existing held-reply review attaches genuine or automatic replies to the contact and primary company or dismisses them once with operator attribution; automatic replies and dismissal leave promises open. Removal review includes open contact promises, explicit receiving full operator or unassignment, stale-set refusal and atomic handover with one attributed contact/company entry; original sender attribution remains, receiving overdue promises appear in Today, and unassigned promises remain on their contact. Remaining gaps: additional To/CC/BCC and reply-all inherit OUT-019, mailbox sending and live replies OUT-013, leads RECORD-014, provider-thread capture CAPTURE-010, sequence steps SEQUENCE-001/003 and tracking choice OUT-016.

#### OUT-018 — Sending budgets for each user

Core · target · **partial** · Cites BASE-MAIL-001, BASE-ROLE-001, BASE-OPS-003 · Rules D-1

**Requirement.** Orbit carries the declared 25-user team on separate budgets so one user’s sequences never consume another user’s capacity or their own one-to-one replies. Per-user budgets. Each user has two rolling 24-hour budgets, counted per provider-submitted message: sequence email (SEQUENCE-001, SEQUENCE-003 and AUTO-001 enrollments): 500 per user by default, the volume of an incumbent Professional seat; one-to-one email (OUT-017 composes, OUT-019 replies, ACTION-003 drafts and OUT-009 scheduled one-to-one messages): 1,000 per user by default, never reduced by that user's sequence sends. An administrator can lower either budget per user or per team, and raise it up to the transport limits below. Each change is audited and applies to the next claim. A message counts once however many recipients it has (OUT-019); the provider's recipient count still applies to the provider's own limits. Until team administrator roles exist the installation owner administers per-user settings; every change records actor, old/new value and time.

**Acceptance.**
1. Give each user separate rolling one-to-one and sequence budgets, count each provider-submitted message once regardless of recipients, and read the changed limit on the next claim.
2. Lower one SDR’s sequence budget to 50 and verify only that user’s excess steps defer visibly while the other SDR and everyone’s one-to-one mail continue.

**Evidence.** `tests/core/outreach-limits.test.ts`; `src/core/features/outreach/sending-limits.ts`; `src/core/features/outreach/service.ts`; `src/core/features/outreach/approval-repository.ts`; `src/core/features/operator/ui/sending-capacity.tsx`; `tests/evidence/contract/OUT-018/`
**Gap.** Unasserted in the carried evidence: separate sequence budget; provider-submitted count once across recipients; sequence budget of 50 isolates one SDR; other SDR continues; everyone’s one-to-one continues. Asserted: one-to-one budget independent per user; changed limit applies next claim.

#### OUT-024 — Connected-mailbox pace and provider quotas

Core · target · **missing** · From OUT-018 · Cites BASE-MAIL-001, BASE-ROLE-001, BASE-OPS-003 · Rules D-1

**Requirement.** Connected mailboxes. Mail sent through an OUT-013 Gmail/Workspace or Microsoft 365 mailbox is paced per mailbox, never by a throttle shared across the deployment. Orbit keeps each mailbox inside its provider's published sending limits for that account type, such as Google Workspace's per-user daily message and recipient limits and Exchange Online's per-minute message and daily recipient limits, using the lower limits of trial and consumer accounts where they apply. That mailbox's sequence steps are paced at no more than 3 per minute by default, adjustable by an administrator. A provider throttling or quota response, such as a Gmail API `429` or a Microsoft Graph `429` with `Retry-After`, defers only that mailbox's queued mail, visibly, until the provider's stated time or next window. It is never a silent retry or a switch of transport or identity.

**Acceptance.**
1. Send through Gmail and Microsoft 365 at the account type’s published message/recipient limits, including lower trial/consumer limits; no deployment throttle delays either mailbox.
2. Inject one mailbox’s provider quota response and verify only that mailbox defers visibly until its stated next window, with no transport or identity switch.

**Evidence.** `tests/core/outreach-limits.test.ts`; `src/core/features/outreach/sending-limits.ts`; `src/core/features/outreach/service.ts`; `src/core/features/outreach/approval-repository.ts`; `src/core/features/operator/ui/sending-capacity.tsx`; `tests/evidence/contract/OUT-018/`
**Gap.** Unasserted in the carried evidence: Gmail account-specific pace; Microsoft 365 account-specific pace; trial/consumer lower limits; no deployment-wide mailbox throttle; only throttled mailbox deferred; visible provider next window; no transport switch; no identity switch. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

#### OUT-025 — Shared-transport priority and fair draining

Core · target · **partial** · From OUT-018 · Cites BASE-MAIL-001, BASE-ROLE-001, BASE-OPS-003 · Rules D-1

**Requirement.** Shared transport. Mail sent through the shared the shared customer-mail transport transport has a deployment rate that scales with the declared team: by default at least 4 messages per minute per declared user, which is 100 per minute at 25 users. An administrator sets it to the connected SendGrid account's own rate. Each user's sequence steps on this transport are paced at no more than 3 per minute by default. One-to-one first. On every transport, one-to-one messages are claimed ahead of every queued sequence step. Sequence steps may use at most 75% of the shared transport's per-minute rate, so the rest is always available to one-to-one mail. A one-to-one message is submitted to its transport within 60 seconds of its approval or scheduled time at the declared team load, whatever any user's sequence backlog, when it is within its sender's one-to-one budget, has passed OUT-008 and is not stopped. Fair draining. Due sequence steps drain round-robin across users, then in enrollment order within each user's batches, so two SDRs' batches progress side by side. A user's steps beyond their own budget or pace wait for that user's next window (OUT-010) and never hold another user's mail.

**Acceptance.**
1. With 12 users (nine AEs, two SDRs and one manager) sending through Gmail and Microsoft 365 mailboxes and the shared transport, in one business morning each user approves 40 one-to-one messages while two SDRs each approve a 100-recipient, four-step SEQUENCE-003 batch.
2. Verify that every one-to-one message is submitted within 60 seconds of its approval while the batches drain; that each SDR's 100 first steps are submitted within the business day inside their own sequence budget, interleaved with the other SDR's; and that no deployment-wide throttle delays a mailbox send.
3. On the shared transport, reserve one-to-one capacity while sequences take at most 75 percent; progress both SDR batches round-robin and preserve enrollment order within each user.

**Evidence.** `tests/core/outreach-limits.test.ts`; `src/core/features/outreach/sending-limits.ts`; `src/core/features/outreach/service.ts`; `src/core/features/outreach/approval-repository.ts`; `src/core/features/operator/ui/sending-capacity.tsx`; `tests/evidence/contract/OUT-018/`
**Gap.** Unasserted in the carried evidence: 12-user mixed-mailbox/shared morning; 40 one-to-one approvals each; two 100-recipient four-step batches; every one-to-one submitted within 60 seconds; both 100-first-step batches drain in business day; batches interleave; provider/mailbox limits respected; 75-percent sequence share; reserved one-to-one capacity; per-user round-robin; per-user enrollment order. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

#### OUT-026 — Sending usage and submission latency

Core · target · **partial** · From OUT-018 · Cites BASE-MAIL-001, BASE-ROLE-001, BASE-OPS-003 · Rules D-1

**Requirement.** Visible deferral. A genuine over-limit message keeps OUT-010's visible unsent state. It names the limit that stopped it (sequence budget, one-to-one budget, mailbox pace, provider throttle or shared transport rate) and the time it may be sent. Each user sees their own budgets used and remaining; administrators see every user's and mailbox's usage. Settings shows users their own used and remaining budgets and administrators every user and mailbox. The declared capacity remains an estimate until its measured load journey passes.

**Acceptance.**
1. Record the measured submission latencies at the declared 25-user capacity before the installation manifest drops `estimated-until-load-tested`.
2. Read visible unsent reasons, limit value and next permitted time for sequence budget, one-to-one budget, mailbox pace, provider throttle and shared rate.
3. Inspect one’s own usage and, as administrator, every user’s and mailbox’s usage under the 12-user morning load.

**Evidence.** `tests/core/outreach-limits.test.ts`; `src/core/features/outreach/sending-limits.ts`; `src/core/features/outreach/service.ts`; `src/core/features/outreach/approval-repository.ts`; `src/core/features/operator/ui/sending-capacity.tsx`; `tests/evidence/contract/OUT-018/`
**Gap.** Unasserted in the carried evidence: declared 25-user measured submission latencies; sequence budget refusal; mailbox pace refusal; provider throttle refusal; mailbox usage; 12-user mixed-transport morning. Asserted: one-to-one budget refusal reason/value/time; shared rate refusal reason/value/time; own budget use and remaining; administrator sees all users.

#### OUT-019 — To, CC and BCC recipient review

Core · target · **missing** · Cites BASE-MAIL-001, BASE-ROLE-001, BASE-OPS-003 · Rules D-1

**Requirement.** Fields. Every one-to-one composer and every reply has To, CC and BCC fields. That covers OUT-017 composes from any record, ACTION-003 drafts, OUT-013 mailbox sends and the reply after a CAPTURE-012 acceptance. Autocomplete offers active users and the contacts the user may see under TEAM-005. The draft (ACTION-004) stores the three ordered lists, and changing any of them marks a reviewed draft stale (ACTION-005). Who can be a recipient. A contact is checked against RECORD-012 at approval and again at dispatch (OUT-009). A do-not-contact recipient in any field blocks the send. The refusal names that recipient and the reason and offers to remove them, which re-renders the message for a fresh review; Orbit never drops a recipient silently. An address that belongs to a contact the user cannot see is checked the same way without revealing that record. An internal colleague, meaning an active user's address or an address at a configured internal domain (TEAM-003), can always be added. Internal colleagues are never subject to contactability, unsubscribe or tracking, and never become customer contacts. An external address with no record is allowed when the user types it. The review requires one explicit choice for each such address: create a contact (RECORD-001) with its contactability basis recorded (`rep-initiated conversation`, or `inbound conversation` when the address is already a participant in the thread being answered); accept that address's pending CAPTURE-012 proposal; or send to it as a one-off recipient. A one-off recipient's address and the user's stated basis are recorded on the message, no contact is created, and a later reply from that address becomes a CAPTURE-012 proposal. An address matching a retained suppression proof (RECORD-012, DATA-002) is refused in every case, without naming the erased person.

**Acceptance.**
1. Compose with ordered To, CC and BCC lists through record compose, drafts, mailbox sends and newly accepted capture; autocomplete offers only permitted contacts and active users.
2. A do-not-contact address in any list refuses the whole message, naming a visible contact but revealing no hidden/erased identity; removing it re-renders for fresh review.
3. For unknown external addresses explicitly create with recorded relationship basis, accept a pending proposal or retain as one-off with basis on the message; internal colleagues remain outside contactability, tracking and customer contacts.

**Evidence.** None.
**Gap.** No implementation found. Drafts and outbound messages hold a single `recipient_email` matched to one `contact_id`, and the dispatcher in `src/core/features/outreach/service.ts` joins on it; there are no CC or BCC lists, internal or one-off recipients, reply-all pre-fill or per-recipient landing.

#### OUT-027 — Reply and reply-all threads

Core · target · **missing** · From OUT-019 · Cites BASE-MAIL-001, BASE-ROLE-001, BASE-OPS-003 · Rules D-1

**Requirement.** Reply and reply all. Every captured (CAPTURE-010) or Orbit-sent thread offers Reply and Reply all. Reply addresses the latest message's sender, or its `Reply-To`. Reply all adds that message's other To and CC participants, removes every address of the replying user's own mailbox and its aliases, and de-duplicates. Earlier BCC recipients are never pre-filled. The pre-filled lists are editable and pass the same per-recipient checks. The reply stays in the thread: its subject takes `Re:`, its `In-Reply-To` and `References` point to the answered message, and it joins the provider's own thread or conversation (OUT-013). Who counts as a reply. A genuine reply from any external recipient of the message (To, CC or BCC) threads back under OUT-004 and CAPTURE-010 onto the replier's contact, their company and the linked deal. It closes OUT-017's awaiting-response obligation and, for a deal-linked message, applies OUT-005 and OUT-007 as a customer reply. A reply from an internal colleague is logged on the thread as internal and closes nothing. A reply from an address with no record follows CAPTURE-012. Sequence email steps (SEQUENCE-001) are addressed To the enrolled contact, with CC limited to the internal colleagues the step names. Under SEQUENCE-002, a genuine reply on a step's thread from any external participant, including a CC'd contact or a colleague the buyer added, exits that enrollment. Before multi-recipient sending ships, it must satisfy OUT-015’s exact-identity genuine-reply attribution for every external recipient; automatic, foreign and ambiguous replies never complete awaiting-response or stop follow-up. Before sequence steps with CC ship, a genuine reply from any external participant of a step's thread must exit that enrollment under SEQUENCE-002.

**Acceptance.**
1. Receive a captured Gmail thread with two CC colleagues, one unknown; reply all, add an internal sales engineer and a known BCC contact, and verify own addresses/aliases removed, no old BCC prefilled and duplicate addresses removed.
2. Record the unknown participant’s inbound basis, keep the provider thread and message-reference chain, and repeat through Microsoft 365 and the shared sender.
3. A genuine exact-identity external participant’s reply closes the contact obligation and the linked deal’s follow-up or sequence enrollment; internal, automatic, foreign and ambiguous replies close nothing.

**Evidence.** None.
**Gap.** No implementation found. Drafts and outbound messages hold a single `recipient_email` matched to one `contact_id`, and the dispatcher in `src/core/features/outreach/service.ts` joins on it; there are no CC or BCC lists, internal or one-off recipients, reply-all pre-fill or per-recipient landing.

#### OUT-028 — Multi-recipient delivery and disclosure

Core · target · **missing** · From OUT-019 · Cites BASE-MAIL-001, BASE-ROLE-001, BASE-OPS-003 · Rules D-1

**Requirement.** Approval and transport. OUT-001 approval binds the exact To, CC and BCC lists with the subject and body, and the review shows every list in full. OUT-013, or the shared customer-mail transport, submits the approved lists as one provider message. BCC addresses travel only in the envelope, never in delivered headers. Opt-out follows OUT-020. By default a one-to-one message or reply carries none. When it does, a message with more than one external recipient carries no one-click header; a person's opt-out through its link sets only that person do-not-contact, or records a suppression proof for that one-off address; and an opt-out that cannot name one recipient opens an unattributed stop request instead of stopping everyone. OUT-016 tracking on a message with more than one external recipient records message-level opens and clicks attributed to "a recipient", never to a named contact. A message with any do-not-track external recipient is sent untracked, and the review says so. Under OUT-018 one message counts once against the sender's budget. Where it lands. On provider acceptance, one transaction records one timeline activity on each external recipient contact (To, CC or BCC), once on each of their primary companies and once on the linked deal (OUT-017). Each activity shows the To and CC lists, limited to what the viewer may see under TEAM-005. A BCC address appears only on that BCC'd contact's own activity and to the sender. It is never shown on another contact's, company's or deal's timeline view, in another recipient's copy, in a report or in another record's export. Internal colleagues are shown by name and get no customer activity.

**Acceptance.**
1. Submit one provider message with exactly the reviewed To, CC and BCC lists and no delivered BCC header; changing any list invalidates the reviewed snapshot.
2. Log once per external contact, primary company and linked deal; show To/CC within current access and show a BCC address only to that contact and sender, absent from other timelines, copies, reports and exports.
3. With several external recipients inspect message-level tracking, untracked behavior when any recipient forbids it, and per-person opt-out without a one-click header; a message counts once against the sender’s budget.

**Evidence.** None.
**Gap.** No implementation found. Drafts and outbound messages hold a single `recipient_email` matched to one `contact_id`, and the dispatcher in `src/core/features/outreach/service.ts` joins on it; there are no CC or BCC lists, internal or one-off recipients, reply-all pre-fill or per-recipient landing.

#### OUT-020 — Opt-out settings and exact message state

Core · target · **partial** · Cites BASE-MAIL-001, BASE-ROLE-001, BASE-OPS-003 · Rules D-1

**Requirement.** Setting per message type. In Settings an administrator chooses, separately for each message type, whether Orbit adds opt-out headers (the opt-out URL header and the one-click opt-out header, OUT-012) and a visible opt-out link to the message: sequence email steps (SEQUENCE-001, SEQUENCE-003) and AUTO-001 workflow email: on by default; one-to-one email and replies (OUT-017, OUT-019, ACTION-003 drafts and OUT-009 scheduled one-to-one messages): off by default, as in the incumbent with its data-privacy settings off. Each change of the setting is recorded in the audit trail with the administrator, the old and new values and the time, and applies to messages approved after it. Approved unsent messages keep the state their approval bound, and the settings page shows how many there are. Orbit never changes mail a rep writes in Gmail or Outlook outside Orbit. Internal colleagues (OUT-019) are never offered an opt-out. One message. When the setting puts opt-out on a message, the rep may remove it from that one message, or from one sequence step, by marking it relationship or transactional mail, unless an administrator has forbidden removal for that message type (allowed by default). A rep may always add opt-out to a one-to-one message. The OUT-001 review shows the opt-out state and, when it was removed, the rep's marking. The approval binds that state with the content, and changing it marks a reviewed draft stale (ACTION-005). The delivered message carries exactly the reviewed state: the headers and the link together, or neither.

**Acceptance.**
1. Change the type setting after approval and verify the approved unsent state and Settings counts remain unchanged.
2. Check a new-installation default, an established-installation upgrade, allowed and forbidden removal, explicit addition, a pre-setting approval, a SendGrid opt-out-on approval after a transport switch, an explicit removed/off approval and a historical `transport` marking; none may silently lose its approved opt-out state or refusal.
3. For Gmail one-to-one mail with opt-out off inspect no header/link; a sequence step has both, and a permitted relationship removal has neither with its review marking.

**Evidence.** `src/core/features/outreach/opt-out.ts`; `src/core/platform/outbound-mail.ts`; `src/core/platform/managed-outbound-mail.ts`; `src/core/features/operator/ui/opt-out-settings.tsx`; `src/core/features/operator/ui/draft-opt-out.tsx`; `tests/core/outbound-boundaries.test.ts`; `tests/evidence/contract/OUT-020/`
**Gap.** Unasserted in the carried evidence: established-installation upgrade; pre-setting approvals; Gmail one-to-one no opt-out header/link; sequence step includes both; relationship-marked sequence step omits both. Asserted: approved unsent state preserved; Settings counts unchanged for bound state; new-installation defaults; allowed removal; forbidden removal; explicit addition; SendGrid-to-relay opt-out continuity; explicit off state; historical transport refusal.

#### OUT-029 — Single-recipient opt-out capabilities

Core · target · **partial** · From OUT-020 · Cites BASE-MAIL-001, BASE-ROLE-001, BASE-OPS-003 · Rules D-1 · Register R-6

**Requirement.** One external recipient. A message with opt-out and exactly one external recipient carries one-click headers (the one-click opt-out header and value) and a visible link. Every sequence step is such a message, because SEQUENCE-001 addresses it To the enrolled contact with internal-only CC. For managed relay mail, the header and link use the same opaque message/recipient capability at the installation's configured the installation’s configured public origin; approval binds the capability and the reviewed opt-out state. Base's existing relay serializer carries both list headers. OUT-013 inherits this installation-origin handler for mailbox sends. The public GET opens a confirmation page without changing contactability or scheduled work. Its plain button posts to the capability; an RFC 8058 POST with the standard one-click request value uses that same capability without sign-in. Either POST sets only its bound contact do-not-contact under OUT-012 and RECORD-012 and atomically cancels that contact's scheduled outbound work. Replay is idempotent and a late dispatch cannot revive that work. Neither the capability nor any public response enumerates identities or other recipients; malformed, foreign and erased capabilities disclose no recipient identity and change nothing. Erasure invalidates the capability. Otherwise it has no expiry or automatic rotation. CAN-SPAM requires the opt-out to keep working for at least 30 days after the send; a link that works forever is the honest choice. The private archive carries the private opt-out capability records; it does not expire them.

**Acceptance.**
1. On the managed relay, turn one-to-one opt-out on and approve a single-recipient message: inspect the reviewed footer and the exact submitted opt-out URL and the one-click opt-out header and value, all bound to the same capability at the installation’s configured public origin.
2. Open the public link and verify GET changes nothing; use the plain POST button and separately the RFC 8058 POST, replay each, and verify only the bound contact is suppressed and all of that contact's scheduled work is canceled atomically, with a different contact's work unchanged and no late dispatch.
3. Try malformed and foreign capabilities and one invalidated by erasure without recipient disclosure or mutation.
4. Round-trip the private capability table through the archive and retain no-expiry behavior.
5. Inspect review, settings, confirmation, unsubscribed and invalid states at 1440 and 390.

**Evidence.** `src/core/features/outreach/opt-out.ts`; `src/core/platform/outbound-mail.ts`; `src/core/platform/managed-outbound-mail.ts`; `src/core/features/operator/ui/opt-out-settings.tsx`; `src/core/features/operator/ui/draft-opt-out.tsx`; `tests/core/outbound-boundaries.test.ts`; `tests/evidence/contract/OUT-020/`
**Gap.** Unasserted in the carried evidence: private capability archive round-trip; review at 1440 and 390; settings at 1440 and 390; confirmation at 1440 and 390; unsubscribed state at 1440 and 390; invalid state at 1440 and 390. Asserted: durable capability bound to message; exact footer bytes; matching opt-out URL header; one-click header; configured installation origin; GET changes no state; plain POST suppresses bound contact; RFC 8058 replay preserves digest; all held/claimed/scheduled work cancelled; different contact untouched; different contact’s schedule untouched; late dispatch sends nothing; malformed and foreign same refusal; invalid request leaves state unchanged; erasure invalidates capability; invalid response discloses no recipient; capability has no arbitrary expiry.

#### OUT-030 — Several-recipient opt-out

Core · target · **missing** · From OUT-020 · Cites BASE-MAIL-001, BASE-ROLE-001, BASE-OPS-003 · Rules D-1

**Requirement.** Several external recipients. A message with opt-out and more than one external recipient (OUT-019) carries no one-click header, because a one-click request cannot say who sent it. Its opt-out link opens one page on the installation origin, with no sign-in, on which the person enters the address at which they received the message. When that address is an external recipient of that message (To, CC or BCC), that one person becomes do-not-contact with basis `opt-out page` and the message cited, and the page confirms it. Any other address is refused without revealing the message's recipients. Nobody else on the message changes. A person's own opt-out. A reply asking to stop (CAPTURE-005's do-not-contact proposal, OUT-007) or an opt-out through the page applies to that person only. RECORD-012's suppression and OUT-007's stops for the person who opted out are unchanged.

**Acceptance.**
1. Send an opt-out-enabled three-recipient shared-transport message; inspect no one-click header and one page link, then submit one recipient’s address.
2. Only that recipient becomes do-not-contact, with basis and message citation; the other two remain contactable with scheduled work intact.
3. Refuse a nonrecipient without revealing identities and suppress only a one-off address when it is the actual recipient.

**Evidence.** `src/core/features/outreach/opt-out.ts`; `src/core/platform/outbound-mail.ts`; `src/core/platform/managed-outbound-mail.ts`; `src/core/features/operator/ui/opt-out-settings.tsx`; `src/core/features/operator/ui/draft-opt-out.tsx`; `tests/core/outbound-boundaries.test.ts`; `tests/evidence/contract/OUT-020/`
**Gap.** Unasserted in the carried evidence: three-recipient message has no one-click header; one opt-out page link; posted recipient address; only named recipient stopped; basis and message citation stored; other recipients remain contactable; other recipients retain schedules; nonrecipient refusal leaks no identity; one-off address stopped without creating a contact. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

#### OUT-031 — Unattributed stop requests

Core · target · **missing** · From OUT-020 · Cites BASE-MAIL-001, BASE-ROLE-001, BASE-OPS-003 · Rules D-1

**Requirement.** Unattributed requests. An opt-out that names a message with several external recipients but not one of them, such as a provider unsubscribe event or spam report without a single recipient address, never sets anyone do-not-contact. It opens one unattributed stop request on that message. The request is shown on each external recipient's contact, on the linked deal and in the sender's Today brief (BRIEF-001), naming the message and the time. Until it is resolved: every external recipient's scheduled messages and sequence enrollments are paused, visibly, with that reason, and not canceled; a new message to any of them is refused at review, naming the request, except a reply to that recipient's own inbound message received after the request, which can still be sent; the sender, and each contact owner who is someone else, is notified once (NOTIFY-001). A user with permission resolves the request by naming the person or people who opted out, who become do-not-contact with the basis `unattributed opt-out` and the resolving user recorded, while everyone else's paused work resumes. Alternatively, the user records that it cannot be determined, which sets every external recipient do-not-contact. The resolution is recorded on the message and in the audit trail with the user and time.

**Acceptance.**
1. Deliver a signed multi-recipient provider stop without an address; nobody becomes do-not-contact and every external recipient’s schedule/enrollment pauses visibly with a single request.
2. Refuse new messages naming the request while allowing a reply to that recipient’s inbound message received after it; notify sender and distinct contact owners once.
3. Resolve by naming actual people and resume the others; alternatively record cannot determine and stop all; message and audit retain the resolving user and time.

**Evidence.** `src/core/features/outreach/opt-out.ts`; `src/core/platform/outbound-mail.ts`; `src/core/platform/managed-outbound-mail.ts`; `src/core/features/operator/ui/opt-out-settings.tsx`; `src/core/features/operator/ui/draft-opt-out.tsx`; `tests/core/outbound-boundaries.test.ts`; `tests/evidence/contract/OUT-020/`
**Gap.** Unasserted in the carried evidence: unattributed provider stop creates one request; nobody becomes do-not-contact; all external schedules/enrollments visibly paused; new mail refused with request; later inbound reply exception; sender and distinct owners notified once; named people stopped; others’ paused work resumes; cannot-determine stops everyone; resolution user and time in message and audit. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

#### OUT-032 — Opt-out upgrades and transport changes

Core · target · **partial** · From OUT-020 · Cites BASE-MAIL-001, BASE-ROLE-001, BASE-OPS-003 · Rules D-1

**Requirement.** Settings → Opt-out links holds the setting for each type, and each change is audited with the user, the old and new values and the time; the page counts the approved unsent messages bound to each state. The installation owner acts for the administrator until TEAM-005. One-to-one email starts off on a new installation; an installation upgraded with users already present keeps one-to-one opt-out on until an administrator changes it, and the page shows that basis. Messages approved before the setting existed keep their original unsubscribe group. Through SendGrid, opt-out is the installation's unsubscribe group: SendGrid adds the opt-out URL header, the one-click opt-out header and its footer links together, and a message without opt-out carries none of them. A rep's relationship or transactional removal, or addition, marks that draft for review again, and a change of the one-to-one setting does the same for every draft not yet approved (ACTION-005); the approval binds the reviewed state. The single-recipient managed-relay handler is independent of mailbox sending. New managed messages that need opt-out carry the installation-origin capability in the visible footer and both list headers, including replies; they do not use the former reply exception to remove opt-out. Approval and dispatch preserve older SendGrid approvals' opt-out-on state when switching to the relay, and approvals predating the setting remain opt-out-on. An explicit opt-out-off approval, including a permitted relationship or transactional removal, stays off. A historical `transport` marking retains the refusal policy; it is never silently treated as an explicit removal. If the managed path cannot carry the approved state, review and dispatch retain “This relay cannot carry your opt-out link yet (OUT-013)”; refusals remain audited and counted in Settings. The handler is independent of mailbox sending. OUT-013 inherits its mailbox reuse; OUT-019 inherits the several-recipient page and unattributed stop requests; SEQUENCE-001, SEQUENCE-003 and AUTO-001 inherit the stored settings, per-step removal, approval binding and per-person stops before those execution paths ship.

**Acceptance.**
1. A new installation starts one-to-one opt-out off; an established upgrade keeps it on with its basis shown, and old approvals preserve their original opt-out state.
2. Switch an opt-out-on SendGrid approval to the relay and retain its exact headers/link; explicit off/removal stays off, historical transport markings retain refusal and never become a silent removal.
3. An unsupported transport refuses review and dispatch visibly, with audited Settings counts; connected mailboxes, sequences, batches and workflows preserve the exact reviewed opt-out choice.

**Evidence.** `src/core/features/outreach/opt-out.ts`; `src/core/platform/outbound-mail.ts`; `src/core/platform/managed-outbound-mail.ts`; `src/core/features/operator/ui/opt-out-settings.tsx`; `src/core/features/operator/ui/draft-opt-out.tsx`; `tests/core/outbound-boundaries.test.ts`; `tests/evidence/contract/OUT-020/`
**Gap.** Unasserted in the carried evidence: established upgrade keeps on; basis shown; pre-setting approvals preserve state; all mailbox/sequence/batch/workflow paths preserve same state. Asserted: new one-to-one default off; SendGrid-to-relay exact header/link continuity; explicit off has no capability; historical transport state refuses; unsupported review refusal; unsupported dispatch refusal; audited Settings refusal count.

#### TASK-001 — Assigned prioritized recurring sales tasks

Core · target · **partial** · Cites BASE-ROLE-001

**Requirement.** Reps create contact/company/deal-linked tasks with owner, due date and time, priority, type, notes, recurrence, reminders and open/completed/canceled states. A Today/overdue view and activity calendar support reassignment, rescheduling and completion with attribution. A recurring occurrence is distinct and completion schedules the next one once; cancellation stops future instances. Removing a rep offers an explicit task handover and never leaves due work silently ownerless. A task assigned or reassigned to someone else notifies its new owner once under RECORD-016's assignment notifications. Personal email, push and Slack reminders remain visibly unavailable until NOTIFY-003 ships those channels. INTEGRATE-005’s administrator-routed due-work channel notices do not claim personal reminder preferences. Slack-created internal tasks retain the mapped operator, source Slack and single-use action identity.

**Acceptance.**
1. Personal email, push and Slack reminders remain visibly unavailable until NOTIFY-003 ships those channels.
2. INTEGRATE-005’s administrator-routed due-work channel notices do not claim personal reminder preferences.
3. Slack-created internal tasks retain the mapped operator, source Slack and single-use action identity.
4. Create a high-priority due call and weekly follow-up, assign/reassign and complete from the daily task view, see the new assignee notified once, restart around recurrence and verify one next occurrence; remove the rep and hand over remaining tasks.

**Evidence.** `src/core/features/tasks/`; `tests/core/today-brief.test.ts`; `tests/evidence/contract/TASK-001/`
**Gap.** Unasserted in the carried evidence: personal email visibly unavailable; personal push visibly unavailable; personal Slack preference unavailable; channel due-work notice does not claim a personal preference; Slack task names mapped operator; Slack task retains source attribution.; single-use action identity; high-priority due call; weekly follow-up; assignment and reassignment; daily task view completion; one receiving-user notification; restart around recurrence; exactly one next occurrence. Asserted: operator removal handover.

#### NOTIFY-003 — Reminders that reach an absent seller

Core · target · **missing** · Cites BASE-ROLE-001 · Register R-6

**Requirement.** An operator chooses due/overdue task reminders and a daily sales digest by email and mobile push, with Slack as an optional team destination. Reminders honor working hours, timezone, recipient preferences and current access, deduplicate per obligation/due revision, stop on completion and escalate overdue work to an explicitly configured manager. The app shows queued, acknowledged, failed and uncertain attempts; provider acknowledgment is not receipt. A missed scheduled run is visible and resumed without a burst of obsolete reminders. Before email, push or Slack notifications ship, they must deliver RECORD-017's mention notifications by each mentioned user's preference, once per entry, task or handoff, and withdraw an undelivered one when its entry is deleted. INTEGRATE-005’s Slack safety rules govern this clause. Personal reminders, digests and RECORD-017 mentions use only opt-in DMs to explicitly mapped operators with current record access. An authorized DM may name a contact, but never entry text, amounts or contact details; private entries get generic notices. Withdraw an undelivered mention when its source is deleted. NOTIFY-003 carries REPORT-002's dashboard schedule delivery model when it ships: queued, sent, failed and uncertain attempts, recipient-specific access checked at send time, retry of only an explicitly failed recipient, and no resend after an uncertain provider answer. Keep the implemented dashboard schedule definitions and Slack delivery history; this inheritance does not claim that dashboard email delivery exists today.

**Acceptance.**
1. INTEGRATE-005’s Slack safety rules govern this clause.
2. Personal reminders, digests and RECORD-017 mentions use only opt-in DMs to explicitly mapped operators with current record access.
3. An authorized DM may name a contact, but never entry text, amounts or contact details; private entries get generic notices.
4. Withdraw an undelivered mention when its source is deleted.
5. Leave Orbit closed, advance a task reminder/digest schedule, receive it in a real mailbox/device and inspect its evidence link; complete or reassign the task before dispatch, simulate a provider failure and restart without stale or duplicate reminders.

**Evidence.** None.
**Gap.** No implementation found. No implementation of this complete target flow was found. Implemented first slice: RECORD-016 assignment and FORM-001 submission notices use native in-app delivery. Assignment notices by email, push and Slack according to user preference, and form notices by email and push, remain NOTIFY-003 gaps with their existing deduplication, current-access, replay, undo and erasure duties retained. ct confirmed at 02:08Z on 24 October 2026 that in-app-only delivery stays MISSING. Default adopted: native in-app assignment and form notices only; external delivery remains a NOTIFY-003 gap.

#### SEQUENCE-001 — Versioned sales sequence authoring

Core · target · **partial** · Cites BASE-MAIL-001, BASE-ROLE-001 · Rules D-1

**Requirement.** Any user whose role holds the sequence-authoring permission (TEAM-005; by default sales-admin, manager and seller) defines versioned ordered email, wait, call-task, meeting and manual LinkedIn steps, conditions and business-day delays, keeps the sequence private or shares it with a team or the workspace, and can copy a shared one to edit; a manager can lock a shared sequence against edits. Sends draw on each sender's OUT-018 sequence budget and pace. Email steps are addressed To the enrolled contact, and a step may CC named internal colleagues only (OUT-019). Email steps carry opt-out headers and the link while OUT-020's sequence setting is on (the default); the author may remove them from one step as relationship mail where OUT-020 allows it.

**Acceptance.**
1. As a seller create/share a five-step email, wait, call-task, meeting and manual LinkedIn sequence, then refuse a read-only author.
2. Copy a shared sequence to edit, lock one as manager and inspect versioned conditions, business-day delays, permitted team/workspace shares and internal-only CC.

**Evidence.** `src/core/features/outreach/scheduler.ts`; `src/core/features/drafts/service.ts`; `tests/core/outreach-limits.test.ts`
**Gap.** Reviewed single scheduled messages exist; multi-step definitions, rep authoring and sharing, deal-less enrollments, step threading, internal CC and manual step execution are missing.

#### SEQUENCE-004 — Sequence enrollment and scheduled steps

Core · target · **partial** · From SEQUENCE-001 · Cites BASE-MAIL-001, BASE-ROLE-001 · Rules D-1

**Requirement.** Enrollment requires no deal: any contact or lead with an email address can be enrolled, and a deal-less enrollment's messages and replies land on the contact and company timelines under OUT-017. Each later email step is set by the author either to reply in the thread of the enrollment's previous sent step (the same subject with `Re:`, and `In-Reply-To`/`References` to that message) or to start a new subject. The review shows which. A threaded step whose earlier step was never sent starts a new thread, and the review says so. A rep reviews enrollment and the fully rendered exact email content for each recipient and step, individually or as one reviewed batch of up to 100 contacts under SEQUENCE-003; all external emails keep OUT-001 approval and revision fences. Call and LinkedIn steps require a human action and recorded completion, with no protected-network scraping or auto-posting. The enrollment view shows current step, owner, due time, history, paused/failed state and remaining approved work; bulk enrollment cannot bypass individual contact permission. Before enrollments ship, they must satisfy SEQUENCE-002: an enrollment exits atomically on a genuine reply (including one from an external participant of a step's thread), a meeting booking, a stage change, a won or lost close, an unsubscribe, a permanent bounce or a human stop; reassignment, revoked permission and mailbox disconnect pause it visibly with the reason; and restart, replay or a late job never revives an exited enrollment. Before sequence sending ships, it must satisfy OUT-018: each sender's sequence budget (500 a rolling day by default) and pace (3 a minute), at most 75% of the shared transport's rate, one-to-one mail claimed first, round-robin draining across users, and deferrals that name the sequence budget or pace and the time. Before sequence sending ships, each recipient's email step must satisfy OUT-014's template/snippet/signature expansion, missing/stale merge-field approval blocks, exact rendered review, immutable rendered-byte snapshot and content-hash approval binding. Later library revisions never rewrite that approved snapshot; changed inputs retain the step's review hold and revision fences. Before sequence sending ships, each step must satisfy OUT-020's per-type setting, permitted per-step removal, exact approval binding and installation-origin capability headers/link, with per-person atomic stops and no revival. If its transport cannot carry that approved state, the managed-relay refusal remains applicable.

**Acceptance.**
1. As a seller, create and share with the team a five-step email/call/manual-LinkedIn sequence whose second email step is threaded and CCs the account's sales engineer, and see a read-only user refused authoring; enroll eligible contacts with and without deals with exact-content approvals, complete the manual task, advance business time and restart mid-step; verify one action per due step, the second email arriving in the first email's thread with the internal CC, OUT-018 per-user budget enforcement and no unapproved send.
2. Exercise a threaded second email and new-subject step, including the no-earlier-send fallback; review discloses the thread choice and each exact rendered recipient/step.

**Evidence.** `src/core/features/outreach/scheduler.ts`; `src/core/features/drafts/service.ts`; `tests/core/outreach-limits.test.ts`
**Gap.** Reviewed single scheduled messages exist; multi-step definitions, rep authoring and sharing, deal-less enrollments, step threading, internal CC and manual step execution are missing.

#### SEQUENCE-005 — Sequence outcome reports

Core · target · **partial** · From SEQUENCE-001 · Cites BASE-MAIL-001, BASE-ROLE-001 · Rules D-1

**Requirement.** Before sequence reports ship, they must carry REPORT-001's enrollment-level sequence reply reports: for each sequence version, step and enrolling rep, the enrollments, sent, delivered, genuine replies, meetings booked and stage/revenue outcomes are counted separately under SEQUENCE-002, an inferred open never counts as success and an automatic reply never counts as a reply, and each figure drills through to the authorized enrollments behind it. REPORT-001's own requirement for sequence reports stays.

**Acceptance.**
1. By sequence version, step and enrolling rep, reconcile enrollment, sent, delivered, genuine replies, meetings, stage and revenue outcomes separately.
2. Drill every figure into its permitted enrollments; inferred opens never count as success and automatic replies never count as replies.

**Evidence.** `src/core/features/outreach/scheduler.ts`; `src/core/features/drafts/service.ts`; `tests/core/outreach-limits.test.ts`
**Gap.** Reviewed single scheduled messages exist; multi-step definitions, rep authoring and sharing, deal-less enrollments, step threading, internal CC and manual step execution are missing.

#### SEQUENCE-002 — Immediate sequence exits and accountable outcomes

Core · target · **partial** · Cites BASE-MAIL-001, BASE-ROLE-001 · Rules D-1

**Requirement.** Before every step and atomically when a stop arrives, an enrollment exits on a genuine reply (from the enrolled contact or, on a step's thread, from any external participant such as a CC'd colleague, under OUT-019), meeting booking, configured deal-stage change, won/lost outcome, unsubscribe, permanent bounce or human stop. An automatic reply does not count as a successful customer response. Reassignment, revoked permissions and mailbox disconnect pause with a reason. Reports distinguish delivered messages, replies, booked meetings and actual stage/revenue advancement; an open does not count as success. Restart, replay or a late scheduled job cannot revive an exited enrollment. Before sequence exits ship, they must satisfy OUT-015: only a genuine attributed human reply exits on reply; automatic mail and inferred open/click reports never do. Until SEQUENCE-001 enrollments exist, these exits govern each reviewed single scheduled message (OUT-009). A genuine attributed reply or meeting booking (OUT-007, OUT-015), an unsubscribe, a permanent bounce or do-not-contact (RECORD-012), any stage move of its deal (every move counts until a sequence configures which stages exit) and a won or lost close each cancel the affected scheduled messages in the same commit as the event, with the reason recorded on the message; a human cancel does the same. Reopening the deal, replaying the event, restarting or a late dispatch revives none of them, and a new send needs a fresh review. For a single scheduled message, removing the user who approved it cancels it and it needs a fresh approval, which is stricter than a pause; reassigning the deal leaves the message with that approving user. Pausing with a reason on reassignment, revoked permission and mailbox disconnect belongs to enrollments. Each deal's Approved outreach view shows Follow-up outcomes since its first provider-accepted message: accepted, delivery-reported, human replies, meetings booked and stage advances counted separately with the won or lost outcome, and open/click reports and automatic replies listed as not counted. SEQUENCE-001 and SEQUENCE-003 inherit enrollment exits, pause with a reason on reassignment, revoked permission and mailbox disconnect, and no revival of an exited enrollment; AUTO-001 inherits them for workflow-triggered enrollments; OUT-019 inherits exits on a genuine reply from any external participant of a step's thread; OUT-013 inherits mailbox-disconnect pause and provider-thread exits; REPORT-001 reports these outcomes for reviewed single scheduled messages, and SEQUENCE-001 inherits enrollment-level sequence outcome reporting. Each must pass this clause's acceptance before shipping.

**Acceptance.**
1. Race an approved due step with each reply/booking/stage/stop event, including a reply on the step's thread from a colleague the buyer CC'd, restart and replay; verify no prohibited send, one exit reason and separate reply/meeting/deal-outcome measures.

**Evidence.** `tests/core/signals-outreach.test.ts`; `src/core/features/pipelines/movement.ts`; `src/core/features/records/repository.ts`; `src/core/features/outreach/follow-up-outcomes.ts`; `src/core/features/operator/ui/follow-up-outcomes.tsx`; `tests/evidence/contract/SEQUENCE-002/`
**Gap.** Unasserted in the carried evidence: external colleague reply exit; manual stop; unsubscribe/permanent-bounce stop; restart preserves exit. Asserted: reply exit; booking exit; stage exit atomic with stage change; one first exit reason; replay/reopen/late dispatch revive nothing; separate customer outcome counts.

#### SEQUENCE-003 — Bulk enrollment and rendered batch review

Core · target · **missing** · Cites BASE-MAIL-001, BASE-ROLE-001 · Rules D-1

**Requirement.** A rep or SDR with the sequence-enrollment permission (TEAM-005) selects up to 100 contacts or leads from a saved list, search result or report drill-through (RECORD-014), with or without deals (OUT-017), and enrolls them into one sequence version in a single action. Before anything sends, Orbit renders every email step for every selected recipient with current merge data and shows one batch review. It lists each recipient's eligibility (do-not-contact, missing email, already enrolled, owner mismatch, missing variable, permission), with excluded recipients and their reasons. It gives a navigable list of every rendered message, each opening to its exact recipient, subject, body, signature, attachments, tracking state (OUT-016) and send window, and it shows the schedule each step will follow. The rep may remove recipients or edit any message before approving; an edit re-renders only that item.

**Acceptance.**
1. From a saved list of 50 eligible contacts (ten of them on no deal) and 3 ineligible contacts, enroll all of them in a five-step sequence with four email steps in one action; inspect the excluded reasons, open any rendered message, edit one and remove one, then approve once.

**Evidence.** None.
**Gap.** No implementation found. Reviewed single scheduled messages exist under OUT-009; sequences, batch rendering and batch approval do not.

#### SEQUENCE-006 — Batch dispatch and isolated review holds

Core · target · **missing** · From SEQUENCE-003 · Cites BASE-MAIL-001, BASE-ROLE-001 · Rules D-1

**Requirement.** One approval of that batch is the OUT-001 approval for every message it lists, bound to the sequence version and a content hash of each rendered message. After approval each due step sends on its own schedule with no further click whenever its re-render at dispatch equals the approved bytes. If merge data, the template, the step content or the recipient's permission changed since approval (OUT-014), only that recipient's step is held as `needs review` with the difference shown, and that enrollment pauses at that step while the rest of the batch continues. Each sender's OUT-018 sequence budget and pace, mailbox limits and the shared-transport rate spread due steps over the next permitted windows in enrollment order, drained fairly across users and never ahead of one-to-one mail, visibly, instead of refusing the batch, silently retrying or merging messages; quiet hours (OUT-008) delay scheduled steps to the next permitted minute. Before batch enrollment ships, each enrollment in a batch must satisfy SEQUENCE-002's exits, pauses with a reason and no-revival rules on its own, without stopping the rest of the batch. Before batch sending ships, it must satisfy OUT-018: each sender's sequence budget (500 a rolling day by default) and pace (3 a minute), at most 75% of the shared transport's rate, one-to-one mail claimed first, round-robin draining across users, and deferrals that name the sequence budget or pace and the time. Before batch sending ships, each recipient's email step must satisfy OUT-014's template/snippet/signature expansion, missing/stale merge-field approval blocks, exact rendered review, immutable rendered-byte snapshot and content-hash approval binding. A library revision cannot rewrite an approved batch item; changed inputs hold only that recipient's affected step for review under this clause's rules. Before batch sending ships, each recipient's message must satisfy OUT-020's setting, permitted removal, exact approval binding and installation-origin capability headers/link, with per-person atomic stops and no revival. If its transport cannot carry that approved state, the managed-relay refusal remains applicable.

**Acceptance.**
1. Advance business time and verify one provider submission per due email step per remaining recipient with no further approval, a per-rep limit of 40 per day deferring the rest visibly to the next window, a merge-field change on one contact holding only that recipient's step for review.
2. With at most 100 selected contacts, persist every rendered message hash and sequence version; dispatch one effect per approved step and hold only a changed recipient while the rest progresses.
3. Observe exits, pauses, template/signature/attachment snapshots, opt-out state, per-user pacing, one-to-one priority and quiet hours through every batch item.

**Evidence.** None.
**Gap.** No implementation found. Reviewed single scheduled messages exist under OUT-009; sequences, batch rendering and batch approval do not.

#### SEQUENCE-007 — Workflow-triggered enrollment review

Core · target · **missing** · From SEQUENCE-003 · Cites BASE-MAIL-001, BASE-ROLE-001 · Rules D-1

**Requirement.** Workflow-triggered enrollment (AUTO-001) never sends unreviewed: triggered contacts join their owner's sequence approval queue, grouped per sequence and day, and the owner approves each group as one batch under the same rules. The batch, its approver, every listed message hash and each later hold remain in the enrollment history and audit.

**Acceptance.**
1. Trigger a workflow contact and inspect the owner’s sequence/day group awaiting its batch approval; no message sends before that group is approved.
2. Read the batch, approver, listed hashes and later holds in enrollment history and audit.

**Evidence.** None.
**Gap.** No implementation found. Reviewed single scheduled messages exist under OUT-009; sequences, batch rendering and batch approval do not.

#### AUTO-001 — Configurable sales workflows and visible execution

Core · target · **partial** · Cites BASE-ROLE-001, BASE-AUDIT-001

**Requirement.** Admins build versioned trigger/condition/action workflows for record changes, activities, form submissions (FORM-001), scheduled stale checks and authorized enrichment signals. Actions assign an owner to a deal, contact, lead, company or custom-object record (fixed, the account owner, meaning the company owner under RECORD-016, or round-robin rotation across a team that skips inactive users and records each choice), create/remind tasks, update records under AUTO-002 (set, copy, stamp and clear fields, move a deal's stage and create associated deals, leads and custom-object records, applied without a per-record proposal), notify a team, enroll into an approved sequence through the owner's SEQUENCE-003 batch approval queue, or call a declared webhook. A preview and dry run show affected records and each external effect; human approval binds external content (OUT-001) and, per record, the material changes AUTO-002 lists: deal amount, products, quote values and forecast category, close date, and moving a deal to won or lost or reopening it. Every run retains owner, source evidence, version, due time, stop condition, attempts and outcome; loops, rate limits, revoked authority, errors and dead letters remain visible and manually resumable. Before workflow-triggered enrollment or workflow email ships, it must satisfy SEQUENCE-002's exits, pauses with a reason and no-revival rules. Before workflow email ships, it must satisfy OUT-018: each sender's sequence budget (500 a rolling day by default) and pace (3 a minute), at most 75% of the shared transport's rate, one-to-one mail claimed first, round-robin draining across users, and deferrals that name the sequence budget or pace and the time. Before workflow email ships, it must satisfy OUT-020's setting, permitted removal, exact approval binding and installation-origin capability headers/link, with per-person atomic stops and no revival. If its transport cannot carry that approved state, the managed-relay refusal remains applicable.

**Acceptance.**
1. Preview and activate a stale-deal rule, trigger it twice, change the record and revoke permission before dispatch; inspect one authorized task/notification, one AUTO-002 field write applied without a proposal, no stale field write/send, and an actionable failed webhook run after restart.

**Evidence.** `src/core/features/capture/proposals.ts`; `src/core/features/delegation/effects.ts`; `tests/core/capture-review.test.ts`
**Gap.** Fixed reviewed proposals and handoffs exist; configurable workflow authoring, unattended record updates (AUTO-002) and durable run management are missing.

#### AUTO-002 — Workflow record-changing actions

Core · target · **missing** · Cites BASE-ROLE-001, BASE-AUDIT-001

**Requirement.** An active AUTO-001 workflow changes CRM data with nobody clicking anything, as HubSpot's "Edit record" action and Pipedrive's update and create actions do. Its triggers include a record created or changed (including a deal entering a stage or being won), an activity logged (RECORD-010, CAPTURE-010, CALL-001), a form submission (FORM-001) and a schedule. Record-changing actions. Each action names its target: the triggering record, or associated records chosen explicitly. These are the primary company, all or the primary associated contacts, contacts holding a named deal role (RECORD-015), the company's or contact's deals filtered by pipeline and stage, or a related custom-object record (RECORD-014). On each target an action can: set a field to a stated value, including picklist fields such as lead status and lifecycle stage, checkboxes, numbers and users; stamp a date or date-time field with the trigger time, the run time, or an offset from either (for example run time plus 14 days, in the workspace timezone under TEAM-003); copy a value from the triggering record, from an associated record or from the triggering form submission (such as UTM fields onto the contact), converting between compatible types as the editor states and refusing incompatible ones when the rule is saved; clear a field, or add to or subtract from a number field; move a deal to a named stage of its pipeline, applying OPP-009 required fields and history; a move into a stage whose required fields are empty fails visibly and never skips them; create an associated deal (in a named pipeline and stage), lead or custom-object record from stated or copied field values, with its owner set by an AUTO-001 owner rule. A run creates each record once: a repeated trigger event, replay or resume finds the record it already created.

**Acceptance.**
1. As a sales admin, activate three workflows, each after its preview shows per-record current and resulting values: "deal created" sets the primary contact's lead status to "Open deal" and the company's lifecycle stage to "Opportunity"; "deal closed won" sets the company and all its contacts to "Customer", stamps "Became customer" with the run date and creates an onboarding task; "meeting logged on a deal in Qualified" moves the deal to "Meeting held".
2. Create a deal, close another won and log a meeting; verify every field value and the stage move are written with no proposal, each with a timeline entry naming the workflow, its version and the trigger, and replay a trigger to see no second write, task or record.

**Evidence.** None.
**Gap.** No implementation found. No workflow engine writes records: the only writes outside a person's own edit are capture proposals accepted one at a time in `src/core/features/capture/proposals.ts`, whose compare-and-set fence on the current value is the guard this clause extends to unattended workflow writes.

#### AUTO-003 — Workflow activation and history

Core · target · **missing** · From AUTO-002 · Cites BASE-ROLE-001, BASE-AUDIT-001

**Requirement.** What activation authorizes. Activating a workflow version is the approval for its internal writes. The activation preview and dry run evaluate the version against the records that match it now and those it would have triggered on in the past 30 days. For each record they show every field's current and resulting value, each stage move and each record to be created, counted per action, alongside AUTO-001's external effects. The version records the administrator who activated it and when. Each run then applies that version's internal writes with no per-record proposal. Every write appears on the record's timeline and field history with the workflow, its version, the trigger event and its evidence, and the previous and new values. Reports and API-001 change webhooks give the change source as `workflow`. Editing an active workflow creates a new version that writes nothing until it is previewed and activated. Before a delayed action runs, it re-checks that its version is still active; if not, it stops as "version replaced". Migration. MIGRATE-001/002/003 list each source workflow's record-update and record-create actions against these actions. Each is named as mapped, needing approval under this clause, or having no Orbit equivalent. Nothing is activated without an administrator's preview.

**Acceptance.**
1. Preview current matching records and the past 30 days with per-record current/resulting fields, moves, creates and per-action counts; read back activating administrator, version and time.
2. Edit an active version and verify no new-version effect before preview/activation; dispatch a delayed old version and read version replaced.
3. Timeline, field history, reports and API change events name workflow, version, trigger/evidence and old/new values; migrations list each action as mapped, needing approval or without equivalent.

**Evidence.** None.
**Gap.** No implementation found. No workflow engine writes records: the only writes outside a person's own edit are capture proposals accepted one at a time in `src/core/features/capture/proposals.ts`, whose compare-and-set fence on the current value is the guard this clause extends to unattended workflow writes.

#### AUTO-004 — Material workflow changes

Core · target · **missing** · From AUTO-002 · Cites BASE-ROLE-001, BASE-AUDIT-001

**Requirement.** What still needs a per-record approval. An activated version alone never applies: a deal's amount, products, line items or quote values (QUOTE-001), or its forecast category or probability override (FORECAST-001); a deal's close date; moving a deal to won or lost, or reopening one; any field an administrator marks "approve each workflow change" in RECORD-014 field settings. For each such change, the run creates one approval item for the record's owner, or for the approver the action names. The item shows the exact current and proposed value and the triggering evidence, and it is guarded by the current value. Accepting applies the change. Declining, or leaving the item for 7 days, closes it visibly, and the run history records the outcome. The rule editor labels these actions "needs approval", and the preview counts them. Customer-facing content, including email and sequence enrollment, is always approved under OUT-001 and SEQUENCE-003. A workflow can set a contact to do-not-contact. It never makes anyone contactable (RECORD-012), never changes a consent basis, and never deletes or merges records.

**Acceptance.**
1. Activate a rule that sets a deal amount and verify an approval item waits for the deal owner, with no change until it is accepted.
2. Inspect guarded current/proposed value, evidence and named approver; decline or let seven days lapse and read the closed outcome, with counts in preview.
3. A workflow may stop contactability but cannot create it, change consent, delete or merge; customer content and enrollment follow their own exact-content rules.

**Evidence.** None.
**Gap.** No implementation found. No workflow engine writes records: the only writes outside a person's own edit are capture proposals accepted one at a time in `src/core/features/capture/proposals.ts`, whose compare-and-set fence on the current value is the guard this clause extends to unattended workflow writes.

#### AUTO-005 — Workflow guards and recovery

Core · target · **missing** · From AUTO-002 · Cites BASE-ROLE-001, BASE-AUDIT-001

**Requirement.** Limits on every write. Permissions: a workflow writes only the records and fields its activating administrator may edit under TEAM-005, including field-level grants. Saving or activating a rule with an action on a field outside those grants is refused, naming the field. If the activator's grants later shrink or their access is revoked, the next run refuses that action visibly and the workflow shows "needs re-activation". Validation: writes pass RECORD-014 type, picklist, required and unique validation. An invalid value fails that action on that record visibly in the run history, with the reason. Each action is atomic per record. A failed action stops the run's later actions on that record and leaves its earlier ones applied, listed and undoable. Current-state guard: a run evaluates its conditions when triggered and again at dispatch against the current record, and a false condition stops it as "condition no longer true". Each write is a compare-and-set against the value the run read. If a user, an import or another run changed the target field after the trigger event, that action is skipped as "changed by <who> at <time>" and shown in the run history. It is never overwritten blindly. Ordering and loops: workflows triggered by the same event run in the administrator's stated order. A workflow's writes may trigger other workflows up to 5 levels deep per originating event, and never re-trigger the same workflow. A deeper chain stops visibly as a loop. AUTO-001's rate limits, revocation, dead-letter and manual resume apply, with a default of 10,000 record writes per workflow per hour beyond which runs queue visibly. Notifications: field writes notify no one unless the workflow has a notify action; owner changes notify under RECORD-016.

**Acceptance.**
1. Close a deal won whose company lifecycle stage a user edited after the trigger and verify that write is skipped as changed by that user while the contacts and task are updated.
2. As a manager without the grant to edit a protected field, try to activate a rule writing it and see the refusal naming the field; reduce a sales admin's grant after activation and see the next run refuse that action visibly.
3. Chain two workflows into a loop and see it stop at the depth limit.
4. Restart mid-run and resume without a duplicate write.
5. Fail type, picklist, required or unique validation and inspect a per-record atomic action failure; earlier applied actions remain listed and undoable, later actions stop.
6. Change a condition before dispatch and read the stopped run; preserve administrator event order, bounded depth and visibly queued rate excess without silently overwriting another actor.

**Evidence.** None.
**Gap.** No implementation found. No workflow engine writes records: the only writes outside a person's own edit are capture proposals accepted one at a time in `src/core/features/capture/proposals.ts`, whose compare-and-set fence on the current value is the guard this clause extends to unattended workflow writes.

#### AUTO-006 — Undo workflow effects

Core · target · **missing** · From AUTO-002 · Cites BASE-ROLE-001, BASE-AUDIT-001

**Requirement.** Undo. A user with workflow permission undoes one run, or every run of a version over a chosen time range. Undo restores each field written by a run only where the field still holds the value the run wrote. It reverses a stage move the same way, recording the reversal in OPP-009 history. It archives a record the run created only if nobody has edited or associated it since. Each skipped item is listed with who changed it and when. Undo is attributed and audited, sends nothing, and never reopens or deletes tasks or messages.

**Acceptance.**
1. Undo the closed-won run after a user edited one contact; verify the other values are restored, that contact is listed as skipped and the stage history records the undo.
2. Undo a run or version over a time range; archive a created record only while it has no later edit/association, list skipped records with who/time, and retain attributed stage reversal.
3. Undo sends nothing and never reopens or deletes tasks or messages.

**Evidence.** None.
**Gap.** No implementation found. No workflow engine writes records: the only writes outside a person's own edit are capture proposals accepted one at a time in `src/core/features/capture/proposals.ts`, whose compare-and-set fence on the current value is the guard this clause extends to unattended workflow writes.

#### CALL-001 — Provider-backed click-to-call

Core · target · **partial** · Cites BASE-ROLE-001, BASE-DATA-003 · Register R-7

**Requirement.** An authorized rep clicks a contact phone number and calls through Twilio or Aircall from the deal. Connection, ringing, answered, no-answer, canceled and failed outcomes remain distinct; provider callback identities are idempotent. The call log retains rep, participants, time, duration, disposition, next action and deal/contact links. Calls a rep places or takes in the connected Twilio or Aircall app outside Orbit, including inbound calls and callbacks, are logged once from the provider's call events onto the contact matched by exact phone number and, when that contact has one open deal, that deal; a number matching no contact, several contacts or several open deals is held for the rep's review. Calling respects blocked numbers and provider permissions; no failed call is represented as a completed conversation. Provisioning, US number verification and provider approval are explicit setup work. It carries the calls on BOUNDARY-001's US buyer walk: Twilio and Aircall remain the PSTN carrier, and a provider not yet connected or approved appears as unresolved setup while manual call logging stays usable. Before provider calls ship, they must carry REPORT-001's rep activities: each provider-logged call counts once as a call by its rep, dated when it happened, with answered, no-answer, canceled and failed outcomes kept distinct so a failed call never counts as a completed conversation, and drill-through opens the linked call. Whichever of BOUNDARY-001's named clauses ships last also walks a US buyer from a USD deal through booking, support context, signed quote, billing/accounting and post-sale Buoy handoff, inspecting the correct product links, ownership boundaries and unresolved provider setup without a substituted mock or a reduced CRM scope.

**Acceptance.**
1. Connect Twilio and Aircall in turn, initiate a call from a real deal to an authorized test number, record answered/no-answer/failed dispositions, replay callbacks and revoke the connection; verify one truthful linked call each time.
2. Place one call and receive one inbound call in the Aircall app outside Orbit and verify each is logged once on the matched contact and deal, with an unknown number held for review.
3. As part of BOUNDARY-001's walk, call the walk's USD deal contact and inspect the provider link, the carrier boundary and an unapproved provider shown as unresolved setup with manual logging still available.

**Evidence.** `src/core/features/calls/`; `tests/core/today-brief.test.ts`; `tests/support/twilio-calls.ts`; `tests/delegation-browser/records-layout.test.ts`; `newtests/t096/collaborator-lifecycle.test.ts`
**Gap.** Implemented first slice: owner-managed encrypted Twilio configuration, replacement and disconnect; contact and linked-deal exact-number review with one attempt; signed ordered callbacks, replay refusal, outside-Orbit logs and owner review of unknown numbers; one call per Rep activities row; contact erasure replay fences and credential-free Records/CLI archives. Calling settings, held review, contact/deal call review and logs are exercised at 1440 and 390. A Twilio test-credential application receipt (sd-orbit-hk1, 26 October 2026) ran the built Worker at an HTTPS loopback origin: the owner saved the account's test credentials through the calling-settings door, and the real dial door made one Calls request, which Twilio accepted with a call receipt (attempt submitted); replaying that operation key was refused before any second request; each of Twilio's documented test refusals (invalid, unroutable, internationally unpermitted and blocked To; invalid From) made one request, returned Twilio's error code and was recorded as an uncertain attempt with no call. Test credentials place no call and send no callbacks, so callbacks, inbound and outside-Orbit logging remain proven only by the signed network-edge fixtures, which cover completed and ringing events; no-answer, busy, canceled and failed dispositions have neither a provider proof nor a fixture. Aircall, a live-account call to an authorized test number with its real callbacks and dispositions, a distinct failed state for Twilio's definite refusals (recorded as uncertain today) and the complete inherited buyer journey remain gaps.

#### CALL-002 — Consented recordings and cited transcripts

Core · target · **partial** · Cites BASE-ROLE-001, BASE-DATA-003 · Register R-7

**Requirement.** With the business's selected recording policy and the participants' required consent, calls and meetings attach provider recordings and timecoded transcripts to the right deal/contact under current access. A recording refused or unavailable is stated plainly; no transcript is fabricated. Reps review speaker identity, recap, commitments and proposed CRM changes against cited timestamps before accepting material updates or sending follow-up. Erasure covers stored recordings, transcripts, derived notes and provider-deletion requests, showing external completion separately. Consented transcript lines become AGENT-002 risk evidence with their timestamps. On BOUNDARY-001's US buyer walk, recordings and transcripts stay with the call or meeting provider and only consented, cited evidence reaches the deal; an unavailable recording provider appears as unresolved setup. Whichever of BOUNDARY-001's named clauses ships last also walks a US buyer from a USD deal through booking, support context, signed quote, billing/accounting and post-sale Buoy handoff, inspecting the correct product links, ownership boundaries and unresolved provider setup without a substituted mock or a reduced CRM scope.

**Acceptance.**
1. Record an authorized test call, decline consent on another, read timestamped transcript evidence from the deal, correct a speaker and approve a stale-guarded proposal; deny an unauthorized user and erase local and provider copies.
2. Contradict a recorded commitment in a transcript and inspect AGENT-002's cited conflict.
3. As part of BOUNDARY-001's walk, record a consented call on the walk's USD deal and inspect the provider link and an unavailable recording provider shown as unresolved setup.

**Evidence.** `src/core/features/records/manual.ts`; `src/core/features/capture/proposals.ts`; `tests/core/capture-review.test.ts`
**Gap.** CALL-002: recording and participant-consent enforcement, cited transcripts and speaker review, stale proposals, transcript-based risk evidence, current-access playback, retention, local derivatives and confirmed provider deletion, original buyer-walk steps, provider qualification and state-specific legal qualification remain unproved. Dialing authority remains CALL-001; the complete cross-product steps remain with BOUNDARY-001’s named receiving clauses.

#### CALL-003 — Participant recording consent and provider deletion

Core · target · **partial** · From CALL-002 · Cites BASE-ROLE-001, BASE-DATA-003 · Register R-7

**Requirement.** implement consented recording and transcript evidence using a business-authorized Twilio or Aircall account; enable only an adapter with verified recording, consent and deletion capabilities. Recording starts off for every call and meeting. Apply the stricter applicable participant-state requirement, using affirmative consent from every participant as the product default, including when location is unknown. Record the disclosure version, participants, consent time and evidence; adding a participant pauses recording until their consent is recorded. Refusal permits an unrecorded call and manual notes, never a fabricated transcript. Recording consent is separate from TCPA authority to place a call; check applicable consent, do-not-call and suppression before calling, with no assumed automated or prerecorded calling authority. Keep recordings and transcripts at the selected provider, retain only protected references and consented cited evidence locally, and default provider retention to 90 days with shorter administrator settings supported. Provider access uses current record permissions. Erasure immediately removes local access and derivatives, requests provider deletion and visibly tracks pending, failed and confirmed outcomes; never report completion from request acceptance alone. State-law, provider-contract and non-US consent qualification remain explicit gaps.

**Acceptance.**
1. Exercise consent refusal, unknown participant state, a new participant and withdrawal; recording stays off until the stricter applicable participant requirement is met, while an unrecorded call/manual notes remain available.
2. Read disclosure version, participant consent evidence/time and separate lawful calling authority; current record access governs protected provider references and cited evidence.
3. Expire provider retention and refuse inaccessible media; erase local derivatives immediately and inspect separately pending, failed and confirmed provider deletion, never completion from request acceptance.

**Evidence.** `src/core/features/records/manual.ts`; `src/core/features/capture/proposals.ts`; `tests/core/capture-review.test.ts`
**Gap.** CALL-002: recording and participant-consent enforcement, cited transcripts and speaker review, stale proposals, transcript-based risk evidence, current-access playback, retention, local derivatives and confirmed provider deletion, original buyer-walk steps, provider qualification and state-specific legal qualification remain unproved. Dialing authority remains CALL-001; the complete cross-product steps remain with BOUNDARY-001’s named receiving clauses.

### Sales management

#### REPORT-001 — Sales dashboards and saved reports

Core · target · **done** · Cites BASE-ROLE-001, BASE-DATA-001

**Requirement.** Managers and reps view pipeline value/count by pipeline/stage/owner, won/lost reasons, revenue, conversion, win rate, stage age, sales cycle, rep activities, task completion, sequence replies and bookings. Save, share and export filtered/grouped reports with period, timezone, source fields, definitions, currency, missing data and freshness disclosed. Drill-through reconciles aggregates to authorized deals and activities; access changes cannot leak hidden amounts through totals. Historical snapshots preserve their definition and distinguish late-arriving data from the original measured result. REPORT-002 composes these reports into shared, filtered and scheduled dashboards. Before sequence reports ship, they must show SEQUENCE-002's delivered, reply, meeting and stage/revenue measures separately and never count an open as success. Today follow-up outcomes measure reviewed single scheduled messages (OUT-009), with SEQUENCE-002's delivered, genuine reply, meeting and stage/revenue measures counted separately; an inferred open never counts as success and an automatic reply never counts as a reply. The installation owner administers the sharing of every report until TEAM-005, and until roles exist every full operator reads every record while a collaborator sees only their grants. SEQUENCE-001 inherits enrollment-level sequence reply reports; TEAM-005 inherits manager team scope, team sharing of reports and restricted-seller totals; RECORD-016 inherits grouping by contact, lead, company and custom-object owners with "Unassigned"; CALL-001 inherits provider call activity in rep activities; REPORT-002 inherits dashboard composition.

**Acceptance.**
1. Build and save a US monthly report for two pipelines containing won/lost/open deals and rep activities, reconcile every total and reason by drill-through, export and reopen it after access revocation and late evidence.

**Evidence.** `src/core/features/analytics/sales-report.ts`; `src/core/features/analytics/sales-population.ts`; `src/core/features/analytics/sales-measures.ts`; `src/core/features/analytics/sales-access.ts`; `src/core/features/analytics/report-shares.ts`; `src/core/features/analytics/native-sources.ts`; `migrations/core/0052_report_shares.sql`; `newtests/t096/report-disclosure.test.ts`; `newtests/t096/browser-sales-report.ts`; `newtests/t096/sales-report-archive.ts`; `docs/retained-verification/REPORT-001/`
**Gap.** None.

#### REPORT-002 — Saved dashboard tiles and filters

Core · target · **partial** · Cites BASE-ROLE-001, BASE-DATA-001

**Requirement.** A manager composes a dashboard from saved REPORT-001 reports and FORECAST-001 forecast views as up to 24 tiles: chart, table, single number or forecast against quota. The tiles sit in a grid that reflows on a phone (MOBILE-001). Dashboard filters apply to every tile that has the field: owner, team, pipeline, a date range in the workspace's US timezone, and any shared report field. A tile that cannot take a filter says so on the tile instead of silently showing unfiltered data. REPORT-002 inherits REPORT-001's dashboard composition: each report tile is a saved, versioned REPORT-001 definition that keeps its disclosed period, timezone, definitions, source fields, currency, missing data and freshness, opens REPORT-001's drill-through under the viewer's access, and shows late-arriving evidence beside a saved result.

**Acceptance.**
1. As a manager, build a dashboard with at least four tiles: open pipeline by stage across two pipelines, won/lost reasons this quarter, activities by rep, and forecast against quota.
2. Delete one source report and see an unavailable tile.
3. Apply owner, team, pipeline, date and shared-field filters; each unsupported filter is disclosed on the tile and each supported tile drills to its saved report definition with period, timezone, fields, currency, missing data and freshness.
4. Late evidence appears beside the saved result and the grid reflows on a phone; the dashboard holds no more than 24 tiles.

**Evidence.** `src/core/features/dashboards/`; `migrations/core/0053_dashboards.sql`; `newtests/t096/report-disclosure.test.ts`; `newtests/t096/dashboard-access-proof.ts`; `newtests/t096/dashboard-archive.ts`; `newtests/t096/forward-upgrade.test.ts`; `tests/core/source-onboarding.test.ts`; `docs/retained-verification/REPORT-002/`; `src/core/features/dashboards/read-fences.ts`; `newtests/t096/dashboard-backend-proof.ts`
**Gap.** Nine-tile composition, viewer-fenced figures/drill rows, Owner/Pipeline/US date/Region filters, named/workspace sharing, personal defaults, unavailable/error/no-value/late evidence, PDF and tile CSV, versioned custody, paused restore and erasure are implemented. TEAM-005 inherits team filter/sharing/default/restricted sellers; RECORD-016 later owner kinds; NOTIFY-003 the later delivery model. Owner-chosen Dashboard ready routing and separately audited owner enablement send one generic Slack notice and authenticated link per occurrence/channel; replay, rate limits, failure/retry, held uncertainty and non-resuming safety suspension are proven. Email remains paused: the relay rejects attachments and no system notification sender exists; weekly recipient-specific email, next-send email revocation, email attempts and email retry/uncertain behavior remain gaps. PDF rejects text outside WinAnsi. Live forecasts apply the workspace calendar day and shared-field bindings; saved forecasts keep their original UTC definition and measured result. Every composed response rechecks its original dashboard, saved sources and permitted source rows after the final metadata read. Real team roles, audiences/defaults and restricted sellers remain TEAM-005; daily/weekly/monthly recipient-specific email and its revocation, failure, uncertainty and no-resend provider proof remain blocked on the system sender and attachment transport. No real provider delivery or release acceptance is claimed.

#### REPORT-003 — Dashboard sharing and defaults

Core · target · **partial** · From REPORT-002 · Cites BASE-ROLE-001, BASE-DATA-001

**Requirement.** A dashboard is private, shared with named users or teams to view or edit, or shared workspace-wide, under TEAM-005. Each viewer's tiles, totals and drill-through are computed from the records and fields that viewer may see now, labeled `limited to your access`, with no count or sum of hidden records. Each user picks a default dashboard that opens from Reports; an administrator can set a team default that a user can override. Today the installation owner administers dashboard sharing and schedules. Full operators read every workspace record; collaborators read only their current grants. TEAM-006 inherits REPORT-002's Team filter, team sharing, administrator team default with a personal override, and restricted-seller dashboards computed only from permitted records and fields, with no hidden count. RECORD-022 inherits the Owner filter for contacts, leads, companies and custom objects; today it applies to deal owners, activity authors and task assignees, with a not-applied note where no owner exists. NOTIFY-003 inherits the queued, sent, failed and uncertain per-recipient delivery model, retaining these versioned schedules and the existing Slack transport's failure and uncertain holds.

**Acceptance.**
1. Apply owner, team and date-range filters, share it with the sales team and set it as the team default.
2. Sign in as a restricted rep and verify that the same dashboard opens by default and shows only totals that reconcile with that rep's permitted drill-through, with no hidden count.
3. Share privately, by named user/team or workspace to view/edit, then revoke; every figure, drill row and default applies current access with no hidden count or sum.

**Evidence.** `src/core/features/dashboards/`; `migrations/core/0053_dashboards.sql`; `newtests/t096/report-disclosure.test.ts`; `newtests/t096/dashboard-access-proof.ts`; `newtests/t096/dashboard-archive.ts`; `newtests/t096/forward-upgrade.test.ts`; `tests/core/source-onboarding.test.ts`; `docs/retained-verification/REPORT-002/`; `src/core/features/dashboards/read-fences.ts`; `newtests/t096/dashboard-backend-proof.ts`
**Gap.** Nine-tile composition, viewer-fenced figures/drill rows, Owner/Pipeline/US date/Region filters, named/workspace sharing, personal defaults, unavailable/error/no-value/late evidence, PDF and tile CSV, versioned custody, paused restore and erasure are implemented. TEAM-005 inherits team filter/sharing/default/restricted sellers; RECORD-016 later owner kinds; NOTIFY-003 the later delivery model. Owner-chosen Dashboard ready routing and separately audited owner enablement send one generic Slack notice and authenticated link per occurrence/channel; replay, rate limits, failure/retry, held uncertainty and non-resuming safety suspension are proven. Email remains paused: the relay rejects attachments and no system notification sender exists; weekly recipient-specific email, next-send email revocation, email attempts and email retry/uncertain behavior remain gaps. PDF rejects text outside WinAnsi. Live forecasts apply the workspace calendar day and shared-field bindings; saved forecasts keep their original UTC definition and measured result. Every composed response rechecks its original dashboard, saved sources and permitted source rows after the final metadata read. Real team roles, audiences/defaults and restricted sellers remain TEAM-005; daily/weekly/monthly recipient-specific email and its revocation, failure, uncertainty and no-resend provider proof remain blocked on the system sender and attachment transport. No real provider delivery or release acceptance is claimed.

#### REPORT-004 — Dashboard export and scheduled delivery

Core · target · **partial** · From REPORT-002 · Cites BASE-ROLE-001, BASE-DATA-001

**Requirement.** A dashboard exports as PDF, with CSV per tile. It can be scheduled for email delivery daily, weekly or monthly in the workspace timezone, and to an authorized Slack channel (INTEGRATE-005). Each email recipient's copy is rendered under that recipient's own access at send time, and delivery attempts show queued, sent, failed or uncertain states as under NOTIFY-003. Tile definitions, filters, shares and schedules are versioned and portable (DATA-003). A deleted or inaccessible source report shows as unavailable on its tile. INTEGRATE-005 carries only a generic dashboard-ready notice and authenticated link. No PDF, CSV, image, count or sum goes to a Slack channel; the signed-in viewer renders the dashboard under their current access. Slack is a separate destination under ct's 22 October 22:40Z ruling: the installation owner may explicitly enable a saved schedule version for a channel that chose Dashboard ready, regardless of its email recipients. Every new schedule version, restore, reconnect or destination safety suspension leaves Slack paused; it never auto-resumes or replays historical notices. The Worker-native PDF writer supports WinAnsi text and explicitly refuses characters outside that repertoire rather than corrupting an export.

**Acceptance.**
1. INTEGRATE-005 carries only a generic dashboard-ready notice and authenticated link.
2. No PDF, CSV, image, count or sum goes to a Slack channel; the signed-in viewer renders the dashboard under their current access.
3. Schedule a weekly email to the manager and the rep and verify each received copy matches its recipient's access.
4. Export PDF and per-tile CSV; retain versioned definitions, filters, shares and schedules through archives.
5. Explicitly enable a saved Slack schedule version independently from email; a new version, restore, reconnect or destination safety suspension leaves it paused, with no historic replay or auto-resume.

**Evidence.** `src/core/features/dashboards/`; `migrations/core/0053_dashboards.sql`; `newtests/t096/report-disclosure.test.ts`; `newtests/t096/dashboard-access-proof.ts`; `newtests/t096/dashboard-archive.ts`; `newtests/t096/forward-upgrade.test.ts`; `tests/core/source-onboarding.test.ts`; `docs/retained-verification/REPORT-002/`; `src/core/features/dashboards/read-fences.ts`; `newtests/t096/dashboard-backend-proof.ts`
**Gap.** Nine-tile composition, viewer-fenced figures/drill rows, Owner/Pipeline/US date/Region filters, named/workspace sharing, personal defaults, unavailable/error/no-value/late evidence, PDF and tile CSV, versioned custody, paused restore and erasure are implemented. TEAM-005 inherits team filter/sharing/default/restricted sellers; RECORD-016 later owner kinds; NOTIFY-003 the later delivery model. Owner-chosen Dashboard ready routing and separately audited owner enablement send one generic Slack notice and authenticated link per occurrence/channel; replay, rate limits, failure/retry, held uncertainty and non-resuming safety suspension are proven. Email remains paused: the relay rejects attachments and no system notification sender exists; weekly recipient-specific email, next-send email revocation, email attempts and email retry/uncertain behavior remain gaps. PDF rejects text outside WinAnsi. Live forecasts apply the workspace calendar day and shared-field bindings; saved forecasts keep their original UTC definition and measured result. Every composed response rechecks its original dashboard, saved sources and permitted source rows after the final metadata read. Real team roles, audiences/defaults and restricted sellers remain TEAM-005; daily/weekly/monthly recipient-specific email and its revocation, failure, uncertainty and no-resend provider proof remain blocked on the system sender and attachment transport. No real provider delivery or release acceptance is claimed. the managed mail relay cannot carry PDF/CSV attachments and Orbit has no system notification sender for active operators or collaborators. Email stays paused with no outbound. Weekly recipient-specific email copies, next-send email revocation, queued/sent/failed/uncertain email attempts and email retry/uncertain behavior remain unproven.

#### FORECAST-001 — Weighted forecasts, quotas and revenue schedules

Core · target · **partial** · Cites BASE-ROLE-001, BASE-AUDIT-001

**Requirement.** Managers set stage probabilities, forecast categories, per-rep/team monthly or quarterly USD quotas and revenue schedules for one-time and recurring deal lines. Forecasts separate open unweighted value, weighted expected value, committed/best-case/pipeline, closed-won bookings, recurring revenue and quota attainment. Inputs and overrides retain actor, reason, timestamp and an as-of snapshot; stale or missing close dates/probabilities are visible, and sales forecast never claims to be recognized accounting revenue. Weighted value is amount times reviewed probability, independent of engagement score. Until TEAM-005 ships team roles and membership, the installation owner acts as forecast administrator and reviews stage inputs, deal overrides, schedules and per-rep monthly or quarterly quotas. Current full operators may read forecasts; collaborators have no forecast access. TEAM-006 inherits real team quota membership, team-scoped access and the rep/team quota comparison in this acceptance. QUOTE-001 inherits product/quote-line linkage and its schedule comparison. These inheritances do not remove one-time or recurring schedules for current deals. Every saved as-of snapshot retains its original inputs and values; privacy erasure withdraws an affected snapshot in full and leaves unrelated snapshots unchanged.

**Acceptance.**
1. Create USD 10,000 at 30% and USD 20,000 at 60%, require USD 15,000 weighted total, apply a documented override and close one won; compare rep/team quota attainment, recurring schedule and preserved prior-period snapshot.

**Evidence.** `src/core/features/forecast/`; `migrations/core/0048_forecasts.sql`; `newtests/t096/browser-journeys.test.ts`; `newtests/t096/forward-upgrade.test.ts`; `docs/retained-verification/FORECAST-001/`
**Gap.** Unasserted in the carried evidence: weighted total USD 15000; documented override; won close; rep quota attainment; team quota attainment; recurring schedule; prior-period snapshot preserved. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

#### QUOTE-001 — Products, quotes and signatures

Core · target · **missing** · Cites BASE-ROLE-001, BASE-DATA-001 · Register R-11

**Requirement.** Reps maintain products and price books and create versioned deal quotes with quantities, USD unit prices, discounts, explicit US sales-tax treatment, expiration and approval thresholds. Review the exact proposal and recipient before sharing; the customer receives a hosted quote page and a PDF of exactly the approved version, with an optional Stripe or Nectar payment link when the quote says so; DocuSign handles signature envelopes and a signed or declined outcome returns to the deal without silently marking an unsigned quote won. Approved versions, signers, provider IDs and signed-document links remain attributable and portable. Stripe/Nectar and QuickBooks Online/Xero receive only a reviewed billing/accounting handoff, preventing duplicate customers or invoices. Quote versions, dates and prices become AGENT-002 risk evidence, so a quote that contradicts a recorded commitment or call is a cited conflict. It carries the signed-quote step of BOUNDARY-001's US buyer walk: the walk's USD deal is quoted with explicit US sales-tax treatment, DocuSign holds the signature envelope, and an unconfigured DocuSign or payment provider appears as unresolved setup; no quote shows as signed without DocuSign's returned outcome. QUOTE-001 inherits FORECAST-001’s product/quote-line linkage and the comparison of those lines’ one-time and recurring USD schedules; current deals already keep their schedules under FORECAST-001. QUOTE-001 inherits INTEGRATE-005’s signed-quote Slack notice, using its fixed allowed fields and authenticated Orbit link. QUOTE-001 inherits INTEGRATE-005’s signed-quote Slack notice, using its fixed allowed fields and authenticated Orbit link. Whichever of BOUNDARY-001's named clauses ships last also walks a US buyer from a USD deal through booking, support context, signed quote, billing/accounting and post-sale Buoy handoff, inspecting the correct product links, ownership boundaries and unresolved provider setup without a substituted mock or a reduced CRM scope.

**Acceptance.**
1. Quote two products with discount and tax disclosure, require manager approval above its threshold, send the approved version through DocuSign, reject an old version and process signed/declined callbacks once; review the resulting billing handoff.
2. As AGENT-002 evidence, contradict a quote date with a logged call and inspect the cited conflict.
3. As the signed-quote step of BOUNDARY-001's walk, quote and sign the walk's USD deal after its support context and inspect the DocuSign link, the signature boundary and an unconfigured provider shown as unresolved setup without a substituted mock.

**Evidence.** None.
**Gap.** No implementation found. No implementation of this complete target flow was found.

### Category integrations and enrichment

#### INTEGRATE-001 — Dial and Calendly bookings

Core · target · **partial** · Cites BASE-ROLE-001, BASE-SECRET-001, BASE-DATA-004 · Register R-11

**Requirement.** An account/contact/deal shows Dial and Calendly booking links and booked/rescheduled/canceled/completed appointments with exact attendee identity, provider ID, times and meeting context. Reps share an appropriate booking link in reviewed outreach; availability, routing and booking-page configuration remain in the booking product. Duplicate/late booking events update one activity and apply reply/booking sequence stops, while ambiguous attendees wait for review. Disconnect and signature failures are visible. It carries the booking step of BOUNDARY-001's US buyer walk: the walk's USD deal shows its Dial and Calendly product links, availability and routing stay in the booking product, and a provider not yet connected or failing appears as unresolved setup, never as a substituted connection. Whichever of BOUNDARY-001's named clauses ships last also walks a US buyer from a USD deal through booking, support context, signed quote, billing/accounting and post-sale Buoy handoff, inspecting the correct product links, ownership boundaries and unresolved provider setup without a substituted mock or a reduced CRM scope.

**Acceptance.**
1. Connect Dial and Calendly, share a reviewed link, book/reschedule/cancel from each provider and inspect the same deal activity and sequence exit; replay and reject a forged callback.
2. As the booking step of BOUNDARY-001's walk, book the walk's USD deal from each provider and inspect its product links, the booking product's ownership of availability and routing, and a disconnected provider shown as unresolved setup without a substituted mock.

**Evidence.** `src/core/features/ingestion/booking-webhooks.ts`; `src/core/features/ingestion/calendly-setup.ts`; `tests/core/source-onboarding.test.ts`
**Gap.** Calendly signed booking ingestion and guided callback registration exist; native Dial links and complete reschedule/completion lifecycle are missing.

#### INTEGRATE-002 — Zoom meetings and preparation

Core · target · **missing** · Cites BASE-ROLE-001, BASE-SECRET-001, BASE-DATA-004 · Register R-11

**Requirement.** Connect Zoom to link the actual meeting URL, attendees, provider meeting ID, recording/transcript permission and completion to a scheduled deal activity. Orbit supplies record-backed meeting preparation and reviewed follow-up; Zoom runs the meeting. Provider unavailable, consent denied, missing transcript and ambiguous participants remain visible. A meeting cancellation stops associated preparation/follow-up work and never cancels unrelated events. It carries the meeting held from the booking on BOUNDARY-001's US buyer walk: Zoom stays the meeting service, and an unconnected Zoom appears as unresolved setup. Whichever of BOUNDARY-001's named clauses ships last also walks a US buyer from a USD deal through booking, support context, signed quote, billing/accounting and post-sale Buoy handoff, inspecting the correct product links, ownership boundaries and unresolved provider setup without a substituted mock or a reduced CRM scope.

**Acceptance.**
1. Connect Zoom, attach an authorized meeting to a deal, open its preparation, finish it and review a cited recap; deny recording permission, replay completion and cancel a second meeting without fabricated context.
2. As part of BOUNDARY-001's booking step, run this on the walk's booked USD deal and inspect the Zoom link, Zoom's ownership of the meeting and an unconnected Zoom shown as unresolved setup.

**Evidence.** None.
**Gap.** No implementation found. No implementation of this complete target flow was found.

#### INTEGRATE-003 — Nectar and Stripe billing context

Core · target · **missing** · Cites BASE-ROLE-001, BASE-SECRET-001, BASE-DATA-004 · Register R-11

**Requirement.** Account and deal records link Nectar and Stripe customers, subscriptions, invoices and payment status using explicitly reviewed identity mappings. Show currency, amount, overdue/paid/canceled/refunded state and source freshness; a billing event is evidence, not automatic proof that a deal is won. Reps hand an approved order to Nectar/Stripe and follow a deep link to collection, with idempotent external references and no duplicate invoice on replay. Orbit neither stores card/ACH credentials nor becomes a billing ledger. It carries the billing step of BOUNDARY-001's US buyer walk: the walk's signed USD quote hands off to Nectar or Stripe, which own collection, and a disconnected billing product appears as unresolved setup. INTEGRATE-003 inherits INTEGRATE-005’s billing Slack notice, using its fixed allowed fields and authenticated Orbit link. Whichever of BOUNDARY-001's named clauses ships last also walks a US buyer from a USD deal through booking, support context, signed quote, billing/accounting and post-sale Buoy handoff, inspecting the correct product links, ownership boundaries and unresolved provider setup without a substituted mock or a reduced CRM scope.

**Acceptance.**
1. INTEGRATE-003 inherits INTEGRATE-005’s billing Slack notice, using its fixed allowed fields and authenticated Orbit link.
2. Link a Stripe test customer and Nectar account to a USD deal, ingest invoice paid/past-due/refund events, replay them and inspect one status timeline; approve a billing handoff and deny a mismatched customer.
3. As the billing step of BOUNDARY-001's walk, hand the walk's signed USD quote to each billing product and inspect its link, the collection boundary and a disconnected provider shown as unresolved setup without a substituted mock.

**Evidence.** None.
**Gap.** No implementation found. No implementation of this complete target flow was found.

#### INTEGRATE-004 — HappyToHelp, Help Scout and Zendesk account context

Core · target · **missing** · Cites BASE-ROLE-001, BASE-SECRET-001, BASE-DATA-004 · Register R-11

**Requirement.** Accounts show authorized ticket summary, severity, status, last update and deep links from HappyToHelp, Help Scout and Zendesk. Sales users may raise or hand off a ticket with reviewed context and see its outcome; support replies and SLA work remain in the support product. Ticket visibility follows both systems' grants, sensitive ticket content is excluded unless specifically authorized, and disconnect or deleted tickets show unavailable state rather than a healthy account inference. It carries the support-context step of BOUNDARY-001's US buyer walk: the walk's account shows each support product's link, support replies and SLAs stay in that product, and a disconnected service appears as unresolved setup rather than a healthy account. Whichever of BOUNDARY-001's named clauses ships last also walks a US buyer from a USD deal through booking, support context, signed quote, billing/accounting and post-sale Buoy handoff, inspecting the correct product links, ownership boundaries and unresolved provider setup without a substituted mock or a reduced CRM scope.

**Acceptance.**
1. Connect each support service, map a customer, open a ticket on its sales account, restrict a ticket and revoke access; verify current visibility and one reviewed handoff with a returned support outcome.
2. As the support-context step of BOUNDARY-001's walk, open the walk's USD account after its booking and inspect each support product link, the support product's ownership boundary and a disconnected service shown as unresolved setup without a substituted mock.

**Evidence.** None.
**Gap.** No implementation found. No implementation of this complete target flow was found.

#### INTEGRATE-005 — Slack notice routing and allowed content

Core · target · **partial** · Cites BASE-ROLE-001, BASE-SECRET-001, BASE-DATA-004 · Register R-11

**Requirement.** The installation owner connects Slack in Settings and chooses bot-member, workspace-internal channels and stage movement, won-deal, due-work and internal-handoff event types. The bot token and app signing secret use Capture's installation-local encrypted credential custody: entered once, verified with `auth.test`, never shown again, exported or logged. TEAM-005 inherits real administrator roles and team-scoped channel and audience rules; until then the installation owner administers Slack. The fixed outbound allowlist is event kind, deal or company display name, stage from and to, owner display name, due date, due-work task type/priority and an authenticated Orbit link. The link contains no token and requires Orbit sign-in. No entry, note, call, meeting, task-note or handoff text, free-text task title, person/lead name, contact email or phone, amount, score, file or AI output enters a channel message. Restricted records and their account-linked people get a generic event notice and authenticated link, with name, owner, stage and date withheld visibly; shared/external channels and channels the bot has not joined are refused at setup and checked again before delivery. The owner-chosen Dashboard ready event has a separate fixed allowlist: event kind plus an authenticated Orbit link only, with no dashboard name, figure, count, PDF, CSV or image, and no dashboard action. It uses the same pre-post channel check, rate limits, uncertainty holds and TEAM-005 audience rules.

**Acceptance.**
1. In Settings connect a bot and generated test-installation signing secret, select eligible channels and event types including Dashboard ready, and refuse an external/nonmember channel.
2. Route a stage event, overdue task and explicitly enabled dashboard-ready schedule, replay them without another message, and inspect only the fixed allowed fields and a token-free link requiring Orbit sign-in.
3. Deliver a generic private-account notice with all identifying details withheld.
4. Choose and deliver Dashboard ready with only event kind and an authenticated link; no name, figure, count, PDF, CSV, image or action appears.

**Evidence.** `src/core/features/slack/`; `migrations/core/0051_slack_notices.sql`; `tests/core/source-onboarding.test.ts`; `tests/support/slack-notices-proof.ts`; `tests/support/slack-actions-proof.ts`; `tests/support/slack-archive-proof.ts`; `docs/retained-verification/INTEGRATE-005/`
**Gap.** Unasserted in the carried evidence: Dashboard-ready event selection; explicit dashboard-ready schedule; token-free authenticated link; dashboard event/link only; no dashboard name/figures/count/PDF/CSV/image/action. Asserted: connected bot identity read back; eligible channel list; external/nonmember channel refused; one stage notice with replay safety; due-work notice; exact allowed content keys; forbidden text absent; private notice has event/link only; private name/owner/stage absent.

#### INTEGRATE-009 — Slack identity and single-use actions

Core · target · **partial** · From INTEGRATE-005 · Cites BASE-ROLE-001, BASE-SECRET-001, BASE-DATA-004

**Requirement.** An audited explicit administrator mapping binds (Slack team, enterprise if present, app, user ID) to an active full Orbit operator, never inferred from email. The first accepted bot notice binds the verified bot app ID. Mappings are visible to their operator, dead after removal/access change/disconnect, and require fresh administrator confirmation after restore. Routes also restore paused, and reconnect replays no old notice or action. Users acknowledge a notice or create an attributed internal task. Incoming actions require the installation's app signing secret and a five-minute timestamp window, the connected Slack team/app/enterprise and user.team_id, configured channel and exact bot-authored message Orbit sent, and an Orbit-issued single-use action ID bound to notice, event, route, record and action kind. Current native access is checked on each action; consumption commits atomically with the task and its Slack-sourced timeline. HTTP acknowledgment is immediate and generic outcomes use response_url without retaining its capability. Unmapped or revoked mappings, foreign teams/channels/messages, replays and removed operators change nothing and receive an explicit refusal. No Slack action approves, edits or sends customer mail.

**Acceptance.**
1. Refuse foreign app/enterprise/user.team_id requests and a mapped operator who lost record access.
2. Changing a Slack timestamp cannot reuse a spent Orbit action ID.
3. Refuse unsigned, stale, unmapped, foreign and revoked actions and removed operators; an authenticated mapped operator acknowledges or creates one internal task with an attributed Slack source and atomic action-id consumption.
4. An acknowledgment never approves/edits/sends mail or accepts an application-proposed handoff; mappings confer no native role, content, delegation or outreach authority.

**Evidence.** `src/core/features/slack/`; `migrations/core/0051_slack_notices.sql`; `tests/core/source-onboarding.test.ts`; `tests/support/slack-notices-proof.ts`; `tests/support/slack-actions-proof.ts`; `tests/support/slack-archive-proof.ts`; `docs/retained-verification/INTEGRATE-005/`
**Gap.** Unasserted in the carried evidence: foreign app refused; foreign enterprise refused; foreign user.team_id refused; lost native access refused; changed timestamp cannot reuse spent action id; failure during action consumption remains atomic; no mail editing; no mail approval; acknowledgment cannot accept proposed handoff; mapping grants no native/content/delegation authority. Asserted: unsigned signature refusal; stale signature refusal; unmapped/foreign/revoked/removed identities leave state unchanged; acknowledgment names operator; task names creator/owner; task retains Slack source attribution.; no customer send from Slack.

#### INTEGRATE-010 — Slack delivery failures and destination safety

Core · target · **partial** · From INTEGRATE-005 · Cites BASE-ROLE-001, BASE-SECRET-001, BASE-DATA-004

**Requirement.** One source event has one durable notice per channel. HTTP 429 respects Retry-After with visible notice/channel status; unaccepted failures remain failed until an administrator retries. Timeouts, connection loss after submission and interrupted claims become uncertain, held for a human to inspect and confirm an observed message timestamp or keep held, never blindly resent. Shared, pending-shared, org-shared, frozen, archived and foreign-context channels are refused. A conversations.info check immediately precedes every post; share/unshare, archive and bot-departure events suspend routing until administrator re-confirmation. Signed safety events deduplicate by event_id. Disconnect and `invalid_auth`, `account_inactive` or `token_revoked` show unresolved setup in Settings and Connected products and visibly pause notices; manual in-app sales work remains available.

**Acceptance.**
1. Suspend a route on a mid-route share/pending-share or bot departure; unsharing never resumes it automatically.
2. Exercise rate-limit then success, unaccepted failure and timeout; inspect visible channel/notice state, bounded known-unsent retry and uncertainty held without a blind resend.
3. Inspect archived, frozen, shared, pending-shared, org-shared, foreign-context and bot-departure refusals before delivery; safety-event replay has one effect and unsharing never resumes a route.
4. Revoke workspace credentials and read unresolved setup with in-app sales work still usable; reconnect replays neither old notices nor old actions.

**Evidence.** `src/core/features/slack/`; `migrations/core/0051_slack_notices.sql`; `tests/core/source-onboarding.test.ts`; `tests/support/slack-notices-proof.ts`; `tests/support/slack-actions-proof.ts`; `tests/support/slack-archive-proof.ts`; `docs/retained-verification/INTEGRATE-005/`
**Gap.** Unasserted in the carried evidence: pending-share suspension; bot departure suspension; shared/pending/org/foreign channel refused before delivery; manual in-app work unaffected; reconnect replays no historic notice; reconnect replays no historic action. Asserted: shared route suspended; unshare remains paused; rate limited state visible; successful retry creates one notice; unaccepted failure remains failed; uncertain claim held without resending; frozen/archived refusal suspends route; safety replay has one effect; unshare never resumes; revoked installation shows unresolved setup.

#### INTEGRATE-011 — Slack portable definitions and deletion

Core · target · **partial** · From INTEGRATE-005 · Cites BASE-ROLE-001, BASE-SECRET-001, BASE-DATA-004

**Requirement.** Along BOUNDARY-001's walk, Slack carries notices for existing signed bookings, logged calls/meetings, accepted internal handoffs, stage moves and the won deal. INTEGRATE-008 inherits the Buoy-handoff notice; QUOTE-001 inherits the signed-quote notice; INTEGRATE-003 inherits the billing notice, each proving its own notice when that step exists. The full buyer journey remains the acceptance of whichever named BOUNDARY-001 clause ships last. Channel routing, event choices, explicit user mappings and delivery/action history round-trip through Records and local archives without credentials; restoring needs fresh credentials. Erasing an underlying contact, company or deal redacts stored notice content and issues tracked chat.delete requests with visible outcomes. Restored pending deletions need fresh administrator confirmation; copies already held cannot be recalled.

**Acceptance.**
1. Round-trip routing, event choices, mappings and delivery/action history through Records and local archives without bot/signing/action credentials; restored mappings/routes remain paused until fresh administrator confirmation.
2. Erase a contact, company and deal, inspect redacted stored notices and separately tracked provider deletion outcomes; restored pending deletes require fresh confirmation.
3. At 1440 and 390 inspect Settings, notice status and unresolved setup; existing booking, call/meeting, handoff and won-deal notices keep allowed fields and authenticated links.

**Evidence.** `src/core/features/slack/`; `migrations/core/0051_slack_notices.sql`; `tests/core/source-onboarding.test.ts`; `tests/support/slack-notices-proof.ts`; `tests/support/slack-actions-proof.ts`; `tests/support/slack-archive-proof.ts`; `docs/retained-verification/INTEGRATE-005/`
**Gap.** Unasserted in the carried evidence: restored pending deletion held for fresh confirmation; Settings/status/unresolved at 1440; Settings/status/unresolved at 390; call/meeting notice; exact allowed field/link safety. Asserted: history portable exactly; bot/signing credentials absent; routing restored paused; mapping provenance portable without authority; no restored action credentials; stored notice content redacted; provider deletion requested; nonempty deletion set has confirmed outcomes; booking notice; won-deal and handoff notices.

#### INTEGRATE-006 — QuickBooks Online and Xero accounting handoff

Core · target · **missing** · Cites BASE-ROLE-001, BASE-SECRET-001, BASE-DATA-004 · Register R-11

**Requirement.** Connect QuickBooks Online and Xero to map customer/product IDs and hand reviewed accepted quotes/orders into invoices while reading invoice and payment status back onto the deal. Preview account/currency, line, discount and sales-tax mappings and reconciliation conflicts. Orbit does not calculate tax filings, post an independent ledger or claim to collect payment; the accounting service owns those records. A retry reuses the approved external reference and never duplicates an invoice. It carries the accounting step of BOUNDARY-001's US buyer walk: the walk's signed USD quote becomes a reviewed QuickBooks Online or Xero invoice, the accounting service owns the ledger and tax filings, and a disconnected service appears as unresolved setup. Whichever of BOUNDARY-001's named clauses ships last also walks a US buyer from a USD deal through booking, support context, signed quote, billing/accounting and post-sale Buoy handoff, inspecting the correct product links, ownership boundaries and unresolved provider setup without a substituted mock or a reduced CRM scope.

**Acceptance.**
1. For both services approve a USD quote-to-invoice handoff, inspect provider lines/tax/identity, receive partial and full payment status and replay a timed-out result without a second invoice.
2. As the accounting step of BOUNDARY-001's walk, hand the walk's signed USD quote to each accounting service and inspect its link, the ledger boundary and a disconnected service shown as unresolved setup without a substituted mock.

**Evidence.** None.
**Gap.** No implementation found. No implementation of this complete target flow was found.

#### INTEGRATE-007 — Mailchimp audience and suppression handoff

Core · target · **partial** · Cites BASE-ROLE-001, BASE-SECRET-001, BASE-DATA-004 · Register R-11

**Requirement.** Sales users preview and hand explicitly consented contacts and selected fields to a Mailchimp audience, with source/basis of consent and stable external IDs. Unsubscribe, permanent bounce and do-not-contact remain the stricter state across both systems; a later sync never silently re-subscribes a stopped person. Mailchimp owns bulk campaigns and marketing automation; Orbit owns individual sales sequences and their outcomes. On BOUNDARY-001's US buyer walk it keeps the marketing boundary: the walk's consented buyer may join a Mailchimp audience, Mailchimp owns campaigns, and a disconnected account appears as unresolved setup. Whichever of BOUNDARY-001's named clauses ships last also walks a US buyer from a USD deal through booking, support context, signed quote, billing/accounting and post-sale Buoy handoff, inspecting the correct product links, ownership boundaries and unresolved provider setup without a substituted mock or a reduced CRM scope.

**Acceptance.**
1. Preview an audience containing subscribed, unknown and stopped contacts; sync only the authorized subset, ingest unsubscribe and replay a prior subscription update; verify no resumed outreach or duplicate subscriber.
2. On BOUNDARY-001's walk, preview the walk's consented buyer for a Mailchimp audience and inspect the Mailchimp link, its campaign ownership and a disconnected account shown as unresolved setup.

**Evidence.** `src/core/features/marketing/`; `src/core/features/settings/connected-products.ts`; `src/core/features/operator/ui/mailchimp-settings.tsx`; `src/core/features/operator/ui/mailchimp-preview.tsx`; `tests/core/launch-suppression.test.ts`; `tests/core/source-onboarding.test.ts`; `tests/evidence/contract/INTEGRATE-007/mailchimp-live-2026-10-27.json`
**Gap.** Remaining: the consent and member ledger is not yet reconciled by a populated DATA-003 export and restore comparison; refusals for a non-owner administering the connection and for a collaborator handing off are not asserted; Settings reads connected before Mailchimp has checked the webhook address; an unchanged member gets no provider read; Orbit shows its webhook address and the owner adds it in Mailchimp (Orbit does not register it), and only a quick tunnel to a loopback harness has received Mailchimp’s calls, not a hosted installation; Mailchimp’s optional webhook signing is not verified, so the unguessable address is the authority; merging contacts does not carry consent or member links to the survivor, which previews as unknown until consent is recorded again; one handoff makes at most 100 provider requests and reports what remains; the installation owner administers the connection until TEAM-005; Mailchimp deletions are sent after Orbit’s accepted changes and on the owner’s confirmation, not by the scheduled Worker run. The third Acceptance sentence, the complete US buyer walk, belongs to whichever BOUNDARY-001 clause ships last and is not met here: INTEGRATE-001, CALL-001 and CALL-002 are partial, and INTEGRATE-002, INTEGRATE-003, INTEGRATE-004, INTEGRATE-006, INTEGRATE-008 and QUOTE-001 are missing.

#### INTEGRATE-008 — Buoy post-sale handoff

Core · target · **missing** · Cites BASE-ROLE-001, BASE-SECRET-001, BASE-DATA-004 · Register R-11

**Requirement.** After a human confirms a won deal, Orbit previews and transfers the approved account/contact identity, purchased products, commercial commitments, sales evidence references and receiving owner to Buoy. A stable handoff ID links the products, records Buoy acceptance or an actionable failure and reconciles replay without duplicate accounts. Only permitted account context flows back; health scores, onboarding playbooks, adoption, renewals and customer-success intervention remain in Buoy. Orbit retains the original sales history and can reopen a sales opportunity without rewriting the success record. It carries the final, post-sale step of BOUNDARY-001's US buyer walk: Buoy receives the walk's won USD deal, and a disconnected Buoy appears as unresolved setup rather than a completed handoff. INTEGRATE-008 inherits INTEGRATE-005’s post-sale Buoy-handoff Slack notice, using its fixed allowed fields and authenticated Orbit link. Its inherited INTEGRATE-005 Buoy notice contains no products, commitments or amounts. The actual reviewed Buoy handoff retains its commitments and evidence; disconnected Slack is unresolved setup. INTEGRATE-008 inherits INTEGRATE-005’s post-sale Buoy-handoff Slack notice, using its fixed allowed fields and authenticated Orbit link. Whichever of BOUNDARY-001's named clauses ships last also walks a US buyer from a USD deal through booking, support context, signed quote, billing/accounting and post-sale Buoy handoff, inspecting the correct product links, ownership boundaries and unresolved provider setup without a substituted mock or a reduced CRM scope.

**Acceptance.**
1. Its inherited INTEGRATE-005 Buoy notice contains no products, commitments or amounts.
2. The actual reviewed Buoy handoff retains its commitments and evidence; disconnected Slack is unresolved setup.
3. Close an authorized USD deal won, preview and approve its Buoy handoff, inspect the linked receiving account/owner and acceptance, then replay, revoke access and fail the provider; verify one handoff, visible failure and no customer-success workflow built inside Orbit.
4. As the post-sale step of BOUNDARY-001's walk, hand the walk's won USD deal to Buoy and inspect the Buoy link, Buoy's ownership of customer success and a disconnected Buoy shown as unresolved setup.

**Evidence.** None.
**Gap.** No implementation found. No implementation of this complete target flow was found.

#### ENRICH-001 — Licensed enrichment and change signals

Core · target · **partial** · Cites BASE-ROLE-001, BASE-DATA-004, BASE-AGENT-006, BASE-AGENT-007 · Rules D-1 · Register R-8

**Requirement.** An admin selects licensed sources including Clay and its approved providers, chooses contact/company fields, freshness, schedule and USD spending limits, and previews a multi-provider waterfall. Enrichment adds provenance, confidence, fetched time and a conflict proposal alongside existing customer evidence. Company news, hiring and job changes refresh on schedule; failed or empty provider results remain distinct from verified absence. For an agent, a provider lookup carries external and any provider purchase carries money; filing a reversible field or identity correction carries standard. The company's policy decides these calls and any person review it asks for. Under the held company policy identity and material changes wait for that review. Buying data never makes a person contactable, and erasure/suppression fences prevent re-creation.

**Acceptance.**
1. Configure a Clay waterfall with two permitted providers, preview cost/fields, enrich a company and contact, refresh a verified job change and conflicting phone, exceed budget, fail one provider and erase/replay; no guessed identity, invented value or outreach permission appears.

**Evidence.** `src/core/features/capture/intake.ts`; `src/core/features/capture/proposals.ts`; `tests/core/capture-review.test.ts`
**Gap.** Captured evidence proposes field changes; licensed sources, scheduled news/job signals and enrichment waterfalls are missing.

#### API-001 — Versioned public record API

Core · target · **partial** · Cites BASE-ROLE-001, BASE-INPUT-001, BASE-SECRET-001

**Requirement.** Publish a versioned REST API for permitted contact, company, deal, custom-object, association, note, activity, file (RECORD-018), task, pipeline, report and sequence operations. Admin-issued scoped credentials, pagination, filters, schema errors, rate-limit headers, idempotent writes and optimistic concurrency match native permissions and erasure rules. An INTEGRATE-009 Slack mapping is neither an API nor a delegation credential. It grants no outreach authority, exact-message approval, sequence execution, record sharing or stage/owner/amount changes. The standalone credential resource door is the standalone credential API; credential administration remains a native-session operation. Explicit deal creation adds only the newly created deal to that credential’s permitted records, within the existing bounded record scope.

**Acceptance.**
1. An INTEGRATE-005 Slack mapping is neither an API nor a delegation credential.
2. It grants no outreach authority, exact-message approval, sequence execution, record sharing or stage/owner/amount changes.
3. Create, update and list a scoped deal, then cover the original contacts, companies, custom objects, associations, notes, activities, files, tasks, pipelines, reports and sequences; pagination, exact filters, schema errors, rate limits, idempotency and stale-write conflicts match native permissions.
4. Erase a contact and read API/export absence; Slack mappings and delegation grants never become general API credentials.

**Evidence.** `src/core/features/ingestion/routes.ts`; `src/core/features/delegation/protocol.ts`; `tests/core/source-onboarding.test.ts`; `tests/delegation/authority-regressions.test.ts`; `src/core/features/api/credentials.ts`; `src/core/features/api/routes.ts`; `migrations/core/0065_api_credentials.sql`; `tests/support/api-credentials-proof.ts`; `tests/core/archive-transfer.test.ts`; `tests/core/onboarding-archive.test.ts`; `tests/core/operator-erasure.test.ts`; `newtests/t096/forward-upgrade.test.ts`; `tests/core/contact-erasure.test.ts`
**Gap.** API-001: the remaining original versioned resource surface and complete acceptance journey, outbound subscription security, delivery and replay controls, their custody and erasure, provider security and legal qualification remain unproved. The standalone scoped deal credential journey is asserted; current inbound-source authority remains SIGNAL-009; narrow application delegation remains DELEGATE-001; later resource behavior remains with its named owning clauses.

#### API-002 — Named API credential lifecycle

Core · target · **partial** · From API-001 · Cites BASE-ROLE-001, BASE-INPUT-001, BASE-SECRET-001

**Requirement.** administrators may issue separately named, expiring and immediately revocable API credentials, bound to one installation, an accountable principal, explicit resource operations, permitted records and fields, and a maximum 90-day lifetime. Show a secret once, retain only its verifier and exclude secrets from exports and diagnostics. Recheck current principal and record authority on every request and durable write; credentials cannot approve exact messages, execute customer sends or restore expired approval. Provide versioned pagination, filters, schema errors, rate-limit headers, idempotency and optimistic concurrency across the original resource surface.

**Acceptance.**
1. Issue a named installation/principal credential with explicit operations, records, fields and expiry; show its secret once, keep only a verifier and exclude it from archives and diagnostics.
2. Rotate, expire, revoke during a write and reduce principal/record authority; every denied read/write leaves no effect, and newly created deals enter only the credential’s bounded scope.
3. A credential cannot supply a person’s exact-message approval or revive expired authority.

**Evidence.** `src/core/features/ingestion/routes.ts`; `src/core/features/delegation/protocol.ts`; `tests/core/source-onboarding.test.ts`; `tests/delegation/authority-regressions.test.ts`; `src/core/features/api/credentials.ts`; `src/core/features/api/routes.ts`; `migrations/core/0065_api_credentials.sql`; `tests/support/api-credentials-proof.ts`; `tests/core/archive-transfer.test.ts`; `tests/core/onboarding-archive.test.ts`; `tests/core/operator-erasure.test.ts`; `newtests/t096/forward-upgrade.test.ts`; `tests/core/contact-erasure.test.ts`
**Gap.** API-001: the remaining original versioned resource surface and complete acceptance journey, outbound subscription security, delivery and replay controls, their custody and erasure, provider security and legal qualification remain unproved. The standalone scoped deal credential journey is asserted; current inbound-source authority remains SIGNAL-009; narrow application delegation remains DELEGATE-001; later resource behavior remains with its named owning clauses.

#### API-003 — Outgoing webhooks and safe replay

Core · target · **partial** · From API-001 · Cites BASE-ROLE-001, BASE-INPUT-001, BASE-SECRET-001

**Requirement.** Administrators may register HTTPS outbound-webhook endpoints after ownership challenge. Reject embedded credentials, non-HTTPS endpoints, local and private destinations, metadata services and redirects; revalidate resolved destinations on each attempt to prevent DNS rebinding. Send only explicitly subscribed, currently permitted fields. Sign the exact body with a per-subscription rotating secret, timestamp and stable event identity; support receiver replay protection, bounded retries, dead-letter history and audited manual replay with the same event identity. Restore subscriptions paused and require fresh authority. Provider security and legal qualification remain explicit gaps.

**Acceptance.**
1. Subscribe an owned endpoint and verify signed, stable-identity change/outcome events, signature rotation, receiver replay protection, bounded retry, dead-letter history and audited manual replay.
2. Refuse embedded credentials, insecure/local/private/metadata destinations, rebinding and redirects; each attempt rechecks destination and current permitted fields.
3. Restore subscriptions paused pending fresh authority; erase while delivery is queued and inspect the resulting field exclusion and separately tracked deletion outcomes.

**Evidence.** `src/core/features/ingestion/routes.ts`; `src/core/features/delegation/protocol.ts`; `tests/core/source-onboarding.test.ts`; `tests/delegation/authority-regressions.test.ts`; `src/core/features/api/credentials.ts`; `src/core/features/api/routes.ts`; `migrations/core/0065_api_credentials.sql`; `tests/support/api-credentials-proof.ts`; `tests/core/archive-transfer.test.ts`; `tests/core/onboarding-archive.test.ts`; `tests/core/operator-erasure.test.ts`; `newtests/t096/forward-upgrade.test.ts`; `tests/core/contact-erasure.test.ts`
**Gap.** API-001: the remaining original versioned resource surface and complete acceptance journey, outbound subscription security, delivery and replay controls, their custody and erasure, provider security and legal qualification remain unproved. The standalone scoped deal credential journey is asserted; current inbound-source authority remains SIGNAL-009; narrow application delegation remains DELEGATE-001; later resource behavior remains with its named owning clauses.

### Mobile, portability and operation

#### MOBILE-001 — Sales on mobile and desktop

Core · target · **partial** · Cites BASE-ACCESSIBILITY-001, BASE-ACCESS-002 · Register R-3, R-4, R-5

**Requirement.** At 1440px desktop and 390px phone widths, sellers can search customers, inspect full deal/activity history, work due tasks, change stage, log/call, compose and send new one-to-one email and replies including reply all (OUT-017, OUT-019) under the same exact-message approval, review/send approved outreach and inspect current sync/send failures with keyboard and assistive-technology support. Native iOS and Android apps add push reminders, permitted contact capture and offline notes/tasks with explicit pending/conflict states; offline capture cannot queue an unreviewed external message or show unsynced changes as committed. A revoked session or device loses private data and sending authority.

**Acceptance.**
1. Use the same realistic USD account on desktop, 390px web, iOS and Android; complete task/call/note/stage journeys and exact-message journeys for a new one-to-one email, a reply all and an approved outreach, lose network mid-edit, resolve a conflict, receive push and revoke the device without stale sends.

**Evidence.** `tests/e2e/operator.spec.mjs`; `tests/delegation-browser/viewport.test.ts`; `newtests/t096/report-disclosure.test.ts`
**Gap.** Responsive native web journeys exist; native mobile apps, offline conflict handling, push reminders and phone composing under OUT-017/OUT-019 are missing.

#### DATA-003 — Full-target portability, privacy and audit

Core · target · **partial** · Cites BASE-DATA-001, BASE-DATA-003, BASE-AUDIT-001

**Requirement.** Complete product exports include custom schemas/relationships, multi-pipeline definitions/history, tasks/recurrence, workflow and sequence definitions/enrollment/outcomes, call/transcript evidence, quotes, forecast snapshots/quotas, integration identities/provenance, files and their versions with SHA-256 digests (RECORD-018) and agent decisions. Restore validates integrity into eligible empty data, preserves customer history but pauses external work until fresh authorization and review; it never replays messages, charges or calls. Erasure covers local evidence/derivatives and tracks required provider-deletion requests separately; downloaded archives and already sent external content cannot be recalled. Export permission is independently enforced and external costs are visible in USD. The baseline applies to every currently supported category, including custom fields and relationships, pipelines and movement history, recurring tasks, saved reports, reviewed forecasts and immutable forecast snapshots, reviewed form submissions and spam, capture/proposals, and agent handoff decisions. Before shipping, TEAM-005; RECORD-014/016/017/018; MIGRATE-001–003; CAPTURE-010–012; FORM-001; OUT-013–020; NOTIFY-003; SEQUENCE-001–003; AUTO-001–002; CALL-001–002; REPORT-001–002; FORECAST-001; QUOTE-001; INTEGRATE-001–008; ENRICH-001; API-001; MOBILE-001; OPS-001; and AGENT-001–004 inherit these same export, integrity, erasure, anonymized audit, declared external-deletion and fresh-authority obligations for each added record and derivative. Existing subsets remain covered now; future file versions must round-trip identical bytes and SHA-256 digests. INTEGRATE-005 adopts definition-only Slack routing/mapping portability, fresh administrator confirmation after restore, excluded bot/signing/action credentials and tracked provider chat.delete on erasure. Restored pending deletions are held for fresh administrator confirmation; copies already held cannot be recalled. INTEGRATE-005 adopts definition-only Slack routing/mapping portability, fresh administrator confirmation after restore, excluded bot/signing/action credentials and tracked provider chat.delete on erasure. Repeat this journey for each target feature before it ships, including its required provider-deletion requests and separately confirmed outcomes, without claiming recall of downloads or already sent content.

**Acceptance.**
1. Restored pending deletions are held for fresh administrator confirmation.
2. Populate every currently supported category, export through authenticated HTTP, restore into empty product data, export again and reconcile complete content digests and anonymous audit; refuse unauthorized export and show that credentials, sessions, collaborator/publication/agent authority and scheduled dispatch approval do not travel.
3. Erase a contact and inspect every current read/search/report/AI/export and replay fence.

**Evidence.** `tests/core/capture-data.test.ts`; `tests/support/current-sales-data.ts`; `tests/support/current-sales-archive.ts`; `tests/support/current-sales-local.ts`; `scripts/installer/portability-policy.mjs`; `newtests/t096/forms-native.test.ts`; `tests/core/crm-import-erasure.test.ts`
**Gap.** Unasserted in the carried evidence: restored pending Slack deletions held. Asserted: each current table populated; part content digests match; all category content digests reconcile; anonymous audit retained; export independent permission refusal; credentials excluded; source sessions unusable; collaborator authority renewed; publication authority withdrawn; agent authority unusable; scheduled approval withdrawn; current serialized data has no erased identity; direct public record absence; report source inaccessible; replay cannot recreate erased capture; old export withdrawn; audit references anonymized; contact/company/opportunity search contains no erased private value; AI preview contains no erased private value.

#### OPS-001 — Owned operation and explicit provider failures

Core · target · **partial** · Cites BASE-SIGNIN-001, BASE-INSTALL-001, BASE-OPS-002, BASE-SECRET-001 · Register R-1, R-2

**Requirement.** When an administrator enables it, users also sign in with Google Workspace or Microsoft 365 (Microsoft Entra ID) through OpenID Connect. Only an invited, active user whose provider-verified email matches their Orbit identity signs in. The administrator may require provider sign-in for the workspace's email domain. For a required-domain non-owner, only the selected identity provider admits sign-in; a magic link or email recovery cannot create a session. Owner email recovery and unrestricted-domain magic links remain available. Each connector declares fields sent, scopes, credential custody, expected costs, freshness and disable/reconnect controls before activation. Provider apps, tenant approvals, recording consent, US sending requirements, native distribution and provider agreements are tracked setup/engineering obligations. An optional provider failure leaves authorized manual CRM work usable with honest unavailable states; it never fabricates a successful sync, call, forecast or send. The INTEGRATE-005 connector declares chat:write, channels:read, groups:read for private channels and signed Interactivity/Events callbacks, never users:read.email. User-deactivation subscriptions require users:read. It declares the fixed allowed fields and installation-local encrypted token/secret custody. Membership can change between checks and a newly linked organization may see channel history; pre-post checks and safety events suspend routing. Disable and reconnect replay no old notice or action.

**Acceptance.**
1. The INTEGRATE-005 connector declares chat:write, channels:read, groups:read for private channels and signed Interactivity/Events callbacks, never users:read.email.
2. User-deactivation subscriptions require users:read.
3. It declares the fixed allowed fields and installation-local encrypted token/secret custody.
4. Membership can change between checks and a newly linked organization may see channel history; pre-post checks and safety events suspend routing.
5. Disable and reconnect replay no old notice or action.
6. Install an empty edition through the supported CLI, sign in, enable Google and Microsoft sign-in and sign in with each as an invited user while an uninvited and an unverified address are refused, configure one mail provider, revoke it, restart and upgrade with populated data; inspect credential-free diagnostics, working manual records and preserved audit, then reconnect without replaying customer actions.

**Evidence.** `src/core/features/identity/accounts.ts`; `src/core/features/identity/domain-policy.ts`; `src/core/features/identity/store.ts`; `tests/core/provider-redirects.test.ts`; `tests/support/sign-in-domains.ts`; `tests/delegation-browser/records-layout.test.ts`
**Gap.** Implemented first slice: installation-owner per-domain requirements on the linked OIDC provider; atomic active full-operator and matching verified-email admission; policy, operator and linked-provider fences on subsequent requests; an uninvited or unverified identity is refused. The existing `/auth/oidc/auth/callback` remains unchanged. Required domains fence non-owner email sessions while owner email recovery and unrestricted-domain magic links remain available. Policy and refused sign-in screens are exercised at 1440 and 390. Direct Google Workspace/Microsoft Entra account proof and the remaining operational, connector and mobile surface remain gaps.

### Honest boundaries

#### BOUNDARY-001 — Separate products and US-first delivery

Core · target · **partial** · Cites BASE-DATA-004

**Requirement.** The RunEditRun product links are [Envelope](https://github.com/just-every/run-envelope) (small-business payroll), [Pegboard](https://github.com/just-every/run-pegboard) (work and project management) and [Porthole](https://github.com/just-every/run-porthole) (observability). These are product links without a capability claim. Orbit owns the complete sales CRM job, including calling, sales sequences, quoting, forecasts, automation and native mobile. It does not become a marketing CMS/ads-attribution suite, customer-success platform, support inbox, booking engine, payment processor, lender, accounting/tax ledger, PSTN carrier or signature trust service. Buyers reach those jobs through Buoy, HappyToHelp/Help Scout/Zendesk, Dial/Calendly, Nectar/Stripe, Mailchimp, QuickBooks Online/Xero, Twilio/Aircall and DocuSign integrations named above. US-first means USD defaults, US operating timezones and daylight-saving behavior, US business/accounting handoffs and explicit sales-tax treatment on quotes. Broader currency/locale support can extend the model without replacing source monetary values. No difficulty, missing provider approval or pending agreement removes a named CRM obligation. An agent's outreach carries external under the company's policy; record text never grants that authority. Protected prospect-network scraping remains outside Orbit's research job. Today Orbit receives signed Calendly and Cal.com bookings and sends configured Slack sales notices; Settings shows Slack’s connected or unresolved setup state and names every other product above as not available in Orbit, with the job it owns, never as a connection or a substitute. The cross-product buyer walk moves with the clause that ships each step, carried in that clause's own text and acceptance: booking (INTEGRATE-001, with meetings under INTEGRATE-002 and calls under CALL-001 and CALL-002), support context (INTEGRATE-004), signed quote with explicit sales tax (QUOTE-001), billing and accounting (INTEGRATE-003, INTEGRATE-006), handoff notices and marketing audiences (INTEGRATE-005, INTEGRATE-007) and the post-sale Buoy handoff (INTEGRATE-008); whichever ships last runs the complete walk. SEQUENCE-001–003, AUTO-001–002, FORECAST-001, MOBILE-001, ENRICH-001 and AGENT-001–004 inherit the rule that an agent's external outreach follows the company's policy and protected-network scraping remains outside Orbit's research job. INTEGRATE-005’s existing won-deal and internal handoff notices carry no products, commitments or amounts. INTEGRATE-008 inherits the Buoy notice, QUOTE-001 the signed-quote notice and INTEGRATE-003 the billing notice. Slack disconnection is unresolved setup; the last-shipping clause retains the full buyer journey. INTEGRATE-008 inherits the Buoy notice, QUOTE-001 the signed-quote notice and INTEGRATE-003 the billing notice. The complete walk from a USD deal through booking, support context, signed quote, billing/accounting and post-sale Buoy handoff is carried by INTEGRATE-001–008, CALL-001/002 and QUOTE-001, each in its own acceptance, and run end to end by whichever ships last.

**Acceptance.**
1. INTEGRATE-005’s existing won-deal and internal handoff notices carry no products, commitments or amounts.
2. Slack disconnection is unresolved setup.
3. Walk a US buyer's USD deal through every current capability: signed Calendly booking intake onto the deal, a manual call log, and an exact-message review and send, with the USD amount unchanged and no mail sent by a booking, a manual entry or provider setup.
4. In Settings at 1440 and 390, inspect Connected products: Calendly and Cal.com show their real delivery state, and Dial, Zoom, Twilio/Aircall, HappyToHelp/Help Scout/Zendesk, DocuSign, Nectar/Stripe, QuickBooks Online/Xero, Mailchimp and Buoy show as not available in Orbit; Slack shows its actual connected or unresolved setup state with the job each owns, with no substituted connector or mock and no reduced CRM scope.

**Evidence.** `tests/core/source-onboarding.test.ts`; `src/core/features/settings/connected-products.ts`; `src/core/features/operator/ui/connected-products.tsx`; `src/core/features/ingestion/booking-webhooks.ts`; `tests/core/signals-outreach.test.ts`; `tests/support/sales-tasks.ts`; `tests/evidence/contract/BOUNDARY-001/`
**Gap.** Unasserted in the carried evidence: no products/commitments/amounts in Slack won/handoff notices; product states and owned jobs; 1440 browser proof; 390 browser proof; full CRM scope retained. Asserted: Slack disconnected state; signed Calendly intake links deal; manual call log on deal; exact review and send; USD amount unchanged; booking/manual/setup sends no mail; connected/awaiting Calendly and Cal.com state; unavailable products enumerated; Slack actual state; no substituted connector.

### Push further

#### AGENT-001 — Keep the customer graph current with evidence

Core · push-further · **partial** · Cites BASE-AGENT-002, BASE-AGENT-003, BASE-AGENT-005, BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-011 · Rules D-2, D-3

**Requirement.** On an authorized schedule the agent compares allowed inbox/calendar conversations, consented call transcripts, native records and licensed enrichment against the customer graph. It proposes contact/company relationships, stakeholder roles, field corrections, amount/stage/close-date and next-step updates with exact message lines or transcript timestamps, source freshness and observed-versus-inferred labels. Missing decision-makers and contradictory identity remain questions, not invented contacts. Internal reversible graph changes carry standard; a binding commercial decision adds commitment and data leaving the business adds external. The company's policy decides each call, including whether a person accepts, edits or declines a held update; current-state guards remain. Normalization never creates contactability. Every proposal, decline and approved write has an attributable history and can be inspected without granting the agent broader access.

**Acceptance.**
1. Under the held company policy, authorize one account, introduce a job change and contradictory spoken/written commitment, inspect cited proposals and missing decision-maker question, change a field before acceptance and require conflict; accept another, decline one, revoke the source and erase/replay without re-creation.

**Evidence.** `src/core/features/capture/intake.ts`; `src/core/features/capture/proposals.ts`; `tests/core/capture-review.test.ts`; `tests/delegation/brief-handoff.test.ts`
**Gap.** Reviewed provenance-bound capture updates exist; call/enrichment graph maintenance and stakeholder inference are not complete.

#### AGENT-002 — Explain stalled deals and contradictory commitments

Core · push-further · **partial** · Cites BASE-AGENT-002, BASE-AGENT-003, BASE-AGENT-005, BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-011 · Rules D-2, D-3

**Requirement.** The agent joins authorized stage history, actual customer replies, decision-maker coverage, task/quote commitments and call evidence to flag a stalled or risky deal. It shows the exact missed promise, conflicting date/price or absent stakeholder, separates observations from inference, and proposes a concrete next experiment or assigned task. Evidence conflicts remain visible. An agent's reversible CRM update carries standard and a binding commercial decision adds commitment; the company's policy decides whether a manager approves it. Owners can dismiss a finding with a reason or adjust the rule; a confidence score alone cannot move a deal. A missing stakeholder means no contact is recorded in that role on the deal. The agent shows recorded roles as observations; any suggested stakeholder is a labelled inference with its source and its filing as a recorded role carries standard, decided by the company's policy. Risk sources are the stage's last change against its stale interval, genuine customer replies, provider open reports (labelled inferred), recorded stakeholder roles, overdue internal next actions, assigned tasks and unanswered replies, mutual commitments, the next step and logged calls, meetings and notes. The decision-maker role is required by default, and owners change a deal's required roles with an attributed reason. Conflicting recorded dates and prices come from a previewed AI check that sends only those recorded lines; every conflict must quote two lines exactly or the whole result fails, and without AI the check shows as unavailable. Findings, dismissals and approved tasks never change stage, amount, close date, forecast, stakeholders or commitments and send nothing; under the held company policy the owner acts as approving manager until TEAM-005. QUOTE-001 adds quote dates and prices, and CALL-002 transcript evidence, as risk sources before they ship. QUOTE-001 repeats this with contradictory quote dates, and CALL-002 with transcript evidence, before they ship.

**Acceptance.**
1. Use deals with reported opens but no reply, no recorded decision-maker, an overdue promise and task, a deal past its stage's stale interval and contradictory recorded commitment and call dates; inspect precise cited risk, observation apart from inference and next action at 1440 and 390, reject an AI result whose citation is not an exact recorded quote, dismiss one with a reason and reload, adjust a required role and approve another task, then verify under the held company policy no unapproved stage, amount, close date, stakeholder, commitment, forecast or mail change.

**Evidence.** `tests/core/today-brief.test.ts`; `tests/core/launch-reply-authority.test.ts`; `src/core/features/risks/`; `src/core/features/operator/ui/deal-risks.tsx`; `src/core/features/operator/ui/deal-risk-finding.tsx`; `src/core/features/today/promises.ts`; `tests/evidence/contract/AGENT-002/`
**Gap.** Unasserted in the carried evidence: risk display at 1440; risk display at 390. Asserted: opens without reply cited as inferred; missing recorded stakeholder exact quote; overdue promise citation; overdue task citation; stage stall citation; exact contradictory date/call citations; observation distinct from inference; bad AI quote leaves no findings; dismissal reason persists; changed required role persists; reviewed task content read back; held-policy findings change no sales state or mail.

#### AGENT-003 — Follow the next action through to a customer outcome

Core · push-further · **partial** · Cites BASE-AGENT-002, BASE-AGENT-003, BASE-AGENT-005, BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-011 · Rules D-2, D-3

**Requirement.** For an accepted promise, pending quote, unanswered request or meeting, the agent owns an explicit obligation with human owner, due time, source evidence and stop condition. It prepares a cited draft, call agenda or internal handoff. Customer messages carry external and commercial commitments carry commitment; the company's policy decides each call and any exact-revision approval it asks for. After the action it checks authorized replies, bookings and actual deal-stage movement, distinguishing submission from response and advancement. It follows up at the approved cadence until the specified outcome, an explicit human stop or an actionable failure; it never silently marks an unanswered customer promise complete.

**Acceptance.**
1. Under the held company policy, accept a meeting follow-up obligation, review and approve its exact draft, fail then reconcile its provider outcome, receive a reply without stage movement and inspect the still-open advancement goal; advance the deal or stop explicitly and verify all remaining work exits once.

**Evidence.** `src/core/features/today/promises.ts`; `src/core/features/today/plan-actions.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/today-brief.test.ts`; `tests/core/signals-outreach.test.ts`
**Gap.** Brief promises, handoffs and reviewed scheduled outreach exist; durable cross-step quote-to-close outcome supervision is missing.

#### AGENT-004 — Controlled research and workflow evidence

Core · push-further · **partial** · Cites BASE-AGENT-002, BASE-AGENT-003, BASE-AGENT-005, BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-011 · Rules D-2, D-3

**Requirement.** Admins compose research agents from selected CRM evidence, licensed web research and explicitly allowlisted MCP tools. Each run previews allowed records, destinations, fields, tool permissions, USD token/provider budget, schedule and proposed outputs. Structured cited results feed workflow steps or enrichment proposals under the company's policy, with no hidden expansion of data access. Tool content remains untrusted evidence; a company's policy decides external, money and commitment calls from server-computed facts, never from that content. Revocation stops future reads/effects; failed or schema-invalid output remains failed without fabricated repairs.

**Acceptance.**
1. Under the held company policy, configure a selected-account web/MCP research block with a USD cap, preview its data, return structured citations into a proposed workflow task, inject untrusted instructions and revoke access mid-run; verify only allowed evidence leaves, no external message runs and budget/schema failures remain visible.

**Evidence.** `src/core/features/assistance/provider.ts`; `src/core/features/delegation/protocol.ts`; `tests/core/assistance.test.ts`; `tests/delegation/authority-regressions.test.ts`
**Gap.** AGENT-004: configurable selected-account research, licensed adapter qualification, allowlisted MCP tools, exact egress preview, enforceable USD budgets, cited schema-valid workflow proposals, hostile-content and revocation journeys, custody, provider retention and legal qualification remain unproved. Purchased enrichment remains ENRICH-001, workflow execution AUTO-001 and AUTO-002, narrow delegation DELEGATE-001 and expanded roles TEAM-005.

#### AGENT-005 — Licensed research adapters and bounded spend

Core · push-further · **partial** · From AGENT-004 · Cites BASE-AGENT-002, BASE-AGENT-003, BASE-AGENT-005, BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-011 · Rules D-2, D-3 · Register R-8

**Requirement.** administrators may configure selected-account research using OpenAI for structured synthesis, a licensed Brave Search API account for public web discovery, and licensed Clay enrichment only under ENRICH-001’s separately reviewed fields and providers. These selections authorize adapter implementation, not an assertion of entitlement or completed provider qualification. Arbitrary MCP servers are disabled; an administrator may enable a named, authenticated read-only MCP adapter only after documenting its provider license, destination, returned schema and exact tools. Preview the selected records, fields, destinations, schedule, proposed outputs and maximum charge before each approved run definition. The company chooses provider-spend caps in its policy, including no cap; those choices bound provider reservations and retries. Atomically reserve worst-case provider cost before each call, bound tokens and requests, charge retries to the same cap and refuse unknown pricing or exhausted budget. Recheck access before every read, external call and proposed effect; revocation cancels remaining work and invalidates unaccepted output. Results require exact source citations and schema validation; reversible internal proposals and tasks carry standard, and the company's policy decides their disposition. A research definition alone grants no message, purchase or commercial authority; external, money and commitment calls follow the company's policy and recorded resource scope. Protected-network scraping remains outside this research job. Non-US personal data requires recorded purpose and applicable basis with GDPR-style opt-out and erasure handling. Licensing, provider retention and jurisdiction-specific legal qualification remain explicit gaps.

**Acceptance.**
1. Exercise each selected adapter with exact preview and destination assertions, hostile tool instructions, denied records, mid-run revocation, concurrent budget reservations, retries, unknown pricing, invalid schema and unsupported citations; verify visible failure and, under the held company policy, no unapproved external message or commercial change, and no authority restored from an archive.

**Evidence.** `src/core/features/assistance/provider.ts`; `src/core/features/delegation/protocol.ts`; `tests/core/assistance.test.ts`; `tests/delegation/authority-regressions.test.ts`
**Gap.** AGENT-004: configurable selected-account research, licensed adapter qualification, allowlisted MCP tools, exact egress preview, enforceable USD budgets, cited schema-valid workflow proposals, hostile-content and revocation journeys, custody, provider retention and legal qualification remain unproved. Purchased enrichment remains ENRICH-001, workflow execution AUTO-001 and AUTO-002, narrow delegation DELEGATE-001 and expanded roles TEAM-005.

## Agent surface

### Agent surface

#### SURFACE-001 — Registry and complete sales jobs

Agent surface · target · **missing** · From new · Cites BASE-AGENT-002, BASE-AGENT-006, BASE-AGENT-013 · Rules D-3

**Requirement.** The action registry exposes the sales jobs and Core coverage in this table; existing selected-record delegation remains distinct until the complete MCP surface is implemented.

**Acceptance.**
1. Compare the registry’s jobs, Core ids and concrete non-tool reasons with this table, including every split part.
2. Run the Base conformance journey on Orbit’s own customer, deal, message, sequence and integration fixtures.

**Evidence.** None.
**Gap.** No complete MCP registry, class computation and company-policy conformance journey proves this Orbit delta.

#### SURFACE-002 — Internal sales work

Agent surface · target · **missing** · From new · Cites BASE-AGENT-006 · Rules D-3

**Requirement.** Reversible CRM, task, draft and research-finding operations compute standard from their actual effect.

**Acceptance.**
1. Compute standard for a reversible deal move, task, draft, owner-neutral field update and Undo; read item counts.
2. Text or an argument claiming a different class changes none of those computed facts.

**Evidence.** None.
**Gap.** No complete MCP registry, class computation and company-policy conformance journey proves this Orbit delta.

#### SURFACE-003 — Customer and provider exposure

Agent surface · target · **missing** · From new · Cites BASE-AGENT-006 · Rules D-3

**Requirement.** Outside mail, published forms, tracking, exports/shares and provider requests compute external from their destinations.

**Acceptance.**
1. Exercise internal, known, new and public counterparties and exact external recipient counts, including a move that exposes previously internal data.
2. A record claiming that an outside destination is internal leaves its computed class unchanged.

**Evidence.** None.
**Gap.** No complete MCP registry, class computation and company-policy conformance journey proves this Orbit delta.

#### SURFACE-004 — Money and commitments

Agent surface · target · **missing** · From new · Cites BASE-AGENT-006 · Rules D-3

**Requirement.** Paid enrichment and financial actions compute money; binding quotes, signatures and commercial decisions compute commitment independently from ordinary deal estimates.

**Acceptance.**
1. Compute amount, currency and counterparty for enrichment and payment/invoice calls.
2. Compute version, value and counterparty for an accepted quote/signature; a nonbinding forecast estimate stays standard.

**Evidence.** None.
**Gap.** No complete MCP registry, class computation and company-policy conformance journey proves this Orbit delta.

#### SURFACE-005 — Provider person-only steps

Agent surface · target · **missing** · From new · Cites BASE-AGENT-006, BASE-AGENT-008 · Rules D-3

**Requirement.** Provider consent, verification and hosted checkout compute gated from that provider’s actual step.

**Acceptance.**
1. Exercise each declared provider-person step, including a provider response that newly requires it; report provider and step.
2. Use a supported company-credential/API route and apply its classes under the company’s policy.

**Evidence.** None.
**Gap.** No complete MCP registry, class computation and company-policy conformance journey proves this Orbit delta.

#### SURFACE-006 — Access and protective settings

Agent surface · target · **missing** · From new · Cites BASE-AGENT-005, BASE-AGENT-006 · Rules D-3

**Requirement.** Team, membership and record/application grants compute access; protective connection changes compute security.

**Acceptance.**
1. Compute widening/narrowing and people for team, user and grant changes.
2. Compute setting/provider for credential rotation and protective settings; Orbit’s own sales examples retain the Base self-escalation rule.

**Evidence.** None.
**Gap.** No complete MCP registry, class computation and company-policy conformance journey proves this Orbit delta.

#### SURFACE-007 — Irreversible and sensitive data

Agent surface · target · **missing** · From new · Cites BASE-AGENT-006 · Rules D-3

**Requirement.** Erasure computes destructive; regulated data computes sensitive only when the actual permitted content contains that data.

**Acceptance.**
1. Compute affected item count for irreversible contact/file erasure and keep reversible Undo standard.
2. Compute record count and kind for regulated identifiers in an attachment or transcript, while ordinary contact data does not acquire an invented sensitive label.

**Evidence.** None.
**Gap.** No complete MCP registry, class computation and company-policy conformance journey proves this Orbit delta.

#### SURFACE-008 — Running automation

Agent surface · target · **missing** · From new · Cites BASE-AGENT-006 · Rules D-3

**Requirement.** Changing active workflows or provider routing computes live for the affected running service.

**Acceptance.**
1. Compute installation and workflow/route facts on activation and route changes.
2. Changing a draft definition without changing running behavior remains standard.

**Evidence.** None.
**Gap.** No complete MCP registry, class computation and company-policy conformance journey proves this Orbit delta.

#### SURFACE-009 — Saved sales actions under company policy

Agent surface · target · **missing** · From new · Cites BASE-AGENT-007, BASE-AGENT-008 · Rules D-3

**Requirement.** Orbit retains exact content, recipients, attachments, opt-out/tracking state and commercial versions when a policy-held sales action is saved.

**Acceptance.**
1. Under the held company policy approve the exact saved customer message, change one merge field and see a new saved revision needed.
2. Under the all-autonomous company policy the same permitted external and commitment jobs run without a person’s approval, while preserving their truthful actor and exact saved content.

**Evidence.** None.
**Gap.** No complete MCP registry, class computation and company-policy conformance journey proves this Orbit delta.

#### SURFACE-010 — Sales events and handoffs

Agent surface · target · **missing** · From new · Cites BASE-AGENT-003, BASE-AGENT-010 · Rules D-3

**Requirement.** Sales resources and events preserve links between customers, deals, obligations, messages and receiving products.

**Acceptance.**
1. Read each declared sales resource and follow tool links to the changed record.
2. Follow booking, reply, stage, quote and Buoy handoff outcomes by the same event identity across the supported channels.

**Evidence.** None.
**Gap.** No complete MCP registry, class computation and company-policy conformance journey proves this Orbit delta.

#### SURFACE-011 — Sales overview and provider spend

Agent surface · target · **missing** · From new · Cites BASE-AGENT-009, BASE-AGENT-011 · Rules D-3

**Requirement.** The Orbit overview reconciles sales calls, class facts, policy decisions and provider cost with the same fixture week.

**Acceptance.**
1. Reconcile customer messages, binding quotes, financial/provider work and internal task calls by class and decision.
2. Read reserved/actual provider cost, explicit company caps or no cap, and the review/approval/handoff entries the policy actually produced.

**Evidence.** None.
**Gap.** No complete MCP registry, class computation and company-policy conformance journey proves this Orbit delta.

#### SURFACE-012 — Embedded sales agents

Agent surface · target · **missing** · From new · Cites BASE-AGENT-002, BASE-AGENT-007 · Rules D-3

**Requirement.** Embedded graph maintenance, deal-risk, follow-up and research use the same registry and policy decision as the outside specialist.

**Acceptance.**
1. Run AGENT-001 through AGENT-005 against the same records through embedded and outside calls and compare sales state, outcomes and decisions.
2. Under held and all-autonomous company policies, untrusted transcript/mail/tool evidence cannot change class facts, scope or decision rules.

**Evidence.** None.
**Gap.** No complete MCP registry, class computation and company-policy conformance journey proves this Orbit delta.

#### SURFACE-013 — Stranger specialist’s seeded week

Agent surface · target · **missing** · From new · Cites BASE-AGENT-013 · Rules D-3 · Register R-12

**Requirement.** Given only the installation URL, a stranger sales agent completes a seeded week through MCP under two company policies.

**Acceptance.**
1. Under an all-autonomous company policy, link arrivals, update a customer graph, explain a stalled deal, follow a promise, send permitted follow-up and hand a won USD deal to Buoy with no policy wait or refusal.
2. Repeat under the held company policy: standard enters review and each other used class waits for the person the policy names, then runs once on that person’s approval.
3. Compare records, sales outcomes, events, attributions, spend and the overview for both runs; class decisions equal the policy in force.

**Evidence.** None.
**Gap.** No complete MCP registry, class computation and company-policy conformance journey proves this Orbit delta.

## Later

None.

## Field proof register

| ID | Proof | Clauses | State | Date | Receipt |
| --- | --- | --- | --- | --- | --- |
| R-1 | Google Workspace production-app verification and an authorized real tenant journey. | CAPTURE-010, CAPTURE-011, OUT-013, OPS-001 | not run | | |
| R-2 | Microsoft 365 production consent and an authorized real tenant journey. | CAPTURE-010, CAPTURE-011, OUT-013, OPS-001 | not run | | |
| R-3 | Native iOS App Store and Android store approval and distribution receipts. | MOBILE-001 | not run | | |
| R-4 | Human screen-reader review of operator and public journeys. | MOBILE-001, PUBLIC-001, FORM-001 | not run | | |
| R-5 | A dated VPAT accessibility report. | MOBILE-001, PUBLIC-001, FORM-001 | not run | | |
| R-6 | Real mail, inbound routing and managed-relay delivery qualification using an authorized provider account. | OUT-013, OUT-029, CAPTURE-008, NOTIFY-003 | not run | | |
| R-7 | Twilio and Aircall production accounts, consent/legal qualification and provider recording/deletion qualification. | CALL-001, CALL-002, CALL-003 | not run | | |
| R-8 | Licensed Clay, Brave Search and selected enrichment-provider entitlement, retention and jurisdiction qualification. | ENRICH-001, AGENT-005 | not run | | |
| R-9 | Tracking consent and provider/jurisdiction-specific legal qualification. | OUT-016, OUT-021, OUT-022 | not run | | |
| R-10 | Prospect retention, channel authority and jurisdiction-specific legal qualification. | CAPTURE-012, CAPTURE-013, CAPTURE-014 | not run | | |
| R-11 | Production vendor-account qualification for Zoom, Nectar, Stripe, support, Slack, accounting, Mailchimp, DocuSign and Buoy connections. | INTEGRATE-001, INTEGRATE-002, INTEGRATE-003, INTEGRATE-004, INTEGRATE-005, INTEGRATE-006, INTEGRATE-007, INTEGRATE-008, QUOTE-001 | not run | | |
| R-12 | Published client receipts for Claude, ChatGPT, Codex and Copilot MCP use; real Okta/Entra enterprise-managed authorization. | SURFACE-013 | not run | | |
