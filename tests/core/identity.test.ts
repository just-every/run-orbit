import {exerciseAgentDoor} from '../support/agent-door-proof';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { isolatedDatabase } from '../support/isolated-database';
import { createApp as testApp, identityBindings } from '../support/app';
import { emailLinkSignIn, mailedIdentity } from '../support/email-link';
import { testAuth } from '../support/test-auth';
import { createApp } from '../../src/core/app/app';
import { identityResponse, operatorFromRequest, requireStepUp } from '../../src/core/features/identity';
import { registerDevAdmission } from '@runeditrun/rer/modules/operator-auth/dev-admission';
import { createId } from '../../src/core/shared/ids';

let fixture: Awaited<ReturnType<typeof isolatedDatabase>>;
let owner: string, opportunity: string;
before(async () => {
  fixture = await isolatedDatabase();
  // A claimed workspace: the owner_bootstrap trigger creates the owner, settings and stages.
  owner = createId(); opportunity = createId();
  const stage = createId(), now = new Date().toISOString();
  await fixture.db.prepare("INSERT INTO owner_bootstrap VALUES('initial-owner',?,'owner@orbit.test','Owner','Identity','UTC','USD',?,?)").bind(owner, JSON.stringify([{ id: stage, name: 'New' }]), now).run();
  await fixture.db.prepare("INSERT INTO opportunities(id,title,lifecycle,stage_id,owner_id,company_id,value_cents,expected_close_at,score,band,queue_state,queue_reason,last_contributing_signal_at,created_at,updated_at) VALUES(?,'Step-up','open',?,NULL,NULL,0,NULL,0,'low','none',NULL,NULL,?,?)").bind(opportunity, stage, now, now).run();
});
after(async () => { await fixture?.dispose(); });
const owned = { ownerClaimed: async () => true };

async function operator(email = `${createId().toLowerCase()}@example.test`) {
  const auth = testAuth(fixture.db), id = createId();
  await auth.ensureOperator({ id, email, displayName: 'Identity test' });
  return { id, email, auth };
}

test('DELEGATE-001 RECORD-001 OUT-004 TEAM-001 signed agent door; PUBLIC-004 email link: one answer for every address, inert preview, one-use POST confirmation, refused for a removed operator', async () => {
  await exerciseAgentDoor();
  const mail = mailedIdentity(fixture.db), person = await operator();
  // The deployed route selects the RER relay, even when old SendGrid credentials remain.
  const relayBindings={...mail.bindings,AUTH_LOCAL:'false',MAIL_PROVIDER:'rer',MAIL_FROM:'managed@example.test',MAIL_API_KEY:'fixture-relay-key',MAIL_RELAY_URL:'https://managed-mail.example.test/send',SENDGRID_API_KEY:'must-not-be-used'};
  const nativeFetch=globalThis.fetch;let relayBody:{text:string;subject:string;to:string}|undefined;
  globalThis.fetch=async(input,init)=>{if(String(input)!==relayBindings.MAIL_RELAY_URL)return nativeFetch(input,init);relayBody=JSON.parse(String(init?.body));return Response.json({messageId:'<signin@example.test>'},{status:202});};
  try{const relayed=await identityResponse(mail.post('/auth/magic-link',{json:{email:person.email,returnTo:'/app'}}),relayBindings,owned);assert.equal(relayed!.status,202);assert.equal(relayBody?.to,person.email);assert.match(relayBody!.text,/https:\/\/orbit\.test\/auth\/confirm/);}finally{globalThis.fetch=nativeFetch;}
  const ask = (request: Request) => identityResponse(request, mail.bindings, { ...owned, mailSender: mail.mailSender });
  const unknown = await ask(mail.post('/auth/magic-link', { json: { email: 'missing@example.test' } }));
  const known = await ask(mail.post('/auth/magic-link', { json: { email: person.email, returnTo: '/app?queue=next' } }));
  assert.equal(unknown!.status, 202);
  assert.deepEqual(await known!.json(), await unknown!.json());
  assert.equal(mail.sent.length, 1, 'only the operator receives a link');
  const link = mail.linkIn(mail.sent[0])!, token = new URL(link).searchParams.get('token')!;
  assert.equal(await fixture.db.prepare('SELECT count(*) n FROM identity_proofs WHERE hash=?').bind(token).first('n'), 0, 'only a keyed digest is stored');
  const preview = await ask(new Request(link));
  assert.equal(preview!.status, 200);
  assert.equal(preview!.headers.get('set-cookie'), null, 'opening the link signs nobody in');
  const confirmations = await Promise.all([ask(mail.post('/auth/confirm', { form: { token } })), ask(mail.post('/auth/confirm', { form: { token } }))]);
  const signedIn = confirmations.filter(response => response!.status === 303 && response!.headers.get('set-cookie'));
  assert.equal(signedIn.length, 1, 'a link signs in once');
  assert.equal(signedIn[0]!.headers.get('location'), '/app?queue=next');
  const cookie = signedIn[0]!.headers.get('set-cookie')!;
  assert.match(cookie, /^__Host-orbit_session=[a-f0-9]{64}; Path=\/; HttpOnly; Secure; SameSite=Lax/);
  assert.equal((await operatorFromRequest(new Request(mail.origin + '/app', { headers: { Cookie: cookie.split(';')[0]! } }), mail.bindings))?.operatorId, person.id);

  await ask(mail.post('/auth/magic-link', { json: { email: person.email } }));
  const pending = new URL(mail.linkIn(mail.sent.at(-1))!).searchParams.get('token')!;
  await fixture.db.prepare("UPDATE operators SET status='removed',updated_at=? WHERE id=?").bind(new Date(Date.now() + 1).toISOString(), person.id).run();
  assert.equal((await ask(mail.post('/auth/confirm', { form: { token: pending } })))!.headers.get('set-cookie'), null, 'removal ends an outstanding link');
  assert.equal(await operatorFromRequest(new Request(mail.origin + '/app', { headers: { Cookie: cookie.split(';')[0]! } }), mail.bindings), undefined, 'removal ends the session');
  const count = mail.sent.length;
  await ask(mail.post('/auth/magic-link', { json: { email: person.email } }));
  assert.equal(mail.sent.length, count, 'a removed operator receives no link');
});

