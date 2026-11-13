# Orbit next-step links replay

Tag: main-orbit-next-step-links-1-c1
Repository: just-every/run-orbit
Product branch: cloud/main-orbit-next-step-links-1-c1

## Plan

1. Configure fleet identity and launcher credentials, install the Git guard and commit hooks, clone full history, and inspect repository instructions.
2. Start from current origin/main and apply the delta of d466f8c19ece5c2f67a9f9efc95a5d74575c01f0 against b1038458504f4ddfa104fdc2cd62de466656f9e7. Keep main's contract and generated views byte-identical. Stage the replay without creating a premature save commit so the final branch has one real commit.
3. Confirm the missing-policy result explains the prerequisite, links to owner policy setup, hides protocol codes, and creates no task. Confirm each Capture waiting count opens only that source's pending proposals.
4. Run the touched browser journeys and typecheck. Retain screenshots of the changed screens at 1440 and 390, with assertions at 1440 for the added behaviours. Keep the 200-case cap.
5. Fetch main before the candidate; if it moved, replay the one unpushed change onto the newer main. Generate and check sources.lock.json last. Check all candidate identities/messages, commit once, and push through the fleet guard.
6. Discover and poll exact-SHA Verify with one watcher at least 300 seconds apart and within ten GitHub calls. Publish this actual report and receipts to the separate evidence ref. Report terminal custody and clause claims without editing clause judgments.

## Initial findings

Main at clone: 088a5263487a37ae465e7e42d1bb1b64167686b0 (mailbox response body reuse fix).
The original delta applied cleanly and contains both requested behaviours. No supplemental product fix is currently needed.
The test inventory is 198 cases plus 2 qualification flows, total 200. No registrations are added by the replay.
CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md are not touched by the original delta.
No policy default is selected. No clause Status, Gap or Evidence is edited.

## Replay validation

The fetched source commit parent is exactly b1038458504f4ddfa104fdc2cd62de466656f9e7. All nine non-lock changed files match d466f8c19ece5c2f67a9f9efc95a5d74575c01f0 byte for byte. The regenerated source lock checks successfully. The pre-candidate fetch still names main 088a5263487a37ae465e7e42d1bb1b64167686b0.

Build, typecheck, deployment-spec check and contract-docs check passed. Capture: both existing tests passed (35.9 s and 52.0 s; total command 2.4 min). The source-filter assertions operate at 1440; the changed page has inspected proof at 1440 and 390.

The initial risk journey command lacked the system Chromium environment override and failed at browser launch because its bundled browser was absent. The corrected command sets PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium, retains --no-sandbox from the existing test runner, and uses pinned Node 22.20.0. No test or product source was changed for that correction.

## Product result

Single candidate commit 433a9a020ffe443e5cfc9912c0bcff181d74fb61 (tree fcb2cadfb03c19bf2c40612f8d5391f6adb1c56e) was pushed through cloud-push.py on the first attempt. Its parent is 088a5263487a37ae465e7e42d1bb1b64167686b0. No merge or save commit exists. The checkout is clean. All authors and committers are the fleet identity; the candidate has no trailers or skip marker.

The full touched risk journey passed: one registration, 191.3 s. It covers missing-policy refusal with no task change and the owner setup link, then the populated embedded run with held company decisions preserved. Capture passed two registrations. Build, typecheck, source lock, deployment spec and contract views checks passed. Four changed-screen screenshots at 1440 and 390 were visually inspected. No extra product fix beyond the replay was necessary.

Counts before/after: tests 198+2=200 / 198+2=200; clauses 42 done, 130 partial, 32 missing (204 total), unchanged. No clause status changes and no DONE claim. No policy default was adopted.

CLAIM AGENT-002 PARTIAL points=1 tests=tests/delegation-browser/today-brief.test.ts#BRIEF-001 BRIEF-002 BRIEF-003 BRIEF-004 BRIEF-005 RECORD-017 a seller starts the day from the brief, plans a meeting, runs the deal-risk agent, reviews an agent handoff and follow-up outcomes, and a colleague opens a mention that keeps its entry in view, in the browser at 1440 and 390
CLAIM CAPTURE-004 PARTIAL points=1 tests=tests/e2e/capture.spec.mjs#CAPTURE-001 CAPTURE-004 an operator adds a mailbox and calendar files, reviews the proposals and opens the account at 1440 and 390; tests/e2e/capture.spec.mjs#CAPTURE provider status keeps revoked access clear, reconnects through the guided setup and disconnect preserves captured history

These PARTIAL claims cite the exercised portions; this replay does not establish every obligation of these broader clauses.

No PR was opened: the brief specifies branch custody and fleet landing. The full publication scan remains with the Mac lander, as explicitly required by the cloud adaptation.
