# Orbit handover

## Where Orbit stands

Orbit's public source repository is `just-every/run-orbit` (`https://github.com/just-every/run-orbit`), release 0.1.0; `edition.json`, `rer-project.json`, the delivery packaging policy and the management integration profile declare it. The first release is the annotated tag `v0.1.0` on the repository's first commit. No deployment is implied by this source.

Orbit runs on the RER seed command contract (first-party profile). `scripts/installer/local.mjs` is its command adapter; `scripts/base-cli/`, `scripts/base-onboarding/`, `RUN-LOCALLY.md` and `SEED-COMMAND-CONTRACT.md` are byte-exact copies of Base main `53b11d7` (exported with Base's `scripts/export-cli.mjs`; it contains the local-port closure round 3, b1ad813) and `src/base/modules/mail/` of Base `261ed78521f4d80181733ef9f9784a04af1f4b1c`, and `node scripts/rer.mjs check --profile first-party` fails on any drift. `edition.json` records the mail module, contract documents and Vite helper as the `runeditrun/base-local-runtime` component at that revision; the CLI and onboarding copies carry their own hashed inventory (`scripts/base-cli/inventory.json`). Migrations `0021_development_outbox.sql` and `0023_portability.sql` are byte-exact copies of Base's outbox and portability schemas.

## How it runs

- **Local:** `rer install`, `rer setup --owner-email`, `rer dev` (opens signed in through `RER_OPEN`), first-run setup at `/setup`. State lives in `.wrangler/state`, private settings in `.dev.vars`. README and OPERATIONS describe every command.
- **Auth:** Base operator-auth over Orbit's own operators and sessions (see "Sign-in" below). Locally (`AUTH_LOCAL=true`, `MAIL_PROVIDER=development`) sign-in mail is captured by Base's development outbox in D1, served only behind the checkout's dev key. `POST /auth/bootstrap` claims the single initial owner with the private `SETUP_TOKEN` and `OWNER_EMAIL`, signs them in, and answers 409 once an owner exists. The CLI's own sign-in requests carry an HMAC proof keyed by `SESSION_SECRET`. The sign-in and `/setup` forms post before hydration.
- **First-run setup:** migration `0022_first_run_setup.sql` marks every established workspace complete. A new owner's workspace starts with reviewable defaults (`Your business`, UTC, USD, New/Qualified/Proposal); the setup owner confirms them at `/setup`, which records completion durably. Until then `/app` routes redirect to `/setup`; afterwards `/setup` redirects to `/app`. Other operators see that the owner is finishing setup.
- **Hosted:** `rer deploy` uses the Base deploy kit (owner account, `sales-orbit-<environment>` resources, `.rer/deploy/<environment>.json` ownership state), checks `/health` and claims the owner with a one-use token. Local packaging and fake-provider repeat-deployment proof do not establish hosted acceptance; no deployment was made from this source. The existing pilot Worker and its D1 remain intact: the deploy kit names separate resources and never adopts others, so moving pilot data is an explicit Records archive transfer.

## Product

Report snapshots carry their measured period, immutable definition filters, grouping and missing-value policy into the calculation panel, saved history and JSON export. Opportunity money sums and means display the workspace currency; other sums and means identify their value field. Stage names are resolved from workspace settings; names for linked records and record-ID groups use paged projections under current graph field authority. Owner/operator-name groups require full native operator authority, matching settings access. New snapshots retain the workspace currency; pre-existing snapshots derive the missing context from their saved definition and current workspace currency when reopened.

Setup uses Base’s fixed production runtime. Dev and preview use the Base public proxy, with Local Explorer disabled; Vite serves only `src`, `public` and `node_modules` and denies installer/runtime state and `.rer` archives. Orbit has no branding-writing prepare hook.

Source setup now generates signing credentials, offers native form embeds and vendor-native booking/automation recipes, and signs test events through real ingestion. The NOW checklist reads actual customer, source, test, draft, sender configuration and successful-send state. Opportunity detail is the canonical evidence/outreach home; diagnostics sit under Audit details and exact-message approval is preserved.

Base operator-auth email links (and an optional linked identity provider) protect the operator application. The Worker serves TanStack Start documents and authenticated Hono APIs, rejects framing, validates origins and uses durable public rate limits.

The interface provides the NOW queue, opportunity evidence and recommendations, complete company/contact records and aliases, custom fields, imports, merges, erasure, lifecycle/stage/assignment changes and workspace/operator settings. Signed source ingestion records immutable attribution and diagnostics; ambiguous identities remain held for explicit review. Evaluations are transactional, completed actions do not repeat identical evidence, and failed evaluations remain visible beside the last valid result.

Operators can preview the exact AI request, explicitly generate a cited explanation and unsent draft, and inspect usage and estimated costs. Manual drafting remains available without AI. Draft editing, explicit stale review, immediate approval, scheduling and cancellation retain revision checks. Approval discloses the actual mandatory SendGrid footer. Recipient permission, stop rules, quiet hours, limits, bounded retry and ambiguous-delivery reconciliation apply to dispatch. Signed provider events and threaded inbound replies update durable state without duplicate effects. Notifications retain recipient-specific read state.

The bounded expansion fold (`docs/fold/`) adds native reports, explicitly invited collaborators with record and field access, and fixed public forms with atomic inquiry capture; native operators remain equal full operators. Before applying migration 0016 to an older installation, finish or abort any in-progress v2 archive import with the installed edition; the first fold statement refuses an unfinished import.

## Data

Local `rer export`/`import` use Base portability with Orbit's data policy (OPERATIONS.md lists the exclusions) and rebuild full-text search after restore; the journey test proves export/import/export equivalence of content hashes. Hosted installations keep Orbit's own Records archive (v3), reachable from Records and through `rer export|import --target remote`; the fold tests drive that remote path against an emitted Worker over loopback HTTPS.

Contact deletion erases the person and makes every Records transfer copy unreachable in one atomic batch by replacing the transfer jobs, parts and segments with empty tables (three schema renames), then removes the orphaned copies and old metadata in bounded batches; the minute timer resumes an interrupted removal. The export snapshot and the restore finish are still single whole-dataset batches (19–34 s on GitHub runners against the 30 s D1 ceiling in the capacity test); bounding them is open work.

## Verification

`node scripts/rer.mjs verify` runs every routine product and fold gate listed in TESTING.md sequentially with isolated temporary state; full declared-capacity clauses remain pending. CI (`.github/workflows/edition.yml`) gives the same source-discovered plan independent shard runners with Node 22.20.0 and pnpm 10.12.4, then reconciles their actual runner inventories, terminal totals and completion events. `pnpm run verify:release` reruns all routine gates and the unchanged full-capacity qualification, requiring its fresh capacity and native D1 artifacts. Only the full-scale case is release-only. The new CI wall time remains unmeasured. Local execution coverage is not hosted acceptance: native emailed access on a deployment, provider delivery, inbound replies (OD-08 domain/MX), repeat deployment and customized-owner updates need their own authorized receipts (see ACCEPTANCE.md).

PUBLIC-002 now presents a separate, read-only fictional example workspace with relative dates. It makes no owner-data read, no mutation and no provider call. No demo records enter D1. The former owner-record demo repository, binding, editable preview and hosted-demo creation runner are retired. Current API/privacy and native browser checks replace that runner; its retained fold provenance and old hosted receipts describe the earlier behavior only.

Verification output isolation is source-prepared: `verification/` is generated,
ignored output, reset for each routine/release or standalone shard/fold invocation.
Formerly tracked receipts and screenshots retain their exact bytes under
`docs/retained-verification/`; the Worker screenshot now writes under
`verification/ui/` instead of replacing `visual/12-create-opportunity.png`.
The unchanged Base producer can invoke routine and release verification in one
checkout without output paths overlapping tracked source. Pinned-runner negatives,
the real repeated-command/source-cleanliness proof, full capacity and exact-head
CI/timing remain UNRUN. See `docs/verification-runtime-checks.md` for the prepared
validation steps; source isolation alone does not establish release acceptance.

## Sign-in: Base operator-auth over Orbit's own operators

Orbit signs in through Base operator-auth (`scripts/base-cli/modules/operator-auth`,
byte-exact from Base main 53b11d7, refreshed with Base's `scripts/export-cli.mjs`).
Orbit's own session, magic-link and owner-bootstrap code and its TanStack sign-in
page are gone; Base serves `/signin` (server-rendered, works before hydration),
`/auth/*` and the `oidc-provider@1` linking documents under `/.well-known/rer-*`.

**Route: Base's native accounts adapter over Orbit's tables, not a move into
`oa_operators`.** `src/core/features/identity/` implements Base's
`NativeAccountsAdapter` and `NativeProofPersistence` over `operators` and
`sessions`. No operator row moves, so every foreign key into `operators(id)`
(access_memberships, access_invitations, access_grants, access_collaborators,
delegation_grants ON DELETE CASCADE, handoff_tasks, content_entities,
access_form_authorities, opportunities, audit and timeline attribution) keeps
pointing at the same row. A move would have needed a second, trigger-synced
`operators` table for those keys, the fold triggers that classify a new
operator as native or collaborator would have fired from a copy, and the
transactional fences in Orbit's access, import and delegation SQL (which join
`sessions` and `operators` in the same D1 batch) would have needed rewriting.
Migration 0032 only adds tables: `identity_sessions` (how each new session was
proven, beside `sessions`), `identity_dev_grants` (delegation credentials
minted from a dev session) and `identity_*` proofs, limits, settings, bindings,
logouts, audit and guards. Every existing table keeps its exact shape and rows;
the retired `magic_links` table is emptied and left in place for code from the
previous release during an upgrade. 0033 and 0034 are Base's identity-provider
and dependency schemas. The authority
version is derived from `operators.updated_at`, so no trigger or column is added
to an archived table and archive schema hashes are unchanged; `identity_*` and
`oa_*` tables never travel in archives.

- Roles: the setup owner is Base `owner`, other native full operators `admin`,
  invited collaborators `member`. Workspace roles, field access and invitations
  stay in `access_*`; Base's own invitation and administration routes answer
  `native_capability_unavailable` for a native seed.
- Sessions keep the `__Host-orbit_session` cookie and its SHA-256 token digest,
  so sessions issued before the upgrade keep working until they expire (14 days);
  a removed operator's sessions and links are refused. New sessions record their
  kind and authority version.
- Step-up (a fresh app-local email proof in the asking session, 10 minutes):
  archive export (`export`), archive import and operator erasure (`delete`),
  and delegation consent, which mints a credential (`credentials:mint`). Record
  deletion keeps its confirmation only.
- Dev identity: `src/dev/server.ts` is the local-only entry `vite dev` loads;
  personas owner, `seller` (full operator) and `collaborator` (analyst profile)
  are real operators created on first use; the outbox, dev sign-in and personas
  need the checkout key, and dev sessions and dev-minted delegation credentials
  count only behind it.
- Without sign-in mail (no `MAIL_FROM`) and no linked provider, `/signin` is
  Orbit's own plain page saying sign-in email is unavailable, with no credential
  field (PUBLIC-003); Base's page always offers the email form.
- Provider sign-in (`IDENTITY_PROVIDER`, an Auth install) is optional and off
  until the owner links one and turns it on at `/auth/settings/identity`.
- Prior-data proof: `tests/core/prior-auth-upgrade.test.ts` upgrades a store
  captured from main 8298464 (`tests/fixtures/prior-auth`).

## Reviewed customer move-in (T-098)

`/app/imports` uses the native operator shell and the selected 12ui import composition. The moving guide is `docs/imports/MOVING.md` (also served at `/moving-guide.html`). The direct contact/company CSV write endpoint and UI were removed. Configurable HubSpot/Pipedrive recipes cover contacts, companies, deals, separately exported/prepared notes and standalone mailbox suppression. Source owners remain historical evidence. Only a mapped explicit subscribed permission can make a new contact contactable.

Base import-kit is vendored unchanged from `261ed78521f4d80181733ef9f9784a04af1f4b1c`; Orbit supplies native D1 targets, current operator/session/grant predicates and dependency-aware undo. A private saved dry run binds Apply. The whole suppression group commits before any customer insert; pending safety work fences native contact creation and mail approval/dispatch. Native keyed proofs, contactability revisions and cancellation apply to queued and scheduled sends. Partial failures remain visible and require explicit continue or undo. Undo preserves changed records, incoming native dependencies and independent suppression; it never restarts cancelled work.

Private import originals, reviews, job authority and undo metadata are excluded from both archive paths. Contact erasure uses the kit's source withdrawal for mapped contact targets and erases attributed imported notes, while anonymous suppression proofs survive. Orbit also redacts the primary/alias mailboxes from current imported company/contact/deal text, nested custom-field provenance and its own target snapshots in the final native erasure transaction. Exact inventory fences protect concurrent changes; unrelated fields and later owner edits survive. Review withdrawal is selective; status and safe undo remain reachable after its source review is withdrawn, and stale Apply is fenced by current review authority. Unmapped columns remain only in the private original CSV and are reported by column number; rejected-row content is held in the original artifact rather than duplicated in unindexed plan payloads. Provider unsubscribe reflection still requires the configured trusted product-scoped relay/native verified webhook; no provider account or shared webhook change belongs to this importer.

Privacy acceptance is blocked on Base import-kit: its target-only erasure API cannot discover rejected-only source artifacts, or redact another imported record's retained source/effect plan while retaining that native record. Selecting legacy unavailable originals would violate the exact-original contract. Real isolated D1 and public contact-deletion routes reproduce both failures: the mapped company source/effect remains in Kit custody after native rows, graph, search, Orbit snapshots and the public archive are clean; rejected-only and mixed valid-company uploads retain decoded CSV originals. `tests/core/crm-import-erasure.test.ts` keeps both cases as ordinary failing tests. Unrelated-company reviews and safe undo pass. Do not land this candidate as DATA-002 accepted.

Validation is synthetic-only; no real vendor export was supplied. The two focused core import files ran on Node 22.20.0/pnpm 10.12.4 against disposable real D1: 7 tests, 5 passed, 2 privacy failures, no skips. After native redaction, the unchanged erasure file ran again: 3 tests, 1 passed, 2 failures now confined to Kit custody. Additional public-route evidence confirms primary/alias redaction, escaped and owner-edited provenance, archive cleanup, preservation of later company/contact/deal edits, boundary mailboxes, safe undo and the surviving alias hold. Both vendor recipes processed 126 rows with one explicit rejection each, then passed re-import and undo. Suppression/send fences, trusted relay versus forgery, independent primary/alias holds, later edits, storage failure and revoked authority checks passed. Typecheck passes with the whole Kit included, its two upstream status schemas retained, Node 22 declarations and ES2023 library types. Responsive browser, built Worker, accepted T-099 integration and final acceptance remain unrun.

## Admission source

The maintained Base delivery producer at `scripts/delivery/base` owns schema-2 raw-payload packaging. Its policy generates `rer-project.json`, the canonical setup digest and `rer-managed.yml`. Base CLI/onboarding refresh is from green Base `261ed78521f4d80181733ef9f9784a04af1f4b1c` (Verify 38149293290). Orbit owns its Inter/Georgia declarations outside Base copy records; the accepted homepage keeps DM Sans and Libre Caslon. Native sign-in uses the same root font links.

The optional editor uses the existing native session and setup-owner row, renews short grants against the current session, revokes on logout and rechecks on focus. `RER_MANAGEMENT_ORIGIN` and `RER_INSTALLATION_ID` are public configuration; no management credential is returned. Application framing remains denied. Hosted editor service authorization, visual edit/source/redeploy acceptance and Base operator-auth migration remain separate.

Inbound-mail source repair: health exposes actual deploy-kit identity and the Worker serves built asset namespaces when the owner kit runs Worker-first. An unchanged deploy is safe to repeat; a changed provider identity remains a deliberate refusal. The saved live failure followed an authorized external secret update; a tracked secret-rotation path remains shared Base work. Unsubscribe mirroring still requires a configured trusted provider event key/relay; this admission change does not invent provider events.

## Mail and calendar capture (CAPTURE-001 to CAPTURE-007)

`/app/capture` takes `.eml` files, an mbox and `.ics` files (`src/core/features/capture/`). Each message or event becomes a signal under the capture source `capture-files`, with its original headers and body in `capture_items`. Replay identity is the Message-ID, or UID, SEQUENCE and what happened (booked, completed, cancelled); a changed copy is refused and counted on the source. Mail with no participant holding an exact contact email or company domain key is not stored (the import says how many and why) unless the operator keeps unknown senders for that one import; those wait in the unlinked queue.

What capture applies at once: a reply carrying an Orbit send's headers from its recipient attaches to the opportunity (OUT-004); a delivery report for an Orbit send records the bounce and a permanent one sets do-not-contact (RECORD-012); a reply or booked meeting cancels that person's scheduled sends and marks their drafts stale (OUT-007, ACTION-005) — the existing OUT-009 trigger then returns the opportunity to NOW. Everything else is a row in `capture_proposals` showing its evidence: link, create a contact at a known company by exact email (always created do-not-contact), set name or phone, change the next action, set do-not-contact. Accept/edit/decline are on the Capture page and on each contact and company page; a proposal whose current value changed answers 409; a declined proposal is keyed by its evidence and never returns. `scripts/check-boundaries.mjs` fails if anything reachable from `features/capture` imports a draft, approval or send module.

`capture.source.v1` (`capture/contracts.ts`, `capture/sources.ts`) is the provider seam: a source declares its read scope, stores its cursor exactly as given (Gmail history ID, Graph delta link) after each page commits, keeps its credential sealed in `capture_credentials` (never archived), and shows state, last success, last error, counts and proposals waiting. A revoked grant stops intake until reconnected; an outage changes nothing else; disconnect stops intake at once and deletes the credential. No provider adapter, OAuth client or account exists yet; `tests/support/fake-mail-provider.ts` is the contract fake behind an HTTP boundary. Migration `0035_capture.sql` adds the four tables; `capture_sources`, `capture_items` and `capture_proposals` travel in both archive paths (they join the fold's selected-table list, as `form_embed_origins` did) and are erased with their contact. `tests/core/capture-upgrade.test.ts` upgrades a store made by main ce67062 (`tests/fixtures/prior-capture/populate.ts`).

Operator erasure now redacts a display name only as a whole word (never inside a longer word or a mailbox), only in that operator's own content and, inside JSON, only in string values (never keys or identifier-like values); names under three characters are left, and erasure answers 409 when another operator's or contact's name contains it.
