# Orbit contract mechanisms

These protocol names and implementation settings support the observable requirements in CONTRACT.md. They preserve the existing mechanism rather than adding acceptance obligations.

## 1 — RECORD-003

Policy: `record.identity.v1`; default: the rules in this clause.

## 2 — RECORD-007

Policy: `opportunity.assignment.v1`; default: an opportunity an operator creates is unassigned.

## 3 — OPP-003

Policy: `opportunity.scoring.v1`; default: each contributing signal's configured weight decays linearly to zero over the 30 days after its occurred time, the sum is clamped to 0–100, and 0–39 is low, 40–69 is medium, 70–100 is high.

## 4 — OPP-006

Policy: `opportunity.prioritization.v1`; default: the ordering in this clause, and every factor it uses is shown in the opportunity view.

## 5 — OPP-008

Policy: `opportunity.next-action.v1`; default: evaluate once, keep the opportunity in NOW if that produces a new recommendation, and otherwise remove it from NOW and NEXT.

## 6 — ACTION-003

Policy: `outreach.instructions.v1`; default: at most 150 words, and no fact, price, discount, or commitment that a cited record or signal field does not carry.

## 7 — OUT-008

Policy: `outreach.quiet-hours.v1`; default: the window in this clause, with no holiday calendar.

## 8 — RECORD-001

Operators can create, edit, and delete contacts, companies, and opportunities. A contact requires a name or an email address and may also hold a phone number, job title, and timezone; a company requires a name and may hold one primary domain; an opportunity requires a title and holds a pipeline stage, a value in the workspace currency, zero or one owner, an expected close date, at most one company, and any number of contacts. Each entity listed in `seed.json → customFieldEntities` also holds custom fields. Contact, lead, company and custom-object owners, independent of opportunity owners, are defined in RECORD-016.

## 9 — RECORD-006

Operators can search contacts, companies, opportunities, and timeline text, and can filter opportunities by state, stage, owner, band, and queue. A first page holds at most 50 matches. Answering that first page within 500ms at the declared capacity in `seed.json` is a capacity target qualified separately; this release makes no capacity promise.

## 10 — SIGNAL-009

This clause supersedes BASE-ACCESS-004 for the paths `/api/v1/signals/` and `/api/v1/mail/events/` only: a request there is authorized by a signature from a source or mail provider configured in this deployment (or, at a source’s `/automation` endpoint only, its current private secret in an HTTPS Authorization Bearer header) instead of an operator session, and may write only signals, delivery states, and their timeline entries.  The separately scoped application-delegation boundary below is the only additional authorization exception.

## 11 — CAPTURE-008

When the installation names a receiving mailbox (`CAPTURE_MAIL_ADDRESS`, reached through Cloudflare Email Routing or signed SendGrid Inbound Parse), an operator can create a private Orbit address on the Capture page with no provider console: the mailbox with a random tag, kept sealed like a credential and never in archives. Only mail whose envelope names that exact tagged address is read, so a BCC copy, a forwarded message and automatic forwarding all count, and anything else is refused without storing. Each accepted message follows CAPTURE-001 to CAPTURE-004 exactly as an imported `.eml` file, and a forwarded message counts as coming from the sender it names. A forwarding confirmation from Gmail or Google Workspace is shown to the operator with its code and link instead of being stored as evidence. Replacing the address stops the old one at once and keeps everything captured; a message larger than 10 MB is counted as not stored rather than bounced.

## 12 — OUT-002

Customer mail is submitted through `mail.sender.v1`. An outbound message is draft, scheduled, queued, reconciling, accepted, delivered, bounced, failed, canceled, or delivery-unknown. The operator view calls a message sent only after the provider accepts it, and delivered only after a delivery event.

## 13 — OUT-010

Before submission Orbit checks the shared transport's rate and each sender's one-to-one budget under OUT-018 (`seed.json` limits: 100 messages a minute and 1,000 a user per rolling day by default). A message over a limit stays unsent and visible with the limit that stopped it and the time it may be sent; Orbit neither retries it silently nor merges it with another message. Sequence budgets and mailbox pacing are OUT-018's.

