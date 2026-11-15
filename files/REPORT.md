# Orbit 0.4.10 release metadata candidate

Author: Run Edit Run fleet. Report time: 2026-11-15T09:51:43Z (date -u).
Task: sd-orbit-release-0-4-10. Repository: just-every/run-orbit.
Branch: cloud/sd-orbit-release-0-4-10.
Final product head: 22ca38c0e0bb5784440df021e8a5eb5b41a81de8.
Base: 3b6296cbd5e6b0c10f93a9c84277c9b88373e906. Previous tag: v0.4.9 at a5f471626aea1bfcb2c79f5dbee2250fdb38fd49.
PR: none; the shipped repository landing rules use fleet custody of the named branch and do not require a builder PR.

## Plan and completed work

1. Set global and repository fleet identity, refresh the authorized launcher, install the decrypted-bundle Git helper, URL cleanup, push guard and co-author cleanup hooks. Clone only the declared repository with --depth 1 --filter=blob:none, create the named cloud branch from main, and install frozen pnpm dependencies. All commit commands use explicit fleet author and committer environment. No application setup, server, provider operation or deployment is needed for this metadata-only round.
2. Check release custody before editing. Fresh main matches the brief's green 3b6296cbd5e6b0c10f93a9c84277c9b88373e906. GitHub latest-Release readback returns non-draft Orbit 0.4.9, published 2026-11-13T17:49:50Z, at https://github.com/just-every/run-orbit/releases/tag/v0.4.9. Remote refs contain neither v0.4.10 nor a peer v0.4.10 release branch; the open PR list has no ordinary release metadata owner. Historical release branches and unrelated feature work are not treated as peer ownership. Deepen only this clone enough to prove v0.4.9 ancestry and read the actual net diff: 85 files, 1,800 insertions, 301 deletions. main-changes.txt includes side ancestry; main-diff-stat.txt and release-source-diff.patch record source facts used for the notes.
3. Update existing version fields in package.json and seed.json from 0.4.9 to 0.4.10. Add the dated CHANGELOG section and matching RELEASE.json notes, previousVersion, migrations and upgrade instructions. Inspect OPERATIONS.md line 30; replace only the obsolete management-origin assisted-offer sentence with current /run/local instructions and the existing Local installation anchor. The final sentence displays /run/local as plain inline code, which works with the docs compiler's relative-link policy. Preserve all other operations text and all prior release notes.
4. Run affected metadata checks and typecheck, validate the actual two new migrations, use the pinned rer native release inspector on the exact candidate, and check the repository's real docs compiler. Regenerate sources.lock.json last using the documented command, then check it. Only five changed file hashes differ in that lock. The candidate diff credential-shaped-value review passes. The full-history publication scan is unavailable here and remains a mandatory fleet lander gate.
5. Fetch and rebase onto fresh main before the first publication; main is unchanged and rebase is a no-op. Audit every candidate commit, including side parents, for allowed identities and trailers; all are fleet-authored and fleet-committed with no trailers. Push the first real commit through cloud-push.py. When its Verify identifies the root-relative docs-link failure, correct the same leased sentence, fetch and merge fresh main (already up to date), regenerate the lock, run the actual docs compiler and push a follow-up commit. Never rewrite the published history. Both guarded pushes succeed.
6. Watch exact-SHA Verify through REST with one watcher and at least 300 seconds between observations per run. Do not dispatch or rerun workflows. Keep complete non-secret reports and receipts outside the product tree and publish explicitly selected files only to evidence/sd-orbit-release-0-4-10. Delete the successful scratch clone and dependencies after terminal custody is verified. No main push, tag, signing, GitHub Release, self-submission or deployment is performed.

## Final implementation

Exact product paths: CHANGELOG.md, OPERATIONS.md, RELEASE.json, package.json, seed.json, sources.lock.json. Net change: six files, 31 insertions, 21 deletions. package-lock.json is absent on main, so none is created. pnpm-lock.yaml and composition.lock.json remain unchanged. The actual @runeditrun/rer devDependency stays exactly 0.2.113. Node 22.20.0 and pnpm 10.12.4 declarations remain intact. The supplied cloud toolchain selected installed Node v24.19.0 with pnpm 10.12.4 for local checks, and pnpm warned about the exact Node engine; no pin was changed. GitHub uses .node-version.

Notes describe already-landed reviewed Zoom meeting preparation and signed completion/attendance, readable workflow run outcomes and retained Undo results, restore email-permission names and reasons, the Do not contact default for a newly captured meeting contact, one form enquiry notice per intended recipient and landed dependency fixes. They retain provider, transcript, graph, erasure and workflow undo limits. Public notes contain no internal clause IDs or fabricated guarantees. The new CHANGELOG section and RELEASE.json publicReleaseNotes agree exactly.

Actual new migrations since v0.4.9: 0091_zoom_meetings.sql and 0092_form_submission_notification.sql. Earlier migration files are unchanged by the release range. Upgrade instructions stop writes, require a private backup, preserve the applied migration ledger, apply only pending migrations in order before serving the new Worker, retain consent and reconnection requirements, and reconcile intermediate-candidate ledgers before routine upgrade. No provider setting is required merely to retain existing features. Optional Zoom requires the owner's app credentials, meeting read scopes and signed webhook setup; no live Zoom qualification is claimed.

## Validation and counts

