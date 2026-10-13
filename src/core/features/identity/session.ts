import { AuthError, type MailSender, type StepUpAction } from '@runeditrun/rer/modules/operator-auth';
import type { PlatformBindings } from '../../platform/assets';
import { createOrbitIdentity } from './auth';

/** The signed-in operator as Orbit's features see it. */
export interface AuthenticatedOperator {
  sessionId: string;
  operatorId: string;
  email: string;
  displayName: string;
  /** A local dev session: credentials it mints count only behind the dev key. */
  devSession: boolean;
}

/** Base admission for one request: undefined when signed out, expired, revoked, removed or refused. */
export async function operatorFromRequest(request: Request, bindings: PlatformBindings): Promise<AuthenticatedOperator | undefined> {
  const identity = createOrbitIdentity(bindings);
  if (!identity) return undefined;
  try {
    const session = await identity.auth.getSession(request);
    return session ? { sessionId: session.id, operatorId: session.operator.id, email: session.operator.email, displayName: session.operator.displayName, devSession: session.kind === 'dev' } : undefined;
  } catch (error) {
    if (error instanceof AuthError) return undefined;
    throw error;
  }
}

const POST = (request: Request) => request.method === 'POST' ? request : new Request(request.url, { method: 'POST', headers: request.headers });

/**
 * Base step-up for export, delete and minting credentials: the asking session
 * needs an app-local email proof from the last ten minutes. Without one, Orbit
 * emails a confirmation link to the operator's own address and answers 403.
 * Returns null when the action may proceed.
 */
export async function requireStepUp(request: Request, bindings: PlatformBindings, action: StepUpAction, returnTo = '/app', options: { mailSender?: MailSender } = {}): Promise<Response | null> {
  const identity = createOrbitIdentity(bindings, options);
  if (!identity) return Response.json({ error: 'Sign-in is not configured for this installation.' }, { status: 503 });
  try {
    await identity.auth.requireStepUp(request, action);
    return null;
  } catch (error) {
    if (!(error instanceof AuthError) || error.code !== 'step_up_required') return refusal(error);
  }
  try { await identity.auth.requestStepUp(POST(request), { action, returnTo }); }
  catch (error) { return refusal(error); }
  return Response.json({ error: 'Confirm this with your email first. Orbit sent a confirmation link to your address. Open it in this browser, then try again within 10 minutes.', code: 'step_up_required' }, { status: 403 });
}

const refusals: Record<string, string> = {
  unauthenticated: 'Operator session required.',
  rate_limited: 'Too many confirmation emails. Try again later.',
  mail_unavailable: 'The confirmation email could not be sent.',
  step_up_required: 'This action needs a fresh email confirmation from your address.',
};
function refusal(error: unknown): Response {
  if (!(error instanceof AuthError)) throw error;
  return Response.json({ error: refusals[error.code] ?? 'The email confirmation is unavailable right now. Try again later.', code: error.code }, { status: error.status });
}
