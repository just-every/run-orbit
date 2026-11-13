# sd-orbit-c-f183-pc1 report

Repository: just-every/run-orbit
Branch: cloud/sd-orbit-c-f183-pc1
Candidate: e2d1b48b46f9d0296b241c3e1cda0da05da112f8
Saved starting head: 1f9dd79164d7043a3c0e5eaff8365d8a98dca209
Preservation save: d09717c (full identity in SAVE.json)
Integrated main: 90c58e001a5a5ae74e81a61526fb3e88b9f616ed
Verify: {"conclusion": null, "event": "push", "head_sha": "e2d1b48b46f9d0296b241c3e1cda0da05da112f8", "html_url": "https://github.com/just-every/run-orbit/actions/runs/43351891555", "id": 43351891555, "name": "Verify", "observed_at": "2026-11-13T02:25:27.871283+00:00", "status": "in_progress"}
PR: none; Verify has a branch-push entry point.

## Outcome and scope

MIGRATE-003 is claimed PARTIAL. The selected Account and Contact limb of acceptance 1 is implemented and covered by the retained native HTTP and browser journeys. Neither complete acceptance sentence is claimed closed. CONTRACT.md, its Status, Gap and Evidence cells, and both generated views are unchanged from integrated main. Counts remain 42 DONE, 130 PARTIAL, 32 MISSING, 204 total. Test budget remains 198 registrations plus two qualification flows, 200 total. No assertion was removed, skipped, narrowed or placed behind a viewport condition.

The continuation reproduced and repaired the real red assertion from Verify 43332782884, failed job 131582986014, on the exact saved head. The new Salesforce contact-erasure trigger was incorrectly retained when reconstructing historical archive schemas. The new explicit pre-Salesforce generation removes only that known trigger from historical contact schema descriptions. Current schemas, erasure behavior, custody exclusions, schema fences and owner-defined objects remain protected. The retained upgrade journey now constructs the actual preceding migration store and validates its archive identity, alongside the original released and migration-0049 assertions.

Current main's HubSpot connector was merged without rewriting either published parent. Conflict resolution retains both connectors, HubSpot originals and paging, separate Salesforce diagnostics, both owner and connection fences, restore exclusions and all existing tests. The final qualification also adds valid source-review Apply replay refusal after restore and operator instructions for Salesforce in the moving guide.

## Plan and results

The full original execution plan is PLAN.md. Its steps are: preserve the saved branch; obtain the failed log once; reproduce its exact batch before editing; repair the demonstrated archive generation defect; integrate main while preserving both connectors; run touched tests, browser proof and mechanical checks; publish the product candidate through the fleet guard and publish this packet separately. The supplied inline plan extract guided scope. No filesystem lane plan, INBOX or STATE file was read or changed. The only plan-row return is MIGRATE-003's selected native limb; every held row and release prerequisite remains unchanged.

REPRODUCTION.json and reproduce-batch-7.log record the real nonzero reproduction. The exact assertion is: “0049 retains exact columns, objects, triggers and views after stripping the library additions”. Current main passed that archive section before later timing out in an unrelated fixture migration. The initial cloud batch additionally hit Wrangler migration-start ETIMEDOUT on other cases. MAIN-CONTROL.json and main-forward-upgrade.log preserve that same environment timeout on main. Those timeouts did not justify a product or test change. System Chromium at /usr/bin/chromium was launch-probed with no sandbox; temporary local browser executable links avoid preloading browser libraries into every migration process. No repository browser or timeout guard was weakened.

The direct repaired historical archive proof passed: released store 202 tables and 208 rows; preceding store 207 tables and 209 rows; zero foreign-key violations. See repaired-archive-proof.log. The original full batch and retained CRM import registrations have their actual execution receipts beside this report. The qualification adds a restore-refusal assertion and operator documentation. The final metadata declaration and merge also retain main's dashboard report-link fix. FINAL.json proves every selected Salesforce runtime, migration, archive, native proof and browser proof path is byte-identical to the passing local proof commit.

## Selected native proof register

These rows describe the selected limb; they do not promote either complete acceptance sentence. Native Salesforce proof is in tests/core/crm-import.test.ts, test “RECORD-008 connected HubSpot, Salesforce OAuth, vendor exports and generic spreadsheets dry-run, reconcile, resume and undo through current operator routes”, through tests/support/salesforce-api-proof.ts. Browser proof is the existing tests/e2e/imports.spec.mjs registration, test “RECORD-008 connected HubSpot, reviewed vendor files and plain CSV import and undo through the responsive native wizard”, through tests/e2e/imports-salesforce.mjs.

