# Orbit f178 exact-head CI triage plan

1. Apply fleet identity and launcher authentication setup; use only the declared Orbit repository.
2. Preserve the original exact-head run metadata and all-attempt job inventory. Read original candidate Verify once. Cap GitHub command invocations at ten, counting each failed-job archive read once.
3. Retrieve each actual failed assertion once with `gh run view --job ... --log-failed`; identify file, line, expected/actual values, attempt and runner before classification.
4. Compare the rebased candidate against its main parent, and compare implicated source and test blobs against original candidate, original base and current main. Make no source, contract, workflow or test edits.
5. Retry only each failed product shard, once if no earlier retry exists. Serialize requests because GitHub refuses a second job rerun while the containing workflow is running. Do not rerun whole Verify, successful shards or aggregates and do not dispatch.
6. Read completed retry state through REST, respecting at least 300 seconds between status observations for the run. If a failed shard stays red, use existing same-runner facilities for only its failing test on main; if unavailable, name the exact REMOTE-NEEDS-LOCAL dependency. A cloud VM run cannot substitute for the original hosted runner.
7. Report candidate causality with its limits and the narrow next action. Keep landing refused unless the exact target SHA is green; do not readmit or edit landing records. Add no FIX count and no clause status change.
8. Publish explicitly selected non-secret report, actual receipts, failed assertion excerpts and static comparison through the report-only evidence ref. Preserve product provenance separately. Delete the disposable clone after successful evidence transfer; keep the packet.
