// Local-only session exchange. The invitation selects the person; the visitor supplies no identity.
import {devNotFound} from '@runeditrun/rer/modules/operator-auth';
import {AccessAdministration} from '../core/features/access/administration';
import {AccessError} from '../core/features/access/errors';
import {AccessService} from '../core/features/access/service';
import {domainEventStatements} from '../core/features/effects/event-statements';
import {sessionStore, sha256} from '../core/features/identity/store';
import {scopedSessionResponse, type Gate} from './scoped-session';
import type {PlatformBindings} from '../core/platform/assets';

export async function acceptLocalInvitation(request: Request, env: PlatformBindings, gate: Gate) {
  const origin = env.AUTH_ORIGIN!;
  if (request.method !== 'POST' || new URL(request.url).origin !== origin || request.headers.get('origin') !== origin ||
      request.headers.get('sec-fetch-site') === 'cross-site' || !request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')) return devNotFound();
  const token = (await request.formData()).get('invitation');
  if (typeof token !== 'string' || !token || token.length > 200) return devNotFound();
  const store = sessionStore(env.DB, {devAdmitted: request => gate.admits(request)});
  const person = await store.person(`o.status='active' AND o.setup_owner=0 AND EXISTS (SELECT 1 FROM access_collaborators c
    JOIN access_invitations i ON i.email=lower(o.email) WHERE c.operator_id=o.id AND i.token_hash=?
    AND i.accepted_by IS NULL AND i.revoked_at IS NULL AND i.expires_at>?)`, await sha256(token), new Date().toISOString());
  const unavailable = () => new Response('This invitation has expired, was withdrawn or has already been used. Ask for a new invitation.', {status:410, headers:{'cache-control':'no-store','referrer-policy':'no-referrer'}});
  if (!person) return unavailable();
  const admin = new AccessAdministration(env.DB, new AccessService(env.DB), domainEventStatements);
  try {
    const result = await store.issue({person, kind:'dev', now:Date.now(), afterSession: async sessionId =>
      (await admin.prepareAcceptance({operatorId:person.id, sessionId}, token)).statements});
    if (!result) return unavailable();
    return scopedSessionResponse(origin, gate, result.cookie, '/app/shared-records');
  } catch (error) {
    if (error instanceof AccessError && error.code === 'permission') return unavailable();
    throw error;
  }
}
