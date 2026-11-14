# Prior CI transport observations

- `gh api repos/just-every/run-orbit/actions/runs/43567551061/jobs` returned success and identified failed job `132365352371` (`shards (batch-18)`), at step `Verify routine product shard`; the aggregate job also failed as a consequence.
- `gh run view 43567551061 --repo just-every/run-orbit --job 132365352371 --log-failed` exited 0 and returned an empty stdout. It was invoked once. The empty actual response is retained as `prior-failed-job.log`.
- `gh api repos/just-every/run-orbit/actions/runs/43567551061/artifacts` identified artifact `14104145027` (`orbit-shard-batch-18`).
- `gh api repos/just-every/run-orbit/actions/artifacts/14104145027/zip` failed once: `Get https://productionresultssa19.blob.core.windows.net/.../artifacts/...zip: Forbidden` (HTTP 403). Signed URL query parameters have been removed from this report. No archive retry was attempted.
- `gh run rerun 43567551061 --repo just-every/run-orbit --failed` requested the one allowed failed-job retry at 2026-11-14T08:20:45Z, before the independent local desktop reproduction identified the first-row selector defect. The new candidate Verify supersedes this retry for acceptance; no green claim is based on the saved SHA.
