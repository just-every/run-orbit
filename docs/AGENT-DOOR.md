# Agents in Orbit

This guide is available at `/docs/agents` and `/docs/agent-door`.
Its tool and resource template inventories are generated from the current registry.

Orbit exposes its current agent tools through `/mcp`. Discovery supports MCP
`2026-07-28` and `2025-11-25`. A Business agent acts for a current native person
under the company's signed policy. A token's email address never selects a
person or grants a sales role.

This adoption currently supports CRM reads and edits, cited internal handoffs,
private drafts, native report measurements, exact saved-report deletion, reasoned forecasts
and private Capture address rotation. Customer
sending, scheduling, calling, marketing handoff, provider sync, public-form
activation, access administration and broader erasure are not exposed by this registry.
Use their existing native screens and admission requirements. This is a limited
surface, not completion of Orbit's full agent adoption.

## Prepare a seller's day

Find the permitted company, contact and opportunity. Read immutable signal
metadata, a cited meeting plan and current risks. Save an internal handoff at
its current source and audience revisions, then read it back. An assignee must
be currently eligible; cited evidence must belong to that opportunity's native
context. A collaborator or an unrelated selected target cannot acquire full
seller authority.

Edit a permitted CRM field at its actual revision. Keep deal amount and forecast
estimates separate from payment, legal acceptance and independently observed
customer events. Prepare and revise an exact saved draft, then inspect it. Draft
preparation does not approve, schedule or send a message. Customer-send tools
still need native integration with the aligned company-policy contract.

## Identity and policy

Signed Business settings at `/api/rer/business-settings` bind `owner_id` and team
`id` to existing native `operators.id`. Complete native onboarding first. The
roster adapter does not create sellers, accept collaborator invitations or grant
record access. Once bound, a roster address change does not move the binding to
another person. Current native active status, domain admission and workspace
membership still govern access.

The paired policy roles are Business roles: owner maps to owner, team admin to
editor and team member to no policy role. A locally promoted operator is not a
Business policy editor. Existing selected delegation credentials may use MCP for
their original evidence and handoff scopes; their selected targets, current
client, sponsor and revocation continue to apply. They gain no draft or mail
authority. The existing selected delegation HTTP API remains available during
this adoption with its native selected-consent rules. It has not yet moved to
the shared policy pipeline; shared-door Pause currently governs shared-door
calls. Completing that migration is required before full agent adoption.

Business posts `{policy: "<signed JWS>"}` to `/api/rer/agent-policy`. Successful
adoption returns only `adopted` and the door's class inventory. Missing,
unanswered, expired or blocked policy and Pause refuse agent work. `/agents`
shows current policy and native person approval/review doors. Approval binds the
saved action summary and revision; an agent confirmation is not a person's act.
Spend caps are not enforced by this Base revision. Native quotas and recipient
permission remain separate requirements.

## Existing workflow drafts

The installation owner can call `orbit.workflows.save_draft` with an existing
workflow `id`, its current `source_version` from `GET /api/workflows`,
`name`, `definition` and an idempotency key. Optional `expected_revision`
also checks that native version. The native definition validator and owner
authority apply; a stale source version refuses atomically.

One saved draft computes `standard` with `measure: 1` item. Defining a future
webhook or record action does not execute it. The save creates a draft version
and native audit only: the active definition and its activation authority remain
unchanged. Activation, pause, execution and provider routing are outside this
tool. Under held policy the draft saves immediately with its linked review.
A current company block, revoked agent or non-owner sponsor cannot save or
replay a successful result. Retrying an admitted key adds no version.

The existing managed-owner journey invokes the workflow proof in
`tests/support/agent-workflow-proof.ts`: authenticated MCP save, native readback,
both company policies, the linked review, refusal and replay witnesses, and a
separate native trigger that still executes the old active version. The existing
agent conformance registration also saves and reads back a fresh workflow
through `tests/agent-door/native-journey.mjs`.

## Delete a saved report

Call `orbit.reports.deletion_preview` with the report definition ID. A current
full seller must also be the report owner or installation owner. The preview
returns one report, its saved definition versions, all snapshot identities,
`affectedItemCount` and the exact `revision`. Each report and each saved snapshot
counts as an affected item; definition versions and source lineage belong to
that report's saved scope and are not counted again.

Call `orbit.reports.delete` with the same `id`, the preview's revision as
`review_hash`, and a new `idempotency_key`. `expected_revision` may also carry
that revision. The server computes destructive facts from saved rows and binds
the action to their exact inventory, including sharing and source lineage.
Caller class, count and confirmation fields do not authorize deletion. The
company's policy decides autonomous execution or a named person's approval;
an unanswered destructive class retains the setup-required refusal. A pending
approval changes no native report. Changed scope or current management access
refuses execution. Successful replay returns its retained result and facts
under current authority without deleting again.

