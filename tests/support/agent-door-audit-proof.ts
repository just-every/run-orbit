import assert from 'node:assert/strict';
import {identityResponse, operatorFromRequest} from '../../src/core/features/identity';
import {orbitAgentDoor} from '../../src/core/features/agent-door';
import type {PlatformBindings} from '../../src/core/platform/assets';
import type {AuditRow} from '../../src/base/modules/agent-door/audit';

/** Revoking an admitted Business agent withdraws authority without deleting history. */
export async function agentAuditRetentionProof(input: {
  bindings: PlatformBindings; cookie: string; companyId: string; issuer: string;
  sponsor: {id: string; name: string};
  sign: (type: string, claims: object) => Promise<string>;
  setPolicy: (mode: 'autonomous' | 'held') => Promise<void>;
}) {
  const {bindings, companyId, issuer, sponsor, sign, setPolicy} = input;
  const origin = bindings.AUTH_ORIGIN!;
  let cookie = input.cookie;
  const post = (path: string, body: object, session?: string) => new Request(origin + path, {
    method: 'POST', headers: {Origin: origin, 'Content-Type': 'application/json',
      'CF-Connecting-IP': '192.0.2.1', ...(session ? {Cookie: session} : {})},
    body: JSON.stringify(body),
  });
  const nativeState = async () => Promise.all(['companies', 'timeline_entries'].map(async table =>
    (await bindings.DB.prepare('SELECT * FROM ' + table).all()).results));
  for (const mode of ['autonomous', 'held'] as const) {
    await setPolicy(mode);
    const agent = {id: 'synthetic-orbit-audit-' + mode, name: 'Audit ' + mode, specialist: 'sales rep'};
    const issued = Math.floor(Date.now() / 1000);
    const bearer = await sign('at+jwt', {iss: issuer, aud: origin + '/mcp',
      sub: 'business-owner', email: bindings.OWNER_EMAIL, act: {sub: agent.id, name: agent.name, specialist: agent.specialist},
      client_id: 'synthetic-orbit-audit-client', business: 'door-company', scope: 'records:read records:write',
      consent: 'synthetic-orbit-audit-consent', jti: crypto.randomUUID(), iat: issued, exp: issued + 300});
    const call = async (name: string, args: object) => {
      const response = await orbitAgentDoor(bindings).handle(new Request(origin + '/mcp', {
        method: 'POST', headers: {Authorization: 'Bearer ' + bearer, 'Content-Type': 'application/json',
          'MCP-Protocol-Version': '2026-07-28', 'MCP-Method': 'tools/call', 'MCP-Name': name},
        body: JSON.stringify({jsonrpc: '2.0', id: 1, method: 'tools/call', params: {name, arguments: args,
          _meta: {'io.modelcontextprotocol/protocolVersion': '2026-07-28'}}}),
      }));
      assert.ok(response);
      return {response, body: await response.json() as any};
    };
    const read = await call('orbit.records.read', {kind: 'company', id: companyId});
    assert.equal(read.response.status, 200);
    assert.equal(read.body.result.isError, false);
    const update = {kind: 'company', id: companyId, fields: {name: 'Retained audit ' + mode},
      expected_revision: read.body.result.structuredContent.ref.revision, idempotency_key: agent.id + '-update'};
    const written = await call('orbit.records.update', update);
    assert.equal(written.response.status, 200);
    assert.equal(written.body.result.isError, false, JSON.stringify(written.body));
    assert.equal(written.body.result._meta['com.runeditrun/decision'].disposition, mode === 'held' ? 'review' : 'autonomous');
    assert.equal(await bindings.DB.prepare('SELECT name FROM companies WHERE id=?').bind(companyId).first('name'), update.fields.name);

    const audit = async (session: string) => {
      const response = await orbitAgentDoor(bindings).handle(new Request(origin + '/agents/api/audit?agent=' + encodeURIComponent(agent.id), {headers: {Cookie: session}}));
      assert.equal(response!.status, 200);
      return await response!.json() as {rows: AuditRow[]; differs_from_policy: number};
    };
    const before = await audit(cookie);
    assert.equal(before.rows.length, 2, 'the admitted agent has real read and write history');
    assert.equal(before.differs_from_policy, 0);
    for (const row of before.rows) {
      assert.deepEqual(row.agent, agent);
      assert.deepEqual(row.sponsor, sponsor);
      assert.equal(row.label, agent.name + ' for ' + sponsor.name);
      assert.equal(row.outcome, 'done');
    }
    const writeAudit = before.rows.find(row => row.idempotency_key === update.idempotency_key);
    assert.ok(writeAudit);
    assert.equal(writeAudit.id, written.body.result._meta['com.runeditrun/decision'].id);
    assert.equal(writeAudit.tool, 'orbit.records.update');
    assert.deepEqual(writeAudit.resource, {kind: 'company', id: companyId});
    assert.equal(writeAudit.decision, mode === 'held' ? 'review' : 'autonomous');
    if (mode === 'held') assert.equal(writeAudit.review?.id, written.body.result._meta['com.runeditrun/review'].id);

    const revoked = await orbitAgentDoor(bindings).handle(post('/agents/api/agents/' + encodeURIComponent(agent.id) + '/revoke', {}, cookie));
    assert.equal(revoked!.status, 200);
    assert.deepEqual(await revoked!.json(), {revoked: true});
    const state = await nativeState();
    const refused = await call('orbit.records.update', {...update, fields: {name: 'Must not be written'}, idempotency_key: agent.id + '-revoked'});
    assert.equal(refused.response.status, 401, 'the same outstanding Business token loses write authority');
    assert.equal(refused.body.error.message, 'Unauthorized');
    assert.equal(refused.body.result, undefined);
    assert.deepEqual(await nativeState(), state, 'revoked authority changes neither records nor native attribution');

    const sent: Array<{text?: string}> = [];
    const options = {ownerClaimed: async () => true, mailSender: {async send(message: {text?: string}) {
      sent.push(message); return {status: 'accepted' as const, provider: 'test-mail-edge', providerMessageId: 'synthetic-orbit-audit-mail'};
    }}};
    const mailBindings = {...bindings, AUTH_LOCAL: 'false', MAIL_FROM: bindings.OWNER_EMAIL};
    const requested = await identityResponse(post('/auth/magic-link', {email: bindings.OWNER_EMAIL, returnTo: '/agents'}), mailBindings, options);
    assert.equal(requested!.status, 202);
    const link = sent.flatMap(message => message.text?.match(/https:\/\/[^\s]+/g) ?? []).map(value => new URL(value)).find(value => value.pathname === '/auth/confirm');
    assert.ok(link);
    assert.equal(link.origin, origin);
    const confirmed = await identityResponse(post('/auth/confirm', {token: link.searchParams.get('token')}), mailBindings, options);
    assert.equal(confirmed!.status, 303);
    const freshCookie = confirmed!.headers.get('set-cookie')!.split(';')[0]!;
    assert.notEqual(freshCookie, cookie, 'audit readback uses a newly issued native owner session');
    assert.equal((await operatorFromRequest(new Request(origin + '/agents', {headers: {Cookie: freshCookie}}), bindings))?.operatorId, sponsor.id);
    const retained = await audit(freshCookie);
    assert.equal(retained.differs_from_policy, 0);
    const originalIds = new Set(before.rows.map(row => row.id));
    assert.deepEqual(retained.rows.filter(row => originalIds.has(row.id)), before.rows,
      'revocation and a fresh sign-in retain every original audit identity, field and attribution');
    assert.equal(retained.rows.length, before.rows.length + 1, 'the refused call adds its own audit without replacing history');
    const refusalAudit = retained.rows.find(row => row.idempotency_key === agent.id + '-revoked');
    assert.ok(refusalAudit);
    assert.equal(refusalAudit.outcome, 'refused');
    assert.equal(refusalAudit.code, 'unauthenticated');
    assert.deepEqual(refusalAudit.agent, agent);
    assert.deepEqual(refusalAudit.sponsor, sponsor);
    assert.equal(refusalAudit.label, agent.name + ' for ' + sponsor.name);
    const agents = await orbitAgentDoor(bindings).handle(new Request(origin + '/agents/api/agents', {headers: {Cookie: freshCookie}}));
    assert.equal(agents!.status, 200);
    const retainedAgent = (await agents!.json() as {agents: Array<unknown>}).agents.find((row: any) => row.id === agent.id);
    assert.deepEqual(retainedAgent, {...agent, sponsor, revoked: true}, 'the owner still sees the revoked agent and sponsor names');
    cookie = freshCookie;
  }
}
