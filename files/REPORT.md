# Orbit 0.4.12 release metadata

Prepared by sd on 2026-11-19 UTC for just-every/run-orbit.

No contract clause claimed; this is release metadata.

## Plan and results

1. Read fresh main and the v0.4.11 tag, check the release slot, and review the intervening changes. Main was 2288bfae201961fdb966552dc86655a76b2e0247 before push, 17 commits after v0.4.11 at a4fcbfcd72fa4253826f43d0b0de02275094f86d. The v0.4.12 tag was absent at push time and the GitHub Release lookup returned 404.
2. Describe the customer-facing changes in the changelog and both release metadata files. First-run setup, explicit pipeline creation, CSV identity mapping, saved-form compilation, and capture connection setup are easier to complete. Withdrawn forms reappear after local archive restore and require fresh authorization before republication. Records search waits until it can retain input, overlapping autosaves preserve edits to different fields, and explicit invitations can be accepted after local sign-in. Before a first signed delivery, Connected Products explains the missing public HTTPS address or enabled signing source that prevents booking setup. The dependency updates are Hono 4.13.16 and a picomatch extglob patch.
3. Preserve buyer upgrade instructions and known limits. Update in place from 0.4.11 after stopping writes and taking a private backup outside the checkout. Preserve the migration ledger and owner customizations. The published v0.4.11 release's screenshot remains byte-identical in main, so RELEASE.md links to it. The limitations on account proposals, maintenance, transcripts, enrichment, stakeholder inference, workflow undo, erasure, agent coverage, CRM imports and provider qualification carry forward.
4. Verify the migration tree and declared hashes. No paths were added under migrations/core. All 84 files match the v0.4.11 file modes, paths and Git blob IDs. RELEASE.json has an empty migration list. The receipt records every migration and the exact-head declared file hash check. Only setup.sha256 was declared in rer-project.json and the committed rer-setup.json matches it.
5. Bump the package, seed and release metadata versions to 0.4.12. Keep the rer 0.2.113 pin and existing frozen dependency lock. The package-lock.json file is absent, and pnpm-lock.yaml has no project version entry. Contract source and views, setup declarations, product code, tests, and documentation outside the release files are byte-identical to main. The generated source lock changes only the five edited metadata file hashes.
6. Verify and push the named branch. Local checks passed under Node 22.20.0 and pnpm 10.12.4, including frozen install, pinned installer, setup and local build, TypeScript, contract generation and check, source lock generation and check, the release and seed schemas, whitespace, and the exact-head cross-file and release-scope checks. The checkout was clean after commit. The guard pushed a single release metadata commit and readback matched its full SHA. The changes do not affect any UI screens. The Mac lander owns the fleet publication scan and landing. The release lane owns the tag and GitHub Release.

## Counts and custody

| Metric | Before | After |
| --- | ---: | ---: |
| Core migration inventory | 84 | 84 |
| Contract clauses done | 42 | 42 |
| Contract clauses partial | 130 | 130 |
| Contract clauses missing | 32 | 32 |
| Contract clauses total | 204 | 204 |
| Test cases and qualification flows | 200 | 200 |

The product branch is cloud/sd-orbit-release-0-4-12 at 0e97e8b4d5f543afe2e8c144217403e89652f0a5. No pull request was open for the branch at readback.

Exact-head [Verify 44519677469](https://github.com/just-every/run-orbit/actions/runs/44519677469) concluded failure. The GitHub call budget was exhausted at the final status query, so the failed job log was not inspected. Successful exact-SHA Verify remains the landing prerequisite.
