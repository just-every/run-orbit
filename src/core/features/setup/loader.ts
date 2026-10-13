import { createServerFn } from '@tanstack/react-start';
import { redirect } from '@tanstack/react-router';

export const loadSetup = createServerFn({ method: 'GET' }).handler(async () => {
  const { operatorFromRequest } = await import('../../platform/request.server');
  const operator = await operatorFromRequest();
  if (!operator) throw redirect({ href: '/signin?returnTo=%2Fsetup', statusCode: 302 });
  const { env } = await import('cloudflare:workers');
  const { readSetup } = await import('./repository');
  const setup = await readSetup((env as unknown as { DB: D1Database }).DB, operator.operatorId);
  if (setup.complete) throw redirect({ href: '/app', statusCode: 302 });
  return { ...setup, displayName: operator.displayName };
});
