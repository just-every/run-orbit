# Connect Gmail and Google Calendar

Use your own Google OAuth client for your own Orbit installation. Start with an External client in Testing and your mailbox on its test-user list. Allow about ten minutes for console setup if you already have access to a Google Cloud project; organizational approvals and production verification take longer. This guide was checked against Google's official documentation on 13 October 2026. Live-account acceptance still requires the proof in [OWNER-STEPS.md](../OWNER-STEPS.md).

## 1. Get this installation's redirect URI

Run Orbit following [README.md](../README.md), then open **Capture → Google account → Set up** as the owner. Copy the exact callback URI shown there. A successful authorized `rer deploy` also prints `ORBIT_CAPTURE_REDIRECT google <absolute-URI>`; `rer dev` does not print callback URIs. The callback's origin must match the installation you are connecting (the local origin is printed as `RER_READY`). Register the complete URI, including the effective host and port. The callback path is `/api/v1/capture/oauth/google/callback`. Never register the private `RER_OPEN` sign-in link or its fragment.

Keep local development and hosted production in separate Google projects. A deployed installation uses its own HTTPS origin; a local development callback uses the exact loopback origin shown in Capture. If the origin changes, update the authorized redirect URI before reconnecting. Google's web-server authorization flow requires a matching registered redirect URI and requests offline access for refresh tokens. [Google web-server OAuth documentation](https://developers.google.com/identity/protocols/oauth2/web-server).

## 2. Create the owner client

