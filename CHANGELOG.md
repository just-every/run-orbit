# Changelog

## 0.2.0 — 2026-10-14

Changes since the published v0.1.0 tag:

- Add Today’s evidence-linked brief, overdue promises, meeting plans and optional previewed account summaries. Delegated applications use existing scopes to read selected evidence and propose handoffs for human review; handoffs without citations remain compatible.
- Implement read-only Gmail/Google Calendar and Microsoft mail/calendar capture using the owner’s OAuth client and selected scope. Improve cursor progress, cancellation reconciliation, exact-address attribution, retained-excerpt privacy and replay protection after erasure. File capture and capture.source.v1 were already present in v0.1.0.
- Add only migration 0036_capture_providers.sql for installation-local OAuth and intake leases. Keep all previously applied migration bytes unchanged; capture storage migration 0035_capture.sql was already in v0.1.0.
- Adopt the pinned @runeditrun/rer 0.2.2 CLI and shared runtime. Supply Orbit’s native portability policy, keep owner refusal diagnostics bounded, and retain startup evidence.
- Fix deterministic approval handling and hosted Records export/recovery controls. Document the separate local .rer and hosted Records JSON backup paths, private session-file requirements, archive exclusions and explicit resume/discard behavior. These are implemented paths, not evidence of a live hosted deployment.
- Style capture, brief and native identity screens; add README demo media and screenshots. The native sign-in guarantees and human review of exact customer messages remain in force.
- Replace verification’s dependency on unavailable private Git history with retained native source snapshots. Enable automatic Run site publication from public main.

Before updating, save a verified private backup outside the checkout and pause writes, intake and scheduled processing. Preserve operators, setup identity, records, files, queues, owner changes and applied migrations; never reset to update. Install frozen dependencies and run local `rer setup` to apply the pending migration, then verify data and outbound states before resuming. Follow MIGRATION-RECOVERY.md for hosted recovery and reconnect excluded credentials separately.

No new capacity guarantee is made. Local Worker and controlled-provider checks do not establish live Google/Microsoft account access, customer mail delivery, inbound-mail acceptance or a hosted application deployment. Marketing-site workflow success is separate from application acceptance.
