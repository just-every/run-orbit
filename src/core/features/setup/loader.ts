import { createServerFn } from '@tanstack/react-start';
import { redirect } from '@tanstack/react-router';

export const loadSetup = createServerFn({ method: 'GET' }).handler(async () => {
  const { operatorFromRequest } = await import('../../platform/request.server');
  const operator = await operatorFromRequest();
  if (!operator) throw redirect({ href: '/signin?returnTo=%2Fsetup', statusCode: 302 });
  const { env } = await import('cloudflare:workers');
  const { readSetup } = await import('./repository');
  const bindings = env as unknown as import('../../platform/assets').PlatformBindings;
  const setup = await readSetup(bindings.DB, operator.operatorId);
  if (setup.complete) throw redirect({ href: '/app', statusCode: 302 });
  if (!setup.owner) return { complete: false, owner: false, workspace: null, stages: [], displayName: '' };
  const { businessSetupDefaults } = await import('./business');
  const business = await businessSetupDefaults(bindings);
  return { ...setup, displayName: operator.displayName, business };
});
