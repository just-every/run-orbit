# gr-mt-orbit-dep-5 plan
Author: Run Edit Run fleet, 2026-11-17.

1. Configure fleet authentication, identity, commit hooks and the named cloud branch in a fresh full-history clone of just-every/run-orbit.
2. Inspect main, the direct and locked Vite/Hono dependencies, repository instructions, source-lock workflow, and team-owned TanStack PR #11. Preserve its versions and avoid unrelated dependency upgrades.
3. Keep Vite 8.2.4, already patched on main. Upgrade direct Hono 4.13.5 to the first patched release 4.13.11 and regenerate pnpm-lock.yaml with pnpm 10.12.4 and Node 22.20.0.
4. Run frozen install, required setup, build, typecheck and focused HTTP/session/asset tests relevant to Hono and the emitted Vite application. Add no version pin tests. Record existing test and clause counts; change no acceptance statuses or generated views.
5. Regenerate sources.lock.json last and run its check. Commit only the requested dependency changes and necessary source lock with fleet identity and active hooks.
6. Fetch main and integrate any drift without rewriting published history. Inspect all candidate identities and trailers; run the available Base publication scanner on the exact committed tree before product publication. A missing scanner is a publication blocker under the brief.
7. Push only cloud/gr-mt-orbit-dep-5 through the cloud push guard if publication requirements pass. Discover and watch exact-SHA Verify using REST within the ten-call budget, at most one call per 300 seconds per run. Leave landing to the fleet.
8. Save actual result.json, report and receipts outside the product repository and publish explicitly selected non-secret evidence to evidence/gr-mt-orbit-dep-5. Preserve unpushed work in a verified external bundle if blocked.
