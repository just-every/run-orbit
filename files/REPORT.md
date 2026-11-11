# Orbit mail setup

Repository: just-every/run-orbit
Branch: cloud/main-orbit-mail-setup-1

Terminal custody: PUSHED at `81e9125e1e7bd533a7a7545469255d7b9613b484`. Exact-SHA Verify [42990112687](https://github.com/just-every/run-orbit/actions/runs/42990112687) is in progress. The ten-call GitHub API budget is exhausted. This packet makes no READY or landing claim.

## Plan

1. Reproduce saving a draft and requesting its approval preview through the authenticated public HTTP routes with no mail transport.
2. Return a successful availability response with a plain reason; keep POST approval fail-closed. Show that reason and a Mail settings link before offering approval or scheduling. Omit the NOW approval step while mail is unavailable.
3. Describe missing sender settings using everyday names and one-line acquisition guidance. Keep setting identifiers in commands and private-file instructions only.
4. Extend existing public-route and onboarding journeys without increasing the 200-test budget; preserve configured-sender approval coverage.
5. Run touched checks and typecheck, show the changed screens at 1440 and 390, regenerate/check the source lock last, and publish the named product branch using the fleet guard.
6. Discover/poll exact-SHA Verify through REST within the ten-call budget and 300-second cadence. Publish this report and actual receipts separately on the evidence ref.

## Scope and defaults

No provider addition or configured-sender sending changes. No CONTRACT status, Gap, Evidence or generated view changes. No DONE claim. Public-route and browser fixtures use synthetic data and no live provider keys. The shipped polish essentials govern the small existing-component changes; this is not new UI composition.

## Results

The baseline authenticated HTTP probe saved a real draft and received HTTP 503 from its approval preview; no outbound row existed. `reproduction.json` records the actual non-secret result.

The candidate returns HTTP 200 with `available: false`, a saved-draft explanation and the Mail settings destination. With a configured transport it returns the existing recipient-time preview plus `available: true`. The frontend checks this on opening a draft, keeps approval disabled during that read, and replaces approval/scheduling with the setup link when unavailable. Approval POST remains fail-closed.

NOW filters the approval step when the installation has no configured sender. Mail settings lists each missing item as SendGrid key, sender address, reply address, unsubscribe group, or the managed relay equivalents, with acquisition guidance. Invalid group/relay messages also use everyday names. No providers, sending transport, recipients or delivery policy changed.

The extended source-onboarding test exercises no-sender preview and both immediate/scheduled approval refusals through authenticated public routes; it checks no provider call, no queued outbound message and an intact saved draft, then retains its existing configured-sender approval coverage. The retained first-hour browser journey checks the public preview, displayed reason, working Mail link, absence of the send action, no outbound row and the NOW checklist at 1440. It captures the changed pages at both widths without adding a registration.

The focused native `rer dev` browser proof passed at 1440 and 390 for Draft, Mail and NOW, with assertions at 1440. Six actual screenshots and `browser-receipt.json` are in this packet. No HTTP 5xx appeared in that pass. The screenshots use synthetic customer data only.

The first route-test run included an incorrect fixture assertion expecting a document from the API-only test app. That assertion was corrected to inspect its onboarding API; the real document navigation was proved in Chromium.

Test inventory: 198 registered cases + 2 qualification flows = 200 before and after. Contract summary: 42 done, 130 partial, 32 missing, total 204 before and after. No clause status, Gap, Evidence or generated-view edits.

Fresh `origin/main` was fetched and rebased before the candidate commit; no drift was present. Typecheck, source-lock check and contract-document check passed. Full local Verify is intentionally delegated to exact-SHA branch CI, per the brief. Base publication scan cannot run in this cloud; the fleet performs it before landing.

The retained integration and browser journeys both passed. Exact-SHA CI results follow below.

The retained 1440 first-hour browser test passed (one registered journey, 254.104 seconds). It exercised native setup and sign-in, new no-sender UX assertions, configured SendGrid acceptance through a network-edge fake, managed mail, hosted sender setup and hosted scheduling. The phone proof remains the focused 390 screenshots; no new width loop or registration was added.

An isolated rerun of `tests/core/source-onboarding.test.ts` was started with the installed pinned Node 22.20.0. The earlier Node 24 attempt, which overlapped the browser build, reached the existing Slack archive proof and timed out spawning Wrangler fixture migrations (`spawnSync ... ETIMEDOUT`); its subsequent fixture tests also timed out. Those are recorded as unsuccessful environment attempts, not product passes. No migration timeout or assertion was weakened.

The isolated pinned Node 22.20.0 source-onboarding run passed all 3 tests, with no skips or failures, in 678.813 seconds. All newly added assertions remained enabled. A final fetch/rebase found no main drift. The candidate was typechecked again with pinned Node 22, then the source lock was regenerated last and checked.

CLAIM OUT-001 PARTIAL points=1 tests=tests/e2e/workbench.spec.mjs#a real account, attributed event and durable reviewed draft can be created; tests/rer/onboarding.test.mjs#SIGNAL-001 SIGNAL-009 PUBLIC-002 OUT-001 first hour through native rer sign-in and exact rendered recipes at 1440
GAP OUT-001: This focused round does not promote the clause or replace its other recorded acceptance gaps.

Product published on `cloud/main-orbit-mail-setup-1` at `31e8cf27d8a4dc9576151f3356ca4813e90d4d4f`. The fleet push guard succeeded on its first attempt. All candidate authors and committers were the fleet identity; no trailers survived. The worktree was clean and the receipt verifies the changed source bytes equal the committed tree. Verify run 42985902444 completed with failure on that exact SHA. Its failed jobs were read once each through the log archive.

## CI correction

Verify 42985902444 failed in batch-13 because the existing `tests/e2e/workbench.spec.mjs` expected the enabled send button and HTTP 503 preview that this brief removes. That retained test is updated to read the public preview after page load, assert HTTP 200 with unavailable state, show the server reason and settings destination, offer no send/confirmation button, create no outbound job and navigate to Mail settings while preserving the saved draft. Its registration is retained.

Batch-8 also failed before its existing collaborator/report assertions: Wrangler fixture migrations hit the unchanged 60-second subprocess timeout. The failed jobs are 130408108064 and 130408108192; `ci-failures.json` and their selected non-secret log excerpts retain the actual errors. The verify gate failed downstream. Neither fixture timeouts nor product assertions were weakened. The next branch head will need its own Verify; the first run is never reported green.

The published branch fetched and merged origin/main (already current), retaining published history. Nine GitHub calls have been used: six run discovery/status reads, one failed-job listing, and the two failed-job log archive reads. One call remains for discovery of the corrected exact SHA.

The corrected existing workbench end-to-end test passed at 1440 with Node 22.20.0 and /usr/bin/chromium (one case, 20.6 seconds; 1.2 minutes including startup/build). A local response-capture/navigation race was removed by reading the same public route through the authenticated request API, then asserting its reason and link in the page. Typecheck passed again, the test inventory remains 200, and source-lock regeneration/check passed. No provider or fixture-timeout code changed.

## Terminal result

Both product commits are published without skip markers or rewritten history. Corrected head: `81e9125e1e7bd533a7a7545469255d7b9613b484`. Its new Verify run is `42990112687`, observed in progress on this exact SHA with GitHub call 10. The previous run `42985902444` failed; its obsolete send/503 assertion is corrected and passes locally, while its separate collaborator/report fixture migration timeouts remain an observed CI risk. No workflow was re-run or dispatched, and no green result from another SHA is substituted.

Local results: source-onboarding 3/3; retained first-hour browser 1/1 at 1440; corrected workbench browser 1/1 at 1440; focused Draft/Mail/NOW proof at 1440 and 390; typecheck, source lock and contract-view checks passed. Test count 200 before and after. Contract counts remain 42 done / 130 partial / 32 missing (204 total). No clause Status, Gap or Evidence changes. No PR was created; the fleet owns landing. Remaining gate: completed exact-SHA Verify. The cloud cannot claim READY while it is pending.
