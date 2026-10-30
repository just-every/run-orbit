import { z } from 'zod';
import { orbitBusinessSettings } from '../agent-door';
import type { PlatformBindings } from '../../platform/assets';

// First-build input names are the Business-field allow-list in the installed rer
// SETUP schema. Later signed documents use the adopted Business settings slots.
const name = z.string().trim().min(1).max(200);
const zone = z.string().trim().min(1).max(100).refine(value => {
  try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; }
});

/** Server-only defaults. Never accept a carry from a request or serialize its document. */
export async function businessSetupDefaults(bindings: PlatformBindings) {
  const settings = orbitBusinessSettings(bindings);
  const [businessName, ownerName, timezone] = await Promise.all([
    settings.resolve('display_name', bindings.WORKSPACE_NAME),
    settings.resolve('owner_name', bindings.OWNER_NAME),
    settings.resolve('timezone', bindings.WORKSPACE_TIMEZONE),
  ]);
  return {
    name: name.safeParse(businessName).data,
    ownerName: name.safeParse(ownerName).data,
    timezone: zone.safeParse(timezone).data,
  };
}
