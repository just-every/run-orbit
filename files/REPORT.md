# Orbit Hono maintenance

Repository `just-every/run-orbit`, branch `cloud/gr-mt-orbit-dep-12`.

| Source | Commit |
| --- | --- |
| Base main | `a050bfb87cb804a5eb2a278bb627a47cc1874537` |
| Candidate | `2288bfae201961fdb966552dc86655a76b2e0247` |

## Plan and results

1. Trace Hono through the importer's manifest, package entry, and snapshot in the lockfile. Orbit directly resolves one production copy. It moved from 4.13.11 to 4.13.16, the first patched release for the five advisories. The count of affected installed copies moved from one to zero.
2. Update the exact pin in `package.json` and regenerate `pnpm-lock.yaml` with pnpm 10.12.4. The diff contains no unrelated dependency changes. Regenerate `sources.lock.json` so its package-manifest and lockfile hashes match the candidate.
3. Use the repository's Node 22.20.0 pin for installation, build, typecheck and affected HTTP tests. Verify publication hygiene on the committed tree and watch Verify on the candidate SHA.

The frozen install, RER install and setup, production build, typecheck, edition source lock check, contract generator check, and whitespace check passed. Ten focused tests passed across HTTP identity, platform boundaries, and the emitted public-demo Worker. The first invocation ran the identity and demo tests successfully and stopped the platform-boundary file at initialization. That file passed all five tests after the documented isolated D1 preparation.

| Count | Before | After |
| --- | ---: | ---: |
| Contract clauses done | 42 | 42 |
| Contract clauses partial | 130 | 130 |
| Contract clauses missing | 32 | 32 |
| Contract clauses total | 204 | 204 |
| Registered test cases | 198 | 198 |
| Qualification flows | 2 | 2 |

There are no clause status changes. Build and HTTP results establish checkout compatibility. The package resolution addresses the listed advisories in the candidate.

## Advisory records

The ten Orbit Dependabot alerts, 44 through 53, cover five advisories.

- Hyperlink audit CSRF handling, alerts 53 and 48. [GHSA-46wx-v44x-9hh2](https://github.com/advisories/GHSA-46wx-v44x-9hh2)
- Multipart form validation, alerts 52 and 47. [GHSA-4h7h-rv7c-7m2v](https://github.com/advisories/GHSA-4h7h-rv7c-7m2v)
- Mount prefix middleware, alerts 51 and 46. [GHSA-4m76-xfj5-7975](https://github.com/advisories/GHSA-4m76-xfj5-7975)
- RegExpRouter wildcard middleware, alerts 50 and 45. [GHSA-h7mg-cq63-vhpq](https://github.com/advisories/GHSA-h7mg-cq63-vhpq)
- CSS helper HTML injection, alerts 49 and 44. [GHSA-3gg2-335m-rxc6](https://github.com/advisories/GHSA-3gg2-335m-rxc6)

## Publication and Verify

Base's publication scanner completed with PASS and zero candidate findings. The scan used a clean worktree of the exact candidate and compared against the public main history. Its report recorded five findings against already-published history. GitHub advertised the exact candidate at `refs/heads/cloud/gr-mt-orbit-dep-12` after the guarded push.

Verify run 44405043610 completed successfully on the candidate SHA. [Verify 44405043610](https://github.com/just-every/run-orbit/actions/runs/44405043610)
