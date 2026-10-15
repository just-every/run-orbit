import {AuthError, safeReturnTo, securityHeaders} from '@runeditrun/rer/modules/operator-auth';
import {OwnerClaimError, verifyOwnerClaim} from '@runeditrun/rer/modules/owner-claim';
import {configureClaim} from '@runeditrun/rer/internal/modules/owner-claim/verify.mjs';
import {confirmationPage} from '@runeditrun/rer/internal/modules/owner-claim/page.mjs';
import {requireOrigin, requirePost} from '@runeditrun/rer/internal/modules/operator-auth/http.mjs';
import {readInput} from '@runeditrun/rer/internal/modules/operator-auth/input.mjs';
import type {PlatformBindings} from '../../platform/assets';
import type {OrbitIdentity} from './auth';

/** Signed transport only: the existing native bootstrap owns the atomic owner/session claim. */
export async function ownerClaimResponse(request: Request, bindings: PlatformBindings, identity: OrbitIdentity): Promise<Response> {
  const url = new URL(request.url), {accounts, clock, config} = identity;
  requireOrigin(request, config);
  if (url.search || url.hash) throw new OwnerClaimError('invalid_input', 400);
  const claimConfig = configureClaim({
    issuer: bindings.RER_OWNER_CLAIM_ISSUER,
    installationId: bindings.RER_OWNER_CLAIM_INSTALLATION_ID,
    appOrigin: bindings.RER_OWNER_CLAIM_APP_ORIGIN ?? config.origin,
    expectedEmail: config.OWNER_EMAIL,
    publicKeys: JSON.parse(bindings.RER_OWNER_CLAIM_PUBLIC_KEYS ?? 'null'),
  });
  if (claimConfig.appOrigin !== config.origin) throw new OwnerClaimError('invalid_configuration', 503);
  if (request.method === 'GET' || request.method === 'HEAD') return confirmationPage(claimConfig, request.method === 'HEAD');
  requirePost(request, config);
  const data = await readInput(request);
  if (Object.keys(data).some(key => !['token', 'displayName', 'returnTo'].includes(key))
    || typeof data.token !== 'string'
    || data.displayName !== undefined && typeof data.displayName !== 'string'
    || data.returnTo !== undefined && typeof data.returnTo !== 'string') throw new AuthError('invalid_input', 400);
  const claim = await verifyOwnerClaim(data.token, {...claimConfig, now: Math.floor(clock() / 1000)});
  if (!config.SETUP_TOKEN || !accounts.bootstrap) throw new OwnerClaimError('claim_unavailable', 409);
  // The signed, installation-bound claim is the admission credential. The
  // native transaction still fences the first owner and issues its session;
  // setup-token guessing limits belong to /auth/bootstrap, not this transport.
  const result = await accounts.bootstrap({request, email: claim.email, displayName: (data.displayName as string) ?? 'Owner', returnTo: safeReturnTo((data.returnTo as string) ?? '/setup'), now: clock()});
  if (!result) throw new OwnerClaimError('claim_unavailable', 409);
  return new Response(null, {status: 303, headers: {...securityHeaders(), 'Set-Cookie': result.cookie, Location: result.returnTo}});
}
