# Changelog

## 0.4.2 — 2026-10-30

Orbit 0.4.2 is a security release. The agent door now refuses a still-valid access token whose email claim no longer matches the subject's current native email, with a typed 401 or 403 instead of serving the request (conformance point BASE-AGENT-004.sponsor.changed-email). It also carries the record changes made since 0.4.1: each deal's page opens on its next action, with one Activity list and its details beside the work; opportunities, contacts and companies each have their own address, and every record has its own page; record values and workspace settings save as you change them; and each sent message states what Orbit knows about its delivery. Orbit now runs on rer 0.2.93. It updates 0.4.1 in place with no migration and keeps every row.

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

## 2026-10-28 — Contract source record

The following evidence and judgement notes retain their original wording. They describe prior work; current status is in CONTRACT.md.

### TEAM-001 — prior judgement note

Restricted sellers, managers and analysts are TEAM-005. The v0.2.0 release gate exercised the restated clause through its public door on 5c72dc8.

### TEAM-002 — prior judgement note

—

### TEAM-003 — prior judgement note

Persisted US timezone, USD, working hours and intervals exercised with multiple pipelines through Settings and Records at 1440/390.

### TEAM-004 — prior judgement note

Ownership handover of contacts, leads, companies and custom records is RECORD-016; sequence enrollments are SEQUENCE-001. The v0.2.0 release gate exercised the restated clause through its public door on 5c72dc8.

### RECORD-002 — prior judgement note

Primary and explicit secondary company associations, reviewed deal stakeholders, reassociation history and merge/erasure handling are implemented without rewriting prior customer history.

### RECORD-006 — prior judgement note

The 500 ms first page at declared capacity is qualified separately and not promised. The v0.2.0 release gate exercised the restated clause through its public door on 5c72dc8.

### RECORD-007 — prior judgement note

Contact, lead, company and custom-object owners and assignment notifications are RECORD-016. The v0.2.0 release gate exercised the restated clause through its public door on 5c72dc8.

### RECORD-010 — prior judgement note

Implemented source and exercising tests; file attachments are tracked under RECORD-018; live hosted/provider acceptance remains separate.

### RECORD-011 — prior judgement note

Company and contact projections link related records; company totals include only open deals and reconcile after explicit reassociation while historical entries, deal owner and lifecycle remain intact.

### RECORD-012 — prior judgement note

Implemented source and exercising tests, including the contactable default for a hand-created contact and do-not-contact on normalized recreation of a suppressed address; unattributed opt-outs from multi-recipient messages are inherited by OUT-019. Live hosted/provider acceptance remains separate.

### SIGNAL-007 — prior judgement note

Implemented source and exercising tests for the no-tracker rule; OUT-016's opt-in mail tracking exception is tracked under OUT-016. Live hosted/provider acceptance remains separate.

### CAPTURE-001 — prior judgement note

Implemented source and exercising tests; captured attachments are tracked under RECORD-018; live hosted/provider acceptance remains separate.

### CAPTURE-002 — prior judgement note

Implemented source and exercising tests for file and address capture; the connected-source new-prospect path is tracked under CAPTURE-012. Live hosted/provider acceptance remains separate.

### CAPTURE-005 — prior judgement note

Implemented source and exercising tests; the explicit contactability choice on accepting a new-prospect proposal is tracked under CAPTURE-012. Live hosted/provider acceptance remains separate.

### CAPTURE-007 — prior judgement note

Implemented source and exercising tests; attachment portability and erasure are tracked under RECORD-018; live hosted/provider acceptance remains separate.

### OPP-001 — prior judgement note

The v0.2.0 release gate exercised the restated clause through its public door on 5c72dc8.

### OPP-003 — prior judgement note

Every opportunity save and every linked weighted signal evaluates in the same write. The v0.2.0 release gate exercised the restated clause through its public door on 5c72dc8.

### OPP-009 — prior judgement note

Native named pipelines, ordered stages, probabilities, required fields, stage stale intervals, guarded moves/history and occupied deletion refusal exercised; board/list share filters. Workflow engine remains tracked under AUTO-002.

### ACTION-001 — prior judgement note

The v0.2.0 release gate exercised the restated clause through its public door on 5c72dc8.

### ACTION-002 — prior judgement note

The v0.2.0 release gate exercised the restated clause through its public door on 5c72dc8.

### ACTION-003 — prior judgement note

Implemented source and exercising tests for drafts on an opportunity's recommendation; drafting from a contact, lead or company record is tracked under OUT-017. Live hosted/provider acceptance remains separate.

### ACTION-004 — prior judgement note

Implemented source and exercising tests for a single recipient; To, CC and BCC lists are tracked under OUT-019. Live hosted/provider acceptance remains separate.

### OUT-001 — prior judgement note

Exact reviewed single sends support the selected RER relay and direct SendGrid, including visible rejected and uncertain outcomes; batch approval is tracked under SEQUENCE-003 and multi-recipient To/CC/BCC approval under OUT-019. Live hosted/provider acceptance remains separate.

### OUT-003 — prior judgement note

The v0.2.0 release gate exercised the restated clause through its public door on 5c72dc8.

### OUT-004 — prior judgement note

Implemented source and exercising tests for opportunity-linked sends; threading of deal-less sends is tracked under OUT-017, and replies from CC and BCC recipients under OUT-019. Live hosted/provider acceptance remains separate.

### OUT-005 — prior judgement note

Implemented source and exercising tests for sends linked to an open opportunity; the deal-less awaiting-response obligation is tracked under OUT-017. Live hosted/provider acceptance remains separate.

### OUT-006 — prior judgement note

Transient retries, exhaustion, permanent failure and the permanent-bounce stop are each exercised by the cited tests.

### OUT-007 — prior judgement note

Implemented source and exercising tests; pausing for an unattributed multi-recipient stop request is inherited by OUT-019; live hosted/provider acceptance remains separate.

### OUT-010 — prior judgement note

Per-user one-to-one budgets and the team-scaled shared rate are exercised by OUT-018's journey; sequence budgets and mailbox pacing remain OUT-018 obligations inherited by the sequence and mailbox clauses.

### OUT-011 — prior judgement note

Live Email Activity lookup depends on the owner's SendGrid account and was not exercised.

### OUT-012 — prior judgement note

Implemented source and exercising tests for single-recipient messages, which carry opt-out where OUT-020's per-type setting puts it (messages approved before that setting keep the unsubscribe group); the single-recipient managed-relay handler is OUT-020; the multi-recipient opt-out scope is inherited by OUT-019. Live hosted/provider acceptance remains separate.

### PUBLIC-001 — prior judgement note

The v0.2.0 release gate exercised the restated clause through its public door on 5c72dc8.

### DATA-001 — prior judgement note

Target-feature additions are DATA-003. The v0.2.0 release gate round-tripped both archive doors on 5c72dc8: a local Records archive restored into an empty hosted installation (resumed after an interruption) and exported again, and a .rer export imported after reset with an identical content hash.

### DELEGATE-001 — prior judgement note

Scoped delegation exists; never grants outreach authority.

### TEAM-005 — prior judgement note

Implemented first slice: author-controlled privacy for a note, logged call/meeting, task note or handoff; collaborator record/shared/search/mention/notification reads withhold private entries regardless of the record grant. Visibility changes are audited, flags round-trip through the CLI archive and disappear with deleted entries. Private entry, task-note and handoff controls and collaborator Shared records are exercised at 1440 and 390. FORM-001 round robin retains its explicit active full-operator lists; ownership alone grants no current access. Native teams, team mentions, restricted sales roles, team queues and chosen-user/team notifications remain gaps. Default adopted: every active full operator keeps equal access, authors alone change entry privacy, and private entries grant collaborators no visibility.

### RECORD-014 — prior judgement note

Owner-defined text, number, date and picklist fields on contacts, companies and deals retain required/unique validation, affected-record preview and read-only archived values. Settings now reads immutable definition revisions with their original labels, types, choices, required/unique and archived state; paged native HTTP reads and fresh-session reads after local archive restore preserve that meaning. This is definition history, not a claim of per-record value history. Custom objects and explicit relationships/layouts, lead qualification/conversion preserving source, activities and consent, saved filtered lists with column choice and sorting, reviewed bulk field edits with individual failures, and field-value history naming the user/import/capture/API source remain gaps. Workflow-change approval and workflow/version history inherit AUTO-002. The saved-list rendering slice needs the held list/filter JSX at src/core/features/operator/ui/records-page.tsx:42 in cloud/uip-orbit-s2-records; no overlapping edit was made. Future lead/custom-object intake retains FORM-001 notification, consent, abuse, export and erasure duties, with no custom-object intake carve-out. Default adopted: installation-owner administration, explicit preview/apply and no data rewrite; no lead/custom-object obligation is removed.

### RECORD-015 — prior judgement note

Explicit multi-role stakeholders, human verification, missing-role disclosure, secondary company relationships, products, next step and mutual commitments are implemented. Relationship changes preserve identity, history, lifecycle, owner and contact permission.

### RECORD-016 — prior judgement note

Contact/company record-page and list/search bulk assignment, attributed history, per-item refusals, guarded undo and grouped native in-app notices ship. Full operators retain existing workspace access; collaborators receive no new ownership mutation authority or content-bearing assignment notice. CSV owner mapping, My/Unassigned default views, owner grouping and report/dashboard filters, company/first-email assignment rules, deal assignment notices and removal handover remain gaps. Leads/custom objects inherit RECORD-014; restricted sellers inherit TEAM-005 and owners never grant access; email/push/Slack delivery inherits NOTIFY-003; connected-mailbox writes inherit OUT-013/CAPTURE-010/CAPTURE-012, workflows AUTO-001 and public responses API-001. Import-provider mappings remain MIGRATE-001/002/003.

### RECORD-017 — prior judgement note

Mentions in notes, logged calls and meetings, task notes and handoffs, autocomplete, the share-or-remove prompt, the audited "Include notes, calls and meetings" grant option (off by default) and its ask before saving, one notification per colleague opening the exact entry, a collaborator's own scoped notifications and count opening the entry on Shared records read-only, hidden on revocation and shown again on a new grant, the edit and delete rules, the Mentions view, AI and customer exclusion and export and erasure are proven through public HTTP and at 1440/390. Team mentions and per-entry private visibility are TEAM-005's and email, push or Slack delivery NOTIFY-003's.

### RECORD-018 — prior judgement note

No implementation found. There is no file storage, upload route or Files list on any record or activity, and src/core/features/capture/mime.ts skips every Content-Disposition: attachment part when parsing captured mail, so captured attachments are dropped; migration presets carry no files.

### MIGRATE-001 — prior judgement note

