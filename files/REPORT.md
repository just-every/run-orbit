# sd-orbit-c-f107 results

Repository: just-every/run-orbit
Product branch: cloud/sd-orbit-c-f107
Candidate: 43f780b29be14a6a55ef5453389ed5fba8ac00f3
Fresh-main base: 74f72f01ad3532725c71bd0832a774abd2c5a6ec
Predecessor: 23c6952bb233bb9ccf15b7dee46b2f353c87d482

DATA-002 remains PARTIAL to PARTIAL. Counts remain 36 DONE, 136 PARTIAL, 32 MISSING, 204 total. No hold, prerequisite, clause acceptance sentence, judgment, Status rank or plan queue entry changed. Only DATA-002's Evidence cell records the additional proof; its complete prior Gap is retained byte for byte. No DONE or release award is requested.

## Work completed

Rebased the refused predecessor's single unfinished commit onto fresh main, preserving every newer main commit. CONTRACT.md and the assistance test merged cleanly; the conflicting source lock was restored from main and regenerated with the documented command. A final fetch and rebase confirmed the same main base before the product push. No published history was rewritten.

Extended the existing registration in `tests/core/assistance.test.ts`, lines 164 to 210, named “AI-001 DATA-002 changed or deleted preview context never leaves deployment.” It preserves the pre-existing changed-context refusal and adds:

- A real linked recipient exists through authenticated Records before erasure; an unused draft preview contains that recipient and is durably bound to its identity (lines 173 to 182).
- Confirmed authenticated Records deletion succeeds; fresh authenticated read returns 404, and fresh database reads find neither the contact nor the saved preview (lines 183 to 191).
- The original saved preview ID is submitted to the native generate route and returns 409. The provider edge receives zero calls. Complete post-erasure AI-call, draft and recommendation inventories remain unchanged, including explanation fields; authenticated draft readback remains empty (lines 192 to 209).

Inspected `src/core/features/assistance/routes.ts` and `src/core/features/records/data.ts`: existing erasure removes recipient-bound previews, and generation refuses an unavailable saved preview before contacting the provider. The public-door probe demonstrated no runtime defect, so no runtime source was changed. The existing first assistance journey also proves the allowed case: an intact preview sends exactly its saved input, generates a cited durable unsent draft and records usage. The extended case therefore covers refusal beside a working supported generation path.

PROBE DATA-002 acceptance-point-2 saved-preview erasure: authenticated preview creation -> 200 and recipient binding; confirmed authenticated Records contact deletion -> 200; fresh contact read -> 404 and saved-preview read -> absent; original preview ID submitted to generation -> 409, zero provider calls, unchanged post-erasure AI-call, draft and recommendation inventories, empty authenticated draft list.

## Validation

All commands ran on the exact committed candidate above; final fetch and rebase made no change to that head. Actual logs and structured command receipts accompany this report.

- `pnpm exec tsx --test --test-concurrency=1 tests/core/assistance.test.ts`: exit 0; six cases pass, zero failures or skips, duration 62634.269818 ms. The selected registration passed in 6806.980984 ms.
- `pnpm run typecheck`: exit 0.
- `pnpm exec rer check --profile first-party`: exit 0.
- Contract generator write then check: both exit 0. Generated views were restored whole from origin/main before publication; neither view was committed.
- Edition-authoring source lock regenerated last; its check exits 0 with `ok: true`.
- `git diff origin/main --check`: exit 0.
- Source inventory: 198 registrations plus two qualifications before and after, 200 total. No registration added or removed, and no existing assertion removed, narrowed, skipped or hidden behind a condition.
- All 204 parent Status rows retained. Candidate author and committer are the fleet identity, with no trailers. No new email-shaped fixture value or provider credential was added.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0, generated views restored from origin/main; ledger=none exit=0 (no migration edit).

The existing push Verify plan automatically loads the changed assistance file in core-7. No workflow edit, dispatch, rerun, PR, UI change, browser journey, live provider call or deployment was needed. The toolchain shim selected Node 24.19.0 and pinned pnpm 10.12.4; the repository Node pin remains 22.20.0. No dependency or Base pin changed.

