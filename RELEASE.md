# Orbit 0.4.12

Date: 2026-11-19

Previous version: 0.4.11

Orbit 0.4.12 makes first-run setup and everyday CRM work more reliable, clarifies when booking tools need setup, and includes security updates. It retains rer 0.2.113.

- **Finish setup and create pipelines.** Choose the workspace time zone from a list and save the initial pipeline stages. In Settings, enter the pipeline name and first stage, then select Create pipeline. Connection guides link directly to the right source in Capture Settings for credentials and delivery status.
- **Resolve import mapping problems before applying records.** The dry-run screen flags missing identity columns beside their mappings. Generic CSV contacts can match a uniquely named company in the same import. If several rows match, Orbit asks for a Company ID. If a reviewed import can no longer be applied, Orbit explains what to review before retrying.
- **Resume saved forms and review restored publications.** Open a saved form and compile its revision without saving the text again. After a local archive restore, withdrawn forms appear in Settings, ready to reopen for review and fresh capture authorization.
- **Keep working while pages load and records save.** Records search becomes editable when it can retain what you type. Overlapping autosaves preserve edits to different record fields. An explicit collaborator invitation stays available for acceptance after local sign-in.
- **See what is required to receive bookings.** Connected Products shows Calendly and Cal.com as needing setup when Orbit lacks a public HTTPS address or an enabled signed source. Once those prerequisites exist, Orbit can show that it is waiting for the first signed delivery.
- **Apply dependency security updates.** Orbit uses Hono 4.13.16 and includes a picomatch patch that disables vulnerable repeated extglobs.

### Known limits

Account proposals remain limited to selected written evidence and the existing three proposal types. Scheduled graph maintenance, transcripts, licensed enrichment and broader stakeholder inference remain incomplete. Workflow undo remains partial. Earlier erasure limitations remain: a former sponsor or approver can still appear by name in a colleague's timeline and audit rows, and an approver's name stays in the search index until it is rebuilt. These changes do not establish complete agent coverage, complete migration from another CRM or live-provider acceptance.

### Upgrade

Update from 0.4.11 in place after stopping writes and taking a private backup. This release adds no database migrations. All 84 core migrations are byte-identical to v0.4.11. Existing features require no new provider setting. Preserve the migration ledger and all already-applied migrations. For optional Slack personal mentions, add im:read alongside im:write and reinstall or reauthorize the Slack app as required. Older installations must first account for their earlier pending migrations and release instructions.

[Orbit NOW queue screenshot](.github/assets/release/orbit-now-queue-1600.png)

## Migrations

None added since v0.4.11. The inventory remains 84 files under `migrations/core`, all byte-identical to v0.4.11. Preserve every applied migration and its ledger entry. Do not replay migrations through 0092.

## Update instructions

Update from 0.4.11 in place; never reset or replace the installation. Stop local dev and hosted writes and take a private backup outside the checkout, using rer export locally or Records → Export archive when hosted. Adopt v0.4.12 and run rer install with pinned Node 22.20.0, pnpm 10.12.4 and unchanged rer 0.2.113. Use rer setup locally or rer deploy --env-file .dev.vars.deploy when hosted. This release introduces no database migrations. All 84 core migrations are byte-identical to v0.4.11. Preserve the migration ledger, all already-applied migrations and owner customizations. Do not replay migrations through 0092. Older installations must first account for their earlier pending migrations and release-history instructions. No new provider setting is required for existing features. Optional Slack personal mentions require im:read as well as im:write; update the Slack app scopes and reinstall or reauthorize it as required before using that option. Preserve current email stops, explicit clear receipts, mailbox-send and Pipedrive consent/reconnection requirements, Mailchimp webhook checks and owner confirmation for held deletion requests after reconnection or restore. Zoom credentials remain installation-local and must be reconnected after restore. Before resuming writes, check existing records and import provenance, saved views, capture setup and unlinked evidence review, draft and scheduled mail, pipeline creation and moves, form reopen and compile, invitation acceptance, booking setup status, record search and autosave, notifications and workflow activity. Retain the release-note limitations on graph maintenance, agent coverage, workflow undo, erasure and supported import scope.

Release metadata prepared by sd, 2026-11-19.
