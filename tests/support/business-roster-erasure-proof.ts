import assert from 'node:assert/strict';
import {isolatedDatabase} from './isolated-database';
import {createDependencies} from './dependencies';
import {createApp} from './app';
import {identityResponse, operatorFromRequest} from '../../src/core/features/identity';
import {orbitBusinessSettings} from '../../src/core/features/agent-door';
import {SettingsRepository} from '../../src/core/features/settings/repository';

// Erasing a person who was invited through Business settings leaves nothing of them in the Business
// roster, and the Business's own next revision cannot bring them back. Everything goes through the
// public doors: signed settings, the owner's erase route, and the Business's later revisions.
export async function businessRosterErasureProof() {
  const fixture = await isolatedDatabase(), db = fixture.db;
  try {
    const origin = 'https://orbit.example.test', issuer = 'https://business.example.test', installation = 'orbit-roster-test';
    const keys = await crypto.subtle.generateKey({name: 'ECDSA', namedCurve: 'P-256'}, true, ['sign', 'verify']);
    const publicKey = await crypto.subtle.exportKey('jwk', keys.publicKey);
    const bindings = {DB: db, ASSETS: {fetch: async () => new Response('asset')} as Fetcher, AUTH_ORIGIN: origin,
      ORBIT_ENCRYPTION_KEY: '5c'.repeat(32), CAPTURE_MAIL_ADDRESS: ['synthetic-orbit', 'capture.example.test'].join('@'), OWNER_EMAIL: 'morgan@example.test',
      SESSION_SECRET: 's'.repeat(64), SETUP_TOKEN: 't'.repeat(64), RER_OWNER_CLAIM_ISSUER: issuer, RER_OWNER_CLAIM_INSTALLATION_ID: installation,
      RER_OWNER_CLAIM_APP_ORIGIN: origin, RER_OWNER_CLAIM_PUBLIC_KEYS: JSON.stringify({test: publicKey}),
      RER_BUSINESS_TRUST: JSON.stringify({v: 1, issuer, audience: origin, subject: installation, keys: {test: publicKey}})};
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const sign = async (typ: string, claims: object) => {
      const body = `${encode({alg: 'ES256', typ, kid: 'test'})}.${encode(claims)}`;
      return body + '.' + Buffer.from(await crypto.subtle.sign({name: 'ECDSA', hash: 'SHA-256'}, keys.privateKey, new TextEncoder().encode(body))).toString('base64url');
    };
    const post = (path: string, body: object) => new Request(origin + path, {method: 'POST',
      headers: {Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1'}, body: JSON.stringify(body)});
    const now = Math.floor(Date.now() / 1000);
    const claimed = await identityResponse(post('/auth/owner-claim', {token: await sign('rer-owner-claim+jwt', {v: 1, iss: issuer, aud: origin,
      installationId: installation, email: bindings.OWNER_EMAIL, jti: crypto.randomUUID(), iat: now, exp: now + 300}), displayName: 'Morgan Lee', returnTo: '/setup'}),
    bindings, {ownerClaimed: async () => Boolean(await db.prepare('SELECT 1 FROM owner_bootstrap').first())});
    assert.equal(claimed!.status, 303);
    const owner = (await operatorFromRequest(new Request(origin + '/app', {headers: {Cookie: claimed!.headers.get('set-cookie')!.split(';')[0]!}}), bindings))!;
    const settings = orbitBusinessSettings(bindings), repository = new SettingsRepository(db);
    let rev = 0;
    const revise = async (team: object[], values: Record<string, string> = {display_name: 'Roster Company'}) => {
      const response = await settings.handle(post('/api/rer/business-settings', {settings: await sign('rer-business-settings+jwt', {v: 1, iss: issuer, aud: origin, sub: installation,
        business: 'roster-company', email: bindings.OWNER_EMAIL, jti: crypto.randomUUID(), iat: now, exp: now + 300, rev: ++rev, values, logo: null, team, owner_id: 'business-owner'})}));
      return {status: response!.status, body: await response!.json() as any};
    };
    const member = (id: string, email: string, name: string) => ({id, email, name, role: 'admin', invite: 0});
    const people = [['alex', 'alex.canary@example.test', 'Alexandra Canary'], ['sam', 'sam.keeper@example.test', 'Samuel Keeper'], ['casey', 'casey.older@example.test', 'Casey Olderrelease']]
      .map(([id, email, name]) => ({business: 'business-' + id, email: email!, name: name!}));
    const [alex, sam, casey] = people as [typeof people[number], typeof people[number], typeof people[number]];
    const invited = new Map<string, string>();
    for (const person of people) invited.set(person.business, (await repository.invite(person.email, person.name, owner.operatorId)).id);
    assert.equal((await revise([])).status, 200);
    assert.equal((await revise(people.map(person => member(person.business, person.email, person.name)))).status, 200);
    assert.equal((await db.prepare('SELECT count(*) n FROM bs_team').first<number>('n')), 3);

    const deps = createDependencies(db), session = await deps.auth.createSession(owner.operatorId);
    const app = createApp({database: db, assets: {fetch: async () => new Response('')}});
    const erase = (id: string) => app.request(`https://orbit.test/api/v1/settings/operators/${id}/erase`, {method: 'POST',
      headers: {cookie: `__Host-orbit_session=${session.token}`, origin: 'https://orbit.test', 'content-type': 'application/json'}, body: JSON.stringify({confirmed: true})});
    const retire = async (id: string) => {
      await repository.remove(id, owner.operatorId, undefined, owner.sessionId);
      return erase(id);
    };

    // (a) Alex is erased through the owner's route: no trace in the roster, and the audit event keeps its shape.
    const alexId = invited.get(alex.business)!;
    assert.equal((await retire(alexId)).status, 200);
    const trace = async (person: typeof alex, operatorId: string) => {
      const rows = JSON.stringify([(await db.prepare('SELECT * FROM bs_team').all()).results, (await db.prepare('SELECT document FROM bs_settings').all()).results,
        (await db.prepare('SELECT * FROM bs_overrides').all()).results, (await db.prepare('SELECT * FROM bs_audit').all()).results, (await db.prepare('SELECT * FROM bs_retired').all()).results]);
      return [person.name, person.email, operatorId, person.business].filter(value => rows.includes(value));
    };
    assert.deepEqual(await trace(alex, alexId), [], 'the roster keeps no name, email, operator id or Business id of the erased person');
    const event = await db.prepare("SELECT actor_id,details_json FROM audit_entries WHERE action='operator.erased' AND entity_id=?").bind(alexId).first<{actor_id: string; details_json: string}>();
    assert.equal(event!.actor_id, owner.operatorId);
    assert.equal(event!.details_json, '{}', 'the erasure audit event carries no personal data');

    // (d) The other person's entry and everything else is intact, and the Business's next revision still applies.
    assert.equal(await db.prepare('SELECT operator_id FROM bs_team WHERE business_id=?').bind(sam.business).first<string>('operator_id'), invited.get(sam.business));
    const next = await revise(people.filter(person => person !== alex).map(person => member(person.business, person.email, person.name)), {display_name: 'Still Verified'});
    assert.equal(next.status, 200); assert.equal(next.body.retired, undefined);
    assert.deepEqual((await db.prepare('SELECT business_id FROM bs_team ORDER BY business_id').all()).results.map((row: any) => row.business_id), [casey.business, sam.business]);

    // (c) The Business still lists Alex: they apply as retired, with no row, no operator change and no stored copy.
    const operators = await db.prepare('SELECT count(*) n FROM operators').first<number>('n');
    const relisted = await revise(people.map(person => member(person.business, person.email, person.name)), {display_name: 'Relisted'});
    assert.equal(relisted.status, 200); assert.deepEqual(relisted.body.retired, [alex.email]);
    assert.equal(await db.prepare('SELECT count(*) n FROM operators').first<number>('n'), operators);
    assert.deepEqual(await trace(alex, alexId), []);

    // (b) A person erased by the previous release keeps a stored roster row; the next revision retires them.
    const caseyId = invited.get(casey.business)!;
    await repository.remove(caseyId, owner.operatorId, undefined, owner.sessionId);
    await db.prepare("UPDATE operators SET email=?,display_name='Erased operator' WHERE id=?").bind(`erased-${caseyId.toLowerCase()}@example.invalid`, caseyId).run();
    assert.ok((await db.prepare('SELECT 1 FROM bs_team WHERE business_id=?').bind(casey.business).first()), 'the older erasure left the roster row');
    const swept = await revise(people.map(person => member(person.business, person.email, person.name)), {display_name: 'Swept'});
    assert.equal(swept.status, 200); assert.deepEqual([...swept.body.retired].sort(), [alex.email, casey.email].sort());
    assert.deepEqual(await trace(casey, caseyId), []);
    assert.deepEqual((await db.prepare('SELECT business_id FROM bs_team').all()).results.map((row: any) => row.business_id), [sam.business]);
  } finally { await fixture.close(); }
}