## 14 — OUT-012

An outbound customer message that carries opt-out under OUT-020 carries `List-Unsubscribe` and `List-Unsubscribe-Post` headers handled by the mail provider, or by the installation origin for managed relay mail and OUT-013 mailbox sends. An unsubscribe event that identifies one recipient sets that contact do-not-contact under RECORD-012 within 60 seconds and cancels their scheduled messages. OUT-020 sets which message types carry opt-out (sequence email on and one-to-one email off by default) and the scope of an opt-out from a message with more than one external recipient.

## 15 — BRIEF-005

Within the scoped application delegation below and with no new scope: `crm.evidence.read` also reads the brief, narrowed to lines resting on selected records, and the plan of a meeting that is selected or linked to a selected record, narrowed to the selected records and the contacts and company of selected opportunities; a line or interaction resting only on opportunities outside the grant is left out even when it shares a contact or company, records outside the grant are left off the lines shown, and unresolved attendees show only their address. A line seen only through a signal selected by id keeps only selected records; one left with none is listed apart from the accounts and links to that signal's evidence read. A held line names a proposed contact or company only when it is selected, and a selected contact's line is filed under its company only when that company is selected too. `orbit.handoff.upsert` content may cite evidence IDs; each must be a signal, timeline entry, draft or task on that opportunity, its contacts or its company, or the write is refused with 422. An application handoff carries standard and the company's policy decides its filing; under the held company policy it remains a proposal in the brief and on the opportunity with cited evidence (or the statement that it cites none) until a person accepts, edits or dismisses it; that review appends one timeline entry attributed to the person and naming the application. A handoff supplies evidence rather than message authority; an agent's separate sending call carries external under the company's policy (OUT-001). Without consent, without the write scope or after revocation an application cannot write, and revocation stops its reads at once.

## 16 — PUBLIC-001

GET / at the app origin returns the public Base Lobby without a session and links to native sign-in. The separate approved run site uses Orbit's public identity and images. Neither surface exposes this installation's contacts, companies, opportunities or signals. This target-contract round leaves the approved homepage and app interface untouched.

## 17 — PUBLIC-003

While no sign-in mail is configured, `GET /signin` answers without an operator session and states that sign-in email is unavailable. It presents no credential field, demo account, local-login action, or session bypass.

## 18 — DELEGATE-001

The 27 September native delegation outcome supersedes BASE-ACCESS-002 and
BASE-ACCESS-004 only for `/api/delegation/v1/`: an allowlisted application exchanges
a single-use consent code bound to the native operator, workspace, exact callback,
PKCE challenge, scopes and selected targets for a bearer credential expiring within
30 days. Ambient cookies confer no authority there. Every operation rechecks scope,
expiry, active operator, enabled application and revocation; restore invalidates
authority. Native consent, settings and task editing still require the operator session.

`crm.evidence.read` reads only selected records, and lists them (with the handoffs on selected opportunities) by name and target ID only, so an application can offer them by name. `crm.handoff.write` permits only
`orbit.handoff.upsert`, an internal task with title, description, assignee, due time
and open/completed/canceled status. It confers no outreach or account-activation
authority. Writes bind current source and audience revisions and commit task,
timeline, contact provenance and receipt atomically. Exact key replay produces one
effect; changed content conflicts. Immutable receipts remain separate from current
authorized source readback. Native UI edits the same records. Actual archives retain
tasks and contact provenance, exclude codes, credentials and receipts, and revoke
restored-installation authority. Full verification includes the delegation D1, archive
and native-browser regressions as well as all retained contract gates.

An INTEGRATE-005 Slack mapping confers no delegation or outreach authority. Its acknowledgment never accepts an application-proposed handoff; its only writes are acknowledgment and an attributed internal task under current native access.

## 19 — RECORD-026

