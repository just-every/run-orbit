# Orbit claims supplement

This supplement records the OUT-020 claim boundary; the complete inventory remains [CONTRACT.md](../CONTRACT.md#status) and the journeys remain [ACCEPTANCE.md](../ACCEPTANCE.md). It adds no homepage claim.

| Claim | Clause and evidence boundary |
| --- | --- |
| Opt-out settings and per-message choices preserve the state approved for each unsent message. | OUT-020 retains audited type settings, new-installation/upgrade defaults, permitted removal and addition, stale review and approved-unsent counts. |
| Single-recipient managed mail may carry an installation-origin opt-out capability. | Authorized by ct on 20 October 2026 at 07:15Z. Approval binds the opaque message/recipient capability; the visible footer and both list headers use it at `AUTH_ORIGIN`. GET confirms without mutation; plain-button and RFC 8058 POST are idempotent and suppress only the bound contact while atomically canceling that contact's scheduled outbound work. No identity enumeration; erasure invalidates; otherwise no expiry. The HTTP/relay-edge test and built-Worker journey passed at 1440/390, so OUT-020 is DONE for this path plus the named inheritors. |
| Managed transport preserves prior approvals. | Older SendGrid and pre-setting opt-out-on approvals stay on after a switch; explicit removed/off approvals stay off; a historical `transport` marking retains refusal. |
| Additional execution paths retain named obligations. | OUT-019 carries multi-recipient/unattributed requests; SEQUENCE-001/003 and AUTO-001 carry their settings, execution and stops; OUT-013 carries mailbox reuse. They are not claimed complete by this supplement. |

Proof: `tests/core/outbound-boundaries.test.ts` — “OUT-020 managed opt-out is approval-bound, suppresses only its recipient and stops replayed dispatch”; screenshots `tests/evidence/contract/OUT-020/{1440,390}-{review,settings,confirmation,unsubscribed,invalid}.png`. The HTTP/relay-edge test and screenshots were exercised on 20 October 2026. Records and CLI restores carry capabilities, and the released v0.3.0 additive upgrade kept all 125 existing rows across 203 tables unchanged. A passing relay-edge test establishes submitted bytes and local behavior, not live relay delivery.

Source provenance: `5ad1f2f0629415ba50f04a3230e9d450c0b66862` (20 October 2026). The existing 200-case cap is unchanged.
