# sd-orbit-c-f181 · REPORT-002

Candidate: 7f681b4f8ce8eb93914ac415fe88a086bee3f9d2 on cloud/sd-orbit-c-f181 in just-every/run-orbit. Main integrated: 63aa0647cabbd86ae1ee2c489f1dfe8ef31e123b. The supplied continuation already contained the bounded Basis-link implementation and proof extension. This run rebased its two commits onto current main, preserved the implementation, and requalified its actual public-door journeys. No speculative product change was needed.

Product delta: each ready report tile's Basis includes a keyboard-accessible link to its saved REPORT-001 definition at that tile's definition version and period. Existing ready-source computation and report route enforce current sharing. Deleted or unshared sources expose no link; a link captured before share revocation is refused at the destination. No change to tiles.tsx or the existing report route was necessary. The existing report-disclosure registration was retitled and extended, with no new registration or weakened assertion.

The complete working plan is PLAN.md. Actual execution outcomes and provenance are in RECEIPT.json and the named logs. PROBES.md maps the four public-door probes; UI-REVIEW.md records the builder's screen inspection. None of these evidence files belongs to the product branch.

## Acceptance evidence for the independent round gate

The current contract names HubSpot, Pipedrive and Salesforce as incumbents. The narrow user outcome is that a dashboard user can inspect the saved definition behind a tile without losing its chosen version or gaining access to an unavailable source. This round makes no claim about live provider delivery or the held team-role implementation.

Registration A: newtests/t096/report-disclosure.test.ts:46 — REPORT-002 REPORT-003 REPORT-004 an owner’s tile board links viewer-fenced saved definitions at their versions and exports; REPORT-001 a US monthly two-pipeline report reconciles won/lost/open deals, reasons and rep activities by drill-through, discloses its basis, and leaks nothing after revocation or late evidence.

Registration B: newtests/t096/report-time-boundaries.test.ts:13 — report periods compare instants across ISO precision and timezone equality boundaries.

Each row below names its public door and observable outcome. The candidate has push Verify 43320242997, still in progress at 22:53:50 UTC after 25 minutes; its observed event and conclusion are recorded in RECEIPT.json; local runtime results are recorded separately and never stand in for CI.

| Row | Acceptance sentence or inherited duty | Existing public-door evidence | Result |
| --- | --- | --- | --- |
| R1 | Point 1: compose at least the four named tiles as the current installation owner | A, browser-dashboard.ts:26-58 creates a saved two-pipeline report, current-quarter won and lost deals and rep activities; configures quarterly quota and builds nine tiles through Reports and Add a tile. Lines 66-79 reconcile figures and drill identities. dashboard-truth-journey.ts verifies live and saved quota agreement, with both quarterly and monthly totals kept separate. | PASS local |
| R2 | Point 2: delete a source report and see an unavailable tile | A, browser-dashboard.ts:56-58 deletes the source through authenticated HTTP and checks one Source unavailable tile. dashboard-access-proof.ts:27 verifies unavailable tiles have no definition link. | PASS local |
| R3 | Point 3: Owner, saved two-pipeline, custom US date and shared-field filters, with unsupported notes | A, dashboard-access-proof.ts:61-81 selects Owner, Region and custom dates, checks the filtered USD 8,000 result, unchanged invalid-range period and not-applied notes. B, dashboard-backend-proof.ts:23-63 checks exact US daylight-saving boundaries and shared-field bindings, including unavailable amounts under limited access. Team is inherited by TEAM-006, not claimed here. | PASS local |
| R4 | Point 3: each supported report tile opens the same saved definition version and disclosures | A, dashboard-access-proof.ts:17-48 creates a newer definition, then activates every ready report tile's Basis link with keyboard at both widths. It asserts route id and version, actual preview version and period, timezone, currency, missing data, freshness, definitions and source fields. Lines 106-120 revoke source sharing after capturing the link: the document shows Not found, preview returns 403, all source tiles become unavailable and no links remain. Owner and limited-reader cases both run. | PASS local |
| R5 | Point 4: late evidence beside the saved result and phone reflow | A, browser-dashboard.ts:57-58 appends late evidence after the saved result and checks its disclosure. browser-observations.ts:24 asserts document width never exceeds the viewport on the actual screens; A visits 1440 and 390 and captures both. | PASS local |
| R6 | Point 4: no more than 24 tiles | B, dashboard-backend-proof.ts:83-86 sends 25 tiles and requires 400, then saves 24 and compares all retained tile identities and dimensions. | PASS local |
| R7 | Requirement: versioned REPORT-001 definition, period and disclosures stay inspectable | A, dashboard-access-proof.ts:17-48; a newer version exists while the tile still opens the older chosen version. A also exercises REPORT-001 save, export, reopen, late evidence and access revocation. | PASS local |
| R8 | BASE-ROLE-001: current viewer authority through dashboard, linked report, figures and drill doors | A, dashboard-access-proof.ts:89-143 exercises named-view sharing, limited figures and records, refusal of definition and sharing administration, captured-link source-share revocation, record-grant revocation, and dashboard-share revocation across document, computation, directory, CSV, PDF and default doors. B also tests permitted view and edit grants and forbidden administration with unchanged definitions. | PASS local |
| R9 | BASE-DATA-001: definitions and saved dashboard custody through existing archive doors | A calls browser-sales-report.ts:195, which invokes sales-report-archive.ts:23-49: actual Records archive and local CLI engine roundtrip, exact definitions and saved figures retained, restored dashboard authority absent, schedules paused, erased affected snapshots and pointers withdrawn, unrelated snapshots retained. This is local archive proof, not live provider proof. | PASS local |
| R10 | Named inheritances and held boundaries | CONTRACT.md:765 names Team forecast and dashboard duties; REPORT-003 at :1510 assigns the Team filter and sharing/defaults to TEAM-006. RECORD-016 and RECORD-022 own later Owner kinds. REPORT-004 and NOTIFY-003 own recipient email and its delivery-state model. No hold is released. | INSPECTED |

