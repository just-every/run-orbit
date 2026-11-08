# sd-orbit-c-f142 results

Repository: https://github.com/just-every/run-orbit
Branch: `cloud/sd-orbit-c-f142`
Candidate: `ae5c8f3fcf701c704938bc9a669d9e72c1509e1e`
Main observed before publication: `6d869cb48cbd6bcebb1566be460b49223e892bb6`

OUT-026 remains PARTIAL. The requested provider-throttle next-permitted-time limb of acceptance 2 passes on the explicitly pinned starting commit. That commit already contains the focused helper and its existing registration; this continuation required no additional product edit or commit. No defect was demonstrated in the service, history repository or Workbench routes. The existing bounded-attempt assertions and separate OUT-018 accounting scope remain intact.

Before and after counts: 36 DONE, 136 PARTIAL, 32 MISSING, 204 total. The test inventory remains 198 registrations plus two qualifications, total 200. No assertion was deleted, narrowed, skipped or moved under a new condition. No clause text, Status, Gap, Evidence, generated view, policy default, plan hold or release prerequisite changed.

## Plan and execution

1. Set fleet identity, refresh the fleet launcher, install the bundle-backed Git helper and publication hooks, then make the required fresh full-history clone.
2. Fetch the named predecessor and start the named branch at the exact requested commit. Read the full OUT-026 clause, its Status Gap, the inline campaign and rulings, DONE riders, and the existing registration and helper. Map the selected limb separately from the broader unproved acceptance.
3. Inspect `src/core/features/outreach/service.ts`, `src/core/features/workbench/outreach-repository.ts` and `src/core/features/workbench/routes.ts`, including the production SendGrid adapter and native authentication used by the fixture.
4. Run the complete touched test file and typecheck. Correct only a demonstrated defect. The existing focused helper already performs every selected outcome and passes; no correction or duplicate test is warranted.
5. Fetch main and run the required rebase. It is a no-op: this branch is already based on main and the candidate remains the supplied commit. Run generator write and check, restore both generated views from main, regenerate the source lock last and check it. All pass without tracked changes. Run first-party checks and recount the test inventory.
6. Inspect every candidate commit, including side parents, for author, committer and trailer compliance. Confirm CONTRACT.md has no diff and the added helper contains no literal address fixture. Push only the named product branch with the cloud guard. No default branch push, PR or workflow change is made.
7. Discover exact-SHA Verify runs by REST once. Return actual results through the dedicated evidence ref, retain the packet outside the clone and remove the disposable checkout after both publications are verified. The maintained fleet owns the publication scan, green Verify, landing, main equality and Run site gates.

## Public-door probe

`tests/core/outreach-limits.test.ts` registration “OUT-006 BASE-OPS-004 transient rate limits stop after five attempts within one hour and notify once” invokes `assertProviderRetryTiming` from `tests/support/outreach-retry-timing.ts`. This keeps the independent budget registration unchanged and adds no registration.

- Native authenticated Workbench creates and reads exact saved content, then approves its saved revision. No submission occurs before approval.
- Only the configured production SendGrid HTTP edge returns 429. The native approval response is 502 with a scheduled state, never accepted. The wire envelope has exactly one To recipient and the saved subject and body.
- A fresh authenticated history read returns that same message identity, draft and revision, a visible SendGrid rate-limit reason, no provider receipt or acceptance time, and a future `retryAfter`.
- Dispatch at the freshly returned time minus one millisecond makes no additional HTTP submission and leaves the same unsent history row unchanged.
- Dispatch at the returned time makes exactly one additional submission. Its envelope and durable identity equal the approved first attempt. A fresh history read shows the same message accepted with the provider receipt and the acceptance timestamp; no extra message is created.
- Repeated dispatch at that instant and a minute later never sends the accepted message again. Unauthenticated history is refused with 401.

PROBE OUT-026 2: authenticated Workbench exact-content approval -> SendGrid HTTP 429 -> fresh history retryAfter=2030-01-08T10:01:00.000Z -> dispatch 2030-01-08T10:00:59.999Z keeps one submission -> dispatch 2030-01-08T10:01:00.000Z accepts once with receipt synthetic-orbit-4 on the same message. Later dispatches remain at two total submissions.

