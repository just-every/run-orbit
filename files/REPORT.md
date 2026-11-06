# sd-orbit-c-f71 result

RECORD-005 remains PARTIAL → PARTIAL. The selected deterministic-order point is closed more strongly: authenticated note creation includes a newer event followed by an older event and a late event at the newer event's exact occurred time. Both native timeline doors return occurred time descending, then ID ascending, before and after reload. The actual activity rows and note titles retain that same order at 390 and 1440.

Product repository: just-every/run-orbit.
Branch: cloud/sd-orbit-c-f71.
Final candidate: f4d3dfa78ebc688b48741d0ac34579597de7186e.
Requested base retained: a2a3e752f89e80ed0af776463c2313f4fcb9e0bc.
Final parent: 702f4b5ae77e91288d0f91ff02f478392f2c8f2a.

No production defect was demonstrated. Production repository and activity components are unchanged. The changes extend the existing browser registration, clarify the same Status Gap, and regenerate the source lock. All 204 Status rows survive every candidate parent. Counts remain 35 DONE, 137 PARTIAL, 32 MISSING, total 204. The suite remains 198 registered tests plus two qualification flows, total 200. No registration or existing assertion was deleted, skipped, narrowed or moved behind a new condition.

## Scope and remaining acceptance

The supplied planner explicitly omits the combined mail, meeting, note, stage and owner change, and merge journey, and exact per-entry occurred and recorded timestamps and creating source and actor. The Status Gap retains all of those outcomes. No acceptance sentence, provider qualification, TEAM-005 expanded-role boundary, queue note, hold or release prerequisite changed. There is no DONE claim or judge request.

The campaign extract's RECORD-005 row should record this selected-point closure and leave its remainder and counts unchanged. No plan was rebuilt. The complete execution plan is in PLAN.md.

## Public-door proof

`tests/e2e/operator.spec.mjs`, registration “RECORD-005 — the mobile opportunity timeline shows metadata and orders out-of-order notes with ID ties”:

- Lines 143–148 retain Occurred, Recorded, named actor and source-label assertions.
- Lines 152–164 POST three distinctive notes through the authenticated Records entry route. The newer pair have identical occurred times, and the older note is delivered after the first newer note. The final equal-time note makes arrival order differ from required timeline order.
- Lines 165–179 require three distinct returned IDs and compare native Records and opportunity reads against descending occurred time and ascending ID. These are nonempty native rows, including exact note text and supplied occurred times.
- Lines 181–190 reload the phone page, assert actual DOM entry IDs and titles in order, reject horizontal overflow, capture the screen and read both native doors again.
- Lines 191–203 reload at desktop width, assert actual entry IDs and titles again, reject horizontal overflow, capture the screen and repeat both native reads.
- Line 204 retains console, page-error and failed-request checks.

The exact committed candidate's focused browser run passed: one test, 12.511 seconds, 49.2 seconds including fixture setup and build. System Chromium was launched at /usr/bin/chromium with --no-sandbox, under cloud_run and the required 1200-second hard timeout. Both final screenshots were inspected. Local fixture sessions were created by the existing test harness; no real browser profile or outside account was used.

The resulting actual IDs and all three rounds of both native readbacks are in timeline-order.json. The same ordered IDs appear in both visible DOM receipts. Screenshot files are timeline-390.png and timeline-1440.png. Browser-results.json and browser-check.log retain the actual execution result.

PROBE RECORD-005 deterministic order: authenticated Records creates three distinctive notes with a late older arrival and a late equal-time arrival; Records and opportunity GETs before and after reload -> identical IDs ordered by occurred time descending and ID ascending; visible activity at 390 and 1440 -> identical expected entry IDs and titles, no horizontal overflow.

## Assertion sensitivity

One temporary mutation replaced the native Records query's occurred-time ordering with ID ordering alone. The strengthened public-door journey failed with exit 1 at tests/e2e/operator.spec.mjs:172: expect(received).toEqual(expected). The older entry appeared before the late equal-time entry. The original production file was restored byte for byte, and the unmutated journey passed before commit and again on the final committed head. No mutation was committed. This was a deliberate local test-sensitivity check, not a failed CI repair.

The individual comparison is the native Records result at line 172. The opportunity comparison at line 176 and the visible comparisons at lines 185–186 and 194–195 remain separate assertions. No aggregate mutation is claimed. Mutation-check.log retains the actual failure.

## Mechanical checks and publication custody

