import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { hrtime } from 'node:process';

/** Node's monotonic clock brackets native calls across an acknowledged barrier.
 * Worker performance.now()/hrtime use Date.now(), which can move backwards. */
export async function d1ClockWitness() {
  const authorization = randomUUID(), pending = new Map<string, bigint>();
  let completed = 0, closed = false, closing: Promise<void> | undefined;
  const errors: string[] = [];
  const invalid = () => { if (errors.length === 0) errors.push('Invalid or incomplete native D1 clock witness'); };
  const server = createServer(async (request, response) => {
    request.once('error', invalid); response.once('error', invalid);
    try {
      assert.equal(request.method, 'POST'); assert.equal(request.url, '/');
      assert.equal(request.headers['x-capacity-observer'], authorization);
      let body = '';
      for await (const chunk of request) { body += chunk; assert.ok(body.length <= 512); }
      const record = JSON.parse(body);
      assert.deepEqual(Object.keys(record).sort(), ['call', 'phase', 'process']);
      assert.ok(typeof record.process === 'string' && record.process.length <= 64);
      assert.ok(Number.isSafeInteger(record.call) && record.call > 0);
      const key = `${record.process}:${record.call}`;
      let result: { started?: true; upperBoundMs?: number };
      if (record.phase === 'start') {
        assert.ok(!pending.has(key));
        // The Worker awaits this acknowledgement before invoking native D1.
        pending.set(key, hrtime.bigint());
        result = { started: true };
      } else {
        assert.equal(record.phase, 'end');
        const started = pending.get(key); assert.notEqual(started, undefined);
        // This request is sent only after the native promise has settled.
        const upperBoundMs = Number(hrtime.bigint() - started!) / 1e6;
        pending.delete(key); completed++;
        result = { upperBoundMs };
      }
      response.writeHead(200, { 'content-type': 'application/json', connection: 'close' });
      response.end(JSON.stringify(result));
    } catch {
      invalid();
      if (!response.headersSent) { response.writeHead(400); response.end(); }
      else response.destroy();
    }
  });
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const address = server.address(); assert.ok(address && typeof address === 'object');
  return {
    configuration: { origin: `http://127.0.0.1:${address.port}`, authorization },
    state: () => ({ completed, pending: pending.size, closed, errors }),
    close() {
      closing ??= new Promise<void>((resolve, reject) => {
        server.close(error => { closed = true; if (error) reject(error); else resolve(); });
        server.closeAllConnections();
      });
      return closing;
    },
  };
}
