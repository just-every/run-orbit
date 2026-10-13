// Populates a pre-change Orbit (main 8298464) through its own HTTP API under `rer dev`,
// then records the answers each person gets. Usage: node capture.mjs ORIGIN OUT_DIR
import { writeFile, mkdir } from 'node:fs/promises';
import { createHash, randomBytes } from 'node:crypto';

const [origin, out] = process.argv.slice(2);
const COOKIE = '__Host-orbit_session';
const iso = ms => new Date(ms).toISOString();

async function call(path, { method = 'GET', cookie, body, form, accept } = {}) {
  const headers = { Origin: origin };
  if (cookie) headers.Cookie = `${COOKIE}=${cookie}`;
  if (accept) headers.Accept = accept;
  let payload;
  if (form) { headers['Content-Type'] = 'application/x-www-form-urlencoded'; payload = new URLSearchParams(form); }
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const response = await fetch(origin + path, { method, headers, body: payload, redirect: 'manual' });
  const text = await response.text();
  let json; try { json = JSON.parse(text); } catch {}
  return { status: response.status, json, text, headers: response.headers };
}
async function ok(path, options) {
  const r = await call(path, options);
  if (r.status >= 400) throw new Error(`${options?.method ?? 'GET'} ${path} -> ${r.status} ${r.text.slice(0, 300)}`);
  return r;
}