**Attachments on mail.**
- Captured mail (CAPTURE-001 files, the CAPTURE-008 Orbit address and CAPTURE-010 connected mailboxes) keeps each non-inline attachment as a file of that message: a part with `Content-Disposition: attachment`, or a named part the body does not reference by `cid:`. It opens from the message's timeline entry and is listed on each linked contact, their company and the linked deal.
- Inline images the body references stay with the message body only and are not listed.
- A connected source fetches attachments from the provider (Gmail `users.messages.attachments.get`, Microsoft Graph message attachments) only for messages it captures from its authorized folders. A replayed message stores no second copy (SIGNAL-003).
- An attachment over the size limit is listed by name, type and size as not stored, with the reason; it is never dropped silently. Held evidence (SIGNAL-004, CAPTURE-012) keeps its attachments sealed with it and purges them with it.
- Mail sent from Orbit (OUT-013, OUT-014, OUT-017) lists its sent attachments, at the version sent, on the same records where the message lands.
- A file from a message is visible only to users who may see that message, and OUT-019's BCC limits apply. Before template attachments ship, RECORD-018 must also satisfy OUT-014: authorized/versioned attachment selection, size/type limits, explicit access and size failures, exact attachment preview before approval, and a record of the precise version sent on the recipients' records. Its acceptance sends an authorized attachment and refuses a forbidden one.

## 20 — CAPTURE-012

For a connected mailbox or calendar source (CAPTURE-010), a message or meeting whose external participant matches no contact or company key is not discarded. When that participant exchanged mail with an operator (the operator wrote to them, or they wrote to the operator) or attended a meeting with one, Orbit holds a new-prospect proposal showing the exact address, display name, domain, thread subjects, dates and message direction. Held mail stays sealed as held evidence in the SIGNAL-004 unlinked queue for 30 days, changes no record or score, and is purged if nobody accepts it. Automated, bulk and list senders (`List-Unsubscribe` or `Precedence: bulk` mail, no-reply and mailer-daemon addresses, calendar notifications), operator and configured internal domains, and an administrator-maintained exclusion list never produce proposals.

## 21 — OUT-016

An administrator enables tracking for the workspace, choosing open tracking, link-click tracking or both, and the disclosure text Orbit adds to tracked mail and the workspace privacy notice. Each rep then turns tracking on or off per one-to-one message, template and sequence email step (workspace default off; a rep may set their own default on). The OUT-001 review shows the tracking state, every tracked link and its exact destination, and the approval binds that state with the content. For opted-in mail sent through any Orbit transport, including OUT-013 Gmail and Microsoft 365 mailbox sending and `mail.sender.v1`, Orbit embeds one per-message, per-recipient image token and rewrites each tracked link to a per-message redirect on the installation origin that answers 302 to the reviewed destination unchanged. Gmail and Microsoft 365 report no opens or clicks through their APIs, so these tokens are the only source of open and click evidence and Orbit claims no other. Tokens are opaque, scoped to the approved message and recipient, contain no address or CRM id and authorize no other operation. Tracking is off initially; the disclosure and each reviewed destination are explicit.

## 22 — OUT-017

From a contact, lead (RECORD-014), company or deal record, a user with send permission under TEAM-005 composes a one-to-one email To one or more of that record's contacts. On a company record the To recipients are chosen explicitly from its contacts (RECORD-011). The user may add further To, CC and BCC recipients, internal colleagues and reviewed external addresses under OUT-019. The message can be written by hand, rendered from an OUT-014 template, or drafted on request as in ACTION-003, reading that record's evidence under the AI-001 preview. No open opportunity is required. The following can all be emailed:
- a lead or contact with no company or deal;
- a contact whose only deals are won or lost;
- a contact on an open deal, emailed from their contact or company record. Every send keeps the existing guarantees:
- OUT-001 exact-content approval;
- RECORD-012 contactability, including CAPTURE-012's recorded basis;
- OUT-008 quiet hours, OUT-009 scheduling, and OUT-010 limits with OUT-018's per-user budgets, under which one-to-one mail is never queued behind sequences;
- OUT-012 opt-out headers and link where OUT-020's setting puts them (off by default for one-to-one mail);
- OUT-003 and OUT-011 idempotency and reconciliation;
- OUT-016 tracking choice;
- OUT-002 states, whether through `mail.sender.v1` or an OUT-013 connected mailbox. **Deal link.** The composer shows the recipient's open deals. A message composed from an open deal is linked to it; from any other record, the sender may link it to at most one of the recipient's open deals or leave it unlinked. Sending never creates a deal and never reopens a closed one (OPP-001). A message composed from a won or lost deal appears on that deal's timeline as history and changes neither its lifecycle nor its queue.

