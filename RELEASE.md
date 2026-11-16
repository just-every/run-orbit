# Orbit 0.4.11

Date: 2026-11-16

Previous version: 0.4.10

Orbit 0.4.11 makes capture setup, import review and everyday sales workflows clearer and fixes several fresh-install paths. It retains rer 0.2.113.

- **See what capture setup has actually confirmed.** Connection guides mark steps complete from the saved connection and scope, rather than from visiting a later step. Capture Settings and file-import results link to unlinked evidence waiting for review. Slack setup now includes the direct-message read permission needed to verify a personal notification's recipient.
- **Review imported customer records with more context.** Import previews show names and source values for companies, contacts and deals. Saved import details retain the source file and row, use the currently mapped operator's display name, and keep customer fields without exposing internal operator identifiers or other importer metadata.
- **Read useful evidence and field labels.** NOW citations and saved draft lists show subjects with current merge values, or explain when values or evidence are unavailable. Dashboard custom-field filters use readable labels. Deal history names owner and stage changes without a second generic entry for those same changes.
- **Move a deal between pipelines.** Choose the destination pipeline and stage in deal details, with a warning when scheduled follow-ups will be cancelled. The record refreshes after the move, and history names both pipelines.
- **Use forms and workflows more reliably.** A public form path accepts an optional leading slash. A new deal created by a form triggers its deal workflow once, with the submitted values available to its actions. The editor explains when a submission creates no new deal and therefore does not trigger a deal workflow. Workflow times follow the workspace display settings.

Account proposals remain limited to selected written evidence and the existing three proposal types. Scheduled graph maintenance, transcripts, licensed enrichment and broader stakeholder inference remain incomplete. Workflow undo remains partial. Earlier erasure limitations remain: a former sponsor or approver can still appear by name in a colleague's timeline and audit rows, and an approver's name stays in the search index until it is rebuilt. These changes do not establish complete agent coverage, complete migration from another CRM or live-provider acceptance.

Update from 0.4.10 in place after stopping writes and taking a private backup. This release adds no database migrations and requires no new provider setting for existing features. Preserve the migration ledger and all already-applied migrations. For optional Slack personal mentions, add im:read alongside im:write and reinstall or reauthorize the Slack app as required. Older installations must first account for their earlier pending migrations and release instructions.

## Migrations

None added since v0.4.10. Preserve every applied migration and its ledger entry; do not replay migrations through 0092.

## Update instructions

Update from 0.4.10 in place; never reset or replace the installation. Stop local dev and hosted writes and take a private backup outside the checkout, using rer export locally or Records → Export archive when hosted. Adopt v0.4.11 and run rer install with pinned Node 22.20.0, pnpm 10.12.4 and unchanged rer 0.2.113. Use rer setup locally or rer deploy --env-file .dev.vars.deploy when hosted. This release introduces no database migrations; preserve the migration ledger, all already-applied migrations and owner customizations. Do not replay migrations through 0092. Older installations must first account for their earlier pending migrations and release-history instructions. No new provider setting is required for existing features. Optional Slack personal mentions require im:read as well as im:write; update the Slack app scopes and reinstall or reauthorize it as required before using that option. Preserve current email stops, explicit clear receipts, mailbox-send and Pipedrive consent/reconnection requirements, Mailchimp webhook checks and owner confirmation for held deletion requests after reconnection or restore. Zoom credentials remain installation-local and must be reconnected after restore. Before resuming writes, check existing records and import provenance, saved views, capture setup and unlinked evidence review, draft and scheduled mail, pipeline moves, forms, notifications and workflow activity. Retain the release-note limitations on graph maintenance, agent coverage, workflow undo, erasure and supported import scope.

Release metadata prepared by sd, 2026-11-16.
