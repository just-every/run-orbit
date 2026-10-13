export class RequestBodyTooLarge extends Error {}

/** Count received bytes even when Content-Length is absent or inaccurate. */
export async function boundedRequestBody(request: Request, maximum: number): Promise<ArrayBuffer> {
  if (!request.body) return new ArrayBuffer(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maximum) {
        await reader.cancel();
        throw new RequestBodyTooLarge();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result.buffer;
}
