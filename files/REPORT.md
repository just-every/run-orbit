# sd-orbit-c-f183 — Salesforce Account and Contact import

Product repository: just-every/run-orbit. Product branch: cloud/sd-orbit-c-f183.
Candidate: 1f9dd79164d7043a3c0e5eaff8365d8a98dca209. Verify: push Verify 43332782884, event push, in_progress on the exact candidate at 2026-11-13 00:05:08 UTC.

CLAIM MIGRATE-003 PARTIAL points=none tests=tests/core/crm-import.test.ts#RECORD-008 vendor exports, Salesforce OAuth and generic spreadsheets dry-run, reconcile, resume and undo through current operator routes; tests/e2e/imports.spec.mjs#RECORD-008 reviewed vendor files and plain CSV import and undo through the responsive native wizard

MIGRATE-003 is claimed PARTIAL. Its stored Status row remains MISSING, byte for byte from main; no acceptance text, Gap, Evidence or generated contract view was committed. Contract counts remain 42 done, 130 partial and 32 missing, 204 total. The test inventory remains 198 registered cases plus two qualification flows, total 200. No DONE award or release is claimed.

## Implemented plan and result

The complete initial plan is in PLAN.txt. This round implemented its native Account and Contact limb:

1. Added Salesforce authorization through the real OAuth token endpoint, PKCE, a ten-minute state bound to the exact native session and installation origin, one-use state and code hashes, explicit read consent, strict scopes, organization identity and Salesforce instance validation. Only the installation owner can connect, describe, pull or save Salesforce mappings. Successful connection and local disconnection are audited without credentials.
2. Reused the installation SourceSecurity encryption for app secrets and bearer and refresh tokens. These, pending OAuth, page custody and saved review authority use the existing private import table namespace and never travel in Records or CLI exports. Native restore clears connection and pending OAuth authority and withdraws Salesforce reviews.
3. Added metadata, provider and checkpoint modules. Only readable, supported Account and Contact fields enter queries. Missing expected fields and unsupported types retain explicit object and field references and concrete export guidance. Unsupported entities, record types, files and automation are disclosed separately. The adapter issues only provider GET requests for metadata and data, and token POST requests for OAuth and refresh; it sends no Salesforce record writes.
4. Atomically persists each provider page, totals, object position and continuation reference. A failed or rate-limited page leaves the preceding checkpoint intact. A reopened persisted D1 store resumes that page without duplicating identities. Invalid references, changing totals, duplicate IDs and incomplete pages stop explicitly. The existing reviewed import capacity is 1,000 records per object; a larger provider total is refused with export guidance, never truncated.
5. Saves exact Salesforce IDs, Contact AccountId associations and separate Account and Contact OwnerId choices through the shared dry-run engine. A source owner can map differently for those two kinds. Choices are only existing active full operators or explicit Unassigned; no invitation or access is created. Owner authority is checked again before Apply, and connection custody is fenced in every Salesforce application transaction. New imported contacts remain Do not contact.
6. Reused saved review, exact-fingerprint confirmation, persisted application batches, repeat-safe source identities and conflict-preserving Undo. Source erasure withdraws staged Salesforce pages and shared personal copies. Disconnect withdraws saved reviews and pending state; historical native data and safe Undo remain available.
7. Added focused controls in the existing Settings import page for connection, metadata, custom fields, separate owners, page progress, refusal, resume and saved review. All new controls have text labels; icon-only actions were not introduced. Browser assertions run at 1440; all changed states were captured at both 1440 and 390. Existing CSV, provider-file, merge and erasure assertions remain.

## Native proof register

The existing registration in tests/core/crm-import.test.ts is retitled “RECORD-008 vendor exports, Salesforce OAuth and generic spreadsheets dry-run, reconcile, resume and undo through current operator routes”. It invokes tests/support/salesforce-api-proof.ts#salesforceApiFlow, with only Salesforce HTTP replaced by tests/support/salesforce-network.ts. The existing tests/e2e/imports.spec.mjs registration invokes imports-salesforce.mjs#salesforceBrowserFlow. The browser bridge forwards into the real authenticated application and a fresh persisted store; it invents no application response.

