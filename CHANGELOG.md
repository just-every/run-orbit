# Changelog

## Unreleased

- Keep the owner’s contact search available while changing collaborator grants; full native reads check live identity and membership without treating an unrelated collaborator policy change as lost access.

- Route sign-in and reviewed customer mail through the selected Run Edit Run relay in Managed and Assisted previews, while keeping direct SendGrid deployments and local customer mail. Declare both providers and pin rer 0.2.52.
- Resume hosted restores using a digest of archive content, preserve exact part checks, explain renewed confirmation, resume saved export/restore progress on return, and label completed exports as finished.

- Add Settings → Delivery outcomes: the exact SendGrid Event Webhook Post URL, the events to tick, the signing key and the deploy command, with connected/not connected and the last signed event. Sent messages say “delivery not tracked” until then, and show Bounced or Not delivered once events arrive.
- README: step-by-step Cloudflare account ID, API token (exact permissions), workers.dev subdomain and `--env-file .dev.vars.deploy` for `rer deploy`; the dry run lists optional values separately with the feature each turns on, and the sign-in refusal names what to set in plain words.
- A new enquirer from a published form becomes an opportunity in NOW (forms can opt out). A signed-in operator opening `/` goes to the app. A capture skipped because the sender is also an operator says so.
- Restore keeps the archive's own owner and `rer dev` personas only for attribution when the installation already has a different owner; removed operators are listed separately. A restored Orbit address on an installation that cannot receive mail says “Not receiving mail”.
- Message-IDs use the sender's domain; phone layouts give the signing secret and the outside-hours confirmation room; the form's status line sits beside the step just used; deploy builds print warnings only.
- Move the hosted demo to rer 0.2.30's native Worker Loader host (own isolate and SQLite storage per visitor, Cron by alarm, edge static assets) and refresh every recorded Base copy to rer-v0.2.30.
- Mark credential fixtures and examples explicitly synthetic so hosted source checks accept them.
- Read an authenticated JSON request body once when validating it, so under Node a collected clone can no longer cancel the body a route then reads (operator erasure intermittently answered 500 in CI).

## 0.2.0 — 2026-10-14

Changes since the published v0.1.0 tag:

- Add Today’s evidence-linked brief, overdue promises, meeting plans and optional previewed account summaries. Delegated applications use existing scopes to read selected evidence and propose handoffs for human review; handoffs without citations remain compatible.
- Implement read-only Gmail/Google Calendar and Microsoft mail/calendar capture using the owner’s OAuth client and selected scope. Improve cursor progress, cancellation reconciliation, exact-address attribution, retained-excerpt privacy and replay protection after erasure. File capture and capture.source.v1 were already present in v0.1.0.
- Add only migration 0036_capture_providers.sql for installation-local OAuth and intake leases. Keep all previously applied migration bytes unchanged; capture storage migration 0035_capture.sql was already in v0.1.0.
- Adopt the pinned @runeditrun/rer 0.2.4 CLI and shared runtime. Supply Orbit’s native portability policy, keep owner refusal diagnostics bounded, and retain startup evidence.
- Improve hosted Records export/recovery controls. Document the separate local .rer and hosted Records JSON backup paths, private session-file requirements, archive exclusions and explicit resume/discard behavior. These are implemented paths, not evidence of a live hosted deployment.
- Style capture, brief and native identity screens; add README demo media and screenshots. The native sign-in guarantees and human review of exact customer messages remain in force.
- Replace verification’s dependency on unavailable private Git history with retained native source snapshots. Enable automatic Run site publication from public main.

Before updating, save a verified private backup outside the checkout and pause writes, intake and scheduled processing. Preserve operators, setup identity, records, files, queues, owner changes and applied migrations; never reset to update. Install frozen dependencies and run local `rer setup` to apply the pending migration, then verify data and outbound states before resuming. Follow MIGRATION-RECOVERY.md for hosted recovery and reconnect excluded credentials separately.

No new capacity guarantee is made. Local Worker and controlled-provider checks do not establish live Google/Microsoft account access, customer mail delivery, inbound-mail acceptance or a hosted application deployment. Marketing-site workflow success is separate from application acceptance.
