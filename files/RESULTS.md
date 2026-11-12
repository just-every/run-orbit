# Native connected migration result

MIGRATE-001 remains PARTIAL. This branch closes the supplied connected-pull limb of acceptance 1. It does not claim acceptance 1 as a whole or acceptance 2. Counts remain 42 DONE, 130 PARTIAL and 32 MISSING, with 198 registrations and two qualification flows. No acceptance sentence, Status, Gap or Evidence cell was edited.

The installation owner connects a read-only private app. Credentials stay sealed in a private installation table, never in responses, diagnostics or archives. CRM v3 objects, properties, owners and pipelines and CRM v4 association pages are persisted before review. Pagination uses fixed API paths and provider cursors, never provider redirect links. Every committed page is recoverable. The reviewed source bundle retains both generated CSV and original API pages in existing private Kit custody. Explicit mappings distinguish Contact, Company, deal and task owners; there are no invitations. Unsupported custom properties and held object families are visible. Apply rechecks reviewed provider pages, persists Retry-After and rechecks current provider authorization before native batches. Existing suppression-first Kit publication, replay fencing and conflict-preserving undo remain in force.

Calls and meetings use the native manual-entry payload, and tasks use the existing task constructor and native task and timeline tables. Stable source IDs, source provenance, associations, occurrence times, duration, native stage mappings, values and custom fields remain reviewable. Undo preserves edited contacts, edited tasks, dependencies and independent stops while removing unchanged imported tasks. Explicit contact erasure withdraws original API custody, generated originals, reviews and reconciliation summaries. Successful Records restore clears held HubSpot authority; local CLI restore requires disconnecting any destination token first. The account stays paused until fresh owner connection.

## Frozen native rubric for this round

| ID | Selected outcome and door | Proof |
| --- | --- | --- |
| R1 | Owner-only connection, sealed local custody and no echo | `tests/support/hubspot-api-proof.ts`, `hubspotApiFlow`: non-owner refused, under-scoped token unresolved, owner connection succeeds and sealed custody opens only with the installation key; refusal bodies never echo the token. |
| R2 | A refused object names its scope and export action without silently dropping data | The same journey refuses notes metadata at the HTTP edge, reads unresolved setup and an explicit scope and export instruction, then reconnects. |
| R3 | Paged companies, contacts, deals, owners, custom properties, notes, calls, meetings, tasks and associations | The same journey collects every type, two source pipelines, separate native stage mappings and three separate chosen owners; authenticated Records and task reads check actual values and associations. |
| R4 | Saved dry run reconciles counts, unsupported fields, ownership, duplicates and consent | The same journey checks 11 rows, per-type totals and the unsupported property; native owner reads and suppression precede customer effects. The unchanged CSV and export journeys remain loaded in the existing registration. |
| R5 | Retry-After and interruption retain page and native checkpoints | The same journey restarts the database after a committed source page and a rate-limited Apply, refuses early retry and completes the saved import. The built wizard exercises both pull and Apply recovery. |
| R6 | Current authenticated native records, activities and tasks expose imported history | The same journey opens Records, the normal opportunity door and task history, checking native IDs, source attribution, occurrence times, duration, values, custom fields and linked records. |
| R7 | Unchanged rerun adds nothing; undo preserves native edits and stops | The same journey completes a second reviewed pull without new history, undoes it without stealing effects, edits a contact and task through native routes, then removes only the unchanged imported task. |
| R8 | Erasure and restoration cannot revive provider authority or private source data | The same journey checks decoded custody and summary withdrawal and refuses erased-source Apply. `tests/support/hubspot-restore-proof.ts`, `hubspotRestoreFlow`, actually exports and restores through Records with a token already held at the destination, then proves the source paused and intake refused. |
| R9 | Changed screens work in the existing Settings surface | `tests/e2e/imports.spec.mjs`, the retitled existing import registration, calls `hubspotBrowserFlow` with the real emitted Worker and only the HubSpot HTTP edge replaced. Assertions run at 1440; connection, refusal, preview and resumed screenshots are captured at 1440 and 390. |

The registration is `tests/core/crm-import.test.ts` — RECORD-008 connected HubSpot, vendor exports and generic spreadsheets dry-run, reconcile, re-import and undo through current operator routes. Existing CSV, prepared HubSpot export, owner and privacy assertions remain. No assertion was removed, skipped or placed behind a width or environment condition.

## Full-clause boundary