Reviewed HubSpot CSV presets cover core records/deals/prepared notes; connected migration and full activity/owner/pipeline and attachment coverage are missing.

### MIGRATE-002 — prior judgement note

Pipedrive core CSV presets exist; complete connected migration, products, activity history and files remain missing.

### MIGRATE-003 — prior judgement note

No implementation found. No implementation of this complete target flow was found.

### CAPTURE-010 — prior judgement note

Durable provider reads retain their selected-scope and OAuth safeguards. The owner chooses held review (default), most recently active open deal or all open deals for exact-contact connected mail; trusted message identity retains priority. Automatic evidence names its rule, and one reviewed action moves or removes deal links without rewriting the original. No-open-deal mail links only the contact and primary company. Reviewed corrections permit any deal the current full operator may view and change, including closed deals and deals unrelated to the captured contact; the original contact and company history remain. TEAM-005 retains real administrator and restricted-record policy; current full operators retain existing workspace access and collaborators gain no capture door. Live Gmail and Microsoft acceptance requires the owner's authorized journey and remains unmeasured; attachments inherit RECORD-018, unknown-participant proposals CAPTURE-012, and the fixed calendar window still needs explicit extension. Implemented first slice: the installation owner acts as administrator until TEAM-005 supplies sales roles. An open deal's activity is the latest recorded source or operator timeline entry, or its creation time when no later entry exists; ties use deal identity order. Active full operators may move captured mail to any currently accessible, changeable deal or remove its deal links. A fingerprint binds the reviewed association, correction history and offered deal revisions; stale reviews return 409, unavailable targets return 403, and collaborators or restricted roles are refused. Replay repeats no mutation or audit. Ownership grants no access. ct approved this first slice at 02:08Z on 24 October 2026. Default adopted: held review for automatic association; current full-workspace operators only for corrections, with denied access and stale reviews refused.

### CAPTURE-011 — prior judgement note

Implemented first slice: separate opt-in OAuth write consent requests Google calendar.events or Microsoft Calendars.ReadWrite; exact saved attendees, message and times are reviewed before one create, reschedule or cancellation attempt. Provider revisions and source/customer authority fence writes; provider edits become conflicts for fresh review, ambiguous outcomes remain held, and cancelling one written occurrence leaves the other intact. Activities retain one entry per written meeting. Google and Microsoft consent screens show the requested read scopes and add write scope only after separate opt-in, at 1440 and 390; their native form submissions request those exact scopes. Read-only tokens contain no write scope, unsolicited write grants are refused, and read-only consent cannot authorize writeback. Invitation review and conflict screens are exercised at 1440 and 390. Writeback currently changes single meetings created by Orbit; provider-captured meeting editing, recurring-series authoring and live-account proof remain gaps. Default adopted: read-only unless separately consented to Google calendar.events or Microsoft Calendars.ReadWrite; no automatic invitation, retry or conflict overwrite.

### CAPTURE-012 — prior judgement note

CAPTURE-012: connected unknown-participant proposals, explicit reviewed contactability basis, exclusion and retention enforcement, all named back-fill doors, replay and erasure, authorized Gmail and Microsoft proof, provider qualification and jurisdiction-specific legal qualification remain unproved. Same-thread mailbox sending remains OUT-013, record composition OUT-017, reply all OUT-019, expanded roles TEAM-005 and ownership behavior RECORD-016.

### FORM-001 — prior judgement note

Implemented first slice: Reviewed fixed forms retain consent, atomic intake, honeypot, signed fill proof, per-form/network limits, optional Turnstile, counted refusals, erasable spam and exactly-once release. Allowlisted HTTPS direct posts use the same admission without cookies or tracking. Required and optional free-text and picklist fields map to contact/company/new-deal native and custom JSON properties; exact business domains link/create companies, chosen stages enter NOW, empty values fill and populated differences wait as CAPTURE-004 proposals. A picklist accepts only its reviewed choices. Hidden fields carry a fixed value from the reviewed definition or one declared query parameter, read from the hosted page address, copied from the embedding page by the generated framed embed or sent by a direct post; publication review lists them, and a saved definition change takes effect only after its new revision is compiled, reviewed and published. Forged choices, undeclared names and fixed-value overrides are refused as invalid_fields without a customer or proposal write. Existing contact owners remain; fixed, durable active-user round robin and unassigned rules record each choice and notify the selected full operator once per accepted submission. Team selection, team queues and team notifications inherit TEAM-005; explicit full-operator lists are used meanwhile. Lead/custom-object kinds inherit RECORD-014 and email/push delivery NOTIFY-003. No new collaborator publication or content-notification authority is granted. ct approved these hidden-field defaults at 03:36Z on 24 October 2026. Default adopted: a fixed hidden value comes only from the reviewed definition and is not written into the published page; a query value is optional, at most 500 characters, keyed by its declared field and validated by the mapped property type, an invalid one refusing the enquiry as invalid_fields; hidden fields cannot set a contact email or company domain and never select owners, teams, stages, recipients or permissions.

### OUT-013 — prior judgement note

No implementation found. No implementation of this complete target flow was found.

### OUT-014 — prior judgement note

Owner-admin shared content and full operators’ private entries; collaborators refused. Missing/stale merge values and changed library revisions block approval; exact rendered recipient/subject/body/signature and OUT-020 review, hashed approved snapshots and exact dispatch bytes proven. Records/CLI round trips and released-data upgrade preserve content. TEAM-005 inherits teams/restricted sharing; RECORD-018 inherits attachment selection/limits/access failures/preview/sent-version records and authorized/forbidden attachment acceptance; SEQUENCE-001 and SEQUENCE-003 each inherit expansion and approval hashing.

### OUT-015 — prior judgement note

Current acceptance/delivery/inferred provider reports/human replies retain source/time; automatic, foreign and ambiguous replies never stop follow-up. No tracking collection added. OUT-013/016/019 and SEQUENCE-002 inherit their expanded journeys before shipping; ct approved historical-report-only retention at 06:03Z on 19 October.

### OUT-016 — prior judgement note

OUT-016: the complete original tracking journey, token and retention controls, classification and notification behavior, authorized provider acceptance and legal qualification remain unproved. Mailbox delivery remains OUT-013, sequence execution SEQUENCE-001 and SEQUENCE-003, additional notification channels NOTIFY-003 and multi-recipient behavior OUT-019.

### OUT-017 — prior judgement note

Reviewed manual composition from contacts, companies and closed deals uses one explicitly selected recipient, an optional current open-deal link and separate closed-deal history; sending creates or reopens no deal. Exact rendered approval, active/contactable identity, shared sending budgets, clocks, scheduling, reconciliation and contact-wide stops apply to the additive mail store. One accepted activity links reviewed content and provider identity to the contact, primary company and linked/history deal; verified native message headers thread one genuine reply, while missing headers are held. An unlinked accepted message opens one sender-owned contact promise, due in workspace working days and shown in Today when overdue; human replies, booked meetings, later acceptance and explicit sender completion close it. Automatic replies do not; permanent bounce suppresses and cancels contact schedules. Sender/owner reply notices and contact outcomes are native in-app. Full operators retain current authority and collaborators get no new mail door. Record AI drafting from contacts and explicitly selected company contacts uses the assistance preview, exact unchanged evidence and configured instructions through ai.provider.v1, validated citations and length, durable editable unsent drafts and ai_calls accounting; unavailable providers fail visibly. Existing held-reply review attaches genuine or automatic replies to the contact and primary company or dismisses them once with operator attribution; automatic replies and dismissal leave promises open. Removal review includes open contact promises, explicit receiving full operator or unassignment, stale-set refusal and atomic handover with one attributed contact/company entry; original sender attribution remains, receiving overdue promises appear in Today, and unassigned promises remain on their contact. Remaining gaps: additional To/CC/BCC and reply-all inherit OUT-019, mailbox sending and live replies OUT-013, leads RECORD-014, provider-thread capture CAPTURE-010, sequence steps SEQUENCE-001/003 and tracking choice OUT-016.

### OUT-018 — prior judgement note

Twelve users on a simulated clock: one user's volume never holds another's mail, an owner-lowered budget applies to the next claim with an audit row, and every deferral names its limit, value and time; usage is shown at 1440/390. Default throughput rose from 3 a minute to 100 a minute (4 per declared user) and from 100 to 1,000 a user per rolling day, with approvals unchanged (OUT-001). Sequence budgets, pace, priority and draining (SEQUENCE-001/003, AUTO-001), mailbox pacing (OUT-013) and per-team budgets (TEAM-005) are inherited; seed.json stays estimated-until-load-tested until the load journey is measured.

### OUT-019 — prior judgement note

No implementation found. Drafts and outbound messages hold a single recipient_email matched to one contact_id, and the dispatcher in src/core/features/outreach/service.ts joins on it; there are no CC or BCC lists, internal or one-off recipients, reply-all pre-fill or per-recipient landing.

### OUT-020 — prior judgement note

Existing audited settings, new/upgrade defaults, approved per-message choices and SendGrid behavior are retained. ct's 20 October 07:15Z ruling authorizes the independent opaque-capability managed path, GET nonmutation, idempotent POST, recipient-only atomic suppression/stops, erasure invalidation and otherwise indefinite lifetime. HTTP/relay-edge tests passed on 20 October 2026; review, settings, confirmation, unsubscribed and invalid pages were inspected at 1440/390. Records and CLI archive round-trips preserve the capability. Applying the additive migration to the released v0.3.0 schema preserved all 125 existing rows across 203 tables, with no foreign-key violations. No live relay delivery is claimed. OUT-019 inherits multi-recipient and unattributed requests; SEQUENCE-001/003 and AUTO-001 inherit their settings, execution and stops; OUT-013 inherits mailbox reuse.

### TASK-001 — prior judgement note

Assigned record-linked tasks, priorities, local-time recurring occurrences, calendar, notifications, reminders and reviewed removal handover are implemented. In-app reminders are the declared personal channel; personal email, push and Slack reminders await NOTIFY-003. Administrator-routed Slack due-work channel notices are INTEGRATE-005.

### NOTIFY-003 — prior judgement note

No implementation found. No implementation of this complete target flow was found. Implemented first slice: RECORD-016 assignment and FORM-001 submission notices use native in-app delivery. Assignment notices by email, push and Slack according to user preference, and form notices by email and push, remain NOTIFY-003 gaps with their existing deduplication, current-access, replay, undo and erasure duties retained. ct confirmed at 02:08Z on 24 October 2026 that in-app-only delivery stays MISSING. Default adopted: native in-app assignment and form notices only; external delivery remains a NOTIFY-003 gap.

### SEQUENCE-001 — prior judgement note

