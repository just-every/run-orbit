# Carry plan

1. Initialize fleet identity, credential helper and commit cleanup; clone full Orbit history and create cloud/main-orbit-readable-runs-1-c1 from current main.
2. Compare 89e4e3dcef68fb1e93f1e10d21343a38e6bc2705 with current main. If already equivalent, report NOTE without product push. Otherwise cherry-pick its test fix, retaining main's newer tests and contract judgments.
3. Install the pinned dependencies, run native setup, install the commit cleanup again, and run typecheck. Fetch main before the candidate, reconcile drift, regenerate sources.lock.json last, and run its exact CI check. Leave CONTRACT.md and generated views unchanged.
4. Commit only the carried journey and generated source lock. Execute the existing desktop operator test containing the workflow journey with system Chromium and --no-sandbox. No new registrations, product change, or clause claims.
5. Inspect every candidate identity and trailer; push only the named cloud branch with cloud-push.py. Discover exact-SHA Verify using REST and poll no more than once per 300 seconds within ten API calls. Report failures honestly; use READY only for exact-SHA success (or the expressly allowed generated-view-only failure).
6. Write actual non-secret reports and receipts in this packet, publish selected files only to evidence/main-orbit-readable-runs-1-c1, and relay an INBOX line in the final message. Fleet Mac owns publication scanning and landing.
