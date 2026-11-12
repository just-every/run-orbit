# Exact-head CI triage plan

Recorded 2026-11-12T16:09:59Z.

1. Preserve product sources, contract judgments, landing records and gate FIX count. Clone only just-every/run-orbit, with shallow filtered history, on the task branch from main.
2. Read the supplied fleet rules and repository AGENTS.md. Load Git and gh credentials only from the launcher-decrypted bundle without printing values.
3. Inspect Verify 43246891287 on exact head fc2af9e59b27a655602ab4c0deca8cac1b48bc59; enumerate every job attempt to determine prior retry use. Read the failed product job archive once.
4. Retry only its failed product shard once if no retry was used. Do not rerun the workflow, successful shards or aggregate jobs, and do not dispatch another Verify.
5. Poll exact-head run status by REST at least 300 seconds apart, with one watcher and at most ten gh command invocations including metadata, mutations and failed-job archive reads.
6. If still red, identify the assertion and inspect existing facilities for running only that test on current main on the same runner. If unavailable, name the precise REMOTE-NEEDS-LOCAL dependency instead of substituting a different runner or full suite.
7. Keep landing refused unless the exact candidate Verify is green. Relay the result to sd and infrastructure or baseline evidence to fv. Publish only explicitly selected non-secret reports and receipts to the separate evidence ref, then delete the disposable product clone.
