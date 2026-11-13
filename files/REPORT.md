# sd-orbit-c-f178-rebased-ci-triage-1

Read-only CI triage for just-every/run-orbit. No product, contract, documentation, workflow, tests, landing record or clause judgment changed. No product commit, product push, PR, tag, release or production action was made. Report publication is separate from product custody.

## Exact provenance

- Investigated candidate: `67f170efd24378a2f68409218adbd106d36edb93`, branch `cloud/sd-orbit-c-f178-rebase-67f170efd24378a2f68409218adbd106d36edb93`.
- Candidate base and main fetched for this investigation: `2045bd23ba8d05fede4c8663d8e1bb2797ae35da`.
- Candidate commits: `185e05cb0a380850724bad281497790af65033fb` and `67f170efd24378a2f68409218adbd106d36edb93`.
- Investigated Verify: https://github.com/just-every/run-orbit/actions/runs/43334873977. Initial snapshot: completed/failure, attempt 1, exact target SHA.
- Original candidate: `1d07561f208078d5536c5d5ad058abc7c63c04f6`, branch `cloud/sd-orbit-c-f178`; Verify https://github.com/just-every/run-orbit/actions/runs/43303268310 completed/success, attempt 1. This success does not qualify the rebased SHA.
- Original candidate base: `5f92fa76579961950d49c7411f54d5446516a708`.
- Local task branch: `cloud/sd-orbit-c-f178-rebased-ci-triage-1`, created at fetched main. It is a read-only investigation checkout and was not published as a product candidate. The evidence manifest records that local checkout, not a replacement for the investigated SHA.

## Actual failures, before classification

| Shard | Job / attempt / runner | Actual assertion |
| --- | --- | --- |
| batch-4, fold-domain-1 | 131590098446 / 1 / GitHub Actions 1000317508 | `newtests/t096/browser-journeys.test.ts:31:269`: after focusing Collaborator email and pressing Tab, `expect(page.getByLabel('Starts as')).toBeFocused()` expected focused, received inactive, 5000 ms. Locator resolved to `<select name="role" aria-describedby="collaborator-profiles">`. |
| batch-13, operator desktop | 131590098535 / 1 / GitHub Actions 1000317514 | `tests/rer/operator-routes.mjs:29:119`, called by `tests/rer/operator-desktop.test.mjs:7:1`: `expect(page.getByRole('main').getByRole('alert')).toContainText('This contact does not exist.')` received `Record not found.`, 5000 ms. |

The batch-4 registration is the OUT-032 established opt-out upgrade / CAPTURE-010 workspace rules / OUT-017 OUT-023 record mail / FORM-001 / RECORD-016 / FORECAST-001 combined journey. Its failing operation is Team Settings keyboard focus, not dashboard Basis navigation. The batch-13 registration is BASE-PUBLIC-003 T099 native operator routes and expanded data views at 1440px. Its failing operation is missing-contact route recovery, before the later report screen visits.

Both failed steps exited 1 from product assertions. Neither log identifies an apt/mirror/provider/network/port/startup infrastructure error as the cause. Failure excerpts retain the full matcher details and stack. There were 20 product shards: 18 passed and these two failed, plus the dependent Verify aggregate failed. The all-attempt jobs inventory contained only attempt 1: neither product shard had used its permitted retry before this task.

## Candidate causality and limits

The entire candidate diff against main is four files: dashboard `basis.tsx`, dashboard-access-proof.ts, report-disclosure.test.ts, and sources.lock.json. The sole runtime edit imports TanStack Link and replaces the report definition text with a link to `/app/reports/$id`, carrying the tile's saved definition version and period. It adds no global focus behavior, Team Settings element, contact loader or error text. CANDIDATE.diff retains the non-lock diff. Nine implicated source/test files have identical Git blob identities in the original base, original successful candidate, current main and rebased candidate (SOURCE-COMPARISON.json).

**batch-4:** no candidate-caused focus-order change is found. A plausible pre-existing mount race is visible at `src/core/features/operator/ui/settings/team.tsx:18`: the FoldWorkspace containing the form is keyed by `JSON.stringify(settings.data?.operators)`. The settings request is asynchronous. If that key changes after the test has focused the server-rendered input, React remounts the collaborator form and focus can be lost. The test at browser-journeys.test.ts:31 waits for the Collaborators heading, not completion of the settings read. The log records only the select's inactive state, not the actual focused element or mount timing; this mechanism remains a hypothesis until an isolated main/runner reproduction. It is present unchanged on main and the original candidate.

