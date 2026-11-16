# Orbit: stranger 34's nine trips
Author: Run Edit Run fleet, 2026-11-16.

Repository: just-every/run-orbit.
Branch: cloud/main-orbit-stranger34-trips-1.
Baseline: bca89d44de7c8357544fc54375a030f9d1d4611f.
Terminal candidate: 1833f212cd6a7b89e4011a5953da28edd3103983. Product custody and exact-SHA CI are recorded in RECEIPT.json and CI_CALLS.json.

## Plan and completed work
1. Initialized the fleet identity, decrypted-bundle Git helper and clone-local forwarding commit hooks. Cloned only the declared repository, shallow with blob filtering, and branched from main.
2. Exercised the nine trips through native browser and HTTP doors. A separate Git archive of the same main SHA supplied an isolated native installation for a clean baseline receipt. It was not another repository clone. No provider account or held credential was used for product proof.
3. Fixed seven reproduced causes without a migration, contract status edits or a redesign. Extended existing import, capture, form/workflow and operator-action journey registrations.
4. Ran touched journeys, related native import/pipeline checks, typecheck, the test inventory and source-lock generation/check. Inspected changed screens at 1440 and 390. Reports, receipts and screenshots remain outside the product tree.
5. Fetched main and rebased the first unpublished candidate; main remained at the baseline SHA. Pushed the first real commit through the fleet guard, with all candidate authors, committers and trailers checked. Subsequent publication preserves that history and merges main rather than rebasing published work.
6. Returned this packet on the separate evidence ref. The fleet owns publication scanning and landing.

## Per-trip result

1. **Not reproduced: phone title.** On baseline main, “Clinic analytics rollout” at Harborlight Health shows its complete second line at 390. The title's client and scroll heights both measure 87 px. The 1440 and 390 native screenshots retain the result. No title implementation change was made.

2. **Fixed: readable import provenance.** Baseline contact Details displayed “Owner Id” and the internal operator identifier. Import storage now retains the file and row. Ordinary presentation resolves the mapped owner from the existing operator directory and selects readable fields explicitly, including for old JSON-text and object-form imports; it no longer spreads internal metadata or trusts a stored display-name copy. The existing import-owner journey checks retained contacts, companies and deals before and after operator erasure, including private import copies. The responsive native wizard maps Alex Morgan to the active operator and asserts that operator's name, contacts.csv and row 2, while refusing the operator ID and “owner id” in the panel.

3. **Fixed: named dry-run rows and reviewed details.** Baseline companies.csv and deals.csv rows had no display name despite Name and Title being the chosen source IDs. The importer now derives labels for companies and deals from the reviewed source, and Audit details renders mapped values. The existing wizard journey asserts company/deal names and the reviewed amount, company and stage, then applies that same saved review.

4. **Fixed: truthful Google and Microsoft completion.** Baseline step 6 marked all five earlier steps Done although no connection existed. Navigation no longer supplies completion. A valid stored connection supplies the provider steps' completion, and saved scope supplies the final step's completion. Callback connection context survives navigation. Unverified steps read “Not confirmed.” Both providers remain uncompleted when step links or a step-6 bookmark are followed without provider setup.

5. **Not reproduced: forecast breakdown.** Baseline native USD overrides of 10,000 at 30% and 20,000 at 60%, closing November 30, produce 1,500,000 cents weighted total. The expanded Deals and reps section shows the deal and rep rows at both widths, with 3,000 and 12,000 weighted contributions. No forecast implementation change was made.

6. **Fixed: form-created deal workflows.** The cause was the submission journal trigger: it emitted only a contact form_submitted event, while a deal workflow selects opportunity events. Baseline published-form intake created the deal but left execution history empty after processing. Capture now writes a stable deal-specific form event in the same atomic transaction as the new deal and submission. Existing workflow event snapshots and idempotency handle replay; form value lookup resolves the originating submission. Native proof activates version 1, submits and replays one published form, processes twice, and reads exactly one completed run and one task linked to its created deal. A second genuine enquiry from the same contact creates no new deal and no second deal-workflow run/task. The editor explains that disabled deal creation and existing-contact enquiries do not trigger a deal workflow, and directs the operator to a Contacts workflow for every accepted submission.

