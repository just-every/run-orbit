# Connect Outlook and Microsoft Calendar

Use your own Microsoft Entra application for your Orbit installation. This guide covers delegated access to the signed-in owner's Outlook.com or Microsoft 365 mailbox and calendars in the public Microsoft cloud. Allow about ten minutes for registration if you already have tenant registration rights; tenant creation or administrator approval can take longer. Official documentation was checked on 13 October 2026. Live-account proof remains separate: [OWNER-STEPS.md](../OWNER-STEPS.md).

## 1. Get this installation's redirect URI

Run Orbit following [README.md](../README.md) and open **Capture** at `/app/capture` as the owner. A fresh successful installed `rer dev` start in a terminal prints `ORBIT_CAPTURE_REDIRECT microsoft <absolute-URI>`; use `rer dev --foreground` to request that foreground output explicitly. A successful authorized `rer deploy` also prints the notice. Detached starts, including the non-terminal default, currently omit the notice from the installed launcher’s console; attaching to an already-running app does not reprint it either. In those cases, copy the exact callback shown on Capture. Its origin must match `RER_READY`. The callback path is `/api/v1/capture/oauth/microsoft/callback`. Use the entire URI, including host, case and port. Never register the private `RER_OPEN` link or fragment.

Configure the callback as a **Web** platform: Orbit exchanges the code on its server. Hosted callbacks must use HTTPS. For a local printed `http://127.0.0.1:PORT/...` URI, Microsoft's portal currently requires the application manifest's `replyUrlsWithType` entry with type `Web`; the Authentication textbox rejects that HTTP IP literal. Preserve other manifest entries and add the exact printed URI. Do not substitute `localhost` midway through a connection: that changes the session's host. [Microsoft redirect rules and loopback procedure](https://learn.microsoft.com/en-us/entra/identity-platform/reply-url).

## 2. Register the owner application

