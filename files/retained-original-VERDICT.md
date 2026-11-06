<!-- Extracted verbatim from the remote run’s logged Write call; original workdir is on m1-runner. -->
# VERDICT: ct-judge-orbit-out006-20261105-2348

**OUT-006 Delivery failure: ACCEPT ON LANDING.** Frozen rubric R1 to R4: all four MET by execution on the exact source; NEW findings: none. DONE-RIDERS rows 1, 2, 4, 5, 7, 8, 9 and 10 PASS. Row 6 is mechanically pending, and rows 3 and 11 are pending their actual guards. This review confers no source acceptance, pin, hold waiver, READY conversion, landing or award.

Judge: one fresh, independent Opus 5.5 (high) session, read-only, with no helpers or sub-agents. Host: m1-runner (macOS). Admission was the ordinary subscription; no paid API was used and no run-secret was read (RER_RUN_ENV_FILE was unset and the env shim was not used).

## 1. Source and identity

- Exact source: af231f9c987f7e6edc5f5ae537c91d3197d4d758 on cloud/sd-orbit-c-f59 (just-every/run-orbit). The public ref matched at 23:47:01Z and again at 00:09:32Z (6 November 2026 UTC).
- Lineage, which is linear: af231f9c (docs: OUT-006 status) has parent 1f597a7c2bc3b0fdee0246b923d7c29ef0dc08f8 (proof save, tests, [skip ci]), whose parent is c01084f133af9aa484a6c1f5151a4e9cfbc7230f, the current main at both readbacks.
- No earlier ct report covers this SHA. This is the original judgment of this source, not a rejudgment. The original request is INBOX 16206 from sd-orbit-c-f59 at 05 Nov 23:35Z.
- The affected gate sd-orbit-c-f59-gate-1 is separate. This judgment neither infers nor substitutes for its result. Its actual PASS on af231f9c remains mandatory before supported source acceptance or protected final admission.

## 2. Category, buyer and incumbents (from the pinned `CONTRACT.md`, lines 1 to 14, only)

- Category: Sales CRM.
- Incumbents a buyer switches from: HubSpot Sales Hub, Pipedrive and Salesforce Sales Cloud.
- Up-and-comers it must also beat: Attio, Day.ai and Twenty.
- First buyer: a US small-business sales manager and their reps, selling in USD, using Google Workspace or Microsoft 365, and working across US timezones and US daylight-saving transitions.

## 3. Clause under judgment (pinned, unchanged from main)

`CONTRACT.md` lines 555 to 560 and meta line 136:

> #### OUT-006 — Delivery failure
> **Requirement.** A transient submission failure retries up to 5 times over 1 hour. A permanent failure or an exhausted retry returns the opportunity to NOW, notifies the responsible operator once, and shows the provider's reason on the message. A permanent bounce also sets the contact do-not-contact under RECORD-012.
> **Acceptance.** 1. Fail a submission transiently, permanently and ambiguously; verify bounded known-unsent retries, visible exhausted failure, one notification and permanent-bounce stop.
>
> `OUT-006`: Tier Core · Cites BASE-MAIL-001, BASE-ROLE-001, BASE-OPS-003 · Rules D-1

- Door rule D-1 (`CONTRACT.md` line 26): suppression is person-specific, and a permanent bounce wins over dispatch.
- Inherited Base duties (`BASELINE.md`):
  - BASE-MAIL-001: failed and uncertain outcomes stay distinct, with durable evidence.
  - BASE-ROLE-001: every door enforces the caller's current role on the server.
  - BASE-OPS-003: a duplicate webhook delivery produces the same result.
- `RULINGS.md` (RL-1 to RL-7) has no ruling that governs OUT-006. `platform/CONTRACT-STANDARD.md` is absent at the source, so no structural rewrite is permitted, and none was made.
- `AGENTS.md` has been read; its outreach duties are "one-attempt submission and truthful ambiguous outcomes".

## 4. What the candidate changed (versus main c01084f1)

- `tests/core/signals-outreach.test.ts`: one registration, "OUT-002 OUT-007 temporary provider blocks do not permanently suppress a contact; permanent bounces do", was rewritten. It used to set state directly in the repository; it now runs native HTTP draft and approval, signed relay events, authenticated readback and replay.
- `tests/core/source-onboarding.test.ts`: the rejection and uncertainty loop now reads authenticated history, refuses an unauthenticated read and refuses a repeat approval.
- `CONTRACT.md`: the OUT-006 row moved from partial to done with an empty Gap, a provenance paragraph was added (line 2396), and the count table was updated.
- `sources.lock.json`: three hashes changed.
- No runtime path changed: no edits under src, migrations, public, schema, .github or scripts. Between the proof save and the candidate, only `CONTRACT.md` and `sources.lock.json` differ.
- Main's prior OUT-006 Gap read: "Unasserted in the carried evidence: ambiguous outcome distinct; permanent bounce stops contact; provider reason retained. Asserted: known-unsent retry bounded to five attempts; exhausted failure visible; one failure notification."

