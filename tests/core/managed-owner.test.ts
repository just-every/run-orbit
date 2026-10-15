import assert from 'node:assert/strict';
import {test} from 'node:test';
import {isolatedDatabase} from '../support/isolated-database';
import {identityResponse, operatorFromRequest} from '../../src/core/features/identity';

test('Managed owner claim verifies RER authority and creates the native owner/session exactly once', async () => {
  const fixture = await isolatedDatabase();
  try {
    const origin = 'https://orbit.example.test', issuer = 'https://rer.example.test';
    const keys = await crypto.subtle.generateKey({name: 'ECDSA', namedCurve: 'P-256'}, true, ['sign', 'verify']);
    const publicKey = await crypto.subtle.exportKey('jwk', keys.publicKey);
    const bindings = {DB: fixture.db, ASSETS: {fetch: async () => new Response('asset')} as Fetcher,
      AUTH_ORIGIN: origin, OWNER_EMAIL: 'owner@example.test', SESSION_SECRET: 's'.repeat(64), SETUP_TOKEN: 't'.repeat(64),
      RER_OWNER_CLAIM_ISSUER: issuer, RER_OWNER_CLAIM_INSTALLATION_ID: 'orbit-managed',
      RER_OWNER_CLAIM_APP_ORIGIN: origin, RER_OWNER_CLAIM_PUBLIC_KEYS: JSON.stringify({test: publicKey})};
    const options = {ownerClaimed: async () => Boolean(await fixture.db.prepare('SELECT 1 FROM owner_bootstrap').first())};
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const signed = async (overrides = {}) => {
      const now = Math.floor(Date.now() / 1000);
      const body = `${encode({alg: 'ES256', typ: 'rer-owner-claim+jwt', kid: 'test'})}.${encode({v: 1, iss: issuer, aud: origin, installationId: 'orbit-managed', email: bindings.OWNER_EMAIL, jti: crypto.randomUUID(), iat: now, exp: now + 300, ...overrides})}`;
      return body + '.' + Buffer.from(await crypto.subtle.sign({name: 'ECDSA', hash: 'SHA-256'}, keys.privateKey, new TextEncoder().encode(body))).toString('base64url');
    };
    const post = (token: string, from = origin) => identityResponse(new Request(origin + '/auth/owner-claim', {
      method: 'POST', headers: {Origin: from, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1'},
      body: JSON.stringify({token, displayName: 'Morgan Lee', returnTo: '/setup'}),
    }), bindings, options);
    const page = await identityResponse(new Request(origin + '/auth/owner-claim'), bindings, options);
    assert.equal(page!.status, 200);
    assert.equal(page!.headers.get('set-cookie'), null, 'confirmation GET is inert');
    assert.equal((await post(await signed(), issuer))!.status, 403, 'foreign POST cannot claim');
    assert.equal((await post(await signed({email: 'other@example.test'})))!.status, 403);
    assert.equal((await post(await signed({exp: Math.floor(Date.now() / 1000) - 1})))!.status, 403);
    assert.equal(await fixture.db.prepare('SELECT count(*) n FROM owner_bootstrap').first('n'), 0);
    const token = await signed(), responses = await Promise.all([post(token), post(token)]);
    assert.deepEqual(responses.map(response => response!.status).sort(), [303, 409]);
    const claimed = responses.find(response => response!.status === 303)!;
    assert.equal(claimed!.headers.get('location'), '/setup');
    const cookie = claimed!.headers.get('set-cookie')!.split(';')[0]!;
    const owner = await operatorFromRequest(new Request(origin + '/app', {headers: {Cookie: cookie}}), bindings);
    assert.equal(owner?.email, bindings.OWNER_EMAIL);
    assert.equal(await fixture.db.prepare('SELECT count(*) n FROM operators WHERE setup_owner=1').first('n'), 1);
    const direct = await identityResponse(new Request(origin + '/auth/bootstrap', {
      method: 'POST', headers: {Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1'},
      body: JSON.stringify({token: bindings.SETUP_TOKEN, displayName: 'Replacement', returnTo: '/setup'}),
    }), bindings, options);
    assert.equal(direct!.status, 409);
    assert.equal((await direct!.json() as {error: string}).error, 'already_initialized');
  } finally { await fixture.dispose(); }
});