Reviewed single scheduled messages exist; multi-step definitions, rep authoring and sharing, deal-less enrollments, step threading, internal CC and manual step execution are missing.

### SEQUENCE-002 — prior judgement note

Single scheduled messages exit in the event's commit on genuine reply, booking, unsubscribe, bounce, any stage move and won/lost, never revive on reopen, replay or late dispatch, and the deal shows separate outcomes at 1440/390. ct ruled on 19 October that removal cancels (fresh approval) and pause belongs to enrollments. SEQUENCE-001/003, AUTO-001, OUT-019, OUT-013 and REPORT-001 inherit enrollment exits, pauses, thread-participant exits and sequence reports before shipping.

### SEQUENCE-003 — prior judgement note

No implementation found. Reviewed single scheduled messages exist under OUT-009; sequences, batch rendering and batch approval do not.

### AUTO-001 — prior judgement note

Fixed reviewed proposals and handoffs exist; configurable workflow authoring, unattended record updates (AUTO-002) and durable run management are missing.

### AUTO-002 — prior judgement note

No implementation found. No workflow engine writes records: the only writes outside a person's own edit are capture proposals accepted one at a time in src/core/features/capture/proposals.ts, whose compare-and-set fence on the current value is the guard this clause extends to unattended workflow writes.

### CALL-001 — prior judgement note

Implemented first slice: owner-managed encrypted Twilio configuration, replacement and disconnect; contact and linked-deal exact-number review with one attempt; signed ordered callbacks, replay refusal, outside-Orbit logs and owner review of unknown numbers; one call per Rep activities row; contact erasure replay fences and credential-free Records/CLI archives. Calling settings, held review, contact/deal call review and logs are exercised at 1440 and 390. A Twilio test-credential application receipt (sd-orbit-hk1, 26 October 2026) ran the built Worker at an HTTPS loopback origin: the owner saved the account's test credentials through the calling-settings door, and the real dial door made one Calls request, which Twilio accepted with a call receipt (attempt submitted); replaying that operation key was refused before any second request; each of Twilio's documented test refusals (invalid, unroutable, internationally unpermitted and blocked To; invalid From) made one request, returned Twilio's error code and was recorded as an uncertain attempt with no call. Test credentials place no call and send no callbacks, so callbacks, inbound and outside-Orbit logging remain proven only by the signed network-edge fixtures, which cover completed and ringing events; no-answer, busy, canceled and failed dispositions have neither a provider proof nor a fixture. Aircall, a live-account call to an authorized test number with its real callbacks and dispositions, a distinct failed state for Twilio's definite refusals (recorded as uncertain today) and the complete inherited buyer journey remain gaps. Default adopted: owner-only setup and unknown-number matching; no automatic dialing or retry, and uncertain calls require provider inspection.

### CALL-002 — prior judgement note

CALL-002: recording and participant-consent enforcement, cited transcripts and speaker review, stale proposals, transcript-based risk evidence, current-access playback, retention, local derivatives and confirmed provider deletion, original buyer-walk steps, provider qualification and state-specific legal qualification remain unproved. Dialing authority remains CALL-001; the complete cross-product steps remain with BOUNDARY-001’s named receiving clauses.

### REPORT-001 — prior judgement note

Ten built-in versioned sales definitions over native deals, recorded stage movement, notes/calls/meetings, reviewed messages with SEQUENCE-002 outcomes, TASK-001 tasks and signed bookings, by local month in the workspace's US timezone. Every figure drills through to the exact rows it counts under the viewer's current access; sharing grants no record access and the installation owner administers it until TEAM-005. Saved results keep their definition and show late-arriving evidence beside the original; Records and local archives carry definitions, shares and results, and erasure withdraws a result naming the erased record. SEQUENCE-001, TEAM-005, RECORD-016, CALL-001 and REPORT-002 carry their named parts.

### REPORT-002 — prior judgement note

Nine-tile composition, viewer-fenced figures/drill rows, Owner/Pipeline/US date/Region filters, named/workspace sharing, personal defaults, unavailable/error/no-value/late evidence, PDF and tile CSV, versioned custody, paused restore and erasure are implemented. TEAM-005 inherits team filter/sharing/default/restricted sellers; RECORD-016 later owner kinds; NOTIFY-003 the later delivery model. Owner-chosen Dashboard ready routing and separately audited owner enablement send one generic Slack notice and authenticated link per occurrence/channel; replay, rate limits, failure/retry, held uncertainty and non-resuming safety suspension are proven. Email remains paused: the relay rejects attachments and no system notification sender exists; weekly recipient-specific email, next-send email revocation, email attempts and email retry/uncertain behavior remain gaps. PDF rejects text outside WinAnsi. Live forecasts apply the workspace calendar day and shared-field bindings; saved forecasts keep their original UTC definition and measured result. Every composed response rechecks its original dashboard, saved sources and permitted source rows after the final metadata read. The sd-orbit-c24 UI round judged every dashboard screen and state against the picked Tile board (PICK-DASHBOARD.md, SPEC-DASHBOARD.md) at 1440/390 on its own demo and fixed each difference: operator and collaborator boards, the drill drawer and its full-screen phone form, Share, Schedule, Edit tiles, empty, loading/refetch, unavailable, saved result with late evidence, error, no value and Reports' Dashboards section, with no serious, critical or moderate axe finding (the heading-order findings are fixed) and no text under 13px, one-sided rounded border, nested field border, icon-only control without a tooltip, horizontal overflow or phone target under 44px. uip's UI-pass gate on the candidate is pending. Real team roles, audiences/defaults and restricted sellers remain TEAM-005; daily/weekly/monthly recipient-specific email and its revocation, failure, uncertainty and no-resend provider proof remain blocked on the system sender and attachment transport. No real provider delivery or release acceptance is claimed.

### FORECAST-001 — prior judgement note

Owner administers current stage/deal reviews, per-rep monthly/quarterly quotas and one-time/recurring schedules. TEAM-005 inherits real team membership, team access and quota comparison; QUOTE-001 inherits product/quote-line linkage. Immutable as-of snapshots retain inputs/results; erasure withdraws affected snapshots in full.

### QUOTE-001 — prior judgement note

No implementation found. No implementation of this complete target flow was found.

### INTEGRATE-001 — prior judgement note

Calendly signed booking ingestion and guided callback registration exist; native Dial links and complete reschedule/completion lifecycle are missing.

### INTEGRATE-002 — prior judgement note

No implementation found. No implementation of this complete target flow was found.

### INTEGRATE-003 — prior judgement note

No implementation found. No implementation of this complete target flow was found.

### INTEGRATE-004 — prior judgement note

No implementation found. No implementation of this complete target flow was found.

### INTEGRATE-005 — prior judgement note

Ct 20 October 18:20Z and 19:12Z identity/audience conditions implemented. Native fixture and adapter acceptance pass; the held-bot run is separately recorded. Live inbound clicks, Slack Connect conversion and hosted callbacks are not claimed. Named future event and team/audience inheritors remain with their receiving clauses.

### INTEGRATE-006 — prior judgement note

No implementation found. No implementation of this complete target flow was found.

### INTEGRATE-007 — prior judgement note

INTEGRATE-007: both of its own Acceptance sentences have public-door assertions, including Mailchimp member deletion on erasure, and a held-key live run on the built Worker of a named commit; the uip UI gate on the deletion list and ct’s judgement are pending. Remaining: the consent and member ledger is not yet reconciled by a populated DATA-003 export and restore comparison; refusals for a non-owner administering the connection and for a collaborator handing off are not asserted; Settings reads connected before Mailchimp has checked the webhook address; an unchanged member gets no provider read; Orbit shows its webhook address and the owner adds it in Mailchimp (Orbit does not register it), and only a quick tunnel to a loopback harness has received Mailchimp’s calls, not a hosted installation; Mailchimp’s optional webhook signing is not verified, so the unguessable address is the authority; merging contacts does not carry consent or member links to the survivor, which previews as unknown until consent is recorded again; one handoff makes at most 100 provider requests and reports what remains; the installation owner administers the connection until TEAM-005; Mailchimp deletions are sent after Orbit’s accepted changes and on the owner’s confirmation, not by the scheduled Worker run. The third Acceptance sentence, the complete US buyer walk, belongs to whichever BOUNDARY-001 clause ships last and is not met here: INTEGRATE-001, CALL-001 and CALL-002 are partial, and INTEGRATE-002, INTEGRATE-003, INTEGRATE-004, INTEGRATE-006, INTEGRATE-008 and QUOTE-001 are missing.

### INTEGRATE-008 — prior judgement note

No implementation found. No implementation of this complete target flow was found.

### ENRICH-001 — prior judgement note

Captured evidence proposes field changes; licensed sources, scheduled news/job signals and enrichment waterfalls are missing.

### API-001 — prior judgement note

API-001: the remaining original versioned resource surface and complete acceptance journey, outbound subscription security, delivery and replay controls, their custody and erasure, provider security and legal qualification remain unproved. The standalone scoped deal credential journey is asserted; current inbound-source authority remains SIGNAL-009; narrow application delegation remains DELEGATE-001; later resource behavior remains with its named owning clauses.

### MOBILE-001 — prior judgement note

Responsive native web journeys exist; native mobile apps, offline conflict handling, push reminders and phone composing under OUT-017/OUT-019 are missing.

### DATA-003 — prior judgement note

Every current category round-trips with content digests and anonymous audit; export access is independent and restored schedules lose dispatch approval through Records and local CLI archives, including older local archives. Erasure covers current public reads and replay. The named future clauses above inherit data/derivative, integrity, erasure, external-deletion and fresh-authority obligations before shipping; no external recall or completed provider deletion is claimed.

### OPS-001 — prior judgement note

Implemented first slice: installation-owner per-domain requirements on the linked OIDC provider; atomic active full-operator and matching verified-email admission; policy, operator and linked-provider fences on subsequent requests; an uninvited or unverified identity is refused. The existing /auth/oidc/auth/callback remains unchanged. Required domains fence non-owner email sessions while owner email recovery and unrestricted-domain magic links remain available. Policy and refused sign-in screens are exercised at 1440 and 390. Direct Google Workspace/Microsoft Entra account proof and the remaining operational, connector and mobile surface remain gaps. Default adopted: required-domain non-owners sign in only through the selected OIDC provider and cannot obtain a session by magic link or email recovery; owner email recovery and unrestricted-domain magic links remain available.

### AGENT-001 — prior judgement note

Reviewed provenance-bound capture updates exist; call/enrichment graph maintenance and stakeholder inference are not complete.

### AGENT-002 — prior judgement note

