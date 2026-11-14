# Orbit: one form enquiry, one notification — carry

Repository: just-every/run-orbit
Tag: main-orbit-form-notify-once-1-c1
Branch: cloud/main-orbit-form-notify-once-1-c1
Candidate: ef7efc1eeee05bd87323e3bcb9d06cb349e00a9b
Main base: 7ad63db63c46c6a2a59157a5c128bd35f6c20173
Prior carry: efded904 plus 96f0e60a53ac1a350270bae42cef6740098ec8cc
Product push: successful, first attempt, guarded branch-only push.
PR: none; fleet branch landing rules apply.
Verify: 43605479573 — in_progress/None, exact head ef7efc1eeee05bd87323e3bcb9d06cb349e00a9b
Verify URL: https://github.com/just-every/run-orbit/actions/runs/43605479573
GitHub API calls used by the single CI watcher: 6; at least 300 seconds between calls.

## Plan and delivery

1. Configured fleet identity, refreshed the fleet launcher, installed the decrypted-bundle Git helper, push guard and clone-local co-author cleanup hook. Cloned only the declared write repository and created the named branch from current main.
2. Inspected both prior commits and current main. Carried their product and test changes cleanly as one commit, keeping main's newer dependency updates, workflow proofs and contract judgments. Migration 0092 was free, so no renumbering was needed. All nine carried files other than sources.lock.json match the prior candidate byte for byte; the source lock was regenerated from current main.
3. Reproduced the duplicate through the existing mapped native form journey before applying product changes. An accepted submission increased the selected operator's unread count by 2 instead of 1. After carrying the fix, that assertion and the complete four-case native form test file pass.
4. Built the app, checked types, deployment metadata and contract documents, ran the changed released-schema upgrade helper, and captured the affected notification screen at 1440 and 390 using the existing browser journey against the emitted Worker. Fetched the immutable v0.3.0 tag required by the retained upgrade proof; no other repository was cloned.
5. Fetched current main and replayed onto it before finalizing. There was no main drift or source conflict. Regenerated the source lock last, checked it, and committed only the ten carried product/test/lock/deployment files. Kept CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md unchanged.
6. Inspected every candidate commit's author, committer, message and trailers, then pushed the named cloud branch. The single candidate commit uses Run Edit Run fleet <fleet@runeditrun.com> for author and committer, no co-author trailers and no CI skip marker. A single REST watcher checks the exact-SHA Verify within the ten-call budget.
7. Saved this report, plan, actual check/push/carry/CI receipts, relevant logs and the two notification screenshots outside the product repository. Publish these selected public-safe files only on the task's evidence ref. Evidence custody does not imply acceptance, landing or waiver of the fleet's independent gate.

## Result

The form intake marks its atomic D1 batch with its submission ID. Migration 0092 suppresses the extra opportunity.now notification inside that batch. The one form.submitted notification retains the contact destination and exposes an Open deal link when there is a deal. Its title identifies the contact. Other notification types and ordinary NOW events keep their existing behavior.

The existing journey proves round-robin recipient isolation, restart persistence, an existing owner, replay stability, fixed-owner contact-only intake, mark-read behavior, unassigned intake and a subsequent ordinary NOW event. The migration's archive compatibility layer admits the preceding schema with its exact original trigger inventory. The released upgrade proof checks retained values and admits the actual preceding manifest through the authenticated restore door, then aborts without loading into its populated source.

## Checks and counts

- Before: 2 notifications and unread +2 for one accepted routed submission. After: 1 notification and unread +1; replay leaves the inbox unchanged.
- Test budget: 198 registrations + 2 qualification flows = 200 before and after. No test registration added, removed, skipped or weakened.
- Native form test file: 4 passed, 0 failed, 0 skipped; 479474.580436 ms. This includes the mapped public-door journey, atomic refusal/replay behavior and retained abuse checks.
- Changed released archive upgrade helper: pass, including actual preceding-schema restore admission.
- Build, typecheck, deployment specification check, contract documents check and source lock check: all pass.
- Browser: existing formMappingBrowserJourney passes on the committed candidate. New notification assertions run at 1440; changed screens are captured once at 1440 and 390. Both accessibility reports have zero violations, and both layouts have no horizontal overflow. The browser and emitted Worker were closed; the closure receipt records zero owned browsers and workers.
- Contract counts before and after: 42 done, 130 partial, 32 missing (204 total). No Status, Gap or Evidence cell changed. FORM-004 remains partial; only point 1 is claimed.
- Product diff: one commit, 10 files, 85 insertions, 16 deletions.
- Exact-SHA Verify: in_progress/None, run 43605479573. See ci-receipt.json for the actual responses and timestamps.

CLAIM FORM-004 PARTIAL points=1 tests=newtests/t096/forms-native.test.ts#FORM-001 mapped cross-origin capture with picklist and declared hidden fields, reviewed proposals and durable owner rotation retain fixed publication, DNC and consent
GAP FORM-004: This carry claims point 1 only. Team selection, team queues, team notifications, email/push and broader clause completion remain outside this carry and retain main's current judgments.

## Execution notes and boundaries

The first diagnostic launch used node --input-type=module with a TypeScript eval. Miniflare inherited that flag in its synchronous fetch worker and stalled before creating test records. A pinned-Node retry with the same eval flag also stalled. Replacing the eval with a standalone .mts driver resolved the issue without changing product code or assertions. Removing proxy variables was investigated but was not the cause; final passing checks used the standard cloud environment. The initial browser driver also referenced the application dependency factory instead of the existing test dependency adapter; correcting that temporary driver import resolved its startup failure. Neither issue changed the candidate or weakened tests.

No full local Verify or unrelated full suite ran. Branch Verify is the full wall. No deploy, main push, default-branch update, published-history rewrite or cross-repository write occurred. The cloud cannot run the fleet publication scan; that scan and the independent migration gate remain required before landing. The evidence packet excludes credentials, environment dumps, local dev settings, auth sessions, browser traces, private Worker diagnostic files and held-out gate material.

Current blocker assessment: no local product blocker; exact-SHA Verify is still pending.
