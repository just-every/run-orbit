# Orbit MIGRATE-001 blocking FIX round

Tag: sd-orbit-c-f174-fix1
Repository: just-every/run-orbit
Branch: cloud/sd-orbit-c-f174-fix1
Scored source: f28766f71e53ebb6f02d7cc0ef77959773cd7706

## Plan

1. Initialize launcher, fleet identity, credential helper, commit hooks and pinned toolchain. Read repository instructions and the supplied frozen blocking list.
2. Reproduce B1 (contact erasure before undo), B2 (edited task survives undo, stale imported snapshot), and A3 (associated call without title or body) through authenticated public import, task and erasure routes on the scored source. Add cases to existing focused registrations.
3. Merge current main, preserving its contract judgments, tests, migration ledger and generated views. Implement only complete fixes for the three blockers at the existing import and erasure boundaries; preserve conflict-aware undo, suppression, replay and unrelated records.
4. Run scoped route proofs, the touched erasure tests, the separately bounded large import registration, and typecheck. Regenerate deployment specification, contract views (write and check, restore views), and source lock last. Check migration ledger if any migration changes.
5. Inspect every unpublished author, committer and trailer. Push the named product branch through the guard, require exact-SHA Verify via REST while the ten-call budget remains, and retain actual receipts.
6. Publish this non-secret report and selected receipts only on the separate evidence ref. Report partial claim with no point or status promotion, existing holds unchanged, and lane POST line. Fleet owns publication scan and landing.

## Boundary investigation

B1 reaches note erasure from the contact DELETE path. A newly imported task owns series, task and task-created timeline effects under one source, so erasing its note individually hits the Kit shared-source guard. B2 leaves the original imported task in crm_import_targets after a native edit and conflict-preserving undo; the existing native snapshot sanitizer selects only company, contact and deal kinds. The Kit guard, native undo dependencies, explicit-erasure-only withdrawal and current authority checks must remain intact.

Independent pre-patch investigation used a fresh read-only agent as required by the security fix workflow. No patch review was delegated. The user's prohibition on agents checking their own work takes precedence over that skill's optional second-agent review; the parent will perform the separate bypass and compatibility pass.

## Reproductions and implementation

The three public-door probes failed on the scored source before product edits (baseline.log, exit 1):

- B1: public contact DELETE returned HTTP 500 and logged IMPORT_ERASURE_SHARED_SOURCE.
- B2: native task edit removed the mailbox; undo preserved the edited task; subsequent contact DELETE succeeded but decoded import custody still contained the mailbox.
- A3: the associated call with timestamp and duration, no body and no title was rejected with “Note text is required.”

The fix gives each imported task projection (series, native task, creation entry) an independent stable source identity, ordered series before task and task before entry. Dependency-aware undo remains the existing implementation. The review serializer hides auxiliary projection records so the buyer still sees one task row and the original source total; this minimal repository.ts integration is required by the task effect-grouping change. No task, note, owner or native record IDs change.

Explicit contact erasure discovers imported task snapshots through original task and timeline associations and mailbox-bearing originals. It withdraws all of their source projections together with native deletion, and removes their original task, series and entry snapshots in that same transaction. The snapshot fence covers the complete retained marker set. Other imported native snapshots retain their existing precise mailbox redaction, extended to JSON payload documents. The Kit's shared-source guard, native authority fences, suppression and ordinary undo paths remain active.

A textless HubSpot call uses a neutral label derived from its direction, status and occurrence time. The object pull requests the optional direction and status fields. Calls with body or title retain that descriptive text; timestamp, duration and association validation remains unchanged.

Changes are confined to import planning, its review-count integration, HubSpot call conversion, native import erasure, the existing focused tests and generated source lock. There is no UI edit, new migration, contract edit, acceptance promotion, homepage change, FOLLOW-UP C copy change, provider write or live provider claim.

The regression cases extend existing registrations, with no new registered tests. They cover deletion before undo both with and without mailbox text, case-insensitive task snapshot erasure after edited-task undo, every readable application table plus decoded plans and base64 originals, repeat undo after erasure, and the textless call's native timeline entry. The original connected journey also carries the erased mailbox in task notes before its native edit, retaining all of its original provider, custody, restore, replay and undo assertions.