Acceptance 1's authorized test-account pull, attachments and file byte totals, workflows, leads and email activity remain omitted or held exactly as supplied. Acceptance 2 needs an actual authorized customer export. No HubSpot developer account or live token was supplied or sought. RECORD-018, RECORD-027, AUTO-002, RECORD-014, RECORD-007, RECORD-016, MIGRATE-002, MIGRATE-003 and TEAM-005 keep their supplied holds and judgments. No release prerequisite or other plan row changed.

DEFAULT MIGRATE-001: the current installation owner alone connects and pulls HubSpot; read-only provider access, explicit Orbit owner choices, no invitations, no provider writes and no outbound approval. This is the standing conservative floor; no new DONE award is requested.
GAP MIGRATE-001: authorized account and real customer-export qualification, attachments with counts and bytes, workflows, leads and email activity remain unproved or held.

## DONE riders and pre-ready check

| Rider | Result |
| --- | --- |
| 1 | Selected native outcomes have public-door proof. Full acceptance remains PARTIAL for the named external and held remainder. |
| 2 | Populated records are read after Apply; refused authority and scopes change no customer data; edited and unchanged effects take different undo paths. |
| 3 | Exact-final Verify event and conclusion belong in the CI receipt. No green result from another SHA is substituted. |
| 4 | The browser proof ran at 35c9efe1df9a70d932d3e44d6996942b0bf3cbe6; the candidate differs only in generated sources.lock.json, with every runtime, UI and test byte unchanged. The current native source proof is recorded. Earlier complete retained tests are distinguished from subsequent focused proof of touched corrections. |
| 5 | Existing BASE-DATA-001 and BASE-INPUT-001 citations remain unchanged. |
| 6 | Contract write and check pass locally; generated views are restored from main and never authored in this branch. |
| 7 | No acceptance text or coverage rewrite; all parent Status rows remain. |
| 8 | Non-owner connection, missing scope and revoked token are refused; the allowed owner path completes. |
| 9 | No live-account, real-export, attachment, workflow, lead or email-history proof is claimed. |
| 10 | Conservative owner-only custody and explicit mappings are named; the clause stays PARTIAL. |
| 11 | Guarded landing, main equality and the full-history publication scan remain fleet duties. The cloud never pushes main. |

The touched controls retain Orbit's existing components and Settings placement. Text is at least 13px. All added controls have visible text; decorative clips are not controls. No new icon-only control or one-sided border was added. The responsive screenshots were inspected. No homepage, logo, workflow definition or dependency pin changed.

## Validation and custody

Actual command receipts, exact product provenance, CI observations, migration hashes and selected screenshots accompany this report. The retained touched native files passed seven cases. The current connected proof additionally covers separate stage mappings, edited-task preservation, erased reconciliation summaries and actual restore pause. The existing browser registration passed. Typecheck, boundaries, first-party checks, deployment specification, generated contract checks and source lock checks are recorded separately.

Product publication and evidence publication are independent. No public scan or main landing is claimed in the cloud. A report-only evidence ref is not READY, acceptance or landing.

## Public-door probes

PROBE MIGRATE-001 1: owner connection and paged CRM reads through authenticated import routes -> 11 reviewed rows, two pipelines, separate chosen owners, unsupported-property reconciliation and suppression before native records; refused owner and scopes remain unresolved without token echo.
PROBE MIGRATE-001 1: saved Apply after committed source page and Retry-After -> interruption resumes, early retry refuses, current Records, normal deal history and tasks show imported native effects.
PROBE MIGRATE-001 1: second reviewed pull and undo after native edits -> rerun adds no history, unchanged task is removed, edited task and contact and independent stop remain.
PROBE MIGRATE-001 1: explicit contact erasure and actual Records archive restore -> source custody and summary are withdrawn, erased-source replay refuses, restored provider connection remains paused.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs check exit=0; views=node src/base/contract-docs.mjs write then check exit=0, generated views restored from main; ledger=isolatedDatabase actual migration names compared with migration files exit=0 (77 rows).

Proof entry lines: tests/core/crm-import.test.ts:17 and :52 load the native journey; tests/support/hubspot-api-proof.ts:37 defines the populated API journey and :71 invokes actual restore; tests/support/hubspot-restore-proof.ts:9 defines the restore journey; tests/e2e/imports.spec.mjs:10 and tests/e2e/imports-hubspot.mjs:11 load the browser proof. These are existing registered cases, extended in place.
