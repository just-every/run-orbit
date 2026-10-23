import {consumeRateLimit} from './public-rate-limit';
/** Called only after the route verifies the configured provider's exact signed bytes. */
export function signedMailRateLimit(db:D1Database,now=Date.now()){
 return consumeRateLimit(db,`signed-mail:${Math.floor(now/60000)}`,600,now);
}