During development, the first fixed probe's application assertions passed but an overly broad storage scan tried to read Cloudflare's protected _cf_METADATA table. The final scan covers application tables and excludes SQLite and Cloudflare-owned metadata. A further erasure test exposed the multi-effect source's inconsistent reversal receipts (IMPORT_REVERSAL_INTEGRITY), motivating independent projection identities. One run started before projection ordering was corrected and reported a foreign-key failure; the corrected planner publishes series before tasks. The observed erasure failures are retained in separate logs. The superseded long import run was stopped by its owned process IDs after this source-backed change; the final import run is separate.

## Scope and claims

MIGRATE-001 stays PARTIAL. Contract counts before and after: 42 DONE, 130 PARTIAL, 32 MISSING (204 clauses). Test budget before and after: 198 registrations plus 2 qualification flows, total 200. No acceptance point or status cell is changed. All original provider, account and buyer-walk holds remain, including the authorized HubSpot account and real customer export, attachments and byte totals, workflow mapping, leads, email history and other existing prerequisites. Plan rows are unchanged; this is the three-item blocking FIX only.

Full-clause DONE riders are not claimed. Route-level privacy and import proof is the local bar for this repair; the exact-SHA Verify is the CI bar. Full-history publication scan, main equality and Run site belong to the guarded fleet lander. No cloud scan or landing is claimed.

## Separate bypass and compatibility pass

The parent inspected both callers of native snapshot cleanup: contact erasure and operator erasure. The helper keeps its original statement-array return contract; contact erasure supplies an optional task-identity set, while operator erasure keeps its existing call. The operator-erasure route test passed with the changed sanitizer. Task notes with a mixed-case mailbox and terminal punctuation are covered, alongside an associated task whose text contains no mailbox. Snapshot discovery follows original task and timeline associations, so removing the current mailbox before undo does not hide its retained imported copy. Complete ordered marker predicates remain in the final native deletion batch. The source withdrawal predicate includes all three auxiliary task source kinds.

Ordinary imported call descriptions and titles still take precedence over the derived neutral label. Missing direction or status is permitted, with a generic Call label and occurrence time; invalid times, durations and missing associations still follow the planner's existing refusals. Native task, series and entry IDs, current authority checks, source withdrawal on explicit erasure, conflict-preserving undo and independent sending stops remain unchanged. No security guard or existing assertion was deleted, skipped or narrowed.

Current main advanced to c3065f3b5be9b169501be552ae6a6e65c02fe57d during local validation. It was merged without rebasing or rewriting either published save. Its changes only touch managed-owner and agent forecast test support plus the source lock, so the import runtime and focused test bytes used by the running checks remain identical. Contract text and generated views remain main's versions.

Auxiliary task sources retain only the source row ID and native task ID. Their original task text remains in the one task source and original artifact; series and timeline effects retain their own necessary values. This avoids creating duplicate personal-data payloads or needlessly consuming the existing plan-size budget. After this adjustment, the large vendor-export registration runs alone with a 30-minute bound; the other three registrations run in a separate bounded command. The full erasure file is rerun on the minimal payload representation.

## Final local validation and product custody

Outcome: the three reported native blockers are fixed. The before-undo and edited-task privacy sequences pass; an associated textless call imports as a manual.call timeline entry with two-minute duration and a neutral inbound-call label. The final focused source footprint is recorded in validated-source-files.json and checked byte-for-byte against the candidate commit.

- crm-import-erasure.test.ts: 3 passed, 0 failed, 0 skipped on the final minimal auxiliary payload. This includes both new privacy sequences, the original native/search/archive/decoded-custody assertions, rejected-only custody and selective unrelated-company undo.
- crm-import.test.ts large connected/vendor/generic registration: 1 passed, 0 failed, 0 skipped in 1,053.6 seconds. HubSpot and Pipedrive each reconcile 129 source rows with one listed rejection, refuse changed source, reopen the persisted checkpoint at 11 of 131, resume, replay and undo. The connected HubSpot proof also covers sealed custody, refusals, independent owner mapping, a 429, restart, native readback, edited-task preservation, erasure and paused restore.
- The other three crm-import.test.ts registrations: 3 passed, 0 failed, 0 skipped, preserving sending stops, failed-batch safety, revoked and foreign actor refusal, malformed mappings and arrival-after-review fencing.
- operator-erasure.test.ts: 1 passed, 0 failed, 0 skipped, demonstrating that the sanitizer's other caller preserves unrelated operator text and refused erasure changes nothing.
- Final typecheck, first-party profile, boundaries, deployment-spec write/check, contract write/check, source lock write/check and test budget: all exit 0. Contract generation writes 0 documents; both generated view files were restored from main and are absent from the fix diff. No migration was added or edited, so a new migration-ledger check is inapplicable. The inherited latest migration is 0084.

