# Fold qualification record — release preparation pending

## Current checkpoint — 11 October 2026

The application checkpoint recorded here is private main
`479f0742acc1561c0b2d48d089eee1ef2a2b7634`, tree
`470a7a9525cdd2f7399ee2e2133dc7ec8131ab0d`. The native D1 measurement correction
and public-page withdrawal fix are integrated. This documentation refresh does
not qualify later source bytes.

The exact-head CI run was cancelled at the job's 180-minute wall limit.
There is no complete result, retained log or artifact establishing its failure
phase or cause. It is not green. The queued exact-`479f0742` remote full
verification failed in its own wrapper before any verification command ran
(`mktemp` on a path absent on the runner); it is not evidence either way.

CI now runs the fold qualification (`scripts/verify-fold.mjs`) as a parallel
job beside the native `pnpm verify` gates; local `pnpm verify` still runs every
gate in one command and no test, assertion, fixture or deadline changed. On
branch head `29b74c1` (product, migration and test bytes identical to `479f0742`), a CI run
passed: native job with source, boundary, launch and lifecycle
checks, 209 core and 14 delegation tests, typecheck, all delegation browsers, 54
baseline, 1 archive and 2 solar browser tests, the emitted Worker, full declared
capacity and 86 satisfied / 0 broken contract clauses; fold job 50/50 in 71
minutes. The same fold suite took 52 minutes on the earlier measured Linux run,
which is why the single 180-minute job no longer fit.

Targeted checks on exact `479f0742` passed typecheck, emitted build and the
affected browser journey at widths 1440 and 390: one passing case, 24 axe
receipts with zero SERIOUS/CRITICAL findings, and 10 reports with no page errors
or unexpected console errors. An independent emitted-HTTP check observed
published GET 200, awaited completed withdrawal with HTTP 200, then observed the
first GET return 404. All owned runtimes were closed. These checks establish the
withdrawal flow on those bytes, not a full integrated verification result.

The first public release is a clean-history export of this tree, scanned in full
by the maintained publication scanner before anything is published; the private
development history is not published.

No public release acceptance, deployment, hosted D1 acceptance, provider delivery
or domain/MX/live inbound mail acceptance is claimed. The canonical active
identity is `just-every/orbit` (public source `just-every/run-orbit`). The Base operator-auth plan in
[HANDOVER.md](../../HANDOVER.md) is later work. The owner controls tag
approval and live inbound activation after the domain and MX work.

## Integrated scope and source lineage

The original fold merge `7786ef6` has real parents
`1cc919c0d9b7a30e02e39dca7f2351286fc4c72a` (accepted native main) and
`85f8295a5e22c3ab7f018e7f20fe21e548b2e912` (expansion). The first main integration
was `6efcf2c90176353e6acf7066a5807522e4191411`; `952efa5` was an earlier
checkpoint, not the current head.

The selected expansion adds complete native reports, separately invited
collaborator profiles with record and field access, and fixed public forms and
landing pages. Workflow engines, account graphs, campaigns, forecasts, FX,
experiments, uploads and schema administration remain excluded. Native operators
retain equal full access. See the [fold contract](CONTRACT.md) and
[release notes](RELEASE-NOTES.md).

Applied native migrations 0001–0015 retain exact bytes. Selected adapters
0016–0020 follow that sequence; the 127 original expansion SQL files remain
exact, nonexecuted provenance, not a second executable migration history.
The [migration guide](MIGRATIONS.md), [operation map](migration-operation-map.json),
[path map](path-map.json) and [assertion map](assertion-map.json) record selection
and exclusions. The initial fold checked the 189 protected native paths for
exact bytes and executable mode. Native `CONTRACT.md`, `ACCEPTANCE.md`, package
scripts, dependencies and lockfile were preserved. Verification retains all 23
original commands and adds the mandatory fold runner as stage 24. The approved
edition workflow change increased the whole-job allowance to 180 minutes to
include the added fold stage. Individual flow deadlines and assertions remain
intact except for the explicit native D1 measurement adaptation explained below.

The fold adds 50 cases across 29 files. Zero existing cases were deleted,
skipped or retagged. Existing fixture/assertion adaptations preserve the wanted
flows: native cancellation, positional wide-column snapshot names with exact
byte comparisons, installed migration count, and the native capacity measurement
below. The indexed FTS correction passed the existing 25,000-opportunity timer
case with its original 30-second assertion (2,749 ms, five prepared statements);
its one-off proof added no permanent case.

The urgent contact and inbound-mail fixes preceded the fold. Omitted contact
edits preserve do-not-contact state; API/CSV updates cannot clear it, and only an
explicit operator action can. Normalized email suppression survives delete and
recreate. A signed inbound reply is automatically linked to a contact only when
its sender matches that contact's email address. A valid signed reply without a
match is accepted and retained unlinked. A known provider event ID with a
different payload records a conflict and acknowledges the immutable accepted
event; storage failure returns 503. Signed inbound rate limits use their own
bucket, separate from unsigned traffic.

## Historical integrated verification

Clean-clone `pnpm verify` at
`8e41420beb6f0a1afb4fa08cb935277cde48a5c7` completed normally with exit 0 through
all 24 stages: 209 core, 14 delegation, 57 inherited browser and 50 fold cases;
86 contract clauses satisfied, zero broken. This is full evidence for that
commit, not for the later `479f0742` checkpoint.

