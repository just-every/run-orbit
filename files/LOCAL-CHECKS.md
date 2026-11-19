# Orbit 0.4.12 local verification

Prepared by Run Edit Run fleet, 2026-11-19 UTC.

- Candidate a9fa1830c1913562154dedaeb5a1322ead7c3e6b. Parent bfbe479f949fe859556f15849ac49f098208a6bd. Node 22.20.0, pnpm 10.12.4, rer 0.2.113.
- The remote tag probe for v0.4.12 returned no match. The authenticated GitHub Release-by-tag lookup returned HTTP 404. The previous release tag v0.4.11 resolves to a4fcbfcd72fa4253826f43d0b0de02275094f86d.
- RELEASE.json, seed.json and rer-setup.json validated against the repository's release, seed and delivery setup schemas. The 0.4.12 CHANGELOG section exactly matches publicReleaseNotes and the corresponding RELEASE.md section. The upgrade instructions agree across the metadata. The existing screenshot reference resolves to a PNG.
- The migration inventory contains 84 files at both v0.4.11 and the candidate. Every Git path, mode and blob matches. Both NUL-delimited inventories have SHA-256 4677ab7be4b805e29a7a5c967b8d0920cd453354e58cc6773745b9f89ebafa97.
- The contract generator wrote zero files and its check reported current documents. The edition authoring source lock was regenerated last and its check exited 0. The first-party rer check, boundary check (892 core files), release schemas and TypeScript check all passed.
- The pinned rer build exited 0. The deployment-spec check confirmed that the spec matches the build and the setup digest matches rer-setup.json. The build emitted non-fatal Vite configuration warnings.
- The final candidate is one ordinary commit and passed git diff --check. Every candidate commit passed the fleet author, committer and trailer check. A scoped check of new diff lines found no credential-shaped additions. The fleet's full publication scan runs on the Mac during landing.
- The single guarded product push succeeded at 2026-11-19T15:45:38Z. The remote advertised the exact candidate at refs/heads/cloud/sd-orbit-release-0-4-12-2. A fresh main fetch and rebase immediately before the push retained the checked SHA.
