import { safeReturnTo, securityHeaders } from '@runeditrun/rer/modules/operator-auth';
import { requirePost } from '@runeditrun/rer/internal/modules/operator-auth/http.mjs';
// @ts-expect-error Base's HTML page helper is plain ESM.
import { pageResponse } from '@runeditrun/rer/internal/modules/operator-auth/page.mjs';
import type { OrbitIdentity } from './auth';

/** A demo's disposable owner can return in one click after signing out. */
export async function demoSignIn(request: Request, identity: OrbitIdentity): Promise<Response> {
  const url = new URL(request.url), {config, store} = identity;
  if (url.pathname === '/signin') {
    const returnTo = safeReturnTo(url.searchParams.get('returnTo'));
    return pageResponse({branding:config.branding, title:'Orbit', heading:'Open Orbit', content:`<form method="post" action="/auth/demo/enter?returnTo=${encodeURIComponent(returnTo)}"><button>Continue as owner</button></form>`});
  }
  requirePost(request, config);
  const person = await store.person("o.setup_owner=1 AND o.status='active'");
  if (!person) return Response.json({error:'owner_required'}, {status:409});
  const result = await store.issue({person, kind:'native', now:Date.now(), returnTo:safeReturnTo(url.searchParams.get('returnTo')), freshProof:true});
  if (!result) return Response.json({error:'authority_changed'}, {status:409});
  return new Response(null, {status:303, headers:{...securityHeaders(), location:result.returnTo, 'set-cookie':result.cookie}});
}