**batch-13:** the source explains the two possible messages without a Basis dependency. `customer-record.tsx:38` reads record detail, settings and contact relationships in Promise.all. `record-api.ts:22` attaches HTTP status to a record-read error; `use-operator-resource.ts:31-32` turns its 404 into the noun-specific route Not found screen. `record-api.ts:40` throws the relationship-read error without status; the missing contact's relationship snapshot throws `Record not found.` (`relationships/snapshot.ts:35`). If that rejection wins, customer-record.tsx:49 displays its raw message and does not enter the route's Not found component. This pre-existing error-handling race matches the observed text. The received alert also lacks the expected recovery link, so a later repair must preserve route recovery rather than merely accepting another string in the test. Runtime reproduction on current main on the same runner remains pending.

**Judgment:** evidence supports pre-existing timing-sensitive behavior, rather than either failure being introduced by REPORT-002 Basis links. There is no candidate line to fix and no basis for spending a sole REPORT-002 FIX round or incrementing its FIX count. This is not proof that current main dynamically fails: byte identity and a plausible source path are static evidence. Retry and same-runner qualification determine the CI next action; exact-SHA red still refuses landing.

## Narrow follow-up, without editing

1. Complete each failed shard's single permitted exact-head retry and inspect its actual outcome; do not rerun full Verify, successful shards or aggregate jobs manually.
2. If batch-4 remains red, run only the combined registration on current main on the same runner. Capture focused element and whether the keyed FoldWorkspace remounted. A separate fv repair could make the settings/bootstrap lifetime stable or wait for its explicit readiness before testing Tab; never replace the keyboard assertion with a direct focus call.
3. If batch-13 remains red, run only `tests/rer/operator-desktop.test.mjs` on current main on the same runner. The narrow product repair to investigate separately is preserving 404 status in relationship reads so the existing route recovery runs, or giving the primary record read deterministic ownership of missing-record recovery. Do not weaken the missing-record text and list-link assertions.
4. The inspected Verify workflow has ubuntu-24.04 hosted jobs, no arbitrary main/test input, no retained interactive runner, and no current-main comparison leg. Its only dispatch input is release. Original hosted runners completed and are not addressable from this VM. Do not dispatch a new Verify or treat a different cloud runner as same-runner proof.

REMOTE-NEEDS-LOCAL: if either shard remains red, the fleet needs an existing runner facility able to run only its named failing test at current main in the same runner environment. The original GitHub-hosted runners (1000317508 and 1000317514) are not accessible here, and this repository exposes no authorized targeted-main comparison entry point. This dependency cannot be supplied by installing tools or running a broad suite in this cloud VM.

## Counts and scope

Clause-status table at the investigated SHA: 42 done, 130 partial, 32 missing (204 total); unchanged after this task. REPORT-002 remains partial. Clause changes: none. New product commits: 0. Product files changed: 0. FIX count added: 0. No generated acceptance/claims view, source lock or judgment was regenerated because this triage edits no source.

## Plan and evidence

PLAN.md records the full bounded investigation plan. GITHUB-CALLS.json records each command invocation and UTC stamp obtained with `date -u`. Run/job JSON, retry receipts, assertion excerpts, SOURCE-COMPARISON.json and target SOURCE-EXCERPTS.txt are actual evidence, not placeholder receipts. Raw full logs were read once per failed job and retained locally outside the public selection; only assertion excerpts are selected for publication to avoid publishing unrelated runtime output. No private held-out gate material, environment dump, credential value or symlink is selected.

The cloud adaptation's REST/ten-call instructions govern over the historical brief's no-API/ci-wait-only wording. The role's read-only/no-product-commit instructions govern over generic builder push/READY scaffolding. No READY or new product PUSHED claim is issued for this triage.

## Retry outcomes and terminal next step

Pending final bounded REST observation. See final RETRY-RESULTS.json and terminal section appended below.

### Retry checkpoint (date -u: 2026-11-13T01:22:12Z)

At 01:13:16Z, `POST actions/jobs/131590098446/rerun` succeeded. The only newly executing shard is batch-4, job **131616367227**, run attempt 2, on GitHub Actions 1000317716. It was still in progress at the 01:22:12Z REST jobs snapshot. GitHub copies retained completed jobs into the newer attempt with new job IDs; their original started_at/completed_at/runner values show they were not re-executed. In particular batch-13's attempt-2 row **131616367423** retains the original 00:13:50Z–00:25:31Z execution and runner 1000317514: it is not a second execution and does not consume batch-13's retry.

The immediate request to retry original batch-13 job 131590098535 returned HTTP 403 with body `The workflow run containing this job is already running`. This is workflow-state serialization, not evidence of a bad credential. The launcher was refreshed and its bundle helper reinstalled as instructed, without logging secrets. Batch-13 must be requested again only after batch-4's run attempt completes. That second API request will still be its first actual shard retry. Eight of ten GitHub command invocations have been used; two remain for the serialized request and final observation. No whole workflow, successful shard, aggregate or dispatch endpoint has been requested.
