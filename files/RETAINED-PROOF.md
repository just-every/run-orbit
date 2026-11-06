# Retained original proof and its limits

This is an attributed extraction of factual receipts from the complete original report supplied inline with this commission, not a newly executed test receipt or a replacement for unavailable raw logs. Original tag: ct-judge-orbit-capture009-20261105-2325. Replacement completion tag: ct-judge-orbit-capture009-20261105-2325-sol1. Exact source in all retained product executions: c87171e4821b960a85d1c60d20440c42fc37646d. The inline source is the complete `live-audit-VERDICT-capture009-20261105-2325.md` reference, extracted by CT from the original worker's logged Write call. The accompanying interruption supplement explicitly authorizes reuse and forbids replay of completed journeys.

The original Opus 5.5/high worker's outer wrapper stopped with exit 1 from usage_limit_reached. Its report and draft STAYS PARTIAL disposition were unfinished. The five focused test results below completed before that stop. Their command-level exit 0 is distinct from the wrapper's exit 1. No claim is made that the old worker successfully returned READY.

## Original command facts

| UTC (2026-11-05 unless stated) | Command or operation as recorded | Exit and observed result |
| --- | --- | --- |
| 23:41:24 | git ls-remote for cloud/sd-orbit-c-f63 and main | 0; source c87171e4821b960a85d1c60d20440c42fc37646d; main c01084f133af9aa484a6c1f5151a4e9cfbc7230f |
| 23:41:38 | git clone --depth 1 --filter=blob:none --single-branch --branch cloud/sd-orbit-c-f63 | 0; exact pinned HEAD |
| 23:42 | git fetch --depth 1 --filter=blob:none origin c01084f133af9aa484a6c1f5151a4e9cfbc7230f | 0; parent for comparison only |
| 23:43 | python3 -I count_status.py on pinned and parent CONTRACT.md | 0; main All 35 done, 137 partial, 32 missing; source All 36 done, 136 partial, 32 missing; 204 rows each |
| 23:49:15-23:49:22 | heavy-slot.py --wait-min 45 --remote never -- timeout 900 pnpm install --frozen-lockfile | 0; Node 22.20.0, pnpm 10.12.4, pinned patches applied |
| 23:50:01-23:58:17 | heavy-slot.py --wait-min 45 --remote never -- timeout 1500 pnpm exec tsx --test --test-concurrency=1 tests/core/capture-no-console.test.ts tests/core/capture-intake.test.ts tests/core/capture-erasure.test.ts | 0; 5 pass, 0 fail, 0 cancelled, 0 skipped; 494 s; clean before and after |
| 23:59 | shasum -a 256 for the changed files and generated views, against sources.lock.json | all six matched; the retained report does not supply a separate numeric exit for this row |
| 2026-11-06 00:03:16 and 00:03:21 | curl -sS -m 30 of Google's public US holiday iCal export, twice, without an account | HTTP 200 both; 317 DTSTAMP lines changed and nothing else; no numeric process exit supplied in the report |
| 2026-11-06 00:09:33 | git ls-remote for source branch and main | 0; unchanged |

The heavy-slot command spelling above records historical execution; none was invoked again in this cloud completion. A new cloud run, if separately authorized, would execute its command directly under the cloud adaptation. No new runtime or browser helper was used here.

## Five completed journeys

1. tests/core/capture-no-console.test.ts: CAPTURE-008 CAPTURE-009 the Orbit address and a calendar link capture customer evidence with no provider console. 167.8 s.
2. tests/core/capture-intake.test.ts: CAPTURE-001 CAPTURE-002 CAPTURE-003 SIGNAL-003 OUT-004 RECORD-012 an mbox and calendar files become signals with their evidence; replay, threading, delivery reports and private mail behave as the contract says. 146.6 s.
3. tests/core/capture-erasure.test.ts: CAPTURE-007 DATA-002 BASE-DATA-003 erasing a contact erases their captured originals and proposals; the audit trail keeps counts and anonymous replay proofs. 101.1 s.
4. tests/core/capture-erasure.test.ts: CAPTURE-007 DATA-002 erased provider originals stay erased after expired history, crashes and reconnect while new evidence remains eligible. 37.9 s.
5. tests/core/capture-erasure.test.ts: CAPTURE-007 DATA-002 erasure fences an already-resolved capture commit and its later replay. 31.2 s.