## 5. Commands run and exits (exact source, in a disposable shallow filtered clone)

Toolchain: Node 22.20.0 (the repository pin, from the host toolchain) and pnpm 10.12.4 (the packageManager pin). WRANGLER_SEND_METRICS=false, as in Verify. Every heavy command ran through the host heavy-slot admission, one at a time.

    git ls-remote https://github.com/just-every/run-orbit.git (branch and main)        exit 0   23:47:01Z
    git clone --depth 1 --filter=blob:none --single-branch --branch cloud/sd-orbit-c-f59 ...   HEAD af231f9c (verified by rev-parse)
    git fetch --depth 3 --filter=blob:none origin c01084f1 1f597a7c                   exit 0
    heavy-slot: pnpm install --frozen-lockfile                                        exit 0   8 s
    heavy-slot: pnpm exec tsx --test --test-concurrency=1 --test-reporter=spec
       --test-name-pattern="^OUT-006 BASE-OPS-004 transient rate limits" tests/core/outreach-limits.test.ts
                                                                                      exit 0   tests 1, pass 1, fail 0, skipped 0   23:55:58Z to 23:56:24Z
    heavy-slot: same runner, patterns "^OUT-002 OUT-007 temporary provider blocks" and
       "^BASE-OPS-004 OUT-006 provider retry expiry", tests/core/signals-outreach.test.ts
                                                                                      exit 0   tests 2, pass 2, fail 0, skipped 0   23:56:31Z to 23:56:57Z
    heavy-slot: same runner, pattern "^NOTIFY-003 opt-in personal mention DMs", tests/core/source-onboarding.test.ts
                                                                                      exit 0   tests 1, pass 1, fail 0, skipped 0   23:57:03Z to 00:04:58Z (475 s)
    node src/base/contract-docs.mjs check (read-only)                                exit 1   only line: "ACCEPTANCE.md: generated content differs; run contract-docs write."
    node node_modules/@runeditrun/rer/edition-authoring/cli.mjs check (read-only)     exit 0   "ok": true
    git status --short                                                                clean (0 lines)
    git ls-remote readback                                                            exit 0   00:09:32Z, unchanged
    Status-table row recount on main and candidate (awk over the Status rows)         see section 9

The focused journey time was about 527 s in total, within the 40-minute budget. The receipts are in reports/probes/evidence: install.log, run1-outreach-limits.log, run2-signals-outreach.log, run3-source-onboarding.log, mechanical-checks.log, diff-and-lineage.txt, status-recount.txt and ref-readbacks.txt.

## 6. Frozen rubric (verbatim from the original request) and scores

- **R1:** known-unsent transient failures stop after five attempts within the hour, persist an exhausted failed message, and notify once. Existing OUT-006 bounded-retry registration in ./tests/core/outreach-limits.test.ts; retained retry-window expiry registration in ./tests/core/signals-outreach.test.ts.
  - **MET (executed).** In Run 1 a fake paid edge threw a SendGrid 429. Cron-dispatch passes advanced a fixed clock by 5 minutes each.
    - Calls: 5.
    - attempt_count: 5.
    - State: failed.
    - Failure text matches the provider diagnostic (rate limit).
    - Exactly one notification with event key message:<id>:failed.
    - The sixth pass submitted nothing.
  - In Run 2 the retry-window registration showed that, after the window, the message is failed with zero submissions, and the deal is in NOW with the reason "retry window expired".
  - Code path:
    - `src/core/features/outreach/service.ts` line 34 retries only rate-limited errors, and only while attempt_count is below 5 and less than one hour has passed.
    - Line 35 settles every other error as failed or delivery-unknown.
    - The line 50 guard fails the message without submitting.
    - `src/core/platform/outbound-mail.ts` lines 58 and 59 classify the outcome.
    - The notification comes from trigger notify_message_state (`migrations/core/0010_notification_record_scope.sql` line 16), which uses INSERT OR IGNORE on UNIQUE(operator_id, event_key).
  - The dispatcher is the cron door's handler:
    - `wrangler.jsonc` line 18 schedules it every minute.
    - The call chain is `src/core/app/worker.ts` line 37 (scheduled), then runHostedTimers, then runOrbitTimers in `src/core/features/outreach/timing-repository.ts`, then dispatchDue.
