# Orbit RECORD-014 saved-view continuation — sd-orbit-c-f167

Repository: just-every/run-orbit. Product branch: cloud/sd-orbit-c-f167.
Candidate: 0e03cabe468040db4c5a6cb5b9f7bdf21072524a. Starting commit: 7ba57f6aaa8efebf0b0493417fe6c1f8aa706572.

The selected saved-filtered-view limb is implemented. This continuation also corrects a demonstrated erasure defect: a saved view could keep exposing a deleted contact's mailbox in its saved search. The existing authenticated erasure transaction now withdraws definitions containing that contact's primary or alias mailbox. It preserves unrelated definitions and never clears a search into a wider list. The existing RECORD-014 proof now exercises this outcome through native routes, including populated export.

RECORD-014 remains PARTIAL. No acceptance sentence, Status, Gap, Evidence or count is edited, and no hold is released. Before and after: 42 DONE, 130 PARTIAL, 32 MISSING; 204 clauses. Test budget before and after: 198 registered cases and two qualification flows, total 200. No registration or existing assertion is removed, narrowed, skipped in CI or moved behind a condition.

## Full execution plan

1. Read the supplied plan extract, rulings and DONE riders, launcher and repository instructions. Map the one selected saved-view limb to the carried implementation and registered tests; preserve every omitted obligation and hold.
2. Use a fresh full-history clone, fetch the prior branch and create this run's branch at the specified commit. Install fleet Git credentials and commit hooks, keep repository hooks active and use fleet author and committer identity. Rebase the unpublished branch onto current main before publication; after publication, use merges only.
3. Exercise populated native create, reopen after a store restart and fresh session, edit and delete for contacts, companies and opportunities. Preserve search, state, pipeline, stage, band, queue, owner and Unassigned filters, chosen typed columns, sort and stable record identity ties.
4. Exercise private and workspace visibility, stale revisions, current full-operator authority, actual collaborator refusal, removed sessions, archived labels, erasure and populated export and restore. Correct only a demonstrated defect. Extend the existing proof rather than adding a registered case.
5. Run the requested native, upgrade and archive checks, typecheck, first-party and boundary checks, contract generation, deployment checks and source lock. Run the existing emitted browser journey and preserve desktop and phone evidence. Regenerate the source lock last.
6. Inspect all candidate authors, committers, messages and trailers, and unchanged contract judgments. Push only the named cloud branch through the fleet guard. Discover exact-SHA Verify via REST within the ten-call budget; do not dispatch or rerun an existing run.
7. Save the full non-secret report, actual receipts, logs and relevant screenshots in this packet. Publish only the separate evidence ref, verify its manifest and hashes, then remove the successfully pushed clone and dependencies. Leave full-history scanning and guarded main landing to the Mac fleet.

## Demonstrated defect and resulting correction

On the starting SHA, a native probe created a contact, saved a workspace view whose search was that contact's mailbox, verified the populated view, deleted the contact and reopened the view. Actual output was `remainingRows: 0, definitionRetainsErasedMailbox: true`. It exited 1 with `Erased contact mailbox remains readable in the saved-view definition`. The non-secret terminal output is in erasure-before.log.

The correction is `savedViewContactErasure` in `src/core/features/records/saved-views.ts`, called with the contact's primary and alias identities from `src/core/features/records/data.ts` within its existing erasure transaction. It uses the existing boundary-aware identity matcher. A matching definition is withdrawn, including its name and search, rather than rewriting it into a broader query. Existing DATA-002 and DATA-003 erasure obligations govern this behavior; no new authority or policy scope is introduced.

The existing `tests/support/saved-views-proof.ts` now creates populated workspace views containing the mailbox in either the name or search. It proves a current full reader can open them before erasure; both author and reader receive 404 afterward; an old edit receives 404 and cannot recreate them; discovery and populated export contain no mailbox; the unrelated view and its archived column remain readable and restore normally. Test fixture addresses are assembled from synthetic components, with no added literal mailbox string or provider-shaped key.

The product erasure hook, existing native proof helper, existing browser journey and its retitled registration, plus the generated source lock, are the new edits in this continuation. The three requested starting commits and all other writers' work are retained. There is no homepage, logo, workflow, Base pin or migration edit in this continuation. The inherited additive migration and its archive registrations remain intact.

## Selected point coverage

The native registration is `tests/core/records-complete.test.ts` — “RECORD-014 typed fields and saved filtered views retain current access, stable sort and archived meaning through export”. It calls typedFieldsProof and savedViewsProof beside each other.

