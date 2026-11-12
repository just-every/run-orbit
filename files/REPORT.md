# sd-orbit-c-f163 — Calendly lifecycle

INTEGRATE-001 remains PARTIAL. This round closes only the selected native Calendly portion of acceptance 1. No contract judgment, acceptance sentence, homepage claim, provider hold or plan queue entry changes. Counts remain 42 DONE, 130 PARTIAL and 32 MISSING, 204 total. Tests remain 198 registered cases and two qualification flows, total 200.

The full execution plan is in PLAN.md. A signed booking now retains exact attendee name and email, start and end, provider event and invitee resources, event name and location. Immutable callback signals retain their original bytes. An additive booking_lifecycle table joins invitees and stores one current activity projection. The contact, its company and only its already-linked deal receive that activity. A replacement invitee and the old rescheduled cancellation join the same activity in either delivery order. Plain cancellation updates its status, canceler and reason. Sorted historical details retain previous resources and scheduled times.

The first booking still takes the existing outreach stop. Later reschedules and cancellations do not call it, do not revive stopped mail and do not send anything. Only the verified Calendly callback route invokes lifecycle interpretation; a generic signed source cannot acquire those semantics by naming Calendly in its data. Existing signature verification, timestamp expiry and source-authority fences remain active. Today and meeting-plan reads retain the original meeting identity while reading its current state. A semantic update has its own received timestamp, so a reschedule or cancellation appears again after the operator has marked the earlier Today brief seen. A late history-only receipt keeps that timestamp unchanged. The original callback and link timestamps remain intact. The activity shows the current attendee, time range, event and location, cancellation details and a link to the same plan; recorded details retain its provider history.

The focused proof extends the existing source onboarding registration through tests/support/calendly-booking-proof.ts. It uses authenticated creation and detail routes plus documented signed Calendly callbacks. The existing operator registration is retitled and extended; no registered case or prior assertion is removed. Its new lifecycle assertions run at 1440, with populated screen captures at 1440 and 390. Existing note-ordering assertions remain intact. The local build uncovered two test wiring errors: the helper initially sat in the source-rotation registration and a broad browser locator counted hidden audit copies. The helper is now called by the booking registration and the browser counts activity headlines. A final erasure witness uses exact JSON email equality, avoiding the local D1 LIKE-pattern limit. No pre-existing assertion changed.

## Selected-point rubric

| Row | Outcome | Proof and result |
| --- | --- | --- |
| R1 | One exact booking on matched contact, company and linked deal | Source onboarding booking registration and helper read authenticated populated records, exact attendee, provider resources, start, end, name and location; unrelated same-company deal excluded. PASS locally. |
| R2 | One activity through either reschedule order | Helper executes both orders, requires stable identity and replacement details, with the old times retained in history. PASS locally. |
| R3 | Plain cancellation on that activity | Helper checks cancelled state, exact host and reason, same identity and plan status. Browser checks visible cancellation details. PASS locally. |
| R4 | Replay and unsafe deliveries have no effects | Existing forged, tampered and expired signatures remain asserted. Helper checks complete evidence inventories after reordered replay, wrong key, disabled source, unknown invitee and erased-person replay. Generic source fields do not activate lifecycle interpretation. PASS locally. |
| R5 | First booking stops scheduled outreach exactly once | Helper schedules reviewed mail before booking and checks cancellation. It approves another later schedule to detect an accidental repeated stop, then compares full outbound and draft state plus provider submission count through reschedule, cancel and replay. PASS locally. |
| R6 | Today and meeting plan follow the root | Helper reads one Today line with root evidence and current status, and the same plan identity, current start and end, attendee and deal. Marking the old booking and then the reschedule seen does not hide a later update. PASS locally. |
| R7 | Populated activity works at both widths | Existing operator case retains note ordering and metadata assertions, adds current booking states and exact times, one visible meeting headline, provider history, plan link and tooltip checks. Browser result and images are in the packet. |
| R8 | Migration and portability preserve booking history | One-off runtime probe applies and checks the entire 76-file migration ledger, books, reschedules and cancels through signed HTTP, then uses the CLI portability engine to restore into a fresh database. Four receipts and the cancelled root activity survive byte-for-byte; the source secret is absent. PASS locally. |

## DONE-RIDERS

| Rider | Result for this partial claim |
| --- | --- |
| 1 | Selected Calendly outcomes reached through public HTTP and built browser doors; complete acceptance remains unclaimed. |
| 2 | Populated records and scheduled mail assert concrete results; unsafe signature, source and erased-person paths are exercised. |
| 3 | Exact-candidate Verify receipt recorded in RECEIPT.json; no green result is assumed. |
| 4 | Final proof source identity and candidate binding recorded in RECEIPT.json. |
| 5 | Existing clause cites BASE-ROLE-001, BASE-SECRET-001 and BASE-DATA-004; no inheritance text changes. |
| 6 | Contract generation write and check pass; both generated views restored from main and not committed. Judgments and counts unchanged. |
| 7 | No acceptance sentence, ruling or coverage map changed. |
| 8 | Existing signed-source and transactional authority fences retained; wrong-key and disabled-source callbacks refuse changes. |
| 9 | No live Calendly, Dial or other provider qualification claimed. Existing account and consent holds remain. |
| 10 | No new policy default or scope ruling adopted; exact identity linking and conservative conflict refusal retained. |
| 11 | Publication scanning, guarded landing, main equality and exact-main Run site remain with the fleet. No landing or scan completion claimed here. |

