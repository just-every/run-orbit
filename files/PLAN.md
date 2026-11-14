# gr-mt-orbit-dep-6 plan

1. Read launcher and Orbit instructions, contract context and verification plan. Use full-history clone on cloud/gr-mt-orbit-dep-6, Node 22.20.0 and pnpm 10.12.4. Keep credentials and fleet evidence outside the product tree.
2. Change only direct Vite 8.2.2 to the first patched 8.2.4. Regenerate pnpm-lock.yaml with the pinned package manager and inspect resolved package changes to exclude unrelated upgrades.
3. Install from the frozen lockfile, run noninteractive setup, build, typecheck and focused emitted-worker/asset/SSR/browser compatibility proof. Do not add tests for version pins or run the full local suite. Preserve existing test and clause counts/statuses.
4. Regenerate source lock last and run its check. Integrate current main before publication. Commit with fleet identity and active repository hooks; inspect every candidate commit and trailer.
5. Run Base publication scanner on exact committed tree. Only a COMPLETE/PASS scan with zero findings permits the named product-branch push. Use cloud push guard, then discover and poll exact-SHA Verify through REST within ten-call budget and 300-second polling interval.
6. Retain actual non-secret reports and command receipts in this packet. Write maintenance result.json and publish explicit packet files only to evidence/gr-mt-orbit-dep-6. Final report includes exact product provenance, CI results and lane relay line. Never land or push main.
