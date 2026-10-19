# Changelog

## 0.3.0 — 2026-10-20

Changes since v0.2.0 (2026-10-18). An independent release gate ran every homepage job on commit `7c2a636` before this record: once locally at desktop and phone widths, started with the README's one line, and once on a hosted Cloudflare installation with real SendGrid mail. On the hosted installation it took a backup, removed the deployment, deployed again and restored every row. Sending budgets, opt-out links and the end of follow-up on stage moves landed after that gate, so their journeys were run again on commit `0b2bb14`, locally at both widths with real SendGrid mail, and a populated 0.2.0 installation was updated in place to that commit with every row kept. Mentions and the move to rer 0.2.72 landed after that, so the mentions journey was run on commit `ee5d210`, locally at both widths, a populated 0.2.0 installation was updated in place to that commit with every row kept, and an archive made by 0.2.0 restored into it with every row unchanged.

### What you get

- **Deal risks.** Each deal lists what puts it at risk, and cites the record behind each finding: no contact recorded as decision-maker (or another role you require on that deal), overdue promises and tasks, a stage past its stale interval, and reported opens with no reply. If you configure an AI provider, a previewed check also looks for conflicting dates and prices in what you recorded; it sends only those lines and fails whole if a citation is not exact. You can dismiss a finding or change a deal's required roles, each with a reason, and you approve any task it proposes. Nothing here changes the deal or sends mail.
- **Form spam protection.** Published forms refuse submissions that fill a hidden field, arrive too fast or come too often from one form or network. You can also turn on Cloudflare Turnstile for a form. Each refusal is counted with its reason, and suspected spam waits in a list under Forms → Read spam and refusals, where a person can release or erase it.
- **Honest reply and open tracking.** Timelines keep provider acceptance, reported delivery, inferred open reports and real replies apart, with their source and time. An automatic reply (an out-of-office, say), a reply from someone else or an ambiguous one never stops or completes a follow-up. Orbit adds no open or click tracking of its own.
- **Everything travels in an archive.** Export and restore carry every current kind of data: custom fields and relationships, pipelines and stage history, recurring tasks, reviewed form submissions and spam, captured mail and agent handoff decisions. Restored scheduled messages lose their send approval, so nothing goes out until you approve it again.
- **Follow-up ends when the deal moves.** A scheduled follow-up is cancelled in the same step as any stage move, a won or lost close, a genuine reply or booking, an unsubscribe, a permanent bounce or do-not-contact, and says why. Reopening the deal or replaying the event never brings it back. Each deal's Approved outreach shows Follow-up outcomes: messages the provider accepted, reported deliveries, human replies, meetings booked, stage advances and the deal outcome, each counted on its own, with opens and automatic replies listed as not counted.
- **Sending budgets for each person.** Each user has their own one-to-one budget (1,000 messages a rolling day by default), so one person's volume never holds up another's, under a shared rate of 100 messages a minute. Settings → Sending capacity shows what each person has used and lets the owner change both; each change is audited. A message over a limit stays unsent and names the limit, its value and when it may be sent.
- **Opt-out links by message type.** Settings → Opt-out links decides, for one-to-one email, sequence steps and workflow email, whether Orbit adds List-Unsubscribe headers and an unsubscribe link. One-to-one email starts without them on a new installation; an updated installation keeps them on, as 0.2.0 sent them, until you change it. A rep can remove opt-out from one message as relationship or transactional mail, or add it, and the draft is reviewed again. The approval binds that choice, and the message is delivered exactly so. Each change is audited.
- **Mentions.** Type `@` in a note, a logged call or meeting, a task note or a handoff to mention a colleague; autocomplete offers your active operators and the collaborators who accepted their invitation. Each colleague you mention gets one notification that opens the exact entry, editing notifies only people newly mentioned, and deleting the entry withdraws notifications not yet read. A collaborator who cannot see the record cannot be mentioned until you share it with them or remove the mention; a mention never grants access. Notifications → Mentions lists every entry that mentions you. Mentions stay internal: they never reach a customer or an AI request.
- **Connected products.** Settings → Connected products names the products Orbit works beside (booking, meetings, calling, support, signatures, billing, accounting, Slack, Mailchimp and Buoy), the job each one owns, and whether it reaches Orbit. Today signed Calendly and Cal.com bookings do; the rest say plainly that they are not available in Orbit.
- **Setup-owner protection.** Another operator cannot remove the operator who set Orbit up, and the last administrator cannot remove themselves.
- **Update in place.** An installation on 0.2.0 updates without a reset and keeps every operator, record and setting.

### Not in this release

The homepage calls Orbit an alternative to HubSpot, Pipedrive and Salesforce. CONTRACT.md describes that full product, and the code is still behind it: all 79 published clauses are done, but 20 target clauses are missing and 24 are partial (see the Status table). In particular:

