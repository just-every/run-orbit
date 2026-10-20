# Owner steps: prove mail and calendar capture

Capture's default needs no OAuth client: create the Orbit address and add a calendar link from **Capture**. This page covers the guided Google and Microsoft connections (**Capture → Google account / Microsoft account**, one numbered step at a time with the exact console links and the callback to copy). Create an OAuth client you own, connect it in your own Orbit installation, then prove the capture path with real provider data. No account has been connected and no live-provider receipt is implied by these instructions.

## About ten minutes per client

Run the [normal local setup](README.md), finish first-run setup, and open **Capture** as the owner. Choose **Google account → Set up** or **Microsoft account → Set up** and copy that provider's exact callback URI. An authorized successful `rer deploy` also prints an `ORBIT_CAPTURE_REDIRECT` notice; `rer dev` does not print callback URIs. The callback's origin must match the installation you are connecting (the local origin is printed as `RER_READY`). This URI contains no client secret. Keep the separate `RER_OPEN` sign-in link private.

Follow [Connect Gmail](docs/CONNECT-GMAIL.md) or [Connect Outlook](docs/CONNECT-OUTLOOK.md). Google needs the two APIs enabled, an External **Testing** audience with your account listed as a test user, and a **Web application** client. Microsoft needs an Entra registration with the right account audience, **Web** callback, and delegated `Mail.Read`, `Calendars.Read`, `offline_access`. Organization approvals can take longer than client creation. Google Testing grants for these scopes expire after seven days. The guides cite the exact provider requirements and production limitations.

Enter the ID and secret directly in Capture, complete provider consent, and choose both a small business label/folder and a calendar. Both providers require a fixed calendar start/end window when calendars are selected; the initial default is one year before today through one year after today. Edit it if necessary to include your proof meeting. Later dates enter capture only after you explicitly extend this window, which resets progress for a fresh scoped read. Record the source ID, selected IDs and time window; do not record the secret or OAuth tokens. Use data you are authorized to put into the shared CRM. Create or identify one genuine customer message and one meeting in those selected sources. Include a recurring Google meeting if you use recurring meetings. Keep one item outside the selections and one outside the window to check intake boundaries.

## Run the live proof after connecting

The proof command uses an existing native operator session; it does not automate consent, create a client or send mail. Prepare an owner-owned mode-0600 regular file outside tracked source containing only `__Host-orbit_session=VALUE` copied from your signed-in owner/full-operator browser session. Do not include a `Cookie:` prefix or other cookies. Read `node scripts/capture-live-proof.mjs --help` for the exact file requirements.

For the local RER gate, also pass `--dev-key-file`: it accepts a private file containing the raw `x-rer-dev-key` value, or this checkout's managed `.rer/local/dev-key.env` file. The dev key is additional to the native session, not a replacement, and may only be sent to loopback. Both credential files must be owner-owned mode-0600 regular files without symlinks or hard links. Keep them private, remove a temporary copied session/key file after proof, and never paste their contents into command arguments. Hosted runs omit `--dev-key-file`.

Replace the example origin, private session-file path and source ID below with this installation's values. The local examples use this checkout's managed dev-key file. Run each phase separately and inspect its receipt before continuing. Initial and incremental phases each perform a second sync pass internally to check stable captured/proposal counts; keep your controlled provider sources quiet during each command:

```sh
node scripts/capture-live-proof.mjs --origin http://127.0.0.1:8787 --session-file ../private/orbit-session.cookie --dev-key-file .rer/local/dev-key.env --source SOURCE_ID --phase initial
```

Check Capture and the affected record: selected message and meeting evidence is present, attribution and times are retained, excluded items are absent, and every proposed CRM change is reviewable. Capture must not approve or send customer outreach. Inspect any exact reply, bounce or stop evidence through its existing safety rules.

After the initial receipt completes, make a real change in the same selected provider source: receive another known-contact customer message or create a new revision of the selected meeting, without having Orbit send anything. Keep the selections and window unchanged. The incremental phase requires captured-count growth relative to the saved initial receipt in the same evidence directory; an unchanged source cannot prove that requirement. Then run:

```sh
node scripts/capture-live-proof.mjs --origin http://127.0.0.1:8787 --session-file ../private/orbit-session.cookie --dev-key-file .rer/local/dev-key.env --source SOURCE_ID --phase incremental
```

Inspect the new evidence and the receipt's internal replay result. Stable counters establish no newly counted capture or pending proposals during that replay; manually inspect signals, proposals and effects too. Include a non-primary Microsoft calendar in the live proof if you intend to use one: the official v1.0 schema exposes its delta route, while the prose reference still describes only the primary calendar. The [Outlook guide](docs/CONNECT-OUTLOOK.md) records that evidence gap. Record the actual source status, last success/error, receipt path and observed outcomes; omit bodies and tokens from shared evidence. If you change the selections or window, use a new private `--evidence-dir` and initial phase for a fresh proof.

Finally run the destructive-to-connection **disconnect** phase only when you intend to remove this source's saved credential:

```sh
node scripts/capture-live-proof.mjs --origin http://127.0.0.1:8787 --session-file ../private/orbit-session.cookie --dev-key-file .rer/local/dev-key.env --source SOURCE_ID --phase disconnect
```

Verify the source is disconnected and later intake is refused. Existing CRM evidence remains. Reconnect through Capture if you want continued use; revoke the provider grant separately if you want to withdraw provider permission too.

A successful local receipt proves only the named account, selection and phases. Google production verification/security assessment, Microsoft tenant approval, token-expiry recovery, other selected calendars, hosted operation and wider release acceptance need their own evidence. Stop a local app you started with `rer dev --stop` when done.

## Slack sales notices and live buttons

The bot-only proof for INTEGRATE-005 is retained at `docs/retained-verification/INTEGRATE-005/live.json`: Settings connection, stage and overdue-task delivery, channel readback, authenticated links, replay and deletion were live. Signed inbound actions and identity refusals use a generated test-installation signing secret at the fake network edge; no live Slack button click is claimed.

For your installation, open Settings → Slack sales notices. Enter the installed bot token and the app's signing secret from Slack App Console → Basic Information → App Credentials. They are encrypted, never shown again or exported; after importing an archive enter them again. The bot needs `chat:write` and `channels:read`, and `groups:read` only when you select private channels. Channel-history proof needs the matching history scope. Invite the bot to an internal test channel, load member channels and select event types. Map each Slack user ID explicitly to an active Orbit operator; do not infer identity from email.

For a live button click, enable Interactivity in the app console and use exactly `https://YOUR-ORBIT-ORIGIN/api/v1/slack/actions`, also shown in Settings. A local loopback address cannot receive Slack's public callback. The fleet shares one Slack app and coordinates which installation owns its single Interactivity URL; do not replace that URL during another seed's proof. Click Acknowledge and Create internal task as a mapped operator and inspect the attributed result in Orbit. An unmapped/revoked user, another team/channel/message, an old signed action or a removed operator must change nothing. These buttons never approve, edit or send customer mail.