The calendar journey uses authenticated native Capture HTTP routes, normal pollCalendarLinks invoked by the Worker scheduler, Records archive export, human proposal acceptance and native meeting-plan readback. Fixtures contain an account, contacts, an opportunity and two real Orbit submissions to a fake mail provider. Only network edges are substituted. The synthetic ICS has a fixed DTSTAMP and one in-window event plus two excluded events. These are not live private provider accounts.

Executed allowed and unsafe cases: a valid link returns 201 and captures; an HTML link returns 400 and leaves the source inventory unchanged. A 404 halts the source with visible revoked reason and unchanged history. Provider recovery causes no GET; manual sync returns 409 and effects remain unchanged. Invalid inbound signature and wrong address are refused; the allowed tagged delivery succeeds. Erasure and subsequent replay, reconnect and a capture race do not resurrect erased originals; unrelated evidence survives, and eligible fresh evidence still works.

R1-R6 were scored MET by the retained original execution. Exact original time assertions: start 2026-11-08T05:30:45.000Z; end 2026-11-08T06:45:12.000Z; occurred 2026-11-03T08:15:11.000Z. Revision start/end: 2026-11-09T18:00:15.000Z and 2026-11-09T19:30:22.000Z. Cancellation occurred: 2026-11-05T11:45:37.000Z. The Asia/Tokyo written time remains in original evidence. Unchanged and changed-envelope replay preserve all fifteen recorded effect-table inventories.

## What the old draft did not establish

Its NEW-1 Orbit restamping/paging failure was inferred from source, never executed against Orbit. Only the public Google export format was observed. The draft explicitly records that the relevant behavior is unchanged from main. Private Google export equivalence was an inference. The completion therefore records Orbit's side as INSPECTED and pre-existing D, not an executed public-door failure and not a blocker. The old proposed gap, additional probe and later FIX conditions are not authoritative requirements.

Its NEW-2 halted-link re-add behavior was also reading-only and pre-existing. Its suggestion to choose source identity on re-add is not an adopted policy or a commissioned fix. C-1, the old-cancellation upgrade false conflict, preserves evidence without new effects or data loss; it is next-planned-touch only. Unreadable-time link reporting is pre-existing D. Actual private provider cancellation forms remain UNMET-EXTERNAL.

The report states it read the complete pinned CONTRACT.md, ACCEPTANCE.md, AGENTS.md, RULINGS.md, the three journey files and relied-on helpers and product paths end to end. That completed review is reused. This completion rechecked relevant source and workflow mapping and fresh-main records without repeating successful product executions.

No original functional browser execution or screenshot receipt was supplied. The original report says browser was NOT RUN because this was a non-UI change, acceptance used HTTP and scheduler doors, and the form to route mapping was INSPECTED. That limitation is retained; no browser PASS is invented or dropped. No visual or UI quality judgment is made.

## Separate original affected qualification

The complete inline affected report records sd-orbit-c-f63-gate-1 finishing 2026-11-05T23:26:16Z, exit 0, GATE PASS WITH FOLLOW-UPS 1 on the exact source. It independently executed all five tests on Node 22.20.0 and pnpm 10.12.4, with R1-R6 MET, typecheck exit 0, expected initial generated-view check exit 1, generator write and check exit 0, and source-lock check, regeneration and check exit 0. This separate actual gate result is retained, not inferred from this CT disposition or queried again. Its only C follow-up was cancellation upgrade replay; mechanical landing remained pending.

Push Verify 42126036366 on exact c87171e4821b960a85d1c60d20440c42fc37646d is reported completed/failure: source job 127590586946 first failed stale ACCEPTANCE.md, dependent artifacts and verdict job 127590883633 followed, runtime shards skipped. The builder read the two failed-job logs once each. This cloud completion made zero CI API calls and no rerun or dispatch. It is a permitted candidate generated-view exception and never full-green final runtime proof.