7. **Fixed: explicit cross-pipeline move on deal details.** The guarded move endpoint and complete movement history already existed. Details now exposes Pipeline plus a required destination-stage selection and an explicit Move deal confirmation. Selecting a pipeline alone changes nothing. It uses the same stale-stage and required-field guards and discloses scheduled-follow-up cancellation. History names both pipelines for a cross-pipeline move and retains the previous/current stage, actor and time. The native journey reloads the destination, preserves lifecycle/score/owner and refuses deletion of the occupied destination. No migration was needed.

8. **Fixed: one attributed owner entry.** Baseline one owner choice produced both generic record.updated and dedicated owner.changed entries. The mutation now reserves owner/stage changes for their dedicated history entries and keeps the generic entry for other changed fields. Owner history retains the previous/current display names. The browser journey selects once, reloads and asserts one owner event with its actor and no duplicate generic owner entry.

9. **Fixed: sufficient Slack scopes.** Setup instructions and the public declaration now include im:read alongside im:write for opted-in personal delivery. Code uses conversations.open to open a DM (im:write), then conversations.info in checkedPersonalDm to verify that DM's recipient (im:read), users.info/user_change for mapped-user safety (users:read), and chat post/delete (chat:write). Existing channel configuration uses channels:read and, for private channels, groups:read. The personal settings page and docs/SLACK-MENTIONS.md already listed im:read. No Slack account or live send was required or performed.

## Validation and limits
The inventory remains **198 cases + 2 qualification flows = 200**, before and after. No registrations were added or removed; the new import helper extends the existing wizard registration.

Passing local checks:
- Existing core capture/workflow journey, including replay, task creation, existing-contact no-deal intake and original contact-history assertions.
- The existing import-owner helper, extended to import three retained record types, erase the mapped operator through the protected public route, assert that native provenance never copies the mapped display name, and verify that records and private import copies no longer contain that name after erasure.
- Four native CRM import API cases. The initial combined invocation recorded these four passes and an earlier workflow test-fixture failure; the corrected workflow journey was run separately to completion.
- Native records/search journey, including pipeline movement, occupied deletion and ownership history.
- Both Capture browser cases; the first browser invocation's import leg was interrupted to correct a new helper's field locator, and the complete import browser case subsequently passed.
- The full native operator-actions browser journey.
- Typecheck; source lock generation and check; test inventory; staged diff whitespace check.

The new workflow fixture initially attempted a form-value copy against unrelated activation-preview records, then used the wrong task storage column in a diagnostic assertion. Both fixture issues were corrected. Task assertions now use the public Tasks API. The additional distinct submission from the same contact check is placed after the original submission-history assertions, preserving their scope and strength.

The clean baseline receipt is under baseline/. Final source-overlaid native browser proof is under after/; after-source.json binds that running snapshot's changed product files to their SHA-256 hashes. Import and pipeline screenshots come from the passing retained native journeys. Development-only diagnostics are retained outside this publication packet.

Hosted deployment and real Google, Microsoft and Slack account qualification are outside this brief. The full publication scan is the Mac lander's gate. No full local rer verify was run.

## Contract and counts
Seven trips fixed; two not reproduced; zero unresolved trip GAPs.
CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md were not changed. Clause statuses and generated summary counts remain unchanged. No DONE claim is made.

CLAIM OPP-009 PARTIAL points=1 tests=tests/core/records-search.test.ts#RECORD-016 reviewed owners and guarded bulk undo; OPP-009 TEAM-003 RECORD-015 RECORD-002 RECORD-011 RECORD-006 relationships retain history and pipelines move safely and search matches record and timeline text, intersects every opportunity filter and caps the first page; tests/rer/operator-actions.test.mjs#BASE-PUBLIC-003 T099 native keyboard navigation, form validation, dialog focus and reviewed record changes

## Terminal CI custody
Exact-SHA Verify 43803452801: in_progress / no conclusion yet, head 1833f212cd6a7b89e4011a5953da28edd3103983. https://github.com/just-every/run-orbit/actions/runs/43803452801
Earlier candidate runs 43800536957 and 43801205293 are superseded and are not evidence for the terminal head. CI_CALLS.json retains the actual bounded REST calls.
The bounded GitHub budget ended while Verify was running. Product custody is PUSHED, with no claim of green Verify or readiness; the fleet can continue watching the exact run.