## DONE riders

| Rider | Disposition on candidate | Evidence |
| --- | --- | --- |
| 1 | PENDING exact-SHA Verify | R1-R9 above are actual public-door outcomes, with local logs; exact-SHA Verify must finish successfully. |
| 2 | PASS local | Populated records and independent expected values; allowed report opening succeeds; revoked source sharing returns Not found and 403, with no report content. B asserts forbidden dashboard writes change neither definition nor sharing. |
| 3 | PENDING exact-SHA Verify | verification-plan.mjs:53-110 includes both files in push Verify's fold-domain shards. No new env flag or nightly-only path was added. |
| 4 | PASS local | The final main fetch and rebase left HEAD unchanged; relevant runtime and test bytes are those tested. RECEIPT.json binds commands and logs to the full candidate SHA. |
| 5 | PASS inspected | REPORT-002 already cites BASE-ROLE-001 and BASE-DATA-001 in its meta line. Existing Team and later Owner inheritances remain explicit. |
| 6 | PASS mechanical; lander owns judgments | Generator write and check both exit 0, views restored from main, CONTRACT.md and its full Status table are byte-identical to main. Stale email sentences are reported below, never hand-edited. |
| 7 | PASS inspected | No acceptance sentence, clause requirement, Status cell, coverage map or count changed. |
| 8 | PASS local | Allowed and revoked source navigation, limited-reader totals and drill rows, refusal of report administration, record-grant and dashboard-share revocation are exercised through real authenticated doors. |
| 9 | PASS boundary | No provider receipt claimed. Email sender, attachment transport, team roles, later Owner kinds and all other held obligations remain with their existing clauses. |
| 10 | PASS inspected | No new policy default adopted. Current sharing and authority semantics already exist. No ASK or policy narrowing. |
| 11 | PENDING guarded landing | Main does not equal this branch candidate. Publication scan and exact-candidate Run site are NOT RUN in cloud. The fleet must record COMPLETE full-history scan with zero findings, exact-SHA Verify, main equality and Run site before awarding the count. |

## Mechanical and pre-ready self-check

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0; ledger=none exit=0.

The app build, typecheck and first-party checks pass. Both report-disclosure registrations pass (2 of 2; 731181.722916 ms total), and report-time-boundaries passes (1 of 1; 210340.033289 ms total). Generated views are restored from main and absent from the branch delta. Source lock is freshly regenerated and its check reports ok=true. There is no migration, no Base refresh, no workflow edit, no fixture address addition, and no removed, narrowed or skipped existing assertion. Test budget stays 198 registered cases plus two qualifications, total 200. Assertion audit was inspection of the final diff; no mutation suite was invented.

