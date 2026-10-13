export function orbitClient(origin, {cookie,devKey}) {
 return async (path, {body, statuses = [200]} = {}) => {
  const url = new URL(path, origin);
  if (url.origin !== origin || !url.pathname.startsWith('/api/v1/capture/') || url.search || url.hash) throw new Error('Refused a request outside this Orbit capture origin.');
  let response;
  try {
   response = await fetch(url, {method:body === undefined ? 'GET' : 'POST', redirect:'manual', signal:AbortSignal.timeout(120000), headers:{cookie,origin,accept:'application/json',...(devKey ? {'x-rer-dev-key':devKey}:{}),...(body === undefined ? {} : {'content-type':'application/json'})}, ...(body === undefined ? {} : {body:JSON.stringify(body)})});
  } catch { throw new Error('Orbit request failed or timed out; inspect source status before resuming.'); }
  if ((response.url && new URL(response.url).origin !== origin) || response.status >= 300 && response.status < 400) {await response.body?.cancel(); throw new Error('Orbit redirect refused; credentials were not forwarded.');}
  if (!statuses.includes(response.status)) {await response.body?.cancel(); throw new Error(`Orbit refused the request (HTTP ${response.status}); inspect Capture using your native operator session.`);}
  if (response.status !== 200) {await response.body?.cancel(); return {status:response.status};}
  // Discard response bodies immediately after extracting the JSON. No HTTP or
  // provider error text is ever logged, included in thrown errors, or persisted.
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Orbit returned no JSON result.');
  let bytes = 0, chunks = [];
  try {
   for (;;) {const {done,value} = await reader.read(); if(done)break; bytes += value.byteLength; if(bytes > 1_000_000)throw new Error(); chunks.push(value);}
   return {status:200,value:JSON.parse(Buffer.concat(chunks).toString('utf8'))};
  } catch {await reader.cancel().catch(()=>{}); throw new Error('Orbit returned an invalid or oversized JSON result.');}
  finally {reader.releaseLock();}
 };
}
