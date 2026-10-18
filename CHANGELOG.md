# Changelog

## 0.2.0 — 2026-10-18

Changes since v0.1.0 (2026-10-13). An independent release gate ran every homepage job on commit `5c72dc8` before this record: once locally at desktop and phone widths and once on a hosted Cloudflare installation with real SendGrid mail. It also updated a v0.1.0 installation in place, and every row was kept.

### What you get

- **Start in one line.** Install `rer` with the one-line installer, then `rer dev` opens Orbit signed in as you. First-run setup asks for your name, business name and time zone. On a hosted installation you sign in with an emailed link and press Confirm; a used link is refused.
- **Customer mail from your own SendGrid account.** Settings → Customer mail sender walks you through the sender, API key, reply address and unsubscribe group. It gives you the exact private lines to save and, on a hosted installation, the exact `rer deploy … --set-secret` commands for that installation. It then checks the configuration and sends you a test email. Settings → Delivery outcomes connects SendGrid's Event Webhook, so a hosted Orbit can show Delivered, Bounced or Not delivered.
- **Customer records with your own fields.** Contacts, companies and deals, with custom fields you name yourself. Sales pipelines have stage rules and reviewed moves. Deals record stakeholders and buying context. Sales tasks can recur and come with in-app reminders. You can search records and timeline text, and filter by state, stage, owner, band and queue.
- **Your contact form.** Write the form, compile it, approve the exact page and publish it. Each enquiry lands on the matching contact, and a new enquirer becomes a deal in NOW.
- **Signals from your tools.** Sources gives step-by-step recipes for website forms, booking tools and Zapier or Make, with a signing secret that is shown once. Capture takes uploaded `.eml`, mbox and `.ics` files. It can also use a private Orbit address (a hosted Orbit with your own domain on Cloudflare), a calendar link, and read-only Gmail, Google Calendar, Outlook and Microsoft Calendar connections through your own OAuth app.
- **Every email is reviewed before it's sent.** You approve one exact revision, confirm explicitly when a send falls outside the recipient's working hours, and can schedule it for later. A reply, a booked meeting, an unsubscribe or a permanent bounce cancels what you scheduled for that person. Approving the same message twice, even at the same moment, sends it once. A draft written against a recommendation that has since been replaced is refused.
- **Every score shows its working.** A score adds up what customers did: a reply adds 40 and a form 25. Older activity counts for less, falling to nothing over 30 days, and the total stops at 100. The deal page lists what each signal added.
- **Today's brief and meeting plans.** A brief built from your records lists new replies and meetings, overdue promises and items waiting for review. If you configure an AI provider, you can also get previewed account summaries.
- **Import a CSV.** HubSpot and Pipedrive exports or any spreadsheet: map the columns, run a dry run, tick the review and apply. Every import keeps its history and can be undone. Imported contacts are marked Do not contact unless the file says they agreed to email.
- **Export and restore.** A complete archive of your workspace, through Records → Export archive or `rer export`. Restore it into an empty installation. If you leave in the middle, progress is saved. An interrupted hosted restore carries on when you choose the same archive again.
- **Invite your team.** Every operator sees every customer. Removing someone revokes their sessions at once. The removal review lets you hand their open deals, sales tasks and handoffs to another operator or leave them unassigned, and it cancels their scheduled messages.
- **Managed previews.** Run Edit Run's managed previews send sign-in and reviewed customer mail through the Run Edit Run mail relay (`MAIL_PROVIDER=rer`). Your own direct SendGrid deployment works unchanged.
- **Update in place.** An installation on 0.1.0 updates without a reset and keeps every operator, record and setting.

### Not in this release

The homepage calls Orbit an alternative to HubSpot, Pipedrive and Salesforce. CONTRACT.md describes that full product, and the code is still behind it: 21 of its target clauses are missing and 30 are partial (see the Status table). In particular:

