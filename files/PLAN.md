# gr-mt-orbit-ci-6 plan

Author: Run Edit Run fleet, 2026-11-16.

1. Set the required global and clone Git identities, refresh the launcher, install the decrypted-bundle Git helper, push guard, commit hooks and pinned toolchain. Clone only just-every/run-orbit with full history and create cloud/gr-mt-orbit-ci-6 from origin/main.
2. Read launcher and repository guidance plus the inline builder rules. Inspect the cited completed Verify run, identify its failed job, and retrieve its logs once with the prescribed gh archive command. Recover the downloaded archive locally if gh prints no step text.
3. Trace the exact failing assertion to product behavior. Compare it with current main and confirm whether an existing change already fixes it. Make a minimal product or test repair only if the defect remains; preserve all wanted assertions.
4. Verify the affected tests and typecheck only. Build the emitted Worker needed by the existing browser journey. Use Node 22.20.0, pnpm 10.12.4, one test worker, system Chromium with --no-sandbox, and the real HOME.
5. Confirm exact-SHA Verify with REST inside the ten-invocation GitHub budget. If the defect is already fixed on main, write a no-change result and avoid inventing a new product commit. Otherwise scan the committed tree, inspect all candidate commit identities and trailers, push only the named cloud branch with the guard, and require exact-SHA CI before READY.
6. Save full non-secret findings, actual receipts, the required result.json, and relevant screenshots in the packet outside the product repository. Explicitly select those files for report-only evidence publication. Preserve the maintenance clone for the worker and relay the lane POST in the final message.