- Mail is sent only through SendGrid (or the managed relay), one recipient at a time. There is no sending from your own Gmail or Microsoft 365 mailbox (OUT-013), no CC, BCC or reply-all (OUT-019), no templates (OUT-014) and no opt-in open or click tracking (OUT-016). There are no multi-step sequences yet (SEQUENCE-001 is partial), and bulk enrollment is missing (SEQUENCE-003).
- Every operator sees every record. Roles and private records are partial (TEAM-005). Only deals have owners; contacts, companies and custom records do not (RECORD-016).
- There are no quotes or signatures (QUOTE-001), no weighted forecasts (FORECAST-001), no shared dashboards (REPORT-002), no workflows that write records (AUTO-002) and no file attachments (RECORD-018).
- Forms are fixed contact forms. Mapping fields to company, deal or custom properties and posting directly from your own site are still to come (FORM-001 is partial).
- There is no Salesforce migration (MIGRATE-003). Orbit has no Zoom, Slack, billing, accounting, help-desk, Mailchimp or Buoy integrations (INTEGRATE-002 to INTEGRATE-008), and Connected products lists them as not available. Booking tools reach Orbit through Sources (INTEGRATE-001 is partial). Calling is partial (CALL-001, CALL-002).
- Mentions are partial (RECORD-017): a mentioned collaborator has no notification inbox yet, so they cannot open their mention; there are no team mentions (TEAM-005), and mentions notify in the app only, not by email, push or Slack (NOTIFY-003).
- Sending budgets cover one-to-one mail today. Sequence budgets and pacing per mailbox arrive with sequences and mailbox sending (OUT-018).
- This release makes no capacity promise. The limits in `seed.json` are estimates until a load test runs.
- The release gate did not exercise live Google or Microsoft capture, inbound mail to an Orbit address, delivery outcomes from a SendGrid Event Webhook, the managed mail relay, Cloudflare Turnstile on a form, or the AI conflict check. Each needs the owner's own accounts, keys, domain or Managed hosting.

### Fixed before release

- The release qualification's full-capacity archive check compared the restored installation with the source and found one extra operator, membership and provision. Restore keeps the restoring installation's own operator on purpose, so that whoever restores is never locked out; the check now sets that operator's rows aside and checks them exactly, and every other table must still match the source row for row.
- Verification occasionally failed to start a test Worker ("Emitted Worker exited before readiness"): the test chose a free port and released it, and Wrangler's own listeners could take that port first. Test ports now come from a range the operating system never hands out on its own.
- An archive made by 0.2.0 could not be restored into this release: the opt-out migration (`0047_opt_out_settings.sql`) keeps one-to-one opt-out on for an installation that already has people, and the restore refused to skip that step. Orbit now runs on rer 0.2.72, which applies that step to the restored data, so a 0.2.0 archive restores with every row and one-to-one opt-out kept on.

### Known issues

- On the managed mail relay (Managed hosting), Orbit cannot add opt-out links yet, so it refuses every message that needs one with "This relay cannot carry your opt-out link yet (OUT-013)". Only a reply in a thread the recipient has answered is sent there, labeled as sent without opt-out. A one-to-one message without opt-out (the setting off, or opt-out removed as relationship or transactional mail) is sent as before. Your own SendGrid account carries opt-out normally.
- A restore brings back imported contacts and companies, but not their import history: archives leave out the import tables, so an import made before the backup cannot be undone on the restored installation.
- Scheduling a draft that was written before another message to the same deal was sent is refused with "Revision already approved, changed, or is no longer permitted". The refusal is correct (the deal's recommendation changed), but the message does not say so; write a new draft.
- While a restore holds the workspace, notification polling answers 503 and fills the browser console. It stops when the restore ends.
- The 0.2.0 known issues this gate did not re-check still stand: a resumed hosted restore needs its confirmation ticked again; a generic `marketing_consent` column is offered as a custom field, not as permission to contact; a deal's contributions can add up past the score's cap of 100 without saying so; after a reload the form page hides its next step behind **Edit saved form** or **Reopen latest publication**; with the managed relay an uncertain send stays delivery-unknown; and the in-app delivery page does not mention the `RER_MAIL_RELAY_SECRET` alternative.

### Back up first, then update

1. Back up and keep the archive private, outside the checkout. Locally, stop `rer dev` and run `rer export --output exports/before-0.3.0.rer`. On a hosted installation, sign in and use Records → Import, duplicate review and data export → Export archive → Prepare export; Orbit emails you a "Confirm it's you" link first, then Download completed archive. `wrangler d1 export` cannot read Orbit's search tables (MIGRATION-RECOVERY.md).
2. Check out v0.3.0, then run `rer install` and `rer setup`. Orbit 0.3.0 pins `@runeditrun/rer` 0.2.72. Locally, setup applies the three pending migrations and keeps your owner, operators, settings and every row; if you changed the owner email under Settings, set `OWNER_EMAIL` in `.dev.vars` to that address first, as setup asks. For a hosted installation, run `rer deploy --env-file .dev.vars.deploy` (with your `--environment NAME`, if you gave one), which applies the same migrations there. Never reset to update.
3. No new setting is needed. `ORBIT_FORM_TURNSTILE_SECRET` is optional, only for a form you opt in to Cloudflare Turnstile. Check Settings → Sending capacity and Settings → Opt-out links once: default limits rise to 100 messages a minute shared and 1,000 a user per rolling day, and one-to-one opt-out stays on until you change it.
4. Check your records, custom fields, drafts and scheduled messages before you resume work.

### Migrations

- `0045_form_abuse.sql`: adds two tables for refused form submissions, one for refusal details and one for the suspected-spam values a person can release or erase. No existing table changes.
- `0046_sending_capacity.sql`: adds an empty table for the owner's changes to the shared sending rate and each user's one-to-one budget; without a row the defaults apply. No existing table changes.
- `0047_opt_out_settings.sql`: adds the opt-out setting for each message type, each draft's opt-out choice and the opt-out state each approval binds. An installation that already has users keeps one-to-one opt-out on; messages approved before the update keep their original unsubscribe group. No existing table changes.

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
