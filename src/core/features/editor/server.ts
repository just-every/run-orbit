import type { PlatformBindings } from '../../platform/assets';
import { createOrbitIdentity } from '../identity';
import { parseConfig } from '../../../base/modules/editor/config';

export function editorConfiguration(bindings: PlatformBindings) {
  if (bindings.RER_MANAGEMENT_ORIGIN === undefined && bindings.RER_INSTALLATION_ID === undefined) return undefined;
  return parseConfig({ enabled: true, managementOrigin: bindings.RER_MANAGEMENT_ORIGIN, installationId: bindings.RER_INSTALLATION_ID });
}
export function editorOrigin(bindings: PlatformBindings) {
  try { return editorConfiguration(bindings)?.managementOrigin; } catch { return undefined; }
}
export async function editorConfigurationResponse(request: Request, bindings: PlatformBindings) {
  const headers = { 'Cache-Control': 'no-store, private', Vary: 'Cookie', 'Content-Type': 'application/json' };
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (request.method !== 'GET') return reply({error: 'Method not allowed.'}, 405);
  // Base's editor grant: the install owner only; a provider session must also hold the owner's current binding.
  let ownerId: string;
  try { ownerId = (await createOrbitIdentity(bindings)!.auth.requireEditorOwner(request)).operator.id; }
  catch { return reply({error: 'Owner session required.'}, 403); }
  try {
    const config = editorConfiguration(bindings);
    if (!config) return new Response(null, { status: 204, headers });
    return new Response(JSON.stringify({ config, expiresAt: Date.now() + 30_000 }), { headers: { ...headers, 'X-Orbit-Owner': ownerId } });
  } catch { return reply({error: 'Editor management configuration is invalid.'}, 503); }
}
