import assert from 'node:assert/strict';
import {test} from 'node:test';
import {boundedRequestBody, RequestBodyTooLarge} from '../../src/core/platform/bounded-request-body';

test('BASE-INPUT-003 archive upload measures actual stream bytes and cancels overflow despite an inaccurate declared length', async()=>{
  let cancelled=false;
  const body=new ReadableStream<Uint8Array>({pull(controller){controller.enqueue(new Uint8Array(1024));},cancel(){cancelled=true;}});
  const request=new Request('https://orbit.test/archive',{method:'PUT',headers:{'Content-Length':'1'},body,duplex:'half'} as RequestInit);
  await assert.rejects(boundedRequestBody(request,2048),RequestBodyTooLarge);
  assert.equal(cancelled,true);
});

test('archive upload preserves exact multibyte JSON at its byte boundary without a duplicate JSON parse',async()=>{
  const text=JSON.stringify({body:'Actual café ✉'}),bytes=new TextEncoder().encode(text);
  const request=new Request('https://orbit.test/archive',{method:'PUT',body:bytes});
  const bounded=await boundedRequestBody(request,bytes.length);
  const replacement=new Request(request,{body:bounded});
  assert.deepEqual(await replacement.json(),{body:'Actual café ✉'});
});
