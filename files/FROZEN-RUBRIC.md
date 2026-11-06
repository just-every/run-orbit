# Frozen original rubric

Frozen before executing the focused journeys. No earlier stable row IDs or full prior rubric were supplied; these IDs cover only the original requirement, acceptance, written inherited duties and requested DONE-RIDERS 1–11. No extra checklist is added. Full source requirement and acceptance are reproduced verbatim below.

#### OUT-011 — Unresolved submission

**Requirement.** Orbit records the outbound intent and its provider idempotency key durably before submitting. If the transaction in OUT-005 fails the message becomes reconciling; if the provider's response is a timeout it becomes delivery-unknown. In both states a job queries the provider by that idempotency key every 5 minutes, submits nothing again, and applies the OUT-005 outcome exactly once if acceptance is confirmed. With SendGrid the query uses its Email Activity API; on an account without that API each attempt records the lookup failure on the message. A SendGrid message still unresolved after 24 hours becomes a failure the operator can see, and notifies the responsible operator. Run Edit Run managed mail offers no lookup, so such a message stays delivery-unknown with that explanation, is never submitted again, and is left for the operator to reconcile.

**Acceptance.**
1. Lose the acceptance transaction or provider response; restart and reconcile the durable intent without submitting again, ending once as accepted or visibly unresolved.


- **BASE-OPS-003 — Idempotency.** Queue consumers and webhook handlers produce the same result when a message is delivered twice.
- **BASE-ROLE-001 — Roles through every door.** Every door enforces the caller's current role on the server before reading content or changing state. A role refusal returns 403 with no state change. An admin role grants no content access by itself; content access needs its own grant. This extends BASE-ACCESS-004 to reads and every product door.
- **BASE-MAIL-001 — Truthful mail outcomes.** Mail keeps queued, submitted, provider-acknowledged, failed, uncertain and person-confirmed outcomes distinct, with the evidence and time for each transition. Submission or provider acknowledgement is not a person's receipt. A scanner's fetch never counts as a person's receipt or confirmation.
- **D-1.** Suppression is person-specific. A recorded unsubscribe, permanent bounce or do-not-contact stop wins over import, capture, merge, automation and dispatch; an unattributed multi-recipient request pauses work until resolved under OUT-031.

| ID | Original checkable item | Planned verification |
| --- | --- | --- |
| R1 | Orbit records the outbound intent and its provider idempotency key durably before submitting. | S provider edge checks durable row, wire key and exact reviewed content. |
| R2 | If the transaction in OUT-005 fails the message becomes reconciling; if the provider's response is a timeout it becomes delivery-unknown. | S real late database trigger abort and timeout branches, native message reads. |
| R3 | In both states a job queries the provider by that idempotency key every 5 minutes, submits nothing again, and applies the OUT-005 outcome exactly once if acceptance is confirmed. | S normal timers at 299999 and 300000 ms; settlement and repeated-effect inventory. |
| R4 | With SendGrid the query uses its Email Activity API; on an account without that API each attempt records the lookup failure on the message. | G408 exact query, repeated 403 and authenticated readback. |
| R5 | A SendGrid message still unresolved after 24 hours becomes a failure the operator can see, and notifies the responsible operator. | G408 before-deadline and after-deadline reads and single notification. |
| R6 | Run Edit Run managed mail offers no lookup, so such a message stays delivery-unknown with that explanation, is never submitted again, and is left for the operator to reconcile. | G408 managed transport branch beyond 24 hours, explanation, no lookup and one submission. |
| R7 | Lose the acceptance transaction or provider response; restart and reconcile the durable intent without submitting again, ending once as accepted or visibly unresolved. | S actual store close and reopen, new bindings and application; G visible unresolved outcomes. |
| R8 | BASE-MAIL-001 — Truthful mail outcomes. | G202 and G408 nullable acceptance receipt, signed delivery and unresolved failure evidence. |
| R9 | BASE-ROLE-001 — Roles through every door. | Existing S OUT-009 dangerous dispatch recheck; native admission and populated unchanged-state evidence. |
| R10 | BASE-OPS-003 — Idempotency. | S repeated reconciliation and G signed replay. |
| R11 | D-1 — person-specific suppression wins over dispatch. | Retained suppression public-door journey and current submission guards; later OUT-031 obligations stay later. |
| R12 | DONE-RIDERS 1: An acceptance outcome no journey reaches. | Map full requirement and AP1 to S and G public doors, with exact-source execution. |
| R13 | DONE-RIDERS 2: A journey that cannot fail when the outcome breaks. | Seeded real transaction abort and allowed/refused unchanged-state paths. |
| R14 | DONE-RIDERS 3: Proof not loaded in a recorded run on the exact SHA. | Supplied source Verify 42088623015 dispatch and workflow wiring; permitted candidate exception only. |
| R15 | DONE-RIDERS 4: Evidence from an earlier SHA. | Local runs on exact pin; no reliance on byte-equivalence alone. |
| R16 | DONE-RIDERS 5: Inheritance claimed but not written. | Pinned meta Cites BASE-MAIL-001, BASE-ROLE-001, BASE-OPS-003 and Rules D-1. |
| R17 | DONE-RIDERS 6: Gap, Evidence or provenance stale. | Compare source row and generated view; preserve fresh-main assertions, generated write/check reserved for lander. |
| R18 | DONE-RIDERS 7: Acceptance points changed without a ct ruling, CT riders duplicated, or a rewrite loses an original obligation. | Original inline AP compared with pin and main; no acceptance changes authorized. |
| R19 | DONE-RIDERS 8: Permission and authority holes. | Existing populated authorized and refused public-door journeys, unchanged-state evidence. |
| R20 | DONE-RIDERS 9: A provider or legal boundary reported as proven. | Distinguish synthetic HTTP edges from live account and provider qualification. |
| R21 | DONE-RIDERS 10: Policy default adopted without ruling. | No new default or source mutation; inspect RULINGS and relevant diff. |
| R22 | DONE-RIDERS 11: Landing conditions not met when counted. | Pending guarded original gate and lander only; no award or release by this reviewer. |

S = tests/core/signals-outreach.test.ts — OUT-011 lost acceptance transaction or response survives a persisted restart and settles exactly once without resubmission.
G202 and G408 = tests/core/sendgrid-outcomes.test.ts — SendGrid 202 or 408 persists honest outcome, never resubmits, and reconciles real evidence.