Authority and replay: the changed flow opens definitions only; it cannot perform a write. The actual access journey covers source and dashboard share revocation. The existing backend proof deletes and recreates a source key and checks withdrawn pointers stay unavailable. The inherited archive journey withdraws erased snapshot pointers. No new capture or erasure path is introduced.

UI: native keyboard link, existing 14-pixel Basis text, existing tooltip implementation for icon-only dashboard controls, no new styling or setting location. Builder inspected desktop and phone Basis screenshots. Fresh independent uip gate remains required before landing; this report does not impersonate that gate.

Exact-tree publication scan: commit=7f681b4f8ce8eb93914ac415fe88a086bee3f9d2 complete=NOT_RUN historyScanned=NOT_RUN findings=NOT_RUN. Cloud branch-push adaptation delegates this scan to the fleet. No zero-findings claim is made by this builder.

Baseline main receipt: Run site 43314615051 completed success and Verify 43306540483 completed success on 63aa0647cabbd86ae1ee2c489f1dfe8ef31e123b. A second push Verify 43314615020 was in progress when read. These are main receipts, never evidence of candidate green. No PR is required: this repository's Verify has a push entry point. No PR was created, no CI dispatch or rerun was sent, and no main branch was pushed.

## Scope correction submitted to the independent gate

REPORT-002's Status Gap contains dashboard-email sentences that belong to REPORT-004 and NOTIFY-003. They are not REPORT-002 acceptance outcomes. Its Team filter is explicitly inherited by TEAM-006 under TEAM-005, consistent with FORECAST-001's team comparison inheritance. Current composition is by the installation owner pending the manager role. All acceptance outcomes outside that existing inheritance are mapped above; none is silently dropped.

Contact, lead, company and custom-object Owner filters remain RECORD-016 and RECORD-022. Team sharing, administrator team default with personal override and restricted-seller dashboards remain TEAM-006 under TEAM-005's held cleanup prerequisite. Recipient-specific email, revocation and queued, sent, failed and uncertain delivery remain REPORT-004 and NOTIFY-003, with system sender, attachment transport and device-account holds unchanged. SURFACE-007 report deletion scope and every other queue note remain unchanged. No homepage, logo or public claim changed.

Actual before and after counts are both 42 DONE, 130 PARTIAL, 32 MISSING. REPORT-002's stored judgment remains PARTIAL. A successful independent gate can award REPORT-002 DONE, changing counts to 43 DONE, 129 PARTIAL, 32 MISSING; this is a requested award, not an existing count. Plan rows changed: none on the Mac. Relay this result to the REPORT-002 campaign row only after the gate disposition; no other campaign was started.

Final candidate custody, CI conclusion, claim and any remaining gap are recorded in RECEIPT.json and the terminal report.

## Terminal qualification

All four selected native points pass locally on 7f681b4f8ce8eb93914ac415fe88a086bee3f9d2. The formal claim remains PARTIAL solely because exact-SHA push Verify 43320242997 was still in progress at the last permitted read, 2026-11-12T22:53:50.615831Z. Eight of ten GitHub calls were used; two are reserved for failure diagnostics rather than more idle polling. The watcher was stopped intentionally, with no local test or server command pending. No CI rerun or dispatch was sent. No real test failure or product blocker is known.

No further product build is indicated by this run. The independent gate can score the pushed head after Verify completes, using the actual native proof and the scope correction above. Do not treat the inherited Team or email duties as a newly unbuilt REPORT-002 gap. Fresh uip, fleet publication scan, guarded landing and exact-main Run site remain required.

GAP REPORT-002: Exact-SHA Verify 43320242997 remains in progress; formal DONE qualification awaits that receipt and the independent gate.

The product branch is cloud/sd-orbit-c-f181 at 7f681b4f8ce8eb93914ac415fe88a086bee3f9d2. Counts and stored clause judgment are unchanged: 42 DONE, 130 PARTIAL, 32 MISSING, with REPORT-002 still PARTIAL.

CLAIM REPORT-002 PARTIAL points=1,2,3,4 tests=newtests/t096/report-disclosure.test.ts#REPORT-002 REPORT-003 REPORT-004 an owner’s tile board links viewer-fenced saved definitions at their versions and exports; REPORT-001 a US monthly two-pipeline report reconciles won/lost/open deals, reasons and rep activities by drill-through, discloses its basis, and leaks nothing after revocation or late evidence; newtests/t096/report-time-boundaries.test.ts#report periods compare instants across ISO precision and timezone equality boundaries
