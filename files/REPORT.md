# Orbit workflow explanation round

Repository: just-every/run-orbit
Branch: cloud/main-orbit-workflow-explain-1

## Plan

1. Reproduce a backdated meeting, task preview classification and opaque run record identity through the native owner UI and authenticated public APIs.
2. Retain occurrence-time eligibility. Record an inert skipped outcome for qualifying activities logged after activation whose occurrence precedes activation; never plan or dispatch their actions, and do not replay historical activities.
3. Explain the activity rule in the editor and activation preview; group task, reminder, owner and in-app notification effects internally, reserving external effects for webhooks. Resolve current record names and links in execution history.
4. Extend the retained workflow browser journey at 1440, without registering another test. Prove skips survive repeated processing without tasks, current activities run once, and deal links open the correct record. Capture the changed screens at 1440 and 390.
5. Run touched workflow checks and typecheck. Integrate updated main without rewriting a published save, regenerate and check the source lock last, and preserve the fleet commit identity and hooks.
6. Push only the named branch through the fleet guard, inspect exact-SHA Verify through bounded REST calls, and publish this report plus actual receipts separately to evidence/main-orbit-workflow-explain-1. The fleet owns publication scanning and landing.

## Defaults and scope

No changes to contract statuses, gaps or evidence. No DONE claim. Existing installation-owner workflow authority remains. Missing Mac playbook files are covered by the explicit polish rules in the supplied brief. Existing UI components are retained; this round changes labels, explanation and linked history rows rather than introducing a new design surface.

## Results

All three findings were reproduced on main b3e94efdc16e4ae467cd2ed283ee4eb0dc4c0c31. The before receipt shows no backdated run, task creation under External effects and a completed run summary containing the raw deal id.

Implemented on 15315a35915b01c626971852f83a93093d01dd29:

- The activity editor and activation preview explain occurrence time at or after version activation. Execution history records matching backdated activities logged after activation as skipped, with a reason and occurrence/activation timestamps. Their saved plans and steps are empty. Previously recorded activities are not replayed; irrelevant activity types remain excluded.
- Task creation, task reminders, owner changes and in-app notices are internal effects. Webhook destinations and content remain external effects, in both current and historical previews.
- History resolves current contact, company and deal names and links through authenticated record routes. An unavailable record gets an explicit unavailable label. Skipped outcomes offer no undo or resume action.
- Existing native components and responsive styling are retained. Changed screens were inspected at 1440 and 390. The phone proof shows legible reasons and linked record names without layout overflow.

The focused public-door browser journey and the complete retained native desktop registration passed. The workflow core test, including the added inert-skip/replay assertions, passed. Typecheck and source-lock check passed. Before and after: 198 registered cases + 2 qualifications = 200. No registration added, removed or skipped. Three scoped findings reproduced before; all three pass the new assertions after. No contract Status, Gap or Evidence changes; no DONE claim.

The candidate was committed with fleet author and committer identity, no trailers and no skip marker. Immediately before pushing, main was fetched and the unpublished candidate rebase reported up to date. The source lock was regenerated and checked last. All candidate commit identities and complete messages were inspected. The first product push succeeded through the fleet guard. No PR is required by this repository's documented fleet landing path; none was opened.

Verify run 43150561602 is bound to this exact SHA; its final result is recorded separately in ci-receipt.json. Product custody, evidence publication, publication scanning and landing are separate gates. The fleet must perform its publication scan and landing; this cloud makes no landing claim.

## Clause report

CLAIM AUTO-001 PARTIAL points=none tests=tests/core/capture-review.test.ts#CAPTURE-004 CAPTURE-005 captured evidence only proposes changes; a person accepts, edits or declines each, and a declined change never returns for the same evidence; activated workflows use separate guarded write authority; tests/rer/operator-desktop.test.mjs#BASE-PUBLIC-003 T099 native operator routes and expanded data views at 1440px
CLAIM AUTO-003 PARTIAL points=none tests=tests/rer/operator-desktop.test.mjs#BASE-PUBLIC-003 T099 native operator routes and expanded data views at 1440px
DEFAULT AUTO-001: Retain the existing occurrence-time activation boundary and owner-only administration; only explain excluded matching activities without executing them.
GAP AUTO-001: This scoped round does not prove every obligation of the broad stale-rule, authority, notification and webhook acceptance point or remove existing clause gaps.
GAP AUTO-003: This scoped round does not prove complete history, per-action counts, reports/API attribution or migration mappings; existing clause gaps remain.

## Final CI and custody

Verify run 43150561602 completed successfully on 15315a35915b01c626971852f83a93093d01dd29. No rerun, failed job or repair commit was needed. No product blocker remains.
URL: https://github.com/just-every/run-orbit/actions/runs/43150561602. The main lane owns publication scanning and landing.