## 23 — OUT-025

**Shared transport.** Mail sent through the shared `mail.sender.v1` transport has a deployment rate that scales with the declared team: by default at least 4 messages per minute per declared user, which is 100 per minute at 25 users. An administrator sets it to the connected SendGrid account's own rate. Each user's sequence steps on this transport are paced at no more than 3 per minute by default. **One-to-one first.** On every transport, one-to-one messages are claimed ahead of every queued sequence step. Sequence steps may use at most 75% of the shared transport's per-minute rate, so the rest is always available to one-to-one mail. A one-to-one message is submitted to its transport within 60 seconds of its approval or scheduled time at the declared team load, whatever any user's sequence backlog, when it is within its sender's one-to-one budget, has passed OUT-008 and is not stopped. **Fair draining.** Due sequence steps drain round-robin across users, then in enrollment order within each user's batches, so two SDRs' batches progress side by side. A user's steps beyond their own budget or pace wait for that user's next window (OUT-010) and never hold another user's mail.

## 24 — OUT-028

**Approval and transport.**
- OUT-001 approval binds the exact To, CC and BCC lists with the subject and body, and the review shows every list in full.
- OUT-013, or `mail.sender.v1`, submits the approved lists as one provider message. BCC addresses travel only in the envelope, never in delivered headers.
- Opt-out follows OUT-020. By default a one-to-one message or reply carries none. When it does, a message with more than one external recipient carries no one-click header; a person's opt-out through its link sets only that person do-not-contact, or records a suppression proof for that one-off address; and an opt-out that cannot name one recipient opens an unattributed stop request instead of stopping everyone.
- OUT-016 tracking on a message with more than one external recipient records message-level opens and clicks attributed to "a recipient", never to a named contact. A message with any do-not-track external recipient is sent untracked, and the review says so.
- Under OUT-018 one message counts once against the sender's budget. **Where it lands.** On provider acceptance, one transaction records one timeline activity on each external recipient contact (To, CC or BCC), once on each of their primary companies and once on the linked deal (OUT-017). Each activity shows the To and CC lists, limited to what the viewer may see under TEAM-005. A BCC address appears only on that BCC'd contact's own activity and to the sender. It is never shown on another contact's, company's or deal's timeline view, in another recipient's copy, in a report or in another record's export. Internal colleagues are shown by name and get no customer activity.

## 25 — OUT-020

**Setting per message type.** In Settings an administrator chooses, separately for each message type, whether Orbit adds opt-out headers (`List-Unsubscribe` and `List-Unsubscribe-Post`, OUT-012) and a visible opt-out link to the message:
- sequence email steps (SEQUENCE-001, SEQUENCE-003) and AUTO-001 workflow email: on by default;
- one-to-one email and replies (OUT-017, OUT-019, ACTION-003 drafts and OUT-009 scheduled one-to-one messages): off by default, as in the incumbent with its data-privacy settings off. Each change of the setting is recorded in the audit trail with the administrator, the old and new values and the time, and applies to messages approved after it. Approved unsent messages keep the state their approval bound, and the settings page shows how many there are. Orbit never changes mail a rep writes in Gmail or Outlook outside Orbit. Internal colleagues (OUT-019) are never offered an opt-out. **One message.** When the setting puts opt-out on a message, the rep may remove it from that one message, or from one sequence step, by marking it relationship or transactional mail, unless an administrator has forbidden removal for that message type (allowed by default). A rep may always add opt-out to a one-to-one message. The OUT-001 review shows the opt-out state and, when it was removed, the rep's marking. The approval binds that state with the content, and changing it marks a reviewed draft stale (ACTION-005). The delivered message carries exactly the reviewed state: the headers and the link together, or neither.

