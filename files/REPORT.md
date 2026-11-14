# Orbit readable workflow runs and Zoom setup

Task: main-orbit-readable-runs-1
Repository: just-every/run-orbit
Product branch: cloud/main-orbit-readable-runs-1
Product head: 97bec7a7809848abf1aafe4fe5e4423e99b13922
PR: none; the fleet owns landing the named branch.

## Plan

1. Install the fleet launcher, Git credential helper, commit hook and guarded push transport; read the launcher and seed instructions and the supplied builder rules.
2. Install Orbit through its pinned rer lifecycle, claim a synthetic owner, finish first-run setup and reproduce the two reported findings through Settings. Create and activate an activity-triggered task workflow, log a note through the public record API, process its run and inspect the expanded history. Open Connect Zoom.
3. Add a read-only presentation of retained run receipts, using real task/record links, operator names, trigger evidence, attempts and undo outcomes. Retain exact raw receipts in an explicitly opened technical view. Leave workflow dispatch and undo behavior unchanged.
4. Add Zoom app, credentials, scopes, events and public HTTPS instructions using the existing Settings help pattern. Explain the local-copy limitation before the fields; link Zoom's official guides.
5. Extend the retained task/activity browser journey rather than registering a test at the 200-test cap. Assert the completed run and Undo at 1440, follow the task and source links, check named ownership and prove raw values stay out of the default view. Capture all changed screens at 1440 and 390. Run touched checks and typecheck.
6. Fetch main and rebase before the first product publication, regenerate sources.lock.json last, run the exact source check, review all candidate identities/trailers, commit as the fleet and push only the named cloud branch through cloud-push.py.
7. Discover and poll the exact-SHA Verify through REST with one watcher, a 300-second minimum interval and at most ten GitHub calls. Publish the explicitly selected non-secret report/receipts/screenshots separately to evidence/main-orbit-readable-runs-1.

## Reproduction

Fresh rer install/setup/dev on this VM, signed in through the checkout's private dev entry and first-run setup. No provider credentials were entered. Synthetic Orbit Studio and its clinic rollout are disposable local data.

Before: expanded completed run exposed JSON outcome, task ID, run ID, owner ID, event record/chain data and action result_json. Zoom's form had four unexplained values, generic read-permission advice, event names and a loopback endpoint without reachability guidance. The retained before.json receipt and four before screenshots show the findings.

## Changes

- The existing owner-authorized run read endpoint now includes a presentation derived from durable run, event, step, write, task and operator records. It resolves names and links, applies the existing source-availability check before displaying an activity's text and links the actual source timeline entry.
- Expanded history shows readable outcomes, per-action attempt counts and status, trigger text, named run owner and times. Task effects continue to display their real task links after Undo. Undo reports restored/skipped records and makes retained tasks/messages explicit. Structured values, IDs and the original plan remain available only after opening Technical details. There are no new execution actions or changed dispatch semantics.
- Zoom setup uses the existing collapsible setup-help pattern. It maps the first three values to App Credentials and the fourth to the Feature secret token, names granular and legacy read scopes, names the two supported meeting events, explains validation order and gives official Zoom links. A local copy prominently explains deployment or a temporary public HTTPS tunnel. Its example event URL uses a host placeholder rather than claiming 127.0.0.1 is reachable.
- Existing Orbit typography, borders, Settings navigation and ordinary text controls are retained. The small result list styling is responsive. The URL copy field uses the existing block layout to remain readable on a phone.

## Proof and limits

Behavioral assertions run at 1440; browser proof also covers 390. The existing registered RECORD-005 timeline journey invokes tests/e2e/task-activity.mjs, now extended with the completed/undone workflow run flow, actual task/evidence navigation, owner name, exact created-task retention and an explicitly opened raw details view. No Zoom wording test was added.

The scope does not complete the broader workflow, undo or live Zoom clauses. No clause Status, Gap or Evidence was edited; no DONE claim is made. No live Zoom account was connected. The publication scan is the fleet's Mac-side gate and cannot run in this cloud adaptation.

12ui's existing-screen improve command was attempted against the before screenshot. It required an account sign-in and produced no design candidates. Implementation therefore preserves Orbit's existing visual system; Chromium captures were reviewed directly at both required widths.

## Counts and clause status

Before: 198 registered cases + 2 qualification flows = 200.
After: 198 registered cases + 2 qualification flows = 200.
New registrations: 0. Deleted, skipped or weakened assertions: 0.
Clause status changes: none. CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md unchanged.

CLAIM AUTO-001 PARTIAL points=none tests=tests/e2e/operator.spec.mjs#RECORD-005 — the mobile opportunity timeline shows metadata and orders out-of-order notes with ID ties
CLAIM AUTO-006 PARTIAL points=none tests=tests/e2e/operator.spec.mjs#RECORD-005 — the mobile opportunity timeline shows metadata and orders out-of-order notes with ID ties
GAP AUTO-001: This round proves presentation of an activity-triggered task run, not the whole configurable-workflow acceptance journey.
GAP AUTO-006: This round proves readable Undo and retained tasks, not every record reversal or external-effect guarantee.
GAP INTEGRATE-002: Setup guidance is browser-reviewed copy; live-account meeting, participant, completion and cancellation proof remains outside this round.

## Validation and custody

See validation.json, browser-receipt.json, the exact-SHA CI receipt and the product push receipt for actual commands, outcomes and terminal provenance. Product commits contain only implementation, the extended retained journey and the regenerated source lock. Report files and screenshots travel only on the separate evidence ref.

Local results: final retained browser journey passed (1 test, 1.1 minutes), core capture/workflow regression passed (1 test, 174.7 seconds), typecheck passed, boundary check passed (887 core source files), generated contract docs current, regenerated source lock check ok=true. First candidate push succeeded on attempt 1; no retry or published-history rewrite. Main was unchanged at a35d331920a4bace2548bbd0efaf9344ffcd32a6 when fetched before publication.
