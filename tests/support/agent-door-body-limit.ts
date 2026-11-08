import assert from 'node:assert/strict';
import type {AgentDoor} from '../../src/base/modules/agent-door/index.ts';

/** Prove refusal before native writes, using the installed door and real D1. */
export async function agentDoorBodyLimitProof(options: {
  db: D1Database;
  door: AgentDoor;
  origin: string;
  bearer: string;
  record: {stage_id: string; value_cents: number; company_id: string; contact_ids: string[]; primary_contact_id: string};
}) {
  const {db, door, origin, bearer, record} = options;
  const version = '2026-07-28';
  const envelope = (method: string, params: Record<string, unknown>) => ({
    jsonrpc: '2.0', id: 113, method,
    params: {...params, _meta: {'io.modelcontextprotocol/protocolVersion': version}},
  });
  const headers = (method: string, name?: string) => new Headers({
    Authorization: 'Bearer ' + bearer, Origin: origin, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream',
    'MCP-Protocol-Version': version, 'MCP-Method': method, ...(name ? {'MCP-Name': name} : {}),
  });
  const discovery = await door.handle(new Request(origin + '/mcp', {
    method: 'POST', headers: headers('server/discover'), body: JSON.stringify(envelope('server/discover', {})),
  }));
  assert.equal(discovery!.status, 200);
  const discovered = await discovery!.json() as {result: {_meta: {'com.runeditrun/limits': {maxBodyBytes: number}}}};
  const max = discovered.result._meta['com.runeditrun/limits'].maxBodyBytes;
  assert.ok(Number.isSafeInteger(max) && max > 0);

  // Compare complete rows, including associations, timeline, approvals, reviews,
  // replay custody and downstream tables. Never reuse a pre-request readback.
  const tables = (await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT GLOB 'sqlite_*' AND name NOT GLOB '_cf_*' AND name NOT GLOB 'd1_*' ORDER BY name").all<{name: string}>()).results;
  const snapshot = async () => {
    const rows = await db.batch(tables.map(({name}) => db.prepare(`SELECT * FROM "${name.replaceAll('"', '""')}"`)));
    return Object.fromEntries(tables.map(({name}, index) => [name, rows[index]!.results.map(row => JSON.stringify(row)).sort()]));
  };
  const padded = (rpc: object, size: number) => {
    const json = JSON.stringify(rpc), bytes = new TextEncoder().encode(json).byteLength;
    assert.ok(bytes < size, 'the valid create request fits the discovered body limit');
    return new TextEncoder().encode(json + ' \t\r\n'.repeat(Math.ceil((size - bytes) / 4)).slice(0, size - bytes));
  };
  const request = (body: Uint8Array<ArrayBuffer>, contentLength: boolean) => {
    const requestHeaders = headers('tools/call', 'orbit.records.create');
    if (contentLength) requestHeaders.set('Content-Length', String(body.byteLength));
    let offset = 0;
    const init: RequestInit & {duplex?: 'half'} = {
      method: 'POST', headers: requestHeaders,
      body: contentLength ? body : new ReadableStream<Uint8Array>({
        pull(controller) {
          if (offset === body.byteLength) { controller.close(); return; }
          const end = Math.min(offset + 16 * 1024, body.byteLength);
          controller.enqueue(body.slice(offset, end)); offset = end;
        },
      }),
      ...(!contentLength ? {duplex: 'half' as const} : {}),
    };
    const result = new Request(origin + '/mcp', init);
    assert.equal(result.headers.has('content-length'), contentLength);
    return result;
  };
  for (const contentLength of [true, false]) {
    const mode = contentLength ? 'content-length' : 'stream';
    const args = {kind: 'opportunity', record: {...record, title: 'synthetic-orbit-113-' + mode}, idempotency_key: 'synthetic-orbit-113-' + mode};
    const rpc = envelope('tools/call', {name: 'orbit.records.create', arguments: args});
    const oversized = padded(rpc, max + 1);
    assert.deepEqual(JSON.parse(new TextDecoder().decode(oversized)), rpc, 'padding is legal JSON whitespace, not an invalid tool argument');
    const before = await snapshot();
    assert.ok(before.companies!.length && before.contacts!.length && before.opportunities!.length, 'refusal is checked on populated native records');
    const refused = await door.handle(request(oversized, contentLength));
    assert.equal(refused!.status, 413, mode + ' refuses the oversized valid create');
    assert.deepEqual(await snapshot(), before, mode + ' refusal changes no persisted native or agent state');
    await refused!.body?.cancel();

    // The same arguments and idempotency key must still create exactly once
    // under the already adopted autonomous policy when the body fits.
    const accepted = await door.handle(request(padded(rpc, max), contentLength));
    assert.equal(accepted!.status, 200);
    const answer = await accepted!.json() as {result: {isError: boolean; structuredContent: {id: string}}};
    assert.equal(answer.result.isError, false, JSON.stringify(answer));
    const id = answer.result.structuredContent.id;
    const saved = await db.prepare('SELECT title,company_id FROM opportunities WHERE id=?').bind(id).first();
    assert.deepEqual(saved, {title: args.record.title, company_id: record.company_id});
    assert.deepEqual((await db.prepare('SELECT contact_id,is_primary FROM opportunity_contacts WHERE opportunity_id=? ORDER BY contact_id').bind(id).all()).results,
      [{contact_id: record.primary_contact_id, is_primary: 1}]);
    assert.equal(await db.prepare("SELECT count(*) n FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id WHERE r.record_type='opportunity' AND r.record_id=? AND t.kind='record.created'").bind(id).first('n'), 1);
    const after = await snapshot();
    assert.equal(after.opportunities!.length, before.opportunities!.length + 1);
    assert.equal(after.opportunity_contacts!.length, before.opportunity_contacts!.length + 1);
    assert.deepEqual(after.agent_door_approvals, before.agent_door_approvals, 'autonomous control creates no pending approval');
    assert.deepEqual(after.agent_door_reviews, before.agent_door_reviews, 'autonomous control creates no review item');
    console.log(JSON.stringify({proof: 'BASE-AGENT-001.6', mode, maxBodyBytes: max, oversizedBytes: oversized.byteLength, refused: refused!.status, unchangedTables: tables.length, control: accepted!.status, created: 1}));
  }
}
