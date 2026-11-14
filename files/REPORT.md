# Orbit Undo row carry

Repository: just-every/run-orbit
Branch: cloud/main-orbit-readable-runs-1-c1
Product head: de7eb11ff23eb8db6529f6424639a094fc66460c
Base main: 7ad63db63c46c6a2a59157a5c128bd35f6c20173
Carried commit: 89e4e3dcef68fb1e93f1e10d21343a38e6bc2705

## Result

Current main still selected the first matching workflow row after Undo. Cherry-picked the prior test fix without committing its stale lock, regenerated the lock with the documented authoring command, and committed the carried change. Undo emits a record-change event whose newer loop-stopped run can become the first row. The journey now selects the unique retained Undone row and checks its visible outcome. It continues to assert that Undo restores the deal title.

Only tests/rer/workflow-journey.mjs and sources.lock.json changed (6 insertions, 4 deletions). No product source changed. Main's two newer dependency upgrades remain intact. No conflicts occurred. The fetch-before-candidate confirmed the same main; the subsequent rebase was a no-op.

## Validation

- Native rer install and setup completed successfully. Owner setup output remains private, outside the packet.
- pnpm typecheck passed.
- Source lock regenerated last using node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock; the exact CI check, node node_modules/@runeditrun/rer/edition-authoring/cli.mjs check, reports ok=true.
- node src/base/contract-docs.mjs check passed: generated documents are current.
- cloud_run npx -y @runeditrun/rer build passed.
- Existing desktop operator test passed: 1 test, 0 failures, no skips, about 261 seconds. It exercises the workflow journey at 1440px, including the carried Undo assertion and record restoration. An external import selected /usr/bin/chromium with --no-sandbox; no browser configuration was committed.
- git diff --check passed. Candidate identity/trailer check covers every commit in origin/main..HEAD: fleet author and committer, no trailers.
- Guarded product push succeeded on the first attempt. ls-remote independently confirmed the exact SHA.

## Counts and scope

Before/after: 198 registered cases + 2 qualification flows = 200; 0 tests added or removed. Core: 42 done, 112 partial, 24 missing, 178 total. Agent surface: 0 done, 18 partial, 8 missing, 26 total. Whole target: 42 done, 130 partial, 32 missing, 204 total. All counts remain unchanged. No CLAIM lines, status changes, Gap edits, or Evidence edits. CONTRACT.md, ACCEPTANCE.md, and docs/CLAIMS.md are byte-identical to main.

## Custody

The product branch was pushed, with no PR required by the provided landing rules. Exact-SHA Verify run 43604679577 completed/success on de7eb11ff23eb8db6529f6424639a094fc66460c. REST discovery plus six polls used seven GitHub calls, with at least 300 seconds between calls for the run. CI_RECEIPT.json contains the actual terminal receipt; API_CALLS.jsonl records the invocation times. No workflow was dispatched or rerun. The fleet Mac owns the complete publication scan, admission, and landing under the cloud adaptation. No landing or publication-scan success is claimed here.

Full plan: PLAN.md. Actual local receipt: LOCAL_RECEIPT.json. Actual logs, source-lock output, inventory, and CI receipts accompany this report on the evidence ref only. No credentials, environment dumps, private setup output, browser sessions, or product evidence files are committed to the product branch.

## Final disposition

All requested carry work is complete and the pushed candidate passed exact-SHA Verify. No blockers. No PR was created. The plan was completed without expanding scope, adding tests, or changing any clause status. Product READY custody is separate from this report-only evidence publication. The fleet owns admission and landing.