Cited findings for no recorded decision-maker, overdue promises and tasks, stage stalls and reported opens without reply, an exact-quote AI conflict check for recorded dates and prices, reasoned dismissal, per-deal role rules and person-approved tasks exist with no deal, forecast or mail change, at 1440/390. Missing stakeholder means no recorded role (ct, 08:38Z 19 October). QUOTE-001 and CALL-002 inherit quote and transcript evidence.

### AGENT-003 — prior judgement note

Brief promises, handoffs and reviewed scheduled outreach exist; durable cross-step quote-to-close outcome supervision is missing.

### AGENT-004 — prior judgement note

AGENT-004: configurable selected-account research, licensed adapter qualification, allowlisted MCP tools, exact egress preview, enforceable USD budgets, cited schema-valid workflow proposals, hostile-content and revocation journeys, custody, provider retention and legal qualification remain unproved. Purchased enrichment remains ENRICH-001, workflow execution AUTO-001 and AUTO-002, narrow delegation DELEGATE-001 and expanded roles TEAM-005.

### BOUNDARY-001 — prior judgement note

Current signed booking intake, manual call logging, exact-message review and send, unchanged USD amounts and US timezone/DST behavior (OUT-008, TASK-001, TEAM-003) are proven; Connected products shows Calendly/Cal.com delivery, Slack connected or unresolved setup, and every unbuilt product as not available in Orbit at 1440/390. The full cross-product walk moved to INTEGRATE-001–008, CALL-001/002 and QUOTE-001, each carrying its step in its own text and acceptance (ct, 06:03Z 19 October).

### TEAM-001 — prior evidence

`src/core/features/access/service.ts`; `src/core/features/records/routes.ts`; `newtests/t096/collaborator-lifecycle.test.ts`; `newtests/t096/browser-journeys.test.ts`

### TEAM-002 — prior evidence

`src/core/features/access/service.ts`; `src/core/features/records/routes.ts`; `newtests/t096/collaborator-lifecycle.test.ts`; `src/core/features/settings/repository.ts`; `src/core/features/settings/removal-handover.ts`; `tests/core/today-brief.test.ts`; `tests/core/local-owner.test.ts`

### TEAM-003 — prior evidence

`tests/core/records-search.test.ts`; `src/core/features/pipelines/`; `tests/evidence/contract/TEAM-003/`

### TEAM-004 — prior evidence

`src/core/features/settings/removal-handover.ts`; `src/core/features/tasks/handover.ts`; `tests/core/today-brief.test.ts`; `tests/evidence/contract/TEAM-004/`

### RECORD-001 — prior evidence

`src/core/features/records/routes.ts`; `src/core/features/records/repository.ts`; `tests/core/crm-import.test.ts`

### RECORD-002 — prior evidence

`src/core/features/relationships/`; `src/core/features/records/repository.ts`; `tests/core/records-search.test.ts`; `tests/core/records-merge-review.test.ts`; `tests/evidence/contract/RECORD-002/`

### RECORD-003 — prior evidence

`src/core/features/records/routes.ts`; `src/core/features/records/repository.ts`; `tests/core/crm-import.test.ts`

### RECORD-004 — prior evidence

`src/core/features/records/merge-review.ts`; `tests/core/records-merge-review.test.ts`

### RECORD-005 — prior evidence

`src/core/features/records/routes.ts`; `src/core/features/records/repository.ts`; `tests/core/crm-import.test.ts`

### RECORD-006 — prior evidence

`src/core/features/records/repository.ts`; `tests/core/records-search.test.ts`; `tests/performance/records-capacity.ts`

### RECORD-007 — prior evidence

`src/core/features/records/routes.ts`; `src/core/features/records/repository.ts`; `tests/core/crm-import.test.ts`; `tests/core/records-search.test.ts`

### RECORD-008 — prior evidence

`src/core/features/imports/contracts.ts`; `tests/core/crm-import.test.ts`; `tests/core/crm-import-erasure.test.ts`; `tests/e2e/imports.spec.mjs`

### RECORD-009 — prior evidence

`src/core/features/records/import-merge.ts`; `tests/core/records-merge-review.test.ts`

### RECORD-010 — prior evidence

`src/core/features/records/manual.ts`; `tests/core/today-brief.test.ts`

### RECORD-011 — prior evidence

`src/core/features/records/repository.ts`; `src/core/features/operator/ui/records-page.tsx`; `tests/core/records-search.test.ts`; `tests/evidence/contract/RECORD-011/`

### RECORD-012 — prior evidence

`src/core/features/records/suppression.ts`; `src/core/features/records/repository.ts`; `tests/core/launch-suppression.test.ts`; `tests/core/outreach-limits.test.ts`

### RECORD-013 — prior evidence

`src/core/features/records/data.ts`; `tests/core/records-complete.test.ts`; `tests/core/contact-erasure.test.ts`

### SIGNAL-001 — prior evidence

`src/core/features/ingestion/routes.ts`; `src/core/features/ingestion/repository.ts`; `tests/core/signals-outreach.test.ts`

### SIGNAL-002 — prior evidence

`src/core/features/ingestion/routes.ts`; `src/core/features/ingestion/repository.ts`; `tests/core/signals-outreach.test.ts`

### SIGNAL-003 — prior evidence

`src/core/features/ingestion/routes.ts`; `src/core/features/ingestion/repository.ts`; `tests/core/signals-outreach.test.ts`

### SIGNAL-004 — prior evidence

`src/core/features/ingestion/routes.ts`; `src/core/features/ingestion/repository.ts`; `tests/core/signals-outreach.test.ts`

### SIGNAL-005 — prior evidence

`src/core/features/ingestion/routes.ts`; `src/core/features/ingestion/repository.ts`; `tests/core/signals-outreach.test.ts`

### SIGNAL-006 — prior evidence

`src/core/features/ingestion/routes.ts`; `src/core/features/ingestion/repository.ts`; `tests/core/signals-outreach.test.ts`

### SIGNAL-007 — prior evidence

`src/core/features/ingestion/routes.ts`; `src/core/features/ingestion/repository.ts`; `tests/core/signals-outreach.test.ts`

### SIGNAL-008 — prior evidence

`src/core/features/ingestion/routes.ts`; `src/core/features/ingestion/repository.ts`; `tests/core/signals-outreach.test.ts`

### SIGNAL-009 — prior evidence

`src/core/features/ingestion/routes.ts`; `src/core/features/ingestion/repository.ts`; `tests/core/signals-outreach.test.ts`

### CAPTURE-001 — prior evidence

`src/core/features/capture/intake.ts`; `src/core/features/capture/proposals.ts`; `tests/core/capture-intake.test.ts`

### CAPTURE-002 — prior evidence

`src/core/features/capture/intake.ts`; `src/core/features/capture/proposals.ts`; `tests/core/capture-intake.test.ts`

### CAPTURE-003 — prior evidence

`src/core/features/capture/intake.ts`; `src/core/features/capture/proposals.ts`; `tests/core/capture-intake.test.ts`

### CAPTURE-004 — prior evidence

`src/core/features/capture/proposals.ts`; `tests/core/capture-review.test.ts`

### CAPTURE-005 — prior evidence

`src/core/features/capture/providers/oauth.ts`; `tests/core/capture-providers.test.ts`; `tests/core/capture-boundaries.test.ts`

### CAPTURE-006 — prior evidence

`src/core/features/capture/providers/service.ts`; `tests/core/capture-providers.test.ts`; `tests/core/capture-connector.test.ts`

### CAPTURE-007 — prior evidence

`src/core/features/capture/privacy.ts`; `tests/core/capture-data.test.ts`; `tests/core/capture-upgrade.test.ts`

### CAPTURE-008 — prior evidence

`tests/core/capture-no-console.test.ts`

### CAPTURE-009 — prior evidence

`tests/core/capture-no-console.test.ts`

### OPP-001 — prior evidence

`src/core/features/opportunities/repository.ts`; `src/core/features/workbench/repository.ts`; `tests/core/signals-outreach.test.ts`

### OPP-002 — prior evidence

`src/core/features/records/repository.ts`; `tests/e2e/operator.spec.mjs`

### OPP-003 — prior evidence

`src/core/features/opportunities/repository.ts`; `src/core/features/workbench/repository.ts`; `tests/core/signals-outreach.test.ts`; `src/core/features/workbench/policies.ts`; `src/core/features/records/repository.ts`

### OPP-004 — prior evidence

`src/core/features/opportunities/repository.ts`; `tests/e2e/operator.spec.mjs`

### OPP-005 — prior evidence

`src/core/features/opportunities/repository.ts`; `src/core/features/workbench/repository.ts`; `tests/core/signals-outreach.test.ts`

### OPP-006 — prior evidence

`src/core/features/opportunities/repository.ts`; `tests/e2e/operator.spec.mjs`

### OPP-007 — prior evidence

`src/core/features/opportunities/repository.ts`; `src/core/features/workbench/repository.ts`; `tests/core/signals-outreach.test.ts`

### OPP-008 — prior evidence

`src/core/features/opportunities/repository.ts`; `src/core/features/workbench/repository.ts`; `tests/core/signals-outreach.test.ts`

### OPP-009 — prior evidence

`migrations/core/0039_sales_pipelines.sql`; `src/core/features/pipelines/`; `tests/core/records-search.test.ts`; `tests/evidence/contract/OPP-009/`

### ACTION-001 — prior evidence

`src/core/features/assistance/provider.ts`; `src/core/features/drafts/service.ts`; `tests/core/assistance.test.ts`; `tests/core/signals-outreach.test.ts`

### ACTION-002 — prior evidence

`src/core/features/assistance/provider.ts`; `src/core/features/drafts/service.ts`; `tests/core/assistance.test.ts`; `src/core/features/workbench/action-repository.ts`; `tests/core/signals-outreach.test.ts`

### ACTION-003 — prior evidence

`src/core/features/assistance/provider.ts`; `src/core/features/drafts/service.ts`; `tests/core/assistance.test.ts`

### ACTION-004 — prior evidence

`src/core/features/drafts/service.ts`; `tests/e2e/operator.spec.mjs`

### ACTION-005 — prior evidence

`src/core/features/drafts/service.ts`; `tests/e2e/stale-review.spec.mjs`; `tests/core/capture-boundaries.test.ts`

### OUT-001 — prior evidence

`src/core/features/outreach/service.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/signals-outreach.test.ts`; `tests/core/source-onboarding.test.ts`; `tests/rer/onboarding.test.mjs`

### OUT-002 — prior evidence

`src/core/features/outreach/service.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/signals-outreach.test.ts`

### OUT-003 — prior evidence

`src/core/features/outreach/service.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/signals-outreach.test.ts`; `src/core/features/workbench/routes.ts`

### OUT-004 — prior evidence

`src/core/features/outreach/reply-matching.ts`; `tests/core/launch-reply-authority.test.ts`; `tests/core/launch-reply-sender.test.ts`