- **R2:** a native reviewed permanent refusal and ambiguous response remain distinct, retain the exact safe diagnostic on the same message, and repeat approval causes no new intent or submission. Existing source-onboarding registration, native approval and authenticated workbench history.
  - **MET (executed, Run 3).** The flow used the native HTTP doors: draft, then approval-preview, then approve, which returned 502.
    - The rejected outcome became failed with "Managed mail rejected this submission."
    - The uncertain outcome became delivery-unknown with "Managed mail acceptance is uncertain; reconcile before resending."
    - Authenticated GET /api/v1/workbench/opportunities/:id/messages returned the same message id, draftId, state and exact diagnostic.
    - The same read without a cookie returned 401.
    - The repeat approval returned 409.
    - History was deep-equal afterwards, and relay submissions grew by exactly one per outcome.
  - The 409 is structural. The idempotency key is draftId:revision with ON CONFLICT DO NOTHING (`src/core/features/outreach/approval-repository.ts` line 50).
  - The Base relay adapter never reads error bodies, because they "may contain credentials or personal data" (`src/base/modules/mail/src/adapters/rer/index.mjs` line 29). The fixed diagnostic is therefore the safe form of the provider's reason at this door.
- **R3:** signed temporary-block and permanent-bounce reasons survive native authenticated history and replay unchanged; permanent bounce suppresses the contact; delivery problem returns the deal to NOW; event, timeline and notification effects occur once. Existing temporary provider blocks registration, native signed mail-event and Records doors.
  - **MET (executed, Run 2).** Each event type got its own fixture. The message went through native HTTP draft and approval: state accepted, one submission.
    - A signed POST to /api/v1/mail/events/relay carried a distinct reason for each type.
    - The history read returned one message with the same id and draftId, state bounced, and the reason byte for byte.
    - On the Records contact read, a bounce gave do_not_contact and a block stayed contactable.
    - The opportunity read showed queueState now.
    - There was one provider event row, one provider.bounce timeline entry and one message:<id>:bounced notification.
    - The replay returned 200 with identical history and effects, and submissions stayed at 1.
  - Code: `src/core/features/outreach/provider-events.ts` lines 23, 26 and 27. The contact stop applies only when the bounce type is "bounce".
- **R4:** inherited truthful outcomes, current native authority and idempotency remain intact. Invalid signed events and unauthenticated reads are refused with unchanged message history; no runtime authority or erasure behavior changes.
  - **MET (executed, plus diff).**
    - In Run 2, for both event types, an invalid signature returned 401 and history was deep-equal before and after.
    - In Runs 2 and 3, unauthenticated history reads returned 401.
    - Replay and repeat approval were idempotent.
    - Failed and delivery-unknown stayed distinct.
    - No runtime path differs from main, and the source lock check exited 0.

**Rubric score: all four rows MET; NEW: none.**

## 7. Original Requirement and acceptance cross-check (the frozen mapping, not a new checklist)

| Original outcome | Rubric row | Journey and door | Result |
| --- | --- | --- | --- |
| Transient failure retries up to 5 times over 1 hour (known-unsent only) | R1, R2 | Bounded-retry and retry-window registrations, cron dispatcher; an ambiguous outcome is never retried (R2, plus `src/core/features/outreach/service.ts` line 46, which selects only scheduled messages) | PASS, executed |
| Permanent failure returns the deal to NOW | R3 | Signed bounce and block, authenticated opportunity read | PASS, executed. The permanent submission-refusal branch reaches NOW through `src/core/features/outreach/settlement.ts` line 28 (INSPECTED; that branch has no assertion of its own, note F1) |
| Exhausted retry returns the deal to NOW | R1 | Retry-window registration asserts NOW and its reason | PASS, executed. The five-attempt branch reaches NOW through settlement line 28 (INSPECTED, F1) |
| Notifies the responsible operator once | R1, R3 | Exactly one failed notice after exhaustion; exactly one bounced notice, and replay adds none | PASS, executed. The refusal, uncertainty and expiry branches notify through the same trigger (INSPECTED, F1) |
| Shows the provider's reason on the message | R1, R2, R3 | Rate-limit diagnostic after exhaustion; safe adapter diagnostic on refusal and uncertainty; exact signed reason on bounce and block, through authenticated history | PASS, executed. The screen renders the reason for failed and bounced messages (`src/core/features/operator/ui/record/deal-activity.tsx` lines 20 and 23, INSPECTED) |
| Permanent bounce sets do-not-contact under RECORD-012 | R3 | Records contact read: do_not_contact for a bounce, contactable for a block | PASS, executed |
| Acceptance: fail transiently, permanently and ambiguously; bounded known-unsent retries, visible exhausted failure, one notification, permanent-bounce stop | R1 to R3 | All of the above | PASS, executed |

