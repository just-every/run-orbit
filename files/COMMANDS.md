# Actual check commands

All commands run from the product checkout, with the supplied toolchain sourced. Runtime proofs use cloud_run, a hard 1200-second timeout and the pinned Node 22.20.0 path after setup installed it. Browser launch uses Chromium at /usr/bin/chromium with --no-sandbox through a temporary config outside the product tree.

- pnpm install --frozen-lockfile: exit 0.
- npx -y @runeditrun/rer setup --owner-email fleet@runeditrun.com --non-interactive: exit 0, native first owner claimed. No private setup link is included in this packet.
- pnpm exec tsx scripts/agent-surface.ts: exit 0, generates manifest and guide.
- pnpm exec tsx scripts/agent-surface.ts --check: exit 0.
- pnpm run typecheck: exit 0 on the final merged candidate.
- npx -y @runeditrun/rer build: exit 0.
- pnpm exec rer check --profile first-party: exit 0.
- node src/base/contract-docs.mjs write and check: both exit 0; generated views restored from origin main.
- node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check: both exit 0 after tracking the two new paths. The intermediate omitted-path check is retained as post-save-lock-check.log.
- pnpm exec tsx --test --test-concurrency=1 tests/core/managed-owner.test.ts: initial fixture-preparation timeouts are retained. The same Node 22 command on detached main passes serially. The final candidate invocation PASSes, exit 0, retained in managed-owner-serial.log.
- pnpm exec playwright test --config=/tmp/orbit-docs.config.mjs --grep 'installed docs navigation' --reporter=line: temporary config changes only browser executable, output location and startup allowance; existing test assertions and their widths remain intact. Serial result PASSes, exit 0, retained in browser-serial.log.
- node node_modules/@runeditrun/rer/cli/agent-door.mjs . deploy.json: installed conformance entry, serial result PASSes, 4884 of 4884 checks, exit 0, retained in conformance.log.

No local full suite, scale dispatch, provider journey, workflow change, PR or main push is performed. The native conformance command covers the existing adopted subset and is not an award of SURFACE-001 acceptance 2.
