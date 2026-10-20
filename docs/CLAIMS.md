# Orbit claims

## Forecast claims

FORECAST-001 covers reviewed USD forecasts on current deals. The installation owner administers stage probabilities and categories, deal overrides, one-time and recurring schedule lines, and monthly or quarterly per-rep quotas. Current full operators can read; collaborators cannot. The [contract](../CONTRACT.md) and [acceptance](../ACCEPTANCE.md) retain TEAM-005’s real team membership, team access and team quota comparison, and QUOTE-001’s product/quote-line linkage and schedule comparison. Current deal schedules do not wait for those clauses.

Reports separates open unweighted value, amount × reviewed probability, forecast categories, closed-won bookings, one-time/recurring scheduled amounts, MRR, ARR and quota attainment. Engagement score never supplies probability. Dates use UTC calendar days with the end excluded. These are sales forecast measures, never recognized accounting revenue.

Reviews retain actor, reason, time and every prior revision. Saved as-of snapshots retain their original inputs and results after later overrides and wins. Current access is checked on every read; erasure withdraws affected snapshots and review streams in full, preserving unrelated snapshots. Records and local archives carry the forecast data without sign-in authority.

The existing browser journey “FORECAST-001 USD weighted value, override, quotas and recurring schedules preserve prior snapshots” exercises the USD 15,000 example, an override, quotas, schedules, a win, missing/stale inputs, refused access, archive round trips and erasure. Its forecast, override and history screenshots are retained at [FORECAST-001](retained-verification/FORECAST-001/). Released v0.3.0 row preservation is exercised in the existing forward-upgrade case. No tests were added to the 200-flow budget, and these claims do not establish completion of the remaining CRM target clauses.

## Opt-out claims

This supplement records the OUT-020 claim boundary; the complete inventory remains [CONTRACT.md](../CONTRACT.md#status) and the journeys remain [ACCEPTANCE.md](../ACCEPTANCE.md). It adds no homepage claim.

| Claim | Clause and evidence boundary |
| --- | --- |
| Opt-out settings and per-message choices preserve the state approved for each unsent message. | OUT-020 retains audited type settings, new-installation/upgrade defaults, permitted removal and addition, stale review and approved-unsent counts. |
| Single-recipient managed mail may carry an installation-origin opt-out capability. | Authorized by ct on 20 October 2026 at 07:15Z. Approval binds the opaque message/recipient capability; the visible footer and both list headers use it at `AUTH_ORIGIN`. GET confirms without mutation; plain-button and RFC 8058 POST are idempotent and suppress only the bound contact while atomically canceling that contact's scheduled outbound work. No identity enumeration; erasure invalidates; otherwise no expiry. The HTTP/relay-edge test and built-Worker journey passed at 1440/390, so OUT-020 is DONE for this path plus the named inheritors. |
| Managed transport preserves prior approvals. | Older SendGrid and pre-setting opt-out-on approvals stay on after a switch; explicit removed/off approvals stay off; a historical `transport` marking retains refusal. |
| Additional execution paths retain named obligations. | OUT-019 carries multi-recipient/unattributed requests; SEQUENCE-001/003 and AUTO-001 carry their settings, execution and stops; OUT-013 carries mailbox reuse. They are not claimed complete by this supplement. |

Proof: `tests/core/outbound-boundaries.test.ts` — “OUT-020 managed opt-out is approval-bound, suppresses only its recipient and stops replayed dispatch”; screenshots `tests/evidence/contract/OUT-020/`. The HTTP/relay-edge test and screenshots were exercised on 20 October 2026. Records and CLI restores carry capabilities, and the released v0.3.0 additive upgrade kept all 125 existing rows across 203 tables unchanged. A passing relay-edge test establishes submitted bytes and local behavior, not live relay delivery.

Source provenance: `5ad1f2f0629415ba50f04a3230e9d450c0b66862` (20 October 2026). The existing 200-case cap is unchanged.
