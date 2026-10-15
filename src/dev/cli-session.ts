import { devNotFound, safeReturnTo } from '@runeditrun/rer/modules/operator-auth';
// @ts-expect-error Base's local CLI proof helper is plain ESM.
import { isLocalCli } from '@runeditrun/rer/internal/modules/operator-auth/local-cli.mjs';
import { requirePost } from '@runeditrun/rer/internal/modules/operator-auth/http.mjs';
import { identityConfig } from '../core/features/identity/auth';
import { sessionStore } from '../core/features/identity/store';
import type { PlatformBindings } from '../core/platform/assets';

/** The local CLI proves the installation secret; this module is never deployed. */
export async function cliSession(request: Request, env: PlatformBindings): Promise<Response> {
  const config = identityConfig(env);
  if (!config || !await isLocalCli(request, config)) return devNotFound();
  requirePost(request, config);
  const input = await request.json() as {returnTo?: string};
  const store = sessionStore(env.DB, {devAdmitted: async () => false}), person = await store.person("o.setup_owner=1 AND o.status='active'");
  if (!person) return Response.json({error:'owner_required'}, {status:403});
  const result = await store.issue({person, kind:'native', now:Date.now(), returnTo:safeReturnTo(input.returnTo), freshProof:true});
  if (!result) return Response.json({error:'authority_changed'}, {status:409});
  return new Response(null, {status:303, headers:{'cache-control':'no-store', location:result.returnTo, 'set-cookie':result.cookie}});
}
