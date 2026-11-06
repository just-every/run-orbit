# sd-orbit-c-f118 report

Final candidate: 2718ad22d8a69de25d5b58d041f5fc41fcf0f020 on cloud/sd-orbit-c-f118. Push Verify 42236653070 is in_progress (event push), not claimed green. Product push and remote ref verification succeeded.

FORM-001 remains PARTIAL. The selected acceptance-1 buyer-page residual was already implemented on the assigned f115 base. This continuation runs it through real Chromium and the emitted Worker, preserves it with current main, and repairs a demonstrated form-document favicon request failure. No acceptance or Status row is changed. The full plan is in PLAN.md.

## Provenance and scope

- Repository: just-every/run-orbit.
- Branch: cloud/sd-orbit-c-f118.
- Assigned base: 8bfa5ca6fe29cb91e917c2052c50ed2df5605cf5.
- Integration keeps both published f115 commits and main's newer recommendation safety assertion. No published history is rewritten.
- Final SHA and CI event and conclusion are recorded in final-receipt.json.
- Pinned base Verify: push run 42227053772, completed success on the assigned base. This is historical evidence, not a final-candidate green claim.
- Counts before and after: 36 DONE, 136 PARTIAL, 32 MISSING, 204 total.
- Registered cases before and after: 198, plus two qualification flows, total 200. No new registration, assertion removal, narrowing or skip.
- No PR is required: Verify has a push entry point.

## Changes and reproduction

The assigned base already builds Phone and an existing supported number custom opportunity field through reviewed Settings, publishes Contact sales, submits hosted and framed forms, serves the same reviewed HTML from a separate buyer HTTPS server, and asserts actual Chromium preflights, challenge and POST with browser-generated Origin. It freshly reads the exact phone, linked company and numeric deal size through authenticated Records.

An initial run of the registered browser journey stopped in formWithoutScript before the selected mapping journey: browser-observations.ts:17 reported an unexpected 404 for the same-origin favicon. The system Chromium is version 154.0.8037.57. The form compiler now includes an inline empty favicon so the browser performs no missing-resource request. No console assertion is filtered, no Orbit route is replaced, and no network admission or capture implementation is modified. browser-before.log retains the actual nonzero run. This is a local runtime reproduction, not a failed-CI repair.

The source and test bytes for the selected mapping behavior remain the assigned f115 bytes. The only new product edit is the favicon link in ./src/core/features/publication/fixed-compiler.ts:10. Inspecting ./src/core/features/forms/mappings.ts, native-capture.ts, opportunity-intake.ts, public-routes.ts, admission.ts and embedding.ts found no demonstrated mapping or admission defect.

## Acceptance coverage

| Item | Public door and observable outcome | Proof | Result |
| --- | --- | --- | --- |
| FORM-001 acceptance 1 | Author and review Contact sales with name, email, company, phone and numeric custom deal size; hosted success; buyer HTTPS framed submission; buyer HTTPS direct submission; exact Records readback | ./newtests/t096/browser-journeys.test.ts:27, registration “OUT-032 established opt-out upgrade, CAPTURE-010 workspace rules, OUT-017 OUT-023 record mail, FORM-001 mapped, picklist, hidden and framed capture, RECORD-016 reviewed ownership and FORECAST-001 USD weighted value, override, quotas and recurring schedules preserve prior snapshots”; helper ./newtests/t096/browser-form-mapping.ts:18 through 75 | See browser-test.log and form-buyer-receipt.json for actual final-tree run |
| FORM-001 acceptance 2 | Required, picklist, text, declared fixed and query values; exact publication review; mapping to contact, company and deal fields | ./newtests/t096/forms-native.test.ts:18, “FORM-001 mapped cross-origin capture with picklist and declared hidden fields, reviewed proposals and durable owner rotation retain fixed publication, DNC and consent”; ./newtests/t096/forms-mapped-journey.ts; existing browser mapping journey | Existing assertions retained. Full field and publication matrix and broader qualification are outside this slice, so not claimed closed |
| BASE-PUBLIC-001 | No cookies or third-party asset requests for the ordinary form, and challenge starts on interaction | ./newtests/t096/browser-journeys.test.ts; ./newtests/t096/browser-form-mapping.ts:49 and 75; ./newtests/t096/browser-form-no-script.ts | Existing runtime assertions retained; actual final browser result in receipt |
| BASE-PUBLIC-002 | Separate HTTPS buyer origin admitted only after exact Settings allowlisting; actual preflight response and POST Origin checked | ./newtests/t096/browser-form-mapping.ts:30, 58 through 74; native abuse refusal registration | Actual Origin and CORS values in form-buyer-receipt.json |
| BASE-INPUT-001 | Invalid fields, undeclared values and forged choices refused without customer or proposal writes | ./newtests/t096/forms-mapped-journey.ts; ./newtests/t096/forms-native.test.ts, “FORM-001 public form HTTP refuses abuse without customer writes and releases spam exactly once” | Native-test result in receipt |
| Current authority, replay and erasure duties | Revoked publication cannot capture; concurrent replay keeps one capture; export and restore preserve data; erased mapped copies disappear | ./newtests/t096/forms-native.test.ts, “public capture is one atomic native batch across publication revoke, source stop, consent failure and concurrent replay”; ./newtests/t096/forms-mapped-custody.ts | Existing dangerous-path assertions retained; actual native-test result in receipt |

## DONE-RIDERS assessment

No DONE is claimed. These rows state the limits of this PARTIAL point return.