This uses the same native deletion action and audit as the HTTP report door.
Native clients can read `GET /api/v2/workspaces/:workspace/operations/reports/:id/deletion-preview`
and supply `reviewHash` to the existing DELETE route. Existing native clients
retain their current management checks. Saved scope is fenced in the deletion
transaction, and both doors retain counts and the reviewed hash in the native
audit. MCP also retains the policy decision, prepared-by agent and person
approvers. No contact, provider copy, independent snapshot or other erasure
operation is added by these tools; broader SURFACE-007 remains unqualified.

## Current tool inventory

| Tool | Scope | Possible classes |
| --- | --- | --- |
| `orbit.assistance.generate` | `drafts:write` | external, sensitive |
| `orbit.assistance.preview` | `drafts:read` | standard, sensitive |
| `orbit.briefs.read` | `briefs:read` | standard |
| `orbit.capture.address_read` | `capture:read` | standard |
| `orbit.capture.address_rotate` | `capture:write` | security |
| `orbit.drafts.create` | `drafts:write` | standard |
| `orbit.drafts.read` | `drafts:read` | standard |
| `orbit.drafts.update` | `drafts:write` | standard |
| `orbit.events.list` | `events:read` | standard |
| `orbit.forecasts.read` | `forecasts:read` | standard, sensitive |
| `orbit.forecasts.update` | `forecasts:write` | standard |
| `orbit.graph.propose` | `graph:write` | standard |
| `orbit.handoffs.read` | `handoffs:read` | standard |
| `orbit.handoffs.upsert` | `handoffs:write` | standard |
| `orbit.meetings.read` | `meetings:read` | standard |
| `orbit.obligations.accept` | `handoffs:write` | standard |
| `orbit.operations.read` | `operations:read` | standard |
| `orbit.records.create` | `records:write` | standard |
| `orbit.records.list` | `records:read` | standard, sensitive |
| `orbit.records.read` | `records:read` | standard, sensitive |
| `orbit.records.update` | `records:write` | standard |
| `orbit.reports.compute` | `reports:write` | standard, sensitive |
| `orbit.reports.delete` | `reports:write` | destructive |
| `orbit.reports.deletion_preview` | `reports:write` | standard |
| `orbit.reports.preview` | `reports:read` | standard, sensitive |
| `orbit.reports.read` | `reports:read` | standard, sensitive |
| `orbit.reports.update` | `reports:write` | standard |
| `orbit.risks.read` | `risks:read` | standard |
| `orbit.signals.list` | `signals:read` | standard |
| `orbit.signals.read` | `signals:read` | standard |
| `orbit.sources.read` | `sources:read` | standard |
| `orbit.workflows.save_draft` | `workflows:write` | standard |

## Current resource template inventory

| Resource template | Name | Scope |
| --- | --- | --- |
| `orbit://drafts/{id}` | Saved customer draft | `drafts:read` |
| `orbit://forecasts/{id}` | Immutable forecast snapshot | `forecasts:read` |
| `orbit://meetings/{id}/plan` | Meeting plan | `meetings:read` |
| `orbit://operations/{id}` | Source-bound handoff | `handoffs:read` |
| `orbit://opportunities/{id}/risks` | Opportunity risks | `risks:read` |
| `orbit://outreach/{id}` | Native delivery receipt | `drafts:read` |
| `orbit://records/{kind}/{id}` | CRM record | `records:read` |
| `orbit://reports/{id}` | Native report snapshot | `reports:read` |
| `orbit://reports/{id}/definition/{version}` | Native report definition | `reports:read` |
| `orbit://signals/{id}` | Immutable signal | `signals:read` |

## Declared non-tool parts

These are the contract’s existing exceptions, not a completed Core coverage map.
Risk never supplies a non-tool reason. Settings actions, server-side mobile jobs
and gated provider handoffs remain eligible for future tools. DATA-001 export
and restore jobs have no blanket import-door exemption and remain unimplemented
by this registry. These declarations grant no authority or provider effect.