### OUT-005 — prior evidence

`src/core/features/outreach/service.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/signals-outreach.test.ts`

### OUT-006 — prior evidence

`src/core/features/outreach/service.ts`; `tests/core/outreach-limits.test.ts`; `tests/core/signals-outreach.test.ts`

### OUT-007 — prior evidence

`src/core/features/outreach/service.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/signals-outreach.test.ts`

### OUT-008 — prior evidence

`src/core/features/outreach/service.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/signals-outreach.test.ts`

### OUT-009 — prior evidence

`src/core/features/outreach/scheduler.ts`; `tests/core/outreach-limits.test.ts`

### OUT-010 — prior evidence

`src/core/features/outreach/service.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/signals-outreach.test.ts`; `tests/core/outreach-limits.test.ts`

### OUT-011 — prior evidence

`src/core/features/outreach/service.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/signals-outreach.test.ts`; `src/core/platform/outbound-mail.ts`

### OUT-012 — prior evidence

`tests/core/outbound-boundaries.test.ts`; `tests/core/outreach-limits.test.ts`

### AI-001 — prior evidence

`src/core/features/assistance/provider.ts`; `tests/core/assistance.test.ts`

### AI-002 — prior evidence

`src/core/features/assistance/provider.ts`; `tests/core/assistance.test.ts`

### AI-003 — prior evidence

`src/core/features/assistance/provider.ts`; `tests/core/assistance.test.ts`

### AI-004 — prior evidence

`src/core/features/assistance/provider.ts`; `tests/core/assistance.test.ts`

### BRIEF-001 — prior evidence

`src/core/features/today/brief.ts`; `src/core/features/today/promises.ts`; `tests/core/today-brief.test.ts`

### BRIEF-002 — prior evidence

`src/core/features/today/brief.ts`; `src/core/features/today/promises.ts`; `tests/core/today-brief.test.ts`

### BRIEF-003 — prior evidence

`src/core/features/today/brief.ts`; `src/core/features/today/promises.ts`; `tests/core/today-brief.test.ts`

### BRIEF-004 — prior evidence

`src/core/features/today/brief.ts`; `src/core/features/today/promises.ts`; `tests/core/today-brief.test.ts`

### BRIEF-005 — prior evidence

`src/core/features/today/brief.ts`; `tests/delegation/brief-handoff.test.ts`

### NOTIFY-001 — prior evidence

`src/core/features/notifications/routes.ts`; `tests/core/assistance.test.ts`; `tests/e2e/zz-notifications.spec.mjs`

### NOTIFY-002 — prior evidence

`src/core/features/notifications/routes.ts`; `tests/core/assistance.test.ts`; `tests/e2e/zz-notifications.spec.mjs`

### PUBLIC-001 — prior evidence

`src/base/lobby.ts`; `tests/e2e/baseline.spec.mjs`

### PUBLIC-002 — prior evidence

`src/demo.ts`; `tests/core/public-demo.test.ts`

### PUBLIC-003 — prior evidence

`src/base/lobby.ts`; `tests/e2e/baseline.spec.mjs`

### PUBLIC-004 — prior evidence

`src/core/features/identity/index.ts`; `tests/core/identity.test.ts`; `tests/core/prior-auth-upgrade.test.ts`

### DATA-001 — prior evidence

`src/core/features/records/archive-export.ts`; `src/core/features/records/archive-import.ts`; `tests/core/archive-transfer.test.ts`; `newtests/t096/archive-import-recovery.test.ts`; `src/core/shared/archive-identity.ts`

### DATA-002 — prior evidence

`src/core/features/records/data.ts`; `tests/core/contact-erasure.test.ts`; `tests/core/crm-import-erasure.test.ts`

### DELEGATE-001 — prior evidence

`src/core/features/delegation/protocol.ts`; `tests/delegation/authority-regressions.test.ts`; `tests/delegation/archive-regression.test.ts`

### TEAM-005 — prior evidence

`src/core/features/records/entry-privacy.ts`; `src/core/features/records/shared-entries.ts`; `src/core/features/notifications/collaborator.ts`; `newtests/t096/collaborator-lifecycle.test.ts` — TEAM-001 private-entry extension in `newtests/t096/private-entries-proof.ts`; `tests/delegation-browser/records-layout.test.ts` — private-entry journey

### RECORD-014 — prior evidence

`src/core/features/records/typed-fields.ts`; `src/core/features/records/typed-field-history.ts`; `src/core/features/operator/ui/typed-field-settings.tsx`; `src/core/features/operator/ui/typed-field-history.tsx`; `tests/core/records-complete.test.ts` — “RECORD-014 typed fields validate edits and preserve paged archived definition meaning through public history and export” in `tests/support/typed-fields-proof.ts`; `newtests/t096/forms-native.test.ts` — existing mapped capture with typed definitions; `tests/delegation-browser/records-layout.test.ts` — existing emitted Worker record/NOW registration, extended by typedFieldsJourney in `tests/delegation-browser/typed-fields-journey.mjs` for rename, archive and earlier definition meaning at 1440/390

### RECORD-015 — prior evidence

`src/core/features/relationships/`; `src/core/features/operator/ui/buying-context.tsx`; `tests/core/records-search.test.ts`; `tests/evidence/contract/RECORD-015/`

### RECORD-016 — prior evidence

`src/core/features/ownership/`; `migrations/core/0054_record_ownership.sql`; `tests/core/records-search.test.ts` — “RECORD-016 reviewed owners and guarded bulk undo”; `tests/support/record-ownership.ts`; `newtests/t096/forward-upgrade.test.ts`; `newtests/t096/ownership-upgrade.ts`; `newtests/t096/browser-ownership.ts`; `docs/retained-verification/RECORD-016/`

### RECORD-017 — prior evidence

`src/core/features/records/mentions.ts`; `src/core/features/records/manual.ts`; `src/core/features/access/grant-entries.ts`; `src/core/features/notifications/collaborator.ts`; `src/core/features/records/shared-entries.ts`; `src/core/features/access/shared-entries.tsx`; `src/core/features/operator/ui/mention-field.tsx`; `tests/core/today-brief.test.ts` — “BRIEF-004 RECORD-010 RECORD-017 OUT-001 a booked meeting gets a cited plan with unresolved attendees shown, notes saved as one editable note, and plan lines become next actions without sending anything; a mention notifies once, asks to share the deal with its notes, calls and meetings before notifying a collaborator, who then reads only their own mention and opens the entry on Shared records until the grant is revoked; it withdraws on delete and never reaches AI or a customer”; `tests/evidence/contract/RECORD-017/`

### RECORD-018 — prior evidence



### MIGRATE-001 — prior evidence

`src/core/features/imports/contracts.ts`; `tests/core/crm-import.test.ts`; `tests/e2e/imports.spec.mjs`

### MIGRATE-002 — prior evidence

`src/core/features/imports/contracts.ts`; `tests/core/crm-import.test.ts`

### MIGRATE-003 — prior evidence



### CAPTURE-010 — prior evidence

`src/core/features/capture/providers/`; `src/core/features/capture/mail-association.ts`; `src/core/features/capture/mail-rule.ts`; `src/core/features/capture/deal-links.ts`; `migrations/core/0057_capture_mail_rule.sql`; `tests/core/capture-mail-rules.test.ts`; `tests/core/capture-providers.test.ts`; `tests/support/capture-rule-custody.ts`; `newtests/t096/forward-upgrade.test.ts`; `newtests/t096/browser-capture-rule.ts`; `docs/retained-verification/CAPTURE-010/`; `tests/core/capture-mail-rules.test.ts` — “CAPTURE-010 workspace mail rules and one-action corrections preserve CAPTURE-006 selected scope, crash replay, incremental reads and unknown-mail exclusion” (Verify core-0); `newtests/t096/browser-capture-rule.ts` via `newtests/t096/browser-journeys.test.ts` (Verify fold-domain-0), 1440/390 closed unrelated deal moves

### CAPTURE-011 — prior evidence

`src/core/features/capture/providers/writeback.ts`; `src/core/features/capture/providers/writeback-reconcile.ts`; `tests/core/capture-providers.test.ts` — “CAPTURE-006 provider deletion respects occurrence and erasure; CAPTURE-011 read-only and writeback consent request and store distinct scopes” (shard core-4), extended in `tests/support/calendar-writeback.ts`; `tests/delegation-browser/records-layout.test.ts` — calendar journey

### CAPTURE-012 — prior evidence

`src/core/features/capture/intake.ts`; `src/core/features/capture/routes.ts`; `src/core/features/capture/sources.ts`; `tests/core/today-brief.test.ts`

### FORM-001 — prior evidence

`src/core/features/forms/`; `src/core/features/forms/field-values.ts`; `src/core/features/forms/embed-code.ts`; `migrations/core/0055_form_assignment.sql`; `src/core/features/capture/proposals.ts`; `newtests/t096/forms-native.test.ts`; `newtests/t096/forms-mapped-journey.ts`; `newtests/t096/forms-mapped-custody.ts`; `newtests/t096/browser-form-mapping.ts`; `docs/retained-verification/FORM-001/`

### OUT-013 — prior evidence



### OUT-014 — prior evidence

`src/core/features/drafts/`; `src/core/features/outreach/approval-repository.ts`; `src/core/features/outreach/service.ts`; `migrations/core/0050_message_library.sql`; `tests/core/signals-outreach.test.ts` — “OUT-014 missing merge fields block; template revisions never rewrite approved content”; `tests/core/onboarding-archive.test.ts`; `newtests/t096/forward-upgrade.test.ts`; `docs/retained-verification/OUT-014/`

### OUT-015 — prior evidence

`tests/core/launch-reply-authority.test.ts` — “OUT-015 automatic/foreign replies never stop follow-up; inferred reports and untracked opens stay distinct”; `tests/core/signals-outreach.test.ts`; `src/core/features/outreach/provider-replies.ts`; `src/core/features/operator/ui/mail-evidence.tsx`

### OUT-016 — prior evidence



### OUT-017 — prior evidence

`src/core/features/outreach/`; `src/core/features/assistance/record-routes.ts`; `src/core/features/assistance/record-preview.ts`; `migrations/core/0056_record_mail.sql`; `migrations/core/0066_record_mail_completion.sql`; `src/core/features/operator/ui/record-mail.tsx`; `src/core/features/operator/ui/unlinked-replies.tsx`; `src/core/features/settings/removal-handover.ts`; `src/core/features/operator/ui/operator-removal-review.tsx`; `tests/core/signals-outreach.test.ts` — “OUT-017 record mail preserves exact approval”; `tests/support/record-mail.ts`; `tests/support/record-mail-ai.ts`; `tests/support/record-mail-held-replies.ts`; `tests/support/record-mail-handover.ts`; `tests/support/record-mail-custody.ts`; `tests/core/operator-erasure.test.ts`; `newtests/t096/forward-upgrade.test.ts`; `tests/support/record-mail-upgrade.ts`; `newtests/t096/browser-record-mail.ts`; `docs/retained-verification/OUT-017/`