| Item | Public door and observed assertions | Proof location |
| --- | --- | --- |
| OAuth state and code | Native start and callback refuse unconfirmed consent, expired or foreign-session state, unknown state, replayed state and replayed code before a further provider call. Revoked native session cannot finish. | tests/support/salesforce-api-proof.ts:21-32,85 |
| Grants and custody | Broad or missing scopes refused. Only one valid connection remains. Secrets and raw state absent from stored pending rows and responses; credential ciphertext opens only with installation key. Wrong installation key makes no provider call; expired access refreshes. | tests/support/salesforce-api-proof.ts:30-39 |
| Allowed metadata | Missing Contact.Phone and unsupported Account.Address__c have source references and export instructions; unsupported Salesforce Flow is named. | tests/support/salesforce-api-proof.ts:40; browser metadata screen |
| Persisted paging | Four pages yield exactly 2 Accounts and 12 Contacts. A provider 429 keeps the saved cursor; closing and reopening the real D1 retains the stopped pull and resumes to completion. | tests/support/salesforce-api-proof.ts:42-48 |
| Reviewed owners | Separate Account and Contact OwnerId values map to two existing full operators. Missing choices and nonexistent operators refused. Removing a reviewed operator before Apply refuses without creating contacts. | tests/support/salesforce-api-proof.ts:49-57 |
| Dry run, Apply, resume | Saved review has 14 rows and 11 explicit associations; native tables remain empty before confirmation. Unconfirmed Apply refused. Apply checkpoint persists through actual store restart. | tests/support/salesforce-api-proof.ts:51-59 |
| Exact identities and associations | Complete native company and contact reads have the exact provider ID sets, 2 and 12 records, exact email fields, 11 company links, chosen owners and custom-field value. New contacts are Do not contact. | tests/support/salesforce-api-proof.ts:60-68 |
| Repeat safety and Undo | Rerun preserves complete contact identity and field snapshot. Undo leaves a later native edit and reports a retained disposition. Conflicting later source Apply is refused. | tests/support/salesforce-api-proof.ts:69-74 |
| Erasure | Native contact DELETE removes staged Salesforce pages and decoded import copies, withdraws the pull and refuses advance. Retained generic import erasure journey checks records, search, archives and later company edits. | tests/support/salesforce-api-proof.ts:73-77; tests/core/crm-import-erasure.test.ts |
| Export and restore | Records archive contains no import tables, token or erased mailbox. Actual destination restore preserves company data without credentials, pulls or OAuth state. Valid source pull and Apply-review replays return 404 with zero further provider calls. | tests/support/salesforce-api-proof.ts:76-82 |
| Revocation and disconnect | Revoked provider grant cannot create another pull; revoked native session cannot finish OAuth. Disconnect deletes credentials and makes saved-pull advance return 404. Browser shows withdrawn review without Apply. | tests/support/salesforce-api-proof.ts:84-87; tests/e2e/imports-salesforce.mjs:25-27 |
| Historical archive compatibility | Real released and preceding stores migrate forward; preceding-generation archive is admitted; exact original 0049 and pre-forecast catalog and hash assertions remain. | newtests/t096/released-forecast-upgrade.ts:63-81, within existing forward-upgrade test |
| Responsive native flow | Connection, invalid-state refusal, connected state, metadata, stopped page, persisted resume, owner mapping, preview, applied records, disconnected state and withdrawn review are operated at 1440 and captured also at 390. Only Salesforce HTTP is replaced for its fixture. | tests/e2e/imports-salesforce.mjs:12-28; selected PNG files |

PROBE MIGRATE-003 1 (selected native limb): authenticated Salesforce start, callback, metadata, persisted page advance, owner-mapped dry run and confirmed Apply -> 2 companies, 12 contacts and 11 exact Contact to Account links; interrupted D1 resumes, repeat is unchanged and Undo preserves a later edit. Native erasure and archive restore -> no surviving pull or source-review authority. The selected native helper completed with exit 0 in CANDIDATE-SALESFORCE.json on the exact final SHA; browser completion is recorded in IMPORT-BROWSER.json. The broader IMPORT-CORE.json timeout is not represented as a pass.

## Acceptance, inherited duties and riders

