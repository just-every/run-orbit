# Orbit handover

## Where Orbit stands

Orbit's public source repository is `just-every/run-orbit` (`https://github.com/just-every/run-orbit`), release 0.1.0; `edition.json`, `rer-project.json`, the delivery packaging policy and the management integration profile declare it. The first release is the annotated tag `v0.1.0` on the repository's first commit. No deployment is implied by this source.

Orbit runs on the RER seed command contract in package mode, with exact `@runeditrun/rer` 0.2.22 and `scripts/installer/local.mjs` preserving its native hooks. Base runtime files under `src/base/` are copied unchanged from `8981bc2c4d9e61feca5787c83b4ed44056659dd9`, recorded in `base-copies.json`; the seed's existing mail module and contract-document origins remain in `edition.json` and `sources.lock.json`. The installed `/` is the shared Lobby, reading the active installation owner claim. The approved homepage and docs also build as a static run site with `rer build --site`; `.github/workflows/run-site.yml` gates its deployment on `RUN_SITE_DEPLOY`.

## How it runs

- **Local:** `rer dev` from a clone installs dependencies and prepares the local trial owner (`owner@orbit.test`); optional explicit `rer install`, `rer setup --owner-email EMAIL`, `rer dev` (opens signed in through `RER_OPEN`), first-run setup at `/setup`. State lives in `.wrangler/state`, private settings in `.dev.vars`. README and OPERATIONS describe every command.
- **Auth:** Base operator-auth over Orbit's own operators and sessions (see "Sign-in" below). Locally (`AUTH_LOCAL=true`, `MAIL_PROVIDER=development`) mail is suppressed silently. `POST /auth/bootstrap` claims the single initial owner with the private `SETUP_TOKEN` and `OWNER_EMAIL`, signs them in, and answers 409 once an owner exists. The CLI's own sign-in requests carry an HMAC proof keyed by `SESSION_SECRET`. The sign-in and `/setup` forms post before hydration. Managed Configure reads the committed deployment spec generated from the build; its signed `/auth/owner-claim` transport verifies RER authority then uses this same atomic native bootstrap, with a hidden generated token.
- **First-run setup:** migration `0022_first_run_setup.sql` marks every established workspace complete. A new owner's workspace starts with reviewable defaults (`Your business`, UTC, USD, New/Qualified/Proposal); the setup owner confirms them at `/setup`, which records completion durably. Until then `/app` routes redirect to `/setup`; afterwards `/setup` redirects to `/app`. Other operators see that the owner is finishing setup.
- **Hosted:** `rer deploy` uses the Base deploy kit (owner account, `sales-orbit-<environment>` resources, `.rer/deploy/<environment>.json` ownership state), checks `/health` and claims the owner with a one-use token. Local packaging and fake-provider repeat-deployment proof do not establish hosted acceptance. The existing pilot Worker and its D1 remain intact: the deploy kit names separate resources and never adopts others, so moving pilot data is an explicit Records archive transfer.

## Product

Report snapshots carry their measured period, immutable definition filters, grouping and missing-value policy into the calculation panel, saved history and JSON export. Opportunity money sums and means display the workspace currency; other sums and means identify their value field. Stage names are resolved from workspace settings; names for linked records and record-ID groups use paged projections under current graph field authority. Owner/operator-name groups require full native operator authority, matching settings access. New snapshots retain the workspace currency; pre-existing snapshots derive the missing context from their saved definition and current workspace currency when reopened.

Setup uses Base’s fixed production runtime. Dev and preview use the Base public proxy, with Local Explorer disabled; Vite serves only `src`, `public` and `node_modules` and denies installer/runtime state and `.rer` archives. Orbit has no branding-writing prepare hook.

Source setup now generates signing credentials, offers native form embeds and vendor-native booking/automation recipes, and signs test events through real ingestion. The NOW checklist reads actual customer, source, test, draft, sender configuration and successful-send state. Opportunity detail is the canonical evidence/outreach home; diagnostics sit under Audit details and exact-message approval is preserved.

Base operator-auth email links (and an optional linked identity provider) protect the operator application. The Worker serves TanStack Start documents and authenticated Hono APIs, rejects framing, validates origins and uses durable public rate limits.

The interface provides the NOW queue, opportunity evidence and recommendations, complete company/contact records and aliases, custom fields, imports, merges, erasure, lifecycle/stage/assignment changes and workspace/operator settings. Signed source ingestion records immutable attribution and diagnostics; ambiguous identities remain held for explicit review. Evaluations are transactional, completed actions do not repeat identical evidence, and failed evaluations remain visible beside the last valid result.