- PASS: pnpm run typecheck; typecheck.txt. This ran before the final prose-only fix; that fix changes only OPERATIONS.md and its source-lock hash.
- PASS: pnpm run check:manifest; manifest-check.txt.
- PASS: node node_modules/@runeditrun/rer/bin/rer.mjs check --profile first-party; silent output retained in command-contract-check.txt.
- PASS: matching versions and notes, exact migration list, unchanged rer pin and strict product scope; metadata-check.json and RECEIPT.json.
- PASS: node tools/seed-schema/validate.mjs --schema RELEASE RELEASE.json; release-schema-check.txt.
- PASS: native inspectSource and releaseMessage from pinned rer release modules on final head; native-release-metadata-check.json. Read-only; creates no tag, bundle or publication.
- PASS: actual buildSite docs compiler, including repository Markdown links and anchors; docs-link-check.json. No full application build or local suite was run.
- PASS: node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock, then check; complete actual final check output in source-check-output.json.
- PASS: git diff --check, clean committed checkout, all-candidate identity/trailer audit and both guarded pushes.
- PASS: source-only test inventory; test-inventory.json. This collects registrations and does not run tests.

Before/after test inventory: 198 cases plus 2 qualification flows = 200 / 200. Added, removed or weakened tests: 0 / 0 / 0. No UI change, so no browser proof is required. Full local suite is intentionally not run under the metadata-only brief.

Before/after clause counts: Core 42 done / 112 partial / 24 missing (178 total); Agent surface 0 done / 18 partial / 8 missing (26 total); Full target 42 done / 130 partial / 32 missing (204 total). Clause Status, Gap and Evidence changes: none. CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md remain unchanged. This round claims no clause completion.

## CI and custody

Initial product head: 05488c682f04f419f3be4910b805e6c7f45f91de. Verify 43700618240 completed/failure: https://github.com/just-every/run-orbit/actions/runs/43700618240. Source and contract generation checks passed, then the app build's docs plugin rejected the introduced Markdown link to /run/local because docs links must be relative. Read the failed source job 132770792255 once with gh run view --log-failed; archive read exit 0. ci-failure-diagnosis.txt contains the exact failing command and assertion; ci-source-failed.txt retains actual log output with environment sections omitted. Downstream verify/artifact failures follow from that source job. The final correction displays /run/local as plain code and keeps the valid local anchor; it passes the actual docs compiler.

Final product head: 22ca38c0e0bb5784440df021e8a5eb5b41a81de8. Verify 43701118360: https://github.com/just-every/run-orbit/actions/runs/43701118360. Initial exact-SHA observation at 2026-11-15T09:50:07Z: in_progress, conclusion null. Terminal observation is appended below and recorded in ci-final-candidate.json before return. Product push receipts: product-push.txt and product-push-final.txt. Two candidate commits pass the full candidate identity/trailer audit in identity-audit.txt. No force push or rebase of published history. GitHub calls used at this stage: 7 of 10 (Release readback, peer PR list, two run discoveries, first run observation, jobs list, one failed-job archive).

Prior main Verify 43684875674 and Run site 43643388500 are supplied by the brief as successful baseline evidence; they are not substituted for candidate CI. The fleet owns the full-history publication scan, guarded landing, exact landed verification, later authorized immutable release, signing and Release readback. This task prepares release metadata only and makes no RELEASED claim.

Known follow-ups remain outside this lease: live Zoom developer-account qualification and the full cross-product buyer walk, transcript/recording support, graph maintenance, broader agent coverage, workflow undo and earlier erasure limitations. GitHub's successful push response also reports 18 default-branch dependency advisories (2 high, 14 moderate, 2 low); no individual advisory was fetched or qualified here. Pending feature gates and rer 0.2.118 qualification do not block this ordinary metadata preparation. No new account, key, fleet input or ruling is needed.

Local blockers: none after the docs correction. Final CI and evidence transfer outcomes follow.

## Terminal observation

Author: Run Edit Run fleet. Time: 2026-11-15T10:06:03Z (date -u).

Exact-SHA Verify 43701118360 remains in_progress with conclusion null as of 2026-11-15T10:05:19Z. It matches final head 22ca38c0e0bb5784440df021e8a5eb5b41a81de8. Ten of ten permitted GitHub calls have been used. The prior failed source assertion was corrected and the actual docs compiler passes, but final CI success is not claimed. The cloud instruction explicitly permits PUSHED when the call budget runs short with Verify still running; pending CI is not a BLOCKED condition. No READY or RELEASED claim is made.

Product branch custody is confirmed by guarded push and remote readback. The complete 28-file public packet is explicitly selected for evidence/sd-orbit-release-0-4-10, using cloud_evidence.py from the product clone. The exact resulting EVIDENCE ref/head is returned in the terminal message; the report-only tree neither changes product HEAD/index nor grants readiness or landing. Scratch clone and dependencies are removed after successful evidence transfer and remote readback. The report packet is retained at /home/agent/rer-consolidation/work/sd-orbit-release-0-4-10/packet/.

PUSHED branch=cloud/sd-orbit-release-0-4-10 head=22ca38c0e0bb5784440df021e8a5eb5b41a81de8

The first evidence publication succeeded at e6e1f57e39a6a92326ce3e81a8fd384ca1b3128c. evidence-publication-receipt.txt records its actual transport response and product/evidence remote readback. The final evidence publication also carries that receipt and is identified by the terminal EVIDENCE line.