| Selected native outcome | Proof and observed result |
| --- | --- |
| Owner consent and native-session binding | salesforceApiFlow attempts a non-owner start, absent consent, expired and unknown states, another session, replayed state and replayed code. Unsafe cases are refused; successful OAuth creates one connection. |
| Least supported grant and local sealed custody | Missing refresh scope and broader full scope are refused. Configuration readback contains no credential. Ciphertext opens with the correct installation key; a different key is refused before any provider request. A 401 refresh succeeds; revoked provider access creates no pull. |
| Pagination and exact identity reconciliation | Four persisted pages produce two Accounts, twelve Contacts and eleven explicit associations. Native Records API reads compare every source ID, email and company association, including the unassociated contact. Separate owner readback returns the chosen operators. |
| Metadata and explicit diagnostics | Contact.Phone and Contact.Title are unavailable; Account.Address__c is unsupported. Their source references and export steps are asserted. Unavailable and unsupported fields never enter the provider query. |
| Separate reviewed owners and confirmed Apply | The same Salesforce OwnerId maps to different native operators for Accounts and Contacts. Unreviewed, unknown and no-longer-active choices are refused. An unconfirmed Apply is refused and leaves native records unchanged. |
| Persisted interruption and resume | The rate-limited second Account page preserves its cursor and first page. The test closes and reopens the actual persisted store. It also closes and reopens during native application, then completes the same saved review. |
| Repeat safety and native-edit Undo | An unchanged saved source rerun preserves the complete contact identity and field snapshot. Undo of a reused job cannot steal earlier effects. A later native name edit survives Undo; reapplying a conflicting source is refused. |
| Erasure and restoration without authority | Populated staged pages and decoded shared originals contain the contact before erasure and no personal copy afterward. The actual streamed archive is restored through native routes. A fresh restored native session sees no Salesforce connection and cannot resume the old pull. |
| Responsive connection and operational states | The existing browser journey operates connection, refusal, metadata, rate-limit stop, reopened resume, separate owners, saved preview, Apply, disconnect and withdrawn-review controls. The packet includes each Salesforce screen at both widths. |
| Existing import privacy safeguards | All three registrations in tests/core/crm-import-erasure.test.ts remain and pass. Existing CRM stops, malformed source, revoked authority, rollback and CSV assertions remain unchanged. |

These are native proofs of the selected limb, not complete proof of acceptance point 1.

## Acceptance, inherited duties and DONE riders

| Item | Disposition |
| --- | --- |
| MIGRATE-003 acceptance 1 | Native Account and Contact limb implemented and exercised. The actual authorized sandbox, converted Leads, record types, activity and custom-object data, Opportunity Files and complete reconciliation remain unproved. No full point is claimed. |
| MIGRATE-003 acceptance 2 | Held: requires an authorized real customer export. Not run and not claimed. |
| BASE-INPUT-001 inheritance | Existing clause citation retained. Native sessions, origin, explicit consent, allowed metadata, field bounds and owner refusal are exercised through routes. No broader inherited award is claimed. |
| BASE-DATA-001 inheritance and selected erasure duty | Existing citation retained. Native streamed export and restore, exclusion of custody, no renewed pull authority and erasure of retained source copies are exercised. |
| Rider 1 | PARTIAL for the whole clause: selected native outcomes reached, held outcomes named above. |
| Rider 2 | PASS for supported native scope: populated outputs and unsafe refusals are asserted. |
| Rider 3 | push Verify 43332782884, event push, in_progress on the exact candidate at 2026-11-13 00:05:08 UTC. Both proof helpers are loaded by existing Verify registrations. |
| Rider 4 | Local source and test byte hashes are recorded in RECEIPT.json; no relevant behavior was changed after its final local proof. |
| Rider 5 | Existing BASE-DATA-001 and BASE-INPUT-001 citations retained; no contract rewrite. |
| Rider 6 | Generator write and check pass. Stored judgments and both generated views are unchanged. |
| Rider 7 | PASS: no acceptance sentence or obligation changed. |
| Rider 8 | PASS for selected scope: non-owner, wrong session, absent consent, inactive owner, revoked native session and disconnected authority are refused. |
| Rider 9 | Held provider boundary is explicit; no live Salesforce receipt or full migration claim. |
| Rider 10 | Conservative owner-only custody and consent default adopted under the supplied standing scope policy. Whole clause remains PARTIAL; no new ct ASK or award. |
| Rider 11 | Pending guarded fleet landing, exact-head scanning and resulting main Run site. |

DEFAULT MIGRATE-003: Under the supplied standing scope policy and Orbit ruling guidance, Salesforce custody and pull administration are owner-only, explicit and audited; source deletion withdraws staged source copies; no execution or review authority is exported. Salesforce's API grant is broad, so a read-only Salesforce user profile is required; the adapter itself performs no provider record writes.

