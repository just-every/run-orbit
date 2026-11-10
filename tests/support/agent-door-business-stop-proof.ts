import assert from 'node:assert/strict';
import {isolatedDatabase} from './isolated-database';
import {identityResponse, operatorFromRequest} from '../../src/core/features/identity';
import {orbitAgentDoor, orbitBusinessSettings} from '../../src/core/features/agent-door';
import {heldPolicy, policyEnvelope} from '../../src/base/modules/agent-door/conformance/crypto.mjs';

/**
 * A Business that stops or detaches ends its relay, its held approvals and every
 * approval an older door saved without a principal source. A running Business keeps
 * all three, and an old Business's approval never enters a newly paired Business's feed.
 */
export async function agentDoorBusinessStopProof() {
  const fixture = await isolatedDatabase();
  try {
    const origin = 'https://orbit.example.test', issuer = 'https://business.example.test', installation = 'orbit-stop-test';
    const keys = await crypto.subtle.generateKey({name: 'ECDSA', namedCurve: 'P-256'}, true, ['sign', 'verify']);
    const publicKey = await crypto.subtle.exportKey('jwk', keys.publicKey);
    const bindings = {DB: fixture.db, ASSETS: {fetch: async () => new Response('asset')} as Fetcher, AUTH_ORIGIN: origin,
      ORBIT_ENCRYPTION_KEY: '5c'.repeat(32), CAPTURE_MAIL_ADDRESS: ['synthetic-orbit', 'capture.example.test'].join('@'), OWNER_EMAIL: 'morgan@example.test',
      SESSION_SECRET: 's'.repeat(64), SETUP_TOKEN: 't'.repeat(64), RER_OWNER_CLAIM_ISSUER: issuer, RER_OWNER_CLAIM_INSTALLATION_ID: installation,
      RER_OWNER_CLAIM_APP_ORIGIN: origin, RER_OWNER_CLAIM_PUBLIC_KEYS: JSON.stringify({test: publicKey}),
      RER_BUSINESS_TRUST: JSON.stringify({v: 1, issuer, audience: origin, subject: installation, keys: {test: publicKey}})};
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const sign = async (typ: string, claims: object) => {
      const body = `${encode({alg: 'ES256', typ, kid: 'test'})}.${encode(claims)}`;
      return body + '.' + Buffer.from(await crypto.subtle.sign({name: 'ECDSA', hash: 'SHA-256'}, keys.privateKey, new TextEncoder().encode(body))).toString('base64url');
    };
    const post = (path: string, body: object, headers: Record<string, string> = {}) => new Request(origin + path, {method: 'POST',
      headers: {Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1', ...headers}, body: JSON.stringify(body)});
    const now = Math.floor(Date.now() / 1000);
    const ownerOptions = {ownerClaimed: async () => Boolean(await fixture.db.prepare('SELECT 1 FROM owner_bootstrap').first())};
    const claimed = await identityResponse(post('/auth/owner-claim', {token: await sign('rer-owner-claim+jwt', {v: 1, iss: issuer, aud: origin,
      installationId: installation, email: bindings.OWNER_EMAIL, jti: crypto.randomUUID(), iat: now, exp: now + 300}), displayName: 'Morgan Lee', returnTo: '/setup'}), bindings, ownerOptions);
    assert.equal(claimed!.status, 303);
    const cookie = claimed!.headers.get('set-cookie')!.split(';')[0]!;
    assert.ok(await operatorFromRequest(new Request(origin + '/app', {headers: {Cookie: cookie}}), bindings));
    const settings = orbitBusinessSettings(bindings), door = orbitAgentDoor(bindings);
    const business = 'stop-company';
    const pairing = {v: 1, iss: issuer, aud: origin, sub: installation, business, email: bindings.OWNER_EMAIL, jti: crypto.randomUUID(), iat: now, exp: now + 300,
      rev: 1, values: {display_name: 'Stop Company'}, logo: null, team: [], owner_id: 'business-owner'};
    const applySettings = async (document: object) => settings.handle(post('/api/rer/business-settings', {settings: await sign('rer-business-settings+jwt', document)}));
    assert.equal((await applySettings(pairing))!.status, 200);
    // Every call is held for the owner as sponsor: a stop keeps sponsor refs, so the held call itself must refuse.
    const policy = heldPolicy();
    policy.rules = [{id: 'all', class: '*', do: 'approval', approver: ['sponsor'], wait: 'PT1H'}] as typeof policy.rules;
    const adopted = await policyEnvelope({origin, business, seq: 0, revision: 0, signer: {privateKey: keys.privateKey, kid: 'test', issuer, installationId: installation}}, policy);
    assert.equal((await door.handle(post('/api/rer/agent-policy', {policy: adopted.policy})))!.status, 200);

    const mcp = async (name: string, args: Record<string, unknown>, business: string) => {
      const issued = Math.floor(Date.now() / 1000);
      const bearer = await sign('at+jwt', {iss: issuer, aud: origin + '/mcp', sub: 'business-owner', email: bindings.OWNER_EMAIL, act: {sub: 'stop-agent', name: 'Stop agent'},
        client_id: 'stop-client', business, scope: 'records:read records:write', consent: 'stop-consent', jti: crypto.randomUUID(), iat: issued, exp: issued + 300});
      const response = await door.handle(new Request(origin + '/mcp', {method: 'POST', headers: {Authorization: 'Bearer ' + bearer, 'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream', 'MCP-Protocol-Version': '2026-07-28', 'MCP-Method': 'tools/call', 'MCP-Name': name},
      body: JSON.stringify({jsonrpc: '2.0', id: crypto.randomUUID(), method: 'tools/call', params: {name, arguments: args, _meta: {'io.modelcontextprotocol/protocolVersion': '2026-07-28'}}})}));
      return {status: response!.status, body: await response!.json() as any};
    };
    const hold = async (name: string) => {
      const held = await mcp('orbit.records.create', {kind: 'company', record: {name}, idempotency_key: 'stop-' + crypto.randomUUID()}, business);
      const id = held.body.result?._meta?.['com.runeditrun/approval']?.id as string | undefined;
      assert.ok(id, 'a running Business holds the call for approval: ' + JSON.stringify(held.body));
      const request = (action = '', body?: object) => new Request(origin + '/agents/api/approvals/' + id + action, {method: action ? 'POST' : 'GET',
        headers: {Cookie: cookie, Origin: origin, 'Content-Type': 'application/json'}, ...(body ? {body: JSON.stringify(body)} : {})});
      const review = (await (await door.handle(request()))!.json() as any).approval;
      return {id, name, approve: async () => {
        const response = await door.handle(request('/approve', {revision: review.revision, summary_sha256: review.summary_sha256}));
        const body = await response!.json() as any;
        return {status: response!.status, approval: body.approval ?? body};
      }};
    };
    const created = async (name: string) => Number(await fixture.db.prepare('SELECT count(*) n FROM companies WHERE name=?').bind(name).first('n'));
    const pull = async (feedBusiness: string, after = 0) => {
      const issued = Math.floor(Date.now() / 1000);
      return door.handle(post('/api/rer/agent-decisions', {pull: await sign('rer-agent-decisions+jwt', {v: 1, iss: issuer, aud: origin, sub: installation,
        business: feedBusiness, after, limit: 200, iat: issued, exp: issued + 60, jti: crypto.randomUUID()})}));
    };
    const feedIds = async (feedBusiness: string) => {
      const response = await pull(feedBusiness);
      assert.equal(response!.status, 200);
      return ((await response!.json() as any).decisions as Array<{id: string; execution_of: string | null}>);
    };

    // A running Business: its approval executes and its relay answers.
    const running = await hold('Running Business Co');
    const executed = await running.approve();
    assert.equal(executed.status, 200, JSON.stringify(executed.approval)); assert.equal(executed.approval.state, 'executed');
    assert.equal(await created(running.name), 1);
    assert.ok((await feedIds(business)).length > 0, 'a running Business pulls its relay decisions');

    // An old Business's approval never enters a newly paired Business's feed.
    const old = await hold('Old Business Co');
    const oldFeed = (await feedIds(business)).map(row => row.id);
    await fixture.db.prepare("UPDATE agent_door_state SET envelope=json_set(envelope,'$.business','next-company') WHERE id=1").run();
    const crossed = await old.approve();
    assert.equal(crossed.status, 200);
    const nextFeed = await feedIds('next-company');
    assert.deepEqual(nextFeed.filter(row => oldFeed.includes(row.id) || row.execution_of !== null), [], 'a newly paired Business sees no decision of the old one');
    await fixture.db.prepare("UPDATE agent_door_state SET envelope=json_set(envelope,'$.business',?) WHERE id=1").bind(business).run();

    // An approval an older door saved carries no principal source; a newer one is tagged.
    const legacy = await hold('Legacy Business Co'), tagged = await hold('Tagged Business Co');
    assert.equal(await fixture.db.prepare("SELECT json_extract(saved,'$.principal.source') FROM agent_door_approvals WHERE id=?").bind(tagged.id).first<string>("json_extract(saved,'$.principal.source')"), 'business');
    await fixture.db.prepare("UPDATE agent_door_approvals SET saved=json_remove(saved,'$.principal.source') WHERE id=?").bind(legacy.id).run();
    assert.equal(await fixture.db.prepare("SELECT json_type(saved,'$.principal.source') t FROM agent_door_approvals WHERE id=?").bind(legacy.id).first('t'), null);

    // Detach: the relay answers nothing and neither held approval executes.
    const detached = await applySettings({...pairing, jti: crypto.randomUUID(), rev: 2, detached: true});
    assert.equal(detached!.status, 200, await detached!.clone().text());
    const stopped = await pull(business);
    assert.equal(stopped!.status, 404); assert.equal(await stopped!.text(), '');
    for (const held of [legacy, tagged]) {
      const refused = await held.approve();
      assert.equal(refused.status, 200, JSON.stringify(refused.approval)); assert.equal(refused.approval.state, 'refused'); assert.equal(refused.approval.code, 'sponsor_unavailable');
      assert.equal(await created(held.name), 0, 'a refused approval has no native effect');
    }
    assert.equal((await mcp('orbit.records.create', {kind: 'company', record: {name: 'Late Co'}, idempotency_key: 'stop-late'}, business)).status, 401);
    assert.equal(await created('Late Co'), 0);
  } finally { await fixture.dispose(); }
}