| Selected outcome or inherited duty | Public-door assertion |
| --- | --- |
| Save named filtered lists for all three kinds; preserve search, opportunity filters, owner and Unassigned | `tests/support/saved-views-proof.ts:12` through line 29 creates each kind, stores the entire definition, closes and reopens the store with a fresh session, compares all filters and exercises assigned and unassigned owners. |
| Chosen columns including typed fields; numeric ordering and stable record identity ties | Same helper lines 17 through 26 checks exact persisted columns, ties against independently ordered IDs, descending numeric order and a newly added matching row. |
| Private author access and workspace sharing | Same helper lines 19 through 25 checks private discovery and open refusal for a second full operator, then a successful workspace read and refused nonauthor mutation. |
| Revision-guarded edit and delete | Same helper lines 23 through 25 checks stale edit and delete return 409 and change nothing. Line 55 deletes at the current revision and requires 404 afterward. |
| Recompute records and authority on open | Same helper lines 26 through 41 checks new matches, ownership changes and erasure. Lines 44 through 50 use a real invited collaborator and require refused discovery, open and save with unchanged definitions, plus a removed session's 401. |
| Erasure removes personal saved definitions without widening unrelated views | Same helper lines 31 through 41 opens populated matching definitions, erases the contact, requires author and reader refusal plus stale-edit refusal, checks discovery absence and preserves the unrelated view. Line 54 checks populated export contains no erased mailbox. |
| Archived label and read-only value remain | Same helper line 30 checks archived metadata and retained value. `tests/support/typed-fields-proof.ts:27` through line 41 checks immutable definition history and refuses changing an archived value. |
| Populated export and restore; no transferred session | Saved-view helper lines 52 through 54 opens the actual export, compares definitions, imports and finalizes the archive through native routes, refuses the source session and checks fresh row counts, archived labels and revisions. |
| Typed-field foundation credited by the brief | `tests/support/typed-fields-proof.ts:12` through line 41 covers typed validation, required and unique values, concurrent unique refusal, affected-record preview, stale preview refusal and archived meaning; lines 43 through 54 prove paged immutable history and fresh restored reads. |
| Browser save, sort and reopen with both-width evidence | `tests/delegation-browser/typed-fields-journey.mjs:36` through line 50 saves and reopens the view, verifies selected sorting and hidden email, displays the archived field's retained value, refreshes changed definitions and current matching rows, checks overflow and serious accessibility violations, and captures 1440 and 390 screens. Lines 51 through 55 then edit the view through its visible control, verify revision 2 after reopening, delete it through the page and require 404. It runs inside the existing records-layout registration. |

## DONE riders

| Rider | Result for this partial claim | Evidence or boundary |
| --- | --- | --- |
| 1 | FAIL for full-clause DONE; selected limb covered | Territory objects, relationships, layouts, lead conversion, reviewed bulk field edits, attributed value history and held duties remain unclaimed. Selected mapping is above. |
| 2 | PASS for selected limb | Real populated records, independently checked IDs and values, both allowed reads and refused private, collaborator, removed-session and stale mutation paths. The export is populated and inspected. |
| 3 | PENDING: exact candidate Verify 43150580930 is running (push) | The ordinary Verify plan loads the native, upgrade and browser registrations. Exact candidate run and event are recorded in CI.json. Starting SHA Verify 43138188401 was full and successful; it is not presented as proof of the later correction. |
| 4 | PASS: final candidate browser, onboarding and forward upgrade; identical native proof bytes | Source and test identities and actual local receipts identify which SHA or tree was exercised. Final browser screens and runtime checks are retained separately from the initial probe. |
| 5 | INSPECTED | The existing clause metadata cites BASE-INPUT-001, BASE-ROLE-001, BASE-INPUT-003 and BASE-DATA-003. DATA-002 and DATA-003 already require mailbox and derivative erasure. No inheritance text changed. |
| 6 | PASS: write, check, lock, deployment and migration history checks all exit 0 | Contract write and check run, generated views are restored from main, and source lock is regenerated last. All main judgments and summary counts remain unchanged. |
| 7 | PASS | No acceptance, ruling or coverage-map edit. |
| 8 | PASS for selected limb | Public private-view refusal, full workspace read, collaborator read and write denial without changes, removed-session denial and stale mutation refusal; erased definitions cannot be reopened or recreated by an old edit. |
| 9 | NOT CLAIMED | No provider, live-account, legal, native-device or retention qualification is asserted. |
| 10 | PASS | No new policy default. Existing full-operator scope, collaborator denial and contact erasure apply. |
| 11 | PENDING FLEET | Main equality, COMPLETE full-history publication scan with zero findings and the landed Run site remain the guarded lander's duties. This builder never pushes main. |

## Pre-ready self-check

The selected visible outcomes have native and emitted-browser proof. Existing assertions remain intact and the test budget stays 200. Removed credentials cannot read saved views; contact erasure removes personal saved definitions and matching result rows; archive restoration never carries source sessions or grants. The new erasure hook is general and uses no fixture-specific branch or answer.

Typed-field configuration remains in Settings. The saved-view controls have visible text, existing filter-chip icon controls use ActionTooltip, and the saved-view desktop and phone screens were inspected. No rounded control receives a one-sided border. The candidate's lock, generation, deployment and runtime receipts are recorded below. No cloud publication scan, main equality or new Run site result is fabricated.

## CI observations before the correction