- Fleet launcher refreshed and its Git helper, push guard and commit cleanup hooks installed. Repository hooks remained active. Both commits use the fleet author and committer identity; every candidate commit including the inherited base was inspected. No co-author trailer is present.
- npx -y @runeditrun/rer setup with the required non-interactive owner flag: exit 0. No setup secrets or private launch links are included in the packet.
- npx -y @runeditrun/rer build: exit 0.
- pnpm run typecheck: exit 0.
- pnpm exec rer check --profile first-party: exit 0.
- Contract generator write, then check: exit 0. Generated ACCEPTANCE.md and docs/CLAIMS.md were restored whole from origin/main and were not committed by this run.
- Source lock regenerated last with the seed's documented edition-authoring lock command; its check: exit 0.
- No migration changed, so the migration-ledger check is not applicable.
- Before the first push, main was fetched and the unpublished branch rebased without dropping the requested base. Before the final push, main was fetched and merged; it was already an ancestor. Published history was never rewritten.
- The first and final product pushes both succeeded on their first guard attempt. The remote final head was independently confirmed. No main or default branch was pushed; no pull request is required by this repository's push workflow, and none was created.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0, restored ACCEPTANCE.md and docs/CLAIMS.md from origin/main; ledger=none exit=0 (no migration change).

A cloud-side publication scan is not required by the cloud adaptation. No COMPLETE scan, zero-findings result, main equality, landing or Run site success is claimed. Those remain the guarded Mac lander's duties. Changed product text introduces no new email-shaped string or bare prose repository token. The packet is report-only; it does not signal product acceptance or landing.

## DONE-rider assessment

1. FAIL for the complete clause: the combined-history and exact per-entry provenance outcomes remain unproved. PASS for the selected ordering point, through the native and browser assertions above. No DONE promotion.
2. PASS for the selected point: three real saved note rows, exact IDs and text; the insertion-order mutation fails at line 172. This change introduces no money, security or data-loss path.
3. FAIL for recorded complete-clause proof: final push Verify 42149948754 on f4d3dfa78ebc688b48741d0ac34579597de7186e stopped at stale ACCEPTANCE.md; browser shards skipped. The focused local browser journey passes on that exact committed head. The explicit generated-view-only exception permits READY custody, not a DONE promotion. No earlier-SHA run is substituted.
4. PASS for local proof: the final screenshots and readbacks come from the final committed head; no relevant byte changed afterwards.
5. PASS: the receiving clause's existing BASE citations remain in CONTRACT.md:90. No inheritance text changed.
6. PASS for honest partial metadata: the Gap still names all omitted work and is more specific about the ordering proof. Generator write and check pass locally. After the required restoration, the standalone view check exits 1 naming only ACCEPTANCE.md; this is expected by the explicit cloud rule. No new Judged-from claim is made.
7. PASS: acceptance text and obligations are unchanged; no rewrite or split occurred.
8. NOT APPLICABLE to this diff: native-session creation and read doors are exercised, but production authority and correction verbs were not changed or newly qualified.
9. PASS: provider, legal and expanded-role qualification is not claimed; boundaries remain unchanged.
10. NOT APPLICABLE: no new policy default was adopted.
11. PENDING guarded landing: no main equality, exact-main Run site or publication-scan receipt is claimed.

## Pre-handoff self-check

The selected user-visible ordering outcome has nonempty native and rendered assertions; the deliberate mutation demonstrates failure when occurred-time order is lost. Existing assertions and test registrations are preserved. Runtime authority, erasure and replay code is unchanged. No production screen or control was added or modified; both existing activity screens were inspected, and their existing actions are text-labelled. The source lock is fresh. Complete-clause and provider claims remain partial. Scan and landing custody remain with the fleet.

## CI and terminal status

Final exact-head Verify: 42149948754, push event, https://github.com/just-every/run-orbit/actions/runs/42149948754.
Earlier candidate Verify: 42149403734 on 702f4b5ae77e91288d0f91ff02f478392f2c8f2a; superseded by the final candidate, not used as final proof.
The final exact-head run completed with conclusion failure. Its only primary failure is the expected generated-view check: ACCEPTANCE.md: generated content differs; run contract-docs write. Source job 127670583514 stopped at that first gate; source artifact retention consequently found no artifacts. Aggregate job 127670750833 failed its source-success dependency and could not retain a summary. Browser shards skipped. Both completed failed-job archives were read once. Six GitHub budget calls were used: two discoveries, one final-run poll, one jobs listing and two failed-job log reads. Discovery and the final-run poll were separated by at least 300 seconds; no dispatch or rerun was requested.

This is READY custody under the explicit generated-view-only exception, with no known product failure. It is not a green full-suite claim or a DONE claim. The lander must generate the views and rerun its gates before landing. No account or policy blocker was discovered within the selected point. All remaining planned acceptance work stays named in the Gap.