CI at `b442` passed core, delegation, capacity and all 86 clauses,
then passed 49 of 50 fold cases. The remaining case issued its first GET before
public-page withdrawal finished. Correction
`79710768db95eb8977f9611ba6cc405f538db1f3` waits for the published link to disappear
after **Unpublish**, then retains the strict first-GET 404 assertion. This does
not relax withdrawal behavior. Its integrated targeted proof is recorded above;
the historical 49/50 run remains failed.

## Native D1 capacity measurement — 10 October

The existing capacity case checks the unchanged 30,000 ms ceiling for every
native query or entire native batch. Earlier CI at `952efa5`
returned archive HTTP 201 after 37,348 ms to response headers and failed the
then-existing HTTP timing assertion. That measured route work and transport in
addition to D1; the native contract specifies no archive HTTP deadline. The
assertion was adapted only after the complete declared-capacity flow passed with
the old HTTP assertion still present. HTTP-to-headers and snapshot
HTTP-through-JSON remain separately reported. Population, query budget,
equality/audit/FK/AI checks, record-query p95 and erasure deadline remain intact.
No native ceiling was weakened; this correction added or removed zero cases.

The test-only wrapper forwards real emitted Worker/D1 invocations. A local Node
`hrtime` witness acknowledges each native start and receives its end after
settlement, producing conservative wall upper bounds including witness delivery.
The pinned Worker's clock could not supply this monotonic proof. Every invocation
requires a complete process/call pair even where stream request scope is unknown.
Witness connections close after each exchange. A disposable real-D1 probe
reproduced a missing end acknowledgement after an idle socket timeout; separate
witness connections completed the same three-call fixture.

A clean remote run at
`4712acbf4a62901e67be6b1dcb1cf5e46867b961`, Node 26.8.1, passed typecheck, emitted
build and the complete capacity case in 4,750.605 command seconds. All 337,508
native brackets were finite and complete, including 155 unscoped calls on each
side. All four Workers and the witness closed; no calls, requests or clock
brackets were pending and no observation errors remained. Raw observations were
reconciled, copied and hash checked before the owned clone was removed.

| Native wall upper bounds | Source | Restored |
| --- | ---: | ---: |
| Entire batch maximum | 8,777.776417 ms | 5,226.452875 ms |
| Query maximum | 3,237.911 ms | 4,871.968 ms |
| Atomic snapshot batch | 4,392.159 ms | 5,154.678 ms |

The archive contained 6,300,013 rows, 6,324 parts and 1,815,745,992 bytes. Restore
retained exact domain hashes with one additional restore audit; foreign keys and
AI usage passed. Snapshot HTTP-through-JSON times were 12,976.766 / 17,285.453 ms;
maximum HTTP-to-headers was 17,285.225 ms. Record-query p95 was below 32 ms.
Contact erasure completed in 8,837.817 ms and the next read returned 404.
All complete native calls stayed below 30 seconds. This qualifies declared
capacity on the named local emitted Worker/D1 runtime, not hosted quotas or later
source bytes.

## Earlier failures and focused evidence

Earlier failed observations remain failed evidence, including unsupported
page-count PRAGMAs, a missing native NOT NULL band in the 25,000-row fixture,
type errors, field-search failure, and emitted Worker readiness failure after
full-population calculation/persistence/reopen checks. Supported `size_after`
metadata and a shared transactional reservation ledger replaced the unsupported
planning path. The population was not reduced to fix the fixture.

The small restart proof reproduced HTTPS `ECONNRESET`: its fixture certificate
named `127.0.0.1` while the listener defaulted to `localhost`. Matching the bind
address preserved TLS verification, dependencies, TMP and deadlines. Both emitted
restart cycles then passed and both processes closed. A later targeted run passed
18 report/role/form cases across nine files, including the real 25,000-row report
and emitted HTTPS restart/export/drilldown flow. `archive-native-03` subsequently
passed the 100-column/BLOB roundtrip and tamper/rollback cleanup cases. Those
focused receipts alone did not qualify later archive-layout, acknowledgement,
view-inventory, cleanup and CLI changes; the full `8e41420` receipt above is the
later integrated evidence.

The first resumed remote full run was interrupted during core tests. Its three
observed failures were corrected and the focused cases passed. A subsequent run
stopped progressing at the existing opportunity timer; the indexed FTS correction
and its original timer assertion passed as recorded above. Neither incomplete
run is a full pass.

Earlier capacity observations with missing scope, a negative Worker-clock delta
(`c73fb37`) or a missing witness end (`f27a83a`) remain failed. The narrow socket
probe does not establish the unrecorded cause of the earlier full-run failure.
The old 37,348 ms HTTP result remains a failed historical assertion. No earlier
pass is used to claim that a future SHA is qualified.

Release preparation still requires the pending exact-head full result, green
exact-head CI and resolution of the maintained publication findings under the
owner's policy. This record grants no hygiene exceptions, history edits,
credential rotation, public push, tag, deployment, visibility change or live
provider activation.

The public demo method was subsequently replaced under the current PUBLIC-002
contract with a separate read-only story. The original assertion/path inventories
above describe the fold snapshot: their hosted-demo and public-demo entries are
historical, not current runnable acceptance. The obsolete hosted-demo creation
runner is removed; current privacy and relative-date checks live in
`tests/core/public-demo.test.ts`, with responsive browser acceptance in
`tests/rer/onboarding.test.mjs`. Preserved source copies remain unchanged. Native
authority and customer-sending requirements are unaffected.