### OUT-018 — prior evidence

`tests/core/outreach-limits.test.ts` — “OUT-010 OUT-018 one user's volume never consumes another's budget and every deferral names its limit”; `src/core/features/outreach/sending-limits.ts`; `src/core/features/outreach/service.ts`; `src/core/features/outreach/approval-repository.ts`; `src/core/features/operator/ui/sending-capacity.tsx`; `tests/evidence/contract/OUT-018/`

### OUT-019 — prior evidence



### OUT-020 — prior evidence

`src/core/features/outreach/opt-out.ts`; `src/core/platform/outbound-mail.ts`; `src/core/platform/managed-outbound-mail.ts`; `src/core/features/operator/ui/opt-out-settings.tsx`; `src/core/features/operator/ui/draft-opt-out.tsx`; `tests/core/outbound-boundaries.test.ts` — “OUT-020 managed opt-out is approval-bound, suppresses only its recipient and stops replayed dispatch”; `tests/evidence/contract/OUT-020/`

### TASK-001 — prior evidence

`src/core/features/tasks/`; `tests/core/today-brief.test.ts`; `tests/evidence/contract/TASK-001/`

### NOTIFY-003 — prior evidence



### SEQUENCE-001 — prior evidence

`src/core/features/outreach/scheduler.ts`; `src/core/features/drafts/service.ts`; `tests/core/outreach-limits.test.ts`

### SEQUENCE-002 — prior evidence

`tests/core/signals-outreach.test.ts` — “OUT-007 OUT-009 SEQUENCE-002 stage move, close and genuine reply end scheduled follow-up atomically; automatic reply and open report do not”; `src/core/features/pipelines/movement.ts`; `src/core/features/records/repository.ts`; `src/core/features/outreach/follow-up-outcomes.ts`; `src/core/features/operator/ui/follow-up-outcomes.tsx`; `tests/evidence/contract/SEQUENCE-002/`

### SEQUENCE-003 — prior evidence



### AUTO-001 — prior evidence

`src/core/features/capture/proposals.ts`; `src/core/features/delegation/effects.ts`; `tests/core/capture-review.test.ts`

### AUTO-002 — prior evidence



### CALL-001 — prior evidence

`src/core/features/calls/`; `tests/core/today-brief.test.ts` — CALL-001 owner-managed dialing in `tests/support/twilio-calls.ts`; `tests/delegation-browser/records-layout.test.ts` — calling journey; `newtests/t096/collaborator-lifecycle.test.ts` — CLI credential exclusion; Twilio test-credential application receipt (sd-orbit-hk1, 26 October 2026)

### CALL-002 — prior evidence

`src/core/features/records/manual.ts`; `src/core/features/capture/proposals.ts`; `tests/core/capture-review.test.ts`

### REPORT-001 — prior evidence

`src/core/features/analytics/sales-report.ts`; `src/core/features/analytics/sales-population.ts`; `src/core/features/analytics/sales-measures.ts`; `src/core/features/analytics/sales-access.ts`; `src/core/features/analytics/report-shares.ts`; `src/core/features/analytics/native-sources.ts`; `migrations/core/0052_report_shares.sql`; `newtests/t096/report-disclosure.test.ts` — “REPORT-002 a manager’s Tile board composes viewer-fenced reports and exports; REPORT-001 a US monthly two-pipeline report reconciles won/lost/open deals, reasons and rep activities by drill-through, discloses its basis, and leaks nothing after revocation or late evidence”; `newtests/t096/browser-sales-report.ts`; `newtests/t096/sales-report-archive.ts`; `docs/retained-verification/REPORT-001/`

### REPORT-002 — prior evidence

`src/core/features/dashboards/`; `migrations/core/0053_dashboards.sql`; `newtests/t096/report-disclosure.test.ts`; `newtests/t096/dashboard-access-proof.ts`; `newtests/t096/dashboard-archive.ts`; `newtests/t096/forward-upgrade.test.ts`; `tests/core/source-onboarding.test.ts`; `docs/retained-verification/REPORT-002/`; `src/core/features/dashboards/read-fences.ts`; `newtests/t096/dashboard-backend-proof.ts` through the existing period-boundary registration — workspace-day forecast filters, missing-field disclosures, named edits without amount authority, cadence/DST/restart definitions and mid-export data/access/source changes. Backend proof does not accept the UI or discharge the team-role, email/export or provider gaps.

### FORECAST-001 — prior evidence

`src/core/features/forecast/`; `migrations/core/0048_forecasts.sql`; `newtests/t096/browser-journeys.test.ts` — “FORECAST-001 USD weighted value, override, quotas and recurring schedules preserve prior snapshots”; `newtests/t096/forward-upgrade.test.ts`; `docs/retained-verification/FORECAST-001/`

### QUOTE-001 — prior evidence



### INTEGRATE-001 — prior evidence

`src/core/features/ingestion/booking-webhooks.ts`; `src/core/features/ingestion/calendly-setup.ts`; `tests/core/source-onboarding.test.ts`

### INTEGRATE-002 — prior evidence



### INTEGRATE-003 — prior evidence



### INTEGRATE-004 — prior evidence



### INTEGRATE-005 — prior evidence

`src/core/features/slack/`; `migrations/core/0051_slack_notices.sql`; extended INTEGRATE-005 / BOUNDARY-001 public HTTP case in `tests/core/source-onboarding.test.ts`; `tests/support/slack-notices-proof.ts`; `tests/support/slack-actions-proof.ts`; `tests/support/slack-archive-proof.ts`; `docs/retained-verification/INTEGRATE-005/`

### INTEGRATE-006 — prior evidence



### INTEGRATE-007 — prior evidence