1. Open the [Google Cloud console](https://console.cloud.google.com/), create or select a project you control, then open **APIs & Services → Library**. Enable **Gmail API** and **Google Calendar API**. [Enable Workspace APIs](https://developers.google.com/workspace/guides/enable-apis).
2. Open **Google Auth platform → Branding**. If prompted, press **Get Started**. Enter an app name identifying your Orbit installation, your support email and developer contact email. Select **External** as the audience and finish the setup. In **Audience**, leave publishing status **Testing**, then **Test users → Add users** and add the exact Google account you will connect. [Configure consent and test users](https://developers.google.com/workspace/guides/configure-oauth-consent).
3. In **Data Access → Add or Remove Scopes**, add both scopes below, then save. They provide read access; they do not give Orbit permission to send or modify mail or events.

   | API | Exact scope |
   | --- | --- |
   | Gmail | `https://www.googleapis.com/auth/gmail.readonly` |
   | Calendar | `https://www.googleapis.com/auth/calendar.readonly` |

   Gmail read-only access is **restricted**. Calendar read-only access covers calendars the account can access. [Gmail scope reference](https://developers.google.com/workspace/gmail/api/auth/scopes), [Calendar scope reference](https://developers.google.com/workspace/calendar/api/auth).
4. Open **Clients → Create Client → Web application**. Name the client, add the complete callback URI under **Authorized redirect URIs**, then create it. Orbit exchanges authorization codes on its server, so this is a web client. Copy its client ID and client secret into your private password manager. [Create OAuth credentials](https://developers.google.com/workspace/guides/create-credentials).

A Google Workspace organization can instead use **Internal** only when the project belongs to that organization and every user is in it. Its administrator may still restrict access. A personal Gmail account cannot use an Internal audience. [Audience rules](https://support.google.com/cloud/answer/15549945?hl=en).

## 3. Connect and choose what Orbit reads

In **Capture**, choose **Google account → Set up**; the guided page walks these same steps one at a time and asks for the client ID and secret in step 5. They are sealed server-side with the installation's encryption key. No client-secret environment variable or terminal command is needed. Continue to Google's consent screen, select the test-user account and grant the displayed read permissions. If access is blocked by your organization's policy, ask its administrator to approve this client; changing Orbit cannot override that policy.

Return to Capture and choose the Gmail label IDs and Calendar IDs you want captured. Choose a small business label and one calendar for the first proof. When selecting calendars, review the required fixed start/end window: its initial default is one year before today through one year after today, and you can edit it. The saved dates stay fixed; extend the window explicitly to include later meetings. Saving a changed selection or window resets provider progress for a fresh scoped read while preserving existing evidence and deduplicating replays.

Those selections limit Orbit's intake; the OAuth grant itself is broader and does not become label-specific or calendar-specific. Do not select personal sources you do not want in the shared CRM. Inspect source status, last success, last error and captured evidence after syncing.

Disconnect in Capture to stop intake and remove Orbit's saved credential. To withdraw the provider grant too, remove this client from your [Google account connections](https://myaccount.google.com/connections). Existing CRM evidence is subject to Orbit's ordinary erasure rules; disconnect is not record deletion. A Records restore excludes credentials, so connect again afterwards.

## Testing lifetime and recovery

External **Testing** supports up to 100 listed test users. For these mail/calendar scopes, test-user authorization and its refresh token expire after **seven days**; reconnect through consent when needed. This is not suitable for unattended long-term capture. [Testing restrictions](https://support.google.com/cloud/answer/15549945?hl=en). Outside Testing, refresh tokens can still expire or be revoked, including after prolonged non-use, a password change involving Gmail scopes, or policy changes. Treat a revoked grant as reconnect-required, not as a successful sync. [Google token lifecycle](https://developers.google.com/identity/protocols/oauth2).

Gmail's initial read follows every `nextPageToken` for the chosen labels; message lists contain IDs, so message content requires separate reads. Later reads follow paginated history from the saved `historyId`. History is usually available for at least a week, but can be shorter; an expired starting ID returns **404** and requires a new scoped full read. This history expiry is independent of OAuth token expiry. [Message listing](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/list), [Gmail synchronization](https://developers.google.com/workspace/gmail/api/guides/sync).

For each selected calendar, Orbit pages `events.list` with `singleEvents=false` to read recurring-series masters and changes, then saves the final `nextSyncToken`. Later list requests use that sync token; `timeMin` and `timeMax` cannot accompany it. Dated nonrecurring events are filtered to the saved window in Orbit. The window limits captured evidence rather than every provider read: series masters and changes are read across the selected calendar. [Events list and sync restrictions](https://developers.google.com/workspace/calendar/api/v3/reference/events/list).

For each changed recurring series, Orbit separately pages `events.instances` with the saved window's `timeMin` and `timeMax`, so instance expansion is finite. The live proof should include a recurring meeting if your business uses recurring meetings. [Recurring-instance reads](https://developers.google.com/workspace/calendar/api/v3/reference/events/instances). **410 Gone** from the list means the sync token is invalid and requires a fresh provider snapshot. Rebuilding progress must preserve immutable CRM evidence and replay deduplication. [Calendar synchronization](https://developers.google.com/workspace/calendar/api/guides/sync).

## Before wider or production use

Google documents personal use by the owner or a few personally known users, development/testing/staging, and qualifying Internal organization use as exceptions to submitting an app for verification. These are defined use cases, not a blanket exemption for every private, open-source or self-hosted deployment. Testing still has warnings, a user cap and limited token lifetime. [Restricted-scope verification and exceptions](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification).

For wider external use, complete required brand and restricted-scope verification: accurate public homepage and privacy policy, verified domains, scope justification and a demonstration of the consent and data-use flows. Google's restricted-scope guidance requires an approved third-party security assessment for server access to restricted data and renewal at least every 12 months. Orbit stores Gmail evidence on a server; Cloudflare hosting does not make it a device-only app. Do not treat an exception to review submission as a promise that this deployment is exempt from assessment; confirm its precise eligibility with Google before launch. [Verification requirements](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification).

The owner must also meet Google's Workspace data policy, including appropriate CRM use, Limited Use disclosures, secure storage and deletion, and restrictions on advertising, transfers and model training. Publish what this installation actually does with captured data. Choosing Production or passing a local test does not establish policy approval. [Google Workspace user data and developer policy](https://developers.google.com/workspace/workspace-api-user-data-developer-policy).
