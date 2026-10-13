import assert from 'node:assert/strict';

const prefix = 'ORBIT_CAPACITY_D1 ';
const methods = new Set(['first', 'all', 'run', 'raw', 'batch', 'exec']);
function validateClockFailure(record: any) {
  assert.deepEqual(Object.keys(record).sort(), ['endAcknowledged', 'failures', 'startAcknowledged']);
  assert.equal(typeof record.startAcknowledged, 'boolean'); assert.equal(typeof record.endAcknowledged, 'boolean');
  assert.ok(Array.isArray(record.failures) && record.failures.length > 0 && record.failures.length <= 2);
  for (const failure of record.failures) {
    assert.ok(Object.keys(failure).every(key => ['phase', 'stage', 'category', 'status', 'name', 'code', 'causeCode'].includes(key)));
    assert.ok(['start', 'end'].includes(failure.phase)); assert.ok(['fetch', 'body'].includes(failure.stage));
    assert.ok(['http-status', 'invalid-ack', 'exception'].includes(failure.category));
    if ('status' in failure) assert.ok(Number.isSafeInteger(failure.status) && failure.status >= 100 && failure.status <= 599);
    if ('name' in failure) assert.ok(['Error', 'TypeError', 'SyntaxError', 'AbortError', 'TimeoutError', 'DOMException', 'unknown'].includes(failure.name));
    for (const key of ['code', 'causeCode']) if (key in failure) assert.ok([null, 'ECONNRESET', 'ECONNREFUSED', 'EPIPE', 'ETIMEDOUT', 'UND_ERR_SOCKET', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT'].includes(failure[key]));
  }
}
type Call = { request: number | null; call: number; method: string; statements?: number; snapshot?: boolean };
export const emptyD1Summary = () => ({ requests: 0, calls: 0, failedCalls: 0, unscopedNativeCalls: 0, scopedCallsAfterFetchReturn: 0, batches: 0, queries: 0, snapshotBatches: 0, maxNativeCallUpperBoundMs: 0, maxNativeBatchUpperBoundMs: 0, maxNativeQueryUpperBoundMs: 0, snapshotBatchUpperBoundMs: [] as number[] });

/** Parse paired observations without retaining SQL, bindings or a second full log. */
export function d1Observations(write: (event: unknown) => void, diagnostic: (line: string) => void, summary: ReturnType<typeof emptyD1Summary>) {
  const pendingCalls = new Map<number, Call>(), pendingRequests = new Set<number>();
  let process: string | undefined, requests = 0, calls = 0, closed = false;
  const errors: string[] = [];
  const fail = () => { if (errors.length === 0) errors.push('Invalid or incomplete native D1 observation'); };
  function line(text: string) {
    const index = text.indexOf(prefix);
    if (index < 0) { diagnostic(text); return; }
    try {
      const record = JSON.parse(text.slice(index + prefix.length));
      assert.ok(Object.keys(record).every(key => ['process', 'event', 'request', 'call', 'method', 'statements', 'snapshot', 'upperBoundMs', 'success', 'clockFailure'].includes(key)));
      if ('clockFailure' in record) { assert.equal(record.event, 'call-end'); validateClockFailure(record.clockFailure); }
      assert.equal(typeof record.process, 'string');
      process ??= record.process;
      assert.equal(record.process, process);
      if (record.event === 'request-start') {
        assert.ok(Number.isSafeInteger(record.request) && record.request > 0);
        assert.equal(record.request, ++requests);
        assert.ok(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(record.method));
        pendingRequests.add(record.request); summary.requests++;
      } else if (record.event === 'fetch-return') {
        assert.ok(Number.isSafeInteger(record.request) && record.request > 0);
        assert.ok(pendingRequests.delete(record.request));
      } else {
        assert.ok(record.request === null || (Number.isSafeInteger(record.request) && record.request > 0 && record.request <= requests));
        assert.ok(methods.has(record.method));
        assert.ok(Number.isSafeInteger(record.call) && record.call > 0);
        const call: Call = { request: record.request, call: record.call, method: record.method };
        if (record.method === 'batch') {
          assert.ok(Number.isSafeInteger(record.statements) && record.statements >= 0);
          assert.equal(typeof record.snapshot, 'boolean');
          call.statements = record.statements; call.snapshot = record.snapshot;
        }
        if (record.event === 'call-start') {
          assert.equal(record.call, ++calls);
          pendingCalls.set(record.call, call);
          if (record.request !== null && !pendingRequests.has(record.request)) summary.scopedCallsAfterFetchReturn++;
        } else {
          assert.equal(record.event, 'call-end');
          assert.deepEqual(pendingCalls.get(record.call), call);
          assert.equal(typeof record.success, 'boolean');
          assert.ok(record.upperBoundMs === null || Number.isFinite(record.upperBoundMs));
          // Preserve safe failed timing evidence before rejecting its verdict.
          write(record);
          assert.ok(Number.isFinite(record.upperBoundMs) && record.upperBoundMs >= 0);
          assert.ok(!record.clockFailure);
          pendingCalls.delete(record.call); summary.calls++;
          if (record.request === null) summary.unscopedNativeCalls++;
          if (!record.success) summary.failedCalls++;
          summary.maxNativeCallUpperBoundMs = Math.max(summary.maxNativeCallUpperBoundMs, record.upperBoundMs);
          if (record.method === 'batch') {
            summary.batches++;
            summary.maxNativeBatchUpperBoundMs = Math.max(summary.maxNativeBatchUpperBoundMs, record.upperBoundMs);
            if (record.snapshot) { summary.snapshotBatches++; summary.snapshotBatchUpperBoundMs.push(record.upperBoundMs); }
          } else {
            summary.queries++;
            summary.maxNativeQueryUpperBoundMs = Math.max(summary.maxNativeQueryUpperBoundMs, record.upperBoundMs);
          }
          return;
        }
      }
      write(record);
    } catch { fail(); }
  }
  // stdout and stderr have independent chunk/line boundaries.
  function stream() {
    let buffer = '';
    return { data(chunk: Buffer) { buffer += chunk.toString(); let end: number; while ((end = buffer.indexOf('\n')) >= 0) { line(buffer.slice(0, end)); buffer = buffer.slice(end + 1); } }, end() { if (buffer) line(buffer); buffer = ''; } };
  }
  return { stream, close() { closed = true; }, state() { return { closed, requests, calls, pendingCalls: pendingCalls.size, pendingRequests: pendingRequests.size, errors }; } };
}
