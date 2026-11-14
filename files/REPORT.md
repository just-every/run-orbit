# Orbit readable runs continuation

Tag: main-orbit-readable-runs-1-pc1
Repository: just-every/run-orbit
Product branch: cloud/main-orbit-readable-runs-1-pc1
Starting published head: 97bec7a7809848abf1aafe4fe5e4423e99b13922

## Problem and diagnosis

The saved product change makes expanded workflow runs and Undo show named outcomes, source evidence, owner names and record/task links, while retaining raw data behind Technical details. It also adds Zoom app creation, credential, scope, subscription and public HTTPS endpoint instructions.

Verify 43559527137 failed in shards (batch-13), job 132340770858. The aggregate verify job 132352469991 consequently failed. GitHub's `gh run view 43559527137 --repo just-every/run-orbit --job 132340770858 --log-failed` returned exit 0 with empty output. The same downloaded workflow ZIP was already cached locally by gh; its combined batch-13 log provides the complete failure diagnostic without another network call. See previous-failure-excerpt.log.

The old desktop workflow journey intermittently looked for Undo's reason across the entire settings panel. That matched both the visible summary and identical retained text inside collapsed technical JSON. Playwright refused the ambiguous locator in CI. The old desktop journey passed locally; the ambiguity depends on whether the refreshed technical receipt has loaded when the locator resolves. The saved run-and-Undo journey itself passes.

## Plan

See PLAN.md for the complete continuation plan. Preserve all published commits; fix forward on the named branch. Keep product behaviour, contract judgments and generated acceptance views intact. The forward fix scopes the Undo reason to its visible run summary, retains the visibility assertion, checks the Undone status and verifies that the record’s original title is restored. Extend the existing journey; add no test registrations.

## Validation and browser proof

- The saved run-and-Undo browser journey passes through Settings > Pipeline > Execution history. It checks named owner and task, task/source navigation, absence of raw JSON and internal IDs in the default view, opt-in technical details, and retained task after Undo.
- The revised desktop operator registration passes, including the restored-record assertion. The final helper passes directly as well, retaining the original visible-text requirement inside the summary.
- Typecheck passes.
- Browser proof captures workflow outcome, Undo and the expanded Zoom guide at 1440 and 390. Zoom setup has no horizontal overflow at either width. The guide is copy only; no wording-pin test was added.
- Local browser commands use `/usr/bin/chromium` with `--no-sandbox`; native sessions use the checkout's own dev door and ephemeral browser contexts. No existing browser sessions were copied.

## Counts and clause custody

Before and after: 198 registered tests plus 2 qualification flows = 200, the seed cap.
Before and after contract counts: 204 total clauses; 42 done, 130 partial, 32 missing. Clause Status, Gap and Evidence cells and generated views are unchanged. This continuation makes no DONE claim and proves no additional complete clause acceptance point. The Zoom change is guidance only, without provider execution changes or a live Zoom credential claim.

Relevant clauses: AUTO-001 (visible execution), AUTO-006 (Undo), INTEGRATE-002 (Zoom setup). Existing clause gaps remain. No contract clauses are changed.

## Publication custody

The cloud branch is the sole product destination. The Mac fleet owns the publication scan and final landing; this cloud does not push main or claim landing. Reports, receipts and screenshots are transported only on the separate evidence ref. Exact final SHA, commands and CI result are recorded in receipt.json after validation.

The actual temporary browser proof scripts are retained as workflow-proof.mjs, zoom-proof.mjs and cloud-browser.mjs. They contain no session values. They originally ran under the checkout’s ignored .rer directory (the browser launch adapter was in /tmp); they are evidence only and are not product files.

## Final product candidate

Commit `7e577833179cbd0fb8db8500b61a8bd0a1d2e56b` (Scope workflow Undo proof to its visible outcome) preserves `97bec7a7809848abf1aafe4fe5e4423e99b13922` as its parent. Only tests/rer/workflow-journey.mjs and its generated source-lock entry change in the forward fix. Current main (`a35d331920a4bace2548bbd0efaf9344ffcd32a6`) was fetched and merged as already up to date. The guard published the candidate successfully on its first attempt. No PR was required by the repository instructions.

Exact-SHA Verify: https://github.com/just-every/run-orbit/actions/runs/43567551061 . Its final observation and API call ledger are in ci-receipt.json and ci-api-calls.json. The previous failed run was 43559527137.

## Terminal result and remaining CI work

Product changes are committed and pushed at `7e577833179cbd0fb8db8500b61a8bd0a1d2e56b`. Verify 43567551061 completed with failure on that exact SHA. This is **PUSHED, not READY**.

The changed workflow/browser shard (batch-13) passes: 29 browser cases, 1 archive case, and the desktop operator registration that previously failed. See candidate-touched-ci-pass.log.

The remaining failure is in **shards (batch-18) / Verify routine product shard**, registration `tests/delegation-browser/records-layout.test.ts` — “OUT-013 send consent and bound review, emitted Worker Mailchimp setup and scheduled erasure preserve stops alongside full long record names, sorted saved views and collaborator revocation at 1440 and 390”. In `tests/delegation-browser/typed-fields-journey.mjs:46`, the saved-view searchbox is empty instead of “Synthetic Calendar Contact”. Neither this journey nor record search/saved-view implementation is changed by the saved product change or this continuation. The aggregate verify job fails because that shard fails. See candidate-failure-excerpt.log.

The final diagnostic used `gh run view 43567551061 --repo just-every/run-orbit --log-failed` once (exit 0). Only one diagnostic invocation remained, so it fetched the failed-step archive without a separate job-ID lookup. No blocked blob downloads were retried. The prior archive and this archive were inspected locally after download. Total budget: 3 previous-run diagnostic invocations, 6 exact-SHA discovery/status reads, and 1 candidate failure archive read = 10. No further GitHub API request was made.

The brief requests one rerun of failed jobs for an unrelated failure. That rerun was **not performed**, because the ten-call budget is exhausted. The lane's next action is `gh run rerun 43567551061 --repo just-every/run-orbit --failed`, once, followed by a spaced exact-SHA status check. Do not treat this candidate as READY until Verify is successful (or an independently permitted contract-view-only exception applies). There are no contract-view changes in this round.

No additional record-search changes were made and no test was deleted, skipped or weakened to hide the failure. Clause statuses and counts are unchanged. Product commit custody and report-only evidence transport remain separate.
