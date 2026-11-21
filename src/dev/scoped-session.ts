import {devGate} from '@runeditrun/rer/modules/operator-auth';
import {readSessionToken, sha256} from '../core/features/identity/store';
import type {PlatformBindings} from '../core/platform/assets';

export type Gate = NonNullable<ReturnType<typeof devGate>>;

/** The checkout's cookie name, but a different signing key for each local session.
 * This cookie replaces any chooser cookie, so it can never open the owner persona. */
async function scopedGate(gate: Gate, origin: string, sessionToken: string): Promise<Gate> {
  const key = await sha256(JSON.stringify(['orbit-local-session', sessionToken, await gate.setCookie()]));
  return devGate({key, origin, local:true})!;
}

// Only Base's read-only getSession receives these internal requests. Ordinary requests to
// persona selection, credential issuance and every other door still need the full checkout gate.
const sessionLookups = new WeakSet<Request>();
export const isScopedSessionLookup = (request: Request) => sessionLookups.has(request);

export async function localSessionRequest(request: Request, env: PlatformBindings, gate: Gate) {
  const token = readSessionToken(request), origin = env.AUTH_ORIGIN!;
  if (!token || new URL(request.url).origin !== origin || await gate.admits(request) ||
      !await (await scopedGate(gate, origin, token)).admits(request)) return request;
  const lookup = new Request(request.url, {method:request.method, headers:request.headers});
  sessionLookups.add(lookup);
  return lookup;
}

export async function scopedSessionResponse(origin: string, gate: Gate, cookie: string, location: string) {
  const token = readSessionToken(new Request(origin, {headers:{cookie}}))!;
  const headers = new Headers({'cache-control':'no-store', 'referrer-policy':'no-referrer', location});
  headers.append('set-cookie', cookie);
  headers.append('set-cookie', await (await scopedGate(gate, origin, token)).setCookie());
  return new Response(null, {status:303, headers});
}
