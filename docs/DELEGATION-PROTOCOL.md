# Delegation protocol

Orbit's connected applications speak `rer-delegation/1`. This page is for people writing such an application; owners connect one with [Connected applications](CONNECTED-APPLICATIONS.md).

Every call below is under `/api/delegation/v1/` on the Orbit installation's own origin. After the token exchange, each call carries `Authorization: Bearer <access token>`; cookies give no authority here. Every call rechecks the delegation's scope, expiry and revocation, the person it acts as and whether its application is still enabled, so revocation stops reads and writes at once. Responses are JSON and never cached.

## Getting an access token

1. The owner registers the application's client identifier and exact callback URL in Orbit.
2. The application opens `/delegation/authorize` in the owner's browser with `client_id`, `redirect_uri` (exactly as registered), `response_type=code`, `state` (16 to 1024 characters), `code_challenge` and `code_challenge_method=S256` (PKCE), `account_id=workspace`, `scope` (space-separated) and `targets` (a JSON array of 1 to 100 targets, below).
3. The owner reviews the consent page, chooses Allow and confirms the emailed link. Orbit redirects to the callback with `code` and `state`.
4. Within 10 minutes the application posts a form to `POST /api/delegation/v1/token` with `grant_type=authorization_code`, `client_id`, `redirect_uri`, `code` and `code_verifier`. The answer is `{access_token, token_type: "Bearer", expires_in, scope}`. The token lasts at most 30 days and is shown once.

An application with no callback of its own can use Orbit's (`/delegation/callback`): the owner chooses Connect in Orbit, and Orbit makes the exchange and shows the token to copy.

## Scopes and targets

| Scope | Allows |
| --- | --- |
| `crm.evidence.read` | Reading the selected targets: `/evidence`, `/check`, `/audience`, `/records`, `/brief`, `/plan` |
| `crm.handoff.write` | `orbit.handoff.upsert` through `/effects` on handoffs under selected opportunities |

A target is `opportunities/{id}`, `contacts/{id}`, `companies/{id}`, `signals/{id}` or `opportunities/{id}/handoffs/{id}`. Selecting an opportunity also selects the handoffs on it. Nothing outside the selected targets is readable.

## Calls

| Call | Answers |
| --- | --- |
| `GET /identity` | The protocol, installation ID, the person it acts as (`principalId`, `label`), the grant's scopes, targets and expiry, and `capabilities` (`readKinds`, `operations`, `listRecords`, and more). |
| `GET /records?q=&kind=&cursor=&limit=` | The records this delegation may read, by name (below). |
| `GET /evidence?target=` | One selected record's title, text, revision, audience and Orbit link. |
| `GET /check?target=` | The same revision and audience without the text. |
| `GET /audience?target=&operation=` | The Orbit people who can see the record, with `audienceRevision`. |
| `GET /brief`, `GET /plan?target=signals/{id}` | The Today brief and a meeting plan, narrowed to the selected records. |
| `POST /effects` | `orbit.handoff.upsert` with `operationKey`, `target`, `expectedRevision`, `expectedAudienceRevision` and `content`; the same key replays one effect. |
| `GET /effects/{operationKey}` | The receipt and the handoff as it is now. |
| `POST /revoke` | Ends the delegation. |

Optional handoff state on `/evidence` and `/check` is described in [Optional handoff state observations](delegation-record-state.md).

## Listing records by name

`GET /api/delegation/v1/records` lets an application show the person a list of names to pick from instead of asking for IDs. It needs `crm.evidence.read` and returns only what that delegation may read: its selected targets, plus the handoffs on its selected opportunities. Each item has the target, its kind and its name, nothing else.

| Parameter | Meaning |
| --- | --- |
| `q` | Optional; keeps names containing this text, ignoring case (up to 200 characters). |
| `kind` | Optional; one of `crm.opportunity`, `crm.contact`, `crm.company`, `crm.signal`, `crm.handoff`. |
| `limit` | Optional; 1 to 100, default 50. |
| `cursor` | Optional; the `nextCursor` of the previous page. |

```json
{
  "provider": "orbit",
  "principalId": "01J…",
  "observedAt": "2026-10-17T10:00:00.000Z",
  "items": [
    { "target": "opportunities/01J…", "kind": "crm.opportunity", "name": "Harbor Ltd renewal" },
    { "target": "contacts/01J…", "kind": "crm.contact", "name": "Dana Reyes" }
  ],
  "nextCursor": null
}
```

A selected record that no longer exists is left out. Read a listed target with `/evidence` before relying on it; the list is a picker, not evidence. `/identity` reports `capabilities.listRecords: true` when the call is available to the delegation.

## Errors

Errors are `{"error": {"code", "message"}}` with these codes: `INVALID_REQUEST` (400), `DELEGATION_INVALID` (401: missing, expired, revoked or replaced token), `SCOPE_DENIED` (403), `NOT_FOUND` (404, also for targets outside the delegation), `REVISION_CONFLICT` or `AUDIENCE_CHANGED` (409), `SOURCE_TOO_LARGE` (413), `UNSUPPORTED_OPERATION`, `UNSUPPORTED_RECORD_STATE_SCHEMA` or `EVIDENCE_NOT_ON_RECORD` (422), and `UNAVAILABLE` (503, for example while Orbit restores an archive). A restore ends every delegation; the owner connects the application again.