- Mail is sent only through SendGrid (or the managed relay), one recipient at a time. There is no sending from your own Gmail or Microsoft 365 mailbox (OUT-013), no CC, BCC or reply-all (OUT-019), and no templates (OUT-014). Sequences are partial (SEQUENCE-001, SEQUENCE-002), and bulk enrollment is missing (SEQUENCE-003).
- Every operator sees every record. There are no roles or private records yet (TEAM-005). Only deals have owners; contacts, companies and custom records do not (RECORD-016).
- There are no quotes or signatures (QUOTE-001), no weighted forecasts (FORECAST-001), no shared dashboards (REPORT-002), no workflows that write records (AUTO-002), no file attachments (RECORD-018) and no mentions (RECORD-017).
- There is no Salesforce migration (MIGRATE-003). Orbit has no Zoom, Slack, billing, accounting, help-desk, Mailchimp or Buoy integrations (INTEGRATE-002 to INTEGRATE-008). Booking tools reach Orbit through Sources (INTEGRATE-001 is partial). Calling is partial (CALL-001, CALL-002).
- Sending limits are 3 messages a minute for the whole installation and 100 a day per operator (OUT-010). Per-user budgets and mailbox pacing are OUT-018.
- This release makes no capacity promise. The limits in `seed.json` are estimates until a load test runs.
- The release gate did not exercise live Google or Microsoft capture, inbound mail to an Orbit address, delivery outcomes from a SendGrid Event Webhook, or the managed mail relay. Each needs the owner's own accounts, domain or Managed hosting.

### Known issues

- Resuming a part-way hosted restore needs the confirmation ticked again. The page says so.
- While a restore holds the workspace, notification polling answers 503 and fills the browser console. It stops when the restore ends.
- A generic CSV column such as `marketing_consent` is offered as a custom field, not as permission to contact. Rows are imported as Do not contact unless you map that column.
- A deal's contributions can add up past 100 while the score shows 100. The deal page doesn't say that scores stop at 100.
- After a reload, the form page hides its next step. Compile appears only after **Edit saved form**, and Publish only after **Reopen latest publication**.
- Once a deal leaves NOW you return to it from Records. Its drafts and outreach are under **Evidence and outreach**.
- With the managed mail relay, a send whose acceptance is uncertain stays delivery-unknown, because the relay offers no lookup. Check with the recipient before you send it again.
- At SendGrid's webhook limit, Orbit keeps showing "delivery not tracked". The in-app page doesn't mention the `RER_MAIL_RELAY_SECRET` alternative that the deploy dry run lists.
- Stranger journey 10 (on `32e485e`) also reported two text slips that were not re-checked for this release. Hosted "Choose where replies arrive" still speaks as if Orbit runs locally, and a scheduled time repeats its time-zone wording.

### Back up first, then update

1. Back up and keep the archive private, outside the checkout. Locally, stop `rer dev` and run `rer export --output exports/before-0.2.0.rer` (on 0.1.0: `node scripts/rer.mjs export --output exports/before-0.2.0.rer`). On a hosted installation, sign in and use Records → Import, duplicate review and data export → Export archive → Prepare export → Download completed archive. `wrangler d1 export` cannot read Orbit's search tables (MIGRATION-RECOVERY.md).
2. Install the `rer` command with the one-line installer from the Run page if you don't have it. Orbit 0.2.0 pins `@runeditrun/rer` 0.2.59 and replaces `node scripts/rer.mjs`.
3. Check out v0.2.0, then run `rer install` and `rer setup`. Locally, setup applies the eight pending migrations and keeps your owner, operators, settings and every row. For a hosted installation, run `rer deploy --env-file .dev.vars.deploy` (with your `--environment NAME`, if you gave one), which applies the same migrations there. Never reset to update.
4. Check your records, custom fields, drafts and scheduled messages before you resume work. Reconnect each source (Sources → Reconnect source) only if you restored from an archive.

### Migrations

- `0036_capture_providers.sql`: installation-local tables for Google and Microsoft capture sign-in and intake leases. Nothing in them travels in archives.
- `0037_owner_signin.sql`: stores only the digest of an owner sign-in grant.
- `0038_import_kit_v22.sql`: extends the import tables additively and carries existing import jobs into them, so earlier imports keep their history and Undo.
- `0039_sales_pipelines.sql`: adds pipelines and stage rules, and puts your existing stages into one default Sales pipeline.
- `0040_sales_tasks.sql`: adds sales tasks, kept apart from delegated handoffs.
- `0041_buying_context.sql`: adds stakeholder roles, buying context and secondary company relationships.
- `0042_record_ownership.sql`: changes nothing. A first version, briefly on main, added owner columns. It is declared as a reviewed rewrite in `migrations/rewrites.json`, and an installation that applied it keeps those columns.
- `0044_archive_content_identity.sql`: records each hosted restore's archive digest, so an interrupted restore resumes only with the same archive. It holds no customer data. There is no 0043.

## 0.1.0 — 2026-10-13

First release.
