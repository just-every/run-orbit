import assert from 'node:assert/strict';
import {isolatedDatabase} from './isolated-database';
import {createDependencies} from './dependencies';
import {createApp} from './app';
import {identityResponse, operatorFromRequest} from '../../src/core/features/identity';
import {orbitAgentDoor, orbitBusinessSettings} from '../../src/core/features/agent-door';
import {heldPolicy, policyEnvelope} from '../../src/base/modules/agent-door/conformance/crypto.mjs';
import {SettingsRepository} from '../../src/core/features/settings/repository';

// Erasing a person who was invited through Business settings leaves nothing of them in the Business
// roster, and the Business's own next revision cannot bring them back. Everything goes through the
// public doors: signed settings, the owner's erase route, and the Business's later revisions. The same
// journey proves the agent door forgets them too: agents that two teammates sponsor create contacts the owner
// approves; erasing a contact and then a sponsor leaves no name, address or value in any table, and
// a neighbour whose address differs only by a prefix (al@ and sal@) keeps every record byte for byte.
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
    const app = createApp({database: db, assets: {fetch: async () => new Response('')}, agentErasureSecret: bindings.SESSION_SECRET});
    const erase = (id: string) => app.request(`https://orbit.test/api/v1/settings/operators/${id}/erase`, {method: 'POST',
      headers: {cookie: `__Host-orbit_session=${session.token}`, origin: 'https://orbit.test', 'content-type': 'application/json'}, body: JSON.stringify({confirmed: true})});
    const retire = async (id: string) => {
      await repository.remove(id, owner.operatorId, undefined, owner.sessionId);
      return erase(id);
    };

    // Agent work first. Alex's agent creates Al and Zed, Sam's agent creates Sal; every create is held for the owner.
    const door = orbitAgentDoor(bindings), ownerCookie = claimed!.headers.get('set-cookie')!.split(';')[0]!;
    const held = {...heldPolicy(), rules: [{id: 'all', class: '*', do: 'approval', approver: ['person:business-owner'], wait: 'PT1H'}, {id: 'standard', class: 'standard', do: 'autonomous', agent: 'business-feed'}]};
    const adopted = await door.handle(post('/api/rer/agent-policy', {policy: (await policyEnvelope({origin, business: 'roster-company', seq: 0, revision: 0,
      signer: {privateKey: keys.privateKey, kid: 'test', issuer, installationId: installation}}, held)).policy}));
    assert.equal(adopted!.status, 200);
    const approval = (id: string, action?: string, body?: object) => door.handle(new Request(origin + '/agents/api/approvals/' + id + (action ? '/' + action : ''),
      {method: action ? 'POST' : 'GET', headers: {Cookie: ownerCookie, Origin: origin, 'Content-Type': 'application/json'}, ...(body ? {body: JSON.stringify(body)} : {})}));
    const agentContact = async (sponsor: string, agent: string, record: {name: string; email: string}) => {
      const pending = await door.invoke('orbit.records.create', {kind: 'contact', record, idempotency_key: 'create-' + agent},
        {person: {id: sponsor}, agent: {id: agent, name: agent}, scopes: ['records:read', 'records:write'], consent: 'consent-' + agent});
      assert.equal(pending.outcome, 'pending');
      const saved = (await (await approval(pending.approval!.id))!.json() as any).approval;
      assert.equal((await approval(pending.approval!.id, 'approve', {revision: saved.revision, summary_sha256: saved.summary_sha256}))!.status, 200);
      return db.prepare('SELECT id FROM contacts WHERE email=?').bind(record.email).first<string>('id');
    };
    const al = {name: 'Al Brandt', email: 'al@example.com'}, sal = {name: 'Sal Brandt', email: 'sal@example.com'}, zed = {name: 'Zed Carter', email: 'zed@example.com'};
    const alId = (await agentContact(invited.get(alex.business)!, 'alex-al-agent', al))!, salId = (await agentContact(invited.get(sam.business)!, 'sam-sal-agent', sal))!;
    const zedId = (await agentContact(invited.get(alex.business)!, 'alex-zed-agent', zed))!;
    // Every agent_door row that names an agent or one of its decisions, as stored, to compare byte for byte.
    const agentRecords = async (agent: string) => {
      const decisions = (await db.prepare('SELECT decision_id FROM agent_door_calls WHERE agent=?').bind(agent).all<{decision_id: string}>()).results.map(row => row.decision_id);
      const tables = (await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name GLOB 'agent_door_*' AND name NOT IN ('agent_door_state','agent_door_relay','agent_door_retired_refs','agent_door_replay_aliases') ORDER BY name").all<{name: string}>()).results;
      const rows = [];
      for (const {name} of tables) for (const row of (await db.prepare(`SELECT * FROM ${name}`).all()).results) {
        const text = JSON.stringify(row);
        if (text.includes(agent) || decisions.some(id => text.includes(id))) rows.push([name, text]);
      }
      return rows;
    };
    // The whole database, every table, for a value as a whole token (al@example.com is not a hit inside sal@example.com).
    const tablesHolding = async (...values: Array<string | RegExp>) => {
      const hits = new Set<string>();
      for (const {name} of (await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT GLOB 'sqlite_*' AND name NOT GLOB '_cf_*' ORDER BY name").all<{name: string}>()).results)
        for (const row of (await db.prepare(`SELECT * FROM "${name}"`).all()).results) {
          const text = JSON.stringify(row);
          for (const value of values) if (typeof value === 'string' ? text.includes(value) : value.test(text)) hits.add(name + ' ~ ' + String(value));
        }
      return [...hits].sort();
    };
    // An agent that follows the change feed through the Business door holds a cursor (an event id) and reads on from it.
    const feedCall = async (after?: string, padding = 0) => {
      const issued = Math.floor(Date.now() / 1000);
      const bearer = await sign('at+jwt', {iss: issuer, aud: origin + '/mcp', sub: 'business-owner', email: bindings.OWNER_EMAIL, act: {sub: 'business-feed', name: 'Feed'}, client_id: 'business-client',
        business: 'roster-company', scope: 'events:read records:read', consent: 'roster-feed-consent', jti: crypto.randomUUID(), iat: issued, exp: issued + 300});
      return door.handle(new Request(origin + '/mcp', {method: 'POST', headers: {Authorization: 'Bearer ' + bearer, 'Content-Type': 'application/json',
        'MCP-Protocol-Version': '2026-07-28', 'MCP-Method': 'tools/call', 'MCP-Name': 'orbit.events.list'},
      body: JSON.stringify({jsonrpc: '2.0', id: 9, method: 'tools/call', params: {name: 'orbit.events.list', arguments: {...(after ? {after} : {}), limit: 200}, _meta: {'io.modelcontextprotocol/protocolVersion': '2026-07-28'}}}) + ' '.repeat(padding)}));
    };
    const feed = async (after?: string) => {
      const response = await feedCall(after);
      assert.equal(response!.status, 200, await response!.clone().text());
      const result = (await response!.json() as any).result.structuredContent as {events: Array<{id: string; uri: string}>; cursor: string | null};
      return {...result, records: result.events.filter(event => /:contact:/.test(event.id)).map(event => event.uri)};
    };
    const beforeAl = await feed(), alEvent = beforeAl.events.find(event => event.id.endsWith(':contact:' + alId))!;
    const salEvent = beforeAl.events.find(event => event.id.endsWith(':contact:' + salId))!, zedEvent = beforeAl.events.find(event => event.id.endsWith(':contact:' + zedId))!;
    assert.ok(alEvent && salEvent && zedEvent, 'the feed carries the native event of each contact ');
    const before = beforeAl.events[beforeAl.events.indexOf(alEvent) - 1], cursors = {before: before!.id, at: alEvent.id, after: salEvent.id};
    assert.ok(before, 'something precedes the erased contact\'s event');
    const [salBefore, samAgentBefore] = [await agentRecords('sam-sal-agent'), await db.prepare("SELECT * FROM agent_door_agents WHERE id='sam-sal-agent'").first()];
    const zedBefore = await db.prepare('SELECT * FROM contacts WHERE email=?').bind(zed.email).first();
    assert.ok(salBefore.length >= 6, 'the neighbour left calls, audit, approvals, events and usage');

    // (e) Al the contact is erased through the records route: nothing the agent door kept about them remains.
    const alValues = [/(?<![A-Za-z0-9_@.+-])al@example\.com/, /\bAl Brandt\b/, alId];
    assert.ok((await tablesHolding(...alValues)).some(hit => hit.startsWith('agent_door_')), 'before: the agent door holds the contact');
    const erasedContact = await app.request(`https://orbit.test/api/v1/records/contact/${alId}`, {method: 'DELETE',
      headers: {cookie: `__Host-orbit_session=${session.token}`, origin: 'https://orbit.test', 'content-type': 'application/json'}, body: JSON.stringify({confirmed: true})});
    assert.equal(erasedContact.status, 200); assert.deepEqual(await erasedContact.json(), {deleted: true});
    assert.deepEqual(await tablesHolding(...alValues), [], 'no table keeps the erased contact\'s name, address or id');
    assert.deepEqual(await agentRecords('sam-sal-agent'), salBefore, 'the neighbour sal@example.com keeps every agent record byte for byte');
    assert.deepEqual(await db.prepare("SELECT * FROM agent_door_agents WHERE id='sam-sal-agent'").first(), samAgentBefore);
    assert.deepEqual(await db.prepare('SELECT * FROM contacts WHERE email=?').bind(zed.email).first(), zedBefore);
    const replayed = await door.invoke('orbit.records.create', {kind: 'contact', record: al, idempotency_key: 'create-alex-al-agent'},
      {person: {id: invited.get(alex.business)!}, agent: {id: 'alex-al-agent', name: 'alex-al-agent'}, scopes: ['records:read', 'records:write'], consent: 'consent-alex-al-agent'});
    assert.equal(replayed.code, 'subject_erased', 'a retried call for the erased contact never creates them again');
    assert.equal(await db.prepare('SELECT count(*) n FROM contacts WHERE email=?').bind(al.email).first<number>('n'), 0);

    // The change feed after the contact is gone: a cursor at the erased contact's event, before it and after it
    // each keep delivering what follows, in order, with no replay and nothing skipped (the erased event itself is
    // redacted and so never delivered, as for any redacted row).
    const mia = {name: 'Mia Novak', email: 'mia@example.com'};
    const miaId = (await agentContact(invited.get(sam.business)!, 'sam-mia-agent', mia))!;
    const nativeContacts = (uris: string[]) => uris.filter(uri => uri.startsWith('orbit://records/contact/'));
    const zedUri = zedEvent.uri, miaUri = 'orbit://records/contact/' + miaId, salUri = salEvent.uri;
    for (const [where, cursor, expected] of [['at the erased contact\'s event', cursors.at, [salUri, zedUri, miaUri]], ['before it', cursors.before, [salUri, zedUri, miaUri]],
      ['after it', cursors.after, [zedUri, miaUri]]] as const) {
      const next = await feed(cursor);
      console.log(JSON.stringify({proof: 'orbit.events.cursor-across-contact-erasure', cursor: where, events: next.events.length, cursorAdvanced: next.cursor !== cursor}));
      assert.deepEqual(nativeContacts(next.records), expected, 'a feed cursor ' + where + ' keeps delivering the following events in order');
      assert.ok(next.cursor && next.cursor !== cursor && next.events.at(-1)!.id === next.cursor, 'the cursor ' + where + ' advances to the last delivered event');
      const again = await feed(next.cursor);
      assert.deepEqual([again.events.length, again.cursor], [0, next.cursor], 'reading on from the new cursor replays nothing');
    }
    const embedded = await door.invoke('orbit.events.list', {after: cursors.at, limit: 200}, {person: {id: owner.operatorId}, agent: {id: 'business-feed', name: 'Feed'}, scopes: ['events:read', 'records:read'], consent: 'embedded-feed'});
    assert.deepEqual(nativeContacts((embedded.result as {events: Array<{uri: string}>}).events.map(event => event.uri)), [salUri, zedUri, miaUri], 'the embedded door resolves the same cursor');
    const oversized = await feedCall(cursors.at, 1048577);
    assert.equal(oversized!.status, 413, 'a body over the door\'s limit is still refused, not read to the end');
    assert.deepEqual((await tablesHolding(...alValues)), [], 'following the feed from the erased contact\'s cursor writes no trace of the contact');

    // (a) Alex is erased through the owner's route: no trace in the roster, and the audit event keeps its shape.
    const alexId = invited.get(alex.business)!;
    const alexValues = [alex.name, alex.email];
    assert.ok((await tablesHolding(...alexValues)).some(hit => hit.startsWith('agent_door_')), 'before: the agent door holds the sponsor\'s name');
    const erased = await retire(alexId);
    assert.equal(erased.status, 200); assert.deepEqual(await erased.json(), {erased: true});
    const trace = async (person: typeof alex, operatorId: string) => {
      const rows = JSON.stringify([(await db.prepare('SELECT * FROM bs_team').all()).results, (await db.prepare('SELECT document FROM bs_settings').all()).results,
        (await db.prepare('SELECT * FROM bs_overrides').all()).results, (await db.prepare('SELECT * FROM bs_audit').all()).results, (await db.prepare('SELECT * FROM bs_retired').all()).results]);
      return [person.name, person.email, operatorId, person.business].filter(value => rows.includes(value));
    };
    assert.deepEqual(await trace(alex, alexId), [], 'the roster keeps no name, email, operator id or Business id of the erased person');
    const event = await db.prepare("SELECT actor_id,details_json FROM audit_entries WHERE action='operator.erased' AND entity_id=?").bind(alexId).first<{actor_id: string; details_json: string}>();
    assert.equal(event!.actor_id, owner.operatorId);
    assert.equal(event!.details_json, '{}', 'the erasure audit event carries no personal data');
    // The agent door forgets Alex too: their agents, decisions, approvals and events keep no name, address or id.
    assert.deepEqual(await tablesHolding(...alexValues), [], 'no table keeps the erased operator\'s name or address');
    assert.deepEqual((await tablesHolding(alexId)).filter(hit => hit.startsWith('agent_door_')), [], 'the agent door keeps no trace of the erased operator\'s id');
    assert.deepEqual(await agentRecords('sam-sal-agent'), salBefore, 'a teammate\'s agent records are byte for byte what they were');
    const tombstones = (await db.prepare("SELECT tombstone FROM agent_door_agents WHERE id IN ('alex-al-agent','alex-zed-agent')").all<{tombstone: string}>()).results.map(row => JSON.parse(row.tombstone).erasure_id);
    const erasureEntry = await db.prepare("SELECT id FROM audit_entries WHERE action='operator.erased' AND entity_id=?").bind(alexId).first<string>('id');
    assert.deepEqual(tombstones, [erasureEntry, erasureEntry], 'a retirement marker ties back to its erasure audit entry');

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
