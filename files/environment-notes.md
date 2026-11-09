# Local verification environment adjustments

The VM default Node 24.19.0 was replaced on the command PATH by the repository pin, Node 22.20.0. The required toolchain script is sourced in every repository shell.

Fresh form fixtures run all 70 real Wrangler migrations (through 0075). Their 60-second fixture startup allowance expired in this VM before assertions. A command-only preload extends only that migration subprocess allowance to 600 seconds and caches the completed, empty, migration-hash-keyed schema for subsequent independently isolated fixture directories. The cache is captured before any owner, session or customer exists. No product/test assertion, source test timeout, skipped test or CI command is changed by this local allowance/cache.

The same external preload selects /usr/bin/chromium with --no-sandbox for existing and added browser journeys. It is outside product branches; independent CI uses the repository fixtures unchanged. Initial infrastructure timeouts are not reported as regression failures.

Direct harnesses use .mjs files. Early eval harnesses inherited --input-type=module into runtime worker threads and stalled before fixture initialization; they were stopped and replaced before counting regression results. The exact-sol native and browser regressions then reached and failed their actual evidence assertions.

The first full forms-native.test.ts attempt hit the command-level 900-second bound during its unchanged mapped archive/restore custody journey, with no failed assertion. The complete log is retained as native-startup-limit.log; the suite is retried with a larger bounded allowance and no test changes. Browser journeys run separately from that heavy archive work to avoid contention with their existing UI-readiness waits.

With tests serialized, the default-memory native run completed 3 passed / 1 failed / 0 skipped: the existing archive POST /imports exceeded its unchanged 30-second assertion. The same original mapped journey is now compared on exact sol source using Node 22.20.0 with an explicit 4 GiB old-generation / 64 MiB semi-space allowance. This changes only VM allocation capacity; wall-clock assertions and all source remain unchanged. If that baseline passes, the repaired native file is retried with the identical allowance; otherwise the out-of-lease failure is reported and no product branch is pushed.

The exact-sol mapped journey completed successfully with that explicit memory allowance, including hosted and local archive round trips, erasure and every unchanged 30-second request assertion. The repaired four-case native file now uses the same allowance. baseline-mapped.log contains the actual completed baseline output.

The repaired native file completed with the matched memory allowance: 4 passed, 0 failed, 0 skipped, in 1,248,102.573881 ms. Both archive exports, hosted restore, local CLI round trip, erasure, the frozen consent/basis journey, the added retained-publication journey, abuse/refusal/release and atomic capture assertions passed. No repository assertion or 30-second archive bound changed.

The exact command-only verification harnesses are retained under harness/. The preload records the original absolute checkout path for Playwright; another checkout can point that import at its own pinned installation. CI runs the repository fixtures directly on its own runners.
