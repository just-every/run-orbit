import { createD1DevelopmentOutbox, createDevelopmentOutboxHandler } from '../../base/modules/mail/src/development/index.mjs';
import type { PlatformBindings } from './assets';

// Base's loopback-only /__dev/outbox. It answers only an explicit local
// installation on its exact configured loopback origin and Host; every other
// request falls through to ordinary routing.
export async function developmentOutbox(bindings: PlatformBindings, request: Request): Promise<Response | null> {
  if (bindings.AUTH_LOCAL !== 'true' || bindings.MAIL_PROVIDER !== 'development' || !bindings.AUTH_ORIGIN) return null;
  return createDevelopmentOutboxHandler({ local: true, origin: bindings.AUTH_ORIGIN, outbox: createD1DevelopmentOutbox({ db: bindings.DB }) })(request);
}