## 8. DONE-RIDERS rows 1 to 11

1. **PASS.** Named sanity journeys perform and check every outcome of the Requirement and the acceptance point. They go through Orbit's own doors: workbench, Records and opportunity HTTP routes, the signed mail-event relay and the cron dispatcher. All four ran green on the exact source.
2. **PASS.** The journeys use populated native records and independent literal expected reasons. The dangerous paths are executed both ways:
   - a signed event is applied, while an invalid signature is refused with history unchanged;
   - an authenticated read is served, while an unauthenticated read is refused;
   - the first approval submits once, while a repeat approval returns 409 with no new intent or submission;
   - retries happen up to the bound, and the sixth pass and post-window dispatch send nothing.
3. **PENDING (the permitted CANDIDATE exception; never final runtime green).** All three files are loaded by the push Verify core shards: `scripts/verification-plan.mjs` line 61 enumerates every tests/core file. The exact-SHA push Verify 42127894928 is the builder's receipt; CI queries are prohibited for this commission, so I did not query it.
   - That run reportedly stopped at the source job's contract-docs check. I reproduced the cause locally: exit 1 with only the ACCEPTANCE.md line.
   - The shards were skipped, so the runtime was not executed in CI on this SHA.
   - Owed: an actually executed, full-green Verify of the exact final runtime, loading these journeys.
4. **PASS.** I ran on the exact candidate. Between the proof save and the candidate, only `CONTRACT.md` and `sources.lock.json` differ.
5. **PASS.** The meta line (`CONTRACT.md` line 136) cites BASE-MAIL-001, BASE-ROLE-001 and BASE-OPS-003, plus D-1, unchanged from main. Their deltas are exercised: truthful failed versus uncertain, server session refusal, replay idempotency, and the permanent-bounce stop.
6. **MECHANICAL PENDING (not a product blocker).** What already holds:
   - The done row's Gap is empty.
   - The Evidence cell names each journey's file and name.
   - The provenance paragraph names proof save 1f597a7c, and its claim that "the subsequent status update changes only this contract and its source lock" is verified.
   - The recounted rows match the count table.
   - The lock check exits 0.

   What remains: `node src/base/contract-docs.mjs check` exits 1 only because `ACCEPTANCE.md` was restored from main under the cloud landing contract. Final integration owes four mechanical steps: run the generator write and then check, use current counts, make the provenance name the exact judged source af231f9c and this report, and regenerate the source lock last.
7. **PASS.** The Requirement and acceptance text are byte-for-byte unchanged. No ruling is needed, no rider is duplicated, and no rewrite was made.
8. **PASS.** The native session governs history and approval. Unauthenticated reads get 401; an invalid provider signature gets 401 with history unchanged; a repeat approval gets 409 with no resubmission. No authority or erasure runtime changed.
9. **PASS.** Fakes appear only at the paid edge: a fetch stub for the managed relay, a thrown SendGrid error, and an HMAC relay with a synthetic secret. No live-provider qualification is claimed. Real provider bounce and rate-limit behaviour is UNMET-EXTERNAL and does not block.
10. **PASS.** No custody, consent, authority, retention or spending default was adopted, because runtime is unchanged.
11. **PENDING (guarded lander).** Main (c01084f1) does not yet equal af231f9c, although af231f9c fast-forwards from it. Also missing:
    - an exact-SHA green Verify;
    - a Run site on the candidate;
    - a COMPLETE full-history publication scan with NEW 0.

## 9. Status, Gap, count delta and pending guards

- Status: the candidate's OUT-006 row (done, with an empty Gap and the Evidence naming the three files and their registrations) is truthful for this source. No Gap edit is needed.
- Counts, rederived from the Status rows on fresh main c01084f1:
  - Main: 35 done, 137 partial and 32 missing of 204. Published: 27 done, 52 partial and 0 missing of 79. Target and push further: 8 done, 85 partial and 32 missing of 125.
  - Candidate: 36 done, 136 partial and 32 missing of 204. Published: 28 done, 51 partial and 0 missing of 79.
  - Delta: one more done and one fewer partial. This is UNAWARDED: it is counted only at guarded landing and never summed across candidates. All 204 rows are retained, and only the OUT-006 row changed.
