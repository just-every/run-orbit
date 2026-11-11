import type {AgentDoor} from '../../../base/modules/agent-door/index.ts';

/**
 * Orbit's native change-feed events are keyed `<timeline entry>:contact:<contact id>`, and an agent's cursor is
 * such an event id. Erasing the contact renames its event row to `<timeline entry>:contact:erased-<sequence>` so no
 * id holds the contact's id (contact-erasure.ts); the row keeps its sequence, so its place in the feed is unchanged.
 * Base finds a cursor by exact id and answers an unknown one with no events, so an agent whose cursor was that
 * event would never move again. This resolves such a cursor to the renamed row before the door reads it. The
 * mapping needs no stored copy of the old id: the timeline entry prefix names the row, and a cursor that still
 * matches a row is left alone.
 */
const eventsTool = 'orbit.events.list';
const erasedCursor = /^([0-9A-Za-z-]+):contact:[0-9A-Za-z-]+$/;

export async function resolveEventCursor(db: D1Database, after: unknown): Promise<unknown> {
  if (typeof after !== 'string') return after;
  const named = erasedCursor.exec(after);
  if (!named || await db.prepare('SELECT 1 FROM agent_door_events WHERE id=?').bind(after).first()) return after;
  const prefix = `${named[1]}:contact:erased-`;
  const renamed = await db.prepare('SELECT id FROM agent_door_events WHERE substr(id,1,length(?1))=?1 ORDER BY sequence LIMIT 1').bind(prefix).first<{id: string}>();
  return renamed?.id ?? after;
}

async function withResolvedCursor(db: D1Database, args: Record<string, unknown>): Promise<Record<string, unknown>> {
  return 'after' in args ? {...args, after: await resolveEventCursor(db, args.after)} : args;
}

// Read at most maxBody bytes of the request body. Within the cap the request is rebuilt from the bytes read; over it, from
// those bytes followed by the rest of the stream, so the door still reads (and refuses) an oversized body as it would have.
const maxBody = 65536;
async function peek(request: Request): Promise<{request: Request; text: string | null}> {
  const reader = request.body?.getReader(), chunks: Uint8Array[] = [];
  if (!reader) return {request, text: null};
  let length = 0, done = false;
  while (!done && length <= maxBody) {
    const chunk = await reader.read();
    done = chunk.done;
    if (chunk.value) { chunks.push(chunk.value); length += chunk.value.byteLength; }
  }
  const rebuilt = (body: BodyInit) => new Request(request.url, {method: request.method, headers: request.headers, body, duplex: 'half'} as RequestInit);
  if (!done) {
    const replay = new ReadableStream<Uint8Array>({
      start(controller) { for (const chunk of chunks) controller.enqueue(chunk); },
      async pull(controller) { const chunk = await reader.read(); if (chunk.done) controller.close(); else controller.enqueue(chunk.value); },
      cancel: reason => reader.cancel(reason),
    });
    return {request: rebuilt(replay), text: null};
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return {request: rebuilt(bytes), text: new TextDecoder().decode(bytes)};
}

async function resolvedRequest(db: D1Database, request: Request): Promise<Request> {
  if (request.method !== 'POST' || !request.headers.has('authorization') || new URL(request.url).pathname !== '/mcp') return request;
  const {request: whole, text} = await peek(request);
  if (!text?.includes(eventsTool)) return whole;
  let rpc: any;
  try { rpc = JSON.parse(text); } catch { return whole; }
  const params = rpc?.method === 'tools/call' && rpc.params?.name === eventsTool ? rpc.params : null;
  if (!params?.arguments || typeof params.arguments !== 'object' || typeof params.arguments.after !== 'string') return whole;
  const after = await resolveEventCursor(db, params.arguments.after);
  if (after === params.arguments.after) return whole;
  const headers = new Headers(request.headers);
  headers.delete('content-length');
  return new Request(request.url, {method: request.method, headers, body: JSON.stringify({...rpc, params: {...params, arguments: {...params.arguments, after}}})});
}

/** The door, with a feed cursor on an erased contact's event resolved to where that event now sits. */
export function followingErasedEvents(db: D1Database, door: AgentDoor): AgentDoor {
  return {
    ...door,
    handle: async request => door.handle(await resolvedRequest(db, request)),
    invoke: async (name, args, who, proofReference) => door.invoke(name, name === eventsTool ? await withResolvedCursor(db, args) : args, who, proofReference),
  };
}
