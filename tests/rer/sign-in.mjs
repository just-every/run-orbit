import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/** `rer dev` prints RER_OPEN: this checkout's key exchange, which opens the app signed in. */
export const openLink = (output) => /^RER_OPEN (\S+)$/m.exec(output)?.[1];
export async function devKey(root) { return /^RER_DEV_KEY=(\S+)$/m.exec(await readFile(join(root, '.rer/local/dev-key.env'), 'utf8'))[1]; }
const escapeHtml = (value) => value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const outboxRead = async (origin, key, path) => { const response = await fetch(origin + path, { headers: { 'x-rer-dev-key': key } }); if (!response.ok) throw new Error(`outbox ${response.status}`); return response.text(); };
/** Outbox message ids addressed to this email, newest first; the outbox answers only with the dev key. */
export async function outboxMessages(origin, key, email) {
  const wanted = `To: ${escapeHtml(email)}</p>`.toLowerCase();
  return (await outboxRead(origin, key, '/__dev/outbox')).split('<article>').slice(1).filter((article) => article.toLowerCase().includes(wanted)).map((article) => article.match(/\?message=([^"&]+)"/)?.[1]).filter(Boolean);
}
/** The newest sign-in link the development outbox holds for this address. */
export async function outboxLink(origin, key, email) {
  const [id] = await outboxMessages(origin, key, email);
  if (!id) throw new Error(`No outbox message for ${email}`);
  return (await outboxRead(origin, key, `/__dev/outbox?message=${id}`)).match(/class="open" href="([^"]+)"/)[1].replaceAll('&amp;', '&');
}

/** One email-link sign-in: request at Base's sign-in page, open the link, press Confirm. Works before hydration. */
export async function emailLinkSignIn(page, origin, key, email, returnTo) {
  await page.goto(`${origin}/signin${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`);
  await page.fill('#signin-email', email);
  await page.getByRole('button', { name: 'Email a sign-in link' }).click();
  await page.getByRole('status').filter({ hasText: 'a sign-in link is on its way' }).waitFor();
  const link = await outboxLink(origin, key, email);
  await page.goto(link);
  await page.getByRole('button', { name: 'Confirm' }).click();
  await page.waitForLoadState('networkidle');
  return link;
}
