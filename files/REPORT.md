# sd-orbit-c-f69 results

INTEGRATE-009 remains PARTIAL. The requested base, `577549de0ddac57a921f664e290bf6176682fb28`, already contains the complete selected atomic rollback proof and its contract evidence. This run qualifies that existing work and preserves it on `cloud/sd-orbit-c-f69`; it does not add a duplicate test or a no-op product commit. No additional product defect has been demonstrated.

Counts remain 35 DONE, 137 PARTIAL, 32 MISSING, 204 total. All 204 parent Status rows remain. The test budget remains 198 registrations plus two qualification flows. No acceptance sentence, existing assertion, workflow, migration, Base pin, homepage or screen changed in this run.

## Selected point and proof map

The full clause has four acceptance points. This assignment selects only atomic action consumption in acceptance 3. The existing signed-action journey supplies these outcomes:

| Item | Public door and assertion |
| --- | --- |
| Issued unused action | `tests/support/slack-actions-proof.ts:16` selects the actual `orbit_task` button from an issued bot notice; line 17 checks the token is unconsumed and unattributed. |
| Real persistence failure | `tests/support/slack-actions-proof.ts:31` creates a real D1 trigger that aborts insertion into `sales_tasks`; line 33 submits the issued action through signed `POST /api/v1/slack/actions`, receives the immediate generic HTTP acknowledgment and checks the final failure outcome. |
| Complete rollback | Lines 34 through 36 compare the complete token, prior notice and all action, task, series, task timeline, timeline, record-link and runtime-control rows against their pre-failure contents. The previously acknowledged notice is populated before the fault. |
| Same-action retry | Lines 37 through 42 remove the trigger, resubmit the same action ID, require one consumption attributed to the mapped operator, one complete task effect set and an unchanged notice. |
| Replay and attribution | Lines 43 through 45 change the Slack action timestamp, require refusal without another consumption or effect, and verify the task creator and owner are the mapped operator with Slack timeline provenance. |
| Background completion | `tests/support/slack-notices-proof.ts:15` through line 18 signs the real HTTP request, captures its `waitUntil` promises and awaits them before any outcome assertion. |

These helpers run in the existing single `tests/core/source-onboarding.test.ts` registration beginning “NOTIFY-003 opt-in personal mention DMs recheck identity and access, withdraw on deletion and hold uncertainty”. `scripts/verification-plan.mjs` loads that file in `core-3` during push Verify. No test registration was added or removed.

Inspection of `src/core/features/slack/actions.ts` confirms the token consumption, action insertion, task series, task, timeline and audit writes share one D1 batch. `migrations/core/0051_slack_notices.sql` already supplies the issued-token and action tables. There is no demonstrated runtime or migration defect to correct.

## Local qualification

All three source-onboarding registrations passed, with zero failures or skips, in 480699 ms; the selected Slack journey took 414573 ms. The command exited 0 after all child processes closed. The actual final results and commands are recorded in `receipts.json` and `source-onboarding.log`. Typecheck, first-party checks, contract generation and source-lock integrity completed successfully. Contract write and check both passed locally; generated views were then restored whole from main. Lock regeneration produced no tracked diff and its check returned `ok: true`.

The exact source command from the failed Verify was also run locally without a repair: `node scripts/verification-shard.mjs source` exits 1 at `ACCEPTANCE.md: generated content differs; run contract-docs write.` This is the explicit generated-view exception. No generated view is included in the candidate delta.

MECHANICAL lock=`node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock` and `check` exit=0; views=`node src/base/contract-docs.mjs write` and `check` exit=0 before restoring both views; ledger=none exit=0, because no migration changed.

No screen was touched, so there is no new browser proof or tooltip change. There was no live Slack request, new model call, provider qualification, scale qualification, CI dispatch or CI repair.

## Exact provenance and CI

Product head: `577549de0ddac57a921f664e290bf6176682fb28`.
Branch: `cloud/sd-orbit-c-f69`.
Fresh main: `c01084f133af9aa484a6c1f5151a4e9cfbc7230f`.
The required fetch and rebase found the candidate already up to date; no history was rewritten.

Existing exact-head Verify: run 42142055426, push event on `cloud/sd-orbit-c-f64`, completed with failure. Job 127644628087 stopped at the contract-docs freshness check quoted above. Product shards were skipped; missing authoritative-source artifacts and the aggregate failure followed that early stop. The run is not described as product-test green. The adaptation explicitly accepts this generated-view-only failure for custody handoff, and forbids committing the views or rerunning that SHA merely to obtain another run.

Main has successful exact-head Verify runs 42116055029 and 42111723539, and successful Run site 42116055015. Run demo 42116055004 was skipped. Current run details are in the selected CI receipts. Publication scanning and guarded landing remain with the fleet Mac; no cloud publication-scan result or main equality is claimed.

There is no PR: this repository has a branch push entry point for Verify.

## Retained limits and DONE riders

No DONE claim is made. Mail-editing and mail-approval refusals, acknowledgment leaving an application-proposed handoff unaccepted, and mapping granting no native role, content, delegation or outreach authority remain outside this selected point. The RECORD-024 proposal-acknowledgment entry, TEAM-005 cleanup and qualification prerequisites, live Slack qualification and every existing queue hold and release prerequisite remain unchanged. No new policy default or scope ruling is needed for this proof.

| Rider | Assessment for this partial handoff |
| --- | --- |
| 1 | Selected outcome is exercised by the named signed-route journey. Full-clause omitted outcomes remain gaps; no DONE claim. |
| 2 | The populated fault, supported retry and replay refusal compare actual retained effects, with no computed expected result substituted for them. |
| 3 | The journey is in push Verify core-3, but the exact-head run skipped it after generated freshness failed. Local execution is separate proof. |
| 4 | Relevant code and test bytes are unchanged from the exact head tested locally. |
| 5 | Clause meta cites BASE-ROLE-001, BASE-SECRET-001 and BASE-DATA-004; no inheritance claim changed. |
| 6 | Existing partial Gap retained; generated write and check pass locally before views are restored. Existing judgment provenance was not rewritten. |
| 7 | All acceptance text and all 204 parent Status rows retained. |
| 8 | Existing mapped, foreign, removed and lost-access refusal assertions remain; broader mapping-authority duties stay held. |
| 9 | No live provider or legal boundary is claimed proved. |
| 10 | No policy choice or new default was adopted. |
| 11 | Publication scan, guarded landing and exact landed-site proof belong to the fleet lander; pending. |

Pre-READY self-check: selected dangerous path is exercised both ways; no assertion was weakened; existing revocation, restore and erasure assertions remain in the retained journey; no screen change; source lock fresh. Complete publication scanning and final main site qualification are unestablished in cloud and remain lander gates.

Plan result: only the INTEGRATE-009 selected deficit is qualified; its implementation was already present at the requested base. No additional campaign row, clause status or hold is changed. Full executed plan is `PLAN.md`. Product and evidence custody are separate; the evidence publication receipt identifies the actual transferred packet.

## Product custody after push

The guarded product push succeeded on its first attempt. The remote branch advertises `577549de0ddac57a921f664e290bf6176682fb28`. New exact-head branch Verify: 42146783827 (push, in_progress, conclusion pending). No rerun or dispatch was issued. Five GitHub CLI calls were used in this run. The prior completed run on this same SHA has only the documented generated-view freshness exception. This handoff does not represent the new branch run as green.
