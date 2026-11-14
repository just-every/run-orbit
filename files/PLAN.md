# Plan: gr-mt-orbit-dep-7

1. Read launcher and Orbit instructions, use the fleet credential helper and clone full main history onto cloud/gr-mt-orbit-dep-7.
2. Identify Undici's parent and pin. Apply the smallest patched dependency resolution with pnpm 10.12.4 and Node 22.20.0. Avoid unrelated upgrades.
3. Install with the frozen lockfile, run setup and build through cloud_run, run typecheck and focused Miniflare-backed public-door tests, and regenerate/check the source lock last if required.
4. Review the exact committed diff and every candidate identity/trailer, integrate current main, and preserve the first real commit on the named branch using the fleet push guard. Follow cloud publication custody instructions; the fleet runs its publication scan on the Mac before landing.
5. Discover and poll exact-SHA Verify via REST within the ten-call budget and five-minute minimum per-run polling interval. Resolve in-scope failures when possible.
6. Write result.json plus full actual non-secret reports/receipts. Publish selected packet files only to evidence/gr-mt-orbit-dep-7. Report the full product SHA, validation, unchanged clause/test counts and CI custody.
