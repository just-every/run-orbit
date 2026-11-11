# Read deals with an API credential

Create a credential while signed in as the installation owner. Finish first-run setup and add at least one deal first. From Settings › Integrations, choose **Create and use a read credential** to open this guide on your installation. The steps below use its existing authenticated API; no terminal is needed.

These steps work on your local `rer dev` instance and on your hosted Orbit. Keep this guide open on that installation while signed in, then open your browser’s developer tools and its **Console** tab (Chrome: View › Developer › JavaScript Console; Firefox: Tools › Browser Tools › Web Console). Run the following JavaScript there, in order. You do not need Node or a terminal. Keep the console private: the newly issued secret grants access to the selected deals.

## Find the principal and deal IDs

The principal is the active full operator whose current access bounds the credential. `GET /api/v1/settings` returns operator IDs in `operators`; use an entry with `status: "active"` and `collaborator: 0`. The signed-in installation owner can be the principal. `GET /api/v1/records/opportunity` returns deal IDs in `records`; its optional `q` query searches for a particular deal. A deal’s app URL also ends with its ID.

Paste this into the browser console to list both:

```js
async function orbitJson(path, options = {}) {
  const response = await fetch(path, options);
  const result = await response.json();
  if (!response.ok) throw Error(`${response.status}: ${result.error}`);
  return result;
}
const settings = await orbitJson('/api/v1/settings');
console.table(settings.operators.map(({ id, display_name, email, status, collaborator }) =>
  ({ id, display_name, email, status, collaborator })));
const deals = await orbitJson('/api/v1/records/opportunity');
console.table(deals.records.map(({ id, title }) => ({ id, title })));
```

## Create the credential

Run the next block and paste your chosen IDs into the two prompts. It sends the exact JSON body to `POST /api/v1/settings/api-credentials`, using your signed-in owner session. The browser supplies the same-origin `Origin` header; terminal clients would also need the native session cookie and that header. An API bearer credential cannot administer credentials.

```js
const principalId = prompt('Paste the active full operator ID from the table');
const dealId = prompt('Paste the deal ID from the table');
const definition = {
  name: 'Fleet reporting',
  principalId,
  operations: ['deal.read'],
  recordIds: [dealId],
  fields: ['title', 'expected_close_at', 'owner_id', 'products'],
  expiresAt: new Date(Date.now() + 30 * 86400000).toISOString()
};
const issued = await orbitJson('/api/v1/settings/api-credentials', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(definition)
});
console.log({ credential: issued.credential, secret: '[hidden]' });
```

All six keys are required. Use 1–100 explicit existing deal IDs and at least one readable field. The complete field choices are `title`, `stage_id`, `value_cents`, `company_id`, `expected_close_at`, `owner_id` and `products`. `expiresAt` must be a future UTC ISO timestamp within 90 days. This example grants only `deal.read`; `deal.create` and `deal.update` are separate operations and are unnecessary for reporting.

A successful request returns HTTP 201 with this shape (IDs and timestamps vary):

```json
{
  "credential": {
    "id": "<credential ID>",
    "name": "Fleet reporting",
    "principalId": "<chosen operator ID>",
    "operations": ["deal.read"],
    "recordIds": ["<chosen deal ID>"],
    "fields": ["expected_close_at", "owner_id", "products", "title"],
    "createdAt": "2026-11-04T00:00:00.000Z",
    "expiresAt": "2026-12-04T00:00:00.000Z",
    "revokedAt": null,
    "revision": 1
  },
  "secret": "<one-time bearer secret>"
}
```

Run `copy(issued.secret)` in the browser console, then paste into your integration’s private credential store before closing the console. The browser’s `copy` helper copies it without printing it. Never paste it into a URL, chat or log. It is returned only by creation and rotation. The example deliberately hides it in console output; `GET /api/v1/settings/api-credentials` lists metadata without returning secrets.

## Use it without your browser session

Run this in the same console. `credentials: 'omit'` proves the bearer secret works independently of your owner cookie:

```js
const result = await orbitJson(
  '/api/rest/v1/deals/' + encodeURIComponent(dealId) +
    '?fields=title,expected_close_at,owner_id,products',
  { credentials: 'omit', headers: { Authorization: 'Bearer ' + issued.secret } }
);
console.log(result);
```

HTTP 200 returns a `deal` object containing its `id` and the selected fields. `expected_close_at` is the current expected close timestamp or null; `owner_id` is the Orbit operator ID or null; `products` is an array of names saved in the deal’s buying context. To list the credential’s permitted deals, use `GET /api/rest/v1/deals` with the same bearer header. Your integration uses this installation’s origin and that header on every request. Native edits appear on the next read.

The credential stays within its issuing installation, workspace, selected records and fields, and its principal’s current access. Expiry, revocation and erasure withdraw access immediately. To revoke this example after trying it, run:

```js
await orbitJson('/api/v1/settings/api-credentials/' + issued.credential.id + '/revoke', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ revision: issued.credential.revision })
});
```

Missing or invalid body keys return HTTP 400 and name those keys in `error` and `issues`. HTTP 401 means the required session or bearer credential is absent or expired; HTTP 403 means the current caller lacks access. If issuance returns HTTP 409, refresh the ID tables and review the current principal and records before issuing again.
