# Orbit delegated Zoom title privacy continuation

Repository: just-every/run-orbit
Branch: cloud/sd-orbit-zoom-plan-privacy-2-pc1
Product head: 694350843ef82e224a9c0ea1e46e04bdc932aedc
Saved privacy commit preserved: 2a0a929f7ba144520bfb301e7a21effa8f1a65f1
Current main merged: 31ee78c0d348ba5c0d9e5ad530d8d23dbde5f47d
Original leak baseline: dc6b9d24887cb26799a01d3f324aff79f5fbdf4e
PR: none; the named branch is for fleet landing.

## Outcome and custody

The saved privacy implementation and its public-door assertions are preserved. This continuation adds a forward merge of current main, including its rer 0.2.113 adoption and refreshed shared source, and regenerates/validates the source lock. The merge is the only new product commit. It does not invent a product correction for an unobserved assertion failure.

The fleet push guard successfully pushed the named product branch on its first attempt. The candidate's exact-SHA Verify is run 43505149609, https://github.com/just-every/run-orbit/actions/runs/43505149609. It completed successfully on that exact SHA; the terminal result is recorded below and in RECEIPT.json.

The brief cited failed attempt 1 of Verify 43492722717 on the saved privacy SHA. The first jobs read returned latest-attempt jobs with batch-18 still in progress. The one log request for that job returned: `job 132148681215 is still in progress; logs will be available when it is complete`. A subsequent REST status read established that run 43492722717 completed successfully on **attempt 2**, on saved SHA 2a0a929f7ba144520bfb301e7a21effa8f1a65f1. This task did not rerun or dispatch that workflow. It does not claim a diagnosed or fixed cause for the historical attempt-1 failure. The complete actual returned non-secret messages and API-call ledger are retained in this packet.

## Plan and implementation

The full working plan is PLAN.md. It was executed by inspecting the saved code and delegated surfaces, reproducing the augmented flow locally and on the old baseline, merging current main without rewriting the published commit, running the touched test and typecheck, locking source last, inspecting every candidate identity/trailer, pushing through the guard and watching the exact-SHA workflow through REST. Evidence publication uses the separate report-only ref.

The saved implementation compares titles case-insensitively against the full attendee/match identity set before narrowing attendance for a delegated grant. It includes contact IDs, contact names, full emails, email local parts, retained alias matches, operator identities and provider attendee display names, including unresolved/ambiguous matches. An unsafe title becomes a nonempty neutral dated meeting label. This is a response projection; the provider title and owner source remain intact.

Title projections cover delegated plan.meeting.subject, signal lines in account/selected/held/unresolved brief groups, signal title echoes in plan interactions and promises, selected signal names in /records before query matching, and subject/topic/title fields in /evidence including nested payload JSON. Zoom recap text and citation labels are generic and do not interpolate the source title. The full-scope owner meeting route keeps the complete real title. The existing attendance-array and completion-link restrictions stay in place.

Only the saved brief-handoff.test.ts flow is extended; this continuation adds no test registration or test file. The existing fixture meeting is titled with the second, unselected attendee, and the test uses native authorize, a PKCE code/token exchange and delegated plan/brief/records/evidence/search requests. It checks complete response JSON rather than only a display field and does not pin the neutral-label copy.

## Actual validation

