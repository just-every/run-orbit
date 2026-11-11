# Orbit saved-form compile result

Repository: just-every/run-orbit
Branch: cloud/main-orbit-forms-compile-1
Product head: af353b77aff81014ae7f7ac054ee71532cf350e7
Base main: 89c84362bbc010156bc30081d8a530704a9533e2
PR: none; this brief uses the fleet branch landing contract.
Verify: 43011685796 — success — https://github.com/just-every/run-orbit/actions/runs/43011685796

## Result

Settings > Forms now keeps a **Compile form** action beside each saved form's Edit, Reopen and submission actions. It remains available immediately after saving and after a reload. The action selects that form's stored ID, revision and content hash, restores the same saved definition used by Edit, resets prior publication review state, and focuses the existing Public path field. The existing **Compile saved revision** submission then compiles that exact saved revision. Approval and publication continue through the existing routes and controls.

Only `src/core/features/forms/console.tsx`, the existing `newtests/t096/browser-form-mapping.ts` journey and `sources.lock.json` changed. There are no backend, builder, publication-policy, contract-source or generated-view changes.

## Plan and completion

1. Prepared the authorized shallow Orbit clone with fleet global/local identity, preserved repository hooks, the co-author cleanup hook and the prescribed cloud toolchain. Ran native install and setup as fleet@runeditrun.com.
2. Reproduced the original failure before changing code: saving showed Compile saved revision, reloading removed it, and Edit saved form revealed it. Entered through the checkout's native RER_OPEN sign-in and Settings > Forms. Before screenshots are retained at 1440 and 390.
3. Added the saved-row Compile form action and reused one saved-definition loader for Edit and Compile. The action opens the existing publication options; it does not publish or bypass exact-content review.
4. Extended the existing mapped-forms journey without adding a registration. It saves through the UI, reloads, selects the saved row's compile action without Edit, compiles, checks the submitted form ID and saved revision and its exact preview, then continues the existing approval/publication and mapped hosted, framed and direct HTTPS submission checks. New behavior assertions target 1440; the existing journey and changed-screen proof also render at 390.
5. Ran the focused existing `formMappingBrowserJourney` with its native fixture, real emitted Worker, D1 and separate allowlisted HTTPS buyer site. It passed. Typecheck, build, source-lock validation, contract-doc validation, test inventory and whitespace checks passed. All checked product bytes match the committed candidate. Browser proof at 1440 and 390 confirms compilation and that publication remains disabled until approval. Screenshots were visually inspected.
6. Fetched main and rebased with the fleet identity before publication; main had not moved. Regenerated and checked the source lock last. Committed once without a skip marker; audited every candidate author, committer and trailer including side parents. The guarded push succeeded on its first attempt. The checkout is clean.
7. Started one REST watcher for exact-SHA Verify, using a minimum 300-second interval and a ten-call budget. Current result: success, run 43011685796, calls used 6. The report/receipt/screens packet is returned only through evidence/main-orbit-forms-compile-1. The fleet Mac retains its independent publication scan and landing gates.

## Actual local checks

- `pnpm run typecheck`: exit 0.
- `cloud_run npx -y @runeditrun/rer build`: exit 0.
- `cloud_run pnpm exec tsx /tmp/orbit-forms-journey.mts`: exit 0; invokes the existing mapped forms journey directly, with the fixture normally used by `newtests/t096/browser-journeys.test.ts`. The full composite registration was left to branch Verify.
- Public-door reproduction: confirmed the baseline gap; the initial harness's local CLI endpoint returned 404 behind the dev proxy, so it was corrected to the documented RER_OPEN door before reproducing.
- Candidate public-door proof: passed; saved revision 1 compiled with HTTP 200, exact preview visible, explicit approval still required, no horizontal overflow at either proof width.
- `node src/base/contract-docs.mjs check`: exit 0; generated documents are current.
- `node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock`, then `check`: exit 0, lock current.
- `node scripts/verification-inventory.mjs`: exit 0, 198 registered cases + 2 qualifications = 200, before and after.
- `git diff --check`: exit 0.
- Candidate identity/trailer audit: all one candidate commit passed; no co-author trailer.
- Chromium: /usr/bin/chromium with --no-sandbox. Browser sessions and only the owned servers were closed.

## Counts and clause scope

Tests: **200 -> 200** (198 registered cases + 2 qualification flows).
Contract source status-table counts: **42 done / 130 partial / 32 missing -> unchanged**.
FORM-001: **partial -> partial**. No Status, Gap, Evidence or summary-count cell was edited. No DONE claim is made.

CLAIM FORM-001 PARTIAL points=1,2 tests=newtests/t096/browser-form-mapping.ts#formMappingBrowserJourney

The existing journey proves mapped fields, exact publication review and hosted/framed/direct buyer-site intake while adding save/reload/compile continuity. This focused repair makes no claim about the other stranger findings or completion of the entire product contract.

## Custody and limitations

Product branch push succeeded: af353b77aff81014ae7f7ac054ee71532cf350e7. Exact-SHA Verify result: success. Evidence transport is separate from product READY/landing. No product evidence, screenshots, receipts or proof files were committed. No main/default branch push, force push, deployment or PR write occurred. The fleet Mac's publication scan and final landing checks remain with the fleet, as required by the cloud brief.

The retained receipts are `local-checks.json`, `product-provenance.json`, `product-push.txt`, `ci-receipt.json`, `reproduction.json`, `browser-proof.json` and `forms-journey/receipt.json`. The complete plan is also in `PLAN.md`; screen and accessibility results are beside those receipts. No local product blocker is known.
