# Orbit direct-action notifications

Tag: main-orbit-own-notifications-1
Repository: just-every/run-orbit
Product branch: cloud/main-orbit-own-notifications-1

## Plan

The complete execution plan is in PLAN.md. Configure the authorized fleet tooling, reproduce through the public create route, suppress a direct actor only at notification insertion, extend existing route/browser tests without adding registrations, run touched checks, synchronize main, regenerate the source lock last, push only the task branch, check exact-SHA Verify, and return this explicit packet through its separate evidence ref. The fleet owns the publication scan and landing on main.

## Reproduction

Before the fix, POST /api/v1/workbench/opportunities as the authenticated person changed that person's unread count from 0 to 1. Its feed contained opportunity.now with “Operator created opportunity”. reproduction.json is the actual public-route observation.

## Implementation

A new BEFORE INSERT trigger applies the same recipient rule to every notification kind, including trigger-generated and explicitly written notices. Native authenticated mutations set the direct actor in runtime_controls only within each D1 batch, and clear it before that transaction commits. AsyncLocalStorage separates overlapping request scopes; a rolled-back batch cannot retain another person's actor. No notification rows are backfilled, deleted or marked read by this change.

Only the direct actor's new notice is suppressed. Recipient selection and access rules for everyone else remain as implemented. Agent and integration doors, saved workflow execution, captured/provider work and scheduled operations remain automatic. Immediate responses to a native Send click remain part of that person’s direct action, including accepted, failed and uncertain results. Later signed provider callbacks and scheduled sends run outside that direct scope and still notify the responsible person. The strengthened public-route send journey asserts this distinction and a later provider failure/replay.

The existing notification journey now creates an opportunity as A and checks silence, then has B record a meeting on A's assigned opportunity and checks the five-second badge update, feed/count agreement, keyboard opening and idempotent read. Its assertions run at 1440; separate screenshots show that same changed screen at 1440 and 390. The fixture's second session is created only when requested by this existing journey.

The existing managed-owner/MCP test additionally uses both real native sessions and a signed MCP token: A's direct create adds no unread row, an action for B notifies B exactly once on replay, and an opportunity created by an agent for A triggers A's configured workflow notice. The same automatic notice also reaches A after a native creation; replay adds none. Previously stored notices remain byte-for-byte unchanged through the public feed.

## Acceptance and scope

CONTRACT.md, its Status/Gap/Evidence cells, ACCEPTANCE.md and docs/CLAIMS.md are unchanged. No DONE claim is made. Existing responsible-recipient, replay, delivery-outcome and fresh-sign-in assertions are retained, with the manual self-action expectation updated to the requested behavior. No notification preferences, digest email, new notification kinds or unrelated findings are added.

Test inventory before and after: 198 registered cases plus 2 qualification flows = 200/200. No test registration added or removed. Clause statuses/counts: unchanged.

## Validation history

Initial runs using the VM's Node 24 and overlapping fresh migration processes exceeded the existing 60-second isolated database setup limit. Subsequent execution uses the repository's Node 22.20.0 and pnpm 10.12.4. One new fixture initially used a form event that did not enter NOW; it was corrected to a meeting event. The browser journey's total timeout allows two isolated session setups; the five-second badge assertion is unchanged. The extended agent fixture initially left a new deal assigned to the colleague, which correctly blocked the enclosing membership-removal proof; its synthetic records now clean up through the public DELETE routes before that proof continues. Final results and exact product custody are recorded in RECEIPT.json.

Full local verify was not run, as required by the touched-check rule. Branch Verify provides the full wall. No deployment or main push is performed. No PR is required by this edition's AGENTS.md.

## Claim lines

CLAIM NOTIFY-001 PARTIAL points=1 tests=tests/core/assistance.test.ts#NOTIFY-001 assigned owners override latest actors; unassigned NOW, replies and failures follow the latest actor once

CLAIM NOTIFY-002 PARTIAL points=1 tests=tests/core/assistance.test.ts#NOTIFY-001 NOTIFY-002 queue transitions notify once and recipient read state survives a fresh sign-in; tests/e2e/zz-notifications.spec.mjs#NOTIFY-002 direct actions stay silent while another person updates the badge within five seconds and opening persists one read

The added signed-MCP proof runs inside tests/core/managed-owner.test.ts#Managed owner claim verifies RER authority and creates the native owner and session exactly once; company text cannot change MCP classification. Its helper is tests/support/notification-direct-proof.ts.

## Product custody

The first product commit was rebased before publication onto origin/main 81e9125e1e7bd533a7a7545469255d7b9613b484, retaining the newer mail-setup code and tests. The first published head was f50ca67804c1c6ead251e1a40c69b7a0bf18483e; the final candidate is 285123446209ab1c0eb5496c6a593dd2b54bc66c. The lock was regenerated again on that candidate and remained byte-identical; its check passes. Product push succeeded on the first guard attempt. No published history was rewritten. Verify run 42999862255 belongs to the superseded first head. Final Verify run 43001814461 belongs to 285123446209ab1c0eb5496c6a593dd2b54bc66c. The follow-up fetched main and merged it without rebasing; main was already current. Candidate browser/typecheck and the terminal CI outcome are recorded in RECEIPT.json.

The local managed-owner test passed (1/1), including the added direct/colleague/agent/automation proof, and assistance passed (6/6). The complete test inventory remains 200/200. The normal build, deployment-spec check, source-lock check, boundaries and contract-docs check passed locally. No clause status cells or generated views changed.

A follow-up product commit tightens the first published implementation: immediate send responses remain in the person’s direct scope. The first published SHA and its Verify run are retained as superseded provenance, never treated as the final candidate. RECEIPT.json records the final head and its exact-SHA Verify; RECEIPT-first.json records the original pushed head.

## Terminal result

PUSHED branch=cloud/main-orbit-own-notifications-1 head=285123446209ab1c0eb5496c6a593dd2b54bc66c

Verify 43001814461 was still in_progress on that exact SHA at the final observation after five eligible five-minute status polls on the final run. Eight GitHub calls were used overall, including the superseded head, leaving two reserved for failure diagnostics. No completed failing run was observed, and no READY claim is made. The fleet must await this exact-SHA result and run its own publication scan before landing.

Final candidate checks passed: browser journey (1/1), typecheck, source lock, boundaries, contract-doc generation check and deployment spec. The final assistance run passed all six cases, including direct send acceptance/failure/uncertainty silence and a later signed provider failure/replay. The managed-owner/agent case passed before the send-only refinement; final branch Verify reruns the complete required wall. The candidate browser rebuilt the final app and saved both proof widths. Registered inventory remains 198 cases plus two qualification flows, 200→200. Clause statuses are unchanged; PR: none required or created. No product blocker is known; exact-SHA CI is pending.

The explicitly selected evidence packet includes the actual failed local setup/fixture logs as validation history as well as the final successful logs and receipts. The packet contains synthetic test data only; browser traces, credentials, private environment files and private held-out gate material are excluded.