test('PUBLIC-004 sign-out by a form before hydration revokes the session; foreign origins are refused', async () => {
  const mail = mailedIdentity(fixture.db), person = await operator(), session = await person.auth.createSession(person.id);
  const cookie = `__Host-orbit_session=${session.token}`;
  const forged = new Request(mail.origin + '/auth/signout', { method: 'POST', headers: { Origin: 'https://evil.test', Cookie: cookie, 'Content-Type': 'application/x-www-form-urlencoded' } });
  assert.equal((await identityResponse(forged, mail.bindings, owned))!.status, 403);
  const out = await identityResponse(mail.post('/auth/signout', { cookie, form: {} }), mail.bindings, owned);
  assert.equal(out!.status, 303);
  assert.equal(out!.headers.get('location'), '/signin?notice=signed_out');
  assert.match(out!.headers.get('set-cookie')!, /Max-Age=0/);
  assert.equal(await person.auth.authenticate(cookie), undefined);
});

test('AUTH-5 step-up guards export, delete and minting delegation credentials with a fresh email proof in the asking session', async () => {
  const mail = mailedIdentity(fixture.db), auth = testAuth(fixture.db), person = { id: owner, email: 'owner@orbit.test', auth }, session = await auth.createSession(owner, undefined, { proof: false });
  const cookie = `__Host-orbit_session=${session.token}`;
  const app = createApp({
    database: fixture.db, assets: { fetch: async () => new Response('asset') },
    authenticate: request => operatorFromRequest(request, identityBindings(fixture.db, request)),
    stepUp: (request, action, returnTo) => requireStepUp(request, mail.bindings, action, returnTo, { mailSender: mail.mailSender }),
  });
  const call = (path: string, init: { method?: string; body?: unknown; form?: Record<string, string> } = {}) => app.request(mail.origin + path, { method: init.method ?? 'POST', headers: { Origin: mail.origin, Cookie: cookie, 'CF-Connecting-IP': '192.0.2.10', ...(init.form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : { 'Content-Type': 'application/json' }) }, body: init.form ? new URLSearchParams(init.form) : JSON.stringify(init.body ?? {}) });
  const exportRefused = await call('/api/v1/records/archive/exports');
  assert.equal(exportRefused.status, 403);
  assert.equal((await exportRefused.json() as { code: string }).code, 'step_up_required');
  assert.equal((await call(`/api/v1/settings/operators/${createId()}/erase`, { body: { confirmed: true } })).status, 403, 'permanent erasure needs the proof');
  await fixture.db.prepare("INSERT INTO delegation_clients(id,redirect_uri,origin) VALUES('slate-step-up','https://slate.test/callback','https://slate.test')").run();
  const consent = { client_id: 'slate-step-up', redirect_uri: 'https://slate.test/callback', response_type: 'code', state: 'x'.repeat(16), code_challenge: 'x'.repeat(43), code_challenge_method: 'S256', account_id: 'workspace', scope: 'crm.evidence.read', targets: JSON.stringify([`opportunities/${opportunity}`]) };
  const minting = await call('/delegation/authorize', { form: consent });
  assert.equal(minting.status, 403);
  assert.match(await minting.text(), /sent a confirmation link/, 'no delegation credential is minted without the proof');
  assert.equal(await fixture.db.prepare("SELECT count(*) n FROM delegation_grants WHERE client_id='slate-step-up'").first('n'), 0);

  // The emailed confirmation completes only in the asking session and issues no new session.
  const link = mail.linkIn(mail.sent.find(message => message.to.includes(person.email)))!;
  const confirm = (with_: string) => identityResponse(mail.post('/auth/confirm', { cookie: with_, form: { token: new URL(link).searchParams.get('token')! } }), mail.bindings, owned);
  const other = await person.auth.createSession(person.id, undefined, { proof: false });
  assert.equal((await confirm(`__Host-orbit_session=${other.token}`))!.headers.get('set-cookie'), null);
  const confirmed = await confirm(cookie);
  assert.equal(confirmed!.status, 303);
  assert.equal(confirmed!.headers.get('set-cookie'), null);
  assert.equal((await call('/api/v1/records/archive/exports')).status, 201, 'the proven session may export');
  assert.equal((await call('/delegation/authorize', { form: { ...consent, state: 'y'.repeat(16) } })).status, 303, 'and mint the delegation credential');
});