- Original baseline with its own frozen dependency installation (rer 0.2.107), Node 22.20.0 and the augmented existing test: **0 passed, 1 failed**, as expected. The first failing assertion is `a contact grant discloses no other Zoom identity or deal, even in nested fields: Ben Hale`. This run stops at that plan assertion; it does not independently enumerate later baseline failures. See original-before.log. An earlier control using baseline source with the current installed dependency tree reproduced the same expected failure; its separate log is original-before-current-deps.log. This was a separate dependency configuration for provenance, not a retry of an intermittent failing candidate test.
- Saved continuation source before merging main: **1 passed, 0 failed**. See continuation-before.log.
- Merged candidate source, Node 22.20.0: **1 passed, 0 failed**, no skips/retries. The test asserts hidden-name absence from the complete plan, brief and records responses for contact-only and signal-only grants, projected selected-signal evidence, and undiscoverability through a hidden-name search. It also asserts the selected attendee remains present, the authorized deal data remains accessible, a grant including the named attendees retains the title, and the owner keeps the real title, full attendance, deal, notes and completion citation. See merged-after.log.
- Typecheck: `pnpm run typecheck`, exit 0, Node 22.20.0. See typecheck.log.
- Source lock regenerated last with the documented edition-authoring `lock` command; its `check` reports `ok: true`. See source-lock.log and source-check.json.
- Before/after test inventory: **198 registered cases + 2 qualification flows = 200**, unchanged. There is still one registration in brief-handoff.test.ts. See test-inventory.json.
- Contract status rows before/after: **42 done, 130 partial**, unchanged. DELEGATE-001 stays partial. CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md are unchanged against merged main. No migration, schema, archive generation, homepage, deployment or UI change was made by this round.
- All candidate commits, including side parents, were inspected against origin/main. Both the saved privacy commit and new merge have fleet author and committer identity and no trailers. See commit-identities.log.
- The source tested before the merge commit is byte-identical to the candidate's tested source; RECEIPT.json records its SHA-256 file identities. Source generation changes only the source lock after the behavioral checks.

## Claims and limits

CLAIM DELEGATE-001 PARTIAL points=none tests=tests/delegation/brief-handoff.test.ts#BRIEF-005 OUT-001 SIGNAL-009 an application reads the brief and a meeting plan with crm.evidence.read and proposes cited handoffs with crm.handoff.write; consent, scope, revocation and the human send boundary hold
DEFAULT DELEGATE-001: Under a delegated allowed predicate, return a neutral nonempty dated meeting label whenever the title contains an unselected attendee identity, case-insensitively; keep full-scope owner titles unchanged.
GAP DELEGATE-001: This narrow title-privacy proof covers part of acceptance point 3 and does not establish the whole clause, Slack mapping guarantees or restored-archive authority; the required independent privacy gate remains with the fleet.

No clause Status/Gap/Evidence cells or generated acceptance counts were edited. There is no complete new acceptance point claim. The fleet's independent privacy gate and publication scan remain required before landing. The cloud cannot run the Mac publication scan, as stated in the assignment; no local scan result is invented. No UI proof is required because no UI changed. Source and unit public doors use synthetic provider HTTP edges, not live-account Zoom qualification. All report files selected for transfer are actual regular non-secret files. Product readiness and evidence transfer remain separate.

The managed environment interrupted the command session while CI was pending. The clone, clean candidate and complete packet were retained. The previous watcher was confirmed defunct; one replacement resumed from the saved last poll time with no extra API call. Remaining reads were spaced farther apart, up to twenty minutes, to conserve the ten-call task budget. Only one watcher was active at a time.

## Evidence transport

The interim packet was published to the dedicated evidence ref at 2fb4ed80dedf036d070373da3b59217a9888e2a5. An isolated read-back restored and verified all 19 manifested files and their hashes, and confirmed product head 694350843ef82e224a9c0ea1e46e04bdc932aedc. The actual publication and read-back receipts are INTERIM-EVIDENCE-RECEIPT.jsonl and INTERIM-EVIDENCE-VERIFY.json. This transfer carries no product readiness claim. The final packet supersedes that interim tree without rewriting its history.

## Final CI result

**Success.** Verify run 43505149609 completed successfully on exact head 694350843ef82e224a9c0ea1e46e04bdc932aedc, as observed through REST at 2026-11-13T21:40:24.313613+00:00. URL: https://github.com/just-every/run-orbit/actions/runs/43505149609.

The task used exactly ten GitHub calls, with one active CI watcher at a time and no workflow rerun or dispatch. candidate-run-discovery.jsonl, candidate-polls.jsonl, candidate-run-status.json, ci-watcher.log and github-calls.jsonl contain the actual observations. The primary receipt records the full candidate SHA, tree, source hashes, local checks, counts, publication and interim read-back.

Blockers: none. DELEGATE-001 remains PARTIAL, with no contract or generated view edits. The independent privacy gate and fleet publication/landing checks remain required.

READY branch=cloud/sd-orbit-zoom-plan-privacy-2-pc1 head=694350843ef82e224a9c0ea1e46e04bdc932aedc
