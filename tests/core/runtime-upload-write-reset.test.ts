import assert from 'node:assert/strict';
import {test} from 'node:test';
import {uploadCloseFixture} from '../support/upload-close-fixture';

for (const outcome of ['complete', 'truncated', 'reset', 'silent'] as const) {
  test(`SDK preserves the real ${outcome} response outcome after an upload write ECONNRESET`, {timeout: 7000}, async () => {
    const fixture = await uploadCloseFixture();
    try {
      // Linux can report the peer's pending reset on send before returning EPIPE.
      Object.assign(fixture.failure, {code: 'ECONNRESET'});
      await fixture.failUpload();
      assert.equal(fixture.stopped, 1);
      assert.deepEqual(fixture.callbacks, [], 'A failed write is never acknowledged as successful');
      if (outcome === 'complete') fixture.response.writeHead(409, {'Content-Length': '13'}).end('real response');
      else if (outcome === 'truncated') {
        fixture.response.writeHead(409, {'Content-Length': '100'}).write('partial');
        fixture.response.socket!.end();
      } else if (outcome === 'reset') fixture.response.socket!.resetAndDestroy();
      const observed = await fixture.outcome;
      await fixture.closed;
      assert.deepEqual(fixture.callbacks, [fixture.failure]);
      if (outcome === 'complete') {
        assert.deepEqual(observed, {value: {status: 409, body: 'real response'}});
        assert.equal(fixture.complete, true);
      } else {
        assert.ok('error' in observed);
        assert.equal(fixture.complete, false);
      }
    } finally {await fixture.dispose();}
  });
}

test('SDK does not classify a non-write ECONNRESET as an upload close', {timeout: 7000}, async () => {
  const fixture = await uploadCloseFixture();
  try {
    Object.assign(fixture.failure, {code: 'ECONNRESET', syscall: 'read'});
    await fixture.failUpload();
    await fixture.closed;
    assert.equal(fixture.stopped, 0);
    assert.ok('error' in await fixture.outcome);
    assert.deepEqual(fixture.callbacks, [fixture.failure]);
    assert.equal(fixture.complete, false);
  } finally {await fixture.dispose();}
});
