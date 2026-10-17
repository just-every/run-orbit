# Orbit verification

Run `rer verify` after `rer install`, with Node 22.20.0 and pnpm 10.12.4.
Stop `dev` and `preview` first. Verification uses temporary state and never
reads or changes the owner's `.wrangler/state`.

The suite has a hard budget of 200 test cases and qualification flows.
`scripts/verification-inventory.mjs` discovers every `.test` and `.spec` file
under `tests/` and `newtests/`, counts nested cases, the `contract()` wrapper and
every parameter loop expansion, and rejects generators it cannot count.
The emitted-worker program and the explicit full-capacity program each count
as one additional qualification flow. Run the inventory directly to inspect
current counts and files:

```sh
node scripts/verification-inventory.mjs
```

`scripts/verification-plan.mjs` is the one plan for local and CI verification.
GitHub Actions runs its shards in parallel, each sized to about ten minutes from
measured CI times, so a push Verify finishes within fifteen minutes; local
`rer verify` runs them all in sequence:

- `source`: source lock, the first-party RER contract and Base provenance,
  boundaries, manifest, build, deployment-spec drift against the emitted
  Worker configuration, and typecheck.
- `core-0` … `core-5`: isolated D1 product flows, including native identity, step-up,
  reviewed imports, erasure, capture, source setup, reviewed outreach,
  provider outcomes, suppression and delegated authority, balanced by file.
- `runtime`: emitted mail ingress and source-stop flows and the browser journeys.
- `rer-operator-desktop`, `rer-operator-phone`, `rer-operator-small-phone`:
  the complete operator route journey at 1440, 390 and 320 pixels, with an
  independent native installation and fixture for each viewport.
- `rer-operator-actions`: phone navigation, modal confirmations, lifecycle,
  timeline editing, suppression, deletion and duplicate merge controls.
- `rer-checkouts`: onboarding, admission and identity through real `rer`
  commands in a fresh checkout.
- `fold-archive-0` … `fold-archive-3`: current native archive, CLI streaming,
  interrupted job recovery and restore rollback.
- `fold-accepted-main`: one immutable accepted-main archive upgrade journey.
- `fold-domain`: first-run setup, collaborator authority (including a Guest's
  See and edit grant at 1440 and 390), published forms, reports, browser
  workflows and restart/upgrade preservation.
- `journeys`: the README install-and-lifecycle clone journey
  (`tests/rer/journey.test.mjs`). It runs on release tags, the nightly
  schedule, release qualification and local `rer verify`, not on every push;
  the routine aggregate then expects every other case.

Every retained test file is discovered and scheduled exactly once. The final
aggregate requires every shard on the current commit, reconciles individual
completion events against runner totals and Playwright collection IDs, and
checks the actual total against the source inventory and budget. Failed,
skipped, focused, missing and duplicate cases fail verification. Evidence is
uploaded even on failure. No product tests run as part of build or deploy.

The October 2026 reduction removed duplicate repository, composition, SDK/socket
and historical-lineage probes. Retained cases keep their assertions. The test
budget prioritizes public HTTP, browser and CLI journeys and high-stakes data,
authentication, erasure, restore and exact reviewed-send boundaries. It does not
claim exhaustive coverage of every contract sentence.

`verification/` contains ignored execution output. A full invocation or standalone
shard starts with an empty output directory, refusing to delete any tracked file.
Save receipts before another invocation. Historical reports and screenshots remain
under [`docs/retained-verification/`](docs/retained-verification/README.md); they are
never current evidence. Actual completion events are written to
`verification/core-results.jsonl`, with the run summary in
`verification/ci-summary.json`.

Contract-name mapping remains available separately with `pnpm run report:contract`.
Its report can identify unmapped or failed clauses; test names alone do not prove
release acceptance. Routine Verify uses execution results and the test budget,
not exhaustive clause-name mapping as a pass gate.

Operator accessibility scans keep script-disabled preview frames in scope. Their
injected audit callbacks use Node's real timers through the browser driver, while
the original iframe DOM and sandbox remain intact. Analyses fail after 45 seconds.

Browser tests use isolated D1 state and the built Worker. They cover native
access, records and settings, sources and unmatched replies, notifications,
stale drafts, exact AI previews, desktop/mobile layouts, keyboard operation and
automated accessibility. The README CLI journey covers setup, native email-link
confirmation, first-run setup before hydration, state custody, reset refusal and
an export/import/export round trip. Today's brief and meeting plans also run
through native and delegated APIs and the browser at 1440 and 390 pixels.

Fixtures and controlled provider responses stay in tests. `rer dev` never seeds
customer records. Local test sessions use `tests/support/test-auth.ts` or Base's
email-link lifecycle; production has no fixture sign-in shortcut. Prior-auth
upgrade coverage keeps operator IDs, access rows and delegation. Test provider
responses do not establish actual provider delivery.

Before release, run the explicit full qualification:

```sh
pnpm run verify:release
```

This runs the routine plan, then the unchanged
`tests/performance/records-capacity.ts` full declared-capacity search, archive
roundtrip and erasure program. It retains its search latency, complete hashes,
foreign-key, D1 observation, revocation and erasure assertions. Fresh capacity
artifacts and actual completion are required. Routine verification records this
qualification as pending. GitHub workflow dispatch with `release` enabled runs
the same command and retains its evidence.

Read [ACCEPTANCE.md](ACCEPTANCE.md) and the handover before interpreting a passing
suite as a release. Hosted installation, real mailbox access, actual customer
mail, hosted restore and owner acceptance require their separate receipts.
`tests/acceptance/hosted-outreach.mjs` sends real mail and requires an explicitly
authorized origin and private provider inputs; it is never an ordinary local test.
