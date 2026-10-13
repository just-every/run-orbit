import { createServerFn } from '@tanstack/react-start';
import { redirect } from '@tanstack/react-router';

/** Controls the mount only; the config endpoint rechecks native owner authority. */
export const loadNativeEditorOwner = createServerFn({ method: 'GET' }).handler(async () => {
  const { operatorFromRequest } = await import('../../platform/request.server');
  const operator = await operatorFromRequest();
  // Like every generated function, an absent native session is sent to sign-in.
  if (!operator) throw redirect({ href: '/signin?returnTo=%2Fapp', statusCode: 302 });
  const { env } = await import('cloudflare:workers');
  const { isSetupOwner } = await import('./repository');
  return isSetupOwner((env as unknown as { DB: D1Database }).DB, operator.operatorId);
});
