import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {test} from 'node:test';
import {delayedMailSocket} from '../support/delayed-mail-socket';
import {closeServer, serverOrigin} from '../support/http-listener-fixture';

test('delayed TCP reader keeps the real response unread until its due clock boundary', {timeout: 7000}, async () => {
  let responses = 0;
  const server = createServer((request, response) => {
    request.resume();
    responses++;
    // Exact Content-Length completes the response without closing the upload.
    response.writeHead(409, {'Content-Length': '13'}).write('real response');
  });
  const target = await serverOrigin(server);
  try {
    // Exercise timer rounding as well as the native one-second grace boundary.
    for (const readDelay of [1, 2, 5, 20, 1500]) {
      const result = await delayedMailSocket(target.href, 'due-clock', Buffer.from('upload'), readDelay);
      assert.equal(result.status, 409);
      assert.equal(result.body.toString(), 'real response');
      assert.ok(result.elapsed >= readDelay, `Read after ${result.elapsed}ms, due at ${readDelay}ms`);
    }
    assert.equal(responses, 5);
  } finally {await closeServer(server);}
});
