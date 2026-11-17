# Orbit stranger-trip replay and records-search fix

Signed: Run Edit Run fleet, 2026-11-17.

Interaction: the server-rendered Records search admitted input before React hydrated it. With the Records page module delayed, typing “Synthetic Calendar Contact” succeeded in the DOM, then hydration reset it to an empty string. That empty query could be saved and later reopened, matching the refused lander head and this run’s first exact-SHA Verify failure. The final candidate keeps the search read-only until its handlers are attached, using Orbit’s existing useHydrated hook. The existing search assertions remain intact.

Product repository: just-every/run-orbit
Branch: cloud/main-orbit-stranger37-trips-1-c1
Final candidate: 0d80d4da6d7c1173c243f2fd9cdc8813cde00629
Base main: 14a3aae44a2e327978f7ce92f099448190362d3d
PR: none; Verify has a branch-push entry point.

## Plan and execution

1. Install the fleet identity, decrypted-bundle credential helper, push guard and clone-local commit hooks. Clone only the declared repository. Read the launcher rules, repository rules and inline builder rules.
2. Start the named new branch at caaf2e290864630d038f11f9d635eda06f635cba and rebase its single trip-fix commit onto current main. Preserve main’s newer source, tests, sign-in behaviour and clause judgments. The rebase completed without conflicts as d7378a484447ed01c598b53cdfa33ec2b0ed4391.
3. Install the pinned dependencies, complete disposable local owner setup, build the emitted Worker, and run the repository’s unchanged records-layout command three consecutive times. Run typecheck and the touched pipeline/source browser paths; count cases and regenerate/check the source lock last.
4. Inspect all candidate identities and messages, and push the named branch through the fleet guard. Watch only the exact-SHA Verify at five-minute intervals. When CI repeats the failure, read each failed job once and diagnose the behaviour through the emitted application.
5. Reproduce the lost input deterministically by holding the actual Records page JavaScript response. Apply the established hydration guard; extend the existing browser registration with a slow-module search/save/reopen flow, preserving every original assertion. Rebuild and run the focused probe and full affected journey on the final candidate, plus typecheck, inventory and source-lock checks. Fetch main and merge any updates after publication; main was still unchanged, so the merge was already up to date. Amend only unpublished work to regenerate the lock after the new helper became tracked.
6. Push the fix as an ordinary descendant of the first published head. Keep actual non-secret reports, logs, receipts and screenshots in this packet; publish them solely through the separate evidence ref. Relay final custody to the lane. The exhausted API budget requires PUSHED custody unless the final SHA’s Verify can be observed successful; no old-SHA green result is reused.

## Product changes

- The original three fixes are retained: visible Create pipeline and Enter submission; Cal.com/Calendly panels linking to the real source recipe and its controls; and copyable connection/submission payloads without raw identifiers or JSON in ordinary instructions.
- RecordsFilters now uses the existing useHydrated hook and readOnly={!hydrated}. It becomes editable once React’s handlers are attached. No search-query, filter, saved-view, database or sign-in semantics changed.
- recordsSearchHydrationJourney holds the actual page module, asserts the search is not editable before hydration, releases it, types through the real control, saves a view, verifies the saved query through the HTTP response, opens a fresh saved-view URL and verifies the search value, then deletes the disposable view through the UI. It runs at 1440 within the existing records-layout registration.
- Main’s explicit invitation acceptance and autosave behaviour remain present. src/dev/server.ts and tests/rer/identity.test.mjs are unchanged against main. The original records-layout and typed-fields assertions are retained; the only registration change is an additional awaited journey.
- No CONTRACT.md, ACCEPTANCE.md or docs/CLAIMS.md edit. No schema, dependency, release, deployment or unrelated feature change. The attendee trip was not repeated separately.

## Reproduction and local evidence

The initial unchanged candidate passed records-layout three consecutive times: 185120.726942 ms, 215613.802158 ms and 221683.735871 ms. Each reported 1 pass, 0 failures and 0 skips. Those complete outputs and their hashes remain in records-layout-1.log through records-layout-3.log and records-repetition-receipt.json. They are pre-fix evidence, not final qualification or proof that there was no timing defect.

Exact-SHA CI then reproduced the same failure at typedFieldsJourney’s saved-search assertion. The deterministic before-fix probe reports:

    BEFORE hydration: {"value":"Synthetic Calendar Contact","heldCount":1,"readOnly":false}
    AFTER hydration: {"value":"","heldCount":1}