The operator home opens on Today's brief (BRIEF-001 to BRIEF-005, `src/core/features/today/`): per account, what was linked since the operator last marked it seen, observed and inferred signals apart, overdue promises computed from records, handoffs waiting for review and unresolved identity, each line linking to its evidence. The "last seen" mark is an audit entry, so no migration was added. Each linked meeting has a plan page (`/app/meetings/:signalId`) whose agenda and prep notes are one RECORD-010 note. An optional account summary goes through the existing provider only as previewed. Delegated applications read the brief and plans with `crm.evidence.read` and propose handoffs that may cite evidence; a person accepts, edits or dismisses each, and that review is an attributed timeline entry. Citing evidence stays optional so existing version 1 `rer-delegation` clients keep working.

Operators can preview the exact AI request, explicitly generate a cited explanation and unsent draft, and inspect usage and estimated costs. Manual drafting remains available without AI. Draft editing, explicit stale review, immediate approval, scheduling and cancellation retain revision checks. Approval discloses the actual mandatory SendGrid footer. Recipient permission, stop rules, quiet hours, limits, bounded retry and ambiguous-delivery reconciliation apply to dispatch. Signed provider events and threaded inbound replies update durable state without duplicate effects. Notifications retain recipient-specific read state.

The bounded expansion fold (`docs/fold/`) adds native reports, explicitly invited collaborators with record and field access, and fixed public forms with atomic inquiry capture; native operators remain equal full operators. Before applying migration 0016 to an older installation, finish or abort any in-progress v2 archive import with the installed edition; the first fold statement refuses an unfinished import.

## Data

Local `rer export`/`import` use Base portability with Orbit's data policy (OPERATIONS.md lists the exclusions) and rebuild full-text search after restore; the journey test proves export/import/export equivalence of content hashes. Hosted restore retains current operators and the active owner, imports new archived operators as ordinary operators, revokes sessions and requires a fresh sign-in. Hosted installations keep Orbit's own Records archive (v3), reachable from Opportunities → Import, duplicate review and data export and through `rer export|import --target remote`; the fold tests drive that remote path against an emitted Worker over loopback HTTPS.

Contact deletion erases the person and makes every Records transfer copy unreachable in one atomic batch by replacing the transfer jobs, parts, segments and, when present, folded part inventory with empty tables, then removes the orphaned copies and old metadata in bounded batches; the minute timer resumes an interrupted removal.

The declared-capacity release run `38384709386` exercised an emitted Worker backed by real D1 at 100,000 contacts, 25,000 companies, 25,000 open opportunities, 1,000,000 signals and 2,000,000 timeline activities. Search p95 ranged from 44.34 to 59.10 ms. Contact erasure took 31.049 s and the erased address was absent on the next read. The archive round trip preserved exact domain hashes and AI usage and passed foreign-key checks and session invalidation. Restore advancement and finalization took 410.735 s across 839 requests after upload; this is not the total archive-transfer or round-trip time. All 339,378 clock calls closed with no pending work or errors, and all four Worker witnesses closed.

Native D1 measurements stayed below the 30 s ceiling: maximum source/restored native calls and batches were 10.916/8.664 s; the whole-dataset snapshot batches were 8.778/8.664 s. Snapshot HTTP header/JSON handling took 19.730/19.656 s; those are HTTP timings, not D1 call durations. Restore finalization remains a whole-dataset architectural operation; its measured native finish batch was 1.509 s (80 statements), followed by a 1.102 s cleanup batch (126 statements). Further batching of snapshot creation and restore finalization remains architectural work.

## Verification