The starting candidate's exact-SHA full Verify 43138188401 completed successfully on a push event. Its source job and all 20 routine shard jobs passed. Metadata is retained in inherited-verify.json and inherited-verify-jobs.json.

Fetched main b3e94efdc16e4ae467cd2ed283ee4eb0dc4c0c31 has successful exact-SHA Verify 43089571350 and successful Run site 43094710902. A duplicate Verify 43094710689 reports failure. Its job response shows a cancelled source job 130780671601 with an artifact-retention failed step, skipped shards and a queued aggregate; no job has a failure conclusion or failed test assertion. Both responses are retained. No speculative product repair or workflow rerun was made for that duplicate.

## Claim and held remainder

CLAIM RECORD-014 PARTIAL points=1 tests=tests/core/records-complete.test.ts#RECORD-014 typed fields and saved filtered views retain current access, stable sort and archived meaning through export; tests/delegation-browser/records-layout.test.ts#emitted Worker record and NOW lists wrap full valid long names and save, edit, reopen and delete sorted views; an invited collaborator opens only permitted mentions and survives grant revocation at 1440 and 390

`points=1` identifies only the planner-selected saved-view limb of acceptance 1 and the credited typed-field foundation. It does not assert that the full acceptance sentence is complete.

GAP RECORD-014: Custom objects, explicit relationships and layouts, lead qualification and conversion retaining source, activities and consent, reviewed bulk field edits with individual failures, attributed field-value history, AUTO-002 inherited approval and the existing TEAM-005 holds remain unclaimed. No hold is released and no other target is started.

Plan row for the lane: qualify the selected RECORD-014 saved-view limb, retain PARTIAL and all existing holds. No fleet plan file or inbox is read or written here. Counts remain 42 DONE, 130 PARTIAL, 32 MISSING; no promotion or restoration is claimed.


## Final local results and custody

- Expanded RECORD-014 native registration: PASS, exit 0, one selected case. The actual output includes `erasedDefinitions: true`, three restored views, stable ties, current owner filters, archived columns, private 404, collaborator 403, removed-session 401 and stale edit and delete 409. Its runtime and proof bytes are identical in the saved correction and final candidate; native-proof-source.json records their hashes and this comparison.
- Final `tests/core/onboarding-archive.test.ts`: PASS, exit 0, one case, 878613.5968 ms on the candidate. It includes erasure after restored data and rejection of source sessions.
- Final `newtests/t096/forward-upgrade.test.ts`: PASS, exit 0, one case, 839614.273047 ms on the candidate. Historical native values, custom DDL, current identities and earlier archive generations survive.
- Final emitted records-layout browser registration: PASS, exit 0, one case, 289907.266531 ms on the candidate. It uses system Chromium, performs save, edit, reopen and delete, and preserves the clause's actual screens at 1440 and 390. No serious or critical accessibility violation, horizontal overflow, page error or hydration error was accepted.
- The original requested batch also passed all four cases before the new correction. A first focused command was refused before its test body because its required isolated test-state variable was absent; the corrected invocation prepared an isolated fixture and passed. No code or assertion was changed to repair that invocation error.
- Typecheck, first-party contract check, boundaries, deployment specification, contract generation and source integrity: PASS, exit 0. The ledger check proves all 75 main migrations retain their bytes and the single inherited additive migration is registered with matching SQL and SHA-256 digest.
- Product save 3074766c93fc3cdc831b2b924d518d9a90400499 and final candidate 0e03cabe468040db4c5a6cb5b9f7bdf21072524a were pushed through the fleet guard. The save carries `[skip ci]`; the final candidate does not. All candidate authors and committers are fleet identities, there are no co-author trailers and all candidate messages were inspected, including side parents. Published history was never rebased or forced.
- Main remained b3e94efdc16e4ae467cd2ed283ee4eb0dc4c0c31 at the final fetch and merge check. The merge was already up to date. CONTRACT.md differs from main by zero bytes, both generated views are main's versions, and the final source lock passes. No PR was needed: the named branch push starts Verify directly.

PROBE RECORD-014 1: authenticated Records creation and saved-view reads for contacts, companies and opportunities, followed by contact erasure, stale edits, collaborator reads, populated export and restore -> matching personal definitions become 404 while unrelated definitions remain 200; stale revisions return 409 and change nothing; collaborators get 403, removed sessions get 401; fresh reads retain filters, sort, archived labels and values, and three permitted definitions restore without source sessions.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check, followed by restoring both generated views from main exit=0; ledger=python3 /tmp/check-orbit-migration-ledger.py and node scripts/publish-deployment-spec.mjs --check exit=0.

The packet contains the complete actual non-secret report and relevant terminal receipts. Source-lock-check.json is the real CLI output; the migration checker is retained for reproduction from the clone root. No credential, environment dump, held-out gate material or symlink is selected. Evidence publication is a report transfer only and makes no product acceptance or landing claim. Full-history publication scan COMPLETE with zero findings, exact-main equality and Run site on the landing SHA remain unestablished here and belong to the guarded Mac lander.
