# sd-orbit-c-f180 — native task editing preflight

CLAIM MOBILE-001 PARTIAL points=none tests=none

GAP MOBILE-001: The selected native offline task editing limb is unimplemented and unproved. The required actual iOS simulator journey cannot execute in this Linux VM. Native Android runners are also absent. No existing hold or omitted journey is released.

REMOTE-NEEDS-LOCAL: A macOS host with Xcode and an iOS simulator is required by the selected proof. The same round also needs a local Android SDK and emulator. This is a runner dependency, not a request for distribution accounts or a paid build service.

## Product custody and result

Repository: https://github.com/just-every/run-orbit

Inspected full-history main and local branch `cloud/sd-orbit-c-f180` at `5f92fa76579961950d49c7411f54d5446516a708`. No new product commit, product push or PR was made. There is no landing candidate, no branch Verify run and no READY claim. Evidence publication is separate from product custody.

Counts before and after: 42 DONE, 130 PARTIAL, 32 MISSING, 204 total. MOBILE-001 remains PARTIAL. Acceptance points closed: none. All contract text, Status, Gap, Evidence and generated views are unchanged. There are zero added or removed test registrations and zero changed assertions. The existing inventory enforces at most 200 cases including two qualification programs; this run did not execute a fresh inventory or claim its current registered count.

The required fleet global identity, launcher refresh, decrypted-bundle Git helper, clone-local identity, commit cleanup hook and toolchain script were installed. The clone is not shallow. Only the declared product repository was cloned. No other repository was read through an API or modified. GitHub API calls: zero. No provider operation or application write was attempted. No paid service was used.

The product checkout is unchanged and has no unpublished product work. No product rescue bundle is needed. The report packet remains outside the checkout; the scratch clone is removed only after evidence transfer and verification.

## Executed preflight

`native-preflight.json` contains actual command results and hashes of the untouched contract, source lock, authority modules and existing proof files. It contains no secret values or environment dump.

| Command | Result |
| --- | --- |
| `uname -s` | Linux, exit 0 |
| `uname -m` | x86_64, exit 0 |
| `xcodebuild -version` | executable missing, status 127 |
| `xcrun simctl list devices --json` | executable missing, status 127 |
| `adb devices -l` | executable missing, status 127 |
| `emulator -list-avds` | executable missing, status 127 |
| `node src/base/contract-docs.mjs check` | exit 0; Contract documents are current. |

The standard Xcode application path and the KVM device are absent. No iOS or Android app project exists in this checkout: `mobile` is absent and the tracked file inventory contains no Swift, Kotlin, Gradle or Xcode project source. A web viewport proof cannot establish actual simulator persistence, native protected storage or process death. Xcode and Apple's simulator require macOS; installing a Linux package does not supply that dependency. Android tooling is provisionable separately, but it cannot replace the required iOS half.

App setup, emitted Worker build, touched runtime tests, typecheck, first-party checks and browser screenshots were NOT RUN because preflight established the mandatory runner dependency before product implementation. No check is represented as having passed without execution. The source lock is unchanged; its regeneration and integrity check were not run because no source or contract edit or product candidate exists. No migration was added, so a migration-ledger check is not applicable.

## Contract and existing proof map

Read the full MOBILE-001 clause at `CONTRACT.md:1732` and its Status row at `CONTRACT.md:2580`. Acceptance 1 combines the same realistic USD account across desktop, phone web, actual iOS and Android, task, call, note, stage and exact-message journeys, network loss, conflict resolution, push and device revocation. This run awards no part of that complete acceptance point.

The present row cites responsive web proof and explicitly lists native apps, offline conflict handling, push reminders and phone composing as missing. The planner selects only native offline editing of an existing task. It does not release push delivery or distribution, offline record notes, contact capture or the remaining sales and accessibility journeys.

Existing implementation and tests inspected, not executed:

- `src/core/features/tasks/routes.ts`: full-operator protected task reads; strict complete input for PUT, original linked record and explicit revision and status.
- `src/core/features/tasks/mutations.ts`: current revision comparison and atomic authority and revision guards, with task history and no task-driven external-message submission.
- `src/core/features/tasks/authority.ts`: active native session, full-operator and restore fences checked before task mutation.
- `src/core/features/identity/auth.ts`: existing native operator sign-in and sign-out composition. It grants no native mobile bypass.
- `tests/core/today-brief.test.ts:31`, the existing seller-day registration, calls `exerciseSalesTasks` at line 94. `tests/support/sales-tasks.ts` covers server task reads, assignment, stale revision refusal, repeated occurrence behavior, route-graph restart and erasure. That server restart is not a native process restart or protected local pending-store proof.
- `tests/delegation-browser/viewport.test.ts:14`, the existing responsive opportunity registration, calls its browser helper at line 24. It remains web proof; no mobile simulator is launched.
- `.github/workflows/verify.yml` has a push entry point and uses Ubuntu runners. It was not edited. No CI run was dispatched for this unchanged product head.

## Selected outcome rubric