GAP MIGRATE-003: The owner Salesforce Developer Edition and authorized sandbox and real-export qualification remain held. Leads and conversions, Opportunities and source-currency mapping, record types, custom objects, products, Notes, Tasks, Events, EmailMessage history, Salesforce Files and legacy Attachments, file totals and bytes, queue and role translation, Lead and Opportunity owners, automation mappings and complete all-entity reconciliation remain omitted. No file or ownership foundation, TEAM-005, RECORD-007 or TEAM-001 trial work, MIGRATE-001 or MIGRATE-002 hold was changed.

## Verification and custody

All local checks in RECEIPT.json pass: four CRM registrations, the latest complete Salesforce helper, three retained erasure registrations, the emitted browser journey, typecheck, first-party, boundaries, app build, deployment specification, contract generation, migration ledger and source lock. The original vendor registration took 1,105.8 seconds on this VM; its existing large vendor loops remain. The browser journey passed in 2.6 minutes. An inadvertently repeated file-root selection was stopped and the remaining three cases were then selected explicitly; this cancelled duplicate is not counted as proof.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=node packet/LEDGER_CHECK.mjs exit=0.

The baseline main read was 267fa4d246666bf4eb119f612663c939601f1339. Its exact-head push Verify 43315648785 and Run site 43322282338 were completed successfully; the duplicate main Verify 43322282066 was cancelled. Product writes are only on the named cloud branch. No PR is required for the repository's push Verify entry point.

Publication scan: NOT RUN in this cloud, as required by the cloud adaptation. The maintained fleet must scan the complete history on the exact candidate, enforce branch Verify, perform guarded landing, and confirm the resulting Run site. This report claims neither main equality nor a COMPLETE scan.

No existing assertion was removed, skipped, narrowed or placed behind a width condition. No permanent registration was added. The refreshed deployment specification includes the additive migration; the 77 prior main migration hashes pass the maintained ledger mapper. Source lock regeneration runs last. CONTRACT.md and generated views are absent from the product diff.

Local development failures were corrected before the candidate: an OAuth insert placeholder mismatch; new fixture expectations around a deliberately changed source and preserved native edit; provider-refresh custody snapshot renewal; OAuth redirect simulation; and draining test requests before reopening or disposing a browser store. A CommonJS eval harness could not retain the import kit's guard identity; the proof uses an ESM entry point, matching Verify's test loader. No CI assertion, test or guard was weakened.

Plan relay: only the MIGRATE-003 Account and Contact native-limb row is advanced in this report. Every supplied hold, queue note and release prerequisite remains unchanged. No lane inbox or state file was read or written.

PROBE MIGRATE-003 1: Native OAuth, provider-pull, saved import and Records routes with the supported synthetic source -> two Accounts, twelve Contacts, eleven exact associations; unsafe state, grants, owners and confirmation refused; persisted resume, unchanged rerun, safe Undo, erasure and authority-free restore observed. Full sandbox acceptance remains held.
PROBE MIGRATE-003 2: none, authorized real export and owner account are not provisioned for this cloud task.

## Source locations for native proof

- OAuth authority and states: tests/support/salesforce-api-proof.ts:26.
- Grant refusal: tests/support/salesforce-api-proof.ts:34.
- Sealed custody: tests/support/salesforce-api-proof.ts:37.
- Refresh and metadata: tests/support/salesforce-api-proof.ts:39.
- Provider restart: tests/support/salesforce-api-proof.ts:44.
- Reviewed owners: tests/support/salesforce-api-proof.ts:49.
- Native application restart: tests/support/salesforce-api-proof.ts:56.
- Exact public readback: tests/support/salesforce-api-proof.ts:59.
- Unchanged rerun: tests/support/salesforce-api-proof.ts:68.
- Native edit and Undo: tests/support/salesforce-api-proof.ts:70.
- Erasure: tests/support/salesforce-api-proof.ts:74.
- Export and restore: tests/support/salesforce-api-proof.ts:77.
- Restored authority: tests/support/salesforce-api-proof.ts:80.
- Revocation: tests/support/salesforce-api-proof.ts:83.

Evidence transport: the first complete packet was published at aba97a1f971bb1ffbcdf001f122d37173db8f614 and fetched independently with all 43 file hashes and the exact product SHA verified. EVIDENCE_TRANSFER.json is the actual transport receipt. A later evidence head may include the final CI observation and this receipt; only the terminal EVIDENCE line names the final transfer.

Terminal product custody: PUSHED branch=cloud/sd-orbit-c-f183 head=1f9dd79164d7043a3c0e5eaff8365d8a98dca209. Verify 43332782884 remains in progress at 2026-11-13 00:05:08 UTC; no red conclusion was observed. All local gates pass. The cloud handoff leaves exact-head CI, publication scanning and landing with the maintained fleet. There is no product push rejection and no unpublished product work.
