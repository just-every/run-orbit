# Orbit verification

Run `node scripts/rer.mjs verify` (or `pnpm run verify`) after
`node scripts/rer.mjs install`, with Node 22.20.0 and pnpm 10.12.4. Stop `dev` and
`preview` first. Every gate uses a temporary D1 state directory; verification never
reads or changes the owner's `.wrangler/state`.

The command checks the source lock, the seed command contract and every copied Base
byte (`rer check --profile first-party`), boundaries and manifests, runs isolated real D1 tests,
builds and typechecks TanStack Start, executes shared component and deployment
tests, runs the emitted Worker in Chromium, verifies production transport, and
runs the README journey through the public rer commands in a fresh checkout
(`tests/rer/journey.test.mjs`: setup, dev opening signed in, the one end-to-end
email-link sign-in through the outbox, `/setup` before hydration at 1440 and 390
pixels, keyless and remote-host outbox refusal, reset refusal while
active, confirmed reset, corrupt-archive refusal and a complete
export/import/export round trip), and retains the real non-scale archive, restoration, erasure and suppression proofs.
Full declared customer-record capacity is a separate required release qualification. Result-bearing Node and
Playwright reporters build `verification/contract-results.json`. Unmapped,
failed and skipped clauses block the gate. Routine reports explicitly mark clauses
with the full-capacity obligation pending; mapped assertions still require
semantic review against every retained obligation.

`verification/` is ignored execution output. Full routine/release invocations and
standalone shard/fold commands start with an empty output directory; save any
receipts you need before starting another command. No old local, capacity or
external receipt is carried into a new verification invocation. Previously tracked
reports and screenshots are retained byte-for-byte in
[`docs/retained-verification/`](docs/retained-verification/README.md), outside every
producer's output path. Those historical snapshots are never current evidence.
The reset refuses a tracked file in `verification/` before deleting anything.
Reporters and the unchanged full-capacity producer write only generated outputs;
the source lock and Base's tracked-source guard remain enforced.

The core suites exercise record lifecycle, exact identity and merge safety,
operator removal and erasure, archive equivalence, migration rollback and
recovery, signed ingestion and held identities, score evidence and replacement,
quiet hours and stop rules, bounded retries and durable quota failures, provider
signatures and threading, unknown-delivery reconciliation without resending,
notification ownership and replay, and exact AI previews with validated output
and token accounting. Fixtures and controlled provider outcomes exist only in
test suites; they are not evidence of actual provider delivery.

Browser tests use a fresh isolated D1 and the built production Worker. They cover
native access boundaries, records and settings, source and unmatched reply
review, notifications, evidence and stale-draft review, exact AI previews,
desktop/mobile layout, keyboard labels and automated accessibility. Screenshots
are written under `verification/ui`. The production Worker proof additionally
checks document/API/function authorization, client/server boundaries, asset
handling and browser navigation.

`rer dev` serves the owner's own data and never seeds customer records. Test suites
prepare their isolated state with `tests/support/prepare-state.ts`, which loads
`tests/fixtures`; those imports are absent from the production Worker. Local tests
write sessions through `tests/support/test-auth.ts` or sign in through Base's real
email-link lifecycle (`tests/support/email-link.ts`). Production has no fixture
login shortcut; local dev sign-in exists only behind the checkout's dev key, and
hosted acceptance must consume an actual emailed link rather than insert a
session. `tests/core/prior-auth-upgrade.test.ts` upgrades a store captured from
the pre-Base main (`tests/fixtures/prior-auth`).

Deployment and transfer command tests use process fixtures and make no cloud or mail calls; `deploy --dry-run` validates the packaged Worker without a provider request.
Actual installation, native email access, observed SMTP content and headers,
signed reply and unsubscribe outcomes, repeat deployment, fresh hosted restore,
and customized-fork updates have separate immutable receipts. The bounded
`tests/acceptance/hosted-outreach.mjs` runner requires an explicitly authorized
origin, private provider configuration, actual native browser storage state and
the test-owned mailbox receiver client; it sends real mail and must not be run
as an ordinary local test. Never commit those private inputs.

Read [ACCEPTANCE.md](ACCEPTANCE.md) and the current handover before interpreting
results as release acceptance. PUBLIC-002 is covered by
`tests/core/public-demo.test.ts` and the native first-hour browser journey in
`tests/rer/onboarding.test.mjs`: the separate story contains twelve relative-date
deals, cannot select owner records or mutate the installation, and renders at
1440 and 390 pixels with no serious or critical axe findings. The obsolete
hosted-record demo creation/preview runner was removed when this behavior was
replaced. This local demo evidence does not certify hosted deployment or customer
mail delivery.

## Routine CI and required release qualification

Routine `rer verify` runs every routine shard sequentially on one computer, with
isolated state per shard. GitHub's `shards` matrix gives the same complete-file
plan independent runners: three native core groups (one also runs delegation),
source checks, production runtime/browser/CLI proofs, fold archive and fold domain
proofs, and the two immutable lineage cases. Every runner executes test files
serially. The final required `verify` job checks each planned stage, current Git
commit, whole-file event coverage, actual passed test events reconciled with runner
terminal totals (and Playwright collection IDs), and absence of
failed/skipped or duplicate executions. Core, fold, component and public rer
journey files are discovered from source rather than a pinned file list. Every `tests/rer/**/*.test.mjs` journey is retained, including
admission and future onboarding, operator and import journeys when merged. The
plan checks the complete source file inventory for omissions or duplicate
scheduling; the aggregate requires passed events from the responsible stage,
including every configured browser file, and rejects unexpected file events.
Component tests keep their original source environment and now also emit actual
completion events. Node focus diagnostics fail verification; browser gates retain
`--forbid-only`. Missing individual completions or terminal summaries fail the
shard and aggregate, even when another test in the same file passed. A missing or failed shard
blocks the aggregate. Evidence is uploaded even on failure.

Before release, run the explicit complete qualification:

```sh
pnpm run verify:release
```

Stop dev/preview first. This command runs every routine stage, including build,
then the unchanged `tests/performance/records-capacity.ts` full 6.3-million-row
fixture and archive roundtrip, using `test:capacity`. Its search p95, full hashes,
foreign keys, D1 clock witness, revocation and erasure assertions retain their
original values. Only this scale case moved out of routine verification; no
non-scale data, auth, isolation or restore proof moved. The bundled Base release
producer already invokes a declared `verify:release` after routine verification
and fails release if it fails; no copied Base byte changed. GitHub workflow
Dispatch with `release` enabled runs this same complete command and retains its
fresh capacity receipt, native D1 summary and observation stream from that
capacity invocation; a passed exit code alone cannot qualify release. Both commands
leave retained source evidence untouched, so the producer's routine-then-release
sequence can use the same checkout without replacing or restoring source receipts.
Runtime confirmation of that sequence, actual reporter rejection probes and after
timing are still pending; [the prepared checks](docs/verification-runtime-checks.md)
describe the remaining evidence. Routine success is never full-capacity or release acceptance.

The observed CI run before this change, at 19b45b8, took: native product verification
155m01s (capacity 100m49s, core 34m06s), fold qualification 73m37s. The new routine
wall is unmeasured until the actual exact-commit CI run; parallel runners change
scheduling, not the semantic workload. Immutable lineage's two tests now register
in separate files and share the unchanged assertion body in
`newtests/t096/archive-lineage-proof.ts`. No assertions or tests were deleted.
