import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/** `rer dev` prints RER_OPEN: this checkout's key exchange, which opens the app signed in. */
export const openLink = (output) => /^RER_OPEN (\S+)$/m.exec(output)?.[1];
export async function devKey(root) { return /^RER_DEV_KEY=(\S+)$/m.exec(await readFile(join(root, '.rer/local/dev-key.env'), 'utf8'))[1]; }
/** Owner sign-in through the local CLI door; the resulting native session survives preview. */
export async function localOwnerSignIn(page, origin, root, returnTo = '/app') {
  const { createHmac } = await import('node:crypto');
  const vars = await readFile(join(root, '.dev.vars'), 'utf8');
  const secret = /^SESSION_SECRET=(.*)$/m.exec(vars)[1].replace(/^(["'])(.*)\1$/, '$2');
  const response = await page.context().request.post(origin + '/auth/local/cli-session', {
    headers: {Origin: origin, 'x-rer-local-cli': createHmac('sha256', secret).update('local-cli\0sign-in').digest('hex')},
    data: {returnTo}, maxRedirects: 0,
  });
  if (response.status() !== 303) throw Error(`Local CLI sign-in answered ${response.status()}`);
  await page.goto(origin + response.headers().location);
  await page.waitForLoadState('networkidle');
}
