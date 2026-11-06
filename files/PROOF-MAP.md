# BOUNDARY-001 proof map and DONE riders

Candidate: 6297679f860ad9809147c17b423fcbb07c7f2a72

The planner-selected acceptance deficit is already implemented in the pinned base. The relevant journey is the first registration in `tests/core/source-onboarding.test.ts`, beginning with “NOTIFY-003 opt-in personal mention DMs” and including “BOUNDARY-001 current USD sales journey respects product boundaries and exposes unresolved provider setup”. It calls `proveSlackNotices` in `tests/support/slack-notices-proof.ts`.

Selected point coverage:

- Lines 54 to 63 save distinctive private products, commitments, a USD amount, and a person-authored native handoff through authenticated routes, then read the saved handoff back with its native actor and absent application source.
- Lines 65 to 70 perform the won transition, read its persisted lifecycle event, and correlate that event and the exact handoff receipt to their native source identities. A manual call is also present, so a generic handoff notice cannot stand in for the person's native handoff.
- Lines 72 to 79 require exactly one stored notice and exactly one captured Slack submission per exact source, the fixed allowed stored field set, truthful provider receipt, expected text and plain-text block, suppressed unfurling, and the exact Orbit open link.
- Lines 80 to 85 reject every distinctive private-content and amount marker in stored content and the entire submitted payload, including blocks and possible metadata; links carry no query, fragment or user credentials, and an anonymous linked-record data read is refused with 401.
- Lines 86 to 88 refuse the stale native review with 409, run repeated delivery ticks, preserve exact notices and payload inventories, and restore the original deal amount.

The production reader in `src/core/features/slack/content.ts` selects the allowed fields without reading products, commitments or monetary amounts. `src/core/features/slack/contracts.ts` defines the current notice envelope. The `slack_sales_event` trigger in `migrations/core/0051_slack_notices.sql` correlates notices to the exact timeline event without copying free text. No demonstrated defect warrants a production edit.

The surrounding journey retains channel safety, private-record withholding, failed-only retry, uncertain-outcome hold, signed action authority and replay, reconnect fencing, personal opt-in, source deletion and erasure, and both Records and CLI archive behavior. There is no assertion removal, narrowing, new registration, or UI change in this run.

## DONE riders

No DONE promotion is requested. These are the reasons the unchanged PARTIAL status remains honest:

1. FAIL for the entire clause: product jobs and states, desktop and phone Integrations qualification, and full retained CRM scope remain unproved in the carried evidence. The selected Slack content point is covered by the exact source journey above.
2. PASS by inspection of the selected proof: real saved records and distinct source identities precede content assertions; anonymous access, stale review and repeated processing exercise refusal and unchanged effects. Runtime result is recorded separately in checks.json.
3. NOT ESTABLISHED as a green recorded test execution: Verify 42168658819 stopped at expected generated-view freshness, before test shards. The source-onboarding test remains scheduled by the existing push Verify inventory. The candidate exception does not establish DONE.
4. Candidate-bound local execution and unchanged source bytes are reported in checks.json. No earlier runtime receipt is represented as a new execution.
5. PASS by inspection: the receiving BOUNDARY-001 meta line explicitly cites BASE-DATA-004. No inherited duty is claimed for another clause.
6. PARTIAL preserved: Evidence and Gap already name the selected proof and the broader missing qualification. Contract write and check pass locally; generated views are then restored whole from main as required. Judged provenance is not advanced and DONE is not claimed.
7. PASS: no acceptance sentence, status, row, identifier, or coverage mapping changes in this round. All 204 parent Status rows survive the carried candidate commit.
8. Selected boundary covered by existing native refusals, revoked mappings, current-access checks and stale-review replay fences; no new authority behavior is introduced. Whole-clause authority qualification is not newly claimed.
9. PASS as an honest boundary: Slack is replaced only at its network edge. No live Slack, TEAM-005, mailbox, call, quote, billing, support, meeting or receiving-product qualification is claimed.
10. PASS as unchanged policy: no new custody, consent, spending, retention or authority choice is adopted. The standing conservative-default policy does not require a new ASK for this validation.
11. PENDING guarded landing: main differs from the candidate; no cloud publication scan, main landing or Run site success is claimed. The fleet owns those checks and generated views.

## Pre-READY self-check

- The selected user-visible outcome is asserted through native mutation and read doors, a real persisted event trigger, and the Slack network edge. Whole-clause DONE remains unclaimed.
- No assertion is removed, skipped, narrowed or made conditional; no test registration changes.
- Existing revoked-credential, erased-person, reconnect, restoration and replay fences remain in the journey being executed.
- No screen or product component changes; browser screenshots are not newly claimed. The broader 1440 and 390 Integrations proof remains in the Gap.
- Contract generation and lock checks are recorded. Exact-SHA Verify's generated-view exception is reported as such. Publication scan and Run site are delegated to the guarded lander, with neither represented as complete.