// Newest outbox message addressed to this email -> its sign-in link.
async function outboxLink(email) {
  const list = await fetch(origin + '/__dev/outbox').then(r => r.text());
  const ids = [...list.matchAll(/\?message=([^"&]+)"/g)].map(m => decodeURIComponent(m[1]));
  for (const id of ids) {
    const detail = await fetch(origin + '/__dev/outbox?message=' + encodeURIComponent(id)).then(r => r.text());
    if (!detail.toLowerCase().includes(email.toLowerCase())) continue;
    const link = detail.match(/href="(http[^"]+\/auth\/verify\?token=[a-f0-9]+)"/);
    if (link) return link[1].replaceAll('&amp;', '&');
  }
  throw new Error('No outbox link for ' + email);
}
async function signIn(email, { request = true } = {}) {
  if (request) await ok('/auth/request', { method: 'POST', body: { email, returnTo: '/app' } });
  const link = await outboxLink(email);
  const r = await fetch(link, { redirect: 'manual' });
  const set = r.headers.get('set-cookie') ?? '';
  const token = set.match(new RegExp(`${COOKIE}=([a-f0-9]{64})`))?.[1];
  if (!token) throw new Error('No session for ' + email + ' status ' + r.status);
  return token;
}

const people = {};
// The owner's link was requested by `rer setup`.
people.owner = { email: 'owner@prior.example', session: await signIn('owner@prior.example', { request: false }) };
await ok('/api/v1/setup', { method: 'POST', cookie: people.owner.session, body: { name: 'Prior Sales', timezone: 'UTC', currency: 'USD', stages: 'New\nQualified\nProposal' } });

// Native full operators: a seller who keeps working and one who is later removed.
for (const [key, email, name] of [['seller', 'seller@prior.example', 'Prior Seller'], ['leaver', 'leaver@prior.example', 'Prior Leaver']]) {
  const r = await ok('/api/v1/settings/operators', { method: 'POST', cookie: people.owner.session, body: { email, displayName: name } });
  people[key] = { email, id: r.json.id };
}
people.seller.session = await signIn(people.seller.email);
people.leaver.session = await signIn(people.leaver.email);

// Records through the public handlers.
const inventory = (await ok('/api/v1/workbench', { cookie: people.owner.session })).json;
const created = (await ok('/api/v1/workbench/opportunities', { method: 'POST', cookie: people.owner.session, body: { title: 'Prior renewal', companyName: 'Prior Customer Ltd', contactName: 'Pat Prior', email: 'pat@customer.example', stageId: inventory.stages[0].id, valueCents: 1250000 } })).json;
const opportunity = (await ok(`/api/v1/opportunities/${created.id}`, { cookie: people.owner.session })).json.opportunity;
const contact = opportunity.contacts[0];
await ok(`/api/v1/records/contact/${contact.id}`, { method: 'PUT', cookie: people.owner.session, body: { name: 'Pat Prior', email: 'pat@customer.example', phone: '+1 555 0100', job_title: 'Head of Ops' } });
await ok(`/api/v1/records/opportunity/${created.id}/entries`, { method: 'POST', cookie: people.seller.session, body: { kind: 'note', text: 'Seller note before the upgrade.', occurredAt: new Date().toISOString() } });
const second = (await ok('/api/v1/workbench/opportunities', { method: 'POST', cookie: people.seller.session, body: { title: 'Prior expansion', companyName: 'Second Customer Co', contactName: 'Sam Second', email: 'sam@second.example', stageId: inventory.stages[1].id, valueCents: 480000 } })).json;

const workspace = (await ok('/api/v2/access/workspaces', { cookie: people.owner.session })).json[0].workspaceId;
const access = `/api/v2/access/workspaces/${workspace}`;

// Collaborators: one accepted seller-profile collaborator, one accepted analyst, one pending.
const inviteExpiry = iso(Date.now() + 29 * 86400000);
for (const [key, email, role] of [['collaborator', 'collab@prior.example', 'seller'], ['analyst', 'analyst@prior.example', 'analyst'], ['pending', 'pending@prior.example', 'guest']]) {
  const inv = (await ok(`${access}/invitations`, { method: 'POST', cookie: people.owner.session, body: { email, role, expiresAt: inviteExpiry } })).json;
  people[key] = { email, invitation: inv.token, invitationId: inv.id, profile: role };
}
for (const key of ['collaborator', 'analyst']) {
  people[key].session = await signIn(people[key].email);
  await ok('/api/v2/access/invitations/accept', { method: 'POST', cookie: people[key].session, body: { token: people[key].invitation } });
}
const admin = (await ok(`${access}/administration`, { cookie: people.owner.session })).json;
for (const key of Object.keys(people)) people[key].id = admin.members.find(m => m.email === people[key].email)?.operator_id ?? people[key].id;
const operatorRows = admin.members;

// Field-limited profile and explicit grants.
await ok(`${access}/roles/analyst`, { method: 'PUT', cookie: people.owner.session, body: { actions: ['graph.read', 'graph.search', 'analytics.read'], fields: ['title', 'name', 'value_cents'] } });
await ok(`${access}/grants`, { method: 'POST', cookie: people.owner.session, body: { subjectKind: 'operator', subjectId: people.collaborator.id, resourceType: 'opportunity', resourceId: created.id, actions: ['graph.read', 'graph.update'], fields: ['title', 'value_cents', 'expected_close_at'], purpose: 'Work the renewal', expiresAt: null } });
await ok(`${access}/grants`, { method: 'POST', cookie: people.owner.session, body: { subjectKind: 'operator', subjectId: people.collaborator.id, resourceType: 'contact', resourceId: contact.id, actions: ['graph.read'], fields: ['name', 'email'], purpose: 'Contact the buyer', expiresAt: null } });
await ok(`${access}/grants`, { method: 'POST', cookie: people.owner.session, body: { subjectKind: 'operator', subjectId: people.analyst.id, resourceType: 'opportunity', resourceId: second.id, actions: ['graph.read'], fields: ['title', 'value_cents'], purpose: 'Forecast review', expiresAt: null } });

// Slate delegation: client registration, consent, code exchange and a handoff effect.
await ok('/delegation/clients', { method: 'POST', cookie: people.owner.session, form: { id: 'slate', redirect_uri: 'https://slate.prior.example/callback' } });
const verifier = randomBytes(32).toString('base64url');
const challenge = createHash('sha256').update(verifier).digest('base64url');
const authorize = { client_id: 'slate', redirect_uri: 'https://slate.prior.example/callback', response_type: 'code', state: randomBytes(16).toString('hex'), code_challenge: challenge, code_challenge_method: 'S256', account_id: 'workspace', scope: 'crm.evidence.read crm.handoff.write', targets: JSON.stringify([`opportunities/${created.id}`]) };
await ok('/delegation/authorize?' + new URLSearchParams(authorize), { cookie: people.owner.session });
const consent = await call('/delegation/authorize', { method: 'POST', cookie: people.owner.session, form: authorize });
if (consent.status !== 303) throw new Error('consent ' + consent.status + ' ' + consent.text.slice(0, 200));
const code = new URL(consent.headers.get('location')).searchParams.get('code');
const tokenResponse = await fetch(origin + '/api/delegation/v1/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'authorization_code', client_id: 'slate', redirect_uri: authorize.redirect_uri, code, code_verifier: verifier }) }).then(r => r.json());
const bearer = tokenResponse.access_token;
const delegated = (path, body) => fetch(origin + '/api/delegation/v1' + path, { method: body ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + bearer, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }).then(async r => ({ status: r.status, json: await r.json().catch(() => null) }));
const handoffTarget = `opportunities/${created.id}/handoffs/prior-handoff`;
const check = await delegated(`/check?target=${encodeURIComponent(handoffTarget)}`);
const audience = await delegated(`/audience?operation=orbit.handoff.upsert&target=${encodeURIComponent(handoffTarget)}`);
const pick = (value, key) => { if (!value || typeof value !== 'object') return undefined; if (typeof value[key] === 'string') return value[key]; for (const v of Object.values(value)) { const found = pick(v, key); if (found) return found; } };
const effect = await delegated('/effects', { operationKey: 'prior-operation', operation: 'orbit.handoff.upsert', target: handoffTarget, expectedRevision: pick(check.json, 'revision'), expectedAudienceRevision: pick(audience.json, 'audienceRevision'), content: { title: 'Kick-off call', description: 'Agree the onboarding owner and date', assigneeId: people.seller.id, dueAt: null, status: 'open' } });
if (effect.status !== 200) throw new Error('effect ' + JSON.stringify({ effect, check, audience }).slice(0, 1500));

// A published form.
const forms = `/api/v2/workspaces/${workspace}/forms`;
const form = (await ok(forms, { method: 'POST', cookie: people.owner.session, body: { form: { title: 'Prior inquiry', fields: [{ id: 'name', label: 'Name', required: true }, { id: 'email', label: 'Email', required: true }], consentWording: null }, landing: { title: 'Prior inquiry', heading: 'Talk to sales', paragraphs: ['Tell us what you need.'] } } })).json;
const publication = (await ok(forms + '/compile', { method: 'POST', cookie: people.owner.session, body: { formId: form.id, revision: form.revision, reviewedHash: form.hash, slug: 'prior-inquiry', maxRecords: 100, expiresAt: iso(Date.now() + 29 * 86400000) } })).json;
await ok(`${forms}/publications/${publication.operationId}/approve`, { method: 'POST', cookie: people.owner.session, body: { artifactHash: publication.hash, formRevision: publication.formRevision } });
await ok(`${forms}/publications/${publication.operationId}/publish`, { method: 'POST', cookie: people.owner.session, body: {} });

// Remove the leaver last; removal revokes the leaver's sessions.
await ok(`/api/v1/settings/operators/${people.leaver.id}`, { method: 'DELETE', cookie: people.owner.session, body: { confirmed: true } });

await mkdir(out, { recursive: true });
await writeFile(`${out}/capture.json`, JSON.stringify({ origin, capturedAt: new Date().toISOString(), workspace, opportunityId: created.id, secondOpportunityId: second.id, contactId: contact.id, formSlug: 'prior-inquiry', handoffTarget, delegation: { clientId: 'slate', bearer }, operatorRows, people }, null, 1));
console.log('captured', Object.keys(people).join(','));