## Pre-handoff checks

The new behavior is asserted through populated public doors. No existing assertion was removed, narrowed or hidden behind a width condition. Disabled source and erased-person replay cannot restore record visibility. The touched activity uses the existing typography at 14 to 16 pixels, existing full field borders and labeled actions; the existing icon-only People menu already has the shared delayed-hover and immediate-focus tooltip, exercised by the browser case. No configuration was added. Deployment specification and source lock are generated by their documented scripts. Publication scan is NOT RUN in cloud and remains the lander's duty.

## Held remainder and disposition

Paid Calendly live qualification and Dial's receiving deployment remain held. Dial links and appointments, Connect Dial, completed appointments, reviewed booking-link sharing, visible disconnect and signature-failure states, the complete booking buyer walk, sequence prerequisites and owner-consented calendar writeback remain unclaimed. All existing holds, notes, queue entries and release prerequisites remain unchanged. No plan row is edited in cloud; report the native acceptance-1 limb as closed while keeping INTEGRATE-001 PARTIAL.

Actual product head, branch, checks, CI run identifiers, proof file hashes and custody are in RECEIPT.json. Evidence transport is separate from product readiness.

PROBE INTEGRATE-001 1: authenticated Records creation and signed Calendly callbacks -> one exact activity on the matched contact, company and linked deal; both reschedule orders preserve its identity; plain cancellation preserves its canceler and reason; replay changes no evidence or outbound inventory; Today and the meeting plan follow that root.

No complete acceptance point or whole-clause DONE is claimed: acceptance 1 includes held Dial and reviewed-link work, and acceptance 2 remains held. The selected native limb is the completed plan item.

## Acceptance and inherited-duty disposition

| Contract item | Disposition |
| --- | --- |
| Acceptance 1 | Only the selected native Calendly booking, reschedule and cancellation limb is proven here. Dial, reviewed sharing, sequence exits and live account qualification remain unclaimed. |
| Acceptance 2 | The complete booking-product buyer walk remains unclaimed under the existing prerequisites. |
| BASE-ROLE-001 | Existing authenticated operator read doors and signed-source authority are retained. Revoked source delivery is exercised in the existing source-rotation registration; no new authority door is added. |
| BASE-SECRET-001 | Existing signature verification and encryption remain; one-off export and restore confirms the signing secret does not travel. No provider credential is included in the packet. |
| BASE-DATA-004 | Native contact erasure removes visible booking copies, and replay stays unlinked. The migration and CLI archive probe preserves all four receipts and the same cancelled activity. Broader inherited duties remain with their existing owning clauses. |

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=runtime migration inventory comparison plus CLI archive round trip exit=0. Generated views were restored from origin main and neither was committed.

## Proof locations on the candidate

The HTTP registration is tests/core/source-onboarding.test.ts, line 144; its helper call is line 171. The retained signature, tampering, expiry, replay and Cal.com assertions are lines 146 through 170. The unchanged streaming-source authority registration starts at line 175.

The focused helper is tests/support/calendly-booking-proof.ts: generic-provider-data isolation at lines 15 through 18; both callback orders at line 21 and lines 69 through 73; authenticated exact contact, company and deal reads at lines 41 through 54; plan and Today readback at lines 55 through 58; the first stop and unchanged later schedules at lines 61 through 79; seen-window refresh at lines 65 through 78; replay inventories at lines 80 through 82; wrong-key and disabled-source refusal at lines 83 and 84; unknown invitee at lines 85 and 86; erasure and unlinked replay at lines 87 through 91.

The retained browser registration is tests/e2e/operator.spec.mjs, line 169. Its new Calendly flow starts at line 231; the same root and exact scheduled times, one headline, cancelled details and retained provider identities are checked through line 262. The existing icon-only People menu is checked on hover and focus at lines 263 through 266. Captures are lines 268 and 270, at 1440 and 390.

The existing Today and meeting-plan registrations start at tests/core/today-brief.test.ts, lines 31 and 287. Both pass locally with the candidate's query and projection code.

## Candidate custody

Product branch: cloud/sd-orbit-c-f163. Full head: 374e310cc268609ff27a2f08760e11ff81a7359a. Remote head matches; the product checkout is clean. Two new fleet commits were pushed without rewriting history. No PR is required because branch push starts Verify.

Exact-head Verify: 43135643566, event push, observed in_progress, conclusion None. URL: https://github.com/just-every/run-orbit/actions/runs/43135643566. No green result from another head is used. The local complete source-onboarding file passes all three registrations on this committed head. The separate booking proof, both touched Today registrations, populated browser case, typecheck and mechanical checks pass. Browser and migration proof ran on the same runtime bytes before the final commit; no relevant byte changed afterwards.

CLAIM INTEGRATE-001 PARTIAL points=none tests=tests/core/source-onboarding.test.ts#SIGNAL-001 SIGNAL-003 SIGNAL-004 vendor-native booking signatures and one Calendly activity survive reschedule, cancellation, replay and reordered delivery while unknown invitees remain unlinked; tests/e2e/operator.spec.mjs#RECORD-005 — the opportunity timeline keeps note ordering and one Calendly booking through reschedule and cancellation
GAP INTEGRATE-001: The selected native Calendly limb of acceptance 1 is complete. Whole acceptance remains unclaimed for the held paid Calendly qualification, Dial deployment and all explicitly omitted link-sharing, completion, visible connection-state, sequence and buyer-walk work.
