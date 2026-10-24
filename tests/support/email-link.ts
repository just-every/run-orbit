import { createOrbitIdentity, type AuthenticatedOperator } from '../../src/core/features/identity';
import type { MailMessage, MailSender } from '@runeditrun/rer/modules/operator-auth';
import { TEST_SESSION_SECRET } from './app';
import type { PlatformBindings } from '../../src/core/platform/assets';

/** Installation settings for Base sign-in over a test database; only the mail transport is replaced. */
export function mailedIdentity(db: D1Database, origin = 'https://orbit.test', extra: Partial<PlatformBindings> = {}) {
  const sent: MailMessage[] = [];
  const mailSender: MailSender = { async send(message) { sent.push(message); return { status: 'accepted', provider: 'test', providerMessageId: null }; } };
  const bindings = { DB: db, AUTH_ORIGIN: origin, AUTH_LOCAL: 'false', SESSION_SECRET: TEST_SESSION_SECRET, OWNER_EMAIL: 'owner@orbit.test', MAIL_FROM: 'auth@orbit.test', SENDGRID_API_KEY: 'test-only-never-sent', ...extra } as PlatformBindings;
  const linkIn = (message: MailMessage | undefined) => message?.text.match(/https?:\/\/\S+\/auth\/confirm\?token=[^\s]+/)?.[0];
  /** A browser-shaped POST from this origin, from an edge-reported client address. */
  const post = (path: string, input: { cookie?: string; form?: Record<string, string>; json?: unknown } = {}) => new Request(origin + path, {
    method: 'POST',
    headers: { Origin: origin, 'CF-Connecting-IP': '192.0.2.10', ...(input.cookie ? { Cookie: input.cookie } : {}), ...(input.form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : input.json !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    ...(input.form ? { body: new URLSearchParams(input.form) } : input.json !== undefined ? { body: JSON.stringify(input.json) } : {}),
  });
  return { bindings, sent, mailSender, linkIn, post, origin };
}

/**
 * Signs in through Base's real email-link lifecycle over Orbit's operators:
 * request a link, read it from the captured message, confirm it by POST.
 */
export async function emailLinkSignIn(db: D1Database, email: string, { origin = 'https://orbit.test', returnTo = '/app', createIdentity = createOrbitIdentity }: {origin?:string;returnTo?:string;createIdentity?:typeof createOrbitIdentity} = {}): Promise<{ operator: AuthenticatedOperator; cookie: string; link: string }> {
  const mail = mailedIdentity(db, origin), identity = createIdentity(mail.bindings, { mailSender: mail.mailSender })!;
  await identity.auth.requestMagicLink(mail.post('/auth/magic-link'), { email, returnTo });
  const link = mail.linkIn(mail.sent.at(-1));
  if (!link) throw new Error(`No sign-in link was sent to ${email}.`);
  const confirmed = await identity.auth.confirmLink(mail.post('/auth/confirm'), { token: new URL(link).searchParams.get('token')! });
  const cookie = confirmed.cookie!.split(';')[0]!;
  const session = await identity.auth.getSession(new Request(origin + '/', { headers: { Cookie: cookie } }));
  if (!session) throw new Error('The confirmed sign-in did not admit a session.');
  return { operator: { sessionId: session.id, operatorId: session.operator.id, email: session.operator.email, displayName: session.operator.displayName, devSession: false }, cookie, link };
}