Actual message identity: `01Q40FF2802HZEAKMJNSPD64BG`.
Actual submission times: `2030-01-08T10:00:00.000Z`, `2030-01-08T10:01:00.000Z`.
The clock is fixed; no wall-clock date boundary is used. This is native retry-boundary proof with a network-edge fake, not measured 25-user latency or real-provider qualification.

## Acceptance and inherited-duty matrix

Frozen scope for this continuation: R1 exact reviewed native content; R2 provider edge 429 with visible unsent reason and future time; R3 no submission immediately before that returned time; R4 one acceptance at that time with same identity and receipt; R5 no duplicate later submission; R6 preserve existing bounded attempts and independent accounting. These are all locally MET. Exact-SHA recorded Verify is pending.

| Item | Result and evidence |
| --- | --- |
| Acceptance 1: measured submission latencies at declared 25-user capacity before removing estimate | UNPROVED, held remainder. No load journey is claimed. `seed.json` still says `estimated-until-load-tested`. |
| Acceptance 2: visible unsent reasons, values and times across all named limits | PARTIAL. Provider-time limb locally PASS: `tests/support/outreach-retry-timing.ts:42` through line 101, invoked by `tests/core/outreach-limits.test.ts:17`. Exact-SHA push Verify 42480801299 is in progress. Numeric provider-limit value, complete throttle qualification, sequence budget and mailbox pace remain unproved. Existing one-to-one and shared-rate assertions in `tests/core/outreach-limits.test.ts:30` through line 43 pass. |
| Acceptance 3: own usage and administrator every user and mailbox under complete 12-user morning | PARTIAL. Existing native budget registration at `tests/core/outreach-limits.test.ts:20` passes, including user isolation and current administrator visibility. Full morning and mailbox usage remain unproved. |
| BASE-MAIL-001 truthful mail outcomes | Selected limb locally PASS. Helper lines 50 to 73 show no receipt on throttle; lines 80 to 101 show same-message acceptance with actual network-edge receipt. Broader provider qualification remains unclaimed. |
| BASE-ROLE-001 authority through doors | Selected history door locally PASS, helper lines 29 to 39 and 74: real native session reads history; no session is refused. Broader role qualification and TEAM-005 prerequisites remain unchanged. |
| BASE-OPS-003 idempotency | Selected retry limb locally PASS, helper lines 85 to 101: exact same envelope, unchanged identity set and no later resubmission. Broader transport and sequence duties remain unclaimed. |
| OUT-010 visible unsent state | Selected limb locally PASS, helper lines 59 to 79: fresh same-message history has scheduled state, reason, null receipt and future time; early dispatch changes nothing. Existing limit tests retain their scope. |

## DONE riders

No DONE award is requested. Each row is assessed honestly for the exact candidate.

| Row | Result | Evidence or remaining limitation |
| --- | --- | --- |
| 1 | PARTIAL | Selected native sanity journey reaches every requested retry outcome, helper lines 42 to 101; full OUT-026 acceptance 1, remaining acceptance 2 and full acceptance 3 are unproved. Verify 42480801299 pending. |
| 2 | PASS for selected limb | Real migrated D1 data and native routes, helper lines 43 to 101; throttle and early dispatch show no acceptance or extra submission, due dispatch serves supported case. No synthetic route or service substitute. |
| 3 | PENDING | Existing push Verify inventory schedules this registration through the core test glob. Exact-SHA push run 42480801299 is in progress, conclusion null. No green claim. |
| 4 | PASS locally | All local touched checks ran on ae5c8f3fcf701c704938bc9a669d9e72c1509e1e; rebase, generation and lock regeneration changed no tracked byte. |
| 5 | PASS by inspection | OUT-026 explicitly cites BASE-MAIL-001, BASE-ROLE-001 and BASE-OPS-003 in its meta line. No inherited duty was removed. |
| 6 | PASS mechanical; judgment untouched | Generator write and check exit 0, then main's generated views restored. Original full Status Gap, Evidence and counts preserved. No invented judgment provenance. |
| 7 | PASS | CONTRACT.md is byte-identical to main. No acceptance rewrite or added point. |
| 8 | PASS for selected authority boundary | Authenticated history succeeds and unauthenticated history is refused, helper lines 29 to 39 and 74. No new authority verb or weaker permission introduced. Broader revoked-authority qualification is outside this narrow continuation and unchanged. |
| 9 | PASS boundary retained | Only SendGrid HTTP network edge is replaced; no live-provider qualification, legal guarantee, mailbox qualification or numeric quota is claimed. |
| 10 | NOT APPLICABLE | No policy choice or new default. No hold release. |
| 11 | PENDING fleet landing | Candidate remains branch-only. Main observed 6d869cb48cbd6bcebb1566be460b49223e892bb6, which is not candidate. Full-history scan, exact-SHA green Verify and Run site remain with maintained fleet. |

