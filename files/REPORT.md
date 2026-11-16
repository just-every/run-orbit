# gr-mt-orbit-ci-6: Verify maintenance investigation

Author: Run Edit Run fleet, 2026-11-16.

## Result

The cited failure is already repaired on current main. No product, contract, generated acceptance view, lock or test change is required. The maintenance branch is `cloud/gr-mt-orbit-ci-6` at `a4fcbfcd72fa4253826f43d0b0de02275094f86d`, equal to the main fetched by the fresh clone. No new product commit, product push, PR or landing is needed for this no-change result.

The exact-SHA main push Verify run **43875960631** completed successfully at 2026-11-16T14:00:24Z. Its response is saved in `ci-receipt.json`. The SHA's discovered successful Verify runs also included 43878914207 and 43865054949, and Run site 43875960451 was successful. These are existing runs; this task did not dispatch or rerun them.

## Failure and existing repair

The original Verify run **41950914939**, at `8dbcf44ee1cd9f56239b1145e7ae34e6c074cf27`, failed job **126995186614**, `shards (batch-8)`, in `Verify routine product shard`. That batch ran `fold-domain-0`: collaborator relationship access and the report-disclosure tests. Two of its three tests passed. The sales-report browser journey failed in `newtests/t096/browser-sales-report.ts:101`: the `Saved sales results` region contained zero list entries where the test required one, after the save request had returned 200.

The options drawer was closed by an effect watching both the report version and saved-result URL parameter. Saving first rendered the saved result; an operator could then open Report options before the router published that parameter. The later URL change closed the drawer and removed its history from the page. This was a product navigation race, and the saved-history assertion remains wanted.

Commit **5b08deaa2b998951f875ea2a906c36ef83848384**, “Keep saved sales history open when its result URL settles” (2026-11-08), is an ancestor of current main. It changed `src/core/features/reports/sales-report.tsx` so the drawer-closing effect depends only on the report version. Reopen and recompute still close the drawer explicitly. It also extended `newtests/t096/browser-sales-report.ts`: the test holds the genuine save's address transition, opens history, checks one saved result, releases navigation, and checks the drawer and its result remain visible. Existing reconciliation, export, access-revocation, late-evidence and archive checks remain in the journey. Current main retains that fix and regression coverage.

## Plan and scope

`PLAN.md` records the complete plan: establish the required Git custody; read all applicable rules; retrieve the cited failure once; trace the exact assertion; compare current main; run the affected existing tests, build and typecheck; confirm exact-SHA CI; return a no-change result if already fixed; publish reports separately from the product. No additional product features, UI redesign or other repository writes were in scope.

## Local checks

- Frozen dependency installation passed. Tests and build use Node 22.20.0 and pnpm 10.12.4. The provided toolchain initially left the VM's newer Node on PATH; the exact pinned Node was installed and explicitly selected before build, typecheck and tests.
- `cloud_run pnpm exec rer build` passed, exit 0. Its emitted Worker is used by the focused browser journey. No tests run during this build. Vite printed existing native-config compatibility warnings.
- `cloud_run pnpm run typecheck` passed, exit 0.
- The original `fold-domain-0` test files are the local verification scope: `newtests/t096/collaborator-links.test.ts` and `newtests/t096/report-disclosure.test.ts`, with one test worker. The collaborator access test passed. The first direct invocation omitted `ORBIT_FOLD_BROWSER_EVIDENCE`, causing the report tests' before hook to refuse before their bodies ran. This command error is retained in `first-invocation.log`; it is not the historical product failure. The report suite was then invoked with the required evidence directory and system Chromium at `/usr/bin/chromium`, `--no-sandbox`, real HOME, through the supplied subreaper. The corrected report invocation passed both tests, exit 0, in 641.8 seconds. Together with the passed collaborator test, the affected file scope is 3 passed, 0 failed, 0 skipped or cancelled. The original failing batch was 2 passed, 1 failed. The save/history assertion, desktop and phone report checks, export/restore and erasure assertions all passed. Final outcomes are recorded in `local-receipt.json` and the focused test log.
- No full local verify or unrelated test suite was run. Existing exact-SHA Verify provides the full CI wall.
- Test inventory before and after: **198 registrations + 2 qualifications = 200 total**. Tests added: 0; removed: 0; skipped or weakened: 0. Both complete inventories are retained.
- Contract status counts are unchanged: Core 42 done / 112 partial / 24 missing; Agent surface 0 done / 18 partial / 8 missing; full target 42 done / 130 partial / 32 missing, 204 clauses. No clause text, status, gap or evidence cells changed. There is no whole-clause DONE claim from this maintenance investigation.

## Retrieval and transport

The prescribed command `gh run view 41950914939 --repo just-every/run-orbit --job 126995186614 --log-failed` exited 0 but printed no step text. It had downloaded the complete run archive into gh's own cache. The failed job text was recovered from that existing ZIP locally without a second log request. The packet retains only the actual failing assertion excerpt, excluding the job's environment dump.

A separate artifact request, `gh api repos/just-every/run-orbit/actions/artifacts/13381650326/zip`, followed a storage redirect and received **HTTP 403 Forbidden**. It was not retried. The signed query is removed from the transport receipt. This did not block diagnosis: the log archive was already available. Nine GitHub read invocations were used, within the ten-call budget; no polling watcher, rapid loop, workflow dispatch or rerun was used.

## Custody and defaults

The fresh maintenance clone is retained at `/home/agent/rer-consolidation/work/maint/gr-mt-orbit-ci-6/repo` for the worker, following the maintenance brief's clone-return requirement. Global and clone Git identity are the fleet identity. The decrypted-bundle Git helper and clone-local co-author cleanup hooks are installed. No personal credential was sought. The product checkout remains unchanged.

No-change is the brief's stated default when current main already fixes the reported failure. Therefore no product publication scan or push is needed, and no product READY/PUSHED claim is made. The selected non-secret packet is transferred only to `refs/heads/evidence/gr-mt-orbit-ci-6` with the authorized report-only entrypoint. That evidence ref is a report transfer, not a product acceptance or landing signal.

Remaining product work for this brief: none. No owner ruling is needed. The historical artifact-download restriction is recorded as a resolved investigation limitation, not a product blocker. The required `result.json` reports no-change and the exact inspected main SHA. Process cleanup and final local test outcome are recorded in the final receipt.

## Final local receipt

All three focused cases passed across the two original shard files. The browser run produced 73 completed accessibility receipts with 0 serious or critical findings. Selected sales-report screenshots and their accessibility/error receipts are retained at 1440 and 390 pixels. The subreaper returned exit 0 after the existing teardown disposed browsers, Workers and temporary fixture state. The source checkout and index remain clean. `result.json` is written in the maintenance work directory and copied into the evidence packet.
