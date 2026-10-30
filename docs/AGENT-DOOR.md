# Agents in Orbit

Orbit exposes its current agent tools through `/mcp`. Discovery supports MCP
`2026-07-28` and `2025-11-25`. A Business agent acts for a current native person
under the company's signed policy. A token's email address never selects a
person or grants a sales role.

This adoption currently supports CRM reads and edits, cited internal handoffs,
private drafts, native report measurements and reasoned forecasts. Customer
sending, scheduling, calling, marketing handoff, provider sync, public-form
activation, access administration and erasure are not exposed by this registry.
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

## Current tool inventory

| Tool | Scope | Possible classes |
| --- | --- | --- |
| `orbit.briefs.read` | `briefs:read` | standard |
| `orbit.drafts.create` | `drafts:write` | standard |
| `orbit.drafts.read` | `drafts:read` | standard |
| `orbit.drafts.update` | `drafts:write` | standard |
| `orbit.events.list` | `events:read` | standard |
| `orbit.forecasts.read` | `forecasts:read` | standard, sensitive |
| `orbit.forecasts.update` | `forecasts:write` | standard |
| `orbit.handoffs.read` | `handoffs:read` | standard |
| `orbit.handoffs.upsert` | `handoffs:write` | standard |
| `orbit.meetings.read` | `meetings:read` | standard |
| `orbit.operations.read` | `operations:read` | standard |
| `orbit.records.create` | `records:write` | standard |
| `orbit.records.list` | `records:read` | standard, sensitive |
| `orbit.records.read` | `records:read` | standard, sensitive |
| `orbit.records.update` | `records:write` | standard |
| `orbit.reports.compute` | `reports:write` | standard, sensitive |
| `orbit.reports.preview` | `reports:read` | standard, sensitive |
| `orbit.reports.read` | `reports:read` | standard, sensitive |
| `orbit.reports.update` | `reports:write` | standard |
| `orbit.risks.read` | `risks:read` | standard |
| `orbit.signals.list` | `signals:read` | standard |
| `orbit.signals.read` | `signals:read` | standard |
| `orbit.sources.read` | `sources:read` | standard |

## Records and retained outcomes

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