| Core clause | Reason | Non-tool part |
| --- | --- | --- |
| `TEAM-001` | installation | The installation authorization model applies to every action; it is not an action itself. |
| `TEAM-003` | installation | The single workspace and its timezone are installation facts. Actions that configure them remain eligible for settings tools. |
| `PUBLIC-001` | screen | The public information page is a screen for a person. |
| `PUBLIC-002` | screen | The interactive fictional demo is a screen for a person, without owner-data actions. |
| `PUBLIC-003` | screen | The installation readiness and unavailable sign-in page is a screen for a person. |
| `PUBLIC-004` | screen | A person completes their own sign-in, proof confirmation and identity-provider screens. |
| `MOBILE-001` | device | Only native device, offline and push behavior is device-only. Server-side sales jobs remain eligible for tools. |
| `OPS-001` | installation | Installation and provider setup facts are not actions. Person-only provider consent remains a gated handoff; provider jobs remain eligible for tools. |
| `BOUNDARY-001` | installation | Product boundaries and the cross-product qualification journey describe the installation; sales and integration actions remain eligible for tools. |
| `RECORD-008` | import-door | CSV import uses the reviewed import door with saved preview, explicit mappings and Apply. |
| `MIGRATE-001` | import-door | HubSpot migration uses the guided migration and import door with authorization and saved review. |
| `MIGRATE-002` | import-door | Pipedrive migration uses the guided migration and import door with authorization and saved review. |
| `MIGRATE-003` | import-door | Salesforce migration uses the guided migration and import door with authorization and saved review. |

## Records and retained outcomes

### Opportunity AI input

`orbit.assistance.preview` reads the exact native opportunity input without
saving a preview or requesting a model. Its `previewHash` hashes that content;
`revision` also binds the configured provider and model. Generation requires
that revision in `source_revision`; clients can additionally supply it as
`expected_revision`. A changed record, evidence set, provider or model requires
a fresh preview.

`orbit.assistance.generate` uses the same generation action as the native
assistance route. Its external facts count one known counterparty: the
installation's configured AI provider. Customer names and stored instructions
cannot make that destination internal. Actual regulated identifier values in
the preview add sensitive facts with a record count; ordinary contact details
and deal estimates do not. Current identifier recognition covers formatted US
Social Security numbers and labeled employer or taxpayer identifiers.

Company policy decides whether generation runs, waits for a person, or is
blocked. The person summary binds feature, provider, model, provider recipient
count, selected contact, exact input hash and cited evidence identities. Approval
rechecks input and native authority before a model request. The retained result
is an unsent draft or current recommendation explanation with cited evidence,
native agent attribution and usage. It never submits customer mail. Replay
retains the outcome without another model request.

Other provider requests and broader exposure qualification remain outside these
tools, including account brief input, record-mail drafting, erasure provider
requests, spending reservations and live-provider qualification.


Resource readers recheck current native visibility and scope. Absent and
restricted CRM records are refused alike. Protected fields actually returned
by the CRM projection add the `sensitive` class. Forecasts returning protected
CRM fields and report measurements derived from those fields carry the same
class; an ordinary count does not become sensitive because unrelated private
fields exist. `orbit.forecasts.read` can select one current `opportunity_id`;
immutable saved snapshots retain their whole original result. Signal and source tools return
metadata, not source signing keys or provider credentials. Outside text is
untrusted and cannot change policy or establish approval.

Native CRM and handoff changes retain agent-for-person attribution in their
activity. Record-update audit rows identify the native record as `{kind,id}`.
Replaying a successful mutation rechecks current sponsor authority, scopes,
Pause and company policy before returning its retained result. Handoff source
and audience revisions still fence the native first write atomically. Forecast overrides retain agent preparer and actual approvers
separately. Native person and agent record changes share stable activity IDs in
the retained event stream, whose readers recheck current access. Native activity
remains in Records archives; installation-bound policy, approvals, door audit,
event cursors and Business mappings stay at the destination. Reapply signed
settings and policy after moving an installation.

The source declaration is `agent-surface.json`; `pnpm exec tsx
scripts/agent-surface.ts` regenerates it from the runtime registry. The Base
runtime copy and the installed CLI are separate pins. The published CLI is
pinned to `@runeditrun/rer` 0.2.93. Its installed
conformance entry runs against the production build in the existing source
verification stage, and normal `rer verify` runs the same harness after the
product checks. Base-delivered clauses are synchronized with `rer door clauses
--write`; existing clause judgments remain unchanged.

The door and Business settings copies refresh from the published release's
source archive with the installed authoring command. A whole-record archive
refresh still needs unavailable ancestry when it crosses an edition migration
(`edition-authoring/edition-migrations.mjs:33–34` in Base). Other recorded pins
retain their history; the door refresh does not claim to migrate them.

The current main contract supplies the aligned SURFACE requirements. Completing
the customer-send and retained delegation integrations, the broader registry and
client-data custody remains necessary for the full agent adoption.

## Rotate an existing private Capture address

