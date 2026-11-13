# Orbit active workflow editor

Task: main-orbit-workflow-editor-1
Repository: just-every/run-orbit
Branch: cloud/main-orbit-workflow-editor-1
Product head: f5005490f94c312127e42f957311a264241875fa
Integrated main: 008e46c (full identity in product-receipt.json)
PR: none; this repository's fleet branch landing path applies.

## Result

A selected active workflow now keeps one editor through a trigger edit, its draft save and an immediate preview. The saved successor draft is previewable without reloading. Choosing the workflow repeatedly keeps one editor and creates no extra versions.

The editor and its sibling version-undo panel previously had the same React key (the workflow ID). Saving the selected active workflow updated their parent, causing duplicate-key reconciliation to retain an orphan editor with stale Saving draft and Working states. Distinct stable editor and undo keys remove the collision. The fix changes two component keys; it changes no server route, activation, approval or version-authoring logic.

## Reproduction

Native local installation, private local dev sign-in, first-run setup, Settings / Pipeline / Workflows, Chromium through the public UI. Initial main was 0e9e55cf150dfcc781d1d9e62b2d88c15c9b6a63.

Created a task workflow, previewed and activated it, selected the active workflow, changed Trigger from record changed to record created and immediately clicked Preview changes. The page retained two Workflow name editors, one Saving draft indicator and one Working button, with no activation preview. React emitted two duplicate-key warnings. See reproduction.json and before-1440.png. The additional reported seven-editor count was not separately measured; the direct two-editor reproduction establishes the shared collision.

## Change and regression coverage

Extended tests/rer/workflow-journey.mjs, already exercised by tests/rer/operator-desktop.test.mjs, without registering a new test. The new assertions select an active workflow, change its trigger and preview immediately. They check exactly one successor version, the saved trigger, one editor, visible finished preview, enabled preview button, no saving/working indicators, the original active version, unchanged record values, repeat selection without a reload, and no extra version after another preview.

All existing assertions remain, including reload persistence, execution of the original active version, workflow undo, and material approval acceptance. The complete existing workflow browser helper, including its outcomes and typed-value subjourneys, passed locally before and after integrating main.

## Checks

- Focused existing native workflow journey at 1440: passed twice. The final integrated-tree run is recorded in focused-journey-final.json and focused-journey-final.log.
- TypeScript typecheck: passed before and after integration; also passed explicitly under pinned Node 22.20.0.
- Test inventory: 198 registered cases + 2 qualification flows = 200 before and after.
- Source lock regenerated last using node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock; its check passed. The complete check output is source-check.log.
- git diff --check: passed.
- Candidate identity and trailer inspection: one candidate commit, fleet author and committer, no trailers; side parents included by the origin/main..HEAD traversal.
- Product push: succeeded on the first attempt through cloud-push.py.
- Exact-SHA Verify: run 43363300128. Current/final results are in the CI receipt files; no other SHA is used to claim success.
- Full publication scan: reserved for the fleet lander on its machine, as the cloud brief requires.

## Browser proof and before/after counts

The four after screenshots show the changed editor and activation preview at 1440 and 390. Browser-proof.json records one editor and one finished preview at each width, zero saving/working indicators, zero duplicate-key warnings, and document width equal to viewport width.

For the trigger edit: active version 1 -> saved draft version 2; active version stays 1. Three subsequent selections and another preview leave the current draft at version 2.

| Observation after immediate preview | Before | After |
| --- | ---: | ---: |
| Workflow name editors | 2 | 1 |
| Activation previews | 0 | 1 |
| Saving indicators | 1 | 0 |
| Working buttons | 1 | 0 |
| Test budget total | 200 | 200 |

## Clause status and limits

AUTO-003: partial -> partial.
AUTO-004: partial -> partial.
Global source-ledger counts remain 42 done, 130 partial and 32 missing before and after; these existing judgments are unchanged, not new claims by this round.
CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md are unchanged. No DONE claim or status/gap/evidence edit is made.

The new assertions prove AUTO-003's active-edit/draft/preview portion of acceptance point 2. That point also requires a delayed old-version dispatch reading version replaced, which this round does not newly qualify; a full numbered-point claim is therefore withheld. The existing material approval journey passes, but this editor-only round does not independently establish every condition of AUTO-004's acceptance points.

CLAIM AUTO-003 PARTIAL points=none tests=tests/rer/workflow-journey.mjs#workflowBrowserJourney
CLAIM AUTO-004 PARTIAL points=none tests=tests/rer/workflow-journey.mjs#workflowBrowserJourney
GAP AUTO-003: Complete delayed-version replacement, history/report/API and migration qualification remains outside this editor repair.
GAP AUTO-004: Broader guarded approvals, expiry and forbidden-action qualification remains unchanged.

## Plan and custody

PLAN.md contains the full working plan. The implementation, integrated focused journey, pinned typecheck, lock check and two viewport proof are complete. Product source and its generated source lock are the only branch changes; all reports and screenshots remain outside the product branch.

The evidence ref is separate report transport, never product readiness or landing authority. The lane receives the exact product SHA and exact CI run through the terminal POST line. The fleet retains responsibility for the publication scan, acceptance judgments and landing. The clone is retained until CI and evidence publication complete, and then removed as instructed.


## Terminal CI handoff

Verify run 43363300128 remains in progress on the exact product head f5005490f94c312127e42f957311a264241875fa after eight scheduled calls over 35 minutes. No completed conclusion or failing job has been observed. Two calls remain in the ten-call budget. This run takes the cloud brief's budget-short PUSHED handoff path; it makes no READY, acceptance or landing claim. See ci-handoff.json for the last observed timestamp and CI response.

There is no unresolved local product blocker. Exact-SHA Verify completion and the fleet's independent publication/landing gates remain pending. The watcher was stopped by its recorded PID before evidence publication; the fleet can continue watching the same run. No rerun was requested because the observed run is still active.
