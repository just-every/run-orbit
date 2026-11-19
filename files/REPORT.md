# Orbit 0.4.12 release metadata

Run Edit Run fleet, 2026-11-19 UTC.

Repository `just-every/run-orbit`, branch `cloud/sd-orbit-release-0-4-12-2`, product head `a9fa1830c1913562154dedaeb5a1322ead7c3e6b`.

No contract clause claimed; this is release metadata.

## Replay and verification

1. Fetched fresh main and the prepared metadata branch. The earlier candidate was `0e97e8b4d5f543afe2e8c144217403e89652f0a5`, from parent `2288bfae201961fdb966552dc86655a76b2e0247`. Fresh main was `bfbe479f949fe859556f15849ac49f098208a6bd`, the test-clock fix whose main Verify was 44542147281. The v0.4.12 tag probe found no match and the Release-by-tag lookup returned HTTP 404.
2. Reviewed the tree diff from v0.4.11 to fresh main and the history from the prepared commit's parent. The prepared notes already describe the release's first-run setup, pipeline creation, import review, form recovery, autosave and search, invitation handling, booking setup and dependency updates. The only subsequent main commit changed test-clock fixtures and their source lock. The prepared changelog and public release notes therefore carried forward byte for byte.
3. Applied the prepared patch to main, checked that the contract generator had zero documents to write, restored both generated views from main and regenerated the edition source lock last. The six-file result is a single non-merge commit. The source, release and seed metadata now agree on 0.4.12. The rer pin remains 0.2.113. The core migrations match v0.4.11 byte for byte.
4. Passed the release, seed and setup schema validations, release note and version consistency checks, source lock and generated contract checks, first-party RER check, boundary check, build, deployment-spec check and typecheck. Fetched and rebased on main immediately before the one guarded product push. GitHub advertised the checked SHA at 2026-11-19T15:45:40Z. Rechecked the declared project hash at the advertised candidate.

## Before and after

| Item | Before | After |
| --- | --- | --- |
| Orbit version | 0.4.11 | 0.4.12 |
| Core migration files | 84 | 84, byte-identical |
| Test and spec files | 100 | 100 |
| Core contract (done / partial / missing) | 42 / 112 / 24 | 42 / 112 / 24 |
| Agent surface (done / partial / missing) | 0 / 18 / 8 | 0 / 18 / 8 |
| Later (done / partial / missing) | 0 / 0 / 0 | 0 / 0 / 0 |
| Full contract (done / partial / missing) | 42 / 130 / 32 | 42 / 130 / 32 |

Only declared project file hash `setup.sha256`, path `rer-setup.json`, matched on the pushed head.

- Declared `b50fa9e6ead13cc81bd7a994833e3afec8c469cf66023a679d550da6b1ea8013`
- Actual `b50fa9e6ead13cc81bd7a994833e3afec8c469cf66023a679d550da6b1ea8013`

The branch is for fleet landing. The full publication scan and landing remain Mac-side. No PR, tag or GitHub Release was created.

## Exact-SHA Verify

Workflow 44558431422 completed successfully on the pushed SHA, observed at 2026-11-19T16:16:22Z. The plan, shared build, all 20 shards and the aggregate Verify job succeeded. Batch-16 (core-8 and rer-operator-small-phone) completed at 2026-11-19T16:06:46Z as job 135683280484. The aggregate Verify completed at 2026-11-19T16:10:18Z as job 135697011090.

[Verify run](https://github.com/just-every/run-orbit/actions/runs/44558431422)

[Batch-16 job](https://github.com/just-every/run-orbit/actions/runs/44558431422/job/135683280484)
