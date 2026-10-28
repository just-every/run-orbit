# Orbit verification

Run `rer verify` after `rer install`, with the Node and pnpm versions declared by
the checkout. Verification uses temporary state and never the owner's database.

The suite consists of public HTTP, browser, emitted-Worker and `rer` journeys.
Each follows a user or business flow, preserving sign-in and current authority,
customer data, reviewed sending and provider outcomes, privacy erasure, and
portable restore and upgrade. Provider doubles exist only at the network edge.
There is one 390-wide phone smoke; other browser journeys use 1440.

`pnpm run test:list` prints the complete inventory. Every registration counts,
including wrappers and loops that generate registrations. The capacity program
and the seven direct source and environment assertion programs also count. Internal helper tests,
repository pins and repeated feature checks have been removed; the inventory is
not a reason to merge unrelated behaviors into one registration.

`scripts/verification-plan.mjs` owns local and CI scheduling:

- `source` checks the source lock, RER contract, boundaries, manifest, generated
  contract docs and types, builds the application once, and checks deployment
  metadata against that build.
- Seven balanced sanity shards share that exact-commit build. Each migrates one
  empty D1 template and gives every fixture its own private copy. Historical
  upgrade journeys still apply the original migrations themselves.
- Pushes exercise routine sanity. Nightly jobs run only the installer and full
  historical archive qualification (including old HTTP archive generations and
  hosted-owner continuity), plus declared capacity, and skip a SHA that
  already passed nightly qualification. Release tags include all journeys and
  capacity. `rer verify` runs all journeys sequentially; `pnpm run verify:release`
  adds the unchanged declared-capacity program.

CI runs on ubuntu-24.04, installs Chromium normally and installs system packages
only if the launch probe fails. The plan reuses a successful branch push for the
same main SHA or same-repository PR, and a successful parent for an identical
tree. Documentation-only changes over a green parent run the source lock, RER
check, contract-docs check and site build. Superseded branch runs are cancelled.

The aggregate reconciles actual runner completions with the selected inventory.
Missing, duplicate, failed, skipped and focused tests fail verification. Tests do
not run during application builds or deploys. `verification/` and `test-results/`
are disposable execution output; historical records under
`docs/retained-verification/` do not establish a current pass.

CONTRACT.md is the acceptance and status source. After a citation change, run
`node scripts/contract-docs.mjs write` and `node scripts/contract-docs.mjs check`,
commit both generated documents, then regenerate sources.lock.json last.
