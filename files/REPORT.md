# Orbit v0.4.9 metadata preparation

Started: 2026-11-13T13:37:26Z
Repository: just-every/run-orbit
Branch: cloud/sd-orbit-release-0-4-9

## Plan

1. Configure fleet identity, launcher credentials and commit hooks. Clone the declared repository shallowly into isolated scratch. Read launcher and seed instructions plus the supplied builder and release rules.
2. Read current main, exact-SHA Verify, public latest Release and existing release branches/tags. Refuse duplicate v0.4.9 ownership or red main. Compare actual changes since v0.4.8, including pending migrations and preserved limitations.
3. Change only existing release metadata and version references: package.json, package-lock.json, CHANGELOG.md and RELEASE.json as applicable. Keep rer pinned to its actual package.json version. Leave product code, tests, contracts, generated views and homepage intact.
4. Install pinned dependencies. Run only affected metadata checks and typecheck. Fetch and rebase onto fresh main before first publication; preserve newer assertions. Regenerate sources.lock.json last and check it. Inspect the exact diff and all candidate commit identities/trailers.
5. Commit with explicit fleet author and committer, push only the named product branch through the cloud guard, and observe exact-SHA Verify through REST within the ten-call budget and five-minute polling limit. Do not create tags, publish a Release, deploy, self-submit, or bypass the Mac publication scan.
6. Save actual non-secret results and receipts in this packet, publish explicitly selected files to the separate evidence ref, then remove the pushed scratch clone and dependencies. Return provenance and lane POST lines. READY requires the exact-SHA Verify result under the cloud contract; pending CI is PUSHED.

## Initial observations

The initial clone observed main 088a5263487a37ae465e7e42d1bb1b64167686b0. REST then showed main had advanced to f04ffb3c5d01eef2c8163abe98b4c32d9f1e6ae7: Verify 43435028490 in progress, Run site 43435028364 success. Prior main Verify 43420607534 and Run site 43420607200 both succeeded on 088a5263487a37ae465e7e42d1bb1b64167686b0.

Latest non-draft Release: v0.4.8, https://github.com/just-every/run-orbit/releases/tag/v0.4.8. Initial remote refs showed no v0.4.9 tag or cloud release branch. Existing older release branches are historical and remain untouched.

Source pin read from package.json: @runeditrun/rer 0.2.107. Package manager: pnpm 10.12.4. Node engine: 22.20.0; the provided cloud shim currently selects VM Node v24.19.0 because it exceeds the minimum.

Clause status changes: none (metadata-only lease). No feature acceptance claims or new product tests.

## Review findings

Fresh main f04ffb3c5d01eef2c8163abe98b4c32d9f1e6ae7 contains 111 changed paths since the immutable v0.4.8 tag. The existing main RELEASE.json had already extended the old release instructions for saved views and mailbox history; this candidate will carry that information forward under v0.4.9 and include the newly landed Pipedrive migration.

The actual pending migration delta from v0.4.8 is 0088_saved_record_views.sql, 0089_mailbox_send.sql and 0090_pipedrive_import.sql. Existing 0085–0087 migrations belong to the preceding release and must not be replayed. No package-lock.json exists; pnpm-lock.yaml does not encode the root package version. seed.json is the other existing active version reference.

Release-note sources: saved-record-views.tsx and saved-views.ts; mailbox transport, binding, archive and capture consent code; Pipedrive source/checkpoint/routes/UI and restore fencing; stale-review, record recovery, task timeline and workflow editor diffs. Complete commit and path inventories are retained separately. No feature gates, live providers, browser journeys or installer proofs are claimed by this metadata task.

Baseline typecheck passed (tsc --noEmit) with the provided cloud shim selecting Node 24.19.0; pnpm warned that the declared engine is 22.20.0. No source or test change follows this check. Dependency install completed with the frozen pnpm lock.

## Prepared metadata and local checks

Candidate changes: package.json and seed.json version 0.4.8 → 0.4.9; RELEASE.json previousVersion 0.4.8, UTC date, matching public notes, migration delta and upgrade instructions; CHANGELOG.md new 0.4.9 section with historical sections preserved; sources.lock.json regenerated last with the documented edition-authoring lock command and validated with its check command. No package-lock.json exists and no dependency pin changes.

Release schema and seed schema: PASS. One-off cross-document metadata consistency check: PASS (versions, previous release, immutable rer pin, exact matching changelog/notes, real migration delta, allowed paths, unchanged contract/views and pnpm lock). Source lock write/check: PASS. git diff --check: PASS. Typecheck: PASS. No build, full local suite, new tests, product changes or UI/browser work in this version-only round.

Test counts before/after: {"added": 0, "after": {"cases": 198, "qualifications": 2, "total": 200}, "before": {"cases": 198, "qualifications": 2, "total": 200}, "removed": 0}. Contract generated progress before/after unchanged: Core 42 done, 112 partial, 24 missing (178); Agent surface 0 done, 18 partial, 8 missing (26); full target 42 done, 130 partial, 32 missing (204). Clause status changes: none. No CLAIM lines apply to this metadata-only lease.