`rer verify` runs every routine product and fold gate listed in TESTING.md sequentially with isolated temporary state. [GitHub Actions run 38384709386](https://github.com/just-every/run-orbit/actions/runs/38384709386) passed all nine matrix shards, the verify gate and the release gate on source SHA `64b147965bb71acff8120751d6ab6ccf07eb784b`; the unchanged repository command `pnpm run verify:release` completed successfully. Its release summary records 409 tests and 93 satisfied, 0 pending and 0 broken clauses, including RECORD-006, DATA-001, DATA-002 and BASE-DATA-001. The downloadable `orbit-release-verification` artifact contains the release and capacity receipts. The release command ran from 2026-10-13 11:13:47Z to 16:27:44Z. This result is attributed to the exact source SHA in its receipt; release verification is required for each candidate.

Local and CI execution coverage are not hosted acceptance: native emailed access on a deployment, provider delivery, inbound replies (inbound domain/MX), repeat deployment and hosted customized-installation acceptance need their own authorized receipts (see ACCEPTANCE.md).

PUBLIC-002 now presents a separate, read-only fictional example workspace with relative dates. It makes no owner-data read, no mutation and no provider call. No demo records enter D1. The former owner-record demo repository, binding, editable preview and hosted-demo creation runner are retired. Current API/privacy and native browser checks replace that runner; its retained fold provenance and old hosted receipts describe the earlier behavior only.

Verification output isolation is source-prepared: `verification/` is generated,
ignored output, reset for each routine/release or standalone shard/fold invocation.
Formerly tracked receipts and screenshots retain their exact bytes under
`docs/retained-verification/`; the Worker screenshot now writes under
`verification/ui/` instead of replacing `visual/12-create-opportunity.png`.
The release run exercised the isolated verification plan and the full declared-capacity qualification. Supplementary probes remain unrun: pinned-runner and aggregate-receipt negative cases, capacity-artifact mutation negatives, the repeated-command/source-cleanliness proof and the separate full producer-path check. Their prepared scope is in `docs/verification-runtime-checks.md`; its full-capacity execution is completed by run `38384709386`. Local or CI success alone does not establish hosted acceptance.

## Sign-in: Base operator-auth over Orbit's own operators

The exact RER 0.2.22 pin preserves native local-owner resolution and pnpm patch-aware package selection. Deploy declares SendGrid inputs once for preflight, upload and secret updates. RER’s outer controller waits for the exact source, claims the owner and retires its token. Hosted access uses the operator’s real emailed sign-in link; the earlier printed-link owner recovery adapter is retired. Full destination operators keep access after restore; collaborators require renewed invitations.

Orbit signs in through Base operator-auth from the exactly pinned `@runeditrun/rer` package.
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
  are real operators created on first use; dev sign-in and personas
  need the checkout key, and dev sessions and dev-minted delegation credentials
  count only behind it.
- Without sign-in mail (no `MAIL_FROM`) and no linked provider, `/signin` is
  Orbit's own plain page saying sign-in email is unavailable, with no credential
  field (PUBLIC-003); Base's page always offers the email form.
- Provider sign-in (`IDENTITY_PROVIDER`, an Auth install) is optional and off
  until the owner links one and turns it on at `/auth/settings/identity`.
- Prior-data proof: `tests/core/prior-auth-upgrade.test.ts` upgrades a store
  captured from main 8298464 (`tests/fixtures/prior-auth`). It passed in routine
  run `38374305276` on `64b1479`, checking preserved operator IDs, access, prior
  sessions, fresh Base sign-in and delegation. The migration is implemented and
  source-tested; authorized hosted sign-in/upgrade acceptance remains pending.

## Reviewed customer move-in

`/app/imports` uses the native operator shell and the selected 12ui import composition. The moving guide is `docs/imports/MOVING.md` (also served at `/moving-guide.html`). The direct contact/company CSV write endpoint and UI were removed. Configurable HubSpot/Pipedrive recipes cover contacts, companies, deals, separately exported/prepared notes and standalone mailbox suppression. Source owners remain historical evidence. New contacts are held by default. A mapped explicit subscribed permission or an explicit per-import contactability choice with operator attestation can make them contactable; existing do-not-contact stops always win.

Base import-kit is vendored unchanged from `1ce15dd8cbb7c8cf2d83ebfde2b4a8a130ff9d74`; Orbit supplies native D1 targets, current operator/session/grant predicates and dependency-aware undo. A private saved dry run binds Apply. The whole suppression group commits before any customer insert; current safety fences hold native contact creation and mail approval/dispatch until that commit succeeds. Native keyed proofs, contactability revisions and cancellation apply to queued and scheduled sends. Partial failures remain visible and require explicit continue or undo. Undo preserves changed records, incoming native dependencies and independent suppression; it never restarts cancelled work.

Private import originals, reviews, job authority and undo metadata are excluded from both archive paths. Contact erasure uses the kit's source withdrawal for mapped contact targets and erases attributed imported notes, while anonymous suppression proofs survive. Orbit also redacts the primary/alias mailboxes from current imported company/contact/deal text, nested custom-field provenance and its own target snapshots in the final native erasure transaction. Exact inventory fences protect concurrent changes; unrelated fields and later owner edits survive. Review withdrawal is selective; status and safe undo remain reachable after its source review is withdrawn, and stale Apply is fenced by current review authority. Unmapped columns remain only in the private original CSV and are reported by column number; rejected-row content is held in the original artifact rather than duplicated in unindexed plan payloads. Provider unsubscribe reflection still requires the configured trusted product-scoped relay/native verified webhook; no provider account or shared webhook change belongs to this importer.

The exact-head routine evidence `38374305276` records all three cases in
`tests/core/crm-import-erasure.test.ts` as passed. The later declared-capacity
release run `38384709386` also satisfies DATA-002; the release contract report has
93 satisfied clauses, none pending or broken. This supersedes the earlier report
of two failing erasure cases. Validation remains synthetic: no real vendor export
was supplied. The scoped owner-update exercise preserved a recorded
creator-assignment customization through an ordinary merge of public upstream
`99a912a`. Real native-authenticated API and isolated D1 checks passed before
customization, after customization and after the update: 21 HTTP requests at each
stage covered the default, explicit assignment, unassignment, reassignment,
operator-removal handover and persistence after D1 reopen. The recorded intent,
all 31 migrations and the shipped source check were preserved. This proves that
scoped owner requirement, not a hosted installation or migration of an existing
owner's data across the update. Installation-update acceptance and hosted sign-in, provider
delivery, inbound mail and customer acceptance remain separate.

## Admission source

The maintained Base delivery producer at `scripts/delivery/base` owns schema-2 raw-payload packaging. Its policy generates `rer-project.json`, the canonical setup digest and `rer-managed.yml`. Base CLI/onboarding refresh is from green Base `261ed78521f4d80181733ef9f9784a04af1f4b1c` (Verify 38149293290). Orbit's selected theme and public/operator brand use self-hosted Bricolage Grotesque: `src/identity.ts` selects `/brand/fonts.css`, and `public/rer-theme.css` plus the brand tokens select that family. Shared root styles still declare Inter and Georgia (`public/fonts/fonts.css` and `src/core/app/styles.css`) for generic surfaces that do not apply the Orbit brand stack; those declarations are not Orbit's selected brand font.

The optional editor uses the existing native session and setup-owner row, renews short grants against the current session, revokes on logout and rechecks on focus. `RER_MANAGEMENT_ORIGIN` and `RER_INSTALLATION_ID` are public configuration; no management credential is returned. Application framing remains denied. Hosted editor service authorization and visual edit/source/redeploy acceptance remain pending, as does authorized hosted acceptance of the implemented Base operator-auth migration.

Inbound-mail source repair: health exposes actual deploy-kit identity and the Worker serves built asset namespaces when the owner kit runs Worker-first. An unchanged deploy is safe to repeat; a changed provider identity remains a deliberate refusal. The saved live failure followed an authorized external secret update; a tracked secret-rotation path remains shared Base work. Unsubscribe mirroring still requires a configured trusted provider event key/relay; this admission change does not invent provider events.

## Mail and calendar capture (CAPTURE-001 to CAPTURE-007)

`/app/capture` takes `.eml` files, an mbox and `.ics` files (`src/core/features/capture/`). Each message or event becomes a signal under the capture source `capture-files`, with its original headers and body in `capture_items`. Replay identity is the Message-ID, or UID, SEQUENCE and what happened (booked, completed, cancelled); a changed copy is refused and counted on the source. Mail with no participant holding an exact contact email or company domain key is not stored (the import says how many and why) unless the operator keeps unknown senders for that one import; those wait in the unlinked queue.

What capture applies at once: a reply carrying an Orbit send's headers from its recipient attaches to the opportunity (OUT-004); a delivery report for an Orbit send records the bounce and a permanent one sets do-not-contact (RECORD-012); a reply or booked meeting cancels that person's scheduled sends and marks their drafts stale (OUT-007, ACTION-005) — the existing OUT-009 trigger then returns the opportunity to NOW. Everything else is a row in `capture_proposals` showing its evidence: link, create a contact at a known company by exact email (always created do-not-contact), set name or phone, change the next action, set do-not-contact. Accept/edit/decline are on the Capture page and on each contact and company page; a proposal whose current value changed answers 409; a declined proposal is keyed by its evidence and never returns. `scripts/check-boundaries.mjs` fails if anything reachable from `src/core/features/capture` imports a draft, approval or send module.

`capture.source.v1` (`capture/contracts.ts`, `capture/sources.ts`) now has Google and Microsoft adapters in `capture/providers/`. The owner supplies an OAuth client on Capture, then explicitly selects labels/folders and calendars; calendars have a fixed date window. Composite page checkpoints retain Gmail history IDs, Google calendar sync tokens and per-folder/per-calendar Graph delta links, advancing only after intake commits. Expired Gmail history triggers a scoped resync. Credentials and pending OAuth exchanges are sealed with `ORBIT_ENCRYPTION_KEY`; PKCE, native-session authority and connection/lease fences protect callbacks and concurrent sync. A revoked grant stops intake until reconnected; an outage keeps the prior cursor; disconnect stops intake at once and deletes credentials. Network-edge fakes exercise both real adapters without live accounts. Owner client creation and live proof remain in `OWNER-STEPS.md`, `docs/CONNECT-GMAIL.md` and `docs/CONNECT-OUTLOOK.md`. Migration `0036_capture_providers.sql` adds installation-local OAuth flows and leases. Credentials, flows and leases never travel in either archive; `capture_sources`, `capture_items` and `capture_proposals` do, with restored sources requiring reconnection. `tests/core/capture-upgrade.test.ts` upgrades a store made by main ce67062 (`tests/fixtures/prior-capture/populate.ts`).

Provider mail above the response size limit is skipped per message while paging continues. Skip counts use anonymous, keyed provider identities in audit receipts and commit with their source/lease fence, so label/folder updates and rescan do not recount them. Historical skip counts cannot be reconstructed because previous releases retained no skip identity. Google full calendar reads carry the chosen time bounds on every page; incremental reads keep their local date filter, and an expired sync token restarts a bounded read. Permanent Microsoft token refusals stop automatic polling and distinguish authorization configuration from required sign-in/consent; transient server errors preserve the cursor.

Provider event/series associations are anonymous keyed metadata beside the captured original's headers, scoped to its source and calendar. They travel with existing private archives and disappear with the original on contact erasure; raw provider IDs are not stored in this association. Every Google cancelled event resolves these associations, including full-detail masters without a recurrence rule: an individual cancels only its occurrence and a master cancels its captured occurrences. Full and ID-only deletions reuse saved cancellations. Provider modification times remain attributed to the provider; undated deletions explicitly label the local observation time. An unmatched complete cancellation follows normal capture only when its start and end prove overlap with the selected window; missing or unreadable bounds never create a standalone meeting. A partial cancellation can still resolve a captured provider ID, preserving the stored occurrence's bounds. Re-reading an unchanged original adds its association on replay, including pre-upgrade evidence; an old original that has never been re-read cannot resolve a bare provider ID. This uses the existing evidence/audit schema and matching contexts, so no schema migration or new archive inventory is needed.

Contact erasure removes whole captured originals, signals and proposals containing the exact mailbox or its aliases, including quoted history and Reply-To. Anonymous keyed item/mailbox proofs and erasure times prevent their return during expired-cursor resync, reconnect or re-import; no address, subject, original message ID or snippet remains in those proofs. Intake fences concurrent erasure atomically. Archives carry the private matching contexts and proofs; Records restore preserves destination proofs for subsequent intake without changing restoration of an owner-supplied historical archive. New evidence remains eligible for matching and review.

Operator erasure now redacts a display name only as a whole word (never inside a longer word or a mailbox), only in that operator's own content and, inside JSON, only in string values (never keys or identifier-like values); names under three characters are left, and erasure answers 409 when another operator's or contact's name contains it.

## Hosted demo (15 October 2026)

The demo runtime, operator-auth and owner-claim resolve from the same exact rer 0.2.22 package, so mocked mail success shares the installed demo guard. The redundant demo copy and deprecated SendGrid shim are removed; all retained Base module copies refresh together to rer-v0.2.22. Demo customer sends use Base development mail directly. AI generation uses demoEffect with cited sample output only under RER_DEMO. The seed finishes its setup checklist with domain source-check, draft approval and suppressed-send operations, populated customer records, close dates and operators. The public homepage is unchanged.

The hosted demo retains `basic`. Its rer 0.2.22 trial was 9/10 starts (successful median 12.141 s); `standard-1` was also 9/10 (successful median 15.464 s), with its seventh visitor timing out after admission. Most successful-start elapsed time preceded admission. Neither type met the hosted startup target; timings and both failure correlation IDs are retained in dm-orbit-v22 evidence for Base follow-up.