| Item | Required proof | This run |
| --- | --- | --- |
| R1 | Existing native operator sign-in on both actual apps and same USD account; no new authority | NOT RUN; no apps or native simulator runner |
| R2 | Edit title, notes, due time and priority while preserving original server revision and every remaining task field | NOT RUN; no client implementation |
| R3 | Lose network and restart the native process; protected pending content survives and remains explicitly unsaved | NOT RUN; native persistence qualification unavailable |
| R4 | Concurrent desktop edit produces visible conflict; fresh explicit resolution uses the current task | NOT RUN; no client implementation |
| R5 | Lost write response becomes uncertain; restart never blindly resends or duplicates task history | NOT RUN; no client implementation |
| R6 | Sign-out, installation change, principal change, session change and detected revocation clear private state before another write | NOT RUN; no protected native store exists |
| R7 | Deleted or erased target refuses writes; exact server and history readback; zero mail or provider effect | NOT RUN; existing server proof is not native qualification |
| R8 | Changed states inspected at 1440 and 390; existing registrations extended without exceeding cap | NOT RUN; no screens changed |
| A1 | Complete MOBILE-001 acceptance 1 | UNPROVED; native limb plus all stated held remainder remain |

PROBE MOBILE-001: none, the required actual iOS simulator is unavailable on this Linux host and no native app or product change was made.

## Implementation handoff plan

This is the complete plan for the selected limb, not a claim of implementation. No campaign row or target order is rewritten.

1. Provision a macOS host with Xcode, a local iOS simulator and a local Android SDK and emulator. Clone fresh main and repeat identity, hooks and pinned toolchain setup. Re-read the current clause and preserve the latest Status judgments. Establish one realistic USD account against the emitted Orbit Worker. Use local simulator runners only.
2. Add focused session, task screen, protected pending store and sync modules under the requested new `mobile/ios/` and `mobile/android/` locations. Reuse the existing native operator sign-in and session doors. Keep all four named server authority and mutation modules unchanged. Store private session material and pending content with platform protection; scope it to installation, principal and current session. Fail closed on identity uncertainty.
3. Read an existing task through its authenticated GET. Persist the original server revision and the complete original content alongside the four edited values. Only title, notes, due time and priority are editable in this limb. Form a complete existing PUT input from the original task, preserving linked record, owner, status, type, recurrence, timezone and reminder settings. Do not widen server authority.
4. Make explicit saved, unsaved, conflict and uncertain states survive native process restart. Persist pending changes before acknowledging them locally. A competing server revision requires a fresh read and explicit review of current and proposed content. A response lost after submission remains uncertain until readback; never automatically resubmit it. A pending edit is not an external-message outbox.
5. Clear cached task content, pending work and authority on sign-out, installation or principal or session change and detected revocation, before any further write. Refuse a deleted or erased task and ensure discarded work cannot be replayed after sign-in. Reuse existing server revision and authority fences.
6. Extend or retitle the existing two proof registrations with focused native journey helpers. Preserve every existing assertion and the total cap. Exercise both actual apps against the same emitted Worker: offline edit and process restart; desktop conflict and fresh explicit resolution; lost response with no duplicate effect; sign-out, revocation and deletion refusal and cache cleanup; exact task and history readback with no mail or provider effect. Capture all affected states once at desktop 1440 and phone 390.
7. Run touched tests, typecheck and first-party checks. Generate contract views for local validation if needed, then restore them from main. Regenerate the source lock last and check it. Keep all Status, Gap and Evidence cells unchanged. Commit with fleet identity and active hooks, inspect every candidate commit and trailer, and preserve substantial work on the named product branch. Merge fresh main after a published save. The final candidate follows exact-SHA Verify and publication custody rules; only the fleet lander can land main.

## DONE riders and pre-READY review

No DONE claim is made. The rows are recorded so the handoff cannot mistake the preflight for acceptance proof.

| Rider | Result |
| --- | --- |
| 1 | NOT MET: no selected native outcome journey ran |
| 2 | NOT MET: native allowed and unsafe cases were not executed |
| 3 | NOT MET: no exact-candidate Verify loaded native proof |
| 4 | NOT APPLICABLE: no prior run is claimed as new proof |
| 5 | INSPECTED: clause retains BASE-ACCESSIBILITY-001 and BASE-ACCESS-002 citations; no inherited duty is awarded |
| 6 | CHECK PASS: existing contract document check exit 0; judgment text and provenance left unchanged |
| 7 | INSPECTED: no acceptance sentence, ruling or coverage obligation changed |
| 8 | NOT MET for new native work: existing authority code inspected only |
| 9 | HONEST BOUNDARY: no native device, simulator, distribution or provider proof claimed |
| 10 | NOT APPLICABLE: no new policy default or authority decision shipped |
| 11 | PENDING: no product candidate, landing, exact-SHA scan or Run site receipt |

Pre-READY checks: no new behavior proven; zero assertion changes; no product authority, erasure or replay path modified; no screen touched; contract documents pass. Exact-candidate Verify, source integrity execution, publication scan and Run site are not established by this report. No READY or DONE is issued.

All named holds remain: Apple and Google push accounts and distribution; remaining native and web flows; physical-device and assistive-technology qualification; CALL-001 calling account and authority; OUT-013 consent; OUT-017 and OUT-023 consent and relay proof; OUT-019 relay recipient support; NOTIFY-003 continuation; TEAM-005 cleanup prerequisite. TASK-001 gains no foundation or completion credit. Plan rows changed: none.

## Terminal disposition

BLOCKED MOBILE-001: mandatory actual iOS simulator proof needs a macOS host with Xcode, unavailable in this Linux cloud VM. Android SDK and emulator must also be provisioned for the joint proof. No product work was discarded. Keep this packet for the local follow-up.