It fails with the same expected/received search value. search-repro-before.log and search-repro-before.mts retain that actual probe. This establishes a hydration timing interaction; it does not establish that the replay introduced a search-source regression. The original trip-fix diff and main’s two newer commits did not edit RecordsFilters or the search state logic.

The final deterministic probe passes: the field is read-only with the module held, typing waits for readiness, and the query survives saving and reopening. Its actual output is search-repro-fixed.log. During construction, one local full run used the earlier route-release harness and reported “Route is already handled”; the release was corrected to wait for the held handler before removing it. records-layout-fixed.log retains that superseded harness failure. Final qualification is recorded separately in records-layout-final.log and final-receipt.json.

The unchanged onboarding registrations passed at 1440 (321348.917297 ms) and 390 (217588.014791 ms), 2 tests, 2 passes, 0 failures and 0 skips. They exercise rendered source recipes and the reviewed-send flow. Pipeline creation by visible action and Enter passed. System Chromium at /usr/bin/chromium with --no-sandbox was used; the included runtime-only launch override changes no committed source. The final screenshots cover the changed search, pipeline, booking and automation screens at 1440 and 390; their receipt identifies the candidate SHA.

Final typecheck, source-lock, contract and affected-browser results are enumerated in final-receipt.json. Source lock was regenerated after staging the new helper and checked. No generated contract view was committed.

## Counts and clause scope

Tests before/after: 198 registered cases + 2 qualification flows = 200/200. No registration added, deleted, skipped or weakened. The new behaviour is asserted inside the existing registration.

Clause-register judgments before/after are identical: 42 done, 130 partial, 32 missing. No Status, Gap or Evidence cell changed. No whole-clause promotion or demotion is requested.

CLAIM OPP-009 PARTIAL points=none tests=tests/rer/operator-desktop.test.mjs#BASE-PUBLIC-003 T099 native operator routes and expanded data views at 1440px
GAP OPP-009: This replay directly checks pipeline creation controls; no new judgment is made about the whole stage-movement and deletion clause.
CLAIM SIGNAL-001 PARTIAL points=none tests=tests/rer/onboarding.test.mjs#SIGNAL-001 SIGNAL-009 PUBLIC-002 OUT-001 first hour through native rer sign-in and exact rendered recipes at 1440
CLAIM SIGNAL-009 PARTIAL points=none tests=tests/rer/onboarding.test.mjs#SIGNAL-001 SIGNAL-009 PUBLIC-002 OUT-001 first hour through native rer sign-in and exact rendered recipes at 1440
GAP SIGNAL-009: Provider HTTP boundaries are controlled in local qualification; live provider acceptance is not claimed.

## CI and custody

The first pushed head d7378a484447ed01c598b53cdfa33ec2b0ed4391 failed Verify 44077219595: https://github.com/just-every/run-orbit/actions/runs/44077219595 . Product batch-18 (job 134020317640) failed only at the same empty saved-search assertion; aggregate verify (job 134032227916) consequently failed. Both archive-log commands succeeded and their actual outputs are retained. The CI receipt contains seven discovery/status calls, followed by one jobs call and two failed-job log calls: ten calls total.

The corrected head 0d80d4da6d7c1173c243f2fd9cdc8813cde00629 was pushed without a skip marker, as an ordinary fast-forward of the named branch. Its Verify result/run ID has not been read because the ten-call budget is exhausted. This run therefore claims PUSHED, not READY. The old head’s red result is not attributed to the corrected head, and the prior caaf2e29 green run is not used for final readiness.

Every candidate author and committer is Run Edit Run fleet <fleet@runeditrun.com>. Trailers are absent. Published history was never rewritten. Both product pushes succeeded on attempt 1 and exact remote ref readback matched the corresponding head. The complete candidate diff and selected packet were checked for injected bundle values without printing them.

The full public publication scan remains the fleet Mac lander’s gate under the cloud instruction; no local COMPLETE publication scan or landing is claimed. Evidence publication transports reports only and supplies no product acceptance or landing signal. There is no remaining local product blocker; exact-SHA CI on the corrected candidate remains unobserved.

Final affected browser command passed on 0d80d4da6d7c1173c243f2fd9cdc8813cde00629: records-layout-final.log reports 1 test, 1 pass, 0 failures, 0 skips, 186937.330363 ms. The emitted application includes the hydration guard and the same run executes the new deterministic regression and all original records-layout/typed-fields assertions.

The final pipeline/screen proof also passed on 0d80d4da6d7c1173c243f2fd9cdc8813cde00629. Fourteen final-candidate screenshots, including the saved filtered view, are identified by SHA-256 in screenshots-receipt.json. All browser/server commands completed their own cleanup through cloud_run.