test('AUTH-5 dev sessions and the credentials they mint count only behind the checkout key', async () => {
  const person = await operator('seller@dev.localhost'), app = testApp({ database: fixture.db, assets: { fetch: async () => new Response('asset') } });
  const session = await person.auth.createSession(person.id);
  await fixture.db.prepare("UPDATE identity_sessions SET kind='dev' WHERE session_id=?").bind(session.id).run();
  const ask = () => app.request('https://orbit.test/api/v2/access/class', { headers: { Cookie: `__Host-orbit_session=${session.token}` } });
  assert.equal((await ask()).status, 401, 'a deployed Worker registers no dev admission');
  const invited = await operator(), removed = await operator(), ownerSession = await person.auth.createSession(owner);
  await fixture.db.prepare("UPDATE operators SET status='removed' WHERE id=?").bind(removed.id).run();
  const listings = [
    ['/api/v1/settings', 'operators'],
    ['/api/v2/access/workspaces/workspace/administration', 'members'],
    ['/api/v1/settings/sending', 'users'],
    ['/api/v1/tasks', 'operators'],
    ['/api/v2/workspaces/workspace/forms/builder-options', 'operators'],
    ['/api/v2/workspaces/workspace/forecast', 'operators'],
    ['/api/v2/workspaces/workspace/operations/reports/suite', 'reps'],
  ] as const;
  async function listed(visible: boolean) {
    for (const [path, key] of listings) {
      const response = await app.request(`https://orbit.test${path}`, { headers: { Cookie: `__Host-orbit_session=${ownerSession.token}` } });
      assert.equal(response.status, 200, path);
      const rows = (await response.json() as Record<string, {id?: string;operator_id?:string}[]>)[key]!;
      assert.equal(rows.some(row => (row.id??row.operator_id) === person.id), visible, `${path}: local persona needs a real sign-in`);
      assert.ok(rows.some(row => (row.id??row.operator_id) === invited.id), `${path}: an ordinary invitation needs no prior sign-in`);
      if (path === '/api/v1/settings') assert.ok(rows.some(row => (row.id??row.operator_id) === removed.id), 'ordinary removed operators keep their history');
    }
  }
  await listed(false);
  registerDevAdmission(() => true);
  try {
    assert.equal((await ask()).status, 200, 'the local dev layer admits it behind the key');
    const native = await emailLinkSignIn(fixture.db, person.email);
    await listed(true);
    await person.auth.revoke(native.operator.sessionId);
    await listed(false);
    assert.equal((await ask()).status, 200, 'listing visibility does not change persona sign-in');
  }
  finally { registerDevAdmission(null); }

  await fixture.db.prepare("INSERT INTO delegation_clients(id,redirect_uri,origin) VALUES('dev-minted','https://slate.test/callback','https://slate.test')").run();
  const token = 'd'.repeat(64), hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))), b => b.toString(16).padStart(2, '0')).join('');
  const grant = createId();
  await fixture.db.batch([
    fixture.db.prepare("INSERT INTO delegation_grants(id,client_id,principal_id,account_id,scopes_json,targets_json,expires_at,token_hash) VALUES(?,?,?,?,?,?,?,?)").bind(grant, 'dev-minted', person.id, 'workspace', '["crm.evidence.read"]', '[]', new Date(Date.now() + 86_400_000).toISOString(), hash),
    fixture.db.prepare('INSERT INTO identity_dev_grants(grant_id) VALUES(?)').bind(grant),
  ]);
  assert.equal((await app.request('https://orbit.test/api/delegation/v1/identity', { headers: { Authorization: `Bearer ${token}` } })).status, 401);
});