## 26 — OUT-029

**One external recipient.** A message with opt-out and exactly one external recipient carries one-click headers (`List-Unsubscribe-Post: List-Unsubscribe=One-Click`) and a visible link. Every sequence step is such a message, because SEQUENCE-001 addresses it To the enrolled contact with internal-only CC. For managed relay mail, the header and link use the same opaque message/recipient capability at the installation's configured `AUTH_ORIGIN`; approval binds the capability and the reviewed opt-out state. Base's existing relay serializer carries both list headers. OUT-013 inherits this installation-origin handler for mailbox sends. The public GET opens a confirmation page without changing contactability or scheduled work. Its plain button posts to the capability; an RFC 8058 POST with `List-Unsubscribe=One-Click` uses that same capability without sign-in. Either POST sets only its bound contact do-not-contact under OUT-012 and RECORD-012 and atomically cancels that contact's scheduled outbound work. Replay is idempotent and a late dispatch cannot revive that work. Neither the capability nor any public response enumerates identities or other recipients; malformed, foreign and erased capabilities disclose no recipient identity and change nothing. Erasure invalidates the capability. Otherwise it has no expiry or automatic rotation. CAN-SPAM requires the opt-out to keep working for at least 30 days after the send; a link that works forever is the honest choice. The private archive carries `outbound_opt_out_capabilities`; it does not expire them.

## 27 — OUT-032

Settings → Opt-out links holds the setting for each type, and each change is audited with the user, the old and new values and the time; the page counts the approved unsent messages bound to each state. The installation owner acts for the administrator until TEAM-005. One-to-one email starts off on a new installation; an installation upgraded with users already present keeps one-to-one opt-out on until an administrator changes it, and the page shows that basis. Messages approved before the setting existed keep their original unsubscribe group. Through SendGrid, opt-out is the installation's unsubscribe group: SendGrid adds `List-Unsubscribe`, `List-Unsubscribe-Post` and its footer links together, and a message without opt-out carries none of them. A rep's relationship or transactional removal, or addition, marks that draft for review again, and a change of the one-to-one setting does the same for every draft not yet approved (ACTION-005); the approval binds the reviewed state. The single-recipient managed-relay handler is independent of mailbox sending. With that approved path implemented and proved, new managed messages that need opt-out carry the installation-origin capability in the visible footer and both list headers, including replies; they do not use the former reply exception to remove opt-out. Approval and dispatch preserve older SendGrid approvals' opt-out-on state when switching to the relay, and approvals predating the setting remain opt-out-on. An explicit opt-out-off approval, including a permitted relationship or transactional removal, stays off. A historical `transport` marking retains the refusal policy; it is never silently treated as an explicit removal. If the managed path cannot carry the approved state, review and dispatch retain “This relay cannot carry your opt-out link yet (OUT-013)”; refusals remain audited and counted in Settings. The handler no longer depends on OUT-013 mailbox sending shipping first. OUT-013 inherits its mailbox reuse; OUT-019 inherits the several-recipient page and unattributed stop requests; SEQUENCE-001, SEQUENCE-003 and AUTO-001 inherit the stored settings, per-step removal, approval binding and per-person stops before those execution paths ship.

## 28 — API-001

Publish a versioned REST API for permitted contact, company, deal, custom-object, association, note, activity, file (RECORD-018), task, pipeline, report and sequence operations. Admin-issued scoped credentials, pagination, filters, schema errors, rate-limit headers, idempotent writes and optimistic concurrency match native permissions and erasure rules. An INTEGRATE-005 Slack mapping is neither an API nor a delegation credential. It grants no outreach authority, exact-message approval, sequence execution, record sharing or stage/owner/amount changes. The standalone credential resource door is `/api/rest/v1/`; credential administration remains a native-session operation. Explicit deal creation adds only the newly created deal to that credential’s permitted records, within the existing bounded record scope.