| Obligation | Disposition |
| --- | --- |
| Acceptance 1, complete sandbox migration | PARTIAL: only its Account and Contact limb is within this round. Real authorized sandbox, converted Leads, two record types, linked activity and custom objects, Opportunity Files and complete totals remain held. |
| Acceptance 2, authorized real export | UNMET-EXTERNAL: owner authorization and actual export are not supplied. |
| BASE-INPUT-001 | Native route refusals cover invalid consent, state and owner choices, invalid or replayed authority, stale fingerprint and unconfirmed Apply. Existing clause citation retained. |
| BASE-DATA-001 | Native imported records export and restore; older supported schemas remain accepted; credentials and import review authority remain installation-local. Existing clause citation retained. |
| Selected authority and privacy duty | Owner-only connection and pull, current full native sessions, sealed installation-local custody, consent, erasure, revoked authority and replay paths exercised both ways. Broader delegation and provider qualification are unclaimed. |
| Rider 1 | Selected native outcomes have retained public-door journeys. Entire acceptance remains partial for the explicitly held remainder. |
| Rider 2 | Seeded data, exact native readback, dangerous refusals, unchanged rerun and preserved later edit; no empty-list-only claim. |
| Rider 3 | Candidate Verify status and exact SHA are recorded above and in CI.json. No earlier SHA is represented as the candidate's CI. |
| Rider 4 | Repaired runtime bytes are bound to the save; final relevant-byte diff is documented. Exact-final Verify runs the committed tests. |
| Rider 5 | Existing BASE-DATA-001 and BASE-INPUT-001 citations and requirement remain unchanged. No new inheritance is claimed. |
| Rider 6 | Generator write and check pass, generated views restored from main, all Status, Gap, Evidence and counts retained. Lander owns eventual judgments. |
| Rider 7 | No acceptance sentence, clause ID, coverage obligation or ruling changed. |
| Rider 8 | Non-owner and wrong-session connection attempts, revoked operator mapping and revoked source authority are refused. Supported owner import completes. |
| Rider 9 | Only provider HTTP is replaced. No live Salesforce account, sandbox or real-export qualification is claimed. |
| Rider 10 | Carried conservative owner-only authority and sealed-custody floor follows the supplied standing scope policy; remains PARTIAL, with no scoped delegation or new policy award. |
| Rider 11 | Pending guarded landing: candidate is branch-only. Main equality, full-history publication scan and main Run site remain the fleet's gates. |

PRE-READY: no assertion removed, skipped or narrowed; no workflow edited; no Base pin changed; no data migration byte rewritten; source lock and contract generator checked; public authority, erasure and replay paths retained; responsive import screen proof retained. Salesforce controls are named text controls under Settings, with no added icon-only control. No new fixture contains an email address literal or provider-shaped credential. The final repository diff is checked for accidental slash-word references and credential-shaped values before push. Live-account obligations and broader migration scope remain disclosed.

Publication scan receipt: commit=e2d1b48b46f9d0296b241c3e1cda0da05da112f8; complete=not_run; historyScanned=not_run; findings=not_run. Cloud-side publication scan is delegated by the assignment to the maintained Mac lander. No COMPLETE or zero-findings result is asserted here. Main equality and Run site are likewise pending landing, not builder receipts.

## Remaining boundaries

DEFAULT MIGRATE-003: carried owner-only connection and pull, explicit consent, existing full-operator owner choices and installation-local sealed custody follow the supplied conservative standing policy; no new delegation or provider authority is awarded.

GAP MIGRATE-003: owner-authorized Salesforce sandbox and real export remain held. Leads and conversions, Opportunities and source currency, complete record types and custom objects, products, Notes, Tasks, Events and EmailMessage history, Files and legacy Attachment, file totals and bytes, queue and role translation, Lead and Opportunity owners, automation mappings and complete all-entity reconciliation remain omitted. Existing RECORD-018, TEAM-005, RECORD-007, TEAM-001, MIGRATE-001 and MIGRATE-002 holds remain unchanged. No ownership or file foundation was edited outside inherited main.

No DONE, restoration, release or contract-count change is claimed. Evidence publication is report-only custody and does not signal product acceptance or landing.

## Execution receipt notes

The repaired full local fold-domain-3 batch reached the 1,200-second command limit during its later upgrade and archive work; it is INCOMPLETE, not a passing full-batch receipt. Its collaborator native and 1440 and 390 browser, emitted restart and empty-installation cases had passed. The direct repaired historical archive helper passed separately. The final candidate CI is authoritative for completion of the full registered upgrade case. No test or timeout guard was changed to disguise this result.

