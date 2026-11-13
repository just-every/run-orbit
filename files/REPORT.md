# Orbit adopts rer 0.2.113

Task: main-orbit-rer-0213-1. Repository: just-every/run-orbit. Product branch: cloud/main-orbit-rer-0213-1.

## Plan and scope

Configure fleet identity, decrypted-bundle Git authentication, commit cleanup hooks and pinned project tooling; read launcher/repository rules. Update only the exact rer dependency, matching lockfile, required refreshed Base source and provenance, and generated source lock. Check the README recovery on an isolated scratch installation, run typecheck and focused runtime tests, refresh main before committing, regenerate/check the source lock last, audit all candidate identities/trailers, push the named branch through the fleet guard, and watch exact-SHA Verify through REST. Publish this separate evidence packet and return custody to the main lane. PLAN.md retains the complete execution plan.

No release or deployment was requested. CONTRACT.md, its judgments and generated views are unchanged. No product-specific implementation, bespoke copy or tests were edited. Upstream runtime, documentation and helper changes are exactly those required by the Base refresh.

## Changes

- @runeditrun/rer: 0.2.107 -> exactly 0.2.113, installed with pnpm add --save-dev --save-exact @runeditrun/rer@0.2.113. pnpm-lock.yaml changes only this package's specifier, resolution and snapshot.
- Recorded Base: 4dd4197007cefd688fd314ffb19eed4d0b3c67dd -> c2efb501cbc148c2aee4d5e1107ebdba81469006, via rer refresh-base --ref c2efb501cbc148c2aee4d5e1107ebdba81469006 --from-api. Never used a tag as --ref.
- Base copy groups: 93 -> 95. Recorded Base files: 521 -> 528. The seven additions are import-closure helpers selected by the refresh tool.
- Kept src/base/modules/agent-door/operator-people.ts: Orbit imports its shared operator-auth adapter from the pinned package.
- Kept src/core/features/agent-door/erasure.ts: Orbit's native table inventory, bounded text matching and operator-erasure selectors remain byte-for-byte unchanged. Its pre-existing stale acknowledgement was refreshed with the documented authoring CLI before the Base refresh.
- Kept .github/workflows/verify.yml, run-site.yml and run-demo.yml: existing seed workflow adaptations remain intact. No template adoption or edition migration was requested by this refresh.
- Kept package.json React/React DOM 19.2.8 and Orbit's existing src/client.tsx adaptation. Base reports 19.3.1 as an available comparison; this dependency adoption does not expand into an unrelated React upgrade.
- Regenerated sources.lock.json using node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock; check passed.

The API source reader was given a temporary content-addressed cache built from the immutable release archive fetched with gh api. Cached blobs were named by their computed Git blob SHA-1; the unchanged authoring tool checked them against GitHub's actual commit/tree identities. Commit, recursive-tree and ancestry reads remained GitHub API reads. No other repository was cloned or written. An initial uncached refresh was interrupted before source writes to avoid thousands of individual blob network requests.

## Actual README recovery

A disposable source copy used the installed 0.2.113 CLI, separate local state and only synthetic installation data. These commands all exited 0:

    npx -y @runeditrun/rer setup --owner-email fleet@runeditrun.com --non-interactive
    npx -y @runeditrun/rer export --output exports/orbit.rer
    npx -y @runeditrun/rer reset --yes
    npx -y @runeditrun/rer import --input exports/orbit.rer --yes
    npx -y @runeditrun/rer setup --owner-email fleet@runeditrun.com --non-interactive

Import output included:

    Rebuilding search indexes
    Database update complete. Full output: .seed/installer/commands-14756/install.log
    Restored the local copy from exports/orbit.rer: 135 tables, 19 rows, 0 files.
    Next: rer setup, then rer dev to open the restored app.

Recovery setup output included:

    An owner is already claimed; the existing owner was kept
    Setup complete: database already up to date, owner set up. Full output: .seed/installer/commands-16631/install.log

The import and recovery-setup terminal outputs contained no all-zero database UUID, raw Wrangler results JSON or SQL metadata. The CLI's private import log (mode 0600) retained the zero UUID and raw results/meta JSON. Only public-safe excerpts and file metadata are in cli-recovery-receipt.json; raw logs, archives, state and keys are not selected for evidence publication.

## Checks and counts

- Typecheck passed.
- Offline Base provenance/copy check passed.
- rer check --profile first-party passed.
- Contract generator check passed; no contract or view changes.
- Authoring source-lock check passed.
- Diff whitespace and credential-shaped-addition review passed. Full publication scan belongs to the fleet Mac lander under this cloud brief.
- All six focused cases passed across tests/core/identity.test.ts, tests/core/local-owner.test.ts and tests/core/managed-owner.test.ts (20m26s total). Exact-SHA CI is recorded in ci-receipt.json.
- Test budget: 198 registered cases + 2 qualification flows = 200 before and after; no test changes.
- Clause counts: 204 total, 42 done / 130 partial / 32 missing, unchanged. No clause status, gap, evidence or DONE claim is made by this adoption.

## Custody

Product SHA: 3ea512a8b67d9cec1e97757034d65f257bbf17b7. Pushed successfully on the first guard attempt; one product commit, 24 changed files (485 insertions, 147 deletions), fleet author/committer, no trailers, clean checkout. product-receipt.json and product-push.log record the push; ci-receipt.json records the exact-SHA CI verdict. Evidence publication is separate from product READY/PUSHED custody and does not claim acceptance or landing. No PR was created; this repository's fleet lane owns landing. Main was fetched and the unpublished branch rebased with preserved owner/contract source before source-lock generation. No published history was rewritten.


Exact-SHA Verify: https://github.com/just-every/run-orbit/actions/runs/43457402379 on 3ea512a8b67d9cec1e97757034d65f257bbf17b7. The current/terminal status and polling timestamps are retained in ci-receipt.json and ci-watch.log.

The disposable recovery installation, its private state/raw CLI captures, and the temporary Base archive/blob cache were removed after receipts were saved. cleanup-receipt.json records that cleanup.

## Terminal result

Verify run 43457402379 completed successfully on the exact product SHA 3ea512a8b67d9cec1e97757034d65f257bbf17b7. The watcher made ten status/discovery calls at five-minute intervals, with the successful final check at 2026-11-13T16:40:27Z. No failing workflow or job was observed; no failed-job log or rerun was needed.

All requested local checks passed, the CLI recovery defect was absent, and the product branch is pushed. No blockers, no PR, no release or deployment, and no clause status changes. The fleet lane owns the final publication scan, landing and next seed release. Product custody is READY; the evidence ref carries reports only and does not claim acceptance or landing.

READY branch=cloud/main-orbit-rer-0213-1 head=3ea512a8b67d9cec1e97757034d65f257bbf17b7
