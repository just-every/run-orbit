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
  // The platform signs the Business name, owner and time zone: the first screen starts from them rather than asking
  // again. An unset signed value resolves to what is stored, so the form reads as it did before.
  const { orbitBusinessSettings } = await import('../agent-door');
  const signed = orbitBusinessSettings(bindings);
  const text = async (field: 'display_name' | 'owner_name' | 'timezone', stored: string | undefined) => {
    const value = await signed.resolve(field, stored);
    return typeof value === 'string' ? value : stored;
  };
  const [name, timezone, ownerName] = await Promise.all([
    text('display_name', setup.workspace?.name), text('timezone', setup.workspace?.timezone), text('owner_name', operator.displayName),
  ]);
  const workspace = setup.workspace && { ...setup.workspace, name: name ?? setup.workspace.name, timezone: timezone ?? setup.workspace.timezone };
  return { ...setup, workspace, displayName: ownerName ?? operator.displayName };
});