## Remaining scope and riders

The selected preview point is closed by local native proof. The combined DATA-002 acceptance outcome is still unproved: future-mail absence; five-minute qualification across aliases, imported and captured evidence, notes, drafts, transfer copies, search, export and replay; company and deal Slack redaction and all tracked deletion outcomes. Existing component, anonymous-audit and contact-Slack proofs remain present and unmodified. Copies already held outside Slack cannot be recalled. NOTIFY-003, live Slack and other provider qualification, TEAM-005's contract-cleanup and new-main qualification prerequisite, and all pre-existing queue notes and release prerequisites remain unchanged.

DONE-RIDERS disposition, without a DONE claim:

1. Full clause coverage remains incomplete; only the selected saved-preview outcome is newly proven.
2. Selected unsafe path is refused without effects; existing allowed-generation case passes on populated data.
3. Local exact-candidate suite passes; exact-SHA push Verify is separately recorded in the CI receipt.
4. Evidence is from this candidate; no relevant byte changed after its focused run.
5. DATA-002's existing Base citations remain unchanged; no inherited duty is awarded.
6. Existing Gap and provenance retained; Evidence extended; generator write and check pass locally and generated views are intentionally restored for the lander.
7. No acceptance text or ruling changed; no original obligation was removed.
8. The selected deletion uses native authenticated confirmed Records authority. Broader permission qualification is unclaimed.
9. No live provider or legal boundary is represented as proven; all held qualification remains held.
10. No new policy default or ruling was needed or introduced.
11. Landing, exact-main equality, publication scanning and candidate Run site are fleet duties and remain unclaimed.

Pre-READY self-check: selected behavior has direct public-door assertions; no assertion was weakened; native erasure cannot submit the withdrawn preview; no UI was touched; source lock is fresh. The cloud has not run the fleet publication scanner and claims no COMPLETE scan, main landing or candidate Run site result. No mutation was executed and no mutation receipt is claimed.

## Custody

Product push succeeded on the first guarded attempt. No default branch was pushed. No product blocker was demonstrated. The complete non-secret packet stays outside the product branch and is transported only on evidence/sd-orbit-c-f107. The plan is in PLAN.md; receipts.json binds local checks and the probe to the full candidate SHA. CI observation is recorded in ci-discovery.json and subsequent final CI receipt. The fleet still owns publication scanning, exact-SHA CI gates and landing.

Plan rows to relay: DATA-002 selected acceptance-point-2 saved-preview deficit closed locally; PARTIAL unchanged; counts unchanged; all holds unchanged. No other plan row changed.

The separate check on the exact committed, restored-view tree exits 1: ACCEPTANCE.md: generated content differs; run contract-docs write.. The generator write and check sequence passed before restoration, as required; this expected stale generated view is for the lander to write.

## Final CI observation

Exact-SHA push Verify 42212148603 completed with conclusion failure. Failed source job 127873315779 ran `node scripts/verification-shard.mjs source`; its first gate `pnpm exec node src/base/contract-docs.mjs check` stopped with “ACCEPTANCE.md: generated content differs; run contract-docs write.” Runtime shards skipped. Source-artifact retention and aggregate verify job 127873552451 consequently failed because the source build and product evidence were absent. Both failed-job archives were read once successfully with the prescribed `gh run view` command. Environment listings are omitted from selected log receipts; assertion and artifact diagnostics are retained.

This is solely the documented generated-view exception, so it permits the READY handoff. It is not a full-green runtime receipt and awards no DONE. There was no CI repair, dispatch or rerun. Six of ten allowed GitHub calls were used; discovery and status polling were separated by at least 300 seconds. Main base already has successful push Verify 42205006070 and Run site 42208022677; these are base receipts and are not claimed for the candidate.

No real product blocker was demonstrated. The fleet lander must generate the views and obtain its own exact-final successful CI, COMPLETE full-history publication scan and landing receipts. The branch has only CONTRACT.md, the extended assistance test and the regenerated source lock; reports stay on the separate evidence ref.