- Pending guards:
  - row 3: an actually executed full-green Verify of the exact final runtime;
  - row 6 mechanics, as listed under row 6 in section 8;
  - row 11: main equality, a Run site on the exact main, and a COMPLETE full-history publication scan with NEW 0;
  - the separate actual PASS of sd-orbit-c-f59-gate-1 on this source.

## 10. Unmet outcomes and blockers

None. No outcome of the original Requirement or acceptance point is unreached, and no NEW out-of-rubric finding (data loss or exposure, plausible regression, or ordinary correctness error) was found. The only open items are the pending guards in section 9.

## 11. Notes for the lander and ct (non-blocking)

- **C1 (next planned touch).** The retry-window guard in `src/core/features/outreach/service.ts` (line 50) replaces the stored transient provider diagnostic with "Provider retry window expired; operator review is required". It also writes no message.failed timeline entry, unlike settlement. The failure stays visible, the deal goes to NOW, and the trigger notifies once, so the acceptance point's "visible exhausted failure" holds. The behaviour predates this candidate and the candidate does not change it.
  - Suggestion: append the expiry text to the last provider diagnostic instead of overwriting it, and record the move on the timeline (OPP-007).
  - The builder's mutation M4 already reported this loss of the diagnostic.
- **F1.** In the OUT-006 journeys, the permanent-refusal, uncertainty and expiry branches have no NOW or notification assertions of their own. In code they come from settlement line 28 and trigger notify_message_state. The NOTIFY-001 row's journey covers notifications for rejected and uncertain submissions, but the OUT-006 Evidence does not cite it.
- **F2.** The bounded-retry journey approves through the repository and enters at the cron dispatcher, not at worker.scheduled. It reads outcomes through the repository and the database rather than authenticated history. The retry-window registration seeds retry state with SQL. The frozen R1 accepts both registrations as its method.
- **F3.** The signed-event journey counts its effects by database query rather than through the notification inbox door. It also clears claimed_at for all messages so that sending budgets do not interfere.
- **F4.** Submission refusals show the adapter's safe classified diagnostic, not provider free text. The SendGrid adapter adds the HTTP status (`src/base/modules/mail/src/sendgrid-email/index.mjs`). This is consistent with BASE-SECRET-001 and with the wording of the frozen R2.
- **F5.** The delivery-unknown line on the deal screen reads "approved · the provider has not answered yet", without its diagnostic; OUT-011 owns that. No Verify-loaded browser journey covers the OUT-006 message screen. The provenance sentence about the 1440 and 390 screens rests on builder-local carried proof, which the Evidence cell does not rely on.
- **F6.** OUT-006's journeys do not exercise the SendGrid ECDSA webhook door or the "dropped" event branch.
- **F7 (routing; not counted against OUT-006).** The sending-limit hold (state draft) renders as "not sent · the provider refused it" without naming the limit (`src/core/features/operator/ui/record/deal-activity.tsx` line 21). That belongs to OUT-010 and OUT-026.
- **F8.** One failure produces the message notice and, when the deal leaves NEXT, NOTIFY-001's queue-entry notice; replay adds neither. D-1's "other contacts unaffected" and the refusal of dispatch after a stop are covered by RECORD-012's done journey, not repeated here.

## 12. NOT RUN, with reasons

- Full or baseline suites, and the 19 unrelated registrations in the three files: prohibited, because the commission requires focused relied-on cases only.
- Mutations M1 to M4: prohibited. They are the builder's carried receipts. I checked by reading that the cited lines (source-onboarding 58, signals-outreach 331 and 333, outreach-limits 15) hold the claimed assertions.
- The browser screen at 1440 and 390: not a relied-on Evidence journey, and adding probes is prohibited. The rendering was INSPECTED instead; the builder's screenshots remain carried evidence.
- Any CI query, rerun or dispatch of Verify 42127894928: prohibited. Its cause was reproduced locally.
- The contract-docs write and lock regeneration: lander mechanics in a read-only commission.
- The publication scan, main-equality guard and Run site: guarded-lander duties.
- Typecheck, build and first-party checks: not relied-on journeys, and no runtime changed.
- Live providers and mailboxes: UNMET-EXTERNAL.

## 13. Boundaries preserved

These all remain exactly as they are on main, and nothing here widens them:
- the OUT-013 and OUT-019 consent and Base prerequisites;
- Field proof R-6;
- every provider, account, device, legal, release and adoption boundary;
- every other Status row, Gap, Evidence entry and provenance paragraph.

The builder's proof is synthetic native proof, never live-provider qualification.

## 14. Cleanup

The heavy-slot children exited, and no process references the clone. The disposable clone and its node_modules are deleted after this file and the receipts are copied out. Nothing in the repository was written, committed or pushed.