A full native operator can read `orbit.capture.address_read`, then supply its opaque
`revision` as `source_revision` to `orbit.capture.address_rotate`, with an
idempotency key. Rotation computes `security` from the current native source,
with setting `private_capture_address`, provider `orbit` and measure 1. The
company policy decides whether it runs, waits for its named person or is blocked.
A pending approval changes nothing. A changed source requires a fresh revision.

This tool changes only the sealed private tag on an already configured address.
It accepts no destination, person, role, grant, provider or confirmation override.
Selected record credentials cannot rotate it. Completed replay returns the same
receipt without another rotation, while current authority and policy still apply.
Captured evidence and proposals remain; mail to the old address stops entering.
Read the new address in Settings → Capture. The address, private tag and forwarding
confirmation are excluded from tool results, retained summaries, audits and archives.
Provisioning and other credential changes are outside this adapter.

## Follow up a completed meeting

`orbit.obligations.accept` is a standard-class call with `handoffs:write` scope.
The current company policy decides it. A full native operator supplies a completed
meeting on an open, owned deal, its current recipient, a named full operator,
a due time, a later stage in the same pipeline and explicit stop conditions.
Acceptance cites the meeting and creates internal work; it approves no customer mail.

The completed meeting's native page offers the same acceptance form. Its full
operator action posts to `/api/v1/obligations`; the opportunity panel reads
`/api/v1/obligations/opportunities/<id>`. A separate reasoned human stop posts
to `/api/v1/obligations/<id>/stop`. These native doors retain the existing
session, current-role and restore fences. A mail failure remains visible with
a link to review the exact saved draft; it never closes the advancement goal.

Pass the returned obligation ID as `obligation_id` to `orbit.drafts.create` to bind
one unsent draft. Use the existing draft read and update calls to prepare exact
content; a person still approves its current revision natively. Cited
`orbit.handoffs.upsert` calls can carry the same `obligation_id`; meeting-plan
next actions accept `obligationId` through the native action door. Native
nonrecurring follow-up tasks on that deal also accept `obligationId`.

The meeting plan read returns its native obligations to full operators. Message
state distinguishes an unsent draft, submitted uncertainty, accepted submission,
definite failure and a verified threaded human response. A provider receipt is
not a customer response, and a response leaves the advancement goal open.
Moving to the named goal stage or explicitly stopping the obligation closes its
remaining work once, with the attributed reason. Pending reminders and approved
scheduled mail stop with it. Restored open obligations stay paused; their data
is history, not authority to dispatch. Contact erasure redacts their evidence.

This bounded path authorizes one approved follow-up. Pending quotes, call
agendas, live consented mailbox connections, broader cadences, agent customer
message dispatch, deal-less obligations and team ownership retain their existing
contract holds and provider prerequisites.

## Cited account graph proposals

`orbit.graph.propose` needs a native selected credential with both
`crm.evidence.read` and `crm.graph.propose`. Existing read and handoff grants do
not acquire this scope. In native consent, select the company, contact, deal and
captured signal explicitly. All records must belong to that company; the signal
must already have a native account association or a held capture proposal for it.
Selected graph credentials can also follow their own value-free `graph.proposed`
notices; other records, approvals and installation events are withheld.
The tool uses `graph:write` and computes standard with one internal proposal call.
Under standard review policy it also enters the Agents review feed; autonomous
policy creates the same pending native proposals. Neither disposition applies a
field correction.

Supply `company_id`, `signal_id`, `job_change` and `close_date` (each with `id`,
`value` and `citation`), and `question`. Each citation contains an exact message
`quote` line and an `observed` or `inferred` label. Close dates use a complete UTC
instant. The result retains the captured signal, item and event identities,
occurred time, source and agent acting for its sponsor. Labels describe the
proposed interpretation; they confer no authority. The fixed question asks who
makes the decision and records no new contact or role, even when acknowledged.

Review each proposal under Review or on the company record. A signed-in person
can accept, edit or decline a field correction; a changed native value refuses
acceptance with a conflict. Accepted proposals apply once and declined proposals
remain declined for that evidence. Source disconnection withdraws pending graph
proposals and refuses new calls and completed replays that would return the
source. Contact erasure removes captured originals and proposals and prevents
replaying the original call from recreating them. Message instructions and caller
class or confirmation claims never change scope, risk or contactability.

`tests/core/managed-owner.test.ts` runs the native-consent MCP and review proof
through `tests/support/agent-door-graph-proof.ts`, covering both company policies,
foreign-account refusal, hostile text, conflict, edited acceptance and terminal
review decisions under each policy. Erasure replay is checked with the source
still connected, including the original call key, a new key and the original
captured mail. Source withdrawal and completed-call read refusal are then checked
under each policy. Scheduled runs, transcripts and licensed enrichment remain
outside this written-evidence tool.