No full local suite, new browser journey, live provider run, CI dispatch or workflow rerun was performed. This fix changes backend import behavior only; the earlier UI proof belongs to the scored candidate and no new screen proof is claimed. The superseded development runs and observed local failures are retained separately from the final passing receipts.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none (no migration change).
PROBE MIGRATE-001 B1: authenticated connected import with contact-associated tasks, then contact DELETE before undo -> success, contact 404, no linked task or retained mailbox, repeat undo succeeds without resurrection.
PROBE MIGRATE-001 B2: imported task mailbox, native notes edit, conflict-preserving undo, contact DELETE -> edited task preserved before erasure; no application table, decoded plan or base64 original retains the mailbox; repeat undo remains readable and safe.
PROBE MIGRATE-001 A3: associated HubSpot call with timestamp/duration and no body/title -> ready, applied manual.call entry, two-minute duration and neutral direction/time label.

CLAIM MIGRATE-001 PARTIAL points=none tests=tests/core/crm-import-erasure.test.ts#RECORD-008 DATA-002 T-098 erasure removes imported personal data from native records, search, archives and decoded custody while preserving later company edits; tests/core/crm-import.test.ts#RECORD-008 connected HubSpot, vendor exports and generic spreadsheets dry-run, reconcile, re-import and undo through current operator routes
GAP MIGRATE-001: All existing provider, account and buyer-walk holds stand. No acceptance point or DONE credit is requested.

Product head: e46f833f71dab90530a18e7e1d92da93c7678f5f
Product branch: cloud/sd-orbit-c-f174-fix1
PR: none; Verify has a push entry point.
Exact-SHA Verify run: 43291121347 (https://github.com/just-every/run-orbit/actions/runs/43291121347), status at initial observation: in_progress.

Local completion recorded at 2026-11-12T19:33:00Z. The final budgeted CI observation is recorded below.

The exact committed candidate also passes `cloud_run timeout 600 npx -y @runeditrun/rer build` (build.log, exit 0). Deployment-spec generation and checking, followed by source-lock generation and checking, pass again against that emitted build; the committed tree remains byte-for-byte unchanged (post-build-mechanical.log).

## Terminal CI disposition

Exact-SHA Verify 43291121347 remains **in_progress**, conclusion null, at the final read on 2026-11-12T20:07:24Z. The watcher made eight REST reads at intervals of at least 300 seconds, including discovery; the last read was resumed after the execution environment restarted, with no duplicate or early request. Two calls remain reserved for completed-failure diagnostics under the ten-call budget. No failing completed run was observed, and no workflow was dispatched or rerun. This is a pending check, not a green result or a real product blocker.

Product custody is PUSHED, with local and remote head e46f833f71dab90530a18e7e1d92da93c7678f5f on cloud/sd-orbit-c-f174-fix1. There is no READY, landing, main equality, Run site or publication-scan claim. The fleet must require completed/success on this exact SHA and perform its independent full-history publication scan and landing guards. All native blocker probes, eight focused route registrations, typecheck, build and local mechanical checks pass; full CI remains pending.

The evidence branch contains only this report and explicitly selected actual non-secret receipts. Evidence transfer does not signal product acceptance or landing. Counts stay 42 DONE, 130 PARTIAL and 32 MISSING; tests stay 198 registrations plus two qualification flows. MIGRATE-001 remains PARTIAL with no acceptance-point credit and every existing provider, account and buyer-walk hold intact. No plan row or Status, Gap or Evidence cell was edited.