`src/core/features/marketing/`; `src/core/features/settings/connected-products.ts`; `src/core/features/operator/ui/mailchimp-settings.tsx`; `src/core/features/operator/ui/mailchimp-preview.tsx`; `tests/core/launch-suppression.test.ts` — “INTEGRATE-007 Mailchimp receives only consented contacts, its unsubscribes stop Orbit outreach and no replay re-subscribes; RECORD-012 DATA-001 manual, source and provider stops preserve anonymous suppression through export and restore” (first Acceptance sentence: a preview of subscribed, unknown and stopped contacts, where a consent attempt without its confirmation, source or basis is refused and leaves the contact unknown and a withdrawn consent is a stop; only the consented subset is sent, by PUT with status_if_new and never status, with only the selected fields and ORBITCONS equal to the recorded source and basis, cut to 255 characters, which the Mailchimp member stores; a consent change sends exactly one new PUT carrying the new value; an unchanged re-sync makes no provider request and keeps one member per subscriber hash; Orbit unsubscribes the Mailchimp member by PATCH both for a Do not contact edit on a subscribed member and for a Mailchimp unsubscribe webhook that arrives while the member is still subscribed, and three later syncs, including after a replayed and a late subscribe, keep it unsubscribed with no PUT; Mailchimp unsubscribe and cleaned webhooks become the existing do-not-contact stop with source mailchimp; replays change nothing; one-to-one outreach stays refused; no unknown, withdrawn, Do not contact, unsubscribed, cleaned or anonymously suppressed re-created address ever gets a PUT or subscribing write; erasure through DELETE /api/v1/records/contact/:id sends Mailchimp’s permanent delete for each linked member, tracked apart from the erasure with its outcome in Settings: deleted on 204, failed with its reason on a refusal and sent again only on the owner’s confirmed retry, uncertain without an answer and retried by Orbit’s processor on the next change, where a 404 for a member of an audience Mailchimp still holds is a verified deletion; none for a contact Mailchimp never held; the stored member IDs are gone once Mailchimp confirms; archives carry no key or webhook token; a restored pending deletion waits while Mailchimp is not connected, is held after reconnecting until the owner confirms and is then deleted; restore and disconnect read unresolved setup); `tests/core/source-onboarding.test.ts` — the existing BOUNDARY-001 walk case “REPORT-002 explicitly enabled Slack schedules respect DST, hold uncertainty and never resume; email stays paused; INTEGRATE-005 Slack notices carry only allowed fields, replay once, withhold private data and refuse unmapped, foreign and replayed actions; BOUNDARY-001 current USD sales journey respects product boundaries and exposes unresolved provider setup; SIGNAL-001 SIGNAL-009 OPP-004 OPP-007 OUT-001 source onboarding authenticates inert connection tests, ranks real evidence and preserves customer reply through reviewed send” (second sentence: the walk’s consented US buyer previews as subscribed with source and basis, alone joins the audience and carries exactly that consent in ORBITCONS; Connected products links the audience in Mailchimp, names Mailchimp’s campaign ownership and shows a disconnected account as unresolved setup); held-key live run `tests/evidence/contract/INTEGRATE-007/mailchimp-live-2026-10-27.json` on the Worker built from commit 4e174284f78e3be6dae040a423290648cd1aae60 with a clean tree, at a TLS loopback origin (Mailchimp again refused a disposable audience with 403, and read-only checks found no automation or journey, so four synthetic members used the existing audience: three consented members were created by PUT with status_if_new only, each storing its exact recorded consent in ORBITCONS, and the contact without consent was never created; a Do not contact edit made Orbit PATCH that member to unsubscribed; Mailchimp's real unsubscribe webhook through a quick tunnel stopped the third contact, and the next two handoffs made no PUT and left it unsubscribed; erasing the first contact through the public door sent Orbit's own permanent delete (204, read back 404) and Settings showed it deleted; a contact erased while Mailchimp was disconnected waited with no provider request, was held after reconnecting and was deleted on the owner's confirmation (204, read back 404); the remaining member, the webhook and the consent field were deleted and read back, and the audience kept its one member)

### INTEGRATE-008 — prior evidence



### ENRICH-001 — prior evidence

`src/core/features/capture/intake.ts`; `src/core/features/capture/proposals.ts`; `tests/core/capture-review.test.ts`

### API-001 — prior evidence

`src/core/features/ingestion/routes.ts`; `src/core/features/delegation/protocol.ts`; `tests/core/source-onboarding.test.ts`; `tests/delegation/authority-regressions.test.ts`; `src/core/features/api/credentials.ts`; `src/core/features/api/routes.ts`; `migrations/core/0065_api_credentials.sql`; `tests/support/api-credentials-proof.ts`; `tests/delegation/authority-regressions.test.ts` — “API-001 native credential lifecycle and delegation D1 reject ambient cookies, scope escalation, expiration, disable and revocation on every read and write”; `tests/core/archive-transfer.test.ts` — “API-001 credential custody and DATA-002 contact erasure invalidate exports, downloads and restore copies and fences a snapshot created during discovery”; `tests/core/onboarding-archive.test.ts` — “API-001 credentials stay local while DATA-001 local archive restores records and keeps the hosted owner able to sign in by mail without reviving sessions”; `tests/core/operator-erasure.test.ts` — “OUT-017 BASE-DATA-003 operator erasure redacts only the erased operator's own whole name and mailbox; another person's text never changes”; `newtests/t096/forward-upgrade.test.ts` — “API-001 credential storage and RECORD-016 ownership and accepted main and released v0.3.0 advance with every native value, custom DDL, live identity and pre-forecast archive schema intact”; `tests/core/contact-erasure.test.ts` — “DATA-002 RECORD-013 erasing one contact preserves distinct same-name customer history and AI accounting (opportunity deleted first: false)”; `tests/core/contact-erasure.test.ts` — “DATA-002 RECORD-013 erasing one contact preserves distinct same-name customer history and AI accounting (opportunity deleted first: true)”. Native administration issues a named credential with explicit principal, deal operations, records, fields and bounded expiry; path and query refusals, rotation, stale and revoked reviews, expired rotation, current principal and session races, hidden verifiers, audit without secrets, archive exclusion and contact and operator erasure are asserted. Standalone credential requests through /api/rest/v1/ create, update, read and list only scoped deals without an owner session; the existing authority registration asserts cursor pagination, exact filtering, schema refusals, rate-limit headers and enforcement, idempotent creation, stale-write refusal, operation, field and record denial, immediate rotation and revocation, expiry, and transaction-time credential, principal, installation, restore and record-scope fences. The existing archive custody registration asserts the HTTP read before contact erasure and refusal on its next request, alongside export absence. Outbound subscriptions and the remaining resource surface remain pending.

### MOBILE-001 — prior evidence

`tests/e2e/operator.spec.mjs`; `tests/delegation-browser/viewport.test.ts`; `newtests/t096/report-disclosure.test.ts`

### DATA-003 — prior evidence

`tests/core/capture-data.test.ts` — “DATA-003 current sales capabilities round-trip without authority and erase across public reads”; `tests/support/current-sales-data.ts`; `tests/support/current-sales-archive.ts`; `tests/support/current-sales-local.ts`; `scripts/installer/portability-policy.mjs`; `newtests/t096/forms-native.test.ts`; `tests/core/crm-import-erasure.test.ts`

### OPS-001 — prior evidence

`src/core/features/identity/accounts.ts`; `src/core/features/identity/domain-policy.ts`; `src/core/features/identity/store.ts`; `tests/core/provider-redirects.test.ts` — “OPS-001 required domains deny magic-link and recovery sessions while selected OIDC, owner recovery and unrestricted email remain admitted” (shard core-3), with a local signed OIDC issuer in `tests/support/sign-in-domains.ts`; `tests/delegation-browser/records-layout.test.ts` — policy and refusal screens

### AGENT-001 — prior evidence

`src/core/features/capture/intake.ts`; `src/core/features/capture/proposals.ts`; `tests/core/capture-review.test.ts`; `tests/delegation/brief-handoff.test.ts`

### AGENT-002 — prior evidence

`tests/core/today-brief.test.ts` — “AGENT-002 absent decision-maker and conflicting recorded commitments yield cited risks, dismissal and reviewed tasks”; `tests/core/launch-reply-authority.test.ts`; `src/core/features/risks/`; `src/core/features/operator/ui/deal-risks.tsx`; `src/core/features/operator/ui/deal-risk-finding.tsx`; `src/core/features/today/promises.ts`; `tests/evidence/contract/AGENT-002/`

### AGENT-003 — prior evidence

`src/core/features/today/promises.ts`; `src/core/features/today/plan-actions.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/today-brief.test.ts`; `tests/core/signals-outreach.test.ts`

### AGENT-004 — prior evidence

`src/core/features/assistance/provider.ts`; `src/core/features/delegation/protocol.ts`; `tests/core/assistance.test.ts`; `tests/delegation/authority-regressions.test.ts`

### BOUNDARY-001 — prior evidence

`tests/core/source-onboarding.test.ts` — “REPORT-002 explicitly enabled Slack schedules respect DST, hold uncertainty and never resume; email stays paused; INTEGRATE-005 Slack notices carry only allowed fields, replay once, withhold private data and refuse unmapped, foreign and replayed actions; BOUNDARY-001 current USD sales journey respects product boundaries and exposes unresolved provider setup”; `src/core/features/settings/connected-products.ts`; `src/core/features/operator/ui/connected-products.tsx`; `src/core/features/ingestion/booking-webhooks.ts`; `tests/core/signals-outreach.test.ts`; `tests/support/sales-tasks.ts`; `tests/evidence/contract/BOUNDARY-001/`

### Prior claim-boundary record

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

Source provenance: `e28c7c16fe14b3523b0bb035f84e5a771911a7d1` (20 October 2026). The existing 200-case cap is unchanged.

## Sales-content claim boundary

OUT-014 covers permission-controlled templates, snippets and signatures with a reviewed fixed list of contact/company/deal merge fields. Current full operators may read and use workspace-shared entries and create and edit their own private entries. Only the installation owner may create or edit workspace-shared entries. Collaborators are refused library reads, authoring, sharing and application. The installation owner acts as administrator until TEAM-005 supplies real teams and restricted sharing. Sharing content never grants record or field access.

Missing or stale merge values block approval and sending until a fresh render is reviewed. Review includes the exact rendered recipient, subject, body, signature and OUT-020 opt-out state. Approval retains an immutable rendered-byte snapshot and content hash; a later template, snippet or signature revision cannot rewrite approved content. OUT-001's dispatch revision and staleness fences still apply.

RECORD-018 inherits authorized/versioned attachment selection, size/type limits, explicit access/size failures, exact preview before approval and before files ship, the sent-version record on recipients' records, and acceptance sending an authorized attachment and refusing a forbidden one. TEAM-005 inherits real team membership, restricted sharing and role/record/field checks. SEQUENCE-001 and SEQUENCE-003 each inherit template expansion, per-recipient/per-step rendered review, immutable approved snapshots and approval hashing with missing/stale merge-field blocks.

Implementation source `94f7f436624918937fa5a422d379ababf9349e88` (20 October 2026) classifies OUT-014 as DONE. The existing `tests/core/signals-outreach.test.ts` journey “OUT-014 missing merge fields block; template revisions never rewrite approved content” covers the public HTTP path and exact dispatch bytes; the extended file passed 16/16. Migration `migrations/core/0050_message_library.sql`, Records/CLI archive round trips, released v0.3.0 and previous-main row preservation, erasure tests and typecheck passed. Library, rendered review, missing/stale values and the approved snapshot after a library revision were exercised and inspected at 1440/390; screenshots are retained at [OUT-014](retained-verification/OUT-014/). Counts move from 90 done / 22 partial / 19 missing to 91 / 22 / 18, with the 200-flow test inventory unchanged. This adds no homepage claim and establishes no live mailbox delivery.

CI follow-up: the prior-capture upgrade retains every original column/value and checks the new defaults. Both existing native onboarding journeys passed at 1440/390, asserting accepted approval responses and exact saved recipient/subject/body before and after reload for direct and managed mail. The former transient-status checks were replaced; no case was added, deleted or weakened.


## Slack sales notices

INTEGRATE-005 implements encrypted installation-local Slack setup, bot-member workspace-internal channel selection, per-channel event choices, audited Slack team/enterprise/app/user-to-operator mappings and fixed-field sales notices. The installation owner administers it until TEAM-005 supplies real administrator/team channel and audience rules. Messages include only event kind, deal/company display name, stage from/to, owner display name, due date, task type/priority and a token-free Orbit link requiring sign-in. Person names and restricted record details are withheld; generic private notices carry only event kind and link. Notes, calls, handoff text, free-text task titles, contact details and amounts never enter a notice.

Signed inbound actions acknowledge or create an internal task under the mapped active operator. Unmapped/revoked/removed identities, foreign teams/channels/messages, stale/unsigned requests and replays are refused. Slack actions never approve, edit or send customer mail. Durable per-event/per-channel delivery states expose rate limits, unaccepted failures and uncertainty; an uncertain submission is held for human inspection, never blindly resent. Disconnect/revocation appears as unresolved setup while manual work remains available. Archives carry configuration, mappings and history without bot tokens, signing secrets or unconsumed action capabilities. Restore requires fresh route/mapping confirmation. Underlying record erasure redacts stored notice content and issues tracked chat.delete requests.

Existing BOUNDARY-001 steps carry internal booking, call/meeting, accepted handoff and won-deal notices. QUOTE-001 inherits the signed-quote notice, INTEGRATE-003 the billing notice and INTEGRATE-008 the Buoy-handoff notice. The clause shipping last retains the full BOUNDARY-001 buyer journey; this change adds no homepage claim.

The one existing BOUNDARY/source-onboarding case is extended and retitled “INTEGRATE-005 Slack notices carry only allowed fields, replay once, withhold private data and refuse unmapped, foreign and replayed actions”. No case was added or deleted; the budget remains 198 cases plus two qualification flows, total 200. The final [recorded live run](retained-verification/INTEGRATE-005/live.json) covers two real bot messages, authenticated links, replay, public erasure with two tracked chat.delete successes, empty channel readback and independent repeat deletes returning message_not_found. The earlier two posts were also deleted; four were posted in total. Ct’s 19:12Z ruling permits an omitted is_frozen flag alone to mean false; the observed shape is retained as a recorded run. Every other missing safety flag and malformed/frozen/shared/archived metadata remains refused. Signature/identity/refusal, rate/failure/timeout, private data, archive and erasure proof uses the fake Slack network edge. Additional rendered error-state screenshots use test-only data in the real emitted Worker. No live Slack-originated click is claimed; the app-console step remains in OWNER-STEPS.md.

Ct answered at 18:20Z on 20 October 2026, approving all three questions with conditions: complete tenant/app/user identity binding, audited definition-only mappings, generic private notices, single-use actions, channel safety-event suspension, tracked chat.delete and named inheritance. Native fixture and real adapter acceptance determine implementation status; live-provider and hosted tiers remain separately reported.

Implementation source `5b296b65c14b895d2728abcc1ff802be825d9c08` (21 October 2026) moves INTEGRATE-005 from missing to done: 91/22/18 becomes 92 done / 22 partial / 17 missing. Ct’s sole omitted-is_frozen ruling is applied; all other missing or malformed safety flags remain refused. Migration 0051 preserves released v0.3.0 and accepted-main rows. No homepage surface or claim changed.

CI follow-up preserves all assertions and the archive browser’s 90-second restore deadline. The historical onboarding fixture now removes post-generation Slack tables before constructing pre-library inventories. The native restore engine skips empty clear positions within its existing table-step budget while retaining each nonempty clear, full schema/capacity fences and rollback. Onboarding archive (1/1), archive transfer/erasure (4/4), the revised Slack case (1/1), typecheck and the unchanged archive browser journey (1/1) passed; its 1440/390 end states are retained. Literal evidence references name the three existing support files. No case was added or removed.

## Sales reports

REPORT-001 covers a built-in sales report suite over Orbit's native records: open pipeline value and count by pipeline, stage and owner; won and lost reasons from the recorded close reason; closed-won revenue in the workspace currency; stage-to-stage conversion from recorded stage movement, and win rate as won ÷ (won + lost); stage age and sales cycle; rep activities (notes, logged calls and meetings, reviewed sent messages) by author; task completion by assignee with overdue tasks shown separately; meetings booked through signed booking intake; and follow-up outcomes of reviewed scheduled messages. Each is a saved, versioned definition that an operator opens, filters by pipeline and rep, groups and saves. Months are local calendar months in the workspace timezone.

Every preview, saved result, history entry and export discloses its period, timezone and month boundaries, definitions, source fields, currency, missing data, access and freshness. Every total, group, reason and month opens the exact deals, stage moves, activities, messages, tasks or bookings it counts, and they reconcile to the figure shown. Figures use only the records and fields the viewer may read now: a hidden amount is never summed, a hidden row is never counted or labelled, and a revoked grant changes the reopened report and its export on the next request. Follow-up outcomes count delivered messages, genuine replies, meetings, stage advances and wins separately. Reported opens are inferred and never count as success; automatic replies never count as replies.

A report is private, shared with named operators or shared with the workspace. Sharing never grants record access, and the installation owner administers sharing until TEAM-005. Until roles exist every full operator reads every record and a collaborator sees only their grants. Saved results keep their definition and rows; evidence recorded later appears beside them as late-arriving, and recomputing creates a separate result. Records and local CLI archives carry definitions, shares and results without authority, and erasing a contact, company or deal that a saved result names withdraws that result in full.

SEQUENCE-001 inherits enrollment-level sequence reply reports, TEAM-005 manager team scope, team sharing and restricted-seller totals, RECORD-016 owner grouping with "Unassigned", CALL-001 provider call activity, and REPORT-002 dashboard composition. None of them is claimed complete here.

The existing report-disclosure case is extended and retitled “REPORT-001 a US monthly two-pipeline report reconciles won/lost/open deals, reasons and rep activities by drill-through, discloses its basis, and leaks nothing after revocation or late evidence”; all of its earlier custom-report assertions are kept. Its screens are retained at [REPORT-001](retained-verification/REPORT-001/). Implementation source `6e9a079a814e5312458f9a1834a61df4d6be6568` (21 October 2026) moves REPORT-001 from partial to done: 92 done / 22 partial / 17 missing becomes 93 / 21 / 17. Migration 0052 adds only the report-sharing table and keeps every released v0.3.0 row. The 200-flow test inventory is unchanged, and no homepage surface or claim changed.

CI follow-up: the first branch Verify (39569731861) found the deployment spec without migration 0052, now republished from the build, and an axe contrast finding sampled while an opened drill figure was mid-way through the shared button colour transition. Drill figures now change state at once; every assertion is kept and no case was added or removed.

## Shared dashboard claim boundary

REPORT-002 is partial. Dashboards compose saved REPORT-001 definitions and FORECAST-001 views in a phone-reflowing grid. Every current viewer calculation, drill, CSV and PDF uses the source engines and current access. Definition sharing gives no record access, and inaccessible sources disclose no name, version, period or figure. Definitions, filters, shares, defaults and schedules are portable without authority; schedules restore paused and erasure withdraws affected saved-result pointers. The built public journey and screenshots are at [REPORT-002](retained-verification/REPORT-002/).

Every saved schedule version starts paused. The installation owner can separately enable its Slack destination for an eligible channel that explicitly chose Dashboard ready. Slack receives only fixed event kind and a token-free authenticated link: no dashboard name, figure, count, PDF, CSV or image. Durable occurrences deduplicate; Retry-After, failed-only retry, uncertainty holds and pre-post safety checks apply. Restore, reconnect and safety suspension require an explicit enable again and replay no old notice. Email stays paused: the managed relay cannot carry attachments and Orbit has no system notification sender. Weekly recipient-rendered email, next-send email revocation and email attempts/retry/uncertainty remain gaps. PDF export supports WinAnsi and refuses unsupported characters. No real provider call or consent was used.

TEAM-005 retains the team filter, team sharing, administrator team default with personal override and restricted sellers. RECORD-016 retains Owner filtering for future owned record types; NOTIFY-003 retains the later dashboard delivery model. Each receiving duty appears in both CONTRACT and ACCEPTANCE. These paragraphs add no homepage or release claim.

## Contact and company owners

RECORD-016 is partial at implementation source `3e97dfcc5d71e74da5e5f81f65fbcd6b130db574` (23 October 2026). Migration 0054 uses separate ownership and history tables, preserving populated released v0.3.0, accepted-main and historical native-0042 installations without removing native columns. The public record route assigns, reassigns and unassigns; one reviewed batch lists individual refusals and supports revision-fenced undo. A 20-contact review with one contact erased before application changes 19 records and records 19 entries; undo restores those 19 prior owners. Grouped in-app notices exclude self-assignment, unchanged owners, replay and undo. Record and retired-owner erasure remove attributed copies; Records and local archives restore history without live review authority.

The existing records/search, forward-upgrade and browser cases are extended and retitled with RECORD-016; none is added or deleted. The inventory stays 198 cases plus two qualification flows, total 200. Typecheck, populated upgrades, authenticated archive/restore and erasure pass; [1440/390 screens](retained-verification/RECORD-016/) cover contact/company assignment, timeline, bulk review/undo and the notification inbox. Counts become 93 done / 23 partial / 15 missing. Import mapping, default views, report grouping/filtering, rules and removal handover remain gaps, with RECORD-014, TEAM-005, NOTIFY-003 and the connected-mailbox/workflow/API clauses carrying their existing named duties. No homepage claim changed and no real provider call or consent was used.

## Mapped form enquiries

FORM-001 remains partial at implementation source `8a91ec3e4730c9957e32276dd3b5debc625c390c`. Reviewed forms admit exact allowlisted HTTPS direct posts with the existing abuse checks and no cookie or tracking script. Contact, company and new-deal native/custom properties map explicitly; populated contact/company differences wait as reviewed proposals. Existing owners stay, and fixed, durable active-user rotation and unassigned rules record their choice. One in-app notice reaches the selected full operator per accepted submission.

Real D1 HTTP journeys cover mapping, review, rotation across restart, inactive members, origin revocation during external verification, consent, replay, Records/local CLI transfer and erasure of quoted mailbox copies in mapped fields. [Inspected 1440/390 screens](retained-verification/FORM-001/) show the builder, hosted form, receipt and owner inbox. The existing four form cases and shared browser registration are extended; the suite remains 200. TEAM-005 teams and queues, RECORD-014 lead/custom-object kinds and NOTIFY-003 email/push remain gaps. No real provider call or consent was used.

Picklist and hidden fields follow the same reviewed revision. A picklist accepts only its published choices; a hidden field carries a fixed value kept in the reviewed definition or one declared query parameter of the hosted page, the embedding page (copied by the generated framed embed) or a direct post. Forged choices, undeclared names and fixed-value overrides are refused without a customer or proposal write, and a changed definition takes effect only after its new revision is reviewed and published. [Inspected 1440/390 screens](retained-verification/FORM-001/) show the builder, hidden-value review, hosted picklist, a hosted receipt and the framed embed; no migration was needed and the suite remains 200.

## Mail from contacts and companies

OUT-017 remains partial. Contacts, explicitly selected company contacts and closed-deal history use the existing reviewed mail path without requiring or creating an open deal. Record AI requests show exact fields, linked customer signals, exchanged mail and instructions before generation through ai.provider.v1. Validated results retain citations in the draft activity and open the unsent editable composer; provider failures produce no fallback content, and generation never approves mail.

The existing held-reply review now attaches to a contact and their primary company or dismisses once with attribution. Automatic mail never becomes a genuine response. Removal review includes open contact promises beside opportunities, tasks and handoffs, requires a receiving full operator or explicit unassignment, and refuses changed work. Revocation, cancellation and handover commit together; historical senders remain attributed, transferred overdue promises appear in the receiver’s Today, and unassigned promises remain visible on their contacts. Migration 0066 adds current ownership while preserving prior columns and values.

The extended existing outreach, operator-erasure, populated-upgrade and built-Worker cases cover these flows with model and mail fakes only at network edges. [Inspected 1440/390 screens](retained-verification/OUT-017/) show the AI preview, contact held review and promise removal review. Registrations remain 198 plus two qualification flows (200/200); statuses remain 93/24/14 of 131 with OUT-017 partial. Remaining gaps are OUT-019 recipients/reply-all, OUT-013 mailbox sends/live replies, RECORD-014 leads, CAPTURE-010 provider threading, SEQUENCE-001/003 and OUT-016 tracking. No real provider acceptance or complete OUT-017 Acceptance is claimed.

## Connected-mail association rules

CAPTURE-010 remains partial at implementation source `0864a0fc4c86b21bc2ccbfa56f82872aff0e9da2`. The installation owner chooses held review, most recently active open deal or all open deals for new exact-contact connected mail. Trusted message identity takes priority. Recorded source/operator activity determines recency with creation as the initial activity and deal identity as the tie-breaker. Automatic timeline evidence names the rule; a full operator can move its deal association to an open deal of the same contact or remove deal links in one action, retaining the immutable captured original and attributed correction history. A contact without an open deal receives contact/company evidence only.

Both real provider adapters run against their network-edge fixtures, covering restart, each rule, strict identity priority, correction replay and refusals. Records and local CLI archives carry the setting and corrections without provider authority; contact erasure removes their captured originals and derivatives. Migration 0057 keeps populated rows and fresh bootstrap. The existing provider case moves unchanged in registration count to its own measured shard; no case is added or deleted from the 200-flow budget. The emitted Capture and record timeline screens are exercised at 1440/390. Live Gmail/Microsoft consent and acceptance remain unmeasured; attachments, unknown-participant proposals and the calendar-window extension remain gaps. No real provider call or consent was used.