1. Sign in to the [Microsoft Entra admin center](https://entra.microsoft.com/). Select the tenant you control, then **Entra ID → App registrations → New registration**. An app registration needs a tenant and permission to register applications; an Outlook.com mailbox alone does not establish those rights. If registration is disabled, request it from the tenant administrator. [Registration prerequisites and steps](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app).
2. Enter a name identifying your installation. For both work/school and personal Outlook accounts, choose **Accounts in any organizational directory and personal Microsoft accounts**. Register the app and copy its **Application (client) ID**, not its Object ID. Under **Authentication → Add a platform → Web**, register the printed callback, using the manifest procedure above for HTTP `127.0.0.1`. [Account audiences and Web platform](https://learn.microsoft.com/en-us/graph/auth-register-app-v2).
3. Open **API permissions → Add a permission → Microsoft Graph → Delegated permissions**. Add `Mail.Read`, `Calendars.Read` and `offline_access`. Remove the automatically added `User.Read` if this registration serves only Orbit capture. Do not add application permissions, `Mail.Send`, or write permissions.

   | Delegated permission | Purpose |
   | --- | --- |
   | `Mail.Read` | Read the signed-in owner's mailbox |
   | `Calendars.Read` | Read that owner's calendar events |
   | `offline_access` | Obtain a refresh token for continued authorized reads |

   These delegated permissions support personal accounts and do not intrinsically require admin consent. That does not override tenant consent policy. [Graph permission reference](https://learn.microsoft.com/en-us/graph/permissions-reference).
4. Open **Certificates & secrets → Client secrets → New client secret**. Choose an expiry, save, and copy the **Value** into your private password manager before leaving the page. The secret ID is not the credential. Record its expiry and rotate it before then. Microsoft's maximum is 24 months; it recommends less than 12 months. [Client-secret creation](https://learn.microsoft.com/en-us/graph/auth-register-app-v2).

## 3. Connect and select sources

In **Capture**, choose **Microsoft account → Set up**; the guided page walks these same steps one at a time and asks for the client ID and secret in step 5. Credentials are encrypted server-side; do not put them in commands or logs. The tenant selector defaults to `common`, which allows personal and work/school accounts only when the registration's audience supports them. For a single-tenant registration, use its tenant ID; `organizations` restricts sign-in to organizational accounts, while `consumers` restricts it to personal accounts. [Delegated authorization and tenant choices](https://learn.microsoft.com/en-us/graph/auth-v2-user).

Complete Microsoft's consent flow as the mailbox owner, then choose the folders and calendars to read. Begin with one business folder and one calendar. For Microsoft calendars, review the required fixed start/end window shown in Capture: its initial default is one year before today through one year after today and you can edit the dates. The saved window stays fixed; extend it explicitly when you want later meetings included. Changing the selected calendar or window resets its provider cursor and starts a fresh scoped read, with existing evidence preserved and replays deduplicated.

The selections constrain Orbit's intake, not the provider permission grant: `Mail.Read` is mailbox-wide and `Calendars.Read` is not a permission for only one calendar. Shared/delegated mailboxes and calendars may require additional permissions and are outside this guide's owner-mailbox grant.

A work/school tenant can disable user consent or allow it only for approved permissions and verified publishers. An app requiring user assignment also needs administrator consent. If Microsoft shows **Need admin approval**, ask the tenant administrator to review and grant this application's delegated permissions; do not change tenant-wide consent settings just to bypass the prompt. [Tenant consent policies](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/configure-user-consent).

## Incremental reads and their limits

Mail capture uses a separate message-delta stream for each selected folder. Follow every returned `@odata.nextLink` exactly, then retain the terminal `@odata.deltaLink` for that folder. An empty page does not imply the stream is complete. A new folder selection needs its own initial read. [Message delta](https://learn.microsoft.com/en-us/graph/delta-query-messages).

Calendar capture uses a separate bounded calendar-view delta stream for each selected calendar, with explicit start/end times. Microsoft's current official **v1.0 OpenAPI** declares `/me/calendars/{calendar-id}/calendarView/delta()` and operation `me.calendars.calendar.calendarView.delta`; the inspected schema revision is `15780e98e1082517bc7a39a6b75b356a085326d9` dated 6 October 2026. This supports choosing the stable selected-calendar delta route rather than a beta dependency. [Official v1.0 OpenAPI](https://github.com/microsoftgraph/msgraph-metadata/blob/15780e98e1082517bc7a39a6b75b356a085326d9/openapi/v1.0/openapi.yaml#L506633).

The [v1.0 prose reference](https://learn.microsoft.com/en-us/graph/api/event-delta?view=graph-rest-1.0) still describes only the primary calendar, so the source evidence is inconsistent. The live proof must confirm the selected calendar's actual response and incremental changes; a schema route is not a live-provider receipt. Follow the returned `@odata.nextLink` through all pages, save the terminal `@odata.deltaLink`, and reuse it unchanged for that calendar and time window. A different window needs a fresh stream. [Calendar-view delta mechanics](https://learn.microsoft.com/en-us/graph/delta-query-events). Evidence outside that bounded window is not covered. Do not silently substitute a paginated full refresh for a failed delta request.

Delta links are opaque and have no fixed retention guarantee for Outlook entities. An expired delta token can return a 40X error such as `syncStateNotFound`; **410 Gone** also requires restarting the affected provider synchronization. A reset must preserve CRM evidence and replay deduplication. Token expiry, provider outages and throttling must remain visible as failed or reconnect-required source states. [Delta lifecycle and reset](https://learn.microsoft.com/en-us/graph/delta-query-overview).

## Lifetime, disconnect and go-live

Web-flow refresh tokens normally have a **90-day default lifetime**, rotate on use, and can be revoked earlier. The **24-hour** SPA lifetime is another reason to register Orbit as Web. Tenant policies and user actions can require fresh consent or sign-in; a refresh token is not permanent access. [Microsoft refresh-token lifecycle](https://learn.microsoft.com/en-us/entra/identity-platform/refresh-tokens).

Disconnect in Capture stops intake and deletes Orbit's saved credential; existing records remain subject to ordinary erasure. Revoke the application grant through the personal account's consent controls or the organization's enterprise application settings when withdrawing provider permission. Restored installations must reconnect because credentials are excluded from Records archives.

Before production, register the exact HTTPS callback, keep an expiry/rotation plan and complete any tenant consent and publisher requirements. Microsoft recommends certificates or federated credentials over client secrets for production; this Orbit connection form currently accepts a client secret, so stronger client authentication is a separate implementation decision, not an already-supported option. [Microsoft application credential guidance](https://learn.microsoft.com/en-us/graph/auth-register-app-v2). Prove the real mailbox workflow before claiming provider acceptance.
