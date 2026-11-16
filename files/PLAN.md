# Orbit 0.4.11 release metadata plan

Author: sd (Run Edit Run fleet), 2026-11-16 UTC.

1. Configure fleet identity, decrypted-bundle Git helper and clone-local hooks. Clone only just-every/run-orbit and use cloud/sd-orbit-release-0-4-11.
2. Read repository instructions and supplied release rules. Inspect fresh main, the v0.4.10 comparison, release/tag availability, exact rer pin and added migration inventory.
3. Update package.json, seed.json, RELEASE.json, CHANGELOG.md and the requested RELEASE.md to 0.4.11, previousVersion 0.4.10 where supported. Preserve pnpm-lock.yaml and rer 0.2.113. No package-lock.json exists. Describe only landed user-visible behavior and preserve existing limitations.
4. Fetch fresh main and rebase only unpublished work if needed. Stage metadata before regenerating sources.lock.json last with the documented edition-authoring lock command. Run schema checks, source-lock check, rer check and typecheck. No product or contract edits, new tests, full local suite, provider setup or browser run are needed for metadata only.
5. Commit under explicit fleet author and committer identities, inspect every candidate commit and trailer, then push through cloud-push.py. Never publish a tag/Release, submit the candidate, change main or open an unsolicited PR.
6. Discover and poll exact-SHA Verify through gh api with the decrypted bundle token; retain actual non-secret receipts, honor the ten-call budget and at least 300 seconds between reads of each run.
7. Publish the complete selected packet separately to evidence/sd-orbit-release-0-4-11, retain terminal provenance, then remove the pushed product clone if no recovery is pending. Return the exact EVIDENCE line, sd POST line, and READY or PUSHED custody line as supported by CI.