| Row | Assessment | Evidence or reason |
| --- | --- | --- |
| 1 | PARTIAL overall | Acceptance 1 is covered by the browser registration above; acceptance 2 full matrix is unclaimed |
| 2 | Runtime proof | Real populated Records readback checks literal expected phone and number, exact relationships and one contact; native refusal cases assert no customer writes |
| 3 | Pending exact-final CI | Final Verify status is reported honestly in final-receipt.json; no earlier SHA is substituted |
| 4 | Final-tree browser proof | Browser run follows the last product source edit. Native behavior and assertions are unchanged by the inline favicon; no other semantic source edit |
| 5 | PASS, inspected | FORM-001 meta line at CONTRACT.md:1030 explicitly cites BASE-PUBLIC-001, BASE-PUBLIC-002 and BASE-INPUT-001 |
| 6 | PASS mechanically | Contract write and check exit 0; generated views restored from main; source lock regenerated last and check exit 0 |
| 7 | PASS, inspected | No acceptance text, ruling, coverage map, Status, Gap or Evidence edit |
| 8 | Existing runtime proof retained | Owner publication, collaborator refusal, origin refusal, revoke and replay fences remain in native journey; no new authority policy |
| 9 | Boundary retained | No live-provider, legal or account proof claimed; existing RECORD-014, NOTIFY-003 and TEAM-005 boundaries remain |
| 10 | Not applicable | No new policy default or hold release |
| 11 | Pending fleet landing | Main equality, COMPLETE full-history publication scan and exact-main Run site remain with guarded lander |

## Mechanical checks and self-check

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0.

Build, typecheck and first-party checks exit 0. Contract write and check pass; neither generated view is committed. The Status table is byte-for-byte main, with all 204 parent rows retained. Sources.lock.json is regenerated from the supported tool and checked; hashes are never hand edited. No migration is added or edited.

The selected user-visible behavior is exercised by the existing registered journey, with the final full run outcome in the receipt. No test or assertion was removed, narrowed or conditioned by this continuation. Existing authority, erasure and replay protections remain covered by the native journey. Public form text remains 18px and no icon-only control is introduced; the favicon is noninteractive and adds no outbound request. Touched form screens are inspected at 1440 and 390 with screenshots and accessibility observations. No new email-shaped fixture or provider-shaped key is introduced.

Publication scan: not run in cloud, as authorized by the cloud-only route. Exact candidate fields complete, historyScanned and findings are unestablished here and must be supplied by the fleet lander; no COMPLETE or zero-findings claim is made. Main equality and Run site are pending fleet custody.

## Plan return and remaining gap

Only the FORM-001 queue row gains an acceptance-1 browser qualification receipt. No Mac plan, inbox or state file is read or edited. Every other queue entry, hold, note and release prerequisite stays unchanged.

GAP FORM-001: Acceptance 2's complete field and publication matrix and broader consent, abuse and portability qualification remain outside this selected slice. New lead and custom-object foundations remain RECORD-014; external email and push remain NOTIFY-003; team routing and audiences retain TEAM-005's cleanup and new-main prerequisite. No clause-specific hold is released.

No new policy default was adopted. No account or key was needed for the selected native buyer-page point.

Native result: all four registrations pass (exit 0, 524.44 seconds). Final typecheck, first-party and source integrity checks pass. Public buyer probe: both preflights 204; challenge and direct submission 200; no cookies; authenticated readback phone +1 415 555 0198, company Direct Manufacturing, numeric deal size 48000.75. Screens inspected at 1440 and 390; selected accessibility observations have zero serious or critical findings.

Final browser result: the complete existing registration passes (exit 0, 727.77 seconds total). It executes the selected FORM-001 helper through the registration used by Verify and retains all hosted, framed, native ownership, collaboration, forecast and archive assertions. The native file passes all four cases (exit 0). All browser contexts and owned Workers close, as recorded in runtime-closure.json. Raw traces containing ephemeral sign-in capabilities are excluded from the public packet; only explicit form screenshots and non-secret receipts are selected.

Main provenance before the candidate: 32c41a210e1488e53b36c79d6d5056a1a9ab60e3; Verify 42228234958 completed success (push); Run site 42233475807 completed success (push). The candidate is a descendant of that main and the published f115 head. This is not a claim that the candidate is landed or that its own Verify is green.

CLAIM FORM-001 PARTIAL points=1 tests=newtests/t096/browser-journeys.test.ts#OUT-032 established opt-out upgrade, CAPTURE-010 workspace rules, OUT-017 OUT-023 record mail, FORM-001 mapped, picklist, hidden and framed capture, RECORD-016 reviewed ownership and FORECAST-001 USD weighted value, override, quotas and recurring schedules preserve prior snapshots

Final product SHA: 2718ad22d8a69de25d5b58d041f5fc41fcf0f020. Committed tree 4f9bd71e6291d33016eab30594bb8f6d822fc1f4 equals the browser-tested tree. Exact-head source integrity check exits 0. Main is an ancestor and every Status cell and generated view equals the integrated main. All candidate authors and committers are fleet identity, and all trailers are absent.

Exact-SHA scan result: commit=2718ad22d8a69de25d5b58d041f5fc41fcf0f020 complete=unestablished historyScanned=unestablished findings=unestablished (fleet lander pending). Exact-candidate main equality and Run site remain pending. Verify run 42236653070 (push) was in_progress at the single discovery; no dispatch or rerun was requested. Per the cloud-only READY contract, this is a locally proven, pushed PARTIAL candidate for the fleet gate, not a DONE award or landing claim.