## Checks and pre-ready self-check

- Touched test file: 3 passed, 0 failed, 0 skipped, exit 0. Log: `outreach-limits.log`.
- Typecheck: exit 0. Log: `typecheck.log`.
- `npx -y @runeditrun/rer check --profile first-party`: exit 0. Log: `first-party.log`.
- Contract generator write and check: both exit 0. Logs: `views-write.log`, `views-check.log`. Both generated view files restored whole from main; neither is committed by this run.
- Source lock regeneration and integrity check: both exit 0; regeneration produces no diff. Logs: `lock.log`, `lock-check.log`; concise integrity receipt: `lock-summary.json`.
- No migration changed, so migration-ledger check is not applicable.
- Existing bounded five-attempt assertion, terminal failure and single notification remain; all pass. Independent OUT-018 user budgets remain unchanged and pass.
- Public behavior coverage is established locally for the selected limb. The complete clause remains PARTIAL; no full behavioral award or exact-SHA CI success is asserted.
- No existing assertion removed or weakened. No erasure, capture replay or credential-authority implementation changed; no new exposure or resurrection path was introduced. Retry replay is asserted through the same accepted identity.
- No UI source or screen changed, so no tooltip, text-size or viewport work is introduced in this HTTP-only proof continuation.
- All candidate authors and committers are fleet identity; no trailers. Only the added focused helper and registration plus their generated lock differ from main. Added fixture addresses are constructed rather than literal email strings. Fleet metadata uses only the explicitly allowed fleet identity.
- Publication scan: commit=ae5c8f3fcf701c704938bc9a669d9e72c1509e1e complete=unestablished historyScanned=unestablished findings=unestablished. NOT RUN in cloud; the maintained fleet must run the required complete full-history scan. No zero-findings claim.
- Main equality: false at observation. Run site run id: none on this candidate. No landing or count award claimed.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0.

## Publication and CI

Product guard push succeeded on first attempt to `refs/heads/cloud/sd-orbit-c-f142`. Exact product commit remains ae5c8f3fcf701c704938bc9a669d9e72c1509e1e, the same complete proof supplied as this round's starting point. No no-op commit was created merely to trigger CI.

Exact-SHA Verify: 42480801299, push event, branch cloud/sd-orbit-c-f142, observed in progress at 2026-11-08T12:33:30Z, conclusion null.
https://github.com/just-every/run-orbit/actions/runs/42480801299

The same SHA also has predecessor branch Verify 42479341040, push event, observed in progress. No failed-job repair, dispatch, rerun or duplicate watcher was started. No PR required: the branch push already starts Verify. Actual REST response is in `ci-runs.json`.

No full acceptance point is newly closed: only the selected limb of acceptance 2 is proven. `points=none` therefore avoids claiming the entire acceptance sentence. Existing demonstrated parts of acceptance 2 and usage remain historical scope, with no widening of this continuation.

Plan row change for relay only: OUT-026 PARTIAL to PARTIAL; selected provider-throttle next-permitted-time limb confirmed at the supplied commit, no new product source change; all other holds and gaps remain unchanged. No other plan row selected.

CLAIM OUT-026 PARTIAL points=none tests=tests/core/outreach-limits.test.ts#OUT-006 BASE-OPS-004 transient rate limits stop after five attempts within one hour and notify once
GAP OUT-026: Numeric provider-limit value, complete provider-throttle qualification, sequence-budget and mailbox-pace reasons and times, measured 25-user submission latency, complete 12-user mixed-transport morning, every-user and mailbox usage and real-provider qualification remain unproved. Retain estimated-until-load-tested and every existing prerequisite and hold.
