# Orbit adoption of RER 0.2.125

- Fleet task `sd-orbit-rer-pin-125-1`
- Repository `just-every/run-orbit`
- Branch `cloud/sd-orbit-rer-pin-125-1`
- Candidate `6e5164471b51f5a9efacf86d27d441df6b9986a1`
- Main base `a9fa1830c1913562154dedaeb5a1322ead7c3e6b`
- Product push and ref verification completed at 2026-11-20T15:54:52Z

## Plan and results

1. Inspect Orbit's current version and last pin adoption. Main used RER 0.2.113, and `31ee78c0d348ba5c0d9e5ad530d8d23dbde5f47d` established the pattern of changing the exact package pin, pnpm lock, recorded Base copies and source lock.
2. Install the exact 0.2.125 pin from the updated lockfile. Refresh the recorded Base files from the full-history blobless Base checkout at `965e8d4e105f6f4d281dacb3c099f6a958a886e7`. The refresh completed and preserved Orbit's declared local adaptations.
3. Run the source and build gates in Orbit's declared order. Typecheck, build, first-party RER check, boundaries, manifest, Agent door checks and deployment-spec verification passed. The contract generator reported zero view edits. The source lock was regenerated after staging the new Base files and passed its check.
4. Exercise archive export, fresh import and re-export through Orbit's real CLI and built Worker paths. The stock CLI round trip preserved 138 tables, 19 rows and the archive content hash. The built Orbit Worker archive tests passed. Orbit declares no extra owner-migration directories. A disposable owner-migration fixture proved the TIMESTAMP TEXT ledger, native replay and incompatible-history refusal through Orbit's installed RER. Base's Worker regression proved recorded interleaving and history refusals using the same implementation bytes as the installed package.
5. Fetch main, verify the single commit's provenance, push the candidate and observe exact-SHA Verify. Archive, source, and build checks were green at push. The standalone README journey subsequently exposed the production preview regression documented below.

## Adoption blocker

RER 0.2.125 verifies the loopback preview owner entry before announcing readiness. That entry expects the Base-native `oa_owner_signins` and `oa_operators` schema. Orbit uses the `operators` table and its own proof and session adapters. The installed RER adapter offers no preview owner-entry override for that schema.

The existing README integration test and a separate loopback preview after successful setup both hit the regression. The direct preview ended with exit 1 and reported `HTTP 200 (entry exchange not observed; destination document not observed after entry)` after 60 seconds. The confirmation query found one active setup owner and the Orbit `operators` table. The adopted Base-native ledger tables were absent. A genuine fix requires an upstream RER adapter hook for the owner entry or a separately scoped Orbit auth migration. The adoption lease excludes the migration.

## Counts

| Scope | Done before → after | Partial before → after | Missing before → after | Total before → after |
| --- | ---: | ---: | ---: | ---: |
| Core | 42 → 42 | 112 → 112 | 24 → 24 | 178 → 178 |
| Agent surface | 0 → 0 | 18 → 18 | 8 → 8 | 26 → 26 |
| Later | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 |
| Full target | 42 → 42 | 130 → 130 | 32 → 32 | 204 → 204 |

The test inventory held at 198 registrations plus two qualification flows, 200 total.

No contract clause claimed; this is a rer adoption.

## Exact-SHA Verify

Verify run `44768033579` completed with failure on `6e5164471b51f5a9efacf86d27d441df6b9986a1`. The source and shared build succeeded. The routine shard failures were batch 11 (README journeys, job `136399602031`), batch 4 (fold-domain-1, job `136399602035`) and batch 14 (rer-checkouts and runtime-launch, job `136399602212`). The aggregate verify job `136414634538` failed while requiring successful shards. This was a product check failure. The contract document generator passed locally on the exact candidate.

The batch 4 archive showed an additional failure in `newtests/t096/browser-ownership.ts:37`. The browser could not find the **Apply assignment** button in the **Record ownership** panel when the enabled check timed out after 5 seconds. The README journeys archive command failed with `failed to get run log: zip: not a valid zip file`. GitHub gave no HTTP status in that diagnostic. The independent candidate and main preview comparison is recorded in CHECKS.md. The ten GitHub calls covered discovery, six polls, job metadata and two archive reads.

[Verify 44768033579](https://github.com/just-every/run-orbit/actions/runs/44768033579)

Report prepared by Run Edit Run fleet on 2026-11-20T16:40:30Z.