The complete native import browser registration passed (1 test, 4.5 minutes including startup); all 22 Salesforce captures were inspected. SCREEN-REVIEW.json records file hashes and the tier-C stale success-banner follow-up after disconnect. The server removes connection and review authority despite that old query message.

The broad local import command reached its 1,800-second limit after three erasure cases passed. The Salesforce helper had already returned before the observed existing HubSpot and Pipedrive rerun work. This broad command is INCOMPLETE, not green. The committed Salesforce helper and previously failing forward-upgrade registration were run directly; their actual passing receipts are SALESFORCE-FINAL.json and FORWARD-FINAL.json. The native helper was then repeated successfully on the final merged candidate in CANDIDATE-SALESFORCE.json. Verify 43347379622 was the preceding qualification push; final Verify 43351891555 is on the candidate shown above.

A standalone `tsx -e` diagnostic used CommonJS and failed with IMPORT_READ_GUARD_REQUIRED at initial Apply. Its original nonzero receipt is retained in SALESFORCE-CJS-DIAGNOSTIC.json and salesforce-cjs-diagnostic.log. The import kit uses module-local guard identity; the retained registration and application use ESM. The direct helper was therefore checked through the actual ESM loader using the preserved validation/salesforce-final.mts entry, with no product or guard change. SALESFORCE-FINAL.json records that execution outcome.

## Final committed local completions

SALESFORCE-FINAL.json: exit 0 on 76bd6668fabf2a961af410b4e7888cf92238f416 using the native ESM entry. All selected public-door assertions, including both unsafe restored-authority replays and zero provider calls, completed. This confirms that the standalone CommonJS failure was a runner-mode artifact; no guard was bypassed or edited.

FORWARD-FINAL.json: exit 0 on the same exact commit. The full previously failing forward-upgrade registration passed (1 test, 596 seconds), including its historical schema assertions and later ownership and record-mail archive roundtrips. Earlier timed-out broad commands remain separately recorded as incomplete.

MECHANICAL.json has nine checks, all exit 0. FINAL.json binds the clean pushed candidate, exact source lock digest and unchanged selected runtime, migration, browser and upgrade proof bytes since the passing qualification commit. The post-commit lock check also exits 0. IMPORT-BROWSER.json and SCREEN-REVIEW.json bind the passing browser run and all 22 inspected Salesforce screenshots to those unchanged runtime bytes.

The current local selected-point and regression receipts are complete and passing. Broader timed-out runs and the non-native CommonJS diagnostic remain disclosed and do not become passing receipts. The final metadata declaration and current-main merge were checked again; CANDIDATE-MECHANICAL.json records all ten checks at exit 0, and candidate-committed-lock-check.log verifies the committed lock.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0, followed by restoring both generated views from origin/main; ledger=pnpm run deployment:check exit=0. All exact argument lists and outputs are retained in MECHANICAL.json and its selected logs.

## Final declaration and main integration

The final candidate declares the optional Salesforce external in seed.json: OAuth client credentials and one-use authorization proof, access and refresh grants, selected Account and Contact field names and paging cursors. This records the connector's existing outbound boundary; it grants no new pull or review authority. The build and manifest check pass. DECLARATION-CHECKS.json records the initial declaration checks; CANDIDATE-MECHANICAL.json records the repeated checks after merging main 90c58e001a5a5ae74e81a61526fb3e88b9f616ed. The inherited main change links dashboard tiles to the selected saved report version and retains its expanded assertions.

The selected native Salesforce and complete forward-upgrade proofs passed on 76bd6668fabf2a961af410b4e7888cf92238f416. The current candidate e2d1b48b46f9d0296b241c3e1cda0da05da112f8 has identical bytes for all selected application, migration, erasure, archive, native test and browser paths listed in FINAL.json. The only intervening application difference is the unrelated dashboard fix inherited from main. No existing assertion was removed or weakened. Final source lock check exit 0; generated views and CONTRACT.md still match main exactly.

CANDIDATE-BUILD.json records a fresh successful build on e2d1b48b46f9d0296b241c3e1cda0da05da112f8. CANDIDATE-SALESFORCE.json records the repeated native ESM Salesforce public-door proof on that exact final commit: exit 0 in 274 seconds. It covers the selected consent, state, grants, sealed custody, metadata, paging, persisted interruption and resume, existing-owner mapping, saved review, confirmed Apply, unchanged rerun, conflict-preserving Undo, erasure and restored-authority refusal outcomes. The passing browser and forward-upgrade receipts remain valid by the explicit relevant-byte comparison in FINAL.json.