Source lock tool identity and file digests were checked locally; complete lock output remains scratch outside the packet because it duplicates the repository source inventory. No publication scan was run on this cloud host: the instructed Mac lander owns its full-history scan and final landing gates.

Candidate typecheck after the version edits also passed (orbit@0.4.9; tsc --noEmit). The provided shim retained the same Node 24.19.0 runtime and its engine warning. Both schema checks and the lock check passed with the final metadata; the lock changes exactly four file digests.

## Product custody

At 2026-11-13T13:48:20Z, product branch cloud/sd-orbit-release-0-4-9 was pushed once on the first guard attempt. Full head: ddb340bea61f23275bb92df722ef6845a9fa65d6. Base: f04ffb3c5d01eef2c8163abe98b4c32d9f1e6ae7. One candidate commit, fleet author and committer, no trailers; all side parents were included in the origin/main..HEAD identity/message check after the no-op rebase. The checkout is clean. Five metadata files changed, 28 insertions and 22 deletions.

The fresh-main exact-SHA REST read found completed/success Verify 43426180785 on f04ffb3c5d01eef2c8163abe98b4c32d9f1e6ae7, previously run on the Pipedrive landing branch. Main Run site 43435028364 succeeded on that same SHA. Main-push Verify 43435028490 was still in progress at the last observation, so no completion is claimed for it; the existing rules allow a green branch Verify on the identical main SHA.

No PR was created: this seed’s supplied landing route is fleet branch custody, with the Mac lander owning publication scan and landing after task exit. No tag, signing, GitHub Release, self-submission, dispatch/rerun or deployment was performed. v0.4.9 is metadata prepared for the later immutable release operation, not a RELEASED claim.

## Candidate CI

Exact-SHA Verify 43436778236 was discovered in progress at 2026-11-13T13:48:38Z on ddb340bea61f23275bb92df722ef6845a9fa65d6: https://github.com/just-every/run-orbit/actions/runs/43436778236. This version bump selects the existing full CI path. There is a pre-main push entry point; no workflow dispatch or rerun is needed. One watcher will observe it no more than once per 300 seconds, within the ten-call total GitHub budget.

Known follow-up debts: the Mac lander must run the full-history publication scan and its exact-SHA landing gates; later release producer/signing/publication steps remain separate. No v0.4.9 tag or GitHub Release was created here. Retained product limitations include incomplete graph maintenance and stakeholder inference, partial workflow undo and the stated erasure gaps, unavailable Microsoft sending, supported-subset CRM imports and pending live-provider acceptance. The remote push also reported 43 default-branch dependency advisories (11 high, 25 moderate, 7 low); this metadata lease leaves the actual rer and dependency pins unchanged.

## Commands and evidence

Local commands: pnpm install --frozen-lockfile; pnpm run typecheck; node tools/seed-schema/validate.mjs --schema RELEASE RELEASE.json; node tools/seed-schema/validate.mjs --schema SEED seed.json; the retained one-off metadata-check.py; node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock; node node_modules/@runeditrun/rer/edition-authoring/cli.mjs check; git diff --check; the existing test-inventory reader (counts only). The documented lock write ran after the last metadata change, and its subsequent check passed.

Packet contents include complete actual source-lock write/check outputs, both schema outputs, baseline and candidate typecheck logs, metadata consistency result and checker, unchanged test counts, actual GitHub Release/main/candidate CI readbacks, commit identities/messages, candidate patch and product push receipt. Files are explicitly selected for the separate report-only evidence ref. No credentials, secret values, environment dumps, private gate material or symlinks are selected.

The product scratch checkout and its dependencies are scheduled for removal after the evidence transport succeeds. The independent fleet still owns final publication scan, landing and later release production.

## Terminal result

Recorded 2026-11-13T14:14:07Z. PUSHED branch=cloud/sd-orbit-release-0-4-9 head=ddb340bea61f23275bb92df722ef6845a9fa65d6.

Exact-SHA Verify 43436778236: in_progress, conclusion None; observed 2026-11-13T14:13:46Z. URL: https://github.com/just-every/run-orbit/actions/runs/43436778236. GitHub call budget used: 10/10. No failing run has been observed. The ten-call budget is exhausted while Verify remains in progress. This is pending CI, not BLOCKED and not a READY claim. The fleet must re-read the exact-SHA result before landing.

Version before/after: 0.4.8 → 0.4.9. Actual rer pin before/after: 0.2.107 → 0.2.107. Test counts: 198 registered cases + 2 qualification flows = 200 before and after; no additions, removals or weakened assertions. Clause changes: none; full target remains 42 done, 130 partial, 32 missing (204). All newer main product and contract assertions remain unchanged.

The complete selected packet is published only through refs/heads/evidence/sd-orbit-release-0-4-9. That transfer is report custody and does not establish release publication, acceptance or landing. Product provenance remains the named cloud branch and full SHA above. No PR was created. No tag, signing, release publication or deployment was performed. The only remaining work for this metadata candidate is fleet CI/scan/landing custody and the later authorized immutable-release producer.
